# DoR light self-check — REQ-005

- Date: 2026-11-15
- Entry: `requirement-workspace/requirements/REQ-005.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §REQ-005), so items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is recorded here.

## Findings

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-005 §Intent | One phone frame + persistent dock; placement only; honest placeholders; guest join excluded |
| ② | Actors defined | — | Pass | REQ-005 §Actors | Traveler via `X-User-Id` scaffold (unchanged); frontend-only ownership; backend/DB untouched |
| ③ | Scope bounded | — | Pass | REQ-005 §In/Out scope | Out of scope names US-038–062, US-013, US-061, list-all endpoint, backend/DB, auth, demo data, contract changes |
| ④ | Scenarios / AC concrete | — | Pass | REQ-005 §Scenarios | Eleven scenarios plus four reverse cases, each with an observable route/surface/state outcome |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-005 ⑩ | Unknown hash, non-numeric id, denied/missing details, unknown token, join exclusion, back/forward all enumerated |
| ⑥ | Results verifiable | — | Pass | REQ-005 §Scenarios + story text-only table | Unique visible heading per tab, forward/reverse walk, identity persistence, unchanged acceptance behavior — all observable without screenshots |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | impact brief §24–26 | Frontend-only; composes REQ-001/003/004 surfaces; hash router extended; no API/data/CI touchpoint; merge-order note R18 |
| ⑧ | Open-questions gate | — | Pass | REQ-005 §Open questions | Blocking not-resolved = 0. OQ-1/OQ-2 deferred to P3 (2026-11-14 decision); OQ-3/OQ-6/OQ-7 resolved; OQ-4/OQ-5 deferred to P3 (2026-11-15 user decision) |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-005 ⑨ | Route/identity/tab-model grain, fields and transitions concrete; no backend data; OQ naming polish carries proposals, no `{TBD}` |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-005 ⑩ | Every scenario branch has an in/out row; fallbacks retained; reverse cases R-1/R-2/R-3 + S8 |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-005 ⑪ | greeting/trips/invitations composed not modified; create back-target is placement per story table; identity and router reused; future tabs anchored |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-005 ⑫ | Nine surfaces with trigger/recipient/fields/channel; no notification workflow |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted.
`/sdd:story-split` is Skipped: the story already exists as GitHub issue #32
and the split is fixed at six ADDED `app-shell` requirements.

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | resolved | impact brief R18 | REQ-004 PR #31 was open when P1 started; REQ-005 stacked on that code | Deferred by user 2026-11-15, then resolved the same day: PR #31 merged 06:23:20Z (gh verified). Owner Dev/IO |
| WARNING | deferred | impact brief R19 | Fixed dock may obscure Home `.actionbar`/content on short viewports; `100dvh`/safe-area need browser verification | 2026-11-15 user decision: record risk, defer. Content bottom padding at P3; browser verification at P4, not build alone. Owner Dev |
| SUGGESTION | resolved | impact brief R20 | Placeholder tabs could drift into fabricated demo data | Guarded: AC5 + reverse case R-2 assert honest text only; story design scope excludes demo content. Owner IO |
| SUGGESTION | deferred | REQ-005 OQ-1/OQ-2 | Open-by-id widget and dock icon/token extraction deferred to P3 (2026-11-14 decision) | Decide at P3; behavior already bounded. Owner Dev |
| SUGGESTION | deferred | REQ-005 OQ-4/OQ-5 | Bare 行程 route naming and trip-selection memory unspecified | 2026-11-15 user decision: defer to P3; concrete proposals recorded. Owner Dev/IO |
| SUGGESTION | deferred | intent pick signal | Issue #32 assignees empty in today's fetch despite the 2026-11-14 assignment/card move | Re-assign on the board when convenient; no behavior impact. Owner IO |

No BLOCKER is deferred. Blocking open questions not `resolved`: **0**.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION carry owners; none blocks drafting.
- Cleared to run `/sdd:proposal-split` for the `app-shell` capability after the
  advisory round and split-plan confirmation.