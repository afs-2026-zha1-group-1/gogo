# Consistency lint — us-064-mobile-app-shell

- change-id: `us-064-mobile-app-shell`
- phase: `p2` (set by the `/sdd:p2` recipe)
- focus: full change (default)
- timestamp: 2026-11-15 (+0800)
- artifact level: 2 (proposal + specs; no `tasks.md`, no `design.md` — P3)
- tooling: OpenSpec CLI 1.9.0 present; `openspec validate us-064-mobile-app-shell` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 1 / N/A 8

## Disclosed authoring fix before lint

The P1 proposal lacked a named Non-Goals section (rule P3) and an explicit
downstream impact dimension (rule P4). Both were added to `proposal.md` in
this P2 turn from existing REQ-005 / story content (no scope invented):
`## Non-Goals / Out of scope` and Impact **Upstream** / **Downstream** bullets.
This is a disclosed completion of the agent's own P1 artifact, not a silent
rewrite of an authoritative spec.

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority | fact/inference |
|---|---|---|---|---|---|---|---|---|
| L1 | SUGGESTION | p2 | `docs/ai4se-plugins/20261115-142641-quality-checklist-report.md`, `...-checkpoints.md` | P1 process records still cite the pre-rename path `req-005-mobile-app-shell` | Keep as dated snapshots; living records (registry, handoff, REQ-005, impact brief, proposal) already carry the new name | grep of old slug returns only dated records + historical decision rows with rename notes | proposal | [fact] |

## Checks run

### Proposal rules

| # | Result | Evidence |
|---|---|---|
| P1 Why present | Pass | proposal.md §Why |
| P2 What Changes present | Pass | proposal.md §What Changes (six ADDED bullets) |
| P3 Non-Goals named section | Pass | proposal.md §Non-Goals / Out of scope (added this turn, disclosed above) |
| P4 Impact self/upstream/downstream | Pass | proposal.md §Impact: Code/Docs (self), Upstream, Downstream bullets |

### Spec rules

| # | Result | Evidence |
|---|---|---|
| S1 OpenSpec schema | Pass | `openspec validate` valid; Spec Delta / Purpose / ADDED Requirements / Requirement / Scenario structure |
| S2 citation prefixes | Pass | no `@…` citations used; nothing outside the agreed set |
| S2b / S2c citation resolution | N/A | no `@knowledge:` / `@rule:` citations |
| S3 Requirement → proposal trace | Pass | 6 requirements ↔ 6 What Changes bullets; dov-ac-review.md mapping table |
| S4 Given/When/Then | Pass | OpenSpec WHEN/THEN/AND form with given context embedded in WHEN clauses (house precedent REQ-004); CLI validate accepts |
| S5 Scenario ownership | Pass | all 20 scenarios nested under named Requirements (OpenSpec schema uses names, not numbers); no orphan |

### Tasks / Design rules

| # | Result | Reason |
|---|---|---|
| T1–T3 | N/A | no `tasks.md` (P3 artifact) |
| D1–D3 | N/A | no `design.md` (P3 artifact) |

### Shared / cross-artifact

| # | Result | Evidence |
|---|---|---|
| 1 cross-refs resolve | Pass | REQ-005, intent, DoR, impact §23–29, deep-dive §REQ-005, `ui-design-reference`, `app.css` all exist; old slug survives only in dated records (L1) |
| 2 no incompatible statements | Pass | spec neutral on OQ-4/OQ-5 (tab activation / "route carries no trip id"), matching REQ-005 deferrals; identity and join-exclusion wording consistent across proposal/spec/deep-dive |
| 3 no vague AC | Pass | dov-ac-review AC-4; 430 px / 100 dvh / tab order / labels concrete |
| C1 proposal → spec coverage | Pass | 6/6 requirements covered; no drop |
| C2 spec → tasks | N/A | level 2, no tasks yet |
| C6 citation reachability | N/A | no citations |

### phase=p2

| # | Result | Evidence |
|---|---|---|
| 1 scope match, no expansion/drop | Pass | spec ↔ proposal ↔ REQ-005 In/Out scope; Non-Goals now explicit in proposal |
| 2 delta internally consistent | Pass | actors (traveler / invited guest), scaffold identity, constraints coherent across all six requirements |
| 3 key scenarios/constraints have a home | Pass | S1–S11 + R-1…R-3 mapped in dov-ac-review; OQ-1/2/4/5 explicitly deferred to P3 |
| 4 tasks direction check | N/A | no tasks.md |
| 5 untraceable requirements | Pass | none |
| 6 P/S/T/D + C tables applied | Pass | above |

## Residual risks

- R19 (carried from impact brief): fixed dock vs Home `.actionbar` on short
  viewports; `100dvh`/safe-area require browser verification at P4 — not
  detectable by this lint. Owner Dev.
- OQ-4/OQ-5 P3 decisions (bare 行程 path naming; trip-selection memory) must
  stay within the spec's neutral phrasing. Owner Dev/IO.

## Reviewer metadata

- Agent run: 2026-11-15; human sign-off pending (G1 is separate).
- This report is not Living Spec authority and not a Gate decision.

## Next (non-Gate)

`/sdd:g1-decision-record` or continue `/sdd:p2`.