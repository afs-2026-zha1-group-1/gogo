# Verification commands

The three-layer stop checks used by this repo (static → runtime → system).
These are the commands actually run for REQ-002 (JSON contract + SQLite engine);
each was executed and its result recorded in
`docs/ai4se-plugins/20261113-162526-local-verify-report.md`. The REQ-001 commands
are preserved in that change's archive and in
`20261113-153317-local-verify-report.md`.

Run them from the repository root. Backend commands need Java 21 and Maven;
frontend commands need Node 24 and npm; the database inspection step needs Python
3 with the standard-library `sqlite3` module (no `sqlite3` CLI is required).

Maven must be able to resolve `org.xerial:sqlite-jdbc`. On this machine that goes
through the corporate mirror configured in `~/.m2/settings.xml`; on a CI runner it
goes through Maven Central.

## Static

No lint, typecheck or SAST tool is configured in this baseline, so the static
layer is the non-goal reverse checks plus a workflow check. Every command exits
**0 on pass**; the reverse checks are negated with `!` so that finding nothing
is the success case. A match, or a non-zero exit, is a failure.

```bash
# No hard-coded greeting in the frontend (the text must come from the database)
! grep -rn "Hello World" frontend/src

# No ORM dependency
! grep -inE "jpa|hibernate" backend/pom.xml

# No H2 left anywhere in the backend (dependency, driver class or JDBC URL)
! grep -rinE "h2database|org\.h2|jdbc:h2" backend/pom.xml backend/src

# No internal registry host published in the lockfile
! grep -q "artifact.oocl.com" frontend/package-lock.json

# CI workflow parses and declares exactly the two expected jobs
python -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); j=sorted(d['jobs']); assert j==['backend','frontend'], j; print('ci jobs:', j)"
```

## Runtime

```bash
# Backend acceptance tests (shared-cache in-memory SQLite, seeded by the same
# Flyway migration as production; Hikari pool pinned to 1 to avoid SQLITE_BUSY)
(cd backend && mvn -B test)

# Frontend clean install from the lockfile, then production build
(cd frontend && npm ci && npm run build)
```

Offline on a machine with a warm Maven cache, use `mvn -o -B test`. The cache must
already contain `sqlite-jdbc`; the first run after the engine switch downloads it.

Stop any running `npm run dev` before `npm ci`. On Windows the dev server holds
`node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node`
open, and the clean install fails with `EPERM: operation not permitted, unlink`.
Find the owner with `netstat -ano | grep :5173`, stop it, then re-run.

## System

End-to-end checks against a running backend. Start it detached so the process
survives the shell, then verify by port owner and response, not by build log. A
leftover process from an earlier build would serve the old contract, so always
re-check the PID on 8080 and the `Content-Type` header.

```bash
# Build the jar, and create the log directory (both are gitignored)
cd backend && mvn -B package -DskipTests && mkdir -p ../logs

# First start creates and seeds the database file. The app creates data/ itself:
# the SQLite driver creates the file but not its parent directory.
rm -rf data
nohup java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar > ../logs/backend.log 2>&1 &

# Wait for startup, then confirm the port owner is the new process
grep -E "Successfully applied|Started HelloApplication" ../logs/backend.log
netstat -ano | grep LISTENING | grep :8080

# Exactly one seeded row, in SQLite dialect, with Flyway history applied once.
# A separate reader connection works while the app holds the file.
python -c "import sqlite3; c=sqlite3.connect('data/gogo.db'); print('rows:', c.execute('SELECT id, message FROM greeting').fetchall()); print('count:', c.execute('SELECT COUNT(*) FROM greeting').fetchone()[0]); print('schema:', c.execute(\"SELECT sql FROM sqlite_master WHERE name='greeting'\").fetchone()[0]); print('flyway:', c.execute('SELECT version, description, success FROM flyway_schema_history').fetchall()); c.close()"

# Read endpoint: expect 200, Content-Type: application/json,
# body exactly {"message":"Hello World"} with no extra key
curl -s -i http://localhost:8080/api/greeting

# Read-only: expect 405 for each, and the row unchanged afterwards
curl -s -o /dev/null -w "POST=%{http_code}\n" -X POST http://localhost:8080/api/greeting
curl -s -o /dev/null -w "PUT=%{http_code}\n" -X PUT http://localhost:8080/api/greeting
curl -s -o /dev/null -w "DELETE=%{http_code}\n" -X DELETE http://localhost:8080/api/greeting

# Later start preserves the seeded greeting: stop the backend, start it again
# against the existing file, then expect "No migration necessary", still one row,
# and still one flyway_schema_history entry
netstat -ano | grep LISTENING | grep :8080   # note the PID, then stop it
taskkill //PID <pid> //F
nohup java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar > ../logs/backend-restart.log 2>&1 &
grep -E "No migration necessary|Started HelloApplication" ../logs/backend-restart.log
python -c "import sqlite3; c=sqlite3.connect('data/gogo.db'); print('rows:', c.execute('SELECT id, message FROM greeting').fetchall()); print('history entries:', c.execute('SELECT COUNT(*) FROM flyway_schema_history').fetchone()[0]); c.close()"

# Home page renders the served greeting (cwd is backend/ from the steps above)
cd ../frontend && nohup npm run dev > ../logs/frontend.log 2>&1 &
# Open http://localhost:5173/ and read the h1 text: expect "Hello World".
# The value must come from parsing the JSON message field, not from raw text.

# Backend unavailable: stop the backend, reload the page, expect a load-failure
# message and no greeting heading. The dev proxy answers 502 when the backend is
# down, which is a non-success status and takes the same failure branch.
```

Delete `backend/data/` to rebuild the database from the migration. The directory
holds `gogo.db` and, if WAL mode is ever enabled, its `-wal` / `-shm` side files;
all are gitignored.