# Local Verify Report: ai-main-plan-generation

**Date:** 2026-11-18 (timezone: +0800)
**Root:** C:\Users\JIANGEL5\code\bootcamp\GoGo
**Scope:** local+evidence
**Change id:** ai-main-plan-generation

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | **Partial** |

**PR gate:** Overall is Partial, not Fail; no Waiver is required. Residual items
(real key run, E3/R-E1 E2E) are recorded below. Push/PR still requires explicit
user authorization.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | verification-commands.md | 0 | Pass |
| `! grep -inE "jpa|hibernate" backend/pom.xml` | verification-commands.md | 0 | Pass |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | verification-commands.md | 0 | Pass |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | verification-commands.md | 0 | Pass |
| CI jobs YAML check | verification-commands.md | 0 | backend / browser-acceptance / frontend |
| CI triggers YAML check | verification-commands.md | 0 | any-branch push + PR to main |
| `mvn -B test` (backend) | runtime | 0 | **398/398** |
| `npm run typecheck` | runtime | 0 | Pass |
| `npm run test:unit` | runtime | 0 | **45/45** |
| `npm run build` | runtime | 0 | Vite build green |

Note: `npm ci` could not run because an existing dev server holds
`node_modules` native files (`EPERM`). `npm install --no-save @playwright/test`
restored the missing type-only dependency; `package.json`/lockfile unchanged.

## Code-review highlights

- Provider seam stays single: `MainPlanProviderConfig` returns either
  `AiMainPlanProvider` or `FakeMainPlanProvider`; `FakeMainPlanProvider` lost
  `@Component`, so no bean ambiguity.
- Fallback boundary is only the provider call: `AiMainPlanProvider` catches
  `PlanAiException` and returns `MinimalFallbackPlan`; DB/persistence errors are
  not swallowed.
- Secret handling: key only in the `Authorization` header from
  `PlanAiProperties`; logs contain only the failure reason; prompt content is
  member data, never the key.
- Output is validated before persistence (`AiPlanValidator`), including `seq`,
  `HH:mm`, ordering, legs and nonnegative cost.
- HTTP client uses one attempt, 5s connect / 20s read, JSON-object mode, no
  thinking field, `max_tokens` 4096.
- No API, database, auth or splits contract changes. No new dependencies.
- Frontend notice is non-blocking (`role="status"`, `aria-live="polite"`), shown
  only while generate/regenerate is in flight; confirm is unaffected.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | **Partial** | [fact] | 30/32 implementation tasks done; 6.2 (real key run) and 6.4 (E3/R-E1 E2E) open |
| V2 | Requirement coverage | Pass | [fact] | AI success, validation, minimal fallback, no-key fixture, notice all implemented |
| V3 | Scenario coverage | Pass | [fact] | `AiMainPlanApiTest` A1–A4/A6–A8; E2E E1/E2/E4; existing G1/G2/G5/G6 green |
| V4 | Requirement↔impl mapping | Pass | [fact] | Provider config/validator/fallback/notice map to the MODIFIED requirement |
| V5 | Spec drift | Pass | [fact] | Delta unchanged; known `X-User-Id` wording is pre-existing (G1 lint WARNING) |
| V6 | Design follow-through | Pass | [fact] | D1–D8 all landed; Zhipu parameters match D1/D7 |
| V7 | Code pattern fit | Pass | [fact] | Package-local classes, constructor injection, records, warning-only logging |
| V8 | Necessity (anti-creep) | Pass | [fact] | Diff limited to provider path, config, two frontend pages, tests and docs |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Partial | Local commands pass; no PR/CI run yet |
| E2 AI | Pass | This report + unit/API/E2E evidence |
| E3 Human | Pending | Not signed; G2 is a later gate |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ⚠️ 6.2/6.4 open (model quota blocked; E3/R-E1 E2E) |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ model quality/quota untested |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | None | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Real Zhipu call not successful through the app | [fact] | tasks 6.2 | `deepseek-v4.1-flash` works directly (HTTP 200, ~2s) with the user-env key; the Java call still hits the local TLS revocation/outbound restriction (`TIMEOUT`). Re-run in a network that can complete TLS validation; fallback protects the demo. Model/timeout now `deepseek-v4.1-flash` / 30s / 8192 tokens |
| 2 | E3 (failure notice closure) and R-E1 not run in browser | [inference] | docs/feedback/e2e-us-031-ai.md | E3 is covered by `finally` + inline error code path; re-run when a non-confirmed fixture is available |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Notice may flash in the no-key fast path | [inference] | AiGeneratingNotice | Use a real key or throttled stub for demo; do not add artificial delay to production |
| 2 | `npm ci` blocked by a running dev server | [fact] | frontend | Stop the Vite process before clean install in CI/local verify |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Model output quality / quota unknown | No real key | P4 follow-up run; fallback protects the demo |
| 2 | Fallback is silent and only two stops | Accepted product decision | Documented in g1-decision residual notes |
| 3 | AI stop count has no upper bound | Spec only sets a minimum | Confirmation validation bounds feasibility; future cap if needed |

## Waiver

N/A — no waiver (Overall Partial, not Fail).

## PR gate statement

Overall **Partial**. `pr-submit` may proceed with the residuals above, but the
agent must not push or open a PR without explicit user authorization.
