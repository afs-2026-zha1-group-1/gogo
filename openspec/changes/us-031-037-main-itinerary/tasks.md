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

- [ ] 1.1 `V5__create_main_plan.sql` first: `main_plan_draft` + `main_plan_stop`
      + `trip_member.ready` / `preference_revision` + `member_preference`
      stand-in + readiness/preference seeds (idempotent `INSERT OR IGNORE`,
      design D1); `mvn test` confirms existing suites stay green on V5
- [ ] 1.2 Author `MainPlanApiTest` red: M1–M14, V1–V7, identity/trip negatives
      (M-N/V-N) per fixtures §US-031-037; own in-memory SQLite, Flyway V1–V5,
      pool size 1, `@BeforeEach` reset (design D12)
- [ ] 1.3 Add the API reverse checks (ATDD §5): preference write paths absent +
      `member_preference` rows unchanged, split routes absent, soft budget does
      not block, no auto-confirm, invitation suite untouched
- [ ] 1.4 Write the E2E checklist (S9, S10, four mandatory states) into
      `docs/feedback/e2e-us-031-037.md` as numbered browser steps with expected
      observations (ATDD §1/§2)
- [ ] 1.5 Run `mvn test`: the new class fails for missing routes (red);
      Greeting/Trip/Invitation suites still pass

## 2. Provider port and repository (owner: Dev)

- [ ] 2.1 `MainPlanProvider` port + `FakeMainPlanProvider` `@Component` with the
      four fixture stops, legs 30/30/15, cost 5000 (design D3); unit checks
      deferred to apply-time TDD (ATDD UT-1/UT-2)
- [ ] 2.2 `MainPlanRepository`: draft/stop insert + version supersession, draft
      selection (confirmed > current), readiness/revision reads, preference
      kind-row reads (read-only), inputs aggregation queries (design D4/D6/D7)
- [ ] 2.3 Location completion component: preferences first, random fallback,
      supplied preserved (design D5); apply-time unit TDD

## 3. Generation and reads (owner: Dev)

- [ ] 3.1 `POST /api/trips/{id}/main-plan`: gate order identity → trip →
      membership → organizer → confirmed (409 `ALREADY_CONFIRMED`, G6) →
      readiness (409 `MEMBERS_NOT_READY`, G2); completion + provider +
      versioned persist in one transaction; 201 plan projection (design D4);
      reused codes `USER_REQUIRED` / `TRIP_NOT_FOUND` / `NOT_A_MEMBER` /
      `NOT_ORGANIZER` per D2/D10
- [ ] 3.2 `GET /api/trips/{id}/main-plan`: member read; confirmed-row selection;
      computed `stale` (unconfirmed only, confirmed frozen); 404 `NO_DRAFT`
      (design D6)
- [ ] 3.3 `GET /api/trips/{id}/main-plan/inputs`: member-readable before any
      draft; members/readyCount/commonInterests/mustDo/budgets/rules (design D7)
- [ ] 3.4 `MainPlanApiException` + `MainPlanErrorAdvice` with detail fields for
      `MEMBERS_NOT_READY` / `VALIDATION_FAILED` (design D10)
- [ ] 3.5 Run `mvn test`: M1–M11, M14, I1–I3 and identity negatives green

## 4. Validation and confirmation (owner: Dev)

- [ ] 4.1 Schedule validator: five error types `OUT_OF_ORDER` / `OVERLAP` /
      `MISSING_LEG` / `TRAVEL_EXCEEDS_GAP` (equality passes, offending seq =
      leg-carrying stop) / `OUT_OF_DAY` (design D9); apply-time unit TDD
      red-green
- [ ] 4.2 Budget overrun computation: hard budget only, null = no limit,
      `overrunCents` per member (design D8); apply-time unit TDD
- [ ] 4.3 `POST /api/trips/{id}/main-plan/confirm`: gate order identity → trip →
      organizer → no-draft (404 `NO_DRAFT`, V6) → already-confirmed (409
      `ALREADY_CONFIRMED`, V7) → stale (409 `STALE_DRAFT`, C4) → validation
      (422 `VALIDATION_FAILED`, both lists); success flips status + flag in one
      transaction; 200 same projection (design D8)
- [ ] 4.4 Run `mvn test`: full M/V matrix green incl. C1→J4 closure (accept
      403 `JOINING_CLOSED`); all four suites pass (`mvn -B test`)

## 5. Frontend (owner: Dev)

- [ ] 5.1 Extend `parseRoute` + `api.js` with the two routes and four calls;
      no new dependency (design D11)
- [ ] 5.2 Screen 9 (`#/trips/<id>/main-plan/inputs`): ready count, member names,
      interest chips, must-do summary, budget lines, rules list; organizer-only
      generate action; loading/empty/error/permission states
- [ ] 5.3 Screen 10 (`#/trips/<id>/main-plan`): timeline, version badge, stale
      banner + regenerate, confirm with blocked-error rendering (schedule
      errors, overrun amounts, stale message), confirmed state + joining-closed
      notice; four mandatory states
- [ ] 5.4 `npm ci && npm run build` passes

## 6. Runtime acceptance and E2E (owner: Dev; evidence in local-verify report)

- [ ] 6.1 Start backend (8080) + frontend (5173); verify by port owner and
      endpoint response, not logs alone
- [ ] 6.2 Execute `docs/feedback/e2e-us-031-037.md`: S9 summary + roles, S10
      draft → blocked confirm → confirmed flow, four states on both surfaces;
      test-only flips for pending/overrun/stale/null-location browser cases
      (ATDD §4)
- [ ] 6.3 Re-run the API matrix against the running backend with curl
      (M1–M14, V1–V7, negatives, reverses) incl. the J4 accept closure
- [ ] 6.4 Write `docs/feedback/verification-us-031-037.md` and the P4
      local-verify report; mark Partial where evidence is missing, never Pass
      by assertion

## 7. CI and gates (owner: Dev drafts; IO/SA/VL decide)

- [ ] 7.1 Push + open the PR only with separate typed authorization; read the
      fresh CI run with `gh` and write the pipeline report (G2 evidence)
- [ ] 7.2 G2 decision record by named VL; then P5 change summary, G3, archive
      via `/sdd:living-merge` — merge order REQ-019 V4 first; execute F1
      write-sync alignment before/at that merge (g1-decision.md)
- [ ] 7.3 Update `README.md` run instructions and the registry/handoff rows

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