# Proposal

## Why

The group needs one feasible shared itinerary instead of four private wish
lists. US-031-037 (US-031 + US-037, formal ACs supplied by the user 2026-11-15)
adds the main-itinerary capability: the organizer generates a timed main-plan
draft from ready members' interests and constraints, and confirms the current
draft only after schedule and hard-budget validation. Confirmation freezes one
shared version and closes joining so late joiners cannot diverge from the
agreed plan. The local baseline (616a62b) has only the greeting capability, so
this change builds the self-contained minimal read model ruled on 2026-11-15
(fixture seeds, test-only readiness flip) rather than waiting for the unmerged
REQ-003/004 branches.

## What Changes

- **ADDED** `main-itinerary` capability, one vertical slice (generate → review
  → confirm):
  - Readiness-gated generation: all members ready at a preference revision;
    a pending member blocks generation, is named in the response, and no
    partial draft is persisted (US-031 AC1/AC2).
  - Draft persistence: ordered stops with supplied activity times, travel
    legs, input preference revisions, per-person cost; draft is NOT
    auto-confirmed; regeneration creates a new draft version (ruled).
  - Start/end location completion at generation only, per the signed
    2026-11-14 fixtures ruling (preferences first, random fallback, supplied
    nonblank values preserved).
  - Draft read projection with computed `stale` flag (input revisions vs
    current member revisions; stale is not stored).
  - Confirmation gated by validation (US-037): OQ-6 minimal feasible schedule
    set (stops time-ordered and non-overlapping, travel leg between
    consecutive stops, all stops within the trip day) plus every member's
    hard budget ≥ cost per person (NULL = no limit, OQ-10); stale drafts block
    until regenerated (OQ-7). Overrun blocks with the per-member overrun
    amount shown (10 SGD fixture case).
  - On success the draft's version becomes the shared confirmed plan and
    `main_plan_confirmed` is set — the flag REQ-004 J4 consumes to return
    403 `JOINING_CLOSED` on accept (invitations behavior itself unchanged).
- New backend `main-itinerary` package (controller / service / repository)
  with a `MainPlanProvider` port; the fake provider is the MVP production
  implementation (ruled), supplying the four fixture stops.
- Flyway migrations from V2 on this branch: six self-contained tables
  (`app_user`, `trip`, `trip_member`, `member_preference`, `main_plan_draft`,
  `main_plan_stop`) plus seed users/trip per fixtures §US-031-037.
- Error contract (user-ruled 2026-11-15, fixtures §US-031-037):
  `MEMBERS_NOT_READY` 409, `VALIDATION_FAILED` 422, `STALE_DRAFT` 409,
  `NO_DRAFT` 404, `ALREADY_CONFIRMED` 409; precedent codes unchanged
  (`USER_REQUIRED` 401, `NOT_A_MEMBER`/`NOT_ORGANIZER` 403,
  `TRIP_NOT_FOUND` 404). Only `code` is contractual.
- Frontend Screen 9 (generate inputs/rules summary) and Screen 10 (draft
  timeline, validation status, blocked confirmation with errors, confirmed
  state), each with the mandatory error/empty/loading/permission states.
- Identity stays seed users + `X-User-Id` (ruled); no session auth.

Unchanged: greeting capability, invitations behavior (remote REQ-004; this
change only sets the flag), CI workflow structure, preference-entry UI
(later REQ), split flows (later REQs), real provider integration, soft-budget
enforcement, notifications. No breaking change to any published contract.

## Capabilities

### New Capabilities

- `main-itinerary`: readiness-gated generation of a timed main-plan draft,
  draft review with validation status, and organizer confirmation that freezes
  the shared confirmed version and closes joining.

### Modified Capabilities

None. `greeting` (the only living spec) is untouched. Closed-joining accept
behavior belongs to REQ-004's `invitations` capability, which is not in the
local living tree and is not modified here — this change only sets the flag
it consumes.

## Impact

- **Requirement**: US-031-037 (`requirement-workspace/requirements/US-031-037.md`),
  intent `requirement-workspace/intents/2026-11-15-us-031-037.md`, DoR
  `analysis/us-031-037-dor.md` (BLOCKER = 0, advisory all resolved), deep-dive
  §US-031-037, impact brief §US-031-037, fixtures §US-031-037 (M1–M5 / V1–V7 matrix).
- **Code**: new backend package + Flyway V2+ migrations and seeds; frontend
  Screen 9/10 routes and components (`App.jsx` routing extended). Greeting
  code untouched.
- **APIs**: `POST /api/trips/{id}/main-plan` (generate),
  `POST /api/trips/{id}/main-plan/confirm` (confirm), draft read projection
  (paths recommended in fixtures; finalized at P2 delta-craft/G1, recorded in
  design.md at P3).
- **Dependencies**: none new — Spring Boot, SQLite, Flyway already in the
  REQ-002 baseline.
- **Cross-REQ**: REQ-004 J4 consumes `main_plan_confirmed` (E2E re-run after
  that PR merges, DoR W1); local V2+ migrations converge with remote
  REQ-003/004 V2/V3 at merge time (OQ-9, owner SA).
- **Risks** (impact brief §US-031-037): R1 schema collision (merge-time task),
  R2 staged JOINING_CLOSED verification, R3 Rules carrier not applied (P0
  skipped by user ruling; AGENTS.md + REQ-002/004 conventions govern),
  R4 REQ-002 archive pending on main (unrelated).

## Effort and ordering

Medium — within the REQ-004 size baseline (3 US / 5 spec requirements /
31 tests). One vertical slice, no parallel tracks. Dependency sketch:
`schema + seeds → provider port + generation → validation + confirm → draft read → Screen 9/10 → ATDD matrix (M/V + reverses)`.
`/sdd:story-split` is Skipped: two US, one capability, one slice (DoR
recommendation).

## A0 deep-dive gate

US-031-037 is new with deep-dive in scope. `deep-dive.md` §US-031-037 evaluates
⑨ data contract (6 tables + 2 wire projections, cents/HH:MM conventions, no
TBD), ⑩ boundary (every scenario branch in/out), ⑪ cross-REQ (completion
ruling ✓, J4 anchor ✓, test-setup supersession ✓, schema convergence assigned
to OQ-9 and resolved), ⑫ display contract (Screens 9/10 + four mandatory
states). All four Pass → **A0 Pass**, split permitted. Single change confirmed
by the user 2026-11-15.

## Known deviations carried into later stages

- P0 harness steps skipped by user ruling ("直接走P1，不走P0"); Rules not
  applied. P2–P4 rely on AGENTS.md and REQ-002/004 conventions (impact R3).
- Local baseline lacks REQ-003/004 schema; the self-contained V2+ ruling
  stands, with an explicit SA merge-time convergence task (OQ-9).
- JOINING_CLOSED verification is staged: flag + test-only assertion in this
  change; full J4 E2E re-run after REQ-004 merges (DoR W1, owner SA/Johnson).
- Remote CI access updated 2026-11-15: `gh` v2.104.0 is now installed and
  logged in (DENGLU-OOCL, repo scope; full path needed in old shells), so the
  P4 pipeline report should attempt a gh-based CI read first. The REQ-002
  fallback still applies if the API fails: Partial with named human
  confirmation, never an API-verified Pass.