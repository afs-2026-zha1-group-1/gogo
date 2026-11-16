# Consistency lint — us-049-050-split-confirm-cancel

- change-id: `us-049-050-split-confirm-cancel`
- phase: p2（本人会话语境：未归档 change + Delta 待 G1）
- focus: 默认（proposal + delta specs + 工作区需求产物）
- timestamp: 2026-11-16T14:55+0800
- artifact level: **2**（proposal + specs；无 tasks.md / design.md → T/D 规则 N/A）
- tooling: `openspec validate us-049-050-split-confirm-cancel --strict` = **valid**（非手工降级）

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 3

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority | 判定 |
|---|---|---|---|---|---|---|---|---|
| F1 | SUGGESTION | p2 | delta `spec` 「V2 迁移与自包含种子」场景标题 | 标题沿用旧编号（V2），实际迁移为 V4；因 OpenSpec MODIFIED 必须逐字保留既有场景名（否则 archive 拒绝），无法直接改名 | 场景正文已注明「迁移编号纠偏：实际为 **V4**」；归档后由 living Spec 卫生 change 统一改名 | `openspec validate --strict` 首轮报错文本；delta 该场景 body | spec | [fact] |
| F2 | SUGGESTION | p2 | `openspec/changes/req-004-split-draft-start/`（空壳）、`req-002-greeting-json-sqlite`（未归档） | 两个残留 change 使 `openspec list` / active-change 探测产生噪声（含本 change 的 probe 输出） | 另行清理：空壳目录删除、REQ-002 完成归档或标记 abandoned | `openspec list` 输出；P0 probe NOTE | code | [fact] |
| F3 | SUGGESTION | p2 | proposal | 初版缺命名 `## Non-Goals`，Impact 未显式分 self/upstream/downstream（P3/P4 规则） | 已在本次 lint 中补齐 `## Non-Goals`（6 条）与 Impact 的 Upstream / Downstream 两段 | proposal §Non-Goals、§Impact | proposal | [fact] |
| F4 | SUGGESTION | p2 | delta `Purpose` 链级约定 | Delta Purpose 重写了链级约定，归档时必须以 delta Purpose 覆盖 Living Purpose，否则新旧身份口径并存 | `/sdd:living-merge` 归档时按 delta Purpose 替换；P5 lint 复核 | delta Purpose vs `openspec/specs/splits/spec.md` L9–27 | spec | [fact] |

## Rule table

| 规则 | 结果 | 说明 |
|---|---|---|
| P1 Why 非空 | Pass | proposal §Why 说明「链条断裂 + 漂移」 |
| P2 What Changes 非空 | Pass | 6 组变更点（2 ADDED / 2 MODIFIED / 错误枚举 / 前端 / 测试） |
| P3 Non-Goals 命名段 | Pass（本次已补） | 6 条，均为精确否定式 |
| P4 Impact 覆盖 self/upstream/downstream | Pass（本次已补） | Code= self；Upstream 六项依赖；Downstream 三条后续 story + 文档 |
| S1 Spec 结构 | Pass | Purpose + ADDED/MODIFIED + `#### Scenario:`，`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | N/A | delta 未使用 `@knowledge:` / `@rule:` 前缀 |
| S3 每条 Requirement 可溯源 proposal | Pass | confirm / cancel / start 重建 / 链级纠偏 / detail 读取 ↔ What Changes |
| S4 Given/When/Then | Pass（附例外说明） | **本次新撰写的 15 个场景 15/15 含 GIVEN**；34 个继承场景按 MODIFIED 契约逐字保留（改写属 Living Spec 重写，超出本变更意图） |
| S5 Scenario 归属 | Pass | 49 个场景全部挂在 7 个 requirement 下 |
| T1–T3 Tasks | N/A | 无 tasks.md（P3 产出） |
| D1–D3 Design | N/A | 无 design.md（P3 产出） |
| C1 proposal → spec 覆盖 | Pass | 2 ADDED + 5 MODIFIED 与 proposal 落地形态说明一一对应 |
| C2 spec → tasks | N/A | 无 tasks.md |
| C6 引用可达 | N/A | 无 `@knowledge:` / `@rule:` |

## phase=p2 专项检查

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| 1 | proposal 范围 vs delta 范围（无静默扩张/遗漏） | Pass | 2 ADDED + 5 MODIFIED；漂移纠偏已在 proposal 补落地形态说明（dov-ac-review DoV-1） |
| 2 | delta 内部一致（actors / constraints / scenarios） | Pass | 身份 `X-User-Id`、`split_draft` 表、`draftVersion` 语义、状态机三态在 Purpose 与 7 条 requirement 中一致；超窗数值 125/5 与 US-043 夹具一致 |
| 3 | proposal 关键场景/约束均有归属 | Pass | 超窗、缺输入、stale、非组织者、非发起人、已确认、无草稿、重建全部落场景；NFR（保留期/SLA）显式 deferred |
| 4 | tasks 方向性冲突 | N/A | 无 tasks.md |
| 5 | 无法溯源的 requirement | Pass | 无孤儿 requirement |

## 残余风险

- **R-a（中）**：`NOT_SPLIT_ORGANIZER` 与 `SPLIT_TIMING_INFEASIBLE` 属契约枚举扩展，需 G1 由 IO 具名批准；未批准前 P3 不得按新码写死错误映射。
- **R-b（中）**：取消删除 `plan_node(split-a/b)` 依赖既有 `deleteSplitRoutes`，P4 必须验证「main 行逐行不变」而非仅计数。
- **R-c（低）**：`split_draft` 单行模型不保留历史；若审计需求立项，需另做迁移（当前 Non-Goals 已声明）。
- **R-d（低）**：F2 的残留 change 噪声不影响本变更构建，但会让后续 `openspec list` 与 probe 误判。

## Reviewer metadata

- 执行者：编码代理（Qoder），2026-11-16
- 人工签核：pending（G1 由 IO / SA 具名签核，本报告不是 Gate 结论）

## Next（非 Gate）

- `/sdd:g1-decision-record`（建议路径）；或继续 `/sdd:p2` 处理 WARNING/SUGGESTION。
