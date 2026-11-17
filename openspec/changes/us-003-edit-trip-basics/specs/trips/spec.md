# Spec Delta

## ADDED Requirements

### Requirement: Trip basic info update

The system SHALL expose `PUT /api/trips/{id}` for the trip organizer to update
the six basic fields — name, destination, ISO `YYYY-MM-DD` start/end dates and
optional start/end locations — as one full-form overwrite, using the same
validation as trip creation. The caller SHALL be identified by the
authenticated session principal; the legacy `X-User-Id` header SHALL NOT
authenticate the request. Guards SHALL apply in order: an unknown trip SHALL
return 404 `TRIP_NOT_FOUND`; a non-member SHALL return 403 `NOT_A_MEMBER`; a
member who is not the organizer SHALL return 403 `NOT_ORGANIZER`; a trip whose
main plan is confirmed SHALL return 409 `MAIN_PLAN_CONFIRMED`. Every rejection
SHALL leave all stored trip values unchanged. Field validation SHALL reuse the
creation codes: blank name 400 `NAME_REQUIRED`, blank destination 400
`DESTINATION_REQUIRED`, malformed date 400 `INVALID_DATE`, inverted range 400
`INVALID_DATE_RANGE`. Blank, whitespace-only or omitted locations SHALL
normalize to null so a previously set location can be cleared; name and
destination SHALL remain required. The write SHALL be a single conditional
update that only applies while the trip is unconfirmed, so a confirmation
landing between the guard read and the write still yields 409
`MAIN_PLAN_CONFIRMED` with no partial write. A successful update SHALL return
200 with the full trip projection, and subsequent detail, trip-list and
invitation-preview reads SHALL reflect the saved values. The endpoint SHALL NOT
change `organizerId` or the main-plan confirmation state, and SHALL NOT alter
create, read, list, current-trip, member-roster or confirmation semantics.

#### Scenario: Organizer updates before confirmation

- **WHEN** Alice, the organizer of an unconfirmed trip, submits a valid full form changing the name to `海边周末游` with new destination, dates and locations
- **THEN** the response status is 200
- **AND** the response carries the six submitted values with unchanged `organizerId` and `mainPlanConfirmed` false
- **AND** a subsequent `GET /api/trips/{id}` by any member returns the saved new values

#### Scenario: The new name reaches list and invitation preview

- **WHEN** the organizer renames an unconfirmed trip and a member then reads the trip list and an invitation preview for that trip
- **THEN** both reads show the new name
- **AND** no read returns the previous name

#### Scenario: Start date may equal end date on update

- **WHEN** the organizer submits start and end dates on the same day
- **THEN** the update is accepted exactly as in the previous scenario

#### Scenario: Inverted date range is rejected without write

- **WHEN** the organizer submits an end date before the start date
- **THEN** the response status is 400 with `code` equal to `INVALID_DATE_RANGE`
- **AND** every stored trip value is unchanged

#### Scenario: Blank name is rejected without write

- **WHEN** the organizer submits an empty or whitespace-only name
- **THEN** the response status is 400 with `code` equal to `NAME_REQUIRED`
- **AND** every stored trip value is unchanged

#### Scenario: Blank destination is rejected without write

- **WHEN** the organizer submits an empty or whitespace-only destination
- **THEN** the response status is 400 with `code` equal to `DESTINATION_REQUIRED`
- **AND** every stored trip value is unchanged

#### Scenario: Malformed date is rejected without write

- **WHEN** the organizer submits a date that is not a valid `YYYY-MM-DD` value
- **THEN** the response status is 400 with `code` equal to `INVALID_DATE`
- **AND** every stored trip value is unchanged

#### Scenario: Locations can be cleared back to unset

- **WHEN** the organizer submits blank, whitespace-only or omitted start/end locations for a trip that previously had both set
- **THEN** the response status is 200
- **AND** both locations are stored and returned as null
- **AND** a supplied nonblank location is preserved

#### Scenario: A non-organizer member is denied

- **WHEN** Ben, a member but not the organizer, submits a valid update for the unconfirmed trip
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** every stored trip value is unchanged

#### Scenario: A non-member is denied

- **WHEN** Eve, who is not a member, submits an update for the trip
- **THEN** the response status is 403 with `code` equal to `NOT_A_MEMBER`
- **AND** the response contains none of the trip's field values

#### Scenario: An unknown trip id is reported separately

- **WHEN** an authenticated caller submits an update for a trip id that does not exist
- **THEN** the response status is 404 with `code` equal to `TRIP_NOT_FOUND`

#### Scenario: A confirmed trip rejects even its organizer

- **WHEN** Alice submits a valid update for her trip whose main plan is confirmed
- **THEN** the response status is 409 with `code` equal to `MAIN_PLAN_CONFIRMED`
- **AND** every stored trip value is unchanged

#### Scenario: Confirmation racing the write still locks

- **WHEN** the trip becomes confirmed after the guard read but before the update is applied (documented test-only setup)
- **THEN** the conditional write applies no row and the response is 409 `MAIN_PLAN_CONFIRMED`
- **AND** no partial field write is stored

#### Scenario: Update cannot change organizer or confirmation state

- **WHEN** the organizer submits any accepted update
- **THEN** `organizerId` and `mainPlanConfirmed` are exactly as before the update
- **AND** no request field can select another organizer or set the confirmation state

#### Scenario: Repeating the same values is idempotent

- **WHEN** the organizer submits the currently saved values unchanged
- **THEN** the response status is 200 with the same projection
- **AND** stored values are unchanged

#### Scenario: An unauthenticated request is rejected

- **WHEN** an update request carries no authenticated session
- **THEN** the response status is 401 with `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned or written

#### Scenario: The retired identity header does not authenticate

- **WHEN** an update request carries only an `X-User-Id` header, including a valid seeded organizer id, without an authenticated session
- **THEN** the response status is 401 with `code` equal to `USER_REQUIRED`
- **AND** the header grants no write access

### Requirement: Trip detail edit entry

The trip detail page at `#/trips/<id>` SHALL display an edit entry in the
行程信息 section only when the authenticated caller is the trip organizer and
the trip's main plan is unconfirmed. Activating the entry SHALL navigate to
`#/trips/<id>/edit` without triggering any server-side mutation. The edit page
SHALL prefill the saved trip values, SHALL apply the same date validation as
the create page, and SHALL submit the full form through `PUT /api/trips/{id}`.
On success the page SHALL return to `#/trips/<id>` showing the saved values; on
failure it SHALL show the server error and keep the entered values. A member
who is not the organizer, or any member of a confirmed trip, SHALL NOT see the
entry; reaching `#/trips/<id>/edit` directly in those cases SHALL show a
role-appropriate refusal message with a way back to the trip detail and SHALL
NOT submit an update. The edit page SHALL require authentication through the
existing login guard. The backend guards remain authoritative regardless of
what the UI renders.

#### Scenario: Organizer sees the entry before confirmation

- **WHEN** Alice, the organizer, opens `#/trips/<id>` for her unconfirmed trip
- **THEN** the 行程信息 section shows a visible edit control
- **AND** activating it routes to `#/trips/<id>/edit` without any POST, PUT or DELETE

#### Scenario: Non-organizer member sees no entry

- **WHEN** Ben, a member but not the organizer, opens the same trip detail
- **THEN** no edit control is rendered
- **AND** the trip information remains readable as before

#### Scenario: Confirmed trip shows no entry

- **WHEN** any member opens the detail of a trip whose main plan is confirmed
- **THEN** no edit control is rendered
- **AND** the saved information is displayed unchanged

#### Scenario: Edit page prefills the saved values

- **WHEN** the organizer opens `#/trips/<id>/edit`
- **THEN** the form shows the trip's saved name, destination, dates and locations
- **AND** no mutation request is issued by opening the page

#### Scenario: Saving returns to the detail with new values

- **WHEN** the organizer changes the name and saves successfully
- **THEN** the route returns to `#/trips/<id>`
- **AND** the detail shows the new name
- **AND** opening `#/my-trips` afterwards lists the trip under the new name

#### Scenario: Invalid dates block submission

- **WHEN** the organizer sets an end date before the start date on the edit page
- **THEN** a validation error is shown and no update request is sent

#### Scenario: Direct edit hash by a non-organizer is refused

- **WHEN** Ben navigates directly to `#/trips/<id>/edit`
- **THEN** the page shows a message that only the organizer may edit, with a way back to the trip detail
- **AND** no update request is sent

#### Scenario: Direct edit hash of a confirmed trip is refused

- **WHEN** the organizer navigates directly to `#/trips/<id>/edit` for a confirmed trip
- **THEN** the page shows a message that the confirmed trip's information is locked, with a way back to the trip detail
- **AND** no update request is sent

#### Scenario: A failed save keeps the entered values

- **WHEN** the organizer submits an update and the server rejects it (for example the trip was just confirmed)
- **THEN** the edit page shows the server error message
- **AND** the entered form values are kept for correction or leaving

#### Scenario: Signed-out deep link goes to login

- **WHEN** a signed-out visitor opens `#/trips/<id>/edit`
- **THEN** the existing login guard opens the login page without trip data