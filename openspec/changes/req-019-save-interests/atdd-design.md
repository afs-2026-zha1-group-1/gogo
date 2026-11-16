# ATDD design — req-019-save-interests

- Change: `openspec/changes/req-019-save-interests/` (REQ-019, US-019)
- Delta Spec: `specs/preferences/spec.md` — 5 ADDED requirements, 31 scenarios,
  G1 Pass (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15; gate closed 2026-11-16 at
  `5a255b6`)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (users 1–5, seeded
  trip). REQ-019 request samples stay in the delta (D16)
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no feature
  code and no unit-test suite plan is written here.

P3 rulings carried into this design:

- **D15 — error-advice scope: own advice.** `com.gogo.preference` gets
  `PreferenceApiException` + `PreferenceErrorAdvice(basePackages = "com.gogo.preference")`,
  copying `InvitationErrorAdvice` verbatim. `TripErrorAdvice` is **not** widened: the
  merged code already has one advice per feature package, and widening it to
  `com.gogo` would make one class own four packages' error mapping.
- **D16 — OQ-15 closed: no new rows in the shared fixtures file.** Every value the
  tests need is already fixed in the delta scenarios, and
  `acceptance-test-fixtures.md` is extended by sibling changes (REQ-020/024) in
  parallel, so duplicate interest samples would only add conflict surface.

## 1. ATDD layers in scope

**API** — `PreferenceApiTest`, MockMvc against the real SQLite engine and Flyway
migrations, following `TripApiTest` / `InvitationApiTest`: every endpoint contract,
validation branch, and stored-row assertion. **E2E** — browser against the running
backend plus the Vite dev server, as numbered steps with expected observations, the
form REQ-003/004 used; there is no Playwright layer in this repository. Pure-logic
items defer to apply-time unit TDD.

DB-state THEN clauses stay at the **API** layer rather than being pushed to E2E
because each one is observable inside a single endpoint call while the test can read
the same SQLite file through `JdbcClient`; no multi-system path is needed to prove
"the row was not written" (layer-inference priority 1 beats priority 3 here).

| # | Scenario | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| ID-1 | Caller identity is missing | API | security (advisory) | 401 `USER_REQUIRED`; one endpoint |
| ID-2 | Caller identity is unusable (`99`, `abc`) | API | security (advisory) | 401; no interests in body |
| ID-3 | Surrounding whitespace in the identity header is tolerated (`" 2 "`) | API | — | parity with `TripRepository.findUserId` |
| ID-4 | A non-member is denied (Eve, id 5) | API | privacy (advisory) | 403 `NOT_A_MEMBER` plus unchanged member rows |
| ID-5 | An unknown trip is reported before membership | API | — | 404 precedes 403; single request |
| CAT-1 | All seven interests are accepted | API | — | order and stored codes read from the DB |
| CAT-2 | Wrong case is rejected (`art`, `ART`) | API | — | literal matching |
| CAT-3 | Surrounding whitespace is rejected (` Art `, `Art `) | API | — | literal matching, no trim |
| CAT-4 | Empty strings and near-matches are rejected (`""`, `" "`, `teleport`, `foodie`) | API | — | literal matching, no substring |
| SAVE-1 | Duplicate values collapse to one (`Art, Nature, Art`) | API | — | AC1; payload parsed, row count read |
| SAVE-2 | Repeating the same set is idempotent | API | consistency (advisory) | payload unchanged; `updated_at` may move |
| SAVE-3 | A save replaces instead of merging | API | — | C1; second write overwrites |
| SAVE-4 | An empty array clears interests but keeps the record | API | — | row still present with `{"codes":[]}` |
| SAVE-5 | A value outside the catalogue rejects the whole request | API | — | AC2; `payload` and `updated_at` byte-identical |
| SAVE-6 | A mixed request is rejected as a whole | API | — | allowed element not stored either |
| SAVE-7 | The first save creates exactly one row | API | consistency (advisory) | UNIQUE(`trip_id`,`user_id`,`kind`) |
| SAVE-8 | A malformed request is rejected (not an object, missing field, non-array, `null`/numeric element) | API | — | 400 `INVALID_REQUEST`; saved set unchanged |
| READ-1 | A member reads back the saved set | API | — | AC1 reload half; equals the `PUT` echo |
| READ-2 | A member without saved interests reads an empty array | API | — | member not omitted |
| READ-3 | Members do not overwrite each other | API | privacy (advisory) | two rows, two identities |
| READ-4 | The response carries only the agreed fields, ordered by user id | API | — | C2; exact key set and order |
| READ-5 | Reading changes nothing | API | — | read-only; `payload`/`updated_at` unchanged |
| PAGE-1 | Loading | E2E | — | controls and Save disabled before `GET` returns |
| PAGE-2 | Empty state | E2E | — | nothing preselected, can save immediately |
| PAGE-3 | Saved interests are shown again after a reload | E2E | — | AC1 user-visible half |
| PAGE-4 | Switching identity reloads for the new identity | E2E | — | cross-surface: top bar plus page |
| PAGE-5 | Saving disables duplicate submissions | E2E | — | in-flight state |
| PAGE-6 | A successful save follows the response | E2E | — | selection equals response `interests` |
| PAGE-7 | A rejected save shows an inline error and rolls back | E2E | — | 400 `message` shown; selection restored |
| PAGE-8 | Identity, membership or trip is rejected | E2E | — | 401/403/404 surface; no saved data rendered |
| PAGE-9 | Loading fails | E2E | — | error plus retry; never renders stale selection as saved |
| UT-1 | Dedupe keeps first-occurrence order | Defer UT | — | pure list transform |
| UT-2 | `label` → `code` mapping in both directions | Defer UT | — | pure constant lookup |
| UT-3 | `payload` serialization / parsing of `{"codes":[...]}` | Defer UT | — | pure transform |
| UT-4 | Validation completes before the first write | Defer UT | — | ordering of one service method |

The malformed-body classification is no longer a unit concern: after D17 the request
shape is enforced by Jakarta Validation at the argument resolver, so it is asserted by
SAVE-7 at the API layer (an `INVALID_REQUEST` for a bare string, a null element or a
number) instead of by a fifth unit case.

## 2. What is written before production code

1. `backend/src/test/java/com/gogo/preference/PreferenceApiTest.java` authored red
   first, covering the 22 API scenarios plus the API-level reverse rows of §5. It
   follows `TripApiTest`'s harness: `@SpringBootTest(classes = HelloApplication.class,
   properties = {"spring.datasource.url=jdbc:sqlite:file:preference-test?mode=memory&cache=shared&foreign_keys=on",
   "spring.datasource.hikari.maximum-pool-size=1"})`, `@AutoConfigureMockMvc`, autowired
   `JdbcClient`. The `foreign_keys=on` parameter mirrors the production URL DD2
   introduces, so the test enforces the same constraints the shipped app does.
2. The red run is recorded and must fail for the right reason: before `V4` and the
   controller exist, the endpoints have no mapping and `member_preference` does not
   exist. A green run at this point is a defect in the checks, not success.
3. The E2E checklist (PAGE-1…PAGE-9) is written as numbered browser steps with
   expected observations, executed at P4 against the running apps.
4. No migration, backend feature code, route or page until the red checks exist.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` (whole suite on the production engine, so the
  `greeting`, `trips` and `invitation` classes also prove no regression) and
  `cd frontend && npm ci && npm run typecheck && npm run build`; then the browser steps.
  The typecheck is part of the gate from P4 on, because the page is TypeScript (DD9).
  P4 records the evidence in a `docs/ai4se-plugins/` local-verify report and adds
  `docs/feedback/verification-matrix.md` rows.
- CI gate: the two-job workflow (`.github/workflows/ci.yml` — `mvn -B test`, and
  `npm ci` + `npm run typecheck` + `npm run build`) on a pull request to `main`. The
  frontend job gains the typecheck step as part of DD12; the backend job is unchanged.
  G2 needs a fresh run read for this change's commit; nothing from REQ-003/004 is
  inherited. No new CI product is introduced.
- **Not** a P3/P4 gate: `openspec validate req-019-save-interests --strict`. G1 closed
  with that check failing (five requirement bodies over 500 characters) and carried it
  as a G1 condition that blocks archive, not implementation. The CLI is not on `PATH`
  in this environment either, so the rerun needs a machine that has it; P3 only
  registers the task.

## 4. Data / fixtures strategy

- **Authority:** users 1–5 and the "Singapore Friends Day" trip come from
  `acceptance-test-fixtures.md` unchanged; every REQ-019 value (labels, bodies,
  expected status/code) is fixed in the delta scenarios, so the shared file gains no
  REQ-019 section (D16).
- **Trip id is resolved, never assumed:** the delta's "trip 1" is shorthand. The test
  reads `SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'`, matching the
  fixtures rule that the id is assigned by the database and the existing
  `TripApiTest.seededTripId()`. The E2E path uses whatever id the dev database holds;
  the steps discover it from the home page rather than typing a constant.
- **Isolation:** `PreferenceApiTest` is the only class touching `member_preference`, and
  `@BeforeEach` runs `DELETE FROM member_preference`. This is test-only state cleanup,
  not a product branch; cross-member cases then create their rows through the API.
- **No mocks:** row count, `payload` and `updated_at` are read through the same
  autowired `JdbcClient`, so AC2's "byte-identical before and after" is proven on the
  real engine.
- **Reverse-check setup:** the "no lock after main-plan confirmation" row needs
  `trip.main_plan_confirmed = 1`, which no endpoint sets in this change. It is applied
  by a test-only direct update and restored afterwards, the same documented pattern as
  REQ-004's J4.
- **E2E cleanup uses the product:** saving `{"interests":[]}` clears the set and keeps
  the row, so the browser path leaves no state behind and PAGE-2's empty state is
  reproducible without SQL against the dev database.

## 5. Non-goals and reverse verification

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| Must-do, constraint and budget kinds (REQ-020/024 scope) | `PUT` body with an extra `"kind":"budget"` field; `GET` response keys | extra field ignored, only `interest` rows written; no `mustDos`/`budget` keys | API |
| Only the caller's own record can be written | Ben saves while Chloe's row exists; no body field selects a target user | Chloe's `payload` unchanged; no `userId` accepted in the body | API |
| No "I have no preference" explicit state (US-027) | `GET` after an empty-array save | `interests: []` and no `noPreference`/`declaredAt` field | API |
| No readiness gating or required-preference count (US-026) | `GET` response and REQ-026 change folder | no `ready`/`required` fields; REQ-026 stays P1 by the user's ruling | API + static |
| No preference comparison or plan generation (US-031) | `GET/POST /api/trips/{id}/plans`, preference-comparison route | no such mapping (405/404); no comparison code in the package | API + static |
| No locking after the main plan is confirmed (D4) | `trip.main_plan_confirmed = 1` by test-only update, then `PUT` | still 200; no lock branch in the service | API |
| No `tag` table or `/api/tags` dependency (D2) | `GET /api/tags`; grep the new package for `tag` | no such endpoint; no reference in `com.gogo.preference` | API + static |
| No real authentication (scaffold) | any seeded id works with no credential | accepted as given; `X-User-Id` documented as scaffold | API |
| No local storage as saved-state evidence | grep `frontend/src` for `localStorage` | no match | static |
| No regression in merged capabilities | full `mvn test`; `PUT /api/trips/{id}`; `GET /api/greeting` | `greeting` JSON unchanged, trip write still 405, invitation suite green | API |

## 6. NFR tests (optional)

**Not in scope** — decided by the user on 2026-11-16 when asked directly. The delta
contains no observability, performance or resilience requirement, and P4 delivers
functional evidence only. Recorded as deferred; IO/SA raise it if a later story needs
it.
