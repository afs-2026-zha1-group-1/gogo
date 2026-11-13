# ATDD design — req-001-hello-world

- Date: 2026-11-13
- Stage: P3, `/sdd:atdd-design`
- Delta Spec: `specs/greeting/spec.md` (3 requirements, 6 scenarios)
- Scope: acceptance layers only (API + E2E). Unit-test suite design is out of this
  document and belongs to `/sdd:atdd-apply`.

## 1. ATDD layers in scope

| Scenario (delta spec) | Layer | Rationale |
|---|---|---|
| First start creates and seeds the database | **E2E** | Database-absence case: requires a real process start with no DB file, then file inspection and a row query |
| Later start preserves the seeded greeting | **E2E** | Requires a second real start against the existing file |
| Stored greeting is returned (`GET /api/greeting`) | **API** | Observable HTTP status + exact body |
| Response reflects stored data, not a constant | **API** | Same endpoint, with a fixture that changes the stored message |
| Home page shows the served greeting | **E2E** | Browser render of the fetched value |
| Backend unavailable | **E2E** | Browser render with the backend stopped |

Deferred to `/sdd:atdd-apply` (unit-level TDD): the repository's single-row query
logic. No pure-logic acceptance scenario needs a separate UT suite here.

## 2. What is written before production code

Intended order: the API check for "Stored greeting is returned" and the E2E
checks for database creation and page render are authored (or stubbed red) before
the corresponding production code.

**Actual order in this session — deviation R4:** the user asked for implementation
first, so production code and one API test already exist and were verified before
P1–P3 were authored. The red-green order was therefore not honored. Compensating
actions, owned by P4:

1. Add the missing API test for "Response reflects stored data, not a constant"
   (currently untested — recorded in `dov-ac-review.md` residual concern 3).
2. Add reverse checks for the non-goals (§5 below).
3. Re-run every acceptance check against the delta spec and record real evidence
   in the local verify report, rather than treating the earlier run as sufficient.

## 3. Local vs CI gate expectations

No Project Rules test/pipeline configuration exists (`openspec/config.yaml` has no
`rules` block), so this design defines one semantics and CI mirrors it — no second
CI product is invented.

| Gate | Local | CI (GitHub Actions) |
|---|---|---|
| Backend build + acceptance tests | `cd backend && mvn test` | same command, Java 21 |
| Frontend install + build | `cd frontend && npm ci && npm run build` | same commands, Node 24 |
| Runtime acceptance (E2E) | start backend, inspect DB file, `curl` the endpoint, open the page in a browser | not run in CI — no browser or service orchestration in this change |

CI must **not** invoke `scripts/init.sh`, `scripts/verify-links.sh` or
`scripts/archive-change.sh`: they are documented placeholders that exit 1
(`scripts/README.md`, measured). `scripts/kb-lint.sh` exits 0 with `SKIP` and is a
documented no-op, not a validation pass.

## 4. Data / fixtures strategy

- **API layer:** isolated in-memory database per test run
  (`jdbc:h2:mem:greeting-test`), seeded by the same migration as production. No
  shared fixture file, no cross-test state.
- **Non-constant scenario fixture:** the test updates the stored message through
  the same data-access path, then asserts the endpoint returns the new value.
  Ownership: backend test code. Cleanup: the in-memory database is discarded with
  the test context.
- **E2E layer:** the real file database at `backend/data/gogo.mv.db`. To verify
  the creation scenario, delete `backend/data/` first, start the backend, then
  inspect the file and query the row. The URL uses `AUTO_SERVER=TRUE` so the row
  can be queried while the app holds the file.
- **Frontend E2E:** the dev server proxies `/api` to the backend; no fixture or
  mock is introduced, so the render genuinely depends on the running backend.
- Test data is owned by this change; no production data is touched.

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| No greeting management UI / write API (`TODO.md` line 31) | Send `POST`, `PUT`, `DELETE` to `/api/greeting` | Request rejected as an unsupported method (405); no greeting mutation | API |
| No hard-coded greeting in the frontend (`TODO.md` line 11) | Search `frontend/src` for the literal `Hello World` | No match | E2E / static |
| No ORM (`TODO.md` line 33) | Inspect `backend/pom.xml` dependencies | No JPA/Hibernate starter present | static |
| No user system or permissions (`TODO.md` line 32) | Call `GET /api/greeting` with no credentials | 200 with the greeting | API |
| No separate database service (`TODO.md` line 21) | Start the backend with no external DB running | Starts successfully and creates the file | E2E |

## 6. NFR tests (optional)

**Not in scope.** No intent source requests observability, performance or
resilience testing, and the delta spec contains no NFR requirement. Explicit user
confirmation was **not obtained** — the user asked for continuous P1–P5 execution
without an NFR discussion. Recorded as deferred, owner Dev/SA to raise if needed.
No NFR test section is designed here.
