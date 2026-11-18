# Proposal

## Why

Trip members need a reliable view of their selected trip's planning state and
access to related pages.

## What Changes

- The authenticated dashboard at `#/` reads the caller's persisted current
  trip and shows its overview. If no trip is selected, it offers My Trips and
  trip creation. The separate My Trips picker lists member trips and persists
  an explicitly selected trip. A direct `#/dashboard/trips/<id>` overview
  remains available without persisting that selection.
- Compose authorized trip, readiness, main-plan and split reads into a
  source-backed overview. Show role-specific planning milestones, suggestions,
  and quick links. Reunion and completion remain unknown; do not infer
  completion or active-trip status from dates or split state.
- Offer invitation, preference, main-plan and split destinations using
  existing access rules. The organizer's invitation page and trip-details
  page invoke the existing invitation POST on load. The dashboard overview
  itself is read-only, but navigation to those destinations is not guaranteed
  to be write-free.
- Show loading, empty-selection, missing, denied and failed states without
  fabricating trip facts. Completion filtering and archive remain deferred.

## Non-Goals

- Implement completion, archive, dashboard-owned persisted progress, or new
  destination permissions.
- Change existing destination operations, including invitation issuance.
- Represent earlier human approval or CI as approval or verification of the
  current, uncommitted implementation.

## Capabilities

### New Capabilities

- `trip-dashboard`: authenticated current-trip overview, direct trip overview,
  role-specific planning progress, recommendations and explicit error states.

### Modified Capabilities

- `app-shell`: dashboard and trip navigation within the existing authenticated
  five-tab shell, including the persisted My Trips picker.

## Impact

- **Self:** the current implementation replaces the previously approved
  member-trip dashboard list with the selected-current-trip overview and adds
  role-specific milestones and destination links.
- **Upstream:** existing authentication, membership, current-trip, readiness,
  plan, split and invitation capabilities remain authoritative.
- **Downstream:** organizers may issue an invitation by opening the invitation
  or trip-details page; the former blanket no-navigation-write boundary no
  longer describes the implementation and requires renewed IO/SA alignment.
- **Frontend:** the dashboard, shell routes, destination return paths and
  associated tests change; existing destination permissions remain in force.
- **Backend/data:** reuse existing APIs and current-trip persistence; no
  dashboard progress schema or completion writer is added.
- **Verification:** validate access, current selection, progress, destination
  behavior, errors and invitation side effects. CI for a prior commit is not
  evidence for subsequent local changes.
- **Outstanding:** the prior [G1 decision](g1-decision.md) covers the earlier
  scope only. Obtain a new human decision for this reconciliation; reconcile
  issue #26 and the overlapping shell change separately. At archive, reconcile
  the tech-stack plan with what actually ships.

Source: [US-061 requirement](../../../../requirement-workspace/requirements/US-061.md)
and the current implementation and tests.
