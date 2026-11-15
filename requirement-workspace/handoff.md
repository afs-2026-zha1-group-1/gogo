# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |
| `requirements/REQ-019.md` | `openspec/changes/req-019-save-interests/` | 2026-11-15 P1 交接：`proposal.md` + `.openspec.yaml` 已写；delta spec 与 ATDD 留 P2/P3；迁移号 `V4` 需等 REQ-004 的 `V3` 落库 |
