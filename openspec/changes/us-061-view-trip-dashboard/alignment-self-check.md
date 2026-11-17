# US-061 P3 alignment self-check

## Revised-scope update — 2026-11-17

This is a planning check, not a gate decision or proof of implementation.
The requester reported that IO and SA decided Pass for the revised scope;
see the [G1 decision](g1-decision.md). Its prior four-tab condition predates
the user's choice to retain five tabs.

| Delta area | Design | ATDD | Tasks |
|---|---|---|---|
| All member trips, isolation, empty and no completion inference | D1 | member list and deferred completion boundary | 1.1, 2.1–2.3 |
| Authorized overview, stale/absent drafts, refreshed data | D2 | overview sources | 3.1 |
| Source-backed planning milestones, unknown reunion/completion and safe recommendations | D3 | planning milestones, next step and reverse cases | 3.2 |
| Loading, invalid/missing/denied/failure and signed-out | D2/D3 | errors and access | 3.3 |
| Read-only links, safe details block, unavailable pages | D3 | shell/navigation and reverse cases | 4.1–4.2 |
| Prototype-inspired overview and five-tab shell, including account access | Goals and D3 | prototype layout and shell/navigation | 3.1–3.2, 4.1 |
| Owner dependencies, tracker drift, overlapping US-066 | risks | real integration gate | 1.1–1.2, 4.3 |
| Binding API-plan deviation | D1, deployment | no dashboard-owned state | 5.1 |

Strict OpenSpec validation passes. The local requirement, AC/DoV review and
ATDD describe the revised scope; the requester accepted the ATDD baseline.
Real source and destination behavior, browser E2E,
no-write evidence and CI execution are implementation/acceptance work, not
proof provided by this planning check. US-058 integration remains deferred;
US-066 shell and external tracker reconciliation remain separately owned.

## Interim-scope update — 2026-11-17

This section and the earlier assessment below are retained as historical
records of the superseded unavailable-progress scope.

The [local requirement](../../../requirement-workspace/requirements/US-061.md),
proposal, deltas, design, ATDD and tasks now describe the interim all-member
list and unavailable progress. Existing session authentication is the chosen
baseline; US-066 shell reconciliation is sequenced later under Sammi Ng.
US-058 integration and archive remain deferred, while unsafe details remain
blocked. The original external tracker has not been updated.

The checks in the mapping below remain applicable. The open-gaps section is
the earlier assessment, retained for history; the current [G1 decision](g1-decision.md)
records Pass for the interim scope. Browser E2E and real dependency
verification remain apply-time acceptance work, not proof provided by this
planning check.

## Earlier assessment — superseded where noted above

This is a planning check, not a gate approval or proof of implementation.
Result: **Partial**. The proposal, delta specs, design, ATDD and tasks now map
the interim member-trip scope, but the Conditional G1 decision has not been
revisited for that scope and applicable dependency evidence remains open.

| Delta area | Design | ATDD | Tasks |
|---|---|---|---|
| All member trips, isolation, empty and no completion inference | D1 | member list and deferred completion boundary | 1.1, 2.1–2.3 |
| Authorized overview, stale/absent drafts, refreshed data | D2 | overview sources | 3.1 |
| Unavailable completion-dependent progress and no recommendation | D3 | progress and reverse cases | 3.2 |
| Loading, invalid/missing/denied/failure and signed-out | D2/D3 | errors and access | 3.3 |
| Read-only links, safe details block, unavailable pages | D3 | shell/navigation and reverse cases | 4.1–4.2 |
| Shell frame, four tabs, selected/default dashboard, history and create | D3 | shell/navigation | 2.3, 4.1, 4.3 |
| Owner dependencies, tracker drift, overlapping US-066 | risks | real integration gate | 1.1–1.2, 4.3 |
| Binding API-plan deviation | D1, deployment | no dashboard-owned state | 5.1 |

## Open gaps

- Sammi Ng must revisit the existing Conditional G1 decision with the
  applicable human approvers before feature implementation. The recorded
  decision describes the earlier active-only scope and remains open.
- US-058 filtering and completion-dependent progress require a later
  integration with verified read, failure, consistency and fixture contracts.
  Do not simulate or claim that integration in the interim change.
- The viewer preference-submission predicate belongs to the deferred
  completion-aware progress integration; readiness alone is not evidence of it.
- Browser E2E and its CI gate are proposed tasks, not existing infrastructure.
- The remaining G1 dependency, shell sequencing and tracker conditions remain
  open. Applicable real dependencies must be verified before end-to-end
  acceptance. No P3 check changes or approves G1.
- Historical app-shell scenario headings remain inconsistent with their
  assertions and need the separately recorded supported follow-up.
