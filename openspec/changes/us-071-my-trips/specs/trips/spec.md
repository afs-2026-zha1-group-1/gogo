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
- **THEN** rows appear by ascending `startDate`
- **AND** rows sharing a `startDate` appear by ascending `id`

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
