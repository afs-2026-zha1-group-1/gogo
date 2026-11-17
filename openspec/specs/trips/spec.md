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

### Requirement: Trip detail main-plan navigation entry

The trip detail page at `#/trips/<id>` SHALL display a navigation entry to the
trip's main-plan view, positioned after the invitation section and before the
split-planning section. The entry SHALL be visible to every authenticated trip
member regardless of whether a main plan exists or has been confirmed. Activating
the entry SHALL navigate to `#/trips/<id>/main-plan` without triggering any
server-side mutation (no POST, PUT or DELETE). The main-plan page itself SHALL
handle all six states (loading, ready, empty, denied, missing, failed) unchanged;
this requirement adds no new state, API endpoint or permission rule.

#### Scenario: Member sees the entry on trip detail

- **WHEN** an authenticated member opens `#/trips/1` for a trip they belong to
- **THEN** the page renders a section titled "主线方案" between the "邀请朋友"
  section and the "分队规划" section
- **AND** the section contains a visible "查看主线方案" navigation control

#### Scenario: Member activates the entry and reaches the plan

- **WHEN** a member activates "查看主线方案" on the trip detail page for trip 1
- **THEN** the route changes to `#/trips/1/main-plan` without a full page reload
- **AND** the main-plan page loads and displays its current state (ready with
  timeline, empty with guidance, or error) using existing logic
- **AND** no POST, PUT or DELETE request is issued by the navigation itself

#### Scenario: Entry visible when no plan exists

- **WHEN** a member opens trip detail for a trip that has no main-plan draft
- **THEN** the "查看主线方案" entry is still visible and clickable
- **AND** activating it shows the existing empty state on the main-plan page

#### Scenario: Non-member or unsigned-in user cannot reach the plan

- **WHEN** a user who is not a member of trip 1 navigates directly to
  `#/trips/1/main-plan`
- **THEN** the main-plan page shows the existing denied state with no plan data
- **WHEN** an unsigned-in user attempts to reach `#/trips/1/main-plan`
- **THEN** the existing login guard redirects to the login page

#### Scenario: Return to trip detail after viewing

- **WHEN** a member arrives at the main-plan page from trip detail and then
  activates the trip-detail info button in the main-plan appbar
- **THEN** the route returns to `#/trips/1` (the same trip's detail page)
- **AND** the trip detail page re-renders in its ready state with the main-plan
  entry still visible

### Requirement: Trip list read

An authenticated caller SHALL read the trips they belong to as one list. The response SHALL be a `{trips:[...]}` envelope; each row SHALL carry `id`, `name`, `destination`, `startDate`, `endDate`, `organizer` and `mainPlanConfirmed`. Only trips where the caller has a membership row SHALL appear, each exactly once.

#### Scenario: A member reads their own trips

- **WHEN** Alice, authenticated as the account that created "Singapore Friends Day" and joined "Bali Weekend", requests the trip list
- **THEN** the response status is 200
- **AND** the envelope holds exactly those two trips, each once
- **AND** no trip Alice does not belong to appears, and none of its fields are returned

#### Scenario: Ordering is deterministic

- **WHEN** the caller belongs to several trips, including two that start on the same date
- **THEN** unfinished trips appear first by ascending `startDate`
- **AND** rows sharing a `startDate` appear by ascending `id`

#### Scenario: Ended trips sort last

- **WHEN** the caller belongs to both finished and unfinished trips
- **THEN** every trip whose `endDate` is before today appears after all unfinished trips
- **AND** ended trips keep ascending `startDate` then `id` among themselves

#### Scenario: The organizer flag identifies the creator

- **WHEN** Alice reads the list containing one trip she created and one she joined
- **THEN** `organizer` is true for the created trip
- **AND** `organizer` is false for the joined trip
- **AND** the flag states the caller's own relation only and grants no permission: the member roster keeps reporting each member's own `organizer` flag

#### Scenario: An account without trips reads an empty list

- **WHEN** an authenticated account with no membership rows requests the trip list
- **THEN** the response status is 200
- **AND** the envelope holds an empty `trips` array
- **AND** no trip data is invented

#### Scenario: A confirmed main plan stays listed

- **WHEN** one of the caller's trips has `mainPlanConfirmed` true
- **THEN** the trip still appears in the list with `mainPlanConfirmed` true
- **AND** the field is a read-only projection: it filters nothing out and changes no other row value

#### Scenario: A finished end date changes no behaviour

- **WHEN** one of the caller's trips has an `endDate` before today
- **THEN** it is still returned with the same fields and no server-side finished status
- **AND** invitation joining, main-plan generation and confirmation, and splits behave exactly as they do for a trip that has not ended

#### Scenario: An unauthenticated request is rejected

- **WHEN** a request for the trip list carries no authenticated session
- **THEN** the response status is 401 with code `USER_REQUIRED`

#### Scenario: The retired identity header does not authenticate

- **WHEN** a request for the trip list carries only an `X-User-Id` header, including a valid seeded id, without an authenticated session
- **THEN** the response status is 401 with code `USER_REQUIRED`

#### Scenario: The list is read-only

- **WHEN** the trip list path is exercised
- **THEN** only a read endpoint is added
- **AND** creating a trip keeps using the existing create operation and no other write verb is introduced

### Requirement: Current trip selection

Each account SHALL have at most one current trip, stored server-side. `GET /api/trips/current` SHALL return `{tripId}` with the stored id, or `null` when unset or when the stored trip is no longer one the caller belongs to. `PUT /api/trips/current` with `{tripId}` SHALL persist the selection only when the caller is a member of that trip, and SHALL return the stored id. The selection SHALL survive reload and re-login and SHALL be scoped to the calling account.

#### Scenario: Reading the current trip returns the stored selection

- **WHEN** Alice, who previously selected trip 2, requests the current trip
- **THEN** the response status is 200 with `{"tripId":2}`

#### Scenario: No selection returns null

- **WHEN** an account that never selected a trip requests the current trip
- **THEN** the response status is 200 with `{"tripId":null}`

#### Scenario: Selecting a member trip persists it

- **WHEN** Alice sends `{"tripId":2}` for a trip she belongs to
- **THEN** the response status is 200 with `{"tripId":2}`
- **AND** a later read, including after re-login, returns the same id

#### Scenario: Selecting a non-member trip is denied

- **WHEN** Eve sends `{"tripId":1}` for a trip she does not belong to
- **THEN** the response status is 403 with code `NOT_A_MEMBER`
- **AND** Eve's stored selection is unchanged

#### Scenario: Selecting an unknown trip is reported

- **WHEN** an authenticated caller sends `{"tripId":999999}`
- **THEN** the response status is 404 with code `TRIP_NOT_FOUND`
- **AND** the stored selection is unchanged

#### Scenario: Unauthenticated selection is rejected

- **WHEN** a request to read or write the current trip carries no authenticated session
- **THEN** the response status is 401 with code `USER_REQUIRED`

#### Scenario: Selection is scoped to the account

- **WHEN** Alice selects trip 2 and Eve reads her current trip
- **THEN** Eve's read returns her own selection or `null`, never Alice's

#### Scenario: A stale selection reads as no selection

- **WHEN** the stored trip is no longer one the caller belongs to (test-only membership removal)
- **THEN** the read returns `{"tripId":null}`
- **AND** no trip data of the removed membership is exposed
