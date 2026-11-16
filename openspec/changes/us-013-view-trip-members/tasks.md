# Tasks

- Change: `us-013-view-trip-members`
- Inputs: [proposal](proposal.md) · [trips delta](specs/trips/spec.md) ·
  [app-shell delta](specs/app-shell/spec.md) · [ATDD design](atdd-design.md) ·
  [design](design.md) · [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
  [G1 record](g1-decision.md)
- Order rule: acceptance checks red before production code (ATDD design §2).
- Commit rule: local commit at each phase end only with the user's typed
  authorization; never push without separate authorization.

## 0. Preconditions (owner: Dev; IO/SA for gates)

- [x] 0.1 G1 recorded **Pass** by named IO Emily + SA Johnson (2026-11-16,
      `g1-decision.md`); no conditions
- [x] 0.2 Working branch `US-013-view-trip-members-planning` exists; merged
      `group1/main` `135d3df` (US-066 login/session, V4 splits, V6 credentials,
      real `#/split`) per G2 C1
- [x] 0.3 P3 artifacts authored: `atdd-design.md`, `design.md`, this file;
      alignment self-check below

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author `TripMembersApiTest` red: S1–S10 + auth/trip negatives per
      fixtures §US-013, own in-memory SQLite, Flyway V1–V6, pool size 1;
      joined-member insert/cleanup — red observed before implementation, then
      adapted to `TestAuth.asUser` after the main merge
- [x] 1.2 Add the reverse checks: no write verbs, no readiness/preference/
      budget/main-plan fields, no demo data, membership count unchanged
- [x] 1.3 Write the E2E checklist (U1–U3 + four states) into
      `docs/feedback/e2e-us-013.md` as numbered browser steps
- [x] 1.4 Run `mvn test`: the new class fails for the missing route (red);
      Greeting/Trip/Invitation/MainPlan suites stay green — observed 11/11 red
      (404), existing suites green

## 2. Backend read model (owner: Dev)

- [x] 2.1 `TripMember` + `TripMemberListResponse` records (`userId`,
      `displayName`, `organizer`; `tripId`, `members`)
- [x] 2.2 `TripRepository.findMembers(tripId)`: join `trip_member` /
      `app_user` / `trip`, derive organizer, order by `user_id` (design D4)
- [x] 2.3 `TripController` `GET /{id}/members`: use
      `@AuthenticationPrincipal`, trip existence and `isMember`; anonymous
      401 → 404 → 403 order (design D3)

## 3. Backend green (owner: Dev)

- [x] 3.1 Run `mvn test`: `TripMembersApiTest` all green; existing suites green —
      observed on merged head **198/198** (new class 12/12), Flyway 6 migrations
      (V1–V6)
- [x] 3.2 Confirm no mutation: `trip` / `trip_member` counts unchanged after
      every read case — asserted in M1 and M8/M9 cleanup

## 4. Frontend Screen 7 (owner: Dev)

- [x] 4.1 Add `TripMember` / `TripMemberList` types and `Members` page (TS):
      roster, organizer pill, count, loading/empty/error/denied/missing/no-trip
      states (design D6)
- [x] 4.2 Wire `App.tsx` `members` route to `Members` (keep `#/members` and the
      成员 active tab); `#/split` keeps main's shipped split entry (design D7)
- [x] 4.3 Add only the member-row/avatar/pill styles needed, using existing
      tokens; no new dependency (design D9)
- [x] 4.4 `npm run build` (`tsc -b && vite build`) zero errors — observed green

## 5. E2E and local verification (owner: Dev)

- [x] 5.1 Run the browser checklist: U1 roster + organizer; U2 sign in as Eve
      → denied, sign back as Ben → restore; U3 no-trip guidance; loading/error
      observed; missing and empty documented as unreachable/inspected
- [x] 5.2 Re-run the shell walk (仪表盘 → 行程 → 分队 → 成员 and back) and
      confirm no regression — 分队 ships the real split entry, active tabs
      correct
- [x] 5.3 Write `docs/feedback/verification-us-013.md` with the API matrix
      (M1–M11) and browser results

## 6. Pipeline and G2 inputs (owner: Dev + VL)

- [x] 6.1 Push the branch (typed authorization) and read a fresh CI run with
      `gh`; never inherit a green. The workflow trigger was broadened to all
      branch pushes by user instruction 2026-11-16 (job contents unchanged), so
      this branch produces its own run without a main PR. Observed: pre-merge
      run `43818961221` on `077e762`; **merged-head run `43834492224` on
      `6061579`**, both jobs success.
- [x] 6.2 Write the P4 pipeline report under `docs/ai4se-plugins/` —
      `20261116-165200-pipeline-report.md` (merged head); E1 slot
      `ci-report.md`.
- [x] 6.3 Prepare the G2 decision record for VL Leo; do not self-sign —
      `g2-decision.md` records VL **Leo**'s Conditional (C1–C5); the re-record
      remains with the VL

## 7. Documentation reconciliation (owner: Dev/SA)

- [x] 7.1 Update `README.md` run notes if the new endpoint changes the API
      summary — US-013 paragraph added after the split section
- [x] 7.2 Update `requirement-workspace/registry.md` and `handoff.md` at P4/P5 —
      US-013 rows added/updated for the G2 Conditional and remediation
- [ ] 7.3 Before archive, reconcile
      `docs/knowledge/architecture/tech-stack-plan.md` §6 API list with the
      shipped `GET /api/trips/{id}/members` and append a
      `docs/knowledge/_LOG.md` row; reconcile only what the archived change
      actually shipped

## 7b. G2 conditions (VL Leo, 2026-11-16)

- [x] C1 Merge `group1/main` `135d3df`; keep main-plan:confirm,
      `mainPlanConfirmed`, real `#/split` and US-066 auth; add `/members` +
      `findMembers`; resolve README + five requirement-workspace conflicts
- [x] C2 Re-run the full gate on the merged head: `mvn -B test` 198/198,
      `npm run build` green, browser regression for 成员 and 分队, fresh CI run
      `43834492224` on `6061579` both jobs success; local-verify
      `20261116-165153` and pipeline `20261116-165200` refreshed
- [x] C3 app-shell delta: 分队 = shipped split entry, 成员 = roster; Purpose,
      proposal and US-013 wording updated
- [x] C4 Identity divergence accepted: trips/members = session auth +
      `USER_REQUIRED`; splits = session auth + `MEMBER_REQUIRED` for anonymous;
      follow-up F2; R32 updated
- [x] C5 Evidence: tasks 7.1/7.2 checked; V1 wording corrected; M8/M9 renamed
      to direct insert; retired-header 401 + PUT/DELETE 405 tests added;
      unreachable UI states documented; `openspec validate` cited; all-branch CI
      trigger recorded as user-approved R37

## 8. Gates and archive (owner: humans)

- [ ] 8.1 G2 re-record **Pass** by named VL (Leo) on the merged head with fresh
      local-verify + CI evidence; the current record is **Conditional**
      (C1–C5), which does not authorize merge
- [ ] 8.2 Human merge of the PR/branch
- [ ] 8.3 `/sdd:living-merge` archive: add the `trips` requirement, apply the
      MODIFIED `app-shell` requirement, reconcile the app-shell Purpose prose
- [ ] 8.4 G3 **Pass** recorded by named SA (Johnson)
- [ ] 8.5 Close issue #9 and move the board card to Done after archive

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

- [x] Delta scenarios S1–S10 / U1–U3 mapped to ATDD layers and tasks
- [x] Design D1–D10 referenced by tasks; no task contradicts the delta
- [x] Reverse checks cover every Non-goal
- [x] No task claims a Gate decision

Result: **Pass** (2026-11-16) — S1–S10 API, U1–U3 E2E, D1–D10 mapped, reverse
checks in task 1.2, no gate task. P3 quality report:
`docs/ai4se-plugins/20261116-142626-quality-checklist-report.md`.
