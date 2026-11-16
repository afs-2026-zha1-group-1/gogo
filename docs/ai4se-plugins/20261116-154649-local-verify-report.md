# Local Verify Report: us-066-log-in

**Date:** 2026-11-16 (timezone: Asia/Shanghai)
**Root:** C:\Users\JIANGEL5\code\bootcamp\GoGo
**Scope:** local+evidence
**Change id:** us-066-log-in

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** no local blocking failure; PR has not been submitted yet. G2 remains
a human-only decision.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | `docs/feedback/verification-commands.md` | 0 | no hard-coded greeting |
| `! grep -inE "jpa|hibernate" backend/pom.xml` | same | 0 | no ORM |
| `! grep -rinE "h2database|org\.h2|jdbc:h2" backend/pom.xml backend/src` | same | 0 | no H2 |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | same | 0 | public registry lockfile |
| CI workflow parse/jobs assertion | same | 0 | jobs = backend, frontend |
| `(cd backend && mvn -B test)` | same | 0 | **186 tests, 0 failures** |
| `(cd frontend && npm ci && npm run build)` | same | 0 | `tsc -b && vite build` success |

Runner log: `docs/ai4se-plugins/20261116-154440-local-verify-run.log`

## Code-review highlights

- Backend: new `com.gogo.auth` package (V6 credential table, BCrypt,
  `AccountPrincipal`/`UserDetailsService`, login/me/csrf, `SecurityFilterChain`
  with session + CSRF + flat JSON handlers, splits permit/MemberGuard exception).
  Trip/invitation/main-plan/splits controllers now take the session principal.
- Frontend: `AuthProvider`, shared login page, hash + React Router guards,
  cookie/CSRF-aware `api` clients, removal of `ScaffoldBar`/`IdentityProvider`/
  `IdentityBar`, pending-invitation resume, session-expired global event.
- Existing business outcomes/codes are preserved; `X-User-Id` no longer
  authenticates. The splits 401 `MEMBER_REQUIRED` + `{data,error}` envelope is
  deliberately kept.
- Browser checks recorded in `docs/feedback/verification-us-066.md` (login,
  invalid login, protected redirects, split guard, invitation preview/resume/
  accept, create/details/main-plan/split pages, splits CSRF).

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 0 unchecked tasks in `tasks.md` |
| V2 | Requirement coverage | Pass | [fact] | auth 6 requirements; trips/invitations/app-shell/main-itinerary/splits modified; impl in `com.gogo.auth`, controllers, `features/auth`, delta specs |
| V3 | Scenario coverage | Pass | [fact] | AuthApiTest 11, SessionExpiryApiTest 1, existing suites 174; browser E1–E14 |
| V4 | Requirement↔impl mapping | Pass | [fact] | Login/me/csrf, CSRF, protected identity, error shape, login page, splits exception all have code/tests |
| V5 | Spec drift | Pass | [inference] | Splits Purpose prose still says `X-Member-Id` (pre-existing); historical scenario names retained by OpenSpec. SUGGESTION only |
| V6 | Design follow-through | Pass | [fact] | D1–D13 implemented; D11 expiry uses invalidated session because Tomcat timeouts are minute-grained (see SUGGESTION) |
| V7 | Code pattern fit | Pass | [fact] | Java records/JdbcTemplate/constructor injection; TS/TSX with strict build; existing tokens/CSS |
| V8 | Upstream basis | Pass | [fact] | Every changed module maps to proposal/spec/tasks (auth, identity migration, docs/reconciliation); no unmarked feature scope |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | local command run above (186 tests + build + static checks) |
| E2 AI | Pass | this report + `docs/feedback/verification-us-066.md` |
| E3 Human | Pending | G2 / human review not yet signed |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ accepted (in-memory sessions/demo creds/expiry proxy) |

## Findings

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Splits Living Spec Purpose still says `X-Member-Id` while code/delta use the session | [fact] | `openspec/specs/splits/spec.md` | SA fixes at archive/living-merge |
| 2 | Historical scenario names retained by OpenSpec archive rules | [fact] | `specs/app-shell`, `specs/splits` | Treat as identifiers; explain in P3 design |
| 3 | Real 1-second container expiry is not exercised; invalidated/restart session covers the same 401/re-login branch | [fact] | `SessionExpiryApiTest` | Tomcat session timeout is minute-grained; keep the equivalent test, revisit if a sub-minute timeout is required |
| 4 | Demo credentials live in the fixture/migration | [fact] | `acceptance-test-fixtures.md`, `V6` | Demo-only; never show in UI; no production claim |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | In-memory sessions are lost on backend restart | chosen Spring session design | accepted; users re-login |
| 2 | Demo-only seeded credentials | no registration story | accepted; documented as demo-only |
| 3 | Splits Purpose prose drift | pre-existing Living Spec text | tracking; SA fixes at archive |
| 4 | G2/E3 human sign-off not yet recorded | gate is human-only | pending; agent must not self-sign |

## Waiver

N/A — no waiver.
