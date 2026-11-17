# ATDD design — req-020-manage-must-do

- Change: `openspec/changes/req-020-manage-must-do/` (REQ-020, US-020)
- Delta Spec: `specs/preferences/spec.md` — 3 requirements, **44 scenarios** (19 save + 6 read +
  19 page) after the two 2026-11-16 amendments. G1 is Pass (IO Emily 2026-11-15, SA evelyn.huang
  2026-11-16) and **condition 8 is closed**: both roles passed the two amendments on 2026-11-16,
  relayed by the change author, so P4 is authorised on the 44-scenario package. The signatures were
  given on the uncommitted working-tree text, which the commit must not alter.
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (users 1–5, the seeded
  "Singapore Friends Day" trip). REQ-020 request samples stay in the delta (P3-1 below).
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no feature code and no
  unit-test suite plan is written here.

P3 rulings carried into this design:

- **P3-1 — OQ-10 closed: no new rows in the shared fixtures file.** Every value the checks need is
  fixed in the delta scenarios, and `acceptance-test-fixtures.md` is part of the tree PR #44 touches
  while REQ-019's G2 is open, so a REQ-020 section would only add conflict surface. Same reasoning
  as REQ-019's D16.
- **P3-2 — R4 storage mirror.** The stored payload is `{"items": [{id, activity, name, location,
  time}]}` with `name` equal to `activity`; responses carry the four contract keys only. Ruling and
  rejected alternatives are in the delta's Clarifications (R4) and in `proposal.md`.
- **P3-3 — legacy seeded rows follow REQ-019's DD1.** `V5__create_main_plan.sql` seeds `must_do`
  rows in the `name`-only shape for the fixture trip. The seeds stay untouched (`MainPlanApiTest`
  depends on them), the API tests clear `member_preference` per case, and the development database
  is re-seeded by hand at P4. No tolerance branch is added for a payload this change cannot produce.
- **P3-4 — own test class, own in-memory database.** `MustDoApiTest` runs on
  `jdbc:sqlite:file:mustdo-test?...`, not on `preference-test`. `PreferenceApiTest` and
  `MainPlanApiTest` are verified, signed or merged evidence and are not edited while REQ-019's G2 is
  open.

## 1. ATDD layers in scope

**API** — `MustDoApiTest`, MockMvc against the real SQLite engine and Flyway migrations, following
`PreferenceApiTest`: every endpoint contract, validation branch, stored-row and stored-payload
assertion. **E2E** — browser against the running backend plus the Vite dev server, as numbered steps
with expected observations, the form REQ-003/004/019 used; there is no Playwright layer in this
repository. Pure-logic items defer to apply-time unit TDD.

DB-state THEN clauses stay at the **API** layer rather than being pushed to E2E, as in REQ-019: each
one is observable inside a single endpoint call while the test reads the same SQLite file through
`JdbcClient`, so no multi-system path is needed to prove "nothing was written" (layer-inference
priority 1 beats priority 3).

| # | Scenario | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| MDS-1 | An item is added and read back | API | — | 200, row count and parsed payload in one call |
| MDS-2 | An edit keeps the same item | API | — | AC2: same `id`, new `time`, one item |
| MDS-3 | An item missing from the request is deleted | API | — | whole-list replace; omission is the delete path |
| MDS-4 | An empty list clears the list but keeps the record | API | — | row survives with `{"items":[]}` |
| MDS-5 | Items keep the submitted order | API | — | C2; response order plus a later `GET` |
| MDS-6 | Item ids are list-local and may be reassigned | API | privacy (advisory) | C1: `max + 1` after clearing; two members' ids stay unrelated |
| MDS-7 | A location or a time alone is enough | API | — | the absent field reads back as `null` (C4) |
| MDS-8 | Both location and time may be saved together | API | — | C5 overrides the reference screen's `二选一` |
| MDS-9 | Whitespace is trimmed and blank optional fields become null | API | — | stored strings, not request strings |
| MDS-10 | A missing activity rejects the whole request | API | — | `MUST_DO_ACTIVITY_REQUIRED`; `payload` and `updated_at` byte-identical |
| MDS-11 | An item without a location and without a time is rejected | API | — | `MUST_DO_PLACE_OR_TIME_REQUIRED`; zero write |
| MDS-12 | A malformed time is rejected | API | — | `MUST_DO_TIME_INVALID` over all six listed values |
| MDS-13 | An unknown or foreign item id rejects the whole request | API | privacy (advisory) | `MUST_DO_ITEM_UNKNOWN`; both members' rows unchanged |
| MDS-14 | A duplicated id in one request is rejected | API | — | `MUST_DO_ITEM_DUPLICATE_ID`, step 6 before step 7 |
| MDS-15 | A mixed request is rejected as a whole | API | consistency (advisory) | the valid new item is not stored either |
| MDS-16 | A malformed body is rejected | API | — | `INVALID_REQUEST` for a bare array, missing `items`, an object, a non-object item, a string `id` |
| MDS-17 | Repeating the same list is idempotent | API | consistency (advisory) | byte-identical bodies; ids, order and `payload` unchanged |
| MDS-18 | The first save creates exactly one row | API | — | `UNIQUE(trip_id, user_id, kind)` on `V6` |
| MDS-19 | The stored payload mirrors the activity under `name` | API | integration (advisory) | R4: the mirror follows create **and** edit; no response carries it |
| MDR-1 | A member reads back the saved list | API | — | the reload half of AC1 is PAGE-5 |
| MDR-2 | A member without saved items reads an empty array | API | — | members are never omitted |
| MDR-3 | Members do not overwrite each other | API | privacy (advisory) | two identities, two rows, unrelated ids |
| MDR-4 | The response carries only the agreed fields, ordered by user id | API | — | exact key set per member and per item |
| MDR-5 | The storage mirror never reaches a response | API | integration (advisory) | R4's other half: no `name` key, and `GET .../main-plan/inputs` still lists the activity |
| MDR-6 | Reading changes nothing | API | — | `payload` and `updated_at` unchanged across two reads |
| PAGE-1 | Loading | E2E | — | `加载中` badge, both sections' controls disabled |
| PAGE-2 | Empty interests | E2E | — | none of the ten chips selected |
| PAGE-3 | Saved interests are shown again after a reload | E2E | — | `摄影` and `自然风景` filled, the other eight not |
| PAGE-4 | Empty must-do list | E2E | — | empty state plus a usable `添加必做项` form |
| PAGE-5 | Saved must-do items are shown again after a reload | E2E | — | AC1's user-visible half, with the server's `id` |
| PAGE-6 | Adding an item persists immediately | E2E | — | one `PUT` in the network panel, no page-level save |
| PAGE-7 | Editing an item persists immediately and keeps the item count | E2E | — | one `PUT`, same `id`, new `time` |
| PAGE-8 | Deleting an item requires confirmation | E2E | — | C6: dialog with no request, then exactly one `PUT` on confirm |
| PAGE-9 | Cancelling item deletion preserves the list | E2E | — | no `PUT`, both items remain, unrelated unsaved interests untouched |
| PAGE-10 | Switching identity reloads both sections | E2E | — | cross-surface: top bar plus two sections |
| PAGE-11 | Saving interests disables duplicate submissions | E2E | — | in-flight state of the page-level save |
| PAGE-12 | A successful interest save follows the response | E2E | — | selection equals the response `interests` |
| PAGE-13 | A rejected interest save shows an inline error and rolls back | E2E | — | `INTEREST_NOT_ALLOWED` `message`, selection restored |
| PAGE-14 | A rejected must-do action shows an inline error and rolls back | E2E | resilience (advisory) | provoked with `固定时间 = 24:00`; see §4 |
| PAGE-15 | An in-flight must-do action blocks a duplicate submission | E2E | — | devtools throttling, as PAGE-5 in REQ-019 |
| PAGE-16 | A must-do action does not touch the interest selection | E2E | — | no interest `PUT`; unsaved `摄影` stays selected |
| PAGE-17 | Identity, membership or trip is rejected | E2E | security (advisory) | 401 / 403 (Eve, id 5) / 404 surfaces; no member data rendered |
| PAGE-18 | Loading fails | E2E | resilience (advisory) | backend stopped: error plus retry, never a stale list |
| PAGE-19 | The page keeps no local evidence of saved state | E2E + static | — | reload renders from the `GET`s; grep for `localStorage` |
| PAGE-20 | The two sections match `screen-08-preferences.png` | E2E | compatibility (advisory) | layout paragraph, R1/R2: subtitle `<name> · US-019~020`, badge, both headings, chip order, pin/clock markers, form labels, bottom bar holds only the interest save; the budget / no-preference / `提交并标记就绪` blocks are absent. Not a numbered delta scenario |
| UT-1 | Trim plus blank-to-`null` normalisation of the three strings | Defer UT | — | pure transform |
| UT-2 | The `HH:mm` pattern over the accepted and the six rejected values | Defer UT | — | pure predicate |
| UT-3 | Item id assignment as `max(current ids) + 1` | Defer UT | — | pure list computation |
| UT-4 | `{"items": [...]}` codec round trip, including the `name` mirror and `null` fields | Defer UT | — | pure serialization |
| UT-5 | Validation completes before the first write | Defer UT | — | ordering inside one service method |

The API rows carry the seven-step validation order as written: MDS-16 proves steps 1–2, MDS-10
step 3, MDS-11 step 4, MDS-12 step 5, MDS-14 step 6 and MDS-13 step 7, and MDS-15 proves that a
later step's failure discards an item that passed the earlier ones.

## 2. What is written before production code

1. `backend/src/test/java/com/gogo/preference/MustDoApiTest.java` authored red first, covering the
   25 API scenarios plus the API-level reverse rows of §5. It copies `PreferenceApiTest`'s harness
   (`@SpringBootTest(classes = HelloApplication.class, ...)`, `@AutoConfigureMockMvc`, autowired
   `JdbcClient`, `foreign_keys=on`, `maximum-pool-size=1`) with **its own database name**
   `mustdo-test` (P3-4) and `@BeforeEach DELETE FROM member_preference`, which also clears the `V5`
   seeds.
2. The red run is recorded and must fail for the right reason: `member_preference` already exists
   (`V6`, and `V5` before it), so the failure is **no handler** for
   `/api/trips/{tripId}/preferences/must-dos` — a 404/405, not a SQL error and not a 400. A green
   run, or a red run failing on a missing table, is a defect in the checks.
3. The E2E checklist (PAGE-1…PAGE-20) is written as numbered browser steps with expected
   observations, to be executed at P4.
4. No backend feature code, no page section, no route and no style until the red checks exist.
   Condition 8 of `g1-decision.md` is signed (IO Emily and SA evelyn.huang, 2026-11-16), so P4 may
   start; it must start with the red checks above, not with the feature.

## 3. Local vs CI gate expectations

- Local backend gate: the **whole** suite, not just the new class —
  `cd backend; & "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.3\plugins\maven\lib\maven3\bin\mvn.cmd" -B test`.
  `mvn` is not on `PATH` on this machine and the repository has no wrapper, so that bundled Maven is
  the verified invocation. Running everything matters here more than usual: R4 makes
  `com.gogo.preference` write a payload that `com.gogo.mainplan` reads, so `MainPlanApiTest` is part
  of this change's evidence rather than a bystander, and `PreferenceApiTest` proves the interest
  contract is untouched.
- Local frontend gate: `cd frontend; npm ci; npm run typecheck; npm run build`, then the browser
  steps.
- Evidence: a `docs/ai4se-plugins/` local-verify report plus REQ-020 rows in
  `docs/feedback/verification-matrix.md`, as REQ-019 did.
- CI gate: the two existing jobs on a pull request to `main` (`mvn -B test`; lockfile portability
  test, `npm ci`, `npm run typecheck`, `npm run build`). This change adds no dependency, so the
  lockfile job is unchanged. G2 needs a fresh run read for this change's own commit; nothing is
  inherited from REQ-019's runs. No new CI product.
- **Not** a P3/P4 gate: `openspec validate req-020-manage-must-do --strict`. It exited 1 at G1
  closure (two overlong ADDED bodies plus warnings) and is carried as condition 6, an archive
  blocker; the CLI is not on `PATH` here either. The two ADDED bodies were shortened on 2026-11-16
  to 493 and 432 characters against the 500 limit, measured locally by script; the remaining
  warnings and the rerun are still open, so strict is still not a passed check.

## 4. Data / fixtures strategy

- **Authority.** Users 1–5 and the "Singapore Friends Day" trip come from
  `acceptance-test-fixtures.md` unchanged; P3-1 adds no REQ-020 section to it.
- **Trip id is resolved, never assumed.** Every "trip 1" in the delta is read as
  `SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'`, matching the existing
  `seededTripId()` helpers. The E2E path discovers the id from the home page.
- **Isolation.** `member_preference` is touched by three test classes — `PreferenceApiTest`
  (`preference-test`), `MainPlanApiTest` and `MustDoApiTest` (`mustdo-test`) — each on its own
  in-memory database, so the per-case `DELETE` cannot leak across classes and the signed classes
  need no edit.
- **No mocks.** Row count, `payload`, `updated_at` and the mirror key are read through the same
  autowired `JdbcClient`, so "byte-identical before and after" (MDS-10, MDS-13, MDR-6) and
  "`name` equals `activity`" (MDS-19) are proven on the real engine.
- **Legacy seeds.** Cleared per case (P3-3). For the E2E path the development database is re-seeded
  by hand at P4 — delete the `must_do` rows of the fixture trip — so PAGE-4's empty state is
  reachable; afterwards the product clears the list with `{"items":[]}`, so no SQL is needed to
  repeat the browser steps.
- **MDR-5's main-plan half needs no test-only flip.** `V5` already sets `ready = 1` for users 1–4 on
  the fixture trip, so Ben's saved item reaches `GET /api/trips/{id}/main-plan/inputs`. Because the
  per-case clear removed the other members' seeded rows, the assertion is that `$.mustDo` **contains**
  the saved activity, never that it has four elements.
- **Provoking PAGE-14.** The primary path types `24:00` into `固定时间` and submits, which the server
  rejects with `MUST_DO_TIME_INVALID`; this only works if the page does not pre-validate more
  strictly than the contract, and that is an implementation constraint, not a test convenience. The
  fallback is stopping the backend for a failed request. Neither path may be replaced by a stubbed
  response.
- **Request samples** are the delta's own: `National Gallery Singapore visit` / `National Gallery
  Singapore` / `10:00`, the `10:00` → `10:30` edit, and the six malformed times.

## 5. Non-goals and reverse verification

This skill writes no business feature code, no detailed UT suite plan, no Playwright/POM/Excel
generators, and no new CI product.

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| Constraint and budget kinds (REQ-024) | `PUT` body with an extra `"kind":"budget"`; `GET` response keys | the extra field is ignored, only `must_do` rows are written, no `budget` key appears | API |
| No date on `time` (Known deviations, OQ-12) | an item carrying an extra `"date":"2026-12-05"` | 200; the stored payload and the response have no `date` key | API |
| No item-count limit, no field-length limit, no name dedup (C3) | two items with identical `activity` and `location`; one 300-character `activity` | both stored, count 2, the long string stored unchanged | API |
| Only the caller's own list is writable | Ben's `PUT` carrying `"userId":3`, with Chloe's row read before and after | the field is ignored; Chloe's `payload` is byte-identical | API |
| The interest contract is unchanged (proposal *Unchanged*) | `PUT`/`GET /api/trips/{id}/preferences`; the unedited `PreferenceApiTest` | still `{"codes":[...]}` and `{"members":[{userId,interests}]}`, no `mustDos` key; that suite stays green | API |
| No "save all" for must-do items (delta) | save interests only, then read the `must_do` rows; inspect the must-do section | the rows are byte-identical; the section renders no page-level save control | API + E2E |
| No readiness gating or required-preference count (REQ-026) | `GET` response keys | no `ready` / `required` field | API |
| `com.gogo.mainplan` is not touched (R4's chosen shape) | `git diff --stat` over that package; `MainPlanApiTest` | no source diff; the suite is green | static + API |
| No new migration (proposal) | list `backend/src/main/resources/db/migration` | `V1`–`V6` only, no `V7` | static |
| No new dependency and no new route (proposal) | `git diff --stat frontend/package.json`; the route table in `App.tsx` | empty diff; routes unchanged, the page stays one component | static |
| No local storage as saved-state evidence (delta) | grep `frontend/src` for `localStorage` | no match | static |
| No regression in merged capabilities | the full backend suite; `GET /api/greeting` | `greeting`, `trips`, `invitation`, `preference` and `mainplan` all green | API |

MDR-5 is the positive counterpart of the R4 row: it proves the mirror actually reaches the merged
reader, so the extra key cannot be silently dropped later as dead data.

## 6. NFR tests (optional)

**Not in scope** — decided by the user on 2026-11-16 when asked directly, the same ruling REQ-019
recorded. The delta carries no observability, performance or resilience requirement; PAGE-14,
PAGE-15 and PAGE-18 are functional failure paths, not NFR tests. Recorded as deferred, and IO/SA
raise it if a later story needs it.

## Next

`/sdd:task-plan` writes `design.md` and `tasks.md` from this document. Condition 8 of
`g1-decision.md` is closed (both signatures, 2026-11-16), so P4 is unblocked; the merge to `main`
still waits behind REQ-019's G2 and PR #44, and strict validation stays open as condition 6 — its two
overlong ADDED bodies are fixed, its rerun is not.
