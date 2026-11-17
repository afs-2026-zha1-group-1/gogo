# US-061 ATDD design

Inputs: [proposal](proposal.md), [dashboard delta](specs/trip-dashboard/spec.md),
[shell delta](specs/app-shell/spec.md), and [G1 decision](g1-decision.md).
This is a test design, not implementation or a gate decision.

**Status:** Accepted as the implementation baseline by the requester on
2026-11-17. The requester reported that the named IO and SA decided Pass for
the revised scope; see the [G1 decision](g1-decision.md). Acceptance of this
test design does not claim that its checks have been implemented or passed.

## Layers and red-first examples

Once the G1 and acceptance prerequisites are satisfied, write each applicable
acceptance check before feature code, run it to demonstrate the expected
failure, implement its slice, and rerun it. US-058 completion filtering and
completion-aware progress are deferred; no completion-source double
establishes or simulates that integration.

| Case | Layer | Acceptance observations | Advisory |
|---|---|---|---|
| Member list and isolation | API + E2E | Ben belongs to A/B/C and not D: exactly A/B/C and saved card fields; select B. Signed-out, empty and other-member cases disclose nothing. No card claims active or completed status. | Security review recommended |
| Deferred completion boundary | E2E | List and overview remain available without a completion source. Do not filter member trips or infer active or completion status from dates, split state or missing values. | Integration recommended for the later US-058 change |
| Overview sources | E2E | A trip with four members, three ready, a stale main draft and no split displays real values; a separate trip with a confirmed plan and active split displays those statuses. Reject an injected active split with an unconfirmed plan. Successful no-draft outcomes show absent; source changes appear on refresh. | Integration recommended |
| Planning milestones | E2E | In prototype order, setup is created; invitations reflect the trip's main-plan-confirmed flag; preferences show the verified ready/member count; main plan distinguishes absent, draft, stale and confirmed; split distinguishes absent, active, confirmed and cancelled. Reunion and completion are unknown, not completed/current/upcoming. | Defer pure logic checks to apply-time TDD |
| Next step | E2E | An unready signed-in member with an unconfirmed main plan is offered a safe preferences destination; a ready member or a confirmed main plan is offered a safe main-plan view. No suggestion appears when its required source is invalid, pending, failed or inconsistent, or its destination is not verified safe. | Integration recommended |
| Prototype layout | E2E | At a mobile viewport, the selected overview has the prototype-inspired trip hero, seven-stage strip, four status cards, eligible next-step card and five-tab dock; actual trip data and truthful unknown states replace demo values. Compare against the screenshot and release-2 HTML while preserving the fifth account tab. | Visual comparison recommended |
| Errors and access | API + E2E | Pending, invalid/incomplete or failed responses are not zero, absent or active; malformed, missing, denied, signed-out and expired requests show their proper state without private data or another trip. | Security review recommended |
| Shell and navigation | E2E | Five ordered tabs including 我的; dashboard active on both views; history, account and account actions retained; safe destinations, coming-soon destinations and blocked trip-details entry/tab/open-by-id; no full reload for available dock tabs. | Compatibility review recommended |
| Read-only reverse cases | E2E | Compare relevant persisted trip, membership, invitation, preference, plan, split and completion state before/after dashboard load and navigation. No invitation issuance, completion, archive operation or destination action occurs merely by navigation. | Integration recommended |
| No dashboard-owned state | E2E | Refresh reflects changed source state without dashboard writes or persisted progress; recommendations navigate without executing destination actions. | — |
| No new permission or tracker change | API + E2E / process | Existing destination authorization still applies; no dashboard role bypass; tracker reconciliation remains the named owner's separate action. | Security review recommended |

## Fixtures and isolation

Use the synthetic Alice/Ben/Chloe/Daniel trip in
`requirement-workspace/acceptance-test-fixtures.md` as a baseline, with test-only
additional trips and memberships for A/B/C/D. Use isolated temporary databases
and session-authenticated test accounts; never modify a shared development
database. Set up and clean up readiness, plan and split data per test. The
revised checks do not require completion fixtures or a completion mock. A later
US-058 integration must establish its actual read, consistency and fixture
contracts before adding completion tests. Failure injection must cover each
required owning read separately, including malformed successful bodies.
Cover ready and unready signed-in members, both main-plan-confirmation values,
each documented plan and split status, and inconsistent source combinations.
Capture state before/after each recommendation and other navigation as both
organizer and member, not merely HTTP method counts, for no-write acceptance.

## Local and CI gates

At design time, CI did not have a browser E2E runner. During implementation,
a reproducible browser acceptance command and a CI job were added alongside
the backend tests and frontend checks and build. Run applicable checks locally
before the PR and require actual CI results before end-to-end acceptance.
Do not claim acceptance without real authentication and other applicable
dependencies. US-058 is not a prerequisite for the revised planning
milestones, and its integration must not be claimed.

## Non-goals and NFR

This design creates no feature code, generated Playwright/POM/Excel files,
unit-test suite, new CI product, archive, completion writer or destination
operations. Unit-level logic coverage belongs to apply-time TDD. Non-functional
testing remains deferred by user confirmation on 2026-11-17; functional
authorization, failure handling and no-write assertions remain in scope.
