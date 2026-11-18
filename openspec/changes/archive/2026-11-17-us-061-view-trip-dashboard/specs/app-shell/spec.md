# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile shell frame

The frontend SHALL render shell-hosted signed-in routes inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the
project's existing UI component language and tokens. The shell SHALL NOT expose
a shell-wide identity bar, identity switcher, seeded-user list or top-right
profile shortcut. The authenticated account's display name SHALL be shown on
My Account and in the dashboard greeting; account actions SHALL remain on My
Account. Login, registration, guest join, scanner, preferences and
invitation-only surfaces SHALL render outside the shell without the dock.
The shell itself
SHALL NOT change create validation, trip-details permission, invitation or join
behavior, or main-plan behavior; authentication and session ownership belong
to the `auth` capability.

#### Scenario: An in-app route renders inside the frame

- **WHEN** an authenticated traveler opens the current-trip dashboard, a selected
  trip dashboard, the no-trip 行程 route, `#/trips/<id>`, `#/create`, `#/split`
  `#/members` or `#/account`
- **THEN** the content is inside a centered column at most 430 px wide and
  100 dvh tall
- **AND** the bottom dock is fixed below the scrolling content with safe-area
  padding and does not obscure the page content

#### Scenario: No shell-wide identity bar or profile shortcut

- **WHEN** an authenticated traveler views a shell page
- **THEN** no identity switcher, scaffold bar or top-right profile shortcut is present
- **AND** the account's display name is shown on My Account and in the dashboard greeting
- **AND** account actions remain on My Account

#### Scenario: My Account renders inside the shell

- **WHEN** a signed-in traveler opens `#/account`
- **THEN** My Account renders inside the shell with the 我的 tab active
- **AND** the dock and safe-area padding remain available

#### Scenario: The invitation page renders full-screen without the dock

- **WHEN** an authenticated member opens `#/trips/<id>/invitation`
- **THEN** the invitation page renders outside the shell without the bottom
  dock
- **AND** a back control returns to the same trip's detail page inside the shell

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, the invitation panel,
  the join flow and main-plan outcomes are exercised under the shell
- **THEN** their owning behavior is unchanged by the dashboard
- **AND** the shell itself adds no trip, invitation or main-plan state

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly five tabs in the order
仪表盘 / 行程 / 分队 / 成员 / 我的, each with an icon and text label. The active tab
SHALL identify the current area, including dashboard views. Activating an
hash-routed tab SHALL update the hash without a full reload; the split tab may
use its existing path route. Navigation SHALL retain the authenticated
account and preserve browser back/forward behavior. Every tab SHALL have a
unique visible heading or state.

#### Scenario: The dock shows five ordered tabs with an active highlight

- **WHEN** the shell renders an authenticated in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员, 我的 in that order, each with an
  icon and a text label
- **AND** exactly the tab owning the current route is visibly highlighted
- **AND** 仪表盘 is active for the current-trip and direct selected-trip overview

#### Scenario: Tab switching updates the hash without reload and keeps identity

- **WHEN** a traveler authenticated as Alice activates a hash-routed dock tab
- **THEN** the hash route changes without a full page reload
- **AND** Alice remains authenticated and the newly active tab is highlighted

#### Scenario: Create belongs to the 行程 tab

- **WHEN** the route is `#/create`
- **THEN** the 行程 tab is highlighted
- **AND** the create form and its validation render under the shell unchanged

#### Scenario: Text-only forward and reverse walk identifies every page

- **WHEN** the traveler activates the tabs in order 仪表盘 → 行程 → 分队 → 成员 → 我的
  and then in reverse
- **THEN** every activation yields a unique visible heading or state
- **AND** no demo data is required

#### Scenario: Browser back/forward follows tab history

- **WHEN** the traveler switches available tabs and uses browser back and
  forward
- **THEN** the route and active tab follow the tab history
- **AND** the authenticated account is unchanged throughout

#### Scenario: Trip tab cannot bypass the details restriction

The historical scenario name is retained for MODIFIED-requirement
compatibility; the current behavior is described below.

- **WHEN** the traveler selects the 行程 tab from a dashboard view
- **THEN** the trip-entry page offers an ID lookup
- **AND** opening a trip can reach its existing details page, whose organizer
  invitation panel posts on load

### Requirement: Dashboard tab placement

The 仪表盘 tab SHALL target `#/`, the authenticated default route, showing the
persisted current-trip overview or its empty/error state. A direct selected-trip
dashboard SHALL also retain 仪表盘 active. Signed-out visitors SHALL be sent
to login. Dashboard read boundaries belong to `trip-dashboard`.

#### Scenario: The default route shows the existing home under the shell

- **WHEN** an authenticated traveler opens the default route `#/`
- **THEN** the current-trip overview or its applicable state renders inside
  the shell
- **AND** the 仪表盘 tab is active

#### Scenario: The greeting uses the account name without an organizer label

- **GIVEN** an authenticated traveler whose display name is `Nina` and who
  organizes a trip
- **WHEN** the 仪表盘 page renders
- **THEN** the greeting shows `Nina` without appending 组织者
- **AND** organizer badges remain on trip surfaces that describe that role

#### Scenario: A signed-out visitor is sent to login first

- **WHEN** a signed-out visitor opens a dashboard route
- **THEN** the login page opens before private dashboard or account content
  renders

#### Scenario: No aggregation is introduced

The historical scenario name is retained for MODIFIED-requirement
compatibility; the current dashboard composes authorized reads.

- **WHEN** an authenticated member opens an authorized selected trip
- **THEN** the selected-trip overview and source-backed milestone strip render under the shell
- **AND** 仪表盘 remains active and the account remains authenticated

### Requirement: Current trip tab and my-trips list

The 我的 page SHALL expose 我的行程 at `#/my-trips`, listing the caller's trips
as cards without a trailing arrow. Activating a picker card SHALL persist the
current trip, highlight it and show 已选择 without navigating. Outside
dashboard-origin navigation, the 行程 tab SHALL target `#/trips`, rendering the
current trip's details or an empty state linking to `#/my-trips`.
`#/trips/<id>` SHALL keep opening details directly. Dashboard-origin trip-tab
navigation SHALL use `#/dashboard/trip-entry`, whose ID lookup can open the
existing details page. For organizers, loading details invokes the existing
invitation POST.

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

- **WHEN** the traveler activates the 行程 tab outside dashboard-origin navigation with a current trip set
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
- **THEN** the app returns to the applicable trip tab, including the dashboard-origin entry
- **AND** a successful create still navigates to `#/trips/<id>`

#### Scenario: No second list source is introduced

- **WHEN** `#/my-trips` and `#/trips` are exercised
- **THEN** the list comes only from the `trips` list read and the details only from the current-trip read plus the existing details read
- **AND** no alternate list-all-trips endpoint or client-side cache is introduced

#### Scenario: Dashboard selection is not a persisted picker selection

- **WHEN** a traveler opens a direct trip dashboard
- **THEN** that direct route does not update the stored current trip
- **AND** a late current-trip response cannot replace the direct selection

### Requirement: Trip-context return links

The split start screen and the non-dashboard main plan screen SHALL provide
explicit back actions to their trip's details at `#/trips/<id>`, without
depending on browser history. Dashboard-origin main-plan and split navigation
SHALL instead return to `#/dashboard/trips/<id>`.
Returning to details SHALL re-establish the resolved trip context.

#### Scenario: Split start back returns to the trip details

- **WHEN** a member opens `/trips/<id>/split` from the trip details and activates the back action
- **THEN** the app renders the trip details for `<id>` under the shell
- **AND** the resolved trip is `<id>` for subsequent members and split entries

#### Scenario: Direct split entry back does not fall to home

- **WHEN** a signed-in member opens `/trips/<id>/split` directly and activates the back action
- **THEN** the app renders the trip details for `<id>`
- **AND** the dashboard is not rendered

#### Scenario: Main plan back returns to the trip details

- **WHEN** a member opens `#/trips/<id>/main-plan` from the trip details and activates the back action
- **THEN** the app renders the trip details for `<id>`

#### Scenario: Dashboard-origin trip context returns safely

- **WHEN** a member opens the main plan or split flow from a dashboard-selected trip and activates back
- **THEN** the app returns to that trip's dashboard without opening details or issuing an invitation
