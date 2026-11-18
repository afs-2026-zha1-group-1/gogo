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

The frontend SHALL render shell-hosted signed-in routes inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the
project's existing UI component language and tokens. The shell SHALL NOT expose
a shell-wide identity bar, identity switcher, seeded-user list or top-right
profile shortcut. The authenticated account's display name SHALL be shown on
My Account and in the dashboard greeting; account actions SHALL remain on My
Account. Login, registration, guest join, scanner, preferences and
invitation-only surfaces SHALL render outside the shell without the dock. The
scanner surface `#/scan` SHALL be a full-screen flow: it SHALL render outside
the shell column without the bottom dock and SHALL NOT be associated with any
bottom-dock tab. Closing the scanner SHALL return to `#/` with the 仪表盘 tab
active regardless of the originating route. The shell itself
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

#### Scenario: The scanner renders full-screen without the dock

- **WHEN** the traveler opens `#/scan`
- **THEN** the scanner fills the viewport without the shell column constraint
  or the bottom dock
- **AND** no bottom-dock tab is highlighted while the scanner is open

#### Scenario: Closing the scanner returns to the home page

- **WHEN** the traveler closes the scanner from any originating route
  (including `#/trips/<id>` or a direct `#/scan` visit)
- **THEN** the app lands on `#/` with the 仪表盘 tab active
- **AND** no originating-route restore state is kept (2026-11-17 user ruling
  supersedes the restore-origin design D2 / S-5)

#### Scenario: The dashboard exposes the scanner entry

- **WHEN** the traveler is on the Home `我的行程` dashboard
- **THEN** the app bar shows a scan entry button to the right of the title
- **AND** activating it opens the full-screen `#/scan` flow without adding any
  backend call or permission gate of its own

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
login without automatically joining. After acceptance succeeds, the joined state
SHALL offer a primary 进入行程 action targeting `#/trips/<id>` for the accepted
trip and SHALL keep 返回首页 as a secondary action. The previous identity
scaffold bar SHALL NOT be rendered, and join outcomes SHALL otherwise behave
exactly as before this change.

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

#### Scenario: Joined state opens the accepted trip

- **WHEN** a guest acceptance succeeds and the joined state renders
- **THEN** the primary action is 进入行程
- **AND** activating it opens `#/trips/<id>` for the accepted trip
- **AND** 返回首页 remains available as a secondary action

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

### Requirement: Auth deep-link resume and route consistency

Protected in-app routes SHALL send a signed-out visitor to the login page with
the attempted in-app route preserved, and a successful login SHALL resume that
route unless a pending invitation takes precedence. Only same-origin in-app
paths SHALL be resumed; any other preserved value SHALL fall back to the default
route. The login and register pages SHALL link to each other through the
`/login` and `/register` routes.

#### Scenario: Signed-out split deep link resumes after login

- **WHEN** a signed-out visitor opens `/trips/<id>/split/boundaries` directly
- **THEN** the login page opens
- **AND** after successful login the boundaries screen for `<id>` renders

#### Scenario: Pending invitation takes precedence

- **WHEN** a signed-out guest acts on a valid invitation preview and logs in
- **THEN** the same `#/join/<token>` preview resumes instead of any preserved
  split route

#### Scenario: Unsafe resume value is rejected

- **WHEN** the preserved route value is not a same-origin in-app path
- **THEN** login falls back to the default route
- **AND** no external URL is opened

#### Scenario: Auth pages link through router routes

- **WHEN** a traveler activates 创建账号 on the login page or the back and
  去登录 actions on the register page
- **THEN** the app opens `/register` or `/login` respectively

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
