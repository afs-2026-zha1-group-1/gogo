# G1 decision — req-001-hello-world

> **STATUS: NOT RECORDED — awaiting named human sign-off.**
> This file is a prepared draft, not a gate decision. Per
> `.agents/skills/sdd-g1-decision-record/SKILL.md`, the record requires **named
> IO and SA approvers**; when sign-off roles are missing the skill must stop.
> The agent does not invent approval and does not self-close G1. The P2 checklist
> therefore marks P2-3 as Skipped (G1 not claimed).

- Change id: `req-001-hello-world`
- Gate: G1 (Align)
- Inputs:
  - Delta Spec: `openspec/changes/req-001-hello-world/specs/greeting/spec.md`
  - AC/DoV review: `openspec/changes/req-001-hello-world/dov-ac-review.md`
    (AC-1…AC-4 Pass; DoV-1/3/4/5 Pass; **DoV-2 Partial**)
  - Validation: `openspec validate req-001-hello-world` → valid;
    `--strict` → valid (CLI 1.16.1)
  - Requirements: `requirement-workspace/requirements/REQ-001.md`,
    `requirement-workspace/impact-brief.md`
- Findings (scope / ambiguity / conflict):
  - Scope: one new capability `greeting`, matching the proposal. CI harness
    carries no spec because it changes no product behavior.
  - Ambiguity: OQ-2 — `TODO.md` line 21 requires Flyway, line 33 lists migration
    tooling as a non-goal. Working interpretation keeps Flyway; unresolved.
  - Ambiguity: OQ-3 — endpoint media type `text/plain` vs JSON. Spec fixes only
    the body value; unresolved.
  - Conflict: none between delta requirements. OQ-4 is documentation drift
    (`TODO.md` still says SQLite), not a spec conflict.
- Decision: **not recorded** (must be one of Pass | Fail | Conditional once a
  human decides). Note: with OQ-2 and OQ-3 still unresolved, a `Pass` would be
  rejected by the G1 contract — the valid outcomes are `Fail` or `Conditional`
  with remediation items and owners.
- Conditions + owners (proposed remediation, for the human to accept or edit):
  | Item | Owner | Suggested deadline |
  |---|---|---|
  | Resolve OQ-2: confirm whether Flyway or the non-goal line governs | IO + SA | before P3 design freeze |
  | Resolve OQ-3: confirm `text/plain` vs JSON for `/api/greeting` | IO | before P3 design freeze |
  | Resolve OQ-4: decide whether `TODO.md` is rewritten to H2 or kept as history | IO | before P5 archive |
- Approvers: IO=**unnamed — required**; SA=**unnamed — required**
- Timestamp: draft prepared 2026-11-13 14:40:38 (+08:00); decision not recorded

## How to complete this record

A human with the IO and SA roles fills in both names, chooses
Pass | Fail | Conditional, accepts or edits the conditions and owners above, and
sets the decision timestamp. Only then may P2-3 be marked Pass and G1 be claimed.
