# ATDD design — req-002-greeting-json-sqlite

- Date: 2026-11-13
- Stage: P3, `/sdd:atdd-design`
- Delta Spec: `specs/greeting/spec.md` (1 MODIFIED requirement, 2 scenarios)
- Living Spec scenarios re-verified because the engine and transport changed:
  `openspec/specs/greeting/spec.md` (storage 2, rendering 2)
- Scope: acceptance layers only (API + E2E). Unit-test suite design belongs to
  `/sdd:atdd-apply`.

## 1. ATDD layers in scope

| Scenario | Source | Layer | Rationale |
|---|---|---|---|
| Stored greeting is returned (JSON body + content type) | delta, MODIFIED | **API** | Observable HTTP status, `Content-Type` header and exact JSON body |
| Response reflects stored data, not a constant | delta, MODIFIED | **API** | Same endpoint with a fixture that changes the stored message; asserts the JSON `message` field follows |
| First start creates and seeds the database | Living Spec, re-verified | **E2E** | Requires a real process start with no SQLite file, then file inspection and a row query against the new engine |
| Later start preserves the seeded greeting | Living Spec, re-verified | **E2E** | Requires a second real start against the existing SQLite file; proves Flyway idempotency on SQLite (R10) |
| Home page shows the served greeting | Living Spec, re-verified | **E2E** | Browser render of the value parsed out of JSON |
| Backend unavailable | Living Spec, re-verified | **E2E** | Browser render with the backend stopped; also covers a non-JSON 200 body, which rejects in `response.json()` and lands in the same branch (D15) |

Deferred to `/sdd:atdd-apply`: the repository's single-row query logic. It is
engine-agnostic and unchanged, so no new pure-logic acceptance scenario needs a
separate UT suite.

## 2. What is written before production code

Unlike REQ-001 (deviation R4), the artifacts here **precede** the implementation,
so red-green order is honored for the modified contract:

1. **Red first.** Rewrite the two API assertions in `GreetingApiTest` to expect
   `application/json` and `jsonPath("$.message")`, leaving the controller returning
   `text/plain`. Run `mvn -B test` and capture the failure output. The expected
   failure is an assertion/content-type mismatch, not a compilation or context
   error — a context error would mean the test is wrong, not the code.
2. **Green second.** Add `GreetingResponse`, change the controller to
   `produces = APPLICATION_JSON_VALUE`, re-run and capture the pass.
3. **Mutation check.** Temporarily make the controller return a constant
   `new GreetingResponse("Hello World")` and confirm
   `returnsTheStoredMessageWhenItChanges` fails; then revert. This proves the
   second scenario really tests the stored value.
4. **Engine switch.** The SQLite change (D9/D10/D12) has no spec delta, so it is
   verified by the E2E storage scenarios rather than by a red-green cycle. The
   test datasource moves to SQLite in the same step as the production datasource,
   so the API tests exercise the production engine from then on.

Evidence for steps 1–3 is attached to the P4 local-verify report. If the red run
cannot be produced (for example because the driver is missing), that is recorded
as a deviation, not hidden.

## 3. Local vs CI gate expectations

No Project Rules test/pipeline configuration exists (`openspec/config.yaml` has no
`rules` block), so the semantics defined for REQ-001 are reused unchanged — no
second CI product is invented.

| Gate | Local | CI (GitHub Actions) |
|---|---|---|
| Backend build + acceptance tests | `cd backend && mvn -B test` | same command, Java 21 |
| Frontend install + build | `cd frontend && npm ci && npm run build` | same commands, Node 24 |
| Runtime acceptance (E2E) | start the backend, inspect `data/gogo.db` with Python `sqlite3`, `curl -i` the endpoint, open the page in a browser | not run in CI — no browser or service orchestration in this change |

The workflow file is **unchanged** (D7). Its backend job now resolves
`sqlite-jdbc` from Maven Central, which the previous green run did not cover (R8).

CI must **not** invoke `scripts/init.sh`, `scripts/verify-links.sh` or
`scripts/archive-change.sh`: documented placeholders that exit 1
(`scripts/README.md`, measured). `scripts/kb-lint.sh` exits 0 with `SKIP` and is a
documented no-op, not a validation pass.

## 4. Data / fixtures strategy

- **API layer:** isolated SQLite database per test run, seeded by the same
  migration as production. D12: `jdbc:sqlite:file:greeting-test?mode=memory&cache=shared`
  with the Hikari pool pinned to one connection. No shared fixture file, no
  cross-test state. Fallback if shared cache misbehaves: a `@TempDir` file
  database supplied through `@DynamicPropertySource` (R9).
- **Non-constant scenario fixture:** the test updates the stored message through
  the same data-access path (`JdbcTemplate`), asserts the JSON `message` field
  carries the new value, and restores `Hello World` in a `finally` block.
  Ownership: backend test code. Cleanup: the database is discarded with the test
  context.
- **E2E layer:** the real file database at `backend/data/gogo.db`. To verify the
  creation scenario, delete `backend/data/` first, start the backend detached,
  then inspect the file and query the row with Python `sqlite3` (D13). SQLite has
  no `AUTO_SERVER`, but a separate reader connection works while the app holds the
  file. The old `gogo.mv.db` is deleted, not migrated (D14).
- **Frontend E2E:** the dev server proxies `/api` to the backend; no fixture or
  mock is introduced, so the render genuinely depends on the running backend and
  on the JSON parse.
- **Stale-process guard (R12):** after rebuilding, confirm the PID listening on
  8080 is the new jar and that the response carries `application/json`. A leftover
  REQ-001 process would otherwise serve `text/plain` and invalidate the E2E run.
- Test data is owned by this change; no production data is touched.

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| No greeting management UI / write API (`TODO.md` line 31) | `POST`, `PUT`, `DELETE` to `/api/greeting` | 405 for each; the stored row is unchanged | API |
| No hard-coded greeting in the frontend (`TODO.md` line 11) | Search `frontend/src` for the literal `Hello World` | No match | E2E / static |
| No ORM (`TODO.md` line 33) | Inspect `backend/pom.xml` | No JPA/Hibernate starter; `JdbcTemplate` only | static |
| No user system or permissions (`TODO.md` line 32) | `GET /api/greeting` with no credentials | 200 with the JSON greeting | API |
| No separate database service (`TODO.md` line 13) | Start the backend with no external DB running | Starts successfully and creates `data/gogo.db` | E2E |
| No extra JSON fields (proposal §Out of scope) | Inspect the response body | Exactly one key, `message` | API |
| H2 fully removed (D9) | Search `backend/` for `h2` / `org.h2` | No dependency, no driver class, no H2 URL | static |

## 6. NFR tests (optional)

**Not in scope.** No intent source requests observability, performance or
resilience testing, and the delta contains no NFR requirement. Explicit user
confirmation was **not** obtained — the user asked for continuous execution after
giving the rulings. Recorded as deferred, owner Dev/SA to raise if needed. No NFR
test section is designed here.