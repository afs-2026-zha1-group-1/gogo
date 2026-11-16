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
because REQ-020/024 extend the domain; only `interest` is used here.

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
