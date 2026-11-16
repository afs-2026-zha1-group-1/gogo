# Spec Delta

## ADDED Requirements

### Requirement: Trip main-plan confirmation state

The system SHALL hold a boolean main-plan-confirmed state for every trip,
defaulting to unconfirmed when the trip is created. This change SHALL NOT expose
any endpoint or user interface that sets the state; the confirmation flow belongs
to the future main-plan confirmation story (US-037). The invitation flow SHALL
read this state to decide whether joining is open.

#### Scenario: A created trip starts unconfirmed

- **WHEN** a trip is created through the trip creation requirement
- **THEN** its main-plan state is unconfirmed
- **AND** an invitation preview for that trip reports joining open

#### Scenario: The confirmed state is readable by the invitation preview

- **WHEN** the trip's main-plan state is confirmed (set only by documented
  test-only database setup in this change)
- **THEN** an invitation preview for that trip reports `mainPlanConfirmed` true
- **AND** acceptance by a non-member is rejected with `code` equal to
  `JOINING_CLOSED`

#### Scenario: No confirmation operation is exposed by this change

- **WHEN** the trip and invitation API surface of this change is exercised
- **THEN** no endpoint accepts a main-plan confirmation operation
- **AND** the state can change only through the future US-037 flow or the
  documented test-only setup