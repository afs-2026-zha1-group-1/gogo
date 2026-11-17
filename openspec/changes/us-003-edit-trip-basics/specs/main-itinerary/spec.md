# Spec Delta

## ADDED Requirements

### Requirement: Main plan stop editing

The system SHALL expose `PUT /api/trips/{id}/main-plan/stops/{seq}` for the
trip organizer to edit one stop of the current, unconfirmed main-plan draft.
The request body SHALL carry `name`, `startTime` and `endTime`, and the
response SHALL be the same draft projection as the draft read. Only those
three fields SHALL be editable: the stop order (`seq`), its
`travelMinutesToNext` and its interest tags SHALL NOT change through this
operation, and any submitted value for them SHALL be ignored. The name SHALL
be non-blank (`400 NAME_REQUIRED`); each time SHALL be a parseable `HH:MM`
value (`400 INVALID_TIME`); the end time SHALL be later than the start time
(`400 INVALID_TIME_RANGE`). Guards SHALL apply in order: unknown trip 404
`TRIP_NOT_FOUND`; non-member 403 `NOT_A_MEMBER`; non-organizer 403
`NOT_ORGANIZER`; no draft 404 `NO_DRAFT`; confirmed draft 409
`ALREADY_CONFIRMED`; unknown stop 404 `STOP_NOT_FOUND`. Every rejection SHALL
leave the draft unchanged. An accepted edit SHALL update the current draft in
place without creating a new version, without changing `inputRevisions`, and
without changing staleness, which remains driven by member preference
revisions. Cross-stop feasibility (order, overlap, missing or overlong travel
legs, trip-day bounds) SHALL continue to be validated only at confirmation,
with the existing `scheduleErrors` types. Regeneration SHALL keep superseding
the whole current draft, including manual edits. A stop edit SHALL be applied
only while the draft is still unconfirmed, so a confirmation racing the edit
still yields 409 `ALREADY_CONFIRMED` with no partial write.

#### Scenario: Organizer edits a stop before confirmation

- **WHEN** the organizer submits a non-blank name and valid start/end times for an existing stop of the current unconfirmed draft
- **THEN** the response status is 200 with the same draft projection showing the edited `name`, `startTime` and `endTime`
- **AND** a subsequent draft read by any member returns the edited values
- **AND** the draft `version` and `inputRevisions` are unchanged

#### Scenario: Order, travel time and tags cannot be edited

- **WHEN** the organizer submits `seq`, `travelMinutesToNext` or interest-tag values in the body
- **THEN** the response is 200 and those values remain exactly as before
- **AND** the stop keeps its position and travel leg

#### Scenario: Repeating the same values is idempotent

- **WHEN** the organizer submits the stop's currently saved values
- **THEN** the response status is 200 with the same projection
- **AND** the stored stop is unchanged

#### Scenario: Blank name is rejected without write

- **WHEN** the organizer submits an empty or whitespace-only name
- **THEN** the response status is 400 with `code` equal to `NAME_REQUIRED`
- **AND** the stored stop is unchanged

#### Scenario: Malformed time is rejected without write

- **WHEN** the organizer submits a time that is not parseable as `HH:MM`
- **THEN** the response status is 400 with `code` equal to `INVALID_TIME`
- **AND** the stored stop is unchanged

#### Scenario: End not after start is rejected without write

- **WHEN** the organizer submits an end time equal to or earlier than the start time
- **THEN** the response status is 400 with `code` equal to `INVALID_TIME_RANGE`
- **AND** the stored stop is unchanged

#### Scenario: Unknown stop is reported separately

- **WHEN** the organizer targets a `seq` that does not exist in the current draft
- **THEN** the response status is 404 with `code` equal to `STOP_NOT_FOUND`
- **AND** the draft is unchanged

#### Scenario: No draft yet

- **WHEN** the organizer edits a stop before any draft exists
- **THEN** the response status is 404 with `code` equal to `NO_DRAFT`

#### Scenario: A confirmed draft rejects editing even its organizer

- **WHEN** the organizer edits a stop of the confirmed plan
- **THEN** the response status is 409 with `code` equal to `ALREADY_CONFIRMED`
- **AND** the confirmed stop values are unchanged

#### Scenario: Confirmation racing the edit still locks

- **WHEN** the draft becomes confirmed after the guard read but before the write is applied (documented test-only setup)
- **THEN** the conditional write applies no row and the response is 409 `ALREADY_CONFIRMED`
- **AND** no partial field write is stored

#### Scenario: A non-organizer member is denied

- **WHEN** Ben, a member but not the organizer, submits a valid stop edit
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** the draft is unchanged

#### Scenario: A non-member is denied

- **WHEN** Eve, who is not a member, submits a stop edit
- **THEN** the response status is 403 with `code` equal to `NOT_A_MEMBER`
- **AND** the response contains no draft values

#### Scenario: An unknown trip is reported separately

- **WHEN** an authenticated caller edits a stop of a trip id that does not exist
- **THEN** the response status is 404 with `code` equal to `TRIP_NOT_FOUND`

#### Scenario: An unauthenticated request is rejected

- **WHEN** a stop edit request carries no authenticated session
- **THEN** the response status is 401 with `code` equal to `USER_REQUIRED`
- **AND** nothing is written

#### Scenario: Edited times remain subject to confirmation validation

- **WHEN** the organizer edits stop times so that consecutive stops overlap and then confirms the main plan
- **THEN** the edit itself was accepted with 200
- **AND** the confirmation is rejected with 422 `VALIDATION_FAILED` and `scheduleErrors` naming the offending stop `seq` (existing `OVERLAP` / `TRAVEL_EXCEEDS_GAP` semantics)
- **AND** the plan stays unconfirmed

#### Scenario: Regeneration discards manual edits

- **WHEN** the organizer edits a stop and then regenerates the main plan
- **THEN** the new draft version carries the provider's stop values, not the manual edit
- **AND** the previous draft version is superseded as before (G5 semantics unchanged)

## MODIFIED Requirements

### Requirement: Authorization and identity for main-plan operations

Main-plan generation, confirmation and stop editing SHALL require the trip
organizer's identity; draft review and generation-inputs read SHALL require
trip membership. Requests SHALL be rejected with the established error codes:
missing or unknown identity 401 `USER_REQUIRED`, unknown trip 404
`TRIP_NOT_FOUND`, non-member 403 `NOT_A_MEMBER`, non-organizer member on writes
403 `NOT_ORGANIZER`. Only the `code` field is contractual; message wording is
free.

#### Scenario: G4/C5 — non-organizer member writes

- **GIVEN** Ben is a trip member but not the organizer
- **WHEN** Ben (member, non-organizer, authenticated as Ben) generates or confirms the main plan, or edits a draft stop
- **THEN** the request is rejected with 403 with code `NOT_ORGANIZER`
- **AND** no draft, stop or confirmation state changes

#### Scenario: Non-member access

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, authenticated as Eve) generates, confirms, edits a stop of, or reads the main plan
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