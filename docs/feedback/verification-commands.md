# Verification commands

The three-layer stop checks used by this repo (static → runtime → system).
These are the commands actually run for REQ-001; each was executed and its result
recorded in `docs/ai4se-plugins/20261113-145614-local-verify-report.md`.

Run them from the repository root. Backend commands need Java 21 and Maven;
frontend commands need Node 24 and npm.

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

# No internal registry host published in the lockfile
! grep -q "artifact.oocl.com" frontend/package-lock.json

# CI workflow parses and declares exactly the two expected jobs
python -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); j=sorted(d['jobs']); assert j==['backend','frontend'], j; print('ci jobs:', j)"
```

## Runtime

```bash
# Backend acceptance tests (in-memory H2, seeded by the same Flyway migration)
(cd backend && mvn -B test)

# Frontend clean install from the lockfile, then production build
(cd frontend && npm ci && npm run build)
```

Offline on a machine with a warm Maven cache, use `mvn -o -B test`.

Stop any running `npm run dev` before `npm ci`. On Windows the dev server holds
`node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node`
open, and the clean install fails with `EPERM: operation not permitted, unlink`.
Find the owner with `netstat -ano | grep :5173`, stop it, then re-run.

## System

End-to-end checks against a running backend. Start it detached so the process
survives the shell, then verify by port owner and response, not by build log.

```bash
# Build the jar, and create the log directory (both are gitignored)
cd backend && mvn -B package -DskipTests && mkdir -p ../logs

# First start creates and seeds the database file
rm -rf data
nohup java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar > ../logs/backend.log 2>&1 &

# Exactly one seeded row (AUTO_SERVER allows querying while the app holds the file)
java -cp "$HOME/.m2/repository/com/h2database/h2/2.3.232/h2-2.3.232.jar" \
  org.h2.tools.Shell -url "jdbc:h2:file:./data/gogo;AUTO_SERVER=TRUE" \
  -user sa -password "" \
  -sql "SELECT id, message FROM greeting; SELECT COUNT(*) AS row_count FROM greeting;"

# Read endpoint: expect 200, text/plain, body "Hello World"
curl -s -i http://localhost:8080/api/greeting

# Read-only: expect 405 for each, and the row unchanged afterwards
curl -s -o /dev/null -w "POST=%{http_code}\n" -X POST http://localhost:8080/api/greeting
curl -s -o /dev/null -w "PUT=%{http_code}\n" -X PUT http://localhost:8080/api/greeting
curl -s -o /dev/null -w "DELETE=%{http_code}\n" -X DELETE http://localhost:8080/api/greeting

# Home page renders the served greeting (cwd is backend/ from the steps above)
cd ../frontend && nohup npm run dev > ../logs/frontend.log 2>&1 &
# Open http://localhost:5173/ and read the h1 text: expect "Hello World"

# Backend unavailable: stop the backend, reload the page,
# expect a load-failure message and no greeting heading
```

Delete `backend/data/` to rebuild the database from the migration.