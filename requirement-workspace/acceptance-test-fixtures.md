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
fired 2026-11-15; G1 C2 ruling 2026-11-15): `member_preference` is the
kind/payload table owned by REQ-019's `V4` on `feat/travel_preference`
(`id`, `trip_id`, `user_id`, `kind`, `payload` JSON, `updated_at`,
UNIQUE(`trip_id`,`user_id`,`kind`); kinds `interest` / `must_do` / `budget` /
`submission`); this change appends `V5` with two tables (`main_plan_draft`,
`main_plan_stop`) and two `trip_member` columns, reads `member_preference`,
and does not alter `trip`. Merge order: REQ-019 `V4` first. C2 recommended
default A user-selected 2026-11-15; SA Lumi re-confirmed 2026-11-15 (his earlier
G1 Pass covered the wide-table shape).

### Error contract (ruled 2026-11-15)

| Code | HTTP status | Case |
|---|---|---|
| `MEMBERS_NOT_READY` | 409 | generate with a pending member (M2) |
| `VALIDATION_FAILED` | 422 | confirm blocked by overrun (V2) or schedule errors (V3) |
| `STALE_DRAFT` | 409 | confirm blocked by stale draft (V4) |
| `NO_DRAFT` | 404 | confirm before any generation (V6) |
| `ALREADY_CONFIRMED` | 409 | Re-confirm (V7) and generate after confirmation (M14); user accepted and Emily IO approved 2026-11-15; overall G1 Pass |

Only `code` is contractual; message wording free. Precedent codes unchanged:
USER_REQUIRED 401 / NOT_A_MEMBER 403 / NOT_ORGANIZER 403 / TRIP_NOT_FOUND 404 /
JOINING_CLOSED 403.

Every error body keeps the precedent `{code, message}` shape. Two codes carry
structured detail fields (P2 contract; needed by US-031 AC2 and Screen 10):

| Code | Extra fields | Content |
|---|---|---|
| `MEMBERS_NOT_READY` | `pendingMembers` | one entry per not-ready member: `userId`, `displayName` (M2: Daniel, id 4) |
| `VALIDATION_FAILED` | `scheduleErrors`, `overruns` | `scheduleErrors`: `type` (`OUT_OF_ORDER` / `OVERLAP` / `MISSING_LEG` / `TRAVEL_EXCEEDS_GAP` / `OUT_OF_DAY`), `seq`, free `message`; `overruns`: `userId`, `displayName`, `hardBudgetCents`, `overrunCents` (V2: Alice 4000 / 1000). `TRAVEL_EXCEEDS_GAP`: the stop carrying the leg whose end time + `travelMinutesToNext` is later than the next stop's start; equality passes (G1 C1 default A, user-selected 2026-11-15; IO Emily ratified 2026-11-15) |

`STALE_DRAFT`, `NO_DRAFT`, `ALREADY_CONFIRMED` and the precedent codes carry no
extra fields; staleness is read from the plan projection.

### State setup

| Item | Value | Why |
|---|---|---|
| Readiness, default | Alice/Ben/Chloe/Daniel `ready = 1`, `preference_revision = 1` | US-031 AC1 "all four members ready at preference revision 1"; `V5` adds both columns to the merged `trip_member` and seeds these values for the fixture trip's four members; flip test-only (ruled) |
| Readiness, later joiners | `ready` defaults to 0, `preference_revision` defaults to 1 | a member who joins through REQ-004 accept has not responded yet, so the readiness gate keeps blocking until a test-only flip; no product write path in this REQ |
| Null-location case (M3) | test-only update of the fixture trip's `start_location` / `end_location` to NULL, restored afterwards | the merged `V2` seed supplies both locations, so the completion branch needs documented test-only setup (REQ-004 precedent); the result is observed through `GET /api/trips/{id}` |
| Confirmed version pointer | the draft row whose `status = 'confirmed'`; `trip.main_plan_confirmed` (already added by `V3`) stays the joining flag | P2 ruling 2026-11-15: no `confirmed_draft_id` column and no `V5` ALTER of `trip`; one source of truth for the confirmed version |
| Daniel-pending case | test-only `ready = 0` for Daniel (id 4) | US-031 AC2; no product write path in this REQ |
| Preference snapshots | rev 1 per member (`trip_member.preference_revision`); `V5` seeds `member_preference` kind rows per member: `interest` (payload `{"codes":[…]}`) and `must_do` (payload `{"items":[…]}`); no `budget` row by default (no hard limit) | AC2 names only Alice's hard budget; budget-row absence keeps the C1 pass case feasible; kind/payload shape per G1 C2 default A (REQ-019 `V4` table, read-only here) |
| Alice overrun case | test-only Alice `member_preference` row `kind='budget'`, payload `{"amount":4000,"currency":"SGD","limitType":"hard"}` (40 SGD) | US-037 AC2; reads map `amount` → `hardBudgetCents` when `limitType='hard'` |
| Travel-gap case (V3) | test-only draft mutation: a stop's `travel_minutes_to_next` longer than the gap to the next stop (e.g. 45 minutes into a 30-minute gap) | G1 C1 default A: `TRAVEL_EXCEEDS_GAP` blocks confirmation; equality passes (user-selected 2026-11-15; IO Emily ratified 2026-11-15) |
| Stale case | after a draft exists, test-only bump Ben `preference_revision` to 2 | OQ-7 ruling 2026-11-15: stale blocks confirmation |
| Confirmed-frozen case (M13) | after V1 confirm, the same test-only Ben revision bump | P2 lint ruling 2026-11-15: the confirmed version stays `stale = false` regardless of later revision changes |
| Fake provider stops | City Hall MRT 09:00–09:30; National Gallery Singapore 10:00–10:30; Gardens by the Bay 11:00–11:15; Merlion Park 11:30–12:00; travel legs 30/30/15 minutes; cost 50 SGD per person | US-031 AC1 supplied times and legs; US-037 AC2 known cost; legs fit the 30/30/15 gaps exactly — equality passes the C1 travel-fit rule |
| Confirmed-state premise for later REQs | produced by the US-037 confirm flow (version 1) | supersedes the REQ-004 test-only setup for trips confirmed through this REQ |

### Requests (paths contractual, P2 2026-11-15)

| Case | Call | Expected |
|---|---|---|
| M1 generate | `POST /api/trips/{id}/main-plan`, `X-User-Id: 1`, default setup | `201`; body is the plan projection: `version` 1, `confirmed` false, `stale` false, the four `stops` in order with supplied times and `travelMinutesToNext` 30/30/15 (last null), `inputRevisions` {1:1,2:1,3:1,4:1}, `costPerPersonCents` 5000; `main_plan_confirmed` stays 0 |
| M2 pending | same call with Daniel `ready = 0` | blocked; `409 MEMBERS_NOT_READY`; response names Daniel (id 4); no draft row |
| M3 completion | null-location setup (test-only), then generate; separately the default seeded trip | `201`; `GET /api/trips/{id}` shows both locations completed per the signed 2026-11-14 ruling; with the seeded nonblank locations the same read shows them preserved unchanged |
| M4 non-organizer | generate with `X-User-Id: 2` | `403 NOT_ORGANIZER`; no draft |
| M5 regen | M1 twice | `201` with `version` 2; second draft version 2 current; version 1 superseded |
| M14 generate after confirm | generate after V1 | `409 ALREADY_CONFIRMED`; no new draft row; confirmed version unchanged; replanning deferred to R2 (user accepted and Emily IO approved 2026-11-15; overall G1 Pass) |
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
| V3 schedule | confirm a draft with overlapping stops / missing leg / leg longer than the gap to the next stop / out-of-day stop (test-only draft mutation) | blocked; `422 VALIDATION_FAILED` with the specific schedule errors (incl. `TRAVEL_EXCEEDS_GAP`, C1 default A); stays unconfirmed |
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
display-only aggregations (no AC depends on their content). User product review
2026-11-15 explicitly accepts these semantics and the six fixed rule identifiers,
free display wording and possibly empty provider-supplied per-stop tags. Emily
subsequently approved the current package on 2026-11-15 per separate explicit
signing instruction; G1 is Pass — the C1/C2 ratifications were recorded
2026-11-15 (write-sync alignment with `feat/travel_preference` is non-gating
follow-up F1 in g1-decision.md).

### Values deliberately not fixed (US-031-037)

| Item | Why no value is set |
|---|---|
| Draft ids, absolute timestamps | Assigned by the database; tests read them from responses |
| Per-stop cost breakdown | AC fixes only the 50 SGD per-person total |
| Exact randomized completion outputs | Inherited 2026-11-14 ruling: do not fix random outputs |
| Interests / must-do seed content | AC1 does not depend on specific interests; fake provider supplies the stops |
| Per-stop `interests` tags | provider-supplied; the fake provider may return none, so the array may be empty. No AC fixes tag content |
| Error message wording | Only the `code` is contractual |

## US-067 — QR scanner payloads

Same users and same sample trip as REQ-004 / US-031-037, and the same
invitation-token shape: **32-character lowercase hexadecimal** (backend
`InvitationTokens.next()` = `HexFormat.of().formatHex(new byte[16])`).
US-067 is frontend-only; the scanner never calls a new endpoint. The E2E
fixtures below are **decoded text values** the scanner must accept or reject.
The `<app-origin>` placeholder is `http://localhost:5173` on a dev machine
(vite proxy forwards `/api` to `:8080`).

### Reused invitation state inputs (from REQ-004)

| Case | Scanner behavior | Backed by REQ-004 outcome |
|---|---|---|
| Open invitation token (J1 preview) | QR decodes to same-origin `#/join/<hex>` → navigate to Join page → existing preview shown | J1 |
| Already-joined member (J6) | Scanner navigates; Join page renders `alreadyMember = true` | J3 / J6 |
| Closed / confirmed trip (J4) | Scanner navigates; Join page shows joining-closed rejection, no private trip data | J4 |
| Invalid / revoked token (U1/U2) | Scanner navigates; Join page shows `INVITATION_NOT_FOUND` | U1 / U2 |

### New scanner-only text payloads

| Id | Text payload | Expected matcher result | Scenario |
|---|---|---|---|
| SC-P1 absolute same-origin | `http://localhost:5173/#/join/0123456789abcdef0123456789abcdef` | `{ok:true, token:'0123456789abcdef0123456789abcdef'}` | I-3 camera, I-7 image |
| SC-P2 hash-only | `#/join/fedcba9876543210fedcba9876543210` | `{ok:true, token:'fedcba9876543210fedcba9876543210'}` | I-3 variant, I-8 manual link accept |
| SC-P3 unrelated plain URL | `https://example.com/foo` | `{ok:false, reason:'no-hash-form'}` | I-5 |
| SC-P4 unrelated text | `hello world` | `{ok:false, reason:'no-hash-form'}` | I-5 |
| SC-P5 cross-origin invitation-form URL | `https://another-host.example/#/join/0123456789abcdef0123456789abcdef` | `{ok:false, reason:'cross-origin'}` | I-9 |
| SC-P6 wrong-length token | `#/join/0123456789abcdef0123456789abcde` (31 hex chars) | `{ok:false, reason:'bad-token'}` | I-5 / I-8 reject |
| SC-P7 uppercase hex token | `#/join/0123456789ABCDEF0123456789ABCDEF` | `{ok:false, reason:'bad-token'}` | I-5 / I-8 reject |
| SC-P8 non-hex token | `#/join/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz` | `{ok:false, reason:'bad-token'}` | I-5 / I-8 reject |

### Values deliberately not fixed (US-067)

| Item | Why no value is set |
|---|---|
| Real invitation token used in E2E | Random per issuance; scanner tests either use a fixture issued during the same E2E run (via REQ-004 I1 case) or use the synthetic hex values above for matcher-only checks |
| Camera permission denial path (I-6) | Deterministic per browser (Chrome DevTools → Site settings → Camera → Block); no fixed fixture needed |
| Screenshot file names | The E2E checklist in `docs/feedback/e2e-us-067.md` fixes the naming convention (`s<group>-<index>-<slug>.png`) but the exact moment of capture is a human run-time choice |
| Error chip wording / timeout constants | Non-AC; design leaves canvas downscale ratio, error-chip cool-down, retry-count cap to implementation |

## US-049-050 - split confirm and cancel (2026-11-16)

Appended 2026-11-16 from issues #21/#22 and the P1 rulings (BQ-1..BQ-8). Reuses
the B-chain fixtures already recorded for US-038/039/042/043 (Singapore Friends
Day, users 1-5, window 09:30-11:30 = 120 minutes, routes A=105 / B=110).

### State setup

| Item | Value | Why |
|---|---|---|
| Active draft v3 (confirmable case) | `POST split-draft` (Ben, `X-User-Id: 2`) → v1; `PUT boundaries` (City Hall MRT -> Merlion Park) → v2; `POST routes:generate` → **v3**; fixture groups A = Alice+Ben / B = Chloe+Daniel | Both stories assume a draft with boundaries and a route pair already saved; each write bumps the version, so the confirmable draft is v3 |
| Timing verdict on that draft | A = 15+60+20+10 = 105, B = 20+60+20+10 = 110, window 120 -> both feasible | Same arithmetic as the US-043 section; the confirm recomputation must reproduce it |
| Infeasible case (CF2-N) | test-only document mutation: route A `travelLegsMinutes` last leg 20 -> 40 (A = 125) | US-049 AC2 names 125 in a 120-minute window; no product write path makes an infeasible pair, so the setup is documented as test-only |
| Missing-input case (CF3-N) | test-only document mutation: route A `activityMinutes` = null | AC-equivalent to US-043 S3-N (missing input must not be declared feasible) |
| Stale-version case (CF4-N) | request `draftVersion: 1` while the stored draft is v3 | Value comes from the difference, not from a sample claim |
| Non-organizer case (CF5-N) | confirm with `X-User-Id: 2` (Ben, member not organizer; organizer = 1) | US-049 AC3 "Ben attempts organizer-only confirmation" |
| Non-initiator case (CN3-N) | cancel with `X-User-Id: 3` (Chloe) while initiator = Ben (2) | US-050 AC3 |
| Confirmed-then-cancel case (CN2-N) | after CF1 succeeds, call cancel as the initiator | US-050 AC2 "split plan is confirmed" |
| Replacement case (CN1) | after CN1 cancel, `POST split-draft` with `X-User-Id: 1` | US-050 AC1 "unused split allowance permits a replacement draft"; new initiator = caller, `draftVersion = 1`, status active |
| `plan_node` snapshot for "main unchanged" | rows with `branch_id = 'main'` for trip 1 compared row-by-row before/after cancel; `branch_id IN ('split-a','split-b')` must end at 0 rows | US-050 AC1 "main plan remains unchanged" + BQ-7 deletion ruling |

### Requests (paths contractual at P2)

| Case | Call | Expected |
|---|---|---|
| CF1 confirm pass | `POST /api/trips/1/split-draft:confirm` `X-User-Id: 1`, `{"draftVersion":3}` | `200`; draft detail with `status = confirmed`; `GET split-draft` returns the same; a later `PUT boundaries` -> `409 SPLIT_DRAFT_NOT_ACTIVE` |
| CF2-N over window | same call on the infeasible draft | `409 SPLIT_TIMING_INFEASIBLE`; `error.details.routes[0]` = {`groupLabel: "A"`, `totalMinutes: 125`, `overrunMinutes: 5`, `missingInputs: []`}, `routes[1]` = {`groupLabel: "B"`, `totalMinutes: 110`, `overrunMinutes: 0`, `missingInputs: []`}; draft stays `active`, `draftVersion` unchanged |
| CF3-N missing input | same call on the missing-input draft | `409 SPLIT_TIMING_INFEASIBLE`; `error.details.routes[0].missingInputs` non-empty (field names, e.g. `activityMinutes`), `routes[1].missingInputs` empty; stays `active` |
| CF7-N incomplete draft | confirm on a draft with boundaries but no generated routes (or only one boundary) | `409 SPLIT_DRAFT_INCOMPLETE`; `error.details.missing` lists `routes` / `boundaries`; stays `active`; no timing recomputation |
| CF4-N stale | same call with `{"draftVersion":1}` | `409 STALE_DRAFT_VERSION`; no state change |
| CF5-N non-organizer | same call `X-User-Id: 2` | `403 NOT_SPLIT_ORGANIZER`; no state change |
| CF6-N not active | confirm before any draft, after CF1 (confirmed), and after CN1 (cancelled) | `409 SPLIT_DRAFT_NOT_ACTIVE` in all three |
| CN1 cancel pass | `POST /api/trips/1/split-draft:cancel` `X-User-Id: 2`, `{"draftVersion":3}` | `200`; `status = cancelled` and `routes = []`; `plan_node` main rows unchanged, split rows deleted; reading detail again shows `status = cancelled`, `routes = []`; ensuing `POST split-draft` `X-User-Id: 1` -> `201`, `draftVersion = 1`, `status = active`, `initiatorMemberId = 1`, and `split_draft.draft_version` column = 1 |
| CN6-N stale cancel | after the cancelled row is rebuilt by Alice (v1, active), Alice cancels using the pre-rebuild `draftVersion` (3) | `409 STALE_DRAFT_VERSION`; new draft stays `active` with its initiator/boundaries/routes |
| CN2-N cancel confirmed | cancel after CF1 | `409 SPLIT_DRAFT_NOT_ACTIVE`; confirmed document and split rows unchanged |
| CN3-N non-initiator | `X-User-Id: 3` cancel | `403 NOT_SPLIT_INITIATOR`; draft stays `active` |
| CN4-N no draft | cancel before any draft | `409 SPLIT_DRAFT_NOT_ACTIVE` |
| CF/CN R1-N guards | both endpoints without `X-User-Id`; with unknown trip `999`; with Eve (`X-User-Id: 5`) | `401 MEMBER_REQUIRED` / `404 TRIP_NOT_FOUND` / `403 NOT_A_MEMBER`; `data = null`, no draft values |
| CF/CN R2-N reverse routes | `PATCH /api/trips/1/split-draft`; `POST /api/trips/1/split-draft/confirm` (slash form) | `405`/`404`; no state change |

### Wire projection

Both `:confirm` and `:cancel` return the existing draft-detail projection (`GET /split-draft` shape) with `status` set to `confirmed` / `cancelled`:
`tripId`, `initiatorMemberId`, `mainPlanVersion`, `draftVersion`, `status`, `departureStopId`, `reunionStopId`, `groups` {`A`, `B`}, `routes` {`A`, `B`} -> {`activityMinutes`, `travelLegsMinutes`, `bufferMinutes`}, `createdAt`, `updatedAt`.
The `SPLIT_TIMING_INFEASIBLE` error detail adds `totalMinutes`, `overrunMinutes`, `missingInputs` (array of `A|B` + field hints); only `code` is contractual.
（C7 补丁 2026-11-16）上述明细的标准形状为 `error.details.routes[]`：每项 `{groupLabel, totalMinutes, overrunMinutes, missingInputs}`，固定长度 2、按 A/B 顺序；`SPLIT_DRAFT_INCOMPLETE` 的标准形状为 `error.details.missing: string[]`（`boundaries` / `routes` / `routes.A` / `routes.B`）；`data` 仍为 `null`，`code` 为唯一契约字段。

### Values deliberately not fixed (US-049-050)

| Item | Why no value is set |
|---|---|
| Confirm/cancel response ids and timestamps | Assigned by the backend; tests read them from responses |
| Whether the replacement draft reuses the seeded groups | MVP fixture supplies the same split; the assertion is on initiator/version/status, not group content round two |
| Error message wording | Only `code` is contractual |

## REQ-008 — login and session (US-066)

Same users as above. Credentials are seeded by `V6__create_account_credential.sql`
for the five fixture accounts. **Demo-only values**: they exist so acceptance can
log in without a registration story; they are shown on the demo login page (not a production account directory).

### Accounts

| id | display name | email | demo password |
|---|---|---|---|
| 1 | Alice | `alice@example.com` | `gogo-demo-2026` |
| 2 | Ben | `ben@example.com` | `gogo-demo-2026` |
| 3 | Chloe | `chloe@example.com` | `gogo-demo-2026` |
| 4 | Daniel | `daniel@example.com` | `gogo-demo-2026` |
| 5 | Eve | `eve@example.com` | `gogo-demo-2026` |

All five share one documented demo password; passwords are stored only as BCrypt
hashes.

### Requests

| Case | Call | Expected |
|---|---|---|
| A1 valid login | `POST /api/auth/login` `{"email":"alice@example.com","password":"gogo-demo-2026"}` | 200, body `id = 1`, `name = Alice`, `email = alice@example.com`; no password/hash field; session cookie set |
| A2 normalized email | A1 with `"  Alice@Example.COM  "` | 200, same account as A1 |
| A3 wrong password | A1 with `"wrong-password"` | 401, `code = INVALID_CREDENTIALS`; no session; no account field |
| A4 unknown email | A1 with `"nobody@example.com"` | 401, `code = INVALID_CREDENTIALS`, identical body to A3 |
| A5 blank credentials | A1 with email or password missing/blank | 401, `code = INVALID_CREDENTIALS`; no session |
| A6 current account | `GET /api/auth/me` with the A1 session | 200, same account as A1 |
| A7 no session | `GET /api/auth/me` without a session cookie | 401, `code = USER_REQUIRED`; no account data |
| A8 fixation | capture the anonymous session id, then A1 | post-login session id differs; the anonymous id returns 401 on `me` |
| A9 expiry | test profile with a short idle timeout; wait past it, then A6 | 401, `code = USER_REQUIRED`; a fresh A1 restores access |
| A10 CSRF missing | authenticated POST (e.g. create trip) without `X-XSRF-TOKEN` | 403, `code = CSRF_INVALID`; no state change |
| A11 CSRF valid | bootstrap the token, repeat A10 with `X-XSRF-TOKEN` | normal success/validation outcome; state changes only as the case allows |
| A12 login CSRF | A1 without and then with the CSRF token | without: 403 `CSRF_INVALID`; with: A1/A3 outcome |
| P1 protected no session | `GET /api/trips/{id}` or `POST /api/trips` without a session | 401, `code = USER_REQUIRED`; no trip values and no write |
| P2 header only | P1 with `X-User-Id: 1` but no session | 401, `code = USER_REQUIRED`; header ignored |
| P3 public surfaces | `GET /api/greeting` and `GET /api/invitations/{token}` without a session | 200 as before; preview carries only the public basics and no member/itinerary/preference data |
| P4 authenticated permissions | login as Alice, Ben, Eve; exercise create, details, issuance, accept | Alice organizer on create; Ben details 200; Eve details 403 `NOT_A_MEMBER`; Ben issuance 403 `NOT_ORGANIZER`; Eve accept joins once and her next read is 200 |
| P5 main-plan protected | main-plan read/generate/confirm without a session | 401, `code = USER_REQUIRED`; no plan data; authenticated outcomes unchanged |
| P6 invitation resume | signed-out browser opens `#/join/<token>`, acts on it, logs in | preview is public; login opens; after login the same preview resumes; no membership until explicit accept; accept then joins |
| P7 login redirect | signed-in browser opens `#/login` | `#/` opens |
| P8 hash storage | test-only direct read of `account_credential.password_hash` | value is a BCrypt hash (starts `$2`) and is not the demo password |
| C1 existing acceptance | re-run create/detail/invitation/join/main-plan/split acceptance while logged in | same outcomes and codes as the archived fixtures |
| P9 split no session | any `GET/POST/PUT /api/trips/{id}/split-draft...` without a session | 401 with `data = null` and `error.code = MEMBER_REQUIRED` (splits exception), no private data |
| P10 split authenticated | the same split calls with a member session | existing split outcomes and `{data,error}` envelope unchanged; no header is sent |

### Values deliberately not fixed (REQ-008)

| Item | Why no value is set |
|---|---|
| Session cookie value / session id | Generated per session; tests capture it from the response |
| BCrypt hash string | Salted per seed run; only the BCrypt format is contractual |
| Login error message wording | Only `code = INVALID_CREDENTIALS` is contractual |
| Exact idle timeout beyond the default | 30 minutes default; tests use a short configured timeout |
| Demo password in UI | Never displayed; it is a fixture value documented here only |
## REQ-009 — My Account, logout and registration (US-068 / US-069 / US-070)

Reuses the five seeded accounts and the sample trip above. Registration fixtures
below are **new test accounts only**; they are not seeded and must be created by
the test run. All writes use one in-memory/isolated SQLite database per run.

### Registration fixtures

| field | valid value | boundary / invalid values |
|---|---|---|
| email | `nina@example.com` | `nina.example.com`（无 @）、``（空）、`  Nina@Example.COM  `（应归一化为成功） |
| display name | `Nina` | `A`（1 字符，合法）、`123456789012345678901234567890`（30 字符，合法）、``（空）、`   `（纯空白）、`1234567890123456789012345678901`（31 字符） |
| password | `nina2026`（8 字符） | `abcde`（5 字符）、6 字符（合法）、72 字节（合法）、73 字节（拒绝） |

Duplicate-email sibling account: `alice@example.com` already exists (id 1).
Concurrent case uses the same `nina@example.com` payload submitted twice in
parallel.

UI note (2026-11-17 reference): the registration page shows the name, email,
password and confirmation password fields, a "至少 8 个字符" helper, a primary
"创建账号" button and a secondary "已有账号？去登录" button. The UI requires at
least 8 characters and a matching confirmation; the API keeps the 6–72 byte
contract, so API fixtures may still use 6–7 byte passwords.

### Requests

| Case | Call | Expected |
|---|---|---|
| R1 register valid | `POST /api/auth/register` `{"email":"nina@example.com","name":"  Nina  ","password":"nina2026"}` + CSRF | 200, body exactly `{"next":"login"}`; exactly one new `app_user` with name `Nina` and one `account_credential`; hash is BCrypt (`$2`); no session cookie |
| R2 duplicate email | R1 again, then with `"  NINA@Example.COM  "` | 409 with `code = EMAIL_TAKEN`; no second account row; registration page shows the duplicate dialog |
| R3 concurrent duplicate | two parallel R1 submissions | one 200 `{"next":"login"}` and one 409 `EMAIL_TAKEN`; exactly one account row |
| R4 invalid email | R1 with `nina.example.com` or missing email | 400 flat `{code,message}` (email-code); no row; no session |
| R5 invalid name | R1 with `""`, `"   "`, or 31 chars | 400 flat `{code,message}` (name-code); no row |
| R6 invalid password | R1 with 5 chars, then 73 bytes | 400 flat `{code,message}` (password-code); no row |
| R7 service failure | force a persistence failure during registration | 5xx flat error; no partial `app_user`; retry creates exactly one account |
| R8 register then login | R1, then `POST /api/auth/login` with the same email/password | 200 account projection; session established; dashboard opens; no verification step |
| R9 new account profile | R1 + R8, then `GET /api/auth/me` and My Account | name `Nina`, email `nina@example.com`, zero trip memberships |
| R10 invite resume | signed-out browser opens `#/join/<token>`, registers, then logs in | registration creates no session; after login the same preview resumes; no membership until explicit accept |
| M1 profile read | signed-in `GET /api/auth/me` | 200 `{id,name,email}`; no password/hash |
| M2 name update valid | `PATCH /api/auth/me` `{"name":"  Nina Chen  "}` + CSRF | 200 with name `Nina Chen`; `app_user.display_name` = `Nina Chen`; dashboard greeting/member/invitation/route labels show it; avatar initial (where rendered) is `N` |
| M3 name boundary | 1-char name, then 30-char name | both 200 and persisted trimmed |
| M4 name invalid | `""`, `"   "`, 31 chars | 400 flat error; stored name and all displays unchanged |
| M5 other account | `PATCH /api/auth/me` with a body/path naming account 1 while signed in as Nina | no way to target account 1; Nina's own name is the only affected value; Alice unchanged |
| M6 name update signed-out | `PATCH /api/auth/me` without a session | 401 `USER_REQUIRED`; no change |
| M7 name update CSRF | M2 without `X-XSRF-TOKEN` | 403 `CSRF_INVALID`; name unchanged |
| M8 name persistence | M2, then fresh `me` and a fresh login | latest name returned both times |
| L1 logout | signed-in `POST /api/auth/logout` + CSRF | 204; no body; session cookie no longer authenticates; `GET /api/auth/me` → 401 `USER_REQUIRED`; protected page opens login |
| L2 logout repeat/no session | repeat L1, and call logout without a session | 401 `USER_REQUIRED`; UI shows signed-out state without claiming a new success |
| L3 logout CSRF | L1 without `X-XSRF-TOKEN` | 403 `CSRF_INVALID`; session still valid |
| L4 logout failure | force a server failure during L1 | recoverable error shown; local auth state not falsely cleared |
| L5 logout data intact | L1, then log in again | account, display name, memberships, organizer role, groups and trip data unchanged |
| C1 navigation | signed-in shell | bottom nav has 我的; no top-right profile shortcut; existing info (i) control remains; no scan control added by this change |
| C2 greeting | signed-in dashboard | greeting uses account name; no `组织者` suffix |
| C3 account route guard | signed-out `#/account` and `/account` | login page; no profile data |
| C4 already signed-in auth pages | signed-in `#/login`, `#/register`, `/login`, `/register` | dashboard `#/` opens |

### Values deliberately not fixed (REQ-009)

| Item | Why no value is set |
|---|---|
| Generated `app_user.id` for new accounts | Depends on prior rows in the isolated test DB; assert uniqueness/one-row, not a literal id |
| BCrypt hash string | Salted per write; only the BCrypt format is contractual |
| Session cookie value | Generated per session; tests capture it from the response |
| Registered account's avatar color/style | No avatar upload; only the derived initial is contractual where an avatar exists |
| Generic success message wording | Wire contract is `{"next":"login"}` at P1; exact UI copy is P3 |

## US-013 — members (US-013)

Scope: the roster read for an existing trip. Reuses §Users and §Sample trip
unchanged: Alice (1) organizer, Ben (2), Chloe (3), Daniel (4) members, Eve (5)
not a member. Identity is the merged account/session login (US-066, REQ-008);
`X-User-Id` is retired for trip endpoints. API tests use `TestAuth.asUser`
instead of a header; the browser uses the demo accounts in §REQ-008 (password
`gogo-demo-2026`). The trip id is assigned by the database; tests read it from
the create response (or the fixture trip) rather than assume a value.

### Requests

| Case | Call | Expected |
|---|---|---|
| M1 member list | authenticated as Ben (user 2), `GET /api/trips/{id}/members` | `200`; `tripId` is the requested trip; exactly four members with `userId` 1, 2, 3, 4 in ascending order; `organizer = true` only for user 1 (Alice) |
| M2 organizer reads | authenticated as Alice (user 1), same call | `200`; same four rows; Alice is still the only `organizer = true` row |
| M3 outsider denied | authenticated as Eve (user 5), same call | `403`, `code = NOT_A_MEMBER`; the body carries no `userId`, `displayName` or organizer value |
| M4 no session | same call without authentication | `401`, `code = USER_REQUIRED`; no member data |
| M5 retired header | same call with only `X-User-Id` (blank, non-numeric or a seeded id) and no session | `401`, `code = USER_REQUIRED`; the header does not authenticate |
| M6 unknown trip | authenticated as Ben, `GET /api/trips/999999/members` | `404`, `code = TRIP_NOT_FOUND` |
| M7 outsider unknown trip | authenticated as Eve, same unknown trip | `404`, `code = TRIP_NOT_FOUND` (trip existence is checked before membership) |
| M8 joined member | direct test-only `trip_member` insert for Eve (or invitation acceptance), then read as Eve | `200`; five members; Eve (5) appears exactly once; Alice is still the only organizer |
| M9 repeated insert | direct test-only insert twice for Eve, then read | Eve still appears exactly once (`trip_member` composite primary key) |
| M10 no personal fields | authenticated as Ben, read | The body contains no readiness, preference, budget or main-plan field values |
| M11 non-read verbs | authenticated, `POST` / `PUT` / `DELETE /api/trips/{id}/members` | `405` method not allowed; no state change |

### Wire projection

| Projection | Fields |
|---|---|
| Member list (`GET /api/trips/{id}/members`) | `tripId` (integer), `members` [{`userId` (integer), `displayName` (string), `organizer` (boolean)}] ordered by ascending `userId` |

`organizer` is derived as `userId == trip.organizer_id`; it is not a stored
column and does not imply extra permission. Only the organizer row is `true`.

### Error contract

| code | Status | Case |
|---|---|---|
| `USER_REQUIRED` | 401 | no authenticated session, including a request with only a retired `X-User-Id` header (M4, M5) |
| `NOT_A_MEMBER` | 403 | authenticated caller who is not a member of an existing trip (M3) |
| `TRIP_NOT_FOUND` | 404 | unknown trip id, for a member or an outsider (M6, M7) |

Error bodies keep the existing `{code, message}` shape; only `code` is
contractual. Denial bodies contain no member identity, name or organizer value.

### Values deliberately not fixed (US-013)

| Item | Why no value is set |
|---|---|
| Avatar colour and initial rendering | Visual treatment from `ui-design-reference`; not an AC |
| Row spacing, heading/subtitle wording, count wording | Presentation text; the contract is the visible roster and organizer identification |
| Error message wording | Only the `code` is contractual |
| Trip id | Assigned by the database; tests read it from the create response or fixture |
| Member display order beyond ascending `userId` | `userId` ascending is fixed for deterministic tests; visual grouping may vary |
| Readiness, preference, budget or plan values | Out of scope; the projection must not contain them |

## US-071 — 我的行程列表

复用上面的 §Users 与 V2 种子行程（id=1）。除种子行外，再建三条 **test-only** 行程；不改产品迁移、不改种子行。

| 行程 | id | organizer | 成员 | start | end | 用途 |
|---|---|---|---|---|---|---|
| `Singapore Friends Day`（种子） | 1 | Alice | Alice, Ben, Chloe, Daniel | 2026-12-05 | 2026-12-05 | 自建行、`organizer=true`、基准行 |
| `Bali Weekend` | 测试创建 | Ben | Ben, Alice | 2026-12-08 | 2026-12-10 | 受邀行、`organizer=false` |
| `Kyoto Autumn` | 测试创建 | Alice | Alice | 2026-11-01 | 2026-11-05 | 已结束（相对 2026-11-16）+ 排序首屏 |
| `Same-Day Start` | 测试创建 | Alice | Alice | 2026-12-05 | 2026-12-06 | 与种子行同日 → 按 id 升序 |

Alice 的预期顺序（以 2026-11-16 为“今天”）：`Kyoto Autumn`(11-01) → `Singapore Friends Day`(12-05, id=1) → `Same-Day Start`(12-05, id 更大) → `Bali Weekend`(12-08)。

### Requests

| Case | Call | Expected |
|---|---|---|
| L1 member list | `GET /api/trips` as Alice | `200`; `trips` 恰好 4 条，每行程一条，顺序同上 |
| L2 same-day ordering | 同上（依赖种子行与 `Same-Day Start`） | 12-05 两条按 `id` 升序 |
| L3 organizer flag | 同上 | 种子行 / `Kyoto Autumn` / `Same-Day Start` → `organizer=true`；`Bali Weekend` → `false` |
| L4 empty account | `GET /api/trips` as Eve（无成员行） | `200`; `{"trips":[]}`；不虚构数据 |
| L5 confirmed plan | 种子行 `main_plan_confirmed=1`（生产确认或 test-only） | 仍返回且 `mainPlanConfirmed=true`；不改变其他行 |
| L6 finished trip | 同上（包含 `Kyoto Autumn`） | 仍返回同一字段集；**响应无 finished 字段**；邀请/主线/分队行为不变 |
| L7 no session | `GET /api/trips` 无会话 | `401`; `code = USER_REQUIRED` |
| L8 retired header | 仅 `X-User-Id: 1`，无会话 | `401`; `code = USER_REQUIRED` |
| L9 read-only | `POST /api/trips`（合法 body） | `201`，仅新增一条；`PUT`/`DELETE /api/trips` 不改变数据 |
| L10 outside trip still denied | `GET /api/trips/1` as Eve | 既有 `403 NOT_A_MEMBER`（回归，不进本变更断言） |

### Wire projection

| Projection | Fields |
|---|---|
| Trip list (`GET /api/trips`) | `trips` [{`id` (integer), `name` (string), `destination` (string), `startDate` (string `YYYY-MM-DD`), `endDate` (string `YYYY-MM-DD`), `organizer` (boolean), `mainPlanConfirmed` (boolean)}] ordered by ascending `startDate` then ascending `id` |

`organizer` 表示当前调用者自己是否为该行程的创建者，不落库、不代表额外权限；成员名册的 `organizer` 语义不变。

### Error contract

| code | Status | Case |
|---|---|---|
| `USER_REQUIRED` | 401 | 无会话请求列表（L7、L8） |

列表不新增其他错误码：不按 id 读取，故无 403/404 语义。

### Values deliberately not fixed（US-071）

| Item | Why no value is set |
|---|---|
| 列表页标题、“我创建的”/“已结束”徽标文案 | 展示层文案；契约是可见标题唯一 + 徽标可见性 |
| 图标与行间距、徽标颜色 | 来自 `ui-design-reference` 与 `@theme` token，非 AC |
| 测试创建的 id | 由数据库分配；断言从创建响应或 fixture 读取 |
| 分页/搜索参数 | 本变更明确不做；传 `?page=1` 不得产生分页元信息 |
| 错误 message 文本 | 只有 `code` 是契约 |
