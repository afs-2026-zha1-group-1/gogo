# trips Specification

## Purpose

Let an identified caller create one shared trip with its name, destination,
valid dates and optional start/end locations, let members read the same saved
details and the member roster, and carry the trip's main-plan confirmation state
that decides whether invitation joining is still open.

## Requirements

### Requirement: Trip caller identity

The system SHALL identify the caller of every trip endpoint by the authenticated
session principal established through `POST /api/auth/login`. The principal's
account id SHALL be the caller identity. The legacy `X-User-Id` header SHALL NOT
authenticate any trip request. A request without a valid session, or with an
expired session, SHALL return 401 with `code` equal to `USER_REQUIRED` and SHALL
NOT return trip data. Authentication SHALL prove identity only; membership and
organizer rules SHALL remain exactly as before this change.

#### Scenario: Caller identity is missing

- **WHEN** a trip endpoint receives no authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

#### Scenario: Caller identity is unknown

- **WHEN** a trip endpoint receives an expired or unknown session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no trip data is returned

#### Scenario: The legacy header alone is ignored

- **WHEN** a trip endpoint receives an `X-User-Id` header but no valid session
- **THEN** the response is 401 with `code` equal to `USER_REQUIRED`
- **AND** the header does not grant access

#### Scenario: A valid session supplies the caller identity

- **WHEN** Alice is authenticated and creates a trip
- **THEN** the trip records Alice's account id as organizer and member
- **AND** the authenticated Ben can read the trip while the authenticated Eve is
  denied with 403 `NOT_A_MEMBER`

### Requirement: Trip creation

The system SHALL expose `POST /api/trips`, persist name, destination, ISO
`YYYY-MM-DD` dates and optional locations, and atomically record the caller as
organizer and member. It SHALL reject blank name or destination, invalid dates
and inverted date ranges without writes. Unspecified locations SHALL normalize
to null; supplied nonblank locations SHALL be preserved. Location completion
belongs to later main-plan generation (US-031), not trip creation.

#### Scenario: Trip is created with the submitted details

- **WHEN** Alice (`X-User-Id: 1`) submits name `Singapore Friends Day`, destination
  `Singapore`, start date `2026-12-05`, end date `2026-12-05`, start location
  `City Hall MRT` and end location `Merlion Park`
- **THEN** the response status is 201
- **AND** the response carries the six submitted values and `organizerId` equal to 1
- **AND** a stored trip holds those six values
- **AND** the caller is recorded as a member of that trip

#### Scenario: Start date may equal the end date

- **WHEN** the submitted start date and end date are the same day
- **THEN** the trip is accepted exactly as in the previous scenario

#### Scenario: End date before start date is rejected

- **WHEN** the caller submits start date `2026-12-06` and end date `2026-12-05`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_DATE_RANGE`
- **AND** no trip is stored

#### Scenario: Blank name is rejected

- **WHEN** the caller submits a name that is empty or whitespace only
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `NAME_REQUIRED`
- **AND** no trip is stored

#### Scenario: Malformed date is rejected

- **WHEN** the caller submits a date that is not a valid `YYYY-MM-DD` value
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_DATE`
- **AND** no trip is stored

#### Scenario: Missing destination is rejected

- **WHEN** an otherwise valid create request omits `destination`, sends null,
  or sends an empty or whitespace-only destination
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `DESTINATION_REQUIRED`
- **AND** no trip or membership is stored

#### Scenario: Optional locations may be unspecified

- **WHEN** an otherwise valid create request omits either or both locations,
  or sends null, empty or whitespace-only locations
- **THEN** the response status is 201
- **AND** unspecified locations are stored and returned as null
- **AND** any supplied nonblank location is preserved
- **AND** a subsequent member read returns the same saved values

### Requirement: Trip detail read

The system SHALL expose `GET /api/trips/{id}` and SHALL return the saved trip to a
caller who is a member of that trip. It SHALL deny a caller who is not a member
without returning any trip value, and SHALL report an unknown trip id distinctly
from a denial.

#### Scenario: A member reads the saved trip

- **WHEN** Ben (`X-User-Id: 2`), a member, requests the details of
  `Singapore Friends Day`
- **THEN** the response status is 200
- **AND** the response carries name `Singapore Friends Day`, destination
  `Singapore`, start date `2026-12-05`, end date `2026-12-05`, start location
  `City Hall MRT` and end location `Merlion Park`

#### Scenario: A non-member is denied

- **WHEN** Eve (`X-User-Id: 5`), who is not a member, requests the same trip
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_A_MEMBER`
- **AND** the response body contains none of the trip's field values

#### Scenario: An unknown trip id is reported separately

- **WHEN** a member requests a trip id that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`

### Requirement: Trip main-plan confirmation state

The system SHALL hold a boolean main-plan-confirmed state for every trip,
defaulting to unconfirmed when the trip is created. This change SHALL NOT expose
any endpoint or user interface that sets the state; the confirmation flow belongs
to the future main-plan confirmation story (US-037). The invitation flow SHALL
read this state to decide whether joining is open.

#### Scenario: A created trip starts unconfirmed

- **WHEN** a trip is created through the trip creation requirement
- **THEN** its main-plan state is unconfirmed
- **AND** an invitation preview for that trip reports joining open

#### Scenario: The confirmed state is readable by the invitation preview

- **WHEN** the trip's main-plan state is confirmed (set only by documented
  test-only database setup in this change)
- **THEN** an invitation preview for that trip reports `mainPlanConfirmed` true
- **AND** acceptance by a non-member is rejected with `code` equal to
  `JOINING_CLOSED`

#### Scenario: No confirmation operation is exposed by this change

- **WHEN** the trip and invitation API surface of this change is exercised
- **THEN** no endpoint accepts a main-plan confirmation operation
- **AND** the state can change only through the future US-037 flow or the
  documented test-only setup

### Requirement: Trip member list read

The system SHALL expose read-only `GET /api/trips/{id}/members` to an
authenticated member, identified by the US-066 session principal rather than
the retired `X-User-Id` header. The roster SHALL list each member once with
`userId`, `displayName` and `organizer`, ordered by ascending `userId`; only
the organizer is flagged. Non-members SHALL be denied without member identity,
unknown trips reported separately, and no readiness, preference, budget or
main-plan value exposed.

#### Scenario: A member reads the roster

- **WHEN** Ben, authenticated as user 2, requests the member list of
  `Singapore Friends Day`
- **THEN** the response status is 200
- **AND** `tripId` is the requested trip's id
- **AND** the roster contains exactly Alice (1), Ben (2), Chloe (3) and
  Daniel (4), each exactly once, in ascending `userId` order
- **AND** every row carries `userId` and `displayName`

#### Scenario: The organizer is identified

- **WHEN** an authenticated member reads the roster of `Singapore Friends Day`
- **THEN** Alice's row has `organizer` equal to true
- **AND** every other row has `organizer` equal to false
- **AND** the organizer row is included in the roster like any other member

#### Scenario: A non-member is denied

- **WHEN** Eve, authenticated as user 5, who is not a member, requests the
  member list of the same trip
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_A_MEMBER`
- **AND** the body contains no `userId`, `displayName` or organizer value

#### Scenario: Caller identity is missing

- **WHEN** a request for the member list carries no authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no member data is returned

#### Scenario: The retired identity header does not authenticate

- **WHEN** a request for the member list carries only an `X-User-Id` header
  (blank, non-numeric or a seeded id) without an authenticated session
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** no member data is returned

#### Scenario: An unknown trip id is reported separately

- **WHEN** an authenticated member or non-member requests the member list of a
  trip id that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`
- **AND** no member data is returned

#### Scenario: A joined member appears exactly once

- **WHEN** Eve is recorded as a member through the invitation flow or the
  documented test-only membership setup and then reads the member list
- **THEN** the response status is 200
- **AND** Eve appears exactly once in the roster
- **AND** Alice is still the only row with `organizer` equal to true
- **AND** repeated acceptance by the same user does not duplicate the row

#### Scenario: Personal preference data is not exposed

- **WHEN** a member reads the roster
- **THEN** no readiness, preference, budget or main-plan field or value is
  present in the response
- **AND** the endpoint performs no write

### Requirement: Trip detail main-plan navigation entry

When a main plan exists, the trip detail page at `#/trips/<id>` SHALL present
it as an embedded timeline inside the 我的方案 section instead of a
"查看主线方案" navigation link, visible to every authenticated trip member.
When no main plan exists the legacy detail page SHALL keep its existing
"查看主线方案" link (R9). Rendering SHALL NOT trigger any server-side
mutation. The main-plan page SHALL remain reachable through the existing
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
- **THEN** the legacy detail page keeps the "查看主线方案" link to the
  main-plan page
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

### Requirement: Trip detail overview layout

The trip detail page at `#/trips/<id>` SHALL present the compact overview
(trip summary, countdown card, fellow-members section, embedded "我的方案")
only when a main plan exists; without a main plan the legacy detail page
(trip-info list, preference entry, invitation panel, main-plan link) SHALL be
kept (R9). In the overview the summary SHALL show the trip name on one line
and the date range plus destination on a second line, without a repeated
trip-info list block, travel-preference entry, embedded invitation panel,
split-planning section or main-plan confirmation button. All data SHALL come
from existing read endpoints; no endpoint, migration or permission rule is
added.

#### Scenario: Compact summary without duplicated info block

- **WHEN** an authenticated member opens `#/trips/1`
- **THEN** the trip name renders on one line and the date range plus destination
  on a second line
- **AND** no separate "行程信息" list block repeating the hero data is present

#### Scenario: Sections render in the contracted order

- **WHEN** an authenticated member opens the trip detail page for a trip that
  has a main plan
- **THEN** the visible sections appear in order: trip summary, countdown,
  fellow members, 我的方案
- **AND** no travel-preference card, embedded invitation panel, split-planning
  section or "审阅并确认主线" button is present

#### Scenario: Existing plan renders inline

- **WHEN** a member opens trip detail for a trip that has a main plan
- **THEN** the 我的方案 section displays that trip's activities and their times
  directly, without requiring a "查看主线方案" navigation click

#### Scenario: No plan keeps the legacy detail page

- **WHEN** a member opens trip detail for a trip with no main plan
- **THEN** the legacy detail page renders with its trip-info list, preference
  entry, invitation panel and main-plan link
- **AND** no countdown card or overview 我的方案 section is present
- **AND** no other trip's route is displayed

#### Scenario: Fellow members are visible with a roster entry

- **WHEN** a member opens the trip detail page
- **THEN** the fellow-members section shows the trip's member avatars
- **AND** a view control navigates to the member roster without mutating data

### Requirement: Personal route after split confirmation

When the trip's split draft is confirmed and the current member is assigned to a group, the 我的方案 section SHALL display that member's group route together with the shared main-plan activities strictly before the departure stop and from the reunion stop onward, using the confirmed snapshot's timestamps. For the group whose route carries `steps` (the group that keeps the confirmed plan), the departure→reunion segment SHALL be filled by those main-plan stops with their scheduled times and the member's group label; no synthetic "group activity" block SHALL be inserted. The other group SHALL show its generated activity between the boundaries. Each member SHALL see only their own group's route. An unconfirmed or cancelled draft SHALL NOT be presented as a confirmed personal plan.

#### Scenario: Assigned member sees their own route with shared activities

- **WHEN** the split draft is confirmed and Alice is assigned to group A (route keeps the confirmed plan)
- **THEN** Alice's 我的方案 lists the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive) with their scheduled start/end times, each labelled with group A
- **AND** the shared main-plan activities before the departure stop and from the reunion stop onward are retained
- **AND** no synthetic "沿主线方案" block appears

#### Scenario: Different members see different routes

- **WHEN** Alice is assigned to group A and Eve to group B in the same confirmed split
- **THEN** Alice's detail follows the main-plan stops inside the window
- **AND** Eve's detail shows group B's generated activity with its times
- **AND** neither member sees the other group's route as their own plan

#### Scenario: Unassigned member does not see another group's route

- **WHEN** the split is confirmed but the member is not present in any group
- **THEN** their 我的方案 does not display any group's route as their personal plan

#### Scenario: Unconfirmed or cancelled draft is not a personal plan

- **WHEN** the split draft is active (unconfirmed) or cancelled
- **THEN** the 我的方案 section falls back to the main plan when one exists, or the legacy detail page otherwise (R9)
- **AND** no unconfirmed route is labelled or presented as confirmed

#### Scenario: Confirmation returns to the same trip detail

- **WHEN** the organizer completes a successful split confirmation
- **THEN** the app returns to the same trip's detail page
- **AND** the detail page shows the confirmed personal route for that organizer

### Requirement: Activity countdown and next stop

The trip detail countdown card SHALL appear only in the overview state (a
main plan exists, R9), SHALL update every second and SHALL never show a
negative value. Before the trip starts it SHALL count down to the trip
departure (start date at local midnight) as `N 天 HH:MM:SS`. During an activity
it SHALL show the remaining time until that activity ends plus the member's
next stop; between activities it SHALL count down to the next activity's start.
With a confirmed personal route, countdown and next stop SHALL use that
member's group route and the shared activities. Times SHALL use the
device-local timezone (MVP assumption D-2); pre-split main-plan `HH:mm` stops
SHALL be combined with the trip start date. The next-stop detail SHALL render
the stop's address (persisted address first, demo address book fallback) with a
copy control; copy failure SHALL surface inline without blocking the card, and
a missing address SHALL render as pending confirmation. The next-stop
navigation entry SHALL use the current activity stop (during) or the stop
preceding the next stop (between) as origin; when the next stop is the first
timed stop the origin SHALL default to the fixed departure point
珠海南方软件园 (R1, user ruling 2026-11-18).

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

#### Scenario: Next-stop address row with copy

- **WHEN** a next stop exists with a known address (persisted or address book)
- **THEN** the address row shows the address and a copy control
- **AND** activating copy places the address on the clipboard and confirms inline
- **AND** a copy failure surfaces inline without blocking the card

#### Scenario: Next-stop address missing renders pending

- **WHEN** the next stop has neither a persisted address nor an address-book entry
- **THEN** the address row renders 地址待确认
- **AND** no address is fabricated

#### Scenario: Next-stop navigation origin is the previous stop

- **WHEN** the member activates the next-stop navigation entry during an activity
- **THEN** the opened route page uses the current activity stop as origin and
  the next stop as destination
- **AND** when the next stop is the first timed stop the origin defaults to
  珠海南方软件园 (R1)

### Requirement: Stop map navigation entry

The trip detail overview SHALL render a map navigation entry on every stop
card of 我的方案 (main-plan stops and the confirmed personal route) as a real
link opening a new browser tab; the application SHALL NOT embed third-party
map pages in an iframe. With persisted or address-book coordinates the link
SHALL open the Amap desktop route page carrying `from`/`to` lnglat (WGS-84
corrected to GCJ-02 for mainland China; Hong Kong, Macau and overseas
uncorrected), origin = the previous stop and destination = the stop; when no
previous stop exists (first stop) the origin SHALL default to the fixed
departure point 珠海南方软件园 (seeded in place-book/place_cache, R1). Without coordinates the link SHALL open the
Amap desktop search page with query = stop name + city (destination
auto-resolved, origin manual). Stop icons SHALL be semantic by stop name
keywords and interest tags with a pin/route fallback. Navigation or copy
failures SHALL never blank the trip or block reading it; the originating tab
SHALL remain on the trip detail so returning lands on the parent trip.

#### Scenario: M1 — no main plan renders no map entry

- **WHEN** a member opens the trip detail of a trip without a main plan
- **THEN** the legacy detail page renders and no map navigation entry is present

#### Scenario: M2 — main-plan stops each carry the entry with coordinates

- **WHEN** a member views 我的方案 of a trip whose stops carry coordinates
- **THEN** every stop card renders the map entry
- **AND** activating it opens a new tab on the Amap route page with destination =
  that stop's coordinates and origin = the previous stop's coordinates

#### Scenario: M3 — first stop uses the fixed default origin (R1)

- **WHEN** the member activates the map entry of the first stop
- **THEN** the opened route page carries destination = the stop and origin =
  珠海南方软件园 (fixed default departure point)
- **AND** the origin remains manually overridable inside the Amap page

#### Scenario: M4 — confirmed personal route stops carry the entry

- **WHEN** the split is confirmed and the member views their personal route
- **THEN** each personal stop card renders the map entry
- **AND** stops without persisted coordinates fall back to the address book

#### Scenario: M5 — distinct stops navigate to distinct destinations

- **WHEN** the member activates map entries of different stops
- **THEN** each opened route page uses that stop's own coordinates/name
- **AND** no other stop's destination is reused

#### Scenario: M6 — unbooked stop falls back to the search page

- **WHEN** a stop has neither persisted coordinates nor an address-book entry
- **THEN** the entry opens the Amap desktop search page with query = stop name + city
- **AND** the destination auto-resolves while the origin stays manual
- **AND** no empty route page or infinite loading state is shown

#### Scenario: M7 — semantic stop icons

- **WHEN** the timeline renders stops
- **THEN** each stop icon is chosen by name keywords (ferry/museum/peak/market)
  then interest tags (food/coffee/nature/heritage/craft/photo/slow) then
  park/garden names, with pin/route as fallback

#### Scenario: M8 — new tab only, return lands on the trip

- **WHEN** the member activates any map entry
- **THEN** navigation happens in a new tab via a real link (no iframe, no popup block)
- **AND** the originating tab remains on the trip detail

#### Scenario: M9 — overseas unresolvable coordinates stay null

- **WHEN** generation or write-back cannot resolve an overseas address
- **THEN** the stop's coordinates remain null and the fallback chain applies
- **AND** no coordinate is fabricated and generation/read do not fail
