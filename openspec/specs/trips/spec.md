# trips Specification

## Purpose

Let an identified caller create one shared trip with its name, destination,
valid dates and optional start/end locations, let members read the same saved
details and the member roster, and carry the trip's main-plan confirmation state
that decides whether invitation joining is still open.
## Requirements
### Requirement: Trip caller identity

The system SHALL identify the caller of every trip endpoint by the authenticated
session principal established through `POST /api/auth/login`. The principal's
account id SHALL be the caller identity. The legacy `X-User-Id` header SHALL NOT
authenticate any trip request. A request without a valid session, or with an
expired session, SHALL return 401 with `code` equal to `USER_REQUIRED` and SHALL
NOT return trip data. Authentication SHALL prove identity only; membership and
organizer rules SHALL remain exactly as before this change.

#### Scenario: Caller identity is missing

- **WHEN** a trip endpoint receives no authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

#### Scenario: Caller identity is unknown

- **WHEN** a trip endpoint receives an expired or unknown session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

#### Scenario: The legacy header alone is ignored

- **WHEN** a trip endpoint receives an `X-User-Id` header but no valid session
- **THEN** the response is 401 with `code` equal to `USER_REQUIRED`
- **AND** the header does not grant access

#### Scenario: A valid session supplies the caller identity

- **WHEN** Alice is authenticated and creates a trip
- **THEN** the trip records Alice's account id as organizer and member
- **AND** the authenticated Ben can read the trip while the authenticated Eve is
  denied with 403 `NOT_A_MEMBER`

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

### Requirement: Trip member list read

The system SHALL expose read-only `GET /api/trips/{id}/members` to an
authenticated member, identified by the US-066 session principal rather than
the retired `X-User-Id` header. The roster SHALL list each member once with
`userId`, `displayName` and `organizer`, ordered by ascending `userId`; only
the organizer is flagged. Non-members SHALL be denied without member identity,
unknown trips reported separately, and no readiness, preference, budget or
main-plan value exposed.

#### Scenario: A member reads the roster

- **WHEN** Ben, authenticated as user 2, requests the member list of
  `Singapore Friends Day`
- **THEN** the response status is 200
- **AND** `tripId` is the requested trip's id
- **AND** the roster contains exactly Alice (1), Ben (2), Chloe (3) and
  Daniel (4), each exactly once, in ascending `userId` order
- **AND** every row carries `userId` and `displayName`

#### Scenario: The organizer is identified

- **WHEN** an authenticated member reads the roster of `Singapore Friends Day`
- **THEN** Alice's row has `organizer` equal to true
- **AND** every other row has `organizer` equal to false
- **AND** the organizer row is included in the roster like any other member

#### Scenario: A non-member is denied

- **WHEN** Eve, authenticated as user 5, who is not a member, requests the
  member list of the same trip
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_A_MEMBER`
- **AND** the body contains no `userId`, `displayName` or organizer value

#### Scenario: Caller identity is missing

- **WHEN** a request for the member list carries no authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no member data is returned

#### Scenario: The retired identity header does not authenticate

- **WHEN** a request for the member list carries only an `X-User-Id` header
  (blank, non-numeric or a seeded id) without an authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no member data is returned

#### Scenario: An unknown trip id is reported separately

- **WHEN** an authenticated member or non-member requests the member list of a
  trip id that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`
- **AND** no member data is returned

#### Scenario: A joined member appears exactly once

- **WHEN** Eve is recorded as a member through the invitation flow or the
  documented test-only membership setup and then reads the member list
- **THEN** the response status is 200
- **AND** Eve appears exactly once in the roster
- **AND** Alice is still the only row with `organizer` equal to true
- **AND** repeated acceptance by the same user does not duplicate the row

#### Scenario: Personal preference data is not exposed

- **WHEN** a member reads the roster
- **THEN** no readiness, preference, budget or main-plan field or value is
  present in the response
- **AND** the endpoint performs no write

