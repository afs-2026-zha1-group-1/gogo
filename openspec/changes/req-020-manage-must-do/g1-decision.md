# G1 decision — req-020-manage-must-do

- Change id: `req-020-manage-must-do`
- Gate: G1 (Align)
- Status: **RECORDED — Conditional; gate NOT closed** (2026-11-15). SA evelyn.huang — Pass,
  relayed by the change author on 2026-11-15. IO Emily — not recorded; no IO review exists for
  this change. G1 stays open until the IO signs; the remaining conditions are listed under
  Decision.
- Provenance: the SA's Pass is **relayed**, not documented. No SA-authored review text, finding
  or condition is on file for this change, so anything the SA said that was not relayed is not
  recorded here and must be supplied before this file is treated as final.

## Inputs

- Delta Spec: `specs/preferences/spec.md` — 3 requirements over the existing capability
  `preferences` (2 ADDED: `Save member must-do items`, 18 scenarios; `Read member must-do
  items`, 5 scenarios; 1 MODIFIED: `Preferences page`, revision 2, 18 scenarios),
  41 scenarios in total, 407 lines. The declared baseline is the unarchived delta of
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
  41 `#### Scenario:` blocks, every one carrying GIVEN/WHEN/THEN lines. The OpenSpec CLI is
  not on `PATH` in this environment, so **no `openspec validate` result is claimed**.
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
  them are now decided rather than deferred: OQ-11 (no count or length limit) and OQ-13 (no
  delete confirmation) are ruled in `Clarifications` C3 and C6.
- **Contract ruling that narrows an earlier statement:** item ids are unique within the
  caller's list only and **may be reassigned after the list is emptied** (C1). This replaces
  the proposal's original "not reused after deletion"; `proposal.md` (§ item fields, § A0 gate,
  § Known deviations), `analysis/req-020-dor.md` (⑨ and one WARNING row) and
  `intents/2026-11-15-req-020.md` (D14) were amended together so no document still asserts the
  old rule. A reviewer who prefers a durable counter over reuse must say so before P4, because
  it changes the stored payload shape.
- **Deviation from the reference screen, deliberate:** `location` and `time` may be saved
  together (C5, overriding "choose one of location or time"), and the delete action carries no
  confirmation dialog (C6). Both are written as testable MUST/SHALL statements, not as notes.
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
- **Not known at drafting time:** both review outcomes and any IO/SA conditions. They cannot
  be inferred from the REQ-019 signature and are therefore left open.

## Decision

- Decision: **Conditional** — drafted 2026-11-15, not recorded as a gate.
- Why not Pass: G1 requires a named IO signature and a named SA signature for this change.
  Neither exists; the only SA Pass on record belongs to another change.
- Why not Fail: the delta cleared A0 (⑨–⑫ Pass) and P1 closed with blocking open 0, no reviewer
  has asked for rework, and no conflict with a merged capability was found.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | `req-019-save-interests` reaches a closed G1 and lands `V4__create_member_preference.sql` plus the preferences page on the branch; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | open; entry condition, REQ-019 is Conditional today |
| 2 | Push `feat/travel_preference` and have the IO review the delta at the commit that carries it | Dev then Emily (IO) | open |
| 3 | Review the delta and sign G1 for this change | Emily (IO) | open |
| 4 | Review the delta and sign G1 for this change | evelyn.huang (SA) | closed 2026-11-15 — Pass relayed by the change author |
| 5 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | open; triggered by 3 and 4 |
| 6 | Run `openspec validate req-020-manage-must-do --strict` on a machine where the CLI exists, and paste the result into this file | Dev | open |
| 7 | Confirm the C1 id-reuse ruling, or record the opposite ruling and amend the payload shape before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 is written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4 |

- Approvers: **IO = Emily — pending (not recorded)**, **SA = evelyn.huang — Pass**.
- IO sign-off: **not recorded**. No IO review or signature exists for this change.
- SA sign-off: **evelyn.huang — Pass**, relayed by the change author on 2026-11-15. The SA's
  earlier Pass on `req-019-save-interests` is scoped to that change and is not counted again
  here; this row records the SA's Pass on this change only.
- Timestamp: 2026-11-15 (draft, authored by the agent). The agent records human statements
  only; it does not verify identities and does not sign on behalf of either role.

## What this draft does and does not allow

- Allowed: refine the delta, and start P3 design (`/sdd:atdd-design`, `/sdd:task-plan`) on the
  SA-signed delta — A0 is clean and the AC/DoV review is recorded. Any design work may still be
  invalidated by an IO finding.
- Not allowed: claiming G1 is closed, presenting `preferences` as aligned in the registry,
  starting P4 implementation, or citing this file as a signature.
- If both roles sign without findings, this file is amended to Pass with both signature rows
  filled in and no conditions. If either raises findings, they are appended as conditions here
  and the delta is revised before P4.

## Next

1. Close REQ-019's G1 (its own conditions 1–3), because condition 1 above cannot be met earlier.
2. Push `feat/travel_preference` with the P2 delta at its tip so the reviewers see the same tree;
   nothing is committed yet, so the IO has no commit to review.
3. IO Emily reviews and signs; with the SA already passed, a clean IO review flips this record to
   Pass, otherwise the IO's findings become conditions and the delta is revised.
4. P3 may start in parallel: decide the preference error-advice package scope (own advice for
   `com.gogo.preference` versus widening `TripErrorAdvice` to `com.gogo`).
