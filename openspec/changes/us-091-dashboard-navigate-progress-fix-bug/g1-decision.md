# G1 decision — us-091-dashboard-navigate-progress-fix-bug

## Expanded-scope decision

- **Gate:** G1 (Align)
- **Decision:** Pass
- **Recorded:** 2026-11-18 23:19:14 +08:00
- **Approvers:** IO Emily Li and SA Sammi Ng. The requester reported that
  both confirmed Pass for the expanded scope; these are reported approvals,
  not direct signatures.
- **Scope:** The original scope plus the create-trip quick entry, readiness
  guidance and invitation progress, actual joining-closed state, and member
  main-plan generation and regeneration. Main-plan confirmation remains
  organizer-only.
- **Inputs:** [proposal](proposal.md), [app-shell delta](specs/app-shell/spec.md),
  [trip-dashboard delta](specs/trip-dashboard/spec.md),
  [invitations delta](specs/invitations/spec.md),
  [main-itinerary delta](specs/main-itinerary/spec.md),
  [requirements](../../../requirement-workspace/requirements/us-091-dashboard-navigate-progress-fix-bug.md),
  [design](design.md), [tasks](tasks.md), and the expanded-scope AC/DoV
  self-review below.
- **Findings:** The updated deltas specify the expanded behavior and retain
  the joining cutoff and organizer-only confirmation. No unresolved blocking
  ambiguity or additional condition was reported for this decision.

This G1 decision does not constitute implementation, verification, or G2
sign-off. The earlier G1 decision below is preserved as a historical record
and covered only the original scope.

## Original-scope decision (historical)

- **Gate:** G1 (Align)
- **Decision:** Pass
- **Recorded:** 2026-11-18 15:07:04 +08:00
- **Approvers:** IO Emily Li and SA Sammi Ng. The requester reported that
  each confirmed Pass; these are reported approvals, not direct signatures.
- **Inputs:** [proposal](proposal.md), [app-shell delta](specs/app-shell/spec.md),
  [trip-dashboard delta](specs/trip-dashboard/spec.md),
  [invitations delta](specs/invitations/spec.md),
  [requirement and acceptance hints](../../../requirement-workspace/requirements/us-091-dashboard-navigate-progress-fix-bug.md),
  [design](design.md), [tasks](tasks.md), and the AC/DoV review below.

## AC / DoV review

This is an AI review for this record; no separate human AC/DoV review
reference was supplied.

| Acceptance area | Review conclusion and verification approach |
|---|---|
| Current-trip navigation | The app-shell delta specifies saved selection, direct-dashboard separation, reload, empty and read-error behavior. Tasks 2.1–2.2 call for focused browser coverage. |
| Progress milestones | The dashboard delta specifies the remaining role-specific milestones and source-backed states. Task 3.1 calls for unit and browser coverage. |
| Member invitations | The invitations delta specifies member issuance, shared token reuse, non-member and anonymous denial, and invitation sharing. Tasks 4.1–4.2 call for API and browser coverage. |
| Joining cutoff | The unchanged [invitation acceptance requirement](../../specs/invitations/spec.md) preserves rejection of new members after confirmation and idempotent acceptance by existing members; task 4.1 calls for cutoff coverage. |

`openspec validate us-091-dashboard-navigate-progress-fix-bug --strict`
reported the change valid on 2026-11-18. This checks artifact structure; it
does not establish that the implementation passes acceptance tests.

## Findings

- **Scope:** Saved-current-trip navigation, removal of two progress milestones,
  and member invitation sharing; no change to the joining cutoff, plan
  permissions, data model, or invitation expiry and revocation.
- **Ambiguity:** No blocking ambiguity was identified in the reviewed
  acceptance criteria. Two invitation scenario titles retain historical
  denial wording, but their scenario text explicitly authorizes members.
- **Conflict:** The deltas intentionally replace the corresponding current
  organizer-only issuance, dashboard milestone and navigation behavior.
  Existing invitation acceptance rules remain unchanged.
- **Conditions and owners:** None reported for the G1 decision.

## Implementation status

This decision aligns the change; it is not implementation or acceptance
sign-off. The [local verification report](../../../docs/ai4se-plugins/20261118-145452-local-verify-report.md)
reports incomplete implementation, unchecked tasks and missing change-specific
test evidence. Those findings remain to be resolved through the implementation
and verification workflow.

## Expanded-scope AC / DoV self-review

This is an AI completeness review, not renewed IO or SA approval.

| Acceptance area | Review and verification |
|---|---|
| Create-trip quick entry | Dashboard delta specifies the upper-left entry and shared create route; task 4a.4 requires post-merge browser evidence. |
| Ready member invitations and next step | Dashboard delta specifies active invitation, generation recommendation and both actions before a draft; unit and browser tests cover both roles and member generation. |
| Joining status | Dashboard delta uses the actual joining-closed state, including after confirmation cancellation; progress unit coverage exercises that case. |
| Member main-plan generation | Main-itinerary delta retains readiness and confirmed-plan guards, permits member generation, denies non-members and preserves organizer-only confirmation. API coverage exists; full acceptance evidence remains under task 4a.4. |
