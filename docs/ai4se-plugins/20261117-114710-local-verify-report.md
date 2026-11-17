# Local Verify Report: us-082-back-navigation

**Date:** 2026-11-17 (timezone: Asia/Shanghai, +08:00)
**Root:** D:/Documents/AI_training/Day15/GOGO/gogo
**Scope:** local+evidence
**Change id:** us-082-back-navigation

## Summary

| Dimension | Status |
|---|---|
| Build | Pass |
| Static scan | Pass (5 required + 1 stale probe N/A) |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** PR #107 (`CLEAN` / `MERGEABLE`), CI Backend tests + Frontend build green (runs 44012217311 and 44012221844).

## Local commands

| Command | Source | Exit | Summary |
|---|---|---|---|
| Static reverse checks S1–S5 | `docs/feedback/verification-commands.md` | 0 | 5/5 pass: no hard-coded greeting, no ORM/H2, no internal registry host, CI jobs = backend/frontend |
| Static CI-trigger probe S6 | `docs/feedback/verification-commands.md` | n/a | **N/A (stale probe)**: `.github/workflows/ci.yml` intentionally pushes on all branches and targets `main` only for `pull_request`; this PR does not change CI config |
| `cd backend && mvn -B test` | Runtime | 0 | **279/279** tests pass (19.5s) |
| `cd frontend && npm ci && npm run build` | Runtime | 0 | Clean install, 0 vulnerabilities, `tsc` + vite build green |
| `openspec validate us-082-back-navigation --strict` | OpenSpec | 0 | valid (1 MODIFIED + 2 ADDED / 14 scenarios) |
| Browser E2E | `docs/feedback/e2e-us-082.md` | — | J1/S1/S2/S3/M1/A1/A3/A4 Pass; A2 Not run; D1/D2 Blocked on US-071 |

## Code-review highlights

- Backend: `JoinResult` gains an additive `tripId`; both `InvitationRepository.accept` paths pass the resolved trip id; `InvitationApiTest` asserts it. No new endpoint, migration or dependency.
- Frontend: `Join` keeps the accepted trip id and renders 进入行程 → `#/trips/<id>`; split start and main-plan appbars return to trip details; `RequireAuth` carries `?next=`; `LoginPage` resumes only single-slash same-origin paths and rejects `/login`/`/register` self-targets; auth pages link through `/login` and `/register`.
- No secrets, no `dangerouslySetInnerHTML`, no new URL sink; the only new URL handling is validated by `new URL` plus an origin check.
- Two router spaces (BrowserRouter shell + App hash router) are handled without importing Router hooks into the shared login page.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|---|---|---|---|---|
| V1 | Task completion | Pass | [fact] | P3/P4 tasks complete; P5 tasks remain (archive/G3/tech-stack) |
| V2 | Requirement coverage | Pass | [fact] | Delta 1 MODIFIED + 2 ADDED implemented; AC2/AC3 explicitly owned by US-071 |
| V3 | Scenario coverage | Pass | [fact] | 14 delta scenarios mapped; 8 browser rows Pass, 1 Not run, 2 dependency Blocked |
| V4 | Requirement↔impl mapping | Pass | [fact] | Each delta requirement maps to a frontend file plus `InvitationApiTest` for `tripId` |
| V5 | Spec drift | Pass | [fact] | MODIFIED Guest join exclusion re-synced to the archived US-068-070 Living text |
| V6 | Design follow-through | Pass | [fact] | D1–D6 implemented: explicit targets, `?next=`, tripId, auth route unification |
| V7 | Code pattern fit | Pass | [fact] | Existing React/hash split, `window.location` and `URLSearchParams`, backend record style |
| V8 | Upstream basis | Pass | [fact] | Every change traces to issue #105 / US-082 AC; no unrelated edits |

## Evidence slots

| Slot | Status | Source |
|---|---|---|
| E1 Machine | Pass | `mvn -B test` 279/279, clean frontend install/build, 5/5 static checks, CI green |
| E2 AI | Pass | This report + `dov-ac-review.md` + `cross-change-scan.md` + `e2e-us-082.md` |
| E3 Human | Pass | G2 recorded by VL Johnson (2026-11-17) |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---|---|---|---|
| 1 | A2 (pending invitation precedence) not browser-tested on the shared 8080 backend; logout there failed | [fact] | `docs/feedback/e2e-us-082.md` | Re-run in an isolated environment before G3 if the human gate requires it |
| 2 | US-071 dependency rows (members/create back) remain Blocked | [fact] | `project-gogo` board / US-071 | Regress after US-071 merges; do not mark Pass early |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---|---|---|---|
| 1 | Static CI-trigger probe S6 is stale relative to the current workflow | [fact] | `docs/feedback/verification-commands.md` | Update the probe separately; not a US-082 defect |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|---|---|---|
| 1 | A2 browser evidence absent | Shared 8080 backend had a logout failure | Code path unchanged; isolated re-run before G3 if required |
| 2 | US-071 not merged | Active change | Rows stay Blocked; regress after merge |
| 3 | 8080/5173 belong to another checkout | Shared local machine | Branch backend ran on 8081 with its own proxy; 8080/5173 untouched |

## Five-question map

| Q | Maps to | Status |
|---|---|---|
| Q1 Complete? | V1–V3 | ✅ (P3/P4 scope; P5 remains) |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | Residual risks | ✅ with tracking items |
