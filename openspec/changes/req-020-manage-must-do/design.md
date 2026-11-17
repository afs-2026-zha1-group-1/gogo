# Design

## Context

Three baselines govern this design, in this order:

1. The G1-signed Delta Spec `specs/preferences/spec.md` — 3 requirements / **44 scenarios**
   (19 save + 6 read + 19 page). Nothing here may contradict it.
2. `docs/knowledge/architecture/tech-stack-plan.md`, which `openspec/config.yaml` declares
   binding for implementation, as interpreted by REQ-019's ruling **D17** (plan-first;
   code-consistency only where the plan cannot be applied). This change inherits that
   interpretation rather than re-deciding it.
3. The merged code — which for this change is unusually load-bearing, because REQ-020 extends
   an capability that already shipped: `openspec/specs/preferences/spec.md` (Living Spec,
   5 requirements / 31 scenarios), `com.gogo.preference` and `PreferencesPage.tsx` all exist on
   `main` through REQ-019 (archived 2026-11-16).

Merged state this design builds on: Spring Boot 3.5.14 / Java 21 / SQLite / Flyway `V1`–`V7`
(`V7__create_member_preference.sql` is REQ-019's table, with `UNIQUE (trip_id, user_id, kind)`),
session identity through `Authentication` / `AccountPrincipal` (US-066 retired the `X-User-Id`
header), a TypeScript + Vite + TanStack Query 5 frontend whose pages are routed by the
hand-written `parseRoute` in `App.tsx`, and two CI jobs (`mvn -B test`; lockfile portability →
`npm ci` → `typecheck` → `build`). The merged reader `MainPlanService.mustDoItems()` already
consumes `kind='must_do'` rows and keys on `item.path("name")` — that single fact is why the
delta carries ruling R4 and why two extra scenarios exist.

Gate state: G1 is **Pass with no open condition**. IO Emily (2026-11-15) and SA evelyn.huang
(2026-11-16) signed the package and its two P3 amendments (condition 8), `openspec validate
req-020-manage-must-do --strict` exits 0 (condition 6, closed 2026-11-17 on CLI evidence), and
condition 9 — the re-confirmation of the amendment (4) title restatements / relocation and the
amendment (5) page-body compression — was signed Pass by both roles on 2026-11-17. So P4 is
authorised on exactly the 44-scenario text this design describes. Both later signatures were
relayed by the change author under explicit user instruction, are not backed by reviewer-authored
text in the repository, and were given on working-tree text that is now committed and pushed
(`07fe89d`); P4 must not change the delta wording.

Links: [ATDD design](atdd-design.md) · [delta spec](specs/preferences/spec.md) ·
[tasks](tasks.md) · [proposal](proposal.md) ·
[fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
[REQ-019 design](../archive/2026-11-16-req-019-save-interests/design.md) ·
UI reference `ui-design-reference/screenshots/screen-08-preferences.png`.

## Goals / Non-Goals

Goals:

- `GET` and `PUT /api/trips/{tripId}/preferences/must-dos` with the 25 specified API scenarios:
  whole-list replace, server-issued list-local ids, the seven-step validation order with six
  distinct failure codes, zero write on any rejection, per-member isolation, and the `name`
  storage mirror that never reaches a response.
- The must-do section on the existing preferences page: list plus inline add/edit form plus
  confirmed delete, each action persisted by its own single `PUT`, with the interest section's
  explicit page-level save untouched and unshared.
- Layout and copy per `screen-08-preferences.png` and rulings R1–R3: app-bar subtitle
  `<display name> · US-019~020`, heading `必做项（US-020 · 可增删改）`, action `添加必做项`,
  fields `活动名称` / `地点` / `固定时间`, buttons `取消` / `保存`, and a save-state badge that
  describes the interests section only.
- Proving the mirror actually feeds the merged reader (MDR-5) while leaving `com.gogo.mainplan`,
  the `V5` seeds and `MainPlanApiTest` byte-identical.

Non-Goals: the budget and constraint kinds (REQ-024), the no-preference switch (US-027),
readiness gating and the effective-preferences endpoints (REQ-026), main-plan generation itself
(US-031), a `date` component on `time` (OQ-12), item-count / field-length limits or name-based
deduplication (C3), normalising items into their own table, a per-item id usable outside the
caller's list (C1), any migration, any new dependency, any new route, and the `tag` table /
`/api/tags`. Each has a reverse check in ATDD §5.

Design decisions are numbered **MD1–MD14**. They are distinct from REQ-019's `DD1–DD12` (that
numbering is frozen in the archived package), from this change's product rulings `D1–D14` and
P3 rulings `P3-1…P3-4`, and from the delta's clarifications `C1–C6` / `R1–R4`.

## Decisions

**MD1 — Zero migration; `kind` becomes a repository parameter.** No Flyway file is added: this
change writes `member_preference` rows with `kind = 'must_do'` and reuses `V7`'s columns and
`UNIQUE (trip_id, user_id, kind)` unchanged. `PreferenceRepository` hard-codes `INTEREST` today,
so the two statements gain a `kind` parameter and the existing interest call sites pass
`"interest"`; the interest behaviour and the `{"codes":[...]}` payload stay byte-identical, which
`PreferenceApiTest` (unedited) proves. `kind` stays free `TEXT` — REQ-019's DD1 kept it open for
exactly this reason.

**MD2 — Two endpoints inside `com.gogo.preference`, one identity gate.** `PreferenceController`
gains `@GetMapping("/must-dos")` and `@PutMapping("/must-dos")` under its existing
`/api/trips/{tripId}/preferences` mapping, and the two handlers call the same private
`caller(authentication, tripId)` helper that the interest endpoints use, so identity (`401
USER_REQUIRED`) → trip existence (`404 TRIP_NOT_FOUND`) → membership (`403 NOT_A_MEMBER`) is
written once and cannot drift between the kinds. A separate `MustDoController` was rejected: it
would duplicate that gate for no gain and, being outside the advice's `basePackages`, would need
a second advice — contrary to the proposal's "复用同一份错误 advice". New types live beside the
existing ones: `MustDoApiException` (status + code + message, the same shape as
`PreferenceApiException`, so `PreferenceErrorAdvice` — already scoped to `com.gogo.preference` —
maps it without any edit), `MustDoItem`, `MustDoSaveRequest`, `MustDoSaveResponse`,
`MustDoMembersResponse`, `MustDoMember`, `MustDoPayload`, `MustDoService` and `MustDoValidator`.
The proposal's own wording is followed here: `MUST_DO_*` adds exception types, not advice scope.

**MD3 — Stored payload is the contract shape plus the mirror.**
`{"items":[{"id":…,"activity":"…","name":"…","location":…,"time":…}]}` with `null` for an absent
`location` or `time` (C4). `name` is written by the codec from `activity` and is *never* read into
a response, so a future reader that only knows `name` (the merged main-plan service) sees the
activity text. Key order inside the JSON is not contractual; array order is (C2).

**MD4 — The `name` mirror lives in the codec, not in the service.** R4 requires the mirror to
follow create **and** edit (MDS-19). Setting it in the service means two call paths remember it;
constructing the stored record through one `from(...)` factory inside the payload codec makes an
unmirrored item unrepresentable. Rejected alternatives, recorded so the ruling is not silently
re-litigated: changing `MainPlanService.mustDoItems()` to prefer `activity` (touches a merged,
tested capability owned by another change, and the delta says that package is not modified), or a
`V8` rewrite of the `V5` seeds (a migration this change's scope explicitly forbids, and
`MainPlanApiTest` asserts the seeded rows).

**MD5 — Validation is a named seven-step order, all of it before the first write.** The service
method runs: (1) body shape → `INVALID_REQUEST`; (2) item type/`id` type → `INVALID_REQUEST`;
(3) `activity` present after trim → `MUST_DO_ACTIVITY_REQUIRED`; (4) `location` or `time` present
after trim → `MUST_DO_PLACE_OR_TIME_REQUIRED`; (5) `time` matches
`^([01]\d|2[0-3]):[0-5]\d$` → `MUST_DO_TIME_INVALID`; (6) duplicate `id` within the request →
`MUST_DO_ITEM_DUPLICATE_ID`; (7) every supplied `id` present in the caller's own stored list →
`MUST_DO_ITEM_UNKNOWN` (an id belonging to another member is *unknown*, not forbidden — MDS-13).
Then trim/blank→`null` normalisation, then id issuance, then one write. Steps 6 before 7 is
asserted by MDS-14 and the mixed-request case by MDS-15, so a later failure must not leave the
earlier valid items stored.

**MD6 — Steps 1–2 are Jackson-level, steps 3–7 are plain code.** The delta distinguishes
*token* type from *value*: a bare array, a missing `items`, `items` as an object, a non-object
item or a string `id` all answer `INVALID_REQUEST`, while a missing activity answers
`MUST_DO_ACTIVITY_REQUIRED`. Jakarta constraints are value-level and would answer the second code
for the first class of input, so the body shape uses `@NotNull` presence only and a
field-level `StrictMustDoItemListDeserializer` (the pattern REQ-019's DD4 settled on with
`StrictStringListDeserializer`) raises `MismatchedInputException` →
`HttpMessageNotReadableException` → `INVALID_REQUEST` for a non-object item or a non-integer
`id`. Steps 3–7 stay imperative in `MustDoValidator`: they need the caller's current list and
cross-item duplicate detection, which annotations cannot express. The advice keeps its scope and
its two existing branches: it already maps both `MethodArgumentNotValidException` and
`HttpMessageNotReadableException` to `INVALID_REQUEST`; the only advice edit is one more
`@ExceptionHandler` method for `MustDoApiException` (MD2) mirroring the existing
`PreferenceApiException` branch, with no change to `basePackages`.

**MD7 — Ids: `max(current ids) + 1`, assigned after validation, in request order.** For a new
item (no `id` or `null` `id`) the service takes the maximum `id` currently stored for that
`(trip_id, user_id, 'must_do')` row plus one. Cleared lists restart at 1 (MDS-6), two members'
id spaces are unrelated (MDR-3), and no id is ever referenced outside the caller's own list, so
no counter table, no sequence and no payload bookkeeping is added (C1). Because the whole list is
replaced in one statement, assignment happens once per request, not per item write.

**MD8 — One statement per save, replacing the whole row.** The upsert is REQ-019's DD7 shape with
`kind` as a parameter:

```sql
INSERT INTO member_preference (trip_id, user_id, kind, payload, updated_at)
VALUES (?, ?, 'must_do', ?, ?)
ON CONFLICT (trip_id, user_id, kind)
DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
```

Omission is therefore the only delete path (MDS-3), `{"items":[]}` clears the list but keeps the
row (MDS-4), the first save creates exactly one row (MDS-18), and a rejected request never reaches
this statement, which is what makes `payload` and `updated_at` byte-identical after MDS-10,
MDS-13 and MDR-6. Idempotence (MDS-17) is asserted on the response bodies and the stored `payload`;
the service re-writes identical `payload` with a fresh `updated_at`, exactly as REQ-019's DD7
allows.

**MD9 — Read shape is the same member-left-join, parameterized by `kind`.**

```sql
SELECT m.user_id, p.payload
FROM trip_member m
LEFT JOIN member_preference p
       ON p.trip_id = m.trip_id AND p.user_id = m.user_id AND p.kind = ?
WHERE m.trip_id = ?
ORDER BY m.user_id
```

No `must_do` row → `mustDos: []`, so no member is ever omitted (MDR-2). Each stored payload is
decoded into items exposing exactly `id`, `activity`, `location`, `time` (MDR-4) and the `name`
mirror is dropped on the way out (MDR-5, MDS-19). Reading issues no write, so `payload` and
`updated_at` stay unchanged across two reads (MDR-6). Item order inside a member follows the
stored array, which is the last submitted request order (C2, MDS-5).

**MD10 — Lenient decode of rows this change did not write.** `V5__create_main_plan.sql` seeds
`must_do` items shaped `{"name":"Merlion Park","location":"Merlion Park"}` — no `id`, no
`activity`, no `time`. P3-3 keeps those seeds untouched for `MainPlanApiTest`, so the *reader*
must not throw on that shape: `activity` falls back to `name`, a missing `id` reads as `null`, a
missing `time` reads as `null`. The **writer** stays strict and never accepts such a payload
(P3-3's "no tolerance branch" applies to writes only). Recording this asymmetry matters: without
MD10 a `GET` in a development database that still holds the seeds is a `500`, and the difference
between "lenient read, strict write" and "strict everywhere" is exactly the kind of choice that
must not be made silently at implementation time.

**MD11 — Frontend: one page, two sections, two independent request paths.** No new route, no new
component file, no new dependency. `PreferencesPage.tsx` keeps its interest block as-is and gains
a must-do block under `必做项（US-020 · 可增删改）`:

- Two queries, `['preferences', tripId]` (existing) and `['must-dos', tripId]` (new), plus one
  `useMutation` per write path: the interest save stays a single explicit `PUT`, while add, edit
  and delete each send their own whole-list `PUT` built from the last server-acknowledged items
  (`PAGE-6`, `PAGE-7`, `PAGE-16`). No optimistic item append: `PAGE-6` requires the id *from the
  response*, so the new item renders after the response, and `PAGE-14`/`PAGE-15` become
  straightforward (roll back to the acknowledged list, disable that section's controls while one
  action is in flight).
- `queryClient.setQueryData(['must-dos', tripId], response)` on success keeps the two sections'
  caches independent, so a must-do action cannot disturb the unsaved interest selection (PAGE-16)
  and an interest save cannot disturb the item list.
- Delete opens a confirmation dialog naming the item and offering `取消` / `保存` semantics per C6
  (`PAGE-8`, `PAGE-9`); only the confirm path builds and sends the request.
- Loading (`PAGE-1`) disables both sections' controls; the badge (`加载中` / `保存中` / `未保存` /
  `已保存`) describes the interests section only (R3), and must-do failures report inside the
  must-do section.
- `src/api/preferences.ts` gains `fetchMustDos` / `saveMustDos` over its existing `request<T>()`
  (session cookie + `lib/csrf`), and `src/types/preferences.ts` gains the item/response types.

**MD12 — Identity comes from the session; the top bar only displays it.** The delta's scenarios
still say `X-User-Id: 2`, and PAGE-10 says "the identity selector in the top bar". Both are
pre-US-066 wording: the shipped `AccountBar` renders `已登录 · <name>` with no selector, and the
`PreferenceController` ignores the header. The implementation follows the merged behaviour —
`useAuth().account.id` for the caller and `TestAuth.asUser(...)` in tests — and PAGE-10 is
executed by signing in as the other account. See Deviations TS-14; this is a documentation drift
in signed text, deliberately not "fixed" by changing code to match a retired header.

**MD13 — Styling reuses the merged `app.css` kit.** Available and used: `.sec-title`, `.card
pad`, `.field` / `.label` / `.input`, `.btn` with `.btn-primary` / `.btn-ghost` / `.sm`,
`.notice` (`role="alert"`), `.hint`, `.loading`, `.empty-state`, `.err-msg`, `.icon` and `.pill`
variants. If the item-row layout needs one new hook it is added as a single class in the same
spirit as REQ-019's `.pick`, and the design records it here rather than leaving it to be
discovered — no inline style blocks duplicated per item, no second palette.

**MD14 — Test harness: `MustDoApiTest` on its own database, neighbours untouched (P3-4).**
`@SpringBootTest(classes = HelloApplication.class)` with
`jdbc:sqlite:file:mustdo-test?mode=memory&cache=shared&foreign_keys=on`, Hikari pool size 1,
`@AutoConfigureMockMvc`, autowired `JdbcClient`, `@BeforeEach DELETE FROM member_preference`
(which also removes the `V5` seeds in that database), fixture trip id resolved by name, and rows /
`payload` / `updated_at` asserted through the same `JdbcClient` — no mocks. `PreferenceApiTest`
and `MainPlanApiTest` are not edited. The red run must fail as *no handler* for
`/preferences/must-dos` (404/405), not as a SQL error, because the table already exists (ATDD §2).

Local gate: `cd backend; & "<bundled Maven>\mvn.cmd" -B test` for the **whole** suite — R4 makes
`MainPlanApiTest` part of this change's evidence, not a bystander — then `cd frontend; npm ci`,
`npm run typecheck`, `npm run build` and the browser pass. `mvn` is not on `PATH` on this machine,
so the bundled Maven invocation in ATDD §3 is the verified one. CI: the two existing jobs, with a
fresh run read for this change's own commit; nothing is inherited from REQ-019's runs.

## Deviations from `tech-stack-plan.md`

REQ-019 recorded TS-1…TS-13 and those still stand for the shared stack; this table continues the
numbering. `openspec/config.yaml` requires every deviation to be recorded, so these are the
places where the plan or the merged baseline cannot be applied to *this* change.

| # | Plan / baseline says | This change | Why it cannot be applied here | Tracked as |
|---|---|---|---|---|
| TS-14 | The delta's scenario prose names `X-User-Id: 2`, and PAGE-10 names a top-bar identity selector | session identity (`Authentication` / `AccountPrincipal`, `useAuth()`); `AccountBar` displays only; PAGE-10 exercised by re-signing-in as the other account | US-066 removed header identity and the signed delta wording predates it; changing the code back would reopen a closed authentication hole, and the requirement text's behaviour (per-member isolation, reload for the new identity) is satisfied either way | MD11, MD12; delta wording drift reported to IO/SA at G2 |
| TS-15 | §5/§6: a preference row is one JSON document per `kind`; nothing about list-item identity | item ids live inside the JSON array and are unique only within the caller's list | a real per-item key needs a second table (a migration this change forbids, and `V7`'s shape is REQ-019's signed decision); the delta itself pins list-local ids and reuse after clearing | MD7, C1; plan reconciliation |
| TS-16 | §6: one `PUT /preferences` carrying all four kinds | `PUT .../preferences/must-dos` per kind, whole-list replace | TS-6 already recorded the split; each kind has its own validation and save timing, and REQ-024 appends `/budget` the same way | MD2; plan reconciliation |
| TS-17 | The merged reader keys on `name`; the contract keys on `activity` | both keys stored, `name` mirroring `activity`; only `activity` on the wire | R4, chosen over modifying `com.gogo.mainplan` or rewriting the `V5` seeds; the cost is a second truth in the payload that the codec alone is allowed to write | MD3, MD4, MDS-19, MDR-5 |

## Risks / Trade-offs

- **Two truths in one payload.** R4's mirror means `activity` and `name` must never diverge.
  Mitigated structurally by MD4 (only the codec produces a stored item) and pinned by MDS-19
  across create *and* edit, plus MDR-5 which keeps the merged reader as the external witness.
- **Legacy seed shape is a live input.** `V5` seeds `must_do` items without `id` or `activity`.
  The lenient-read / strict-write asymmetry (MD10) is the chosen handling; a future migration that
  rewrites the seeds should retire the fallback, and the design says so instead of letting the
  branch fossilise.
- **Whole-list replace makes lost-update invisible.** Two members of the same list editing
  concurrently overwrite each other silently. Accepted: the contract is per-caller, the row is
  serialised by `UNIQUE` plus the single pooled connection (REQ-019 DD7), and the delta asserts
  no concurrency behaviour — so no locking is invented here.
- **Per-action `PUT` is a new interaction pattern on this page.** Two sections with different save
  timings invite "unifying" them; the delta forbids it (PAGE-6 vs PAGE-11 vs PAGE-16) and the
  separate query keys in MD11 are what keep that possible.
- **Shared-file surface.** `PreferenceController`, `PreferenceRepository`,
  `PreferencesPage.tsx`, `api/preferences.ts`, `types/preferences.ts` and `app.css` are all
  REQ-019 files. REQ-024 will edit the same six, so this change must not restructure them beyond
  the parameterization MD1/MD9 needs; the third page revision depends on the shape this one
  leaves.
- **Page contract is revision 2 of 3.** REQ-024's MODIFIED block will restate this requirement in
  full against the Living Spec plus this delta; keeping the 19 page scenarios' titles exactly as
  signed is what makes that possible without an ERROR at archive.
- **Test-count inflation is not evidence.** The suite grows by 25 API cases plus reverse checks;
  the numbers recorded in tasks are the ones actually run, never REQ-019's 255/255 carried
  forward.
- **Nothing here implies P4 happened.** This document is a plan. No `must-dos` handler, no
  must-do section and no `MustDoApiTest` exist in the tree at the time of writing; the red checks
  come first (tasks §1).

## Alignment notes for /sdd:task-plan

Every delta scenario maps to an ATDD row (MDS-1…MDS-19, MDR-1…MDR-6, PAGE-1…PAGE-20) and to a
decision above; every MD1–MD14 decision is either exercised by a scenario or is an explicitly
recorded non-assertion (MD10's fallback is exercised through `MainPlanApiTest`'s untouched seeds
and the development database). The self-check table lives at the bottom of `tasks.md`.
