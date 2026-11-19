## MODIFIED Requirements

### Requirement: Role-specific journey milestones

The dashboard SHALL show setup, preferences, invitations, main plan and split
to organizers, and preferences, invitations, main plan and split to other members. Planning
milestone details and done/active/pending presentation SHALL derive from the
existing readiness, membership, main-plan and split data. Reunion and completion
SHALL NOT appear in the progress strip.

#### Scenario: Organizer and member milestones

- **GIVEN** the source reads are valid
- **WHEN** an organizer views the dashboard
- **THEN** the five organizer milestones appear in the specified order
- **WHEN** another member views it
- **THEN** the four member milestones appear in the specified order
- **AND** neither role sees reunion or completion in the progress strip

#### Scenario: Planning state changes

- **GIVEN** valid readiness, membership, plan and split data
- **WHEN** the dashboard renders the progress strip
- **THEN** it shows the viewer's readiness and ready/member count
- **AND** it distinguishes absent, draft, stale and confirmed main plans and absent, active, confirmed and cancelled splits
- **AND** organizers and other members see invitation joining status and membership context

#### Scenario: Ready members can still invite before generation

- **GIVEN** the viewer's preferences are ready, joining is open and there is no main-plan draft
- **WHEN** an organizer or another member views the dashboard
- **THEN** invitations remain active and both `生成主线方案` and `邀请朋友` are available
- **AND** the recommended next step is to generate the main plan

#### Scenario: Generated plan and closed joining

- **GIVEN** a main-plan draft exists
- **WHEN** an organizer or another member views the dashboard
- **THEN** the invitation milestone is done
- **AND** joining status reflects the trip's actual joining-closed state, even if a confirmation was subsequently cancelled

## ADDED Requirements

### Requirement: Dashboard create-trip quick entry

The dashboard SHALL show a create-trip quick entry in its upper-left position
and navigate to the same create-trip page used by My Trips.

#### Scenario: Create a trip from the dashboard

- **WHEN** a member selects the create-trip quick entry
- **THEN** the app navigates to `#/create`
- **AND** the existing create-trip page is displayed
