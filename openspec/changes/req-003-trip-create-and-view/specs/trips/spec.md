# Spec Delta

## ADDED Requirements

### Requirement: Trip caller identity

The system SHALL identify the caller of every trip endpoint by the `X-User-Id`
request header, whose value SHALL be the integer id of a user known to the
system. The header is a scaffold-level stand-in for authentication: the system
SHALL NOT treat it as a verified credential, and issuing or verifying credentials
is out of scope.

#### Scenario: Caller identity is missing

- **WHEN** a request to a trip endpoint carries no `X-User-Id` header
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

#### Scenario: Caller identity is unknown

- **WHEN** a request carries an `X-User-Id` value that is not the id of a seeded user
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

### Requirement: Trip creation

The system SHALL expose `POST /api/trips`, persist name, destination, ISO
`YYYY-MM-DD` dates and optional locations, and atomically record the caller as
organizer and member. It SHALL reject blank name or destination, invalid dates
and inverted date ranges without writes. Unspecified locations SHALL normalize
to null; supplied nonblank locations SHALL be preserved. Location completion
belongs to later main-plan generation (US-031), not trip creation.

#### Scenario: Trip is created with the submitted details

- **WHEN** Alice (`X-User-Id: 1`) submits name `Singapore Friends Day`, destination
  `Singapore`, start date `2026-12-05`, end date `2026-12-05`, start location
  `City Hall MRT` and end location `Merlion Park`
- **THEN** the response status is 201
- **AND** the response carries the six submitted values and `organizerId` equal to 1
- **AND** a stored trip holds those six values
- **AND** the caller is recorded as a member of that trip

#### Scenario: Start date may equal the end date

- **WHEN** the submitted start date and end date are the same day
- **THEN** the trip is accepted exactly as in the previous scenario

#### Scenario: End date before start date is rejected

- **WHEN** the caller submits start date `2026-12-06` and end date `2026-12-05`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_DATE_RANGE`
- **AND** no trip is stored

#### Scenario: Blank name is rejected

- **WHEN** the caller submits a name that is empty or whitespace only
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `NAME_REQUIRED`
- **AND** no trip is stored

#### Scenario: Malformed date is rejected

- **WHEN** the caller submits a date that is not a valid `YYYY-MM-DD` value
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_DATE`
- **AND** no trip is stored

#### Scenario: Missing destination is rejected

- **WHEN** an otherwise valid create request omits `destination`, sends null,
  or sends an empty or whitespace-only destination
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `DESTINATION_REQUIRED`
- **AND** no trip or membership is stored

#### Scenario: Optional locations may be unspecified

- **WHEN** an otherwise valid create request omits either or both locations,
  or sends null, empty or whitespace-only locations
- **THEN** the response status is 201
- **AND** unspecified locations are stored and returned as null
- **AND** any supplied nonblank location is preserved
- **AND** a subsequent member read returns the same saved values

### Requirement: Trip detail read

The system SHALL expose `GET /api/trips/{id}` and SHALL return the saved trip to a
caller who is a member of that trip. It SHALL deny a caller who is not a member
without returning any trip value, and SHALL report an unknown trip id distinctly
from a denial.

#### Scenario: A member reads the saved trip

- **WHEN** Ben (`X-User-Id: 2`), a member, requests the details of
  `Singapore Friends Day`
- **THEN** the response status is 200
- **AND** the response carries name `Singapore Friends Day`, destination
  `Singapore`, start date `2026-12-05`, end date `2026-12-05`, start location
  `City Hall MRT` and end location `Merlion Park`

#### Scenario: A non-member is denied

- **WHEN** Eve (`X-User-Id: 5`), who is not a member, requests the same trip
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_A_MEMBER`
- **AND** the response body contains none of the trip's field values

#### Scenario: An unknown trip id is reported separately

- **WHEN** a member requests a trip id that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`
