# AC / DoV review — us-064-mobile-app-shell

- Date: 2026-11-15
- Delta spec: `openspec/changes/us-064-mobile-app-shell/specs/app-shell/spec.md`
  (6 ADDED requirements, 20 scenarios; `openspec validate` → valid)
- Proposal: `openspec/changes/us-064-mobile-app-shell/proposal.md`
- Requirement: `requirement-workspace/requirements/REQ-005.md` (S1–S11, R-1…R-3)
- This is a delta-craft review, not a Gate. No G1 decision is recorded here.

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has ≥1 testable AC | Pass | spec.md: 6 requirements, 20 scenarios | Frame 3, dock 5, dashboard 2, trips 5, placeholders 3, join 2 |
| AC-2 ACs observable | Pass | spec.md scenarios | Route, surface, tab order/labels, highlight, identity header, heading uniqueness, back/forward — all observable; 430 px / 100 dvh concrete |
| AC-3 negative / edge cases | Pass | spec.md | No-trip empty state, unknown id → existing missing state, unusable token, no demo data, no list-all, contracts unchanged, dock never obscures content |
| AC-4 no disguised implementation / vague words | Pass | spec.md | No "appropriately/quickly/correctly"; visual style bound to `ui-design-reference` tokens; placeholder wording and heading text are implementation text, the contract is the stated meaning + uniqueness |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches proposal | Pass | proposal §What Changes ↔ spec.md | Six requirements, one-to-one; no silent expansion; aggregation, list-all, backend/DB explicitly excluded |
| DoV-2 ambiguities listed or resolved | Pass | REQ-005 §Open questions; spec phrasing | OQ-1/2/4/5 deferred to P3 with concrete proposals; spec stays neutral (tab activation / "route carries no trip id") so P3 naming and selection-memory choices cannot break it; OQ-3/6/7 resolved |
| DoV-3 role concerns noted | Pass | residual concerns below | IO: placeholder honesty, no aggregation, create back-target is placement; SA: scaffold identity unchanged, join exclusion presentational |
| DoV-4 no implementation claimed done | Pass | this change tree | P2 artifacts only; no business code written |
| DoV-5 traceability to proposal / requirements | Pass | mapping table below | Every requirement traces to a proposal bullet and REQ-005 scenarios; no unmatched item |

## Traceability

| Delta requirement | Proposal bullet | REQ-005 scenarios |
|---|---|---|
| Mobile shell frame | "Mobile shell frame" | S1, S9, S11, R-3 |
| Bottom dock navigation | "Bottom dock navigation" | S2, S6 (active tab), S10 |
| Dashboard tab placement | "Dashboard tab placement" | S3, R-1 (no aggregation) |
| Trips tab placement and no-trip empty state | "Trips tab placement and no-trip empty state" | S4, S5, S6, R-1 |
| Placeholder tabs | "Placeholder tabs" | S7, R-2 |
| Guest join exclusion | "Guest join exclusion" | S8, S11 |

## Residual concerns for IO / SA at G1

| # | Concern | Role | Disposition |
|---|---|---|---|
| 1 | Create back-target moves from `#/` to 行程 — placement per the story page-function table, not a `trips` contract change | IO | Confirm at G1; S11 asserts validation/submit unchanged |
| 2 | Placeholder tabs must stay honest text; the reference screenshot's demo members/routes/statuses are not requirements | IO | Guarded by AC5 + R-2 scenario; confirm at G1 |
| 3 | `X-User-Id` remains an unverified scaffold; join keeps today's scaffold bar, only the dock is excluded (OQ-6) | SA | Inherited from REQ-003; never a security control |
| 4 | R19: fixed dock vs Home `.actionbar` on short viewports; `100dvh`/safe-area need browser verification | SA | P3 layout care + P4 browser verification, not build alone |
| 5 | OQ-4/OQ-5 (bare 行程 path naming; trip-selection memory) deferred to P3 | Dev/IO | Spec neutral; proposals `#/trips` and route-derived selection recorded |

## Outcome

All AC and DoV items Pass; no blocking gap. **G1-ready for human decision** —
the gate verdict itself is not recorded here (`/sdd:g1-decision-record`).