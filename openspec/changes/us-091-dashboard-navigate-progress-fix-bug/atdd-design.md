# ATDD design — US-091

## Layers and acceptance checks

Write or update the applicable acceptance checks before the corresponding
production slice and confirm that the changed behavior fails for the expected
reason. Retain existing coverage for unchanged behavior.

| ID | Scenario and observable outcome | Layer | Advisory |
|---|---|---|---|
| E1 | Select saved trip A, open dashboard B, select Trips: A's details appear; the stored selection stays A, including after reload. | E2E | Consistency |
| E2 | With no saved selection, Trips shows its empty state and picker link; a failed current-trip read shows an error and retry, not an empty or fabricated trip. | E2E | Resilience |
| E3 | For organizer and member, the progress strip excludes reunion and completion, reflects source states, keeps invitation active after readiness until draft generation, and uses actual joining-closed state. Before a draft, the next step recommends generation and both generation and invitation actions are offered. | Unit / E2E | — |
| A1 | A member issues the first invitation; organizer and member receive the same token and join path on later requests. | API | Security, consistency |
| A2 | A non-member receives 403 with no token; missing or invalid session receives 401 `USER_REQUIRED`; an unknown trip receives 404 `TRIP_NOT_FOUND`. | API | Security |
| E4 | Using the real service and isolated database, verify exactly one invitation exists after member-first issuance and reuse, and that denied requests create none. | E2E / service integration | Security, consistency |
| E5 | Organizer and member can view the same invitation link and QR in embedded and dedicated views, including the dashboard entry. On pre-plan details, the app-bar entry opens the dedicated view, copy preserves the link without additional writes, and back and re-entry preserve the trip and invitation; an outsider sees no link or QR. | E2E | Security |
| E6 | Without an available trip, the split tab retains its existing fallback: the non-dashboard Trips empty state or, in dashboard context, the trip-entry guard. | E2E | Consistency |
| A3 | After plan confirmation, acceptance by a new member is rejected, while an existing member's repeat acceptance remains idempotent. | API | Security, consistency |
| A4 | A ready member can generate and regenerate; non-members are denied, pending members block generation, confirmed plans cannot be regenerated, and only the organizer can confirm. | API | Security, consistency |
| E7 | Both roles can generate from the inputs and draft views; regeneration warns about replacing manual edits. Confirmation remains organizer-only. | E2E | Security, consistency |
| E8 | The dashboard upper-left create-trip quick entry opens the same `#/create` page as My Trips. | E2E | Consistency |

Pure progress-state derivation is **deferred to `/sdd:atdd-apply`
(unit-level TDD)**. The API tests may also assert database rows with the
existing integration fixture; E4 ensures persistence assertions are exercised
through real application and database boundaries. Advisory layers do not add
new pipeline gates.

## Reverse checks for non-goals

| Boundary | Reverse verification |
|---|---|
| Dashboard viewing does not change selection | E1 checks the saved trip before and after the direct dashboard visit and navigation. |
| Join deadline is unchanged | A3 checks both new and existing members after confirmation. |
| Confirmation and split permissions are unchanged | Retain authorization regression tests; an outsider remains denied and only the organizer may confirm. Member generation does not grant split writes or stop editing. |
| No invitation expiry, revocation or new share channels | Review the change diff for new expiry/revocation/channel behavior; retain existing invitation lifecycle and copy/link tests. |
| No new data model or endpoint | Review the implementation diff for migrations and API additions; issuance continues to use the existing endpoint and per-trip token. |

## Fixtures and isolation

- Extend `InvitationApiTest` with its existing `TestAuth`, MockMvc and isolated
  in-memory SQLite fixture. Reset invitation, membership and confirmation state
  per test, and assert persisted row counts as well as response bodies.
- Run browser tests through `npm run test:e2e`; its runner creates and cleans
  an isolated temporary SQLite database, with `dashboard.sql` and the existing
  fixtures loaded by Playwright's backend server. Use organizer, member and
  outsider identities and trips already in those fixtures where suitable;
  add only data needed for uncovered states and restore mutations in `finally`.
- Simulate the current-trip read failure at the browser boundary and verify
  recovery with retry. Never mutate the shared development database.

## Local and CI expectations

Locally run the focused invitation API, progress unit and relevant Playwright
tests, then the frontend build; record commands and results. The existing CI
workflow runs backend `mvn -B test`, frontend typecheck/unit/build, and
`npm run test:e2e` in its browser-acceptance job. Required gates are the
existing workflow results, not a new CI product.

## Non-goals and NFR

This design does not implement production behavior, prescribe a unit-test suite,
or create Playwright/POM/Excel generators or new CI jobs. Separate NFR testing
is deferred by the user; authorization and error behavior above remain required
functional checks.
