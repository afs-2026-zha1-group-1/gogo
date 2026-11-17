# Spec Delta

## ADDED Requirements

### Requirement: Trip detail main-plan navigation entry

The trip detail page at `#/trips/<id>` SHALL display a navigation entry to the
trip's main-plan view, positioned after the invitation section and before the
split-planning section. The entry SHALL be visible to every authenticated trip
member regardless of whether a main plan exists or has been confirmed. Activating
the entry SHALL navigate to `#/trips/<id>/main-plan` without triggering any
server-side mutation (no POST, PUT or DELETE). The main-plan page itself SHALL
handle all six states (loading, ready, empty, denied, missing, failed) unchanged;
this requirement adds no new state, API endpoint or permission rule.

#### Scenario: Member sees the entry on trip detail

- **WHEN** an authenticated member opens `#/trips/1` for a trip they belong to
- **THEN** the page renders a section titled "主线方案" between the "邀请朋友"
  section and the "分队规划" section
- **AND** the section contains a visible "查看主线方案" navigation control

#### Scenario: Member activates the entry and reaches the plan

- **WHEN** a member activates "查看主线方案" on the trip detail page for trip 1
- **THEN** the route changes to `#/trips/1/main-plan` without a full page reload
- **AND** the main-plan page loads and displays its current state (ready with
  timeline, empty with guidance, or error) using existing logic
- **AND** no POST, PUT or DELETE request is issued by the navigation itself

#### Scenario: Entry visible when no plan exists

- **WHEN** a member opens trip detail for a trip that has no main-plan draft
- **THEN** the "查看主线方案" entry is still visible and clickable
- **AND** activating it shows the existing empty state on the main-plan page

#### Scenario: Non-member or unsigned-in user cannot reach the plan

- **WHEN** a user who is not a member of trip 1 navigates directly to
  `#/trips/1/main-plan`
- **THEN** the main-plan page shows the existing denied state with no plan data
- **WHEN** an unsigned-in user attempts to reach `#/trips/1/main-plan`
- **THEN** the existing login guard redirects to the login page

#### Scenario: Return to trip detail after viewing

- **WHEN** a member arrives at the main-plan page from trip detail and then
  activates the trip-detail info button in the main-plan appbar
- **THEN** the route returns to `#/trips/1` (the same trip's detail page)
- **AND** the trip detail page re-renders in its ready state with the main-plan
  entry still visible
