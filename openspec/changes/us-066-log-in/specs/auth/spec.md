# Spec Delta

## Purpose

Provide verified account login and a server-side session so every protected trip
surface is accessed under an authenticated identity, with CSRF protection and a
login page that resumes a pending invitation without joining it.

## ADDED Requirements

### Requirement: Account credential login

The system SHALL authenticate a seeded account by email and password through
`POST /api/auth/login`. Credentials SHALL be stored only as BCrypt hashes in
`account_credential`; plaintext passwords SHALL NOT be stored, logged or
returned. Email comparison SHALL trim surrounding whitespace and compare
case-insensitively. A successful login SHALL return the account's id, display
name and email. A blank request, an unknown email and a wrong password SHALL all
produce the same 401 response with `code` equal to `INVALID_CREDENTIALS`, without
revealing whether the email exists or returning any account, trip or membership
data. Registration, password change, reset and account creation SHALL NOT be
exposed by this change.

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

- **WHEN** the seeded credential row for a user is inspected after login
- **THEN** its `password_hash` is a BCrypt hash
- **AND** the plaintext demo password does not appear in the row or any
  response

### Requirement: Server session and current account

A successful login SHALL establish a server-side HTTP session identified by an
HttpOnly cookie. The session id SHALL rotate on login so a pre-login session id
cannot authenticate. The session SHALL use a configurable idle timeout, 30
minutes by default. `GET /api/auth/me` SHALL return the authenticated account
(id, name, email) and SHALL return 401 `USER_REQUIRED` when the session is
missing, invalid or expired. Logout and session-invalidation endpoints belong to
US-069 and SHALL NOT be added here.

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
`USER_REQUIRED` without private data or state change. Authentication SHALL prove
identity only; trip membership and organizer rules SHALL remain unchanged. The
login endpoint, CSRF bootstrap, `GET /api/greeting` and
`GET /api/invitations/{token}` preview SHALL remain accessible without a
session.

#### Scenario: A protected endpoint rejects an unauthenticated caller

- **WHEN** a request to a protected trip, invitation or main-plan endpoint is
  sent without a session
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

- **WHEN** `GET /api/greeting`, `GET /api/invitations/{token}` or the CSRF
  bootstrap is called without a session
- **THEN** the response succeeds as before
- **AND** the invitation preview carries only its public basics and no member,
  itinerary or preference data

#### Scenario: Main-plan endpoints are protected like other trip endpoints

- **WHEN** a main-plan read, generate or confirm request is sent without a
  session
- **THEN** the response is 401 `USER_REQUIRED` with no plan data
- **AND** an authenticated member or organizer sees exactly today's outcomes

### Requirement: CSRF protection

State-changing requests (POST, PUT, PATCH, DELETE) SHALL require a CSRF token
bound to the session. The SPA SHALL obtain the token from a public bootstrap
endpoint and send it in the `X-XSRF-TOKEN` header. A missing or invalid token
SHALL return 403 with `code` equal to `CSRF_INVALID` and SHALL change no state.
GET requests SHALL NOT require the token. The login POST SHALL be CSRF-protected
like every other state-changing request.

#### Scenario: The SPA obtains a CSRF token

- **WHEN** the SPA calls the CSRF bootstrap endpoint
- **THEN** the response provides the token to the same origin
- **AND** no account or trip data is exposed

#### Scenario: A state-changing request without a token is rejected

- **WHEN** a POST is sent without the CSRF token
- **THEN** the response status is 403 with `code` equal to `CSRF_INVALID`
- **AND** no trip, invitation or membership state changes

#### Scenario: A state-changing request with a valid token succeeds

- **WHEN** the same POST is sent with the token obtained from bootstrap
- **THEN** the request proceeds with its normal success or validation outcome

#### Scenario: A GET does not require a token

- **WHEN** a public or authenticated GET is sent without the CSRF token
- **THEN** it proceeds normally

### Requirement: Login page and post-login resume

The frontend SHALL provide a dedicated `#/login` page rendered full-screen
without the bottom dock. A signed-out traveler who opens a protected page SHALL
be sent to the login page without seeing private data. A successful login SHALL
open the dashboard `#/` when no invitation is pending. When a signed-out guest
acts on an invitation preview, the invitation token SHALL be retained; after
login the same `#/join/<token>` preview SHALL resume without automatically
joining, and acceptance SHALL remain explicit. Invalid credentials SHALL show a
generic error and leave the traveler on the login page. Already-signed-in access
to `#/login` SHALL return to the dashboard.

#### Scenario: A signed-out protected page opens the login page

- **WHEN** a signed-out traveler opens `#/trips/<id>`, `#/create` or another
  protected page
- **THEN** the login page opens
- **AND** no trip, member, invitation or account data is rendered

#### Scenario: Successful login opens the dashboard

- **WHEN** a signed-out traveler with no pending invitation logs in successfully
- **THEN** the dashboard `#/` opens with the shell and dock
- **AND** the authenticated account name is shown read-only

#### Scenario: A pending invitation resumes without joining

- **WHEN** a signed-out guest opens a valid `#/join/<token>` preview and acts on
  it
- **THEN** the login page opens and the invitation token is retained
- **AND** after successful login the same preview resumes
- **AND** no membership is created until the guest explicitly accepts

#### Scenario: Invalid credentials show a generic error

- **WHEN** login fails
- **THEN** the login page shows one generic credential error
- **AND** no account, trip or membership data is shown
- **AND** the traveler remains on the login page

#### Scenario: Already-signed-in access to the login page returns to the dashboard

- **WHEN** a signed-in traveler opens `#/login` directly
- **THEN** the app returns to `#/`

#### Scenario: An expired session sends the traveler back to login

- **WHEN** a protected page receives 401 because the session expired
- **THEN** the login page opens without private data
- **AND** logging in again restores access
