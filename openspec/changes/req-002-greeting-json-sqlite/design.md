# Design

## Context

REQ-001 shipped and is archived: a `text/plain` greeting endpoint on an H2 file
database, with G1/G2/G3 signed by Johnson. On 2026-11-13 the IO ruled the three
carried open questions — keep Flyway, use JSON, move the engine back to SQLite —
and fixed the JSON shape as `{"message":"Hello World"}`. This design records the
decisions that implement those rulings. Decision ids continue REQ-001's `D1…D8`
and risk ids continue `R1…R6` so cross-change references stay unambiguous.

Constraints that shape the approach:

- `AGENTS.md`: simplest implementation, focused changes, verifiable outcomes,
  repository documentation in English.
- `TODO.md`: SQLite (line 13), Flyway (line 21), no ORM (line 33, amended from
  "数据库迁移工具、ORM" when the ruling was recorded).
- The Living Spec's storage and rendering requirements are engine- and
  transport-agnostic; only the endpoint requirement changes.
- Toolchain: Java 21, Maven 3.9.16, Node 24. `sqlite-jdbc` was **not** in the local
  Maven cache and Maven Central is unreachable from this machine (TLS
  `certificate_unknown`, curl exit 35). The user supplied the corporate
  `settings 2.xml`; it is now installed at `~/.m2/settings.xml` and the driver
  resolves from `artifact.oocl.com/artifactory/repo`.
- GitHub-hosted CI runners are outside the corporate network and resolve from
  Maven Central.
- No `sqlite3` CLI on this machine; Python 3.14 ships the `sqlite3` module
  (SQLite 3.50.4).

## Goals / Non-Goals

**Goals:**

- Implement the ruled JSON contract and the SQLite engine with observable
  evidence for every delta-spec scenario and every re-verified Living Spec
  scenario.
- Keep the visitor-visible behavior identical: the heading still reads
  `Hello World`, the failure branch still fires when the backend is down.
- Keep the stack runnable on this machine through the corporate mirror and
  buildable on public CI.

**Non-Goals:**

- No ORM, no authentication, no greeting write/management API, no i18n.
- No extra JSON fields, no envelope versioning, no content negotiation.
- No migration of existing H2 rows (OQ-5).
- No change to the CI job structure (D7) or the lockfile registry design (D6).
- No production deployment or CD trigger.
- No committed browser automation suite; E2E acceptance stays runtime evidence.
- No NFR testing (not requested; `atdd-design.md` §6).

## Decisions

| id | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| D9 | Embedded **SQLite** via `org.xerial:sqlite-jdbc` (runtime scope, **no pinned version** — the Boot 3.5.14 BOM manages it to 3.49.1.0), URL `jdbc:sqlite:./data/gogo.db`, driver `org.sqlite.JDBC`. H2 removed from `pom.xml` | IO ruling restores `TODO.md` line 13. Keeps the observable criterion "a database file is created and seeded". Every other dependency in this pom is BOM-managed, so pinning the driver would be the odd one out and would drift from what CI resolves. The path stays relative to the working directory, so the backend is still started from `backend/` and the file still lands in `backend/data/` | Keep H2 (contradicts the ruling); pin 3.46.1.0, the version downloaded while unblocking the mirror (works, but overrides the BOM for no reason); a different SQLite driver (no benefit, extra vetting); SQLite in-memory only (would fail the "file created" scenario) |
| D10 | Restate `V1__create_greeting.sql` in SQLite dialect — `id INTEGER PRIMARY KEY`, `message TEXT NOT NULL` — **edited in place**, no V2 | The SQLite file is brand new and has never been migrated, so there is no applied history to preserve. `INTEGER PRIMARY KEY` is SQLite's rowid alias; `INT PRIMARY KEY` would work by type affinity but is not the idiomatic form. Adding a V2 would leave an H2-shaped V1 that still has to run first on a fresh database | Add `V2__sqlite_dialect.sql` (pointless: V1 runs first and there is no deployed SQLite history); leave the H2 DDL untouched (works by affinity, but the schema file would misdescribe the engine) |
| D11 | Controller returns a **`GreetingResponse(String message)` record**, `produces = MediaType.APPLICATION_JSON_VALUE` | Jackson serializes a record component to `{"message":"…"}` with no annotation or configuration. One field, one type, compile-time contract. The repository stays engine-agnostic and unchanged | `Map.of("message", …)` (no type contract, easy to typo the key); a POJO with getters (more code for one field); returning a hand-built JSON string (escaping bugs, wrong content type) |
| D12 | Acceptance tests run against **SQLite**, using a shared-cache in-memory URL `jdbc:sqlite:file:greeting-test?mode=memory&cache=shared` with `spring.datasource.hikari.maximum-pool-size=1` | Tests must exercise the production engine — that is the point of the ruling. Shared cache keeps the database alive across pooled connections; a single connection removes `SQLITE_BUSY` / table-lock contention, which is acceptable because the suite is sequential and read-only apart from one fixture update | Keep H2 for tests (would leave the engine switch untested); a `@TempDir` file database via `@DynamicPropertySource` (robust fallback if shared cache misbehaves — recorded as R9); `jdbc:sqlite::memory:` without shared cache (each pooled connection would get its own empty database) |
| D13 | Replace the H2 Shell verification step with **Python `sqlite3`** | No `sqlite3` CLI exists here; Python 3.14 ships the module. SQLite has no `AUTO_SERVER`, but a separate reader connection can query the file while the app holds it, which is all the verification step needs | Install a `sqlite3` CLI (extra tool, no benefit); verify only through the endpoint (would not independently prove the file contents, weakening AC4) |
| D14 | Delete the local `backend/data/gogo.mv.db` and let Flyway create `gogo.db` fresh | `data/` is gitignored dev state, never committed, and the seed is a constant. There is no user data to preserve (OQ-5, resolved) | Write an H2→SQLite data migration (no data to migrate); keep both files (ambiguous state, and `.gitignore` already covers the directory) |
| D15 | Frontend reads `response.json()` then `data.message`; the existing `.catch` is the only failure branch | Minimal diff. A non-JSON 200 body — e.g. a dev-server fallback page — makes `response.json()` reject, which lands in the same `.catch` and renders the load-failure message. No extra guard is needed for a case the contract already excludes | Add an explicit `typeof data.message` check (defensive code for a state the endpoint cannot produce); keep `response.text()` and strip JSON manually (fragile) |
| D16 | `HelloApplication.main` calls `Files.createDirectories(Path.of("data"))` before `SpringApplication.run` | **Added after P4 found a real defect.** The SQLite driver creates the database *file* but not its parent *directory*: with `data/` deleted the context failed with `path to './data/gogo.db': …\data does not exist`, so the Living Spec scenario "First start creates and seeds the database" was **not** satisfied by the engine swap alone. H2 had created the directory implicitly. One line in `main` restores the specified behavior and keeps the documented `backend/data/` layout, which also covers SQLite's `-wal` / `-shm` side files under the existing `.gitignore` `data/` rule | Move the file to `backend/gogo.db` (no code, but changes the documented path and leaves `-wal`/`-shm` unignored); an `EnvironmentPostProcessor` reading the URL (no duplicated literal, but ~20 lines plus a `spring.factories` entry for one directory); document "create `data/` first" (would violate the spec's *automatically on first start*) |

**Inherited unchanged:** D3 (`JdbcTemplate`, no ORM), D5 (dev-server `/api` proxy,
no CORS config), D6 (public-registry lockfile + npm `replace-registry-host`),
D7 (two CI jobs), D8 (Boot 3.5.14 / Java 21 / React 19 / Vite 8).
D1 (H2) is **superseded by D9**; D2 (Flyway) is **confirmed** by the OQ-2 ruling;
D4 (`text/plain`) is **superseded by D11**.

## Risks / Trade-offs

| id | Risk | Mitigation / trade-off |
|---|---|---|
| R7 | `sqlite-jdbc` had to be downloaded through a newly installed user-level `~/.m2/settings.xml`; a fresh clone on another machine has no such config | The file is supplied by the user, holds credentials, is never committed and never printed. Its `localRepository` was overridden from the non-existent `D:\software\apache-maven-3.0.4\repository` to the warm cache `C:\Users\SUNJO\.m2\repository` to avoid re-downloading every Spring artifact. Recorded in the intent capture and the change summary |
| R8 | The REQ-001 CI confirmation predates this dependency, so remote resolution of `sqlite-jdbc` from Maven Central is unproven | P4's pipeline report must be **Partial (`Pass-by-human-confirm`)** with a *fresh* four-field confirmation for this change's commit. The old confirmation must not be reused, and no API-verified Pass may be claimed (`gh` absent, `api.github.com` → 403) |
| R9 | SQLite locking under a pooled datasource (`SQLITE_BUSY`, "database table is locked") in tests | D12 pins the pool to one connection. If shared-cache memory still misbehaves, fall back to a `@TempDir` file database via `@DynamicPropertySource` and record the change here rather than silently loosening the assertion |
| R10 | Flyway 11.7.2 SQLite support is asserted from jar inspection (`SQLiteDatabaseType` present in `flyway-core`), not from execution | P4 must show a real migration creating and seeding `gogo.db`, plus a second start proving idempotency. If Flyway rejects the engine, add the vendor module and record the dependency change — do not switch the engine back |
| R11 | REQ-001's signed G2/G3 evidence no longer describes the shipped behavior | The archive stays immutable and carries a post-decision note pointing to this change. REQ-002 gets its own verification run and its own gate signatures; nothing is inherited |
| R12 | Ports 8080/5173 are contested by other local projects (inherited R3), and the currently running backend still serves the old contract | Verify by port owner **plus** response body and content type, not by build log alone. Restart the detached backend after the rebuild and re-check the media type, so a stale process cannot masquerade as a pass |
| R13 | `npm ci` on Windows fails with EPERM on `rolldown-binding.win32-x64-msvc.node` while the Vite dev server holds the file (measured in REQ-001) | Stop the dev server before `npm ci`, then restart it. The hazard is documented in `docs/feedback/verification-commands.md` |