# Proposal

## Why

Dashboard navigation currently hides the saved current trip. The progress strip
also shows unsupported milestones, and invitation sharing excludes trip members.

## What Changes

- Open the saved current trip from the Trips tab regardless of navigation origin.
- Remove reunion and completion from dashboard progress.
- Let all trip members obtain and share the existing invitation; keep outsider
  denial and the existing joining deadline.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: consistently open the saved current trip from the Trips tab.
- `trip-dashboard`: remove the two unsupported milestones.
- `invitations`: permit invitation issuance and sharing by trip members.

## Impact

React navigation, dashboard and invitation views; Spring invitation
authorization; existing API and browser tests. No new endpoint, table or
dependency is anticipated. One full-stack change; estimated size: small to
medium. Source: [US-091 requirement](../../../requirement-workspace/requirements/us-091-dashboard-navigate-progress-fix-bug.md)
and [impact brief](../../../requirement-workspace/analysis/us-091-impact-brief.md).
