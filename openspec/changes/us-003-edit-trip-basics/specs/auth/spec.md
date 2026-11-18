# Spec Delta

## MODIFIED Requirements

### Requirement: Account profile and display name

`GET /api/auth/me` SHALL keep returning the authenticated account projection
`{id, name, email}` without password or hash. The system SHALL expose
`PATCH /api/auth/me` for the authenticated account holder to update their own
display name. The endpoint SHALL require an authenticated session and a valid
CSRF token and SHALL take the target account only from the session principal; no
request body or path SHALL select another account. The submitted name SHALL be
trimmed and SHALL contain 1–30 characters; a blank, whitespace-only or
over-length trimmed name SHALL return `400` with the flat error body
`code = INVALID_NAME` (a malformed request body uses `INVALID_REQUEST`) and
SHALL leave the stored name unchanged. A successful update SHALL return `200` with the
updated `{id, name, email}`. The new display name SHALL be used by every surface
that renders that account's name — including My Account, the dashboard greeting,
member lists, invitation identity, preferences and route or group labels — and
avatar initials where an avatar is rendered. The dashboard greeting SHALL use
the account name and SHALL NOT append an organizer label; organizer badges SHALL
still describe the trip role. Renaming SHALL NOT change the account id,
memberships, organizer role, group assignments or other members' names, and
membership checks SHALL continue to use the account id. A failed update SHALL
keep the previously saved name and show a recoverable error. My Account SHALL
render inside the shell with the 我的 tab active and SHALL require
authentication; a signed-out attempt SHALL open the login page or return
`401 USER_REQUIRED` without profile data. My Account SHALL show a back action
and the 我的 title, a profile header with the account's initial avatar, display
name and email, an edit-name icon button beside the display name, and an
outlined 退出登录 action. The page SHALL NOT render a persistent name form: the
name input, a primary 保存 action and a 取消 action SHALL appear only while the
name editor is open. Opening the editor SHALL prefill the saved name. 保存
SHALL apply the same 1–30 character validation and submit the same
`PATCH /api/auth/me` request; on success the editor SHALL collapse and the
profile header SHALL show the new name; on failure the editor SHALL stay open
and show the recoverable error. 取消 SHALL discard unsaved input and collapse
the editor without sending any request.

#### Scenario: Read own profile

- **GIVEN** a signed-in traveler
- **WHEN** they call `GET /api/auth/me`
- **THEN** the response is 200 with `{id, name, email}`
- **AND** it contains no password or password hash

#### Scenario: Update the display name with a trimmed valid value

- **GIVEN** a signed-in traveler named `Nina`
- **WHEN** they submit `PATCH /api/auth/me` with `{"name":"  Nina Chen  "}` and a
  valid CSRF token
- **THEN** the response is 200 with name `Nina Chen`
- **AND** `app_user.display_name` for that account is `Nina Chen`
- **AND** a later `GET /api/auth/me` and a fresh login return `Nina Chen`

#### Scenario: Reject a blank or over-length name

- **GIVEN** a signed-in traveler with a saved display name
- **WHEN** they submit an empty string, a whitespace-only value or a 31-character
  trimmed name
- **THEN** the response is 400 with a flat `{code, message}` naming the name rule
- **AND** the stored name and every rendered name remain unchanged

#### Scenario: The new name applies to every display

- **GIVEN** a traveler with trips, invitations, preferences, route/group labels
  and an avatar initial
- **WHEN** they successfully change their display name
- **THEN** My Account, the dashboard greeting, member lists, invitation
  identity, preferences and route/group labels show the new name
- **AND** the avatar initial, where an avatar is rendered, is derived from the
  new name
- **AND** the dashboard greeting does not append an organizer label

#### Scenario: Account identity and memberships are unchanged by a rename

- **GIVEN** an account with memberships, organizer roles and group assignments
- **WHEN** its display name changes
- **THEN** the account id, memberships, organizer roles, group assignments and
  other members' names are unchanged
- **AND** duplicate-membership checks still use the account id

#### Scenario: Another account cannot be edited

- **GIVEN** Nina is signed in and Alice has a separate account
- **WHEN** Nina sends a name update that names Alice in the body or path
- **THEN** no request can target Alice's account
- **AND** only Nina's own account can change, and Alice's profile is unchanged

#### Scenario: A failed update keeps the previous name

- **GIVEN** a saved display name and a failing persistence layer
- **WHEN** the traveler submits a new name
- **THEN** a recoverable error is shown
- **AND** the stored name and every rendered name keep the previous value

#### Scenario: My Account matches the profile layout

- **GIVEN** a signed-in traveler
- **WHEN** they open My Account
- **THEN** the page shows a back action and the 我的 title
- **AND** the profile header shows the account's initial avatar, display name
  and email
- **AND** an edit-name icon button is present beside the display name
- **AND** no persistent name input or 保存名字 form is rendered while the editor
  is closed
- **AND** an outlined 退出登录 action is present
- **AND** the bottom dock keeps 我的 active

#### Scenario: Opening the name editor prefills the saved name

- **GIVEN** a signed-in traveler on My Account with the editor closed
- **WHEN** they activate the edit-name button
- **THEN** a name input appears prefilled with the saved display name
- **AND** a primary 保存 action and a 取消 action appear
- **AND** no request is sent by opening the editor

#### Scenario: Saving a valid name collapses the editor

- **GIVEN** the name editor is open with a valid changed name
- **WHEN** the traveler activates 保存 and the update succeeds
- **THEN** the editor collapses back to the profile header
- **AND** the header shows the new name and the avatar initial derives from it

#### Scenario: Cancelling discards the draft

- **GIVEN** the name editor is open with unsaved input
- **WHEN** the traveler activates 取消
- **THEN** the editor collapses without sending any request
- **AND** the profile header keeps the saved name

#### Scenario: A failed save keeps the editor open

- **GIVEN** the name editor is open
- **WHEN** the traveler activates 保存 and the update fails validation or the
  server is unreachable
- **THEN** the recoverable error is shown inside the editor
- **AND** the editor stays open with the entered value
- **AND** the saved name is unchanged

#### Scenario: My Account requires authentication

- **WHEN** a signed-out traveler opens `#/account` or `/account`
- **THEN** the login page opens without profile data
- **AND** `PATCH /api/auth/me` without a session returns 401 `USER_REQUIRED`