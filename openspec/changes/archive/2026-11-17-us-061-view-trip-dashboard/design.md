# Design

## Context and scope

This design records the current working-tree behavior, not a new approval.
The [previous G1 decision](g1-decision.md) covers a member-trip dashboard
list and write-free destination navigation, not this revised behavior. Renew
IO/SA alignment before treating the revised scope as accepted.

## D1 — Current-trip dashboard

At `#/`, read `GET /api/trips/current` for the authenticated account and load
the selected trip's overview. A null selection shows links to `#/my-trips`
and `#/create`; a failed or invalid response shows an error and retry. The
picker uses the existing member-scoped `GET /api/trips` and persists the
user's explicit current-trip selection. The dashboard waits for an in-flight
picker write. `#/dashboard/trips/<id>` opens that trip's overview without
changing the persisted current trip.

## D2 — Authorized source composition

The overview combines the existing trip, main-plan inputs, main-plan and
split-draft reads. Source validation distinguishes missing and denied trips,
pending and failed reads, an authorized no-draft response and inconsistent
source combinations. Account and trip changes invalidate stale responses.
There is no dashboard-owned progress persistence or completion read. The
current trip may be completed; dates and split state are not completion facts.

## D3 — Role-specific progress and recommendations

Organizers see setup, preferences, invitations, main plan, split, reunion and
completion, in that order. Other members see preferences, main plan, split,
reunion and completion. Preference readiness and counts, joining status,
plan status and split status come from the owning reads; visual done, active
and pending states are derived by `dashboardProgress.ts`. Reunion and
completion are shown as unknown. These visual states are not authoritative
trip completion.

Recommendations are chosen in this order: confirmed main plan leads to split;
otherwise an unready viewer is directed to preferences; a ready organizer
alone with no plan is directed to invitations; an absent plan leads to the
main-plan inputs; otherwise the existing plan is shown. Hints differ by role
and readiness. The overview includes invitation, preferences and main-plan
quick links.

## D4 — Navigation and side effects

Dashboard-origin preferences, main plan, inputs, invitation and split routes
carry the relevant trip context and return path. Invitation and details pages
use the existing `InvitationPanel`: for an organizer it invokes
`POST /api/trips/{id}/invitation` on load, including when a dashboard link
opens it. Non-organizers see the existing restriction. The trip-entry page
allows an ID lookup and routes to trip details; those details can also invoke
the POST for organizers. Consequently only the dashboard overview itself is
described as read-only; a blanket navigation-no-write guarantee is incorrect.
Invitation behavior and access remain owned by their existing capabilities.

The five-tab shell and account access remain. The invitation-only screen is
rendered outside the shell; destination-specific navigation is not assumed to
preserve the dock. Dashboard-origin split and main-plan back actions return to
the trip dashboard; non-dashboard flows retain their own return behavior.

## Verification, risks and rollout

Use the isolated browser harness and the existing API, unit, build and browser
checks; record observed results rather than inferred success. Explicitly
exercise organizer and member invitation behavior, missing and denied trips,
stale responses, picker persistence and current-trip reload. Previous CI runs
cover their recorded commit only, not the current worktree. The automatic
invitation POST is a changed boundary requiring human review, not a claimed
no-write fix. US-058 completion, archive and issue #26 reconciliation remain
separate. Reconcile the tech-stack plan only at archive for actually shipped
capabilities, adding the knowledge log entry if it changes.
