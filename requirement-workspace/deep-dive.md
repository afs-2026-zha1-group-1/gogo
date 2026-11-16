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

## REQ-005

Trigger: impact solution direction is **add** (new frontend-only `app-shell`
capability). One story, one shell frame, one change. No backend or database
concept is introduced; the data contract below covers the frontend navigation
state, which is the only state this change owns.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `route` (parsed hash) | One current route per app instance | `page` ∈ {home, trips-empty, details, create, split, members, join}; `tripId` (integer, details only); `token` (string, join only) | `hashchange` → re-parse; default home for `/` and unknown paths (as-is `App.jsx:8-16`); new entries: bare 行程 path (proposed `#/trips`, OQ-4), `#/split`, `#/members` |
| `userId` (scaffold identity) | One selected id per app instance, App-level state | integer, default 1, from the seeded user list | Switcher change updates it; hash navigation never resets it (App does not remount); every `api()` call sends it as `X-User-Id` (unchanged contract) |
| Tab model | Four fixed tabs | order 仪表盘 / 行程 / 分队 / 成员; each: icon, label, target route, active rule | Active rule: home→仪表盘; trips-empty/details/create→行程; split→分队; members→成员; join→no dock, no active tab |
| Trip selection (OQ-5) | Optional last-opened trip id, P3 decision | integer or none | Proposed: route-derived (details iff the hash carries an id); optional last-trip memory is a P3 UX choice, not a contract field |

No backend table, column, endpoint or wire shape is added or changed (reverse
case R-3). No `{TBD}` field remains: OQ-1/OQ-2/OQ-4/OQ-5 are naming/UX polish
with concrete proposals above, not undecided data fields.
## US-031-037

Trigger: impact solution direction is **add** (new `main-itinerary` capability).
Rulings of 2026-11-15 (intent §Inherited, OQ-6/OQ-7) and the signed 2026-11-14
fixtures ruling govern.
Merge note 2026-11-15: origin/main now includes REQ-003/004 (PR #30/#31, V2/V3
schema + invitations code), so the OQ-9 convergence trigger fired. P2 convergence
ruled: this change appends new tables plus two `trip_member` columns and does
**not** alter `trip` (`main_plan_confirmed` already exists from V3). The
pre-merge "self-built V2+, six tables" wording is superseded by the ownership
notes in ⑨. G1 C2 ruling 2026-11-15 (recommended default A, user-selected; SA
Lumi re-confirmed 2026-11-15): `member_preference` is the kind/payload table owned
by REQ-019's V4 on `feat/travel_preference`; this change appends **V5** with
two new tables (`main_plan_draft`, `main_plan_stop`) plus the two `trip_member`
columns and reads `member_preference`; merge order REQ-019 V4 first. Because
the accept endpoint is now local, the J4 `JOINING_CLOSED` E2E is verifiable in
this change (DoR W1 / impact R2 upgraded).

### ⑨ Data contract

Money is integer cents (SGD); times are local `HH:MM` strings on the trip date
(Asia/Singapore); no `{TBD}` fields remain. Flyway ownership after the OQ-9
convergence and the G1 C2 ruling: `app_user`, `trip`, `trip_member` and
`trip_invitation` come from the merged V2/V3 (REQ-003/004); `member_preference`
comes from REQ-019's V4 (`feat/travel_preference`, read-only here); this change
appends V5 with `main_plan_draft`, `main_plan_stop` and the two `trip_member`
columns. Backend owns every table and projection. Wire field names are
contractual at P2 (fixtures §US-031-037 "Wire projections").

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | one row per seeded user | **V2, merged, unchanged**: `id` INTEGER PK; `display_name` TEXT NOT NULL | static seed (ids 1–5 per fixtures) |
| `trip` | one row per trip | **V2 + V3, merged; no V5 change**: `id` PK; `name`; `destination`; `start_date`; `end_date`; `start_location` NULL; `end_location` NULL; `organizer_id` FK; `main_plan_confirmed` INTEGER NOT NULL DEFAULT 0 (V3). No `confirmed_draft_id` column (P2 ruling 2026-11-15) | created(0) → confirmed(1) via US-037; no reopen in scope; null locations completed at generation (signed ruling); the confirmed version is the draft row with `status = 'confirmed'` |
| `trip_member` | one row per (trip, user) | **V2, merged**: `trip_id`; `user_id`. **V5 adds**: `ready` INTEGER NOT NULL DEFAULT 0; `preference_revision` INTEGER NOT NULL DEFAULT 1 | V5 seeds `ready = 1`, `preference_revision = 1` for the fixture trip's four members; later joiners default to not ready; ready 0→1 and revision bumps are test-only in this REQ. Cross-branch write-sync agreement (G1 C2; SA Lumi re-confirmed 2026-11-15; alignment with `feat/travel_preference` = non-gating follow-up F1): REQ-019/020/024 preference writes bump `preference_revision`; REQ-026 submission sets `ready = 1`; these columns stay the generation gate's source of truth |
| `member_preference` | one row per (trip, user, kind) | **REQ-019 V4, read-only here** (G1 C2 default A, user-selected 2026-11-15; SA Lumi re-confirmed 2026-11-15): `id` PK; `trip_id`; `user_id`; `kind` TEXT (`interest` / `must_do` / `budget` / `submission`); `payload` TEXT (JSON); `updated_at` TEXT; UNIQUE(`trip_id`,`user_id`,`kind`) | V5 seeds `interest` + `must_do` rows for the four fixture members (rev 1 via `trip_member.preference_revision`); no `budget` row = no hard limit; reads map `interest.payload.codes` → commonInterests input, `must_do.payload.items` → mustDo input (items carry optional `location`, the P3 source for preferences-first completion), `budget.payload.amount` (limitType `hard`) → hardBudgetCents; the earlier wide-table shape (`interests_json`/`must_do_json`/`hard_budget_cents`) is superseded |
| `main_plan_draft` | one row per (trip, version) | **V5 new**: `id` PK; `trip_id`; `version` INTEGER; `status` TEXT current/superseded/confirmed; `cost_per_person_cents` INTEGER; `input_revisions_json` TEXT (userId→revision); `created_at` | current→superseded on regeneration; current→confirmed on confirm (the confirmed row is the single source of truth for the shared version); stale is computed (input revisions vs current member revisions), not stored; the confirmed version is frozen — `stale` always false for it regardless of later revision changes (P2 lint ruling 2026-11-15) |
| `main_plan_stop` | one row per (draft, seq) | **V5 new**: `seq` INTEGER; `name` TEXT; `start_local` TEXT; `end_local` TEXT; `travel_minutes_to_next` INTEGER NULL (last stop NULL); `interests_json` TEXT NULL (provider-supplied tags, may be empty) | immutable per draft; supplied by MainPlanProvider |
| Plan projection (wire) | one object per plan read, generate 201 and confirm 200 — **same shape** | `tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions` [{userId, revision}], `stops` [{seq, name, startTime, endTime, travelMinutesToNext, interests}] | read-only; `stale` computed on read (unconfirmed drafts only); `confirmed` true for the confirmed version, whose `stale` is always false (frozen, P2 lint ruling 2026-11-15) |
| Confirm validation projection (wire) | detail fields inside the 422 `VALIDATION_FAILED` body | `scheduleErrors` [{type: OUT_OF_ORDER/OVERLAP/MISSING_LEG/TRAVEL_EXCEEDS_GAP/OUT_OF_DAY, seq, message}]; `overruns` [{userId, displayName, hardBudgetCents, overrunCents}] | read-only; confirmation blocks on any non-empty list; staleness blocks separately with 409 `STALE_DRAFT`. `TRAVEL_EXCEEDS_GAP` added by G1 C1 default A (user-selected 2026-11-15; IO Emily ratified 2026-11-15) |
| Generation inputs projection (wire) | one object per trip inputs read | `tripId`, `readyCount`, `memberCount`, `members` [{userId, displayName, ready, preferenceRevision}], `commonInterests`, `mustDo`, `budgets` [{userId, displayName, hardBudgetCents (null = no limit)}], `rules` [identifier] | read-only; readable before any draft exists; member-readable (P2 ruling 2026-11-15; resolves F6) |

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| `#/` default | in | S3; home content under shell, 仪表盘 active |
| Bare 行程 route, no trip selected | in | S5; text empty state, 创建行程 + 按编号打开行程, 行程 active |
| `#/trips/<id>` member read | in | S4; existing details under shell, 行程 active |
| `#/trips/<id>` non-member / unknown id / unreachable | in (unchanged states) | S4/S11; existing denied/missing/failed surfaces, no new behavior |
| `#/create` | in | S6; form + validation unchanged, 行程 active, back → 行程, submit → `#/trips/<id>` |
| `#/split`, `#/members` | in | S7; honest text placeholder + link back to 行程; no demo data |
| `#/join/<token>` valid | out of dock | S8; full-screen preview/accept/joined/closed exactly as today |
| `#/join/<token>` unknown | out of dock | S8; full-screen unusable, no private data, as today |
| Unknown hash path | in (fallback) | As-is home fallback retained; 仪表盘 active |
| Non-numeric id in `#/trips/…` | in (fallback) | As-is regex fails → home fallback; no new route contract |
| Tab switch forward and reverse | in | S2/S10; hash updates without reload, identity kept, unique heading per page |
| Browser back/forward | in | S10; hashchange drives route; identity survives |
| Identity switch on any shell route | in | S9; header updates on every request; label stays scaffold |
| Open-by-id with unknown id | in (existing 404) | OQ-1; reuses details missing state, no list-all call |
| List-all-trips endpoint or call | out of scope | R-1 reverse case; US-061 owns aggregation |
| Fabricated members/routes/statuses | out of scope | R-2 reverse case; placeholders are text only |
| Backend / migration / CI change | out of scope | R-3 reverse case |
| Dock on join/unusable | out of scope | S8 doubles as the guest-navigation reverse case |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-005 | Convergence |
|---|---|---|---|
| Home / greeting surface | REQ-001/REQ-002 `greeting` | Composed under shell at `#/`; fetch and states unchanged | No contract change; placement only |
| Create / details surfaces | REQ-003 `trips` (pending delta, implemented) | Composed under shell; create back-target moves from `#/` to 行程 per the story table | Placement change only; validation, permission and submit contracts unchanged (S11) |
| Invitation panel / join flow | REQ-004 `invitations` (pending delta, implemented) | Panel stays inside details; join/unusable excluded from dock, scaffold bar retained | No contract change; AC9 + OQ-6 |
| Identity contract | REQ-003 "Trip caller identity" | Reuses `X-User-Id` switcher, App-level state | Same contract, no second identity mechanism |
| Hash router | REQ-004 design D7 | Extends the shared `parseRoute` table, no new router dependency | One routing mechanism |
| Future tabs | US-013, US-038–062, US-061 (backlog) | Placeholders now; real features later replace placeholder content inside the same shell | Shell is the stable anchor; no conflict now |

No ✗ row remains. `app-shell` is disjoint from the three active changes'
delta sets (`greeting`, `trips`, `invitations`); archive order is independent.
| All members ready | in (G1) | readiness gate reads trip_member; generation proceeds |
| Any member pending | in (G2) | blocked; pending members named; no draft row |
| Provider supplies fixture stops | in | fake MainPlanProvider = MVP production (ruled); port seam |
| Provider returns empty | out of scope | fake provider contract always supplies the fixture stops; real-provider behavior belongs to the replacement seam |
| Null start/end location | in (G3) | completion per signed ruling: preferences first, random fallback |
| Supplied nonblank locations | in (G3) | preserved unchanged |
| Inputs read by a member | in (I1/M6) | member-readable summary (P2 ruling 2026-11-15); write actions stay organizer-only |
| Inputs read before any draft | in (I2/M7) | 200 summary; `NO_DRAFT` does not apply to the inputs read |
| Inputs read by a non-member | in (I3/M8) | 403 NOT_A_MEMBER |
| Schedule ordered, legs present and fitting the gaps, within trip day | in (C1) | OQ-6 minimal feasible set + G1 C1 travel-fit rule passes (equality allowed) |
| Overlap / missing leg / out-of-day | in (C3) | specific schedule errors; confirmation blocked |
| Travel leg longer than the gap to the next stop | in (C3/V3) | `TRAVEL_EXCEEDS_GAP` on the stop carrying the leg (end time + leg > next start); blocks confirmation; equality passes (G1 C1 default A, user-selected 2026-11-15; IO Emily ratified 2026-11-15) |
| Every hard budget ≥ cost | in (C1) | NULL hard budget = no limit |
| Any hard budget < cost | in (C2) | per-member overrun shown (cents → SGD display); blocked |
| Draft input revisions == current | in (C1) | current draft confirmable |
| Any revision advanced | in (C4) | stale; blocked until regeneration (OQ-7) |
| Revision advanced after confirmation | in (M13) | confirmed version frozen: `stale` stays false; staleness applies to unconfirmed drafts only (P2 lint ruling 2026-11-15) |
| Organizer writes | in | generate/confirm allowed |
| Non-organizer / non-member / no identity / unknown trip | in (G4, C5, M-N/V-N) | 403 NOT_ORGANIZER / 403 NOT_A_MEMBER / 401 USER_REQUIRED / 404 TRIP_NOT_FOUND |
| No draft at confirm | in (C5/V6) | 404 NO_DRAFT (ruled 2026-11-15) |
| Already confirmed | in (C6/V7) | 409 ALREADY_CONFIRMED (OQ-8 ruled 2026-11-15); no state change |
| Generate after confirmation | in (G6/M14) | 409 ALREADY_CONFIRMED; no new draft; replanning deferred to R2 (user accepted and Emily IO approved 2026-11-15; overall G1 Pass) |
| Joining after confirm | in (C1) | flag set here; JOINING_CLOSED enforced by REQ-004 accept (unchanged) |
| Concurrent confirms | out of scope | single organizer per trip; SQLite write serialization is a design concern, not a product branch |

### ⑪ Cross-REQ consistency

| Item | Other REQ | US-031-037 | Convergence |
|---|---|---|---|
| Location completion | REQ-003 C7: completion only during US-031 generation | G3 implements it | ✓ signed 2026-11-14 ruling (IO Emily/SA Johnson) |
| Closed joining | REQ-004 J4: accept 403 JOINING_CLOSED when flag=1; "US-037 owns the flow" | C1 sets the flag | ✓ fixtures anchor; invitations code unchanged and now merged locally, so the J4 E2E runs in this change (DoR W1 upgraded at P2) |
| Confirmed-state test setup | REQ-004 used test-only DB update | product confirm flow now produces it | ✓ precedent retained for later REQs; fixtures US-031-037 section records supersession |
| Schema divergence | REQ-003/004 V2/V3 merged into main (PR #30/#31); REQ-019 (`feat/travel_preference`) owns `member_preference` V4 | V5 extends: 2 new tables + `trip_member.ready` / `preference_revision`; no `trip` ALTER; confirmed version derived from draft status; `member_preference` read-only here (kind/payload) | ✓ OQ-9 converged at P2 2026-11-15; G1 C2 default A (user-selected 2026-11-15) fixes shape/numbering/merge order — SA Lumi re-confirmed 2026-11-15; write-sync alignment with `feat/travel_preference` (SA evelyn.huang) = non-gating follow-up F1 (g1-decision.md). Fixture-self-contained ruling stands: V2 seeds users/trip, V5 seeds readiness + preference kind rows |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Shell frame | Any in-app route renders | Traveler | Centered ≤430 px column, 100 dvh, scrolling content, fixed dock below, safe-area padding; existing tokens | Client render |
| Bottom dock | Shell present | Traveler | Four tabs (icon + label) in fixed order; active highlight from brand tokens; hash targets | Client navigation |
| 仪表盘 page | `#/` | Traveler | Existing home content: greeting status, create entry, identity scaffold; unique heading | `GET /api/greeting` (unchanged) |
| 行程 empty state | Bare 行程 route, no trip selected | Traveler | Text empty state + exactly two actions: 创建行程, 按编号打开行程; unique heading; no trip data | Client render; open-by-id → `#/trips/<id>` |
| 行程 details | `#/trips/<id>` | Trip member | Existing hero, information rows, organizer invitation panel; loading/denied/missing states unchanged | `GET /api/trips/{id}` (unchanged) |
| Create page | `#/create` | Traveler | Existing six inputs + validation; back → 行程; busy/error states unchanged | `POST /api/trips` (unchanged) |
| 分队 placeholder | `#/split` | Traveler | Honest "not implemented yet" text + link back to 行程; unique heading; no demo data | Client render |
| 成员 placeholder | `#/members` | Traveler | Honest "not implemented yet" text + link back to 行程; unique heading; no demo data | Client render |
| Join / unusable | `#/join/<token>` | Invited guest | Full-screen, no dock; preview/accept/joined/closed/unusable exactly as today; scaffold bar retained | Invitation endpoints (unchanged) |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

No retention, volume or SLA is stated by any AC; the shell adds no data.
Browser support for `100dvh` and safe-area insets is a verification item at P4
(R19), not a requirement unknown. Recorded, not invented.

## REQ-008

Trigger: impact solution direction is **add** (new `auth` capability) plus
**modify** (`trips`/`invitations` identity, `app-shell` login/switcher). This is
the first change that stores credentials and session-derived identity, so the
data contract covers both the persisted credential row and the runtime session.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `account_credential` (new, V6) | One row per `app_user` account | `user_id` INTEGER PRIMARY KEY REFERENCES `app_user(id)`; `email` TEXT NOT NULL with a UNIQUE index (trimmed, lower-cased for comparison); `password_hash` TEXT NOT NULL (BCrypt, never plaintext) | Seeded once for users 1–5 by `V6` (V1–V5 occupied: V4 = splits, V5 = main plan); no create/update/delete path in this change (registration/password change out of scope) |
| Authenticated account (wire) | One object per login/`me` response | `id` (integer), `name` (`app_user.display_name`), `email` (credential email); no password/hash field ever | Read-only projection |
| Session (Spring Security) | One server-side session per signed-in browser | Session id in an HttpOnly cookie; principal carries account id/email/name; CSRF token bound to the session; idle timeout configurable (30 min default, short in tests) | anonymous → authenticated on valid login (session id rotated); authenticated → anonymous on expiry, invalid cookie or future logout; restart of the single server drops in-memory sessions and therefore authenticates nobody |
| CSRF token | One token per session, exposed to the SPA | `XSRF-TOKEN` cookie readable by same-origin JS; required in the `X-XSRF-TOKEN` header for state-changing requests | Issued on bootstrap/login; validated per request; invalid/missing → 403 and no state change |
| Pending invitation (client) | At most one token per browser tab | Invitation token string plus the intended `#/join/<token>` route, held only while signed out | Set when a guest acts on a preview without a session; consumed after login to resume the preview; cleared when the preview is left or accepted; never triggers an automatic accept |
| Frontend auth state | One per app instance | `checking` (bootstrap `me` request), `signedIn` (account), `signedOut` (login required) | Boot → `checking`; 200 `me` → `signedIn`; 401 → `signedOut`; login success → `signedIn`; 401 on any protected call → `signedOut` + login page |

No `{TBD}` field remains. The only intentionally open values are the documented
demo password/emails (fixture content, OQ-8) and the timeout number (OQ-4); both
have concrete proposals and do not change grain or ownership.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Valid seeded email + password | in | S1; 200 account + new session; `me` 200; dashboard opens |
| Unknown email, wrong password, malformed/blank fields | in | S3; one generic credential failure (401), no session, no account-existence signal |
| Same email with different letter case or surrounding spaces | in | Credential comparison trims and lower-cases; same account, no duplicate row |
| Protected endpoint without a session cookie | in | S4/S9; 401 `USER_REQUIRED`, no private data |
| Protected endpoint with an expired/invalid session | in | S5; 401 `USER_REQUIRED`, no private data; frontend opens login |
| Request with only the old `X-User-Id` header | in (reverse case) | S9/R-1; unauthenticated 401; the header is ignored by design |
| Login while already authenticated | in | S10-adjacent; new login rotates the session id; already-signed-in access to `#/login` returns to dashboard (OQ-10) |
| Login success on an existing anonymous session | in | S10; old session id stops authenticating (fixation protection) |
| Session cookie from a previous server run | in | Invalid after restart; 401/login (in-memory session store) |
| Public greeting / invitation preview | in | S7; unchanged, identity-free |
| Public preview → accept while signed out | in | S2; 401 on accept, pending invitation retained, login, preview resumes, explicit accept required |
| Authenticated accept for a valid/open invitation | in | S6; existing join rules and duplicate-membership protection unchanged |
| Authenticated non-member reading a trip | in | S6; 403 `NOT_A_MEMBER`, no trip values (unchanged) |
| State-changing request without a valid CSRF token | in | S8; 403, no state change; login POST also requires the bootstrap token |
| CSRF bootstrap request | in (public) | `GET /api/auth/csrf` issues/refreshes the token cookie without exposing account data |
| Logout / account edit / registration request | out of scope | R-2; no endpoint or UI is added (US-068/US-069 own them) |
| Identity switcher or seeded-user list in the browser | out of scope | R-3; removed, no replacement switch affordance |
| Plaintext password storage or logging | out of scope | R-5; BCrypt only; passwords never returned or logged |
| Membership rule change | out of scope | R-6; authentication proves identity, not membership |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-008 | Convergence |
|---|---|---|---|
| Caller identity | `trips` "Trip caller identity" (living) | MODIFY: session principal replaces `X-User-Id`; 401 `USER_REQUIRED` retained; 403 membership rule unchanged | One identity mechanism; no header fallback |
| Trip creation/detail | `trips` creation/detail requirements | Behavior unchanged; the organizer/member is the authenticated account | Scenarios rewritten to "after login as Alice/Ben" |
| Invitation issuance/accept | `invitations` issuance/acceptance (living) | MODIFY: principal replaces the header; preview stays public; identity-error precedence stays | Same outcomes and codes |
| Main-plan identity | `main-itinerary` "Authorization and identity for main-plan operations" (living) | MODIFY: session principal replaces `X-User-Id`; organizer/member outcomes and `USER_REQUIRED` retained | Delta added in this change |
| Split identity | `splits` five draft endpoints (living) | MODIFY: session principal replaces the header; `MEMBER_REQUIRED` and the `{data,error}` envelope remain documented exceptions | Delta added in this change; no split behavior change |
| Shell identity surface | `app-shell` "Mobile shell frame" (living) | MODIFY: switcher removed, signed-in name shown read-only; login is full-screen without dock; dock/frame/join exclusion unchanged | Shell is signed-in only; guest preview outside |
| Greeting | `greeting` (living) | Unchanged and public | No dependency |
| Dashboard landing | `app-shell` "Dashboard tab placement"; US-061 | `#/` becomes protected and is the post-login landing; aggregation still US-061 | No dashboard data added here |
| Scanner | US-067 (Backlog) | Consumes `#/login` and session; no scanner code | Downstream only |
| My Account / logout | US-068/US-069 (Backlog) | Session and principal support them; no account/logout endpoint added | Downstream only |
| Binding plan | `docs/knowledge/architecture/tech-stack-plan.md` | Plan states no accounts and `X-Member-Id`; this change adds Spring Security + credentials | Recorded deviation; reconcile at archive per `openspec/config.yaml` |
| Fixtures/tests | trip/invitation/main-plan/splits acceptance tests use the header | Rewrite to authenticate via session; expected outcomes/codes unchanged | Test-only migration, no product contract change |

No ✗ row remains. `auth` is new; `trips`, `invitations`, `app-shell`,
`main-itinerary` and `splits` are the modified capabilities; `greeting` is
untouched.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Login page | Signed-out access to a protected page, or direct `#/login` | Signed-out traveler | Full-screen (no dock) email + password form, submit, busy and generic failure text; no account-existence hints, no account data, Ant Design language | Login/CSRF endpoints over HTTP |
| Post-login dashboard | Successful login with no pending invitation (or other intercepted page) | Signed-in traveler | `#/` dashboard/home content with the dock; signed-in account name shown read-only | Session cookie |
| Invitation resume | Successful login with a pending invitation | Signed-in invited guest | The same `#/join/<token>` preview resumes; no automatic join; explicit accept remains | Session cookie + public preview |
| Protected-page redirect | 401 from a protected page/API or an expired session | Signed-out/expired traveler | Login page opens; no private trip, member, invitation or account data is rendered | Client route guard + 401 |
| Shell identity indicator | Any signed-in shell route | Signed-in traveler | Read-only account display name; no switcher, no seeded-user list, no account actions | Session-derived `me` |
| Public greeting | Home/dashboard greeting request | Any visitor | Existing greeting content | `GET /api/greeting` (public) |
| Public invitation preview | Guest opens `#/join/<token>` | Any visitor | Existing public preview (trip name, destination, dates, joining state); no identities | `GET /api/invitations/{token}` (public) |
| Split error surface | Split endpoint without a valid session | Caller | `401 MEMBER_REQUIRED` with `{data:null,error:{code,message}}`; unchanged from the merged splits contract | Split endpoints (session-derived identity, documented exception) |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

The only policy values stated are the session idle timeout (proposed 30 minutes,
configurable) and BCrypt hashing. Rate limiting, account lockout, password
complexity and audit logging are deployment/security-operations concerns not
named by any AC; recorded as non-blocking for Dev/SA, not invented.

| Screen 9 generate summary | page load | members (P2 ruling 2026-11-15; write actions stay organizer-only) | ready count (4/4) + member names; common interests chips; must-do summary; constraints/budget lines; generation rules list | generation inputs projection (`GET /api/trips/{id}/main-plan/inputs`, P2 ruled; members may read) |
| Screen 10 draft timeline | draft read | members | per stop: name, time range, interest tags (provider-supplied, may be empty), cost per person; version badge; stale banner when stale | plan projection |
| Screen 10 validation status / blocked errors | confirm attempt | organizer | scheduleErrors list; per-member overrun amount (10 SGD case); stale message | confirm validation projection |
| Screen 10 confirmed state | confirm success | members | confirmed version badge; shared plan timeline; joining-closed notice | plan projection (confirmed flag) — the confirm 200 body is the same projection |
| Loading / empty / error / permission states | request lifecycle / no draft / failure / non-organizer | viewer | skeleton; no-draft CTA to generate; load-failure text; read-only or denied write UI | same projections; mandatory even if unpictured |

No notifications (email/push/queue) in scope.

### NFR business-policy layer

Retention/volume/SLA not decidable for this slice and not required by any AC;
recorded as non-blocking for Dev, not invented.

## US-049-050

补充 B 链收口（确认 / 取消）的数据契约、边界枚举、跨 REQ 对齐与展示契约。依据：`requirements/US-049-050.md`、`intents/2026-11-16-us-049-050-split-confirm-cancel.md`、main 代码与 `V4__splits.sql`。

### ⑨ Data contract

**概念：拆分草稿（单行，`split_draft`）**

| 维度 | 台账 |
|---|---|
| 粒度 | 一行 = 一个行程的当前草稿（`trip_id UNIQUE`）；无历史行 |
| 载体 | `split_draft(id TEXT PK, trip_id INTEGER UNIQUE, document TEXT, draft_version INTEGER, created_at, updated_at)`；业务字段全在 `document` JSON（`SplitDraftDocument`） |
| 关键字段 | `initiatorMemberId`（`app_user.id` 字符串）、`mainPlanVersion`、`draftVersion`、`status`、`departureStopId`/`reunionStopId`、`groups{A:[ids],B:[ids]}`、`routes{A|B:{activityMinutes,travelLegsMinutes[],bufferMinutes}}`、`createdAt`/`updatedAt` |
| 状态集 | `active`（可编辑/可确认/可取消）、`confirmed`（冻结，不可编辑/不可取消）、`cancelled`（终止，仅可被替换重建） |
| 状态迁移 | `active → confirmed`（组织者确认成功）；`active → cancelled`（发起人取消）；`cancelled → active`（同一行重建：`document` 全量替换为新发起者 + `draftVersion = 1`）；`confirmed → *` 禁止 |

**迁移与字段变更（无 schema 变更、无新迁移）**

| 动作 | 列变更 | 文档变更 | 其他写入 |
|---|---|---|---|
| 确认 | `document`、`updated_at`；`draft_version` **不变** | `status: active → confirmed`；其余字段原样保留（路线/分组/边界即生效契约） | 无（split 路线节点已在生成时落库） |
| 取消 | `document`、`updated_at`；`draft_version` **不变** | `status: active → cancelled` | `DELETE FROM plan_node WHERE trip_id=? AND branch_id IN ('split-a','split-b')`，与状态更新同一事务；`branch_id='main'` 节点不动 |
| 替换重建 | `document`、`draft_version` 重置 1、`updated_at` | 新文档：`initiatorMemberId = 调用者`、`mainPlanVersion = 当前`、`status = active`、边界/路线清空、`groups` 由夹具供给 | 沿用 US-038 的首次创建逻辑（无 split 路线节点可删） |

**确认的判定输入（服务端复算）**：窗口 = `departureStop.endAt → reunionStop.startAt`（分钟）；两条路线时长 = `activityMinutes + Σ travelLegsMinutes + bufferMinutes`；任一 `missingInputs` 非空或 `feasible = false` → 不可确认。判定完全来自草稿文档，零额外读库；**客户端 `confirmable` 不参与**。

**错误契约**（仅 `code` 为契约）：`NOT_SPLIT_ORGANIZER` 403（新增）、`SPLIT_TIMING_INFEASIBLE` 409（新增，附 `totalMinutes`/`overrunMinutes`/`missingInputs`）、`STALE_DRAFT_VERSION` 409、`SPLIT_DRAFT_NOT_ACTIVE` 409、`NOT_SPLIT_INITIATOR` 403、`SPLIT_BOUNDARIES_REQUIRED` 409、`INVALID_ROUTE_PAIR` 400，以及三守卫码 `MEMBER_REQUIRED` 401 / `TRIP_NOT_FOUND` 404 / `NOT_A_MEMBER` 403。

### ⑩ Boundary enumeration

| 分支 | in / out | 归属与可观察结果 |
|---|---|---|
| 确认成功（两组齐全、边界已存、路线对可行） | in | CF1：`200` + `status=confirmed` + 后续编辑 `409 SPLIT_DRAFT_NOT_ACTIVE` |
| 超窗（A=125 > 120） | in（拒绝） | CF2-N：`409 SPLIT_TIMING_INFEASIBLE` + `overrunMinutes=5`；草稿仍 `active` |
| 缺输入（活动时长/末段交通为 null） | in（拒绝） | CF3-N：`409 SPLIT_TIMING_INFEASIBLE` + `missingInputs`；不得宣布可行 |
| 版本落后（请求 v1、实际 v2） | in（拒绝） | CF4-N：`409 STALE_DRAFT_VERSION`；状态不变 |
| 非组织者确认 | in（拒绝） | CF5-N：`403 NOT_SPLIT_ORGANIZER` |
| 无草稿 / 已 confirmed / 已 cancelled 时确认 | in（拒绝） | CF6-N：`409 SPLIT_DRAFT_NOT_ACTIVE` |
| 取消成功（发起人 + 活跃草稿） | in | CN1：`200` + `status=cancelled`；main 节点逐行不变；split 节点清零；随后重建 `201` |
| 取消已确认草稿 | in（拒绝） | CN2-N：`409 SPLIT_DRAFT_NOT_ACTIVE`；已确认文档与路线不变 |
| 非发起人取消 | in（拒绝） | CN3-N：`403 NOT_SPLIT_INITIATOR` |
| 无草稿时取消 | in（拒绝） | CN4-N：`409 SPLIT_DRAFT_NOT_ACTIVE` |
| 身份/行程/成员前置 | in（拒绝） | R1-N：`401 MEMBER_REQUIRED` / `404 TRIP_NOT_FOUND` / `403 NOT_A_MEMBER`，`data=null` |
| 确认/取消后继续编辑（边界、生成） | **out** | 锁定语义：既有写端点返回 `409 SPLIT_DRAFT_NOT_ACTIVE` |
| 多草稿并存 / 历史保留 / 回滚已确认拆分 | **out** | 单行模型；不建历史表（如需审计另立需求） |
| 真实路径供给 / 重新规划 | **out** | R2 预留 |

### ⑪ Cross-REQ consistency

| 对手方 | 该方契约 | 本变更对齐 |
|---|---|---|
| US-038 发起 | 唯一活跃草稿 + 版本 1 + `MAIN_PLAN_NOT_CONFIRMED` 前置 | 本变更把 `startDraft` 扩展为「行不存在 → 插入；行存在且 `cancelled` → 同行重建」；`active`/`confirmed` 仍 `409 SPLIT_DRAFT_CONFLICT` |
| US-039 边界 | 仅发起人可写、版本条件更新 | 确认/取消沿用同一版本条件更新策略（`{draftVersion}`） |
| US-042 路线生成 | 成对原子写 `plan_node(split-a/split-b)` | 取消删除同一批节点；确认不改动它们 |
| US-043 时间校验 | 纯计算零写库，输出 `feasible` 等 | 确认复用同一计算域（服务端复算），**不复用其响应**（未持久化） |
| `main-itinerary` | `trip.main_plan_confirmed` 为主线索 | 确认/取消都不改该标志；取消后主线仍未拆分状态 |
| Living Spec `splits` | 写 `X-Member-Id`、`trip.split_draft` 列、V2 | **漂移**：本 delta 以 MODIFIED 修正为 `X-User-Id`、`split_draft` 表、V4（BQ-4 裁决） |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Screen 15 复核页 | 进入 `/trips/:tripId/split/confirm` | 成员 | 两条路线卡（分组、活动/交通/buffer 分解、合计与窗口对比）；边界（出发/会合 + 窗口分钟）；校验结论（通过/超窗量/缺失项）；状态徽标（active/confirmed/cancelled） | `GET /api/trips/{tripId}/split-draft` |
| 确认按钮 | organizer + `status=active` | 组织者 | 可点/禁用 + 原因（非组织者、草稿未就绪、不可行） | `POST .../split-draft:confirm` |
| 取消动作 | initiator + `status=active` | 发起人 | 二次确认提示；成功后回到未拆分状态并提示可重新发起 | `POST .../split-draft:cancel` |
| 拒绝反馈 | 4xx | 操作者 | `error.code` 映射文案：超窗显示超出分钟数；缺输入列出缺失项；权限类只读提示 | 同上 |
| 四态 | 请求生命周期 / 无草稿 / 失败 / 无权限 | 查看者 | loading 骨架；empty=无草稿（入口回发起页）；error 文案 + 重试；permission 只读视图 | 现有投影；截图未画也必须实现 |

无通知类投递（邮件/推送/队列）在本期。

### NFR business-policy layer

确认记录的保留期与 SLA 无 AC 约束，OQ-N7 遗留仍 deferred（owner Dev）；本期以单行草稿状态承载，不发明保留策略。
## US-013

Trigger: impact solution direction is **add** (a member-only read in the
existing `trips` capability plus a MODIFIED `app-shell` requirement). One story,
one read-only vertical slice. No new business concept, no migration; the roster
is derived from existing `V2` tables. Post-merge remediation (2026-11-16): the
branch merged `group1/main` (`135d3df`), so identity is the US-066 account
session and 分队 is the shipped split entry.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions | Source |
|---|---|---|---|---|
| Member roster | One list per trip read | Wire: `tripId`, `members[]` where each row is `{userId, displayName, organizer}` | None in this change (read-only); rows appear when membership is created | Derived from `trip_member` + `app_user` + `trip.organizer_id` |
| Trip membership | One row per (trip, user) | `trip_id`, `user_id` | Created by trip creation (organizer) or invitation acceptance (REQ-004 J2/J3); no update/delete path in this change | `V2__create_trip.sql` |
| User | One row per seeded user | `id`, `display_name` | Seeded by V2 | `V2__create_trip.sql` |
| Account identity | One credential row per seeded user | `user_id`, `email`, `password_hash` | Seeded by V6; session established by `/api/auth/login` | `V6__create_account_credential.sql` |
| Organizer flag | One boolean per member row | `organizer` = (`user_id` = `trip.organizer_id`) | Derived on read; never stored in `trip_member` | `trip.organizer_id` |

No `{TBD}` field remains. Ordering is contractual for deterministic tests:
ascending `userId`. Avatar colour/initial treatment is a visual choice, not a
data field.

### ⑩ Boundary enumeration

| Rule | Branch | In / Out | Rationale |
|---|---|---|---|
| Caller identity | No authenticated session | Out — `401 USER_REQUIRED` | SecurityConfig entry point (US-066) |
| Caller identity | Only a retired `X-User-Id` header (blank, non-numeric or seeded id) | Out — `401 USER_REQUIRED` | Header no longer authenticates |
| Trip existence | Known caller, unknown trip id | Out — `404 TRIP_NOT_FOUND` | Distinct from denial |
| Trip existence | Outsider, unknown trip id | Out — `404 TRIP_NOT_FOUND` | Existence is checked before membership (D4) |
| Membership | Known outsider on an existing trip | Out — `403 NOT_A_MEMBER`, body carries no identity | Issue AC2 |
| Membership | Member (including organizer) | In — `200`, full roster | Issue AC1 |
| Organizer identification | Row user equals `trip.organizer_id` | In — `organizer = true`; every other row `false` | Only Alice is organizer in the fixture |
| Joined member | Eve joined through a valid invitation | In — appears exactly once | REQ-004 J2/J3 |
| Duplicate membership | Same user accepted twice | In — still exactly one row | `trip_member` composite primary key |
| Empty roster | Trip with no membership rows | In — `200` with an empty `members` array; UI shows the empty state | Defensive boundary; unreachable through product writes because the organizer is inserted atomically |
| Personal data | Request would expose readiness/preference/budget | Out — fields are absent from the projection | Issue design scope; US-031 owns that read |
| Write verbs | POST/PUT/DELETE on the members path | Out — endpoint is read-only | Story requires Database read only |

### ⑪ Cross-REQ consistency

| Capability | Other REQ / surface | US-013 behavior | Convergence |
|---|---|---|---|
| `trips` identity and access | US-066 / REQ-008 login/session | Uses the authenticated principal, `USER_REQUIRED`, `NOT_A_MEMBER`, `TRIP_NOT_FOUND`; denial order auth → trip → membership | ✓ follows merged code; the Living `trips` header text is a US-066 drift |
| `invitations` | REQ-004 J2/J3 membership creation | Accepted member appears in the roster exactly once; invitation behavior untouched | ✓ composed, not modified |
| `app-shell` | US-064 `Bottom dock navigation` / `Placeholder tabs`; main ships real `#/split` | `#/members` renders the roster; `#/split` renders the shipped split entry | ✓ MODIFIED requirement reflects C3 |
| `app-shell` no-backend clause | US-064 `Mobile shell frame` | The shell frame/dock adds no endpoint; the roster is a `trips` capability read rendered inside the tab | ✓ shell clause remains true |
| `main-itinerary` | US-031 Screen 9 inputs | Roster exposes names only; readiness, preference revisions, interests, budgets and drafts are not included | ✓ no overlap |
| Split endpoints | Session-based; anonymous → `MEMBER_REQUIRED` | US-013 uses session auth with `USER_REQUIRED` | ⚠ error-code divergence accepted (C4); follow-up F2, no split code change |
| US-064 non-goals | Member list and readiness were explicitly deferred | This change implements the member list only; readiness remains deferred | ✓ |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel | Cardinality |
|---|---|---|---|---|---|
| Members screen list | 成员 tab activation with a resolved trip and signed-in account | Trip member | Screen heading 成员; member count; one row per member with avatar initial, `displayName` and an 组织者 badge on the organizer row | `GET /api/trips/{id}/members`; client render | Exactly one list per render |
| Loading state | Request in flight | Viewer | Skeleton or loading text; no stale rows | Client render | One |
| Empty state | `200` with zero members | Viewer | Text empty state; no fabricated rows | Client render | One |
| Error state | Network failure or non-403/404 HTTP error | Viewer | Generic retryable message; no private values | Client render | One |
| Permission-denied state | `403 NOT_A_MEMBER` | Outsider | Denial message; no names, ids or organizer values | Client render | One |
| Missing-trip state | `404 TRIP_NOT_FOUND` | Viewer | Trip-not-found message with a link back to 行程 | Client render | One |
| No-trip guidance | 成员 tab opened with no trip selected in the session | Viewer | Guidance to open a trip first + link to 行程; no fabricated members | Client render | One |
| Account switch | Signed-in account changes via logout/login | Viewer | The screen re-reads for the new account: member → list, outsider → denied | Same endpoint with the new session | One |

No readiness ring, preference summary, budget line or generate action is
displayed. No notification (email, push, queue) is in scope.

### NFR business-policy layer

No retention, volume or SLA is stated by the ACs. The endpoint is a read-only
projection over existing rows; no data is created or changed. Recorded, not
invented.
