# AC / DoV review — req-020-manage-must-do

- Date: 2026-11-15
- Stage: P2 `/sdd:delta-craft` (step = all)
- Target: `openspec/changes/req-020-manage-must-do/specs/preferences/spec.md`
- Size: 3 requirements, 42 scenarios (existing capability `preferences`: 2 ADDED, 1 MODIFIED
  page requirement at revision 2, updated with confirmation/cancellation). **Superseded 2026-11-16**:
  3 requirements, 44 scenarios after the two amendments in §8, re-signed by both roles the same day;
  the numbers below are the ones this review pass examined
- Baseline: the unarchived delta of `req-019-save-interests`; identity, trip existence and
  membership are inherited and deliberately not restated
- Nature: AC/DoV review record, **not** a G1 decision; G1 is signed by a human

## 1. Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 every requirement has at least one testable AC | Pass | 3 requirement blocks with 18, 5 and 19 scenarios, 42 total | Page revision 2 includes confirmation and cancellation; SA evelyn.huang re-review passed 2026-11-16 |
| AC-2 ACs are observable | Pass | Assertions anchor on HTTP status, `code`, the returned item fields, the `must_do` row count, the parsed `payload` (item count, id set, stored order, `null` fields), byte comparison of `updated_at` across members, and the rendered section state | No dependency on logs or internal state |
| AC-3 negative and edge cases are called out where risk is high | Pass | 7 rejection scenarios on save, 8 edge scenarios on save, 5 on read, 6 failure/rollback scenarios on the page | See §4 |
| AC-4 no disguised implementation detail, no vague words | Pass | No "correctly", "properly", "quickly", "gracefully", "as expected" or "etc." (searched); every assertion names a status, a `code`, a field or a rendered state | "inline add form" and "delete action" are observation points of the UI, not internal structure |

## 2. Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal, no silent expansion | Pass | Every proposal item (2 endpoints, the `{"items":[...]}` payload, id issuing, the 7-step validation order, 5 `MUST_DO_*` codes, one page section, zero migration) maps to a requirement or a scenario | The page section's write timing (per action) is stated in the MODIFIED requirement, not left implicit |
| DoV-2 ambiguities are listed or resolved | Pass | P1 decisions D1–D14 are in `intents/2026-11-15-req-020.md`; the three P2 rulings (id reuse, request order, no limits) and three further details are fixed in §3 | Blocking open 0 |
| DoV-3 role concerns are noted | Pass with non-blocking items | §6 lists 2 IO, 3 SA and 2 Dev/QA items | None blocks G1, but each needs an owner before P3/P4 |
| DoV-4 no business implementation claimed as done | Pass | This round touches documentation only; nothing under `backend/` or `frontend/` changed | Code lands in P4 |
| DoV-5 requirements trace to the proposal or the approved requirements | Pass | §5 traceability matrix; every requirement points at a REQ-020 scenario, an AC or a decision | No orphan requirement |

## 3. Contract details fixed in this round

| id | Detail | Basis | Effect |
|---|---|---|---|
| C1 | Item ids are unique within the caller's list only and may be reassigned after the list is emptied (`max + 1`) | Ids are never referenced outside the list; a durable counter would need an extra payload field or a second table, which the MVP does not need | Scenario "Item ids are list-local and may be reassigned"; narrows the proposal's original "not reused after deletion", and `proposal.md`, `analysis/req-020-dor.md` ⑨ plus one WARNING row and `intents` D14 were amended together |
| C2 | The stored and returned order is the request order | Makes assertions repeatable and matches the interest set's ordering rule; no server-side sorting rule is added | Scenario "Items keep the submitted order" |
| C3 | No item-count limit, field-length limit or name-based deduplication | The ACs define none, and a fabricated limit would become a product rule | Removes a useless branch; the capability states the absence explicitly |
| C4 | An absent `location`/`time` is stored as `null`, not omitted | Keeps the stored and returned item shape fixed, so assertions do not depend on key presence | Scenario "Whitespace is trimmed and blank optional fields become null" |
| C5 | Both `location` and `time` may be saved together | Overrides the reference screen's "choose one of location or time" wording, per P1 D6 | Scenario "Both location and time may be saved together" |
| C6 | Delete requires confirmation; Cancel/dismiss sends no PUT and preserves items | User ruling 2026-11-15 supersedes the former immediate-delete choice | Page scenarios cover opening, confirmation and cancellation; API replace-list semantics are unchanged |
| C7 | The inherited 401/403/404 paths are not restated as local scenarios | They are defined once in REQ-019's identity requirement and apply unchanged | A reviewer who wants local copies must ask before P4; adding them would duplicate a contract |

## 4. Edge and failure scenarios added by this review

| id | Scenario | Location | Source |
|---|---|---|---|
| E1 | An edit keeps the same item, its id and the item count | Save member must-do items | AC2 made explicit |
| E2 | An item missing from the request is deleted (omission is the delete path) | Save member must-do items | Consequence of whole-list replace |
| E3 | An empty array clears the list but keeps the row with `{"items":[]}` | Save member must-do items | AC3 |
| E4 | Items keep the submitted order, and editing one does not reorder | Save member must-do items | Added |
| E5 | Item ids may be reassigned after the list is emptied, and nothing outside the list refers to them | Save member must-do items | Added (C1) |
| E6 | A location alone, a time alone, or both are all valid; the missing field reads back as `null` | Save member must-do items | P1 AC14-N and AC15-N |
| E7 | Surrounding whitespace is trimmed, and a blank optional field becomes `null` | Save member must-do items | Added |
| E8 | A malformed time (`10:0`, `10:00:00`, `25:00`, `10am`, `1 0:00`, `24:00`) is rejected | Save member must-do items | P1 AC10-N made enumerable |
| E9 | An unknown or foreign item id rejects the whole request, and both members' rows stay byte-identical | Save member must-do items | P1 AC11-N |
| E10 | A duplicated id inside one request is rejected before any write | Save member must-do items | P1 AC12-N |
| E11 | A mixed request is rejected as a whole, so the valid new item is not stored either | Save member must-do items | Strengthened reading of "zero write on rejection" |
| E12 | Repeating an identical list is idempotent: ids, order and `payload` unchanged | Save member must-do items | P1 AC13-N |
| E13 | A member without items appears with `mustDos: []`; members are never omitted and are ordered by `userId` | Read member must-do items | Added |
| E14 | Members do not overwrite each other, and their ids are unrelated | Read member must-do items | P1 AC3-M |
| E15 | An in-flight item action blocks a duplicate submission, and a failure rolls the list back | Preferences page | P1 AC18-N plus AC13-N |
| E16 | A must-do action sends no interest `PUT` and leaves an unsaved interest selection untouched | Preferences page | Added (the two sections must stay independent) |

## 5. Traceability

| Proposal / requirement item | Requirement | Key scenarios |
|---|---|---|
| AC1 (add, read back, survives reload) | Save; Read; Page | An item is added and read back; a member reads back the saved list; saved must-do items are shown again after a reload |
| AC2 (edit in place, no second item) | Save; Page | An edit keeps the same item; editing an item persists immediately and keeps the item count |
| AC3 (delete removes only the caller's item) | Save; Read | An item missing from the request is deleted; an empty list clears but keeps the record; members do not overwrite each other |
| Proposal: `GET`/`PUT .../preferences/must-dos` | Save; Read | Endpoint shapes asserted in every scenario |
| Proposal: whole-list replace, server-issued id | Save | An item is added and read back; an edit keeps the same item; the first save creates exactly one row |
| Proposal: 7-step validation, zero write on rejection | Save | A missing activity rejects the whole request; an item without a location and without a time is rejected; a malformed time is rejected; an unknown or foreign item id rejects the whole request; a duplicated id in one request is rejected; a mixed request is rejected as a whole |
| Proposal: 5 `MUST_DO_*` codes plus 4 reused codes | Save | One scenario per code, plus C7 for the inherited three |
| P1 AC4-N, AC5-N, AC6-N (401/403/404) | Identity and membership | Inherited from REQ-019; not restated (C7) |
| P1 AC7-N (malformed body) | Save | A malformed body is rejected |
| P1 AC16-N (`GET` twice) | Read | Reading changes nothing |
| P1 AC17-N (load failure) | Page | Loading fails |
| Proposal: page section with per-action save | Page | Add/edit and confirmed delete each persist through their own request; no page-level save exists |
| User ruling 2026-11-15; REQ-020 OQ-13 | Page | Delete opens a dialog without a request; Confirm sends one PUT; Cancel/dismiss preserves items and unrelated input |

## 6. Residual risks and role concerns

| Role | Concern | Blocks G1? |
|---|---|---|
| IO | User accepted 2026-11-15: location and time may both be supplied, overriding reference wording | C5 confirmed; Emily subsequently approved revised package by separate explicit instruction |
| IO | User rejected immediate delete 2026-11-15: confirmation dialog required | C6 and page scenarios updated; Emily IO Pass recorded 2026-11-15 for 42 scenarios; revised SA review passed 2026-11-16 (evelyn.huang) |
| SA | The change is zero-migration but hard-depends on REQ-019's `V4__create_member_preference.sql` and on the preferences page, neither of which is on disk yet | No for the delta, yes for P4/merge; recorded as condition 1 of the G1 draft. **Updated 2026-11-16**: both landed on the branch — the migration as `V6__create_member_preference.sql` (renumbered) and `frontend/src/pages/PreferencesPage.tsx` — so condition 1 is closed and only the merge to `main` behind PR #44 remains |
| SA | `TripErrorAdvice` covers `com.gogo.trip` only, so `INVALID_REQUEST` and the `MUST_DO_*` codes need a preference-owned advice or a widened scope | No, decided in P3 |
| SA | C1 (ids may be reused after the list is emptied) narrows the proposal's earlier wording. Confirm it, or switch to a durable counter before P4, because the payload shape changes | No, but it should be confirmed at G1 |
| Dev/QA | Item ids live inside the JSON payload, so the database cannot enforce uniqueness; assertions must compare the id set and the item count, not just the HTTP status | No; already stated in the scenarios |
| Dev/QA | Strict validation executed 2026-11-15, exit 1: ADDED body length and archive/preamble/Clarifications warnings; Living Spec awaits REQ-019 | Not passed; remediation tracked in G1 condition 6. **Updated 2026-11-16**: the ADDED body length part is fixed (see §8.3); the remaining warnings and the rerun are not |
| Team | `docs/knowledge/architecture/tech-stack-plan.md` §5/§6 still describes envelopes, `X-Member-Id`, `JdbcClient` and Ant Design 5 while the code uses bare DTOs, `X-User-Id`, `JdbcTemplate` and hand-written CSS | No; REQ-020 OQ-14, team-owned |

## 7. Conclusion

- AC: 4/4 Pass
- DoV: 5/5 Pass (DoV-3 carries non-blocking IO/SA concerns)
- Blocking ambiguities: 0
- Ready for `/sdd:g1-decision-record`. This file is not a G1 decision and does not claim that any
  code is implemented.

## 8. Revision (2026-11-16, P3) — page re-basing and the R4 storage mirror

Two amendments were made while starting `/sdd:atdd-design`. Neither is an IO or SA statement.

**8.1 The MODIFIED `Preferences page` requirement was re-based.** It had been written against
REQ-019's page requirement **before** its 2026-11-16 revision, so it drifted from both the signed
baseline and the shipped code.

| Point | Before | After the re-basing |
|---|---|---|
| Catalogue | "seven predefined interests", `Art` / `Nature`, "the other five" | ten Chinese labels (`水上运动` … `慢游`), `摄影` / `自然风景`, "the other eight" — matches `INTEREST_OPTIONS` in `frontend/src/types/preferences.ts` |
| Layout | absent | the `screen-08-preferences.png` paragraph of revision 1, extended with the must-do section (heading `必做项（US-020 · 可增删改）`, `添加必做项`, the `活动名称` / `地点` / `固定时间` form, `取消` / `保存`, pin and clock markers); archiving the old text would have dropped revision 1's layout out of the Living Spec |
| Save actions | the `Loading` scenario disabled "both 'Save' actions" | one interest save action in the bottom bar; must-do persists per action (R3 scopes the badge to the interests section) |
| Subtitle | inherited `· US-019` | `<display name> · US-019~020` (R1) |
| Clarifications | C1–C6 | C1–C6 unchanged, C6's rationale now also records that the reference screen deletes a row immediately, plus R1–R3 from the re-basing |

**8.2 A storage-only `name` mirror was added (R4, user ruling 2026-11-16).**

| Point | Before | After |
|---|---|---|
| Payload | `{"items": [{id, activity, location, time}]}` | `{"items": [{id, activity, name, location, time}]}`, `name` = `activity`, written on create, updated on edit, gone with its item |
| Response | four keys per item | unchanged — four keys; `name` SHALL NOT appear in any response |
| Reason | — | `MainPlanService.mustDoItems`, merged to `main`, reads `item.path("name")`, and `V5__create_main_plan.sql` seeds `must_do` rows in that shape; without the mirror, items saved through this change would reach main-plan generation as empty strings while `MainPlanApiTest` (which asserts only `$.mustDo.length()`) stayed green |
| New scenarios | — | "The stored payload mirrors the activity under `name`" (Save) and "The storage mirror never reaches a response" (Read, which also asserts `GET .../main-plan/inputs` still lists the activity) |
| Rejected alternatives | — | changing the merged reader to `activity`-first with a `name` fallback (touches another capability's code), and a `V7` rewrite of the seeds (breaks the zero-migration claim and `MainPlanApiTest`) |
| Legacy seeded rows | — | REQ-019 DD1 precedent: seeds stay, the API tests clear `member_preference` per case, the development database is re-seeded by hand at P4; no tolerance branch for the `name`-only shape |

- DoV re-check on both amendments: AC-2 still Pass — the mirror is observable (payload read through
  `JdbcClient`, response key set asserted, main-plan inputs asserted), not an internal claim. DoV-1
  carries a **closed deviation**: the proposal's payload shape, its Database impact and its test count
  were amended in the same round, so proposal and delta agree again, but the amended text was not the
  text the SA had signed — both roles then signed it on 2026-11-16. DoV-4 still Pass — documentation
  only, nothing under `backend/` or `frontend/` changed.
- **Counts superseded**: §1's "18, 5 and 19 scenarios, 42 total" and AC-3's "8 edge scenarios on
  save" are the numbers this review examined. The delta now holds 19 + 6 + 19 = **44** scenarios, with
  9 save edge cases, and that is the re-signed total. §1 is kept as the record of what was reviewed.
- **Re-signed 2026-11-16.** Both amendments were re-reviewed and passed by IO Emily and SA
  evelyn.huang on 2026-11-16, relayed by the change author under explicit user instruction, with no
  finding; condition 8 of `g1-decision.md` ("Revision re-review (2026-11-16) — Pass") is closed, so
  P4 may start and G2 may cite the gate on the 44-scenario package. Two limitations are recorded
  there and are not hidden here: the signature is relayed rather than documented, and it was given on
  the working-tree text, which the user instructed not to commit or push while REQ-019's G2 was open.
  Part of it has since been committed and pushed — the header amendments, the R4 mirror and the
  shortened ADDED bodies — while the re-based page requirement and R1–R4 are still uncommitted; the
  commit that carries them must not alter the signed wording. Strict validation remains exit 1
  (condition 6, an archive blocker).

**8.3 The two ADDED requirement bodies were shortened (2026-11-16, G1 condition 6).**

A formatting change made after the signatures, not a third amendment, so it does not reopen
condition 8.

| Point | Before | After |
|---|---|---|
| `Save member must-do items` body | 3,267 characters | 493 characters |
| `Read member must-do items` body | 740 characters | 432 characters |
| Contract | — | unchanged: every statement the compression dropped is asserted by a scenario of the same requirement (200 and the four response keys, trim and blank→`null`, the empty-list row, single-row upsert, idempotence, zero write on rejection with the six `MUST_DO_*` / `INVALID_REQUEST` codes, body shape, list-local ids, the two-key/ascending read response) |
| Scenarios and counts | 19 + 6 + 19 = 44 | unchanged, 44 |
| Evidence | — | measured locally by joining the lines between `### Requirement:` and the first `#### Scenario:`; no `openspec` CLI is available in this environment, so the strict rerun is still owed and strict is not reported as passed |
| Not touched | — | the MODIFIED `Preferences page` body is still 3,247 characters. Strict reported only the two ADDED bodies, and that text is signed, so shortening it would alter signed wording and reopen condition 8; it needs a ruling first |
