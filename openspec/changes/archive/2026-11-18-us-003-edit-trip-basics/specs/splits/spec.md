# Spec Delta

## ADDED Requirements

### Requirement: Confirmed split cancellation

The system SHALL expose `POST /api/trips/{tripId}/split:cancel` with
`{draftVersion}` for the trip organizer to cancel a `confirmed` split before
departure. The endpoint SHALL use the shared splits identity guards and the
`{data,error}` envelope: a missing session SHALL return 401 `MEMBER_REQUIRED`, an
unknown trip 404 `TRIP_NOT_FOUND`, a non-member 403 `NOT_A_MEMBER`, and a
non-organizer 403 `NOT_SPLIT_ORGANIZER`. A draft whose status is not `confirmed`
SHALL return 409 `SPLIT_DRAFT_NOT_ACTIVE`, a mismatched `draftVersion` SHALL
return 409 `STALE_DRAFT_VERSION`, and a split whose scheduled departure start is
at or before the server time SHALL return 409 `SPLIT_ALREADY_DEPARTED`. The
departure instant SHALL be the confirmed draft's departure stop `start_at`; when
that value is absent the split SHALL be treated as not departed in this MVP. On
success the draft status SHALL become `cancelled`, the `split-a` and `split-b`
`plan_node` rows SHALL be deleted and `document.routes` cleared in one
transaction, while the `main` plan rows, the trip's confirmed main plan, the
trip basics, memberships and the `joiningClosed` state SHALL remain unchanged. A
replacement split SHALL be startable afterwards through the existing split-draft
start operation. Every rejection SHALL leave the draft, routes and main plan
unchanged.

#### Scenario: The organizer cancels a confirmed split before departure

- **GIVEN** a split at version 3 is `confirmed`, its departure stop starts in the future and Alice is the trip organizer
- **WHEN** Alice submits `{draftVersion: 3}` to `POST /api/trips/{tripId}/split:cancel`
- **THEN** the response status is 200 with `data.status = cancelled`
- **AND** the `split-a` and `split-b` `plan_node` rows are deleted and `document.routes` is empty
- **AND** the `main` plan nodes and the trip's confirmed main plan are unchanged
- **AND** Alice can start a replacement split with a fresh `draftVersion = 1`

#### Scenario: A non-organizer member cannot cancel a confirmed split

- **WHEN** Ben, a member but not the organizer, submits the cancellation for a confirmed split
- **THEN** the response status is 403 with `error.code = NOT_SPLIT_ORGANIZER`
- **AND** the split, routes and main plan are unchanged

#### Scenario: A non-member cannot cancel a confirmed split

- **WHEN** Eve, who is not a member, submits the cancellation
- **THEN** the response status is 403 with `error.code = NOT_A_MEMBER`
- **AND** no split data changes

#### Scenario: Cancellation after departure is rejected

- **GIVEN** the confirmed split's departure stop start is at or before the server time
- **WHEN** the organizer submits the cancellation
- **THEN** the response status is 409 with `error.code = SPLIT_ALREADY_DEPARTED`
- **AND** the split, routes and main plan are unchanged

#### Scenario: Only a confirmed split can use this endpoint

- **WHEN** the organizer submits the cancellation for an `active` or `cancelled` draft
- **THEN** the response status is 409 with `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** no state changes

#### Scenario: A stale draft version is rejected

- **WHEN** the organizer submits a `draftVersion` that does not match the confirmed draft
- **THEN** the response status is 409 with `error.code = STALE_DRAFT_VERSION`
- **AND** the confirmed draft remains active

#### Scenario: Missing departure time is treated as not departed

- **GIVEN** the confirmed draft's departure stop has no `start_at` value (documented test-only setup)
- **WHEN** the organizer submits the cancellation
- **THEN** the response status is 200 with `data.status = cancelled`

#### Scenario: The main plan and joining state are preserved

- **WHEN** a confirmed split is cancelled successfully
- **THEN** the trip remains main-plan-confirmed and `joiningClosed` remains true
- **AND** the trip basics and membership rows are unchanged
- **AND** the main plan remains readable as the confirmed plan
