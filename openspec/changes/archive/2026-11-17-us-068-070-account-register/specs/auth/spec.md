# Spec Delta

## Purpose

Provide verified account access from sign-up through sign-out: a signed-out
traveler can register an account from the login page without email verification;
a signed-in traveler can read their profile, update their display name and log
out from My Account; every protected surface still derives the caller from the
server-side session. A duplicate email returns `409 EMAIL_TAKEN` and the
registration page shows a duplicate-email dialog, per the user's 2026-11-17
direction (replacing the earlier non-disclosure response). Logout ends only the
current session and leaves the account, name, memberships and shared trip data
intact.

## ADDED Requirements

### Requirement: Account registration

The system SHALL expose `POST /api/auth/register` for a signed-out traveler to
create one account from `{email, name, password}`. The endpoint SHALL be
reachable without a session and SHALL require a valid CSRF token like every
other state-changing request. The email SHALL be trimmed and compared
case-insensitively, SHALL match a basic email format and SHALL be unique. The
display name SHALL be trimmed and SHALL contain 1–30 characters. The password
SHALL contain 6–72 bytes and SHALL be stored only as a BCrypt hash; plaintext
passwords SHALL NOT be stored, logged or returned. Registration SHALL insert
exactly one `app_user` row and one `account_credential` row in a single
transaction. A successful registration SHALL return `200` with the body
`{"next":"login"}` and SHALL NOT establish a session or return an account
projection. When the email already belongs to an account — including a repeated
or concurrent submission — no second account SHALL be created and the response
SHALL be `409` with the flat error body and `code = EMAIL_TAKEN`. The
registration page SHALL show a duplicate-email dialog stating that the email is
already registered, offering a direct path to login and an option to edit the
email. A successful registration SHALL show a registration-success dialog with a
direct path to login. The traveler SHALL remain on the registration page until
they choose the login action in the dialog. The user explicitly directed this
duplicate disclosure on 2026-11-17, replacing the earlier non-disclosure
response. Invalid input SHALL return `400` with the flat
error body `{code, message}`: `INVALID_EMAIL`, `INVALID_NAME` or
`INVALID_PASSWORD` for the violated field rule, and `INVALID_REQUEST` for a
malformed request body; no account SHALL be created. A persistence failure
SHALL roll back both rows and return a `5xx` flat error; retrying SHALL NOT
create duplicates. Registration SHALL NOT require email verification and SHALL
NOT grant protected access. The frontend SHALL offer a "Create account" entry on
the login page and a full-screen registration page with name, email, password, a matching
confirmation password, a submit action and a way back to login; the registration
page SHALL render without the bottom dock. The page SHALL show the supplied
brand header and SHALL require at least 8 characters for the password while the
API accepts 6–72 bytes. A pending invitation token SHALL survive
registration and authentication SHALL resume its preview without automatically
joining the trip.

#### Scenario: Valid registration creates exactly one account

- **GIVEN** a signed-out traveler with no account for `nina@example.com`
- **WHEN** they submit email `  Nina@Example.COM  `, display name `  Nina  ` and
  a password of 6–72 bytes with a valid CSRF token
- **THEN** the response status is 200
- **AND** the body is exactly `{"next":"login"}`
- **AND** exactly one new `app_user` row with display name `Nina` and one
  `account_credential` row with email `nina@example.com` exist
- **AND** the stored password value is a BCrypt hash and the plaintext is absent
- **AND** no session is established

#### Scenario: Duplicate email shows a registration dialog

- **GIVEN** an account already exists for `alice@example.com`
- **WHEN** registration is submitted for `alice@example.com` or
  `  ALICE@Example.COM  `
- **THEN** the response status is 409 with `code` equal to `EMAIL_TAKEN`
- **AND** no second account or credential row is created
- **AND** the registration page shows a dialog stating 该邮箱已注册 with 去登录
  and 修改邮箱 actions

#### Scenario: Concurrent duplicate submissions create one account

- **GIVEN** no account exists for `nina@example.com`
- **WHEN** two registration requests for the same email are submitted
  concurrently
- **THEN** one response is 200 `{"next":"login"}` and the other is 409
  `EMAIL_TAKEN`
- **AND** exactly one account and one credential row exist

#### Scenario: Invalid input creates no account

- **GIVEN** a signed-out traveler submits a missing or malformed email, a blank
  or 31-character trimmed display name, or a password shorter than 6 or longer
  than 72 bytes
- **WHEN** the registration request is processed
- **THEN** the response status is 400 with a flat `{code, message}` naming the
  violated field rule
- **AND** no account or credential row is created
- **AND** no session or protected access is granted

#### Scenario: Registration does not sign the traveler in

- **GIVEN** a valid new registration has succeeded
- **WHEN** the traveler calls `GET /api/auth/me` without logging in
- **THEN** the response is 401 `USER_REQUIRED`
- **AND** the traveler can log in only through `POST /api/auth/login`

#### Scenario: A persistence failure leaves no partial account

- **GIVEN** the database fails while writing one of the two registration rows
- **WHEN** registration is retried
- **THEN** the failed attempt leaves neither an `app_user` nor a credential row
- **AND** a later successful retry creates exactly one account

#### Scenario: A pending invitation survives registration

- **GIVEN** a signed-out guest opened a valid `#/join/<token>` preview
- **WHEN** they register an account and then log in
- **THEN** registration establishes no session and consumes no invitation
- **AND** after login the same preview resumes
- **AND** no membership is created until the guest explicitly accepts

#### Scenario: The registration page is reachable from login

- **GIVEN** a signed-out traveler on `#/login` or `/login`
- **WHEN** they select "Create account"
- **THEN** the registration page opens at `#/register` or `/register`
- **AND** it renders full-screen without the bottom dock
- **AND** it offers a way back to login

#### Scenario: Successful registration shows a registration dialog

- **GIVEN** a valid new registration is submitted
- **WHEN** the server returns 200
- **THEN** the registration page shows a 注册成功 dialog with a 去登录 action
- **AND** no session is established until the traveler logs in

#### Scenario: The registration page asks for a matching confirmation

- **GIVEN** a signed-out traveler on the registration page with a name and email
- **WHEN** they enter a password and a different confirmation password
- **THEN** a field error is shown and no registration request is sent
- **AND** when the confirmation matches and all fields are valid, submission
  proceeds
- **AND** the page requires at least 8 characters for the password while the API
  still accepts 6–72 bytes

#### Scenario: Signed-in access to the registration page returns to the dashboard

- **WHEN** a signed-in traveler opens `#/register` or `/register`
- **THEN** the app returns to the dashboard `#/`

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
`401 USER_REQUIRED` without profile data. Following the supplied mobile
reference, My Account SHALL show a back action and the 我的 title, a profile
header with the account's initial avatar, display name and email, a 名字 field,
a primary 保存名字 action and an outlined 退出登录 action.

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
- **AND** a 名字 field, a primary 保存名字 action and an outlined 退出登录 action
  are present
- **AND** the bottom dock keeps 我的 active

#### Scenario: My Account requires authentication

- **WHEN** a signed-out traveler opens `#/account` or `/account`
- **THEN** the login page opens without profile data
- **AND** `PATCH /api/auth/me` without a session returns 401 `USER_REQUIRED`

### Requirement: Logout and session invalidation

The system SHALL expose `POST /api/auth/logout` for an authenticated traveler.
The endpoint SHALL require a valid CSRF token, SHALL invalidate the current
server-side session, SHALL clear the security context and session cookie, and
SHALL return `204` with no body. After logout, the same session identifier SHALL
NOT authenticate any request; protected pages, including My Account, SHALL
require authentication again and direct or browser-navigation access SHALL NOT
restore authorization. The frontend SHALL clear its local authentication state
and open the login page after a successful logout. Logout SHALL NOT delete or
modify the account, saved display name, trip memberships, organizer role, group
assignments or shared trip data. A logout without a valid session SHALL return
`401 USER_REQUIRED`; the frontend may treat that as already signed out but SHALL
NOT report a new successful invalidation. A logout that cannot complete SHALL
show a recoverable error and SHALL NOT falsely report that the session was
invalidated or clear local state as if it had succeeded.

#### Scenario: Logout invalidates the session

- **GIVEN** a signed-in traveler with a valid session
- **WHEN** they submit `POST /api/auth/logout` with a valid CSRF token
- **THEN** the response is 204 with no body
- **AND** `GET /api/auth/me` with the previous session returns 401
  `USER_REQUIRED`
- **AND** a protected request with the previous session returns 401 and returns
  no private data

#### Scenario: Protected pages require authentication after logout

- **GIVEN** a traveler has logged out in one tab
- **WHEN** they open `#/`, `#/trips/<id>`, `#/account` or a protected endpoint
  directly or through browser navigation
- **THEN** the login page opens or the endpoint returns 401 `USER_REQUIRED`
- **AND** no authorized access is restored

#### Scenario: Logout preserves account data

- **GIVEN** an account with a saved display name, memberships, organizer role,
  group assignments and shared trip data
- **WHEN** the traveler logs out and logs in again
- **THEN** the account, name, memberships, roles, groups and trip data are intact
- **AND** the same account identity is restored

#### Scenario: Logout without a session

- **GIVEN** no valid session or an already expired session
- **WHEN** `POST /api/auth/logout` is called
- **THEN** the response is 401 `USER_REQUIRED`
- **AND** the frontend does not claim a new successful invalidation

#### Scenario: Logout without a CSRF token

- **GIVEN** a signed-in traveler
- **WHEN** `POST /api/auth/logout` is sent without a valid CSRF token
- **THEN** the response is 403 `CSRF_INVALID`
- **AND** the session remains valid

#### Scenario: A failed logout is not reported as success

- **GIVEN** a signed-in traveler and a failing server
- **WHEN** logout cannot complete
- **THEN** a recoverable error is shown
- **AND** the app does not claim the session was invalidated
- **AND** local authentication state is not cleared as if logout succeeded

## MODIFIED Requirements

### Requirement: Account credential login

The system SHALL authenticate a seeded or registered account by email and
password through `POST /api/auth/login`. Credentials SHALL be stored only as
BCrypt hashes in `account_credential`; plaintext passwords SHALL NOT be stored,
logged or returned. Email comparison SHALL trim surrounding whitespace and
compare case-insensitively. A successful login SHALL return the account's id,
display name and email. A blank request, an unknown email and a wrong password
SHALL all produce the same 401 response with `code` equal to
`INVALID_CREDENTIALS`, without revealing whether the email exists or returning
any account, trip or membership data. Registration is defined by "Account
registration"; password change, reset and account deletion SHALL NOT be exposed.

#### Scenario: Valid credentials authenticate the account

- **WHEN** a traveler submits `alice@example.com` and the documented demo
  password for the seeded Alice account
- **THEN** the response status is 200
- **AND** the body carries `id` 1, `name` `Alice` and `email`
  `alice@example.com`
- **AND** the body carries no password or password hash
- **AND** an authenticated session is established

#### Scenario: Unknown email and wrong password are indistinguishable

- **WHEN** a login request carries an email that belongs to no account
- **AND** another login request carries a known email with a wrong password
- **THEN** both responses have status 401 and `code` equal to
  `INVALID_CREDENTIALS`
- **AND** both carry the same message and no account, trip or membership field
- **AND** neither request establishes a session

#### Scenario: Email is trimmed and compared case-insensitively

- **WHEN** a traveler submits `  Alice@Example.COM  ` with the correct password
- **THEN** the response is the same successful Alice login as the canonical
  email
- **AND** no duplicate account is created or selected

#### Scenario: Blank or malformed credentials fail generically

- **WHEN** a login request omits the email or password, or sends blank values
- **THEN** the response status is 401 with `code` equal to
  `INVALID_CREDENTIALS`
- **AND** no session is established and no account data is returned

#### Scenario: Only a BCrypt hash is stored

- **WHEN** the seeded or registered credential row for a user is inspected after
  login
- **THEN** its `password_hash` is a BCrypt hash
- **AND** the plaintext password does not appear in the row or any response

### Requirement: Server session and current account

A successful login SHALL establish a server-side HTTP session identified by an
HttpOnly cookie. The session id SHALL rotate on login so a pre-login session id
cannot authenticate. The session SHALL use a configurable idle timeout, 30
minutes by default. `GET /api/auth/me` SHALL return the authenticated account
(id, name, email) and SHALL return 401 `USER_REQUIRED` when the session is
missing, invalid or expired. Logout and session invalidation are defined by
"Logout and session invalidation".

#### Scenario: Login establishes a session that identifies the account

- **WHEN** a traveler logs in successfully
- **THEN** the response sets a session cookie
- **AND** a subsequent `GET /api/auth/me` returns the same account
- **AND** no password or password hash is returned

#### Scenario: Session id rotates on login

- **WHEN** a traveler starts from an anonymous session, then logs in
- **THEN** the session identifier after login differs from the anonymous one
- **AND** the previous identifier no longer authenticates any request

#### Scenario: An expired session is unauthenticated

- **WHEN** the configured idle timeout elapses for a session
- **THEN** `GET /api/auth/me` returns 401 `USER_REQUIRED`
- **AND** protected requests return 401 `USER_REQUIRED` without private data
- **AND** a fresh login restores access

#### Scenario: A missing or unknown session cookie is unauthenticated

- **WHEN** `GET /api/auth/me` is called without a session cookie or with an
  unknown one
- **THEN** the response status is 401
- **AND** the body carries `code` equal to `USER_REQUIRED`
- **AND** no account data is returned

### Requirement: Protected request identity and public surfaces

Every non-public endpoint SHALL require an authenticated session and SHALL derive
the caller from the session principal. The legacy `X-User-Id` header SHALL NOT
authenticate any request. An unauthenticated or expired request SHALL return 401
`USER_REQUIRED` without private data or state change, except the `splits`
endpoints, which keep their documented 401 `MEMBER_REQUIRED` outcome and
`{data,error}` envelope (see "Error response shape and split identity
exception"). Authentication SHALL prove identity only; trip membership and
organizer rules SHALL remain unchanged. The login endpoint, the registration
endpoint, CSRF bootstrap, `GET /api/greeting`, the login and registration pages,
and `GET /api/invitations/{token}` preview SHALL remain accessible without a
session. The account profile endpoints and logout SHALL require a session.

#### Scenario: A protected endpoint rejects an unauthenticated caller

- **WHEN** a request to a protected trip, invitation, main-plan or account
  endpoint is sent without a session
- **THEN** the response status is 401 with `code` equal to `USER_REQUIRED`
- **AND** no private data is returned and no state is written

#### Scenario: The legacy header alone does not authenticate

- **WHEN** a protected endpoint is called with an `X-User-Id` header but no
  session
- **THEN** the response is the same 401 `USER_REQUIRED` as without the header
- **AND** the header is ignored as an identity source

#### Scenario: Authenticated identity drives existing authorization

- **WHEN** Alice, Ben and Eve are logged in and exercise trip creation, trip
  details, invitation issuance and acceptance
- **THEN** Alice is recorded as organizer on create
- **AND** Ben reads the trip with 200
- **AND** Eve reads it with 403 `NOT_A_MEMBER`
- **AND** only Alice can issue the invitation
- **AND** Eve's accept creates one membership and her next read returns 200

#### Scenario: Public surfaces stay available without a session

- **WHEN** `GET /api/greeting`, `POST /api/auth/register`,
  `GET /api/invitations/{token}` or the CSRF bootstrap is called without a
  session
- **THEN** the response succeeds as before (registration still requires CSRF)
- **AND** the invitation preview carries only its public basics and no member,
  itinerary or preference data

#### Scenario: Main-plan endpoints are protected like other trip endpoints

- **WHEN** a main-plan read, generate or confirm request is sent without a
  session
- **THEN** the response is 401 `USER_REQUIRED` with no plan data
- **AND** an authenticated member or organizer sees exactly today's outcomes

#### Scenario: Splits endpoints use session identity with their documented exception

- **WHEN** a split endpoint is called without a valid session
- **THEN** the response is 401 with `code` equal to `MEMBER_REQUIRED` and the
  splits `{data,error}` envelope, as documented in the splits delta
- **AND** an authenticated split member sees exactly today's outcomes
