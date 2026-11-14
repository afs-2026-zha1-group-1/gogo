# Proposal

## Why

Iteration 0's first two `Trip Setup` stories (issue #4 US-001, issue #5 US-002)
describe the same aggregate from two sides: create a shared trip, then read it
back as a member. The repository currently ships one unrelated capability
(`greeting`), so neither flow exists.

Both stories are `Priority - Must`. Building them in one change keeps one
testable flow — create, then read — inside one set of gates, and avoids a second
migration touching the same three tables.

The stories assume a signed-in user while the project has no identity system
(REQ-001 non-goal). The scaffold-level substitution is a seeded user table plus an
`X-User-Id` request header: enough to decide membership and exercise the denied
case, without inventing an authentication feature that neither story asks for.

## What Changes

- **ADDED** capability `trips` with three requirements:
  - "Trip caller identity" — `X-User-Id` names the caller on both endpoints; a
    missing or unknown id is rejected; the header is a scaffold stand-in, not a
    verified credential.
  - "Trip creation" — `POST /api/trips` persists name, destination, start and end
    dates, start and end locations; the caller becomes organizer and first member;
    blank name and inverted date range are rejected; nothing is stored on rejection.
  - "Trip detail read" — `GET /api/trips/{id}` returns the saved values to a
    member, denies a non-member with no trip values in the body, and reports a
    missing id separately from a denial.
- Flyway `V2__create_trip.sql` creates `app_user`, `trip` and `trip_member`, and
  seeds the five fixture users plus the sample trip with its four members.
- New backend package `com.gogo.trip` using `JdbcTemplate` (no ORM), with a stable
  error `code` per failure so the AC cases are distinguishable.
- Frontend gains a create screen and a details screen, including the loading,
  validation-error, denied and not-found states that the stories require even
  where the (unavailable) screenshots do not show them.
- `requirement-workspace/acceptance-test-fixtures.md` is authored, because both
  story bodies cite it and it did not exist.

Unchanged: the `greeting` capability, the SQLite datasource, the two-job CI
workflow, the dev proxy, and every REQ-001 non-goal.

No breaking change: both endpoints are new, and no existing path changes.

## Capabilities

### New Capabilities

- `trips`: create a shared trip and read its saved details, with membership decided
  by the seeded user table.

### Modified Capabilities

None.

## Impact

- **Requirement**: REQ-003 (`requirement-workspace/requirements/REQ-003.md`),
  intent `requirement-workspace/intents/2026-11-14-req-003.md`, DoR
  `requirement-workspace/analysis/req-003-dor.md`.
- **Stories**: issue #4 (US-001), issue #5 (US-002), project item ids
  `PVTI_lADOFTMjns4BraZGzhIY_3c` (US-001) and its US-002 sibling in project #2.
- **Code**: new `backend/src/main/java/com/gogo/trip/` package,
  `V2__create_trip.sql`, new `TripApiTest`, and new frontend screens plus the
  shell that reaches them.
- **APIs**: `POST /api/trips`, `GET /api/trips/{id}`. Both require `X-User-Id`.
  Error bodies carry `code` and `message`.
- **Data**: three new tables; five seeded users; one seeded sample trip. No
  existing table is altered.
- **Dependencies**: none expected on the backend. The frontend may need one
  routing dependency, decided at P3.
- **CI**: unchanged; the new test class runs in the existing backend job.
- **Docs / harness**: `README.md`, the verification documents, stage reports under
  `docs/ai4se-plugins/`. The knowledge base remains unconfigured.

## Effort and ordering

Medium. One vertical slice with two endpoints that share a table: migration →
repository → create endpoint → read endpoint with membership check → frontend
create screen → frontend details screen → verification. The details screen needs
the create response only to obtain a trip id; there is no other dependency.
`/sdd:story-split` is Skipped: both stories already exist as GitHub issues.

## A0 deep-dive gate

`requirement-workspace/analysis/req-003-dor.md`: ⑨ data contract (three tables,
wire shapes, error codes), ⑩ boundary (nine branches including the denied and
missing cases), ⑪ cross-REQ (independent of `greeting`), ⑫ display contract (two
screens plus their error states) — all Pass → **A0 Pass**, split permitted.

## Known deviations carried into later stages

- `X-User-Id` is trusted without verification. It is a scaffold stand-in for
  "signed in" and must not be described as a security control.
- A non-member receives `403`, which confirms the trip id exists. Chosen from the
  AC wording; recorded as a trade-off in REQ-003 OQ-2.
- The UI screenshots referenced by both stories are not in the repository. Layout
  is a design judgement from the AC text and the mandatory state list.
- Whether `destination` and both locations are required is unstated. Default:
  stored verbatim, no invented validation error (REQ-003 OQ-1).
