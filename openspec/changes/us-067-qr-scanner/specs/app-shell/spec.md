# Spec Delta

## MODIFIED Requirements

### Requirement: Mobile shell frame

The frontend SHALL render every in-app route inside a centered column at most
430 px wide and 100 dvh tall, with the page content scrolling above a fixed
bottom dock and safe-area padding applied. The shell SHALL use the tokens and
component language of `ui-design-reference` (the existing `app.css` token set).
The identity switcher SHALL remain available in the shell, labeled as a
scaffold (非登录), and SHALL continue to set `X-User-Id` on every request. The
scanner surface `#/scan` SHALL be a full-screen flow: it SHALL render outside
the shell column without the bottom dock, SHALL keep the identity scaffold bar
visible, and SHALL NOT be associated with any bottom-dock tab. Closing the
scanner SHALL return to the route it was opened from, with that route's tab
still active, falling back to `#/` when no in-app history exists. The shell
SHALL NOT add or change any backend endpoint, migration or database state, and
SHALL NOT change create validation, trip-details permission, invitation panel
or join flow behavior.

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

#### Scenario: The scanner renders full-screen without the dock

- **WHEN** the traveler opens `#/scan`
- **THEN** the scanner fills the viewport without the shell column constraint
  or the bottom dock
- **AND** the identity scaffold bar remains visible
- **AND** no bottom-dock tab is highlighted while the scanner is open

#### Scenario: Closing the scanner restores the originating route

- **WHEN** the traveler opens `#/scan` from `#/trips/<id>` and closes the
  scanner
- **THEN** the app returns to `#/trips/<id>` with the 行程 tab active
- **AND** opening `#/scan` with no in-app history falls back to `#/` with the
  仪表盘 tab active
