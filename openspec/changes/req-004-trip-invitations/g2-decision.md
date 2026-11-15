# G2 decision — req-004-trip-invitations

- Change id: `req-004-trip-invitations`
- Gate: G2 (Verify)
- Decision: **Pass**
- Approvers: **VL = Elian Jiang**. Explicit in-session choice on 2026-11-15:
  sign under the name Elian Jiang, verdict Pass (recorded session answer).
  The draft had designated Johnson as VL; the user chose Elian Jiang instead,
  consistent with the REQ-003 G2 sign-off. Elian Jiang holds no other role on
  this change (G1: IO Emily, SA Johnson), so there is no role concentration to
  declare. The implementing agent recorded the decision and did not self-approve.
- Timestamp: decision recorded 2026-11-15 14:02 (UTC+08:00). The prior unsigned
  draft (2026-11-14) is superseded by this record.

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
- Tasks: `tasks.md` — P0–P4 tasks complete; 6.2 (G2/G3/archive) remains open
  pending human decisions.
- CI: **Pass.** PR #31, run 43608236232, event `pull_request`, head SHA
  `91dca1938b9c97a21c6dd91a551f8dae9990abba` equal to the branch head; Backend
  tests and Frontend build both success.
  `docs/ai4se-plugins/20261114-230558-pipeline-report.md` and `ci-report.md`.
  Re-checked 2026-11-15 via `gh pr view 31`: current head `d4f67f0` (docs-only
  pipeline-report commit on top of `91dca19`), Backend tests and Frontend build
  both COMPLETED / SUCCESS.
- VL evidence walkthrough on 2026-11-15 (running app, backend 8080 / frontend
  5173, presented to the VL before signing): organizer Alice's trip surface
  shows the invitation panel with QR canvas, join URL and copy action; Eve's
  join preview shows only public fields; accept → joined; re-accept →
  `{"joined":true,"alreadyMember":true}`; Eve then reads the full trip details
  as a member; the panel shows the non-organizer denial for Eve; curl checks:
  unknown token → `INVITATION_NOT_FOUND` with no trip values, non-organizer
  issuance → `NOT_ORGANIZER`.

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | `mvn test` 31/31, `mvn package -DskipTests`, `npm run build` |
| Static scan | Pass | no ORM, no expiry/revocation field, strict validate valid |
| Code review | Pass | local-verify highlights; no CRITICAL findings |
| Evidence V1–V8 | V1 Partial (gate tasks open); V2–V8 Pass | local-verify evidence table |
| E1 machine | Pass | pipeline report, fresh PR run 43608236232 on head `91dca19` |
| E2 AI | Pass | local-verify report + verification doc |
| E3 human | Signed | VL Elian Jiang, 2026-11-15 (this record) |

## Defect grades

- CRITICAL: none.
- WARNING: 1 — G2/G3 and archive remain open by design pending the VL.
- SUGGESTION: 3 — `jsqr` 1.4.0 is Apache-2.0 (plan text said MIT); automated
  clipboard read is denied by the test browser (copy handler argument verified
  by patching `writeText`); REQ-003's "no invitation route" reverse assertion
  was retired because this change owns the route.

## Decision

- Decision: **Pass** (VL Elian Jiang, 2026-11-15, recorded session answer).
- Waivers / conditions + owners: no waiver; no G2 condition imposed. The VL
  acknowledged the remaining post-G2 work as follow-ups, not gate conditions:
  merge PR #31 (with explicit authorization), P5 change summary, G3 (named SA),
  and archive via `/sdd:living-merge` **after REQ-003's archive** for `trips`.
- Approvers: **VL = Elian Jiang** (see header). The G1 IO/SA signatures are not
  inherited by G2.
- Known deviation accepted upstream: `main_plan_confirmed` has no product
  mutation path until US-037; J4/E2E use the documented test-only database flip.
- SUGGESTION items acknowledged: `jsqr` 1.4.0 is Apache-2.0 (plan text said
  MIT; permissive, dev-only); automated clipboard read denied by the test
  browser (copy handler verified by patching `writeText`); REQ-003's
  "no invitation route" reverse assertion retired because this change owns it.

## What recording G2 requires

1. ~~Typed authorization to push the branch / open the PR~~ — done: PR #31 is
   open and CI is green on the branch head.
2. ~~A fresh CI run read with `gh`~~ — done: run 43608236232, both jobs success;
   re-checked on head `d4f67f0` 2026-11-15, both SUCCESS.
3. ~~The named VL's explicit verdict~~ — done: Elian Jiang, Pass, 2026-11-15.
4. ~~Acknowledgement of the remaining post-G2 work~~ — done: recorded above.

## Next

Pass → merge PR #31 (with the user's explicit authorization), then P5
(`/sdd:living-merge`, change summary, G3 by a named SA). Archive order: after
REQ-003's archive for the `trips` capability.
