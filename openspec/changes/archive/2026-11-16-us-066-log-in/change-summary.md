# Change summary — us-066-log-in

- Change id: `us-066-log-in`（REQ-008 / US-066）
- Archived: `openspec/changes/archive/2026-11-16-us-066-log-in/`
- PR: #47 → main `135d3df`
- G1: Pass（`g1-decision.md` + `g1-decision-pass.md`）
- G2: Pass，VL lumi（`g2-decision.md`）；G3 pending human

## Intent

Replace the unverified `X-User-Id` scaffold with email/password login and a
server-side session, protect every non-public trip surface, and keep the guest
invitation preview resumable without automatic join.

## What shipped

- Backend: `V6` `account_credential` (BCrypt, five demo accounts), Spring
  Security session + CSRF, `/api/auth/{login,me,csrf}`, flat `{code,message}`
  errors, identity migration for trip/invitation/main-plan/splits; splits keeps
  its `MEMBER_REQUIRED` + `{data,error}` exception.
- Frontend: shared dashboard-style login page (430px shell, demo accounts,
  click-to-fill), AuthProvider, hash + React Router guards, session-expired
  handling, invitation resume, removal of the scaffold switcher/split identity
  bar; cookie + CSRF-aware API clients.
- Docs/specs: auth delta, six modified capability deltas, README, tech-stack-plan
  reconciliation, browser verification, G1/G2 records.

## Verify highlights

- `mvn -B test`: 186/186.
- `npm ci && npm run build`: typecheck + Vite build pass.
- CI: PR #47 backend + frontend green; local verify Overall Pass.
- Browser E1–E16: login success/failure, protected redirects, split guard,
  invitation preview/resume/explicit accept, create/details/main-plan/split,
  splits CSRF, 430px login shell, demo account fill.

## Residual risks

- Splits Living Spec Purpose still has pre-existing `X-Member-Id` prose drift;
  requirements are session-based. SA to fix in a small follow-up.
- In-memory sessions are lost on backend restart (accepted; re-login).
- Demo credentials are shown only on the demo login page, labeled demo-only.
- Session-expiry acceptance uses invalidated/restarted sessions because Tomcat
  timeout granularity is minutes.

## Links

- Local verify: `docs/ai4se-plugins/20261116-154649-local-verify-report.md`
- Pipeline CI: `docs/ai4se-plugins/20261116-155440-pipeline-report.md`
- Browser: `docs/feedback/verification-us-066.md`
- P4 QC: `docs/ai4se-plugins/20261116-154727-quality-checklist-report.md`