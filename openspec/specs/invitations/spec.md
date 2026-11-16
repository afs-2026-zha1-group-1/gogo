# invitations Specification

## Purpose
Let a trip organizer share one invitation link (and a QR encoding the same URL)
so invited travelers can preview the trip's public basics and join once under
their identity, while joining closes at main-plan confirmation and unknown links
fail closed without exposing private trip data.

## Requirements

### Requirement: Invitation issuance

The system SHALL expose `POST /api/trips/{id}/invitation` under the trip
caller-identity contract, with the caller derived from the authenticated session.
It SHALL hold at most one invitation per trip, created by the organizer's first
call with an opaque token and returned unchanged to later organizer calls. The
response SHALL carry the token and the join path. A non-organizer SHALL be denied
with no invitation created. A request without a valid session SHALL return 401
`USER_REQUIRED` and create nothing.

#### Scenario: Organizer obtains an invitation

- **WHEN** Alice, authenticated as the organizer of `Singapore Friends Day` whose
  main plan is unconfirmed, requests an invitation for that trip
- **THEN** the response status is 200
- **AND** the response carries a `token` and a `joinPath` of the form
  `/join/<token>`
- **AND** exactly one invitation is stored for that trip

#### Scenario: Repeated issuance returns the same invitation

- **WHEN** the authenticated organizer requests an invitation for the same trip
  again
- **THEN** the response status is 200 with the same `token`
- **AND** still exactly one invitation is stored for that trip

#### Scenario: A member who is not the organizer is denied

- **WHEN** Ben, authenticated as a member but not the organizer, requests an
  invitation for the trip
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_ORGANIZER`
- **AND** no invitation is created

#### Scenario: Caller identity is missing or unknown

- **WHEN** an issuance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no invitation is created

#### Scenario: An unknown trip id is reported

- **WHEN** the authenticated organizer requests an invitation for a trip id that
  does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`

### Requirement: Invitation preview

The system SHALL expose `GET /api/invitations/{token}` without requiring caller
identity. For a known token it SHALL return the trip name, destination, start
date, end date and whether the trip's main plan is confirmed. It SHALL NOT return
member, itinerary or preference data. For an unknown token it SHALL return the
unusable-invitation outcome defined by the Unusable invitation requirement.

#### Scenario: Preview shows the public basics before acceptance

- **WHEN** a valid token for `Singapore Friends Day` is previewed while the main
  plan is unconfirmed
- **THEN** the response status is 200
- **AND** the response carries `tripName` equal to `Singapore Friends Day`,
  `destination` equal to `Singapore`, `startDate` equal to `2026-12-05`,
  `endDate` equal to `2026-12-05` and `mainPlanConfirmed` equal to false
- **AND** the response carries no member, itinerary or preference field

#### Scenario: Preview after confirmation reports joining closed

- **WHEN** the same token is previewed after the trip's main plan is confirmed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is true
- **AND** the response still carries only the public basics

### Requirement: Invitation acceptance and joining

The system SHALL expose `POST /api/invitations/{token}/accept` under the trip
caller-identity contract, with the caller derived from the authenticated session.
Acceptance SHALL record the caller as a member exactly once and SHALL report the
joined state on repeats without a second membership. While the trip's main plan
is confirmed, acceptance by a non-member SHALL be rejected with the member list
unchanged. An unknown token SHALL return the unusable-invitation outcome. A
request without a valid session SHALL return 401 `USER_REQUIRED` and create no
membership.

#### Scenario: An invited outsider joins once

- **WHEN** Eve, authenticated and not a member, accepts a valid invitation to
  `Singapore Friends Day` while the main plan is unconfirmed
- **THEN** the response status is 200 and reports joined
- **AND** a membership of Eve in that trip is stored
- **AND** `GET /api/trips/{id}` for that trip returns 200 for Eve's session

#### Scenario: Double acceptance yields exactly one membership

- **WHEN** Eve submits acceptance twice under the same authenticated account
- **THEN** both responses report joined
- **AND** exactly one membership of Eve in that trip is stored

#### Scenario: An existing member accepts again with joining open or closed

- **WHEN** Ben, already a member and authenticated, accepts the invitation
  before or after main-plan confirmation
- **THEN** the response status is 200 and reports joined with an already-member
  indication
- **AND** no additional membership row is created

#### Scenario: Acceptance after main-plan confirmation is rejected

- **WHEN** the trip's main plan is confirmed and Eve, authenticated and not a
  member, accepts an otherwise valid invitation
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `JOINING_CLOSED`
- **AND** the stored member list is unchanged

#### Scenario: Caller identity is missing or unknown

- **WHEN** an acceptance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created

#### Scenario: Identity errors take precedence over an invalid token

- **WHEN** an acceptance request has no valid session and a token that refers to
  no invitation
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created

### Requirement: Unusable invitation

For an unknown token, preview and acceptance SHALL return 404 with `code` equal
to `INVITATION_NOT_FOUND`, no trip values and no membership created or revealed.
The outcome SHALL NOT distinguish why the token is unusable. Acceptance SHALL
validate caller identity first; this 404 applies only to a known caller. Preview
SHALL remain identity-free.

#### Scenario: Previewing an invalid invitation exposes nothing

- **WHEN** a token that refers to no invitation is previewed
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `INVITATION_NOT_FOUND`
- **AND** the response body contains none of the trip's field values

#### Scenario: Accepting an invalid invitation creates nothing

- **WHEN** Eve, authenticated, accepts a token that refers to no invitation
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `INVITATION_NOT_FOUND`
- **AND** no membership is created

#### Scenario: An unauthenticated acceptance is rejected before the token is read

- **WHEN** an acceptance request for an unknown token carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no invitation outcome or membership is revealed
