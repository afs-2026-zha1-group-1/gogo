# Spec Delta — trips (us-079-map-navigation)

## MODIFIED Requirements

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
timed stop the origin SHALL be left for manual entry.

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
- **AND** when the next stop is the first timed stop the route page carries only
  the destination and the origin is left for manual entry

## ADDED Requirements

### Requirement: Stop map navigation entry

The trip detail overview SHALL render a map navigation entry on every stop
card of 我的方案 (main-plan stops and the confirmed personal route) as a real
link opening a new browser tab; the application SHALL NOT embed third-party
map pages in an iframe. With persisted or address-book coordinates the link
SHALL open the Amap desktop route page carrying `from`/`to` lnglat (WGS-84
corrected to GCJ-02 for mainland China; Hong Kong, Macau and overseas
uncorrected), origin = the previous stop and destination = the stop; the first
stop SHALL carry destination only. Without coordinates the link SHALL open the
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

#### Scenario: M3 — first stop carries destination only

- **WHEN** the member activates the map entry of the first stop
- **THEN** the opened route page carries only the destination
- **AND** the origin field is left empty for manual entry

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
