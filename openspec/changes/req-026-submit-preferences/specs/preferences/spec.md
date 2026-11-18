# Spec Delta

## ADDED Requirements

### Requirement: Submit member preference readiness

The system SHALL expose `PUT /api/trips/{tripId}/preferences/submission` accepting `{"noPreference": true|false}` to record the caller's submission as ready. A `false` submission with no content in interests, must-dos or budget is rejected `400 PREFERENCE_EMPTY`. `submittedAt` is generated server-side; unknown keys are ignored; the row is overwritten idempotently.

#### Scenario: A member marks ready with content

- **GIVEN** Alice has saved at least one interest for the trip
- **WHEN** Alice submits `{"noPreference": false}`
- **THEN** the response status is 200
- **AND** the body is `{"status":"ready","noPreference":false,"submittedAt":"<ISO-8601>"}`
- **AND** `member_preference` holds one row for `(trip, user, kind='submission')`

#### Scenario: No preference marks ready without content

- **GIVEN** Alice has saved nothing
- **WHEN** Alice submits `{"noPreference": true}`
- **THEN** the response status is 200 with `noPreference:true`
- **AND** the stored payload carries `status:"ready"` and `noPreference:true`

#### Scenario: An empty submission is rejected

- **GIVEN** Alice has no interest, no must-do, no budget content
- **WHEN** Alice submits `{"noPreference": false}`
- **THEN** the response status is 400 with `code` equal to `PREFERENCE_EMPTY`
- **AND** no submission row is written

#### Scenario: Submitting again overwrites the same row

- **WHEN** Alice submits twice
- **THEN** exactly one `submission` row exists and the latest body is stored

### Requirement: Read preference readiness

The system SHALL expose `GET /api/trips/{tripId}/preferences/readiness` to any member, returning `{"members":[{"userId","status","noPreference"}],"readyCount","memberCount","allReady"}` for every member ordered by ascending `userId`. `status` is `ready` when a submission row exists, otherwise `pending`; saving a preference does not make a member ready.

#### Scenario: A saved preference is not a submission

- **GIVEN** Ben saved an interest but never submitted
- **WHEN** the readiness is read
- **THEN** Ben's element carries `status:"pending"`

#### Scenario: All-ready aggregate

- **WHEN** every member has submitted
- **THEN** `readyCount` equals `memberCount` and `allReady` is true

### Requirement: Read effective preference inputs

The system SHALL expose `GET /api/trips/{tripId}/preferences/effective` returning **ready members only** as `{"members":[{"userId","noPreference","interests"}]}`. A member with `noPreference = true` contributes no personal interests (empty array); pending members are omitted.

#### Scenario: A no-preference member contributes nothing personal

- **GIVEN** Alice is ready and chose `noPreference:true`
- **WHEN** the effective inputs are read
- **THEN** Alice appears with an empty `interests` array

#### Scenario: Pending members are omitted

- **WHEN** a member has not submitted
- **THEN** that member does not appear in `effective`

## MODIFIED Requirements

### Requirement: Preferences page

The frontend SHALL provide `#/trips/{tripId}/preferences` with sections for interests, must-dos, budget and a submission area. The submission area carries a no-preference switch, a "提交并标记就绪" action and a readiness progress line; the switch disables the interests and budget controls (clearing their pending values), and one submit writes the preference set and then marks readiness.

#### Scenario: Submitting marks the member ready

- **WHEN** the user activates "提交并标记就绪"
- **THEN** exactly one `PUT .../submission` is sent and the ready state is shown

#### Scenario: No-preference switch and submit

- **GIVEN** the user has saved nothing
- **WHEN** the user enables "我没有特别偏好" and submits
- **THEN** a `PUT .../submission {"noPreference":true}` is sent and the member becomes ready

#### Scenario: An empty submit shows an inline error

- **GIVEN** the user saved nothing and left the switch off
- **WHEN** the user submits
- **THEN** the page shows the `PREFERENCE_EMPTY` message and does not show the member as ready
