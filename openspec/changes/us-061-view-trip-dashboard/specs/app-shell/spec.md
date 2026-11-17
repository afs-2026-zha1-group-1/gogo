# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every signed-in in-app route inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the
project's existing UI component language and tokens. The shell SHALL NOT expose
a shell-wide identity bar, identity switcher, seeded-user list or top-right
profile shortcut. The authenticated account's display name SHALL be shown on
My Account and in the dashboard greeting; account actions SHALL remain on My
Account. Login, registration and guest join surfaces SHALL render outside the
shell without the dock. The shell itself
SHALL NOT change create validation, trip-details permission, invitation or join
behavior, or main-plan behavior; authentication and session ownership belong
to the `auth` capability.

#### Scenario: An in-app route renders inside the frame

- **WHEN** an authenticated traveler opens the member-trip list, a selected
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

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, the invitation panel,
  the join flow and main-plan outcomes are exercised under the shell
- **THEN** their owning behavior is unchanged by the dashboard
- **AND** the shell itself adds no trip, invitation or main-plan state

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly five tabs in the order
仪表盘 / 行程 / 分队 / 成员 / 我的, each with an icon and text label. The active tab
SHALL identify the current area, including both dashboard views. Activating an
available tab SHALL update the hash route without a full reload, retain the
authenticated account, and preserve browser back/forward behavior. Every tab
SHALL have a unique visible heading or state.

#### Scenario: The dock shows five ordered tabs with an active highlight

- **WHEN** the shell renders an authenticated in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员, 我的 in that order, each with an
  icon and a text label
- **AND** exactly the tab owning the current route is visibly highlighted
- **AND** 仪表盘 is active for both dashboard list and selected-trip overview

#### Scenario: Tab switching updates the hash without reload and keeps identity

- **WHEN** a traveler authenticated as Alice activates an available dock tab
- **THEN** the hash route changes without a full page reload
- **AND** Alice remains authenticated and the newly active tab is highlighted

#### Scenario: Create belongs to the 行程 tab

- **WHEN** the route is `#/create`
- **THEN** the 行程 tab is highlighted
- **AND** the create form and its validation render under the shell unchanged

#### Scenario: Text-only forward and reverse walk identifies every page

- **WHEN** the traveler activates the tabs in order 仪表盘 → 行程 → 分队 → 成员 → 我的
  and then in reverse
- **THEN** every activation yields a unique visible heading or state,
  including a coming-soon state for a blocked destination
- **AND** no demo data is required

#### Scenario: Browser back/forward follows tab history

- **WHEN** the traveler switches available tabs and uses browser back and
  forward
- **THEN** the route and active tab follow the tab history
- **AND** the authenticated account is unchanged throughout

#### Scenario: Trip tab cannot bypass the details restriction

- **GIVEN** the trip-details page still issues an invitation automatically
  when an organizer loads it
- **WHEN** the traveler selects the 行程 tab from either dashboard view, even
  with a previously selected trip
- **THEN** the tab does not open that unsafe details page
- **AND** its trip-details destination is presented as coming soon without
  issuing an invitation

### Requirement: Dashboard tab placement

The 仪表盘 tab SHALL target `#/`, the authenticated default route, showing the
member-trip list. Selecting a card SHALL show its trip dashboard with
仪表盘 active. A signed-out visitor SHALL be sent to login before either view
renders. Dashboard content and read boundaries belong to `trip-dashboard`.

#### Scenario: The default route shows the existing home under the shell

- **WHEN** an authenticated traveler opens the default route `#/`
- **THEN** the member-trip list or its applicable state renders inside
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

- **WHEN** an authenticated member selects a listed member trip
- **THEN** the selected-trip overview and source-backed milestone strip render under the shell
- **AND** 仪表盘 remains active and the account remains authenticated

### Requirement: Trips tab placement and no-trip empty state

The 行程 area SHALL retain the existing member-only trip-details screen and
its loading, denied and missing outcomes at `#/trips/<id>`. With no trip
selected, it SHALL show an honest empty state with create and open-by-id
entries. Until the separate trip-details invitation-write fix is delivered,
dashboard navigation and its tab SHALL present the details destination,
including the open-by-id entry, as coming soon rather than opening it. Create
behavior remains owned by the existing trip flow.

#### Scenario: Details render under the shell with 行程 active

- **WHEN** a member opens `#/trips/<id>` for the fixture trip
  `Singapore Friends Day` through an existing non-dashboard route
- **THEN** the existing details screen renders inside the shell with 行程 active
- **AND** its loading, denied and missing outcomes remain unchanged

#### Scenario: No trip selected shows the honest empty state

- **WHEN** the 行程 area is shown without a trip id
- **THEN** a text empty state with a unique visible heading offers 创建行程
  and an entry for 按编号打开行程
- **AND** no trip name, member, route or status value is invented
- **AND** the open-by-id destination says coming soon while its details page
  remains unsafe

#### Scenario: Open-by-id reuses the details route

- **GIVEN** the separate fix has removed the automatic invitation write
- **WHEN** the traveler opens a trip by id from the empty state
- **THEN** the app navigates to `#/trips/<id>` and the existing details flow runs
- **AND** an unknown id surfaces the existing missing state

#### Scenario: Create is reachable and returns to 行程

- **WHEN** the traveler opens `#/create` from the shell and uses the back action
- **THEN** the app returns to the 行程 area
- **AND** a successful create retains its existing navigation behavior

#### Scenario: No trip listing is introduced

- **WHEN** the 行程 area and its empty state are exercised
- **THEN** they do not themselves call a list-all-trips endpoint
- **AND** the separate dashboard member-trip listing remains available
