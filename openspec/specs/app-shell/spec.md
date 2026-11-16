# app-shell Specification

## Purpose
Give every in-app route one mobile-scaled shell with a persistent bottom dock
(仪表盘 / 行程 / 分队 / 成员) so a traveler moves between the main areas without
losing context or identity, while existing home, create, details and invitation
behavior is placed under the shell unchanged, future areas stay honest text
placeholders, and invited guests joining by link never see in-app navigation.

## Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every in-app route inside a centered column at most
430 px wide and 100 dvh tall, with the page content scrolling above a fixed
bottom dock and safe-area padding applied. The shell SHALL use the tokens and
component language of `ui-design-reference` (the existing `app.css` token set).
The identity switcher SHALL remain available in the shell, labeled as a
scaffold (非登录), and SHALL continue to set `X-User-Id` on every request. The
shell SHALL NOT add or change any backend endpoint, migration or database
state, and SHALL NOT change create validation, trip-details permission,
invitation panel or join flow behavior.

#### Scenario: An in-app route renders inside the frame

- **WHEN** any of `#/`, the no-trip 行程 route, `#/trips/<id>`, `#/create`,
  `#/split` or `#/members` renders
- **THEN** the content is inside a centered column at most 430 px wide and
  100 dvh tall
- **AND** the bottom dock is fixed below the scrolling content with safe-area
  padding
- **AND** the dock does not obscure the page content or the home create entry

#### Scenario: The identity switcher stays a scaffold in the shell

- **WHEN** the traveler changes the selected identity in the shell switcher
- **THEN** the switcher remains visible and labeled as a scaffold, not a login
- **AND** every subsequent request carries the newly selected `X-User-Id`

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, the invitation panel and
  the join flow are exercised under the shell
- **THEN** they behave exactly as before this change
- **AND** no backend endpoint, migration or database state is added or changed

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly four tabs in the order
仪表盘 / 行程 / 分队 / 成员, each with an icon and a text label. The active tab
SHALL be visibly highlighted according to the current route: home → 仪表盘;
the no-trip 行程 route, `#/trips/<id>` and `#/create` → 行程; `#/split` → 分队;
`#/members` → 成员. Activating a tab SHALL update the hash route without a full
page reload and SHALL keep the selected identity. Browser back/forward SHALL
follow the tab history without losing the selected identity. Every tab page
SHALL carry a unique visible heading or state so a text-only forward and
reverse walk can identify each page.

#### Scenario: The dock shows four ordered tabs with an active highlight

- **WHEN** the shell renders on any in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员 in that order, each with an
  icon and a text label
- **AND** exactly the tab owning the current route is visibly highlighted

#### Scenario: Tab switching updates the hash without reload and keeps identity

- **WHEN** the traveler activates a different dock tab with identity `X-User-Id: 1`
  selected
- **THEN** the hash route changes to that tab's target without a full page reload
- **AND** the selected identity is still `X-User-Id: 1`
- **AND** the newly active tab is highlighted

#### Scenario: Create belongs to the 行程 tab

- **WHEN** the route is `#/create`
- **THEN** the 行程 tab is highlighted
- **AND** the create form and its validation render under the shell unchanged

#### Scenario: Text-only forward and reverse walk identifies every page

- **WHEN** the tabs are activated in order 仪表盘 → 行程 → 分队 → 成员 and then
  in reverse, recording the visible heading or state each time
- **THEN** every activation yields a unique visible heading or state
- **AND** every page is reachable in both directions without screenshots or
  demo data

#### Scenario: Browser back/forward follows tab history

- **WHEN** the traveler switches tabs and then uses browser back and forward
- **THEN** the route and active tab follow the tab history
- **AND** the selected identity is unchanged throughout

### Requirement: Dashboard tab placement

The 仪表盘 tab SHALL target `#/`, which SHALL remain the default route. The
existing home content — greeting status, create entry and identity scaffold —
SHALL render under the shell with 仪表盘 active. No dashboard status
aggregation is added by this change.

#### Scenario: The default route shows the existing home under the shell

- **WHEN** the app opens at the default route `#/`
- **THEN** the existing home content (greeting status, create entry, identity
  scaffold) renders inside the shell
- **AND** the 仪表盘 tab is active

#### Scenario: No aggregation is introduced

- **WHEN** the 仪表盘 page renders
- **THEN** it shows only the existing home content
- **AND** no trip-status aggregation or list-all-trips data is displayed

### Requirement: Trips tab placement and no-trip empty state

The 行程 tab SHALL place the existing trip details screen (hero, information
rows, organizer invitation panel) under the shell at `#/trips/<id>`, with its
loading, denied and missing states unchanged. When no trip is selected, the
行程 tab SHALL show a text empty state offering exactly two actions — 创建行程
and 按编号打开行程 — and SHALL NOT invent trip data. 按编号打开行程 SHALL
navigate to the existing `#/trips/<id>` details route; an unknown id SHALL
surface the existing missing state. `#/create` SHALL be reachable from the
shell, its back action SHALL return to 行程, and a successful create SHALL
still navigate to `#/trips/<id>`. This change SHALL NOT add a list-all-trips
endpoint or call.

#### Scenario: Details render under the shell with 行程 active

- **WHEN** a member opens `#/trips/<id>` for the fixture trip
  `Singapore Friends Day`
- **THEN** the existing details screen (hero, information rows, organizer
  invitation panel) renders inside the shell
- **AND** the 行程 tab is active
- **AND** the loading, denied and missing states behave exactly as before

#### Scenario: No trip selected shows the honest empty state

- **WHEN** the 行程 tab is activated and the route carries no trip id
- **THEN** a text empty state renders with a unique visible heading
- **AND** it offers 创建行程 and 按编号打开行程
- **AND** no trip name, member, route or status value is invented

#### Scenario: Open-by-id reuses the details route

- **WHEN** the traveler opens a trip by id from the empty state
- **THEN** the app navigates to `#/trips/<id>` and the existing details flow runs
- **AND** an id that does not exist surfaces the existing missing state

#### Scenario: Create is reachable and returns to 行程

- **WHEN** the traveler opens `#/create` from the shell and uses the back action
- **THEN** the app returns to the 行程 tab
- **AND** a successful create still navigates to `#/trips/<id>`

#### Scenario: No trip listing is introduced

- **WHEN** the 行程 tab and its empty state are exercised
- **THEN** no list-all-trips endpoint is called or added

### Requirement: Placeholder tabs

The 分队 tab SHALL target `#/split` and the 成员 tab SHALL target `#/members`.
Each SHALL render an honest text placeholder stating that the feature is not
implemented yet, with a link back to 行程, and a unique visible heading. Neither
SHALL fabricate demo members, routes or statuses.

#### Scenario: 分队 shows an honest placeholder

- **WHEN** the 分队 tab is activated
- **THEN** `#/split` renders a text placeholder stating the feature is not
  implemented yet, with a unique visible heading
- **AND** a link back to 行程 is present
- **AND** the 分队 tab is active

#### Scenario: 成员 shows an honest placeholder

- **WHEN** the 成员 tab is activated
- **THEN** `#/members` renders a text placeholder stating the feature is not
  implemented yet, with a unique visible heading
- **AND** a link back to 行程 is present
- **AND** the 成员 tab is active

#### Scenario: No demo data is fabricated

- **WHEN** either placeholder renders
- **THEN** no demo member, route or status value is displayed

### Requirement: Guest join exclusion

The shell SHALL render `#/join/<token>` — preview, accept, joined and closed
states — and the unusable-invitation state full-screen without the bottom dock,
so an invited guest is not shown in-app navigation before joining. Today's
identity scaffold bar SHALL be retained on these screens, and the join flow
SHALL behave exactly as before this change.

#### Scenario: A valid invitation opens full-screen without the dock

- **WHEN** an invited guest opens `#/join/<token>` with a valid token
- **THEN** the join preview renders full-screen without the bottom dock
- **AND** the identity scaffold bar is retained as today
- **AND** preview, accept, joined and closed behavior is unchanged

#### Scenario: An unusable link stays full-screen without the dock

- **WHEN** a guest opens `#/join/<token>` with a token that refers to no
  invitation
- **THEN** the generic unusable surface renders full-screen without the dock
- **AND** no private trip data and no in-app navigation are shown
