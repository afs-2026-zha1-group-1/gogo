# Spec Delta

## MODIFIED Requirements

### Requirement: Authorization and identity for main-plan operations

Main-plan generation and confirmation SHALL require the trip organizer's
identity; draft review and generation-inputs read SHALL require trip
membership. Requests SHALL be rejected with the established error codes:
missing or unknown identity 401 `USER_REQUIRED`, unknown trip 404
`TRIP_NOT_FOUND`, non-member 403 `NOT_A_MEMBER`, non-organizer member on writes
403 `NOT_ORGANIZER`. Only the `code` field is contractual; message wording is
free.

#### Scenario: G4/C5 — non-organizer member writes

- **GIVEN** Ben is a trip member but not the organizer
- **WHEN** Ben (member, non-organizer, authenticated as Ben) generates or confirms the main plan
- **THEN** the request is rejected with 403 and code `NOT_ORGANIZER`
- **AND** no draft or confirmation state changes

#### Scenario: Non-member access

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, authenticated as Eve) generates, confirms, or reads the main plan
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

#### Scenario: Missing or unknown identity

- **GIVEN** the fixture trip exists
- **WHEN** a main-plan request arrives without `authenticated session` or with an id that is
  not a seeded user
- **THEN** the request is rejected with 401 and code `USER_REQUIRED`

#### Scenario: Unknown trip

- **GIVEN** the caller is a seeded user
- **WHEN** a main-plan request targets a trip that does not exist
- **THEN** the request is rejected with 404 and code `TRIP_NOT_FOUND`
