# Design

## Context

Greenfield repository: `openspec/specs/` is empty and no application code is
committed. The working tree already holds an uncommitted implementation from
earlier in this session (deviation R4), so this design records the decisions that
code embodies and the ones still open, rather than pretending to precede it.

Constraints that shape the approach:

- `AGENTS.md`: simplest implementation, focused changes, verifiable outcomes,
  repository documentation in English.
- `TODO.md` non-goals: no ORM, no user system, no greeting management UI.
- Toolchain on this machine: Java 21, Maven 3.9.16, Node 24, npm registry pointing
  at the corporate Artifactory; Maven artifacts for Spring Boot 3.5.14, H2 and
  Flyway are already in the local `~/.m2` cache.
- GitHub-hosted CI runners are outside the corporate network.

## Goals / Non-Goals

**Goals:**

- Prove the browser → endpoint → embedded database chain with observable evidence
  for every delta-spec scenario.
- Keep the stack runnable offline on this machine and buildable on public CI.
- One CI semantics shared by local and remote gates.

**Non-Goals:**

- No ORM, no authentication, no greeting write/management API, no i18n.
- No production deployment or CD trigger in this change.
- No browser automation committed as a test suite; E2E acceptance is verified by
  runtime evidence in P4.
- No NFR testing (not requested; see `atdd-design.md` §6).

## Decisions

| id | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| D1 | Embedded **H2 in file mode** at `backend/data/gogo.mv.db`, URL `jdbc:h2:file:./data/gogo;AUTO_SERVER=TRUE` | User instruction of 2026-11-13 supersedes SQLite (OQ-1 resolved). Keeps AC1 observable: a real file is created and seeded. `AUTO_SERVER` lets the row be queried while the app runs. Path is relative to the working directory, so both apps are started from `backend/` | SQLite via a third-party JDBC driver (extra dependency, Flyway dialect support to verify); H2 in-memory only (would fail AC1's "file created") |
| D2 | **Flyway** migration `V1__create_greeting.sql` creates the table and seeds one row | `TODO.md` line 21 explicitly names Flyway. Migration is idempotent, satisfying the "later start" scenario | `schema.sql`/`data.sql` (honors the non-goal line instead). **OQ-2 unresolved** — the two `TODO.md` lines contradict; IO/SA to decide at G1 |
| D3 | **`JdbcTemplate`** for data access, no ORM | Honors the ORM non-goal; one query does not justify an abstraction layer | Spring Data JPA (adds Hibernate, violates the non-goal) |
| D4 | `GET /api/greeting` returns **`text/plain`** with the bare message | Matches AC2 literally ("returns Hello World") and keeps the frontend reader trivial | JSON envelope (more conventional, but adds a field contract). **OQ-3 deferred** — the delta spec fixes only the body value, so switching later stays spec-compatible |
| D5 | Frontend dev server **proxies `/api` to `localhost:8080`** | Removes CORS configuration entirely for the verified dev path | Backend `@CrossOrigin` (works for any origin, but adds config the acceptance criteria do not require) |
| D6 | Commit a lockfile whose `resolved` URLs point at the **public npm registry**; local installs keep using the corporate registry via npm's `replace-registry-host=npmjs` default | One lockfile serves both worlds: CI can install, local dev keeps the corporate mirror, and no internal hostname is published to GitHub | CI-side `sed` rewrite of a corporate lockfile (works, but keeps internal URLs in a public repo and adds a CI trick); two lockfiles (causes local/remote churn) |
| D7 | CI = two jobs: backend `mvn test` on Java 21, frontend `npm ci && npm run build` on Node 24 | Mirrors the local gates in `atdd-design.md` §3. Does not invoke the placeholder harness scripts that exit 1 | A single job (slower feedback, mixes toolchains); running `scripts/*.sh` (3 of 4 exit 1 by design) |
| D8 | Spring Boot **3.5.14**, Java **21**, React **19**, Vite **8** | Boot 3.5.14 with its managed H2 and Flyway versions is fully present in the local Maven cache, so the build works offline; React/Vite are the current registry versions | Newer Boot 4.x (only partially cached, would need network); older Vite (no benefit) |

## Risks / Trade-offs

| id | Risk | Mitigation / trade-off |
|---|---|---|
| R1 | D6 is **not yet verified**: the lockfile was rewritten but `npm ci` has not been re-run, so local install through the corporate registry is unproven | P4 must run `npm ci` locally and observe the CI run. If npm does not rewrite the host as expected, fall back to a CI-side registry override and record the change |
| R2 | CI run status cannot be read here (`gh` absent, `api.github.com` → HTTP 403) | P4 pipeline report must be **Partial** with named human confirmation; never an API-verified Pass |
| R3 | Ports 8080/5173 are contested by other local projects; one of them killed our JVM mid-verification | Verify by port owner plus endpoint response, not by build log alone. Start long-lived services as detached processes |
| R4 | Implementation preceded the artifacts, so red-green ATDD order was not honored | Disclosed in `atdd-design.md` §2; P4 adds the missing test and re-verifies every scenario |
| R5 | `text/plain` (D4) is less conventional than JSON | Accepted for scaffold simplicity; OQ-3 keeps the decision reversible without a spec change |
| R6 | The E2E layer is verified manually, not by a committed browser suite | Accepted: `TODO.md` asks for a minimal slice, and the ATDD non-goals exclude Playwright generators. Trade-off is repeatability, recorded as residual risk |
