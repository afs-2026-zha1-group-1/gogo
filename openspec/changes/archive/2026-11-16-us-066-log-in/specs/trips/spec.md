# Spec Delta

## MODIFIED Requirements

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
