# G1 decision — req-024-set-trip-budget

- Change id: `req-024-set-trip-budget`
- Gate: G1 (Align)
- Status: **RECORDED — Pass; gate closed 2026-11-16, condition 9 signed 2026-11-17**. SA evelyn.huang re-reviewed the
  revised confirmation, cancellation and clear-failure behavior and signed Pass,
  relayed by the change author on 2026-11-16; IO Emily approved the revised
  three-requirement / 53-scenario package on 2026-11-15 per explicit user
  instruction. `openspec validate req-024-set-trip-budget --strict` ran **exit 0 on 2026-11-17**
  with the CLI at `%APPDATA%\npm\openspec.cmd`, so condition 7 is closed on machine evidence.
  Reaching exit 0 required edits to wording both roles had signed — six MODIFIED page scenario titles
  restored, three new scenarios, and all three requirement bodies compressed under the 500-character
  house limit — and those edits were carried as condition 9, which **IO Emily and SA evelyn.huang
  signed Pass on 2026-11-17** (relayed by the change author per explicit user instruction), so the
  signed package is the current delta: 3 requirements / 56 scenarios.
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

Recorded limitation, deliberately not presented as a pass at the time: `openspec validate
--strict` exited 1 on two overlong ADDED bodies, so the gate was closed with that item outstanding; it
blocked archive, not P4 start. **Closed 2026-11-17**, see the *Strict validation* evidence bullet
below. The run
also reported one ERROR that the earlier local measurement had missed — the MODIFIED page block had
renamed six scenarios the baseline Living Spec still asserts — plus the two archive-carry warnings.
Conditions 1 and 2 are implementation prerequisites rather than alignment conditions: REQ-019's `V6`
and page are on this branch, while REQ-020's page revision 2 is signed but not yet implemented.

## Implementation prerequisite update (2026-11-16)

REQ-019 reached P4 on this branch, so condition 1 is now satisfied and condition 2 stands
on a smaller gap. This section re-checks both and **supersedes** the "exists in the tree
yet" sentence in *G1 closure*:

- Condition 1 is satisfied: the table is on disk at `V6__create_member_preference.sql`
  (renumbered from `V4`, because `main` took `V4` for splits and `V5__create_main_plan.sql`
  already declares `member_preference` with `IF NOT EXISTS`), and the page exists as
  `frontend/src/pages/PreferencesPage.tsx` at revision 1. Shape relied on here is unchanged:
  `(trip_id, user_id, kind, payload TEXT, updated_at)` with `UNIQUE(trip_id, user_id,
  kind)`, which is what the `kind='budget'` single-row upsert needs.
- Condition 2 remains open, but its blocker moved: REQ-020 is no longer gated by REQ-019
  (its condition 1 closed the same day), so revision 2 can now be built; revision 3 has
  nothing to reproduce until it is.
- `PreferenceErrorAdvice` is already scoped to `com.gogo.preference`
  (`@RestControllerAdvice(basePackages = "com.gogo.preference")`), so the `BUDGET_*` codes
  and `INVALID_REQUEST` are producible without touching `TripErrorAdvice`.
- Reuse is **not** free at code level: `PreferenceRepository` hard-codes `kind='interest'`
  in both `save` and `membersOf`, and `PreferencePayload` is a single `{codes: [...]}`
  shape, so the budget object `{"amount", "currency", "limitType"}` (and the unset `{}`
  state) needs its own payload codec plus a kind parameter. `PreferenceService` and the
  controller's `caller()` identity → trip → membership sequence are reusable as-is.
- The current page keeps one page-level `.actionbar` save button; revision 3's
  "one save action per section" therefore changes the shell, not only the section content.
- REQ-019 stands at G2 (record prepared, named VL unsigned) with PR #44 open against
  `main`, so this change is implementable on the branch while the merge order 019 → 020 →
  024 still governs `main`.

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
  stays inside the planned enum, with zero migration (superseded 2026-11-16: the table is on
  the branch as `V6` and the page exists — see *Implementation prerequisite update*).
- Structural check: `spec.md` follows `# Spec Delta` → `## ADDED Requirements` →
  `## MODIFIED Requirements`, with 3 `### Requirement:` blocks and 56 `#### Scenario:` blocks
  (433 lines). The `## Clarifications` table and the delta preamble were relocated to `proposal.md`
  on 2026-11-17 because archive carries neither into the Living Spec; the requirement bodies measure
  336 / 406 / 484 characters, all inside the 500-character limit.
- Strict validation: exit 1 at G1 closure on two overlong ADDED bodies. First real CLI run
  **2026-11-17**: one ERROR (MODIFIED `Preferences page` omitted six scenarios the Living Spec still
  asserts) plus the overlong-body and archive-carry WARNINGs. After the remediation recorded in
  `proposal.md` ("Strict remediation and delta-spec relocation"), `openspec validate
  req-024-set-trip-budget --strict` → `Change 'req-024-set-trip-budget' is valid`, **exit 0**.
  Archive still needs REQ-019 (already archived) and REQ-020 merged ahead of this change.
- AC/DoV review: `dov-ac-review.md` — AC 4/4 Pass, DoV 5/5 Pass (DoV-3 carries non-blocking
  IO/SA concerns), blocking ambiguities 0, contract details C1–C8 and 15 reviewed edge
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
- **Retained risks (recorded, not conditions of the delta itself):** (a) **closed
  2026-11-16** — `PreferenceErrorAdvice` is already scoped to `com.gogo.preference`, so the
  `BUDGET_*` codes need no new advice package; (b) **narrowed 2026-11-16** — REQ-019's table
  and page are on the branch (the migration as `V6`), so what remains is REQ-020's page
  revision 2 plus the 019 → 020 → 024 merge order to `main`; (c) cross-currency
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
| 1 | `req-019-save-interests` reaches a closed G1 and lands the `member_preference` migration plus the preferences page; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | closed 2026-11-16 — G1 closed and P4 landed on the branch at `V6__create_member_preference.sql` (renumbered from `V4`) plus `PreferencesPage.tsx` |
| 2 | `req-020-manage-must-do` reaches a closed G1 and lands page revision 2, which revision 3 reproduces | evelyn.huang (SA) / Dev | open as an implementation prerequisite, not a G1 condition — REQ-020's G1 closed 2026-11-16 and its own prerequisite (REQ-019) is now satisfied, so revision 2 can be built on this branch; revision 3 has nothing to reproduce until it is |
| 3 | Push current revised delta and approval record on `feat/travel_preference` | Dev | closed 2026-11-16; `origin/feat/travel_preference` at `27b09e6` |
| 4 | IO approval of revised three-requirement / 53-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction |
| 5 | Re-review confirmation dialogs, cancellation and clear failure; sign G1 for revised version | evelyn.huang (SA) | closed 2026-11-16 — Pass on the revised contract, relayed by the change author; no findings |
| 6 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | closed 2026-11-16 — no IO/SA findings relayed with either signature |
| 7 | Resolve strict warnings and rerun `openspec validate req-024-set-trip-budget --strict` | Dev | closed 2026-11-17 — run with the real CLI at `%APPDATA%\npm\openspec.cmd`: `openspec validate req-024-set-trip-budget --strict` → `Change 'req-024-set-trip-budget' is valid`, **exit 0**. Remediation: six MODIFIED page scenario titles restored to the names the baseline asserts; `Save member budget` body 2,820 → 336 characters, `Read member budgets` 749 → 406, MODIFIED page body 3,162 → 484; delta preamble and `## Clarifications` relocated to `proposal.md`. Three new scenarios carry what the compression dropped, so the package is now 3 requirements / 56 scenarios. The earlier "strict still exits 1" premise no longer holds |
| 8 | Confirm the eight-step validation order and the minor-unit wire format (C1, C5), or record the opposite ruling before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 and C5 are written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4. Note: C1's mapping is now asserted by the `A defect maps to its own error code` scenario table rather than narrated in the requirement body |
| 9 | Re-confirm the 2026-11-17 strict remediation on the signed delta wording: the six restored MODIFIED `Preferences page` scenario titles, the three new `Save member budget` scenarios (`A defect maps to its own error code`, `An incomplete null budget is not a clear`, `The representable maximum is accepted and the capability does no arithmetic`), the compression of all three requirement bodies to 336 / 406 / 484 characters, and the relocation of the delta preamble and the C1–C8 table verbatim into `proposal.md`. No existing scenario body or assertion was removed; the signed 53 scenarios are all still present, so the package grows to 56 | Emily (IO) / evelyn.huang (SA) | **closed 2026-11-17 — both roles Pass, relayed by the change author per explicit user instruction, no finding.** Raised the same day because the remediation touched text the 2026-11-15/16 signatures cover. Two limits stand as recorded for those signatures: the Pass is relayed rather than documented, and it was given on the working-tree text, so the commit that carries it must reproduce this wording exactly |

- Approvers: **IO = Emily — Pass (2026-11-15; 2026-11-17 for the strict remediation)**, **SA =
  evelyn.huang — Pass (2026-11-16, revised contract; 2026-11-17 for the strict remediation)**. The
  2026-11-17 Pass is relayed by the change author per explicit user instruction and carries no
  finding; no role-authored review text for that remediation is on file.
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

- Allowed: P3 design, and P4 implementation and local verification of this change on this
  branch once REQ-020's page revision 2 exists; presenting `preferences` as G1-aligned in
  the registry.
- Not allowed: merging to `main` before 019 and 020 merge, or altering the reviewed wording at commit
  time — the 2026-11-17 signature covers the working-tree text as it stands. Reporting strict
  validation as failed is equally wrong: it exits 0 as of 2026-11-17. Archive is no longer blocked by a
  G1 condition: condition 9 is signed, and what remains ahead of archive is this change's own P3/P4
  output, G2 evidence and G3.

## Next

1. Start P3 now on the parts that do not depend on REQ-020: settle where the per-currency
   minor-unit table lives (code constant, not a database column), and design the budget
   payload codec plus the kind parameter that `PreferenceRepository` will need.
2. The revised delta and approval records are pushed at `27b09e6`; no further push is
   outstanding for review.
3. Implement revision 3 once REQ-020's revision 2 page exists; until then the page
   requirement has no baseline to extend.
- 4. Merge order to `main` is 019 → 020 → 024; REQ-019's G2 is the first link.

## Budget contract revision re-review (2026-11-18) — **SA Pass; IO pending (sign-off slot reserved)**

After G1 closed, the P4 implementation changed the budget contract at the product owner's
2026-11-18 instruction: the amount is now a **major-unit integer** (1000 = 1000) and `limitType`
carries real `hard`/`soft` semantics (soft ≈ ±20% overshoot), replacing the earlier
"minor-unit / no-arithmetic" wording. Because this **alters signed text**, G1 must be re-confirmed
by both roles before G2/PR. The prior signed conditions below are unchanged and remain closed; only
the budget wording above is reopened for re-review.

- Status: **RECORDED — SA Pass (relayed); IO sign-off reserved/pending; G2/PR blocked until IO signs this section.**
- Reopened item: revised budget contract (major units + hard/soft ±20%) in
  `specs/preferences/spec.md` (top "修订说明") and `design.md` §4.
- SA sign-off (revised budget): **evelyn.huang — Pass (2026-11-18, relayed by the change author; no findings relayed).**
- IO sign-off (revised budget): **not recorded — sign-off slot reserved by the change author;** owner Emily.
- Timestamp: 2026-11-18 (SA, relayed); IO pending.
- Provenance: the SA Pass is **relayed**, not documented; no SA-authored review text is on file.
  The commit must not alter the signed budget wording; if it differs, reopen this section.
- Next: IO re-reviews and signs → G2 (named VL) → PR.
5. Strict validation is settled: `openspec validate req-024-set-trip-budget --strict` exits 0 as of
   2026-11-17, so condition 7 is closed on CLI evidence, and **condition 9 is signed Pass by IO Emily
   and SA evelyn.huang (2026-11-17, relayed)**. No G1 condition stays open; what remains is this
   change's P3 output (`design.md` / `tasks.md`) and the merge order in item 4.
