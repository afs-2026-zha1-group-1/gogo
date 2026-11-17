# Local Verify Report: us-013-view-trip-members

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:/Documents/AI_training/Day15/GOGO/gogo
**Scope:** local+evidence
**Change id:** us-013-view-trip-members

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | Partial |

**PR gate:** no local Fail. Evidence is Partial because the gate/pipeline tasks
(6.3 G2, 7.x archive reconciliation, 8.x human gates) remain open by design.
No Waiver is needed or claimed.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | `docs/feedback/verification-commands.md` | 0 | no hard-coded greeting |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | same | 0 | no ORM |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | same | 0 | no H2 |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | same | 0 | no internal registry host |
| `python -c "import yaml; …"` | same | 0 | CI declares exactly backend/frontend jobs |
| `cd backend && mvn -B test` | README / project | 0 | **101/101** tests (new class 11/11) |
| `cd frontend && npm run build` | README / project | 0 | `tsc -b && vite build` green |

`npm ci` was not run locally because the Vite dev server on 5173 holds the
Rollup native binding open (documented Windows limitation in
`verification-commands.md`); the CI frontend job ran `npm ci` successfully on
the same lockfile.

## Code-review highlights

- The endpoint reuses `TripController.caller()` and `TripRepository.isMember`,
  keeping the `trips` 401/404/403 order consistent with the detail read.
- `findMembers` is a single read-only join over the composite-key membership
  table; the organizer flag is derived, never stored.
- The projection contains only `userId`, `displayName`, `organizer`; the test
  asserts the absence of readiness/preference/budget/main-plan fields.
- The frontend page implements loading, empty, error, permission-denied,
  missing-trip and no-trip states; the roster intentionally omits the
  readiness ring, preference summaries and the generate action.
- No new dependency, no migration, no write path.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Partial | [fact] | Implementation tasks 0–5 and CI tasks 6.1/6.2 checked; 6.3 G2, 7.x archive and 8.x human gates open by design |
| V2 | Requirement coverage | Pass | [fact] | `trips` ADDED requirement + `app-shell` MODIFIED requirement both implemented |
| V3 | Scenario coverage | Pass | [fact] | S1–S10 API tests; U1–U3 + states in the browser checklist/report |
| V4 | Requirement↔impl mapping | Pass | [fact] | Endpoint, DTO, repository query, `Members.tsx`, `App.tsx` route |
| V5 | Spec drift | Pass | [fact] | No readiness/preference/generate surface; placeholder supersession recorded |
| V6 | Design follow-through | Pass | [fact] | D1–D10 match the code; D8/D9 deviations documented |
| V7 | Code pattern fit | Pass | [fact] | Follows `TripController` / `TripDetails` / `MainPlanInputs` patterns |
| V8 | Upstream basis | Pass | [fact] | Every changed file maps to the proposal/spec/tasks; CI trigger change (R37) is user-instructed |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | CI run `43818961221` (head `077e762`), both jobs success; `ci-report.md` |
| E2 AI | Pass | this report + `docs/feedback/verification-us-013.md` |
| E3 Human | Pending | G2 by VL Elian Jiang; not agent-signed |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | Partial — implementation complete, gate/archive tasks open |
| Q2 Correct? | V4–V5 | Pass |
| Q3 Coherent? | V6–V7 | Pass |
| Q4 Necessary only? | V8 | Pass |
| Q5 Risk controllable? | residual + red lines | Pass — residuals listed below |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Gate/archive tasks remain open (G2, 7.x, 8.x) | [fact] | `tasks.md` | Close at P5; not a code defect |
| 2 | CI trigger now runs on every branch push | [fact] | `.github/workflows/ci.yml` | User-instructed 2026-11-16; monitor runner usage |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Frontend maps a bare 404 to the missing-trip state without checking `code` | [inference] | `frontend/src/pages/Members.tsx` | Optional hardening: require `code === TRIP_NOT_FOUND`; current Vite proxy returns 502, so the error state is correct in observed runs |
| 2 | GitHub action deprecation notices (Node 20, setup-java v4) | [fact] | CI annotations | Separate maintenance; no failure |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | G2 by VL pending | gate process | tracking — human decision |
| 2 | Empty roster and missing-trip UI states are not reachable from `#/members` | route carries no trip id; organizer inserted atomically | accepted — states implemented and inspected; API M6 covers 404 |
| 3 | No durable last-opened-trip memory | OQ-2 deferred to P3 choice | accepted — no-trip guidance is contractual |
| 4 | Stack plan AntD/TanStack not adopted | merged frontend uses token CSS + plain fetch | accepted — separate migration (US-065/US-066) |

## Waiver

N/A — no waiver.
