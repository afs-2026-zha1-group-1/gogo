# Design

## Context

See [proposal](proposal.md) and [ATDD design](atdd-design.md). The current
`TripController` exposes member-guarded individual reads but no list;
`App.tsx` routes the dashboard to Home and remembers a details trip for the
trip tab. The organizer's details page issues an invitation on load. The
current session principal and existing authenticated shell must be preserved.
The [G1 decision](g1-decision.md) is Conditional, not a Pass.

## Goals / Non-Goals

**Goals:** combine authorized owning reads into a defensively validated,
read-only view of all member trips; keep the list, selected dashboard and
shell coherent; provide observable failure and access states. Until US-058
is integrated, completion-dependent progress is unavailable and completed
trips may appear.

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

Show the seven-stage progress as unavailable: the earlier projection assumes
a non-completed trip, which cannot be established without US-058. Do not
assign stages, infer active status or show a recommendation. Completion-aware
projection and the viewer preference-submission predicate are deferred to a
later integration.

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

Follow [ATDD design](atdd-design.md) for red-first API and E2E slices. The
existing Maven and frontend build CI jobs are real gates; browser acceptance
has no existing configured runner and needs explicit setup during apply.
Test against real applicable separately owned dependencies before end-to-end
acceptance of the interim scope. Real completion-provider integration is
deferred and must not be claimed.

## Risks / Trade-offs

- **Undelivered US-058 read** → all member trips, including potentially
  completed trips, appear and progress is unavailable. A later change must
  establish the real read contract before restoring active-only behavior.
- **Auth and US-066 shell overlap** → Sammi Ng confirms delivery/sequence and
  reconciles overlapping complete requirement blocks before archive.
- **Separate archive and unsafe details page** → Sammi Ng confirms owners and
  delivery; keep details blocked until its no-write fix is verified and do not
  claim end-to-end acceptance while applicable prerequisites are missing.
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
