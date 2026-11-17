# Design

## Context

See [proposal](proposal.md) and [ATDD design](atdd-design.md). The current
US-071 supplies a member-scoped trip list and an explicitly persisted current
trip. The organizer's details page issues an invitation on load. The
current session principal and existing authenticated shell must be preserved.
The [G1 decision](g1-decision.md) records the requester's report that the IO
and SA passed the revised milestone and recommendation scope.

## Goals / Non-Goals

**Goals:** combine authorized owning reads into a defensively validated,
read-only view of all member trips; match the supplied prototype's trip hero,
seven-stage strip, four status cards, an eligible next-step card and mobile
dock; provide observable failure and access states. Keep the existing five-tab
dock and My Account access, as in the release-2 HTML prototype, rather than
removing account access to match the four-tab screenshot. Completed trips may
appear until US-058 is integrated.

**Non-Goals:** no completion or archive implementation, no dashboard-owned
progress persistence, no new destination permissions or destination actions.
Do not treat a test double as delivered upstream functionality.

## Decisions

### D1 — Member-scoped list

Reuse US-071's read-only `GET /api/trips`, returning
`{trips:[{id, name, destination, startDate, endDate, organizer, mainPlanConfirmed}]}`
for all the session principal's member trips, without a completion filter.
An empty `trips` array means a successful empty result only. Validate the
envelope and dashboard card fields before displaying them. Membership is
queried server-side; never accept an identity from a client parameter or
header. The existing API orders by whether the end date is before the current
date, then start date and ID; the dashboard must not interpret that ordering
as authoritative completion or label results active. A later change must
establish the delivered US-058 read, consistency and fixture contracts
before adding completion filtering.

Alternatives: downloading all trips and filtering in the browser leaks private
data; a dashboard-owned completion column duplicates the owning state. Both
are rejected. The existing API is recorded in the binding tech-stack plan.
The plan also describes older identity/data contracts; do not restore them
over the existing authenticated implementation.

### D2 — Overview as authorized read composition

Use `GET /api/trips/{id}`, `/main-plan/inputs`, `/main-plan`, and
`/split-draft`. Reuse existing session
authentication and each owning endpoint's authorization and data rules. The
main-plan `404 NO_DRAFT` and the split endpoint's successful null draft are
absent only when their precise contracts say so; other 404s, invalid payloads,
missing mandatory fields and failures are not absence. Validate data at the
boundary; distinguish pending, denied, missing and failed states.
On trip or account changes discard stale in-flight results and prevent private
data from the previous selection being shown. A successful refresh rereads
source values; no dashboard-owned persistence.

An all-in-one aggregation endpoint would duplicate existing read contracts and
permission checks; use composition. Revisit the boundary when the separately
planned completion integration establishes its actual contract.

### D3 — Progress and route safety

Use the screenshot and release-2 prototype for the selected overview's
mobile visual hierarchy, not as sources of trip facts or destination actions.
The hero, milestone strip and status cards display authorized source values;
unknown and failed data remain visibly distinct from real states.

Display seven independent milestones in the prototype's order, not a single
overall current journey stage: setup is created; invitations are open or
closed according to `mainPlanConfirmed`; preferences show the verified
ready/member count; main plan shows absent, draft, stale or confirmed; split
shows absent, active, confirmed or cancelled. Reunion and completion are
unknown because neither has an authoritative read. Do not infer completion
or active status from dates or split state. The strip uses verified facts
only; loading, failure and inconsistent source results remain explicit.

Suggest reviewing the signed-in member's preferences when their input member
is not ready and the main plan is unconfirmed. Otherwise, when that member is
ready or the main plan is confirmed, suggest viewing the main plan. Only show
a suggestion after the required reads are validated and its destination is
verified to load without writes and to enforce existing authorization. The
dashboard never performs the destination's operations.
Dashboard-origin preference and main-plan views use
`#/dashboard/trips/<id>/preferences` and
`#/dashboard/trips/<id>/main-plan`, respectively. Their return controls lead
back to the selected dashboard; the main-plan view does not expose the unsafe
details link. Main-plan inputs use `#/dashboard/trips/<id>/main-plan/inputs`
when opened from the dashboard, retaining that origin on return or generation.
Existing non-dashboard routes retain their owning behavior.

Use `#/` for the list and `#/dashboard/trips/<id>` for the selected view.
Parse malformed selected identifiers explicitly instead of falling back to
Home; both routes retain the dashboard active tab. Keep the existing details
route available through non-dashboard flows, but from either dashboard prevent
the trip tab and open-by-id entry from reaching it while the separately owned
fix is absent. Dashboard-origin trip-tab navigation uses
`#/dashboard/trip-entry`, which remains guarded on reload; non-dashboard
`#/trips` retains US-071's current-trip behavior. The separate `#/my-trips`
picker remains the explicit persisted selection. A dashboard selection is
ephemeral and never writes `current_trip_id`; a pending or failed selection
cannot fall back to a previously saved current trip, and late current-trip
responses cannot replace the selected dashboard trip. Dashboard-origin roster
return links lead back to the selected dashboard, while non-dashboard roster
and main-plan back links retain their trip-details destinations. The split
flow carries its dashboard origin through nested screens so its back action
returns to the dashboard; a direct non-dashboard split entry still returns to
trip details. The current browser tab retains the safety context across
refresh without persisting a dashboard trip selection. Show coming soon for
that destination and any unimplemented
destination. A link is available only after its existing page-load behavior
and authorization are verified not to mutate on navigation. Preserve
create/back behavior, browser history and account identity.

The explicit picker invalidates prior shell trip context while a selection is
pending or fails. Only one picker write may be in flight, including across
navigation away from and back to the picker; late or cross-account responses
cannot restore an older selection. Successful selection is reread from its
owning current-trip endpoint.

### D4 — Acceptance before code

Follow the [ATDD design](atdd-design.md) for red-first API and E2E slices:
include all member trips and distinguish verified planning milestones from
unknown reunion and completion.
The existing Maven and frontend build CI jobs are real gates. A reproducible
browser acceptance runner and CI job were added during implementation. Run
local verification before the PR, then require actual CI results before
end-to-end acceptance of the interim scope. Test against real applicable
separately owned dependencies; completion-provider integration remains
deferred and must not be claimed.

## Risks / Trade-offs

- **Undelivered US-058 read** → all member trips, including potentially
  completed trips, appear and completion is unknown. A later change must
  establish the real read contract before restoring active-only behavior.
- **Revised G1 scope** → the earlier Pass did not cover this revision.
  Renewed IO/SA alignment is recorded as reported, not as direct signatures;
  the remaining acceptance and coordination checks still apply.
- **Auth and shell compatibility** → US-066 coordination is outside this
  change. Reuse the session authentication already present in the codebase
  and verify authentication and authorization against the actual code for
  acceptance. Future shell changes still need their own compatibility review.
- **Separate archive and unsafe details page** → Archive is outside the interim
  scope. Keep details blocked until its separately owned no-write fix is
  verified; acceptance of the interim dashboard must verify that the block
  works and does not depend on delivery of that fix.
- **Changing source reads during composition** → never claim a cross-source
  atomic snapshot; reject inconsistent combinations and refresh. Validate
  completion/list consistency when the deferred integration is undertaken.
- **Original tracker drift** → owner Sammi Ng reconciles it separately; this
  design does not silently change the original issue.
- **Browser acceptance CI** → the reproducible runner and CI job have been
  added, but actual remote CI results remain required for acceptance.

## Deployment and rollback

Deploy only after applicable prerequisite contracts, feature checks and
navigation safety are verified. This change proposes no dashboard schema
migration; US-058 owns its own deployment and schema. Roll back the dashboard
application release without modifying upstream completion data. Archive only after
the final tech-stack-plan reconciliation task, including its log entry if the
plan changes.
