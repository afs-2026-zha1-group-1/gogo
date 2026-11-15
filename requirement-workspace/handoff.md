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
| REQ-003 (US-001 + US-002) | `openspec/changes/req-003-trip-create-and-view/` | 2026-11-14 | Proposal cites REQ-003; delta spec lands in P2. `acceptance-test-fixtures.md` authored in the same workdir |
| REQ-004 (US-008 + US-010 + US-012) | `openspec/changes/req-004-trip-invitations/` | 2026-11-14 | Proposal cites REQ-004; delta specs land in P2 (`invitations` + one `trips` state requirement). Fixtures extended in the same workdir. P4 implemented on the stacked branch; G1 signed, G2 pending push/PR + VL |
| REQ-019 (US-019) | `openspec/changes/req-019-save-interests/` | 2026-11-15 | P1 + P2 已写：`proposal.md`、`.openspec.yaml`、`specs/preferences/spec.md`；迁移 `V4` 依赖 REQ-004 的 `V3`，`V3` 已随 REQ-004 落库 |
| REQ-020 (US-020) | `openspec/changes/req-020-manage-must-do/` | 2026-11-15 | P1 已写：`proposal.md` 与 `.openspec.yaml`；修改已有能力 `preferences`，零迁移；硬前置 REQ-019 的 `V4` 与偏好页，合入顺序不得颠倒 |
| REQ-024 (US-024) | `openspec/changes/req-024-set-trip-budget/` | 2026-11-15 | P1 已写：`proposal.md` 与 `.openspec.yaml`；修改已有能力 `preferences`，零迁移；金额存最小货币单位整数；硬前置 REQ-019 的 `V4` 与 REQ-020 的页面契约，合入顺序 019 → 020 → 024 |
