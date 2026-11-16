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
| REQ-019 (US-019) | `openspec/changes/req-019-save-interests/` | 2026-11-15 | P1 + P2 已写：`proposal.md`、`.openspec.yaml`、`specs/preferences/spec.md`；迁移 `V4` 依赖 REQ-004 的 `V3`，`V3` 已随 REQ-004 落库；2026-11-16 已推送 `origin/feat/travel_preference`（`27b09e6`），**G1 Pass（2026-11-16）**：SA evelyn.huang 与 IO Emily 均已签署，020/024 修订契约复审通过后本变更条件 1 解除；遗留 strict validation（exit 1，阻塞归档、不阻塞 P4）；**P3 完成 2026-11-16**：`atdd-design.md`（31 场景分 API 22 / E2E 9 + UT 延后 5，10 条反向核对）、`design.md`（DD1–DD9）、`tasks.md`（对齐自检 Pass）；D15 错误 advice 独立、D16 关闭 OQ-15、NFR 不纳入 |
| REQ-020 (US-020) | `openspec/changes/req-020-manage-must-do/` | 2026-11-15 | P1 + P2 已写：`proposal.md`、`.openspec.yaml`、`specs/preferences/spec.md`（2 ADDED + 页面第 2 次 MODIFIED）；修改已有能力 `preferences`，零迁移；硬前置 REQ-019 的 `V4` 与偏好页，合入顺序不得颠倒。2026-11-16 已推送 `origin/feat/travel_preference`（`27b09e6`）；`g1-decision.md`：**G1 Pass（2026-11-16）**——SA evelyn.huang 对修订后契约（删除需确认）复审通过 + IO Emily 已批准 2026-11-15；实现前置 REQ-019 的 `V4` 与偏好页；遗留 strict validation（exit 1） |
| REQ-024 (US-024) | `openspec/changes/req-024-set-trip-budget/` | 2026-11-15 | P1 + P2 已写：`proposal.md`、`.openspec.yaml`、`specs/preferences/spec.md`（2 ADDED + 页面第 3 次 MODIFIED）；修改已有能力 `preferences`，零迁移；金额存最小货币单位整数；硬前置 REQ-019 的 `V4` 与 REQ-020 的页面契约，合入顺序 019 → 020 → 024。2026-11-16 已推送 `origin/feat/travel_preference`（`27b09e6`）；`g1-decision.md`：**G1 Pass（2026-11-16）**——SA evelyn.huang 对修订后契约（清空需确认）复审通过 + IO Emily 已批准 2026-11-15；实现前置 REQ-019 的 `V4` 与 REQ-020 的第 2 版页面；遗留 strict validation（exit 1） |
| REQ-026 (US-026 + US-027) | `openspec/changes/req-026-submit-preferences/` | 2026-11-15 | P1 已写：`proposal.md` 与 `.openspec.yaml`；修改已有能力 `preferences`，零迁移；新增 `kind='submission'` + readiness/effective 两个只读端点；硬前置 REQ-019 的 `V4` 与 REQ-020/024 的 payload，合入顺序 019 → 020 → 024 → 026。P2 按用户裁定暂缓，先完成 020 → 024 |
