# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every signed-in in-app route inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the tokens
and component language of `ui-design-reference` (the existing `app.css` token
set). The shell SHALL show the authenticated account's display name read-only
and SHALL NOT expose an identity switcher, seeded-user list or account actions.
The login page and guest join surfaces SHALL render outside the shell without the
dock. The shell itself SHALL NOT change create validation, trip-details
permission, invitation panel or join behavior, or main-plan behavior;
authentication and session ownership belong to the `auth` capability.

#### Scenario: An in-app route renders inside the frame

- **WHEN** any of `#/`, the no-trip 行程 route, `#/trips/<id>`, `#/create`,
  `#/split` or `#/members` renders for an authenticated traveler
- **THEN** the content is inside a centered column at most 430 px wide and
  100 dvh tall
- **AND** the bottom dock is fixed below the scrolling content with safe-area
  padding
- **AND** the dock does not obscure the page content or the home create entry

#### Scenario: The identity switcher stays a scaffold in the shell

- **WHEN** an authenticated traveler views any shell page
- **THEN** no identity switcher or scaffold bar is present
- **AND** the account's display name is shown read-only

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, the invitation panel, the
  join flow and main-plan outcomes are exercised under the shell
- **THEN** they behave exactly as before this change
- **AND** the shell itself adds no trip, invitation or main-plan state

### Requirement: Bottom dock navigation

The shell SHALL show a bottom dock with exactly four tabs in the order
仪表盘 / 行程 / 分队 / 成员, each with an icon and a text label. The active tab
SHALL be visibly highlighted according to the current route: home → 仪表盘;
the no-trip 行程 route, `#/trips/<id>` and `#/create` → 行程; `#/split` → 分队;
`#/members` → 成员. Activating a tab SHALL update the hash route without a full
page reload and SHALL keep the authenticated account. Browser back/forward SHALL
follow the tab history without losing the authenticated account. Every tab page
SHALL carry a unique visible heading or state so a text-only forward and reverse
walk can identify each page.

#### Scenario: The dock shows four ordered tabs with an active highlight

- **WHEN** the shell renders on any signed-in in-app route
- **THEN** the dock shows 仪表盘, 行程, 分队, 成员 in that order, each with an
  icon and a text label
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

- **WHEN** the tabs are activated in order 仪表盘 → 行程 → 分队 → 成员 and then
  in reverse, recording the visible heading or state each time
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
and the read-only account name — SHALL render under the shell with 仪表盘
active. No dashboard status aggregation is added by this change. A signed-out
visitor SHALL be sent to the login page before this route renders.

#### Scenario: The default route shows the existing home under the shell

- **WHEN** an authenticated traveler opens the default route `#/`
- **THEN** the home content (greeting status, create entry, read-only account
  name) renders inside the shell
- **AND** the 仪表盘 tab is active

#### Scenario: A signed-out visitor is sent to login first

- **WHEN** a signed-out visitor opens `#/`
- **THEN** the login page opens before any dashboard or account content renders

#### Scenario: No aggregation is introduced

- **WHEN** the 仪表盘 page renders
- **THEN** it shows only the existing home content
- **AND** no trip-status aggregation or list-all-trips data is displayed

### Requirement: Guest join exclusion

The shell SHALL render the login page and `#/join/<token>` — preview, accept,
joined and closed states — and the unusable-invitation state full-screen without
the bottom dock, so a guest is not shown in-app navigation before joining. The
invitation preview SHALL stay public. Acceptance SHALL require an authenticated
session: a signed-out guest who acts on the preview SHALL be sent to login, the
same preview SHALL resume after login, and no membership SHALL be created until
the guest explicitly accepts. The previous identity scaffold bar SHALL NOT be
rendered, and join outcomes SHALL behave exactly as before this change.

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
