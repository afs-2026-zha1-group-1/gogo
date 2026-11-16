# ATDD design — us-013-view-trip-members

- Change: `openspec/changes/us-013-view-trip-members/`
- Delta Spec: `specs/trips/spec.md` (ADDED, 8 scenarios) +
  `specs/app-shell/spec.md` (MODIFIED, 3 scenarios); G1 **Pass** 2026-11-16,
  IO Emily + SA Johnson
- Fixtures authority: `requirement-workspace/acceptance-test-fixtures.md`
  §Users / §Sample trip / §US-013 (M1–M10, wire projection, error contract)
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no
  production feature code and no unit-test suite plan is written here.

## 1. ATDD layers in scope

**API** (MockMvc against the real SQLite engine and Flyway migrations, the
`TripApiTest` / `InvitationApiTest` pattern): every endpoint status, error code,
row count, ordering and field-absence assertion. **E2E** (browser against the
running backend + Vite dev server): Screen 7 and the mandatory states, executed
as numbered manual steps at P4 (REQ-004 precedent; no browser automation in CI).
Pure-logic items are minimal (DTO mapping / initial derivation) and are deferred
to apply-time unit TDD.

| # | Scenario (delta / fixtures) | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| S1 | Ben reads the roster (M1) | API | consistency | single endpoint; four rows, ascending ids, organizer flag |
| S2 | Organizer reads the same roster (M2) | API | — | same projection; organizer is not privileged |
| S3 | Eve is denied without identities (M3) | API | security (advisory) | 403 `NOT_A_MEMBER`; body has no `userId` / `displayName` |
| S4-N | No authenticated session (M4) | API | security (advisory) | 401 `USER_REQUIRED`; no member data |
| S5-N | Retired `X-User-Id` header only (M5) | API | security (advisory) | 401 `USER_REQUIRED`; the header does not authenticate |
| S6-N | Unknown trip, member caller (M6) | API | — | 404 `TRIP_NOT_FOUND` |
| S7-N | Unknown trip, outsider caller (M7) | API | — | 404 before 403 (precedence) |
| S8 | Joined member appears once (M8) | API | consistency | test-only `trip_member` insert; five rows, Eve once |
| S9 | Duplicate accept cannot duplicate the row (M9) | API | consistency | composite PK; row count unchanged |
| S10 | No personal fields (M10) | API | — | projection contains only `userId`, `displayName`, `organizer` |
| U1 | Members screen renders roster + organizer badge | E2E | — | only the rendered page proves the display contract |
| U2 | Identity switch to Eve shows denied state; back restores list | E2E | — | user-visible permission state |
| U3 | No trip selected shows guidance; no fabricated members | E2E | — | app-shell contract; no list-all |
| U-states | Loading, empty, error, missing-trip states | E2E | — | mandatory states even if unpictured |
| UT-1 | Initial/avatar-tone derivation and DTO mapping | Defer UT | — | pure logic; apply-time unit TDD |
| Reverse | No write verbs; no readiness/preference fields; no demo data | API + E2E | security (advisory) | Non-goal reverse verification |

Recommended extras are advisory, not gates. The E2E set stays small because
every contractual behavior is observable at the API layer.

## 2. What is written before production code

1. `TripMembersApiTest` authored **red** first: S1–S10 and the identity/trip
   negatives, using the fixture users/trip and reading the trip id from the
   seed lookup (`TripApiTest` pattern). It must fail against the tree (no
   `/members` route → 404).
2. The E2E checklist (U1–U3 + four states) written into
   `docs/feedback/e2e-us-013.md` as numbered browser steps with expected
   observations, executed at P4 against the running apps.
3. No controller/repository/frontend code until the red API checks exist.
   Red-green execution itself is owned by `/sdd:atdd-apply`.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` and `cd frontend && npm run build`; then
  the P4 local-verify report with the API matrix and browser steps.
- CI gate: the existing two-job workflow **unchanged** (backend `mvn -B test`,
  Java 21; frontend `npm ci && npm run build`, Node 24). Browser E2E is not run
  in CI.
- G2 requires a fresh CI run read with `gh` (or a named human confirmation if
  the API fails), never an inherited green.
- No second CI semantics is invented; the harness placeholder scripts stay
  untouched.

## 4. Data / fixtures strategy

- Shared authority: `requirement-workspace/acceptance-test-fixtures.md` §US-013.
  Users 1–5 and the fixture trip come from the merged `V2` seed.
- Each test class runs against its own isolated SQLite database
  (`jdbc:sqlite:file:trip-members-test?mode=memory&cache=shared`,
  `maximum-pool-size=1`) migrated by Flyway V1–V6. Identity is driven with the
  merged `TestAuth.asUser` helper; `X-User-Id` no longer authenticates. The
  roster read is side-effect free; the joined-member case inserts
  `trip_member (trip, 5)` and deletes it in `finally`.
- No migration, no seed change. Trip ids and row ids are read from the seed
  lookup / response, never hard-coded.
- E2E uses the dev database seeded by V2/V6; sign in as Eve for the denied
  state and as Ben for the roster.

## 5. Non-goals

- No business feature coding in this skill; no detailed UT suite plan.
- No Playwright/POM/Excel/bulk testcase generators.
- No new CI product, no browser automation in CI.
- No readiness/preference/budget/plan assertions beyond proving their absence.
- No product write path for membership or organizer changes.

## 6. NFR tests

No AC states an observability, performance, resilience or compatibility target;
this is a read-only roster over a seeded fixture. NFR testing is **out of scope
for this change** and recorded as deferred, not silently omitted. If a later
story adds a volume/SLA target, it gets its own change.
