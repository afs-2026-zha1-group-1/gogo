# G2 decision — req-004-trip-invitations

- Change id: `req-004-trip-invitations`
- Gate: G2 (Verify)
- Status: **NOT RECORDED** — local verification is complete, but the remote CI
  run and the named VL decision are outstanding. This file is not evidence that
  G2 passed.

## Inputs

- Local-verify report: `docs/ai4se-plugins/20261114-225027-local-verify-report.md`
  — Build Pass, Static scan Pass, Code review Pass, Evidence Partial (remote CI
  and human decision pending); Overall Partial, no Waiver needed.
- Runtime evidence: `docs/feedback/verification-req-004.md` — `mvn test` 31/31
  (Greeting 3, Invitation 15, Trip 13); curl matrix I1–I5, J1–J7, U1–U2, R-1,
  R-2 all match the fixtures; browser E2E S1/I6/S2/U3 and the organizer-denial
  panel pass.
- Red-first evidence: before implementation `InvitationApiTest` failed 15/15 on
  the missing `trip_invitation` table while the 16 existing tests passed.
- G1 record: `g1-decision.md` — Pass (IO Emily + SA Johnson, 2026-11-14).
- Delta specs: `specs/invitations/spec.md` (4 requirements, 15 scenarios) and
  `specs/trips/spec.md` (1 requirement, 3 scenarios);
  `openspec validate --strict` valid.
- Tasks: `tasks.md` — P0–P5 tasks complete except 6.1 (push/PR + CI) and 6.2
  (G2/G3/archive), which require human authorization.
- CI: **not run for this change.** The branch is local/stacked and has not been
  pushed; E1 stays Partial until a fresh PR run is read with `gh`.

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | `mvn test` 31/31, `mvn package -DskipTests`, `npm run build` |
| Static scan | Pass | no ORM, no expiry/revocation field, strict validate valid |
| Code review | Pass | local-verify highlights; no CRITICAL findings |
| Evidence V1–V8 | V1 Partial (gate tasks open); V2–V8 Pass | local-verify evidence table |
| E1 machine | **Partial** | local commands only; remote CI pending push/PR |
| E2 AI | Pass | local-verify report + verification doc |
| E3 human | Pending | this draft awaits the VL |

## Defect grades

- CRITICAL: none.
- WARNING: 2 — remote CI not run (E1 Partial); G2/G3, README/registry and archive
  were open while the report was authored (README/registry now updated, gates
  remain open by design).
- SUGGESTION: 3 — `jsqr` 1.4.0 is Apache-2.0 (plan text said MIT); automated
  clipboard read is denied by the test browser (copy handler argument verified
  by patching `writeText`); REQ-003's "no invitation route" reverse assertion
  was retired because this change owns the route.

## Decision

- Decision: **PENDING** — to be supplied by the named VL: `Pass`, `Fail`, or
  `Conditional`.
- Conditions + owners: to be supplied; Conditional without remediation items and
  owners is invalid.
- Approvers: **VL = Johnson (pending)**. The user designated Johnson as VL; the
  G1 IO/SA signatures are not inherited by G2. The same person covers SA and VL,
  so the concentration must be stated explicitly when signing.
- Known deviation accepted upstream: `main_plan_confirmed` has no product
  mutation path until US-037; J4/E2E use the documented test-only database flip.

## What recording G2 requires

1. Typed authorization to push the branch / open the PR (git writes are not
   implied by the G1 or P4 approval).
2. A fresh CI run read with `gh` and written into a pipeline report.
3. The named VL's explicit verdict (typed statement or recorded session answer).
4. Acknowledgement of the remaining post-G2 work: archive via `/sdd:living-merge`
   after REQ-003, G3, and the follow-ups listed above.

## Next

On Pass → P5 (`/sdd:living-merge`, change summary, G3). On Fail → return to
apply with named defects.
