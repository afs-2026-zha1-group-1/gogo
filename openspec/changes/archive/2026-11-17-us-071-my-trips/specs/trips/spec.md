# Spec Delta

## ADDED Requirements

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

