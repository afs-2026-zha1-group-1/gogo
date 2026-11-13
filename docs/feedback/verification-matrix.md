# Verification matrix

Maps each acceptance area to the command or evidence that proves it. Commands are
defined in [verification-commands.md](verification-commands.md); results are
recorded in `docs/ai4se-plugins/20261113-162526-local-verify-report.md`. The
REQ-001 matrix rows are superseded where the contract or the engine changed; that
change's evidence stays in `20261113-153317-local-verify-report.md`.

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