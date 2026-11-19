# US-091 — Dashboard navigation, progress and invitations

- **Actors:** authenticated trip organizers and members; invited non-members.
- **Intent:** retain the saved current trip across navigation, correct dashboard
  progress and actions, and let every trip member invite others and generate
  a main-plan draft.
- **Evidence:** [dashboard spec](../../openspec/specs/trip-dashboard/spec.md),
  [invitation spec](../../openspec/specs/invitations/spec.md), and
  [US-072 ATDD](../../openspec/changes/archive/2026-11-16-us-072-trip-detail-main-plan-entry/atdd-design.md).
- **Discovery:** Go; extend existing capabilities. No blocking questions identified.

## Acceptance hints

1. Selecting a current trip and navigating dashboard → Trips shows that saved
   trip, including after reload. A directly opened dashboard for a different trip
   does not change the saved selection. No selection and read failures remain
   distinguishable.
2. The dashboard progress strip omits reunion and completion for both roles;
   the other milestones retain their existing order and source-backed states.
3. Organizer and other members can obtain and share the same trip invitation
   link and QR code from both applicable trip-detail and dashboard entry points.
   A non-member cannot obtain the invitation; an unauthenticated caller is denied.
4. Existing invitation acceptance rules remain: a new member cannot join after
   main-plan confirmation, while repeat acceptance by an existing member stays
   idempotent.
5. After their own preferences are ready, organizers and members can still
   invite others; with no draft, the next-step recommendation is to generate
   the main plan, with both generation and invitation actions available.
   The invitation milestone is complete after draft generation; actual joining
   availability follows the trip's joining-closed state.
6. Every member may generate or regenerate when all members are ready and no
   plan is confirmed. Only the organizer can confirm. Non-members are denied.
7. The dashboard's upper-left create-trip quick entry opens the same creation
   page as My Trips.

**Out of scope:** changing the saved selection merely by viewing a dashboard,
changing confirmation or split permissions, invitation revocation or expiry,
and changing the join deadline.

## Detail and boundaries

| Concept | Grain, fields and lifecycle |
|---|---|
| Current trip | One saved trip ID per account; explicit selection changes it; dashboard viewing does not. Missing selection and read failure retain existing states. |
| Progress | One display per viewer and trip; remaining milestone labels, details and states derive from existing sources, not new stored data. |
| Invitation | At most one opaque token per trip, reused for members; acceptance creates one membership at most and is closed to new members after plan confirmation. |

| Boundary | In / out |
|---|---|
| Signed-in organizer or member issues invitation | In; reuse the existing token or create it once. |
| Anonymous caller, non-member, unknown trip | In; retain explicit denial or not-found behavior without exposing a token. |
| Missing, invalid or failed current-trip read | In; show existing empty/error behavior, not a fabricated trip. |
| Join after confirmation | In; preserve existing member/non-member distinction. |
| Member draft generation and regeneration | In; readiness and confirmed-plan checks remain. |
| Change invitation expiry, revocation, confirmation or split permissions | Out. |

| Surface | Viewer and display |
|---|---|
| Trips tab | Signed-in traveler sees the saved current trip, or existing empty/error state. |
| Dashboard progress | Organizer and member see existing applicable milestones except reunion and completion. |
| Dashboard quick entries | Members can create a trip, invite others and, when applicable, generate a draft. |
| Main-plan inputs and draft | Members can generate or regenerate; only the organizer can confirm. |
| Trip detail and invitation page | Members see the existing invitation link, QR code and copy controls; non-members receive denial. No new notification. |

**Cross-requirement consistency:** navigation and dashboard use the same saved
current-trip contract; invitation issuance and acceptance share the existing
per-trip token. The requester reported renewed IO and SA G1 approval for the
expanded scope; the earlier approval did not cover it. See the
[G1 decision](../../openspec/changes/us-091-dashboard-navigate-progress-fix-bug/g1-decision.md).
