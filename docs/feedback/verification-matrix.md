# Verification matrix

Maps each acceptance area to the command or evidence that proves it. Commands are
defined in [verification-commands.md](verification-commands.md); results are
recorded in `docs/ai4se-plugins/20261113-162526-local-verify-report.md`. The
REQ-001 matrix rows are superseded where the contract or the engine changed; that
change's evidence stays in `20261113-153317-local-verify-report.md`. REQ-019 rows
sit in their own section below and point to
`docs/ai4se-plugins/20261116-1333-local-verify-report.md`.

| Area | Check | Command / evidence | Owner |
|---|---|---|---|
| Storage (REQ-002 AC4) | First start creates the DB file and seeds exactly one `Hello World` row | `rm -rf backend/data`, start the jar → `data/gogo.db` created; Python `sqlite3` → `rows: [(1, 'Hello World')]`, `count: 1`, `flyway: [('1', 'create greeting', 1)]` | Dev |
| Storage (REQ-002 AC5) | Later start does not duplicate the row | Second start with the file present → `Schema "main" is up to date. No migration necessary.`; `count: 1`, `history entries: 1` | Dev |
| Storage (D16, defect found in P4) | The app creates the database directory itself | Before the fix, a fresh start failed: `path to './data/gogo.db': …\backend\.\data does not exist`. After `Files.createDirectories` in `main`, the same fresh start succeeds | Dev |
| Storage (schema dialect) | Table is SQLite dialect, not H2 | `SELECT sql FROM sqlite_master WHERE name='greeting'` → `id INTEGER PRIMARY KEY, message TEXT NOT NULL` | Dev |
| Endpoint (REQ-002 AC1) | `GET /api/greeting` returns 200, `application/json`, body `{"message":"Hello World"}` | `curl -s -i http://localhost:8080/api/greeting` → `HTTP/1.1 200`, `Content-Type: application/json`, body `{"message":"Hello World"}`; `GreetingApiTest#returnsHelloWorldFromDatabase` | Dev |
| Endpoint (REQ-002 AC1) | Exactly one JSON key, no envelope extras | Response body inspected verbatim: `{"message":"Hello World"}` — single `message` key | Dev |
| Endpoint (REQ-002 AC2) | Response reflects stored data, not a constant | `GreetingApiTest#returnsTheStoredMessageWhenItChanges`; mutation check (controller returns a constant record) makes it fail with `JSON path "$.message" expected:<Guten Tag> but was:<Hello World>`, then passes again after revert | Dev |
| Endpoint (non-goal) | Read-only: writes rejected | `curl -X POST/PUT/DELETE` → `405` each; row still `[(1, 'Hello World')]` afterwards; `GreetingApiTest#rejectsWriteMethods` | Dev |
| Home page (REQ-002 AC3) | Page renders the greeting parsed from JSON | Browser `http://localhost:5173/` → `{"h1":"Hello World","alert":null}`; `App.jsx` uses `response.json()` then `data.message` | Dev |
| Home page (REQ-002 AC3) | No hard-coded greeting in the frontend | `! grep -rn "Hello World" frontend/src` → exit 0 | Dev |
| Home page (failure path, AC3-N) | Backend unavailable shows a load-failure message | Stop the backend (proxy answers 502), reload → `{"h1":null,"alert":"Failed to load the greeting: HTTP 502"}`; restarting the backend and reloading restores `h1: Hello World` | Dev |
| Stack constraint | No ORM | `! grep -inE "jpa\|hibernate" backend/pom.xml` → exit 0 | Dev |
| Stack constraint | Embedded SQLite, no separate service | `jdbc:sqlite:./data/gogo.db`, driver `org.sqlite.JDBC`; backend starts with no external DB process and no credentials | Dev |
| Stack constraint | H2 fully removed | `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` → exit 0 | Dev |
| Build | Backend tests on the production engine | `(cd backend && mvn -B test)` → `Tests run: 3, Failures: 0, Errors: 0`; log shows `Database: jdbc:sqlite:file:greeting-test?mode=memory&cache=shared (SQLite 3.49)` and `Migrating schema "main" to version "1 - create greeting"` | Dev |
| Build | Frontend clean install + production build | `(cd frontend && npm ci && npm run build)` → `found 0 vulnerabilities`, `✓ 15 modules transformed`, `dist/assets/index-o_JrBkyg.js` | Dev |
| ATDD order | Red before green | Red run with the JSON assertions against the `text/plain` controller → `Tests run: 3, Failures: 3`, `Content type [text/plain;charset=UTF-8] is not compatible with [application/json]`. Green run after the controller change → 3/0 | Dev |
| Harness (D6) | Lockfile publishes no corporate registry host | `! grep -q "artifact.oocl.com" frontend/package-lock.json` → exit 0; `npm ci` still installs through the configured local registry | Dev |
| Harness (D7) | CI declares both jobs | `python -c "…assert j==['backend','frontend']…"` → `ci jobs: ['backend', 'frontend']` | Dev |
| Harness (static layer) | Whitelist runs clean | `run-verify.sh` → `commands_attempted:5`, `commands_failed:0` (`20261113-162029-local-verify-run.log`) | Dev |
| Harness (remote CI) | GitHub Actions run is green **for this change's commit** | **Not yet verified.** The commit has not been pushed, and REQ-001's confirmation predates the `sqlite-jdbc` dependency so it cannot be reused. Requires a fresh named human confirmation; until then this row is open and the pipeline Overall is Partial at best | Johnson |

## REQ-019 member interests (US-019)

Evidence: `docs/ai4se-plugins/20261116-1333-local-verify-report.md`, commands
`docs/ai4se-plugins/20261116-1205-req019-api-verify-commands.ps1`, transcript
`…-run.log`. Rows marked open keep the change's Overall at Partial; none of them is
`Pass` by assertion.

| Area | Check | Command / evidence | Owner |
|---|---|---|---|
| Storage (DD1) | `V4` creates `member_preference` with `UNIQUE(trip_id,user_id,kind)`, no seed rows, no trigger | Fresh start → `Successfully applied 4 migrations … now at version v4`; Python `sqlite3` → `sqlite_master` shows the PK and the unique index; `SELECT count(*) FROM member_preference` = 0 before any save | Dev |
| Storage (DD7, DD8) | `payload` stores codes, not labels, with an ISO-8601 UTC `updated_at` | Python `sqlite3` → `1|2|interest|{"codes":[]}|2026-11-16T03:52:04.794712400Z`; `PreferenceApiTest#emptyArrayClearsButKeepsRow` | Dev |
| Endpoint SAVE (REQ-019 AC1/AC3) | `PUT` replaces the whole set, collapses duplicates keeping the first, and `[]` clears while keeping the row | curl SAVE-1…SAVE-8; `PreferenceApiTest` SAVE group | Dev |
| Endpoint catalogue (REQ-019 AC2) | Exactly seven labels, literal match, one unsupported label rejects the entire request | curl CAT-1…CAT-4 and SAVE-5/6 → `400 INTEREST_NOT_ALLOWED`, stored set unchanged; `InterestCatalogue` in AC order | Dev |
| Endpoint body shape (DD4) | Element type is judged by JSON token type | curl `[42]`, `[null]`, `{"interests":"Art"}`, `["Art"]`, `{}` → `400 INVALID_REQUEST`; `StrictStringListDeserializer` | Dev |
| Endpoint READ (REQ-019 AC4) | `{"members":[…]}`, exactly `userId` + `interests`, ascending `userId`, unsaved members present with `[]`, read changes nothing | curl READ-1…READ-5 for four members, order 1,2,3,4; reverse check that no `noPreference`/`ready` field appears | Dev |
| Endpoint identity (DD5) | 401 `USER_REQUIRED` → 404 `TRIP_NOT_FOUND` → 403 `NOT_A_MEMBER`, bare `{code,message}`, nothing written on rejection | curl ID-1…ID-5 (including `X-User-Id: 99`/`abc` and `" 2 "`) | Dev |
| Page (REQ-019 AC5) | `#/trips/<id>/preferences` reached from the details page; seven chips; save + reload; 403/404; load failure with Retry | PAGE-1…PAGE-9 in the report; PAGE-4, PAGE-6 and PAGE-7 are **Partial** (a ~20 ms round trip hides the pending state; the page offers no way to submit an invalid label) | Dev |
| Build | Backend tests on the production engine | `(cd backend && mvn -B test)` → `Tests run: 60, Failures: 0, Errors: 0` (Greeting 3, Invitation 15, Preference 29, Trip 13) | Dev |
| Build | Frontend typecheck and production build | `(cd frontend && npm ci && npm run typecheck && npm run build)` → `tsc --noEmit` clean, `1491 modules transformed`, one 660 kB chunk warning | Dev |
| ATDD order | Red before green | Red run `-Dtest=PreferenceApiTest` → 29 errors, every one `no such table: member_preference`; green after the implementation → 29/29 | Dev |
| Stack constraint (D17) | Plan-first stack, no ORM, recorded deviations | `PreferenceRepository` on `JdbcClient`, no jpa/hibernate in `pom.xml`; frontend on TypeScript + Ant Design + TanStack Query + React Router; deviations TS-1…TS-11 in the design, TS-11 (Flyway SQLite module unpublished) still open | Dev |
| Harness (CI) | Frontend job typechecks before it builds | `.github/workflows/ci.yml`: `npm ci`, `npm run typecheck`, `npm run build` | Dev |
| Harness (remote CI) | GitHub Actions run is green **for this change's commit** | **Not yet verified.** `feat/travel_preference` carries no P4 commit yet (task 6.2, needs the owner's push authorization) and no named VL has signed G2 (task 6.3); until both land the change is Partial | SA / VL |
