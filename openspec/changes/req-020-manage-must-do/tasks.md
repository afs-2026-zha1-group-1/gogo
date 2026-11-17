# Tasks

- Change: `req-020-manage-must-do` (REQ-020, US-020)
- Inputs: [proposal](proposal.md) · [delta spec](specs/preferences/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md)
- G1: Pass, **no open condition** as of 2026-11-17 — IO Emily 2026-11-15 and SA evelyn.huang
  2026-11-16 for the package, condition 8 for the two P3 amendments (both relayed), condition 6
  closed 2026-11-17 on `openspec validate req-020-manage-must-do --strict` → exit 0, and
  condition 9 (the amendment (4) title restatements / relocation plus the amendment (5) page-body
  compression to 478 characters) signed Pass by both roles on 2026-11-17. The signed package is
  3 requirements / **44 scenarios**, committed and pushed at `07fe89d`.
- Order rule: acceptance checks red before production code (ATDD design §2, design MD14).
- NFR tests: out of scope by the user's 2026-11-16 decision (ATDD design §6). P4 delivers
  functional evidence only.
- Baseline rule: this change adds **no migration, no dependency, no route** (MD1, MD2, MD11); a
  task that introduces one is a design change, not an implementation detail.
- Sibling rule: `PreferenceApiTest`, `MainPlanApiTest` and `com.gogo.mainplan` are not edited
  (P3-3, P3-4); `req-024-set-trip-budget` will restate the same page requirement, so page-scenario
  titles must not drift while implementing.

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author `backend/src/test/java/com/gogo/preference/MustDoApiTest.java` covering
      MDS-1…MDS-19 and MDR-1…MDR-6 (25 cases): `@SpringBootTest(classes = HelloApplication.class)`
      on `jdbc:sqlite:file:mustdo-test?mode=memory&cache=shared&foreign_keys=on`,
      `@AutoConfigureMockMvc`, Hikari pool size 1, autowired `JdbcClient`,
      `@BeforeEach DELETE FROM member_preference`, fixture trip id resolved by name, identity via
      `TestAuth.asUser(...)` / `csrfOnly()` (MD14, ATDD §4)
- [x] 1.2 Add the API-level reverse checks of ATDD §5 in the same class: extra `"kind":"budget"`
      ignored, extra `"date"` ignored, duplicate activities and a 300-character `activity` stored
      unchanged, a `"userId"` field in Ben's `PUT` leaving Chloe's payload byte-identical, no
      `ready`/`required` keys in the `GET`, the interest contract still `{"codes":[…]}` /
      `{"members":[{userId,interests}]}` with no `mustDos` key
- [x] 1.3 Run the whole backend suite; record the red run and confirm the new class fails for the
      right reason — **no handler** (404/405) for `/api/trips/{tripId}/preferences/must-dos`, not a
      SQL error, because `member_preference` already exists through `V7` — while every
      pre-existing class stays green (branch baseline 255/255 before `MustDoApiTest` is added)
- [x] 1.4 Write the E2E checklist PAGE-1…PAGE-20 as numbered browser steps with expected
      observations, including the two rows the delta does not number: PAGE-10 (identity change
      performed by signing in as the other account — MD12, TS-14) and PAGE-20 (screen-08 layout
      comparison with the budget / no-preference / submit blocks absent)

## 2. Storage and payload layer (owner: Dev)

- [x] 2.1 Parameterize `kind` in `PreferenceRepository`: the upsert and the member-left-join take
      the kind as an argument, and the existing interest call sites pass `"interest"` unchanged;
      no Flyway file is added (MD1, MD8, MD9)
- [x] 2.2 `MustDoPayload` / `MustDoItem` codec: `{"items":[{id,activity,name,location,time}]}`,
      `null` for absent `location`/`time` (C4), and the **only** factory that writes `name` from
      `activity` so create and edit both mirror (MD3, MD4); decode tolerates the `V5` seed shape
      (`activity` falls back to `name`, missing `id`/`time` → `null`) while the writer stays strict
      (MD10)
- [x] 2.3 Apply-time unit TDD for the deferred pure logic: UT-1 trim/blank→`null`, UT-2 the
      `HH:mm` predicate over the accepted and six rejected values, UT-3 `max(current ids)+1`
      including the cleared-list restart, UT-4 codec round trip with the mirror and `null` fields,
      UT-5 validation completing before the first write (ATDD §1)

## 3. Endpoints, validation and errors (owner: Dev)

- [x] 3.1 `PreferenceController`: `GET` and `PUT /must-dos` under the existing mapping, both
      calling the existing private `caller(...)` gate so identity → trip → membership is written
      once (MD2, MD5); response types `MustDoSaveResponse` / `MustDoMembersResponse`
- [x] 3.2 `MustDoSaveRequest` with `@NotNull` presence plus a field-level
      `StrictMustDoItemListDeserializer` for a non-object item and a non-integer `id`, both landing
      on `INVALID_REQUEST` (MD6); add the `MustDoApiException` handler to `PreferenceErrorAdvice`
      and change nothing else in it (MD2, MD6)
- [x] 3.3 `MustDoValidator` implementing steps 3–7 of MD5 in that exact order
      (`MUST_DO_ACTIVITY_REQUIRED` → `MUST_DO_PLACE_OR_TIME_REQUIRED` → `MUST_DO_TIME_INVALID` →
      `MUST_DO_ITEM_DUPLICATE_ID` → `MUST_DO_ITEM_UNKNOWN`), with an id owned by another member
      reported as unknown, and all of it before any write (MDS-10…MDS-15, UT-5)
- [x] 3.4 `MustDoService`: normalise → issue ids in request order → one whole-list replace
      (MD7, MD8, C2); `GET` returns every member with `mustDos: []` when unsaved, ordered by
      `userId`, exposing only the four contract keys and never `name` (MD9, MDR-2, MDR-4, MDR-5)
- [x] 3.5 Run `mvn -B test`: the 25 API scenarios plus the reverse checks green,
      `PreferenceApiTest` and `MainPlanApiTest` unchanged and still green, and record the actual
      totals for this branch rather than reusing REQ-019's numbers

## 4. Frontend must-do section (owner: Dev)

- [x] 4.1 `src/types/preferences.ts`: `MustDoItem` (`id`, `activity`, `location | null`,
      `time | null`), the members and save response types; `src/api/preferences.ts`:
      `fetchMustDos` / `saveMustDos` over the existing `request<T>()` (MD11)
- [x] 4.2 `PreferencesPage.tsx`: second query `['must-dos', tripId]` plus its own `useMutation`,
      both sections' controls disabled while either `GET` is pending (PAGE-1), item list rendered
      from the server with its `id` (PAGE-5), empty state with a usable add form (PAGE-4)
- [x] 4.3 Inline add/edit form — heading `必做项（US-020 · 可增删改）`, action `添加必做项`,
      fields `活动名称` / `地点` / `固定时间`, buttons `取消` / `保存` (R2, PAGE-20) — sending
      exactly one whole-list `PUT` per confirmed action and adopting the response, so the new id
      comes from the server (PAGE-6, PAGE-7, MDS-2)
- [x] 4.4 Delete confirmation naming the item, with `取消`/dismiss sending no request and
      preserving both the list and unrelated unsaved interest selections, and Confirm sending
      exactly one `PUT` (C6, PAGE-8, PAGE-9)
- [x] 4.5 Section isolation: a must-do action never sends the interest `PUT` and never clears an
      unsaved selection; the interest save stays a single explicit request; `setQueryData` keeps
      the two caches independent (PAGE-11…PAGE-13, PAGE-16, MDS/MDR interest reverse check)
- [x] 4.6 Failure surfaces: must-do 400/500 renders the response `message` inside the must-do
      section and rolls the list back to the acknowledged state (PAGE-14, provoked by typing
      `24:00` — ATDD §4, no stubbed responses); in-flight action disables that section's controls
      (PAGE-15); 401/403/404 render the matching copy with a way back and no member data
      (PAGE-17); a failed `GET` offers retry and never shows a stale or empty list as saved
      (PAGE-18)
- [x] 4.7 Copy and badge scope: app-bar subtitle `<display name> · US-019~020` (R1), the badge
      continues to describe the interests section only (R3), and the budget / no-preference /
      `提交并标记就绪` blocks stay unrendered (PAGE-20)
- [x] 4.8 No local storage as saved-state evidence and no new route or dependency: reload renders
      from the two `GET`s (PAGE-19), `App.tsx`'s `parseRoute` unchanged, `package.json` diff empty;
      `npm ci && npm run typecheck && npm run build` pass
- [x] 4.9 If the item row needs a styling hook, add at most one class to `app.css` in the style of
      REQ-019's `.pick` and record it here (MD13); reuse `.sec-title`, `.card.pad`, `.field`,
      `.label`, `.input`, `.btn`, `.notice`, `.hint`, `.loading`, `.empty-state`
      — done, then revised 2026-11-17: the first pass added exactly one class (`.mustdo-row`); the
      owner then asked for closer `screen-08` alignment, which lifted the MD13 single-class limit and
      added `.mustdo-row .grow`, `.mustdo-lead`, `.row-actions`, `.btnrow` (+ `.btnrow .btn`), all
      reusing the existing tokens. The edit/delete SVG icons render inline in the row's `.row-actions`
      buttons (the trash icon was previously invisible until fixed); `固定时间` is a native
      `type="time"` input so the browser blocks invalid times before the strict `HH:MM` validator

## 5. Runtime acceptance and E2E (owner: Dev; evidence in the local-verify report)

- [x] 5.1 Start backend (8080) and frontend (5173); confirm by port owner and by a live
      `GET /api/trips/<id>/preferences/must-dos` response
      — done 2026-11-17: the owner restarted 8080 on the packaged P4 build, so the new route now
      answers (anonymous `401` instead of the earlier `404`). A safe non-mutating live probe against
      that instance passed 13/0 (`docs/ai4se-plugins/20261117-120157-req020-live-e2e-safe.log`):
      GET must-dos and GET preferences both 200 for a member, the time-format matrix all
      `MUST_DO_TIME_INVALID` with zero write, gate 401/403/404
- [x] 5.2 Re-seed the development database for the empty-state path: delete the `must_do` rows of
      the fixture trip by hand (P3-3), then execute PAGE-1…PAGE-20 and capture the observations,
      including the `24:00` rejection rollback, the delete confirm/cancel pair and the identity
      change through sign-out / sign-in
      — executed 2026-11-17 by the owner in a real Edge browser as Alice against the restarted 8080;
      the numbered rows are recorded in `docs/feedback/verification-req-020.md` §2 as **owner browser
      observation, relayed to and recorded by the agent** (the agent's own Computer Use was hard-stopped
      by the host URL-confidence policy). The `24:00`/full-width-`：` rejection and the delete
      confirm/cancel pair were observed; the empty-state was reached through the UI rather than a
      hand-edited dev database (the dev DB was not mutated). Identity-switch (PAGE-10) and the
      non-member/anonymous gate (PAGE-17 a/b) are covered by the HTTP E2E, not re-walked in the browser
- [x] 5.3 Re-run every API scenario and the §5 reverse checks with `curl`/PowerShell against the
      running backend, including the stored `payload` comparison and the `name` mirror after both
      create and edit; store the commands and the run log under `docs/ai4se-plugins/`
      — done 2026-11-17 against an isolated instance of the packaged jar (port 8081, own Flyway
      database): **45 checks, 0 failures**; harness
      `docs/ai4se-plugins/20261117-105552-req020-runtime-api-commands.ps1`, transcript
      `…-run.log`, payload reader `…-db-dump.py`
- [x] 5.4 Capture the page against `screen-08-preferences.png` at the same viewport the REQ-019
      revision used, and list the scoped differences rather than claiming a pixel match
      — done 2026-11-17 by the owner (screenshot attached to the §2 walkthrough). Layout-level match:
      app bar `我的偏好` + subtitle `Alice · US-019~020`, `已保存` badge, two sections in order, ten
      emoji chips, item row with lead tile + 📍/🕒 markers + edit/trash icon buttons (trash now drawn),
      bottom bar holding only `保存偏好`; the budget / no-preference / `提交并标记就绪` blocks are absent.
      Not claimed as a pixel match
- [x] 5.5 Add `docs/feedback/verification-matrix.md` rows for the 25 API and 20 page checks and
      the `docs/ai4se-plugins/` local-verify report; `Partial` where evidence is missing, never
      `Pass` by assertion
      — done: a `REQ-020 member must-do items (US-020)` section with 14 rows was appended; the page
      row and the layout row are marked **Pending** with the reason; the report slot is now filled by
      `docs/ai4se-plugins/20261117-111526-local-verify-report.md` (Overall **Partial**), whose
      whitelist run is logged in `…-111500-local-verify-commands.txt` and `…-110950-local-verify-run.log`
- [x] 5.6 Leave the dev database in a stated state (which identities hold which `must_do` rows),
      so REQ-024's page work starts from a known baseline
      — stated: `backend/data/gogo.db` was **not touched** by P4 (the running instance and its file
      database were left alone; `GET` on 8080 still answers 404 for the new route, which is how the
      stale build was identified). The runtime evidence used `%TEMP%\gogo-req020-runtime.db`; after
      the pass its `kind='must_do'` rows for trip 1 are Alice 1 none, Ben 2 one item
      (`{"id":7,"activity":"Redirect probe"…}`), Chloe 3 two items (ids 1,2), Daniel 4 none

## 6. CI, gates and documents (owner: Dev drafts; IO/SA/VL decide)

- [x] 6.1 No CI change expected: `ci.yml` keeps both jobs and this change adds no dependency. If
      P4 touches `ci.yml` or a lockfile, stop and record it as a design deviation (TS-9 territory)
      rather than slipping it in
      — verified: `git status` shows no change to `.github/workflows/ci.yml`,
      `frontend/package.json` or `frontend/package-lock.json`
- [ ] 6.2 Push `feat/travel_preference` only on the owner's explicit authorization; read the fresh
      CI run for **this change's** commit and write the pipeline report — REQ-019's runs are not
      evidence here
- [ ] 6.3 G2 decision record by a named VL; G3 by a named SA; the agent never self-signs and never
      relays a signature it was not explicitly told about
- [ ] 6.4 Update `README.md` (the two endpoints, the page's second section, the five `MUST_DO_*`
      codes) and the `requirement-workspace/{registry,handoff}.md` rows with the phases actually
      completed; report the `X-User-Id` / identity-selector wording drift (TS-14) to IO/SA in the
      G2 record instead of silently reconciling signed text
      — two of three parts done 2026-11-17: `README.md` gained the REQ-020 paragraph (endpoints,
      item shape, whole-list `PUT`, `max(id)+1`, the five codes, the `name` mirror, the page's second
      section) and both ledger rows carry the actual P4 state; the row stays open because the TS-14
      report belongs in the G2 record, which a named VL has not written yet
- [ ] 6.5 **Archive precondition** (config.yaml `rules.tasks`): reconcile
      `docs/knowledge/architecture/tech-stack-plan.md` with what this change actually shipped —
      the `/preferences/must-dos` contract, the `{"items":[…]}` payload and the `name` mirror — and
      append a row to `docs/knowledge/_LOG.md`. **Blocked until REQ-020 is archived**: the same
      rule forbids syncing still-unarchived work into the plan, and REQ-019's §17 is the current
      authority
- [x] 6.6 Rerun `openspec validate req-020-manage-must-do --strict` (CLI at
      `%APPDATA%\npm\openspec.cmd`) after any wording change during P4; exit 0 is a signed
      condition-6 fact, and a regression there is a gate event, not a cosmetic warning
      — rerun 2026-11-17 after the P4 edits: `Change 'req-020-manage-must-do' is valid`, exit 0

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P0–P2 artifacts, the G1 records and the strict remediation are committed and pushed —
      done: `07fe89d` carries the delta (345 lines, 3 req / 44 sc), the relocated preamble and
      Clarifications in `proposal.md`, and the condition 6/8/9 closures in `g1-decision.md`
- [x] 7.2 Commit P3 `atdd-design.md`, `design.md` and this `tasks.md` with the alignment
      self-check below — done: `c7c9944` (pushed `07fe89d..c7c9944` on 2026-11-17 after an L3
      deep security review with no findings) carries `design.md`, this `tasks.md`, the p3
      quality-checklist checkpoint/report and the ledger sync; `atdd-design.md` rode `07fe89d`
- [x] 7.3 Optionally run `/sdd:quality-checklist` (stage p3) before implementation; if it is not
      run, no checklist Pass may be claimed for this change — run 2026-11-17: P3-1…P3-4 all Pass,
      Stage Overall **Pass**, `docs/ai4se-plugins/20261117-100305-quality-checklist-report.md`
      (a stage DoV record, not a Gate decision)

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement / scenario group | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Save member must-do items (19) | MD1, MD3, MD4, MD5, MD6, MD7, MD8 | 1.1, 1.2, 2.1, 2.2, 2.3, 3.1–3.5 | MDS-1…MDS-19, UT-1…UT-5 | Pass — every scenario has an authored check and every validation step names its deciding task |
| Read member must-do items (6) | MD9, MD10, MD4 | 1.1, 2.2, 3.4, 3.5 | MDR-1…MDR-6 | Pass — MDR-5 keeps the merged main-plan reader as the witness |
| Preferences page (19) | MD11, MD12, MD13, R1/R2/R3 | 1.4, 4.1–4.9, 5.2, 5.4 | PAGE-1…PAGE-20 | Pass — PAGE-20 is layout-only and is labelled as not a numbered delta scenario |
| Precondition identity / trip / membership (Living Spec, not restated) | MD2, MD12 | 1.1, 3.1 | PAGE-17, ATDD §1 note | Pass — gate reused, not re-implemented |
| Non-goals (REQ-024 kinds, US-027, REQ-026, date field, limits, dedup, `tag`, migrations, routes, local storage) | Goals / Non-Goals, MD1, MD7, MD10 | 1.2, 3.3, 4.8, 6.1 | ATDD §5 reverse table (12 rows) | Pass — one reverse check per declared non-goal |
| R4 storage mirror and its cross-package effect | MD3, MD4, MD10; TS-17 | 2.2, 3.4, 3.5, 5.3 | MDS-19, MDR-5, integration advisory | Pass — mirror asserted on create **and** edit, never on the wire |
| Delta wording drift (`X-User-Id`, top-bar identity selector) | MD12; TS-14 | 1.4, 5.2, 6.4 | PAGE-10 row | **Pass with a recorded open item** — behaviour follows the merged session; the signed text stays unmodified and is reported at G2 |
| G1 condition 6 / condition 9 (strict validation, re-confirmation) | Context (gate state) | 6.6 | — (not an ATDD row; archive gate) | Pass — exit 0 on CLI evidence, condition 9 signed 2026-11-17, rerun is a task |
| Tech-stack baseline (`config.yaml` context, REQ-019 D17 plan-first) | MD1, MD2, MD6, MD11, MD13; TS-14…TS-17 | 2.1, 4.1, 6.5 | — (not an ATDD row; archive gate) | Pass as plan-following choices plus four recorded deviations; 6.5 is explicitly blocked until archive |

Self-check result: **Pass**. No task contradicts the ATDD layering (API for row/payload assertions,
E2E for rendered surface, five pure-logic items deferred to apply-time UT), no scenario is left
without a check, and nothing in the task list introduces a migration, a dependency, a route or an
edit to a package this change declared untouched. Open items are not gaps in this plan: 6.5 waits
for the archive, 5.x/6.x wait for P4, and TS-14 waits for a human decision at G2.

Next: `/sdd:quality-checklist` (stage p3, optional) → `/sdd:atdd-apply` for P4.
