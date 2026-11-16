# ATDD design — req-003-trip-create-and-view

- Change: `openspec/changes/req-003-trip-create-and-view/` (REQ-003, US-001/US-002)
- Delta Spec: `specs/trips/spec.md` — 3 ADDED requirements, 12 scenarios, G1 Pass
  (IO Emily + SA Johnson, 2026-11-14)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (C1–C7, R1–R3-N)
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no
  production feature code and no unit-test suite plan is written here.

## 1. ATDD layers in scope

**API** (MockMvc against the real SQLite engine and Flyway migrations, the
pattern of `GreetingApiTest`): every endpoint contract, validation branch and
stored-row assertion. **E2E** (browser against running backend + Vite dev
server): create form, details view and their mandatory states. Pure-logic items
defer to apply-time unit TDD.

| # | Scenario | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| C1 | Create persists six values, organizer + member | API | — | single endpoint; row and membership read from real DB |
| C1b | Same-day dates accepted | API | — | boundary of the date-order rule |
| C2 | Inverted range rejected, nothing stored | API | — | 400 `INVALID_DATE_RANGE` + row count |
| C3 | Blank name rejected, nothing stored | API | — | 400 `NAME_REQUIRED` + row count |
| C6 | Missing/null/blank destination rejected | API | — | 400 `DESTINATION_REQUIRED`; no trip or membership |
| C7 | Optional locations normalize to null; supplied preserved | API | — | 201; null read-back; member read equals saved values |
| C4-N | Malformed date rejected | API | — | 400 `INVALID_DATE` |
| C5-N | Create without/unknown identity | API | security (advisory) | 401 `USER_REQUIRED`, nothing stored |
| R1 | Member reads saved values | API | — | 200 with the six values |
| R2 | Non-member denied, no trip values | API | privacy (advisory) | 403 `NOT_A_MEMBER` + absence assertion |
| R2-N | Read without identity | API | — | 401 `USER_REQUIRED` |
| R3-N | Unknown trip id | API | — | 404 `TRIP_NOT_FOUND` |
| E1 | Create form submit → details shows saved trip | E2E | — | user-visible create-then-read flow |
| E2 | Create validation errors, loading, denied and not-found surfaces | E2E | — | mandatory states even where not pictured |
| UT-1 | Date parsing, blank normalization, location null normalization | Defer UT | — | pure logic; apply-time unit TDD |

## 2. What is written before production code

1. `TripApiTest` authored red first covering C1–C7, C4-N, C5-N, R1–R3-N with the
   fixture users/trip; trip ids read from create responses, never assumed.
2. The E2E check list (E1, E2) written as numbered browser steps with expected
   observations, executed at P4 against the running apps.
3. No migration, backend feature code or frontend change until the red API
   checks exist.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` (same engine and migrations as production)
  and `cd frontend && npm run build`; P4 local-verify report with runtime
  evidence per scenario.
- CI gate: existing two-job workflow on a feature-branch pull request to
  `group1/main`; G2 requires a fresh run read with `gh`, never inherited green.
- No second CI semantics; harness placeholders stay untouched.

## 4. Data / fixtures strategy

- Shared authority: `requirement-workspace/acceptance-test-fixtures.md`.
- `V2` seeds the five users and the sample trip with four members, so R1/R2 are
  reproducible from a fresh database without test-only setup.
- New trip ids come from the C1 response; no hard-coded ids.
- Each test class uses its own shared in-memory SQLite file migrated by Flyway
  (`V1`–`V2`), pool size 1, following `GreetingApiTest`.
- E2E uses the dev database seeded by `V2`; the identity switcher selects the
  fixture user per request.

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| No trip edit/delete (REQ-003 out of scope) | `PUT`/`PATCH`/`DELETE /api/trips/{id}` | 405; stored values unchanged | API |
| No trip list/search (REQ-003 out of scope) | `GET /api/trips` | 404/405; no collection endpoint | API |
| No invitations/joining (REQ-004 scope) | `POST /api/trips/{id}/invitation`, `/api/invitations/*` | 404; no invitation table in `V2` | API + static |
| No location completion (OQ-6 → US-031) | C7 read-back; inspect create path | null stays null; no completion code in REQ-003 | API + static |
| No real authentication (scaffold) | create/read with any seeded id, no credentials | accepted as given; documented as scaffold | API |
| No ORM (REQ-001 non-goal) | inspect `backend/pom.xml` and `com.gogo.trip` | `JdbcTemplate` only | static |
| No greeting regression | `GreetingApiTest` + `GET /api/greeting` | unchanged JSON `{"message":"Hello World"}` | API |

## 6. NFR tests (optional)

**Not in scope.** No intent source requests observability, performance or
resilience testing, and the delta contains no NFR requirement. Explicit user
confirmation was not obtained — the user asked for continuous execution after
the G1 rulings. Recorded as deferred, owner Dev/SA to raise if needed.