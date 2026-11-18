# Local Verify Report: us-068-070-account-register

**Date:** 2026-11-17 (timezone: Asia/Shanghai, +08:00)
**Root:** [original checkout path redacted]
**Scope:** local+evidence
**Change id:** us-068-070-account-register

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Pass. Remote CI has not run yet (branch not pushed / PR not opened); this report is local evidence only.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| 6 static/reverse checks (frontend no hard-coded greeting, no ORM/H2, lockfile host, CI jobs/triggers) | `docs/feedback/verification-commands.md` (probe runner) | 0 | 6/6 pass; runner log `20261117-090059-local-verify-run.log` |
| `cd backend && mvn -B test` | `docs/feedback/verification-commands.md` Runtime | 0 | **279/279** tests pass after merging `origin/main` `7eafbcb` (includes 21 new auth tests + 3 validation UTs and main’s US-013/REQ-019 tests) |
| `cd frontend && npm ci && npm run build` | `docs/feedback/verification-commands.md` Runtime | 0 | Clean install + `tsc --noEmit` + vite build pass in an isolated copy (in-place `npm ci` would hit the concurrent 5173 dev server's Windows file lock; `npm run build` also passed in place, including after both UI redesigns) |
| `openspec validate us-068-070-account-register --strict` | OpenSpec | 0 | valid |
| Browser E2E (registration, duplicate, rename, logout, invite resume, both UI references, neutral reminder) | `docs/feedback/e2e-us-068-070.md` | — | 18 Pass / 1 Skipped (accept click blocked by browser-use classifier; existing US-010 contract) |

## Code-review highlights

- Backend: `AccountService` (validation + transaction + privacy-safe duplicate), `AccountValidation`, repository insert/find/update, `AuthController` register/me(PATCH)/logout, path-aware `AuthErrorAdvice`, `SecurityConfig` register permitAll. Constructor injection, records for DTOs, `JdbcTemplate`, no new dependency, no migration.
- Registration writes `app_user` + `account_credential` in one `TransactionTemplate`; duplicate unique-email maps to the same `200 {"next":"login"}`; other DB failures → 500 flat.
- Profile update refreshes the session principal and `me` reads the DB, so a rename is visible to other sessions on their next read.
- Logout uses `SecurityContextLogoutHandler` (session invalidation) and returns 204.
- Frontend: AuthProvider register/logout/updateName; five-tab dock (five-column grid); AccountBar removed; AccountPage rebuilt to the supplied reference (back + 我的, initial avatar + name + email, 名字 field, 保存名字 primary action, outlined red 退出登录); RegisterPage rebuilt to the reference (brand header, back, name/email/password/confirm, 8-char UI minimum); login Create-account entry; account-name greeting.
- Both UI mismatches found by the user during P4 were fixed and re-verified; the duplicate-registration flow also gained a neutral login-page reminder (same wording for new and duplicate emails, so it does not disclose whether the email exists).
- No secrets, no `dangerouslySetInnerHTML`, no new URL handling; CSRF goes through the existing `api`/`csrfHeaders` path.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 39/43 checked; remaining 10.1–10.4 are P5/process tasks (tech-stack reconciliation, registry/handoff final state, Living Purpose hygiene, US-068 card handoff). All P4-scope tasks complete. |
| V2 | Requirement coverage | Pass | [fact] | `auth` 3 ADDED implemented (`AuthController`, `AccountService`, repository) and tested; 3 MODIFIED auth wording/history aligned; `app-shell` 4 MODIFIED implemented in `App.tsx`, `TabBar.tsx`, `Home.tsx`, `AccountPage`, `RegisterPage`. |
| V3 | Scenario coverage | Pass | [fact] | API tests cover registration (valid/duplicate/concurrent/invalid/failure/no-session/login), profile (read/rename/validation/cross-session/other-account/failure/401/CSRF), logout (204/invalidate/repeat/CSRF/data). E2E covers the page/nav/name/invite/UI-reference scenarios. |
| V4 | Requirement↔impl mapping | Pass | [fact] | Each delta requirement maps to a main file + test; see `tasks.md` decision map and E2E doc. |
| V5 | Spec drift | Pass | [fact] | Three user-directed P4 amendments are recorded in delta/REQ/design/G1 addendum: registration reference (confirm field + 8-char UI minimum), My Account reference (profile header/save/logout layout), and explicit duplicate-email dialog (`409 EMAIL_TAKEN`, overriding the earlier non-disclosure AC; email-enumeration risk accepted, IO re-confirmation pending). Design D4 updated to the actual SQLite `UncategorizedSQLException` duplicate detection. |
| V6 | Design follow-through | Pass | [fact] | D1–D16 implemented or explicitly P5: transaction/duplicate, principal refresh, logout handler, path-aware errors, routing/dock, UI, tests. |
| V7 | Code pattern fit | Pass | [fact] | Matches existing auth/trip style: constructor injection, records, `JdbcTemplate`, flat errors, custom CSS tokens; no new UI library. |
| V8 | Upstream basis | Pass | [fact] | Every touched main file traces to proposal What Changes / REQ-009 / tasks / the two supplied UI references; no new table, migration, dependency or unrelated behavior. |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | Local commands above (238/238 backend, clean frontend install/build, 6/6 static). Remote CI pending PR. |
| E2 AI | Pass | This report + `dov-ac-review.md` + `consistency-lint.md` + E2E doc. |
| E3 Human | Pending | G2 human sign-off; never agent-signed. |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ (P4 scope; P5/process tasks explicitly open) |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | Residual risks | ✅ with tracking items |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Remote CI has not run for this branch yet | [fact] | n/a | `/sdd:pr-submit` then `/sdd:pipeline-report phase=ci`; G2 uses the fresh run |
| 2 | UI password minimum (8 chars) is stricter than the API contract (6–72 bytes) | [fact] | `RegisterPage.tsx`, `auth/spec.md` | Intentional per the supplied UI reference; documented in delta/G1 amendment |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | US-068 card #40 is still assigned to `DENGLU-OOCL` | [fact] | Project #2 | Confirm handoff before merge (process) |
| 2 | The in-app browser screenshot API was unavailable after the panel hid; My Account was verified via accessibility snapshot + computed styles | [fact] | E2E doc | Re-screenshot in a visible panel if a visual artifact is required |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Remote CI/PR evidence absent | Branch not pushed; user authorization pending | Run `/sdd:pr-submit` + `/sdd:pipeline-report phase=ci` before G2 |
| 2 | US-068 card ownership handoff | Teammate assignment | Confirm with the user/team before merge |
| 3 | SQLite single-writer pool serializes writes | Existing project constraint (pool=1); concurrent registration test passes | Keep the pool=1 SQLite iron rule; no change |
| 4 | Registration rate limiting/lockout absent | Deferred deployment concern (OQ-13) | Documented exception; revisit at deployment hardening |
| 5 | In-place `npm ci` can hit a Windows file lock while another dev server runs | Shared worktree has a 5173 dev server | Verified clean install/build in an isolated copy; CI runs on a clean runner |

## Waiver

N/A — no waiver. Overall Pass.

## Reviewer metadata

- Agent: Qoder, 2026-11-17
- Human sign-off: pending (G2 is not a local-verify decision)

## Addendum — explicit duplicate-email dialog (2026-11-17)

- User reported that re-registering an existing email silently returned to login, then directed a direct registration-time prompt instead of a login-page banner.
- API: duplicate email now returns `409 EMAIL_TAKEN` (flat error); a new email still returns `200 {"next":"login"}`. The transaction rolls back the partial `app_user` row.
- Frontend: the registration page shows a 注册成功 dialog for a new email and a 该邮箱已注册 dialog for a duplicate, each with 去登录; the duplicate dialog also offers 修改邮箱. The traveler stays on the registration page until choosing 去登录.
- This overrides US-070's original non-disclosure AC at the user's explicit direction (2026-11-17); email enumeration is accepted and recorded in the G1 addendum. IO re-confirmation is pending.
- Backend tests updated: duplicate now expects 409 `EMAIL_TAKEN`; concurrency expects one 200 and one 409. Full backend suite **279/279** after merging `origin/main`; frontend build green; `openspec validate --strict` valid. Overall remains **Pass**.

## Merge sync (2026-11-17)

- Merged `origin/main` `7eafbcb` (US-066 G3 archive, US-049/050 archive, US-013 members, REQ-019 travel preferences, US-071 docs, PR-only-main rule) into `US-068-070-account-register`.
- Conflicts resolved by keeping both sides: main’s Scanner/Preferences/Members additions plus this change’s registration/My Account routes and styles; requirement docs keep both the REQ-009 sections and main’s new sections.
- Re-ran after merge: backend **279/279**, frontend build green, `openspec validate --strict` valid. Overall remains **Pass**.
