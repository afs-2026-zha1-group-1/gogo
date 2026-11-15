# DoR light self-check — REQ-004

- Date: 2026-11-14
- Entry: `requirement-workspace/requirements/REQ-004.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §REQ-004), so items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is recorded here.

## Findings

### Amendment after user review, 2026-11-14

The original self-check below is historical. OQ-1 retains staged delivery with
no confirmation product operation until US-037; OQ-2's five preview fields are
explicitly confirmed by the user. OQ-6 is resolved by design D7. ATDD J6/J7 now
cover existing members before/after closure and identity/token precedence.
Local and upstream blocking OQ counts are now 0. The user's follow-up resolves
REQ-003 OQ-6 to US-031, with submitted member preferences, random fallback and
no overwrite; owners IO Emily / SA Johnson. Controlled-demo identity risk and
implementation sequencing are acknowledged. Both G1 records remain unsigned:
the named approvers are designated, but verdicts and recording authorization
have not been supplied. Historical deferred statuses below are superseded.

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-004 §Intent | One invitation flow: issue, preview, accept once, closed after confirmation, unusable fails closed |
| ② | Actors defined | — | Pass | REQ-004 §Actors | Organizer / invited traveler via `X-User-Id` (REQ-003 scaffold), backend, frontend; preview token-bound, accept identity-bound |
| ③ | Scope bounded | — | Pass | REQ-004 §In/Out scope | Out of scope names US-037 flow, revocation/expiry, reminder notification, member management, preferences, plans, dashboard, real auth |
| ④ | Scenarios / AC concrete | — | Pass | REQ-004 §Scenarios | Thirteen scenarios plus three reverse cases, each with an HTTP outcome and a stable error `code` or a stored-row assertion |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-004 ⑩ | Non-organizer, missing identity, unknown trip, unknown token, closed joining, double accept, existing member all enumerated |
| ⑥ | Results verifiable | — | Pass | REQ-004 §Scenarios + fixtures §REQ-004 | Status plus `code`, invitation row count, membership row count, preview field set, and the absence assertions for U1/U2/U3 |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | proposal §Impact, impact brief §REQ-004 | Depends on REQ-003 `V2` tables and identity contract; `V3` is additive; one frontend QR/routing decision deferred to P3 (OQ-6) |
| ⑧ | Open-questions gate | — | Pass | REQ-004 §Open questions | Blocking not-resolved = 0. OQ-1…OQ-5 resolved with owners; OQ-6/OQ-7 non-blocking and deferred |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-004 ⑨ | `trip_invitation` grain (one per trip), token uniqueness, state column default, transactional issue/accept, wire shapes and the five `code` values |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-004 ⑩ | Every scenario branch has an in/out row; races bounded by the existing primary key; revocation/expiry/confirmation-API explicitly out |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-004 ⑪ | Additive column on REQ-003's `trip`; identity and member-read contracts reused, not redefined; `greeting` independent; US-037 future flow named |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-004 ⑫ | Five surfaces (panel, preview, joined, closed, unusable) plus failure states, with fields, recipients and channels; no notification workflow |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted.
`/sdd:story-split` is Skipped: the three stories already exist as GitHub issues
and the split is fixed at four ADDED `invitations` requirements plus one ADDED
`trips` state requirement.

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | deferred | REQ-004 OQ-7 | REQ-003 is unimplemented and its G1 unsigned; REQ-004 P4 cannot start before REQ-003 P4 | Sequence the implementations; record REQ-003 G1 first. Owner Dev/IO |
| WARNING | resolved-with-tradeoff | REQ-004 OQ-2 | Preview exposes destination and dates before acceptance, per screen 05; the AC minimum is the name | Accepted from the prototype; members/itinerary/preferences stay excluded. Owner IO, confirm at G1 |
| WARNING | resolved-with-tradeoff | REQ-004 OQ-1 | Main-plan state exists without a product mutation path until US-037 | Test-only setup documented in fixtures; reverse case R-1 asserts no API sets it. Owner SA, confirm at G1 |
| SUGGESTION | deferred | REQ-004 OQ-6 | Router and QR encoding dependency undecided | Decide at P3 together with REQ-003 OQ-4; prefer one MIT-licensed QR encoder. Owner Dev |
| SUGGESTION | deferred | board pick signal | Issues #6/#7/#8 carry no assignee; the user's session statement is the pick evidence | Assign on the board when the user confirms; no behavior impact. Owner IO |

Deferred items retain their severity. No BLOCKER is deferred.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION carry owners; none blocks drafting.
- Cleared to run `/sdd:delta-craft` for `invitations` plus the `trips` state requirement.