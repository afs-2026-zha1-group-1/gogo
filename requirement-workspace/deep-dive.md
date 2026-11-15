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

## US-031-037

Trigger: impact solution direction is **add** (new `main-itinerary` capability on
a baseline that locally holds only `greeting`). Rulings of 2026-11-15 (intent
§Inherited, OQ-6/OQ-7) and the signed 2026-11-14 fixtures ruling govern.

### ⑨ Data contract

Money is integer cents (SGD); times are local `HH:MM` strings on the trip date
(Asia/Singapore); no `{TBD}` fields remain. All tables created by Flyway from V2
on this branch; backend owns every table and projection.

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | one row per seeded user | `id` INTEGER PK; `display_name` TEXT NOT NULL | static seed (ids 1–5 per fixtures) |
| `trip` | one row per trip | `id` PK; `name`; `destination`; `start_date`; `end_date`; `start_location` NULL; `end_location` NULL; `organizer_id` FK; `main_plan_confirmed` INTEGER NOT NULL DEFAULT 0; `confirmed_draft_id` NULL FK | created(0) → confirmed(1) via US-037; no reopen in scope; null locations completed at generation (signed ruling) |
| `trip_member` | one row per (trip, user) | `trip_id`; `user_id`; `ready` INTEGER 0/1; `preference_revision` INTEGER NOT NULL | ready 0→1 and revision bumps are test-only in this REQ (product writes belong to later REQs) |
| `member_preference` | one current snapshot per (trip, user) | `revision` INTEGER; `interests_json` TEXT; `must_do_json` TEXT; `hard_budget_cents` INTEGER NULL | seeded rev 1; revision increments on preference write (later REQ) |
| `main_plan_draft` | one row per (trip, version) | `id` PK; `trip_id`; `version` INTEGER; `status` TEXT current/superseded/confirmed; `cost_per_person_cents` INTEGER; `input_revisions_json` TEXT (userId→revision); `created_at` | current→superseded on regeneration; current→confirmed on confirm; stale is computed (input revisions vs current member revisions), not stored |
| `main_plan_stop` | one row per (draft, seq) | `seq` INTEGER; `name` TEXT; `start_local` TEXT; `end_local` TEXT; `travel_minutes_to_next` INTEGER NULL (last stop NULL) | immutable per draft; supplied by MainPlanProvider |
| Draft read projection (wire) | one object per trip draft read | ordered stops (name, times, leg), cost per person, input revisions, version, `stale` boolean, confirmed flag | read-only |
| Confirm validation projection (wire) | one object per confirm attempt | `scheduleErrors` list (overlap / missing leg / out-of-day); `overruns` list (userId, hardBudgetCents, overrunCents); `stale` boolean | read-only; blocks on any non-empty list or stale |

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| All members ready | in (G1) | readiness gate reads trip_member; generation proceeds |
| Any member pending | in (G2) | blocked; pending members named; no draft row |
| Provider supplies fixture stops | in | fake MainPlanProvider = MVP production (ruled); port seam |
| Provider returns empty | out of scope | fake provider contract always supplies the fixture stops; real-provider behavior belongs to the replacement seam |
| Null start/end location | in (G3) | completion per signed ruling: preferences first, random fallback |
| Supplied nonblank locations | in (G3) | preserved unchanged |
| Schedule ordered, legs present, within trip day | in (C1) | OQ-6 minimal feasible set passes |
| Overlap / missing leg / out-of-day | in (C3) | specific schedule errors; confirmation blocked |
| Every hard budget ≥ cost | in (C1) | NULL hard budget = no limit |
| Any hard budget < cost | in (C2) | per-member overrun shown (cents → SGD display); blocked |
| Draft input revisions == current | in (C1) | current draft confirmable |
| Any revision advanced | in (C4) | stale; blocked until regeneration (OQ-7) |
| Organizer writes | in | generate/confirm allowed |
| Non-organizer / non-member / no identity / unknown trip | in (G4, C5, M-N/V-N) | 403 NOT_ORGANIZER / 403 NOT_A_MEMBER / 401 USER_REQUIRED / 404 TRIP_NOT_FOUND |
| No draft at confirm | in (C5/V6) | 404 NO_DRAFT (ruled 2026-11-15) |
| Already confirmed | in (C6/V7) | 409 ALREADY_CONFIRMED (OQ-8 ruled 2026-11-15); no state change |
| Joining after confirm | in (C1) | flag set here; JOINING_CLOSED enforced by REQ-004 accept (unchanged) |
| Concurrent confirms | out of scope | single organizer per trip; SQLite write serialization is a design concern, not a product branch |

### ⑪ Cross-REQ consistency

| Item | Other REQ | US-031-037 | Convergence |
|---|---|---|---|
| Location completion | REQ-003 C7: completion only during US-031 generation | G3 implements it | ✓ signed 2026-11-14 ruling (IO Emily/SA Johnson) |
| Closed joining | REQ-004 J4: accept 403 JOINING_CLOSED when flag=1; "US-037 owns the flow" | C1 sets the flag | ✓ fixtures anchor; invitations code unchanged |
| Confirmed-state test setup | REQ-004 used test-only DB update | product confirm flow now produces it | ✓ precedent retained for later REQs; fixtures US-031-037 section records supersession |
| Schema divergence | remote REQ-003/004 V2/V3 vs local V2+ self-built | ✗ at merge time | OQ-9 resolved 2026-11-15 (SA): merge-time convergence task (renumber/reconcile); fixture-self-contained ruling stands; trigger + steps in intent baseline note; no unconverged ✗ left unassigned |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Screen 9 generate summary | page load | organizer | ready count (4/4) + member names; common interests chips; must-do summary; constraints/budget lines; generation rules list | draft-inputs read projection (P2 path) |
| Screen 10 draft timeline | draft read | members | per stop: name, time range, interest tags, cost per person; version badge; stale banner when stale | draft read projection |
| Screen 10 validation status / blocked errors | confirm attempt | organizer | scheduleErrors list; per-member overrun amount (10 SGD case); stale message | confirm validation projection |
| Screen 10 confirmed state | confirm success | members | confirmed version badge; shared plan timeline; joining-closed notice | draft read projection (confirmed flag) |
| Loading / empty / error / permission states | request lifecycle / no draft / failure / non-organizer | viewer | skeleton; no-draft CTA to generate; load-failure text; read-only or denied write UI | same projections; mandatory even if unpictured |

No notifications (email/push/queue) in scope.

### NFR business-policy layer

Retention/volume/SLA not decidable for this slice and not required by any AC;
recorded as non-blocking for Dev, not invented.
