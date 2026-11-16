# G3 decision — us-031-037-main-itinerary

- **Gate:** G3 (Merge & Archive)
- **Decision:** **Pass**
- **Approvers:** SA = **Lumi** (verbal Pass conveyed by the user on 2026-11-16;
  recorded here on the SA's behalf — not agent self-approval). AO asks: none.
- **Timestamp:** 2026-11-16 (+0800)
- **Change id:** `us-031-037-main-itinerary`

## Inputs

- **Merge outcome:** PR #37 (base `main`) **merged** as merge commit `00ea4bc`;
  G2 Verify already **Pass** (VL Elian Jiang, `g2-decision.md`), CI **E1 全绿**.
- **living-merge result:** OpenSpec archive applied — new Living capability
  `openspec/specs/main-itinerary/spec.md` (**7 requirements / 24 scenarios**);
  change folder moved to
  `openspec/changes/archive/2026-11-16-us-031-037-main-itinerary/`.
- **change-summary:** `change-summary.md` (this folder) — intent / shipped /
  verify / residual risks / links.
- **archive completeness:** verified present — `proposal.md`,
  `specs/main-itinerary/spec.md`, `design.md`, `atdd-design.md`, `tasks.md`,
  `dov-ac-review.md`, `consistency-lint.md`, `g1-decision.md`, `g2-decision.md`,
  `ci-report.md`, `change-summary.md`, `.openspec.yaml`; the pre-archive change
  directory no longer exists under `openspec/changes/`.
- **KB:** `tech-stack-plan.md` §13 landed-reconciliation addendum + `_LOG.md` row
  (additive, main-plan scope only). `kb-lint.sh` = documented **SKIP (not
  configured)** — KB lint not run/validated.

## Check conclusions

| Check | Outcome |
|---|---|
| Merge | Pass — PR #37 → `main` `00ea4bc`, no residual conflict |
| Merge-time conflicts | None outstanding (US-064 shell convergence resolved earlier in `2bc8ed1`) |
| Archive completeness | Pass — all artifacts present, Living Spec updated, dir moved |
| Harness / Rules evolve needed? | Soft signal only: `app-shell` Living spec carries pre-existing "requirement text too long" warnings (US-064, unrelated to this change) → route to `/sdd:evolve`/asset governance, **not** a G3 condition |

## Conditions + owners

None — Decision is **Pass**, not Conditional. Non-gating follow-ups (carried
forward, not G3 blockers): REQ-019 `V4` merge order + **F1** preference write-sync
alignment; real main-plan provider / replanning deferred to R2.

## Decision

**Pass.** Merge complete and archive complete; SA **Lumi** sign-off recorded on
2026-11-16. Change is fully closed through P5.

## Next

- Optional `/sdd:evolve` for the harness/asset observations above (not performed
  in this record).
- Commit the P5 archive products (Living spec, archive move, `tech-stack-plan`
  §13, `_LOG.md`, `change-summary.md`, this `g3-decision.md`) under separate
  typed authorization.
