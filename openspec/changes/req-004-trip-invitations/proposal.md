# Proposal

## Why

Iteration 0's three `Type - Invitations` stories (issue #6 US-008, issue #7
US-010, issue #8 US-012) describe one flow over one token aggregate: the
organizer shares a link (or its QR), an invited traveler previews and accepts
once, and a broken link fails closed with a generic message. REQ-003 built the
trip aggregate and explicitly deferred invitations to this requirement; without
it a trip can never grow beyond its creator.

All three stories are `Priority - Must`. One change keeps a single gate cycle
and a single migration for the invitation table, and lets the closure rule
(joining ends at main-plan confirmation) be specified once for both the link and
the QR path.

## What Changes

- **ADDED** capability `invitations` with four requirements:
  - "Invitation issuance" — `POST /api/trips/{id}/invitation` is organizer-only
    get-or-create of the trip's single invitation; returns an opaque token and
    join path; a non-organizer member is denied and nothing is created.
  - "Invitation preview" — `GET /api/invitations/{token}` needs no identity and
    returns only the trip name, destination, start/end dates and whether joining
    is open; never members, itinerary or preferences.
  - "Invitation acceptance and joining" — `POST /api/invitations/{token}/accept`
    requires `X-User-Id`, inserts exactly one membership per identity, is
    idempotent, and is rejected with the member list unchanged once the trip's
    main plan is confirmed.
  - "Unusable invitation" — an unknown token on preview or accept yields a
    generic unusable-invitation outcome with no trip values and no membership.
- **ADDED** requirement "Trip main-plan confirmation state" in `trips`: a boolean
  state per trip, default unconfirmed, with no mutation path in this change
  (US-037 owns the confirmation flow). The `trips` capability is introduced by
  the in-flight change `req-003-trip-create-and-view` and is not yet in
  `openspec/specs/`, so this is an ADDED delta at `specs/trips/spec.md`, not a
  modification of a living-spec requirement.
- Flyway `V3__create_invitation.sql` creates `trip_invitation` (one row per trip,
  unique opaque token) and adds `trip.main_plan_confirmed` default 0.
- New backend package `com.gogo.invitation` using `JdbcTemplate` (no ORM), with
  three new stable error codes (`NOT_ORGANIZER`, `JOINING_CLOSED`,
  `INVITATION_NOT_FOUND`) alongside the reused `USER_REQUIRED` / `TRIP_NOT_FOUND`.
- Frontend gains an invitation panel (link, copy action, QR encoding the same
  absolute URL) and a join page at the token route (preview, accept, joined,
  closed and unusable states), including the loading/error/permission states the
  stories require even where not pictured.
- `requirement-workspace/acceptance-test-fixtures.md` gains a REQ-004 section;
  the confirmed-main-plan case uses documented test-only database setup because
  the confirmation flow is out of scope.

Unchanged: the `greeting` capability, REQ-003's six trip values and two
endpoints, the SQLite datasource, the two-job CI workflow, the dev proxy, and
every REQ-001 non-goal.

No breaking change: all three endpoints are new; the added column has a default.

## Capabilities

### New Capabilities

- `invitations`: issue, preview, accept and fail-closed handling of trip
  invitation links, with membership decided by the seeded user table.

### Modified Capabilities

None in the Living Spec tree (`openspec/specs/` holds only `greeting`). The one
`trips` requirement added here targets the capability introduced by the in-flight
`req-003-trip-create-and-view` change; see the ADDED delta note above.

## Impact

- **Requirement**: REQ-004 (`requirement-workspace/requirements/REQ-004.md`),
  intent `requirement-workspace/intents/2026-11-14-req-004.md`, DoR
  `requirement-workspace/analysis/req-004-dor.md`, impact brief §16–22.
- **Stories**: issue #6 (US-008), #7 (US-010), #8 (US-012) in GitHub project #2;
  all `Iteration 0`, `Priority - Must`, status `Req Analysis`.
- **Code**: new `backend/src/main/java/com/gogo/invitation/` package,
  `V3__create_invitation.sql`, new `InvitationApiTest`, frontend invitation panel
  and join page plus the token route.
- **APIs**: `POST /api/trips/{id}/invitation`, `GET /api/invitations/{token}`,
  `POST /api/invitations/{token}/accept`. Error bodies carry `code` and `message`.
- **Data**: one new table; one additive column on `trip`. No existing column or
  row changes.
- **Dependencies**: ordering dependency on REQ-003 P4 (its `V2` creates the
  tables this change alters). Frontend needs one QR encoding dependency and the
  routing decision shared with REQ-003 OQ-4, both decided at P3.
- **CI**: unchanged; the new test class runs in the existing backend job.
- **Docs / harness**: `README.md`, verification documents, stage reports under
  `docs/ai4se-plugins/`. The knowledge base remains unconfigured.

## Effort and ordering

Medium. One vertical slice: migration → repository → issue endpoint →
preview/accept endpoints → invitation panel → join page → verification. The join
page depends on the issue endpoint only through a token. `/sdd:story-split` is
Skipped: the three stories already exist as GitHub issues.

## A0 deep-dive gate

`requirement-workspace/analysis/req-004-dor.md`: ⑨ data contract (invitation
grain, token uniqueness, state column, wire shapes, error codes), ⑩ boundary
(sixteen branches including denial, closure and privacy cases), ⑪ cross-REQ
(additive on REQ-003, independent of `greeting`), ⑫ display contract (five
surfaces plus failure states) — all Pass → **A0 Pass**, split permitted.

## Known deviations carried into later stages

- `X-User-Id` is trusted without verification (inherited from REQ-003); it must
  not be described as a security control.
- The preview exposes destination and dates before acceptance, per screen 05;
  the AC minimum is the name. IO to confirm at G1 (REQ-004 OQ-2).
- The main-plan state has no product mutation path until US-037; tests set it
  directly (REQ-004 OQ-1). Reverse case R-1 asserts no API sets it.
- Revocation, expiry and the reminder notification are pictured but non-MVP;
  reverse case R-2 asserts no such endpoints exist.
- REQ-003 is unimplemented and its G1 unsigned; REQ-004 P4 waits for REQ-003 P4
  (REQ-004 OQ-7).