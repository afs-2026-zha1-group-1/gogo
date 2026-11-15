# G1 decision — us-031-037-main-itinerary

- Change id: `us-031-037-main-itinerary`
- Gate: G1 (Align)
- Status: **Pass — IO Emily + SA Lumi approved, C1/C2 ratifications recorded**
  (2026-11-15). Emily's package approval and her C1 ratification, plus Lumi's
  re-confirmation of the C2 shape, are recorded per the user's explicit
  signing instructions ("两个人都pass", 2026-11-15). The cross-branch
  write-sync alignment with `feat/travel_preference` (SA evelyn.huang) is
  tracked as a non-gating follow-up (F1 below); the agreement text is already
  fixed in deep-dive ⑨. User-designated approvers: **IO = Emily**,
  **SA = Lumi** (SA updated 2026-11-15 by user statement "当前的SA是Lumi",
  superseding the Johnson designation carried from REQ-003/004; IO unchanged).

## Inputs

- Delta Spec: `specs/main-itinerary/spec.md` — one new capability
  `main-itinerary`, 7 ADDED requirements, 24 scenarios (generate → review →
  confirm slice plus the generation-inputs read; includes the lint-amendment
  scenarios G6 and confirmed-frozen read).
- AC/DoV review: `dov-ac-review.md` (AC-1…AC-4 Pass; DoV-1…DoV-5 Pass;
  blocking Fail = 0, Partial = 0; 8 residual concerns listed, items 1–5 are
  the G1 review agenda below).
- Consistency lint: `consistency-lint.md` (phase=p2, 2026-11-15) — initial
  Partial (0 BLOCKER / 3 WARNING / 2 SUGGESTION); L2/L3/L4 remediated and
  re-validated; L1 behavior explicitly accepted by the user in the current
  product review (agenda item 5). Emily IO Pass is now recorded; overall G1
  is Pass with the C1/C2 ratifications recorded (see Decision).
- Validation: `openspec validate us-031-037-main-itinerary --strict` → "is
  valid"; plain mode → "is valid", zero warnings (CLI 1.16.1 on PATH; re-run
  after shortening two >500-character requirement texts).
- Requirements: `requirement-workspace/requirements/US-031-037.md` (OQ-1..10
  all resolved; §P2 contract rulings), `analysis/us-031-037-dor.md`
  (BLOCKER = 0, A0 Pass, advisory W1/W2/S1/S2 resolved),
  `deep-dive.md` §US-031-037, `impact-brief.md` §US-031-037,
  `acceptance-test-fixtures.md` §US-031-037 (M1–M14 / V1–V7 matrix, error
  contract, wire projections).
- Proposal: `proposal.md` (synced at P2 to the merged baseline).
- P2 exit QC: `docs/ai4se-plugins/20261115-180018-quality-checklist-report.md`
  (Overall Pass; P2-3 Skipped because G1 was not yet claimed).
- Stories: US-031 + US-037 with user-supplied formal ACs (2026-11-15, intent
  §Raw acceptance criteria); one capability pack by user ruling.

## Findings (scope / ambiguity / conflict)

- **Scope:** one ADDED capability matching the proposal; no MODIFIED
  capability. Invitations behavior unchanged — this change only sets the
  `main_plan_confirmed` flag REQ-004 J4 consumes; greeting/trip/invitation
  code untouched.
- **Baseline convergence (OQ-9, executed at P2; G1 C2 shape ruling
  2026-11-15):** origin/main merge 4e6b261 brought REQ-003/004 (V2/V3 + code).
  C2 recommended default A (user-selected 2026-11-15; SA Lumi re-confirmed
  2026-11-15): `member_preference` is REQ-019's V4 kind/payload table on
  `feat/travel_preference` (read-only here); this change appends V5 — 2 new
  tables (`main_plan_draft`, `main_plan_stop`) + 2 `trip_member` columns
  (`ready`, `preference_revision`); no `trip` ALTER; the confirmed version is
  the draft row marked `status = 'confirmed'` (no `confirmed_draft_id`). Merge
  order: REQ-019 V4 first. Impact R1 closed; SA confirmation of the original
  shape was agenda item 3 — the C2 amendment re-confirmation is recorded
  2026-11-15.
- **Contract rulings fixed at P2 (user, 2026-11-15):** paths and success
  statuses contractual (generate 201, confirm 200 + same plan projection,
  reads 200); inputs read member-readable and available before any draft
  (closes QC gap F6); wire field sets fixed (camelCase, integer cents SGD,
  local HH:MM, integer-minute legs); error bodies keep `{code, message}` with
  `pendingMembers` / `scheduleErrors` + `overruns` detail fields.
- **Cross-REQ:** J4 `JOINING_CLOSED` E2E now runs in this change (accept
  merged locally; DoR W1 / impact R2 closed). Location completion per the
  signed 2026-11-14 ruling (preferences first, random fallback, supplied
  preserved), implemented at generation only.
- **Conflict with the Living Spec:** none. `openspec/specs/` holds only
  `greeting`; REQ-003/004 deltas are merged in code but not yet archived, and
  share no requirement name with this delta.
- **Known process deviation:** P0 skipped by user ruling; Rules carrier not
  applied — AGENTS.md + REQ-002/004 conventions govern (impact R3, disclosed).
- **Consistency-lint amendment (2026-11-15):** L2 resolved — the confirmed
  version is frozen (`stale` always false; delta scenario + fixtures M13).
  L1 — generation after confirmation rejected 409 `ALREADY_CONFIRMED`, no new
  draft, replanning deferred to R2 — landed as recommended default A selected
  by the user and explicitly accepted again in the current product review
  (agenda item 5); Emily subsequently approved the current package by separate
  explicit user instruction. L3/L4 mechanical fixes
  applied. No contradiction between stated rules was found by the lint.
- **Review baseline:** P2 artifacts are committed at `7d8d801` on branch
  `US-031-037-main-itinerary-planning`. This revision records the accepted product
  decisions and Emily IO approval; it does not certify unresolved integration work.

## G1 review agenda (from dov-ac-review.md §Residual concerns)

| # | Item | Role | Content to confirm |
|---|---|---|---|
| 1 | `commonInterests` / `mustDo` aggregation semantics | IO | Accepted by user 2026-11-15: intersection of ready members' interests; deduplicated union of must-do items; display-only |
| 2 | Fixed `rules` identifier set + per-stop `interests` tags | IO | Accepted by user 2026-11-15: six fixture identifiers, free display wording; provider tags may be empty |
| 3 | V4+ convergence shape | SA | Original shape (3 new tables + 2 `trip_member` columns, no `trip` ALTER, confirmed version = draft marked confirmed) — **confirmed: SA Lumi Pass 2026-11-15**. Amended by G1 C2 default A (V5, kind/payload `member_preference` read-only): **SA Lumi re-confirmed 2026-11-15** |
| 4 | OQ-8 re-confirm behavior | IO | Accepted by user 2026-11-15: 409 `ALREADY_CONFIRMED`, no state change |
| 5 | Generation after confirmation (lint L1) | IO | Accepted by user 2026-11-15: reject 409 `ALREADY_CONFIRMED`, no new draft, replanning deferred to R2 (G6/M14). Emily IO Pass subsequently recorded by explicit signing instruction |

## Product review follow-up (2026-11-15)

The user explicitly accepted agenda items 1, 2, 4 and 5, then separately
instructed recording Emily's signature. IO Emily approves the current
7-requirement / 24-scenario package on 2026-11-15. Existing SA Lumi approval is
unchanged; no behavioral contract is changed by recording this approval.

### C1/C2 rulings (2026-11-15, MVP framing, user-selected recommended defaults)

- **C1 — travel duration vs stop gap: default A selected by the user.** Each
  travel leg must fit the gap to the next stop: end time + `travelMinutesToNext`
  later than the next stop's start → new schedule error type
  `TRAVEL_EXCEEDS_GAP` blocks confirmation (422 `VALIDATION_FAILED`); equality
  passes; offending `seq` = the stop carrying the leg. Landed in delta C3 +
  C1 premise, fixtures V3 + error-detail row + travel-gap state setup,
  deep-dive ⑨/⑩, requirements OQ-6 + §P2 rulings, proposal. The new type
  extends the contractual error enumeration → **IO Emily ratification
  recorded 2026-11-15** per the user's explicit signing instruction
  ("两个人都pass"); her earlier package approval covered the pre-C1 package,
  this ratification closes the extension. The user's selection alone was not
  the IO sign-off.
- **C2 — preference schema / V4 ownership: default A selected by the user.**
  REQ-019's kind/payload `member_preference` wins V4 (`feat/travel_preference`,
  verified docs-only, no code yet); this change renumbers to V5 (2 new tables
  + 2 `trip_member` columns), reads kind rows, wire contract unchanged; merge
  order REQ-019 first. Write-sync agreement to align with the feature branch
  (SA evelyn.huang): preference writes bump `preference_revision`, REQ-026
  submission sets `ready = 1`; the columns stay the generation gate's source
  of truth. Storage-only change → **SA Lumi re-confirmation recorded
  2026-11-15** per the user's explicit signing instruction (his earlier G1
  Pass covered the wide-table shape); no IO re-sign-off needed — the wire
  contract is unchanged. Cross-branch write-sync alignment with
  `feat/travel_preference` (SA evelyn.huang) is tracked as non-gating
  follow-up F1.

Non-gating acknowledgements (inherited, already disclosed): `X-User-Id`
unverified scaffold identity (never a security control); test-only setup
inventory for pending/stale/overrun/null-location/schedule/travel-gap cases
(fixtures §State setup); fake provider = MVP production behind a port seam.

## Decision

- Decision: **Pass**. IO Emily Pass (package + C1 error-enum ratification)
  and SA Lumi Pass (original shape + C2 amendment re-confirmation) are all
  recorded 2026-11-15. C1/C2 were answered with user-selected recommended
  defaults and ratified by their owners the same day; no open gate condition
  remains. The cross-branch write-sync alignment is a non-gating follow-up
  (F1) with a named owner.
- IO sign-off: **Emily — Pass**, recorded 2026-11-15 per the user's explicit
  instruction; covers the 7-requirement / 24-scenario package including
  accepted agenda items 1, 2, 4 and 5, and — by the separate 2026-11-15
  ratification ("两个人都pass") — the C1 `TRAVEL_EXCEEDS_GAP` error-enum
  extension. Supersedes the earlier IO-pending status.
- SA sign-off: **Lumi — Pass**, recorded 2026-11-15 from the user's explicit
  session answer `Lumi — Pass` to the G1 SA question (agenda item 3, V4+
  convergence shape), after the P2 deltas, DoV review and strict validation
  evidence were presented; re-confirmed 2026-11-15 for the C2 amendment
  (V5, kind/payload `member_preference` read-only) per the user's explicit
  signing instruction. No SA conditions were supplied. The agent records
  these statements, not an independently verified identity or an approval on
  behalf of the IO.
- Timestamp: 2026-11-15 (G1 Pass; Emily C1 ratification + Lumi C2
  re-confirmation recorded).

## Conditions (closed) and follow-ups

| ID | Follow-up | Owner | State |
|---|---|---|---|
| C1 | Travel duration must fit the gap to the next stop | IO Emily / SA Lumi | **closed 2026-11-15**: default A landed (user-selected) — `TRAVEL_EXCEEDS_GAP` blocks confirmation, equality passes (delta C3, fixtures V3); IO Emily ratification recorded 2026-11-15 per explicit signing instruction |
| C2 | `member_preference` ownership, schema and migration numbering vs `feat/travel_preference` | SA Lumi / Dev | **closed 2026-11-15**: default A landed (user-selected) — REQ-019 kind/payload table wins V4; this change at V5, read-only preference access, merge order REQ-019 first; SA Lumi re-confirmation recorded 2026-11-15 per explicit signing instruction |
| F1 | Cross-branch write-sync alignment (non-gating) | SA Lumi + feature-branch SA evelyn.huang | **open follow-up**: agreement text fixed in deep-dive ⑨ (preference writes bump `preference_revision`; REQ-026 submission sets `ready = 1`; columns stay the generation gate's source of truth); execute the alignment before/at REQ-019 merge — does not block G1 or P3 |

Both ratifications are explicitly recorded; overall G1 is **Pass**. No
runtime verification or implementation completion is implied by the
signatures or by the user's selections.

## Next

G1 is **Pass** → proceed to P3 (`/sdd:atdd-design`, `/sdd:task-plan`).
F1 (write-sync alignment) travels as a named SA follow-up into P3/P4 and the
REQ-019 merge. The agent records only the humans' statements; it does not
choose the verdict.