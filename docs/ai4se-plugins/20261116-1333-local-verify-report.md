# Local Verify Report: req-019-save-interests (P4)

**Date:** 2026-11-16 13:33 (timezone: UTC+08:00)
**Root:** `d:\code\training\gogo`
**Scope:** local + evidence
**Change id:** `req-019-save-interests` (REQ-019, US-019)
**Stage:** P4 (`/sdd:atdd-apply`) — this report is the P4 evidence bundle handed to
`/sdd:local-verify-report` and then to G2. It records implementation, not approval.

Inputs: [proposal](../../openspec/changes/req-019-save-interests/proposal.md) ·
[delta spec](../../openspec/changes/req-019-save-interests/specs/preferences/spec.md) ·
[ATDD design](../../openspec/changes/req-019-save-interests/atdd-design.md) ·
[design](../../openspec/changes/req-019-save-interests/design.md) ·
[tasks](../../openspec/changes/req-019-save-interests/tasks.md)

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Skipped (no lint/SAST tool configured; reverse checks used instead) |
| Code review | Pass (self-review; G2 human review pending) |
| Evidence (OpenSpec) | Partial |
| **Overall** | **Partial** |

**PR gate:** Partial → `/sdd:pr-submit` stays blocked until push authorization and the
named gate signatures land. No Waiver is used; agents must not self-approve one.

Why Partial rather than Pass, against the aggregation rules:

1. **Local verification is green.** `mvn -B test` 60/60 (Greeting 3, Invitation 15,
   Preference 29, Trip 13); `npm ci` + `npm run typecheck` + `npm run build` all exit 0;
   22 API scenarios executed with curl against a running backend; 9 page scenarios
   executed in a real browser. 0 CRITICAL findings.
2. **Evidence is Partial on two points the agent cannot close.** Remote CI has not run
   (the commit is unpushed, tasks 6.2), and no named VL has signed G2 (task 6.3).
3. **V1 is 30/35.** Open: 6.2 (push), 6.3 (gate records), 6.5 (`openspec validate
   --strict`, CLI absent here), 6.6 (plan reconciliation before archive) and 7.3 (the
   optional P3 checklist, not run). No implementation task is open.
4. **PAGE-4 and PAGE-7 are Partial**, not Pass: see the E2E table.

## What was built

Backend, package `com.gogo.preference` (DD1–DD8):

| File | Role |
|---|---|
| `db/migration/V4__create_member_preference.sql` | `member_preference` with `UNIQUE(trip_id,user_id,kind)`, FKs, no seed, no trigger |
| `InterestCatalogue` | seven `(label, code)` pairs in AC order; literal matching |
| `PreferenceSaveRequest` + `StrictStringListDeserializer` | presence via `@NotNull`, element type via JSON token type (DD4 as corrected) |
| `PreferenceService` | first-occurrence dedupe → whole-request catalogue check → one write |
| `PreferenceRepository` | `JdbcClient` upsert (DD7) and member left join (DD8), `payload` = `{"codes":[...]}` |
| `PreferenceController` | `GET`/`PUT /api/trips/{tripId}/preferences`; identity → trip → membership (DD5) |
| `PreferenceApiException` + `PreferenceErrorAdvice` | `com.gogo.preference` scope; validation and unreadable bodies → `400 INVALID_REQUEST` (D15) |

Platform baseline (DD2, DD12): `application.yml` gains
`?journal_mode=WAL&busy_timeout=5000&foreign_keys=on` and `hikari.maximum-pool-size: 1`;
`pom.xml` gains `spring-boot-starter-validation`.

Frontend on the plan stack (DD9, DD10): `typescript` + `tsconfig.json` +
`npm run typecheck`; `src/api/client.ts`, `src/api/preferences.ts`,
`src/types/preferences.ts`; `main.jsx` gains `QueryClientProvider` (`retry: 0`) and
`ConfigProvider` (`colorPrimary #0d9488`); `App.jsx` replaces the hand-written
`parseRoute` with a `HashRouter` route table (URLs unchanged) plus
`/trips/:tripId/preferences`; `pages/PreferencesPage.tsx` is the first TypeScript page;
`TripDetails.jsx` gains one entry link. `.github/workflows/ci.yml` gains
`npm run typecheck`.

Companion records written alongside the code: `docs/feedback/verification-matrix.md`
gains a REQ-019 section with fourteen rows (task 5.4); `README.md` gains the endpoints,
the page route, the `typecheck` command and the CI step, and
`requirement-workspace/registry.md` plus `handoff.md` carry the P4 status (task 6.4).

## Local commands

Maven is not on `PATH` on this machine; every Maven command below was run through
`C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.3\plugins\maven\lib\maven3\bin\mvn.cmd`
(3.9.11) against Java 21.0.11. `npm` 11.16.0 / Node 24.18.0.

| Command | Source | Exit | Summary |
|---|---|---|---|
| `mvn -B test` (baseline, before any change) | tasks 1.3 | 0 | 31/31 green — the pre-change baseline |
| `mvn -B test -Dtest=PreferenceApiTest` — **red run** | ATDD §2 | 1 (expected) | 29 tests, 29 errors, every one `[SQLITE_ERROR] no such table: member_preference`; failure reason is the missing table/route, not a compile error |
| `mvn -B test -Dtest=PreferenceApiTest` — **green run** | tasks 3.5 | 0 | `Tests run: 29, Failures: 0, Errors: 0`; log shows Flyway applying `V1`–`V4` on `jdbc:sqlite:file:preference-test?mode=memory&cache=shared&foreign_keys=on` (SQLite 3.49) |
| `mvn -B test` (full suite, after DD2/DD12) | tasks 1.3, 3.5 | 0 | `Tests run: 60, Failures: 0, Errors: 0` — Greeting 3, Invitation 15, Preference 29, Trip 13; the §7 datasource change breaks nothing |
| `mvn dependency:get -Dartifact=org.flywaydb:flyway-database-nc-sqlite:11.7.2` | DD12 caveat | 1 (expected) | `Could not find artifact org.flywaydb:flyway-database-nc-sqlite:jar:11.7.2 in central` → fallback branch taken, no Flyway version moved; recorded as design TS-11 |
| `npm install` then `npm ci` | tasks 4.1, 4.7 | 0 | lockfile updated with `antd`, `@tanstack/react-query`, `react-router-dom`, `typescript`, `@types/react(-dom)`; `npm ci` → `added 125 packages`, `found 0 vulnerabilities` |
| `npm run typecheck` | tasks 4.1, 4.7, CI 6.1 | 0 | `tsc --noEmit` clean with `strict`, `checkJs: false` |
| `npm run build` | tasks 4.7 | 0 | vite 8.3.8, `1491 modules transformed`, `dist/assets/index-*.js` 659.91 kB (gzip 210 kB); one chunk-size warning, the cost recorded in the design's risks |

Runtime and system layer (manual, against `localhost:8080` + `localhost:5173`):

| Command / action | Source | Result |
|---|---|---|
| Start the backend; confirm the port owner and the endpoint | tasks 5.1 | PID 46936 owns 8080; log shows `Database: jdbc:sqlite:./data/gogo.db?journal_mode=WAL&busy_timeout=5000&foreign_keys=on (SQLite 3.49)`, `Successfully applied 4 migrations ... now at version v4`, `Started HelloApplication` |
| `GET /api/trips/1/preferences` with `X-User-Id: 1` | tasks 5.1 | `200` `{"members":[{"userId":1,"interests":["Art","Nature"]},…]}` |
| API scenario script (22 calls) | tasks 5.3 | see the table below; commands `docs/ai4se-plugins/20261116-1205-req019-api-verify-commands.ps1`, transcript `…-run.log` |
| Python `sqlite3` query on `backend/data/gogo.db` | tasks 5.3 | `1|2|interest|{"codes":[]}|2026-11-16T03:52:04.794712400Z` — codes only, ISO-8601 UTC |
| Set `trip.main_plan_confirmed = 1`, then `PUT {"interests":["Art"]}` | D4 / non-goal reverse check | `200 {"interests":["Art"]}` — preferences are not locked by plan confirmation; flag reset afterwards |
| Delete the trip created accidentally during the browser pass | tasks 5.5 | `DELETE FROM trip_member/trip_invitation WHERE trip_id = 2`, `DELETE FROM trip WHERE id = 2`; `SELECT id,name FROM trip` → only `1|Singapore Friends Day` |
| `PUT {"interests":[]}` for Alice 1, Ben 2, Chloe 3 | tasks 5.5 | dev DB left with three empty rows (`{"codes":[]}`), no saved interests |

### API scenarios (curl, `docs/ai4se-plugins/20261116-1205-req019-api-verify-run.log`)

| Scenario | Expectation | Observed |
|---|---|---|
| ID-1 GET/PUT without `X-User-Id` | 401 `USER_REQUIRED`, nothing written | `401 {"code":"USER_REQUIRED",…}`; row count unchanged |
| ID-2 `X-User-Id: 99` / `abc` | 401 `USER_REQUIRED` | `401 {"code":"USER_REQUIRED","message":"X-User-Id must name a seeded user"}` |
| ID-3 `X-User-Id: " 2 "` | padded identity accepted | `200` with the same body as `2` |
| ID-4 non-member (Eve, 5) | 403 `NOT_A_MEMBER`, no member data | `403 {"code":"NOT_A_MEMBER",…}` and no `members` key |
| ID-5 unknown trip 999999 | 404 `TRIP_NOT_FOUND` for member and non-member alike | `404 {"code":"TRIP_NOT_FOUND","message":"No trip with id 999999"}` |
| CAT-1 all seven | 200, submitted order echoed | `{"interests":["Art","Nature","Culture","History","Food","Shopping","Adventure"]}` |
| CAT-2 `art`, `ART` | 400 `INTEREST_NOT_ALLOWED` | `400 "Unsupported interest: art"` |
| CAT-3 `" Art "`, `"Art "` | 400 `INTEREST_NOT_ALLOWED` | `400` (no trimming) |
| CAT-4 `""`, `" "`, `teleport`, `foodie` | 400 `INTEREST_NOT_ALLOWED` | `400 "Unsupported interest: "` / `"Unsupported interest:  "` / `foodie` |
| SAVE-1 duplicate `Art,Nature,Art` | `["Art","Nature"]`, stored `["art","nature"]` | `200 {"interests":["Art","Nature"]}` |
| SAVE-3 same set twice | 200, one row | `200`, row count 1 |
| SAVE-4 save replaces | `["Food"]` after `["Art","Nature"]` | `200 {"interests":["Food"]}` |
| SAVE-5/6 one unknown rejects the whole request | 400, stored set untouched | `400 INTEREST_NOT_ALLOWED`, subsequent GET still `["Art","Nature"]` |
| SAVE-7 `[]` | 200, row kept with `{"codes":[]}` | `200 {"interests":[]}`; payload exactly `{"codes":[]}` |
| `[null]`, `[42]`, `{"interests":"Art"}`, `["Art"]`, `{}` | 400 `INVALID_REQUEST` | `400 "Request body is not readable JSON"` (the `{}` case: `"not a valid preference payload"`) |
| READ-1..5 | `{"members":[…]}`, exactly `userId`+`interests`, ascending, unsaved members `[]`, reads change nothing | observed for all four members, order 1,2,3,4 |
| Reverse: `/api/tags`, `/trips/1/plan`, `/trips/1/plans` | 4xx | `404` each |
| Reverse: `PUT /api/trips/1` | 405 | `405 Method Not Allowed` |
| Reverse: `GET /api/greeting` | unchanged | `200 {"message":"Hello World"}` |

## E2E check list and results (PAGE-1…PAGE-9)

Driver: a browser agent over `http://localhost:5173` with the identity switcher; screenshots
in `docs/ai4se-plugins/p4-*.png`.

| # | Step | Expected | Result |
|---|---|---|---|
| PAGE-1 | Open `#/trips/1`, find the entry link, click it | Details page shows the 旅行偏好 section and 设置我的兴趣; hash becomes `#/trips/1/preferences` (not a path route) | **Pass** — `p4-details.png`, `p4-details-preferences.png` |
| PAGE-2 | Page loads for an identity with no saved interests | Seven chips, none selected, Save enabled | **Pass** — `200` fetch, `ant-tag-checkable-checked` = 0, Save enabled (`p4-alice-empty.png`) |
| PAGE-3 | Save `Art`+`Nature`, then reload | Both selected after the reload, other five unselected | **Pass** — identity stays Alice across reload, `checked = ["Art","Nature"]` (`p4-alice-saved.png`, `p4-alice-reload.png`) |
| PAGE-3b | Switch identity Ben → Chloe → Ben | Chloe starts empty; Ben's set survives the round trip | **Pass** — `p4-chloe-saved.png`, `p4-ben-switch-back.png` |
| PAGE-4 | Save while in flight disables chips and Save | Disabled + loading | **Partial** — the logic exists (`busy = query.isLoading \|\| mutation.isPending`, `pointerEvents: none`, `Button loading`) but the local round trip is ~20 ms, so the pending state is never painted; not observed in the browser |
| PAGE-5 | Successful save follows the response | Selection equals the response, no error remains | **Pass** — `.ant-alert` count 0 across a 2.5 s sampling window; selection unchanged (`p4-alice-saved.png`) |
| PAGE-6 | Loading state | Loading message shown; chips and Save disabled | **Partial** — the message and the disabled state exist in code, but the fetch finished before first paint (start 367 ms, duration 19.7 ms, first-paint 444 ms), so it could not be observed visually |
| PAGE-7 | 400 `INTEREST_NOT_ALLOWED` rollback | Server message shown; selection reverts to the acknowledged set | **Partial** — the page only offers the seven valid labels, so a 400 cannot be produced through the UI. The 400 shape is proven at API level (CAT-2/3/4, SAVE-5/6) and the rollback branch is `setSelected(acknowledged)` in `onError`; the composed UI path is unexercised |
| PAGE-8 | 403 / 404 | Matching error text, a way back, no member interests rendered | **Pass** — Eve: 没有访问权限 + 返回行程, `.ant-tag-checkable` = 0 (`p4-eve-denied.png`); trip 999999: 行程不存在 (`p4-trip-missing.png`) |
| PAGE-9 | Load failure and retry | Error message + retry action, no stale/empty selection shown as saved | **Pass** — backend stopped: `无法加载兴趣设置` / `请求失败（HTTP 502）` + 重试 + 返回行程, zero chips (`p4-load-failed.png`); after restarting the backend, clicking 重试 restored the seven chips with `Art`+`Nature` selected (`p4-retry-recovered.png`) |

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|---|---|---|---|---|
| V1 | Task completion | Partial | [fact] | `tasks.md`: 30 `- [x]`, 5 `- [ ]` of 35. Open: 6.2 push, 6.3 gate records, 6.5 `openspec validate`, 6.6 plan reconciliation, 7.3 optional checklist (not run). No implementation task is open |
| V2 | Requirement coverage | Pass | [fact] | 5/5 requirements have code plus observed evidence: identity/membership (`PreferenceController.caller`, ID-1..5), catalogue (`InterestCatalogue`, CAT-1..4), save (`PreferenceService`+`PreferenceRepository`, SAVE-1..8), read (`membersOf`, READ-1..5), page (`PreferencesPage.tsx`, PAGE-1..9) |
| V3 | Scenario coverage | Pass | [fact] | 22 API scenarios + 9 page scenarios executed; 31 delta scenarios covered, 4 of them through the page (`Partial` for PAGE-4/6/7 where noted) |
| V4 | Requirement↔impl mapping | Pass | [fact] | The alignment table in `tasks.md` maps every requirement to a DD and to tasks; no orphan code found on re-read |
| V5 | Spec drift | Pass | [fact] | DD4 changed during implementation and was written back (this report §Findings, design DD4). TS-11 added to the deviation table instead of an unrecorded pom change. No silent scope: `/api/tags`, plan routes, other kinds and the no-preference state stay out and are asserted absent |
| V6 | Design follow-through | Pass | [fact] | DD1 ✓ DD2 ✓ (URL parameters in the startup log) DD3 ✓ (`JdbcClient`, `TripRepository` untouched) DD4 ✓ (as corrected) DD5 ✓ (ID-5 precedes ID-4) DD6 ✓ DD7 ✓ DD8 ✓ DD9 ✓ DD10 ✓ DD11 ✓ DD12 ✓ except the Flyway module (TS-11) |
| V7 | Code pattern fit | Pass | [inference] | Judged against `AGENTS.md`, the existing `com.gogo.*` packages and Spring/React conventions: one advice per package (D15), records, no ORM, no new CSS classes. Human review at G2 is **pending** |
| V8 | Upstream basis | Pass | [fact] | Every changed path maps to a task: migration → 2.3; catalogue → 2.5; repository → 2.4; controller/service/records/advice → 3.1–3.4; `pom.xml`/`application.yml` → 2.1/2.2; test → 1.1/1.2; `package.json`/`tsconfig.json`/`api`/`types` → 4.1/4.2; `main.jsx`/`App.jsx` → 4.3/4.4; page → 4.5; `TripDetails.jsx` → 4.6; `ci.yml` → 6.1 |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Disposition |
|---|---|---|---|---|
| — | None | [fact] | — | No open defect: 60/60 tests, 22 API scenarios and 9 page scenarios agree with the delta |

### WARNING

| # | Finding | Mark | Location | Disposition / owner |
|---|---|---|---|---|
| 1 | `flyway-database-nc-sqlite` is not published for the managed Flyway version, so plan §7's two-module setup is not met | [fact] | design TS-11; `pom.xml` | **Open — accepted.** Flyway still detects SQLite and applies `V1`–`V4`; moving the Flyway version would re-checksum four in-flight changes. Owner SA, closed by the plan reconciliation task 6.6 or by the module shipping |
| 2 | Remote CI has not run for this change | [fact] | task 6.2 | **Open — owned.** Needs the owner's push authorization, then a fresh four-field confirmation. Owner SA/VL |
| 3 | G2/G3 are not recorded | [fact] | task 6.3 | **Open — owned.** The agent must not self-sign. Owner VL/SA |
| 4 | The identity selector is not persisted, so a page reload returns to Alice | [fact] | `App.jsx` (inherited from REQ-003/REQ-004) | **Accepted — inherited behaviour.** The delta's reload scenario is about the stored interest set; it was verified with the default identity (PAGE-3) and by switching back to Ben (PAGE-3b). Persisting identity is a scaffold change outside this delta |
| 5 | The page shows no success toast after a successful save | [inference] | `PreferencesPage.tsx` | **Accepted.** The delta requires the selection to follow the response and the error to clear, both verified; a toast is a later UX item |
| 6 | In dev mode React StrictMode issues paired `GET`/`PUT` calls | [fact] | browser network log | **Accepted.** Development-only double render; server answers are idempotent (`SAVE-2`) |
| 7 | The built bundle is 660 kB with one chunk-size warning | [fact] | `npm run build` | **Accepted.** Recorded in the design's risks; no code splitting is introduced by this change |
| 8 | The stale backend that held 8080 (PID 42128, started 2026-11-11, pre-change code) had to be stopped | [fact] | verification environment | **Closed.** The owner authorized stopping it; the new build owns 8080 (PID 46936). This is the leftover-process trap already documented in `verification-commands.md` |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---|---|---|---|
| 1 | A browser pass accidentally created a trip (`id=2`) through the create form | [fact] | dev database | Deleted with its `trip_member` rows; the DB now holds only the seeded trip |
| 2 | Loading states are unobservable locally because the API answers in ~20 ms | [fact] | PAGE-4/6 | Exercise them with a throttled network or a deliberate delay if a future delta makes them acceptance criteria |
| 3 | Mockito still prints the self-attaching agent warning | [fact] | `mvn test` output | Configure the Mockito agent when the JDK forbids dynamic attach |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|---|---|---|
| 1 | Remote CI may fail on the new frontend dependencies (`antd`, router, query) | Not pushed; no machine-readable CI access here | tracking — WARNING 2 |
| 2 | Gate signatures pending, so nothing is approved | Human-only decision | tracking — WARNING 3 |
| 3 | Foreign keys are now enforced in every environment | DD2 turned `PRAGMA foreign_keys` on | mitigated — `V1`–`V3` seeds reviewed, 60/60 tests green on a URL with `foreign_keys=on`, dev DB migrated without error |
| 4 | Two writers on one SQLite file if a second instance starts | pool pinned to 1, but nothing prevents a second JVM | accepted — single-instance rule in plan §7; the stale-process incident above shows the operational cost |
| 5 | E2E acceptance is manual | No browser suite (non-goal) | accepted — screenshots and step table above |
| 6 | Legacy `JdbcTemplate` and new `JdbcClient` coexist | DD3 keeps old repositories untouched | tracking — plan reconciliation (6.6) |
| 7 | `openspec validate --strict` has not been run for this change | The CLI is absent from this environment | tracking — task 6.5, blocks archive not P4 |

## Waiver

N/A — no waiver. Overall is Partial because items 1–3 of §Findings/WARNING await human
action, not because anything is bypassed. **Agent must not self-approve this section.**

## Revision 2026-11-16 — ten Chinese labels and the screen-08 page

Trigger: the requirement owner asked for two changes to the `preference` feature after the P4
code had landed — (1) the page must match
`ui-design-reference/screenshots/screen-08-preferences.png`, (2) the interest tags become
Chinese, with the selectable set exactly `水上运动`, `潜水`, `摄影`, `美食`, `咖啡`,
`历史人文`, `手作`, `自然风景`, `冒险`, `慢游`. This revises a G1-passed delta, so it is
recorded here and in `design.md` (Revision section), `dov-ac-review.md` §8 and `tasks.md` §8.

What moved:

- `InterestCatalogue`: ten Chinese labels, codes
  `water`, `diving`, `photo`, `food`, `coffee`, `heritage`, `craft`, `nature`, `adventure`,
  `slow`. Storage shape `{"codes":[...]}` unchanged, so no migration.
- `PreferenceApiTest`: `ALL_TEN`, CAT-1 renamed, CAT-2 re-pointed at the retired English
  vocabulary, CAT-3/CAT-4 re-pointed at Chinese examples, and every label/code assertion in
  SAVE/READ replaced.
- `frontend/src/types/preferences.ts` (`INTEREST_OPTIONS` with emoji), `app.css` (one new
  class `.pick`), `Icons.tsx` (`star`), `PreferencesPage.tsx` (screen-08 layout),
  `App.tsx` (passes `userName`).

Evidence:

| Check | Result | Command / artefact |
|---|---|---|
| Red first | 15 failures + 1 error in 29 cases, all on the retired labels | `mvn -B test -Dtest=PreferenceApiTest` before the catalogue change |
| Green | 29/29 | same command after the catalogue change |
| Full suite | `Tests run: 119, Failures: 0, Errors: 0` | `(cd backend && mvn -B test)` — the count is higher than the 60/60 above because `origin/main` merged the main-plan suites (`MainPlanApiTest` 34, `ScheduleValidatorTest` 11, …) before this revision |
| Typecheck | clean | `(cd frontend && npm run typecheck)` → `tsc -b --noEmit` |
| Build | `1489 modules transformed`, `429.75 kB` JS / `11.03 kB` CSS | `(cd frontend && npm run build)` |
| API round trip | `PUT {"interests":["水上运动","潜水","摄影"]}` → 200 with the same three labels; `GET` returns them for `userId=1` and `[]` for the other three members | curl against the running backend on 8080 |
| PAGE-3 / PAGE-10 | Fresh page load renders the three saved interests as selected dark chips, in the prototype's order and layout | headless Edge screenshots `docs/ai4se-plugins/20261116-preferences-empty.png` and `…-selected.png` (520×940 at 2×, compared against `screen-08-preferences.png`) |

Deliberate differences from `screen-08-preferences.png`, each traceable to scope rather than
oversight:

- The subtitle reads `<name> · US-019`, not `· US-019~027`; the badge reports the real save
  state (`已保存` / `未保存`), not the prototype's `未提交`; the primary button says
  `保存偏好`, not `提交并标记就绪`.
- The US-027 no-preference switch, the US-020 must-do block and the US-024 budget block are
  not rendered — they belong to other changes and are named as non-goals.
- Chip order follows the prototype (`历史人文` before `手作`, `慢游` last), which differs from
  the order the instruction listed the labels in.

Findings added by this revision:

| # | Finding | Mark | Disposition |
|---|---|---|---|
| R1 | A stale backend from 13:47 (pre-revision classes) still held 8080 and answered `400 INTEREST_NOT_ALLOWED` for `水上运动` | [fact] | **Closed.** Stopped and restarted from the current tree; the same request then returned 200. This is the leftover-process trap from `verification-commands.md` firing again — always confirm the listener's start time before trusting a negative result |
| R2 | The dev database still held retired codes (`Art`, `Culture`, `History`, `Nature`) from the English round | [fact] | **Closed.** `PUT {"interests":[]}` for users 1–4, then the page run saved `水上运动/潜水/摄影` for Alice; no environment is released, so no migration is needed |
| R3 | The G1 record approves the English seven-label text | [fact] | **Closed 2026-11-16.** IO Emily and SA evelyn.huang re-reviewed and signed the revised ten-label / screen-08 text as Pass, per the requirement owner's explicit instruction; see `g1-decision.md` §"Revision re-review (2026-11-16)". G2 may cite that record |

Gate impact: the revision was re-reviewed and signed **Pass** by IO Emily and SA
evelyn.huang on 2026-11-16 (`g1-decision.md` §"Revision re-review"), with no conditions and
no findings, so G2 may cite this G1 for the revised text. `openspec validate --strict` still
exits 1 on five overlong ADDED requirement bodies and stays an archive blocker; Overall
remains Partial only for the remote-CI and G2/G3 items of §Findings/WARNING.

## Merge with `origin/main` (2026-11-16, `bac8095`) — reconciliation

`origin/main` moved from `27b09e6` to `bac8095` while this change waited: it now carries the
splits capability (REQ-004–007, `V4__splits.sql`) and the `shadcn/ui` + Tailwind migration.
Pushing the branch without merging would have produced a PR that cannot be merged, and
`.github/workflows/ci.yml` only runs on a push to `main` or a pull request into `main`, so the
merge happened locally first.

Six conflicts, resolved one by one:

| File | Resolution |
|---|---|
| `backend/src/main/resources/application.yml` | keep `main`'s SQLite three-rules block (WAL / `busy_timeout` / `foreign_keys`) and its single-connection pool |
| `frontend/package.json`, `package-lock.json` | keep `main`'s files (`shadcn`/Tailwind dependencies, public-registry lockfile); add `"typecheck": "tsc -b"`, because `ci.yml` runs that script and `main` no longer declares it |
| `frontend/src/main.jsx` | `main`'s `RouterProvider` + `IdentityProvider` + `router`, with this change's `QueryClient` defaults (`retry: false`, `refetchOnWindowFocus: false`) |
| `frontend/tsconfig.json` | `main`'s solution file (`files: []` plus project references) |
| `requirement-workspace/impact-brief.md` | both sides kept; the 893-line file rebuilt line by line, 0 conflict markers |

The migrations collided on the version number: `main` took `V4` for splits, and its
`V5__create_main_plan.sql` already declares `member_preference` as an `IF NOT EXISTS`
stand-in. The preference migration is therefore `V6__create_member_preference.sql` and is
itself `CREATE TABLE IF NOT EXISTS`. The first full run after the merge failed for exactly
that reason — `Script V6__create_member_preference.sql failed … (table member_preference
already exists)` in 152 of 203 cases — and the `IF NOT EXISTS` form fixes it without renaming
anything a second time. `design.md` DD1 records what the merge costs: the effective table
carries no `REFERENCES` clauses, because the stand-in declares none.

Ant Design was dropped rather than carried over: `main` now ships `shadcn/ui` primitives, so
the two `Alert`s became `.notice` boxes with `role="alert"` (`design.md` TS-13). The public
registry is also unreachable from this sandbox, so a fresh `antd` lockfile entry could not be
produced even if it were wanted.

Evidence on the merged tree:

| Check | Result | Command |
|---|---|---|
| Backend | `Tests run: 203, Failures: 0, Errors: 0`, `BUILD SUCCESS` | `(cd backend && mvn -B clean test)` |
| Typecheck | clean | `(cd frontend && npm run typecheck)` |
| Build | `136 modules transformed`, `487.83 kB` JS / `38.39 kB` CSS | `(cd frontend && npm run build)` |

`npm ci` could not run in this checkout — `EPERM` on
`node_modules/@rolldown/binding-win32-x64-msvc`, because a dev server from the earlier
browser pass still holds it — so the install was `npm install --no-audit --no-fund`. The
lockfile is `main`'s, byte for byte; CI runs `npm ci` on a clean runner, which is where that
step gets its real proof.

What this section does not change: the G1 record (schema, payload and scenarios are the same
text), the Overall verdict (still Partial for the remote CI run and G2/G3), and
`openspec validate --strict` (still exit 1).

## Update, 2026-11-16 — the E1 slot is filled (machine-read)

`openspec/changes/req-019-save-interests/ci-report.md` now holds a machine-read E1 slot: run
`43824457379` (PR #44) completed `success` on head `e7333f0` — `Backend tests` 43 s with
`Tests run: 203, Failures: 0, Errors: 0` then `BUILD SUCCESS`, `Frontend build` 17 s
(`npm ci` → `typecheck` → `build`). Nothing above is rewritten; what changes:

- The `npm ci` caveat closes. A clean runner ran the locked install green, which is exactly the
  proof this checkout could not produce (EPERM on the vendored binding).
- Remote CI leaves the open items; what stays open is G2/G3 (tasks 6.3) and
  `openspec validate --strict` (task 6.5). Overall remains **Partial** for those two only.
- Full body, jobs and URLs: `docs/ai4se-plugins/20261116-153521-pipeline-report.md`.

