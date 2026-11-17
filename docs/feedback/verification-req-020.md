# Verification — REQ-020 (req-020-manage-must-do)

- Change: US-020 member must-do items, on branch `feat/travel_preference`
- Contract under test: `GET` / `PUT /api/trips/{tripId}/preferences/must-dos` plus the second
  section of `#/trips/{tripId}/preferences`
- Backend run: `(cd backend && java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar)`, port 8080,
  file database `backend/data/gogo.db` (migrations `V1`…`V7`; `V7` is the `member_preference`
  table this change writes with `kind = 'must_do'`, no new migration)
- Frontend run: `(cd frontend && npm run dev)`, port 5173, proxied to 8080
- Fixture trip: `Singapore Friends Day` (trip id 1). Members: Alice 1, Ben 2, Chloe 3, Daniel 4.
  Eve 5 is **not** a member.
- Demo accounts (seeded in `V6`, password `gogo-demo-2026`, never shown in the UI):
  `ben@example.com` (2), `chloe@example.com` (3), `eve@example.com` (5). Identity comes from the
  session cookie after `POST /api/auth/login`; the retired `X-User-Id` header is inert (MD12).
- Clear the section before the empty-state rows (P3-3 keeps the `V5` seeds for `MainPlanApiTest`,
  so on a development database run):
  `DELETE FROM member_preference WHERE kind = 'must_do';`

## 1. Automated acceptance (already executed in P4)

`mvn -B test` → `Tests run: 295, Failures: 0, Errors: 0`.

- `MustDoApiTest` 33/33 — the 25 delta API scenarios (MDS-1…MDS-19, MDR-1…MDR-6), the ATDD §5
  reverse rows and the reused identity gate, on its own in-memory database (`mustdo-test`).
  Red first: before any production code the class failed with `404` on every request, i.e. no
  handler, and `member_preference` already existed through `V7` — not a SQL error.
- `MustDoValidatorTest` 3/3 and `MustDoCodecAndServiceTest` 4/4 — the five apply-time unit
  checks UT-1…UT-5.
- `PreferenceApiTest` 29/29 and `MainPlanApiTest` 34/34 — unedited and still green, which is the
  interest-contract and `name`-mirror evidence.

## 2. E2E checklist (PAGE-1…PAGE-20)

Numbered browser steps with the expected observation, executed against the running apps.
`Observed` stays `pending` until the row is actually walked through; a row is never marked done
by inference.

Preparation for every row: sign in as Ben (`ben@example.com`), open
`http://localhost:5173/#/trips/1/preferences`, and keep devtools on (Network panel for the
`PUT` counts, Application → Storage for PAGE-19).

Executed 2026-11-17 by the owner. The developer restarted the 8080 backend on the packaged P4
build (the route now answers `401` for anonymous instead of `404`), signed in as Alice (a trip-1
member) in a real Edge browser, opened `#/trips/1/preferences`, walked the rows below in order and
reported no problems, with an attached screenshot. `Pass` here means **owner browser observation,
relayed to and recorded by the agent** — the agent could not self-drive the browser (Computer Use
was hard-stopped by the host URL-confidence policy), so it did not observe these rows itself. Rows
that need a non-member or a second identity (PAGE-10, PAGE-17 a/b) or devtools network throttling
(PAGE-11, PAGE-13, PAGE-15, PAGE-18) were not re-walked in the browser and are covered by the HTTP
E2E instead: the live 8080 safe probe (`docs/ai4se-plugins/20261117-120157-req020-live-e2e-safe.log`,
13/0) plus the P4 isolated run (section 3, 45/0).

| # | Step | Expected observation | Observed |
|---|---|---|---|
| PAGE-1 | Reload the page and watch it before both `GET`s finish | `加载中` badge; the ten chips, the bottom `保存偏好` button and the item actions are all disabled | Pass — owner (badge 加载中, controls disabled during the two GETs) |
| PAGE-2 | With no saved interests, count the selected chips | none of the ten is selected; a chip can be picked and saved right away | Pass — owner (no chip preselected before saving) |
| PAGE-3 | Save `摄影` + `自然风景`, reload | both stay selected, the other eight do not | Pass — owner + screenshot (摄影 + 自然风景 persist after reload, badge 已保存) |
| PAGE-4 | With no saved must-do items (see the delete above), look at the second section | the empty state renders and `添加必做项` opens a usable form immediately | Pass — owner (empty state shown; 添加必做项 opened a usable form) |
| PAGE-5 | Save one item with location and time, reload | the item is listed with activity, location and time; the network panel's last `GET` response carries the same `id` the `PUT` returned | Pass — owner + screenshot (Merlion Park listed with lead tile, 📍 marker and BOTH edit + trash icons drawn — trash-icon fix confirmed); time left unset this pass, id round-trip covered by HTTP MDS-1 |
| PAGE-6 | Add a second item through the form and press `保存` | exactly one `PUT /preferences/must-dos`, no `PUT /preferences`; the new item appears with the id from the response body | Pass — owner (second item added and shown with an id); single-PUT count is HTTP-covered (whole-list replace, MDS-17) |
| PAGE-7 | Edit that item's time to `10:30` and confirm | one `PUT`; the section still lists two items, the edited one keeps its id and shows `10:30` | Pass — owner (edited an item's time, id kept, new time shown) |
| PAGE-8 | Press `删除` on one of two items | a confirmation names that item and offers `取消` / `确认`; while it is open no request is sent and both items remain | Pass — owner (delete opens a 取消/确认 confirmation naming the item; list unchanged while open) |
| PAGE-9 | With the dialog open, select some interest without saving it, then press `取消` | no `PUT` at all; both items remain; the unsaved interest selection is still pending (badge `未保存`) | Pass — owner (cancel sends no request; unsaved interest still shows 未保存) |
| PAGE-10 | Sign out and sign in as Chloe (`chloe@example.com`) | both sections reload for Chloe: her own interests and her own (empty) must-do list; none of Ben's data is shown | HTTP — MDR-3 (isolated 45/0) proves two members keep independent lists; browser identity switch not re-walked |
| PAGE-11 | Save interests on a throttled connection (Slow 3G) | while in flight the chips and the save button are disabled and the badge reads `保存中` | HTTP/code — in-flight disabled state is code-level; Slow-3G not re-walked |
| PAGE-12 | Let an interest save succeed | the selected state equals the response `interests`; no error text on the page | Pass — owner (interest save returned the selected set, no error text) |
| PAGE-13 | The UI only offers the ten fixed labels, so an `INTEREST_NOT_ALLOWED` save cannot be produced by clicking; provoke it from the console with `fetch('/api/trips/1/preferences', {method:'PUT', …})` sending `["Cooking"]` while the page holds a session | inline error carrying the response `message`; the selection returns to the saved set. If the console call mutates state the page did not request, the row is `Partial` (the same limitation REQ-019 recorded) | HTTP — MDS-16 INVALID_REQUEST on a disallowed body; console-fetch row not re-walked |
| PAGE-14 | Add an item with `固定时间 = 24:00` and press `保存` | inline error inside the must-do section quoting the response `message`; the list stays exactly as the server acknowledged it and the rejected item is not shown as saved | Pass — owner (固定时间 is a native time picker; 24:00 / full-width ： cannot be entered). Backend still rejects those shapes: live probe MUST_DO_TIME_INVALID |
| PAGE-15 | Repeat PAGE-6 on Slow 3G | the section's controls are disabled while the `PUT` is in flight; a second click does not queue another `PUT` | HTTP — whole-list replace is idempotent (MDS-17); Slow-3G double-click not re-walked |
| PAGE-16 | Select `摄影` without saving it, then add a must-do item | no interest `PUT` in the network panel; `摄影` is still selected after the item persists | Pass — owner (adding an item did not save the pending interest; item persisted) |
| PAGE-17 | (a) sign out and open the URL; (b) sign in as Eve; (c) open `#/trips/999/preferences` | (a) `需要重新登录`, (b) `没有访问权限`, (c) `行程不存在`, each with `返回行程`; no member's interests or items are rendered | Pass (c) — owner opened #/trips/999/preferences and saw 行程不存在 + 返回行程; (a) anonymous 401 and (b) Eve 403 evidenced by the live HTTP gate probe |
| PAGE-18 | Stop the backend and reload | error message plus `重试`; the page does not render an empty or previously seen list as saved. Starting the backend again and pressing `重试` restores both sections | HTTP/code — backend-down row not re-walked (would require stopping the developer's 8080); error path is code-level |
| PAGE-19 | After a successful save, reload with Application → Storage cleared and check `localStorage` | both sections come only from the two `GET`s; `! grep -rn "localStorage" frontend/src/pages/PreferencesPage.tsx` is clean | code — grep clean: no localStorage in PreferencesPage; both sections come from the two GETs |
| PAGE-20 | Compare the page with `ui-design-reference/screenshots/screen-08-preferences.png` at the REQ-019 viewport | app bar `我的偏好` with subtitle `<name> · US-019~020`, save-state badge, the two section headings in order, ten emoji chips, pin/clock markers on item rows, form labels `活动名称` / `地点` / `固定时间` with `取消` / `保存`, bottom bar holding only the interest save; the budget / no-preference / `提交并标记就绪` blocks are absent. Scoped differences are listed rather than claimed as a pixel match | Pass — owner + screenshot (app bar 我的偏好 + subtitle Alice · US-019~020, 已保存 badge, two sections in order, ten emoji chips, lead tile + 📍/🕒 markers, edit/trash icon buttons, form labels + 取消/保存, bottom bar holds only 保存偏好; budget block / 我没有特别偏好 toggle / 提交并标记就绪 all absent). Layout-level match, not pixel |

PAGE-10 is the behaviour half of delta wording that still says "the identity selector in the top
bar": the shipped shell has no selector (US-066 made the session the identity), so the step is
executed by signing out and signing in as the other account (MD12, drift TS-14 — reported at G2,
not silently reconciled). PAGE-20 is layout-only and is not a numbered delta scenario.

## 3. Runtime API re-run (ATDD §3, 5.3)

Executed on 2026-11-17 against an **isolated** instance of the freshly packaged jar: the developer's
own backend (pid 21308, port 8080, started 09:12 from the pre-P4 build) and Vite dev server
(pid 43376, port 5173) were left untouched, so the pass ran on port 8081 with its own Flyway-built
database under `%TEMP%\gogo-req020-runtime.db`.

- Harness: `docs/ai4se-plugins/20261117-105552-req020-runtime-api-commands.ps1` plus the payload
  reader `20261117-105552-req020-runtime-db-dump.py`; transcript
  `20261117-105552-req020-runtime-api-run.log`.
- Identity: `GET /api/auth/csrf` → `X-XSRF-TOKEN` → `POST /api/auth/login` (`ben@example.com`,
  `chloe@example.com`, `eve@example.com`), then the session cookie on every call.
- Empty-state re-seed (task 5.2 step): `DELETE FROM member_preference WHERE trip_id = 1 AND
  kind = 'must_do'` cleared the four `V5` seeds on the runtime database only.
- Result: **45 checks, 0 failures** — MDS-1…MDS-19 (including the six rejected `time` values and the
  five malformed bodies), MDR-1…MDR-6, the ATDD §5 reverse rows (`kind` ignored, `date` ignored, no
  length/count/dedup limit, `userId` cannot redirect the write, no readiness keys, the interest
  contract unchanged, the interest write isolated, no `mustDos` key on the interest surface), and the
  reused gate (Eve 403 on both verbs, unknown trip 404, anonymous 401).
- `name` mirror observed in the stored `payload` after both create (`"name":"Mirror create"`) and
  edit (`"name":"Mirror edited"`) and never on the wire; `GET /api/trips/1/main-plan/inputs` still
  listed the mirrored activity (MDR-5).

Status: **Pass** for the API layer, re-confirmed on 2026-11-17 against the developer's restarted
8080 (now the P4 build) with a safe non-mutating probe — 13/0 in
`docs/ai4se-plugins/20261117-120157-req020-live-e2e-safe.log`: routes wired (GET must-dos and GET
preferences both 200), the time-format matrix (including the full-width `9：00` and the single-digit
`9:00` that triggered the reported error) all `MUST_DO_TIME_INVALID` with zero write, and the gate
(anonymous 401, Eve 403, unknown trip 404). The section-2 browser rows were then walked by the owner
in a real browser and are recorded above; the identity-switch and devtools-throttling rows stay
HTTP/code-covered. `frontend/vite.config.ts` proxies `/api` to 8080 only.
