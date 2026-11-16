# Proposal

## Why

US-066 (issue #38, `Iteration 0`, `Priority - Must`, `Type - Members`) replaces
the repository's scaffold identity with verified login. Today every trip,
invitation and main-plan endpoint trusts an unverified `X-User-Id` header, and
the frontend shows a switcher explicitly labeled `SCAFFOLD（非登录）`
(`backend/src/main/java/com/gogo/{trip,invitation,mainplan}/*Controller.java`,
`frontend/src/App.tsx`). The story's planning note is explicit: authentication
method and session design must be agreed before implementation, and the scaffold
is not verified login.

Verified identity is the prerequisite for private trip access and for the three
sibling `Iteration 0` stories: US-067 (scanner), US-068 (My Account) and US-069
(logout) all consume this login/session. The user decided the mechanisms on
2026-11-16: Spring Security with a server-side HTTP session, email + password
for the five seeded accounts, and full replacement of the `X-User-Id` scaffold.
The user also confirmed a single change.

The binding `docs/knowledge/architecture/tech-stack-plan.md` states that the MVP
has no accounts and documents `X-Member-Id`-era identity; it does not define an
authentication stack. This change deliberately deviates by adding
`spring-boot-starter-security` and a credential table. The deviation is recorded
here and must be reconciled in the tech-stack plan at archive per
`openspec/config.yaml`.

## What Changes

- **ADDED** `auth` capability:
  - Credential login: email + password for the five seeded accounts, verified
    against BCrypt hashes in a new `account_credential` table (`V6`; V4 is
    reserved by the in-flight preference change and V5 is the merged main-plan
    migration). Unknown email and wrong password share one generic failure that
    reveals neither account existence nor account/trip data. No registration,
    password change or reset.
  - Server session and protected access: Spring Security establishes a
    server-side HTTP session on login; the session principal is the only caller
    identity for protected endpoints. Session id rotates on login (fixation
    protection); a configurable 30-minute idle timeout applies; missing, invalid
    or expired sessions return 401 `USER_REQUIRED` with no private data.
    `X-User-Id` alone no longer authenticates anything.
  - CSRF protection: a session-bound token is bootstrapped by the SPA and
    required in the `X-XSRF-TOKEN` header for state-changing requests; missing or
    invalid tokens change nothing.
  - Public surfaces: login/CSRF bootstrap, `GET /api/greeting` and
    `GET /api/invitations/{token}` remain identity-free; everything else is
    protected.
  - Login page and post-login resume: a full-screen `#/login` page (no dock)
    accepts email + password, shows a generic failure and busy state, and on
    success opens the dashboard `#/`; a pending invitation token is retained
    while signed out, the same `#/join/<token>` preview resumes after login, and
    joining still requires an explicit accept.
- **MODIFIED** `trips`: the "Trip caller identity" requirement moves to the
  authenticated session. Creation, detail reads and membership/organizer
  outcomes, status codes and error codes stay unchanged.
- **MODIFIED** `invitations`: issuance and acceptance use the session principal;
  preview stays public and identity-free; identity-error precedence and all
  joining/closed/unusable outcomes stay unchanged.
- **MODIFIED** `app-shell`: the identity switcher and seeded-user list are
  removed and replaced by a read-only signed-in name; `#/login` is full-screen
  without the dock; shell pages require sign-in; frame, dock and guest-join
  exclusion keep their contracts.
- **Cross-change identity migration** for the in-flight `main-itinerary`
  capability (merged PR #37, archive pending): its four main-plan endpoints,
  two screens and tests move from `X-User-Id` to the session principal with
  unchanged outcomes. Its delta identity scenarios are updated during this
  change (or after its archive, against the Living Spec).
- Controller identity migration across the trip, invitation and main-plan
  packages; a Spring Security configuration (JSON 401, CSRF cookie token,
  fixation protection, timeout, no form-login/logout surface); a credential
  repository + `UserDetailsService`; `POST /api/auth/login`,
  `GET /api/auth/me`, `GET /api/auth/csrf`.
- Frontend: remove `X-User-Id` from the API client, add auth bootstrap and
  signed-in/out state, add the login page and route guard, remove identity props
  from create/details/join/invitation/main-plan pages, and retain the pending
  invitation token.
- Fixtures, backend acceptance tests and browser verification move from header
  identity to session login; expected business outcomes and codes are unchanged.

Unchanged: trip creation/validation, detail permission, invitation
issuance/join/closed/unusable outcomes, main-plan generation/validation/confirm
behavior, greeting, the shell frame/dock, the SQLite/Flyway/JdbcTemplate stack,
and the two-job CI structure.

No breaking user-facing behavior beyond identity: a signed-out visitor can no
longer see protected trip pages or call protected endpoints, and the fake
identity switcher no longer exists.

## Non-Goals / Out of scope

- Logout and session-invalidation UI (US-069); My Account, email display and
  display-name editing (US-068); invitation QR scanning (US-067).
- Registration, password reset/change, email verification, SSO/social login,
  remember-me, multi-device session management and account lockout.
- Rate limiting, production HTTPS/secret management and audit logging
  (deployment/operations, not this story's AC).
- Dashboard aggregation (US-061), member-management writes, split/reunion/
  completion features, and any change to membership or organizer rules.
- Rewriting historical archived verification records that mention the scaffold;
  only live specs and docs reflect the new contract.

## Capabilities

### New Capabilities

- `auth`: credential verification, server-side session identity, CSRF
  protection, public/publicly-safe surfaces, and the login page with
  post-login invitation resume.

### Modified Capabilities

- `trips`: caller identity now comes from the authenticated session; all other
  trip behavior is unchanged.
- `invitations`: issuance/acceptance identity now comes from the session;
  preview stays public and identity-free.
- `app-shell`: switcher removed, signed-in name read-only, login page outside
  the dock/shell, protected pages require sign-in.

`main-itinerary` is not yet in `openspec/specs/` (its change is merged but not
archived). If it archives before this change's P2, its living spec is MODIFIED;
otherwise the in-flight delta is updated cross-change. Either way the behavior
does not change.

## Impact

- **Requirement**: REQ-006
  (`requirement-workspace/requirements/REQ-006.md`), intent
  `requirement-workspace/intents/2026-11-16-req-006.md`, DoR
  `requirement-workspace/analysis/req-006-dor.md`, impact brief §38–45,
  deep-dive §REQ-006.
- **Story**: issue #38 (US-066), `Iteration 0`, `Priority - Must`, `Type -
  Members`; assigned and moved to `Req Analysis` 2026-11-16.
- **Backend code**: new `com.gogo.auth` package (controller, credential
  repository, `UserDetailsService`, security config); identity migration in
  `trip`, `invitation` and `mainplan` controllers; JSON error handling.
- **Frontend code**: `api.ts` (cookie/CSRF), `App.tsx` (auth bootstrap, login
  route, guard, switcher removal), new login page, identity-prop removal across
  `CreateTrip`, `TripDetails`, `Join`, `InvitationPanel`, `MainPlan` and
  `MainPlanInputs`, pending-invitation resume.
- **APIs**: ADD `POST /api/auth/login`, `GET /api/auth/me`,
  `GET /api/auth/csrf`; protected trip/invitation/main-plan routes keep their
  paths, statuses and business codes but derive identity from the session;
  `GET /api/greeting` and invitation preview stay public. `X-User-Id` is no
  longer honored.
- **Data**: `V6__create_account_credential.sql` adds one credential table and
  five seeded rows (email + BCrypt hash). No `app_user` change, no membership or
  plan change.
- **Security**: BCrypt hashing, session fixation protection, CSRF token, generic
  login failure, configurable idle timeout, no form-login/logout surface.
- **Dependencies**: backend adds `spring-boot-starter-security`; no frontend
  dependency. Build and CI structure unchanged.
- **Tests/fixtures**: new auth acceptance tests; trip/invitation/main-plan
  tests and browser checks migrate to session login; credential/auth matrix
  added to `acceptance-test-fixtures.md`.
- **Docs/harness**: README login/demo-credential notes, workdir, stage reports;
  tech-stack-plan reconciliation at archive.
- **Upstream**: current main `00ea4bc` (US-031-037 merged); no other dependency.
- **Downstream**: US-067/068/069 consume the login page and session; US-061's
  dashboard becomes the protected post-login landing.

## Effort and ordering

Medium–large. One vertical slice in one change (confirmed 2026-11-16): V6
credential migration → auth endpoints + repository/UserDetailsService →
Spring Security chain + identity migration in trip/invitation/main-plan →
frontend auth bootstrap + login page + guard + switcher removal → pending
invitation resume + header-ignored verification → full existing-acceptance
re-run.

Ordering constraints: use V6 (V4 reserved, V5 taken); re-check the migration
head before implementation; update the main-itinerary identity delta (or its
living spec if archived first); keep all business outcomes/codes identical so
the existing acceptance matrix stays valid. No push or merge is part of this
proposal.
