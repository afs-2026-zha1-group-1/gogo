# Evidence checklist (OpenSpec change artifacts)

Use when C1=`local+evidence` and a change folder exists. Rewrite results into
the verify report Evidence table. Mark each finding `[fact]` / `[inference]` /
`[uncertain]`. `[inference]` must include a suggested verification method.
`[uncertain]` findings drop to SUGGESTION severity.

Do **not** invent a second specs tree. Prefer paths under the project’s
configured OpenSpec change directory (commonly `openspec/changes/<change-id>/`).

## Artifact degrade

| Available artifacts | Run |
|---------------------|-----|
| tasks only | V1 only; skip V2–V8 (note skipped) |
| tasks + specs | V1–V5; skip V6–V7 (and V8 if no usable diff) |
| tasks + specs + design | V1–V7; V8 when diff available |
| full set + git diff | V1–V8 |

## Checks

### Completeness

| ID | Check | Method |
|----|-------|--------|
| V1 | Task completion | Count all `- [ ]` vs `- [x]` in tasks.md (or equivalent); assess unfinished tasks against the current verification stage as specified below |
| V2 | Requirement coverage | Extract requirements from delta specs; confirm impl evidence exists |
| V3 | Scenario coverage | Extract scenarios; confirm corresponding handling/tests exist |

### V1: stage-aware task assessment

Report the total and the complete and incomplete counts without changing any
checkboxes. List every incomplete task, its applicable stage, and the evidence
for that stage. An incomplete required task due at or before this verification
is a CRITICAL gap. Treat an ambiguous stage as due now; do not infer a future
stage merely from a task's location or title.

An incomplete lifecycle task may remain pending without blocking this
pre-PR local verification only when the task or the governing workflow
explicitly places it after this verification, such as PR submission after the
local verification gate or reconciliation immediately before archive. Report
it as pending and identify when it becomes due; never call it completed,
waived, or evidence that the whole change is complete. At its own stage it is
due and the normal blocking rule applies. This classification does not waive
any other missing evidence, failures, approvals, or gate requirements.

### Correctness

| ID | Check | Method |
|----|-------|--------|
| V4 | Requirement↔impl mapping | For each requirement, locate impl evidence; note mismatches |
| V5 | Spec drift | Flag WARNING when impl diverges from stated intent (with paths) |

### Coherence

| ID | Check | Method |
|----|-------|--------|
| V6 | Design follow-through | If design.md (or equivalent) exists, check key decisions against impl |
| V7 | Code pattern fit | New code naming/layout/style vs nearby project norms |

### Necessity (anti-creep)

| ID | Check | Method |
|----|-------|--------|
| V8 | Upstream basis | For each changed file/module in the diff, check proposal/spec/tasks basis; unmarked scope creep → WARNING |

## E1 / E2 / E3 Evidence slots

| Slot | Meaning | Typical input | Missing |
|------|---------|---------------|---------|
| **E1** Machine | Remote/local CI machine logs | `ci-report.md` from `/sdd:pipeline-report`, or local command table | Record `E1 missing`; do not invent Pass |
| **E2** AI | This skill’s verify report + optional eval report | Evidence checklist results; `evaluation-report.md` if present | Record gap; Overall not Pass when evidence in scope |
| **E3** Human | Sign-off / findings response | Human review assist + Waiver / QA sign-off | Leave pending — never self-approve |

## Five-question map (Q1–Q5)

Map checklist results so an Approved slice can answer:

| Q | Question | Maps to |
|---|----------|---------|
| Q1 | Fully implemented? | V1–V3 |
| Q2 | Correctly implemented? | V4–V5 |
| Q3 | Architecturally coherent? | V6–V7 |
| Q4 | Only what was needed? (Necessity) | V8 |
| Q5 | Risk controllable? | risk band + red-line / residual risks |

Include the Q1–Q5 table in the report when evidence is in scope (see
[human-review-assist.md](../../../../vendor/ai4se-plugins/skills/verify/local-verify-report/references/human-review-assist.md)).

## Severity

| Grade | Meaning |
|-------|---------|
| CRITICAL | Must fix before claiming Overall Pass (e.g. required tasks due at or before this verification, missing required impl) |
| WARNING | Should fix or waive explicitly |
| SUGGESTION | Optional improvement |

## Blocking rule

Any unresolved CRITICAL under evidence-in-scope → Overall must not be Pass.
