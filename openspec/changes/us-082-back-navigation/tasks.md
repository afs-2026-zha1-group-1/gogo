# Tasks

Fail-first slices. Each implementation group carries observable verification tied
to a delta scenario in `specs/app-shell/spec.md`.

P4 evidence (2026-11-17): `mvn -B test` **279/279 Pass**; `npm run build`
Green; browser walk on `http://localhost:5174` recorded in
`docs/feedback/e2e-us-082.md` (J1/S1/S2/S3/M1/A1/A3/A4 Pass; A2/D1/D2 residual).

## 1. G1 package

- [x] 1.1 Run `scripts/cross-change-scan.sh us-082-back-navigation --advisory`,
      author `cross-change-scan.md` with all nine axes, and record the US-071 /
      US-067 / us-068-070 shared-surface findings; verify every axis has
      Pass/Fail/N/A plus evidence.
- [x] 1.2 Record `g1-decision.md` with named IO and SA sign-off; Inputs cite
      `cross-change-scan.md`; verify BLOCKER is 0.

## 2. Baseline + fail-first E2E checklist

- [x] 2.1 Author `docs/feedback/e2e-us-082.md` with one row per delta scenario
      plus two US-071 dependency rows; verify the row count and initial status.
- [x] 2.2 Confirm `npm run build` is green on the change branch before edits.

## 3. Join success entry

- [x] 3.1 Extend the `joined` state in `Join.tsx` with `tripId`; make 进入行程
      the primary action targeting `#/trips/<tripId>` and keep 返回首页 as
      secondary; verify `npm run build` and E2E row J1.
- [x] 3.2 Confirm the preview state still renders no trip id and the closed,
      unusable and failed states are unchanged; verify `npm run build`.
- [x] 3.3 Add `tripId` to the backend `JoinResult` record and both constructors
      (additive), assert it in `InvitationApiTest`, and align
      `AcceptResult`; verify `mvn -B test` = 279/279.

## 4. Split back keeps the trip

- [x] 4.1 Change `screen-start.tsx` `backTo` to `/#/trips/${tripId}`; verify
      E2E rows S1 and S2 render the trip details, not the dashboard.
- [x] 4.2 After returning, confirm `App.lastTripId` is re-established by the
      details route so the 成员 and 分队 entries resolve the same trip; verify
      with the 成员 tab (roster loaded).

## 5. Main plan back keeps the trip

- [x] 5.1 Change the `MainPlan` appbar back target to `#/trips/${tripId}`;
      verify E2E row M1 returns to the trip details.
- [x] 5.2 Confirm the loading, empty and error states still render their own
      back and 返回首页 actions without change; verify `npm run build`.

## 6. Auth deep-link resume

- [x] 6.1 Change `RequireAuth` to redirect to
      `/login?next=<encoded pathname + search + hash>` with `replace`; verify a
      signed-out direct visit to `/trips/1/split/boundaries` lands on the login
      route with `next` present.
- [x] 6.2 In `LoginPage`, read and validate `next` as a single-slash same-origin
      path and resume after login with `pendingInvite` taking precedence; verify
      E2E row A1 (A2 residual noted).
- [x] 6.3 Verify E2E row A3: a cross-origin `next` falls back to `/` and opens
      no external URL.

## 7. Auth route consistency

- [x] 7.1 Point `RegisterPage` back and 已有账号？去登录 at `/login`, point
      `LoginPage` 创建账号 at `/register`, and point the `Join` login hand-off
      at `/login`; verify E2E row A4.
- [x] 7.2 Grep `frontend/src` for newly introduced `/#/login` or
      `/#/register` links and confirm none remain in internal navigation; verify
      `npm run build`.

## 8. Regression + dependency verification

- [x] 8.1 Run `npm run build`, `mvn -B test`, and walk every
      `e2e-us-082.md` row; set only observed rows to Pass and list the rest as
      residual.
- [x] 8.2 Record AC2/AC3 as `Blocked` on US-071 (not merged); never Pass.
- [x] 8.3 Re-run the delta scenario walk after any rebase; the main merge
      brought docs/specs only, no code delta, and no row regressed to FAIL.

## 9. P4 workflow

- [x] 9.1 Create the change branch from `group1/main`, push it, and open a pull
      request into `main`; branch `US-082-back-navigation`, PR #107.
- [x] 9.2 After CI is green, run local-verify and record the G2 decision with a
      named VL; G2 Pass (VL Johnson), reports at
      `docs/ai4se-plugins/20261117-114710-local-verify-report.md` and
      `20261117-114711-pipeline-report.md`.
- [x] 9.3 Verify the PR contains only this change plus its evidence; `gh pr diff
      107 --name-only` lists only US-082 files; unrelated working-tree
      modifications are excluded.

## 10. Reconcile architecture baseline (pre-archive)

- [ ] 10.1 If this change altered routing facts recorded in
      `docs/knowledge/architecture/tech-stack-plan.md`, reconcile only what
      shipped; if nothing changed, record the no-op reason.
- [ ] 10.2 Append a dated row to `docs/knowledge/_LOG.md` when the plan is
      updated; verify the row references `us-082-back-navigation`.
- [ ] 10.3 Archive the change only after G3 and the reconciliation task are
      closed; verify `openspec list` no longer shows it as active.
