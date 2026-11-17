# Proposal

## Why

Trip members need a reliable, read-only view of their trips without visiting
several pages. The current dashboard shows home content rather than
member-trip aggregation.

## What Changes

- Replace the dashboard landing content with cards for all trips in which the
  signed-in user is a member. Each card shows the saved trip name,
  destination, and start/end dates and opens that trip's dashboard. Until
  US-058 is integrated, completed trips may appear and cards are not labelled
  active.
- Show an authorized per-trip overview with the trip summary, member and ready
  counts, and main-plan and split statuses. Present completion-dependent
  progress as unavailable until authoritative completion is integrated.
  Reuse owning capabilities' data and authorization; do not persist progress.
- Show navigation to available pages without changing saved state. Pages not
  yet developed say they are coming soon. The existing trip-details
  destination also says coming soon until its organizer page-load invitation
  write is fixed separately; dashboard tabs must not bypass this restriction.
- Do not show a next-action recommendation or implement actions belonging to
  other pages. Active-only filtering and the separately delivered archive
  remain follow-up work. The interim member-trip scope supersedes the earlier
  active-only dashboard decision; tracker reconciliation remains with its
  owner.
- Distinguish loading, empty, missing, denied and read-failure states from
  real data. Do not infer completion or active status from dates, split state
  or missing data.

## Non-Goals

- Implement completion, archive, invitation issuance, or other destination-page
  actions; those remain owned by their respective capabilities.
- Persist dashboard progress or recommend a next action.
- Change destination permissions or reconcile the original tracker issue as
  part of this change.

## Capabilities

### New Capabilities

- `trip-dashboard`: authenticated member-trip listing and read-only trip
  overview, unavailable completion-dependent progress, safe links and honest
  unavailable states.

### Modified Capabilities

- `app-shell`: dashboard tab placement and navigation now accommodate the
  member-trip list and selected-trip dashboard rather than home-only content;
  preserve the existing shell and authenticated access boundary.

## Impact

- **Self:** this change delivers the interim member-trip list, overview and
  safe dashboard navigation described above; progress remains unavailable.
- **Upstream:** authentication, membership, readiness, main-plan and split
  reads, plus the separately delivered trip-details fix, supply or constrain
  dashboard behavior. US-058 is deferred.
- **Downstream:** authenticated trip members and the shell consume the
  dashboard views; completed trips may appear until completion integration.
- **Frontend:** `frontend/src/App.tsx`, dashboard/home content, navigation and
  related tests. Existing destination operations and permissions remain owned
  by their respective pages.
- **Backend/data:** a new authenticated, membership-filtered read for all member
  trips is required; the current trip controller exposes only an individual
  member-guarded read. Reuse authorized readiness, main-plan and split reads.
  Do not add a completion writer, archive, or duplicate business state.
- **Prerequisites:** archive delivery is separate, and the trip-details
  automatic invitation issuance must be fixed separately before that
  destination is linked. US-058 and active-only filtering are deferred, not
  required to implement or accept the interim member-trip scope. Applicable
  authentication and navigation dependencies still require verification.
- **Existing contracts:** `openspec/specs/app-shell/spec.md` says there is no
  dashboard aggregation and contains historical identity-scaffold language.
  Update the applicable shell requirements without restoring that scaffold.
  The new list read is not in the binding tech-stack plan's API list; record
  the deviation during design and reconcile the plan at archive.
- **Verification:** cover authorized membership isolation, actual counts and
  statuses, unavailable progress, safe and unavailable navigation, an empty
  membership list, error handling and no navigation writes.
- **Effort and ordering:** medium-to-large full-stack vertical slice.
  Completion filtering and progress projection require a separately planned
  US-058 follow-up. The archive and trip-details fix remain separate
  deliverables; applicable prerequisites must be met before acceptance.

Source: `requirement-workspace/requirements/US-061.md`,
`requirement-workspace/analysis/us-061-deep-dive.md`, and the US-061 section of
`requirement-workspace/impact-brief.md`. The user confirmed the single-change
split on 2026-11-16.
