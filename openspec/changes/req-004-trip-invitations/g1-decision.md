# G1 decision — req-004-trip-invitations

- Change id: `req-004-trip-invitations`
- Gate: G1 (Align)
- Status: **NOT RECORDED** — draft prepared by the coding agent, awaiting named human
  IO and SA sign-off. This file is not evidence that G1 passed.

## Inputs

- Delta Specs: `specs/invitations/spec.md` (4 ADDED requirements, 14 scenarios)
  and `specs/trips/spec.md` (1 ADDED requirement, 3 scenarios). `invitations` is
  new; the `trips` requirement is additive on the capability introduced by the
  in-flight `req-003-trip-create-and-view` change, which is not yet in the Living
  Spec tree (currently only `greeting`).
- AC/DoV review: `dov-ac-review.md` (AC-1…AC-4 Pass; DoV-1…DoV-5 all Pass;
  blocking Fail = 0, Partial = 0)
- Validation: `/d/nvm4w/nodejs/openspec validate req-004-trip-invitations`
  → "is valid"; with `--strict` → "is valid", exit 0 (CLI 1.16.1)
- Requirements: `requirement-workspace/requirements/REQ-004.md`,
  `requirement-workspace/analysis/req-004-dor.md` (BLOCKER = 0, A0 Pass),
  `requirement-workspace/deep-dive.md` §REQ-004,
  `requirement-workspace/acceptance-test-fixtures.md` §REQ-004
- Proposal: `proposal.md`
- Stories: GitHub issue #6 (US-008), #7 (US-010), #8 (US-012), all `Iteration 0`,
  `Priority - Must`, status `Req Analysis`; pick evidence = user statement
  (board assignees empty)

## Findings (scope / ambiguity / conflict)

- **Scope:** one new capability plus one additive `trips` requirement, matching
  the proposal. `greeting` untouched; REQ-003's six trip values and two endpoints
  unchanged; the added column has a default.
- **Conflict with the Living Spec:** none. `invitations` does not exist in
  `openspec/specs/`; the `trips` ADDED requirement merges after REQ-003's delta
  and shares no requirement name with it.
- **Conflict between delta requirements:** none. Issuance produces the token that
  preview and acceptance consume; the trips state requirement is the single
  source of the closure flag that acceptance reads.
- **Cross-change dependency:** REQ-003 is P2-complete, unimplemented, G1 unsigned.
  REQ-004 P4 cannot start before REQ-003 P4 (`V3` alters `V2`'s tables). This is
  an ordering constraint, not a spec conflict.
- **Ambiguity:** no **blocking** item remains. Non-blocking items needing a human
  ruling to become decidable at P3/P4:
  - OQ-1: main-plan state without a product mutation path until US-037. Current
    default: boolean column, default unconfirmed, test-only setup for the closure
    case; reverse scenario asserts no API sets it.
  - OQ-2: preview field set. Current default: name, destination, start/end dates,
    joining-open flag (screen 05); never members/itinerary/preferences.
  - OQ-6: router and QR encoding dependency, deferred to P3 (shared with REQ-003
    OQ-4).
  - OQ-7: REQ-003 sequencing, deferred with owner.

## Decision

- Decision: **PENDING** — to be supplied by the human: `Pass`, `Fail`, or
  `Conditional`.
- Conditions + owners: to be supplied. A `Conditional` decision is invalid without
  remediation items and owners.
- Approvers: **IO = pending**, **SA = pending**. Both names are required; a missing
  role blocks the record.

## What recording G1 requires

1. A named IO and a named SA (they may be the same person, stated explicitly).
2. A decision value.
3. Rulings on OQ-1 and OQ-2, or an explicit carry-forward with an owner.
4. Acknowledgement of the REQ-003 ordering dependency (OQ-7).

The agent will write the final record only from the human's statement; it will not
choose the approvers or the verdict.

## Next

On Pass → P3 (`/sdd:atdd-design`, `/sdd:task-plan`). On Fail → return to
`/sdd:delta-craft`.