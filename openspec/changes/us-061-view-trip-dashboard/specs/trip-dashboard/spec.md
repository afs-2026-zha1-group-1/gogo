# Spec Delta

## Purpose

Give authenticated trip members a reliable, read-only view of their member
trips and available destinations without changing trip state.

## ADDED Requirements

### Requirement: Member-trip listing

The dashboard SHALL show all and only trips in which the authenticated
traveler is a member. Until US-058 integration is delivered, completed trips
may appear; the dashboard SHALL NOT label the list or cards active or infer
completion from dates or other trip statuses. Each card SHALL show the saved
name, destination, start date and end date and open the corresponding trip
dashboard.

#### Scenario: Only member trips are listed

- **GIVEN** Ben belongs to trips A, B and C, and is not a member of trip D
- **WHEN** Ben opens the dashboard after signing in
- **THEN** exactly A, B and C are listed, each with its saved name, destination
  and start and end dates
- **AND** D and its private information are not shown
- **AND** none of the cards is presented as confirmed active
- **AND** selecting B opens B's trip dashboard

#### Scenario: No member trips

- **GIVEN** the authenticated traveler has no member trips
- **WHEN** the member-trip list is successfully loaded
- **THEN** an empty state is shown without fabricated trip information

#### Scenario: Completion is not integrated

- **GIVEN** US-058 completion state is not integrated
- **WHEN** the dashboard loads the member-trip list
- **THEN** it includes all member trips regardless of possible completion
- **AND** it does not infer or display completion or active status

### Requirement: Authorized trip overview

The selected-trip dashboard SHALL show the saved trip summary, member count,
ready count, main-plan status and split status using the owning capabilities'
authorized reads and readiness rules. It SHALL show a reported stale main plan
as stale and SHALL NOT create separate persisted dashboard progress state.

#### Scenario: Overview reflects saved data

- **GIVEN** Ben belongs to a trip with four members, three ready members, a
  stale main-plan draft and an active split draft
- **WHEN** Ben opens its dashboard and all required reads succeed
- **THEN** the saved name, destination, dates and available start/end locations
  are shown with member count 4 and ready count 3
- **AND** the main-plan draft is identified as stale and the split as active

#### Scenario: Successful absent drafts

- **GIVEN** the owning reads successfully report no main-plan draft and no
  split draft
- **WHEN** an authorized member opens the trip dashboard
- **THEN** it shows the main plan and split as absent rather than as failures

#### Scenario: Source data changes

- **GIVEN** the member count, readiness or a plan status changes in its owning
  capability
- **WHEN** the dashboard successfully reads the updated state
- **THEN** the displayed values reflect that state without a dashboard write

### Requirement: Completion-dependent progress unavailable

Until completion state is integrated, the dashboard SHALL present the
completion-dependent seven-stage progress as unavailable, without assigning
completed, current or upcoming stages. It SHALL NOT show a next-action
recommendation or write completion state.

#### Scenario: Progress cannot be established

- **GIVEN** an authorized member views any member trip
- **WHEN** US-058 completion state is not integrated
- **THEN** progress is explicitly unavailable and no stages are assigned
- **AND** no completion, active status or next-action recommendation is inferred

### Requirement: Explicit dashboard read and access states

The dashboard SHALL distinguish pending, empty, missing, denied and failed
reads from successful data. It SHALL enforce the existing authenticated
membership boundary and SHALL NOT substitute zero or absent drafts for
invalid, incomplete or failed responses.

#### Scenario: Loading and failed overview reads

- **GIVEN** an authorized member opens a selected trip
- **WHEN** a required trip, readiness, plan or split read is pending
- **THEN** the relevant information is shown as loading, not as actual values
- **WHEN** any required read fails or returns invalid or incomplete data
- **THEN** the affected information is shown as unavailable or in error
- **AND** the failure is not displayed as zero counts or an absent draft

#### Scenario: Missing and denied trips

- **GIVEN** a signed-in traveler requests an unknown or malformed trip
  identifier, or a trip of which the traveler is not a member
- **WHEN** the selected-trip dashboard is opened
- **THEN** it shows the applicable invalid/missing or denied outcome
- **AND** no other trip is substituted and no private trip data is disclosed

#### Scenario: Signed-out visitor

- **WHEN** a signed-out or expired-session traveler opens a dashboard
- **THEN** the existing authentication boundary applies
- **AND** no private trip data is displayed

### Requirement: Read-only dashboard navigation

The dashboard SHALL provide navigation to available destinations subject to
their existing authorization rules. A destination not yet developed SHALL
show coming soon rather than a broken link. Navigation alone SHALL NOT change
persisted state or perform actions owned by destination pages.

#### Scenario: An available destination is opened

- **GIVEN** an authorized member views the selected-trip dashboard
- **WHEN** the member follows an available destination link or dashboard tab
- **THEN** the destination opens under its existing access rules
- **AND** dashboard navigation alone does not change saved trip, invitation,
  preference, plan, split or completion state

#### Scenario: Destination unavailable

- **GIVEN** a destination has not been developed
- **WHEN** an authorized member views its dashboard entry
- **THEN** the entry says it is coming soon and does not navigate to a broken
  page

#### Scenario: Trip details is temporarily blocked

- **GIVEN** the separately owned trip-details fix preventing automatic
  invitation issuance on page load has not been delivered
- **WHEN** a member uses a dashboard entry or tab for trip details
- **THEN** the destination is presented as coming soon
- **AND** navigation does not open the unsafe details page or issue an
  invitation
