# Design — us-096-second-split

- 依据：`proposal.md`、`specs/splits/spec.md`（3 ADDED + 7 MODIFIED）、`requirement-workspace/analysis/us-096-second-split-opus-prompt.md`、Opus 设计评审（2026-11-18）
- 基线：`group1/main`（含 US-095 起点分头、AI 分队路线、US-045 预算/活动、V15–V17）。**P0 硬前提：US-095 先合入 main，再从 main 切 US-096。**
- 本文中的“轮次”= 一次 `分头 → 会合`；`roundIndex` 从 1 开始。

## DD0 决策表

| id | 问题 | 结论 |
|---|---|---|
| Q1 | 数据模型 | `split_draft` 每轮一行；`round_index` 只存表列 |
| Q2 | 第 2 轮初始分组 | 复制第 1 轮已确认分组；之后可改组 |
| Q3 | 第 2 轮边界模式 | 只允许 `MIDDLE`；分头站必填 |
| Q4 | 分头站等于上一轮会合站 | 允许；图上合并为 `join-fork` 节点 |
| Q5 | 最多轮次 | v1 `MAX_ROUNDS = 2`；模型按 N 轮设计 |
| Q6 | 预算范围 | 所有非 cancelled 轮次聚合；第 2 轮确认按两轮总额 |
| Q7 | 第 1 轮取消 | 仅当不存在非 cancelled 的后续轮 |
| Q8 | 第 2 轮取消后重建 | 同轮次号重建，`draftVersion = 1`，分组重新复制上一轮 |
| Q9 | 主线编辑失效范围 | 只失效 active 轮；已确认轮保持冻结 |
| Q10 | API 形态 | 新增轮次子资源；旧端点固定第 1 轮 |
| Q11 | 总览图 | 多窗口一张图；v1 不做折叠；可 `focusRound` 调暗其他轮 |
| Q12 | 个人路线标注 | `ScheduleItem.roundIndex` + 保持 A/B |
| Q13 | 第 2 轮 B 组活动 | Provider 收 `BranchCandidateContext`，用 `excludeActivityNames` 避免重复 |
| Q14 | 第 2 轮发起时机 | 只要求第 1 轮 confirmed；不做当前时间门禁 |
| Q15 | 成员某轮不参加 | 不允许；每轮全员恰好 A/B 一次 |
| Q16 | 第 2 轮主线版本 | 必须与第 1 轮一致；不一致复用 `SPLIT_DRAFT_CONFLICT` |

## DD1 核心语义与不变式

- `status`、`draftVersion`、`groups`、边界、路线、活动都是**轮次级**，存在该轮的 `split_draft` 行和 `document` 中。
- 行程级 `aggregateStatus` 只在读取时计算：任一轮 `active` → `active`；所有非 cancelled 轮都 `confirmed` 且至少一轮 → `confirmed`；只有 cancelled → `cancelled`；无轮次 → `absent`。
- 全局不变式：

  `∀ n > 1: status(n) ∈ {active, confirmed} ⇒ status(n−1) = confirmed`

  该不变式用于所有发起、确认、取消校验。
- 确认与取消 **SHALL NOT** 改变 `draftVersion`；任何内容编辑（边界、分组、路线、生成）才 +1。
- 第 1 轮保留现有 `FROM_START` / `MIDDLE`；第 2 轮只允许 `MIDDLE`。
- 每轮窗口为半开区间 `[分头站开始, 会合站开始)`；两轮窗口不重叠。
- 第 2 轮分头站允许等于第 1 轮会合站：时间上首尾相接，图上合并为 `join-fork`。

## DD2 数据模型与迁移

### 表结构

`split_draft` 重建（V18）：

```sql
CREATE TABLE split_draft_new (
  id            TEXT PRIMARY KEY,
  trip_id       INTEGER NOT NULL REFERENCES trip (id),
  round_index   INTEGER NOT NULL DEFAULT 1 CHECK (round_index >= 1),
  document      TEXT,
  draft_version INTEGER NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE (trip_id, round_index)
);

INSERT INTO split_draft_new (id, trip_id, round_index, document, draft_version, created_at, updated_at)
SELECT id, trip_id, 1, document, draft_version, created_at, updated_at FROM split_draft;

DROP TABLE split_draft;
ALTER TABLE split_draft_new RENAME TO split_draft;

UPDATE plan_node SET branch_id = 'split-r1-a' WHERE branch_id = 'split-a';
UPDATE plan_node SET branch_id = 'split-r1-b' WHERE branch_id = 'split-b';
```

硬性要求：
- `id` 必须保持 `TEXT PRIMARY KEY`（V4 原定义；现有插入使用 UUID 字符串）。
- `document` 必须保持可空（V4 原定义；历史行可能为 NULL）。
- 已确认没有其他表 `REFERENCES split_draft(id)`；表重建在 `foreign_keys=ON` 下安全。
- Flyway 迁移在事务内执行，不在迁移里修改 `PRAGMA foreign_keys`。
- 迁移测试覆盖：旧行 → round 1、`id` 不变、NULL `document` 保留、旧分支 id 改名、同一 `(trip_id, round_index)` 重复插入被唯一约束拦截。

### 轮次列与文档

- `round_index` 只存表列，作为唯一事实来源；`document` 不写 `roundIndex`。
- 读取时由服务层注入 `roundIndex` 到 DTO；`SplitDraftDocument` 保持单轮语义。
- `POST /split-draft` 仍返回原 `SplitDraftDocument` 形状（第 1 轮隐含）；`POST /split-draft/rounds` 返回 `{roundIndex, ...}`，避免把 `roundIndex` 写进文档。

## DD3 分支 id

- 统一为 `split-r{n}-a` / `split-r{n}-b`。
- 新增纯工具 `SplitBranchId`：
  - `of(round, label)` → `split-r{round}-{label.toLowerCase()}`；
  - `parse(branchId)` → `{round, label}`；
  - `forRound(round)` → 两个 id；
  - `all()` / `legacy()` 用于迁移/清理。
- 仓储不再出现字符串字面量。
- `sort_order = round * 10 + (A ? 1 : 2)`；读取不依赖 `sort_order`。
- 删除某轮：`branch_id IN (?, ?)`；删除整趟：`branch_id LIKE 'split-r%' OR branch_id IN ('split-a','split-b')`（兼容迁移前数据）。
- 所有 `split-a` / `split-b` 读取方（含 main 的 US-045/US-090 代码）改为 `SplitBranchId`；V15 历史迁移不改。

## DD4 API 合同

### 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/trips/{tripId}/split-draft/rounds` | 轮次总览：聚合状态、上限、能否发起下一轮、每轮完整详情 |
| `POST` | `/api/trips/{tripId}/split-draft/rounds` | 发起下一轮；若下一轮号已 cancelled 则重建，否则插入 |
| `GET` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}` | 指定轮详情 |
| `PUT` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}/boundaries` | 保存该轮边界 |
| `PUT` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}/assignment` | 该轮改组 |
| `POST` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes:generate` | 该轮生成路线 |
| `PUT` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes` | 该轮保存路线 |
| `POST` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}:confirm` | 该轮确认 |
| `POST` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel` | 该轮活跃草稿取消 |
| `POST` | `/api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel-confirmed` | 该轮已确认分队取消 |

兼容：
- 旧 `GET/POST/PUT/POST` 的 `/split-draft*` 端点固定 `roundIndex = 1`，内部调用新服务方法；现有 10 个 API 测试的路径与请求体不变。
- `POST /api/trips/{tripId}/split-draft/routes:check-timing` 保持不变：无状态，请求体自带 `windowMinutes` 与两路快照；不新增轮次参数。
- 旧 `POST /api/trips/{tripId}/split:cancel` 固定取消第 1 轮已确认分队。

### 总览响应

```json
{
  "data": {
    "aggregateStatus": "active",
    "maxRounds": 2,
    "canStartNextRound": false,
    "nextRoundBlockedReason": "ROUND_ALREADY_ACTIVE",
    "mainPlanStops": [{ "id": "s1", "name": "City Hall MRT", "startAt": "…", "endAt": "…" }],
    "destination": "Singapore",
    "rounds": [
      {
        "roundIndex": 1,
        "status": "confirmed",
        "draftVersion": 7,
        "splitMode": "FROM_START",
        "departureStopId": null,
        "reunionStopId": "s4",
        "departureAt": "…",
        "reunionAt": "…",
        "windowMinutes": 145,
        "groups": { "A": ["1", "2"], "B": ["3", "4"] },
        "routes": [
          { "groupLabel": "A", "steps": [], "travelLegsMinutes": [], "bufferMinutes": 0, "activityMinutes": 0 },
          { "groupLabel": "B", "steps": [], "travelLegsMinutes": [], "bufferMinutes": 0, "activityMinutes": 0 }
        ],
        "boundaryConstraints": { "minDepartureStopId": null }
      },
      {
        "roundIndex": 2,
        "status": "active",
        "draftVersion": 2,
        "splitMode": "MIDDLE",
        "departureStopId": "s4",
        "reunionStopId": "s6",
        "boundaryConstraints": { "minDepartureStopId": "s4" }
      }
    ]
  },
  "error": null
}
```

- `rounds[]` 必须携带**完整路线**（`steps`/`activities`/时长），否则总览图、个人路线、预览无法渲染；不要只返回摘要。
- `boundaryConstraints.minDepartureStopId`：第 1 轮为 `null`；第 2 轮为上一轮会合站 id。前端用它做默认值和置灰。
- `canStartNextRound` / `nextRoundBlockedReason` 由后端计算，稳定取值：
  - `PREVIOUS_ROUND_NOT_CONFIRMED`
  - `ROUND_ALREADY_ACTIVE`
  - `ROUND_LIMIT_REACHED`
  - `MAIN_PLAN_NOT_CONFIRMED`
  - `MEMBERS_INSUFFICIENT`
  - `null`（可以发起）

### 错误码

| 错误码 | HTTP | 场景 |
|---|---:|---|
| `SPLIT_ROUND_LIMIT_REACHED` | 409 | 请求第 3 轮 |
| `SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED` | 409 | 第 n−1 轮不是 confirmed |
| `SPLIT_LATER_ROUNDS_EXIST` | 409 | 存在非 cancelled 的后续轮时取消当前轮 |
| `BOUNDARY_BEFORE_PREVIOUS_REUNION` | 400 | 第 2 轮分头站早于上一轮会合站 |
| `INVALID_ROUND_MODE` | 400 | 第 2 轮传 `FROM_START` |
| `SPLIT_ROUND_NOT_FOUND` | 404 | 指定轮不存在 |

复用：
- `SPLIT_BOUNDARIES_REQUIRED`（409）：第 2 轮分头站为空/边界未保存。
- `SPLIT_DRAFT_NOT_ACTIVE`（409）：修改已冻结/已取消轮次。
- `SPLIT_DRAFT_CONFLICT`（409）：并发发起同一轮；第 2 轮 `mainPlanVersion` 与第 1 轮不一致。
- `SPLIT_MEMBERS_INSUFFICIENT`（409）、`NOT_SPLIT_INITIATOR`（403）、`NOT_SPLIT_ORGANIZER`（403）、`STALE_DRAFT_VERSION`（409）、`SPLIT_ALREADY_DEPARTED`（409）。

注：`SPLIT_BOUNDARIES_REQUIRED` 现有映射是 409，不是 400；本设计不改变它。

## DD5 轮次发起规则

按顺序校验，第一个失败即返回：

1. 调用者是本行程成员（否则 `401/404/403`）。
2. `main_plan_confirmed` 为真（`MAIN_PLAN_NOT_CONFIRMED`）。
3. 计算 `n = max(2, 当前最大 round_index + (该轮为 confirmed ? 1 : 0))`（无轮次时最大 index 视为 0）；`n > MAX_ROUNDS` → `SPLIT_ROUND_LIMIT_REACHED`。
4. 第 `n−1` 轮存在且 `status = confirmed`（`SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`）。
5. 第 `n` 轮不存在或 `status = cancelled`（`active` → `SPLIT_DRAFT_CONFLICT`；`confirmed` 已被第 3 步拦截）。
6. 当前成员数 ≥ 2（`SPLIT_MEMBERS_INSUFFICIENT`）。
7. 第 `n` 轮 `mainPlanVersion` = 第 1 轮 `mainPlanVersion`（否则 `SPLIT_DRAFT_CONFLICT`）。

创建/重建：
- 不存在：插入新行，`round_index = n`、`draftVersion = 1`、`status = active`、边界/路线为空、`groups` 复制第 `n−1` 轮已确认分组。
- 已 cancelled：原地重建同一行，`initiatorMemberId = 调用者`、`draftVersion = 1`、`status = active`、边界/路线为空、`groups` 重新复制第 `n−1` 轮分组。
- 条件写入 `UNIQUE (trip_id, round_index)` 兜底并发。

## DD6 第 2 轮边界

- `splitMode` 必须为 `MIDDLE`；`departureStopId`、`reunionStopId` 均必填。
- 两站必须属于该轮 `mainPlanVersion` 的已确认主线。
- `idx(departure) >= idx(previousReunion)`；`idx(reunion) > idx(departure)`；窗口 > 0。
- 失败码：
  - 分头早于上一轮会合 → `BOUNDARY_BEFORE_PREVIOUS_REUNION`（400）
  - 第 2 轮 `FROM_START` → `INVALID_ROUND_MODE`（400）
  - 分头缺失 → `SPLIT_BOUNDARIES_REQUIRED`（409）
  - 窗口非正 → `NONPOSITIVE_SPLIT_WINDOW`（400）
  - 主线外 → `BOUNDARY_NOT_IN_MAIN_PLAN`（400）
- 保存成功后只清空**本轮** `routes` 与 `split-r{n}-a/b`，不影响第 1 轮。
- 详情返回 `boundaryConstraints.minDepartureStopId`。

## DD7 路线生成与 Provider

- 所有生成/编辑按 `roundIndex` 读取该轮边界、分组、活动。
- A 组：该轮分头站（含）→ 该轮会合站（不含）之间的主线站；合计等于窗口。
- B 组：`BranchCandidateProvider` 选择 AI 或夹具；接口改为接收上下文：

```java
record BranchCandidateContext(
    int roundIndex,
    Instant windowStart,
    Instant windowEnd,
    List<String> excludeActivityNames) {}
```

- `excludeActivityNames` = 所有其他非 cancelled 轮次已经使用的 B 组活动名；用于 AI 提示词和夹具选择，避免第 2 轮重复第 1 轮活动。
- AI 提示词增加“第 N 次分队”“前序活动排除列表”，仍全部作为数据处理；校验/降级规则不变。
- 生成写入 `split-r{n}-a/b`；单事务删除本轮旧行、插入新行、条件更新 `draft_version`。
- 编辑路线同样只更新本轮 `plan_node` 与文档 `routes`；不改 `groups`/边界/main。
- `routes:check-timing` 仍由前端传入本轮窗口与本轮两路快照，不需要 round 参数。

## DD8 分组

- 每轮 `groups` 独立；改组只写该轮行。
- 第 2 轮创建时复制第 1 轮分组；用户可继续移动成员。
- 完整性判据不变：A/B 非空、全员恰好一次、无重复。
- 改组保留该轮边界和路线；不改其他轮。
- 已确认/已取消轮拒绝改组。

## DD9 确认与预算

确认第 n 轮：
1. 成员 → 组织者 → 该轮 active → 版本一致 → 完整性（边界、两路、分组）。
2. 该轮时间窗校验（`ReunionTimingCalculator`）。
3. `n > 1` 时第 n−1 轮仍为 confirmed（不变式）。
4. 预算聚合通过（见下）。
5. 单事务将该轮 `status` 置 `confirmed`，版本不变；只锁定该轮。

预算聚合：
- 令 `R` = 所有非 cancelled 轮次（confirmed + active）。
- `replaced` = 所有 `R` 窗口内主线站 id 的并集（按 id 去重）。
- `shared` = 全部主线站费用 − `replaced` 的费用。
- 成员 `m` 的总额：

  `member(m) = shared + Σ_{r∈R} groupCost(r, group_r(m))`

- `group_r(m)` 是成员 m 在第 r 轮所在组；因此换组后按轮计费。
- 第 1 轮确认时 `R = {1}`；第 2 轮确认时 `R = {1,2}`。
- 只读预算检查与确认使用同一集合；active 轮必须被计入，否则第 2 轮的成本在确认前不可见。
- 硬预算超支阻止确认（现有 US-045 行为）；软超支仍只提示。
- 确认前完整性校验保证缺失路线/活动不会按 0 混过。

## DD10 取消

- 活跃轮：该轮发起人可取消；`status → cancelled`、清空该轮 routes、删除该轮 `split-r{n}-*`；版本不变。
- 已确认轮：组织者可在该轮出发前取消；条件：
  - 本轮 confirmed；
  - 不存在非 cancelled 的后续轮（否则 `SPLIT_LATER_ROUNDS_EXIST`）；
  - `now < 该轮分头站 start_at`（缺失视为未出发，沿用 US-051）。
- 取消第 n 轮只删除该轮 plan_node；第 1 轮/其他轮不变。
- 条件 SQL 必须把“无后续非 cancelled 轮”放进同一 `UPDATE`，避免并发：
  - 使用 `NOT EXISTS (SELECT 1 FROM split_draft s2 WHERE s2.trip_id = ? AND s2.round_index > ? AND json_extract(s2.document,'$.status') <> 'cancelled')`；
  - 不递增 `draft_version`；只更新 `document` / `updated_at`。
- 取消后重建：活跃轮由发起人 `POST /split-draft`（第 1 轮）或 `POST /split-draft/rounds`（第 2 轮）重建；已确认轮不允许重建为活跃。

## DD11 详情与总览读取

- `GET /split-draft` 固定第 1 轮，响应增加 `roundIndex: 1` 与 `boundaryConstraints`（additive）。
- `GET /split-draft/rounds`：见 DD4；返回完整轮次详情。
- `GET /split-draft/rounds/{n}`：返回该轮详情；轮不存在 → 404 `SPLIT_ROUND_NOT_FOUND`。
- 读取不写库、不要求发起人。
- 聚合状态由后端计算，前端不重复规则。
- 旧消费者迁移：
  - `DashboardTrip.tsx` 直接 fetch `/split-draft` 的位置改为 `/split-draft/rounds` 并使用 `aggregateStatus`。
  - `useTripOverview` 的 `fetchDraftDetail` 改为轮次总览；个人路线使用所有 confirmed 轮。
  - `myGroupLabel` 单值不再够用，改为按轮映射（或从个人路线派生）。

## DD12 前端路由与 hooks

- 路由：
  - `/trips/:tripId/split`：总览。
  - `/trips/:tripId/split/rounds/:roundIndex/boundaries`
  - `/trips/:tripId/split/rounds/:roundIndex/routes`
  - `/trips/:tripId/split/rounds/:roundIndex/preview`
  - `/trips/:tripId/split/rounds/:roundIndex/confirm`
  - 旧 `/split/{boundaries,routes,preview,timing,confirm}` 重定向到第 1 轮（`timing` 仍重定向 preview）。
- hooks：
  - `useSplitRounds(tripId)`：5 秒轮询总览；
  - `useSplitDraft(tripId, roundIndex)`：指定轮详情；
  - `useRoundIndex()`：从路由参数读取；
  - 所有 mutation 成功后失效 `["split", tripId]` 前缀。
- 总览：
  - 去掉「本次行程仅一次分队」；
  - 每轮一张卡（状态、窗口、分组人数、发起人）；
  - `canStartNextRound` 决定「再次分队」入口；`nextRoundBlockedReason` 映射文案；
  - 第 1 轮 confirmed、第 2 轮 active/confirmed/cancelled 各有明确状态。
- 四步流程参数化，不复制组件：
  - 第 2 轮边界页默认选中 `minDepartureStopId`，更早站点置灰；
  - 分组页提示「已按第 1 次分组预填」；
  - 页面标题/步骤条显示「第 N 次分队」。
- 第 2 轮发起响应返回 `roundIndex`，前端据此导航到 `/split/rounds/{n}/boundaries`。

## DD13 队伍路线图

- `buildGraphRows(stops, rounds, { focusRound? })`：
  - 只渲染 `status !== cancelled` 的轮次，按 `roundIndex` 升序；
  - 共享主线 `[cursor, from)`；
  - 第 1 轮 `FROM_START`：Y 形两个出发节点；
  - 普通轮次：`fork` 行；
  - 若上一行是 `join` 且 `stopId === departureStopId`：合并为 `join-fork` 行（`nextRound` 字段）；
  - 每轮分支行、`join` 行；
  - `cursor = to + 1`（会合站由 join 行画出）；
  - 最后补共享主线尾部。
- `GraphRow` 增加 `roundIndex`；`forkRow/joinRow` 改为按轮的列表，保留单轮兼容字段。
- `TeamRouteGraph` 为每轮画独立 branch span 与 fork/join 曲线；A 右、B 左、主线中。
- `focusRound` 只调暗其他轮，不隐藏；v1 不做折叠。
- `node-detail` 的行标题/徽标显示轮次；`branch-pair`/`join-fork` 不作为可点击节点。

## DD14 个人路线与仪表盘

- `ScheduleItem` 增加 `roundIndex?: number`；key 包含轮次（如 `group-2-A`），避免两轮同组冲突。
- `derivePersonalRoute(rounds, accountId, plan)`：
  - 只使用 confirmed 轮次；
  - 按轮次顺序拼接：共享段 → 第 1 轮该成员组路线 → 轮间共享段 → 第 2 轮该成员组路线 → 尾部共享段；
  - A 组走该轮主线窗口站；B 组活动居中；
  - 缺时长保持 null（待确认），不编时间；
  - 会合站只出现一次；若第 2 轮分头站 = 第 1 轮会合站，该站作为一个 `join-fork` 项出现：
    - 第 2 轮 A 组成员：该项带第 2 轮组标签；
    - B 组成员/A 组未包含：该项作为共享/会合项。
  - 成员两轮换组时，分别按各轮组标签展示。
- `useTripOverview` 的 `myGroupLabel` 改为按轮映射或移除；`schedule` 使用多轮派生。
- 仪表盘 `split` 聚合：
  - 任一轮 active → `active`；
  - 所有非 cancelled 轮 confirmed 且至少一轮 → `confirmed`；
  - 只有 cancelled → `cancelled`；
  - 无轮次 → `absent`；
  - 文案示例：「已确认 1 轮 · 第 2 轮进行中」。

## DD15 测试与迁移

- 迁移测试：
  - 旧行 → round 1，`id` 不变，NULL `document` 保留；
  - `split-a/b` → `split-r1-a/b`；
  - 同一 `(trip_id, round_index)` 重复插入被唯一约束拦截；
  - 重建后索引/外键正常。
- 后端新增：
  - `SplitRoundStartApiTest`（AC2–6、R1–R10）
  - `SplitRoundBoundaryApiTest`（AC4–6）
  - `SplitRoundAssignmentApiTest`（AC7）
  - `SplitRoundRouteApiTest`（AC8–9）
  - `SplitRoundConfirmCancelApiTest`（AC10–14）
  - `SplitRoundBudgetApiTest`（AC19）
  - `SplitRoundsReadApiTest`（AC17–18、D1）
  - `SplitRoundRulesTest`（纯领域）
- 后端更新（因分支 id 改名）：
  - `AbstractSplitApiTest` 清理改为 `split-r%` + 旧 id；
  - `SplitRouteEditApiTest`、`SplitRouteGenerationApiTest`、`SplitConfirmedCancelApiTest` 的 `split-a/b` 断言改为 `split-r1-*`；
  - 现有路径测试保持旧端点 = 第 1 轮。
- 前端：
  - `graph-model` 多轮/join-fork/焦点；
  - `personal-route` 多轮/换组/同站去重/缺时长；
  - `team-route` 多轮路径；
  - `typecheck`、`test:unit`、`build`。
- E2E：
  - 第 1 轮确认 → 再次分队 → 第 2 轮改组 → 边界 → 生成 → 校验 → 确认；
  - 个人路线两轮、图两轮、仪表盘聚合；
  - 取消/重建第 2 轮。
- 演示数据：`scripts/demo-seed.py` 增加「两轮已确认」夹具；不改变单轮夹具。

## DD16 兼容、权限与安全

- 旧端点固定第 1 轮；旧客户端在第 2 轮 active 时仍读第 1 轮，不会误改第 2 轮。
- 轮次路径仍在 `/api/trips/*/split-draft/**` 安全匹配器内；401/403 由 `MemberGuard` 产出。
- 不信任客户端状态/版本/可行性；所有判定在服务端。
- `roundIndex` 必须是正整数；路径/请求体解析失败返回 400。
- 不在日志输出成员隐私；沿用现有 PII 规则。

## DD17 非目标

- 3 支及以上队伍、C 组。
- 超过 2 轮。
- 某轮成员不参加/待定。
- 两轮窗口重叠。
- 多日行程按天分段。
- 真实路网/地图算路。
- 每轮使用不同主线版本。
- 修改邀请、主线确认、成员加入链路。
- 新 UI 组件库、新依赖。

## DD18 风险

| 严重度 | 风险 | 规避 |
|---|---|---|
| 高 | US-095 未合 main，main 已含 AI/预算/V15–V17，直接实现会基于过时代码 | P0 硬前提；先合 US-095，再从 main 切 |
| 高 | 预算聚合算错（换组、共享重复） | 先写纯领域表格测试，再接服务层 |
| 高 | 表重建/分支 id 改名遗漏读取方 | `SplitBranchId` 统一；grep `split-a|split-b`；迁移测试 |
| 中 | 并发取消/发起打破不变式 | 条件 SQL + 同一事务 |
| 中 | 旧消费者看不到第 2 轮 | 迁移 `DashboardTrip`、`useTripOverview`、`parseSplit` |
| 中 | 图/个人路线同站重复/漏段 | `join-fork` 合并规则 + 单测 |
| 低 | 图在手机上过长 | v1 接受；后续折叠 |
| 低 | 旧测试断言 `split-a/b` 失败 | P2 明确更新 4 个测试，不承诺“零改动” |
