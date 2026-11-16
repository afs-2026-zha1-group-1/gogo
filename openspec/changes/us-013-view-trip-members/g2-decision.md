# G2 decision — us-013-view-trip-members

- Change id: `us-013-view-trip-members`
- Gate: G2 (Verify)
- Status: **PENDING — NOT RECORDED**
- This is a sign-off sheet, not a gate decision. G2 is recorded only after the
  named VL supplies a decision below. The agent records the human statement; it
  does not approve the gate itself.

## Inputs

| Input | Path / value |
|---|---|
| G1 record | `g1-decision.md` — Pass by IO Emily + SA Johnson (2026-11-16); G1 signatures are **not** inherited by G2 |
| Delta specs | `specs/trips/spec.md` (ADDED, 8 scenarios) + `specs/app-shell/spec.md` (MODIFIED, 3 scenarios); `openspec validate` valid |
| Local verify | `docs/ai4se-plugins/20261116-144729-local-verify-report.md` — Build Pass, Static Pass, Code review Pass, Evidence Partial (gate/archive tasks open by design); Overall **Partial**, no Waiver |
| Verification evidence | `docs/feedback/verification-us-013.md` — `mvn test` 101/101 (new 11/11), `npm run build` green, API matrix M1–M10, browser U1–U3 + loading/error/retry |
| E2E checklist | `docs/feedback/e2e-us-013.md` |
| CI | run `43818961221`, head `077e762`, event `push`, **both jobs success**; `ci-report.md` and `docs/ai4se-plugins/20261116-144618-pipeline-report.md` |
| Tasks | `tasks.md` — implementation and CI tasks 0–6.2 checked; 6.3 G2, 7.x archive reconciliation, 8.x human gates open |
| Story | GitHub issue #9 |

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | `mvn -B test` 101/101; `npm run build` green |
| Static scan | Pass | whitelist 5/5 exit 0; no ORM/H2/internal registry/hard-coded greeting |
| Code review | Pass | endpoint reuses identity/access; read-only join; projection excludes personal fields; no new dependency |
| Evidence V1–V8 | V1 Partial (gate tasks open); V2–V8 Pass | local-verify report |
| E1 machine | Pass | CI run `43818961221`, both jobs success on head `077e762` |
| E2 AI | Pass | local-verify + verification documents |
| E3 human | Pending | this G2 sheet |

## Residual concerns for the VL

1. Empty-roster and missing-trip **UI** states are not reachable from
   `#/members` (the route carries no trip id; the organizer is inserted
   atomically). Both states are implemented and inspected; API M6 covers the
   404 contract.
2. CI trigger was broadened to all branch pushes by user instruction
   2026-11-16. Job contents are unchanged; the branch produces its own run
   without a main PR (R37).
3. The frontend maps a bare 404 to the missing-trip state without checking
   `code`; the observed Vite proxy outage returned 502 and correctly rendered
   the error state. Optional hardening, not a blocker.
4. Stack plan AntD/TanStack is not adopted; the merged frontend uses token CSS
   + plain fetch (R35, separate migration).
5. No durable last-opened-trip memory; the no-trip guidance state is
   contractual (R33).

## Sign-off

Fill the row in place and commit this file to
`US-013-view-trip-members-planning`, or reply with the exact verdict and
evidence so the agent can record it.

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| VL | Elian Jiang | _(pending)_ | | | |

## Recording rules

1. G2 requires a **named VL** decision. G1's IO/SA signatures do not carry over.
2. A Conditional decision is invalid without remediation items and owners.
3. After the row is filled, the agent validates the record, changes the status
   to **RECORDED — Pass / Conditional / Fail**, and cites the exact evidence.
4. Until then G2 is **not closed**; merge and archive must not start.
