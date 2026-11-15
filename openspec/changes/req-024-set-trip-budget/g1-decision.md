# G1 decision — req-024-set-trip-budget

- Change id: `req-024-set-trip-budget`
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
  `preferences` (2 ADDED: `Save member budget`, 18 scenarios; `Read member budgets`,
  6 scenarios; 1 MODIFIED: `Preferences page`, revision 3, 26 scenarios), 50 scenarios in
  total, 483 lines. The declared baseline is the unarchived deltas of `req-019-save-interests`
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
  50 `#### Scenario:` blocks, every one carrying GIVEN/WHEN/THEN lines. The OpenSpec CLI is not
  on `PATH` in this environment, so **no `openspec validate` result is claimed**.
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
- **Not known at drafting time:** both review outcomes and any IO/SA conditions.

## Decision

- Decision: **Conditional** — drafted 2026-11-15, not recorded as a gate.
- Why not Pass: G1 requires a named IO signature and a named SA signature for this change.
  Neither exists; the only SA Pass on record belongs to another change.
- Why not Fail: the delta cleared A0 (⑨–⑫ Pass), P1 closed with blocking open 0, and no conflict
  with a merged capability was found.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | `req-019-save-interests` reaches a closed G1 and lands `V4__create_member_preference.sql` plus the preferences page; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | open; entry condition, REQ-019 is Conditional today |
| 2 | `req-020-manage-must-do` reaches a closed G1 and lands page revision 2, which revision 3 reproduces | evelyn.huang (SA) / Dev | open; second entry condition, REQ-020 has no G1 record yet |
| 3 | Push `feat/travel_preference` and have the IO review the delta at the commit that carries it | Dev then Emily (IO) | open |
| 4 | Review the delta and sign G1 for this change | Emily (IO) | open |
| 5 | Review the delta and sign G1 for this change | evelyn.huang (SA) | closed 2026-11-15 — Pass relayed by the change author |
| 6 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | open; triggered by 4 and 5 |
| 7 | Run `openspec validate req-024-set-trip-budget --strict` on a machine where the CLI exists, and paste the result into this file | Dev | open |
| 8 | Confirm the eight-step validation order and the minor-unit wire format (C1, C5), or record the opposite ruling before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 and C5 are written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4 |

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

1. Close REQ-019's G1, then REQ-020's G1 — conditions 1 and 2 above are ordered and cannot be
   met earlier.
2. Push `feat/travel_preference` with the P2 delta at its tip so the reviewers see the same tree;
   nothing is committed yet, so the IO has no commit to review.
3. IO Emily reviews and signs; with the SA already passed, a clean IO review flips this record to
   Pass, otherwise the IO's findings become conditions and the delta is revised.
4. P3 may start in parallel: decide the preference error-advice package scope and confirm the
   per-currency decimal table is a code constant rather than a database column.
