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
