# Spec Delta

## MODIFIED Requirements

### Requirement: Guest join exclusion

The shell SHALL render the login page and `#/join/<token>` — preview, accept,
joined and closed states — and the unusable-invitation state full-screen without
the bottom dock, so a guest is not shown in-app navigation before joining. The
invitation preview SHALL stay public. Acceptance SHALL require an authenticated
session: a signed-out guest who acts on the preview SHALL be sent to login, the
same preview SHALL resume after login, and no membership SHALL be created until
the guest explicitly accepts. After acceptance succeeds, the joined state SHALL
offer a primary 进入行程 action targeting `#/trips/<id>` for the accepted trip
and SHALL keep 返回首页 as a secondary action. The previous identity scaffold bar
SHALL NOT be rendered, and join outcomes SHALL otherwise behave exactly as
before this change.

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

#### Scenario: Joined state opens the accepted trip

- **WHEN** a guest acceptance succeeds and the joined state renders
- **THEN** the primary action is 进入行程
- **AND** activating it opens `#/trips/<id>` for the accepted trip
- **AND** 返回首页 remains available as a secondary action

## ADDED Requirements

### Requirement: Trip-context return links

The split start screen SHALL provide a back action that returns to the trip
details at `#/trips/<id>` for its trip, and the main plan screen SHALL return to
the same trip details route from its back action. Returning through either link
SHALL re-establish the resolved trip context so trip-scoped shell entries keep
resolving that trip. These return actions SHALL use explicit in-app routes and
SHALL NOT depend on the browser history length.

#### Scenario: Split start back returns to the trip details

- **WHEN** a member opens `/trips/<id>/split` from the trip details and
  activates the back action
- **THEN** the app renders the trip details for `<id>` under the shell
- **AND** the resolved trip is `<id>` for subsequent 成员 and 分队 entries

#### Scenario: Direct split entry back does not fall to home

- **WHEN** a signed-in member opens `/trips/<id>/split` directly and activates
  the back action
- **THEN** the app renders the trip details for `<id>`
- **AND** the dashboard is not rendered

#### Scenario: Main plan back returns to the trip details

- **WHEN** a member opens `#/trips/<id>/main-plan` from the trip details and
  activates the back action
- **THEN** the app renders the trip details for `<id>`

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
