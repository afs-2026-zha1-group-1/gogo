# Change summary — us-082-back-navigation

## Intent

修复前端返回与登录回跳：入会成功后直达被接受的行程；分队首页与主线方案返回该行程详情并恢复行程上下文；未登录深链登录后回原页；登录/注册内部链接统一走 Router 路由。

## What shipped

- **Frontend**:
  - `Join.tsx` — joined state keeps `tripId`; primary action 进入行程 → `#/trips/<id>`, secondary 返回首页.
  - `screen-start.tsx` — split start back target `/#/trips/<id>`.
  - `MainPlan.tsx` — appbar back target `#/trips/<id>`.
  - `RequireAuth.tsx` + `LoginPage.tsx` — `/login?next=<encoded route>`; only single-slash same-origin paths resume; `/login` and `/register` self-targets fall back to `/`; `pendingInvite` keeps precedence.
  - `RegisterPage.tsx`, `LoginPage.tsx`, `Join.tsx` — internal auth links use `/login` and `/register`.
- **Backend**: `JoinResult` gains additive `tripId`; `InvitationRepository.accept` passes the resolved trip id; `InvitationApiTest` locks the field. No new endpoint, migration or dependency.
- **Living Spec**: `app-shell` gained `Trip-context return links` and `Auth deep-link resume and route consistency`; `Guest join exclusion` now includes the joined-state trip action. `openspec validate --specs --strict` = 8 passed.
- **Knowledge base**: `tech-stack-plan` §20 landed reconciliation + `_LOG.md` row.
- **Merge**: PR #107 merged to `main` as `ee8bf8f`.

## Verify highlights

- `mvn -B test`: **279/279**.
- Frontend clean `npm ci` + `npm run build`: green, 0 vulnerabilities.
- Browser E2E: J1/S1/S2/S3/M1/A1/A3/A4 Pass; A2 not run; US-071 rows Blocked (`docs/feedback/e2e-us-082.md`).
- Local verify: **Pass** (`docs/ai4se-plugins/20261117-114710-local-verify-report.md`).
- PR #107 CI: Backend + Frontend green (runs 44012217311 / 44012221844 / 44012751115 / 44012755875).
- G1 Pass (IO Johnson + SA Johnson); G2 Pass (VL Johnson).

## Residual risks

- A2 (pending invitation precedence) was not browser-tested on the shared 8080 backend; the code path is unchanged. Re-run in an isolated environment if required.
- AC2/AC3 (members/create back) remain owned by US-071 and must be regressed after it merges.
- Legacy `#/login` and `#/register` hash entries were kept; removing them is a separate cleanup.
