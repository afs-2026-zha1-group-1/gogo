# Local Verify Report: us-013-view-trip-members (merged head)

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:/Documents/AI_training/Day15/GOGO/gogo-us013-merge
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

**PR gate:** no local Fail. Evidence is Partial because only the human gate
tasks (G2 re-record, merge, archive/G3) remain open by design. No Waiver.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | `docs/feedback/verification-commands.md` | 0 | no hard-coded greeting |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | same | 0 | no ORM |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | same | 0 | no H2 |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | same | 0 | no internal registry host |
| `python -c "import yaml; …"` | same | 0 | CI declares exactly backend/frontend jobs |
| `cd backend && mvn -B test` | README / project | 0 | **198/198** (TripMembersApiTest 12/12; split/auth suites included) |
| `cd frontend && npm ci && npm run build` | README / project | 0 | install + typecheck + Vite build green |

## Code-review highlights

- `TripController.members` uses `@AuthenticationPrincipal AccountPrincipal`;
  US-066 authentication is enforced by `SecurityConfig` before the method, so
  anonymous requests receive 401 `USER_REQUIRED`.
- `TripRepository.findMembers` is a single read-only join over the
  composite-key membership table; organizer is derived, never stored.
- Projection contains only `userId`, `displayName`, `organizer`; tests assert
  the absence of readiness/preference/budget/main-plan fields.
- `Members.tsx` uses the session-aware `api()` helper (cookies + CSRF), not a
  `userId` prop; loading/empty/error/denied/missing/no-trip states are present.
- The merge keeps main's `main-plan:confirm`, `mainPlanConfirmed`, V4 split
  schema and shipped `#/split` entry.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Partial | [fact] | Implementation + C1/C3/C4/C5 tasks and C2 local runs complete; G2 re-record, merge and archive/G3 remain open by design |
| V2 | Requirement coverage | Pass | [fact] | `trips` ADDED + `app-shell` MODIFIED requirements implemented |
| V3 | Scenario coverage | Pass | [fact] | S1–S10 API tests; U1–U3 + states in the browser checklist; split regression |
| V4 | Requirement↔impl mapping | Pass | [fact] | Controller/repository/DTO/page/route |
| V5 | Spec drift | Pass | [fact] | Auth and shipped split entry reflected in the amended delta |
| V6 | Design follow-through | Pass | [fact] | D1–D10 match the merged code |
| V7 | Code pattern fit | Pass | [fact] | Follows main's `AccountPrincipal` / `TestAuth` / `api()` conventions |
| V8 | Upstream basis | Pass | [fact] | Merge C1 and C1–C5 docs map every touched file |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | CI run `43834492224` on merged head `6061579`, both jobs success |
| E2 AI | Pass | this report + `docs/feedback/verification-us-013.md` |
| E3 Human | Pending | VL re-record of G2; not agent-signed |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | Partial — only human gate/archive tasks open |
| Q2 Correct? | V4–V5 | Pass |
| Q3 Coherent? | V6–V7 | Pass |
| Q4 Necessary only? | V8 | Pass |
| Q5 Risk controllable? | residual + red lines | Pass — residuals below |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Gate/archive tasks remain open (G2 re-record, merge, archive/G3) | [fact] | `tasks.md` | Human gates; not a code defect |
| 2 | `USER_REQUIRED` vs `MEMBER_REQUIRED` divergence between trips/members and split endpoints | [fact] | main `SecurityConfig` / split controller | Accepted C4; follow-up F2 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Frontend maps a bare 404 to the missing-trip state without checking `code` | [inference] | `frontend/src/pages/Members.tsx` | Optional hardening; observed 502 proxy outage renders the error state correctly |
| 2 | GitHub action deprecation notices | [fact] | CI annotations | Separate maintenance; no failure |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | G2 re-record pending | gate process | VL Leo decision on merged head |
| 2 | Empty/missing UI states unreachable from `#/members` | route carries no trip id; organizer atomic | accepted — implemented/inspected; API covers 404 |
| 3 | No durable last-opened-trip memory | OQ-2 | accepted — no-trip guidance contractual |
| 4 | Split anonymous error code differs | C4 | follow-up F2 |
| 5 | Docs-only commits after the verified code head | CI evidence cites `6061579` | code head verified; later commits are docs |

## Waiver

N/A — no waiver.
