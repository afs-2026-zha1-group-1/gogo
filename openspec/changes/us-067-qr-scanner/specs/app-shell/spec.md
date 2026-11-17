# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every signed-in in-app route inside a centered column
at most 430 px wide and 100 dvh tall, with the page content scrolling above a
fixed bottom dock and safe-area padding applied. The shell SHALL use the tokens
and component language of `ui-design-reference` (the existing `app.css` token
set). The shell SHALL NOT render a shell-wide identity bar, an identity switcher,
a seeded-user list or a top-right profile shortcut. The authenticated account's
display name SHALL be shown on My Account and in the dashboard greeting, and
account actions SHALL exist only on My Account. The login page, the registration
page, guest join surfaces and the trip invitation page at
`#/trips/<id>/invitation` SHALL render outside the shell without the dock. The
shell itself SHALL NOT change create validation, trip-details permission,
invitation issuance or join behavior, or main-plan behavior; authentication and
session ownership belong to the `auth` capability. The scanner surface `#/scan`
SHALL be a full-screen flow: it SHALL render outside the shell column without
the bottom dock and SHALL NOT be associated with any bottom-dock tab. Closing
the scanner SHALL return to `#/` with the 仪表盘 tab active regardless of the
originating route (2026-11-17 revision supersedes restore-origin).

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

#### Scenario: The invitation page renders full-screen without the dock

- **WHEN** an authenticated member opens `#/trips/<id>/invitation`
- **THEN** the invitation page renders outside the shell without the bottom
  dock
- **AND** a back control returns to the same trip's detail page inside the shell

#### Scenario: Existing contracts are unchanged

- **WHEN** create validation, trip-details permission, invitation issuance, the
  join flow and main-plan outcomes are exercised under the shell
- **THEN** they behave exactly as before this change
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
