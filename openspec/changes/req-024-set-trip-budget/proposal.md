# Proposal

## Product review amendment (2026-11-15)

The user requires confirmation dialogs before must-do deletion and budget clearing.
Opening, cancelling or dismissing sends no request and preserves data/input;
Confirm sends the existing PUT, with saved state updated from a successful response.
Unset and zero remain distinct, exact copy belongs to UI implementation, and entry
must clearly label currency/major units with currency-specific minor-unit storage.
No conversion or cross-currency comparison is added; US-031 owns that follow-up.
Emily IO approval of the revised 53-scenario package is recorded 2026-11-15 per
the user's separate explicit signing instruction. Previous SA approval covers the
old contract; SA evelyn.huang re-reviewed the revised contract and passed it 2026-11-16, relayed
by the change author; G1 closed 2026-11-16.

## Why

`preferences` was introduced by REQ-019 (interests) and extended by REQ-020 (must-dos). US-024 adds the
third preference kind: an **optional per-person whole-trip budget** with a currency and a hard/soft limit.
It is the input the plan generator filters against ("constraint / budget" step of node 9, the `pv2` hard-limit
check on node 10), so it must be stored in a form that can be compared with known costs later.

The three acceptance criteria pin down the three places this is easy to get wrong: the budget must really
persist (AC1), changing only the limit type must update **in place** instead of appending a second record
(AC2), and "unset" must stay distinguishable from a zero budget (AC3) — a zero budget means "spend nothing",
an unset budget means "no constraint", and collapsing the two silently empties generated plans.

Storage follows `docs/knowledge/architecture/tech-stack-plan.md` (the authority the user pointed at): §5
already enumerates `budget` in `member_preference.kind` and deliberately keeps all four preference types in
one table, so this change needs **no new table and no new migration**, and does not compete for a `V5` slot.
The same section fixes money as `INTEGER` minor units, which is why the wire contract carries `4000` for
40 SGD.

P1 settled D1–D14 (see `requirement-workspace/intents/2026-11-15-req-024.md`): blocking open questions = 0,
DoR BLOCKERs = 0, A0 deep-dive ⑨–⑫ all Pass. The change package can therefore be formed.

## What Changes

- **ADDED** a budget read/write requirement inside the existing `preferences` capability:
  - `GET /api/trips/{tripId}/preferences/budget` →
    `{"members":[{"userId":1,"budget":{"amount":4000,"currency":"SGD","limitType":"hard"}},{"userId":2,"budget":null}]}`,
    ordered by `userId`, one entry per trip member.
  - `PUT /api/trips/{tripId}/preferences/budget` with
    `{"amount":4000,"currency":"SGD","limitType":"hard"}` → `{"budget":{...}}`; `{"amount":null}` clears the
    budget → `{"budget":null}` and the stored payload becomes `{}` while the row is retained.
- Field rules:
  - `amount`: the **key must be present**; a non-negative integer in the currency's minor unit, at most int32.
    `SGD/CNY/USD/EUR` have two decimals, `JPY` has none.
  - `currency`: one of `SGD`, `CNY`, `USD`, `EUR`, `JPY`, matched case-sensitively.
  - `limitType`: `hard` or `soft`.
  - All three present or all three absent; a half budget is rejected.
- Validation is all-or-nothing with a fixed order (identity → trip → membership → readable body → `amount`
  present → amount range → field combination → currency → limit type → write); any failure writes nothing.
- Error codes: `BUDGET_AMOUNT_INVALID`, `BUDGET_FIELDS_INCOMPLETE`, `BUDGET_CURRENCY_NOT_ALLOWED`,
  `BUDGET_LIMIT_TYPE_INVALID`; reusing `USER_REQUIRED`, `NOT_A_MEMBER`, `TRIP_NOT_FOUND`, `INVALID_REQUEST`.
- **MODIFIED** the `preferences` page requirement (third revision): a budget section on
  `#/trips/{tripId}/preferences` with an amount input, a currency select (including `SGD`), a hard/soft
  selector, its own save button and a clear action. The page now has three deliberate write moments:
  interests save explicitly, must-dos save on each action, the budget section saves explicitly.

Unchanged: `greeting`, `trips`, `invitations`; the `/preferences` payload of REQ-019 and the `/must-dos`
payload of REQ-020; `V1`–`V3` migrations and the `member_preference` schema; readiness submission and the
explicit "no preference" state; plan generation and consumption.

No breaking change: the only consumer is this repository's frontend, updated in the same change;
`kind='budget'` is a new value in the same table and does not affect the `interest`/`must_do` read paths.

## Capabilities

### New Capabilities

None. `preferences` is created by the REQ-019 delta and already extended by REQ-020.

### Modified Capabilities

- `preferences` (depends on `req-019-save-interests`, then `req-020-manage-must-do`):
  1 ADDED requirement (budget read/write) + 1 MODIFIED requirement (page: budget section and the
  three-way write-moment rule). The Delta Spec is produced in `/sdd:delta-craft`; this proposal only
  declares the boundary.

## Impact

- **Requirement**: REQ-024 (`requirement-workspace/requirements/REQ-024.md`), intent
  `intents/2026-11-15-req-024.md`, DoR `analysis/req-024-dor.md`, deep-dive `deep-dive.md` §REQ-024,
  impact brief `impact-brief.md` §REQ-024, fixtures `acceptance-test-fixtures.md`.
- **Code**: new budget endpoint/DTO/validation inside `com.gogo.preference` (created by REQ-019);
  read-only reuse of `com.gogo.trip.TripRepository` (`findUserId` / `isMember`); the frontend adds one
  section to the preferences page created by REQ-019 and edited by REQ-020. `App.jsx` and the router are
  untouched.
- **Database**: **no new migration**. Only rows with `kind = 'budget'` are written, `payload` being a single
  `{"amount","currency","limitType"}` object or `{}` when cleared. The database file stays
  `backend/data/gogo.db`.
- **APIs**: 2 new endpoints (`GET`/`PUT .../preferences/budget`), `X-User-Id` identity, bare DTO on success
  and `{"code","message"}` on failure; 4 new `BUDGET_*` codes.
- **Dependencies**: none (no component library, router library or JSON library; the currency decimal table
  is a local constant).
- **Runtime**: ports unchanged (8080 / 5173); each save is a single-row upsert.
- **CI**: both job shapes unchanged; test counts and the frontend bundle change, so this change needs its
  own pipeline evidence and may not reuse REQ-019/REQ-020 conclusions.
- **Docs / harness**: `README.md`, `docs/feedback/verification-*.md`,
  `requirement-workspace/{registry,handoff}.md`. No new long-term knowledge-base fact: the money and `kind`
  conventions already exist in `tech-stack-plan.md` §5.
- **Collaboration (hard merge-order prerequisite)**: this change is stacked on REQ-019 (`V6`, formerly
  `V4`, plus the preferences page — both on `feat/travel_preference` since 2026-11-16) **and**
  REQ-020 (first revision of the page requirement, still pending).
  **Merge order REQ-019 → REQ-020 → REQ-024 must not be inverted**; without the table there is no
  storage and without the page there is nowhere to render the section.

## Effort and ordering

Small: one controller branch, one service method, one DTO group, one interface-test group, zero migrations;
one frontend page section plus currency formatting. Ordering:

```
REQ-019 V6 (formerly V4) + preferences page → REQ-020 page revision → budget endpoint and validation
→ GET read-back → page section → verification matrix / README
```

`GET` read-back is the only evidence chain for AC1 ("still there after reload") and AC3 ("unset is not
zero"), so it must land before the page section.

`/sdd:story-split` skipped: one story (US-024), one capability (modified), 25 scenarios; no story backlog
is needed.

## A0 deep-dive gate

REQ-024 modifies an existing capability, so the deep dive is in scope. `analysis/req-024-dor.md` re-checked
⑨ data contract (one row per `(trip, user, kind)`, single-object payload, cleared state `{}`, minor-unit
integer with a per-currency decimal table, three-field combination rule, fixed validation order, state
transitions), ⑩ boundaries (35 branch assignments), ⑪ cross-REQ consistency (same table/package/page as
REQ-019 and REQ-020, trip date from REQ-003, main-plan flag from REQ-004, plan-document drift, US-031 as
the consumer), ⑫ display contract (10 UI states) — all four Pass → **A0 Pass**, splitting allowed.

## Known deviations carried into later stages

- **Amount is transported in minor units**: 40 SGD is `4000`. The acceptance criteria speak in major units,
  so P4 assertions must record both the wire value (`4000`) and the rendered value (`SGD 40.00`).
- **`JPY` has no minor unit**: the decimal table (`2/2/2/2/0`) must be used, never a hard-coded `* 100`;
  otherwise `JPY 1200` renders as `12.00`.
- **`amount` key presence is significant**: a missing key is `400 INVALID_REQUEST`, `null` is "clear".
  Mapping both to `null` (e.g. a bare Jackson record) breaks AC7-N.
- **Single-object payload has no database constraint**: "exactly one row" is enforced by
  `INSERT ... ON CONFLICT(trip_id,user_id,kind) DO UPDATE`, not by the schema. Verification must assert the
  row count, not only HTTP 200.
- **Page requirement revised a third time**: interests save explicitly, must-dos save per action, the budget
  section saves explicitly. The three write moments are intentional and must be written into the page
  requirement against the REQ-020 revision.
- **Plan §6 deviates**: `tech-stack-plan.md` §6 wants one `PUT /preferences` for all four kinds; this change
  uses a sibling sub-resource so the frozen REQ-019 payload stays untouched. Document fix is folded into
  REQ-019 OQ-16.
- **Plan §5 field drift**: the plan names `member_id` and a plain index; the implementation uses `user_id`
  and `UNIQUE` (`budget` in the `kind` enum, however, is plan-compliant). Already logged by REQ-019.
- **Reference screen conflicts**: its currency list lacks `SGD`, pre-fills `1200` and submits through the
  page-level `submitPref()`. This change requires `SGD` in the list, no default amount, and a section-level
  save button; the UI copy/controls must be adjusted (DoR WARNING).
- **Fixtures not backfilled**: users and the trip come from `acceptance-test-fixtures.md`; the US-024
  behaviour samples live in the requirement's scenario table (OQ-11).
- **Numbering**: requirement number follows the story (`REQ-024`), change id `req-024-set-trip-budget`,
  recorded in the registry alongside the sequential `REQ-00x` numbers.
- **Document language**: openspec deliverables are English (repository rule); the `requirement-workspace/`
  P1 entries stay Chinese for now.

## Strict remediation and delta-spec relocation (2026-11-17)

`openspec validate req-024-set-trip-budget --strict` was run with the CLI at
`%APPDATA%\npm\openspec.cmd`. It exited 1, which had been carried as open G1 condition 7. Four
findings were reported, and all four are remedied here:

| Finding | Level | Remedy |
|---|---|---|
| `MODIFIED "Preferences page"` omits scenarios the current spec still has | ERROR | Six titles take back the names the baseline asserts, because archive replaces the whole requirement block and a renamed Living Spec scenario reads as a deleted one: `Empty interests` → `Empty state`, `Switching identity reloads all three sections` → `Switching identity reloads for the new identity`, `Saving interests disables duplicate submissions` → `Saving disables duplicate submissions`, `A successful interest save follows the response` → `A successful save follows the response`, `A rejected interest save shows an inline error and rolls back` → `A rejected save shows an inline error and rolls back`, `A must-do action does not touch the other sections` → `A must-do action does not touch the interest selection`. Only titles moved; each body keeps its budget assertions, so the wider three-section behaviour is still specified |
| `ADDED "Save member budget"` body is 2,820 characters, over the 500 limit | WARNING | Compressed to **336 characters**. What it dropped became asserted rather than narrated: the fixed validation order and the defect→`code` mapping moved into a new `A defect maps to its own error code` scenario as a table, the half-set `null` case into `An incomplete null budget is not a clear`, and the int32 boundary plus the "no conversion, no comparison, no cap" rule of C4 into `The representable maximum is accepted and the capability does no arithmetic`. The rejection scenarios already written under this requirement pin every other rule, so no contract was lost |
| `ADDED "Read member budgets"` body is 749 characters, over the limit | WARNING | Compressed to **406 characters**; field shape, `null` meaning, `userId` ordering, completeness and read-only are each asserted by the six scenarios under it |
| Delta preamble and `## Clarifications` are not carried into the Living Spec by archive | WARNING | Relocated verbatim into the subsection below. House standard: all archived delta files under `openspec/changes/archive/` carry neither, and `req-019-save-interests` / `req-020-manage-must-do` were restructured the same way |

The MODIFIED page body (previously 3,162 characters) was rewritten on the same baseline as REQ-020's
compressed page text plus the budget section, and now measures **484 characters**, so archiving this
delta no longer re-inflates the Living Spec's 488-character page requirement. Currency formatting and
the unset/zero distinction stay asserted — by `A saved budget is shown again after a reload`,
`A zero budget is rendered differently from an unset budget`, `A zero-decimal currency is formatted
without decimals` and `An unset budget is not rendered as an empty or zero amount`.

After these fixes: `openspec validate req-024-set-trip-budget --strict` →
`Change 'req-024-set-trip-budget' is valid` (**exit 0**). The delta is now 433 lines,
**3 requirements / 56 scenarios** (53 signed + the 3 named above), with only the `ADDED` and
`MODIFIED` sections. Every edit touched wording the two roles signed at G1, so it was carried as a new
re-confirmation condition in `g1-decision.md` rather than reported as covered; **IO Emily and SA
evelyn.huang signed that condition (9) Pass on 2026-11-17**, relayed by the change author per explicit
user instruction, so the 3-requirement / 56-scenario package is the signed one.

### Delta Spec baseline and revision record (moved out of `specs/preferences/spec.md`)

- Change: `req-024-set-trip-budget`, capability `preferences`.
- Baseline (corrected 2026-11-17): the **archived** Living Spec `openspec/specs/preferences/spec.md`
  established by `req-019-save-interests`, plus the REQ-020 delta (`req-020-manage-must-do`), which is
  signed but not yet archived; this delta stacks on both. The original preamble named
  "the `preferences` delta of `req-019-save-interests` plus the delta of `req-020-manage-must-do`;
  neither is archived yet" — REQ-019 has since been archived, which is why six page scenario titles
  had to be restored. The caller identity, trip existence and membership precondition stays defined
  once in REQ-019's `Preference caller identity and membership` and is not restated as a new ADDED
  requirement.
- Storage: `member_preference` with `kind = 'budget'`, one row per member, payload either
  `{"amount": <integer>, "currency": <code>, "limitType": "hard"|"soft"}` or `{}` for the cleared
  state. No migration.
- Amounts are integers in the currency's **minor unit**: `SGD`/`CNY`/`USD`/`EUR` have two decimal
  places, `JPY` has none. 40 SGD is stored and transferred as `4000`; 1200 JPY as `1200`.

### Clarifications (moved out of `specs/preferences/spec.md`)

| id | Decision | Rationale |
|---|---|---|
| C1 | Validation order is fixed and the first failing check decides the response | A request can violate several rules at once; without a fixed order the error `code` would not be assertable |
| C2 | A missing `amount` key is `INVALID_REQUEST`, while `"amount": null` clears the budget | Keeps "malformed request" and "clear" apart, so a truncated body can never silently erase a saved budget |
| C3 | A cleared budget keeps the row with `payload = {}` | Matches REQ-019's rule that clearing never deletes the record; "not set" still has a single wire representation (`null`) |
| C4 | No business upper bound beyond the representable range | The ACs define none; a fabricated limit would become a product rule that later stories must honour |
| C5 | The wire format stays in the currency's minor unit, and the page converts using a per-currency decimal table | Keeps storage integral (plan §5) while the screen shows `40.00`; a hard-coded factor of 100 would break `JPY` |
| C6 | The budget section saves on its own action, never through a page-level submit | Interests save explicitly, must-do items save per action, budgets save per section; one shared submit would write several `kind`s at once |
| C7 | MVP boundary: the closed loop is save, read back, change the limit type, clear | Currency conversion, exchange rates, budget history and any business amount ceiling are intentionally absent (REQ-024 OQ-10/OQ-13), and no other member's budget is rendered by this change; their absence is a scope decision, not an omission |
| C8 | Must-do deletion and budget clearing require confirmation; cancel/dismiss sends no request | User ruling 2026-11-15 supersedes immediate destructive actions; API clear payload and storage semantics are unchanged |
