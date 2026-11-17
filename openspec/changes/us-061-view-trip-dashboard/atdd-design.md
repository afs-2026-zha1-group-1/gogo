# US-061 ATDD design

Inputs: [proposal](proposal.md), [dashboard delta](specs/trip-dashboard/spec.md),
[shell delta](specs/app-shell/spec.md), and [G1 decision](g1-decision.md).
This is a test design, not implementation or a gate decision.

## Layers and red-first examples

Before feature code, write each applicable acceptance check, run it to
demonstrate the expected failure, implement its slice, then rerun it. An
isolated test double for the as-yet-undelivered completion source can exercise
failure behavior but is not evidence that the actual US-058 integration works.

| Case | Layer | Acceptance observations | Advisory |
|---|---|---|---|
| Member list and isolation | API + E2E | Ben has active A/B, completed C and no membership in D: exactly A/B and saved card fields; select B. Signed-out, empty and other-member cases disclose nothing. | Security review recommended |
| Completion failure | API + E2E | Unavailable, missing or invalid completion state cannot produce an active card or a successful empty list; selected completed trip is not an active overview. | Integration recommended |
| Overview sources | E2E | Four members, three ready, stale main draft and active split display real values; successful no-draft outcomes show absent; source changes appear on refresh. | Integration recommended |
| Progress | E2E | Joining open with unsubmitted preferences; confirmed plan with absent and cancelled splits; active and confirmed split. Assert all seven stages and the waiting message, and no recommendation. | Defer pure projection unit tests to apply-time TDD |
| Errors and access | API + E2E | Pending, invalid/incomplete or failed responses are not zero, absent or active; malformed, missing, denied, signed-out and expired requests show their proper state without private data or another trip. | Security review recommended |
| Shell and navigation | E2E | Four ordered tabs; dashboard active on both views; history and account retained; safe destinations, coming-soon destinations and blocked trip-details entry/tab/open-by-id; no full reload for available dock tabs. | Compatibility review recommended |
| Read-only reverse cases | E2E | Compare relevant persisted trip, membership, invitation, preference, plan, split and completion state before/after dashboard load and navigation. No invitation issuance, completion, archive operation or destination action occurs merely by navigation. | Integration recommended |
| No dashboard-owned state | E2E | Refresh reflects changed source state without dashboard writes, persisted progress, or generated next-action recommendation. | — |
| No new permission or tracker change | API + E2E / process | Existing destination authorization still applies; no dashboard role bypass; tracker reconciliation remains the named owner's separate action. | Security review recommended |

## Fixtures and isolation

Use the synthetic Alice/Ben/Chloe/Daniel trip in
`requirement-workspace/acceptance-test-fixtures.md` as a baseline, with test-only
additional trips and memberships for A/B/C/D. Use isolated temporary databases
and session-authenticated test accounts; never modify a shared development
database. Set up and clean up readiness, plan and split data per test. Completion
fixtures and their cleanup must use the delivered US-058 test contract; until
then, only controlled doubles may be used and real integration remains blocked.
Failure injection must cover each owning read separately, including malformed
successful bodies. Capture state before/after navigation, not merely HTTP method
counts, for no-write acceptance.

## Local and CI gates

Current CI runs `mvn -B test` in `backend`, the lockfile portability check and
`npm run build` in `frontend` after `npm ci`; it does not run browser E2E.
Run focused API checks and the applicable browser acceptance checks locally,
then those existing full commands. The project testing rule recommends
Playwright for critical flows, but this repository has no configured E2E
runner. Establish and document a reproducible browser acceptance command and
its CI integration during apply; do not call it an existing gate or claim
end-to-end acceptance without real US-058/auth and relevant dependencies.

## Non-goals and NFR

This design creates no feature code, generated Playwright/POM/Excel files,
unit-test suite, new CI product, archive, completion writer or destination
operations. Unit-level logic coverage belongs to apply-time TDD. Non-functional
testing is deferred by user decision on 2026-11-17; functional authorization,
failure handling and no-write assertions remain in scope.
