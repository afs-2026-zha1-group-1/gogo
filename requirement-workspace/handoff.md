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
| US-065 (migrate frontend from JavaScript to TypeScript) | `openspec/changes/us-065-frontend-typescript-migration/` | 2026-11-16 | G2 Pass recorded; current `main` integrated into this branch. G3 prerequisites remain open. |
| REQ-003 (US-001 + US-002) | `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/` | 2026-11-14 | Proposal cites REQ-003; delta spec landed in P2. `acceptance-test-fixtures.md` authored in the same workdir. Archived 2026-11-15; G1/G2 Pass, G3 pending |
| REQ-004 (US-008 + US-010 + US-012) | `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` | 2026-11-14 | Proposal cites REQ-004; delta specs landed in P2 (`invitations` + one `trips` state requirement). Fixtures extended in the same workdir. Archived 2026-11-15 after REQ-003; G1/G2 Pass, G3 pending |
| REQ-005 (US-064) | `openspec/changes/archive/2026-11-16-us-064-mobile-app-shell/` | 2026-11-15 | Proposal cites REQ-005; delta specs landed in P2 (new `app-shell` capability, six ADDED requirements). Frontend-only; no fixture dependency (story carries its own text-only verification table). Change renamed from `req-005-mobile-app-shell` and branch from `sdd-req-005-trip-setup` to `US-064-mobile-app-shell` on 2026-11-15 per user instruction; single-change split confirmed by user. Archived 2026-11-16; G1/G2/G3 Pass; Living Spec gained 6 `app-shell` requirements |
| US-031-037 (US-031 + US-037) | `openspec/changes/archive/2026-11-16-us-031-037-main-itinerary/` | 2026-11-15 | Archived 2026-11-16; G1/G2/G3 Pass (G1 IO Emily + SA Lumi; G2 VL Elian Jiang; G3 SA Lumi); PR #37 merged to main `00ea4bc`; Living Spec gained `main-itinerary` (7 requirements / 24 scenarios). Formerly REQ-005; P2 main-itinerary delta has 7 requirements / 24 scenarios, contractual paths/statuses/wire fields and strict validation. Fixtures/deep-dive/proposal are aligned with main V2/V3 (V5 extension after the G1 C2 amendment — REQ-019 kind/payload member_preference takes V4, no trip ALTER). Confirmed version frozen; post-confirm generation rejected, no replanning until R2. User accepted agenda 1/2/4/5; Emily IO Pass recorded by separate explicit instruction, existing SA Lumi Pass retained (2026-11-15). G1 Pass (2026-11-15): C1/C2 user-selected recommended defaults ratified same day — C1 TRAVEL_EXCEEDS_GAP travel-fit rule (IO Emily ratified), C2 REQ-019 kind/payload V4 + this change V5 (SA Lumi re-confirmed; write-sync alignment with feat/travel_preference SA evelyn.huang = non-gating follow-up F1). No implementation or integration completion implied. P4 implemented and locally verified 2026-11-16 (90/90 tests; 65/65 runtime matrix; browser E2E observed, ST-1 Partial); PR #37 merged to main `00ea4bc` with CI green (E1 on head ed0a487); **G2 Pass** by VL Elian Jiang and **G3 Pass** by SA Lumi, both 2026-11-16; change archived under `openspec/changes/archive/2026-11-16-us-031-037-main-itinerary/`. |
| US-049-050 (US-049 + US-050) | `openspec/changes/us-049-050-split-confirm-cancel/` | 2026-11-16 | P1 complete: requirement entry (BQ-1..BQ-9, blocking all resolved), DoR BLOCKER = 0, deep-dive §US-049-050 (⑨–⑫ Pass), fixtures §US-049-050, impact brief §US-049-050, proposal. One change, two ADDED requirements (confirm, cancel) + two MODIFIED (chain conventions drift fix; `startDraft` rebuild-on-cancelled). Rulings 2026-11-16: single change; server recomputes timing from the draft document (client `confirmable` ignored); cancel sets `status='cancelled'` and replacement rebuilds the same row (no migration); the Living Spec drift is corrected in this delta. No new tables, no new migration. Next: P2 `/sdd:delta-craft`. |

| REQ-008 (US-066) | `openspec/changes/us-066-log-in/` | 2026-11-16 | Renumbered from REQ-006 (main took REQ-006 for US-042). P1–P4 complete; local verify Pass; PR #47 open with CI run 43828244877 green; G1 Pass, G2 human. |

## P0 note — US-049 / US-050 (2026-11-16)

- **Picked stories:** issue #21 `US-049: Confirm the Split`, issue #22 `US-050: Cancel an Unconfirmed Split`; both `Iteration 1`, `Priority - Must`, `Type - Split Planning`; board cards moved `Backlog` → `Req Analysis` on 2026-11-16 per the user's instruction.
- **Branch policy (user ruling 2026-11-16):** develop directly on `main`; no feature branch and no PR for this change. `ci.yml` runs on `main` push, so every push validates the change.
- **P0 outputs:** `docs/ai4se-plugins/20261116-141634-repo-understand-checkpoints.md`, `20261116-141840-repo-understand-brief.md`, `20261116-141853-bootstrap-checkpoints.md` (52 SKIP, nothing applied), `20261116-141924-rules-govern-checkpoints.md` (TypeScript rule set added + `.qoder` projection refreshed), `20261116-142315-quality-checklist-checkpoints.md`, `20261116-142356-quality-checklist-report.md` (p0 Overall **Partial**: P0-2 Rules gaps only).
- **Carried into P1 (from the repo-understand brief):** D1 `splits` Living Spec drifts from merged main (`X-Member-Id` vs code `X-User-Id`, `trip.split_draft` column vs `split_draft` table, V2 vs V4); D2 OQ-N7 (server recompute vs reuse of the timing verdict) unowned until now; D3 draft state machine (`active` → `confirmed` / `cancelled`) versus `split_draft.trip_id UNIQUE`; D4 organizer-only vs initiator-only error codes; OQ-5 single change vs two.
