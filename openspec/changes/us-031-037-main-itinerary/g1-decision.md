# G1 decision — us-031-037-main-itinerary

- Change id: `us-031-037-main-itinerary`
- Gate: G1 (Align)
- Status: **Conditional — IO Emily approved; follow-ups remain open**
  (2026-11-15). Emily's approval is recorded per the user's explicit signing
  instruction for the current 7-requirement / 24-scenario package. Existing
  SA Lumi Pass is unchanged; neither approval answers the unresolved follow-ups
  listed below. User-designated approvers: **IO = Emily**, **SA = Lumi**
  (SA updated 2026-11-15 by user statement "当前的SA是Lumi", superseding the
  Johnson designation carried from REQ-003/004; IO unchanged).

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
  remains Conditional for the follow-ups below.
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
- **Baseline convergence (OQ-9, executed at P2):** origin/main merge 4e6b261
  brought REQ-003/004 (V2/V3 + code). This change appends V4+ — 3 new tables
  (`member_preference`, `main_plan_draft`, `main_plan_stop`) + 2 `trip_member`
  columns (`ready`, `preference_revision`); no `trip` ALTER; the confirmed
  version is the draft row marked `status = 'confirmed'` (no
  `confirmed_draft_id`). Impact R1 closed; SA confirmation of the shape is
  agenda item 3.
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
| 3 | V4+ convergence shape | SA | 3 new tables + 2 `trip_member` columns, no `trip` ALTER, confirmed version = draft marked confirmed — **confirmed: SA Lumi Pass 2026-11-15** |
| 4 | OQ-8 re-confirm behavior | IO | Accepted by user 2026-11-15: 409 `ALREADY_CONFIRMED`, no state change |
| 5 | Generation after confirmation (lint L1) | IO | Accepted by user 2026-11-15: reject 409 `ALREADY_CONFIRMED`, no new draft, replanning deferred to R2 (G6/M14). Emily IO Pass subsequently recorded by explicit signing instruction |

## Product review follow-up (2026-11-15)

The user explicitly accepted agenda items 1, 2, 4 and 5, then separately
instructed recording Emily's signature. IO Emily approves the current
7-requirement / 24-scenario package on 2026-11-15. Existing SA Lumi approval is
unchanged; no behavioral contract is changed by recording this approval.

The separate question whether travel duration must fit between adjacent stops
was not answered. Do not add a new confirmation-blocking rule by inference;
IO/SA must resolve this boundary before treating it as decided. Also retain the
cross-branch `member_preference` schema/V4 ownership convergence with
`feat/travel_preference` as SA/Dev follow-up; this update does not reconcile it.

Non-gating acknowledgements (inherited, already disclosed): `X-User-Id`
unverified scaffold identity (never a security control); test-only setup
inventory for pending/stale/overrun/null-location/schedule cases (fixtures
§State setup); fake provider = MVP production behind a port seam.

## Decision

- Decision: **Conditional**. IO Emily Pass and the existing SA Lumi Pass are
  recorded. The follow-ups identified in the current review are not answered or
  waived by the signing instruction, so overall G1 Pass is not claimed.
- IO sign-off: **Emily — Pass**, recorded 2026-11-15 per the user's explicit
  instruction; covers the current 7-requirement / 24-scenario package including
  accepted agenda items 1, 2, 4 and 5. Supersedes the earlier IO-pending status.
- SA sign-off: **Lumi — Pass**, recorded 2026-11-15 from the user's explicit
  session answer `Lumi — Pass` to the G1 SA question (agenda item 3, V4+
  convergence shape), after the P2 deltas, DoV review and strict validation
  evidence were presented. No SA conditions were supplied. The agent records
  this statement, not an independently verified identity or an approval on
  behalf of the IO.
- Timestamp: 2026-11-15 (Emily IO approval recorded; SA approval retained).

## Open conditions

| ID | Follow-up | Owner | State |
|---|---|---|---|
| C1 | Decide whether each travel duration must fit the gap to the next stop; update validation scenarios if the existing minimal rule set changes | IO Emily / SA Lumi | pending; question not answered, no new rule inferred |
| C2 | Reconcile `member_preference` ownership, schema and V4 migration numbering with `feat/travel_preference`; document merge order and consumer adaptation | SA Lumi / Dev | pending; this branch's main convergence does not resolve the feature-branch collision |

Both conditions must be explicitly resolved before claiming overall G1 Pass.
No revised SA approval, runtime verification or implementation completion is
implied by Emily's signature.

## Next

On Pass → P3 (`/sdd:atdd-design`, `/sdd:task-plan`). On Fail → return to
`/sdd:delta-craft` / human clarify. On Conditional → remediation items with
owners before the gate closes. The agent records only the humans' statements;
it does not choose the verdict.