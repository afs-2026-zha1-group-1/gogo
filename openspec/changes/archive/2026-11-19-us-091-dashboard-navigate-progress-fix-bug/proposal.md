# Proposal

## Why

Dashboard navigation currently hides the saved current trip. The progress strip
also shows unsupported milestones and advances past invitations too early;
invitation sharing and main-plan generation exclude other trip members.

## What Changes

- Open the saved current trip from the Trips tab regardless of navigation origin.
- Remove reunion and completion from dashboard progress and show invitations
  for other members as well as organizers.
- Let all trip members obtain and share the existing invitation; keep outsider
  denial and the existing joining deadline.
- Add the existing create-trip page to the dashboard's quick entries.
- Keep invitation and main-plan generation available after personal preferences
  are ready, and allow any member to generate or regenerate a main-plan draft.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: consistently open the saved current trip from the Trips tab.
- `trip-dashboard`: remove the two unsupported milestones and include the
  invitation milestone for all trip members.
- `invitations`: permit invitation issuance and sharing by trip members.
- `main-itinerary`: permit members to generate drafts; confirmation remains
  organizer-only.

## Impact

React navigation, dashboard, invitation and main-plan views; Spring invitation
and main-plan generation authorization; existing API and browser tests. No new endpoint, table or
dependency is anticipated. One full-stack change; estimated size: small to
medium. Source: [US-091 requirement](../../../../requirement-workspace/requirements/us-091-dashboard-navigate-progress-fix-bug.md)
and [impact brief](../../../../requirement-workspace/analysis/us-091-impact-brief.md).
