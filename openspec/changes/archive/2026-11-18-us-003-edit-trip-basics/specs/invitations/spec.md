# Spec Delta

## MODIFIED Requirements

### Requirement: Invitation preview

The system SHALL expose `GET /api/invitations/{token}` without requiring caller
identity. For a known token it SHALL return the trip name, destination, start
date, end date, whether the trip's main plan is currently confirmed and whether
joining is closed. Joining SHALL close when the main plan is first confirmed
and SHALL remain closed after later planning-basics edits that reset the plan
to unconfirmed; `joiningClosed` SHALL therefore be reported separately from
`mainPlanConfirmed`. The preview SHALL NOT return member, itinerary or
preference data. For an unknown token it SHALL return the unusable-invitation
outcome defined by the Unusable invitation requirement.

#### Scenario: Preview shows the public basics before acceptance

- **WHEN** a valid token for `Singapore Friends Day` is previewed while the main plan is unconfirmed and joining is open
- **THEN** the response status is 200
- **AND** the response carries `tripName` equal to `Singapore Friends Day`, `destination` equal to `Singapore`, `startDate` equal to `2026-12-05`, `endDate` equal to `2026-12-05`, `mainPlanConfirmed` equal to false and `joiningClosed` equal to false
- **AND** the response carries no member, itinerary or preference field

#### Scenario: Preview after confirmation reports joining closed

- **WHEN** the same token is previewed after the trip's main plan is confirmed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is true and `joiningClosed` is true
- **AND** the response still carries only the public basics

#### Scenario: Preview after a planning edit keeps joining closed

- **GIVEN** the main plan was confirmed, then a planning-basics edit reset it to unconfirmed
- **WHEN** the same token is previewed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is false
- **AND** `joiningClosed` is true
- **AND** the public basics show the edited name, destination and dates

### Requirement: Invitation acceptance and joining

The system SHALL expose `POST /api/invitations/{token}/accept` under the trip
caller-identity contract, with the caller derived from the authenticated
session. Acceptance SHALL record the caller as a member exactly once and SHALL
report the joined state on repeats without a second membership. While
`joiningClosed` is true, acceptance by a non-member SHALL be rejected with the
member list unchanged; `joiningClosed` becomes true when the main plan is first
confirmed and remains true after later planning-basics edits. An unknown token
SHALL return the unusable-invitation outcome. A request without a valid session
SHALL return 401 `USER_REQUIRED` and create no membership.

#### Scenario: An invited outsider joins once

- **WHEN** Eve, authenticated and not a member, accepts a valid invitation to `Singapore Friends Day` while the main plan is unconfirmed and joining is open
- **THEN** the response status is 200 and reports joined
- **AND** a membership of Eve in that trip is stored
- **AND** `GET /api/trips/{id}` for that trip returns 200 for Eve's session

#### Scenario: Double acceptance yields exactly one membership

- **WHEN** Eve submits acceptance twice under the same authenticated account
- **THEN** both responses report joined
- **AND** exactly one membership of Eve in that trip is stored

#### Scenario: An existing member accepts again with joining open or closed

- **WHEN** Ben, already a member and authenticated, accepts the invitation before or after main-plan confirmation
- **THEN** the response status is 200 and reports joined with an already-member indication
- **AND** no additional membership row is created

#### Scenario: Acceptance after main-plan confirmation is rejected

- **WHEN** the trip's main plan is confirmed and Eve, authenticated and not a member, accepts an otherwise valid invitation
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `JOINING_CLOSED`
- **AND** the stored member list is unchanged

#### Scenario: Acceptance stays closed after a planning edit

- **GIVEN** the main plan was confirmed, then a planning-basics edit reset it to unconfirmed and `joiningClosed` remained true
- **WHEN** Eve, authenticated and not a member, accepts the invitation
- **THEN** the response status is 403 with `code` equal to `JOINING_CLOSED`
- **AND** the stored member list is unchanged

#### Scenario: Caller identity is missing or unknown

- **WHEN** an acceptance request carries no valid session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created

#### Scenario: Identity errors take precedence over an invalid token

- **WHEN** an acceptance request has no valid session and a token that refers to no invitation
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no membership is created
