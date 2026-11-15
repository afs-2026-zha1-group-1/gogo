# Deep-dive — Phase 2.5

Trigger: impact solution direction is **add** (new capability, greenfield repo).

## REQ-001

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` | One row per greeting message; this change seeds exactly one row, `id = 1` | `id` INT PRIMARY KEY; `message` VARCHAR(255) NOT NULL | None. Static seed written by migration `V1__create_greeting.sql`; no create/update/delete path is in scope. |

Ownership: the backend service owns the table and the migration. The frontend
never reads the database directly. No `{TBD}` fields remain.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| Database file absent at startup | in | Created automatically by the embedded engine, then migrated |
| Database file already migrated | in | Migration is a no-op on subsequent starts (idempotent) |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior; no defensive branch is specified |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; it must not fall back to a hard-coded greeting |
| Concurrent writers | out of scope | Single seeded row, read-only API |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-001 is the only requirement in the registry. No cross-REQ conflict exists;
nothing to converge. Recorded as N/A with rationale rather than left blank.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message`, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, proxied by the dev server |
| Home page failure message | Endpoint request fails or returns non-2xx | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

Retention, volume and SLA are not decidable for a scaffold slice and are not
required by any AC. Recorded as a non-blocking item for Dev, not invented.

## REQ-002

Trigger: impact solution direction is **modify** (one requirement of the existing
`greeting` capability changes). The IO rulings of 2026-11-13 close REQ-001's
OQ-2/OQ-3/OQ-4 and reopen the data contract and the wire contract.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` (storage) | One row per greeting message; exactly one row seeded, `id = 1` | `id` INTEGER PRIMARY KEY; `message` TEXT NOT NULL — SQLite dialect, replacing the H2 `INT` / `VARCHAR(255)` | None. Static seed written by `V1__create_greeting.sql`; no create/update/delete path is in scope. |
| Greeting response (wire) | One JSON object per `GET /api/greeting` call | `message`: string, required, the stored value verbatim. No other field. Media type `application/json` | None. Read-only projection of the single stored row. |

Ownership unchanged: the backend owns the table, the migration and the response
shape; the frontend never reads the database directly. No `{TBD}` fields remain.
The JSON field name `message` is fixed by the IO ruling, not chosen by Dev.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| SQLite file absent at startup | in | Created by the JDBC driver on first connection, then migrated by Flyway |
| SQLite file already migrated | in | Flyway records the applied version in `flyway_schema_history`; a later start is a no-op |
| Response body is not the ruled JSON shape | out of scope | The endpoint is the only producer and its shape is fixed by the delta spec; no defensive branch is specified |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; unchanged from REQ-001 |
| Non-JSON body with a 200 status (e.g. a dev-server fallback page) | in | `response.json()` rejects and the existing `.catch` renders the load-failure message; no new branch is needed |
| Concurrent writers | out of scope | Single seeded row, read-only API. SQLite locking under the test connection pool is a design concern, not a product branch |
| Migrating existing H2 rows | out of scope | `backend/data/` is gitignored dev state with a constant seed (OQ-5, resolved) |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-002 modifies REQ-001's endpoint requirement. The conflict is explicit and
resolved by the IO ruling, not by editing the archived record:

| Item | REQ-001 (archived) | REQ-002 | Convergence |
|---|---|---|---|
| Response body | exactly `Hello World`, `text/plain` | `{"message":"Hello World"}`, `application/json` | MODIFIED delta supersedes; REQ-001 archive stays immutable |
| Engine | H2 file mode | SQLite file mode | Design-level; the storage requirement is engine-agnostic, so no spec conflict |
| Migration tooling | Flyway kept under a working interpretation (OQ-2 deferred) | Flyway kept by explicit ruling | `TODO.md` line 33 amended to `- ORM`; contradiction removed |
| Visitor-visible heading | `Hello World` | `Hello World` | Identical — no display regression |

No ✗ remains.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message` read from the JSON `message` field, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, `application/json`, proxied by the dev server |
| Home page failure message | Request fails, returns non-2xx, or the body cannot be parsed as JSON | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

The rendered text and the failure behavior are unchanged; only the parsing step
changes. No notifications are in scope.

### NFR business-policy layer

Unchanged from REQ-001: not decidable for a scaffold slice, not required by any
AC, recorded as a non-blocking item for Dev.

## REQ-003

Trigger: impact solution direction is **add** (new `trips` capability on the
existing stack). Two stories, one aggregate, one change.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | One row per seeded traveller | `id` INTEGER PRIMARY KEY; `display_name` TEXT NOT NULL | None. Seeded by `V2`; no user API in scope |
| `trip` | One row per created trip | `id` INTEGER PRIMARY KEY AUTOINCREMENT; `name` TEXT NOT NULL; `destination` TEXT NOT NULL; `start_date` TEXT NOT NULL (ISO `YYYY-MM-DD`); `end_date` TEXT NOT NULL; `start_location` TEXT NULL; `end_location` TEXT NULL; `organizer_id` INTEGER NOT NULL REFERENCES `app_user(id)` | Created once in REQ-003; location completion belongs to US-031 under resolved OQ-6. No edit, delete or archive endpoint in this change |
| `trip_member` | One row per (trip, user) pair | `trip_id` INTEGER NOT NULL REFERENCES `trip(id)`; `user_id` INTEGER NOT NULL REFERENCES `app_user(id)`; PRIMARY KEY (`trip_id`, `user_id`) | Created with the trip for the creator only. No invite, leave or removal path is in scope |

Creation is one transaction: insert `trip`, then insert the creator's
`trip_member` row. A failure in either leaves no trip behind (this is what C2/C3
assert when they compare the row count).

Wire contract:

| Message | Fields | Notes |
|---|---|---|
| Create request | Required `name`, `destination`, `startDate`, `endDate` strings; optional nullable `startLocation`, `endLocation` strings | Dates are ISO `YYYY-MM-DD`; missing/null/blank destination rejected; unspecified locations normalize to null |
| Trip response | `id` (integer), `name`, `destination`, `startDate`, `endDate` (strings), `startLocation`, `endLocation` (string or null), `organizerId` (integer) | Same shape for `201` and for the `200` read |
| Error response | `code` (stable string), `message` (human text) | `code` values: `NAME_REQUIRED`, `DESTINATION_REQUIRED`, `INVALID_DATE`, `INVALID_DATE_RANGE`, `USER_REQUIRED`, `TRIP_NOT_FOUND`, `NOT_A_MEMBER` |

No `{TBD}` field remains.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Valid create, dates in order (equal dates allowed) | in | C1; the fixture trip uses the same start and end date |
| End date strictly before start date | out (rejected `400`) | C2 |
| Blank or whitespace-only name | out (rejected `400`) | C3 |
| Missing/null/blank destination | out (rejected `400`) | C6; `DESTINATION_REQUIRED`, no writes |
| Missing/null/blank start or end location | in | C7; stored/read as null; supplied locations preserved |
| Preference-based location completion | later US-031, outside REQ-003/004 | Resolved OQ-6: at main-plan generation use submitted member preferences for missing locations only; random locations if no preferences or suitable result; preserve user input. Owners IO Emily / SA Johnson |
| Unparseable date | out (rejected `400`) | C4-N |
| `X-User-Id` missing or not a seeded user | out (rejected `401`) | C5-N, R2-N |
| Read by a member | in | R1 |
| Read by a non-member | out (denied `403`) | R2 |
| Read of an id that does not exist | out (`404`) | R3-N |
| Trip whose only member is the organizer | in | Valid state; R1 simply is not exercised for it |
| Concurrent creates | out of scope | Each request inserts an independent row; ids come from the database, no shared state |
| Cross-trip access within one request | out of scope | The read query is scoped to the path id and the membership join |
| Edit, delete, invite, leave | out of scope | No endpoint exists |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

`trips` shares no table, endpoint or identifier with the `greeting` capability.
`req-002-greeting-json-sqlite` is still active, but it modifies `greeting` only;
the two delta specs cannot conflict and both can be applied to the Living Spec in
either order. No ✗ row.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Create page | Navigating to the create route | Traveller | Six inputs (name, destination, start/end date, start/end location), a submit action, a busy state while the request is in flight, and the server `message` when the response is `400`/`401` | `POST /api/trips` |
| Details page | Opening a trip by id | Trip member | The six saved values; a loading state; the denial message on `403`; a not-found message on `404` | `GET /api/trips/{id}` |
| Details page failure | Endpoint unreachable or non-JSON response | Viewer | Static failure text plus the reason; no trip values | Same request path |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

A trip holds a handful of members; no AC states a size limit, retention rule or
SLA. Recorded as a non-blocking item for Dev, not invented.

## REQ-004

Trigger: impact solution direction is **add** (new `invitations` capability) plus
one state requirement added to the pending `trips` capability. Three stories, one
token aggregate, one change.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `trip_invitation` | One row per trip (UNIQUE `trip_id`); created by the organizer's first issue call | `id` INTEGER PRIMARY KEY AUTOINCREMENT; `trip_id` INTEGER NOT NULL UNIQUE REFERENCES `trip(id)`; `token` TEXT NOT NULL UNIQUE | Created once per trip (get-or-create). No update, revoke or expiry path is in scope |
| `trip.main_plan_confirmed` | One boolean state per trip, added by `V3` | INTEGER NOT NULL DEFAULT 0 | 0 → 1 only by the future US-037 flow; in this change only test-only direct database setup may set it. No API transition exists |
| `trip_member` (read/write via accept) | One row per (trip, user) pair, unchanged grain from REQ-003 | unchanged | Acceptance inserts (trip, caller) once; a repeated acceptance inserts nothing |

Issuance is one transaction: select the trip's invitation; if absent, insert one
row with a freshly generated opaque token. Acceptance is one transaction: verify
token, verify joining open, insert the membership row only if absent. A rejected
acceptance leaves `trip_member` unchanged (this is what J4 asserts).

Wire contract:

| Message | Fields | Notes |
|---|---|---|
| Issue response | `token` (string), `joinPath` (string `/join/<token>`), `tripId` (integer), `tripName` (string) | `200` on first and repeated issue. The frontend composes the absolute URL from its own origin; the QR encodes that same URL |
| Preview response | `tripName`, `destination`, `startDate`, `endDate` (strings), `mainPlanConfirmed` (boolean) | No identity required. No member, itinerary or preference field exists in the shape |
| Accept response | `joined` (true), `alreadyMember` (boolean), `tripId` (integer), `tripName` (string) | `X-User-Id` required. Idempotent |
| Error response | `code` (stable string), `message` (human text) | New `code` values: `NOT_ORGANIZER`, `JOINING_CLOSED`, `INVITATION_NOT_FOUND`; reused from `trips`: `USER_REQUIRED`, `TRIP_NOT_FOUND` |

No `{TBD}` field remains.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Organizer issues, main plan unconfirmed | in | I1; token returned, one row |
| Organizer issues again | in | I2; same token, no second row |
| Member but not organizer issues | out (denied `403`) | I3; nothing created |
| Issue without identity / unknown identity | out (rejected `401`) | I4 |
| Issue for unknown trip id | out (`404`) | I5 |
| QR scan path | in | I6; decoded URL equals the composed link, same rules as J1–J4 |
| Preview of a valid token, joining open | in | J1; public basics only |
| Preview of a valid token, joining closed | in | J1 shape with `mainPlanConfirmed = true`; the join page shows the closed state instead of an accept action |
| Accept by a non-member, joining open | in | J2; membership created, member read now allowed |
| Accept twice, same identity | in | J3; exactly one membership row |
| Accept by an existing member, joining open or closed | in | J6; `alreadyMember = true`, no new row |
| Accept by a non-member after main-plan confirmation | out (rejected `403`) | J4; member list unchanged |
| Accept without identity / unknown identity | out (rejected `401`) | J5 |
| Accept with missing/unknown identity and unknown token | out (`401`) | J7; `USER_REQUIRED` takes precedence, no membership |
| Preview or identified accept of an unknown token | out (`404`) | U1/U2; generic unusable surface, no trip values, no membership |
| Join page with unknown token | in (reverse privacy case) | U3; generic message only |
| Revocation, expiry, reminder notification | out of scope | No endpoint, no field; R-2 reverse case |
| Setting main-plan confirmation through an API | out of scope | No endpoint; R-1 reverse case; US-037 owns the flow |
| Concurrent accepts of the same token by the same user | out of scope for races | The UNIQUE (trip_id, user_id) primary key from REQ-003 makes a duplicate insert impossible; SQLite serializes writers |
| Concurrent accepts by different users | in | Each inserts an independent membership row; no shared mutable state beyond the table |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-004 | Convergence |
|---|---|---|---|
| `trip` table ownership | REQ-003 `trips` (pending delta, unimplemented) | Adds one state column via `V3`, reads membership | Additive column with a default; REQ-003's six values and endpoints unchanged. Implementation order REQ-003 P4 → REQ-004 P4 |
| Identity contract | REQ-003 "Trip caller identity" | Reuses `X-User-Id`, `USER_REQUIRED` | Same contract, no second identity mechanism |
| Member read after joining | REQ-003 "Trip detail read" | J2 asserts Eve's read flips from `403` to `200` | Integration scenario, no spec change to the read requirement |
| `greeting` | REQ-001/REQ-002 | No shared table, endpoint or identifier | Independent |
| Main-plan confirmation flow | US-037 (backlog, issue #16) | State column only, no mutation path | US-037 will later add the flow as a `trips` modification; no conflict now |

No ✗ row remains. The two active changes (`req-002`, `req-003`) and this one touch
disjoint requirement sets; archive order is independent except that REQ-004's
`trips` ADDED requirement merges after REQ-003's.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Invitation panel (screen 04) | Organizer opens the trip's invitation surface | Organizer | Invitation link text, copy action, QR encoding the same absolute URL, joining-open hint; loading and error states; denial state for a non-organizer | `POST /api/trips/{id}/invitation` |
| Join page preview (screen 05) | Opening `/join/<token>` with a valid token | Invited traveler | Trip name, destination, start/end dates, joining-open hint; accept action; loading state; no member/itinerary/preference fields | `GET /api/invitations/{token}` |
| Join page joined state | Successful acceptance | New member | Joined confirmation with the trip name; repeated open shows the same joined state | `POST /api/invitations/{token}/accept` |
| Join page closed state | Preview or accept while main plan confirmed | Invited traveler | Joining-closed message; no accept action; no private fields beyond the preview basics | Same endpoints, `JOINING_CLOSED` on accept |
| Unusable surface (screen 06) | Unknown token on preview or accept | Any visitor | Generic unusable-invitation message, privacy note, back-home action; no trip name, members, destination or dates; no reminder notification workflow | Same endpoints, `INVITATION_NOT_FOUND` |
| Failure states | Endpoint unreachable or non-JSON response | Viewer | Static failure text plus reason; no trip values | Same request paths |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

Token entropy, invitation volume and retention are not decidable for a scaffold
slice and are not required by any AC. Recorded as a non-blocking item for Dev
(token generation uses a secure random source by design), not invented.

## US-031-037

Trigger: impact solution direction is **add** (new `main-itinerary` capability).
Rulings of 2026-11-15 (intent §Inherited, OQ-6/OQ-7) and the signed 2026-11-14
fixtures ruling govern.
Merge note 2026-11-15: origin/main now includes REQ-003/004 (PR #30/#31, V2/V3
schema + invitations code), so the OQ-9 convergence trigger fired. P2 convergence
ruled: this change appends **V4+** — three new tables plus two `trip_member`
columns — and does **not** alter `trip` (`main_plan_confirmed` already exists from
V3). The pre-merge "self-built V2+, six tables" wording is superseded by the
ownership notes in ⑨. Because the accept endpoint is now local, the J4
`JOINING_CLOSED` E2E is verifiable in this change (DoR W1 / impact R2 upgraded).

### ⑨ Data contract

Money is integer cents (SGD); times are local `HH:MM` strings on the trip date
(Asia/Singapore); no `{TBD}` fields remain. Flyway ownership after the OQ-9
convergence: `app_user`, `trip`, `trip_member` and `trip_invitation` come from the
merged V2/V3 (REQ-003/004); this change appends V4+ with `member_preference`,
`main_plan_draft`, `main_plan_stop` and the two `trip_member` columns. Backend
owns every table and projection. Wire field names are contractual at P2
(fixtures §US-031-037 "Wire projections").

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | one row per seeded user | **V2, merged, unchanged**: `id` INTEGER PK; `display_name` TEXT NOT NULL | static seed (ids 1–5 per fixtures) |
| `trip` | one row per trip | **V2 + V3, merged; no V4 change**: `id` PK; `name`; `destination`; `start_date`; `end_date`; `start_location` NULL; `end_location` NULL; `organizer_id` FK; `main_plan_confirmed` INTEGER NOT NULL DEFAULT 0 (V3). No `confirmed_draft_id` column (P2 ruling 2026-11-15) | created(0) → confirmed(1) via US-037; no reopen in scope; null locations completed at generation (signed ruling); the confirmed version is the draft row with `status = 'confirmed'` |
| `trip_member` | one row per (trip, user) | **V2, merged**: `trip_id`; `user_id`. **V4 adds**: `ready` INTEGER NOT NULL DEFAULT 0; `preference_revision` INTEGER NOT NULL DEFAULT 1 | V4 seeds `ready = 1`, `preference_revision = 1` for the fixture trip's four members; later joiners default to not ready; ready 0→1 and revision bumps are test-only in this REQ (product writes belong to later REQs) |
| `member_preference` | one current snapshot per (trip, user) | **V4 new**: `revision` INTEGER; `interests_json` TEXT; `must_do_json` TEXT; `hard_budget_cents` INTEGER NULL | seeded rev 1 for the four fixture members; revision increments on preference write (later REQ) |
| `main_plan_draft` | one row per (trip, version) | **V4 new**: `id` PK; `trip_id`; `version` INTEGER; `status` TEXT current/superseded/confirmed; `cost_per_person_cents` INTEGER; `input_revisions_json` TEXT (userId→revision); `created_at` | current→superseded on regeneration; current→confirmed on confirm (the confirmed row is the single source of truth for the shared version); stale is computed (input revisions vs current member revisions), not stored; the confirmed version is frozen — `stale` always false for it regardless of later revision changes (P2 lint ruling 2026-11-15) |
| `main_plan_stop` | one row per (draft, seq) | **V4 new**: `seq` INTEGER; `name` TEXT; `start_local` TEXT; `end_local` TEXT; `travel_minutes_to_next` INTEGER NULL (last stop NULL); `interests_json` TEXT NULL (provider-supplied tags, may be empty) | immutable per draft; supplied by MainPlanProvider |
| Plan projection (wire) | one object per plan read, generate 201 and confirm 200 — **same shape** | `tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions` [{userId, revision}], `stops` [{seq, name, startTime, endTime, travelMinutesToNext, interests}] | read-only; `stale` computed on read (unconfirmed drafts only); `confirmed` true for the confirmed version, whose `stale` is always false (frozen, P2 lint ruling 2026-11-15) |
| Confirm validation projection (wire) | detail fields inside the 422 `VALIDATION_FAILED` body | `scheduleErrors` [{type: OUT_OF_ORDER/OVERLAP/MISSING_LEG/OUT_OF_DAY, seq, message}]; `overruns` [{userId, displayName, hardBudgetCents, overrunCents}] | read-only; confirmation blocks on any non-empty list; staleness blocks separately with 409 `STALE_DRAFT` |
| Generation inputs projection (wire) | one object per trip inputs read | `tripId`, `readyCount`, `memberCount`, `members` [{userId, displayName, ready, preferenceRevision}], `commonInterests`, `mustDo`, `budgets` [{userId, displayName, hardBudgetCents (null = no limit)}], `rules` [identifier] | read-only; readable before any draft exists; member-readable (P2 ruling 2026-11-15; resolves F6) |

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| All members ready | in (G1) | readiness gate reads trip_member; generation proceeds |
| Any member pending | in (G2) | blocked; pending members named; no draft row |
| Provider supplies fixture stops | in | fake MainPlanProvider = MVP production (ruled); port seam |
| Provider returns empty | out of scope | fake provider contract always supplies the fixture stops; real-provider behavior belongs to the replacement seam |
| Null start/end location | in (G3) | completion per signed ruling: preferences first, random fallback |
| Supplied nonblank locations | in (G3) | preserved unchanged |
| Inputs read by a member | in (I1/M6) | member-readable summary (P2 ruling 2026-11-15); write actions stay organizer-only |
| Inputs read before any draft | in (I2/M7) | 200 summary; `NO_DRAFT` does not apply to the inputs read |
| Inputs read by a non-member | in (I3/M8) | 403 NOT_A_MEMBER |
| Schedule ordered, legs present, within trip day | in (C1) | OQ-6 minimal feasible set passes |
| Overlap / missing leg / out-of-day | in (C3) | specific schedule errors; confirmation blocked |
| Every hard budget ≥ cost | in (C1) | NULL hard budget = no limit |
| Any hard budget < cost | in (C2) | per-member overrun shown (cents → SGD display); blocked |
| Draft input revisions == current | in (C1) | current draft confirmable |
| Any revision advanced | in (C4) | stale; blocked until regeneration (OQ-7) |
| Revision advanced after confirmation | in (M13) | confirmed version frozen: `stale` stays false; staleness applies to unconfirmed drafts only (P2 lint ruling 2026-11-15) |
| Organizer writes | in | generate/confirm allowed |
| Non-organizer / non-member / no identity / unknown trip | in (G4, C5, M-N/V-N) | 403 NOT_ORGANIZER / 403 NOT_A_MEMBER / 401 USER_REQUIRED / 404 TRIP_NOT_FOUND |
| No draft at confirm | in (C5/V6) | 404 NO_DRAFT (ruled 2026-11-15) |
| Already confirmed | in (C6/V7) | 409 ALREADY_CONFIRMED (OQ-8 ruled 2026-11-15); no state change |
| Generate after confirmation | in (G6/M14) | 409 ALREADY_CONFIRMED; no new draft; replanning deferred to R2 (lint L1 recommended default A, user-selected 2026-11-15; IO Emily ratification pending at G1) |
| Joining after confirm | in (C1) | flag set here; JOINING_CLOSED enforced by REQ-004 accept (unchanged) |
| Concurrent confirms | out of scope | single organizer per trip; SQLite write serialization is a design concern, not a product branch |

### ⑪ Cross-REQ consistency

| Item | Other REQ | US-031-037 | Convergence |
|---|---|---|---|
| Location completion | REQ-003 C7: completion only during US-031 generation | G3 implements it | ✓ signed 2026-11-14 ruling (IO Emily/SA Johnson) |
| Closed joining | REQ-004 J4: accept 403 JOINING_CLOSED when flag=1; "US-037 owns the flow" | C1 sets the flag | ✓ fixtures anchor; invitations code unchanged and now merged locally, so the J4 E2E runs in this change (DoR W1 upgraded at P2) |
| Confirmed-state test setup | REQ-004 used test-only DB update | product confirm flow now produces it | ✓ precedent retained for later REQs; fixtures US-031-037 section records supersession |
| Schema divergence | REQ-003/004 V2/V3 merged into main (PR #30/#31) | V4+ extends: 3 new tables + `trip_member.ready` / `preference_revision`; no `trip` ALTER; confirmed version derived from draft status | ✓ converged at P2 2026-11-15 (OQ-9 trigger fired; SA Lumi confirmed at G1, Pass 2026-11-15). Fixture-self-contained ruling stands: the merged V2 seed already supplies the fixture users/trip, V4 seeds readiness + preference snapshots |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Screen 9 generate summary | page load | members (P2 ruling 2026-11-15; write actions stay organizer-only) | ready count (4/4) + member names; common interests chips; must-do summary; constraints/budget lines; generation rules list | generation inputs projection (`GET /api/trips/{id}/main-plan/inputs`, P2 ruled; members may read) |
| Screen 10 draft timeline | draft read | members | per stop: name, time range, interest tags (provider-supplied, may be empty), cost per person; version badge; stale banner when stale | plan projection |
| Screen 10 validation status / blocked errors | confirm attempt | organizer | scheduleErrors list; per-member overrun amount (10 SGD case); stale message | confirm validation projection |
| Screen 10 confirmed state | confirm success | members | confirmed version badge; shared plan timeline; joining-closed notice | plan projection (confirmed flag) — the confirm 200 body is the same projection |
| Loading / empty / error / permission states | request lifecycle / no draft / failure / non-organizer | viewer | skeleton; no-draft CTA to generate; load-failure text; read-only or denied write UI | same projections; mandatory even if unpictured |

No notifications (email/push/queue) in scope.

### NFR business-policy layer

Retention/volume/SLA not decidable for this slice and not required by any AC;
recorded as non-blocking for Dev, not invented.
