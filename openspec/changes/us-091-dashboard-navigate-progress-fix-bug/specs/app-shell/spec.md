## MODIFIED Requirements

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly five tabs in the order
仪表盘 / 行程 / 分队 / 成员 / 我的, each with an icon and text label. The active tab
SHALL identify the current area, including dashboard views. Activating a
hash-routed tab SHALL update the hash without a full reload when its target
differs from the current route; the split tab may use its existing path route.
When the split fallback targets the current Trips route, the hash remains
unchanged and the Trips tab remains active. Navigation SHALL retain the authenticated
account and preserve browser back/forward behavior. Tabs SHALL have distinct
visible headings or states, except that the split tab MAY reuse the trip
selection guidance when no trip is available.

#### Scenario: The dock shows five ordered tabs with an active highlight

- **WHEN** the shell renders an authenticated in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员, 我的 in that order, each with an icon and a text label
- **AND** exactly the tab owning the current route is visibly highlighted
- **AND** 仪表盘 is active for the current-trip and direct selected-trip overview

#### Scenario: Tab switching updates the hash without reload and keeps identity

- **WHEN** a traveler authenticated as Alice activates a hash-routed dock tab
- **THEN** the hash route changes without a full page reload when the target differs from the current route
- **AND** Alice remains authenticated and the tab owning the resulting route is highlighted
- **AND** if the split fallback targets the current Trips route, the hash remains unchanged and Trips stays highlighted

#### Scenario: Create belongs to the 行程 tab

- **WHEN** the route is `#/create`
- **THEN** the 行程 tab is highlighted
- **AND** the create form and its validation render under the shell unchanged

#### Scenario: Text-only forward and reverse walk identifies every page

- **WHEN** the traveler activates the tabs in order 仪表盘 → 行程 → 分队 → 成员 → 我的 and then in reverse
- **THEN** each activation yields a distinct visible heading or state, except that the split tab may reuse trip selection guidance when no trip is available
- **AND** no demo data is required

#### Scenario: Browser back/forward follows tab history

- **WHEN** the traveler switches available tabs and uses browser back and forward
- **THEN** the route and active tab follow the tab history
- **AND** the authenticated account is unchanged throughout

#### Scenario: Trip tab cannot bypass the details restriction

- **WHEN** the traveler selects the 行程 tab from a dashboard view
- **THEN** the saved current trip's details or the existing empty or error state is shown
- **AND** the existing details authorization remains enforced

### Requirement: Current trip tab and my-trips list

The 我的 page SHALL expose 我的行程 at `#/my-trips`, listing the caller's trips
as cards without a trailing arrow. Activating a picker card SHALL persist the
current trip, highlight it and show 已选择 without navigating. The 行程 tab SHALL
target `#/trips` from all origins, rendering the current trip's details or an
empty state linking to `#/my-trips`. `#/trips/<id>` SHALL keep opening details
directly. Invitation issuance on detail views SHALL follow the invitations
capability.

#### Scenario: The account page exposes the my-trips entry

- **WHEN** a signed-in traveler opens `#/account`
- **THEN** an entry titled 我的行程 is visible
- **AND** activating it opens `#/my-trips` inside the shell

#### Scenario: The my-trips page lists the caller's trips

- **WHEN** the traveler opens `#/my-trips`
- **THEN** every row shows the trip name, destination and start–end dates with the created and ended markers
- **AND** only trips the caller belongs to are listed
- **AND** the page carries a unique visible heading
- **AND** cards and empty states follow the `ui-design-reference` prototype visuals (`.qcard` / `.empty`)

#### Scenario: Selecting a card tags it without navigating

- **WHEN** the traveler activates a card in `#/my-trips`
- **THEN** the selected trip becomes the caller's current trip on the server
- **AND** that card is highlighted and shows an 已选择 tag at its right edge (no trailing arrow), staying on `#/my-trips`
- **AND** any previously selected card loses its tag and highlight

#### Scenario: The selected tag reflects the stored current trip

- **WHEN** the traveler opens `#/my-trips` with a current trip already stored
- **THEN** the matching card shows the 已选择 tag on first render
- **AND** no other card shows it

#### Scenario: The trips tab shows the current trip's details

- **WHEN** the traveler activates the 行程 tab from any origin with a current trip set
- **THEN** `#/trips` renders that trip's details screen under the shell with the 行程 tab active
- **AND** the details' loading, denied and missing states behave as before

#### Scenario: Without a current trip the trips tab guides to my-trips

- **WHEN** the traveler opens `#/trips` and has no current trip
- **THEN** an empty state renders with a unique visible heading
- **AND** it offers a link to `#/my-trips`
- **AND** no trip name, member, route or status value is invented

#### Scenario: The current trip survives reload and re-login

- **WHEN** the traveler reloads the app or signs in again on another device
- **THEN** `#/trips` still shows the same current trip's details
- **AND** switching to another account shows that account's own current trip, or its empty state

#### Scenario: Details deep link still works

- **WHEN** the traveler opens `#/trips/<id>` directly by URL
- **THEN** the existing details flow runs for that id
- **AND** an id that does not exist surfaces the existing missing state

#### Scenario: Trip-scoped return links keep the trip context

- **WHEN** a member activates the back link on the 成员 roster of a trip
- **THEN** non-dashboard navigation returns to that trip's details at `#/trips/<id>`
- **AND** dashboard-origin navigation returns to that trip's dashboard
- **AND** guidance shown when no trip is resolved targets the applicable trip tab

#### Scenario: Create is reachable and returns to the trips tab

- **WHEN** the traveler opens `#/create` from the shell and uses the back action
- **THEN** the app returns to the applicable trip tab
- **AND** a successful create still navigates to `#/trips/<id>`

#### Scenario: No second list source is introduced

- **WHEN** `#/my-trips` and `#/trips` are exercised
- **THEN** the list comes only from the `trips` list read and the details only from the current-trip read plus the existing details read
- **AND** no alternate list-all-trips endpoint or client-side cache is introduced

#### Scenario: Dashboard selection is not a persisted picker selection

- **WHEN** a traveler opens a direct trip dashboard
- **THEN** that direct route does not update the stored current trip
- **AND** a late current-trip response cannot replace the direct selection

#### Scenario: Direct dashboard and saved selection differ

- **GIVEN** a traveler has saved trip A and opens trip B's dashboard directly
- **WHEN** the traveler selects 行程
- **THEN** trip A's details are displayed without changing the saved selection

#### Scenario: Current trip read fails

- **WHEN** the current-trip read fails from the Trips tab
- **THEN** an error and retry are shown rather than an empty or fabricated trip
