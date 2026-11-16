# Local Verify Report: us-031-037-main-itinerary

**Date:** 2026-11-16 (timezone: +0800)
**Root:** d:\Bootcamp Training\Trip\gogo
**Scope:** local+evidence
**Change id:** us-031-037-main-itinerary

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | Partial |

**PR gate:** Fail blocks `/sdd:pr-submit` unless Waiver below is complete.
Agents must not self-approve Waiver. Overall is Partial (not Fail): no waiver
required; remote CI run and E3 human sign-off are pending the user's separate
push/PR authorization (task 7.1), matching the REQ-002 precedent.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | docs/feedback/verification-commands.md | 0 | no hard-coded greeting |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | same | 0 | no ORM dependency |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | same | 0 | no H2 anywhere |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | same | 0 | no internal registry host |
| `python -c "...ci.yml jobs..."` | same | 0 | ci jobs: ['backend', 'frontend'] |
| `(cd backend && mvn -B test)` | same (runtime) | 0 | Tests run: 90, Failures: 0, Errors: 0; BUILD SUCCESS (Maven 3.9.16 via PATH prepend; PATH default 3.5.4 too old) |
| `(cd frontend && npm ci && npm run build)` | same (runtime) | 127 → 0 on retry | first run EPERM unlink rolldown binding held by leftover vite PID 42164/npm PID 27516; stopped per whitelist doc; retry: 49 packages, found 0 vulnerabilities, 53 modules, built in 285ms |
| `(cd backend && python -c "...sqlite inspection...")` | same (system, cwd-adapted) | 0 | rows [(1, 'Hello World')], count 1, SQLite schema, flyway V1/V2/V3/V5 all success=1 (V4 reserved for REQ-019) |
| `curl -s -i http://localhost:8080/api/greeting` | same (system) | 0 | HTTP/1.1 200, JSON body |
| `curl ... -X POST /api/greeting` | same | 0 | POST=405 |
| `curl ... -X PUT /api/greeting` | same | 0 | PUT=405 |
| `curl ... -X DELETE /api/greeting` | same | 0 | DELETE=405 |

Runner logs: `docs/ai4se-plugins/20261116-003508-local-verify-run.log`,
`docs/ai4se-plugins/20261116-003703-local-verify-run.log`. Destructive system
steps (`rm -rf data`, kill/restart) were not re-run; fresh-start (V1–V5 applied
to a new file) and restart-persistence evidence come from tasks 6.1 and ST-3
(backend restarted from the same jar, state preserved, endpoint re-verified).
Runtime acceptance beyond the whitelist: 65/65 curl matrix
(`docs/feedback/us-031-037-matrix-run.log`) and 8 browser E2E rounds
(`docs/feedback/verification-us-031-037.md`, 25 screenshots in `frontend/logs/`).

## Code-review highlights

- Gate order and reused error codes match design D2/D8/D10; confirm reuses the
  read projection so generate/read/confirm share one wire shape [fact]
- `@Transactional` confirm flips draft status and trip flag atomically; matrix
  V1/V7 show no partial state on success or rejection [fact]
- ScheduleValidator: travel-fit equality passes, day window 0–1439, unparseable
  times skip pairing; all five types unit-tested red-first (11 tests) [fact]
- Frontend adds no dependency; hash routes match before the generic trip route;
  both surfaces implement loading/empty/failure/permission states; 422 renders
  both error lists [fact]
- Red-first honored: MainPlanApiTest 34 tests / 32 failures at task 1.5 before
  production code; no test deleted or weakened to go green [fact]
- Necessity: every changed file traces to tasks 1–6 or 7.3 (mainplan package
  15 main + 5 test files, V5 migration, App/api/css, two pages, docs); no
  scope creep [fact]

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | tasks 1–6 + 7.3 checked with observed evidence; open 7.1/7.2/8.5 are human-gated (push/PR authorization, G2/G3 sign-off), not agent-completable |
| V2 | Requirement coverage | Pass | [fact] | 7 delta requirements implemented in MainPlanService/Controller/Repository + LocationCompletion/ScheduleValidator/BudgetOverruns; API tests + matrix cover each |
| V3 | Scenario coverage | Pass | [fact] | 24 delta scenarios → MainPlanApiTest 34 tests, 65 matrix checks, 22 E2E rows; ST-1 loading-skeleton capture gap recorded as Partial in the E2E verification report (handling exists in code; transition observed) |
| V4 | Requirement↔impl mapping | Pass | [fact] | gate order, statuses (201/200/404/403/409/422), wire fields verified by matrix fragments and browser observations |
| V5 | Spec drift | Pass | [fact] | no divergence; membership gate before organizer added per spec (tasks 4.3); S10-4 closed UI via preview flag is existing REQ-004 Join behavior, 403 path covered by matrix J4 |
| V6 | Design follow-through | Pass | [fact] | D1 V5 schema/stand-in, D3 fake provider fixtures, D4 supersession, D5 preferences-first completion, D6 stale computation, D7 inputs aggregation, D8/D9/D10 validation+errors, D11 frontend contract all present in code |
| V7 | Code pattern fit | Pass | [fact] | mainplan package mirrors trip/invitation layout (Controller/Service/Repository/ApiException/ErrorAdvice + records); frontend pages follow existing jsx/CSS variable norms |
| V8 | Upstream basis | Pass | [fact] | diff vs b6b93f5 limited to mainplan package, V5, App/api/css, two pages, change docs and 7.3 doc rows; each maps to a task |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Partial | local command table + matrix + E2E; no remote CI run for this change yet (PR not opened; task 7.1 pending authorization) |
| E2 AI | Pass | this report + `docs/feedback/verification-us-031-037.md` |
| E3 Human | Pending | G2 VL sign-off after PR/CI; never agent-signed |

## Five-question map (when evidence in scope)

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ (ST-1 capture gap, fake provider/stand-in until REQ-019, E3 pending) |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | none | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | ST-1 loading skeleton not capturable against the local backend; E2E row marked Partial, never asserted Pass | [fact] | docs/feedback/verification-us-031-037.md ST-1 | accept as recorded observation, or capture later with network throttling |
| 2 | No remote CI run for this change yet; E1 local-only until push/PR authorized | [fact] | task 7.1 | run `/sdd:pipeline-report` after the authorized PR |
| 3 | Corrupted stored preference payload fails fast with 500 (observed via harness-induced bad JSON); fixtures always store valid JSON | [fact] | MainPlanService budget read | REQ-019 owns preference write validation; keep fail-fast until then |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Mockito self-attach warning on Java 21 | [fact] | mvn test output | add Mockito as a java agent in a future build change |
| 2 | `frontend/logs/st1-loading.png` shows the ready state, not a skeleton (misnamed) | [fact] | frontend/logs/ | annotated in the verification report; rename if reused |
| 3 | Browser screenshot tool timeouts left 3 rows without screenshots (B-1 empty, B-5, S10-3); recorded observations + SQL/matrix cross-evidence used | [fact] | verification report deviations | retake when the tool recovers |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Loading-state visual evidence missing (ST-1) | local responses too fast to capture | code branch + observed transition + failure-state proof; tracking |
| 2 | Fake provider and read-only preference stand-in | declared non-goals until REQ-019 merges (F1 write-sync alignment, merge order V4 first) | accepted; G1 C2 ruling |
| 3 | E3 human sign-off and remote CI pending | push/PR requires separate typed authorization | tracking; G2 after CI |
| 4 | Destructive whitelist system re-run skipped | harness safety rule forbids rm via command | fresh-start/restart evidence from 6.1/ST-3; accepted |

## Waiver

N/A — no waiver (Overall Partial, not Fail).

**Agent must not self-approve this section.** Incomplete rows ≡ no waiver.