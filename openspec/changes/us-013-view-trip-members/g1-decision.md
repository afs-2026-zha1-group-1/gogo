# G1 decision — us-013-view-trip-members

- Change id: `us-013-view-trip-members`
- Gate: G1 (Align)
- Status: **PENDING — NOT RECORDED**
- This file is a **sign-off sheet**, not a gate decision. The agent MUST NOT
  mark it Pass or fill a human decision. G1 is recorded only after IO Emily and
  SA Johnson both supply a named decision below.

## Inputs for review

| Input | Path |
|---|---|
| Proposal | `openspec/changes/us-013-view-trip-members/proposal.md` |
| Delta — `trips` (ADDED, 8 scenarios) | `openspec/changes/us-013-view-trip-members/specs/trips/spec.md` |
| Delta — `app-shell` (MODIFIED, 3 scenarios) | `openspec/changes/us-013-view-trip-members/specs/app-shell/spec.md` |
| AC / DoV review (all Pass) | `openspec/changes/us-013-view-trip-members/dov-ac-review.md` |
| Consistency lint (Pass: 0 BLOCKER / 0 WARNING / 4 SUGGESTION) | `openspec/changes/us-013-view-trip-members/consistency-lint.md` |
| Requirement | `requirement-workspace/requirements/US-013.md` |
| DoR (BLOCKER = 0, A0 Pass) | `requirement-workspace/analysis/us-013-dor.md` |
| Fixtures §US-013 | `requirement-workspace/acceptance-test-fixtures.md` |
| Story | GitHub issue #9 (`US-013: View Trip Members`) |
| Validation | `openspec validate us-013-view-trip-members` → valid |

## Findings (scope / ambiguity / conflict)

- **Scope:** one ADDED `trips` requirement (member-only roster read) and one
  MODIFIED `app-shell` requirement (成员 tab placeholder replaced by the real
  list). No migration, no write path, no new dependency.
- **Excluded:** readiness, preference summaries, budgets, the readiness ring and
  the generate-main-plan action (US-026 / US-027 / US-031); invite/remove/role
  changes; authentication; list-all-trips.
- **Conflict with the Living Spec:** `app-shell` `Placeholder tabs` is
  explicitly superseded for 成员 by the MODIFIED requirement; 分队 stays a
  placeholder. Purpose prose needs reconciliation at P5.
- **Conflict between deltas:** none. The shell frame/dock requirements are
  unchanged; the roster is a `trips` read rendered inside the tab.
- **Blocking open questions:** 0. OQ-1/OQ-2 deferred to P3; OQ-3 resolved
  (`organizer`, ascending `userId`).
- **Residual concerns for the signers:**
  1. Screen 7 readiness/preference visuals are intentionally not implemented.
  2. The `app-shell` placeholder is MODIFIED, not silently contradicted.
  3. Wire field `organizer` and ascending `userId` order.
  4. The unmerged split branch uses `MEMBER_REQUIRED`; this change follows the
     merged `USER_REQUIRED` precedent (follow-up at split merge).
  5. The stack plan names AntD 5 + TanStack Query v5; the merged frontend uses
     token CSS + plain `api()` (separate migration).
  6. `#/members` has no durable trip selection; a reload shows the no-trip
     guidance state.

## Sign-off

Fill your row in place, then commit this file to the
`US-013-view-trip-members-planning` branch. Do not delete the other row.

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| IO | Emily | Pass | 2026-11-16 | None; IO approval only. SA decision remains pending. | Emily explicitly stated "emily approve" in the review conversation on 2026-11-16, following the US-013 G1 scope and concerns review. |
| SA | Johnson | _(pending)_ | | | |

## Recording rules

1. Both rows must carry a **named** decision. One role's Pass does not imply the
   other's.
2. A **Pass** is invalid if a blocking ambiguity remains unresolved.
3. A **Conditional** decision is invalid without remediation items and owners.
4. After both rows are filled, the agent validates the record, changes the
   status to **RECORDED — Pass / Conditional / Fail**, and cites the exact
   evidence for each signer. The agent records the human statements; it does not
   approve the gate itself.
5. Until then, G1 is **not closed** and P3/P4 must not start.
