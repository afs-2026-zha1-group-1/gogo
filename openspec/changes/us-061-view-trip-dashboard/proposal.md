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
  active. Reuse the member-scoped list delivered by US-071.
- Show an authorized per-trip overview with the trip summary, member and ready
  counts, and main-plan and split statuses. Present a seven-stage progress
  strip based on verified planning data, with reunion and completion marked
  unknown until their authoritative state is available.
  Follow the supplied screenshot and release-2 prototype for the mobile hero,
  milestones and four status cards. Reuse owning capabilities' data and
  authorization; do not persist progress or show prototype demo values.
- Show navigation to available pages without changing saved state. Pages not
  yet developed say they are coming soon. The existing trip-details
  destination also says coming soon until its organizer page-load invitation
  write is fixed separately; dashboard tabs must not bypass this restriction.
  Dashboard selection is ephemeral; the separate US-071 picker continues to
  persist an explicitly chosen current trip.
- Show a next-step recommendation only when supported by verified source data
  and an authorized, read-only destination. Do not execute actions belonging
  to other pages. Active-only filtering and the separately delivered archive
  remain follow-up work. The interim member-trip scope supersedes the earlier
  active-only dashboard decision; tracker reconciliation remains with its
  owner.
- Distinguish loading, empty, missing, denied and read-failure states from
  real data. Do not infer completion or active status from dates, split state
  or missing data.

## Non-Goals

- Implement completion, archive, invitation issuance, or other destination-page
  actions; those remain owned by their respective capabilities.
- Persist dashboard progress or infer reunion or completion state.
- Change destination permissions or reconcile the original tracker issue as
  part of this change.

## Capabilities

### New Capabilities

- `trip-dashboard`: authenticated member-trip listing and read-only trip
  overview, source-backed planning milestones, safe recommendations and honest
  unknown states.

### Modified Capabilities

- `app-shell`: dashboard tab placement and navigation now accommodate the
  member-trip list and selected-trip dashboard rather than home-only content;
  preserve the existing five-tab shell, account access and authenticated
  access boundary.

## Impact

- **Self:** this change proposes the interim member-trip list, overview,
  source-backed planning milestones, safe recommendations and navigation
  described above. Reunion and completion remain unknown.
- **Upstream:** authentication, membership, readiness, main-plan and split
  reads, plus the separately delivered trip-details fix, supply or constrain
  dashboard behavior. Reuse the session authentication already present in the
  codebase; US-066 need not be archived before US-061. US-058 is deferred.
- **Downstream:** authenticated trip members and the shell consume the
  dashboard views; completed trips may appear until completion integration.
- **Frontend:** `frontend/src/App.tsx`, dashboard/home content, navigation and
  related tests. Existing destination operations and permissions remain owned
  by their respective pages.
- **Backend/data:** reuse US-071's authenticated, membership-filtered trip
  list and its existing response envelope, plus authorized readiness,
  main-plan and split reads. Do not add a duplicate list API, completion
  writer, archive, or duplicate business state.
- **Prerequisites:** archive delivery is separate, and the trip-details
  automatic invitation issuance must be fixed separately before that
  destination is linked. US-058 and active-only filtering are deferred, not
  required to implement or accept the interim member-trip scope. Applicable
  authentication and navigation behavior still require verification. US-066
  coordination is outside this change; the existing authenticated shell and
  dashboard behavior remain in scope.
- **Existing contracts:** `openspec/specs/app-shell/spec.md` says there is no
  dashboard aggregation and contains historical identity-scaffold language.
  Update the applicable shell requirements without restoring that scaffold.
  US-071 has since added its list and current-trip APIs to the binding
  tech-stack plan; reconcile US-061's actually shipped behavior at archive.
- **Verification:** cover authorized membership isolation, actual counts and
  statuses, source-backed progress and recommendations, safe and unavailable navigation, an empty
  membership list, error handling and no navigation writes.
- **Effort and ordering:** medium-to-large full-stack vertical slice.
  Completion filtering and completion-aware progress require a separately
  planned US-058 follow-up. The archive and trip-details fix remain separate
  deliverables; applicable prerequisites must be met before acceptance.
  The revised scope's reported G1 Pass is recorded in
  [g1-decision.md](g1-decision.md); the remaining acceptance and coordination
  checks still apply.

Source: `requirement-workspace/requirements/US-061.md`,
`requirement-workspace/analysis/us-061-deep-dive.md`, and the US-061 section of
`requirement-workspace/impact-brief.md`. The user confirmed the single-change
split on 2026-11-16.
