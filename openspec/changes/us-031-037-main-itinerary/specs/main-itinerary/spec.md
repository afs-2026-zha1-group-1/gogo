# Spec Delta

## Purpose

Lets a trip organizer generate a timed main-plan draft from ready members'
preferences and confirm it into one shared, validated itinerary version,
closing joining so the group follows a single feasible plan.

## ADDED Requirements

### Requirement: Readiness-gated main plan generation

The system SHALL allow only the trip organizer to generate a main-plan draft,
and only when every trip member is ready at a recorded preference revision.
Generation SHALL persist a draft version with ordered stops, activity times,
travel legs between consecutive stops, the input preference revisions, and a
per-person cost. The draft SHALL NOT be auto-confirmed. Regeneration SHALL
create a new draft version and supersede the previous current draft.

#### Scenario: G1 — all members ready, draft generated (US-031 AC1)

- **GIVEN** the four members are ready at preference revision 1 and the plan provider supplies the four fixture stops
- **WHEN** the organizer (Alice, `X-User-Id: 1`) generates the main plan
- **THEN** draft version 1 is saved with the four stops in supplied order, their activity times, travel legs 30/30/15 minutes, input revisions {1:1, 2:1, 3:1, 4:1}, and cost 5000 cents per person
- **AND** the trip is not main-plan-confirmed

#### Scenario: G2 — pending member blocks generation (US-031 AC2)

- **GIVEN** Daniel (id 4) is not ready
- **WHEN** the organizer generates the main plan
- **THEN** the request is rejected with 409 and code `MEMBERS_NOT_READY`
- **AND** the response identifies Daniel as requiring a response
- **AND** no draft is persisted

#### Scenario: G5 — regeneration creates a new version

- **GIVEN** a current draft version 1 exists
- **WHEN** the organizer generates the main plan again
- **THEN** draft version 2 becomes the current draft and version 1 is superseded

### Requirement: Location completion at generation

When the trip's start or end location is empty at generation time, the system
SHALL complete it from member preferences first, with a random fallback when
preferences yield nothing. Supplied nonblank locations SHALL be preserved
unchanged. Completion SHALL happen only during generation (signed 2026-11-14
ruling).

#### Scenario: G3 — null locations completed

- **GIVEN** the trip has null start and end locations
- **WHEN** the organizer generates the main plan
- **THEN** both locations are completed (preferences first, random fallback)

#### Scenario: G3 — supplied locations preserved

- **GIVEN** the trip has nonblank start and end locations
- **WHEN** the organizer generates the main plan
- **THEN** both locations are preserved unchanged

### Requirement: Draft review with computed staleness

The system SHALL let trip members read the current draft as an ordered
timeline with per-stop times and travel legs, per-person cost, version, and a
computed `stale` flag. A draft SHALL be stale when any member's current
preference revision differs from the revision recorded at generation.
Staleness SHALL be computed on read, not stored.

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists
- **WHEN** a trip member reads the main plan
- **THEN** the response contains the ordered stops with times and legs, cost per person, the draft version, and `stale = false` when all input revisions match current revisions

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the draft is surfaced with `stale = true`

#### Scenario: No draft yet

- **GIVEN** no draft has been generated for the trip
- **WHEN** a trip member reads the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`

### Requirement: Validation-gated confirmation

The system SHALL allow only the organizer to confirm the current draft, and
only when schedule validation, hard-budget validation, and the staleness check
all pass. On success the draft's version SHALL become the shared confirmed
plan and joining SHALL be closed. A blocked confirmation SHALL leave the plan
unconfirmed.

#### Scenario: C1 — valid draft confirmed, joining closed (US-037 AC1)

- **GIVEN** the current draft version 1 is not stale, its stops are time-ordered and non-overlapping with a travel leg between consecutive stops and all stops within the trip day, and every member's hard budget is at least the cost per person (a null hard budget imposes no limit)
- **WHEN** the organizer confirms the main plan
- **THEN** version 1 becomes the shared confirmed plan based on that draft's inputs and preferences
- **AND** the trip is marked main-plan-confirmed, so a subsequent invitation accept is rejected with 403 `JOINING_CLOSED` (REQ-004 J4 behavior)

#### Scenario: C2 — hard-budget overrun blocks (US-037 AC2)

- **GIVEN** the draft costs 50 SGD per person and Alice's hard budget is 40 SGD
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED`
- **AND** the response shows Alice's overrun of 10 SGD (1000 cents)
- **AND** the plan stays unconfirmed

#### Scenario: C3 — schedule errors block

- **GIVEN** the current draft has overlapping stops, a missing travel leg, or a stop outside the trip day
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED` listing the specific schedule errors
- **AND** the plan stays unconfirmed

#### Scenario: C4 — stale draft blocks until regeneration

- **GIVEN** a member's preference revision changed after the draft was generated
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 409 and code `STALE_DRAFT`
- **AND** after regeneration the new draft can be confirmed

### Requirement: Confirmation boundaries

The system SHALL reject confirmation when no draft exists and SHALL reject
re-confirmation of an already-confirmed plan without changing any state.

#### Scenario: V6 — confirm before any generation

- **GIVEN** no draft has been generated for the trip
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`
- **AND** nothing changes

#### Scenario: V7 — re-confirm an already-confirmed plan

- **GIVEN** the main plan is already confirmed
- **WHEN** the organizer confirms the main plan again
- **THEN** the request is rejected with 409 and code `ALREADY_CONFIRMED`
- **AND** no state changes

### Requirement: Authorization and identity for main-plan operations

Main-plan generation and confirmation SHALL require the trip organizer's
identity; draft review SHALL require trip membership. Requests SHALL be
rejected with the established error codes: missing identity 401
`USER_REQUIRED`, unknown trip 404 `TRIP_NOT_FOUND`, non-member 403
`NOT_A_MEMBER`, non-organizer member on writes 403 `NOT_ORGANIZER`. Only the
`code` field is contractual; message wording is free.

#### Scenario: G4/C5 — non-organizer member writes

- **WHEN** Ben (member, non-organizer, `X-User-Id: 2`) generates or confirms the main plan
- **THEN** the request is rejected with 403 and code `NOT_ORGANIZER`
- **AND** no draft or confirmation state changes

#### Scenario: Non-member access

- **WHEN** Eve (non-member, `X-User-Id: 5`) generates, confirms, or reads the main plan
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

#### Scenario: Missing identity

- **WHEN** a main-plan request arrives without `X-User-Id`
- **THEN** the request is rejected with 401 and code `USER_REQUIRED`

#### Scenario: Unknown trip

- **WHEN** a main-plan request targets a trip that does not exist
- **THEN** the request is rejected with 404 and code `TRIP_NOT_FOUND`