# Verification matrix

Maps each acceptance area to the command or evidence that proves it. Commands are
defined in [verification-commands.md](verification-commands.md); results are
recorded in `docs/ai4se-plugins/20261113-153317-local-verify-report.md`.

| Area | Check | Command / evidence | Owner |
|---|---|---|---|
| Storage (REQ-001 AC-1) | First start creates the DB file and seeds exactly one `Hello World` row | Delete `backend/data/`, start the jar, then H2 Shell `SELECT id, message FROM greeting; SELECT COUNT(*) …` → `1 \| Hello World`, ROW_COUNT 1 | Dev |
| Storage (REQ-001 AC-1) | Later start does not duplicate the row | Second start with the file present → same row, ROW_COUNT 1, Flyway "No migration necessary" | Dev |
| Endpoint (REQ-001 AC-2) | `GET /api/greeting` returns the stored message | `curl -s -i http://localhost:8080/api/greeting` → 200, `text/plain`, body `Hello World`; `GreetingApiTest#returnsHelloWorldFromDatabase` | Dev |
| Endpoint (REQ-001 AC-2) | Response reflects stored data, not a constant | `GreetingApiTest#returnsTheStoredMessageWhenItChanges`; mutation check (controller returns a literal) makes it fail with `expected:<Guten Tag> but was:<Hello World>` | Dev |
| Endpoint (non-goal) | Read-only: writes rejected | `curl -X POST/PUT/DELETE` → 405 each; `GreetingApiTest#rejectsWriteMethods` | Dev |
| Home page (REQ-001 AC-3) | Page renders the served greeting | Browser `http://localhost:5173/` → `h1` text `Hello World` | Dev |
| Home page (REQ-001 AC-3) | No hard-coded greeting in the frontend | `! grep -rn "Hello World" frontend/src` → exit 0 | Dev |
| Home page (failure path) | Backend unavailable shows a load-failure message | Stop the backend, reload → `[role='alert']` text `Failed to load the greeting: HTTP 502`, no greeting heading | Dev |
| Stack constraint | No ORM | `! grep -inE "jpa\|hibernate" backend/pom.xml` → exit 0 | Dev |
| Stack constraint | Embedded DB, no separate service | H2 file mode with `AUTO_SERVER=TRUE`; no external DB process or credentials | Dev |
| Build | Backend tests | `(cd backend && mvn -B test)` → Tests run: 3, Failures: 0 | Dev |
| Build | Frontend clean install + production build | `(cd frontend && npm ci && npm run build)` → 0 vulnerabilities, vite build succeeds | Dev |
| Harness (D6) | Lockfile publishes no corporate registry host | `! grep -q "artifact.oocl.com" frontend/package-lock.json` → exit 0; 51 `registry.npmjs.org` URLs retained after `npm ci` | Dev |
| Harness (D7) | CI declares both jobs | `python -c "…assert j==['backend','frontend']…"` → `ci jobs: ['backend', 'frontend']` | Dev |
| Harness (remote CI) | GitHub Actions run is green | Not machine-readable from this host (`gh` absent, API 403). Named human confirmation: Johnson, 2026-11-13 — see `20261113-145614-pipeline-report.md`, `Partial (Pass-by-human-confirm)` | Johnson |