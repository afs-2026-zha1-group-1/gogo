# Spec Delta

## ADDED Requirements

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
