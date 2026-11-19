# Design

## Context

REQ-004 adds the invitation flow on top of the trip aggregate specified by the
in-flight `req-003-trip-create-and-view` change (P2 complete, unimplemented).
The committed tree today holds only `com.gogo.hello` (greeting) and a one-screen
React app. Stack constraints are unchanged: Spring Boot + `JdbcTemplate` (no
ORM), embedded SQLite, Flyway, React 19 + Vite 8, two-job CI. Identity is the
REQ-003 scaffold: seeded users plus the trusted `X-User-Id` header.

Implementation ordering: REQ-003 P4 must land first (`V2` creates `app_user`,
`trip`, `trip_member`); this change's `V3` then adds the invitation table and the
main-plan state column. P0–P3 artifacts are independent of that ordering.

Links: [ATDD design](atdd-design.md) · [delta specs](specs/invitations/spec.md)
and [trips delta](specs/trips/spec.md) · [tasks](tasks.md) ·
[fixtures](../../../../requirement-workspace/acceptance-test-fixtures.md).

## Goals / Non-Goals

Goals: one invitation per trip with an opaque token; organizer-only issuance;
public preview limited to five fields; idempotent single membership on accept;
joining closed at main-plan confirmation; fail-closed generic unusable outcome;
frontend panel (link/copy/QR) and join page with all mandatory states.

Non-Goals: main-plan confirmation flow (US-037), revocation/expiry, reminder
notifications, member management, real authentication, ORM, multiple invitations
per trip, CI changes. Each has a reverse check in the ATDD design.

## Decisions

**D1 — Migration `V3__create_invitation.sql`.**
`CREATE TABLE trip_invitation (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL UNIQUE REFERENCES trip(id), token TEXT NOT NULL UNIQUE);`
plus `ALTER TABLE trip ADD COLUMN main_plan_confirmed INTEGER NOT NULL DEFAULT 0;`
SQLite dialect, matching `V1`/`V2`. The default keeps every existing and new trip
joinable; no data backfill is needed.

**D2 — Backend package `com.gogo.invitation`.**
`InvitationController` (three routes), `InvitationRepository` (JdbcTemplate),
`InvitationTokens` (generator), response records (`IssuedInvitation`,
`InvitationPreview`, `JoinResult`), and errors surfaced through the same
`code`/`message` body shape as `trips`. New codes: `NOT_ORGANIZER`,
`JOINING_CLOSED`, `INVITATION_NOT_FOUND`; reused: `USER_REQUIRED`,
`TRIP_NOT_FOUND`. Identity resolution is shared with the trip package rather than
duplicated (a small common helper extracted when REQ-003 lands).

**D3 — Token generation.** `SecureRandom`, 16 bytes rendered as 32 lowercase hex
characters. Opaque: no trip id or name embedded (the prototype's readable token
is decorative). Uniqueness enforced by the UNIQUE constraint; a collision
retries once and then fails the request.

**D4 — Issuance is get-or-create in one transaction.** Select the trip (404
`TRIP_NOT_FOUND` if absent), check `organizer_id` equals the caller (403
`NOT_ORGANIZER` otherwise), then select the trip's invitation; insert only when
absent. Response: `token`, `joinPath` = `/join/<token>`, `tripId`, `tripName`.
Status 200 on first and repeated calls.

**D5 — Acceptance in one transaction.** Resolve identity first (401
`USER_REQUIRED`, including when the token is unknown), then resolve token (404
`INVITATION_NOT_FOUND` if unknown). Check existing membership before enforcing
`main_plan_confirmed` (403 `JOINING_CLOSED` for a non-member when confirmed),
then `INSERT OR IGNORE` the membership row and report `alreadyMember` from the
inserted-row count. The existing PRIMARY KEY (trip_id, user_id) makes duplicates
impossible even under concurrent accepts. An existing member accepting while
joining is closed still reports joined (closure protects the member list, not
existing members).

**D6 — Preview is token-bound and whitelisted.** No identity check. The response
record has exactly `tripName`, `destination`, `startDate`, `endDate`,
`mainPlanConfirmed`; the projection is a compile-time field whitelist, so no
private field can leak by accident. Unknown token → the same 404
`INVITATION_NOT_FOUND` body as accept, with no trip values.

**D7 — Frontend routing and QR (resolves OQ-6 and REQ-003 OQ-4).**
A minimal hash-based router in the app shell (no new routing dependency):
routes `#/` (greeting/home), `#/create`, `#/trips/<id>` (REQ-003), and
`#/join/<token>` (this change). The invitation URL is
`<window.location.origin>/#/join/<token>`; the backend's `joinPath` stays
origin-agnostic. QR encoding uses the MIT-licensed `qrcode` package (canvas
render); the P4 QR-equality check decodes the rendered canvas locally with the
`jsqr` devDependency (installed 1.4.0 declares Apache-2.0) — no external upload,
no decorative QR. Both licenses must be re-checked at install time against the
corporate npm mirror.

**D8 — Scaffold identity selector.** The shell gains a user switcher over the
five seeded users (Alice/Ben/Chloe/Daniel/Eve) that sets the `X-User-Id` header
for every request. It is a test scaffold surface, labeled as such, not a login.
It lets the E2E cases act as organizer, member and outsider in one browser.

**D9 — Frontend surfaces and states.**
Invitation panel on `#/trips/<id>` for the organizer: link text, copy action
(navigator.clipboard with a read-only fallback field), QR canvas, joining-open
hint; loading, error and `NOT_ORGANIZER` denial states. Join page `#/join/<token>`:
preview card (five fields), accept button, joined state, closed state
(`mainPlanConfirmed` true or `JOINING_CLOSED`), unusable state (generic message,
privacy note, back-home action; no reminder workflow), plus loading and
request-failure states. Styling follows `ui-design-reference/` (screens 04/05/06).

**D10 — Test-only state flip.** The J4 API and E2E cases set
`main_plan_confirmed = 1` with a direct `JdbcTemplate`/sqlite update documented
in the fixtures. No product code path sets the column (reverse check R-1).

**D11 — Test isolation.** `InvitationApiTest` follows `GreetingApiTest`:
`@SpringBootTest` with its own shared in-memory SQLite file
(`jdbc:sqlite:file:invitation-test?mode=memory&cache=shared`, pool size 1) and
Flyway migrations `V1`–`V3`; row counts asserted through `JdbcTemplate`.

## Risks / Trade-offs

- **Impersonation (inherited).** `X-User-Id` is trusted; anyone can accept as
  Eve. User explicitly accepts this only in a controlled demo (2026-11-14),
  never as a production security control.
- **Preview privacy.** Destination/dates are exposed before acceptance per
  screen 05 (OQ-2, user confirmed 2026-11-14); members/itinerary/preferences are
  structurally excluded by D6.
- **State without a flow.** `main_plan_confirmed` looks like dead data until
  US-037; the reverse check and fixtures document why it exists now.
- **Ordering dependency.** If REQ-003 P4 slips, REQ-004 P4 cannot start; the
  red tests of D11 will fail on missing tables until `V2` lands — expected, not
  a defect.
- **New frontend dependencies.** `qrcode` + `jsqr` add supply-chain surface;
  both MIT, installed through the corporate mirror, license re-checked at P4.
- **Hash routing.** URLs carry `#`; acceptable for the scaffold and keeps the
  dependency count at one new runtime package. QR equality (I6) is proven
  against the composed hash URL, not a path URL.