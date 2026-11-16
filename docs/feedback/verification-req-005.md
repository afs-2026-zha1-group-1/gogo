# Verification — REQ-005 (us-064-mobile-app-shell)

- Change: `openspec/changes/us-064-mobile-app-shell/`
- ATDD design: `atdd-design.md` (FR/NV/DB/TR/PL/GJ + R-1…R-3, UT-1)
- Method: numbered browser steps against the running apps (backend 8080,
  Vite 5173), text-only observations; no Playwright (design D9).

## Baselines (task 0.3, captured 2026-11-15 before production code)

- `cd backend && mvn -B test` → **31/31 green** (GreetingApiTest, TripApiTest,
  InvitationApiTest), BUILD SUCCESS, 2026-11-15T16:41+0800.
- Migrations: `V1__create_greeting.sql`, `V2__create_trip.sql`,
  `V3__create_invitation.sql` — inventory closed at V3.
- Frontend dependencies (snapshot 2026-11-15): dependencies `qrcode ^1.5.4`,
  `react ^19.3.1`, `react-dom ^19.3.1`; devDependencies
  `@vitejs/plugin-react ^6.3.0`, `jsqr ^1.4.0`, `vite ^8.3.8`. No dependency
  may be added by this change.
- `cd frontend && npm run build` → recorded at task 5.1 (pre-change build
  passes on the current tree).

## Red confirmation against the current tree (task 1.3)

Structural red evidence before implementation (2026-11-15):

- `frontend/src/App.jsx` has no dock/tabbar component and no shell wrapper —
  FR1/NV1/NV2/NV3/NV5 fail (no dock renders on any route).
- `parseRoute` recognizes only `/`, `/create`, `/trips/<id>`, `/join/<token>`;
  `#/split` and `#/members` fall back to home — PL1/PL2 fail (no placeholder,
  wrong heading), TR2 fails (no `#/trips` empty-state route).
- No empty-state or placeholder page exists under `frontend/src/pages/` —
  TR2/TR3/PL1/PL2/PL3 fail.
- `CreateTrip.jsx:52` back link targets `#/` — TR4 back-to-行程 expectation fails.
- Join already renders without a dock (no dock exists at all) — GJ1/GJ2 pass
  trivially today and must keep passing after the dock is added.

## E2E check list (tasks 1.1–1.2; executed at 5.3–5.5)

Fixture: `Singapore Friends Day` trip id 1; users 1 Alice (organizer), 2 Ben
(member), 5 Eve (outsider); never-issued token `no-such-invitation`; unknown
trip id 99999.

| # | Steps | Expected observation |
|---|---|---|
| FR1 | Open `#/`, `#/trips`, `#/trips/1`, `#/create`, `#/split`, `#/members`; measure column and dock | Centered column ≤430 px, 100 dvh; dock pinned below scrolling content with safe-area padding; home 创建行程 actionbar reachable, not obscured |
| FR2 | Switch identity 1→5 in the shell switcher; trigger a request | Switcher labeled IDENTITY · SCAFFOLD（非登录）; request carries `X-User-Id: 5` |
| FR3 | Re-run create validation, details permission, invitation panel, join flow; `mvn test` | Behavior exactly as today; 31/31 green |
| NV1 | Inspect dock on each in-app route | Four tabs 仪表盘/行程/分队/成员 in order, icon + label; exactly the owning tab highlighted |
| NV2 | Click 行程 then 分队 with identity 1; watch hash and reload | Hash updates, no full page reload, identity still 1, active tab follows |
| NV3 | Open `#/create` | 行程 tab highlighted; form + validation unchanged |
| NV4 | Activate 仪表盘→行程→分队→成员, record heading; then reverse | Unique visible heading/state each activation; both directions reachable |
| NV5 | Switch tabs, then browser back ×2 and forward ×2 | Route/active tab follow history; identity unchanged |
| DB1 | Open default `#/` | Existing home (greeting status, create entry, scaffold) under shell; 仪表盘 active |
| DB2 | Inspect 仪表盘 content and network | Home content only; no aggregation, no list-all call |
| TR1 | As Alice open `#/trips/1`; as Eve open `#/trips/1`; open `#/trips/99999` | Details under shell, 行程 active; Eve sees existing denied state; 99999 existing missing state |
| TR2 | Open `#/trips` | Text empty state, unique heading, exactly 创建行程 + 按编号打开行程; no invented trip data |
| TR3 | In empty state enter 1 → open; enter 99999 → open; enter `abc` | 1 → details; 99999 → existing missing state; `abc` → inline numeric hint, no navigation |
| TR4 | From shell open `#/create`; back; submit valid form | Back → 行程 tab route; submit → `#/trips/<new id>`; validation unchanged |
| TR5 | Watch network on 仪表盘/行程/empty state | No list-all-trips request |
| PL1 | Click 分队 | `#/split`, honest "not implemented yet" text, unique heading, link back to 行程, tab active |
| PL2 | Click 成员 | `#/members`, same placeholder contract, distinct heading |
| PL3 | Inspect both placeholders | No demo member/route/status values |
| GJ1 | Open `#/join/<valid token>` as Eve; accept | Full-screen, no dock; scaffold bar retained; preview/accept/joined as today |
| GJ2 | Open `#/join/no-such-invitation` | Full-screen unusable, no dock, no private data |
| R-1 | Route inventory + network watch | No list-all endpoint/call |
| R-2 | Empty state + placeholders | No fabricated data |
| R-3 | Migration list, route inventory, CI file, `package.json` diff | V1–V3 only; no new API path; CI unchanged; no new dependency |
| R19 | Short viewport (e.g. 360×640) on `#/` and `#/trips/1` | Dock visible; home actionbar and content reachable by scroll; nothing obscured |

## Observations (tasks 5.3–5.5, executed 2026-11-15 in browser against 8080/5173)

| # | Result | Evidence |
|---|---|---|
| FR1 | Pass | Column 430 px centered, height = viewport (100dvh); dock pinned at bottom (gap ≈ 0), `padding-bottom: calc(6px + env(safe-area-inset-bottom))`; home actionbar bottom == dock top (708.58), no overlap |
| FR2 | Pass | Switcher labeled IDENTITY · SCAFFOLD（非登录）; identity propagated behaviorally: Alice 200 vs Eve 403 on `GET /api/trips/6`; Eve's accept returned alreadyMember (her membership) |
| FR3 | Pass | Create validation, details permission, invitation panel and join flow re-run unchanged; `mvn -B test` 31/31 green twice; backend/, InvitationPanel.jsx, api.js untouched in diff |
| NV1 | Pass | Four tabs 仪表盘/行程/分队/成员 in order, each icon + label; active tab + aria-current correct on every route visited |
| NV2 | Pass | Tab clicks update hash without full reload; identity stayed 1 across switches |
| NV3 | Pass | `#/create` highlights 行程 |
| NV4 | Pass | Forward walk headings: 一起出发 / 尚未选择行程 / 分队 / 成员; reverse walk identical set; all unique, both directions reachable |
| NV5 | Pass | back×2 / forward×2 followed history (#/trips → #/split → #/trips → #/), active tab followed, identity unchanged |
| DB1 | Pass | Default `#/` shows greeting status (Hello World), create entry, scaffold under shell; 仪表盘 active |
| DB2 | Pass | Home content only; no aggregation; no list-all request in network log |
| TR1 | Pass | Alice `#/trips/1`: details + invitation panel, 行程 active; Eve `#/trips/6`: existing denied state 没有访问权限; `#/trips/99999`: existing 行程不存在 |
| TR2 | Pass | `#/trips`: heading 尚未选择行程, exactly 创建行程 + 按编号打开行程, no invented data |
| TR3 | Pass | id 1 → `#/trips/1` details; 99999 → existing missing state; `abc` → inline 请输入数字行程编号, no navigation |
| TR4 | Pass | Create back link → `#/trips/1` (D3 memory + D6); invalid dates → 结束日期不能早于开始日期, no navigation; valid create → `#/trips/6` Shell Verify Trip, 行程 active |
| TR5 | Pass | Network log: no `GET /api/trips` without id |
| PL1 | Pass | `#/split`: heading 分队, 该功能尚未实现，敬请期待。, 返回行程 link, tab active |
| PL2 | Pass | `#/members`: heading 成员, same contract, distinct heading |
| PL3 | Pass | No demo member/route/status values on either placeholder |
| GJ1 | Pass | `#/join/65d7…` full-screen, dock absent, scaffold bar retained; preview → accept → 已加入 (alreadyMember, idempotent) |
| GJ2 | Pass | `#/join/no-such-invitation` full-screen, dock absent, generic unusable text, no private data |
| R-1 | Pass | No list-all endpoint/call (network + route inventory) |
| R-2 | Pass | Empty state + placeholders show no fabricated data |
| R-3 | Pass | Migrations V1–V3 only; no new API path; CI workflow unchanged; `package.json` unchanged (diff: 4 modified + 3 new frontend files only) |
| R19 | Pass | Emulated short column (app height 500 px; tooling has no viewport resize): body becomes scrollable, dock stays visible, home actionbar reachable above dock after scroll; details scrollable. Real-device safe-area insets not testable on desktop (env() = 0); calc padding in place |

Console: no JS exceptions; only expected HTTP error resources from the
intentional negative cases (404/403) and the pre-existing race below.

## Pre-existing observation (out of scope)

`POST /api/trips/6/invitation` returned one 500 (network reqid=27) on the
first-ever issuance for the newly created trip: React StrictMode double-mounts
InvitationPanel in dev, two concurrent get-or-create inserts race, one hits the
UNIQUE constraint. Re-issue returns 200 with a stable token. InvitationPanel,
api.js and the backend are untouched by this change (git diff empty), so this
is a latent REQ-004 backend race, not a shell regression. Recorded for a
separate change per AGENTS.md; no backend fix in US-064.

## Reverse/static check results (task 5.5)

- Whitelist (docs/feedback/verification-commands.md): 5/5 pass after installing
  pyyaml locally (the CI-jobs check first failed with ModuleNotFoundError:
  yaml — tooling gap, not product). Run log:
  `docs/ai4se-plugins/20261115-164941-local-verify-run.log` (re-run green).
- `mvn -B test`: 31/31, BUILD SUCCESS (baseline 16:41 and post-change 16:47).
- `npm run build`: passes (54 modules, 211 ms).
- Diff scope: `App.jsx`, `Icons.jsx`, `app.css`, `CreateTrip.jsx` modified;
  `TabBar.jsx`, `pages/TripsEmpty.jsx`, `pages/Placeholder.jsx` added. No
  backend, CI, lockfile or dependency change.

## TypeScript amendment verification (2026-11-15, user instruction, D10)

Scope: US-064-owned files converted to strict TS per US-065 (issue #35)
conventions and `docs/knowledge/architecture/tech-stack-plan.md` (TS 5.x).

- Converted: `App.tsx`, `TabBar.tsx`, `Icons.tsx`, `api.ts`,
  `pages/CreateTrip.tsx`, `pages/TripsEmpty.tsx`, `pages/Placeholder.tsx`;
  added `src/types.ts`, `tsconfig.json`; devDeps typescript 5.9.3,
  @types/react, @types/react-dom; build = `tsc -b && vite build`.
- Minimal compile-required import edits (no logic): `main.jsx` App path;
  Home/TripDetails/Join/InvitationPanel `../api`/`../Icons` paths.
- `npx tsc -b` → exit 0, zero errors; no `any`, no `@ts-ignore`.
- `npm run build` → green; bundle `index-qP5mkQlJ.js` byte-identical hash and
  size (271.58 kB) to the pre-conversion build → emitted JS unchanged.
- Browser smoke after reload: forward walk 仪表盘→行程→分队→成员 headings
  一起出发/尚未选择行程/分队/成员, active tabs correct, identity switch 1→5
  propagated, `#/trips/1` details, unusable join full-screen without dock and
  scaffold retained. Console: no JS errors (only the intentional 404).
- Remaining JS (US-065 scope, assignee sammingoocl): `main.jsx`,
  `vite.config.js`, `pages/Home.jsx`, `pages/TripDetails.jsx`,
  `pages/Join.jsx`, `pages/InvitationPanel.jsx`.

## CI failure addendum (2026-11-16)

After the direct main merge, the push-triggered CI runs on cb7faa0 / 9410efd /
8cac644 failed at the frontend `npm ci` step: `ENOTFOUND artifact.oocl.com`.
Root cause: the local `npm install` of the TS toolchain went through the
corporate mirror, so the four new lockfile entries (typescript, @types/react,
@types/react-dom, transitive @types) carried corporate `resolved` URLs that
GitHub-hosted runners cannot resolve — a recurrence of REQ-001 risk R1. The
other 81 entries had been public since REQ-001.

Fix (user-approved 2026-11-16): rewrite the four entries to
`https://registry.npmjs.org/`, restoring the established baseline; commit
98f524b pushed to main. Verified in a clean temp directory: `npm ci` from the
public registry + `tsc -b && vite build` green (bundle hash unchanged). Local
node_modules restored via the default mirror with the lockfile kept public.
CI run 43798399162 on 98f524b: **success**, both jobs green.

## Conclusion

All 20 delta-spec scenarios and reverse checks R-1/R-2/R-3 verified green in
the browser; R19 verified via emulated short column. Existing acceptance
behavior unchanged. One pre-existing backend race observed and recorded
(out of scope). Local verification complete; remote CI and human review (G2)
pending PR authorization.