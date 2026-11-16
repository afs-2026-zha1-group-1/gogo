# Spec Delta

## Purpose

Lets a trip organizer generate a timed main-plan draft from ready members'
preferences and confirm it into one shared, validated itinerary version,
closing joining so the group follows a single feasible plan.

## ADDED Requirements

### Requirement: Readiness-gated main plan generation

The system SHALL allow only the trip organizer to generate a main-plan draft
via `POST /api/trips/{id}/main-plan`, responding 201 with the draft projection,
and only when every trip member is ready at a recorded preference revision.
Generation SHALL persist a new draft version (ordered stops, times, travel
legs, input revisions, per-person cost) without auto-confirming; regeneration
SHALL supersede the previous current draft. Generation SHALL be rejected once
a confirmed version exists (G6).

#### Scenario: G1 — all members ready, draft generated (US-031 AC1)

- **GIVEN** the four members are ready at preference revision 1 and the plan provider supplies the four fixture stops
- **WHEN** the organizer (Alice, `X-User-Id: 1`) generates the main plan
- **THEN** the response status is 201 and draft version 1 is saved as the current draft
- **AND** the body carries `version` 1, `confirmed` false, `stale` false, `costPerPersonCents` 5000 and `inputRevisions` pairing userIds 1–4 with revision 1
- **AND** `stops` lists the four fixture stops in supplied order with `seq`, `name`, `startTime`, `endTime` and `travelMinutesToNext` 30/30/15 (null on the last stop)
- **AND** the trip is not main-plan-confirmed

#### Scenario: G2 — pending member blocks generation (US-031 AC2)

- **GIVEN** Daniel (id 4) is not ready
- **WHEN** the organizer generates the main plan
- **THEN** the request is rejected with 409 and code `MEMBERS_NOT_READY`
- **AND** `pendingMembers` identifies Daniel (`userId` 4, `displayName` Daniel) as requiring a response
- **AND** no draft is persisted

#### Scenario: G5 — regeneration creates a new version

- **GIVEN** a current draft version 1 exists
- **WHEN** the organizer generates the main plan again
- **THEN** the response status is 201 with `version` 2 as the current draft
- **AND** version 1 is superseded and is no longer returned by the draft read

#### Scenario: G6 — generation after confirmation rejected

- **GIVEN** the main plan is already confirmed at version 1
- **WHEN** the organizer generates the main plan again
- **THEN** the request is rejected with 409 and code `ALREADY_CONFIRMED`
- **AND** no new draft is persisted and the confirmed version is unchanged
  (explicitly accepted in user product review 2026-11-15; Emily IO approval
  recorded separately; replanning deferred to R2 — the versioned draft schema
  reserves the seam)

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

The system SHALL let trip members read the current draft at
`GET /api/trips/{id}/main-plan`, responding 200 with the draft projection
(`tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions`,
ordered `stops` with times and travel legs). After confirmation the same read
SHALL return the confirmed version. `stale` SHALL be computed on read, not
stored, and applies to unconfirmed drafts only; the confirmed version SHALL be
frozen (P2 lint ruling 2026-11-15).

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists and every input revision matches the member's current revision
- **WHEN** Ben (member, `X-User-Id: 2`) reads the main plan
- **THEN** the response status is 200 with `version`, `confirmed` false, `stale` false, `costPerPersonCents`, `inputRevisions` and the ordered `stops` with times and legs

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true (any member's current revision differing from the revision recorded at generation makes an unconfirmed draft stale)
- **AND** the draft version and its recorded `inputRevisions` are unchanged

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
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false (the confirmed version is frozen: `stale` is always false for it regardless of later revision changes; staleness applies to unconfirmed drafts only)

### Requirement: Generation inputs read projection

The system SHALL let trip members read a generation-inputs summary at
`GET /api/trips/{id}/main-plan/inputs`, responding 200 with `tripId`, `readyCount`,
`memberCount`, `members` (`userId`, `displayName`, `ready`,
`preferenceRevision`), `commonInterests`, `mustDo`, per-member `budgets` (null
`hardBudgetCents` = no limit) and the `rules` list.
The summary SHALL be readable before any draft exists (P2 ruling 2026-11-15:
member-readable; resolves F6).

#### Scenario: I1 — member reads inputs summary (Screen 9)

- **GIVEN** the four members are ready at revision 1 with seeded preferences and no hard budgets
- **WHEN** Ben (member, `X-User-Id: 2`) reads the generation inputs
- **THEN** the response status is 200 with `readyCount` 4, `memberCount` 4 and `members` naming Alice, Ben, Chloe and Daniel as ready at revision 1
- **AND** `commonInterests` and `mustDo` carry the seeded preference summary, every `budgets` line has `hardBudgetCents` null (no limit), and `rules` lists the generation rule identifiers

#### Scenario: I2 — inputs readable before any draft

- **GIVEN** no draft has been generated for the trip
- **WHEN** the organizer reads the generation inputs
- **THEN** the request succeeds with the summary (no `NO_DRAFT` error)

#### Scenario: I3 — non-member denied inputs

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, `X-User-Id: 5`) reads the generation inputs
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

### Requirement: Validation-gated confirmation

The system SHALL allow only the organizer to confirm the current draft via
`POST /api/trips/{id}/main-plan/confirm`, responding 200 with the same
projection as the draft read, and only when schedule validation, hard-budget
validation and the staleness check all pass. On success the draft's version
SHALL become the shared confirmed plan and joining SHALL be closed. A blocked
confirmation SHALL leave the plan unconfirmed.

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

- **GIVEN** a member's preference revision changed after the draft was generated
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 409 and code `STALE_DRAFT`
- **AND** after regeneration the new draft can be confirmed

### Requirement: Confirmation boundaries

The system SHALL reject confirmation when no draft exists and SHALL reject
re-confirmation of an already-confirmed plan without changing any state.
`ALREADY_CONFIRMED` also covers generation after confirmation (G6; behavior
accepted by user 2026-11-15; Emily IO approval recorded, overall G1 Pass).

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
identity; draft review and generation-inputs read SHALL require trip
membership. Requests SHALL be rejected with the established error codes:
missing or unknown identity 401 `USER_REQUIRED`, unknown trip 404
`TRIP_NOT_FOUND`, non-member 403 `NOT_A_MEMBER`, non-organizer member on writes
403 `NOT_ORGANIZER`. Only the `code` field is contractual; message wording is
free.

#### Scenario: G4/C5 — non-organizer member writes

- **GIVEN** Ben is a trip member but not the organizer
- **WHEN** Ben (member, non-organizer, `X-User-Id: 2`) generates or confirms the main plan
- **THEN** the request is rejected with 403 and code `NOT_ORGANIZER`
- **AND** no draft or confirmation state changes

#### Scenario: Non-member access

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, `X-User-Id: 5`) generates, confirms, or reads the main plan
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

#### Scenario: Missing or unknown identity

- **GIVEN** the fixture trip exists
- **WHEN** a main-plan request arrives without `X-User-Id` or with an id that is
  not a seeded user
- **THEN** the request is rejected with 401 and code `USER_REQUIRED`

#### Scenario: Unknown trip

- **GIVEN** the caller is a seeded user
- **WHEN** a main-plan request targets a trip that does not exist
- **THEN** the request is rejected with 404 and code `TRIP_NOT_FOUND`