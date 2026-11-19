# Design

## Context

Two baselines govern this design, in this order:

1. `docs/knowledge/architecture/tech-stack-plan.md`, which `openspec/config.yaml` declares
   binding for implementation.
2. The merged code — **only** where the plan cannot be applied to this change.

The first version of this file was written the other way round: it followed the code and
merely recorded the drift. On 2026-11-16 the SA reversed that rule (D17): **the plan wins,
code-consistency is the fallback.** Three areas move as a result — new backend code uses
`JdbcClient` and Jakarta Validation (DD3, DD4), the datasource and Flyway baseline is
corrected inside this change (DD2, DD12), and the preferences page is built on the plan's
frontend stack instead of the hand-written `.jsx` shell (DD9, DD10). What still cannot
follow the plan is listed in the deviations section with its reason; nothing is silent.

Merged state the ruling does not touch: `com.gogo.hello`, `com.gogo.trip` (REQ-003) and
`com.gogo.invitation` (REQ-004) on Spring Boot 3.5.14 / Java 21 / SQLite / Flyway `V1`–`V3`,
a React 19 + Vite 8 SPA, two-job CI. `V2__create_trip.sql` seeds `app_user`, `trip` and
`trip_member`; `V3__create_invitation.sql` added `trip_invitation` and
`trip.main_plan_confirmed`.

G1 Pass was closed on 2026-11-16 (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15 plus the
2026-11-16 sibling re-review). P3 rulings: **D15** own error advice in the new package,
**D16** no new rows in the shared fixtures file, **D17** plan-first stack. Product rulings
D1–D14 live in `requirement-workspace/intents/2026-11-15-req-019.md`.

Links: [ATDD design](atdd-design.md) · [delta spec](specs/preferences/spec.md) ·
[tasks](tasks.md) · [fixtures](../../../../requirement-workspace/acceptance-test-fixtures.md) ·
UI reference `ui-design-reference/screenshots/screen-08-preferences.png`.

## Goals / Non-Goals

Goals:

- `GET` and `PUT /api/trips/{tripId}/preferences` with the 31 specified scenarios; ten
  Chinese interest constants (label on the wire, code in the row); one row per
  `(trip_id, user_id, kind)` replaced as a whole; strict literal matching.
- The preferences page built with the plan's frontend stack (TypeScript, TanStack Query 5),
  so the page is a worked example of the stack rather than a sixth hand-written page; Ant
  Design is dropped once the second merge brings `shadcn/ui` (TS-13). Routing stays on the
  merged `parseRoute` (TS-12).
- The datasource and Flyway baseline brought to plan §5/§7 in this change: WAL, busy
  timeout, enforced foreign keys, single-connection pool, pinned Flyway and SQLite artifacts.
- A details-page entry link to the new page.

Non-Goals: the other three preference kinds (REQ-020/024), the explicit "no preference"
state (US-027), readiness gating (US-026), preference comparison and plan generation
(US-031), real authentication, the `tag` table and `/api/tags`, locking preferences after
main-plan confirmation (D4), i18n and a catalogue admin screen, and migrating the **existing**
five pages to TypeScript (US-065) or to `shadcn/ui`. Each has a reverse check in ATDD §5.

CI is no longer a non-goal: adopting TypeScript without a typecheck in CI would be
decoration, so the frontend job gains one step (DD12).

Design decisions are numbered **DD1–DD12** to keep them distinct from the product rulings
D1–D17.

## Decisions

**DD1 — Migration `V7__create_member_preference.sql`.** SQLite dialect, one table:

```sql
CREATE TABLE IF NOT EXISTS member_preference (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id    INTEGER NOT NULL REFERENCES trip (id),
    user_id    INTEGER NOT NULL REFERENCES app_user (id),
    kind       TEXT NOT NULL,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (trip_id, user_id, kind)
);
```

Merge note (2026-11-16): the file was `V4__create_member_preference.sql` until this change
merged `origin/main`. `main` took `V4` for the splits migration and shipped
`V5__create_main_plan.sql` carrying an `IF NOT EXISTS` stand-in for this same table, because
its own fixtures needed one; `V5` therefore applies first and wins, so the statement above is
`CREATE TABLE IF NOT EXISTS`. Columns, types and the unique key are identical either way. Two
consequences are accepted rather than repaired: the effective table carries no `REFERENCES`
clauses, because the stand-in declares none and SQLite cannot add them without a table
rebuild; and the stand-in seeds `interest`/`must_do` rows in the retired English codes for
the fixture trip, which `MainPlanApiTest` asserts as raw codes, so the merge leaves them
untouched and the preference tests still clear the table per case.

Second renumbering (2026-11-16, fourth merge): `V6` was taken by
`V6__create_account_credential.sql`, which main's US-066 shipped, so this migration is `V7`.
Only the version prefix changed — the statement, columns and unique key are the same, and
`IF NOT EXISTS` still keeps it a no-op where `V5`'s stand-in won. Later changes (REQ-020/024/026)
that cite "REQ-019's `V6`" mean this file and should read `V7`.

No seed rows and no trigger: `updated_at` is written only by the service, so a rejected or
read-only call leaves it byte-identical (SAVE-5, READ-5). `kind` stays a free `TEXT` because
REQ-020/024 extend the domain; only `interest` is used here. `updated_at` holds ISO-8601 UTC
text, matching plan §5 ("时间一律 TEXT（ISO-8601 UTC）").

Both foreign keys become **enforced** rows rather than decoration once DD2 lands. `V1`–`V3`
were re-read before deciding this: every seeded insert satisfies its parent (`app_user`
before `trip`, `trip` before `trip_member`), so turning enforcement on cannot break
migration.

**DD2 — Datasource baseline per plan §7.** `application.yml` becomes:

```yaml
spring:
  datasource:
    url: jdbc:sqlite:./data/gogo.db?journal_mode=WAL&busy_timeout=5000&foreign_keys=on
    driver-class-name: org.sqlite.JDBC
    hikari:
      maximum-pool-size: 1
```

Three reasons this is part of REQ-019 rather than a later chore: the migration declares foreign
keys that mean nothing while `PRAGMA foreign_keys` is off; §7's rule 1 (one connection) exists
precisely because a larger pool multiplies `SQLITE_BUSY` on the single-writer file, and the
preferences endpoint is a writer; and the parameters are additive — no data move, no
migration. The file name stays `gogo.db` (TS-4). Existing test classes keep their own URLs;
the new test adds `foreign_keys=on` so its FK behaviour matches production (DD11).

**DD3 — Backend package `com.gogo.preference`, on `JdbcClient`.** `PreferenceController`
(two routes), `PreferenceService` (order of checks, dedupe, replace), `PreferenceRepository`,
records `PreferenceSaveRequest`, `PreferenceSaveResponse`, `PreferenceMembersResponse`,
`PreferenceMember`, `InterestCatalogue` (constants), `PreferenceApiException` and
`PreferenceErrorAdvice` (`basePackages = "com.gogo.preference"`, copied from
`InvitationErrorAdvice` — D15).

`PreferenceRepository` uses `JdbcClient` with `record` mapping (plan DR-02), which is a
spring-jdbc API already on the classpath, so this costs no dependency and no behaviour
change. `TripRepository` and `InvitationRepository` keep `JdbcTemplate`; rewriting them is
the plan-reconciliation task's work, not something to smuggle into a preferences change.
Identity, trip existence and membership still reuse `TripRepository.findUserId` / `findById`
/ `isMember`, so the package adds no second identity implementation.

**DD4 — Request validation with Jakarta Validation (plan §3 "Web + Validation").** Add
`spring-boot-starter-validation` and validate the body shape declaratively:

```java
public record PreferenceSaveRequest(
        @NotNull @JsonDeserialize(using = StrictStringListDeserializer.class) List<String> interests) {}
```

`@RequestBody @Valid` plus one handler for `MethodArgumentNotValidException` →
`400 INVALID_REQUEST` in `PreferenceErrorAdvice`.

The first version of this decision also put `@NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z ]*")`
on the elements. Implementation proved that wrong and the correction is recorded here rather
than left in the code: those two constraints are **character-level**, and the delta's
distinction is **token-level**. `[""]` and `[" "]` are strings, so the delta answers
`INTEREST_NOT_ALLOWED`; `@NotBlank` would have answered `INVALID_REQUEST`. `[42]` and
`[null]` are not strings, so the delta answers `INVALID_REQUEST`; Jackson coerces `42` to
`"42"` for a plain `List<String>`, so a pattern would have answered
`INTEREST_NOT_ALLOWED` — also the wrong code.

The split that satisfies all four: Jakarta Validation owns **presence** (`@NotNull` on the
field, so `{}` fails), and a field-level `StrictStringListDeserializer` owns **element type**
(anything but a `VALUE_STRING` token raises `MismatchedInputException`, which Spring wraps in
`HttpMessageNotReadableException` → `INVALID_REQUEST`). A well-formed but unknown label
(`teleportation`, `art`, `" Art "`, `""`) therefore still reaches the catalogue and is rejected
there with `INTEREST_NOT_ALLOWED`, which is exactly the boundary the delta draws.

**DD5 — Check order and codes.** body shape (400 `INVALID_REQUEST`) → identity (401
`USER_REQUIRED`) → trip existence (404 `TRIP_NOT_FOUND`) → membership (403 `NOT_A_MEMBER`) →
catalogue (400 `INTEREST_NOT_ALLOWED`) → write. A rejected request writes nothing, and the
`GET`/`PUT` symmetry matches `TripController.read`.

One asymmetry is deliberate and recorded: an unreadable body fails during argument
resolution, so Spring raises `HttpMessageNotReadableException` **before** the handler runs
and `INVALID_REQUEST` wins over a missing identity. The delta specifies single-failure
scenarios only, so no scenario is contradicted; combined cases are not asserted and no
ordering is claimed for them.

**DD6 — Catalogue and dedupe.** `InterestCatalogue` holds the ten `(label, code)` pairs in
the AC order as code constants. Matching is `List.indexOf` on the exact label — no `trim`,
no `equalsIgnoreCase`, no substring. Submission goes through a `LinkedHashSet<String>` so
the first occurrence order survives; the resulting labels map to codes and are serialized as
`{"codes":[...]}`. Any unmatched element rejects the whole request before the write, so
allowed siblings never land (SAVE-5, SAVE-6).

**DD7 — Replace, never merge.** One statement per save, issued through `JdbcClient`
(`sql(...).param(...).update()`):

```sql
INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at)
VALUES (?, ?, 'interest', ?, ?)
ON CONFLICT (trip_id, user_id, kind)
DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
```

A first save inserts, later saves overwrite, and an empty array stores `{"codes":[]}` while
keeping the row (SAVE-3, SAVE-4, SAVE-7). Repeating the same set rewrites identical `payload`
with a fresh `updated_at`, which the delta explicitly allows (SAVE-2).

**DD8 — Read shape.** One query joins the member list to the caller's trip and left-joins
the stored rows, so members are never omitted:

```sql
SELECT m.user_id, p.payload
FROM trip_member m
LEFT JOIN member_preference p
       ON p.trip_id = m.trip_id AND p.user_id = m.user_id AND p.kind = 'interest'
WHERE m.trip_id = ?
ORDER BY m.user_id
```

`payload` null → `interests: []`. The response carries exactly `userId` and `interests` per
member and no other key (READ-4).

**DD9 — Frontend stack per plan §3/§4.** The page is built on the stack the plan names, not
on the hand-written shell:

- **Tooling.** `typescript` + `@types/react` + `@types/react-dom`, a `tsconfig.json`
  (`strict`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `noEmit`) and an
  `npm run typecheck` script. `origin/main` landed the TS migration first, so the merged tree
  already has these files and every page is `.tsx` except the four REQ-003/004 pages. The script
  was `tsc -b` while main was a build-mode solution; the second merge (`f11d395`, US-065) flattened
  it — `tsconfig.app.json` is gone and `tsconfig.json` carries `noEmit` itself — so the merged tree
  takes main's `typecheck` = `tsc --noEmit` and `build` = `npm run typecheck && vite build` (tasks 8.9).
- **Data.** `@tanstack/react-query` v5 with a `QueryClientProvider` in `main.jsx` and
  `defaultOptions.queries.retry = 0` — PAGE-9 requires a visible retry action, and the
  default three invisible retries would make the failing state arrive seconds late. Transport
  is a new typed `src/api/client.ts` (`request<T>()` raising `ApiError {status, code,
  message}`), with `src/api/preferences.ts` for the two calls and `src/types/preferences.ts`
  for the payload types, following the plan's `api/` + `types/` layout. `api.js` stays for
  the pages that have not migrated yet.
- **Routing.** `react-router-dom` 7 with `HashRouter` was the intent: a route table covering
  `/`, `/create`, `/trips/:tripId`, `/join/:token` and the new
  `/trips/:tripId/preferences`. The merges with `origin/main` settled it the other way —
  `App.tsx` kept the hand-written `parseRoute` for the hub pages, and the new page is one more
  branch there, while `router.tsx` (`createBrowserRouter`) mounts `App` at `/` and owns only
  the splits screens. No routing code was written for this page, the existing addresses keep
  their contracts, and the dependency arrives with `main` rather than from this change.
  Recorded as TS-12.
- **UI.** The page reuses the design system `origin/main` introduced in `app.css` —
  `.appbar`/`.grow`/`.title`/`.sub`, `.iconbtn`, `.sec-title`, `.chips`, `.actionbar`,
  `.btn.btn-primary`, `.pill` and `.hint` — plus `Icon` from `Icons.tsx`, so it matches the
  hand-written pages instead of introducing a second palette. One class is new, `.pick`
  (chip, hover, selected and disabled states), because the merged `.chip` is a static label
  used by the main-itinerary pages and reusing it would have changed those pages. Load and
  save failures render as `.notice` with `role="alert"` instead of an Ant Design `Alert`: the
  second merge replaced the shell with `shadcn/ui` primitives and Tailwind tokens, so keeping
  `antd` would have meant two design systems for one box (TS-13). Selection, save and the
  loading state are hand-written DOM so they can carry the screen-08 shapes. Detail:
  Revision 2026-11-16.
- **Shared-file cost.** `App.tsx`, `main.jsx` and `app.css` are the pre-existing frontend
  files touched. The merge made this cheaper — most of `app.css` was already there — but the
  owners of the main-itinerary pages still need to know that `.pick` arrived.

**DD10 — Page behaviour `#/trips/<id>/preferences`.** The query key is
`['preferences', tripId]` (the session fixes the caller, so there is no identity dimension left
to key on), so mounting refetches without
manual wiring. The selection is local component state seeded from the fetched data; Save is
one `useMutation` PUT, and on success the state is set to the response and the cache is
seeded with `setQueryData`; on failure the `.notice` box shows the server `message` and the
selection rolls back to the last acknowledged set; a failed load renders the error plus a
retry action (`refetch`). No `localStorage`. Clearing means deselecting all ten and saving
(accepted product ruling), so no Clear All control is added. The details page adds one entry
link.

**DD11 — Test isolation.** `PreferenceApiTest` mirrors `TripApiTest`:
`@SpringBootTest(classes = HelloApplication.class)` with
`jdbc:sqlite:file:preference-test?mode=memory&cache=shared&foreign_keys=on`, Hikari pool size
1, Flyway `V1`–`V7`; `@BeforeEach` clears `member_preference`; the fixture trip id is read by
name, never hard-coded; rows, `payload` and `updated_at` are asserted through the autowired
`JdbcClient` (Boot 3.5 configures it next to `JdbcTemplate`). Since the fourth merge every
request carries main's `TestAuth.asUser(userId)` (a principal plus the CSRF token) instead of
the retired `X-User-Id` header; `TestAuth.csrfOnly()` covers the anonymous writes.

**DD12 — Dependencies, CI and gates.** Backend `pom.xml` gains
`spring-boot-starter-validation`, and follows plan §7 on Flyway: `flyway-core` **plus**
`flyway-database-nc-sqlite` at one explicit `${flyway.version}`, with `sqlite-jdbc` also
pinned. Frontend `package.json` gains `@tanstack/react-query` and the TypeScript dev
dependencies, but not `antd` (TS-13); `react-router-dom` arrives with the splits merge rather
than from this change. The frontend CI job gains `npm run typecheck` between `npm ci` and
`npm run build`; the backend job stays `mvn -B test`.

Fourth-merge updates (2026-11-16): `pom.xml` also carries main's
`spring-boot-starter-security` and `spring-security-test`, so the preference tests can post a
real principal; the frontend job now runs `node --test tests/lockfile.test.mjs` before
`npm ci` (main's `171ec00`), then `npm ci` → `typecheck` → `build`.

Flyway caveat, stated so it is not decided silently at implementation time: if
`flyway-database-nc-sqlite` cannot be resolved for the Boot-managed Flyway version, the
Flyway version itself is **not** moved — four changes share `V1`–`V4` and re-pinning would
re-checksum all of them. In that case §7's own escape clause is not satisfied by a workaround
and the gap is recorded as an open deviation.

**Measured on 2026-11-16, so the caveat is a fact and not a hypothesis.**
`mvn dependency:get -Dartifact=org.flywaydb:flyway-database-nc-sqlite:11.7.2` answered
`Could not find artifact ... in central`, and the same coordinate does not exist for the Boot
3.5.14-managed Flyway either. The fallback branch was therefore taken: `flyway-core` stays,
the Flyway version is untouched, `V1`–`V4` keep their checksums, and the missing module is
recorded as TS-11. Flyway still detects SQLite (the run logs `Database: jdbc:sqlite:...
(SQLite 3.49)`), so migrations work; what the plan asked for and this change cannot supply is
the separately versioned SQLite module.

Local gate: `mvn test` (all classes), `npm ci`, `npm run typecheck`, `npm run build`, and a
browser pass over the page states. The pipeline gate is a fresh CI run on the PR to `main`.

## Deviations from `tech-stack-plan.md`

`openspec/config.yaml` makes the plan binding and requires every deviation to be recorded in
the proposal or the design. After D17 these are only the places where the plan **cannot** be
applied to this change — every other choice follows it.

| # | Plan says | This change | Why the plan cannot be applied here | Tracked as |
|---|---|---|---|---|
| TS-1 | §6: `{data, error}` envelope | bare DTO on success, top-level `{code, message}` on failure | the G1-passed delta says the response body "carries `code` equal to `INVALID_REQUEST`" and PAGE-9 reads the response `message`; nesting them under `error` contradicts the approved text, and the delta outranks the plan | Delta spec; plan reconciliation |
| TS-2 | §6: `X-Member-Id` | the authenticated session (originally `X-User-Id`) | every delta scenario named `X-User-Id` while `V2` identity is `app_user.id`; main's US-066 then replaced header identity with `SecurityConfig` + `Session` and the trip/split endpoints follow it, so the preference endpoints take the caller from `AccountPrincipal` and ignore the header | Delta spec; plan reconciliation |
| TS-3 | §5: `member_preference` with `member_id` and a plain index `(trip_id, member_id, kind)` | `user_id` + `UNIQUE (trip_id, user_id, kind)` | `V2` has no `member_id`, and inventing one would fork identity from the merged trip code; the delta also needs "one row per kind", which a plain index cannot express (UNIQUE also serves the lookup) | DD1; plan reconciliation |
| TS-4 | §5: `./data/bettertrips.db` | `./data/gogo.db` | renaming a database file is a data migration for every existing checkout, not a config edit; the URL **parameters** the plan mandates are applied (DD2) | Plan reconciliation |
| TS-5 | §5, DR-12: interests stored as `tag.code` from the 24-code vocabulary | ten constants; no `tag` table, no `/api/tags` | the vocabulary ships with M2.5/US-031, and the AC fixes exactly ten Chinese labels and forbids aliases | D2; plan reconciliation |
| TS-6 | §6: one `PUT /preferences` carrying all four kinds | `interest` only; REQ-020/024 add `/must-dos` and `/budget` | each kind has its own validation and save timing, and this delta is interest-only by scope | Delta spec; plan reconciliation |
| TS-7 | §3: Vite 7.x | Vite 8.3 | a downgrade is a regression with no gain; Vite 8 runs the plan's React 19 + TypeScript setup | Plan reconciliation |
| TS-8 | §3: Maven Wrapper | none; `mvn` from `PATH` | developer tooling, unrelated to the feature | Plan reconciliation |
| TS-9 | §3: no extra frontend dependency | `qrcode` + `jsqr` from REQ-004 | the QR join flow needed them (Apache-2.0) | REQ-004 record |
| TS-10 | §4: `com.bettertrips.*` with one `common/GlobalExceptionHandler` | `com.gogo.*` with one advice per feature package | renaming four packages gains nothing functional; the per-package advice already exists twice and D15 follows it | DD3, D15; plan reconciliation |
| TS-11 | §7: `flyway-core` **plus** `flyway-database-nc-sqlite` at one explicit `${flyway.version}` | `flyway-core` only; no Flyway version change | measured 2026-11-16: the module does not exist on Maven Central for the managed Flyway (11.7.2 or the Boot 3.5.14 default), and re-pinning the shared Flyway version would re-checksum `V1`–`V4` for four in-flight changes; Flyway still detects SQLite without it | DD12; plan reconciliation, reopened when the module ships |
| TS-12 | §3: React Router for the route table | the hand-written `parseRoute` in `App.tsx`, which the splits merge now mounts from `router.tsx`; the page is one more `parseRoute` branch | `origin/main` landed the app shell (US-064) with `parseRoute` while this change was in P4; replacing it would have rewritten the router for five other pages inside a preferences change, and the addresses are identical either way | DD9; pick it up with US-064 |
| TS-13 | §3 dependency table: UI is Ant Design 5.x | no `antd`; `.notice` (`role="alert"`) carries the two failure states | the second merge replaced the hand-written shell with `shadcn/ui` primitives and Tailwind tokens, so `antd` would have been a second design system installed for one alert box, and its lockfile entries would have to be pinned through a registry the build sandbox cannot reach; the notice keeps the page's own palette and the same accessible role | DD9; resolved 2026-11-16 — `shadcn/ui` is the kit for the whole app (`AGENTS.md` §Reference, `tech-stack-plan.md` §3) |

What the reversal changed, for the reviewers who read the first version:

- New backend code uses `JdbcClient` + `record` (was `JdbcTemplate`), and the older
  repositories stay on `JdbcTemplate` until the reconciliation task.
- Request shape is enforced with Jakarta Validation, which is also what makes
  `{"interests":[42]}` answer `INVALID_REQUEST` instead of `INTEREST_NOT_ALLOWED`.
- `application.yml` now carries §7's WAL / busy-timeout / foreign-keys parameters and pins
  the pool to one connection — inside this change, not later.
- The page uses TypeScript, TanStack Query and the merged `shadcn/ui` palette, not
  `antd` (TS-13); CI typechecks the frontend, and routing stayed on `parseRoute` once the
  merges settled it (TS-12).
- Flyway gains the SQLite module with one pinned version, subject to the DD12 caveat. The
  caveat fired: the module is not published, so `flyway-core` stays and TS-11 records it.

## Risks / Trade-offs

- **`X-User-Id` impersonation (retired).** Any seeded id used to be accepted with no
  credential; main's US-066 removed that hole by requiring a session. The preference endpoints
  now reject anonymous callers with `401 USER_REQUIRED` and require the CSRF token on `PUT`,
  so the risk is closed rather than merely accepted. `PreferenceApiTest` keeps the two
  scenarios that pin it: an anonymous caller is rejected even when the old header is sent, and
  a header that disagrees with the session does not change which member is stored.
- **Existence leak.** `403` for a non-member confirms the trip id exists; inherited from the
  merged read path and confirmed at G1.
- **Malformed body outranks identity** (DD5). Accepted: it comes from Spring's argument
  resolution, and no scenario asserts the combined case.
- **Duplicated advice class.** D15 adds a ~20-line advice instead of widening
  `TripErrorAdvice`, which would make one class own four packages' error mapping.
- **Page contract is version 1 of three.** REQ-020 and REQ-024 rewrite the same requirement
  in full; this delta must stay self-contained so the later versions supersede it cleanly.
- **Strict validation is still failing.** Five ADDED requirement bodies exceed 500
  characters, so `openspec validate --strict` exits 1. It blocks archive, not P4, and the CLI
  is absent from this environment; the rerun is a task, not a claim.
- **The plan stack touches shared files.** `pom.xml`, `application.yml`, `App.jsx`,
  `main.jsx` and `ci.yml` are all edited while four changes are in flight on one branch.
  Merge conflicts are expected, and the TS migration owner plus the other change owners need
  to know before the shell lands.
- **Bundle growth.** TanStack Query is a real increase in the built bundle for one page; no
  code splitting is introduced here, so `npm run build` chunk warnings may appear.
- **Foreign-key enforcement is now live.** Any code path still writing orphan rows starts
  failing instead of silently succeeding. `V1`–`V3` seeds and the merged invite/trip flows
  were checked; a full `mvn test` is the proof, not this sentence.
- **Flyway pinning may not resolve** (DD12). It did not: `flyway-database-nc-sqlite` has no
  published artifact for the managed Flyway version, so TS-11 records an open deviation and no
  version was moved. Migrations still run; only the separately versioned module is missing.
- **Implementation corrected DD4.** Character-level Jakarta constraints could not express the
  delta's token-level distinction, so presence moved to `@NotNull` and element type moved to a
  field deserializer. The design says so; the code and the delta agree.

## Revision 2026-11-16 — Chinese catalogue and the screen-08 baseline

After the P4 code had landed, the requirement owner revised two statements of the G1-passed
delta. Both are product changes, not implementation choices, so they are recorded here with
their consequences rather than folded into the decisions above.

**1. The interests are Chinese.** The catalogue is exactly `水上运动`, `潜水`, `摄影`,
`美食`, `咖啡`, `历史人文`, `手作`, `自然风景`, `冒险`, `慢游`, stored as `water`,
`diving`, `photo`, `food`, `coffee`, `heritage`, `craft`, `nature`, `adventure`, `slow`. The
seven English labels of the first draft (`Art`, `Nature`, `Culture`, `History`, `Food`,
`Shopping`, `Adventure`) are no longer accepted, and a scenario now asserts that. Matching is
still literal on the label: case folding is moot for Chinese, while trimming, aliases and
near-matches (`浮潜`, `美食家`) are still rejected. The wire value is the label and the row
still stores `{"codes":[...]}` — the storage shape did not change.

**2. The page follows `screen-08-preferences.png`.** The chips render in the prototype's
order, which is *not* the order the request listed the labels in: `历史人文` precedes `手作`
and `慢游` comes last. The page keeps the app bar (back control, `我的偏好`,
`<name> · US-019`, save-state badge), the section heading, the emoji chips with the selected
one inverted to the dark ink colour, the hint line, and a fixed bottom bar holding the
primary save button. The remaining screen-08 blocks — mandatory items (US-020), budget
(US-024), the no-preference switch (US-027) and the readiness submit — stay out of scope, as
Goals already says.

Consequences, recorded instead of left implicit:

- **G1 was re-signed for this text on 2026-11-16.** The original decision was made against
  the English seven-label catalogue and a chip UI without a visual baseline, and the catalogue
  table, four API scenarios, the read scenarios and the whole page requirement changed
  afterwards. IO Emily and SA evelyn.huang re-read the revised delta and signed it as Pass,
  recorded in `g1-decision.md` §"Revision re-review (2026-11-16) — Pass"; G2 may cite it for
  this text. The agent did not issue either signature.
- **No data migration is needed or written.** The feature exists only on
  `feat/travel_preference` and nothing has been released, so no stored row holds a retired
  code. The local development database was re-seeded with `{"codes":[]}` for the three
  fixture members by hand, so it matches what the verify report checks.
- **The merge with `main` moved two DD9 bullets.** `origin/main` had already migrated every
  page to TypeScript and introduced the `app.css` design system, so this change introduces no
  tooling and needs no router: `App.tsx` keeps `parseRoute` and the new page is one more
  branch there (TS-12). The page reuses `.appbar`, `.sec-title`, `.chips`, `.actionbar`,
  `.btn.btn-primary`, `.pill` and `.hint`, adds exactly one class (`.pick`), and leaves the
  main-itinerary pages that use `.chip` untouched.
- **Tests are the evidence, not the claim.** `PreferenceApiTest` was rewritten to the Chinese
  labels first and failed against the old catalogue (15 failures + 1 error across 29 cases),
  then passed after the catalogue change; `npm run typecheck` and `npm run build` pass. The
  reruns are in the P4 report.
