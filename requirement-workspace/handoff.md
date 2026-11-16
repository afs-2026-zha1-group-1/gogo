# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |

## Handed off

| Requirement | Change package | Date | Notes |
|---|---|---|---|
| REQ-003 (US-001 + US-002) | `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/` | 2026-11-14 | Proposal cites REQ-003; delta spec landed in P2. `acceptance-test-fixtures.md` authored in the same workdir. Archived 2026-11-15; G1/G2 Pass, G3 pending |
| REQ-004 (US-008 + US-010 + US-012) | `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` | 2026-11-14 | Proposal cites REQ-004; delta specs landed in P2 (`invitations` + one `trips` state requirement). Fixtures extended in the same workdir. Archived 2026-11-15 after REQ-003; G1/G2 Pass, G3 pending |
| REQ-005 (US-064) | `openspec/changes/archive/2026-11-16-us-064-mobile-app-shell/` | 2026-11-15 | Proposal cites REQ-005; delta specs landed in P2 (new `app-shell` capability, six ADDED requirements). Frontend-only; no fixture dependency (story carries its own text-only verification table). Change renamed from `req-005-mobile-app-shell` and branch from `sdd-req-005-trip-setup` to `US-064-mobile-app-shell` on 2026-11-15 per user instruction; single-change split confirmed by user. Archived 2026-11-16; G1/G2/G3 Pass; Living Spec gained 6 `app-shell` requirements |
| US-031-037 (US-031 + US-037) | `openspec/changes/us-031-037-main-itinerary/` | 2026-11-15 | Formerly REQ-005; P2 main-itinerary delta has 7 requirements / 24 scenarios, contractual paths/statuses/wire fields and strict validation. Fixtures/deep-dive/proposal are aligned with main V2/V3 (V5 extension after the G1 C2 amendment — REQ-019 kind/payload member_preference takes V4, no trip ALTER). Confirmed version frozen; post-confirm generation rejected, no replanning until R2. User accepted agenda 1/2/4/5; Emily IO Pass recorded by separate explicit instruction, existing SA Lumi Pass retained (2026-11-15). G1 Pass (2026-11-15): C1/C2 user-selected recommended defaults ratified same day — C1 TRAVEL_EXCEEDS_GAP travel-fit rule (IO Emily ratified), C2 REQ-019 kind/payload V4 + this change V5 (SA Lumi re-confirmed; write-sync alignment with feat/travel_preference SA evelyn.huang = non-gating follow-up F1). No implementation or integration completion implied. P4 implemented and locally verified 2026-11-16 (90/90 tests; 65/65 runtime matrix; browser E2E observed, ST-1 Partial); push/PR + G2 pending typed authorization. |
