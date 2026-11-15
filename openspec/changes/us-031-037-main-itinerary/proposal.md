# Proposal

## Why

The group needs one feasible shared itinerary instead of four private wish
lists. US-031-037 (US-031 + US-037, formal ACs supplied by the user 2026-11-15)
adds the main-itinerary capability: the organizer generates a timed main-plan
draft from ready members' interests and constraints, and confirms the current
draft only after schedule and hard-budget validation. Confirmation freezes one
shared version and closes joining so late joiners cannot diverge from the
agreed plan. The baseline now includes REQ-003/004 (merged 2026-11-15, local
merge 4e6b261: trip/member/invitation schema V2/V3 + code), so this change
extends it with the fixture-self-contained minimal read model ruled on
2026-11-15 (V4+ convergence, seeded readiness/preferences, test-only readiness
flip) instead of rebuilding the shared tables.

## What Changes

- **ADDED** `main-itinerary` capability, one vertical slice (generate → review
  → confirm):
  - Readiness-gated generation: all members ready at a preference revision;
    a pending member blocks generation, is named in the response, and no
    partial draft is persisted (US-031 AC1/AC2).
  - Draft persistence: ordered stops with supplied activity times, travel
    legs, input preference revisions, per-person cost; draft is NOT
    auto-confirmed; regeneration creates a new draft version (ruled).
    Generation after confirmation is rejected 409 `ALREADY_CONFIRMED`
    (user accepted and Emily IO approved 2026-11-15; overall G1 Conditional);
    replanning is deferred to R2.
  - Start/end location completion at generation only, per the signed
    2026-11-14 fixtures ruling (preferences first, random fallback, supplied
    nonblank values preserved).
  - Draft read projection with computed `stale` flag (input revisions vs
    current member revisions; stale is not stored). The confirmed version is
    frozen: `stale` always false for it regardless of later revision changes
    (P2 lint ruling 2026-11-15).
  - Generation-inputs read summary for Screen 9 (`GET
    /api/trips/{id}/main-plan/inputs`, member-readable, available before any
    draft; P2 ruling 2026-11-15 closes QC gap F6).
  - Confirmation gated by validation (US-037): OQ-6 minimal feasible schedule
    set (stops time-ordered and non-overlapping, travel leg between
    consecutive stops, all stops within the trip day) plus every member's
    hard budget ≥ cost per person (NULL = no limit, OQ-10); stale drafts block
    until regenerated (OQ-7). Overrun blocks with the per-member overrun
    amount shown (10 SGD fixture case).
  - On success the draft's version becomes the shared confirmed plan — the
    confirmed version is that draft row marked `status = 'confirmed'` (no new
    version row, no `confirmed_draft_id` column, P2 ruling 2026-11-15) — and
    confirm responds 200 with the same plan projection as the draft read.
    `trip.main_plan_confirmed` (V3 column, updated not altered) is set — the
    flag REQ-004 J4 consumes to return 403 `JOINING_CLOSED` on accept
    (invitations behavior itself unchanged; accept is merged locally, so the
    J4 E2E runs in this change).
- New backend `main-itinerary` package (controller / service / repository)
  with a `MainPlanProvider` port; the fake provider is the MVP production
  implementation (ruled), supplying the four fixture stops.
- Flyway migrations from V4 on this branch (OQ-9 convergence executed
  2026-11-15): three new tables (`member_preference`, `main_plan_draft`,
  `main_plan_stop`) plus `trip_member.ready` / `preference_revision` columns;
  no `trip` ALTER. The merged V2/V3 (REQ-003/004) already seed users 1–5 and
  the fixture trip; V4 seeds readiness + rev-1 preference snapshots for its
  four members (later joiners default to not ready).
- Error contract (user-ruled 2026-11-15, fixtures §US-031-037):
  `MEMBERS_NOT_READY` 409, `VALIDATION_FAILED` 422, `STALE_DRAFT` 409,
  `NO_DRAFT` 404, `ALREADY_CONFIRMED` 409 (re-confirm per OQ-8; also
  generation after confirmation, explicitly accepted by user 2026-11-15;
  Emily IO approval recorded, overall G1 Conditional); precedent codes unchanged
  (`USER_REQUIRED` 401, `NOT_A_MEMBER`/`NOT_ORGANIZER` 403,
  `TRIP_NOT_FOUND` 404). Bodies keep `{code, message}`; `MEMBERS_NOT_READY`
  adds `pendingMembers`, `VALIDATION_FAILED` adds `scheduleErrors` +
  `overruns`. Only `code` is contractual.
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
  §US-031-037, impact brief §US-031-037, fixtures §US-031-037 (M1–M14 / V1–V7 matrix).
- **Code**: new backend package + Flyway V4+ migrations and seeds; frontend
  Screen 9/10 routes and components (`App.jsx` routing extended). Greeting,
  trip and invitation code untouched.
- **APIs** (contractual at P2 2026-11-15, fixtures §US-031-037): `POST
  /api/trips/{id}/main-plan` (generate, 201), `POST
  /api/trips/{id}/main-plan/confirm` (confirm, 200 + same plan projection),
  `GET /api/trips/{id}/main-plan` (plan read, 200), `GET
  /api/trips/{id}/main-plan/inputs` (inputs read, 200). Wire field names fixed
  in fixtures "Wire projections"; recorded in design.md at P3.
- **Dependencies**: none new — Spring Boot, SQLite, Flyway already in the
  REQ-002 baseline.
- **Cross-REQ**: REQ-004 J4 consumes `main_plan_confirmed`; accept is merged
  locally, so the full J4 `JOINING_CLOSED` E2E runs in this change (DoR W1 /
  impact R2 closed). OQ-9 convergence executed at P2 (V4+ extend, no `trip`
  ALTER); SA Lumi confirmed the shape at G1 (Pass, 2026-11-15; Emily IO approval
  now recorded; overall G1 Conditional for travel-validation and feature-schema follow-ups).
- **Risks** (impact brief §US-031-037): R1 schema collision closed at P2
  (OQ-9 convergence), R2 staged JOINING_CLOSED verification closed (accept
  local), R3 Rules carrier not applied (P0 skipped by user ruling; AGENTS.md +
  REQ-002/004 conventions govern), R4 REQ-002 archive pending on main
  (unrelated).

## Effort and ordering

Medium — within the REQ-004 size baseline (3 US / 5 spec requirements /
31 tests). One vertical slice, no parallel tracks. Dependency sketch:
`schema + seeds → provider port + generation → validation + confirm → draft read → Screen 9/10 → ATDD matrix (M/V + reverses)`.
`/sdd:story-split` is Skipped: two US, one capability, one slice (DoR
recommendation).

## A0 deep-dive gate

US-031-037 is new with deep-dive in scope. `deep-dive.md` §US-031-037 evaluates
⑨ data contract (merged V2/V3 ownership + 3 new tables + 2 `trip_member`
columns; 3 wire projections with contractual field names; cents/HH:MM
conventions, no TBD), ⑩ boundary (every scenario branch in/out), ⑪ cross-REQ
(completion ruling ✓, J4 anchor ✓ with E2E now local, test-setup supersession
✓, schema convergence executed at P2 — OQ-9), ⑫ display contract (Screens 9/10
+ four mandatory states; Screen 9 member-readable). All four Pass → **A0
Pass**, split permitted. Single change confirmed by the user 2026-11-15.

## Known deviations carried into later stages

- P0 harness steps skipped by user ruling ("直接走P1，不走P0"); Rules not
  applied. P2–P4 rely on AGENTS.md and REQ-002/004 conventions (impact R3).
- The pre-merge "self-built V2+, six tables" plan was superseded at P2
  2026-11-15: REQ-003/004 merged first, so this change appends V4+ (OQ-9
  convergence executed); SA Lumi confirmed the shape at G1 (Pass, 2026-11-15;
  Emily IO approval now recorded; overall G1 Conditional, see G1 C1/C2).
- JOINING_CLOSED verification is no longer staged: REQ-004 accept is merged
  locally, so the full J4 E2E runs in this change's ATDD (DoR W1 upgraded at
  P2; impact R2 closed).
- Remote CI access updated 2026-11-15: `gh` v2.104.0 is now installed and
  logged in (DENGLU-OOCL, repo scope; full path needed in old shells), so the
  P4 pipeline report should attempt a gh-based CI read first. The REQ-002
  fallback still applies if the API fails: Partial with named human
  confirmation, never an API-verified Pass.