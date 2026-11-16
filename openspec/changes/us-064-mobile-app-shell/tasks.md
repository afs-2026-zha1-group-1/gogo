# Tasks — us-064-mobile-app-shell

- Change: `openspec/changes/us-064-mobile-app-shell/` (REQ-005, US-064)
- Linked: `specs/app-shell/spec.md` (Delta Spec), `design.md` (D1–D9),
  `atdd-design.md` (FR/NV/DB/TR/PL/GJ + R-1…R-3, UT-1)
- Rule: acceptance-driven slices; red E2E list and baselines before production
  code; gates only from named human statements; push/PR only with separate
  typed authorization.

## 0. Preconditions (owner: Dev; IO/SA for gates)

- [x] 0.1 G1 recorded by named IO + SA (`g1-decision.md`, Pass 2026-11-15,
  IO Johnson + SA Elian Jiang)
- [x] 0.2 Feature branch `US-064-mobile-app-shell` exists with main merged
  (b681c61); PR-based CI evidence path available
- [x] 0.3 Baseline captured: `cd backend && mvn test` green (31/31);
  `cd frontend && npm run build` passes; route inventory + migration list
  (`V1`–`V3`) + `package.json` deps recorded (atdd-design §2,
  verification-req-005.md baselines)

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author the E2E check list FR1–GJ2 as numbered browser steps with
  expected observations, including the forward/reverse tab walk with recorded
  headings (atdd-design §1–2; verification-req-005.md)
- [x] 1.2 Author reverse/static checks R-1/R-2/R-3 (route inventory, migration
  list, dependency list, no-demo-data observations)
- [x] 1.3 Confirm the E2E list is red against the current tree (no dock,
  `#/split`/`#/members` fall back to home, no empty state) — structural red
  evidence recorded before implementation

## 2. Shell frame and dock (owner: Dev; D2, D5, D7, D8)

- [x] 2.1 `Shell` composition in `App.jsx`: frame + scaffold bar + dock around
  in-app routes; `join` renders full-screen with scaffold bar, no dock
- [x] 2.2 `TabBar` component: four tabs 仪表盘/行程/分队/成员, icon + label,
  active rule (home→仪表盘; trips-empty/details/create→行程; split; members)
- [x] 2.3 Dock glyphs in `Icons.jsx` (home/list/fork/users, local inline SVG)
- [x] 2.4 `app.css`: dock pinned below scrolling content + safe-area padding,
  active highlight from brand tokens; home actionbar stays reachable (D5
  amended to flex composition, verified FR1/R19)

## 3. Route table and placements (owner: Dev; D1, D3, D6)

- [x] 3.1 `parseRoute`: add `#/trips` (trips-empty), `#/split`, `#/members`;
  keep home and non-numeric-id fallbacks; UT-1 unit TDD at apply time
- [x] 3.2 App-level `lastTripId` session memory; 行程 tab targets remembered id
  else `#/trips`; hash history unaffected (NV5 verified)
- [x] 3.3 Home / TripDetails / CreateTrip render under the shell unchanged;
  CreateTrip back link targets the 行程 tab route (D6, verified TR4)

## 4. Empty state and placeholders (owner: Dev; D3, D4)

- [x] 4.1 No-trip empty-state page: unique heading, text, exactly two actions
  创建行程 / 按编号打开行程; open-by-id navigates to `#/trips/<id>`; no data
  (TR2/TR3 verified incl. numeric hint and unknown-id missing state)
- [x] 4.2 Shared `Placeholder` component; `#/split` and `#/members` render
  honest "not implemented yet" text + link back to 行程, distinct headings
  (PL1/PL2/PL3 verified)

## 5. Runtime acceptance and E2E (owner: Dev; evidence in local-verify report)

- [x] 5.1 `npm run build` passes; `mvn test` unchanged green (FR3/R-3; 31/31
  twice, whitelist 5/5)
- [x] 5.2 Backend (8080) + frontend (5173) running; verified by endpoint
  response (`/api/greeting` 200, fixture trip 1 readable)
- [x] 5.3 Execute the E2E list FR1–GJ2 including the text-only forward/reverse
  walk, back/forward, identity header observation, join/unusable exclusion;
  headings and observations recorded in verification-req-005.md
- [x] 5.4 Re-run existing acceptance behavior (create validation, details
  permission, invitation panel, join flow) — exactly as today (FR3)
- [x] 5.5 Execute reverse checks R-1/R-2/R-3; short-viewport dock clearance
  check (R19, emulated 500 px column — tooling has no viewport resize)
- [x] 5.6 Write `docs/feedback/verification-req-005.md` and the P4
  local-verify report with per-scenario evidence

## 6. CI and gates (owner: Dev drafts; IO/SA/VL decide)

- [x] 6.1 Push the branch and open the PR only with separate typed
  authorization; read a fresh CI run with `gh` for G2 (never inherited green)
  — PR #34 opened 2026-11-15 with typed authorization; run 43697575941
  success on 976620d (ci-report.md)
- [ ] 6.2 G2 decision record by named humans (VL); G3/archive lane per user
  routing
- [ ] 6.3 Update `README.md` run instructions and registry/handoff rows

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P1 intent/REQ/DoR/deep-dive/impact + proposal; P1 quality report
  (Overall Pass)
- [x] 7.2 P2 delta spec + `dov-ac-review.md` + `consistency-lint.md` (Pass) +
  G1 recorded
- [x] 7.3 P3 `atdd-design.md`, `design.md`, this `tasks.md`, alignment
  self-check below; P3 quality report
- [ ] 7.4 Record G1/G2/G3 only from named human statements; the agent never
  self-signs

## 8. TypeScript amendment (owner: Dev; user instruction 2026-11-15, D10)

- [x] 8.1 `tsconfig.json` (strict, allowJs/checkJs=false), `src/types.ts`
  DTO-aligned; devDeps typescript@^5.9.3 + @types/react + @types/react-dom;
  build script `tsc -b && vite build`
- [x] 8.2 Convert US-064-scoped files: App/TabBar/Icons/api/CreateTrip/
  TripsEmpty/Placeholder → .tsx/.ts; minimal import-path edits in main.jsx
  and the four JS pages (no logic change)
- [x] 8.3 `tsc -b` zero errors; `npm run build` green (byte-identical bundle
  hash); browser smoke walk identical; remaining JS left for US-065

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Delta requirement | Design | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Mobile shell frame | D2, D5, D7 | 2.1, 2.4, 3.3 | FR1–FR3, R-3 | Pass |
| Bottom dock navigation | D1, D2, D3, D8 | 2.2, 2.3, 3.1, 3.2 | NV1–NV5, UT-1 | Pass |
| Dashboard tab placement | D2, D3 | 3.3 | DB1–DB2, R-1 | Pass |
| Trips tab placement and no-trip empty state | D1, D3, D4, D6 | 3.1–3.3, 4.1 | TR1–TR5, R-1 | Pass |
| Placeholder tabs | D4 | 4.2 | PL1–PL3, R-2 | Pass |
| Guest join exclusion | D2, D7 | 2.1, 5.3 | GJ1–GJ2 | Pass |

- Every spec requirement has ≥1 design decision, ≥1 task and ≥1 ATDD row; no
  orphan task (all tasks map to a requirement or to gate/stage hygiene).
- Tasks obey ATDD: red list before code (§1 before §2–4); verify tail (§5–6).
- OQ-4/OQ-5 resolved by D3; REQ-005 open-questions updated accordingly.
- **Self-check: Pass** — plan complete for P3 quality checklist.