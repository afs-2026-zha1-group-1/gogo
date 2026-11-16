# ATDD design — us-064-mobile-app-shell

- Change: `openspec/changes/us-064-mobile-app-shell/` (REQ-005, US-064)
- Delta Spec: `specs/app-shell/spec.md` (G1 Pass 2026-11-15, IO Johnson + SA
  Elian Jiang)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` §REQ-003/REQ-004
  (reused; this change adds no data)
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no
  production feature code and no unit-test suite plan is written here.

## 1. ATDD layers in scope

This change is frontend-only: no endpoint is added or changed, so there is no
new API contract to drive. The acceptance driver is **E2E** (browser against
the running backend + Vite dev server), executed as the story's text-only
forward/reverse tab walk plus per-scenario observations. The **API** layer
appears only as regression and reverse checks: the existing backend suites
(`GreetingApiTest`, `TripApiTest`, `InvitationApiTest`) must stay green, and the
route inventory must show no new path. Pure-logic items are deferred to
apply-time unit TDD.

| # | Scenario (spec) | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| FR1 | In-app route renders inside the frame; dock fixed; content not obscured | E2E | compatibility (advisory: short viewport, R19) | user-visible layout; measure column width / dock position in browser |
| FR2 | Identity switcher stays scaffold; header follows selection | E2E | — | visible label + request header observation |
| FR3 | Existing contracts unchanged; no backend/DB change | API + static | — | existing suites green; migration/route inventory unchanged |
| NV1 | Four ordered tabs, icon + label, active highlight | E2E | — | dock rendering per route |
| NV2 | Tab switch updates hash without reload; identity kept | E2E | — | hash observation + no full reload + header unchanged |
| NV3 | `#/create` highlights 行程 | E2E | — | active-tab rule |
| NV4 | Text-only forward/reverse walk; unique heading per page | E2E | — | the story's primary verification method |
| NV5 | Browser back/forward follows tab history; identity kept | E2E | — | history navigation |
| DB1 | Default `#/` shows existing home under shell; 仪表盘 active | E2E | — | placement |
| DB2 | No aggregation displayed | E2E + static | — | reverse for US-061 |
| TR1 | Details under shell; 行程 active; loading/denied/missing unchanged | E2E + API regression | — | placement + existing states |
| TR2 | No-trip empty state; two actions; no invented data | E2E | — | user-visible honesty |
| TR3 | Open-by-id reuses details route; unknown id → missing state | E2E | — | navigation + existing 404 surface |
| TR4 | Create reachable; back → 行程; submit → details | E2E | — | placement + back-target |
| TR5 | No list-all-trips call | E2E + static | — | reverse for US-061; network inspection |
| PL1 | 分队 placeholder; link back; active tab | E2E | — | honest text |
| PL2 | 成员 placeholder; link back; active tab | E2E | — | honest text |
| PL3 | No demo data fabricated | E2E | — | reverse for demo content |
| GJ1 | Valid join full-screen, no dock; scaffold bar retained; flow unchanged | E2E + API regression | — | guest exclusion |
| GJ2 | Unusable link full-screen, no dock; no private data | E2E | privacy (advisory) | guest exclusion + privacy |
| R-1 | No list-all endpoint or call | API + static | — | reverse (US-061) |
| R-2 | No fabricated members/routes/statuses | E2E | — | reverse (demo data) |
| R-3 | No backend/migration/CI change | static + API | — | reverse (layers) |
| UT-1 | `parseRoute` extension (new route entries, fallbacks) | Defer UT | — | pure function; apply-time unit TDD |

## 2. What is written before production code

1. The E2E check list (FR1–GJ2) written as numbered browser steps with expected
   observations, including the forward/reverse tab walk with recorded headings.
   Against the current tree these fail: no dock exists, `#/split`/`#/members`
   fall back to home, and there is no no-trip empty state.
2. Reverse/static checks authored: backend route inventory and migration list
   (`V1`–`V3` only) captured as a baseline; `package.json` dependency list
   captured; existing `mvn test` baseline run recorded green.
3. No production feature code and no frontend change until the red E2E list and
   the baselines exist.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` (unchanged suites green) and
  `cd frontend && npm run build`; then the P4 local-verify report with runtime
   evidence per scenario, including the text-only walk.
- CI gate: the existing two-job workflow on a feature-branch pull request; G2
   requires a fresh CI run read with `gh` (`%LOCALAPPDATA%\Programs\gh\bin`),
   never an inherited green.
- No second CI semantics is invented; the harness placeholders stay untouched.

## 4. Data / fixtures strategy

- Shared authority: `requirement-workspace/acceptance-test-fixtures.md`
  §REQ-003/REQ-004. Users 1–5 and the fixture trip `Singapore Friends Day`
  (id 1) come from the existing `V2`/`V3` seeds; no new seed rows, no new table.
- E2E uses the dev database seeded by `V2`/`V3`. The no-trip case opens the bare
  行程 route; the unknown-id case uses a never-created id (e.g. 99999); the
  unusable-link case uses a never-issued token string.
- Identity cases switch between seeded users (1 organizer, 2 member, 5
  outsider) through the shell switcher; the header is observed on requests.
- No cleanup beyond the existing pattern: this change writes no data.

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| Real split planning / routes (US-038–062) | inspect 分队 surface and network calls | text placeholder only; no split endpoint call | E2E + static |
| Member list / readiness (US-013) | inspect 成员 surface and network calls | text placeholder only; no members endpoint call | E2E + static |
| Dashboard aggregation / list-all (US-061) | DB1/DB2/TR5; network inspection on 仪表盘 and 行程 | home content only; no list-all call or endpoint | E2E + API + static |
| Backend / database / CI changes | FR3/R-3; migration + route inventory; workflow file diff | `V1`–`V3` only; no new path; CI unchanged | static + API |
| New demo data | TR2/PL3/R-2 | no trip/member/route/status value invented | E2E |
| Contract changes to REQ-001/003/004 | FR3; re-run create validation, details permission, invitation panel, join flow | behavior exactly as today; suites green | E2E + API |
| New frontend dependencies | `package.json` diff | unchanged | static |
| Real authentication | FR2/GJ1 | switcher labeled scaffold; `X-User-Id` trusted as given | E2E |

## 6. NFR tests (optional)

**Not in scope.** No intent source requests observability, performance or
resilience testing, and the delta contains no NFR requirement. Explicit user
confirmation was not obtained — the user asked for continuous execution
("继续执行后续的流程"), following the REQ-004 precedent. Recorded as deferred,
owner Dev/SA to raise if needed. R19 (dock layout, `100dvh`, safe-area) is
functional browser verification at P4, not an NFR test. No NFR test section is
designed here.