# G1 decision — req-003-trip-create-and-view

- Change id: `req-003-trip-create-and-view`
- Gate: G1 (Align)
- Status: **NOT RECORDED** — draft prepared by the coding agent, awaiting named human
  IO and SA sign-off. This file is not evidence that G1 passed.

## Inputs

- Delta Spec: `specs/trips/spec.md` — 3 ADDED requirements, 10 scenarios, new
  capability `trips` against the Living Spec tree that currently holds only
  `greeting`
- AC/DoV review: `dov-ac-review.md` (AC-1…AC-4 Pass; DoV-1…DoV-5 all Pass;
  blocking Fail = 0, Partial = 0)
- Validation: `/d/nvm4w/nodejs/openspec validate req-003-trip-create-and-view`
  → "is valid"; with `--strict` → "is valid" (CLI 1.16.1)
- Requirements: `requirement-workspace/requirements/REQ-003.md`,
  `requirement-workspace/analysis/req-003-dor.md` (BLOCKER = 0, A0 Pass),
  `requirement-workspace/deep-dive.md` §REQ-003,
  `requirement-workspace/acceptance-test-fixtures.md`
- Proposal: `proposal.md`
- Stories: GitHub issue #4 (US-001), issue #5 (US-002), both `Iteration 0`,
  `Priority - Must`, status `Req Analysis`

## Findings (scope / ambiguity / conflict)

- **Scope:** one new capability, three ADDED requirements, matching the proposal.
  The `greeting` capability is untouched; no existing table or endpoint changes.
- **Conflict with the Living Spec:** none. `trips` does not exist in
  `openspec/specs/`, and nothing in `greeting` is referenced or modified.
- **Conflict between delta requirements:** none. The identity requirement is a
  shared precondition for the other two; creation and read touch disjoint paths.
- **Ambiguity:** no **blocking** item remains. Two non-blocking items need a human
  ruling to become decidable at P3:
  - OQ-1: whether `destination`, `startLocation` and `endLocation` are required.
    Current default: stored verbatim, no dedicated validation error.
  - OQ-2: whether a non-member should receive `403` (confirms existence) or `404`
    (hides it). Current default: `403`, per the AC wording "access is denied".

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

The agent will write the final record only from the human's statement; it will not
choose the approvers or the verdict.

## Next

On Pass → P3 (`/sdd:atdd-design`, `/sdd:task-plan`). On Fail → return to
`/sdd:delta-craft`.
