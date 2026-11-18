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
| Living specs | Dashboard milestone and invitation issuance requirements conflict with the new request and need later delta specifications; current-trip persistence remains the authority. |

**Blast radius:** React navigation and invitation surfaces; Spring invitation
authorization; existing session, current-trip and token contracts. No new storage
or dependency is anticipated. Test dashboard navigation, role-based progress,
both invitation surfaces, API authorization, token reuse and closed joining.

**Risk:** a direct dashboard route can differ from the saved selection; do not
silently replace it. Non-members must never receive the token.
**Blockers:** none identified. **Split:** one change for the three related
dashboard and trip collaboration fixes; no mandatory external change dependency.
OpenSpec is the proposed delivery track; a separate agile story split is optional.
