# Proposal

## Why

Three open questions were carried out of REQ-001 with owner IO/SA. On 2026-11-13
the IO ruled all three at once: "open question使用flyway json，数据库改为sqllite"
— keep Flyway, use JSON, change the database to SQLite — and fixed the JSON shape
as `{"message":"Hello World"}`.

The JSON ruling contradicts the merged Living Spec, whose endpoint scenario
requires "the response body is exactly `Hello World`". A merged spec is not
edited in place, so the contract change travels as a MODIFIED delta in this
change. The SQLite ruling restores the engine `TODO.md` originally named and
does not contradict the spec, which is deliberately engine-agnostic.

REQ-001 stays archived and immutable. Its signed G2/G3 evidence describes a
`text/plain` endpoint on H2 and a CI run that predates the SQLite driver, so it
cannot be reused: this change re-verifies and re-signs.

## What Changes

- **MODIFIED** `greeting` → "Greeting read endpoint": `GET /api/greeting` returns
  `application/json` with body `{"message":"<stored message>"}` instead of a bare
  `text/plain` message. Read-only behavior is unchanged.
- Replace the H2 runtime dependency with `org.xerial:sqlite-jdbc:3.46.1.0`;
  datasource becomes `jdbc:sqlite:./data/gogo.db` with driver `org.sqlite.JDBC`.
- Restate `V1__create_greeting.sql` in SQLite dialect (`INTEGER PRIMARY KEY`,
  `TEXT NOT NULL`). Edited in place, not superseded by a V2: the SQLite file is
  new and has never been migrated, so there is no history to preserve.
- Return a `GreetingResponse(String message)` record from the controller; Jackson
  serializes it to the ruled shape with no extra configuration.
- Backend acceptance tests run against SQLite and assert `jsonPath("$.message")`.
- `App.jsx` parses the response with `response.json()` and renders `data.message`.
  The load-failure branch is unchanged.
- Update `docs/feedback/verification-commands.md`,
  `docs/feedback/verification-matrix.md` and `README.md` for the new engine and
  media type. The H2 Shell query step becomes a Python `sqlite3` query — no
  `sqlite3` CLI exists on this machine.

Unchanged: the storage and rendering requirements, the `/api` dev proxy, the
lockfile design (D6), the two-job CI workflow (D7), and every REQ-001 non-goal.

No new capability. No breaking change to a published external contract — the only
consumer is this repository's frontend, which changes in the same commit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `greeting`: the read endpoint's media type and body shape. One requirement
  modified, two scenarios restated. The storage and home-page requirements are
  re-verified against the new engine and transport but their text does not change.

## Impact

- **Requirement**: REQ-002 (`requirement-workspace/requirements/REQ-002.md`),
  intent `requirement-workspace/intents/2026-11-13-req-002.md`.
- **Code**: `backend/pom.xml`, `application.yml`, `V1__create_greeting.sql`,
  `GreetingController.java`, new `GreetingResponse.java`, `GreetingApiTest.java`,
  `frontend/src/App.jsx`. `GreetingRepository` is engine-agnostic and is expected
  to need no change.
- **APIs**: `GET /api/greeting` changes media type and body. No other endpoint
  exists.
- **Dependencies**: `com.h2database:h2` removed; `org.xerial:sqlite-jdbc:3.46.1.0`
  added (runtime). Now present in the local Maven cache, downloaded through the
  corporate mirror after the user supplied `settings 2.xml`. Flyway stays at the
  Boot-managed 11.7.2; no extra Flyway module is needed for SQLite.
- **Runtime**: backend port 8080, frontend dev port 5173, database file moves from
  `backend/data/gogo.mv.db` to `backend/data/gogo.db`. SQLite has no
  `AUTO_SERVER` equivalent; concurrent reads while the app holds the file are
  still possible, which is what the verification step needs.
- **CI**: `.github/workflows/ci.yml` is unchanged, but the backend job now has to
  resolve `sqlite-jdbc` from Maven Central. The previous green run does not cover
  this dependency, so the pipeline outcome must be re-confirmed by a named human.
- **Toolchain (outside the repo)**: `~/.m2/settings.xml` was created from the
  user-supplied corporate file, with `localRepository` overridden to the existing
  warm cache. It contains credentials, is not committed, and is not part of this
  change's deliverables.
- **Docs / harness**: `README.md`, the two `docs/feedback/verification-*.md`
  files, stage reports under `docs/ai4se-plugins/`. The knowledge base remains
  unconfigured — `scripts/kb-lint.sh` stays a documented `SKIP`.

## Effort and ordering

Small. One vertical slice, no parallel tracks: 1 dependency swap, 1 config edit,
1 migration edit, 1 record + 1 controller edit, 1 test-class edit, 1 frontend
edit, then documentation and re-verification. Dependency sketch:
`driver resolves → migration runs on SQLite → endpoint returns JSON → frontend parses JSON`,
with the verification-doc rewrite dependent on the runtime steps actually being
re-run. `/sdd:story-split` is Skipped: one modified requirement does not warrant a
story backlog.

## A0 deep-dive gate

REQ-002 modifies an existing requirement, so deep-dive is in scope.
`requirement-workspace/analysis/req-002-dor.md` re-evaluates ⑨ data contract
(JSON field, SQLite column types), ⑩ boundary (read-only, no write API),
⑪ cross-REQ (N/A — single requirement, single capability) and ⑫ display contract
(heading text unchanged, failure branch unchanged). All four Pass → **A0 Pass**,
split permitted.

## Known deviations carried into later stages

- The REQ-001 archive is not retroactively edited. Its G1 record was re-recorded
  as Pass when the rulings landed; its G2/G3 records carry a post-decision note
  pointing here.
- Remote CI cannot be read from this machine (`gh` absent, `api.github.com` →
  HTTP 403). The pipeline report for this change must again be **Partial
  (`Pass-by-human-confirm`)** with a fresh four-field confirmation, never an
  API-verified Pass.
- The local H2 file is deleted rather than migrated (OQ-5). It is gitignored dev
  state with a constant seed.