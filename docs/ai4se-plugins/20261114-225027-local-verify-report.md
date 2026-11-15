# Local Verify Report: req-004-trip-invitations

**Date:** 2026-11-14 22:50 (timezone: UTC+08:00)
**Root:** D:\Documents\AI_training\Day15\GOGO\gogo
**Scope:** local+evidence
**Change id:** req-004-trip-invitations

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | Partial |

**PR gate:** Overall is Partial, not Fail — no Waiver required. Remote CI (E1)
and human review (E3) remain open; G2 must not be claimed until a fresh PR run
is read and the named VL decides.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `mvn -B test` (red first) | agent TDD run | 1 | 15 errors in `InvitationApiTest` (missing `trip_invitation`); 16 existing tests passed |
| `mvn -B test` (after apply) | agent TDD run | 0 | 31/31: Greeting 3, Invitation 15, Trip 13 |
| `mvn -B package -DskipTests` | agent build | 0 | jar rebuilt after stopping the stale backend process |
| `npm install qrcode && npm install -D jsqr` | corporate registry | 0 | qrcode 1.5.4 (MIT), jsqr 1.4.0 (Apache-2.0) |
| `npm run build` | agent build | 0 | vite build succeeded (267.71 kB js, 8.60 kB css) |
| `openspec validate req-004-trip-invitations --strict` | CLI 1.16.1 | 0 | "is valid" |
| `! grep -rn "hibernate\|persistence" backend/src/main backend/pom.xml` | probe whitelist | 0 | no ORM |
| `! grep -rn "expiresAt\|expiryDate\|revoked\|revoke" backend/src/main/java/com/gogo/invitation` | probe whitelist | 0 | no expiry/revocation field |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | probe whitelist | 0 | new lock entries rewritten to the public npm registry after the corporate-mirror install |
| curl scenario suite + Playwright E2E | agent runtime evidence | 0 | see `docs/feedback/verification-req-004.md` |

## Code-review highlights

- `InvitationRepository.issue` checks trip (404) then organizer (403) before the
  get-or-create select/insert, inside one transaction; token collisions retry
  once and then fail the request (D3/D4).
- `accept` resolves token, then existing membership, then the confirmation gate,
  then `INSERT OR IGNORE`; existing members report `alreadyMember=true` before
  and after closure, non-members receive 403 `JOINING_CLOSED` (D5, J6/J7).
- `preview` projects exactly five columns from a join; the record shape makes
  member/itinerary/preference leakage structurally impossible (D6).
- Identity is resolved through the existing `TripRepository.findUserId`, so the
  scaffold contract is shared with REQ-003 rather than re-implemented (D2).
- `InvitationErrorAdvice` mirrors `TripErrorAdvice` and is package-scoped to
  `com.gogo.invitation`; trip/greeting advice unchanged.
- Frontend hash router gained `#/join/<token>`; the identity switcher sets
  `X-User-Id` for every request and is labeled as a scaffold, not a login (D7/D8).
- Invitation panel and join page implement loading/failure/denied/closed/unusable
  states; the copy action now falls back when the Clipboard API rejects instead
  of failing silently; QR is a real `qrcode` canvas, not decoration (D9).
- UI was rebuilt on the `ui-design-reference` tokens and screen language; the
  known screen-02/03 component gap recorded in REQ-003 G2 is closed for the
  existing create/detail screens.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Partial | [fact] | P0–P4 done; 6.1 push/PR, 6.2 G2, 7.5 G2/G3 remain for humans/authorization |
| V2 | Requirement coverage | Pass | [fact] | 5 delta requirements implemented; 15 API tests + curl evidence |
| V3 | Scenario coverage | Pass | [fact] | I1–I5, J1–J7, U1–U2, R-1/R-2 + E2E I6/U3/S1/S2 |
| V4 | Requirement↔impl mapping | Pass | [fact] | issue→`issue`; preview→`preview`; accept→`accept`; state→`V3` + closure read |
| V5 | Spec drift | Pass | [fact] | no divergence; no product mutation path for `main_plan_confirmed` |
| V6 | Design follow-through | Pass | [fact] | D1–D11 present (DDL, package, token, get-or-create, accept order, whitelist, router, switcher, states, test-only flip, isolation) |
| V7 | Code pattern fit | Pass | [fact] | records + `JdbcTemplate` + package advice mirror the existing backend; plain React + one stylesheet |
| V8 | Upstream basis | Pass | [fact] | every changed file traces to tasks/design; REQ-003 invitation reverse assertion retired explicitly |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Partial | local command table + curl/E2E; remote CI not run (push/PR pending typed authorization) |
| E2 AI | Pass | this report + `docs/feedback/verification-req-004.md` |
| E3 Human | Pending | G2 VL decision; never agent-signed |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ⚠️ (implementation complete; CI/gate tasks open) |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ✅ (accepted scaffold risks retained) |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Remote CI not run; E1 Partial until a fresh PR run is read with gh | [fact] | tasks 6.1 | push + PR with typed authorization, then pipeline report |
| 2 | G2/G3, README/registry and archive remain open | [fact] | tasks 6.2–6.3, 7.5 | human gate after CI; stop before G2 signature |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `jsqr` 1.4.0 is Apache-2.0, not MIT as the plan text said | [fact] | frontend/package.json | dev-only, permissive; recorded in the verification doc |
| 2 | Automated clipboard read is denied by the test browser | [fact] | InvitationPanel | copy falls back to selection + `execCommand`; handler argument verified by patching `writeText` |
| 3 | REQ-003 test titled "no … invitation routes" retired | [fact] | TripApiTest | route now exists by design; edit/delete/list reverse checks retained |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | `X-User-Id` trusted without verification | scaffold by G1 ruling | accepted; controlled demo only, never a security control |
| 2 | Preview exposes destination and dates before acceptance | OQ-2 user ruling | five-field whitelist; no members/itinerary/preferences |
| 3 | `main_plan_confirmed` has no product mutation path until US-037 | OQ-1 staged delivery | test-only flip documented; R-1 asserts no route |
| 4 | Hash URL carries `#` | D7 router decision | QR equality proven against the composed hash URL |

## Waiver

N/A — no waiver (Overall is Partial, not Fail).
