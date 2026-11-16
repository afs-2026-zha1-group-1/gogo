# G1 decision — req-004-trip-invitations

- Change id: `req-004-trip-invitations`
- Gate: G1 (Align)
- Status: **RECORDED — Pass** (2026-11-14). IO Emily Pass and SA Johnson Pass are
  both recorded below; the gate is closed. REQ-003 G1 was already recorded and
  its P4 implementation landed on the stacked branch.

## Inputs

- Delta Specs: `specs/invitations/spec.md` (4 ADDED requirements, 15 scenarios)
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
- **Cross-change dependency:** at G1 time REQ-003 was P2-complete, unimplemented
  and G1-unsigned. Its G1 is now recorded and its P4 landed before this change's
  P4, because `V3` alters `V2`'s tables. This was an ordering constraint, not a
  spec conflict.
- **Content rulings, 2026-11-14:** OQ-1 retains staged delivery with no product
  confirmation operation until US-037; OQ-2 permits name, destination, dates and
  joining-open state before acceptance. No private member/itinerary/preferences.
- **Technical review fixes:** identity precedes token validation; existing
  members succeed before and after closure. ATDD J6/J7 cover both boundaries.
  OQ-6 is resolved by design D7 (hash router, `qrcode`, local `jsqr` decoder).
- **Acknowledged by user, 2026-11-14:** unverified scaffold identity is accepted
  only for a controlled demo; REQ-003 implementation precedes REQ-004 (OQ-7).
  REQ-003 OQ-6 is resolved to later US-031 generation with submitted member
  preferences, random fallback and no overwrite. No blocking content question
  remains. REQ-003 G1 was recorded before this one, satisfying the prerequisite;
  content rulings are not signatures.
- Earlier validation/review evidence in Inputs predates the amended specs;
  it is historical, not proof of current runtime behavior.

## Decision

- Decision: **Pass** — recorded 2026-11-14 once both required roles had decided.
- Conditions + owners: none; no remediation items were supplied by either role.
- User-designated approvers: **IO = Emily**, **SA = Johnson** (user supplied
  `IO emily SA johnson`).
- IO sign-off: **Emily — Pass**, recorded 2026-11-14 from the user's exact
  statement `emily pass`, in response to the request covering both changes.
  No IO conditions were supplied. The agent records this statement, not an
  independently verified identity or an approval on behalf of the SA.
- SA sign-off: **Johnson — Pass**, recorded 2026-11-14 from the user's explicit
  session answer `Pass` to the G1 SA question for this change, after the P2
  deltas, DoV review and strict validation evidence were presented. No SA
  conditions were supplied.
- Prerequisite: REQ-003 G1 is recorded Pass and REQ-003 P4 (the `V2` tables)
  landed on the stacked branch before this record.

## What recording G1 required (satisfied)

1. IO Emily's Pass and SA Johnson's Pass are both recorded from human statements.
2. The overall decision is Pass with no conditions, so no remediation list is
   needed.
3. OQ-1/OQ-2 rulings and the acknowledged controlled-demo identity risk are
   retained unchanged.

The agent recorded only the humans' statements; it did not choose the verdict.

## Next

On Pass → P3 (`/sdd:atdd-design`, `/sdd:task-plan`). On Fail → return to
`/sdd:delta-craft`.