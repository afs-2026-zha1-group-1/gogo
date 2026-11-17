# AC / DoV 复核 — US-049-050 delta spec

- 日期: 2026-11-16
- 范围: `openspec/changes/us-049-050-split-confirm-cancel/specs/splits/spec.md`
- 方法: `/sdd:delta-craft` step=all（生成 + 复核）；`openspec validate --strict` = **valid**
- 结构: 7 个 requirement（2 ADDED + 5 MODIFIED）/ **51** 个 scenario（C7 补丁后：+CF7-N、+CN6-N）
- 性质: 复核表，非 Gate；不写 G1 结论

> **C7 补丁复核（2026-11-16，P3 首步）**：按 G1 IO review findings 完成 delta 补丁 —— ① D1b/CN1 改为 cancelled 返回 `routes=[]`（取消同事务清空 `document.routes`）；② 新增 CN6-N（取消 stale 版本 → 409，新草稿不变）；③ 新增 CF7-N（草稿不完整 → 409 `SPLIT_DRAFT_INCOMPLETE` + `details.missing`）；④ 定义 `error.details.routes[]` 与 `details.missing` 形状（CF2-N/CF3-N/Screen 15 同步）；⑤ Screen 11 按 `status` 分支（cancelled → 发起替换/confirmed → 只读）；⑥ S8 `mainPlanVersion` 本期恒为 1。`openspec validate --strict` 复跑 = **valid**。AC-1~4 / DoV-1~5 仍全 Pass（新增场景均为可观察结果）。

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 requirement 至少一条可测 AC | Pass | ADDED confirm 8 场景（含 CF7-N）/ cancel 7 场景（含 CN6-N）；MODIFIED 沿用既有场景并新增 S8、D1b | 每个场景均为 HTTP 状态 + `error.code` + `error.details` + 文档 `status` + 库行数/数值 |
| AC-2 AC 可观察（无模糊措辞） | Pass | CF2-N `totalMinutes=125`、`overrunMinutes=5`；CN1 main 行逐行不变且 split 行为 0；S8 `split_draft` 行数=1 | 无 "works well / correctly" 类措辞 |
| AC-3 高风险负向/边界已点名 | Pass | CF2-N 超窗、CF3-N 缺输入、CF4-N 版本过期、CF5-N 非组织者、CF6-N 非活跃、CN2-N 已确认取消、CN3-N 非发起人、CN4-N 无草稿、CN5-N 三守卫、S7 重复发起 | 与 issue #21 AC2/AC3、#22 AC1/AC2/AC3 一一对应 |
| AC-4 AC 未退化为实现细节 | Pass | 场景描述契约行为（状态迁移、守卫顺序、响应投影），不指定类/方法 | 仅 `plan_node.branch_id`、`split_draft.trip_id UNIQUE` 作为数据契约出现 |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致（无静默扩张） | Pass | proposal §What Changes 的 2 ADDED + 2 MODIFIED 主题 ↔ delta 的 2 ADDED + 5 MODIFIED | 5 个 MODIFIED 属同一条「链级约定纠偏」的落地形态（身份头/载体/迁移编号/活跃态），proposal 已于本会话补充该落地形态说明；新增场景仅 S8、D1b 两个 |
| DoV-2 歧义已列出或解决 | Pass | requirement 条目 BQ-1..BQ-9（4 blocking 全 resolved、4 resolved、1 deferred）；delta 已将裁决写成契约 | BQ-9（保留期/SLA）仍 deferred，非阻塞 |
| DoV-3 角色关切已记录（IO/SA） | Pass | 见下方「残留关切」 | IO：错误枚举 +2；SA：状态机与无迁移实现、锁定语义、取消删除节点 |
| DoV-4 未声称实现完成 | Pass | 本文件与 delta 均未声称代码完成；`openspec list` 显示 change 无 tasks | P3/P4 才产出 design/tasks/代码 |
| DoV-5 delta 可追溯到 proposal/requirements | Pass | 每条 requirement 映射：confirm→requirement CF 行；cancel→CN 行；start 重建→CN1 与 S8；链级纠偏→BQ-4；detail 读取 confirmed/cancelled→BQ-6 | fixtures §US-049-050 的 CF/CN 矩阵与场景 id 同构 |

## 残留关切（非阻塞，交 G1 复核）

| 角色 | 关切 | delta 位置 | 处置建议 |
|---|---|---|---|
| IO | 新增两个错误码扩展契约枚举：`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409（含 `totalMinutes`/`overrunMinutes`/`missingInputs` 明细） | ADDED confirm CF5-N / CF2-N / CF3-N | G1 明确批准枚举扩展；message 文本不构成契约 |
| SA | 无新迁移下实现状态机：`split_draft.document.status` 单行三态 + `draft_version` 不随确认/取消变化 | MODIFIED start、ADDED confirm/cancel | P3 设计需明确条件更新 SQL 与事务边界（取消 = 状态 + 删 split 节点同事务） |
| SA | 锁定语义依赖既有写端点的活跃态检查（`SPLIT_DRAFT_NOT_ACTIVE`） | ADDED confirm CF1「之后的边界保存与生成被拒绝」 | P3 设计补反向用例，P4 断言 confirmed 后的写端点 409 |
| SA | 取消删除 `plan_node(split-a/b)` 与「主线不变」的验证口径 | ADDED cancel CN1 | 以 `branch_id='main'` 逐行比对 + split 行数 0 作为 DoV 证据 |
| Dev | OQ-N7 保留期/SLA 仍 deferred（BQ-9） | Purpose 链级约定未涉及 | 不阻塞；归档时记 follow-up |

## 结论

- AC / DoV 9 项全部 **Pass**，无阻塞 Fail，delta 通过 `openspec validate --strict`。
- 具备进入 `/sdd:g1-decision-record` 的条件（G1 由 IO/SA 具名签核，本复核不代签）。
