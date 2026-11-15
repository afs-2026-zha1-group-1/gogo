# Acceptance-test fixtures

- Scope: sample values referenced by US-001 (issue #4), US-002 (issue #5), and
  US-008 (issue #6), US-010 (issue #7), US-012 (issue #8)
- Source: story acceptance criteria, extended by explicit user rulings on
  2026-11-14 (required destination, optional locations and invitation boundaries).
  Negative inputs below are test cases, not additional story fixture values.
- Created: 2026-11-14. The stories refer to this file but it did not exist in the
  repository; see `intents/2026-11-14-req-003.md`.
- Extended: 2026-11-14 for REQ-004; see `intents/2026-11-14-req-004.md`. The
  REQ-004 section reuses the users and trip above unchanged.

## Users

Seeded by the `V2` Flyway migration so that membership can be decided without a
login screen. `X-User-Id` carries `id`.

| id | display name | role in the fixture |
|---|---|---|
| 1 | Alice | organizer and first member of the sample trip |
| 2 | Ben | member, used for the allowed read |
| 3 | Chloe | member |
| 4 | Daniel | member |
| 5 | Eve | not a member, used for the denied read |

## Sample trip

`US-002` calls it the "Synthetic Singapore Friends Day trip on 2026-12-05,
Asia/Singapore (+08:00)". Timezone does not affect date-only values.

| field | value |
|---|---|
| name | Singapore Friends Day |
| destination | Singapore |
| start date | 2026-12-05 |
| end date | 2026-12-05 |
| start location | City Hall MRT |
| end location | Merlion Park |
| organizer | Alice (id 1) |
| members | Alice, Ben, Chloe, Daniel (ids 1, 2, 3, 4) |
| non-member | Eve (id 5) |

The trip id is assigned by the database; tests must read it from the create
response rather than assume a value.

## Requests

| Case | Call | Expected |
|---|---|---|
| C1 create | `POST /api/trips`, `X-User-Id: 1`, body `{"name":"Singapore Friends Day","destination":"Singapore","startDate":"2026-12-05","endDate":"2026-12-05","startLocation":"City Hall MRT","endLocation":"Merlion Park"}` | `201`, response echoes the six values, `organizerId = 1` |
| C2 date order | same body with `"startDate":"2026-12-06"`, `"endDate":"2026-12-05"` | `400`, `code = INVALID_DATE_RANGE` |
| C3 blank name | same body with `"name":"   "` | `400`, `code = NAME_REQUIRED` |
| C6 required destination | C1 body with destination omitted, null, empty or whitespace-only | `400`, `code = DESTINATION_REQUIRED`; no trip or membership created |
| C7 optional locations | C1 body with either/both locations omitted, null, empty or whitespace-only | `201`; unspecified locations saved and read as null, supplied nonblank locations unchanged; completion only during US-031 main-plan generation |
| R1 member read | `GET /api/trips/{id}`, `X-User-Id: 2` | `200`, the six saved values |
| R2 non-member read | `GET /api/trips/{id}`, `X-User-Id: 5` | `403`, `code = NOT_A_MEMBER`, no trip values |
| R2-N no identity | `GET /api/trips/{id}` without `X-User-Id` | `401`, `code = USER_REQUIRED` |
| R3-N unknown trip | `GET /api/trips/999999`, `X-User-Id: 2` | `404`, `code = TRIP_NOT_FOUND` |
| C4-N malformed date | create body with `"startDate":"2026-13-01"` | `400`, `code = INVALID_DATE` |

## Values deliberately not fixed

| Item | Why no value is set |
|---|---|
| New trip id | Assigned by the database in C1 |
| `createdAt` | Not required by any AC |
| Error message wording | Only the `code` is contractual; messages are implementation text |
| Exact locations produced by later US-031 completion | At main-plan generation use submitted member preferences; random locations if preferences are absent or yield no suitable result. Preserve supplied locations. Do not fix exact randomized outputs or run completion during REQ-003/004 tests. Owners IO Emily / SA Johnson |

## REQ-004 — invitations (US-008 / US-010 / US-012)

Same users and same sample trip as above. Eve (id 5) is the invited outsider;
after a successful acceptance she becomes a member and the R1 read applies to her.

### State setup

| Item | Value | Why |
|---|---|---|
| Main plan of the fixture trip | unconfirmed by default | `V3` adds `trip.main_plan_confirmed` default 0; no API sets it in this change (US-037 owns the flow) |
| Confirmed-main-plan case (J4) | test-only direct database update of `trip.main_plan_confirmed` to 1 | The confirmation flow is out of scope; the closure AC still must be exercised. Documented test-only setup, not product behavior |
| Invitation token | assigned by the backend at issuance; tests read it from the issue response | Opaque random value; no AC fixes a token string |
| Invalid token input | any string that was never issued, e.g. `no-such-invitation` | Test input for U1/U2/U3, not a sample value claimed by an AC |

### Requests

| Case | Call | Expected |
|---|---|---|
| I1 issue | `POST /api/trips/{id}/invitation`, `X-User-Id: 1` | `200`, body carries `token` and `joinPath` (`/join/<token>`); one invitation row for the trip |
| I2 re-issue | same call again | `200`, same `token`; still one invitation row |
| I3 non-organizer | same call, `X-User-Id: 2` | `403`, `code = NOT_ORGANIZER`; invitation row count unchanged |
| I4-N no identity | same call without `X-User-Id` | `401`, `code = USER_REQUIRED`; nothing created |
| I5-N unknown trip | `POST /api/trips/999999/invitation`, `X-User-Id: 1` | `404`, `code = TRIP_NOT_FOUND` |
| J1 preview | `GET /api/invitations/{token}`, no identity header | `200`, `tripName = Singapore Friends Day`, `destination = Singapore`, `startDate = 2026-12-05`, `endDate = 2026-12-05`, joining open; no member, itinerary or preference fields |
| J2 accept | `POST /api/invitations/{token}/accept`, `X-User-Id: 5` | `200` joined; `trip_member` row (trip, 5) exists; `GET /api/trips/{id}` with `X-User-Id: 5` → `200` |
| J3 double accept | J2 call twice | both `200` joined; exactly one `trip_member` row for (trip, 5) |
| J4 closed | confirmed-main-plan setup, then J2 call | `403`, `code = JOINING_CLOSED`; member rows unchanged |
| J5-N no identity | accept without `X-User-Id` | `401`, `code = USER_REQUIRED`; no membership |
| J6 existing member | Ben accepts a valid token, once unconfirmed and once after confirmed-state setup | both `200` joined with `alreadyMember = true`; membership count unchanged |
| J7 identity precedence | invalid-token accept with missing identity, then unknown user id `999999` | both `401`, `code = USER_REQUIRED`; no membership; known Eve with the same invalid token receives `404` |
| U1 invalid preview | `GET /api/invitations/no-such-invitation` | `404`, `code = INVITATION_NOT_FOUND`; no trip values |
| U2 invalid accept | `POST /api/invitations/no-such-invitation/accept`, `X-User-Id: 5` | `404`, `code = INVITATION_NOT_FOUND`; no membership |

### Values deliberately not fixed (REQ-004)

| Item | Why no value is set |
|---|---|
| Token string | Random per issuance; tests read it from I1 |
| Absolute invitation URL | Composed by the frontend from its own origin plus `joinPath`; the QR must encode exactly that composed URL (I6) |
| Expiry / revocation fields | Non-MVP per US-008 and US-012 design scope; no such field or endpoint exists |
| Error message wording | Only the `code` is contractual |

## US-031-037 — main itinerary (US-031 / US-037)

Same users and same sample trip as above, now seeded by the merged `V2`/`V3`
migrations (REQ-003/004). Added 2026-11-15 from the user-supplied ACs; see
`intents/2026-11-15-us-031-037.md`. Endpoint paths, success statuses and wire
field names became contractual at P2 (rulings 2026-11-15: generate 201; confirm
200 with the same projection as the draft read; inputs read member-readable).
Error codes and HTTP status mapping were fixed by user ruling 2026-11-15
(contract baseline below, IO Emily reviews at G1); sample values are fixed by the
ACs or by the rulings recorded in the intent. Schema convergence (OQ-9, trigger
fired 2026-11-15): this change appends `V4+`, adds three tables and two
`trip_member` columns, and does not alter `trip`.

### Error contract (ruled 2026-11-15)

| Code | HTTP status | Case |
|---|---|---|
| `MEMBERS_NOT_READY` | 409 | generate with a pending member (M2) |
| `VALIDATION_FAILED` | 422 | confirm blocked by overrun (V2) or schedule errors (V3) |
| `STALE_DRAFT` | 409 | confirm blocked by stale draft (V4) |
| `NO_DRAFT` | 404 | confirm before any generation (V6) |
| `ALREADY_CONFIRMED` | 409 | re-confirm an already-confirmed plan (V7, OQ-8); also generation after confirmation (M14, lint L1 recommended default A — IO Emily ratification pending at G1) |

Only `code` is contractual; message wording free. Precedent codes unchanged:
USER_REQUIRED 401 / NOT_A_MEMBER 403 / NOT_ORGANIZER 403 / TRIP_NOT_FOUND 404 /
JOINING_CLOSED 403.

Every error body keeps the precedent `{code, message}` shape. Two codes carry
structured detail fields (P2 contract; needed by US-031 AC2 and Screen 10):

| Code | Extra fields | Content |
|---|---|---|
| `MEMBERS_NOT_READY` | `pendingMembers` | one entry per not-ready member: `userId`, `displayName` (M2: Daniel, id 4) |
| `VALIDATION_FAILED` | `scheduleErrors`, `overruns` | `scheduleErrors`: `type` (`OUT_OF_ORDER` / `OVERLAP` / `MISSING_LEG` / `OUT_OF_DAY`), `seq`, free `message`; `overruns`: `userId`, `displayName`, `hardBudgetCents`, `overrunCents` (V2: Alice 4000 / 1000) |

`STALE_DRAFT`, `NO_DRAFT`, `ALREADY_CONFIRMED` and the precedent codes carry no
extra fields; staleness is read from the plan projection.

### State setup

| Item | Value | Why |
|---|---|---|
| Readiness, default | Alice/Ben/Chloe/Daniel `ready = 1`, `preference_revision = 1` | US-031 AC1 "all four members ready at preference revision 1"; `V4` adds both columns to the merged `trip_member` and seeds these values for the fixture trip's four members; flip test-only (ruled) |
| Readiness, later joiners | `ready` defaults to 0, `preference_revision` defaults to 1 | a member who joins through REQ-004 accept has not responded yet, so the readiness gate keeps blocking until a test-only flip; no product write path in this REQ |
| Null-location case (M3) | test-only update of the fixture trip's `start_location` / `end_location` to NULL, restored afterwards | the merged `V2` seed supplies both locations, so the completion branch needs documented test-only setup (REQ-004 precedent); the result is observed through `GET /api/trips/{id}` |
| Confirmed version pointer | the draft row whose `status = 'confirmed'`; `trip.main_plan_confirmed` (already added by `V3`) stays the joining flag | P2 ruling 2026-11-15: no `confirmed_draft_id` column and no `V4` ALTER of `trip`; one source of truth for the confirmed version |
| Daniel-pending case | test-only `ready = 0` for Daniel (id 4) | US-031 AC2; no product write path in this REQ |
| Preference snapshots | rev 1 per member; interests/must-do seeded; `hard_budget` NULL by default (no hard limit) | AC2 names only Alice's hard budget; NULL keeps the C1 pass case feasible |
| Alice overrun case | test-only Alice `hard_budget = 4000` cents (40 SGD) | US-037 AC2 |
| Stale case | after a draft exists, test-only bump Ben `preference_revision` to 2 | OQ-7 ruling 2026-11-15: stale blocks confirmation |
| Confirmed-frozen case (M13) | after V1 confirm, the same test-only Ben revision bump | P2 lint ruling 2026-11-15: the confirmed version stays `stale = false` regardless of later revision changes |
| Fake provider stops | City Hall MRT 09:00–09:30; National Gallery Singapore 10:00–10:30; Gardens by the Bay 11:00–11:15; Merlion Park 11:30–12:00; travel legs 30/30/15 minutes; cost 50 SGD per person | US-031 AC1 supplied times and legs; US-037 AC2 known cost |
| Confirmed-state premise for later REQs | produced by the US-037 confirm flow (version 1) | supersedes the REQ-004 test-only setup for trips confirmed through this REQ |

### Requests (paths contractual, P2 2026-11-15)

| Case | Call | Expected |
|---|---|---|
| M1 generate | `POST /api/trips/{id}/main-plan`, `X-User-Id: 1`, default setup | `201`; body is the plan projection: `version` 1, `confirmed` false, `stale` false, the four `stops` in order with supplied times and `travelMinutesToNext` 30/30/15 (last null), `inputRevisions` {1:1,2:1,3:1,4:1}, `costPerPersonCents` 5000; `main_plan_confirmed` stays 0 |
| M2 pending | same call with Daniel `ready = 0` | blocked; `409 MEMBERS_NOT_READY`; response names Daniel (id 4); no draft row |
| M3 completion | null-location setup (test-only), then generate; separately the default seeded trip | `201`; `GET /api/trips/{id}` shows both locations completed per the signed 2026-11-14 ruling; with the seeded nonblank locations the same read shows them preserved unchanged |
| M4 non-organizer | generate with `X-User-Id: 2` | `403 NOT_ORGANIZER`; no draft |
| M5 regen | M1 twice | `201` with `version` 2; second draft version 2 current; version 1 superseded |
| M14 generate after confirm | generate after V1 | `409 ALREADY_CONFIRMED`; no new draft row; confirmed version unchanged (lint L1 recommended default A, user-selected 2026-11-15; IO Emily ratification pending at G1; replanning deferred to R2) |
| M6 inputs read | `GET /api/trips/{id}/main-plan/inputs`, `X-User-Id: 2`, default setup | `200`; ready count 4/4 + member names, interests/must-do summary, budget lines (no limit), generation rules list |
| M7 inputs no draft | same call before any generation | `200` summary; no `NO_DRAFT` error |
| M8 inputs non-member | same call with `X-User-Id: 5` | `403 NOT_A_MEMBER` |
| M9 draft read | `GET /api/trips/{id}/main-plan`, `X-User-Id: 2`, after M1 | `200`; ordered stops with times and legs, cost 5000 cents, version 1, `stale = false`, confirmed flag false |
| M10 draft read stale | same call after Ben revision bump | `200` with `stale = true` |
| M11 draft read no draft | same call before any generation | `404 NO_DRAFT` |
| M12 confirmed read | same call after V1 | `200`; version 1, confirmed flag true, `stale = false` |
| M13 confirmed frozen | same call after V1 **and** a test-only Ben revision bump to 2 | `200`; version 1, confirmed flag true, `stale = false` — the confirmed version is frozen; staleness applies to unconfirmed drafts only (P2 lint ruling 2026-11-15) |
| V1 confirm pass | `POST /api/trips/{id}/main-plan/confirm`, `X-User-Id: 1`, current valid draft v1 | `200`; body is the same projection as the draft read with `version` 1, `confirmed` true, `stale` false; v1 confirmed shared (that draft's `status = 'confirmed'`); `main_plan_confirmed = 1`; invitation accept afterwards → `403 JOINING_CLOSED` (J4) |
| V2 overrun | confirm with Alice hard 4000 vs cost 5000 | blocked; `422 VALIDATION_FAILED`; overrun 1000 cents (10 SGD) shown for Alice; stays unconfirmed |
| V3 schedule | confirm a draft with overlapping stops / missing leg / out-of-day stop (test-only draft mutation) | blocked; `422 VALIDATION_FAILED` with the specific schedule errors; stays unconfirmed |
| V4 stale | confirm after Ben revision bump | blocked; `409 STALE_DRAFT`; regenerate then confirm passes |
| V5 non-organizer | confirm with `X-User-Id: 2` | `403 NOT_ORGANIZER`; unchanged |
| V6 no draft | confirm before any generation | `404 NO_DRAFT`; unchanged |
| V7 re-confirm | confirm after V1 | `409 ALREADY_CONFIRMED` (OQ-8 ruled 2026-11-15); no state change |
| M-N / V-N identity & trip | generate/confirm without `X-User-Id`; unknown trip; Eve | `401 USER_REQUIRED`; `404 TRIP_NOT_FOUND`; `403 NOT_A_MEMBER` |

### Wire projections (field names contractual at P2, DoR S1 closure)

camelCase JSON, integer cents (SGD), local `HH:MM` strings on the trip date
(Asia/Singapore), integer-minute legs. The draft read, the generate 201 body and
the confirm 200 body are the **same projection** (one shape, one serializer).

| Projection | Fields |
|---|---|
| Plan (`GET /main-plan`, generate 201, confirm 200) | `tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions` [{`userId`, `revision`}], `stops` [{`seq`, `name`, `startTime`, `endTime`, `travelMinutesToNext` (null on the last stop), `interests` (provider-supplied tags, may be empty)}] |
| Generation inputs (`GET /main-plan/inputs`) | `tripId`, `readyCount`, `memberCount`, `members` [{`userId`, `displayName`, `ready`, `preferenceRevision`}], `commonInterests` [string], `mustDo` [string], `budgets` [{`userId`, `displayName`, `hardBudgetCents` (null = no limit)}], `rules` [identifier] |
| Confirm validation detail (inside the 422 body) | `scheduleErrors` [{`type`, `seq`, `message`}], `overruns` [{`userId`, `displayName`, `hardBudgetCents`, `overrunCents`}] |

`rules` identifiers (fixed set; display wording free): `ALL_MEMBERS_READY`,
`SUPPLIED_ACTIVITY_TIMES`, `TRAVEL_LEGS_BETWEEN_STOPS`, `HARD_BUDGET_RESPECTED`,
`STALE_DRAFT_BLOCKS_CONFIRM`, `LOCATION_COMPLETION_AT_GENERATION`.

`commonInterests` = interests shared by all ready members (intersection);
`mustDo` = deduplicated union of ready members' must-do items. Both are
display-only aggregations (no AC depends on their content) and are an IO review
item at G1.

### Values deliberately not fixed (US-031-037)

| Item | Why no value is set |
|---|---|
| Draft ids, absolute timestamps | Assigned by the database; tests read them from responses |
| Per-stop cost breakdown | AC fixes only the 50 SGD per-person total |
| Exact randomized completion outputs | Inherited 2026-11-14 ruling: do not fix random outputs |
| Interests / must-do seed content | AC1 does not depend on specific interests; fake provider supplies the stops |
| Per-stop `interests` tags | provider-supplied; the fake provider may return none, so the array may be empty. No AC fixes tag content |
| Error message wording | Only the `code` is contractual |
