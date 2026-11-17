# app-shell Specification

## Purpose
Give every signed-in in-app route one mobile-scaled shell with a persistent
bottom dock (仪表盘 / 行程 / 分队 / 成员 / 我的) so a traveler moves between the
main areas, including My Account, without losing context or identity. The shell
no longer carries a top-right identity or profile shortcut: the account name is
shown on My Account and in the dashboard greeting. Existing home, create,
details and invitation behavior stays under the shell unchanged, future areas
stay honest text placeholders, and login, registration and invited guests
joining by link render full-screen without in-app navigation.

## Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every signed-in in-app route inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the tokens
and component language of `ui-design-reference` (the existing `app.css` token
set). The shell SHALL NOT render a shell-wide identity bar, an identity switcher,
a seeded-user list or a top-right profile shortcut. The authenticated account's
display name SHALL be shown on My Account and in the dashboard greeting, and
account actions SHALL exist only on My Account. The login page, the registration
page and guest join surfaces SHALL render outside the shell without the dock.
The shell itself SHALL NOT change create validation, trip-details permission,
invitation panel or join behavior, or main-plan behavior; authentication and
session ownership belong to the `auth` capability.

#### Scenario: An in-app route renders inside the frame

- **WHEN** any of `#/`, the no-trip 行程 route, `#/trips/<id>`, `#/create`,
  `#/split`, `#/members` or `#/account` renders for an authenticated traveler
- **THEN** the content is inside a centered column at most 430 px wide and
  100 dvh tall
- **AND** the bottom dock is fixed below the scrolling content with safe-area
  padding
- **AND** the dock does not obscure the page content or the home create entry

#### Scenario: No shell-wide identity bar or profile shortcut


- **WHEN** an authenticated traveler views any shell page
- **THEN** no identity switcher, scaffold bar or top-right profile shortcut is
  present
- **AND** the account display name is shown on My Account and in the dashboard
  greeting
- **AND** account actions (edit name, logout) exist only on My Account

#### Scenario: My Account renders inside the shell

- **WHEN** a signed-in traveler opens `#/account`
- **THEN** My Account renders inside the shell with the 我的 tab active
- **AND** the dock and safe-area padding remain available

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, the invitation panel, the
  join flow and main-plan outcomes are exercised under the shell
- **THEN** they behave exactly as before this change
- **AND** the shell itself adds no trip, invitation or main-plan state

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly five tabs in the order
仪表盘 / 行程 / 分队 / 成员 / 我的, each with an icon and a text label. The active
tab SHALL be visibly highlighted according to the current route: home → 仪表盘;
the no-trip 行程 route, `#/trips/<id>` and `#/create` → 行程; `#/split` → 分队;
`#/members` → 成员; `#/account` → 我的. Activating a tab SHALL update the hash
route without a full page reload and SHALL keep the authenticated account.
Browser back/forward SHALL follow the tab history without losing the
authenticated account. Every tab page SHALL carry a unique visible heading or
state so a text-only forward and reverse walk can identify each page.

#### Scenario: The dock shows five ordered tabs with an active highlight


- **WHEN** the shell renders on any signed-in in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员, 我的 in that order, each with
  an icon and a text label
- **AND** exactly the tab owning the current route is visibly highlighted

#### Scenario: Tab switching updates the hash without reload and keeps identity

- **WHEN** a traveler authenticated as Alice activates a different dock tab
- **THEN** the hash route changes to that tab's target without a full page reload
- **AND** the authenticated account is still Alice
- **AND** the newly active tab is highlighted

#### Scenario: Create belongs to the 行程 tab

- **WHEN** the route is `#/create`
- **THEN** the 行程 tab is highlighted
- **AND** the create form and its validation render under the shell unchanged

#### Scenario: Text-only forward and reverse walk identifies every page

- **WHEN** the tabs are activated in order 仪表盘 → 行程 → 分队 → 成员 → 我的 and
  then in reverse, recording the visible heading or state each time
- **THEN** every activation yields a unique visible heading or state
- **AND** every page is reachable in both directions without screenshots or
  demo data

#### Scenario: Browser back/forward follows tab history

- **WHEN** the traveler switches tabs and then uses browser back and forward
- **THEN** the route and active tab follow the tab history
- **AND** the authenticated account is unchanged throughout

### Requirement: Dashboard tab placement

The 仪表盘 tab SHALL target `#/`, which SHALL be the default route for an
authenticated traveler. The existing home content — greeting status, create entry
and a personalized greeting using the authenticated account's display name —
SHALL render under the shell with 仪表盘 active. The greeting SHALL NOT use a
hard-coded name and SHALL NOT append an organizer label; organizer badges SHALL
remain where they describe a trip role. No top-right profile shortcut SHALL be
rendered; the information control SHALL remain available and any scan control
provided by another capability SHALL not be obscured. No dashboard status
aggregation is added by this change. A signed-out visitor SHALL be sent to the
login page before this route renders.

#### Scenario: The default route shows the existing home under the shell

- **WHEN** an authenticated traveler opens the default route `#/`
- **THEN** the home content (greeting status, create entry and account-name
  greeting) renders inside the shell
- **AND** the 仪表盘 tab is active

#### Scenario: The greeting uses the account name without an organizer label

- **GIVEN** an authenticated traveler whose display name is `Nina` and who
  organizes a trip
- **WHEN** the 仪表盘 page renders
- **THEN** the greeting shows `Nina`
- **AND** it does not append 组织者
- **AND** organizer badges remain on the trip surfaces that describe that role

#### Scenario: A signed-out visitor is sent to login first

- **WHEN** a signed-out visitor opens `#/`
- **THEN** the login page opens before any dashboard or account content renders

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

### Requirement: Guest join exclusion

The shell SHALL render the login page, the registration page and
`#/join/<token>` — preview, accept, joined and closed states — and the
unusable-invitation state full-screen without the bottom dock, so a guest is not
shown in-app navigation before joining. The invitation preview SHALL stay
public. Acceptance SHALL require an authenticated session: a signed-out guest
who acts on the preview SHALL be sent to login, the same preview SHALL resume
after login, and no membership SHALL be created until the guest explicitly
accepts. A signed-out guest MAY register an account instead of logging in; the
pending invitation SHALL survive registration and resume after the subsequent
login without automatically joining. The previous identity scaffold bar SHALL
NOT be rendered, and join outcomes SHALL behave exactly as before this change.

#### Scenario: A valid invitation opens full-screen without the dock

- **WHEN** a guest opens `#/join/<token>` with a valid token
- **THEN** the join preview renders full-screen without the bottom dock
- **AND** no identity switcher or scaffold bar is rendered
- **AND** preview, accept, joined and closed outcomes keep their contracts

#### Scenario: An unusable link stays full-screen without the dock

- **WHEN** a guest opens `#/join/<token>` with a token that refers to no
  invitation
- **THEN** the generic unusable surface renders full-screen without the dock
- **AND** no private trip data and no in-app navigation are shown

#### Scenario: Accepting while signed out resumes the preview after login

- **WHEN** a signed-out guest acts on a valid invitation preview
- **THEN** the login page opens full-screen without the dock
- **AND** after successful login the same `#/join/<token>` preview resumes
- **AND** no membership is created until the guest explicitly accepts

#### Scenario: The login page has no dock

- **WHEN** the login page renders
- **THEN** it is full-screen without the bottom dock
- **AND** it exposes no in-app navigation or private trip data

#### Scenario: The registration page has no dock

- **WHEN** the registration page renders from the login page
- **THEN** it is full-screen without the bottom dock
- **AND** it exposes no in-app navigation or private trip data

#### Scenario: Registration during an invitation resumes the preview after login

- **GIVEN** a signed-out guest opened a valid invitation preview and chose to
  register
- **WHEN** registration succeeds and the guest then logs in
- **THEN** registration establishes no session and consumes no invitation
- **AND** after login the same `#/join/<token>` preview resumes
- **AND** no membership is created until the guest explicitly accepts

### Requirement: Tab content

The 分队 tab SHALL target `#/split` and render the shipped split entry for the
selected trip, with a unique heading and guidance back to 行程 when no trip is
selected. The 成员 tab SHALL target `#/members` and render the roster defined by
the `trips` requirement "Trip member list read". Neither tab SHALL render a
not-implemented placeholder or fabricate demo data; the shell frame, dock
order, active-tab rule and signed-in account bar SHALL remain unchanged.

#### Scenario: 分队 shows the shipped split entry

- **WHEN** the 分队 tab is activated with a resolved trip
- **THEN** `#/split` renders the shipped split entry for that trip with a unique
  visible heading
- **AND** the 分队 tab is active
- **AND** no not-implemented placeholder is rendered

#### Scenario: 成员 shows the member list

- **WHEN** the 成员 tab is activated with a resolved trip and an authenticated
  account that is a member of that trip
- **THEN** `#/members` renders the trip's member roster with the organizer row
  identified
- **AND** the 成员 tab is active
- **AND** the roster comes from `GET /api/trips/{id}/members`
- **AND** no readiness, preference summary or generate action is rendered

#### Scenario: No demo data is fabricated

- **WHEN** either tab renders
- **THEN** no demo member, route or status value is displayed
- **AND** an outsider sees the permission-denied state with no member names
