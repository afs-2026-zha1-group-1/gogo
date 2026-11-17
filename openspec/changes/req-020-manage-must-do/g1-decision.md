# G1 decision — req-020-manage-must-do

- Change id: `req-020-manage-must-do`
- Gate: G1 (Align)
- Status: **RECORDED — Pass; gate closed 2026-11-16, re-review of the two P3 amendments signed
  2026-11-16**. SA evelyn.huang re-reviewed the revised confirmation contract and signed Pass,
  relayed by the change author on 2026-11-16; IO Emily approved the revised three-requirement /
  42-scenario package on 2026-11-15 per explicit user instruction. Both roles then passed the two
  amendments made at the start of P3 (page re-basing and the R4 storage mirror), relayed by the
  change author on 2026-11-16 per explicit user instruction, so condition 8 is closed and the signed
  package is now **3 requirements / 44 scenarios**. `openspec validate --strict` still
  exits 1 and is carried as a follow-up, not as a passed check. The two overlong ADDED bodies behind
  that exit 1 were shortened on 2026-11-16 (measured 493 and 432 characters against the 500 limit);
  the rerun itself is still outstanding because no `openspec` CLI is available in this environment,
  so condition 6 stays open.
- Provenance: the SA's Pass is **relayed**, not documented. No SA-authored review text, finding
  or condition is on file for this change, so anything the SA said that was not relayed is not
  recorded here and must be supplied before this file is treated as final. The 2026-11-16 signature
  on the two P3 amendments is relayed the same way, and it was given on the **uncommitted working-tree
  text** (the user instructed that this round not be committed or pushed, to avoid colliding with
  REQ-019's open G2 / PR #44). Whoever commits it must not alter the signed wording afterwards; if the
  committed text differs from what was reviewed, condition 8 has to be reopened.
  The agent records human statements only and signs on behalf of no role.

## Push verification update (2026-11-16)

`origin/feat/travel_preference` is at `27b09e6`, thirteen commits ahead of
`origin/main` `7d939b0`, so the revised delta and Emily's approval record are
published and reviewable. Condition 2's "pending requested commit/push" is
therefore closed; `eca9abe` was the tip quoted before the later commits
`658ba42`, `3c120ac` and `27b09e6`. The SA re-review and the validation follow-up
are settled in the closure section below.

Branch state moved again after that paragraph was written: `origin/main` has since been merged into
`feat/travel_preference` several times on 2026-11-16 (the REQ-019 records note a fourth and a sixth
merge), so the quoted tip `27b09e6` and the "thirteen commits ahead" count are stale. The push itself
is still verified — the branch tip is on `origin/feat/travel_preference` — but the exact tip and
ahead/behind count must be re-read when G2 takes its evidence, not quoted from here.

## G1 closure (2026-11-16)

SA evelyn.huang re-reviewed the revised contract, including the confirmation and
cancellation behavior that replaced immediate delete, and passed it on 2026-11-16.
The Pass is relayed by the change author and carries no findings. With the IO
approval already recorded on 2026-11-15, both required roles have signed and G1 is
closed.

Recorded limitation, deliberately not presented as a pass: `openspec validate
--strict` still exits 1, so the gate was closed with that item outstanding; it blocks
archive, not P4 start. Its two overlong ADDED bodies were shortened on 2026-11-16 and the
remaining archive/preamble/Clarifications warnings plus the rerun are still open (condition 6). Condition 1 is an
implementation prerequisite rather than an alignment condition: REQ-019's G1 is
closed too, but its `V4` migration and preferences page are still absent from the
tree, so this change remains unbuildable and unmergeable until they land.

## Implementation prerequisite update (2026-11-16)

REQ-019 reached P4 on this branch, so the factual premise of condition 1 and of the
retained risks below has changed. This section re-checks it and **supersedes** the
"still absent from the tree" sentence in *G1 closure*:

- The table is on disk at `V6__create_member_preference.sql`, not `V4`: `main` took `V4`
  for splits, and `V5__create_main_plan.sql` already declares `member_preference` with
  `IF NOT EXISTS`, so `V6` is a no-op there. The shape this change relies on is unchanged:
  `(trip_id, user_id, kind, payload TEXT, updated_at)` with `UNIQUE(trip_id, user_id,
  kind)`, which is exactly what the `kind='must_do'` single-row upsert needs.
- The preferences page exists as `frontend/src/pages/PreferencesPage.tsx`, at revision 1
  (one interest section plus one page-level `.actionbar` save button, React Query cache
  keyed `['preferences', tripId, userId]`). Revision 2 adds the must-do section on top of
  that shell.
- `PreferenceErrorAdvice` is already scoped to `com.gogo.preference`
  (`@RestControllerAdvice(basePackages = "com.gogo.preference")`), so `INVALID_REQUEST` and
  the `MUST_DO_*` codes are producible without touching `TripErrorAdvice`.
- Reuse is **not** free at code level: `PreferenceRepository` hard-codes `kind='interest'`
  in both `save` and `membersOf`, and `PreferencePayload` is a single `{codes: [...]}`
  shape. This change must parameterise the kind and add its own `{"items": [...]}` payload
  codec; `PreferenceService` and the controller's `caller()` identity → trip → membership
  sequence are reusable as-is.
- REQ-019 stands at G2 (record prepared, named VL unsigned) with PR #44 open against
  `main`. This change is therefore implementable and locally verifiable **on the branch**,
  while merging to `main` still waits behind REQ-019.

## Revision re-review (2026-11-16) — Pass

Two amendments landed after this gate closed, both found while starting P3. **Both are signed**:
IO Emily and SA evelyn.huang passed them on 2026-11-16, relayed by the change author per explicit
user instruction, with no finding and no condition attached. Condition 8 is closed on that basis.

**(1) The MODIFIED `Preferences page` requirement was re-based.** It had been written against
REQ-019's page requirement **before** that revision, so it still said "seven predefined interests"
with `Art` / `Nature` examples and carried no layout paragraph, while the signed REQ-019 revision
and the code shipped on this branch have ten Chinese labels, emoji chips and the
`screen-08-preferences.png` layout. Left as it was, archiving this delta would have dropped
revision 1's layout paragraph out of the Living Spec, and the E2E rows would have asserted labels
that do not exist.

- Re-based text (in `specs/preferences/spec.md`, under its "Revision (2026-11-16, P3)" note): ten
  interests in catalogue order; a layout paragraph covering both sections (app bar `我的偏好` /
  `<display name> · US-019~020` / save-state badge, `兴趣（US-019 · 预设列表、不重复）` chips and hint
  line, the bottom action bar, `必做项（US-020 · 可增删改）` rows with pin and clock markers,
  `添加必做项`, the `活动名称` / `地点` / `固定时间` form with `取消` / `保存`); the badge scoped to the
  interests section; and the corrected `Loading` scenario (one interest save action, not two).
- Rulings R1–R3 were added to the delta's Clarifications: the subtitle range (which changes a
  shipped string), the must-do strings taken from screen-08, and the badge scope. C1–C6 are
  untouched.

**(2) A storage-only `name` mirror was added (R4).** `MainPlanService.mustDoItems`, already merged
to `main`, reads `item.path("name")`, and `V5__create_main_plan.sql` seeds `must_do` rows for the
fixture trip in that shape (`name`, no `id`). This change's contract writes `activity`, so without a
ruling every item saved here would reach main-plan generation as an empty string while
`MainPlanApiTest` — which asserts only `$.mustDo.length()` — stayed green. The user chose the
storage mirror over the two alternatives (making that reader take `activity` first with a `name`
fallback, or a `V7` rewrite of the seeds), so this change stays inside its own package and touches
neither `com.gogo.mainplan` nor the seeds.

- The payload becomes `{"items": [{id, activity, name, location, time}]}`; `name` equals `activity`,
  is written on create, updated on edit, disappears with its item, and never appears in a response.
  Two scenarios were added to make both halves observable ("The stored payload mirrors the activity
  under `name`", "The storage mirror never reaches a response", the latter also asserting that
  `GET /api/trips/{tripId}/main-plan/inputs` still lists the activity).
- The seeded legacy rows are handled by REQ-019's DD1 precedent rather than by a tolerance branch:
  the seeds stay, the API tests clear `member_preference` per case, and the development database is
  re-seeded by hand at P4.
- **The signed totals changed**: 3 requirements / 44 scenarios (19 + 6 + 19), not 42. Both ADDED
  requirements are affected by R4, which is why the re-review was opened at all; it is now signed, so
  P4 may start on the 44-scenario package. The 42-scenario counts kept in *Inputs* and in
  `dov-ac-review.md` §1 remain as the record of the earlier signature and are not rewritten.
- Unchanged: both endpoints and their paths, the whole-list replace semantics, server-issued ids,
  the seven-step validation order, the five `MUST_DO_*` codes, the four-key response items, zero
  migration, and C1–C7.
- Signatures: **IO Emily — Pass, 2026-11-16** and **SA evelyn.huang — Pass, 2026-11-16**, both on
  the two amendments above, both relayed by the change author under explicit user instruction. No
  finding or condition was relayed with either signature. The agent did not sign for either role.
  Recorded limitation: the reviewed text is the uncommitted working-tree version — see *Provenance*.

## Inputs

- Delta Spec: `specs/preferences/spec.md` — 3 requirements over the existing capability
  `preferences` (2 ADDED: `Save member must-do items`, 18 scenarios; `Read member must-do
  items`, 5 scenarios; 1 MODIFIED: `Preferences page`, revision 2, 19 scenarios),
  42 scenarios in total. **Superseded 2026-11-16**: the delta now reads 19 + 6 + 19 = 44 scenarios
  after the page re-basing and the R4 storage mirror (revision re-review above); the counts in this
  bullet and in `dov-ac-review.md` §1 are the ones the IO and the SA signed.
  The declared baseline is the unarchived delta of
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
  independently runnable (superseded 2026-11-16: both are on the branch, the migration as
  `V6` — see *Implementation prerequisite update*)
- Structural check: `spec.md` follows `# Spec Delta` → `## ADDED Requirements` →
  `## MODIFIED Requirements` → `## Clarifications`, with 3 `### Requirement:` blocks and
  44 `#### Scenario:` blocks (42 before the R4 mirror; see condition 8). Strict validation last
  executed 2026-11-15 exited 1: two ADDED bodies exceeded 500 characters — those two were shortened
  on 2026-11-16 to 493 and 432 characters, measured by a line-join script because no `openspec` CLI
  is available here, so the rerun is still owed. Preamble/Clarifications are not archived. Archive
  also needs REQ-019 to establish the Living Spec first. Strict validation is not passed.
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
- **Retained risks (recorded, not conditions of the delta itself):** (a) **closed
  2026-11-16** — `PreferenceErrorAdvice` is already scoped to `com.gogo.preference`, so
  `INVALID_REQUEST` and the `MUST_DO_*` codes need no change to `TripErrorAdvice`; (b)
  **narrowed 2026-11-16** — REQ-019's table and page are on the branch (the migration as
  `V6`), so only the merge to `main` still depends on REQ-019's G2 and PR #44; (c) `docs/knowledge/
  architecture/tech-stack-plan.md` §5/§6 still describes envelopes, `X-Member-Id`,
  `JdbcClient` and Ant Design 5 while the merged code uses bare DTOs, `X-User-Id`,
  `JdbcTemplate` and hand-written CSS (REQ-020 OQ-14, team-owned).
- **Current review outcome:** both roles have signed the revised package **and** the two P3
  amendments. Emily's IO approval (2026-11-15) covers confirmation/cancellation behavior; the SA
  re-reviewed the revised contract and passed it on 2026-11-16, relayed by the change author, so
  the earlier reservation about the historical Pass no longer applies. On 2026-11-16 both roles also
  passed the page re-basing (R1–R3) and the R4 storage mirror, relayed the same way, which closes
  condition 8 and makes 44 scenarios the signed total.

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
| 1 | `req-019-save-interests` reaches a closed G1 and lands the `member_preference` migration plus the preferences page on the branch; until then this change cannot be implemented, verified or merged | evelyn.huang (SA) / Dev | closed 2026-11-16 — G1 closed and P4 landed on the branch at `V6__create_member_preference.sql` (renumbered from `V4`) plus `PreferencesPage.tsx`; only the merge to `main` still waits on REQ-019's G2 and PR #44 |
| 2 | Push current revised delta and approval record on `feat/travel_preference` | Dev | closed 2026-11-16; `origin/feat/travel_preference` at `27b09e6` |
| 3 | IO approval of revised three-requirement / 42-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction |
| 4 | Re-review the revised confirmation contract and sign G1 for this version | evelyn.huang (SA) | closed 2026-11-16 — Pass on the revised confirmation contract, relayed by the change author; no findings |
| 5 | Fold any IO/SA finding into `specs/preferences/spec.md` (and `proposal.md` if a ruling changes) before P4 implementation | author of this change | closed 2026-11-16 — no IO/SA findings relayed with either signature |
| 6 | Resolve strict warnings and rerun `openspec validate req-020-manage-must-do --strict` | Dev | open — the two overlong ADDED bodies were shortened 2026-11-16 (493 / 432 characters against the 500 limit, measured locally by script); the remaining warnings and the rerun are outstanding, because no `openspec` CLI exists in this environment and strict must not be reported as passed. Blocks archive, not P4 start |
| 7 | Confirm the C1 id-reuse ruling, or record the opposite ruling and amend the payload shape before P4 | evelyn.huang (SA) | closed with the SA's Pass — C1 is written in the delta the SA approved; no separate minute exists, so an opposing ruling must still be recorded before P4 |
| 8 | Re-review and sign both 2026-11-16 amendments: the re-based MODIFIED `Preferences page` requirement (ten interests, the screen-08 layout paragraph, R1–R3) and the R4 storage mirror with its two new scenarios (44 in total) | Emily (IO) / evelyn.huang (SA) | closed 2026-11-16 — both roles Pass, relayed by the change author per explicit user instruction, no finding; signed on the uncommitted working-tree text, so the commit must not alter the signed wording |

- Approvers: **IO = Emily — Pass (2026-11-15; 2026-11-16 for the two P3 amendments)**,
  **SA = evelyn.huang — Pass (2026-11-16, revised contract; 2026-11-16 for the two P3 amendments)**.
- IO sign-off: **Emily — Pass**, 2026-11-15; revised three-requirement / 42-scenario
  package including confirmation dialogs and cancellation, per explicit user instruction.
- SA sign-off: **evelyn.huang — Pass**. The Pass on the previous contract was relayed
  2026-11-15; the Pass on the revised confirmation contract was relayed by the change
  author on 2026-11-16. Neither statement carried a condition. The SA's earlier Pass
  on `req-019-save-interests` is scoped to that change and is not counted again here.
- Page re-basing and R4 sign-off: **IO Emily — Pass (2026-11-16)**, **SA evelyn.huang — Pass
  (2026-11-16)**, both relayed; see "Revision re-review (2026-11-16) — Pass" and condition 8.
- Timestamp: 2026-11-15 (draft, authored by the agent). The agent records human statements
  only; it does not verify identities and does not sign on behalf of either role.

## What this draft does and does not allow

- Allowed: P3 completion (`design.md`, `tasks.md` via `/sdd:task-plan`) **and P4 implementation** of
  the whole change on this branch, now that condition 8 is signed and REQ-019's `V6` table and the
  preferences page exist; citing this gate in G2 for what the signatures covered (44 scenarios).
- Not allowed: merging this change to `main` before REQ-019 merges (PR #44, G2 pending); reporting
  strict validation as passed; archiving before that rerun succeeds (condition 6); altering the signed
  delta wording at commit time — the signature covers the uncommitted text as it stands.

## Next

1. P3 continues: the page requirement has been re-based and signed, `atdd-design.md` is written, and
   `/sdd:task-plan` next writes `design.md` and `tasks.md`. The design must own the
   `{"items": [...]}` payload codec and the kind parameter in `PreferenceRepository`, and settle
   how the must-do section reuses the existing page shell (`.appbar` / `.pick` / `.actionbar`
   idiom, one save action for interests and per-action persistence for items).
2. Condition 8 is closed, so P4 is unblocked. Part of the signed text has since been committed and
   pushed (the header amendments, the R4 mirror and its two scenarios, the shortened ADDED bodies);
   the re-based page requirement and Clarifications R1–R4 are still uncommitted in the working tree.
   Amendment (1) is therefore not yet on the branch, so the commit that carries it must reproduce the
   reviewed wording exactly, and the reviewers should be able to re-read it there.
3. Before archive, rerun `openspec validate req-020-manage-must-do --strict` in an environment that
   has the CLI. The two overlong ADDED bodies behind the last exit 1 are fixed (493 / 432 characters);
   the archive/preamble/Clarifications warnings and the rerun are not, and strict must not be reported
   as passed on the strength of a local measurement.
4. Merge order to `main` is 019 → 020 → 024; REQ-019's G2 is the first link.
