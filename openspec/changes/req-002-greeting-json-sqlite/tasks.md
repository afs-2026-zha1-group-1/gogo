# Tasks

Owners: `Dev` = implementing agent in this session; `IO` / `SA` / `VL` = named
human approvers (pending). Unlike REQ-001, no item is pre-checked: the artifacts
precede the implementation, so red-green order is honored (`atdd-design.md` §2).
Verification is stated inside each checkbox.

## 1. Backend engine and JSON contract (owner: Dev)

- [x] 1.1 **Red run.** Rewrite the two API assertions in `GreetingApiTest` to
  expect `application/json` and `jsonPath("$.message")`, leaving the controller on
  `text/plain` — verify `cd backend && mvn -B test` **fails** with an
  assertion/content-type mismatch (not a compile or context error) and capture the
  output as red evidence.
- [x] 1.2 Add `org.xerial:sqlite-jdbc` (runtime, BOM-managed 3.49.1.0) to
  `backend/pom.xml` and remove `com.h2database:h2` — verify `mvn -B test` resolves
  the driver through the corporate mirror and `grep -in "h2" backend/pom.xml`
  returns nothing.
- [x] 1.3 Point `application.yml` at `jdbc:sqlite:./data/gogo.db` with
  `driver-class-name: org.sqlite.JDBC`; drop the H2 `username`/`password` pair —
  verify the backend starts with no external database service running.
- [x] 1.4 Restate `V1__create_greeting.sql` in SQLite dialect (`id INTEGER PRIMARY
  KEY`, `message TEXT NOT NULL`), still seeding one `Hello World` row — verify a
  Python `sqlite3` query returns exactly one row `1 | Hello World` (D10, D13).
- [x] 1.5 Add `GreetingResponse(String message)` and change `GreetingController` to
  `produces = MediaType.APPLICATION_JSON_VALUE` returning that record — verify
  `curl -i http://localhost:8080/api/greeting` returns 200,
  `Content-Type: application/json` and body `{"message":"Hello World"}`.
- [x] 1.6 **Green run.** Move the test datasource to SQLite (D12:
  `jdbc:sqlite:file:greeting-test?mode=memory&cache=shared`, Hikari pool size 1) —
  verify `mvn -B test` reports 3 tests, 0 failures, and that Flyway migrated the
  SQLite test database. If shared cache misbehaves, apply the R9 fallback and
  record the change in `design.md`.
- [x] 1.7 **Mutation check.** Temporarily return a constant
  `new GreetingResponse("Hello World")` — verify
  `returnsTheStoredMessageWhenItChanges` fails, then revert and verify it passes
  again. Proves the non-constant scenario tests stored data.
- [x] 1.8 Reverse check for the read-only non-goal: `POST`, `PUT`, `DELETE` to
  `/api/greeting` — verify each returns 405 and the stored row is unchanged.
- [x] 1.9 Confirm `GreetingRepository` needs no change (engine-agnostic SQL) —
  verify `git diff` shows no edit to that file, or record why one was needed.
- [x] 1.10 Create the database parent directory on startup (D16, added after P4
  found that the SQLite driver does not create it) — verify that with `data/`
  deleted the packaged jar starts successfully and creates `data/gogo.db`, where
  before the fix it failed with `path to './data/gogo.db': … does not exist`.

## 2. Frontend JSON reader (owner: Dev)

- [x] 2.1 Change `App.jsx` to `response.json()` and render `data.message`, keeping
  the `role="alert"` load-failure branch (D15) — verify the rendered heading equals
  the endpoint's `message` value.
- [x] 2.2 Verify the dev-server proxy still works with the new media type — verify
  the page renders with no CORS error and no JSON parse error in the browser
  console while the backend runs on 8080.
- [x] 2.3 Reverse check: `frontend/src` contains no literal `Hello World` — verify
  `! grep -rn "Hello World" frontend/src` exits 0.
- [x] 2.4 Verify the frontend still builds — run `cd frontend && npm ci && npm run
  build` (stop the dev server first, R13) and confirm `dist/` is produced. The
  lockfile is unchanged, so D6 needs no re-verification beyond a successful
  install.

## 3. Verification documents and CI (owner: Dev; run status confirmed by a named human)

- [x] 3.1 Update `docs/feedback/verification-commands.md`: SQLite URL and file
  path, Python `sqlite3` instead of H2 Shell, `curl` assertions on
  `Content-Type` and the JSON body, and the `! grep` reverse checks including the
  new "no H2 left" check — verify every command runs as written from the repo root
  and that reverse checks exit 0 on success (the runner treats any non-zero exit
  as FAIL).
- [x] 3.2 Update `docs/feedback/verification-matrix.md` rows for the JSON contract,
  the SQLite engine and the new reverse checks — verify each row names a command
  or observation and an owner, with no `(pending)` placeholder left.
- [x] 3.3 Update `README.md`: SQLite file location, JSON response example, the
  Python `sqlite3` inspection command, and removal of the H2 substitution note —
  verify each documented command runs as written.
- [x] 3.4 Confirm `.github/workflows/ci.yml` needs no edit (D7) and still parses
  with exactly the `backend` and `frontend` jobs — verify the YAML check in the
  whitelist passes and no placeholder harness script is invoked.
- [x] 3.5 Commit the implementation increment and push to `origin/main` **only
  after the user authorizes the push** — verify `git log` shows the commit and
  `git status` is clean for those paths. The REQ-001 push authorization is not
  inherited.
- [ ] 3.6 Record the pipeline outcome in
  `docs/ai4se-plugins/<ts>-pipeline-report.md` and `ci-report.md` — verify the
  report is **Partial (`Pass-by-human-confirm`)** with a *fresh* four-field
  confirmation (confirmer, phase, explicit statement, timestamp) for this change's
  commit. REQ-001's confirmation must not be reused (R8); no API-verified Pass may
  be claimed.

## 4. Runtime acceptance re-verification (owner: Dev; integration evidence)

- [x] 4.1 Scenario "First start creates and seeds the database": delete
  `backend/data/` (including the old `gogo.mv.db`, D14), start the backend detached
  — verify `data/gogo.db` is created and a Python `sqlite3` query returns exactly
  one `Hello World` row. This also closes R10: Flyway really migrated SQLite.
- [x] 4.2 Scenario "Later start preserves the seeded greeting": restart against
  the existing file — verify the row is still `Hello World`, the count is still 1,
  and `flyway_schema_history` shows V1 applied exactly once.
- [x] 4.3 Scenario "Stored greeting is returned": `curl -i` the endpoint on the
  rebuilt process — verify 200, `application/json`, body exactly
  `{"message":"Hello World"}` with no extra key. Confirm the PID on 8080 is the new
  jar, not a leftover REQ-001 process (R12).
- [x] 4.4 Scenario "Home page shows the served greeting": open
  http://localhost:5173/ in a browser — verify the `h1` text is `Hello World` and
  the value came from parsing the endpoint JSON.
- [x] 4.5 Scenario "Backend unavailable": stop the backend, reload the page —
  verify a load-failure message is displayed and no greeting heading appears.
- [x] 4.6 Reverse checks for the remaining non-goals — verify `GET /api/greeting`
  without credentials returns 200, the backend starts with no external database
  service, and no H2 dependency, driver or URL remains anywhere in `backend/`.
- [x] 4.7 Write `docs/ai4se-plugins/<ts>-local-verify-report.md` plus the checkpoint
  records — verify every delta scenario, every re-verified Living Spec scenario and
  every reverse check has a command/output or browser observation attached, with
  unverified items marked Partial rather than Pass. Attach the red run (1.1), the
  green run (1.6) and the mutation check (1.7).

## 5. Stage artifacts and human gates (owner: Dev drafts; IO/SA/VL decide)

- [x] 5.1 Write `docs/ai4se-plugins/<ts>-quality-checklist-report.md` for P2/P4 —
  verify each item is Pass / Partial / Skipped with evidence, and that no gate item
  is claimed as approved without a named human signature.
- [x] 5.2 Write `g2-decision.md` — verify it stays **NOT RECORDED** until a named
  VL signs. It must cite this change's local-verify report and this change's
  pipeline report, never REQ-001's.
- [x] 5.3 Write `change-summary.md` and the P5 quality-checklist report — verify the
  summary lists delivered behavior, evidence paths, the superseded REQ-001
  decisions (D1, D4) and every residual risk with its owner.
- [x] 5.4 Write `g3-decision.md` — verify it stays **NOT RECORDED** until a named
  SA signs.
- [ ] 5.5 Ask the user for explicit merge-ready confirmation before living-merge —
  verify the confirmation is recorded in the change folder before any merge or
  archive step runs. Do not infer it from the REQ-001 authorization.
- [x] 5.6 Record the knowledge-base update as `Skipped (not configured)` per
  `scripts/README.md` — verify it is never reported as Pass.

## Workflow follow-up

- Run `/d/nvm4w/nodejs/openspec validate req-002-greeting-json-sqlite --strict`
  before archiving; the PATH `openspec` is 1.6.0 and must not be used.
- Archive with `/d/nvm4w/nodejs/openspec archive "req-002-greeting-json-sqlite" --yes`
  only after task 5.5 confirmation. Verify the MODIFIED requirement replaced the
  old one in `openspec/specs/greeting/spec.md` and that the other two requirements
  are untouched.
- Post-archive: `/d/nvm4w/nodejs/openspec validate --specs --strict` must report
  `✓ spec/greeting`, 1 passed, 0 failed.
- Push the stage commits to `origin/main` after the user authorizes the push.