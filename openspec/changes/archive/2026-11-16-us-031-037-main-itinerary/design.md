# Design

## Context

US-031-037 adds the main-itinerary capability on the merged REQ-003/004
baseline (see [proposal](proposal.md) — Why). The tree holds `com.gogo.hello`,
`com.gogo.trip`, `com.gogo.invitation`, Flyway `V1`–`V3` (seeded users 1–5 and
the fixture trip), and a hash-routed React shell with the scaffold identity
switcher. Stack constraints are unchanged: Spring Boot + `JdbcTemplate` (no
ORM), embedded SQLite, Flyway, React 19 + Vite 8, two-job CI. Identity is the
trusted `X-User-Id` header over seeded users. G1 is **Pass** (2026-11-15, IO
Emily + SA Lumi; C1/C2 ratified); the delta fixes 7 requirements / 24
scenarios and the fixtures fix the wire contract.

Links: [ATDD design](atdd-design.md) · [delta spec](specs/main-itinerary/spec.md) ·
[tasks](tasks.md) · [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
[G1 record](g1-decision.md).

## Goals / Non-Goals

**Goals:** the four contractual endpoints with one shared plan projection;
readiness-gated generation with versioned drafts; validation-gated confirmation
that freezes the shared version and closes joining; Screen 9/10 surfaces with
the four mandatory states; fixture-self-contained seeds so every acceptance
case runs on this branch before REQ-019 merges.

**Non-Goals:** preference-entry UI or any product write path to
`member_preference`; split flows; real provider integration; session auth;
notifications; soft-budget enforcement; replanning after confirmation (R2);
CI changes. Each has a reverse check in the [ATDD design](atdd-design.md) §5.

## Decisions

**D1 — Migration `V5__create_main_plan.sql` (shape per G1 C2).**
Two new tables, two `trip_member` columns, no `trip` ALTER:

```sql
CREATE TABLE main_plan_draft (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id               INTEGER NOT NULL REFERENCES trip (id),
    version               INTEGER NOT NULL,
    status                TEXT NOT NULL,  -- current / superseded / confirmed
    cost_per_person_cents INTEGER NOT NULL,
    input_revisions_json  TEXT NOT NULL,  -- [{"userId":1,"revision":1},…]
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (trip_id, version)
);
CREATE TABLE main_plan_stop (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id               INTEGER NOT NULL REFERENCES main_plan_draft (id),
    seq                    INTEGER NOT NULL,
    name                   TEXT NOT NULL,
    start_local            TEXT NOT NULL,  -- HH:MM on the trip date
    end_local              TEXT NOT NULL,
    travel_minutes_to_next INTEGER,        -- NULL on the last stop
    interests_json         TEXT,           -- provider tags JSON array, may be empty
    UNIQUE (draft_id, seq)
);
ALTER TABLE trip_member ADD COLUMN ready INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trip_member ADD COLUMN preference_revision INTEGER NOT NULL DEFAULT 1;
```

Seeds in the same migration: the fixture trip's four members get `ready = 1`,
`preference_revision = 1`; `member_preference` gets `interest`
(`{"codes":[…]}`) and `must_do` (`{"items":[{"name":…,"location":…}]}`) rows
per member (content free per fixtures; `must_do` items carry locations so the
preferences-first completion branch is exercisable). Preference seed inserts are
idempotent (`INSERT OR IGNORE`) so they cannot collide with REQ-019 V4 seeds
after the merge. No `budget` row = no hard limit. Later joiners keep the column
defaults (not ready).

**`member_preference` local stand-in.** The table belongs to REQ-019's `V4`
(`feat/travel_preference`, not merged). V5 therefore starts with
`CREATE TABLE IF NOT EXISTS member_preference (id INTEGER PRIMARY KEY
AUTOINCREMENT, trip_id INTEGER NOT NULL, user_id INTEGER NOT NULL, kind TEXT
NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (trip_id,
user_id, kind))` — the exact column set and unique key verified against the
req-019 proposal on that branch. Alternative rejected: blocking P4 until
REQ-019 merges (no merge date; violates the fixture-self-contained ruling).
After REQ-019 lands first (fixed merge order), V4 creates the table and the V5
statement is a no-op; the seeds still apply. Product code only **reads** this
table. The merge-time shape and seed reconciliation is part of F1
(g1-decision.md); if the landed V4 differs, the stand-in is reconciled then —
external behavior cannot drift because the wire contract never exposes the
table.

**D2 — Backend package `com.gogo.mainplan`.**
`MainPlanController` (four routes), `MainPlanService` (generation,
confirmation, reads, validation), `MainPlanRepository` (JdbcTemplate),
`MainPlanProvider` port + `FakeMainPlanProvider`, camelCase response records,
`MainPlanApiException` + `MainPlanErrorAdvice`. Identity follows the
`InvitationController` precedent exactly: inject `TripRepository`, private
`caller(headerValue)` helper using `findUserId`, package-specific 401
`USER_REQUIRED`. No shared helper extraction (the two existing packages each
keep their own; a third copy is cheaper than refactoring signed code).
Alternative rejected: one common identity module — touches REQ-003/004 code
that this change promises not to modify.

**D3 — `MainPlanProvider` port; the fake IS the MVP production implementation
(OQ-2 ruling).** Interface: `MainPlanResult plan(TripContext trip, List<MemberInput> inputs)`
returning ordered stops (name, start/end HH:MM, travel minutes, tags) and
`costPerPersonCents`. `FakeMainPlanProvider` is a `@Component` supplying the
four fixture stops (09:00–09:30 / 10:00–10:30 / 11:00–11:15 / 11:30–12:00,
legs 30/30/15, cost 5000) deterministically. No test double in API tests —
they run against the real fake. The port is the R2 replacement seam; no
external HTTP client anywhere (reverse check).
Alternative rejected: a real external provider or an API-test test double — the
OQ-2 ruling makes the fake the MVP production behavior, and a double would hide
the real wiring.

**D4 — Generation transaction (`POST /api/trips/{id}/main-plan` → 201).**
Gate order: identity (401) → trip (404 `TRIP_NOT_FOUND`) → membership (403
`NOT_A_MEMBER`) → organizer (403 `NOT_ORGANIZER`) → already confirmed (409
`ALREADY_CONFIRMED`, G6) → readiness (409 `MEMBERS_NOT_READY` with
`pendingMembers`). Then: complete null locations (D5), call the provider,
insert the new draft at `MAX(version)+1` with status `current`, mark the
previous `current` row `superseded`, insert stops, snapshot every member's
`preference_revision` into `input_revisions_json` — all in one transaction.
Respond 201 with the plan projection (`confirmed` false, `stale` false).
The confirmed-check precedes readiness so G6 holds regardless of member state;
the deltas never combine the two premises, so this ordering is a design choice,
not a contract change.
Alternative rejected: readiness before the confirmed-check — G6 must hold
regardless of member state, and no delta scenario combines the two premises.

**D5 — Location completion at generation only (signed 2026-11-14 ruling).**
For each of start/end location that is null/blank: collect `must_do` item
`location` values from ready members (ordered by user id, items in payload
order); start = first nonblank, end = last nonblank. If nothing usable:
random pick from a fixed candidate list keyed to the destination (Singapore
fixtures list; generic fallback otherwise) — outputs deliberately not fixed.
Supplied nonblank values are never touched. Completion writes `trip` locations
inside the generation transaction; no other endpoint completes locations.
Alternative rejected: completing at trip creation or on read (the signed ruling
confines completion to generation); always-random (preferences must win).

**D6 — One plan projection, one serializer (P2 wire contract).**
A single assembler builds `{tripId, version, confirmed, stale,
costPerPersonCents, inputRevisions[{userId,revision}], stops[{seq, name,
startTime, endTime, travelMinutesToNext, interests}]}` for the draft read, the
generate 201 and the confirm 200. Read gates: identity (401) → trip (404) →
membership (403 `NOT_A_MEMBER`), same as D7. Read selection: the `confirmed` row
if one exists, else the `current` row, else 404 `NO_DRAFT`. `stale` is computed on
read: any member's current `preference_revision` ≠ the recorded revision →
true for unconfirmed drafts; the confirmed row is frozen (`stale` always
false, P2 lint ruling). `interests` deserializes `interests_json`, defaulting
to an empty array.
Alternative rejected: a separate serializer per endpoint — the confirm 200 must
match the draft-read shape (P2 wire contract), so one assembler prevents drift.

**D7 — Inputs read (`GET …/main-plan/inputs` → 200, member-readable).**
Identity → trip → membership gates only (no organizer check, no draft
precondition — I2). The projection carries `tripId`, `readyCount`, `memberCount`,
`members`, `commonInterests`, `mustDo`, `budgets`, `rules` (fixtures wire set).
`members` from `trip_member` joined to `app_user`; `readyCount`/`memberCount`
derived. `commonInterests` = intersection of ready
members' `interest.payload.codes`; `mustDo` = deduplicated union of ready
members' `must_do.payload.items` names (display-only semantics, user-accepted).
`budgets` maps each member's `budget` row: `payload.amount` →
`hardBudgetCents` only when `limitType = 'hard'`; absent/soft → null (no
limit). `rules` = the six fixed identifiers as a constant list.
Alternative rejected: organizer-only or draft-preconditioned inputs — the P2
ruling (F6 closure) makes the summary member-readable before any draft.

**D8 — Confirmation transaction (`POST …/main-plan/confirm` → 200).**
Gate order: identity → trip → organizer → draft existence (404 `NO_DRAFT`,
V6) → already confirmed (409 `ALREADY_CONFIRMED`, V7) → staleness (409
`STALE_DRAFT`, C4) → validation. Validation collects **both** lists before
responding: schedule errors (D9) and budget overruns (cost per person vs each
member's hard budget; null = no limit; `overrunCents` = cost − budget when
positive). Any non-empty list → 422 `VALIDATION_FAILED` carrying
`scheduleErrors` + `overruns`; nothing changes. On success: the draft row's
status → `confirmed` and `trip.main_plan_confirmed` → 1 in one transaction —
no new version row, no `confirmed_draft_id` (P2 ruling). Respond 200 with the
same projection (`confirmed` true, `stale` false). REQ-004 accept then returns
403 `JOINING_CLOSED` unchanged (J4 runs in this change's ATDD).

**D9 — Schedule validator (OQ-6 minimal set + G1 C1 travel-fit).**
Pure component over the ordered stops and the trip date; single-day trips
compare `HH:MM` as minutes. Per consecutive pair and per stop:
`OUT_OF_ORDER` (start times not non-decreasing by seq), `OVERLAP` (next start
before current end), `MISSING_LEG` (non-last stop with null
`travel_minutes_to_next`), `TRAVEL_EXCEEDS_GAP` (end + leg > next start;
**equality passes**; offending seq = the stop carrying the leg — C1 ratified),
`OUT_OF_DAY` (stop start/end outside the trip date's day window, defined as
00:00–23:59 inclusive — parsed minutes 0–1439; the V3 test-only mutation writes
an out-of-range time such as `25:00`). Each error carries `type`, `seq`, free
`message`. All five types are asserted through V3
test-only draft mutations; the validator itself is apply-time unit TDD
(ATDD UT-1).
Alternative rejected: multi-day datetime validation — all current trips are
single-day; HH:MM-as-minutes is the OQ-6 minimal set (multi-day revisits D9).

**D10 — Error payload shape.** `MainPlanErrorAdvice` mirrors
`InvitationErrorAdvice` but builds `Map<String, Object>` so the precedent
`{code, message}` body can carry the contractual detail fields
(`pendingMembers`, `scheduleErrors`, `overruns`) only for the two codes that
define them. New codes: `MEMBERS_NOT_READY` 409, `VALIDATION_FAILED` 422,
`STALE_DRAFT` 409, `NO_DRAFT` 404, `ALREADY_CONFIRMED` 409; reused:
`USER_REQUIRED` 401, `TRIP_NOT_FOUND` 404, `NOT_A_MEMBER` / `NOT_ORGANIZER`
403. Only `code` is contractual.
Alternative rejected: reusing `Map<String, String>` as-is — it cannot carry the
structured detail fields (`pendingMembers`/`scheduleErrors`/`overruns`).

**D11 — Frontend routes and surfaces (Screen 9/10, deep-dive ⑫).**
Extend `parseRoute` with `#/trips/<id>/main-plan/inputs` (Screen 9) and
`#/trips/<id>/main-plan` (Screen 10), matched before the generic trip route;
no routing dependency, no new npm packages. `api.js` gains the four calls
(existing fetch helper + `X-User-Id`). Screen 9: ready count + member names,
common-interest chips, must-do summary, budget lines, rules list; organizer
sees the generate action (navigates to Screen 10), members read-only. Screen
10: timeline (name, time range, tags, cost per person), version badge, stale
banner + regenerate action (organizer), confirm action (organizer) with
blocked-error rendering (schedule error list, per-member overrun, stale
message), confirmed state (badge, shared timeline, joining-closed notice).
Four mandatory states on both surfaces: loading skeleton, no-draft empty CTA,
load-failure text, permission/read-only UI. Styling follows the existing app
CSS and `ui-design-reference/` screens 09/10. The scaffold identity switcher
already exists — reused as-is for E2E role switching.
Alternative rejected: adding a router library or new npm packages — the existing
hash `parseRoute` extends cleanly (REQ-004 precedent).

**D12 — Test isolation and test-only setup.** `MainPlanApiTest` follows
`InvitationApiTest`: `@SpringBootTest` with its own shared in-memory SQLite
(`jdbc:sqlite:file:main-plan-test?mode=memory&cache=shared`, pool size 1),
Flyway `V1`–`V5`, `@BeforeEach` reset (drafts/stops deleted, readiness and
revisions restored, test budget rows removed, locations restored, flag 0).
Test-only JDBC flips exactly per fixtures "State setup" (Daniel pending, Alice
hard budget 4000, Ben revision bump, null locations, V3 stop mutations). The
E2E browser checklist is authored red-first as numbered steps (task 1.4) and
executed at P4 with runtime evidence.
Alternative rejected: sharing one test database across suites — cross-class
mutable state makes resets fragile; each class owns its SQLite file.

## Risks / Trade-offs

- [Stand-in drifts from REQ-019's landed V4] → shape verified against the
  req-019 proposal at design time; F1 merge-time check reconciles before/at
  merge; `IF NOT EXISTS` makes the merged order a no-op and `INSERT OR IGNORE`
  seeds avoid collision; wire contract never exposes the table.
- [Seeds are fixture-trip-specific] → accepted consequence of the
  fixture-self-contained ruling (demo scaffold); later joiners default to not
  ready, so the gate stays meaningful for real trips.
- [Fake provider is deterministic] → ruled MVP production behavior; the port
  seam (D3) isolates the future real provider; no AC depends on tag content.
- [Single-day HH:MM validation] → the fixture and all current trips are
  single-day; multi-day itineraries are out of scope and would revisit D9.
- [Concurrent writes] → single organizer per trip; SQLite serializes writers
  and D4/D8 are transactional; concurrent confirms are an out-of-scope design
  concern (deep-dive ⑩), not a product branch.
- [Impersonation (inherited)] → `X-User-Id` is a trusted scaffold stand-in,
  user-accepted for the controlled demo, never a security control.

## Migration Plan

`V5` is additive (two tables, two columns with defaults, seed rows) and applies
automatically at startup via Flyway; existing V1–V3 data is untouched. Merge
order is fixed: REQ-019 `V4` first, then this branch — after that merge the
stand-in creation is a no-op, the idempotent seeds cannot collide, and F1
(write-sync alignment + shape/seed reconciliation with `feat/travel_preference`,
SA evelyn.huang) is executed before/at the merge per g1-decision.md. Rollback:
drop the two new tables and the two `trip_member` columns (SQLite table rebuild)
— not needed for the MVP demo; no production data exists yet.

## Open Questions

None blocking. F1 (cross-branch write-sync alignment) is a named non-gating
follow-up owned by SA Lumi + evelyn.huang, tracked in g1-decision.md; it does
not change the specs, this approach, or the task breakdown.