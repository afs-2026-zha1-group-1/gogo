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
`NOT_ORGANIZER`; confirmed draft 409 `ALREADY_CONFIRMED`; no current draft 404
`NO_DRAFT`; unknown stop 404 `STOP_NOT_FOUND`. Every rejection SHALL
leave the draft unchanged. An accepted edit SHALL update the current draft in
place without creating a new version, without changing `inputRevisions`, and
without changing staleness, which remains driven by member preference
revisions and the trip-basics snapshot. Cross-stop feasibility (order, overlap, missing or overlong travel
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

### Requirement: Plan invalidation prompts

The edit page SHALL show a blocking confirmation dialog before saving when the
submitted form changes any planning basic and a main plan exists (an
unconfirmed draft or a confirmed plan). The dialog SHALL state that the existing
plan will expire and require regeneration or re-confirmation, and when a split
draft is active or confirmed, that the split must be cancelled first. Cancelling
the dialog SHALL send no request. The main-plan page SHALL show a blocking
dialog before confirming when the current draft is stale, explaining that trip
information or member preferences changed and offering regeneration; cancelling
SHALL send no confirmation request. The trip-detail confirmation shortcut SHALL
show the same stale guidance when the server returns 409 `STALE_DRAFT`. No
prompt SHALL itself confirm, regenerate or mutate any state.

#### Scenario: Saving a planning change warns about the existing draft

- **GIVEN** an unconfirmed draft exists and a member changes the destination on the edit page
- **WHEN** the member activates save
- **THEN** a blocking dialog explains that the draft will become stale and must be regenerated
- **AND** cancelling the dialog sends no PUT
- **AND** continuing sends exactly one PUT

#### Scenario: Saving a planning change warns about the confirmed plan

- **GIVEN** a confirmed main plan exists and a member changes a date on the edit page
- **WHEN** the member activates save and continues past the dialog
- **THEN** the PUT succeeds and the plan returns to the unconfirmed/needs-regeneration state

#### Scenario: A name-only save skips the plan dialog

- **WHEN** the organizer changes only the name and saves
- **THEN** no plan-invalidation dialog is shown

#### Scenario: A split lock is named in the save dialog

- **GIVEN** an active or confirmed split exists and a member changes a planning basic
- **THEN** the save dialog states that the split must be cancelled first
- **AND** continuing leads to the split-gate error with no trip change

#### Scenario: Confirming a stale draft prompts regeneration

- **GIVEN** the current draft is stale and the organizer is on the main-plan page
- **WHEN** the organizer activates confirm
- **THEN** a blocking dialog explains that the plan is outdated and must be regenerated
- **AND** no confirm request is sent
- **AND** cancelling closes the dialog without changes

#### Scenario: The detail shortcut shows the stale guidance

- **GIVEN** the current draft is stale and the organizer uses the trip-detail confirmation shortcut
- **THEN** the server returns 409 `STALE_DRAFT`
- **AND** the page shows the stale guidance with a way to the main-plan page
- **AND** no state changes

#### Scenario: A valid confirmation shows no stale prompt

- **GIVEN** the current draft is not stale
- **WHEN** the organizer confirms from the main-plan page
- **THEN** no stale dialog is shown and the confirmation proceeds

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

### Requirement: Draft review with computed staleness

The system SHALL let trip members read the current draft at
`GET /api/trips/{id}/main-plan`, responding 200 with the draft projection
(`tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions`,
ordered `stops` with times and travel legs). After confirmation the same read
SHALL return the confirmed version while it remains valid. `stale` SHALL be
computed on read, not stored, and applies to unconfirmed drafts only; the
confirmed version SHALL be frozen against preference revision changes. A
planning-basics edit (destination, start date, end date, start location or end
location) SHALL invalidate a confirmed plan by superseding its draft and
resetting the trip's confirmation state, after which the read SHALL return 404
`NO_DRAFT` until a new draft is generated.

For an unconfirmed draft, `stale` SHALL be true when any member's current
preference revision differs from the revision recorded at generation, or when
the trip's current planning basics differ from the snapshot recorded at
generation, or when the draft has no snapshot (a draft generated before this
change). The planning-basics snapshot SHALL cover destination, start date, end
date, start location and end location; a name-only change SHALL NOT make a
draft stale. A stale draft SHALL remain readable with its recorded version,
revisions and stops unchanged; regeneration SHALL create a new version.

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists and every input revision matches the member's current revision
- **WHEN** Ben (member, `X-User-Id: 2`) reads the main plan
- **THEN** the response status is 200 with `version`, `confirmed` false, `stale` false, `costPerPersonCents`, `inputRevisions` and the ordered `stops` with times and legs

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true (any member's current revision differing from the revision recorded at generation makes an unconfirmed draft stale)
- **AND** the draft version and its recorded `inputRevisions` are unchanged

#### Scenario: A destination change surfaces staleness

- **GIVEN** a draft was generated while the trip destination was `Singapore`
- **WHEN** a member changes the destination to `Bali` and then reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true
- **AND** the draft version, recorded `inputRevisions` and stops are unchanged

#### Scenario: A date or location change surfaces staleness

- **GIVEN** a draft was generated with the trip's dates and locations
- **WHEN** a member changes any start date, end date, start location or end location and then reads the main plan
- **THEN** the response status is 200 with `stale` true
- **AND** the draft content is unchanged

#### Scenario: A name-only change keeps the draft fresh

- **GIVEN** a draft was generated and its preference revisions still match
- **WHEN** the organizer renames the trip and a member reads the main plan
- **THEN** the response status is 200 with `stale` false

#### Scenario: A draft without a snapshot is stale

- **GIVEN** an unconfirmed draft was created before this change and carries no planning-basics snapshot (documented test-only setup)
- **WHEN** a member reads the main plan
- **THEN** the response status is 200 with `stale` true
- **AND** the draft cannot be confirmed until it is regenerated

#### Scenario: No draft yet

- **GIVEN** no draft has been generated for the trip
- **WHEN** a trip member reads the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`

#### Scenario: Confirmed plan read

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** a trip member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false
- **AND** the confirmed version is the existing draft marked confirmed, not a newly created version

#### Scenario: Confirmed plan stays frozen after a revision bump

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false (the confirmed version is frozen against preference revision changes; staleness applies to unconfirmed drafts only)

#### Scenario: A planning edit supersedes a confirmed plan

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** any member changes a planning basic through the trip update endpoint
- **THEN** the confirmed draft is superseded and the trip's confirmation state is reset
- **AND** a subsequent main-plan read returns 404 `NO_DRAFT`
- **AND** generating again creates a new version that can be confirmed

### Requirement: Validation-gated confirmation

The system SHALL allow only the organizer to confirm the current draft via
`POST /api/trips/{id}/main-plan/confirm`, responding 200 with the same
projection as the draft read, and only when schedule validation, hard-budget
validation and the staleness check all pass. On success the draft's version
SHALL become the shared confirmed plan, the trip SHALL be marked
main-plan-confirmed and joining SHALL be closed. A blocked confirmation SHALL
leave the plan unconfirmed and SHALL change no trip or split state.

The trip-detail shortcut `POST /api/trips/{id}/main-plan:confirm` SHALL be
available only to the organizer and SHALL delegate to this validated
confirmation; on success it SHALL return the updated trip projection. No other
endpoint or UI path SHALL set the confirmation state. A non-organizer SHALL
receive 403 `NOT_ORGANIZER`; no current draft SHALL receive 404 `NO_DRAFT`; an
unconfirmed stale draft SHALL receive 409 `STALE_DRAFT`; an already-confirmed
current plan SHALL receive 409 `ALREADY_CONFIRMED`; validation failures SHALL
keep the existing 422 `VALIDATION_FAILED`. Every rejection SHALL leave all state
unchanged.

After a planning-basics edit invalidates a confirmed plan, the next generation
SHALL create a new draft that can be confirmed by the organizer; no
`ALREADY_CONFIRMED` outcome SHALL apply because the previous confirmed draft is
superseded. Re-confirmation SHALL keep joining closed.

#### Scenario: C1 — valid draft confirmed, joining closed (US-037 AC1)

- **GIVEN** the current draft version 1 is not stale, its stops are time-ordered and non-overlapping with a travel leg between consecutive stops that fits the gap to the next stop (arriving exactly at the next start is allowed) and all stops within the trip day, and every member's hard budget is at least the cost per person (a null hard budget imposes no limit)
- **WHEN** the organizer confirms the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true, `stale` false and the same `stops` and `costPerPersonCents` as the draft read
- **AND** version 1 becomes the shared confirmed plan based on that draft's inputs and preferences
- **AND** the trip is marked main-plan-confirmed, so a subsequent invitation accept is rejected with 403 `JOINING_CLOSED` (REQ-004 J4 behavior)

#### Scenario: C2 — hard-budget overrun blocks (US-037 AC2)

- **GIVEN** the draft costs 50 SGD per person and Alice's hard budget is 40 SGD
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED`
- **AND** `overruns` carries Alice (`userId` 1) with `hardBudgetCents` 4000 and `overrunCents` 1000 (10 SGD)
- **AND** the plan stays unconfirmed

#### Scenario: C3 — schedule errors block

- **GIVEN** the current draft has overlapping stops, a missing travel leg, a travel leg longer than the gap to the next stop, or a stop outside the trip day
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED`
- **AND** `scheduleErrors` lists each specific error with its `type` (`OUT_OF_ORDER`, `OVERLAP`, `MISSING_LEG`, `TRAVEL_EXCEEDS_GAP` or `OUT_OF_DAY`) and the offending stop `seq`
- **AND** the plan stays unconfirmed
- **AND** for `TRAVEL_EXCEEDS_GAP` the offending stop is the one carrying the too-long leg: its end time plus `travelMinutesToNext` is later than the next stop's start time; equality passes (G1 C1 recommended default A, user-selected 2026-11-15; IO Emily ratified 2026-11-15 — the type extends the contractual error enumeration)

#### Scenario: C4 — stale draft blocks until regeneration

- **GIVEN** a member's preference revision or a planning basic changed after the draft was generated
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 409 and code `STALE_DRAFT`
- **AND** after regeneration the new draft can be confirmed

#### Scenario: The shortcut is organizer-only

- **WHEN** Ben, a member but not the organizer, calls the trip-detail confirmation shortcut for a valid draft
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** the trip confirmation state, the plan and the split state are unchanged

#### Scenario: The shortcut reports a missing draft

- **WHEN** the organizer calls the shortcut while no draft exists
- **THEN** the response status is 404 with `code` equal to `NO_DRAFT`
- **AND** no state changes

#### Scenario: The shortcut blocks a stale draft

- **WHEN** the organizer calls the shortcut while the current draft is stale
- **THEN** the response status is 409 with `code` equal to `STALE_DRAFT`
- **AND** the plan stays unconfirmed

#### Scenario: The shortcut confirms a valid draft

- **WHEN** the organizer calls the shortcut for a valid, non-stale draft
- **THEN** the response status is 200 with the updated trip projection
- **AND** `mainPlanConfirmed` is true and `joiningClosed` is true
- **AND** the draft becomes the shared confirmed plan

#### Scenario: Re-confirmation after invalidation succeeds

- **GIVEN** a confirmed plan was invalidated by a planning-basics edit, the confirmed draft was superseded and joining remains closed
- **WHEN** the organizer generates a new draft and confirms it
- **THEN** the response status is 200 with the new version confirmed
- **AND** `joiningClosed` remains true
- **AND** no `ALREADY_CONFIRMED` outcome is returned