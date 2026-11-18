# US-061 implementation and reconciliation tasks

The current working tree changes the previously approved scope. Historical
execution and evidence remain in the earlier reports and [G1 decision](g1-decision.md);
they are not approval or CI evidence for these revisions.

## 1. P1 — Requirement and alignment

- [x] 1.1 Record the current-trip dashboard, role-specific milestones,
  recommendations and invitation side effects in the requirement and P1
  handoff, preserving the earlier scope as historical.
- [ ] 1.2 **Owner: IO Emily Li / SA Sammi Ng.** Review the revised scope and
  the organizer invitation POST on destination load; record an actual G1
  decision. The prior reported Pass is limited to its original scope.
- [ ] 1.3 **Owner: Sammi Ng.** Reconcile original issue #26 and overlapping
  shell work separately; do not imply those follow-ups are complete.

## 2. P2 — Proposal and specifications

- [x] 2.1 Reconcile the proposal and dashboard and shell deltas with the
  current selection, progress, routing and invitation behavior.
- [ ] 2.2 Resolve any semantic or structural validation findings and obtain
  the appropriate human scope decision; OpenSpec validation alone is not G1.

## 3. P3 — Design and ATDD

- [x] 3.1 Record the current source composition, role-specific recommendation
  matrix and destination side effects in design and ATDD.
- [ ] 3.2 Review the revised ATDD and verify organizer invitation side effects,
  authorization, persistence boundaries and failure cases with isolated data.
  Do not characterize navigation to invitation or details as write-free.

## 4. P4 — Verification and CI

- [ ] 4.1 Push the change branch and update the existing PR through the normal
  PR workflow after human alignment; do not push directly to main.
- [ ] 4.2 Run and record applicable local backend, frontend and isolated
  browser checks for the final implementation revision. Investigate failures
  without altering implementation as part of this documentation task.
- [ ] 4.3 Obtain fresh required CI results for the final pushed implementation
  revision and record exact run, SHA and jobs. Prior runs do not cover the
  current uncommitted changes.
- [ ] 4.4 Obtain the required independent review and named gate decisions;
  documentation updates and green tests do not constitute human approval.

## 5. Final pre-archive reconciliation

- [x] 5.1 **Owner: Sammi Ng / archive operator.** At archive, reconcile
  `docs/knowledge/architecture/tech-stack-plan.md` with only the capabilities,
  API and data model actually shipped by this change; append
  `docs/knowledge/_LOG.md` if the plan changes. Do not publish unarchived work
  as shipped.
