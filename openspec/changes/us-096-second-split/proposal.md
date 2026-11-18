# Proposal — us-096-second-split

## Why

当前 `splits` 只支持一次「分头 → 会合」：`split_draft` 每 trip 唯一、`plan_node` 只有一组 `split-a/split-b`、前端明确写着「本次行程仅一次分队」。用户在第一次会合后仍可能临时决定再分一次，现有模型无法表达，也无法让第二轮重新分组、独立生成路线和独立确认。

需求来源：US-096（二次分队）；用户 2026-11-18 裁决：
- 第二次分队在第一次会合后单独发起、单独确认，不是出发前一次性规划两轮；
- 第二轮可以重新分组；
- 仍只有 A/B 两支队伍，首版最多两轮；
- 第一轮保持现有行为（含 `FROM_START`），第二轮只做「主线站 → 主线站」。

前置依赖与集成风险：
- US-095（起点分头）尚未合入 `group1/main`；本 change 的实现基线要求先把 US-095 合入 main。
- 当前 `group1/main` 已包含 AI 分队路线、分组预算/活动、`plan_node` 费用与坐标、V15–V17 迁移、US-090 失效监听；US-096 必须与这些能力一起工作，不能基于旧的单轮代码直接实现。

## What Changes

- **数据模型**：`split_draft` 从「每 trip 一行」改为「每轮一行」：
  - 新增 `round_index INTEGER NOT NULL DEFAULT 1 CHECK (round_index >= 1)`；
  - 唯一键改为 `UNIQUE (trip_id, round_index)`；
  - 保留 `id TEXT PRIMARY KEY` 与可空 `document TEXT`（不改变 V4 类型）；
  - 旧行迁移为 `round_index = 1`；旧 `plan_node.branch_id = split-a/split-b` 迁移为 `split-r1-a/split-r1-b`。
- **领域模型**：`status`、`draftVersion`、`groups`、边界、路线、活动都按轮次独立；行程级状态只在读取时聚合，不落库。
- **轮次规则**：
  - 第 2 轮必须等第 1 轮 `confirmed` 后发起；
  - 首版最多 2 轮；
  - 第 2 轮分头站下标必须 ≥ 第 1 轮会合站下标，允许同一站（会合后立即再分头）；
  - 第 2 轮只允许 `MIDDLE`，分头站必填；
  - 第 2 轮初始分组复制第 1 轮已确认分组，之后可重新分组；
  - 每轮所有成员必须恰好分配到 A/B 一次，两组都非空。
- **API**：
  - 新增 `/split-draft/rounds` 系列端点；
  - 旧 `/split-draft*` 端点固定映射到第 1 轮，保持兼容；
  - `GET /split-draft/rounds` 返回轮次完整详情 + 聚合状态 + `canStartNextRound`；
  - `routes:check-timing` 保持现有无状态端点，不按轮次拆分（请求体自带窗口与两路快照）。
- **前端**：
  - `/split` 改为多轮总览；
  - 四步流程参数化为 `/split/rounds/:roundIndex/{boundaries,routes,preview,confirm}`；
  - 队伍路线图支持多个 fork/join，join 与下一轮 fork 同站时合并为 `join-fork`；
  - 个人路线按轮次拼接，`ScheduleItem` 增加 `roundIndex`；
  - 仪表盘使用聚合状态。
- **预算**：第 2 轮确认时按两轮聚合；共享主线费用只算一次，成员换组后按各轮所在组计费。
- **迁移**：新增 V18（基于 main 的 V17）；只迁移数据，不改 `trip` / `main_plan_*`。

## Capabilities

### New Capabilities

- 无新增 capability；全部落在 `splits`。

### Modified Capabilities

- `splits`：
  - **ADDED** — `Split rounds`：第 2 轮发起、顺序、上限、取消后重建、聚合状态、并发。
  - **ADDED** — `Split rounds read`：`GET /split-draft/rounds` 与 `GET /split-draft/rounds/{n}`。
  - **ADDED** — `Split round budget aggregation`：多轮共享费用与换组后的按人聚合。
  - **MODIFIED** — `Split draft start`：第 1 轮范围、`(trip_id, round_index)` 唯一键。
  - **MODIFIED** — `Split boundary selection`：按轮保存、第 2 轮边界顺序与模式。
  - **MODIFIED** — `Group route generation`：按轮生成、`split-r{n}-a/b`、Provider 上下文与排除列表。
  - **MODIFIED** — `Split confirmation`：按轮确认、第 n−1 轮确认不变式、两轮预算聚合。
  - **MODIFIED** — `Split draft cancellation`：按轮取消、后续非 cancelled 轮拦截、版本不变。
  - **MODIFIED** — `Member group assignment`：按轮改组、第 2 轮预填。
  - **MODIFIED** — `Split route pair edit`：按轮保存、`split-r{n}-a/b`。
  - 未修改 — `Split draft detail read`：`GET /split-draft` 固定第 1 轮，语义不变；多轮读取由新增 `Split rounds read` 承担。

## Impact

| Area | Effect |
|---|---|
| Backend | `split_draft` 表重建 + `round_index`；仓储/服务/DTO 全部加轮次参数；新增 `SplitRoundRules`、`SplitBranchId`、Provider 上下文；新增 6 个错误码 |
| Frontend | 总览页多轮卡片；四步页面参数化；`useSplitRounds`/`useRoundIndex`；`graph-model` 多轮；`personal-route` 多轮；仪表盘聚合 |
| Database | V18：`split_draft` 表重建、旧行迁移、`plan_node` 分支 id 改名；无新表 |
| Dependencies | 无新增 |
| Security | 不改 `SecurityConfig`；轮次路径仍命中既有 `/api/trips/*/split-draft/**` 匹配器；权限规则按轮复用 |
| Specs | `openspec/specs/splits/spec.md`：3 ADDED + 7 MODIFIED（归档后生效） |
| Tests | 新增轮次 API/领域/迁移测试；更新 4 个直接断言 `split-a/b` 的测试；前端新增多轮 graph/personal-route 单测；E2E 两轮全流程 |
| Requirement source | `requirement-workspace/requirements/US-096.md`（待创建）、`requirement-workspace/analysis/us-096-second-split-opus-prompt.md` |
| Prerequisite | US-095 先合入 `group1/main`；再从 main 切 US-096 |

## Effort and phasing

- **Effort: XL**（跨前后端、数据迁移、图/个人路线/预算；回归面覆盖现有 10 个 splits API 测试与 3 个前端 node 测试）。
- 建议顺序：
  1. P0 集成：US-095 合入 main，再切 US-096；
  2. P1 规格与决策；
  3. P2 存储重构（V18、`round_index`、`SplitBranchId`、旧测试回归）；
  4. P3 第 2 轮发起/边界/分组；
  5. P4 路线与 Provider；
  6. P5 确认/取消/预算；
  7. P6 前端底座与轮次路由；
  8. P7 总览与第二轮流程；
  9. P8 图/个人路线/仪表盘；
  10. P9 演示数据与归档前置。

## Supersedes / boundaries

- 不改变 `splits` 的权限模型：发起/编辑边界/生成仍按轮次的发起人，确认/取消已确认轮次仍按组织者。
- 不改变第一轮的初始分组规则（全员 A）；只对第 2 轮增加「复制上一轮分组」的例外。
- 不改变 `routes:check-timing` 的无状态契约。
- 不新增第三支队伍、不允许成员某轮不参加、不允许两轮窗口重叠、不支持超过两轮。
- 不引入新 UI 组件库；沿用 `frontend/src/components/ui/` 与现有 shadcn 风格。
