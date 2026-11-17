# AC / DoV review — us-031-037-main-itinerary

- Date: 2026-11-15
- Stage: P2, `/sdd:delta-craft step=all`
- Delta Spec: `openspec/changes/us-031-037-main-itinerary/specs/main-itinerary/spec.md`
- Checklist source: `vendor/ai4se-plugins/skills/spec/delta-craft/references/dov-ac-checklist.md`
- Validation evidence: `openspec validate us-031-037-main-itinerary --strict`
  → "is valid"; without `--strict` → "is valid", exit 0 (CLI 1.16.1 on PATH,
  verified via `openspec --version`). The first run flagged two >500-character
  requirement texts (generation, draft review); both were shortened with the
  detail kept in scenarios, then re-validated clean in both modes.

## Delta summary

Seven ADDED requirements, twenty-four scenarios, one new capability
`main-itinerary`:

| Requirement | Scenarios |
|---|---|
| Readiness-gated main plan generation | G1 all ready → 201 draft v1; G2 pending member blocks (named, no draft); G5 regeneration → v2 supersedes v1; G6 generation after confirmation → 409 `ALREADY_CONFIRMED` (user accepted; Emily IO approved 2026-11-15) |
| Location completion at generation | null locations completed (preferences first, random fallback); supplied nonblank locations preserved |
| Draft review with computed staleness | member reads current draft; revision bump surfaces `stale` true; no draft → 404 `NO_DRAFT`; confirmed read returns the confirmed version; confirmed version stays frozen after a revision bump (lint L2 ruling) |
| Generation inputs read projection | I1 member reads summary (Screen 9); I2 readable before any draft; I3 non-member denied |
| Validation-gated confirmation | C1 valid draft → 200 + same projection, joining closed; C2 hard-budget overrun blocks (10 SGD shown); C3 schedule errors block (incl. `TRAVEL_EXCEEDS_GAP` travel-fit rule, G1 C1 default A user-selected 2026-11-15, IO Emily ratified 2026-11-15); C4 stale blocks until regeneration |
| Confirmation boundaries | V6 confirm before generation → 404 `NO_DRAFT`; V7 re-confirm → 409 `ALREADY_CONFIRMED`, no state change; the code also covers G6 generation after confirmation (user accepted; Emily IO approved 2026-11-15) |
| Authorization and identity for main-plan operations | G4/C5 non-organizer writes denied; non-member denied; missing/unknown identity 401; unknown trip 404 |

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has at least one testable AC | Pass | Delta: 7 ADDED requirements, 24 scenarios | Every requirement carries 2–5 scenarios; the four user-supplied ACs (US-031 AC1/AC2, US-037 AC1/AC2) map to G1/G2/C1/C2 with fixed fixture values |
| AC-2 ACs are observable | Pass | Delta + fixtures §US-031-037 (M1–M14 / V1–V7) | HTTP statuses (201/200/401/403/404/409/422), stable `code` values, contractual wire field sets (`version`, `confirmed`, `stale`, `costPerPersonCents` 5000, `inputRevisions`, `stops` with legs 30/30/15, `pendingMembers`, `scheduleErrors`, `overruns` 4000/1000), version supersession, and the downstream accept → 403 `JOINING_CLOSED` assertion (J4, now local) |
| AC-3 negative / edge cases where risk is high | Pass | G2, G4/C5, G6, I3, C2–C4, V6, V7, confirmed-frozen read, authorization scenarios | Riskiest behaviors: readiness gate (no partial draft), organizer-only writes, validation gates (budget/schedule/stale), no-draft / re-confirm / post-confirm-generation boundaries, confirmed-version freeze after revision bumps, non-member privacy on the inputs read; each has a dedicated scenario with a no-state-change assertion where relevant |
| AC-4 no disguised implementation detail, no vague wording | Pass | Delta vs deep-dive ⑨ / fixtures | No table, column, class or framework name in the delta. `X-User-Id`, JSON field names, endpoint paths, statuses and error `code` values are wire contract (P2 rulings 2026-11-15). "The confirmed version is the existing draft marked confirmed, not a newly created version" states observable version identity (user ruling), not storage design; `main_plan_draft.status`, Flyway V5 (G1 C2) and the provider port stay in deep-dive / fixtures / design.md |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal | Pass | `proposal.md` §What Changes / §Capabilities vs the delta | One ADDED capability `main-itinerary`, generate → review → confirm slice plus the inputs read (F6 closure); proposal synced at P2 to the merged baseline and at G1 C1/C2 (V5 convergence, travel-fit rule, confirm 200 + same projection, contractual paths/statuses/wire fields). No MODIFIED capability: invitations behavior unchanged, this change only sets the flag it consumes |
| DoV-2 ambiguities listed or resolved | Pass | `requirements/US-031-037.md` §Open questions + §P2 contract rulings; intent §P2 update | OQ-1..10 all resolved (inherited rulings + user clarifications 2026-11-15); P2 rulings close confirm status/body, confirmed-version pointer, inputs permission, wire field names, error detail fields and OQ-9 convergence. Remaining display-only items are listed below for G1, not left implicit |
| DoV-3 role concerns noted for residual risk | Pass | This file §Residual concerns | IO: aggregation semantics, rules identifier set, OQ-8 review, C1 error-enum ratification (recorded 2026-11-15). SA: convergence shape confirmation (C2 amendment re-confirmed 2026-11-15), unverified identity. Dev: test-only setup inventory, provider seam, cross-branch write-sync (F1) |
| DoV-4 no business implementation claimed done here | Pass | P2 authored/refined the delta, fixtures, deep-dive, impact brief, proposal and this review only | No production code was edited in P2; the merged REQ-003/004 code is baseline, not this change's output |
| DoV-5 requirements trace to proposal / approved requirements | Pass | US-031 AC1 → G1; US-031 AC2 → G2; US-037 AC1 → C1 (+ confirmed read, V7); US-037 AC2 → C2; signed 2026-11-14 completion ruling → G3 pair; OQ-4 → G5; OQ-6 → C1/C3; G1 C1 travel-fit default A → C3 `TRAVEL_EXCEEDS_GAP` + fixtures V3 (IO Emily ratified 2026-11-15); OQ-7 → C4 + stale read; OQ-8 → V7; F6 closure → I1–I3; J4 anchor → C1 accept assertion; lint L1 default A → G6/M14 (user accepted; Emily IO approved 2026-11-15); lint L2 ruling → confirmed-frozen scenario/M13; story-level mandatory states → deep-dive ⑫ | Every story AC and signed ruling maps to at least one scenario; reverse cases (identity, non-member, unknown trip, no-draft, re-confirm, post-confirm generation) are declared boundary behavior, not new scope |

## Current product review update (2026-11-15)

The user explicitly accepts residual items 1, 2, 4 and 5 below: ready-member
interest intersection and deduplicated must-do union for display; six fixed rule
identifiers with free display wording and optional provider tags; re-confirmation
409 without state change; post-confirm generation 409 without a new draft and
replanning deferred to R2. This supersedes those items' pending product-ratification
wording in the historical review below. Emily subsequently approved the current
7-requirement / 24-scenario package on 2026-11-15 per the user's separate explicit
signing instruction. Existing SA Lumi Pass is retained. G1 was Conditional at
that point: travel-duration-versus-stop-gap validation and cross-branch preference
schema/V4 convergence were open under G1 C1/C2. This update did not answer them
(both were answered and ratified later the same day — see below).

### C1/C2 amendment (2026-11-15, MVP framing)

The user selected the recommended defaults for both open conditions: C1 = each
travel leg must fit the gap to the next stop (`TRAVEL_EXCEEDS_GAP` blocks
confirmation, equality passes) — landed in delta C3/C1 premise, fixtures V3 +
error-detail + state setup, deep-dive ⑨/⑩, requirements, proposal; IO Emily
ratification recorded 2026-11-15 (contractual error-enum extension). C2 = REQ-019's
kind/payload `member_preference` wins V4; this change renumbers to V5 and reads
kind rows, wire contract unchanged; SA Lumi re-confirmation recorded 2026-11-15
(his earlier Pass covered the wide shape); write-sync alignment with
`feat/travel_preference` (SA evelyn.huang) is non-gating follow-up F1. Delta
stays 7 requirements / 24 scenarios; the selections were subsequently ratified
by both owners (2026-11-15, explicit signing instruction); overall G1 is Pass.
See g1-decision.md §C1/C2 rulings.

## Residual concerns for IO / SA / VL (historical review)

1. **`commonInterests` / `mustDo` aggregation semantics (IO, G1)** — fixed as
   intersection of ready members' interests and deduplicated union of must-do
   items (fixtures §Wire projections). Display-only: no AC depends on content;
   IO confirms wording/semantics at G1.
2. **Fixed `rules` identifier set and per-stop `interests` tags (IO, G1)** —
   six identifiers fixed in fixtures (display wording free); provider-supplied
   tags may be empty. Display-only review item, not a gate blocker.
3. **V4+ convergence shape (SA Lumi, G1 — Pass 2026-11-15; C2 amendment re-confirmed 2026-11-15)** — original shape: 3 new tables + 2 `trip_member`
   columns, no `trip` ALTER, confirmed version = the draft row marked confirmed
   (user ruling 2026-11-15). Confirmed by SA Lumi (Pass, 2026-11-15; SA
   designation updated from Johnson by user statement); OQ-9 trigger already
   fired and convergence executed at P2. G1 C2 default A (user-selected
   2026-11-15) amends it: REQ-019 kind/payload `member_preference` wins V4,
   this change at V5 with 2 new tables; SA re-confirmation recorded 2026-11-15.
4. **OQ-8 re-confirm behavior (IO Emily, G1)** — 409 `ALREADY_CONFIRMED`, no
   state change, user-ruled; IO review recorded as a G1 item per intent.
5. **Generation after confirmation (IO Emily, G1 — approved 2026-11-15)** —
   lint L1: user selected recommended default A on 2026-11-15 (reject 409
   `ALREADY_CONFIRMED`, no new draft; replanning deferred to R2; delta G6 +
   fixtures M14). This expands the `ALREADY_CONFIRMED` contract coverage, so
   IO ratification was required at G1; Emily IO Pass recorded 2026-11-15 by
   separate explicit signing instruction (the user's selection alone was not
   the IO sign-off). Lint L2 (confirmed version frozen, `stale` always false)
   is resolved and landed (delta scenario + fixtures M13).
6. **`X-User-Id` is unverified (SA, G1)** — inherited from REQ-003/004;
   generate/confirm can be impersonated in the scaffold. Never a security
   control.
7. **Test-only setup inventory (Dev, P3/P4)** — readiness flip (Daniel pending),
   Ben revision bump (stale; also the M13 confirmed-frozen case), Alice hard
   budget 4000 (overrun), null-location update + restore (M3), draft mutation
   for schedule errors (V3). All documented in fixtures §State setup; no
   product write path for readiness or preferences in this REQ.
8. **P0 skipped (process, disclosed)** — Rules carrier not applied by user
   ruling; P2–P4 rely on AGENTS.md + REQ-002/004 conventions (impact R3).

## Outcome

Blocking Fail: none. No Partial item.

P2 amendments executed this session: origin/main merge (4e6b261) triggered the
OQ-9 convergence (V4+ extend, no `trip` ALTER, no `confirmed_draft_id`); user
rulings fixed confirm = 200 + same plan projection, inputs read member-readable
(F6 closed), contractual paths/statuses/wire field names and error detail
fields; DoR W1 / impact R2 upgraded (J4 E2E now local). All workdir artifacts
(requirements, DoR, intent, registry, handoff, deep-dive, impact brief,
fixtures) and the proposal were synced to these rulings; two over-length
requirement texts were shortened and validation re-run clean. No runtime test
execution is claimed.

Consistency-lint amendment (same session, post-review): L2 resolved (confirmed
version frozen; delta scenario + fixtures M13 + deep-dive ⑨/⑩); L1 landed as
recommended default A, later accepted by the user and covered by Emily's IO
approval (delta G6 + fixtures M14 + deep-dive ⑩ +
requirements/proposal/intent); L3 GIVEN premises and L4 `userId`
enumeration fixed. Delta now 7 requirements / 24 scenarios; validation re-run
clean in both modes.

G1 is **not** claimed by this skill. `g1-decision.md` records the human
sign-offs: SA Lumi Pass and Emily IO Pass (both 2026-11-15); overall G1 is
**Pass**. C1 (travel-fit, `TRAVEL_EXCEEDS_GAP`) and C2 (kind/payload
`member_preference` at REQ-019 V4, this change at V5) were answered with
user-selected recommended defaults and ratified 2026-11-15 (Emily C1,
Lumi C2); cross-branch write-sync alignment is non-gating follow-up F1.
The display-only items above were G1 review items, not pre-approvals.