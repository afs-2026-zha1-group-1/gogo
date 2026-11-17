# Change summary — us-068-070-account-register

## Intent

Close the account lifecycle opened by US-066 (REQ-008): a signed-in traveler
needs My Account with a display-name edit (US-068), a real logout that invalidates
the server session (US-069), and a signed-out traveler needs to create an account
without email verification (US-070). The three stories share the same account
record (`app_user` + `account_credential`), the same My Account surface and the
same `auth` API boundary, so they shipped as one change (REQ-009).

## What shipped

- **Backend `auth`**:
  - `POST /api/auth/register` — public + CSRF, one transaction over
    `app_user` + `account_credential`, BCrypt only; `200 {"next":"login"}` for a
    new email and `409 EMAIL_TAKEN` for a duplicate.
  - `GET /api/auth/me` now reads the account from the database; `PATCH /api/auth/me`
    updates the caller's display name and refreshes the session principal.
  - `POST /api/auth/logout` invalidates the HTTP session and returns `204`.
  - Error contract: flat `{code,message}`; `INVALID_EMAIL`, `INVALID_NAME`,
    `INVALID_PASSWORD`, `INVALID_REQUEST` (400), `EMAIL_TAKEN` (409).
- **Frontend**:
  - Registration page follows the supplied mobile reference: brand header, back,
    name/email/password/confirm, 8-character UI minimum, success/duplicate dialogs
    with 去登录 (and 修改邮箱 on duplicate).
  - My Account follows its reference: initial avatar, name/email, 名字 field,
    保存名字 and outlined 退出登录; top-right identity bar removed.
  - Five-tab dock (仪表盘 / 行程 / 分队 / 成员 / 我的); dashboard greeting uses the
    account name without an organizer suffix.
- **Database**: no new table or migration in this change; V6's unique email index
  and BCrypt hash are reused.
- **Living Spec**: `auth` gained Account registration / Account profile and display
  name / Logout and session invalidation, and three historical requirement
  wordings were corrected; `app-shell` updated the frame, five-tab dock,
  dashboard greeting and full-screen auth surfaces.
- **Knowledge base**: tech-stack-plan §19 landed reconciliation and `_LOG.md` row;
  `scripts/kb-lint.sh` returned the documented `SKIP` (KB lint not configured).
- **Merge**: PR #101 merged to `main` as `3334e7d`.

## Verify highlights

- Backend after merging `origin/main`: **279/279** (`mvn -B test`).
- Frontend: clean `npm ci` + `npm run build` green.
- Browser E2E: 18 Pass / 1 Skipped (`docs/feedback/e2e-us-068-070.md`); the
  skipped row is an accept-click blocked by the browser-use classifier, not a
  product failure.
- Local verify: **Pass** (`docs/ai4se-plugins/20261117-091109-local-verify-report.md`).
- PR #101 CI: both jobs green on the code head and final docs head
  (runs 43999674160 / 43999680155).
- G1 Pass (IO Emily + SA Elian Jiang); G2 Pass (VL lumi).

## Residual risks

- Duplicate-email disclosure (`409 EMAIL_TAKEN` + prompt) overrides US-070's
  original non-disclosure AC at the user's 2026-11-17 direction; email enumeration
  is accepted. IO re-confirmation is pending.
- US-068 issue #40 is still assigned to `DENGLU-OOCL`; the card handoff is a
  process follow-up.
- Registration/login rate limiting and lockout remain a documented deployment
  exception (OQ-13).
- G3 sign-off is pending after this archive PR is merged.

## Links

- Proposal/spec/design/tasks: `proposal.md`, `specs/auth/spec.md`,
  `specs/app-shell/spec.md`, `design.md`, `tasks.md`.
- Gates: `g1-decision.md`, `g2-decision.md`, `g3-decision.md` (to be added).
- PR: https://github.com/afs-2026-zha1-group-1/gogo/pull/101 (merge `3334e7d`).
- Verify: `docs/ai4se-plugins/20261117-091109-local-verify-report.md`,
  `docs/ai4se-plugins/20261117-095602-pipeline-report.md`,
  `docs/feedback/e2e-us-068-070.md`.
- Living Spec: `openspec/specs/auth/spec.md`, `openspec/specs/app-shell/spec.md`.
- KB: `docs/knowledge/architecture/tech-stack-plan.md` §19,
  `docs/knowledge/_LOG.md` row 2026-11-17.
