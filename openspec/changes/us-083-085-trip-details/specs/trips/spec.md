# Spec Delta — trips (us-083-085-trip-details)

## ADDED Requirements

### Requirement: Trip detail overview layout

The trip detail page at `#/trips/<id>` SHALL present, in order: a compact trip
summary, a countdown card, a fellow-members section, and an embedded "我的方案"
section. The summary SHALL show the trip name on one line and the date range
plus destination on a second line, without a repeated trip-info list block.
The page SHALL NOT render a travel-preference entry, an embedded invitation
panel, a split-planning section, or a main-plan confirmation button. All data
SHALL come from existing read endpoints; no endpoint, migration or permission
rule is added.

#### Scenario: Compact summary without duplicated info block

- **WHEN** an authenticated member opens `#/trips/1`
- **THEN** the trip name renders on one line and the date range plus destination
  on a second line
- **AND** no separate "行程信息" list block repeating the hero data is present

#### Scenario: Sections render in the contracted order

- **WHEN** an authenticated member opens the trip detail page
- **THEN** the visible sections appear in order: trip summary, countdown,
  fellow members, 我的方案
- **AND** no travel-preference card, embedded invitation panel, split-planning
  section or "审阅并确认主线" button is present

#### Scenario: Existing plan renders inline

- **WHEN** a member opens trip detail for a trip that has a main plan
- **THEN** the 我的方案 section displays that trip's activities and their times
  directly, without requiring a "查看主线方案" navigation click

#### Scenario: No plan shows the empty state

- **WHEN** a member opens trip detail for a trip with neither a main plan nor a
  confirmed personal route
- **THEN** the 我的方案 section shows a no-plan empty state
- **AND** no other trip's route is displayed

#### Scenario: Fellow members are visible with a roster entry

- **WHEN** a member opens the trip detail page
- **THEN** the fellow-members section shows the trip's member avatars
- **AND** a view control navigates to the member roster without mutating data

### Requirement: Personal route after split confirmation

When the trip's split draft is confirmed and the current member is assigned to
a group, the 我的方案 section SHALL display that member's group route together
with the shared main-plan activities before departure and after reunion, using
the confirmed snapshot's timestamps. Each member SHALL see only their own
group's route. An unconfirmed or cancelled draft SHALL NOT be presented as a
confirmed personal plan. After a successful split confirmation the organizer
SHALL be returned to the same trip's detail page.

#### Scenario: Assigned member sees their own route with shared activities

- **WHEN** the split draft is confirmed and Alice is assigned to group A
- **THEN** Alice's 我的方案 shows group A's activities with their times
- **AND** the shared main-plan activities before departure and after reunion
  are retained in the timeline

#### Scenario: Different members see different routes

- **WHEN** Alice is assigned to group A and Chloe to group B in the same
  confirmed split
- **THEN** Alice's detail shows group A's route and Chloe's detail shows group
  B's route
- **AND** neither member sees the other group's route as their own plan

#### Scenario: Unassigned member does not see another group's route

- **WHEN** the split is confirmed but Ben is not present in any group
- **THEN** Ben's 我的方案 does not display any group's route as his personal
  plan

#### Scenario: Unconfirmed or cancelled draft is not a personal plan

- **WHEN** the split draft is active (unconfirmed) or cancelled
- **THEN** the 我的方案 section falls back to the main plan when one exists, or
  the no-plan empty state otherwise
- **AND** no unconfirmed route is labelled or presented as confirmed

#### Scenario: Confirmation returns to the same trip detail

- **WHEN** the organizer completes a successful split confirmation
- **THEN** the app returns to the same trip's detail page
- **AND** the detail page shows the confirmed personal route for that organizer

### Requirement: Activity countdown and next stop

The trip detail countdown card SHALL update every second and SHALL never show
a negative value. Before the trip starts it SHALL count down to the trip
departure (start date at local midnight) as `N 天 HH:MM:SS`. During an activity
it SHALL show the remaining time until that activity ends plus the member's
next stop; between activities it SHALL count down to the next activity's start.
With a confirmed personal route, countdown and next stop SHALL use that
member's group route and the shared activities. Times SHALL use the
device-local timezone (MVP assumption D-2); pre-split main-plan `HH:mm` stops
SHALL be combined with the trip start date.

#### Scenario: Pre-trip countdown to departure

- **WHEN** the current time is before the trip start date
- **THEN** the countdown card shows the remaining `N 天 HH:MM:SS` until the
  start date at local midnight
- **AND** the value updates every second

#### Scenario: During an activity shows remaining time and next stop

- **WHEN** the current time falls inside an activity of the member's plan
- **THEN** the card shows the remaining time until that activity ends and the
  member's next stop
- **AND** the countdown keeps updating

#### Scenario: Between activities counts down to the next start

- **WHEN** the current time falls between two activities of the member's plan
- **THEN** the card counts down to the next activity's start and shows that
  next stop

#### Scenario: Confirmed split uses the member's own route

- **WHEN** the split is confirmed and the member has a personal route
- **THEN** countdown and next stop derive from that member's group route and
  the shared activities
- **AND** no other group's route is used

#### Scenario: Boundary switch without negative values

- **WHEN** the countdown reaches an activity end or start boundary
- **THEN** the card switches to the next activity or the corresponding state
  according to the current time
- **AND** no negative countdown value is displayed at any moment

#### Scenario: No schedule or no next stop states

- **WHEN** the day has no activities for the member, or no activity follows the
  current one
- **THEN** the card shows the no-schedule or no-next-stop state respectively
- **AND** no activities of other dates or trips are displayed

#### Scenario: Next-stop detail with missing information

- **WHEN** a next stop exists but its address or travel time is unknown
- **THEN** the missing fields render as pending confirmation
- **AND** no suggested departure time is fabricated from unknown travel time

#### Scenario: No following activity

- **WHEN** the current activity is the last one of the member's day
- **THEN** the next-stop area renders "没有更多活动"

## MODIFIED Requirements

### Requirement: Trip detail main-plan navigation entry

The trip detail page at `#/trips/<id>` SHALL present the trip's main plan as an
embedded timeline inside the 我的方案 section instead of a "查看主线方案"
navigation link, visible to every authenticated trip member whether or not a
plan exists. Rendering it SHALL NOT trigger any server-side mutation. The
main-plan page SHALL remain reachable through the existing
generation/confirmation flow with all six states unchanged; confirmation
continues to follow US-081. No new state, API endpoint or permission rule is
added.

#### Scenario: Member sees the entry on trip detail

- **WHEN** an authenticated member opens `#/trips/1` for a trip they belong to
  and a main plan exists
- **THEN** the 我的方案 section renders the plan's activities and times inline
- **AND** no "查看主线方案" link control is present on the detail page

#### Scenario: Member activates the entry and reaches the plan

- **WHEN** a member views the embedded plan on the trip detail page for trip 1
- **THEN** the plan's activities and times are displayed directly without a
  navigation click
- **AND** no POST, PUT or DELETE request is issued by rendering the plan

#### Scenario: Entry visible when no plan exists

- **WHEN** a member opens trip detail for a trip that has no main-plan draft
- **THEN** the 我的方案 section shows the no-plan empty state
- **AND** no other trip's route is displayed

#### Scenario: Non-member or unsigned-in user cannot reach the plan

- **WHEN** a user who is not a member of trip 1 navigates directly to
  `#/trips/1/main-plan`
- **THEN** the main-plan page shows the existing denied state with no plan data
- **WHEN** an unsigned-in user attempts to reach `#/trips/1/main-plan`
- **THEN** the existing login guard redirects to the login page

#### Scenario: Return to trip detail after viewing

- **WHEN** a member arrives at the main-plan page through the existing
  generation/confirmation flow and then activates the trip-detail info button
  in the main-plan appbar
- **THEN** the route returns to `#/trips/1` (the same trip's detail page)
- **AND** the trip detail page re-renders in its ready state with the embedded
  plan still visible
- **AND** the main-plan page handles loading, ready, empty, denied, missing and
  failed states exactly as before this change