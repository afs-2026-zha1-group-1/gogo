# US-061 implementation plan

> Apply-time workers: use the project's OpenSpec apply workflow and red-green
> TDD. The earlier G1 Pass does not cover the revised milestone and
> recommendation scope. Renew human alignment and reconcile ATDD before
> implementation.

**Goal:** Deliver an authenticated, read-only member-trip dashboard with
source-backed planning milestones and recommendations; reunion and completion
remain unknown.
**Architecture:** [Design](design.md), [ATDD](atdd-design.md),
[dashboard delta](specs/trip-dashboard/spec.md), and
[shell delta](specs/app-shell/spec.md).
**Stack:** Java 21 / Spring Boot / SQLite / Flyway; React / TypeScript / Vite.

## Global constraints and review focus

- Session identity is authoritative; never trust a caller-supplied identity.
- No dashboard completion writer or inference, archive, persisted progress,
  unsafe trip-details navigation, or new permission rule. Recommendations
  require valid source data and verified read-only destinations.
- Fail closed on missing, invalid, inconsistent or unavailable source data;
  distinguish successful absence from a failed read.
- Test unauthorized users, invalid identifiers, invalid success payloads,
  stale responses after account/trip changes, and navigation-triggered writes
  in the tasks below. US-058 integration is deferred, not simulated.
- NFR testing is deferred; the functional security, no-write and error
  scenarios remain required. Do not generate Playwright/POM/Excel files.

## 1. Prerequisites and acceptance harness

- [x] 1.1 **Owner: Sammi Ng.** Obtain renewed IO/SA alignment for the revised
  source-backed milestones and recommendations; the earlier G1 Pass covers
  only the superseded interim scope. Reconcile ATDD and acceptance checks
  before implementation. US-058 filtering and completion-aware progress
  require later verified read, consistency and fixture contracts; verify no
  date, split or missing-value completion inference is used.
  Evidence: [reported G1 decision](g1-decision.md), accepted
  [ATDD design](atdd-design.md), and local verification report. The requester
  subsequently reported Sammi's approval of changes on 2026-11-17.
- [x] 1.2 **Owner: Sammi Ng.** Reuse the session authentication already
  present and verify the real authentication and owning reads before acceptance. Keep
  archive outside the interim scope and details blocked until its separate
  no-write fix is verified; record tracker reconciliation separately.
  Evidence: local authentication, owning-read and no-write checks are recorded
  in the [verification report](../../../docs/ai4se-plugins/20261117-130754-local-verify-report.md).
  The interim scope and outstanding original criteria are recorded in
  [issue #26](https://github.com/afs-2026-zha1-group-1/gogo/issues/26#issuecomment-6939709795).
- [x] 1.3 **Owner: implementer.** Add a reproducible browser acceptance
  harness following the project Playwright rule, using an isolated backend
  database and authenticated synthetic fixtures; document its exact setup and
  local command, wire it into CI, and verify a smoke scenario executes. Do
  not count a missing runner or an upstream mock as full E2E evidence.

## 2. Member list and deferred completion boundary

- [x] 2.1 **Owner: implementer.** Write failing API acceptance checks in
  `backend/src/test/java/com/gogo/trip/TripDashboardApiTest.java` for Ben's
  member trips A/B/C, non-member D, empty membership and signed-out access;
  verify failure before code. The list must not depend on completion.
- [x] 2.2 **Owner: implementer.** Reuse the US-071 member-filtered
  `GET /api/trips` envelope without completion filtering; document its response
  and error behavior.
  Run `mvn -B -Dtest=TripDashboardApiTest test` from `backend` and verify all
  list, isolation and failure cases pass.
- [x] 2.3 **Owner: implementer.** Write failing browser checks for the same
  cards, empty/error/loading states and selecting B; implement the `#/` list
  and `#/dashboard/trips/<id>` route. Run those checks and
  `npm run build` from `frontend`; verify exact fields, dashboard active tab,
  account retention, no private cards and no active-status claims.

## 3. Selected overview and progress

- [x] 3.1 **Owner: implementer.** Write failing browser checks for the
  authorized saved summary with 4 members/3 ready and a stale main plan with
  no split, a confirmed plan with an active split, inconsistent source
  combinations, successful absence and changed source values on refresh.
  Implement validated composition of D2's owning reads; run checks and verify
  values come from sources, not placeholders or dashboard writes.
- [x] 3.2 **Owner: implementer.** After renewed G1 alignment and ATDD
  reconciliation, add failing checks for each source-backed planning
  milestone, unknown reunion and completion, and safe next-step suggestions.
  Verify no overall current stage or active/completion inference is made,
  invalid or failed inputs never produce suggestions, and suggested navigation
  is authorized and read-only. Implement and verify with apply-time unit TDD.
- [x] 3.3 **Owner: implementer.** Add failing checks for pending and failed
  trip/readiness/plan/split reads, invalid or incomplete success bodies,
  unknown/malformed/denied ids, signed-out/expired sessions and stale
  responses after changing account or trip.
  Implement explicit states and response invalidation; run checks and verify
  no fabricated value, active-status claim, fallback trip or private leak.

## 4. Navigation and integration

- [x] 4.1 **Owner: implementer.** Write failing browser checks covering both
  dashboard views, five ordered tabs including 我的, active highlight,
  hash/history, account actions, unique headings and create/back. Include trip
  tab with a remembered id and open-by-id; verify they cannot reach unsafe
  details. Implement safe navigation and coming-soon states; run checks and
  preserve the explicit persisted picker and existing non-dashboard details
  and trip-context return behavior.
- [x] 4.2 **Owner: implementer.** Capture persisted trip, membership,
  invitation, preference, plan, split and account current-trip state before and after
  loading and following every available dashboard entry/tab as organizer and
  member. Verify no navigation-only write or invitation issuance; validate
  actual destination authorization and mark unsafe/unavailable links coming
  soon until the separately owned fix is delivered.
- [x] 4.3a **Owner: implementer; pre-PR.** Run backend `mvn -B test`,
  frontend `node --test tests/lockfile.test.mjs tests/dashboard-progress.test.mjs`
  and `npm run build`, plus the recorded browser suite locally. Record actual
  outcomes and applicable real-dependency evidence in the
  [integrated local verification report](../../../docs/ai4se-plugins/20261117-141900-local-verify-report.md).
  Earlier reports cover the pre-merge branch only. Include the explicit picker,
  dashboard-origin safety and delayed current-trip response. Do not claim
  US-058 integration.
- [ ] 4.3b **Owner: implementer; post-PR.** Run the required CI jobs,
  including the recorded browser suite, and record actual results. Do not mark
  acceptance passed if required prerequisites are missing.

## 5. Final pre-archive reconciliation

- [ ] 5.1 **Owner: Sammi Ng / archive operator.** At the archive transition,
  reconcile `docs/knowledge/architecture/tech-stack-plan.md` with only this
  change's actually shipped capabilities, API and data model, and append
  `docs/knowledge/_LOG.md` if the plan changes. Verify the archive and plan
  agree; do not publish unarchived planned work as shipped. Close this task as
  part of the coordinated archive transition, not prematurely.

## Workflow follow-up

- Run the verification and archive workflows only after their prerequisites
  are met.
  Plan the US-058 filtering and completion-aware progress follow-up
  separately; this interim change does not implement or prove it.
