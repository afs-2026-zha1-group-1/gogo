## MODIFIED Requirements

### Requirement: Role-specific journey milestones

The dashboard SHALL show setup, preferences, invitations, main plan and split
to organizers, and preferences, main plan and split to other members. Planning
milestone details and done/active/pending presentation SHALL derive from the
existing readiness, membership, main-plan and split data. Reunion and completion
SHALL NOT appear in the progress strip.

#### Scenario: Organizer and member milestones

- **GIVEN** the source reads are valid
- **WHEN** an organizer views the dashboard
- **THEN** the five organizer milestones appear in the specified order
- **WHEN** another member views it
- **THEN** the three member milestones appear in the specified order
- **AND** neither role sees reunion or completion in the progress strip

#### Scenario: Planning state changes

- **GIVEN** valid readiness, membership, plan and split data
- **WHEN** the dashboard renders the progress strip
- **THEN** it shows the viewer's readiness and ready/member count
- **AND** it distinguishes absent, draft, stale and confirmed main plans and absent, active, confirmed and cancelled splits
- **AND** organizers see invitation joining status and membership context
