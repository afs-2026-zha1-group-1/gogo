# G1 decision — req-024-set-trip-budget

- Change id: `req-024-set-trip-budget`
- Gate: G1 (Align)
- Status: **RECORDED — Pass; gate closed 2026-11-16**. SA evelyn.huang re-reviewed the
  revised confirmation, cancellation and clear-failure behavior and signed Pass,
  relayed by the change author on 2026-11-16; IO Emily approved the revised
  three-requirement / 53-scenario package on 2026-11-15 per explicit user
  instruction. `openspec validate --strict` still exits 1 and is carried as a
  follow-up, not as a passed check.
- Provenance: the SA's Pass is **relayed**, not documented. No SA-authored review text, finding
  or condition is on file for this change, so anything the SA said that was not relayed is not
  recorded here and must be supplied before this file is treated as final.

## Push verification update (2026-11-16)

`origin/feat/travel_preference` is at `27b09e6`, thirteen commits ahead of
`origin/main` `7d939b0`, so the revised delta and Emily's approval record are
published and reviewable. Condition 3's "pending requested commit/push" is
therefore closed; `eca9abe` was the tip quoted before the later commits
`658ba42`, `3c120ac` and `27b09e6`. The SA re-review and the validation follow-up
are settled in the closure section below; the REQ-019/REQ-020 prerequisites stay
open as implementation ordering constraints.

## G1 closure (2026-11-16)

SA evelyn.huang re-reviewed the revised contract, including both confirmation
dialogs, cancellation and clear failure, and passed it on 2026-11-16. The Pass is
relayed by the change author and carries no findings. With the IO approval already
recorded on 2026-11-15, both required roles have signed and G1 is closed; REQ-019
and REQ-020 hold closed G1s as well, so the ordered chain 019 → 020 → 024 is
aligned end to end.

Recorded limitation, deliberately not presented as a pass: `openspec validate
--strict` still exits 1 on two overlong ADDED bodies, so the gate was closed with
that item outstanding; it blocks archive, not P4 start. Conditions 1 and 2 are
implementation prerequisites rather than alignment conditions: neither REQ-019's
`V4`/page nor REQ-020's page revision 2 exists in the tree yet.

## Inputs

- Delta Spec: `specs/preferences/spec.md` — 3 requirements over the existing capability
  `preferences` (2 ADDED: `Save member budget`, 18 scenarios; `Read member budgets`,
  6 scenarios; 1 MODIFIED: `Preferences page`, revision 3, 29 scenarios), 53 scenarios in
  total. The declared baseline is the unarchived deltas of `req-019-save-interests`
  and `req-020-manage-must-do`: identity, trip existence and membership are inherited from
  REQ-019's `Preference caller identity and membership`, and revision 3 of the page requirement
  contains revision 2 verbatim plus the budget section.
- Proposal: `proposal.md`; change metadata `.openspec.yaml`
- Requirements: `requirement-workspace/requirements/REQ-024.md` (25 P1 scenarios, OQ-1..OQ-14,
  blocking open 0), `requirement-workspace/analysis/req-024-dor.md` (12 items Pass, A0 Pass),
  `requirement-workspace/deep-dive.md` §REQ-024 (⑨–⑫ Pass),
  `requirement-workspace/impact-brief.md` §REQ-024,
  `requirement-workspace/intents/2026-11-15-req-024.md` (decisions ledger)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (users 1–5, trip 1,
  2026-12-05 Asia/Singapore). US-024 request/response samples are deliberately not added there
  (OQ-11 deferred to P3/ATDD)
- Story: US-024, category Preferences, priority Must, layers Frontend + Backend + Database
  read/write
- Baseline at drafting time: branch `feat/travel_preference`; `V3__create_invitation.sql` is on
  `main` (PR #31); `member_preference` and `V4__create_member_preference.sql` belong to REQ-019
  and are **not** on disk yet. `kind='budget'` is already named in
  `docs/knowledge/architecture/tech-stack-plan.md` §5, so this change adds no fifth kind and
  stays inside the planned enum, with zero migration.
- Structural check: `spec.md` follows `# Spec Delta` → `## ADDED Requirements` →
  `## MODIFIED Requirements` → `## Clarifications`, with 3 `### Requirement:` blocks and
  53 `#### Scenario:` blocks. Current strict validation exited 1: two ADDED bodies
  exceed 500 characters; preamble/Clarifications are not archived. Archive also
  needs REQ-019 to establish the Living Spec first. Strict validation is not passed.
- AC/DoV review: `dov-ac-review.md` — AC 4/4 Pass, DoV 5/5 Pass (DoV-3 carries non-blocking
  IO/SA concerns), blocking ambiguities 0, contract details C1–C7 and 15 reviewed edge
  scenarios recorded there. The page requirement is reviewed at revision 3.

## Findings (scope / ambiguity / conflict)

- **Scope:** one existing capability, 2 ADDED requirements plus one MODIFIED page requirement,
  matching the proposal. No new capability, table, migration, dependency or route.
- **Conflict with the Living Spec:** none, and none is possible yet — `preferences` has no
  Living Spec. The baseline is the two unarchived deltas named above, which this record states
  so a reviewer does not compare against an absent file.
- **Conflict between delta requirements:** none. The budget requirements touch
  `/preferences/budget`; the page requirement is a superset of revision 2, whose must-do and
  interest contracts are reproduced unchanged.
- **Ambiguity:** 0 blocking. P1 left five non-blocking items deferred (OQ-10..OQ-14); OQ-10 (a
  business amount ceiling) is now decided rather than deferred — no ceiling beyond the
  representable range, `Clarifications` C4.
- **Fixed validation order:** the eight-check order is part of the contract (C1), because one
  request can violate several rules at once and the error `code` must be assertable. A reviewer
  who wants a different precedence must say so before P4, since it changes which `code` each
  negative test expects.
- **Two rulings that a reviewer should look at first:** (a) a missing `amount` key is
  `INVALID_REQUEST` while `"amount": null` clears the budget (C2), so a truncated body can
  never silently erase a saved budget; (b) the wire format stays in the currency's minor unit
  and the page converts with a per-currency table, so `JPY` is not rendered with a hard-coded
  factor of 100 (C5).
- **Deviation from the reference screen, deliberate:** "not set" and an explicit `0` are
  rendered differently (the story's AC3 turns on this), and the budget section saves through its
  own action rather than a page-level submit, so the three sections keep three different write
  timings (C6).
- **Inherited negative paths:** 401 `USER_REQUIRED`, 403 `NOT_A_MEMBER` and 404
  `TRIP_NOT_FOUND` are not restated as scenarios in this delta; they are defined once in
  REQ-019's identity requirement and apply unchanged to both new endpoints.
- **Coverage note:** P1's AC18-N (a save after the main plan is confirmed) had no delta
  scenario when this draft was prepared. It was added as "A save is accepted after the main plan
  is confirmed", so every P1 scenario row is now represented except the three inherited
  identity/membership paths.
- **Retained risks (recorded, not conditions of the delta itself):** (a) the preference error
  advice package must exist for the `BUDGET_*` codes to be produced; (b) the change cannot be
  built or merged before REQ-019's `V4` and REQ-020's page revision 2 exist; (c) cross-currency
  comparison is out of scope, so US-031 will need a separate change when budgets of different
  currencies must be filtered together (OQ-13); (d) `tech-stack-plan.md` still claims a single
  PUT submits all preference kinds, which this change contradicts by design (OQ-14, team-owned).
- **Current review outcome:** both roles have signed the revised package. Emily's IO
  approval covers confirmation, cancellation and clear failure; the SA re-reviewed the
  revised contract and passed it on 2026-11-16, relayed by the change author, so the
  earlier reservation about the historical Pass no longer applies.

## Decision

- Decision: **Pass** — G1 closed 2026-11-16.
- Why Pass: both required roles have signed this version with no findings relayed —
  IO Emily 2026-11-15, SA evelyn.huang 2026-11-16 on the revised contract — and A0
  (⑨–⑫ Pass) plus P1 with blocking open 0 still stand.
- Why no longer Conditional: the only missing signature was the SA's re-review of the
  revised contract; it is now on record, so the gate closes rather than staying
  provisional.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | `req-019-save-interests` reaches a closed G1 and lands `V4__create_member_preference.sql` plus the preferences page; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | open as an implementation prerequisite, not a G1 condition — REQ-019's G1 closed 2026-11-16, but `V4` and the page are still absent |
| 2 | `req-020-manage-must-do` reaches a closed G1 and lands page revision 2, which revision 3 reproduces | evelyn.huang (SA) / Dev | open as an implementation prerequisite, not a G1 condition — REQ-020's G1 closed 2026-11-16, but page revision 2 is still absent |
| 3 | Push current revised delta and approval record on `feat/travel_preference` | Dev | closed 2026-11-16; `origin/feat/travel_preference` at `27b09e6` |
| 4 | IO approval of revised three-requirement / 53-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction |
| 5 | Re-review confirmation dialogs, cancellation and clear failure; sign G1 for revised version | evelyn.huang (SA) | closed 2026-11-16 — Pass on the revised contract, relayed by the change author; no findings |
| 6 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | closed 2026-11-16 — no IO/SA findings relayed with either signature |
| 7 | Resolve strict warnings and rerun `openspec validate req-024-set-trip-budget --strict` | Dev | carried open past G1 closure: exit 1 at closure time; blocks archive, not P4 start |
| 8 | Confirm the eight-step validation order and the minor-unit wire format (C1, C5), or record the opposite ruling before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 and C5 are written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4 |

- Approvers: **IO = Emily — Pass (2026-11-15)**, **SA = evelyn.huang — Pass (2026-11-16,
  revised contract)**.
- IO sign-off: **Emily — Pass**, 2026-11-15; revised three-requirement / 53-scenario
  package including confirmation/cancellation and clear-failure behavior, per explicit
  user instruction.
- SA sign-off: **evelyn.huang — Pass**. The Pass on the previous contract was relayed
  2026-11-15; the Pass on the revised contract was relayed by the change author on
  2026-11-16. Neither statement carried a condition. The SA's earlier Pass on
  `req-019-save-interests` is scoped to that change and is not counted again here.
- Timestamp: 2026-11-15 (draft, authored by the agent). The agent records human statements
  only; it does not verify identities and does not sign on behalf of either role.

## What this draft does and does not allow

- Allowed: P3 design, and P4 implementation of this change once REQ-019's `V4`/page and
  REQ-020's page revision 2 exist; presenting `preferences` as G1-aligned in the
  registry.
- Not allowed: building, verifying or merging this change before those prerequisites
  land, reporting strict validation as passed, or archiving before that rerun succeeds.

## Next

1. Wait for REQ-019's `V4`/page and REQ-020's page revision 2; this change cannot be
   built, verified or merged before both land, in that order.
2. The revised delta and approval records are pushed at `27b09e6`; no further push is
   outstanding for review.
3. Start P3 while waiting: settle where the per-currency minor-unit table lives (code
   constant, not a database column) and the budget error-advice scope.
4. Before archive, fix the two overlong ADDED bodies and rerun
   `openspec validate req-024-set-trip-budget --strict`.
