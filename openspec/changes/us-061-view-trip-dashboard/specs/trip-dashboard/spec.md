# Spec Delta

## Purpose

Give authenticated trip members a reliable, read-only view of their active
trips, progress and available destinations without changing trip state.

## ADDED Requirements

### Requirement: Active member-trip listing

The dashboard SHALL show all and only non-completed trips in which the
authenticated traveler is a member. Completion SHALL be determined by the
authoritative US-058 state, not by dates or other trip statuses. Each card
SHALL show the saved name, destination, start date and end date and open the
corresponding trip dashboard.

#### Scenario: Only active member trips are listed

- **GIVEN** Ben belongs to active trips A and B and completed trip C, and is
  not a member of active trip D
- **WHEN** Ben opens the dashboard after signing in
- **THEN** exactly A and B are listed, each with its saved name, destination
  and start and end dates
- **AND** C and D and their private information are not shown
- **AND** selecting B opens B's trip dashboard

#### Scenario: No active trips

- **GIVEN** the authenticated traveler has no non-completed member trips
- **WHEN** the active-trip list is successfully loaded
- **THEN** an empty state is shown without fabricated trip information

#### Scenario: Completion cannot be read

- **GIVEN** completion state for a member trip is unavailable or invalid
- **WHEN** the dashboard loads the active-trip list
- **THEN** it shows an error or unavailable state
- **AND** it does not classify the affected trip as active or report a
  successful empty list on the basis of that failure

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

### Requirement: Active-trip progress projection

The dashboard SHALL display setup, invitations, preferences, main plan, split,
reunion and completion as completed, current or upcoming using the confirmed
active-trip state rules below. It SHALL NOT show a next-action recommendation.

#### Scenario: Joining remains open

- **GIVEN** an active trip's joining remains open, regardless of whether a
  member has submitted preferences
- **WHEN** an authorized member views its progress
- **THEN** setup is completed and invitations is current
- **AND** preferences, main plan, split, reunion and completion are upcoming
- **AND** a non-organizer who has not submitted preferences sees a waiting
  message rather than a next-action recommendation

#### Scenario: Confirmed main plan without a current split

- **GIVEN** an active trip has a confirmed main plan and either no split draft
  or a cancelled split draft
- **WHEN** an authorized member views its progress
- **THEN** setup, invitations and preferences are completed
- **AND** main plan is current and split, reunion and completion are upcoming

#### Scenario: Active or confirmed split

- **GIVEN** an active trip has an active or confirmed split
- **WHEN** an authorized member views its progress
- **THEN** setup, invitations, preferences and main plan are completed
- **AND** split is current and reunion and completion are upcoming

#### Scenario: Trip becomes completed

- **GIVEN** US-058 reports that a member trip is completed
- **WHEN** the active dashboard is loaded or refreshed
- **THEN** the trip is absent from the active list
- **AND** the dashboard does not infer a completion stage or write completion
  state; the separate archive owns completed-trip access

#### Scenario: Previously selected trip is completed

- **GIVEN** a selected member trip is reported completed by US-058
- **WHEN** its active-trip dashboard is opened or refreshed
- **THEN** it is not shown as an active overview or assigned active progress
- **AND** completed-trip access remains with the separately delivered archive

### Requirement: Explicit dashboard read and access states

The dashboard SHALL distinguish pending, empty, missing, denied and failed
reads from successful data. It SHALL enforce the existing authenticated
membership boundary and SHALL NOT substitute zero, absent drafts or active
status for invalid, incomplete or failed responses.

#### Scenario: Loading and failed overview reads

- **GIVEN** an authorized member opens a selected trip
- **WHEN** a required trip, readiness, plan, split or completion read is pending
- **THEN** the relevant information is shown as loading, not as actual values
- **WHEN** any required read fails or returns invalid or incomplete data
- **THEN** the affected information is shown as unavailable or in error
- **AND** the failure is not displayed as zero counts, an absent draft or an
  active trip

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
