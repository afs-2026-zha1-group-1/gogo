# Consistency lint — us-031-037-main-itinerary

- Change id: `us-031-037-main-itinerary`
- Phase: p2 (pre-G1; IO Emily sign-off pending, SA Lumi Pass recorded 2026-11-15)
- Focus: full change package + requirement-workspace §US-031-037 artifacts
- Timestamp: 2026-11-15
- Artifact level: 2 (proposal + specs; `tasks.md` / `design.md` absent → T/D
  rules and C2 N/A, expected at P2)
- Tooling: openspec CLI 1.16.1 present; `validate --strict` and plain mode
  both "is valid", zero warnings (re-run this session)

## Verdict

**Pass (post-remediation, 2026-11-15)** — initial run: Partial (BLOCKER 0 /
WARNING 3 / SUGGESTION 2 / N/A 3). All five findings remediated in the same
session (see §Remediation & re-check); no contradiction between stated rules
was found at any point. L1's IO ratification is a G1 agenda item
(g1-decision.md item 5), not an open lint gap. This report is not a Gate
decision.

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Fact/Inference |
|---|---|---|---|---|---|---|---|---|
| L1 | WARNING | p2 | delta spec (generation + confirmation boundaries); deep-dive ⑩; fixtures | **Generation after confirmation is unspecified.** No requirement or boundary row says whether `POST /main-plan` is blocked once a confirmed version exists. If allowed, regeneration creates a new current draft while the plan read must still return the confirmed version — the new draft would be unreachable and the "current draft" notion ambiguous. | Rule the edge before G1 closes: either reject post-confirm generation (e.g. 409 `ALREADY_CONFIRMED`, consistent with V7 semantics) or define the read precedence; add a boundary row + scenario + fixture case | delta "Regeneration SHALL supersede the previous current draft" vs "After confirmation the same read SHALL return the confirmed version"; deep-dive ⑩ has no post-confirm-generation row; fixtures M5 assumes unconfirmed | spec | [fact] gap; [inference] consequence |
| L2 | WARNING | p2 | delta "Draft review with computed staleness"; fixtures M12 | **Staleness of a confirmed plan after a later revision bump is unspecified.** The general rule computes `stale` from input revisions vs current member revisions on every read; M12 only covers the no-bump case (`stale` false). If a member's revision advances after confirmation, the rule text would surface the frozen shared plan as stale — likely unintended. | Rule that the confirmed version is frozen (`stale` always false after confirmation) or state the alternative; add the boundary row and a fixture case | delta staleness rule text; fixtures M12 premise "after V1" with no revision bump; deep-dive ⑨ "stale is computed … not stored" without a confirmed-version exemption | spec | [fact] gap; [inference] consequence |
| L3 | WARNING | p2 | delta scenarios I3, "Non-member access", "Missing or unknown identity", "Unknown trip" | Four authorization scenarios omit **GIVEN** (WHEN/THEN only). Testable as written (preconditions implicit), but S4 format check flags the missing element. | Add one-line GIVEN premises (e.g. "GIVEN Eve is a seeded user who is not a member of the trip") | delta spec scenario blocks; checklist S4 | spec | [fact] |
| L4 | SUGGESTION | p2 | delta "Generation inputs read projection" requirement text | `members` enumeration lists `displayName`, `ready`, `preferenceRevision` but omits `userId`, which the contractual wire set (fixtures) and deep-dive ⑨ include. No behavior conflict; enumeration incomplete. | Add `userId` to the requirement-text enumeration | fixtures §Wire projections inputs row; deep-dive ⑨ inputs projection row | spec | [fact] |
| L5 | SUGGESTION | p2 | delta spec vs proposal "Frontend Screen 9/10" | Frontend display contract has no delta requirement; its home is deep-dive ⑫ + the story-level mandatory-states ruling. Consistent with the REQ-003/004 precedent (display contracts live in deep-dive ⑫), so not drift — recorded for traceability only. | Keep as-is; P3 ATDD design must carry the Screen 9/10 E2E rows | REQ-004 dov-ac-review DoV-5 precedent; deep-dive §US-031-037 ⑫ | proposal | [fact] |

## Checks run (Shared + p2)

| Check | Result | Evidence |
|---|---|---|
| P1 Why / P2 What Changes / P3 Non-goals | Pass | proposal §Why, §What Changes, "Unchanged:" out-of-scope paragraph (named items: preference UI, split flows, real provider, soft budget, notifications, invitation behavior) |
| P4 Impact self/upstream/downstream | Pass | proposal §Impact: Code/APIs (self), Dependencies (upstream, none new), Cross-REQ REQ-004 J4 (downstream) |
| S1 OpenSpec structure | Pass | `openspec validate --strict` valid, zero warnings; Purpose + ADDED Requirements + Scenario blocks |
| S2/S2b/S2c citation prefixes | N/A | no `@knowledge:` / `@rule:` citations used in this change |
| S3 Requirement → proposal trace | Pass | all 7 requirements map to §What Changes bullets (generation, location completion, draft read, inputs read, confirmation, boundaries, authorization) |
| S4 Given/When/Then | WARNING L3 | 18 of 22 scenarios complete; 4 authorization scenarios lack GIVEN |
| S5 orphan scenarios | Pass | all 22 scenarios sit under numbered requirements |
| T1–T3 tasks rules | N/A | no tasks.md (P3 artifact) |
| D1–D3 design rules | N/A | no design.md (P3 artifact) |
| C1 proposal → spec coverage | Pass | every What Changes bullet has a delta home; frontend covered via deep-dive ⑫ (L5) |
| C2 spec → tasks | N/A | level 2 |
| C6 citation reachability | N/A | no citations |
| p2-1 scope no expansion/drop | Pass | delta = proposal slice; no extra capability; invitations unchanged (flag only) |
| p2-2 internal consistency | Pass with L1/L2 | statuses (generate 201 / confirm 200 / reads 200), error codes + detail fields (`pendingMembers`, `scheduleErrors`, `overruns`), wire field sets, cents/HH:MM/leg conventions identical across delta, fixtures, deep-dive ⑨, requirements §P2 rulings |
| p2-3 key constraints have a home | Pass | OQ-6 validation set → C1/C3; OQ-7 stale → C4 + stale read; OQ-8 → V7; completion ruling → G3 pair; J4 → C1 accept assertion |
| p2-5 orphan deltas | Pass | none |
| Baseline facts vs code | Pass | V2 seeds users 1–5 + Singapore Friends Day 2026-12-05 (City Hall MRT / Merlion Park, organizer 1, members 1–4); V3 adds `trip_invitation` + `trip.main_plan_confirmed` DEFAULT 0; next free migration V4 — matches deep-dive ⑨ ownership table and fixtures §State setup (measured: `backend/src/main/resources/db/migration/V2__create_trip.sql`, `V3__create_invitation.sql`) |
| Cross-artifact IDs/refs | Pass | fixtures M1–M12/V1–V7, DoR/intent/registry/handoff/impact-brief/proposal/dov-ac-review/g1-decision references all resolve; SA designation (Lumi) synced in all 7 forward-looking spots, historical Johnson signatures untouched |
| Version semantics | Pass | G5 supersession, confirmed-read identity ("existing draft marked confirmed, not a newly created version"), deep-dive status transitions current→superseded / current→confirmed agree |
| Counts | Pass | 7 requirements / 22 scenarios match dov-ac-review delta summary; M1–M12 + V1–V7 + reverses ≈ proposal "~25+ tests" |

## N/A / skipped

- T1–T3, D1–D3, C2: tasks.md / design.md are P3 artifacts, absent by design.
- S2/S2b/S2c, C6: no citation prefixes in use.
- phase=p5 checks: not applicable (pre-G1).

## Fix suggestions by priority

1. **L1 / L2 (before IO sign-off closes G1):** both are observable-behavior
   edges → business rulings (IO/BA per the attribution rule), not Dev detail.
   Recommended defaults for the ruling conversation: post-confirm generation
   rejected 409 `ALREADY_CONFIRMED` (same shape as V7); confirmed version
   frozen with `stale` always false. Once ruled, delta-craft adds the boundary
   rows, scenarios and fixture cases, then re-validate.
2. **L3:** add GIVEN premises to the four authorization scenarios (mechanical,
   no behavior change).
3. **L4:** add `userId` to the inputs `members` enumeration (mechanical).

## Remediation & re-check (2026-11-15, same session)

| id | Status | Landing evidence |
|---|---|---|
| L1 | Remediated — recommended default A landed; **IO Emily ratification pending at G1** | User selected A (2026-11-15; explicitly not Emily's sign-off): generation after confirmation rejected 409 `ALREADY_CONFIRMED`, no new draft, replanning deferred to R2. Delta scenario G6 + generation/boundaries requirement text; fixtures M14 + error-contract row; deep-dive ⑩ row; requirements G6 + §P2 rulings row; proposal What Changes + error contract; intent §P2 update item 7; g1-decision agenda item 5. Coverage expansion of `ALREADY_CONFIRMED` is IO-attributed, hence the ratification item |
| L2 | Resolved | Confirmed version frozen (`stale` always false): delta requirement text + "Confirmed plan stays frozen after a revision bump" scenario; fixtures M13 + state-setup row; deep-dive ⑨ draft/projection rows + ⑩ row; requirements M13 + §P2 rulings row; proposal draft-read bullet; intent item 7 |
| L3 | Resolved | GIVEN premises added to I3, Non-member access, Missing or unknown identity, Unknown trip — all 24 scenarios now GIVEN/WHEN/THEN complete |
| L4 | Resolved | `userId` added to the inputs `members` enumeration in the delta requirement text (matches fixtures wire set + deep-dive ⑨) |
| L5 | No action (by design) | Display contract stays in deep-dive ⑫ per REQ-003/004 precedent; P3 ATDD design carries Screen 9/10 E2E rows |

Re-check evidence: delta now 7 requirements / 24 scenarios (measured);
`openspec validate us-031-037-main-itinerary --strict` and plain mode both
"is valid", zero warnings (the draft-review requirement text was re-shortened
after the freeze clause pushed it over 500 characters; computation detail kept
in scenarios). Forward-looking counts synced to M1–M14 in DoR ④⑤⑥,
impact-brief §5/§8, proposal, g1-decision, dov-ac-review. Historical process
records (docs/ai4se-plugins QC report) left untouched.

## Residual risks

- L1 default A is landed but not yet IO-ratified; Emily may amend it at G1
  (agenda item 5). If she changes the ruling, the G6/M14 bundle is the edit
  surface. Until then P3/P4 implement A as the specified behavior.
- Location-completion mechanism ("preferences first") has no location field in
  the seeded preference schema (`interests_json` / `must_do_json`); the
  observable contract is fixed (completed, preferences first, random fallback,
  supplied preserved) but the derivation mechanism is a P3 design item. Not a
  spec contradiction; recorded so design.md addresses it explicitly.
- `X-User-Id` unverified identity (inherited, disclosed, accepted for the
  scaffold); test-only setup inventory (fixtures §State setup) — both already
  in dov-ac-review §Residual concerns, unchanged by this lint.

## Reviewer metadata

- Agent: consistency-lint run 2026-11-15 (read-only first pass; remediation
  edits executed in the same session after the L1 user selection and the L2
  ruling, with re-validation).
- Human sign-off: SA Lumi Pass (2026-11-15) covers the V4+ shape. IO Emily
  pending — G1 agenda items 1/2/4/5 (item 5 = L1 ratification of default A).

## Next (non-Gate)

Record IO Emily's verdict via `/sdd:g1-decision-record` (agenda items 1/2/4/5;
item 5 ratifies or amends L1 default A). On G1 Pass → P3 (`/sdd:atdd-design`,
`/sdd:task-plan`).