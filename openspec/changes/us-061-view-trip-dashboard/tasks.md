# US-061 implementation plan

> Apply-time workers: use the project's OpenSpec apply workflow and red-green
> TDD; reconcile the ATDD and applicable G1 conditions in task 1.1 before
> feature implementation.

**Goal:** Deliver an authenticated, read-only member-trip dashboard with
completion-dependent progress unavailable.
**Architecture:** [Design](design.md), [ATDD](atdd-design.md),
[dashboard delta](specs/trip-dashboard/spec.md), and
[shell delta](specs/app-shell/spec.md).
**Stack:** Java 21 / Spring Boot / SQLite / Flyway; React / TypeScript / Vite.

## Global constraints and review focus

- Session identity is authoritative; never trust a caller-supplied identity.
- No dashboard completion writer or inference, archive, persisted progress,
  recommendation, unsafe trip-details navigation, or new permission rule.
- Fail closed on missing, invalid, inconsistent or unavailable source data;
  distinguish successful absence from a failed read.
- Test unauthorized users, invalid identifiers, invalid success payloads,
  stale responses after account/trip changes, and navigation-triggered writes
  in the tasks below. US-058 integration is deferred, not simulated.
- NFR testing is deferred; the functional security, no-write and error
  scenarios remain required. Do not generate Playwright/POM/Excel files.

## 1. Prerequisites and acceptance harness

- [ ] 1.1 **Owner: Sammi Ng.** Reconcile the ATDD design and alignment evidence
  with the interim member-trip scope, and revisit the existing Conditional G1
  decision with the applicable human approvers before feature implementation.
  Record that US-058 filtering and completion-dependent progress require a
  later integration with verified read, consistency and fixture contracts;
  verify no date, split or missing-value inference is used.
- [ ] 1.2 **Owner: Sammi Ng.** Record auth, archive and separate trip-details
  fix owners, contracts and delivery/acceptance sequencing; record US-066 shell
  ordering and tracker reconciliation. Verify applicable real dependencies
  before end-to-end acceptance and retain the G1 conditions until revisited.
- [ ] 1.3 **Owner: implementer.** Add a reproducible browser acceptance
  harness following the project Playwright rule, using an isolated backend
  database and authenticated synthetic fixtures; document its exact setup and
  local command, wire it into CI, and verify a smoke scenario executes. Do
  not count a missing runner or an upstream mock as full E2E evidence.

## 2. Member list and deferred completion boundary

- [ ] 2.1 **Owner: implementer.** Write failing API acceptance checks in
  `backend/src/test/java/com/gogo/trip/TripDashboardApiTest.java` for Ben's
  member trips A/B/C, non-member D, empty membership and signed-out access;
  verify failure before code. The list must not depend on completion.
- [ ] 2.2 **Owner: implementer.** Add the D1 member-filtered `GET /api/trips`
  without completion filtering; document its response and error behavior.
  Run `mvn -B -Dtest=TripDashboardApiTest test` from `backend` and verify all
  list, isolation and failure cases pass.
- [ ] 2.3 **Owner: implementer.** Write failing browser checks for the same
  cards, empty/error/loading states and selecting B; implement the `#/` list
  and `#/dashboard/trips/<id>` route. Run those checks and
  `npm run build` from `frontend`; verify exact fields, dashboard active tab,
  account retention, no private cards and no active-status claims.

## 3. Selected overview and progress

- [ ] 3.1 **Owner: implementer.** Write failing browser checks for the
  authorized saved summary, 4 members/3 ready, stale main plan and active
  split, plus successful absence and changed source values on refresh.
  Implement validated composition of D2's owning reads; run checks and verify
  values come from sources, not placeholders or dashboard writes.
- [ ] 3.2 **Owner: implementer.** Add failing checks that progress is explicitly
  unavailable for member trips and does not assign stages, infer active or
  completion status, or show a recommendation. Implement the unavailable
  state with apply-time unit TDD and verify the checks.
- [ ] 3.3 **Owner: implementer.** Add failing checks for pending and failed
  trip/readiness/plan/split reads, invalid or incomplete success bodies,
  unknown/malformed/denied ids, signed-out/expired sessions and stale
  responses after changing account or trip.
  Implement explicit states and response invalidation; run checks and verify
  no fabricated value, active-status claim, fallback trip or private leak.

## 4. Navigation and integration

- [ ] 4.1 **Owner: implementer.** Write failing browser checks covering both
  dashboard views, four ordered tabs, active highlight, hash/history, account,
  unique headings and create/back. Include trip tab with a remembered id and
  open-by-id; verify they cannot reach unsafe details. Implement safe
  navigation and coming-soon states; run checks and preserve existing
  non-dashboard details behavior.
- [ ] 4.2 **Owner: implementer.** Capture persisted trip, membership,
  invitation, preference, plan and split state before and after
  loading and following every available dashboard entry/tab as organizer and
  member. Verify no navigation-only write or invitation issuance; validate
  actual destination authorization and mark unsafe/unavailable links coming
  soon until the separately owned fix is delivered.
- [ ] 4.3 **Owner: implementer.** Run backend `mvn -B test`, frontend
  `node --test tests/lockfile.test.mjs` and `npm run build`, plus the recorded
  browser suite locally and in CI. Record actual outcomes and applicable
  real-dependency evidence; do not claim US-058 integration or mark acceptance
  passed if required prerequisites are missing. Resolve US-066 overlapping
  shell blocks before archive without restoring scaffold identity.

## 5. Final pre-archive reconciliation

- [ ] 5.1 **Owner: Sammi Ng / archive operator.** At the archive transition,
  reconcile `docs/knowledge/architecture/tech-stack-plan.md` with only this
  change's actually shipped capabilities, API and data model, and append
  `docs/knowledge/_LOG.md` if the plan changes. Verify the archive and plan
  agree; do not publish unarchived planned work as shipped. Close this task as
  part of the coordinated archive transition, not prematurely.

## Workflow follow-up

- Revisit G1 conditions and obtain the applicable human decisions; run the
  verification and archive workflows only after their prerequisites are met.
  Plan the US-058 filtering and completion-dependent progress follow-up
  separately; this interim change does not implement or prove it.
