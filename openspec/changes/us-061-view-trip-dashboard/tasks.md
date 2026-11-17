# US-061 implementation plan

> Apply-time workers: use the project's OpenSpec apply workflow and red-green
> TDD; do not start feature implementation until prerequisite 1.1 is resolved.

**Goal:** Deliver an authenticated, read-only active-member-trip dashboard.
**Architecture:** [Design](design.md), [ATDD](atdd-design.md),
[dashboard delta](specs/trip-dashboard/spec.md), and
[shell delta](specs/app-shell/spec.md).
**Stack:** Java 21 / Spring Boot / SQLite / Flyway; React / TypeScript / Vite.

## Global constraints and review focus

- Session identity is authoritative; never trust a caller-supplied identity.
- No dashboard completion writer, archive, persisted progress, recommendation,
  unsafe trip-details navigation, or new permission rule.
- Fail closed on missing, invalid, inconsistent or unavailable source data;
  distinguish successful absence from a failed read.
- Test unauthorized users, invalid identifiers, invalid success payloads,
  stale responses after account/trip changes, and navigation-triggered writes
  in the tasks below. The US-058 integration is not proven by a double.
- NFR testing is deferred; the functional security, no-write and error
  scenarios remain required. Do not generate Playwright/POM/Excel files.

## 1. Prerequisites and acceptance harness

- [ ] 1.1 **Owner: Sammi Ng.** Establish the delivered US-058 completion read,
  per-trip/list consistency and test fixture contracts; verify the real
  integration and record them in the design. Reconcile any necessary D1/D2
  changes with the specs before implementation; verify no date, split or
  missing-value inference is used.
- [ ] 1.2 **Owner: Sammi Ng.** Record auth, archive and separate trip-details
  fix owners, contracts and delivery/acceptance sequencing; record US-066 shell
  ordering and tracker reconciliation. Verify applicable real dependencies
  before end-to-end acceptance and retain the G1 conditions until revisited.
- [ ] 1.3 **Owner: implementer.** Add a reproducible browser acceptance
  harness following the project Playwright rule, using an isolated backend
  database and authenticated synthetic fixtures; document its exact setup and
  local command, wire it into CI, and verify a smoke scenario executes. Do
  not count a missing runner or an upstream mock as full E2E evidence.

## 2. Member list and completion boundary

- [ ] 2.1 **Owner: implementer.** Write failing API acceptance checks in
  `backend/src/test/java/com/gogo/trip/TripDashboardApiTest.java` for Ben's
  active A/B, completed C, non-member D, empty membership, signed-out access
  and unavailable/invalid completion; verify failure before code.
- [ ] 2.2 **Owner: implementer.** Add the D1 member-filtered `GET /api/trips`
  using the verified US-058 contract; document its response and error behavior.
  Run `mvn -B -Dtest=TripDashboardApiTest test` from `backend` and verify all
  list, isolation and failure cases pass, including the real completion source.
- [ ] 2.3 **Owner: implementer.** Write failing browser checks for the same
  cards, empty/error/loading states and selecting B; implement the `#/` list
  and `#/dashboard/trips/<id>` route. Run those checks and
  `npm run build` from `frontend`; verify exact fields, dashboard active tab,
  account retention and no private cards.

## 3. Selected overview and progress

- [ ] 3.1 **Owner: implementer.** Write failing browser checks for the
  authorized saved summary, 4 members/3 ready, stale main plan and active
  split, plus successful absence and changed source values on refresh.
  Implement validated composition of D2's owning reads; run checks and verify
  values come from sources, not placeholders or dashboard writes.
- [ ] 3.2 **Owner: implementer.** Add failing checks for each progress table
  row, no/cancelled/active/confirmed split, all seven statuses, the unsubmitted
  non-organizer waiting message and no recommendation. Verify the owning
  preference-submission predicate, implement the projection and apply-time
  unit TDD, then run the checks and verify each row exactly.
- [ ] 3.3 **Owner: implementer.** Add failing checks for pending and failed
  trip/readiness/plan/split/completion reads, invalid or incomplete success
  bodies, unknown/malformed/denied ids, signed-out/expired sessions, selected
  completed trips and stale responses after changing account or trip.
  Implement explicit states and response invalidation; run checks and verify
  no fabricated value, active completed trip, fallback trip or private leak.

## 4. Navigation and integration

- [ ] 4.1 **Owner: implementer.** Write failing browser checks covering both
  dashboard views, four ordered tabs, active highlight, hash/history, account,
  unique headings and create/back. Include trip tab with a remembered id and
  open-by-id; verify they cannot reach unsafe details. Implement safe
  navigation and coming-soon states; run checks and preserve existing
  non-dashboard details behavior.
- [ ] 4.2 **Owner: implementer.** Capture persisted trip, membership,
  invitation, preference, plan, split and completion state before and after
  loading and following every available dashboard entry/tab as organizer and
  member. Verify no navigation-only write or invitation issuance; validate
  actual destination authorization and mark unsafe/unavailable links coming
  soon until the separately owned fix is delivered.
- [ ] 4.3 **Owner: implementer.** Run backend `mvn -B test`, frontend
  `node --test tests/lockfile.test.mjs` and `npm run build`, plus the recorded
  browser suite locally and in CI. Record actual outcomes and real-dependency
  evidence; do not mark acceptance passed if required prerequisites are
  missing. Resolve US-066 overlapping shell blocks before archive without
  restoring scaffold identity.

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
