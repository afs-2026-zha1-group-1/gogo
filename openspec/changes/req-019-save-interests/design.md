# Design

## Context

REQ-019 adds the `preferences` capability to the existing stack: Spring Boot +
`JdbcTemplate` (no ORM), embedded SQLite, Flyway, React 19 + Vite 8, two-job CI. The
committed tree already holds `com.gogo.hello`, `com.gogo.trip` (REQ-003) and
`com.gogo.invitation` (REQ-004), plus a hash-routed frontend with a scaffold identity
switcher over users 1–5. `V2__create_trip.sql` seeds `app_user`, `trip` and
`trip_member`; `V3__create_invitation.sql` added `trip_invitation` and
`trip.main_plan_confirmed`.

G1 Pass was closed on 2026-11-16 (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15 plus
the 2026-11-16 sibling re-review). P3 rulings: **D15** own error advice in the new
package, **D16** no new rows in the shared fixtures file. Product rulings D1–D14 live in
`requirement-workspace/intents/2026-11-15-req-019.md`.

Links: [ATDD design](atdd-design.md) · [delta spec](specs/preferences/spec.md) ·
[tasks](tasks.md) · [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
UI reference `ui-design-reference/screenshots/screen-08-preferences.png`.

## Goals / Non-Goals

Goals: `GET` and `PUT /api/trips/{tripId}/preferences` with the 31 specified scenarios;
seven interest constants (label on the wire, code in the row); one row per
`(trip_id, user_id, kind)` replaced as a whole; strict literal matching; a preferences
page inside the existing app with loading/empty/error/saving states; a details-page
entry link.

Non-Goals: the other three preference kinds (REQ-020/024), the explicit "no preference"
state (US-027), readiness gating (US-026), preference comparison and plan generation
(US-031), real authentication, the `tag` table and `/api/tags`, locking preferences
after main-plan confirmation (D4), i18n and a catalogue admin screen, CI changes. Each
has a reverse check in the ATDD design §5.

Design decisions are numbered **DD1–DD9** to keep them distinct from the product
rulings D1–D16.

## Decisions

**DD1 — Migration `V4__create_member_preference.sql`.** SQLite dialect, one table:

```sql
CREATE TABLE member_preference (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id    INTEGER NOT NULL REFERENCES trip (id),
    user_id    INTEGER NOT NULL REFERENCES app_user (id),
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (trip_id, user_id, kind)
);
```

No seed rows and no trigger: `updated_at` is written only by the service, so a rejected
or read-only call leaves it byte-identical (SAVE-5, READ-5). `kind` stays a free `TEXT`
because REQ-020/024 extend the domain; only `interest` is used here. `updated_at` holds
ISO-8601 UTC text, matching `tech-stack-plan.md` §5 ("时间一律 TEXT（ISO-8601 UTC）").

**DD2 — Backend package `com.gogo.preference`.** `PreferenceController` (two routes),
`PreferenceService` (order of checks, dedupe, replace), `PreferenceRepository`
(`JdbcTemplate`), records `PreferenceSaveRequest`, `PreferenceSaveResponse`,
`PreferenceMembersResponse`, `PreferenceMember`, `InterestCatalogue` (constants),
`PreferenceApiException` and `PreferenceErrorAdvice`
(`basePackages = "com.gogo.preference"`, copied from `InvitationErrorAdvice` — D15).
Identity, trip existence and membership reuse `TripRepository.findUserId` / `findById` /
`isMember`; the package adds no second identity implementation.

**DD3 — Check order and codes.** identity (401 `USER_REQUIRED`) → trip existence
(404 `TRIP_NOT_FOUND`) → membership (403 `NOT_A_MEMBER`) → catalogue
(400 `INTEREST_NOT_ALLOWED`) → write. A rejected request writes nothing, and the
`GET`/`PUT` symmetry matches `TripController.read`.

One asymmetry is deliberate and recorded: a body that is not readable JSON fails during
argument resolution, so Spring raises `HttpMessageNotReadableException` **before** the
handler runs and `INVALID_REQUEST` wins over a missing identity. The delta specifies
single-failure scenarios only, so no scenario is contradicted; combined cases are not
asserted and no ordering is claimed for them.

**DD4 — Catalogue and dedupe.** `InterestCatalogue` holds the seven `(label, code)`
pairs in the AC order as code constants. Matching is `List.indexOf` on the exact label —
no `trim`, no `equalsIgnoreCase`, no substring. Submission goes through a
`LinkedHashSet<String>` so the first occurrence order survives; the resulting labels map
to codes and are serialized as `{"codes":[...]}`. Any unmatched element rejects the whole
request before the write, so allowed siblings never land (SAVE-5, SAVE-6).

**DD5 — Replace, never merge.** One statement per save:

```sql
INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at)
VALUES (?, ?, 'interest', ?, ?)
ON CONFLICT (trip_id, user_id, kind)
DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
```

A first save inserts, later saves overwrite, and an empty array stores `{"codes":[]}`
while keeping the row (SAVE-3, SAVE-4, SAVE-7). Repeating the same set rewrites identical
`payload` with a fresh `updated_at`, which the delta explicitly allows (SAVE-2).

**DD6 — Read shape.** One query joins the member list to the caller's trip and
left-joins the stored rows, so members are never omitted:

```sql
SELECT m.user_id, p.payload
FROM trip_member m
LEFT JOIN member_preference p
       ON p.trip_id = m.trip_id AND p.user_id = m.user_id AND p.kind = 'interest'
WHERE m.trip_id = ?
ORDER BY m.user_id
```

`payload` null → `interests: []`. The response carries exactly `userId` and `interests`
per member and no other key (READ-4).

**DD7 — Page `#/trips/<id>/preferences`.** `parseRoute` gains one pattern ahead of the
details pattern; `Preferences.jsx` fetches `GET` on mount and on identity change, holds
the selection in local component state, and submits one `PUT` from an explicit "Save"
button (D11). States: loading (controls and Save disabled), empty (nothing selected),
saved (selection equals the response), error inline with the server `message` and a
rollback to the last acknowledged set, load failure with a retry action. No
`localStorage`. The details page adds one entry link. New `.chips` / `.chip` styles go
into `app.css` next to the existing tokens; no component library (D5). Clearing means
deselecting all seven and saving (accepted product ruling), so no Clear All control is
added.

**DD8 — Test isolation.** `PreferenceApiTest` mirrors `TripApiTest`:
`@SpringBootTest(classes = HelloApplication.class)` with
`jdbc:sqlite:file:preference-test?mode=memory&cache=shared`, Hikari pool size 1, Flyway
`V1`–`V4`; `@BeforeEach` clears `member_preference`; the fixture trip id is read by name,
never hard-coded; row count, `payload` and `updated_at` are asserted through the
autowired `JdbcTemplate`.

**DD9 — Dependencies and CI.** No new backend or frontend dependency; the two CI jobs and
their commands are unchanged. Local gate is the full `mvn test` plus `npm run build`; the
pipeline gate is a fresh CI run on the PR to `main`.

## Deviations from `tech-stack-plan.md`

`openspec/config.yaml` makes `docs/knowledge/architecture/tech-stack-plan.md` binding for
implementation and requires every deviation from its stack, data model or API list to be
recorded in the proposal or the design instead of being made silently. The plan predates
REQ-001, so the merged code already differs from it; this section records that drift as
it bears on REQ-019 and adds the choices this change makes on top of it.

| # | Plan says | Reality / this change | Reason | Tracked as |
|---|---|---|---|---|
| TS-1 | §3, §7: `JdbcClient` + `record` mapping | `JdbcTemplate` | Merged REQ-001…004 code; both are spring-jdbc, still no ORM | Plan reconciliation (below) |
| TS-2 | §5: `member_preference(..., member_id, ...)` with a plain index `(trip_id, member_id, kind)` | `user_id` referencing `app_user`, and `UNIQUE (trip_id, user_id, kind)` | Identity has been `app_user.id` through `X-User-Id` since `V2`; UNIQUE turns "one row per kind" into a database fact instead of a service promise | DD1; proposal and deep-dive ⑪; plan reconciliation |
| TS-3 | §6: one `PUT /preferences` carrying all four kinds | Three endpoints across the chain: interests here, `/preferences/must-dos` (REQ-020), `/preferences/budget` (REQ-024) | Each kind has its own validation, save timing and story; this AC only needs interests | Plan reconciliation; REQ-020/024 proposals |
| TS-4 | §5, DR-12: interests stored as `tag.code` from the 24-code vocabulary | Seven `(label, code)` constants in `InterestCatalogue`; no `tag` table, no `/api/tags` | `tag` ships with M2.5 and US-031; the AC names exactly seven interests and forbids aliases | D2 in the intents file; plan reconciliation |
| TS-5 | §6: `{data, error}` envelope and `X-Member-Id` | Bare DTO on success, `{code, message}` on failure, `X-User-Id` | Follows the merged trip and invitation code | Proposal "Known deviations"; plan reconciliation |
| TS-6 | §3, §4: React + **TypeScript**, Ant Design 5, TanStack Query v5, React Router 7 | React 19 + Vite 8 in plain JavaScript (`.jsx`), hand-written hash router, `fetch` wrapper in `api.js`, hand-written CSS | D5; the repo-wide TypeScript move is a separate story (US-065). `AGENTS.md` asks for shadcn/ui, so the plan, `AGENTS.md` and the code are three-way inconsistent | D5; plan reconciliation; team-level docs fix |
| TS-7 | §3: Vite 7.x | Vite 8.3 | Versions as installed by REQ-003/004 | Plan reconciliation |
| TS-8 | §4: `com/bettertrips/*` with one `common/GlobalExceptionHandler` | `com.gogo.{hello,trip,invitation,preference}` with one `@RestControllerAdvice` per feature package | The per-package advice already exists twice; D15 follows it instead of widening `TripErrorAdvice` | DD2, D15; plan reconciliation |
| TS-9 | §5, §7: `./data/bettertrips.db?journal_mode=WAL&busy_timeout=5000&foreign_keys=on` and `hikari.maximum-pool-size=1` | `jdbc:sqlite:./data/gogo.db` with no URL parameters; the pool size of 1 is set **only in the test profile** | Base configuration predates this change | Owner Dev/SA: a harness fix, not a REQ-019 edit |
| TS-10 | §3: Maven Wrapper | `backend/pom.xml` only, no `mvnw` | Base configuration | Plan reconciliation |
| TS-11 | §3: no extra frontend dependency | `qrcode` + `jsqr` added by REQ-004 | REQ-004 P3 decision (Apache-2.0) | REQ-004 record; plan reconciliation |
| TS-12 | §7: `flyway-core` **plus** `flyway-database-nc-sqlite` at one pinned `${flyway.version}`, with an explicit `sqlite-jdbc` version | `flyway-core` only, no SQLite module, no version property; `sqlite-jdbc` is Boot-managed | `V1`–`V4` already migrate through this setup and REQ-002's verification records SQLite migrations succeeding, so the single-artifact form evidently works in the managed Flyway version — but that is inherited evidence, not re-run here. It becomes load-bearing the moment a Flyway upgrade drops SQLite from core | Plan reconciliation; Dev/SA |

Two consequences are worth stating plainly:

- **TS-2 and TS-9 interact.** `V4` declares foreign keys to `trip` and `app_user`, but
  SQLite enforces them only when `PRAGMA foreign_keys=ON` is set per connection and the
  datasource URL does not set it. `UNIQUE` is an index and is enforced regardless, so
  every REQ-019 scenario still holds; the foreign keys are currently declarative. This
  change records the gap instead of editing base configuration.
- **TS-9 also leaves the SQLite single-writer rule unenforced in the main profile.** With
  an unconstrained Hikari pool, concurrent writes can surface `SQLITE_BUSY`. REQ-019
  issues at most one short write per save and the test profile pins the pool to 1, so
  this is recorded rather than closed.

## Risks / Trade-offs

- **`X-User-Id` impersonation.** Any seeded id is accepted with no credential; scaffold
  cost already accepted at REQ-003 G1, never described as a security control.
- **Existence leak.** `403` for a non-member confirms the trip id exists; inherited from
  the merged read path and confirmed at G1.
- **Malformed body outranks identity** (DD3). Accepted: it comes from Spring's argument
  resolution, and no scenario asserts the combined case.
- **Duplicated advice class.** D15 adds a ~12-line advice instead of widening
  `TripErrorAdvice`; duplication is the cheaper option because widening would make one
  class own four packages' error mapping.
- **Page contract is version 1 of three.** REQ-020 and REQ-024 rewrite the same
  requirement in full; this delta must stay self-contained so the later versions can
  supersede it cleanly.
- **Strict validation is still failing.** Five ADDED requirement bodies exceed 500
  characters, so `openspec validate --strict` exits 1. It blocks archive, not P4, and the
  CLI is absent from this environment; the rerun is a task, not a claim.
