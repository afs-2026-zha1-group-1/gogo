# Tasks

- Change: `req-004-trip-invitations` (REQ-004, US-008/US-010/US-012)
- Inputs: [proposal](proposal.md) · [invitations delta](specs/invitations/spec.md) ·
  [trips delta](specs/trips/spec.md) · [ATDD design](atdd-design.md) ·
  [design](design.md) · [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md)
- Order rule: acceptance checks red before production code (ATDD design §2).
- Commit rule: local commit at each phase end only with the user's typed
  authorization; never push without separate authorization.

## 0. Preconditions (owner: Dev; IO/SA for gates)

- [x] 0.1 Confirm REQ-003 G1 recorded and REQ-003 P4 landed (`V2` tables exist);
      if not, stop P4 here — P0–P3 artifacts remain valid (OQ-7)
- [x] 0.2 Confirm REQ-004 G1 recorded by named IO + SA (`g1-decision.md`);
      rulings on OQ-1/OQ-2 captured or carried with owners
- [x] 0.3 Create the feature branch for this change; PR-based CI evidence path
      per the session decision

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author `InvitationApiTest` with I1–I5 (issuance), J1–J7 (preview and
      joining), U1–U2 (unusable), per fixtures §REQ-004; own in-memory SQLite
      file, Flyway `V1`–`V3`, pool size 1 (design D11)
- [x] 1.2 Add reverse checks R-1 (no confirmation route) and R-2 (no
      revocation/expiry route or field) to the same class
- [x] 1.3 Run `mvn test`; confirm the new class fails for missing
      tables/routes (red), and `GreetingApiTest` still passes
- [x] 1.4 Write the E2E check list (I6, U3, S1, S2) as numbered browser steps
      with expected observations, including the local QR decode step

## 2. Migration and repository (owner: Dev)

- [x] 2.1 `V3__create_invitation.sql`: `trip_invitation` (UNIQUE trip_id, UNIQUE
      token) + `trip.main_plan_confirmed` default 0 (design D1)
- [x] 2.2 `InvitationTokens` generator: SecureRandom 16 bytes → 32 hex (D3);
      unit checks deferred to apply-time TDD per ATDD design UT-1
- [x] 2.3 `InvitationRepository`: get-or-create issuance, token lookup, preview
      projection, membership insert-or-ignore, state read (D4–D6)

## 3. Endpoints (owner: Dev)

- [x] 3.1 `POST /api/trips/{id}/invitation`: identity → trip → organizer check →
      get-or-create; 200 with token/joinPath/tripId/tripName; codes
      `USER_REQUIRED`, `TRIP_NOT_FOUND`, `NOT_ORGANIZER`
- [x] 3.2 `GET /api/invitations/{token}`: no identity; five-field whitelist;
      unknown token → 404 `INVITATION_NOT_FOUND` with no trip values
- [x] 3.3 `POST /api/invitations/{token}/accept`: identity first, then token,
      then existing-member check before closure and insert-or-ignore for non-members;
      200 joined/alreadyMember, including existing members after closure; codes `USER_REQUIRED`,
      `INVITATION_NOT_FOUND`, `JOINING_CLOSED`
- [x] 3.4 Run `mvn test`: I/J/U/R checks green; greeting tests unchanged

## 4. Frontend (owner: Dev)

- [x] 4.1 Hash router in the shell (`#/`, `#/create`, `#/trips/<id>`,
      `#/join/<token>`) shared with REQ-003 screens; no routing dependency (D7)
- [x] 4.2 Scaffold identity switcher over the five seeded users, labeled as
      scaffold, sets `X-User-Id` on every request (D8)
- [x] 4.3 Invitation panel on the trip surface: link text, copy action with
      fallback, QR canvas via `qrcode`, joining-open hint; loading/error/denied
      states (D9); install `qrcode` (MIT) through the corporate mirror and
      record the license check
- [x] 4.4 Join page: preview card, accept, joined, closed, unusable and
      loading/failure states; unusable surface shows no private field and no
      reminder workflow (D9)
- [x] 4.5 `npm run build` passes; add `jsqr` devDependency for the P4
      decode check and record the license check (installed 1.4.0 declares
      Apache-2.0, not MIT; permissive, dev-only)

## 5. Runtime acceptance and E2E (owner: Dev; evidence in local-verify report)

- [x] 5.1 Start backend (8080) and frontend (5173); verify by port owner plus
      endpoint response, not by logs alone
- [x] 5.2 Execute the E2E list: S1 panel/copy/QR, I6 QR decode equals the copied
      absolute URL and opens the same invitation, S2 preview→accept→joined and
      closed state, U3 unusable surface; capture observations
- [x] 5.3 Re-run every API scenario against the running backend with curl
      (I1–I5, J1–J7, U1–U2, R-1, R-2), including the J4/J6 test-only state flip
- [x] 5.4 Write `docs/feedback/verification-req-004.md` and the P4
      local-verify report; mark Partial where evidence is missing, never Pass
      by assertion

## 6. CI and gates (owner: Dev drafts; IO/SA/VL decide)

- [x] 6.1 Push the feature branch and open the PR only with separate typed
      authorization; read the fresh CI run with `gh` and write the pipeline
      report (G2 evidence) — PR #31, run 43608236232 on head `91dca19`, both jobs
      success
- [x] 6.2 G2 decision record by named humans — **G2 Pass recorded 2026-11-15,
      VL Elian Jiang**; P5 change summary written; archived 2026-11-15 as
      `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` after
      REQ-003; G3 decision tracked in 7.5
- [x] 6.3 Update `README.md` run instructions and the registry/handoff rows

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P0 report `docs/ai4se-plugins/20261114-173657-quality-checklist-report.md`
- [x] 7.2 P1 intent/REQ/DoR/deep-dive/impact/fixtures + proposal; P1 report
      `20261114-174154`
- [x] 7.3 P2 deltas + `dov-ac-review.md` + `--strict` valid + G1 draft; P2 report
      `20261114-174435`
- [x] 7.4 P3 `atdd-design.md`, `design.md`, this `tasks.md`, alignment self-check
      below; P3 report persisted
- [x] 7.5 Record G1/G2/G3 only from named human statements; the agent never
      self-signs a gate (G1 recorded 2026-11-14: IO Emily + SA Johnson Pass;
      G2 recorded 2026-11-15: VL Elian Jiang Pass; G3 Pass recorded 2026-11-15:
      SA Johnson)

## P4 evidence (2026-11-14)

- Red first: `InvitationApiTest` 15 errors on the missing table; 16 existing
  tests green. After apply: `mvn -B test` 31/31 (Greeting 3, Invitation 15,
  Trip 13), `mvn -B package -DskipTests` and `npm run build` pass.
- `openspec validate req-004-trip-invitations --strict` → valid.
- Runtime: curl matrix I1–I5, J1–J7, U1–U2, R-1, R-2 all match the fixtures;
  browser E2E S1/I6/S2/U3 and the organizer-denial panel pass.
- Reports: `docs/feedback/verification-req-004.md`,
  `docs/ai4se-plugins/20261114-225027-local-verify-report.md`.
- CI: PR #31, run 43608236232 on head `91dca19`; Backend tests and Frontend
  build success (`docs/ai4se-plugins/20261114-230558-pipeline-report.md`).
- Note: REQ-003's `POST /api/trips/{id}/invitation → 404` reverse assertion was
  retired because this change owns that route.

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Invitation issuance (5 scenarios) | D1, D2, D3, D4 | 2.1–2.3, 3.1, 1.1 | I1–I5 | Pass |
| Invitation preview (2 scenarios) | D6 | 3.2, 1.1 | J1, U1 | Pass |
| Invitation acceptance and joining (6 scenarios) | D5, D10 | 3.3, 1.1, 5.3 | J2–J7 | Pass |
| Unusable invitation (2 scenarios) | D6 | 3.2, 3.3, 1.1 | U1–U2, U3 | Pass |
| Trip main-plan confirmation state (3 scenarios) | D1, D5, D10 | 2.1, 3.3, 1.2 | J4, R-1 | Pass |
| Non-goals (US-037 flow, revocation/expiry, reminder, auth, ORM, single membership) | Goals/Non-Goals, D5, D9 | 1.2, 4.4 | R-1, R-2 + reverse table | Pass |
| Display contract (deep-dive ⑫, five surfaces + states) | D7, D8, D9 | 4.1–4.5, 5.2 | S1, S2, U3, I6 | Pass |

No silent scope creep: every task traces to a spec requirement, a declared
non-goal reverse check, or a stage artifact; no task adds behavior beyond the
deltas. Self-check result: **Pass**.