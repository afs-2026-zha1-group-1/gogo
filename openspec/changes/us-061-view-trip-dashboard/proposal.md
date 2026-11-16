# Proposal

## Why

Trip members need a reliable, read-only view of their active trips and each
trip's progress without visiting several pages. The current dashboard shows
home content rather than member-trip aggregation.

## What Changes

- Replace the dashboard landing content with cards for all non-completed trips
  in which the signed-in user is a member. Each card shows the saved trip name,
  destination, and start/end dates and opens that trip's dashboard.
- Show an authorized per-trip overview with the trip summary, member and ready
  counts, main-plan and split statuses, and the seven-stage progress display
  defined in `requirement-workspace/requirements/US-061.md`. Reuse the
  owning capabilities' data and authorization; do not persist progress.
- Show navigation to available pages without changing saved state. Pages not
  yet developed say they are coming soon. The existing trip-details
  destination also says coming soon until its organizer page-load invitation
  write is fixed separately; dashboard tabs must not bypass this restriction.
- Do not show a next-action recommendation or implement actions belonging to
  other pages. Completed trips are excluded from the active dashboard using
  the authoritative US-058 state and belong to the separately delivered
  archive. These confirmed decisions supersede conflicting original US-061
  issue criteria; tracker reconciliation remains with its owner.
- Distinguish loading, empty, missing, denied and read-failure states from
  real data. A failed completion read must not silently classify a trip as
  active.

## Capabilities

### New Capabilities

- `trip-dashboard`: authenticated member-trip listing and read-only trip
  overview, progress presentation, safe links and honest unavailable states.

### Modified Capabilities

- `app-shell`: dashboard tab placement and navigation now accommodate the
  active-trip list and selected-trip dashboard rather than home-only content;
  preserve the existing shell and authenticated access boundary.

## Impact

- **Frontend:** `frontend/src/App.tsx`, dashboard/home content, navigation and
  related tests. Existing destination operations and permissions remain owned
  by their respective pages.
- **Backend/data:** a new authenticated, membership-filtered read for active
  trips is required; the current trip controller exposes only an individual
  member-guarded read. Reuse authorized readiness, main-plan and split reads.
  Do not add a completion writer, archive, or duplicate business state.
- **Prerequisites:** US-058 must deliver an authoritative completion read;
  archive delivery is separate; and the trip-details automatic invitation
  issuance must be fixed separately before that destination is linked. These
  prevent end-to-end acceptance until delivered, even if dashboard work starts
  earlier.
- **Existing contracts:** `openspec/specs/app-shell/spec.md` says there is no
  dashboard aggregation and contains historical identity-scaffold language.
  Update the applicable shell requirements without restoring that scaffold.
  The new list read is not in the binding tech-stack plan's API list; record
  the deviation during design and reconcile the plan at archive.
- **Verification:** cover authorized membership isolation, actual counts and
  statuses, each progress-table branch, safe and unavailable navigation,
  completed exclusion, no active trips, error handling and no navigation
  writes.
- **Effort and ordering:** medium-to-large full-stack vertical slice. US-058,
  archive and the trip-details fix are separate upstream deliverables; the
  dashboard integrates their read/navigation contracts and is accepted only
  after applicable prerequisites are met.

Source: `requirement-workspace/requirements/US-061.md`,
`requirement-workspace/analysis/us-061-deep-dive.md`, and the US-061 section of
`requirement-workspace/impact-brief.md`. The user confirmed the single-change
split on 2026-11-16.
