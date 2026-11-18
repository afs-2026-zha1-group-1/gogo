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
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** Pass. `/sdd:pr-submit` may proceed, but push/PR still requires the
user's explicit authorization. No Waiver.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | verification-commands.md | 0 | Pass |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | verification-commands.md | 0 | Pass |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | verification-commands.md | 0 | Pass |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | verification-commands.md | 0 | Pass |
| CI jobs YAML check | verification-commands.md | 0 | backend / browser-acceptance / frontend |
| CI triggers YAML check | verification-commands.md | 0 | any-branch push + PR to main |
| `mvn -B test` (backend) | runtime | 0 | **398/398** |
| `npm run typecheck` | runtime | 0 | Pass |
| `npm run test:unit` | runtime | 0 | **45/45** |
| `npm run build` | runtime | 0 | Vite build green |

Test isolation note: `MainPlanApiTest` pins `gogo.plan.ai.api-key=` empty so a
locally exported `LLM_API_KEY` can never turn the fixture suite into network
calls; the AI API suite supplies its own stub client.

## Code-review highlights

- Provider seam: `MainPlanProviderConfig` returns `AiMainPlanProvider` when the
  key is present, otherwise `FakeMainPlanProvider`; only one provider bean.
- DeepSeek gateway: one `RestClient` call to the internal
  `llm-gateway-alicloud` endpoint, bearer `LLM_API_KEY`, JSON-object mode,
  `max_tokens` 8192, 5s connect / 30s read, single attempt.
- Fallback boundary is the provider call only: `PlanAiException` (timeout, HTTP,
  empty, invalid output) → `MinimalFallbackPlan` (start/end two stops, cost 0);
  DB errors are not swallowed.
- Output contract: `AiPlanValidator` checks ≥2 stops, contiguous `seq`,
  `HH:mm`, end > start, legs, nonnegative cost before persistence.
- Security: the key never enters prompts or logs; the prompt carries member
  data only and the system message declares it as data.
- Frontend: `AiGeneratingNotice` is a non-blocking `role="status"` strip shown
  only while generate/regenerate is in flight; confirm is unaffected.
- No API, database, auth or splits contract changes; no new dependency.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 32/32 implementation tasks done; only PR/CI/archive tasks remain |
| V2 | Requirement coverage | Pass | [fact] | AI success, validation, two-stop fallback, no-key fixture, notice all implemented |
| V3 | Scenario coverage | Pass | [fact] | `AiMainPlanApiTest` A1–A4/A6–A8; E2E E1–E4 + R-E1; existing G1/G2/G5/G6 green |
| V4 | Requirement↔impl mapping | Pass | [fact] | Config/validator/fallback/notice map to the MODIFIED requirement |
| V5 | Spec drift | Pass | [fact] | Delta unchanged; known `X-User-Id` wording is pre-existing (G1 lint WARNING) |
| V6 | Design follow-through | Pass | [fact] | D1–D8 landed; DeepSeek gateway parameters match D1/D7 |
| V7 | Code pattern fit | Pass | [fact] | Package-local classes, constructor injection, records, reason-only logging |
| V8 | Necessity (anti-creep) | Pass | [fact] | Diff limited to provider path, config, two frontend pages, tests and docs |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | Local commands + build/test runs (CI still pending) |
| E2 AI | Pass | This report + unit/API/E2E evidence |
| E3 Human | Pending | G2 is a later gate; not signed here |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ✅ fallback + confirmation gates |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | None | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | None | — | — | — |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `npm ci` needs the dev server stopped on Windows | [fact] | frontend | Stop Vite before clean install |
| 2 | Notice may flash in the no-key fast path | [inference] | AiGeneratingNotice | Use a real key/keyword for demo; no artificial delay |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Fallback is silent and only two stops | Accepted product decision | Documented in g1-decision residual notes |
| 2 | AI stop count has no upper bound | Spec only sets a minimum | Confirmation validation bounds feasibility; cap later if needed |
| 3 | PR/CI not yet run | Waiting for user authorization | Run `/sdd:pr-submit` + CI, then G2 |

## Waiver

N/A — no waiver (Overall Pass).

## PR gate statement

Overall **Pass**. `pr-submit` may proceed after explicit user authorization;
no push or PR has been performed by this report.
