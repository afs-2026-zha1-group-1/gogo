# Tasks

- Change: `us-031-037-main-itinerary` (US-031 + US-037)
- Inputs: [proposal](proposal.md) · [delta spec](specs/main-itinerary/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
  [G1 record](g1-decision.md)
- Order rule: acceptance checks red before production code (ATDD design §2);
  the V5 migration is the schema prerequisite authored first (design D1).
- Commit rule: local commit at each phase end only with the user's typed
  authorization; never push without separate authorization.

## 0. Preconditions (owner: Dev; IO/SA for gates)

- [x] 0.1 G1 recorded **Pass** by named IO Emily + SA Lumi (2026-11-15,
      `g1-decision.md`); C1/C2 ratified; F1 carried as non-gating follow-up
- [x] 0.2 Working branch `US-031-037-main-itinerary-planning` exists with the
      merged REQ-003/004 baseline (V2/V3 + trip/invitation code)
- [x] 0.3 P3 artifacts authored: `atdd-design.md`, `design.md`, this file;
      alignment self-check below

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 `V5__create_main_plan.sql` first: `main_plan_draft` + `main_plan_stop`
      + `trip_member.ready` / `preference_revision` + `member_preference`
      stand-in + readiness/preference seeds (idempotent `INSERT OR IGNORE`,
      design D1); `mvn test` confirms existing suites stay green on V5
- [x] 1.2 Author `MainPlanApiTest` red: M1–M14, V1–V7, identity/trip negatives
      (M-N/V-N) per fixtures §US-031-037; own in-memory SQLite, Flyway V1–V5,
      pool size 1, `@BeforeEach` reset (design D12)
- [x] 1.3 Add the API reverse checks (ATDD §5): preference write paths absent +
      `member_preference` rows unchanged, split routes absent, soft budget does
      not block, no auto-confirm, invitation suite untouched
- [x] 1.4 Write the E2E checklist (S9, S10, four mandatory states) into
      `docs/feedback/e2e-us-031-037.md` as numbered browser steps with expected
      observations (ATDD §1/§2)
- [x] 1.5 Run `mvn test`: the new class fails for missing routes (red);
      Greeting/Trip/Invitation suites still pass — observed 2026-11-15:
      MainPlanApiTest 34 tests / 32 failures (missing routes → 404; the two
      absent-route reverse checks pass by design), Greeting 3/3, Trip 13/13,
      Invitation 15/15 green

## 2. Provider port and repository (owner: Dev)

- [x] 2.1 `MainPlanProvider` port + `FakeMainPlanProvider` `@Component` with the
      four fixture stops, legs 30/30/15, cost 5000 (design D3); unit checks
      deferred to apply-time TDD (ATDD UT-1/UT-2)
- [x] 2.2 `MainPlanRepository`: draft/stop insert + version supersession, draft
      selection (confirmed > current), readiness/revision reads, preference
      kind-row reads (read-only), inputs aggregation queries (design D4/D6/D7)
- [x] 2.3 Location completion component: preferences first, random fallback,
      supplied preserved (design D5); apply-time unit TDD

## 3. Generation and reads (owner: Dev)

- [x] 3.1 `POST /api/trips/{id}/main-plan`: gate order identity → trip →
      membership → organizer → confirmed (409 `ALREADY_CONFIRMED`, G6) →
      readiness (409 `MEMBERS_NOT_READY`, G2); completion + provider +
      versioned persist in one transaction; 201 plan projection (design D4);
      reused codes `USER_REQUIRED` / `TRIP_NOT_FOUND` / `NOT_A_MEMBER` /
      `NOT_ORGANIZER` per D2/D10
- [x] 3.2 `GET /api/trips/{id}/main-plan`: member read; confirmed-row selection;
      computed `stale` (unconfirmed only, confirmed frozen); 404 `NO_DRAFT`
      (design D6)
- [x] 3.3 `GET /api/trips/{id}/main-plan/inputs`: member-readable before any
      draft; members/readyCount/commonInterests/mustDo/budgets/rules (design D7)
- [x] 3.4 `MainPlanApiException` + `MainPlanErrorAdvice` with detail fields for
      `MEMBERS_NOT_READY` / `VALIDATION_FAILED` (design D10)
- [x] 3.5 Run `mvn test`: M1–M11, M14, I1–I3 and identity negatives green —
      observed 2026-11-15: M1–M11 + I1–I3 green; M12–M14 and the V matrix
      stay red until the confirm endpoint lands in 4.3 (they exercise it);
      UT suites FakeMainPlanProviderTest 3/3 + LocationCompletionTest 6/6 green

## 4. Validation and confirmation (owner: Dev)

- [x] 4.1 Schedule validator: five error types `OUT_OF_ORDER` / `OVERLAP` /
      `MISSING_LEG` / `TRAVEL_EXCEEDS_GAP` (equality passes, offending seq =
      leg-carrying stop) / `OUT_OF_DAY` (design D9); apply-time unit TDD
      red-green — observed 2026-11-15: ScheduleValidatorTest 11 tests written
      first, compile-red, then green (equality + day-window boundaries covered)
- [x] 4.2 Budget overrun computation: hard budget only, null = no limit,
      `overrunCents` per member (design D8); apply-time unit TDD — observed
      2026-11-15: BudgetOverrunsTest 5 tests compile-red then green
- [x] 4.3 `POST /api/trips/{id}/main-plan/confirm`: gate order identity → trip →
      organizer → no-draft (404 `NO_DRAFT`, V6) → already-confirmed (409
      `ALREADY_CONFIRMED`, V7) → stale (409 `STALE_DRAFT`, C4) → validation
      (422 `VALIDATION_FAILED`, both lists); success flips status + flag in one
      transaction; 200 same projection (design D8) — membership gate added
      before organizer per spec (Eve confirm → `NOT_A_MEMBER`); response
      reuses the read projection
- [x] 4.4 Run `mvn test`: full M/V matrix green incl. C1→J4 closure (accept
      403 `JOINING_CLOSED`); all four suites pass (`mvn -B test`) — observed
      2026-11-15: 90/90 green (MainPlanApiTest 34/34, TripApiTest 13,
      InvitationApiTest 15, GreetingApiTest 3, UT 25), BUILD SUCCESS

## 5. Frontend (owner: Dev)

- [x] 5.1 Extend `parseRoute` + `api.js` with the two routes and four calls;
      no new dependency (design D11) — observed 2026-11-15: inputs/plan routes
      matched before the generic trip route; four named calls in api.js
- [x] 5.2 Screen 9 (`#/trips/<id>/main-plan/inputs`): ready count, member names,
      interest chips, must-do summary, budget lines, rules list; organizer-only
      generate action; loading/empty/error/permission states — observed
      2026-11-15: MainPlanInputs.jsx; generate navigates to Screen 10;
      MEMBERS_NOT_READY names pending members
- [x] 5.3 Screen 10 (`#/trips/<id>/main-plan`): timeline, version badge, stale
      banner + regenerate, confirm with blocked-error rendering (schedule
      errors, overrun amounts, stale message), confirmed state + joining-closed
      notice; four mandatory states — observed 2026-11-15: MainPlan.jsx; 422
      renders both lists, 409 STALE_DRAFT refreshes the banner, confirmed
      state hides all write actions
- [x] 5.4 `npm ci && npm run build` passes — observed 2026-11-15: npm ci 0
      vulnerabilities; vite build 53 modules, built in 251ms
- [x] 5.5 TypeScript migration of this story's two screens, per user
      instruction 2026-11-16 aligned with kanban US-065 (issue #35) and
      tech-stack-plan (React + TypeScript + Vite); scope limited to the two
      new pages — observed 2026-11-16: MainPlan.tsx / MainPlanInputs.tsx
      replace the .jsx files; minimal infra added (typescript + @types/react
      + @types/react-dom devDeps, tsconfig.json strict + allowJs, `typecheck`
      script, src/types/mainPlan.ts wire types aligned with backend records,
      src/api.d.ts typed surface for the unchanged api.js); App.jsx import
      paths updated only; no `any`, no `@ts-ignore`; `tsc --noEmit` zero
      errors; vite build 54 modules green; browser regression 8/8 (empty →
      inputs → generate → confirm → member view → ALREADY_CONFIRMED →
      unknown trip → greeting), screenshots in frontend/logs/regression-*;
      DB reset to seed state afterwards. Remaining JS files stay for US-065
      itself (its "current state" describes remote main, not this branch)

## 6. Runtime acceptance and E2E (owner: Dev; evidence in local-verify report)

- [x] 6.1 Start backend (8080) + frontend (5173); verify by port owner and
      endpoint response, not logs alone — observed 2026-11-15: 8080 owned by
      java PID 28576, 5173 by node PID 42164; inputs endpoint 200; backend
      restarted from the same jar after ST-3 and re-verified by endpoint
- [x] 6.2 Execute `docs/feedback/e2e-us-031-037.md`: S9 summary + roles, S10
      draft → blocked confirm → confirmed flow, four states on both surfaces;
      test-only flips for pending/overrun/stale/null-location browser cases
      (ATDD §4) — observed 2026-11-15: 8 browser rounds, all rows observed
      (ST-1 Partial: loading skeleton not capturable locally); 25 screenshots
      in `frontend/logs/`; results in
      `docs/feedback/verification-us-031-037.md`
- [x] 6.3 Re-run the API matrix against the running backend with curl
      (M1–M14, V1–V7, negatives, reverses) incl. the J4 accept closure —
      observed 2026-11-15: 65/65 PASS,
      `docs/feedback/us-031-037-matrix-run.log`
- [x] 6.4 Write `docs/feedback/verification-us-031-037.md` and the P4
      local-verify report; mark Partial where evidence is missing, never Pass
      by assertion — done 2026-11-16: verification report authored (22 E2E
      rows observed, ST-1 Partial); local-verify persisted at
      `docs/ai4se-plugins/20261116-004329-local-verify-report.md`
      (Overall Partial: E1 local-only, E3 pending; no CRITICAL, no Waiver)

## 7. CI and gates (owner: Dev drafts; IO/SA/VL decide)

- [x] 7.1 Push + open the PR only with separate typed authorization; read the
      fresh CI run with `gh` and write the pipeline report (G2 evidence)
      — done 2026-11-16: branch pushed (2bc8ed1), PR #37 OPEN · MERGEABLE ·
      CLEAN; run 43799584379 green on both jobs after 2 transient-checkout
      re-runs; `docs/ai4se-plugins/20261116-114859-pipeline-report.md` +
      `ci-report.md` E1 slot recorded (E1 全绿)
- [x] 7.2a G2 decision record by named VL — done 2026-11-16: **Pass** recorded
      by VL **Elian Jiang** (verbal sign-off conveyed by the user; not agent
      self-approval) in `g2-decision.md`, citing local-verify `20261116-004329`
      + pipeline ci `20261116-114859` (E1 全绿 on merged head `ed0a487`)
- [ ] 7.2b P5 change summary, G3, archive via `/sdd:living-merge` — gated on the
      human merge of PR #37; merge order REQ-019 V4 first; execute F1 write-sync
      alignment before/at that merge (g1-decision.md); not started
- [x] 7.3 Update `README.md` run instructions and the registry/handoff rows —
      observed 2026-11-16: README US-031-037 paragraph + V5 migration note +
      test-suite list; registry status/notes and handoff note record P4
      locally verified, push/PR + G2 pending authorization

## 8. Stage artifacts (owner: Dev)

Process bookkeeping recorded after the verify tail (6.3/6.4/7.1); these are not
implementation tasks (checklist T2).

- [x] 8.1 P1 intent/REQ/DoR/deep-dive/impact/fixtures + proposal (2026-11-15)
- [x] 8.2 P2 delta + `dov-ac-review.md` + `consistency-lint.md` + G1 **Pass**
      (2026-11-15, C1/C2 ratified same day)
- [x] 8.3 P3 `atdd-design.md` + `design.md` + this `tasks.md` + alignment
      self-check below
- [x] 8.4 P3 quality-checklist report (`/sdd:quality-checklist stage=p3`) —
      Overall Pass, `docs/ai4se-plugins/20261115-223551-quality-checklist-report.md`
- [ ] 8.5 Record G2/G3 only from named human statements; the agent never
      self-signs a gate

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Readiness-gated generation (G1/G2/G5/G6, 4 scenarios) | D1, D3, D4, D10 | 1.2, 2.1, 2.2, 3.1, 3.5 | G1, G2, G5, G6 (M1/M2/M5/M14) | Pass |
| Location completion (2 scenarios) | D5 | 2.3, 3.1 | G3a/G3b (M3) | Pass |
| Draft review + computed staleness (5 scenarios) | D6 | 3.2, 3.5 | M9–M13 rows | Pass |
| Generation inputs read (I1/I2/I3, 3 scenarios) | D7 | 3.3, 3.5 | I1–I3 (M6–M8) | Pass |
| Validation-gated confirmation (C1–C4, 4 scenarios) | D8, D9, D10 | 4.1–4.4 | C1–C4 (V1–V4) incl. J4 closure | Pass |
| Confirmation boundaries (V6/V7, 2 scenarios) | D8 | 4.3, 4.4 | V6, V7 | Pass |
| Authorization and identity (4 scenarios) | D2, D10 | 3.1–3.3, 4.3, 1.2 | G4/C5, non-member, identity, unknown trip (M4/V5/M-N/V-N) | Pass |
| Non-goals (preference writes, split, real provider, auth, notifications, soft budget, invitations unchanged, replanning, auto-confirm, ORM) | Goals/Non-Goals, D1, D3, D5, D7, D11 | 1.3, 5.x, 6.3 | ATDD §5 reverse table (10 rows) | Pass |
| Display contract (deep-dive ⑫: Screens 9/10 + four states) | D11 | 5.1–5.4, 6.2 | S9, S10, S9/S10-states | Pass |
| Schema convergence (G1 C2: V5, stand-in, merge order, F1) | D1, Migration Plan | 1.1, 7.2 | ATDD §2.1, §4 | Pass |

Scenario count check: 4+2+5+3+4+2+4 = **24** delta scenarios, every one mapped
to at least one API/E2E row and one task. No silent scope creep: every task
traces to a spec requirement, a declared non-goal reverse check, or a stage
artifact; no task adds behavior beyond the deltas. Self-check result: **Pass**.