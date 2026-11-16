# AC / DoV review — req-024-set-trip-budget

- Date: 2026-11-15
- Stage: P2 `/sdd:delta-craft` (step = all)
- Target: `openspec/changes/req-024-set-trip-budget/specs/preferences/spec.md`
- Size: 3 requirements, 53 scenarios (existing capability `preferences`: 2 ADDED, 1 MODIFIED
  page requirement at revision 3, updated with confirmation/cancellation/failure paths)
- Baseline: the unarchived deltas of `req-019-save-interests` and `req-020-manage-must-do`;
  identity, trip existence and membership are inherited, and page revision 3 reproduces
  revision 2 verbatim
- Nature: AC/DoV review record, **not** a G1 decision; G1 is signed by a human

## 1. Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 every requirement has at least one testable AC | Pass | 3 requirement blocks with 18, 6 and 29 scenarios, 53 total | Page revision 3 includes delete/clear confirmation, cancellation and clear failure; SA evelyn.huang re-review passed 2026-11-16 |
| AC-2 ACs are observable | Pass | Assertions anchor on HTTP status, `code`, the returned `budget` object, whether `budget` is `null`, the presence of the `amount` key in `payload`, the `budget` row count, byte comparison of `updated_at` across members, and the rendered amount and label | "not set" versus `0` is asserted twice: on the wire and on screen |
| AC-3 negative and edge cases are called out where risk is high | Pass | 9 rejection scenarios on save, 9 edge scenarios on save, 6 on read, 5 failure/rollback scenarios on the page | See §4 |
| AC-4 no disguised implementation detail, no vague words | Pass | No "correctly", "properly", "quickly", "gracefully", "as expected" or "etc." (searched); every assertion names a status, a `code`, a field or a rendered value | "rendered as `40.00` with `SGD`" is an observation point, not a formatting implementation |

## 2. Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal, no silent expansion | Pass | Every proposal item (2 endpoints, the `{"amount","currency","limitType"}` payload, the clear shape `{"amount":null}`, 4 `BUDGET_*` codes, one page section, zero migration) maps to a requirement or a scenario | `kind='budget'` is already named in `tech-stack-plan.md` §5, so no new kind is invented |
| DoV-2 ambiguities are listed or resolved | Pass | P1 decisions are in `intents/2026-11-15-req-024.md`; the eight-check validation order, the missing-key ruling, the minor-unit rule and four further details are fixed in §3 | P1 OQ-10 (business amount ceiling) is now decided, not deferred |
| DoV-3 role concerns are noted | Pass with non-blocking items | §6 lists 3 IO, 4 SA and 2 Dev/QA items | None blocks G1, but each needs an owner before P3/P4 |
| DoV-4 no business implementation claimed as done | Pass | This round touches documentation only; nothing under `backend/` or `frontend/` changed | Code lands in P4 |
| DoV-5 requirements trace to the proposal or the approved requirements | Pass | §5 traceability matrix; every requirement points at a REQ-024 scenario, an AC or a decision | No orphan requirement |

## 3. Contract details fixed in this round

| id | Detail | Basis | Effect |
|---|---|---|---|
| C1 | The eight validation checks run in a fixed order and the first failure decides the response | One request can violate several rules at once; without an order the `code` is not assertable | One scenario per `code`, plus scenarios that violate two rules at once |
| C2 | A missing `amount` key is `INVALID_REQUEST`, while `"amount": null` clears the budget | Keeps "malformed" and "clear" apart, so a truncated body can never erase a saved budget | Scenario "A missing amount key is not the same as a null amount" |
| C3 | A cleared budget keeps the row with `payload = {}` | Matches REQ-019's rule that clearing never deletes the record, and "not set" keeps one wire representation (`null`) | Scenarios "Clearing returns to 'not set' but keeps the row" and "A cleared budget reads null as well" |
| C4 | No business upper bound beyond the representable range | The ACs define none; a fabricated ceiling would become a product rule | Scenario "An amount above the representable range is rejected"; P1 OQ-10 closed |
| C5 | The wire format stays in the currency's minor unit and the page converts with a per-currency decimal table | Keeps storage integral (plan §5) while the screen shows `40.00`; a hard-coded factor of 100 breaks `JPY` | Scenarios "A zero-decimal currency carries its minor-unit value" and "A zero-decimal currency is formatted without decimals" |
| C6 | The budget section saves through its own action; the three sections keep three write timings | Interests save explicitly, must-do items save per action, budgets save per section; one shared submit would write several `kind`s at once | Scenarios "Saving the budget sends one request and touches nothing else" and "A must-do action does not touch the other sections" |
| C7 | MVP boundary: save, read back, change the limit type, clear. No conversion, no history, no other member's budget rendered | The ACs define the closed loop only | Recorded in `Clarifications` C7 so P4/P5 do not add scope |

## 4. Edge and failure scenarios added by this review

| id | Scenario | Location | Source |
|---|---|---|---|
| E1 | Changing the limit type overwrites the same row instead of adding a second one | Save member budget | AC2 made explicit |
| E2 | Zero is a value, not an unset budget; the stored payload carries `amount = 0` | Save member budget | AC3b |
| E3 | Clearing returns `{"budget":null}` while the row survives with `payload = {}` | Save member budget | AC3c |
| E4 | Zero and "not set" stay distinguishable in both directions, with one row throughout | Save member budget | AC3d |
| E5 | A zero-decimal currency stores and returns its minor-unit value unchanged | Save member budget | AC3e |
| E6 | A negative amount, a non-integer amount and an amount above the representable range are rejected with `BUDGET_AMOUNT_INVALID`, leaving the previous value byte-identical | Save member budget | P1 AC8-N, AC9-N, AC10-N |
| E7 | A missing `amount` key is rejected as `INVALID_REQUEST` and does **not** clear the budget | Save member budget | Added (C2) |
| E8 | Half budgets are rejected: amount without currency, amount without limit type, and a null amount with either of the two | Save member budget | P1 AC11-N, AC14-N, AC15-N |
| E9 | Currency and limit type are matched strictly: `sgd`, `SGDX`, `XXX`, `""`, `HARD`, `medium` are all rejected | Save member budget | P1 AC12-N, AC13-N made enumerable |
| E10 | A save after the main plan is confirmed behaves identically, because no locking branch exists | Save member budget | P1 AC18-N, added during G1 drafting |
| E11 | Repeating an identical body is idempotent: `payload` and the row count unchanged | Save member budget | P1 AC16-N |
| E12 | One member's save leaves another member's `payload` and `updated_at` byte-identical | Save member budget | P1 AC2-M |
| E13 | A member who never saved reads `budget: null`; a cleared member also reads `null` and is not omitted | Read member budgets | P1 AC3a plus C3 |
| E14 | An unset budget is not rendered as an empty or zero amount, and a saved `0` is not rendered as "not set" | Preferences page | The AC3 distinction carried to the screen |
| E15 | A rejected budget save keeps the server's saved value while the controls keep the typed input | Preferences page | P1 AC19-N |

## 5. Traceability

| Proposal / requirement item | Requirement | Key scenarios |
|---|---|---|
| AC1 (save 40 SGD hard, read back, survives reload) | Save; Read; Page | A budget is saved and read back; a member reads back the saved budget; a saved budget is shown again after a reload |
| AC2 (change the limit type in place, one row) | Save; Page | Changing the limit type keeps one row; saving the budget sends one request and touches nothing else |
| AC3 (unset, zero and clear are three states) | Save; Read; Page | Zero is a value, not an unset budget; clearing returns to "not set" but keeps the row; a member without a budget reads null; a zero budget reads back as zero |
| Proposal: `GET`/`PUT .../preferences/budget` | Save; Read | Endpoint shapes asserted in every scenario |
| Proposal: `{"amount":null}` clears | Save | Clearing returns to "not set" but keeps the row; a null amount with a currency is rejected |
| Proposal: 4 `BUDGET_*` codes plus 4 reused codes | Save | One scenario per `code`; the inherited three are covered by REQ-019's identity requirement |
| Proposal: currency whitelist and `hard`/`soft` | Save | An unsupported currency code is rejected; an unsupported limit type is rejected |
| Proposal: amounts in minor units | Save; Page | A zero-decimal currency carries its minor-unit value; a zero-decimal currency is formatted without decimals |
| P1 AC4-N, AC5-N, AC6-N (401/403/404) | Identity and membership | Inherited from REQ-019; not restated |
| P1 AC7-N (malformed body) | Save | A malformed body is rejected |
| P1 AC17-N (`GET` twice) | Read | Reading changes nothing |
| Proposal: page section with its own save action | Page | Saving the budget sends one request and touches nothing else; saving the budget blocks duplicate submissions |
| User ruling 2026-11-15; delta C8 | Page | Both destructive actions require confirmation; Cancel/dismiss sends no PUT; failed confirmed clear preserves saved budget and shows an error |

## 6. Residual risks and role concerns

| Role | Concern | Blocks G1? |
|---|---|---|
| IO | User accepted 2026-11-15: unset and zero are distinct; exact copy belongs to UI implementation | No; distinction remains contractual |
| IO | User accepted 2026-11-15: clearly labelled currency and major-unit entry, currency-specific minor-unit storage (40 SGD -> 4000) | No; explicit page obligation |
| IO | User rejected immediate clearing 2026-11-15: both budget clear and must-do delete require confirmation | C8 and confirm/cancel/failure scenarios updated; Emily IO Pass recorded 2026-11-15 for 53 scenarios by separate explicit instruction; revised SA review passed 2026-11-16 (evelyn.huang) |
| SA | Two ordered prerequisites: REQ-019's `V4` plus page revision 1, then REQ-020's page revision 2, which revision 3 reproduces | No for the delta, yes for P4/merge; conditions 1 and 2 of the G1 draft |
| SA | The eight-step validation order (C1) decides which `code` a multi-violation request returns. Confirm it before P4, since tests encode it | No, but it should be confirmed at G1 |
| SA | `TripErrorAdvice` covers `com.gogo.trip` only, so the `BUDGET_*` codes need a preference-owned advice or a widened scope | No, decided in P3 |
| SA | User accepted 2026-11-15: cross-currency comparison/conversion excluded here and deferred to US-031 | No; REQ-024 OQ-13 |
| Dev/QA | The per-currency decimal table must be a code constant, not a database column, otherwise `JPY` breaks the wire contract | No; P3 obligation |
| Dev/QA | Strict validation executed 2026-11-15, exit 1: ADDED body length and archive/preamble/Clarifications warnings; Living Spec awaits REQ-019. Architecture single-PUT drift remains separate OQ-14 | Not passed; remediation tracked in G1 condition 7 |

## 7. Conclusion

- AC: 4/4 Pass
- DoV: 5/5 Pass (DoV-3 carries non-blocking IO/SA concerns)
- Blocking ambiguities: 0
- Ready for `/sdd:g1-decision-record`. This file is not a G1 decision and does not claim that any
  code is implemented.
