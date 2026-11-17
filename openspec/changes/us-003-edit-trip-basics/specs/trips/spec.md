# Spec Delta

## ADDED Requirements

### Requirement: Trip basic info update

The system SHALL expose `PUT /api/trips/{id}` as one full-form overwrite of the
six basic fields — name, destination, ISO `YYYY-MM-DD` start/end dates and
optional start/end locations — using the same validation as trip creation. The
caller SHALL be identified by the authenticated session principal; the legacy
`X-User-Id` header SHALL NOT authenticate the request. Any trip member SHALL be
allowed to change the planning basics — destination, start date, end date,
start location and end location — while the name SHALL remain organizer-only. A
submitted name that differs from the saved name by a non-organizer SHALL be
rejected with 403 `NOT_ORGANIZER`; an unchanged name submitted alongside
planning changes SHALL NOT require organizer status. Guards SHALL apply in
order: an unknown trip SHALL return 404 `TRIP_NOT_FOUND`; a non-member SHALL
return 403 `NOT_A_MEMBER`; a non-organizer changing the name SHALL return 403
`NOT_ORGANIZER`; a planning-basics change while an `active` split draft exists
SHALL return 409 `SPLIT_DRAFT_ACTIVE`; a planning-basics change while a
`confirmed` split exists SHALL return 409 `SPLIT_CONFIRMED`; field validation
SHALL reuse the creation codes: blank name 400 `NAME_REQUIRED`, blank
destination 400 `DESTINATION_REQUIRED`, malformed date 400 `INVALID_DATE`,
inverted range 400 `INVALID_DATE_RANGE`. Every rejection SHALL leave all stored
trip values, the main plan and the split state unchanged.

Changing any planning basic SHALL invalidate the trip's main-plan state: when
the trip's main plan was confirmed, the update SHALL reset
`mainPlanConfirmed` to false, keep `joiningClosed` true, and supersede the
confirmed main-plan draft so a new draft must be generated and confirmed. When
an unconfirmed draft exists, it SHALL remain readable but SHALL be reported
stale by the main-plan read (the trip-basics snapshot no longer matches). A
name-only change SHALL NOT alter the main plan, the draft or `joiningClosed`.
The update SHALL NOT change `organizerId`, SHALL NOT set the confirmation state
directly, SHALL NOT write plan stops, and SHALL NOT alter membership, invitation
acceptance or split semantics.

Blank, whitespace-only or omitted locations SHALL normalize to null so a
previously set location can be cleared; name and destination SHALL remain
required. The write SHALL be one transactional update guarded against a
concurrent split confirmation; when the guard loses, the response SHALL be 409
`SPLIT_DRAFT_ACTIVE` or `SPLIT_CONFIRMED` with no partial write. A successful
update SHALL return 200 with the full trip projection including `joiningClosed`,
and subsequent detail, trip-list and invitation-preview reads SHALL reflect the
saved values. Repeating the saved values SHALL be idempotent and SHALL NOT
invalidate the plan.

#### Scenario: An organizer updates all six fields before confirmation

- **WHEN** Alice, the organizer of an unconfirmed trip, submits a valid full form changing the name to `海边周末游`, the destination, the dates and both locations
- **THEN** the response status is 200
- **AND** the response carries the six submitted values with unchanged `organizerId`, `mainPlanConfirmed` false and `joiningClosed` false
- **AND** a subsequent `GET /api/trips/{id}` by any member returns the saved values

#### Scenario: Any member updates the planning basics before confirmation

- **WHEN** Ben, a member but not the organizer, submits a valid form that changes the destination, dates and locations while keeping the saved name
- **THEN** the response status is 200
- **AND** the planning values are saved
- **AND** the name and `organizerId` are unchanged

#### Scenario: A non-organizer cannot change the name

- **WHEN** Ben submits a form whose name differs from the saved name
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** no trip value, plan state or split state changes

#### Scenario: A name-only organizer edit keeps the plan confirmed

- **WHEN** Alice renames a trip whose main plan is confirmed and changes no planning basic
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` remains true and `joiningClosed` remains true
- **AND** the confirmed main-plan draft and its stops are unchanged

#### Scenario: A planning edit after confirmation resets the plan

- **WHEN** Ben changes the destination or dates of a trip whose main plan is confirmed
- **THEN** the response status is 200
- **AND** `mainPlanConfirmed` is false and `joiningClosed` remains true
- **AND** the previously confirmed main-plan draft is superseded
- **AND** a main-plan read returns 404 `NO_DRAFT` until a new draft is generated

#### Scenario: A planning edit while a draft exists marks the draft stale

- **WHEN** a member changes a planning basic while an unconfirmed main-plan draft exists
- **THEN** the response status is 200
- **AND** the draft remains the current draft
- **AND** a main-plan read reports `stale` true with the draft version and recorded input revisions unchanged

#### Scenario: A name-only edit leaves an unconfirmed draft fresh

- **WHEN** Alice renames a trip with an unconfirmed draft and changes no planning basic
- **THEN** the response status is 200
- **AND** the main-plan read still reports `stale` false

#### Scenario: An active split draft blocks planning edits

- **WHEN** a member changes a planning basic while a split draft is `active`
- **THEN** the response status is 409 with `code` equal to `SPLIT_DRAFT_ACTIVE`
- **AND** the trip, main plan and split draft are unchanged

#### Scenario: A confirmed split blocks planning edits

- **WHEN** a member changes a planning basic while a split is `confirmed`
- **THEN** the response status is 409 with `code` equal to `SPLIT_CONFIRMED`
- **AND** the trip, main plan and confirmed split are unchanged

#### Scenario: The split gate does not block a name-only organizer edit

- **WHEN** Alice changes only the name while a split draft is active or confirmed
- **THEN** the response status is 200
- **AND** the split state and the main plan are unchanged

#### Scenario: Concurrent split confirmation loses the edit

- **WHEN** a split is confirmed after the edit's split guard read but before the trip write is applied (documented test-only setup)
- **THEN** the conditional write applies no row and the response is 409 `SPLIT_CONFIRMED`
- **AND** no trip, plan or split value is partially written

#### Scenario: Start date may equal end date on update

- **WHEN** a member submits start and end dates on the same day
- **THEN** the update is accepted

#### Scenario: Inverted date range is rejected without write

- **WHEN** a member submits an end date before the start date
- **THEN** the response status is 400 with `code` equal to `INVALID_DATE_RANGE`
- **AND** every stored trip value, the plan state and the split state are unchanged

#### Scenario: Blank name is rejected without write

- **WHEN** a member submits an empty or whitespace-only name
- **THEN** the response status is 400 with `code` equal to `NAME_REQUIRED`
- **AND** no value changes

#### Scenario: Blank destination is rejected without write

- **WHEN** a member submits an empty or whitespace-only destination
- **THEN** the response status is 400 with `code` equal to `DESTINATION_REQUIRED`
- **AND** no value changes

#### Scenario: Malformed date is rejected without write

- **WHEN** a member submits a date that is not a valid `YYYY-MM-DD` value
- **THEN** the response status is 400 with `code` equal to `INVALID_DATE`
- **AND** no value changes

#### Scenario: Locations can be cleared back to unset

- **WHEN** a member submits blank, whitespace-only or omitted start/end locations for a trip that previously had both set
- **THEN** the response status is 200
- **AND** both locations are stored and returned as null
- **AND** a supplied nonblank location is preserved

#### Scenario: A non-member is denied

- **WHEN** Eve, who is not a member, submits an update for the trip
- **THEN** the response status is 403 with `code` equal to `NOT_A_MEMBER`
- **AND** the response contains none of the trip's field values

#### Scenario: An unknown trip id is reported separately

- **WHEN** an authenticated caller submits an update for a trip id that does not exist
- **THEN** the response status is 404 with `code` equal to `TRIP_NOT_FOUND`

#### Scenario: Update cannot change organizer or confirmation state

- **WHEN** any accepted update is submitted
- **THEN** `organizerId` is exactly as before the update
- **AND** no request field can select another organizer or set the confirmation state directly
- **AND** the only confirmation-state change is the planning-edit invalidation described above

#### Scenario: Repeating the same values is idempotent

- **WHEN** a member submits the currently saved values unchanged
- **THEN** the response status is 200 with the same projection
- **AND** stored values and the plan state are unchanged

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
行程信息 section to every trip member, including when the main plan is
confirmed. Activating the entry SHALL navigate to `#/trips/<id>/edit` without
triggering any server-side mutation. The edit page SHALL prefill the saved trip
values, SHALL apply the same date validation as the create page, and SHALL
submit the full form through `PUT /api/trips/{id}`. The name field SHALL be
editable only by the organizer and SHALL be read-only for other members; the
planning fields SHALL be editable by every member. Before saving a form that
changes any planning basic and while a main plan exists, the page SHALL show a
blocking confirmation dialog stating that the existing plan will expire and
require regeneration (or, for a confirmed plan, re-confirmation), and when a
split draft is active or confirmed, that the split must be cancelled first;
cancelling the dialog SHALL send no request. On success the page SHALL return to
`#/trips/<id>` showing the saved values and the edit entry SHALL remain
available for further edits. On failure the page SHALL show the server error and
keep the entered values, including the split-gate guidance. Reaching
`#/trips/<id>/edit` directly as a non-member SHALL show the existing denial,
and reaching it while a split draft is `active` or `confirmed` SHALL show a
refusal with a way to the split screen and SHALL NOT submit an update. The edit
page SHALL require authentication through the existing login guard. The backend
guards remain authoritative regardless of what the UI renders.

#### Scenario: Every member sees the entry before confirmation

- **WHEN** Alice the organizer or Ben a non-organizer member opens `#/trips/<id>` for an unconfirmed trip
- **THEN** the 行程信息 section shows a visible edit control
- **AND** activating it routes to `#/trips/<id>/edit` without any POST, PUT or DELETE

#### Scenario: The entry remains after confirmation

- **WHEN** any member opens the detail of a trip whose main plan is confirmed
- **THEN** the edit control is still rendered
- **AND** the confirmed information is displayed unchanged until a save

#### Scenario: The edit page prefills the saved values

- **WHEN** a member opens `#/trips/<id>/edit`
- **THEN** the form shows the trip's saved name, destination, dates and locations
- **AND** no mutation request is issued by opening the page

#### Scenario: A non-organizer sees the name read-only

- **WHEN** Ben opens the edit page
- **THEN** the name field is read-only or hidden and cannot be changed
- **AND** the planning fields are editable

#### Scenario: Saving returns to the detail and keeps the entry

- **WHEN** a member changes a planning value and saves successfully
- **THEN** the route returns to `#/trips/<id>`
- **AND** the detail shows the new values
- **AND** the edit entry is still available while the trip remains editable

#### Scenario: The save dialog explains plan invalidation

- **WHEN** a member changes a planning basic while a main plan exists
- **THEN** a blocking dialog states that the plan will expire and require regeneration or re-confirmation
- **AND** cancelling the dialog sends no request
- **AND** continuing sends the update once

#### Scenario: A name-only save shows no plan dialog

- **WHEN** the organizer changes only the name
- **THEN** no plan-invalidation dialog is shown

#### Scenario: An active or confirmed split blocks the save

- **WHEN** a member saves a planning change while a split draft is active or confirmed
- **THEN** the page shows the split-gate error and a way to the split screen
- **AND** the entered form values are kept
- **AND** no trip or split value changes

#### Scenario: Invalid dates block submission

- **WHEN** a member sets an end date before the start date on the edit page
- **THEN** a validation error is shown and no update request is sent

#### Scenario: A failed save keeps the entered values

- **WHEN** the server rejects the update
- **THEN** the edit page shows the server error message
- **AND** the entered form values are kept for correction or leaving

#### Scenario: A non-member deep link is denied

- **WHEN** Eve, who is not a member, opens `#/trips/<id>/edit`
- **THEN** the existing denial state is shown with no trip values
- **AND** no update request is sent

#### Scenario: Signed-out deep link goes to login

- **WHEN** a signed-out visitor opens `#/trips/<id>/edit`
- **THEN** the existing login guard opens the login page without trip data
