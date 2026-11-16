# G1 decision — req-020-manage-must-do

- Change id: `req-020-manage-must-do`
- Gate: G1 (Align)
- Status: **RECORDED — Pass; gate closed 2026-11-16**. SA evelyn.huang re-reviewed the
  revised confirmation contract and signed Pass, relayed by the change author on
  2026-11-16; IO Emily approved the revised three-requirement / 42-scenario package
  on 2026-11-15 per explicit user instruction. `openspec validate --strict` still
  exits 1 and is carried as a follow-up, not as a passed check.
- Provenance: the SA's Pass is **relayed**, not documented. No SA-authored review text, finding
  or condition is on file for this change, so anything the SA said that was not relayed is not
  recorded here and must be supplied before this file is treated as final.

## Push verification update (2026-11-16)

`origin/feat/travel_preference` is at `27b09e6`, thirteen commits ahead of
`origin/main` `7d939b0`, so the revised delta and Emily's approval record are
published and reviewable. Condition 2's "pending requested commit/push" is
therefore closed; `eca9abe` was the tip quoted before the later commits
`658ba42`, `3c120ac` and `27b09e6`. The SA re-review and the validation follow-up
are settled in the closure section below.

## G1 closure (2026-11-16)

SA evelyn.huang re-reviewed the revised contract, including the confirmation and
cancellation behavior that replaced immediate delete, and passed it on 2026-11-16.
The Pass is relayed by the change author and carries no findings. With the IO
approval already recorded on 2026-11-15, both required roles have signed and G1 is
closed.

Recorded limitation, deliberately not presented as a pass: `openspec validate
--strict` still exits 1 on two overlong ADDED bodies, so the gate was closed with
that item outstanding; it blocks archive, not P4 start. Condition 1 is an
implementation prerequisite rather than an alignment condition: REQ-019's G1 is
closed too, but its `V4` migration and preferences page are still absent from the
tree, so this change remains unbuildable and unmergeable until they land.

## Inputs

- Delta Spec: `specs/preferences/spec.md` — 3 requirements over the existing capability
  `preferences` (2 ADDED: `Save member must-do items`, 18 scenarios; `Read member must-do
  items`, 5 scenarios; 1 MODIFIED: `Preferences page`, revision 2, 19 scenarios),
  42 scenarios in total. The declared baseline is the unarchived delta of
  `req-019-save-interests`; identity, trip existence and membership are inherited from its
  `Preference caller identity and membership` requirement and deliberately not restated.
- Proposal: `proposal.md`; change metadata `.openspec.yaml`
- Requirements: `requirement-workspace/requirements/REQ-020.md` (20 P1 scenarios, OQ-1..OQ-14,
  blocking open 0), `requirement-workspace/analysis/req-020-dor.md` (12 items Pass, A0 Pass),
  `requirement-workspace/deep-dive.md` §REQ-020 (⑨–⑫ Pass, 24 branches, 9 UI states),
  `requirement-workspace/impact-brief.md` §REQ-020 (R1–R8),
  `requirement-workspace/intents/2026-11-15-req-020.md` (D1–D14, D14 amended in P2)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (users 1–5, trip 1,
  2026-12-05 Asia/Singapore). US-020 request/response samples are deliberately not added
  there (OQ-10 deferred to P3/ATDD)
- Story: US-020, category Preferences, priority Must, layers Frontend + Backend + Database
  read/write
- Baseline at drafting time: branch `feat/travel_preference`; `V3__create_invitation.sql` is
  on `main` (PR #31), `member_preference` and its `V4__create_member_preference.sql` are owned
  by REQ-019 and are **not** on disk yet, so this change remains zero-migration but not
  independently runnable
- Structural check: `spec.md` follows `# Spec Delta` → `## ADDED Requirements` →
  `## MODIFIED Requirements` → `## Clarifications`, with 3 `### Requirement:` blocks and
  42 `#### Scenario:` blocks. Current strict validation exited 1: two ADDED bodies
  exceed 500 characters; preamble/Clarifications are not archived. Archive also
  needs REQ-019 to establish the Living Spec first. Strict validation is not passed.
- AC/DoV review: `dov-ac-review.md` — AC 4/4 Pass, DoV 5/5 Pass (DoV-3 carries non-blocking
  IO/SA concerns), blocking ambiguities 0, contract details C1–C7 and 16 reviewed edge
  scenarios recorded there. The page requirement is reviewed at revision 2.

## Findings (scope / ambiguity / conflict)

- **Scope:** one existing capability, 2 ADDED requirements plus one MODIFIED page requirement,
  matching the proposal. No new capability, no new table, no new migration, no new
  dependency, no new route beyond the existing `#/trips/{id}/preferences` page.
- **Conflict with the Living Spec:** none, and none is possible yet — `preferences` has no
  Living Spec. The baseline is the still-unarchived REQ-019 delta, which this record states
  explicitly so that a reviewer is not comparing against an absent file.
- **Conflict between delta requirements:** none. The two ADDED requirements touch
  `/preferences/must-dos`, which does not exist today; the MODIFIED page requirement restates
  revision 1 verbatim (interests loading, empty, reload, identity switch, single save,
  duplicate-submission lock, rollback, 401/403/404, failed load, no local storage) and adds
  the must-do section, so revision 2 is self-contained.
- **Ambiguity:** 0 blocking. P1 left five non-blocking items deferred (OQ-10..OQ-14); two of
  them are now decided rather than deferred: OQ-11 (no count or length limit) and
  OQ-13 (confirmation required by user ruling 2026-11-15) are in C3 and C6.
- **Contract ruling that narrows an earlier statement:** item ids are unique within the
  caller's list only and **may be reassigned after the list is emptied** (C1). This replaces
  the proposal's original "not reused after deletion"; `proposal.md` (§ item fields, § A0 gate,
  § Known deviations), `analysis/req-020-dor.md` (⑨ and one WARNING row) and
  `intents/2026-11-15-req-020.md` (D14) were amended together so no document still asserts the
  old rule. A reviewer who prefers a durable counter over reuse must say so before P4, because
  it changes the stored payload shape.
- **Deviation from the reference screen, deliberate:** `location` and `time` may be saved
  together (C5, accepted by user 2026-11-15). Delete now requires confirmation
  (C6): opening/cancelling/dismissing sends no request; Confirm sends one PUT.
  The new cancel scenario preserves items and unrelated unsaved selections.
- **Inherited negative paths:** 401 `USER_REQUIRED`, 403 `NOT_A_MEMBER` and 404
  `TRIP_NOT_FOUND` are not restated as scenarios in this delta. They are defined once in
  REQ-019's identity requirement and apply unchanged to both new endpoints. Reviewers should
  confirm that inheritance is acceptable instead of expecting local copies.
- **Retained risks (recorded, not conditions of the delta itself):** (a) `TripErrorAdvice`
  covers `com.gogo.trip` only, so the preference package needs its own advice or a widened
  scope, otherwise `INVALID_REQUEST` and the `MUST_DO_*` codes cannot be produced; (b) the
  change cannot be built or merged before REQ-019's `V4` and page exist; (c) `docs/knowledge/
  architecture/tech-stack-plan.md` §5/§6 still describes envelopes, `X-Member-Id`,
  `JdbcClient` and Ant Design 5 while the merged code uses bare DTOs, `X-User-Id`,
  `JdbcTemplate` and hand-written CSS (REQ-020 OQ-14, team-owned).
- **Current review outcome:** both roles have signed the revised package. Emily's IO
  approval (2026-11-15) covers confirmation/cancellation behavior; the SA re-reviewed
  the revised contract and passed it on 2026-11-16, relayed by the change author, so
  the earlier reservation about the historical Pass no longer applies.

## Decision

- Decision: **Pass** — G1 closed 2026-11-16.
- Why Pass: both required roles have signed this version with no findings relayed —
  IO Emily 2026-11-15, SA evelyn.huang 2026-11-16 on the revised confirmation
  contract — and A0 (⑨–⑫ Pass) plus P1 with blocking open 0 still stand.
- Why no longer Conditional: the only missing signature was the SA's re-review of the
  revised contract; it is now on record, so the gate closes rather than staying
  provisional.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | `req-019-save-interests` reaches a closed G1 and lands `V4__create_member_preference.sql` plus the preferences page on the branch; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | open as an implementation prerequisite, not a G1 condition — REQ-019's G1 closed 2026-11-16, but `V4` and the page are still absent |
| 2 | Push current revised delta and approval record on `feat/travel_preference` | Dev | closed 2026-11-16; `origin/feat/travel_preference` at `27b09e6` |
| 3 | IO approval of revised three-requirement / 42-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction |
| 4 | Re-review the revised confirmation contract and sign G1 for this version | evelyn.huang (SA) | closed 2026-11-16 — Pass on the revised confirmation contract, relayed by the change author; no findings |
| 5 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | closed 2026-11-16 — no IO/SA findings relayed with either signature |
| 6 | Resolve strict warnings and rerun `openspec validate req-020-manage-must-do --strict` | Dev | carried open past G1 closure: exit 1 at closure time; blocks archive, not P4 start |
| 7 | Confirm the C1 id-reuse ruling, or record the opposite ruling and amend the payload shape before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 is written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4 |

- Approvers: **IO = Emily — Pass (2026-11-15)**, **SA = evelyn.huang — Pass (2026-11-16,
  revised contract)**.
- IO sign-off: **Emily — Pass**, 2026-11-15; revised three-requirement / 42-scenario
  package including confirmation dialogs and cancellation, per explicit user instruction.
- SA sign-off: **evelyn.huang — Pass**. The Pass on the previous contract was relayed
  2026-11-15; the Pass on the revised confirmation contract was relayed by the change
  author on 2026-11-16. Neither statement carried a condition. The SA's earlier Pass
  on `req-019-save-interests` is scoped to that change and is not counted again here.
- Timestamp: 2026-11-15 (draft, authored by the agent). The agent records human statements
  only; it does not verify identities and does not sign on behalf of either role.

## What this draft does and does not allow

- Allowed: P3 design, and P4 implementation of this change once REQ-019's `V4` and the
  preferences page exist; presenting `preferences` as G1-aligned in the registry.
- Not allowed: building, verifying or merging this change before `V4` and the page
  land, reporting strict validation as passed, or archiving before that rerun succeeds.

## Next

1. Wait for REQ-019's `V4__create_member_preference.sql` and the preferences page; this
   change cannot be built, verified or merged before they land.
2. The revised delta and approval records are pushed at `27b09e6`; no further push is
   outstanding for review.
3. Start P3 while waiting: settle how the must-do section reuses the page shell and the
   preference error-advice package scope.
4. Before archive, fix the two overlong ADDED bodies and rerun
   `openspec validate req-020-manage-must-do --strict`.
