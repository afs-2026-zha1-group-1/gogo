# Tasks

- Change: `req-003-trip-create-and-view` (REQ-003, US-001/US-002)
- Inputs: [proposal](proposal.md) · [delta spec](specs/trips/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md)
- G1: Pass recorded 2026-11-14 (IO Emily, SA Johnson).
- Order rule: acceptance checks red before production code (ATDD design §2).
- Commit rule: local commits only with the user's typed authorization; push to
  `group1` only with separate typed authorization.

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author `TripApiTest` covering C1, C1b, C2, C3, C6, C7, C4-N, C5-N,
      R1, R2, R2-N, R3-N per fixtures; own in-memory SQLite file, Flyway
      `V1`–`V2`, pool size 1 (design D8); ids read from create responses
- [x] 1.2 Add reverse checks: no edit/delete/list routes, no invitation routes,
      greeting unchanged
- [x] 1.3 Run `mvn test`; confirm the new class fails (red) and
      `GreetingApiTest` passes
- [x] 1.4 Write the E2E check list (E1, E2) as numbered browser steps

## 2. Migration and repository (owner: Dev)

- [x] 2.1 `V2__create_trip.sql`: three tables plus seed users 1–5 and the sample
      trip with members 1–4; nullable locations, NOT NULL destination (D1)
- [x] 2.2 `TripRepository`: transactional create with membership insert, member
      read, membership check, seeded-user lookup (D2, D4, D5)
- [x] 2.3 Validation helpers: strict date parse, blank normalization, location
      null normalization (D3); unit checks at apply-time TDD (UT-1)

## 3. Endpoints (owner: Dev)

- [x] 3.1 `POST /api/trips`: identity → dates → name → destination → range;
      201 echo with id/organizerId; codes per D3; nothing stored on rejection
- [x] 3.2 `GET /api/trips/{id}`: 404 / 403 without values / 200 saved values (D5)
- [x] 3.3 Error advice rendering `{"code","message"}` for all trip failures
- [x] 3.4 Run `mvn test`: all C/R checks green; greeting tests unchanged

## 4. Frontend (owner: Dev)

- [x] 4.1 Hash router shell (`#/`, `#/create`, `#/trips/<id>`) and scaffold
      identity switcher over users 1–5 (D6)
- [x] 4.2 Create page: six inputs, optional-location labels, busy state, server
      error message, success navigation (D7)
- [x] 4.3 Details page: six values with null placeholder, loading, denied,
      not-found and failure states (D7); stylesheet per ui-design-reference
- [x] 4.4 `npm run build` passes

## 5. Runtime acceptance and E2E (owner: Dev; evidence in local-verify report)

- [x] 5.1 Start backend (8080) and frontend (5173) as detached processes; verify
      by port owner plus endpoint response
- [x] 5.2 Execute E1/E2 browser steps with the identity switcher; capture
      observations for create, read, denied, not-found and validation states
- [x] 5.3 Re-run every API scenario with curl against the running backend,
      including C6/C7 null read-back and the reverse checks
- [x] 5.4 Write `docs/feedback/verification-req-003.md` and the P4 local-verify
      report; Partial where evidence is missing, never Pass by assertion

## 6. CI and gates (owner: Dev drafts; IO/SA/VL decide)

- [ ] 6.1 Push the branch and open the PR to `group1/main` only with separate
      typed authorization; read the fresh CI run with `gh`; pipeline report
- [ ] 6.2 G2 decision record by named humans; P5 summary, G3, archive via
      `/sdd:living-merge` after G2
- [ ] 6.3 Update `README.md` run instructions and registry/handoff rows

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P0–P2 artifacts and G1 Pass record (IO Emily + SA Johnson)
- [x] 7.2 P3 `atdd-design.md`, `design.md`, this `tasks.md`, alignment self-check
      below; P3 quality report persisted
- [ ] 7.3 Record G2/G3 only from named human statements; the agent never
      self-signs a gate

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Trip caller identity (2 scenarios) | D2, D3 | 3.1, 3.2, 1.1 | C5-N, R2-N | Pass |
| Trip creation (7 scenarios incl. C6/C7) | D1, D3, D4 | 2.1–2.3, 3.1, 1.1 | C1, C1b, C2, C3, C6, C7, C4-N | Pass |
| Trip detail read (3 scenarios) | D5 | 3.2, 1.1 | R1, R2, R3-N | Pass |
| Non-goals (edit/delete, lists, invitations, completion, auth, ORM, greeting) | Goals/Non-Goals, D1, D9 | 1.2, 4.x | reverse table | Pass |
| Display contract (deep-dive ⑫: create/details + states) | D6, D7 | 4.1–4.3, 5.2 | E1, E2 | Pass |

No silent scope creep: every task traces to a spec scenario, a declared
non-goal reverse check, or a stage artifact. Self-check result: **Pass**.