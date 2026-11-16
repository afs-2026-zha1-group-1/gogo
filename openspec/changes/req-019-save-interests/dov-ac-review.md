# AC / DoV review — req-019-save-interests

- Date: 2026-11-15
- Stage: P2 `/sdd:delta-craft` (step = all)
- Target: `openspec/changes/req-019-save-interests/specs/preferences/spec.md`
- Size: 5 requirements, 31 scenarios (new capability `preferences`, ADDED only)
- Nature: AC/DoV review record, **not** a G1 decision; G1 is signed by a human

## 1. Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 every requirement has at least one testable AC | Pass | `spec.md` holds 5 `### Requirement:` blocks with 4–9 scenarios each, 31 in total | No placeholder requirement |
| AC-2 ACs are observable | Pass | Assertions anchor on HTTP status, `code`, response fields, the row count and parsed `payload` of `member_preference`, byte comparison of `updated_at`, and the selected state of the controls | No dependency on logs or internal state |
| AC-3 negative and edge cases are called out where risk is high | Pass | 5 scenarios on identity/membership, 4 on the catalogue, 8 on save, 5 on read, 9 on the page | See §4 |
| AC-4 no disguised implementation detail, no vague words | Pass | No "correctly", "properly" or "quickly"; the one exception (`updated_at` may be refreshed) is stated explicitly | "chip" and "Save" are observation points of the UI, not internal structure |

## 2. Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal, no silent expansion | Pass | Every proposal item (2 endpoints, 7 constants, one `V4` table, one page plus one route) maps to a requirement | The only addition is the details-page link (D13), written back into the proposal's What Changes and Impact |
| DoV-2 ambiguities are listed or resolved | Pass | The four questions of this round are decided as D11–D14 in `intents/2026-11-15-req-019.md`; six further contract details are fixed in §3 | No blocking item left |
| DoV-3 role concerns are noted | Pass with non-blocking items | §6 lists 2 IO, 4 SA and 1 Dev/QA item | None blocks G1, but each needs an owner before P3/P4 |
| DoV-4 no business implementation claimed as done | Pass | This round touches documentation only; `git status` shows no change under `backend/` or `frontend/` | Code lands in P4 |
| DoV-5 requirements trace to the proposal or the approved requirements | Pass | §5 traceability matrix; every requirement points at a REQ-019 scenario or a D decision | No orphan requirement |

## 3. Contract details fixed in this round

| id | Detail | Basis | Effect |
|---|---|---|---|
| C1 | `PUT` replaces the set; it does not merge | Proposal wording "idempotently replaces `interests`" plus PUT semantics | Scenario "A save replaces instead of merging" |
| C2 | `GET` orders `members` by ascending `userId` | Makes assertions repeatable instead of relying on SQLite row order | Scenario "The response carries only the agreed fields, ordered by user id" |
| C3 | The identity header tolerates surrounding whitespace, while `interests` values are never normalized | The merged `TripRepository.findUserId` calls `trim()`, and the AC requires literal label matching | Both scenarios exist; the asymmetry is deliberate |
| C4 | A rejected request writes nothing: neither `payload` nor `updated_at` changes | Strengthened reading of AC2 "saved interests stay the same" | Scenario "A value outside the catalogue rejects the whole request" |
| C5 | The `PUT` response echoes only the caller's set, not every member's | Smaller payload, and it matches "submit and read back" in AC1 | Switching to a full echo would widen the contract and need a new G1 |
| C6 | The deduplicated set is inherently at most 7, so no extra size or length validation is specified | The allowed value domain has seven entries | Removes a useless branch: an oversized array only fails as an illegal value |

## 4. Edge and failure scenarios added by this review

| id | Scenario | Location | Source |
|---|---|---|---|
| E1 | Replace versus merge | Save member interests | Added (AC does not cover it) |
| E2 | Idempotent repeat: `payload` unchanged, `updated_at` may be refreshed | Save member interests | Added |
| E3 | Empty array clears the set but keeps the row | Save member interests | Consequence of D6 |
| E4 | The first save creates exactly one row (UNIQUE holds) | Save member interests | Added |
| E5 | A mixed request is rejected as a whole, so even allowed values are not stored | Save member interests | Strengthened AC2 |
| E6 | Wrong case, surrounding whitespace, empty string and near-matches are all rejected | Predefined interest catalogue | AC2 made enumerable |
| E7 | Malformed bodies: not an object, missing field, not an array, `null` element, numeric element | Save member interests | Added (`INVALID_REQUEST`) |
| E8 | An unknown trip is reported before membership (404 before 403) | Preference caller identity and membership | Mirrors the merged `TripController.read` |
| E9 | Whitespace in the identity header is tolerated while `interests` stays literal | Preference caller identity and membership | Added |
| E10 | A member without saved interests appears with `interests: []`; members are never omitted | Read member interests | Added |
| E11 | Members do not overwrite each other | Read member interests | Added |
| E12 | `GET` is read-only and does not refresh `updated_at` | Read member interests | Added |
| E13 | Switching identity reloads for the new identity without keeping the previous selection | Preferences page | Added |
| E14 | Controls are disabled while saving; a 400 shows `message` and rolls the selection back | Preferences page | UI side of AC2 |

## 5. Traceability

| Proposal / requirement item | Requirement | Key scenarios |
|---|---|---|
| AC1 (dedupe and visible after reload) | Catalogue; save; read | Duplicate values collapse to one; a member reads back the saved set; saved interests are shown again after a reload |
| AC2 (illegal value rejected, saved data untouched) | Catalogue; save | A value outside the catalogue rejects the whole request; a mixed request is rejected as a whole; wrong case, whitespace and near-matches are rejected |
| Proposal: `X-User-Id` identity, 401 | Identity and membership | Caller identity is missing; caller identity is unusable |
| Proposal: membership check, 403 | Identity and membership | A non-member is denied |
| Proposal: unknown trip, 404 | Identity and membership | An unknown trip is reported before membership |
| D6 empty array clears | Save | An empty array clears interests but keeps the record |
| D8 all members plus D12 minimal fields | Read | The response carries only the agreed fields, ordered by user id |
| D11 batch save plus D13 details-page link | Page | Loading; a successful save follows the response; saved interests are shown again after a reload |
| REQ-019 AC9-N (`GET` failure) | Page | Loading fails |

## 6. Residual risks and role concerns

| Role | Concern | Blocks G1? |
|---|---|---|
| IO | User accepted 2026-11-15: no Clear All action; deselect all interests and save to clear | Resolved; Emily subsequently approved current package by separate explicit instruction, recorded in G1 |
| IO | User accepted 2026-11-15: seven English-only interest labels; localization excluded | Resolved; Emily IO Pass recorded 2026-11-15, not automatic overall Gate Pass |
| SA | `V4` must land after REQ-004's `V3`, otherwise Flyway fails with an out-of-order migration | No; `V3__create_invitation.sql` reached `main` on 2026-11-15, so `V4` is the next free number and applies in order |
| SA | `TripErrorAdvice` covers `com.gogo.trip` only, so `INVALID_REQUEST` from a new package needs its own advice or a widened scope | No, decided in P3 |
| SA | Should the delta predefine the value domain of `member_preference.kind`? Only `interest` is used here; the other three preference types have their own stories | No; leaning towards letting later stories extend it |
| SA | This delta is now written in English, matching the `greeting` and `trips` deltas. The pre-spec workspace entries (`requirements/REQ-019.md`, `intents/`, `analysis/req-019-dor.md`) are still in Chinese | No (semantics unaffected); converting them is a separate decision |
| Dev/QA | The dedupe assertion must parse `payload` and compare the set, not just check for HTTP 200 | No; already stated in the scenarios |

## 7. Conclusion

- AC: 4/4 Pass
- DoV: 5/5 Pass (DoV-3 carries non-blocking SA/IO concerns)
- Blocking ambiguities: 0
- Ready for `/sdd:g1-decision-record`. This file is not a G1 decision and does not claim that any code is implemented.

## 8. Revision 2026-11-16 — this review no longer covers the delta

After G1 Pass and after the P4 code existed, the requirement owner revised two statements of
the delta:

1. The catalogue is now ten Chinese labels (`水上运动`, `潜水`, `摄影`, `美食`, `咖啡`,
   `历史人文`, `手作`, `自然风景`, `冒险`, `慢游`) instead of seven English ones. This
   supersedes the §6 IO row "seven English-only interest labels; localization excluded" and
   contract detail C6 ("the set is inherently at most 7").
2. The page requirement now carries the `screen-08-preferences.png` visual baseline (app bar,
   section heading, emoji chips with inverted selection, hint line, fixed bottom primary
   button) and states that the US-020/024/027 blocks are out of scope.

What that means for this record, stated plainly:

| Item | Status |
|---|---|
| AC-1…AC-4 | Still hold in form: 5 requirements, still 31 scenarios, still observable, no vague words |
| DoV-1 (scope) | Still holds; the revision replaces the label set inside the same scope and adds a layout baseline, not a new capability |
| E6 (wrong case, whitespace, empty string, near-matches) | Now asserted with Chinese examples; "wrong case" only has meaning for the retired English labels, which a new CAT-2 scenario rejects as a whole |
| C6 (at most 7) | Superseded: at most ten |
| §6 IO row on English-only labels | Superseded by the owner's instruction of 2026-11-16 |
| G1 decision | **Re-signed 2026-11-16 — Pass.** IO Emily and SA evelyn.huang signed the revised delta as Pass, recorded in `g1-decision.md` §"Revision re-review (2026-11-16)"; G2 may cite that record for this text. The row previously said "not re-signed"; this row supersedes it |

No new ambiguity is introduced: the label order follows the prototype, which differs from the
order the instruction listed the labels in (`手作` and `历史人文` swap, `慢游` last), and the
page keeps only the US-019 block of screen-08. Both choices are recorded in `design.md`
(Revision section) and `tasks.md` §8.

Update, 2026-11-16: the re-review this section asked for has been recorded. IO Emily and SA
evelyn.huang both signed the revised delta as Pass; see `g1-decision.md` §"Revision re-review
(2026-11-16) — Pass" and `tasks.md` 8.6. No condition or finding came with either signature.

Update, 2026-11-16 (merge): the table this delta adds ships as
`V7__create_member_preference.sql`, not `V4` — `origin/main` took `V4` for the splits
migration, its `V5` already declares the same columns and unique key as a stand-in, and the
fourth merge found `V6` taken by US-066's `V6__create_account_credential.sql`, so the file moved
one number further. The identity precondition also follows `main`'s US-066 now: the caller comes
from the login session instead of the retired `X-User-Id` header. No requirement text changes, so
every row above stands.
