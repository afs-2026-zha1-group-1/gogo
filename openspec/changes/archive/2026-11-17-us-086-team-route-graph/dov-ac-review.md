# US-086 AC / DoV 复核（P2）

- 复核人：sdd-delta-craft（P2 review），2026-11-17
- change：`us-086-team-route-graph`
- delta：`specs/splits/spec.md`（1 MODIFIED / 现有 9 场景保留 + 4 个 Screen 11 场景重写/新增）
- 证据：`requirement-workspace/requirements/US-086.md`、`analysis/us-086-dor.md`、`impact-brief.md` §US-086、GitHub issue #113
- 校验：`openspec validate us-086-team-route-graph --strict` = **valid**

## 验收条件（AC）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| AC-1 | 每条 requirement 至少有 1 条可测 AC | **Pass** | MODIFIED `Split draft start` 保留 9 条既有场景，并新增/重写 4 条 Screen 11 场景（展示契约、无草稿、活跃草稿状态、状态动作） | 均含 WHEN/THEN 或 GIVEN/WHEN/THEN |
| AC-2 | AC 可观察 | **Pass** | 标题「队伍路线」、右上动作、主线/分支节点、A 右 B 左、空时长「待补全」、状态分支目标 | 无「运行良好」式表述 |
| AC-3 | 负向 / 边界 | **Pass** | 无草稿/已取消、active 未选边界、路线待生成、空时长、confirmed 只读、非成员/未知行程、读取失败 | 高风险路径均有场景 |
| AC-4 | AC 不是伪装的实现细节 | **Pass** | 场景只描述标题、动作、节点与状态；未出现类名/函数名/组件名 | 数据来源差异未写进 AC，留给设计 |

## Definition of Verified（DoV）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| DoV-1 | 范围与 proposal 一致 | **Pass** | proposal「What Changes」= 页面重写 + 只读路线图 + 数据装配 + 状态动作；delta 只改 `splits` 的 Screen 11 展示契约 | 无静默扩范围；节点弹层未进入 delta |
| DoV-2 | 歧义已列或已解 | **Pass** | OQ-1 弹层已裁决不做；OQ-2 多日分段 non-blocking deferred；OQ-3 双数据源已定展示规则；OQ-4/5/6 已解 | blocking 未解 = 0 |
| DoV-3 | 角色关注已记录 | **Pass** | IO：只读、无弹层、不虚构 A/B；SA：状态机只读、双数据源、空值占位 | 见残留关注 |
| DoV-4 | 未声称实现完成 | **Pass** | 本复核只评审 delta 与契约；无代码改动 | — |
| DoV-5 | 需求可追溯 | **Pass** | issue #113 AC1–AC8 → delta 场景，见下表 | 无孤立场景 |

## 追溯表（issue AC → delta 场景）

| Issue AC | delta 覆盖 | 状态 |
|---|---|---|
| AC1 标题「队伍路线」+ 右上动作 | `发起屏幕展示契约（Screen 11）` | ✅ |
| AC2 无草稿/已取消仅主线 | `无草稿或已取消只显示主线` | ✅ |
| AC3 有边界未生成路线 | `活跃草稿的边界与路线状态` | ✅ |
| AC4 A 右/B 左与时长节点 | `活跃草稿的边界与路线状态` | ✅ |
| AC5 状态分支动作 | `状态分支的右上动作` | ✅ |
| AC6 无已确认主线前置态 | `发起屏幕展示契约（Screen 11）`（no-confirmed-main-plan 状态） | ✅ |
| AC7 权限/缺失/失败态 | `发起屏幕展示契约（Screen 11）` + 既有 S4-N/S6-N | ✅ |
| AC8 节点只读、无弹层 | `发起屏幕展示契约（Screen 11）` + requirement prose | ✅ |

## Fixture 对齐

无新增端点或迁移。E2E 复用既有演示账号与 `Singapore Friends Day` 行程；P4 在 `docs/feedback/e2e-us-086.md` 记录浏览器步骤与观察结果（入口页 + 分队 12–15 屏回归）。

## 残留关注（IO / SA）

- **IO**：节点弹层已明确不做；页面不得出现任务/费用/地点或“点击查看”的暗示。
- **IO**：无草稿与已取消状态只显示主线，不得虚构 A/B；`confirmed` 不得出现发起入口。
- **SA**：有草稿时主线来自 `split-draft.mainPlanStops`（ISO），无草稿时来自 `main-plan.stops`（本地 `HH:MM`），展示层分别格式化，不互相换算。
- **SA**：`GroupRoute` 无逐节点时刻；分支节点只显示时长分解，空值显示「待补全」。
- **SA**：OpenSpec 要求 MODIFIED 保留原场景标题，`发起屏幕展示契约（Screen 11）` 标题保留、步骤按新契约重写；归档时 Living 合并以本 delta 为准。
- **SA**：多日行程仍为单一时间线（OQ-2 deferred），不做按天切换。

## 结论

**AC 4/4 Pass；DoV 5/5 Pass；无阻塞 Fail / Partial。** `openspec validate --strict` valid，可进入 G1（需具名 IO + SA 签署）。
