# Design

## Context

See [proposal](proposal.md) and [ATDD design](atdd-design.md). The current
`TripController` exposes member-guarded individual reads but no list;
`App.tsx` routes the dashboard to Home and remembers a details trip for the
trip tab. The organizer's details page issues an invitation on load. The
current session principal and existing authenticated shell must be preserved.
The [G1 decision](g1-decision.md) is Pass only for the earlier interim scope;
the revised milestone and recommendation scope requires renewed alignment.

## Goals / Non-Goals

**Goals:** combine authorized owning reads into a defensively validated,
read-only view of all member trips; match the supplied prototype's trip hero,
seven-stage strip, four status cards, next-step card and mobile dock; provide
observable failure and access states. Completed trips may appear until US-058
is integrated.

**Non-Goals:** no completion or archive implementation, no dashboard-owned
progress persistence, no new destination permissions or destination actions.
Do not treat a test double as delivered upstream functionality.

## Decisions

### D1 — Member-scoped list

Add a read-only `GET /api/trips` returning a JSON array of card objects
`{id, name, destination, startDate, endDate}` for all the session principal's
member trips, without a completion filter. An empty array means a successful
empty result only. Query membership server-side; never accept an identity
from a client parameter or header. Do not label results active or infer
completion. A later change must establish the delivered US-058 read,
consistency and fixture contracts before adding completion filtering.

Alternatives: downloading all trips and filtering in the browser leaks private
data; a dashboard-owned completion column duplicates the owning state. Both
are rejected. This new API is not in the binding tech-stack plan's API list;
it is an explicit deviation to reconcile only when this change is archived.
The current plan also describes older identity/data contracts; do not restore
them over the existing authenticated implementation.

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

Use `#/` for the list and `#/dashboard/trips/<id>` for the selected view.
Parse malformed selected identifiers explicitly instead of falling back to
Home; both routes retain the dashboard active tab. Keep the existing details
route available through non-dashboard flows, but from either dashboard prevent
the trip tab and open-by-id entry from reaching it while the separately owned
fix is absent. Show coming soon for that destination and any unimplemented
destination. A link is available only after its existing page-load behavior
and authorization are verified not to mutate on navigation. Preserve
create/back behavior, browser history and account identity.

### D4 — Acceptance before code

Follow the [ATDD design](atdd-design.md) for red-first API and E2E slices:
include all member trips and distinguish verified planning milestones from
unknown reunion and completion.
The
existing Maven and frontend build CI jobs are real gates; browser acceptance
has no existing configured runner and needs explicit setup during apply.
Test against real applicable separately owned dependencies before end-to-end
acceptance of the interim scope. Real completion-provider integration is
deferred and must not be claimed.

## Risks / Trade-offs

- **Undelivered US-058 read** → all member trips, including potentially
  completed trips, appear and completion is unknown. A later change must
  establish the real read contract before restoring active-only behavior.
- **Revised G1 scope** → the existing Pass covers unavailable progress and no
  recommendation, not this revision. Obtain renewed human alignment and
  update ATDD evidence before implementation; do not imply the old Pass covers
  this design.
- **Auth and US-066 shell overlap** → Reuse the session authentication already
  present in the codebase without waiting for US-066 archive. US-061 proceeds
  first; Sammi Ng coordinates the later reconciliation of overlapping complete
  shell requirement blocks so US-066 preserves dashboard behavior. Verify
  authentication and authorization against the actual code for acceptance.
- **Separate archive and unsafe details page** → Archive is outside the interim
  scope. Keep details blocked until its separately owned no-write fix is
  verified; acceptance of the interim dashboard must verify that the block
  works and does not depend on delivery of that fix.
- **Changing source reads during composition** → never claim a cross-source
  atomic snapshot; reject inconsistent combinations and refresh. Validate
  completion/list consistency when the deferred integration is undertaken.
- **Original tracker drift** → owner Sammi Ng reconciles it separately; this
  design does not silently change the original issue.
- **No existing browser E2E CI** → establish a reproducible acceptance runner
  and record actual evidence; existing CI alone is insufficient.

## Deployment and rollback

Deploy only after applicable prerequisite contracts, feature checks and
navigation safety are verified. This change proposes no dashboard schema
migration; US-058 owns its own deployment and schema. Roll back the dashboard
application release without modifying upstream completion data. Archive only after
the final tech-stack-plan reconciliation task, including its log entry if the
plan changes.
