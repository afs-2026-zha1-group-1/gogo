# Spec Delta

## MODIFIED Requirements

### Requirement: Trips tab placement and no-trip empty state

The 行程 tab SHALL always target `#/trips` and SHALL render the caller's trip
list there: every row SHALL show the trip name, destination and start–end dates,
SHALL mark trips the caller created and trips whose end date has passed, and
activating a row SHALL navigate to `#/trips/<id>`, where the existing trip
details screen (hero, information rows, organizer invitation panel) renders
under the shell with its loading, denied and missing states unchanged, and
exposes an entry to the trip's main plan at `#/trips/<id>/main-plan`. A list
with no trips SHALL render a text empty state offering 创建行程 and SHALL NOT
invent trip data or ask for a numeric trip id. A read in progress SHALL show a
loading state, a failed read SHALL offer a retry, `#/create` SHALL be reachable
from the shell, its back action SHALL return to 行程, and a successful create
SHALL still navigate to `#/trips/<id>`.

#### Scenario: Details render under the shell with 行程 active

- **WHEN** a member opens `#/trips/<id>` for the fixture trip
  `Singapore Friends Day`
- **THEN** the existing details screen (hero, information rows, organizer
  invitation panel) renders inside the shell
- **AND** the 行程 tab is active
- **AND** the loading, denied and missing states behave exactly as before

#### Scenario: The 行程 tab always opens the trip list

- **WHEN** the traveler activates the 行程 tab, including after a trip was already opened in this session
- **THEN** the app routes to `#/trips`
- **AND** the trip list renders instead of jumping to that trip's main plan

#### Scenario: The list shows the caller's trips

- **WHEN** the traveler opens `#/trips` and the read returns at least one trip
- **THEN** each row shows the trip name, destination and start–end dates
- **AND** the page carries a unique visible heading
- **AND** only trips the caller belongs to are listed

#### Scenario: A list row opens the details route

- **WHEN** the traveler activates a row in the trip list
- **THEN** the app navigates to `#/trips/<id>` and the existing details flow runs
- **AND** no trip id has to be typed

#### Scenario: Created and ended trips are marked

- **WHEN** a listed trip was created by the caller, or its end date is before today
- **THEN** the row shows the created marker for the former
- **AND** the row shows the ended marker for the latter, while staying in the same list

#### Scenario: A pending or failed read recovers

- **WHEN** the trip list read is still in progress
- **THEN** the page shows a loading state and no fabricated rows
- **AND** when the read fails, the page shows an error with a retry action
- **AND** a successful retry renders the caller's trips

#### Scenario: The details screen exposes the main plan entry

- **WHEN** a member opens `#/trips/<id>`
- **THEN** the details screen offers an entry to that trip's main plan
- **AND** activating it opens `#/trips/<id>/main-plan`

#### Scenario: No trip selected shows the honest empty state

- **WHEN** the 行程 tab is activated and the trip list read returns no trips
- **THEN** a text empty state renders with a unique visible heading
- **AND** it offers 创建行程
- **AND** no trip name, member, route or status value is invented

#### Scenario: Open-by-id reuses the details route

- **WHEN** the traveler opens `#/trips/<id>` directly by URL
- **THEN** the existing details flow runs for that id
- **AND** an id that does not exist surfaces the existing missing state
- **AND** the list page itself offers no trip-id input or open-by-id action

#### Scenario: Create is reachable and returns to 行程

- **WHEN** the traveler opens `#/create` from the shell and uses the back action
- **THEN** the app returns to the 行程 list at `#/trips`
- **AND** a successful create still navigates to `#/trips/<id>`

#### Scenario: No trip listing is introduced

- **WHEN** the 行程 tab and its empty state are exercised
- **THEN** the caller's trips come from the single `trips` list read
- **AND** no second list-all-trips endpoint or alternate data source is introduced
