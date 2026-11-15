# Session handoff note — US-031-037 → OpenSpec

- Date: 2026-11-15
- Stage: P1 complete (pre-spec-req + proposal-split)
- Workdir: `requirement-workspace/`
- Branch: `US-031-037-main-itinerary-planning` (renamed 2026-11-15 from
  `sdd-us-031-037-main-itinerary-planning`; sdd prefix dropped by user ruling)
- Change: `openspec/changes/us-031-037-main-itinerary/` (created; proposal.md +
  specs/main-itinerary/spec.md delta skeleton; validate Pass; renamed 2026-11-15
  from `req-005-main-itinerary`, US-based naming by user ruling)

Phase boundary: design.md / tasks.md are P3 outputs (`/sdd:atdd-design` →
`/sdd:task-plan`); they were generated early by the upstream propose wrap and
removed to keep this change at P1 scope. Delta AC/DoV refinement is P2
(`/sdd:delta-craft`).

`handoff.md` holds non-empty project content, so this change-specific handoff is
a separate session note (no silent overwrite).

## Artifact mapping

| Workdir artifact | OpenSpec destination | Notes |
|---|---|---|
| `intents/2026-11-15-us-031-037.md` | cited by `proposal.md` §Why / §What Changes | raw ACs, scope ruling (US-031+US-037), inherited rulings, P0 skip, fixtures provenance |
| `requirements/US-031-037.md` | `proposal.md` + delta spec inputs | G1–G6 / C1–C6 / M13 feed ADDED `main-itinerary` requirements; ACs numbered per US |
| `acceptance-test-fixtures.md` §US-031-037 | fixtures for ATDD (P3) | M/V matrix; error codes + status mapping ruled 2026-11-15; endpoint paths contractual at P2/G1 |
| `deep-dive.md` §US-031-037 | A0 gate evidence in `proposal.md` | ⑨–⑫ all Pass |
| `analysis/us-031-037-dor.md` | DoR evidence for P1 checklist | BLOCKER = 0; 2 WARNING + 2 SUGGESTION all resolved 2026-11-15 (user clarify-now) |
| `impact-brief.md` §US-031-037 | `proposal.md` §Impact / §Effort | R1–R4 carried into P2/P4 |
| `registry.md` | traceability row | P1 complete |

## Authority boundary

Workdir is not the Living Spec authority; `openspec/specs/` gains
`main-itinerary` only at P5 archive.

## Next

`/sdd:delta-craft` (P2) → `/sdd:g1-decision-record` with named IO + SA →
`/sdd:atdd-design` + `/sdd:task-plan` (P3, design/tasks). G1 is not claimed by
the agent. P1 step 6 `/sdd:quality-checklist` (P1 DoV) remains available.

Current state (2026-11-15): P3 complete; G1 recorded **Pass** — IO Emily
Pass + SA Lumi Pass on the 7-requirement / 24-scenario package; C1/C2 answered
with user-selected recommended defaults (C1 `TRAVEL_EXCEEDS_GAP` travel-fit
rule; C2 REQ-019 kind/payload `member_preference` takes V4, this change V5)
and ratified the same day (Emily C1, Lumi C2, explicit signing instruction).
Remaining non-gating follow-up F1: write-sync alignment with
`feat/travel_preference` (SA evelyn.huang) before/at REQ-019 merge.
P3 complete (2026-11-15): `atdd-design.md` + `design.md` (D1–D12) + `tasks.md`
(8 groups, red-first) authored; alignment self-check Pass (24/24 scenarios
mapped); consistency-lint p2 re-run remediated to Pass (0 BLOCKER; 2 WARNING +
6 SUGGESTION all addressed). Next: `/sdd:quality-checklist stage=p3` → P4
`/sdd:atdd-apply`.