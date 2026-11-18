# US-091 — Impact brief

**Requirement:** [US-091](../requirements/us-091-dashboard-navigate-progress-fix-bug.md).
**Baseline:** [technology plan](../../docs/knowledge/architecture/tech-stack-plan.md),
[dashboard spec](../../openspec/specs/trip-dashboard/spec.md),
[invitation spec](../../openspec/specs/invitations/spec.md),
and [US-072 ATDD](../../openspec/changes/archive/2026-11-16-us-072-trip-detail-main-plan-entry/atdd-design.md).

| Area | As-is → proposed change |
|---|---|
| Navigation | [App](../../frontend/src/App.tsx) routes the Trips tab to an empty guard in dashboard context; use the persisted current trip instead without writing selection. |
| Progress | [dashboardProgress](../../frontend/src/pages/dashboardProgress.ts) includes reunion and completion; remove both for each role. |
| Invitations | [InvitationPanel](../../frontend/src/pages/InvitationPanel.tsx) and [repository](../../backend/src/main/java/com/gogo/invitation/InvitationRepository.java) restrict issuance to organizers; authorize trip members while continuing to deny outsiders. |
| Main plan | [MainPlanService](../../backend/src/main/java/com/gogo/mainplan/MainPlanService.java) and the main-plan views permit members to generate or regenerate, while retaining readiness checks and organizer-only confirmation. |
| Quick entry | [DashboardTrip](../../frontend/src/pages/DashboardTrip.tsx) routes creation to the existing create page. |
| Living specs | Dashboard, invitation and main-itinerary requirements need deltas; current-trip persistence and joining-closed state remain authoritative. |

**Blast radius:** React navigation, progress, invitation and main-plan surfaces;
Spring invitation and generation authorization; existing session, current-trip
and token contracts. No new storage or dependency is anticipated. Test
role-based progress, quick entries, member generation and organizer-only
confirmation, outsider denial, token reuse and closed joining.

**Risk:** a direct dashboard route can differ from the saved selection; do not
silently replace it. Non-members must never receive the token.
**Approval:** the requester reported renewed IO and SA G1 approval for the
expanded scope; the historical G1 approval did not cover member plan generation.
See the [G1 decision](../../openspec/changes/us-091-dashboard-navigate-progress-fix-bug/g1-decision.md).
**Split:** one change for the related dashboard and trip collaboration fixes;
no mandatory external change dependency.
OpenSpec is the proposed delivery track; a separate agile story split is optional.
