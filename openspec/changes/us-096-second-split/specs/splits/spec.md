# Splits — US-096 delta

> 基线：`group1/main`（含 US-095 起点分头、AI 分队路线、US-045 预算/活动、V15–V17）。
> MODIFIED 块保留原 requirement 的全部场景名；新增场景以 `R2-` / `R` / `RR` / `B` 前缀区分。
> 旧 `split-a/split-b` 在迁移后统一为 `split-r1-a/split-r1-b`；所有轮次统一为 `split-r{n}-a/b`。

## ADDED Requirements

### Requirement: Split rounds

系统 SHALL 允许一次行程拥有多个分队轮次，每轮一行 `split_draft`，唯一键为 `(trip_id, round_index)`；`roundIndex` 从 1 开始且 SHALL 只存表列，作为唯一事实来源。第 1 轮由 `POST /api/trips/{tripId}/split-draft` 发起；第 n 轮（n > 1）SHALL 由 `POST /api/trips/{tripId}/split-draft/rounds` 发起。首版 `MAX_ROUNDS = 2`。令 `n = max(2, 当前最大 round_index + (该轮为 confirmed ? 1 : 0))`（无轮次时最大 index 视为 0）；第 n 轮发起 SHALL 依序校验：成员资格 → 主线已确认 → n ≤ MAX_ROUNDS → 第 n−1 轮 `confirmed` → 第 n 轮不存在或 `cancelled` → 成员数 ≥ 2 → 第 n 轮 `mainPlanVersion` 与第 1 轮一致。第 n 轮初始 `status = active`、`draftVersion = 1`、边界与路线为空、`groups` 复制第 n−1 轮已确认分组；若第 n 行已 `cancelled`，SHALL 原地重建并以调用者为新发起人。系统 SHALL 保证不变式 `∀ n > 1: status(n) ∈ {active, confirmed} ⇒ status(n−1) = confirmed`。行程级 `aggregateStatus` 只在读取时推导：任一轮 active → active；所有非 cancelled 轮 confirmed 且至少一轮 → confirmed；只有 cancelled → cancelled；无轮次 → absent。取消与确认 SHALL NOT 改变 `draftVersion`。

#### Scenario: 第 2 轮发起成功（R1）

- **GIVEN** 第 1 轮已 `confirmed`，主线与成员未变
- **WHEN** 任一成员调用 `POST /split-draft/rounds`
- **THEN** 响应 `201`，`roundIndex = 2`、`status = active`、`draftVersion = 1`、边界与路线为空
- **AND** `groups` 与第 1 轮已确认分组逐字一致

#### Scenario: 第 1 轮未确认拒绝第 2 轮（R2-N）

- **GIVEN** 第 1 轮仍为 `active` 或 `cancelled`
- **WHEN** 成员发起第 2 轮
- **THEN** 响应 `409` 且 `error.code = SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`
- **AND** 不创建/改写任何轮次行

#### Scenario: 第 1 轮活跃时不能跳过（R3-N）

- **GIVEN** 第 1 轮 `active`，尚无第 2 轮
- **WHEN** 成员调用 `POST /split-draft/rounds`
- **THEN** 响应 `409 SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`
- **AND** 第 1 轮状态、版本、分组不变

#### Scenario: 第 2 轮已存在时不能重复发起（R4-N）

- **GIVEN** 第 2 轮为 `active` 或 `confirmed`
- **WHEN** 成员再次调用 `POST /split-draft/rounds`
- **THEN** 第 2 轮为 `active` 时响应 `409 SPLIT_DRAFT_CONFLICT`
- **AND** 第 2 轮为 `confirmed` 时响应 `409 SPLIT_ROUND_LIMIT_REACHED`
- **AND** 现有轮次均不变

#### Scenario: 第 3 轮拒绝（R5-N）

- **GIVEN** 第 1、2 轮均 `confirmed`
- **WHEN** 成员调用 `POST /split-draft/rounds`
- **THEN** 响应 `409` 且 `error.code = SPLIT_ROUND_LIMIT_REACHED`
- **AND** 不创建第 3 行

#### Scenario: 取消后同轮次重建（R6）

- **GIVEN** 第 2 轮已 `cancelled`
- **WHEN** 成员调用 `POST /split-draft/rounds`
- **THEN** 响应 `201`，改写同一 `round_index = 2` 行：新发起人、`draftVersion = 1`、`status = active`、边界与路线为空
- **AND** `groups` 重新复制第 1 轮分组；`split_draft` 总行数不增加

#### Scenario: 取消第 1 轮被后续非 cancelled 轮阻止（R7-N）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `active` 或 `confirmed`
- **WHEN** 组织者取消第 1 轮
- **THEN** 响应 `409` 且 `error.code = SPLIT_LATER_ROUNDS_EXIST`
- **AND** 两轮状态与 `plan_node` 不变

#### Scenario: 后续轮全部取消后第 1 轮可取消（R8）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `cancelled`
- **WHEN** 组织者在第 1 轮出发前取消第 1 轮
- **THEN** 响应 `200`，第 1 轮 `status = cancelled`
- **AND** 第 2 轮的 cancelled 行保留为历史，不被删除

#### Scenario: 聚合状态（R9）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `active`
- **WHEN** 成员读取轮次总览
- **THEN** `aggregateStatus = active`
- **AND** 第 2 轮取消后 `aggregateStatus = confirmed`；两轮都取消后为 `cancelled`

#### Scenario: 并发发起同一轮（R10-N）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮不存在
- **WHEN** Alice 与 Ben 同时调用 `POST /split-draft/rounds`
- **THEN** 至多一个成功（`201`），另一个 `409 SPLIT_DRAFT_CONFLICT`
- **AND** `(trip_id, round_index = 2)` 只有一行

#### Scenario: 第 2 轮主线版本不一致（R11-N）

- **GIVEN** 第 2 轮请求携带的 `mainPlanVersion` 与第 1 轮不同
- **WHEN** 成员发起第 2 轮
- **THEN** 响应 `409 SPLIT_DRAFT_CONFLICT`
- **AND** 不创建第 2 轮

#### Scenario: 取消不改变版本（R12）

- **GIVEN** 任一活跃轮 `draftVersion = N`
- **WHEN** 发起人取消该轮
- **THEN** 响应 `200`，`status = cancelled`，`draftVersion` 仍为 `N`

### Requirement: Split rounds read

系统 SHALL 提供成员可读的 `GET /api/trips/{tripId}/split-draft/rounds` 与 `GET /api/trips/{tripId}/split-draft/rounds/{roundIndex}`。总览 SHALL 返回 `aggregateStatus`、`maxRounds`、`canStartNextRound`、`nextRoundBlockedReason`、`mainPlanStops`、`destination` 与 `rounds[]`；每个轮次 SHALL 返回完整详情（`roundIndex`、`status`、`draftVersion`、`splitMode`、边界 id/时刻、`windowMinutes`、`groups`、完整 `routes`/`activities`、`boundaryConstraints`），不得只返回摘要而缺少路线。`boundaryConstraints.minDepartureStopId` 对第 1 轮为 null，对第 2 轮为上一轮会合站 id。`GET /split-draft` SHALL 固定返回第 1 轮并 additive 增加 `roundIndex` 与 `boundaryConstraints`。读取 SHALL NOT 改变任何轮次、版本或 `plan_node`。`canStartNextRound`/`nextRoundBlockedReason` 由后端计算，稳定取值为 `PREVIOUS_ROUND_NOT_CONFIRMED`、`ROUND_ALREADY_ACTIVE`、`ROUND_LIMIT_REACHED`、`MAIN_PLAN_NOT_CONFIRMED`、`MEMBERS_INSUFFICIENT` 或 null。

#### Scenario: 成员读取两轮总览（RR1）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active`
- **WHEN** 成员读取 `/split-draft/rounds`
- **THEN** 响应 `200`，包含两轮完整路线、分组、边界、窗口与 `boundaryConstraints`
- **AND** `aggregateStatus = active`，`canStartNextRound = false`，`nextRoundBlockedReason = ROUND_ALREADY_ACTIVE`

#### Scenario: 指定轮不存在（RR2-N）

- **WHEN** 成员读取 `/split-draft/rounds/3`
- **THEN** 响应 `404` 且 `error.code = SPLIT_ROUND_NOT_FOUND`
- **AND** `data = null`

#### Scenario: 非成员读取总览（RR3-N）

- **WHEN** Eve（非本行程成员）读取轮次总览
- **THEN** 响应 `403` 且 `error.code = NOT_A_MEMBER`
- **AND** 不返回任何轮次或路线私有值

#### Scenario: 读取不改变状态（RR4）

- **GIVEN** 两轮已保存
- **WHEN** 成员重复读取总览或指定轮详情
- **THEN** `draftVersion`、`status`、`plan_node` 均不变

#### Scenario: 旧详情固定第 1 轮（RR5）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active`
- **WHEN** 旧客户端读取 `GET /split-draft`
- **THEN** 返回第 1 轮详情，`roundIndex = 1`
- **AND** 第 2 轮不出现在该响应中

### Requirement: Split round budget aggregation

多轮确认 SHALL 按行程聚合预算，而不是只算当前轮。令 `R` = 所有非 cancelled 轮次（confirmed + active）；`replaced` = 所有 `R` 窗口内主线站 id 的并集（按 id 去重）；`shared` = 全部主线站费用 − `replaced` 费用；成员 `m` 的总额 = `shared + Σ_{r∈R} groupCost(r, group_r(m))`，其中 `group_r(m)` 是成员 m 在第 r 轮所在组。第 1 轮确认时 `R = {1}`；第 2 轮确认时 `R = {1,2}`。只读预算检查与确认 SHALL 使用同一集合，active 轮必须被计入，以便确认前看到第 2 轮成本。硬预算超支 SHALL 阻止确认；软超支只提示。缺失活动/路线不得按 0 混过确认前完整性校验。

#### Scenario: 共享费用只算一次（B1）

- **GIVEN** 第 1 轮窗口覆盖站点 s2–s4，第 2 轮覆盖 s5–s6
- **WHEN** 计算共享费用
- **THEN** s2–s6 只从共享中扣除一次，不按两轮重复扣除
- **AND** s2–s6 之间的交集（若有）按站点 id 去重

#### Scenario: 成员换组按轮计费（B2）

- **GIVEN** Alice 第 1 轮在 A、第 2 轮在 B
- **WHEN** 计算 Alice 的两轮总额
- **THEN** 第 1 轮取 A 组活动费用，第 2 轮取 B 组活动费用
- **AND** 不把两轮都按同一组计算

#### Scenario: 第 2 轮确认按两轮聚合拦截（B3-N）

- **GIVEN** 第 1 轮已确认且预算刚好用完，第 2 轮新增活动会超过某成员硬预算
- **WHEN** 组织者确认第 2 轮
- **THEN** 响应 `409`，按既有硬预算错误返回超支成员明细
- **AND** 第 2 轮仍为 `active`，第 1 轮不变

#### Scenario: 只读预算检查包含活跃轮（B4）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active` 且已有活动
- **WHEN** 成员读取预算检查
- **THEN** 结果包含第 2 轮的成本
- **AND** 不得因第 2 轮尚未确认而显示为 0

#### Scenario: 缺失活动不按 0 混过（B5-N）

- **GIVEN** 第 2 轮路线/活动缺失
- **WHEN** 组织者确认第 2 轮
- **THEN** 先返回 `SPLIT_DRAFT_INCOMPLETE`，不进入预算“通过”结论
- **AND** 不得把缺失活动当作 0 费用确认

## MODIFIED Requirements

### Requirement: Split draft start

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft`（认证会话），允许任意行程成员从已确认主线发起该行程的**第 1 轮**拆分草稿。系统 SHALL 依序校验成员资格、主线确认前置、第 1 轮活跃唯一性、当前行程成员数至少 2，并以条件写入在 `split_draft` 表创建 `round_index = 1` 的 JSON 文档（`initiatorMemberId`、`mainPlanVersion`、`draftVersion = 1`、`status = active`、可空边界字段、`groups`、`createdAt`、`updatedAt`）；`groups` SHALL 初始化为 `{"A": [全部行程成员 id], "B": []}`（按 `display_name` 升序）；每 trip 的**第 1 轮**至多一行（`UNIQUE (trip_id, round_index)`，其中 `round_index = 1`），撞车即冲突。当且仅当第 1 轮文档 `status = cancelled` 时，系统 SHALL 在该行重建草稿：以调用者为新发起人、`draftVersion` 重置为 1、`status = active`、边界与路线清空、`groups` 同样初始化为全员 A 组；`active` 或 `confirmed` 的第 1 轮 SHALL 返回冲突。当前成员数少于 2 时，创建与重建 SHALL 均以 `409 SPLIT_MEMBERS_INSUFFICIENT` 拒绝。第 2 轮及以后 SHALL 由 `Split rounds` 的 `POST /split-draft/rounds` 发起，不使用本端点。系统 SHALL 通过 V4 提供原始 `split_draft`/`plan_node`，并通过 V18 增加 `round_index` 与 `(trip_id, round_index)` 唯一键；SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on）保持不变。

#### Scenario: V2 迁移与自包含种子（REQ-004 In scope / OQ-1）

- **WHEN** 后端在已应用 V1–V3 的库上启动
- **THEN** V4 迁移创建 `split_draft`（`id TEXT`、`trip_id`、`document` 可空、`draft_version`、`created_at`、`updated_at`）与 `plan_node` 两表，不新增第三表、不改 `trip` 列
- **AND** V18 迁移将 `split_draft` 重建为 `UNIQUE (trip_id, round_index)`，旧行 `round_index = 1`，`id` 与 `document` 可空性保持不变
- **AND** V2/V3 既有种子（`app_user` 1–5、Singapore Friends Day 行程、四名成员、`main_plan_confirmed` 标志）不受影响

#### Scenario: 成员发起唯一草稿（S1）

- **WHEN** 主线 v1 已确认且第 1 轮无活跃草稿，成员 Ben 携带有效 `X-User-Id` 发起
- **THEN** 响应 `201`，`data` 含 initiatorMemberId = Ben、mainPlanVersion = 1、draftVersion = 1、status = active
- **AND** 库中该行程恰有一份 `round_index = 1` 的草稿行

#### Scenario: 初始分组为全员 A 组（S9）

- **GIVEN** 该行程有 Alice、Ben、Chloe、Daniel 四名成员，且第 1 轮无活跃草稿
- **WHEN** 任一成员发起草稿
- **THEN** 响应 `201` 且 `data.groups.A` 恰为这四名成员的 `app_user.id`（按 `display_name` 升序）
- **AND** `data.groups.B` 为空数组；两个键均存在

#### Scenario: 成员不足两人拒绝发起（S10-N）

- **GIVEN** 该行程仅有 1 名成员，主线已确认，且第 1 轮无活跃草稿
- **WHEN** 该成员发起草稿
- **THEN** 响应 `409` 且 `error.code = SPLIT_MEMBERS_INSUFFICIENT`
- **AND** 不创建草稿行；若已存在 `cancelled` 第 1 轮也不被重建

#### Scenario: 并发发起至多一个活跃草稿（S2）

- **WHEN** Alice 与 Ben 同时对同一行程发起第 1 轮
- **THEN** 至多一个请求成功（`201`），另一请求 `409 SPLIT_DRAFT_CONFLICT`
- **AND** 库中该行程 `round_index = 1` 的草稿行数 = 1

#### Scenario: 主线未确认拒绝（S3-N）

- **WHEN** `trip.main_plan_confirmed` 为 0 时成员发起
- **THEN** 响应 `409 MAIN_PLAN_NOT_CONFIRMED`
- **AND** 不创建草稿

#### Scenario: 非成员拒绝（S4-N）

- **WHEN** Eve（非本行程成员）发起
- **THEN** 响应 `403 NOT_A_MEMBER`
- **AND** 不创建草稿，响应不含行程私有数据

#### Scenario: 缺失或未知身份拒绝（S5-N）

- **WHEN** 请求无认证会话，或会话账号不在 `app_user` 中
- **THEN** 响应 `401 MEMBER_REQUIRED`
- **AND** 不创建草稿

#### Scenario: 未知行程拒绝（S6-N）

- **WHEN** 对不存在的 tripId 发起
- **THEN** 响应 `404 TRIP_NOT_FOUND`

#### Scenario: 重复发起拒绝（S7）

- **WHEN** 已存在 `active` 或 `confirmed` 的第 1 轮时再次发起
- **THEN** 响应 `409 SPLIT_DRAFT_CONFLICT`
- **AND** 原草稿文档不变

#### Scenario: 取消后同一行重建（S8）

- **GIVEN** 已存在 `status = cancelled` 的第 1 轮行，主线仍已确认
- **WHEN** 成员 Alice 发起
- **THEN** 响应 `201`，改写同一行的文档：`initiatorMemberId = Alice`、`mainPlanVersion = 1`、`draftVersion = 1`、`status = active`、边界与路线为空
- **AND** `groups` 重置为全员 A 组、B 组为空
- **AND** `round_index = 1` 行数仍为 1，`split_draft.draft_version` 列为 1
- **AND** 第 2 轮行（若存在且 cancelled）不被改写

#### Scenario: 发起屏幕展示契约（Screen 11）

- **GIVEN** 成员打开拆分发起屏幕
- **WHEN** 草稿读取返回
- **THEN** 页面呈现第 1 轮状态（initiator、mainPlanVersion、draftVersion、status）与轮次总览
- **AND** 动作按状态分支：无草稿或 `cancelled` → 发起/替换第 1 轮；`active` → 下一步；`confirmed` → 只读并显示「再次分队」（若 `canStartNextRound`）
- **AND** 冲突 / 主线未确认 / 无权限 / 成员不足错误态与 loading / empty 态可观察
- **AND** 前端不自行判定唯一性、轮次上限或确认状态

#### Scenario: 无草稿或已取消只显示主线

- **GIVEN** 该行程无草稿，或最近的草稿已 `cancelled`
- **WHEN** 页面渲染
- **THEN** 仅按时间顺序展示已确认主线节点
- **AND** 显示可发起分队的提示；不得虚构 Route A/B

#### Scenario: 活跃草稿的边界与路线状态

- **GIVEN** 第 1 轮为 `active`
- **WHEN** 尚未保存边界
- **THEN** 仅展示主线与「待选择分头/会合边界」提示
- **WHEN** 边界已保存但路线未生成
- **THEN** 展示分头、会合与主线暂停段，A/B 轨道显示「路线待生成」
- **WHEN** 两条路线已生成
- **THEN** Route A 在右、Route B 在左，分支节点按 `GroupRoute` 派生；空时长显示「待补全」
- **AND** 主线节点文字左右交替

#### Scenario: 状态分支的右上动作

- **GIVEN** 成员触发右上角分队动作
- **WHEN** 无草稿或第 1 轮为 `cancelled`
- **THEN** 客户端先发起/替换第 1 轮，再进入边界步骤
- **WHEN** 第 1 轮为 `active`
- **THEN** 客户端进入边界步骤
- **WHEN** 第 1 轮为 `confirmed`
- **THEN** 客户端进入只读复核页；若 `canStartNextRound` 为真则同时显示「再次分队」
- **AND** 客户端不得自行判定唯一性、轮次上限或确认资格

#### Scenario: 第 2 轮存在时旧发起端点仍只针对第 1 轮（R1）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active`
- **WHEN** 客户端调用旧 `POST /split-draft`
- **THEN** 响应 `409 SPLIT_DRAFT_CONFLICT`（第 1 轮已确认）
- **AND** 不创建、不修改第 2 轮

### Requirement: Split boundary selection

系统 SHALL 提供按轮保存边界的能力：旧 `PUT /api/trips/{tripId}/split-draft/boundaries` 固定 `roundIndex = 1`；新 `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/boundaries` 用于任意轮。body 含 `departureStopId`、`reunionStopId`、`draftVersion`；仅该轮发起人可成对保存。`active` 之外拒绝写入。两 stop SHALL 均属该轮 `mainPlanVersion` 的已确认主线；出发时刻 = 出发 stop 的 `start_at`，会合时刻 = 会合 stop 的 `start_at`，窗口 = 会合 − 出发（分钟）且 SHALL 为正。第 1 轮允许 `MIDDLE` 或 `FROM_START`；第 2 轮及以后 SHALL 只允许 `MIDDLE`，分头站必填，且分头站下标 SHALL ≥ 上一轮会合站下标。保存 SHALL 以 `draftVersion` 条件更新该轮文档并使该轮 `draftVersion+1`，同一事务内只清空该轮 `routes` 与该轮 `split-r{n}-a/b` 的 `plan_node` 行；任何拒绝 SHALL 不改动该轮或其他轮的边界、版本与路线。详情 SHALL 返回该轮边界 stop、对应时刻、窗口与 `boundaryConstraints`。

#### Scenario: 正窗口成对保存（B1）

- **WHEN** 第 1 轮发起人 Ben 选 City Hall MRT 出发、Merlion Park 会合，携带当前 draftVersion = 1
- **THEN** 响应 `200`，出发 = City Hall MRT @ 09:00 本地、会合 = Merlion Park @ 11:30 本地、窗口 = 150 分钟
- **AND** 第 1 轮 draftVersion 递增为 2

#### Scenario: 保存新边界清空旧路线（B7）

- **GIVEN** 第 1 轮已按旧边界生成两条路线，版本 N
- **WHEN** 发起人保存一对不同的边界
- **THEN** 响应 `200`，`draftVersion = N+1`，该轮 `routes = null`
- **AND** 该轮 `split-r1-a/b` 的 `plan_node` 行数为 0；第 2 轮行不受影响

#### Scenario: 非正窗口拒绝（B2-N）

- **WHEN** 反向选择或同一 stop 作为出发与会合
- **THEN** 响应 `400 NONPOSITIVE_SPLIT_WINDOW`
- **AND** 已保存边界、版本与既有路线不变

#### Scenario: 主线外节点拒绝（B3-N）

- **WHEN** 任一边界选择不在该轮已确认主线 stop 中
- **THEN** 响应 `400 BOUNDARY_NOT_IN_MAIN_PLAN`
- **AND** 不创建无关会合点，已保存边界与路线不变

#### Scenario: 非发起人拒绝（B4-N）

- **WHEN** 非该轮发起人成员尝试保存边界
- **THEN** 响应 `403 NOT_SPLIT_INITIATOR`
- **AND** 边界与路线不变

#### Scenario: 无活跃草稿拒绝（B5-N）

- **WHEN** 该轮非 `active` 时保存边界
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无持久化

#### Scenario: 过期版本拒绝（B6-N）

- **WHEN** 保存请求携带过期 draftVersion
- **THEN** 响应 `409 STALE_DRAFT_VERSION`
- **AND** 当前边界、版本与路线不变

#### Scenario: 边界选择屏幕展示契约（Screen 12）

- **WHEN** 发起人打开边界选择屏幕
- **THEN** 出发/会合选择器选项仅来自主线 stop，均呈现 stop 名 + 开始时刻；窗口卡在保存后显示后端派生窗口
- **AND** 会合站必须排在出发站之后：不合法选项置灰，已选项可再次点击取消
- **AND** 第 2 轮默认选中 `boundaryConstraints.minDepartureStopId`，更早站点置灰，并显示「第 1 次会合 → 第 2 次分头」提示
- **AND** “下一步”在存在未保存改动时先保存再进入路线页
- **AND** 非正窗口 / 主线外错误态与 loading / empty / permission 态均可观察；判定归后端

#### Scenario: 第 2 轮边界晚于上一轮会合（R2-B1）

- **GIVEN** 第 1 轮会合站下标为 4，主线共 8 站
- **WHEN** 第 2 轮发起人选择分头站下标 5、会合站下标 7
- **THEN** 响应 `200`，第 2 轮窗口 = 会合开始 − 分头开始 > 0
- **AND** 只清空第 2 轮旧路线；第 1 轮 `plan_node` 不变

#### Scenario: 第 2 轮分头早于上一轮会合拒绝（R2-B2-N）

- **GIVEN** 第 1 轮会合站下标为 4
- **WHEN** 第 2 轮选择分头站下标 3
- **THEN** 响应 `400 BOUNDARY_BEFORE_PREVIOUS_REUNION`
- **AND** 第 2 轮边界、版本与路线不变

#### Scenario: 第 2 轮分头等于上一轮会合（R2-B3）

- **GIVEN** 第 1 轮会合站为 s4
- **WHEN** 第 2 轮选择分头站 s4、会合站 s6
- **THEN** 响应 `200`，第 1 轮窗口截止 s4 开始、第 2 轮从 s4 开始，时间上首尾相接不重叠
- **AND** 图上 s4 渲染为 `join-fork`

#### Scenario: 第 2 轮传 FROM_START 拒绝（R2-B4-N）

- **WHEN** 第 2 轮请求 `departureStopId = null` 或显式 `FROM_START`
- **THEN** 响应 `400 INVALID_ROUND_MODE`（缺失分头站时可为 `409 SPLIT_BOUNDARIES_REQUIRED`）
- **AND** 不写入第 2 轮

#### Scenario: 保存第 2 轮边界不影响第 1 轮（R2-B5）

- **GIVEN** 第 1 轮已确认，存在完整路线
- **WHEN** 第 2 轮保存边界
- **THEN** 第 1 轮文档、`status`、`plan_node` 逐字不变
- **AND** 只有第 2 轮版本 +1

### Requirement: Group route generation

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate`（旧端点固定第 1 轮）and `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes:generate` for the initiator after that round's boundaries are saved and while the round is `active`. Before generating, it SHALL require a complete group partition for that round: both `groups.A` and `groups.B` non-empty, every current trip member assigned exactly once; incomplete partitions SHALL be rejected with `409 SPLIT_DRAFT_INCOMPLETE` and `error.details.missing`. When complete, it SHALL atomically replace that round's two routes, preserve main-plan rows and other rounds' rows, increment that round's version on success, roll back on failure, and reject stale results without overwriting newer state.

Group A SHALL keep the confirmed itinerary: its candidate SHALL be derived from the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive), exposing ordered `RouteStep` entries (`name` + scheduled stay minutes); `activityMinutes` = sum of stays, `travelLegsMinutes` = scheduled gaps between consecutive stops (last gap ends at the reunion start), `bufferMinutes` = 0, so the total equals the window exactly. Group A's `activityName` SHALL join the first and last step names with ` → ` and its `locationName` SHALL be the first stop's real location.

Group B candidates SHALL come from the configured `BranchCandidateProvider`, selected like the main-plan AI provider: when `gogo.plan.ai.api-key` is present the `AiBranchCandidateProvider` runs while a blank key keeps the deterministic `FixtureBranchCandidateProvider`. For US-096 the provider SHALL receive a `BranchCandidateContext` containing `roundIndex`, `windowStart`, `windowEnd` and `excludeActivityNames` (activities already used by other non-cancelled rounds). The AI provider SHALL include the round context and exclusion list as data (never instructions) in its prompt. The returned JSON SHALL be validated before persistence: 1–N named stops with non-negative integer stay minutes, travel legs count = stops + 1, every leg a non-negative integer, and the route total SHALL NOT exceed the window minutes. AI timeout, transport/HTTP failure, empty/non-JSON/invalid output, or an over-window total SHALL degrade to the deterministic fixture B candidate (log-only) without changing the response status or error code and without persisting partial AI output. The fixture B candidate SHALL remain a destination-keyed synthetic station and its `locationName` SHALL be the trip destination; when the context excludes that activity, the fixture SHALL choose another destination activity.

Persisted route views and the draft document SHALL carry `steps` (nullable for old documents). Routes SHALL be stored as `split-r{n}-a/b`; legacy `split-a/b` SHALL be migrated to `split-r1-a/b`. A `confirmed` or `cancelled` round SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`. After generation, any trip member SHALL be able to edit the pair through Split route pair edit; generation itself SHALL remain initiator-only.

While route generation is running the client SHALL show the reusable non-blocking notice “AI 正在生成中…” (`AiGeneratingNotice`, `role="status"`, `aria-live="polite"`) above the route cards, keep the generate button disabled until the request ends, and SHALL NOT block navigation or scrolling; the notice SHALL close when the request succeeds or fails, and failures continue to use the existing inline/`ErrorState` rendering.

> 规范性说明：本需求中的“必须/不得/应该”即 RFC 2119 的 **SHALL / MUST NOT / SHOULD**。

#### Scenario: 成对生成（G1）

- **GIVEN** 第 1 轮含完整分组，边界 City Hall MRT 09:00 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存，均起于 City Hall MRT、终于 Merlion Park
- **AND** A 组活动名 = `City Hall MRT → Gardens by the Bay`、地点 = `City Hall MRT`：steps = City Hall MRT(30) / National Gallery Singapore(30) / Gardens by the Bay(15)，activity = 75，legs = [30, 30, 15]，buffer = 0
- **AND** 无 AI key 时 B 组为夹具活动：Gardens by the Bay，地点 = `Singapore`
- **AND** draftVersion 递增；candidates come from replaceable `BranchCandidateProvider`
- **AND** routes 使用 `split-r1-a/split-r1-b` 行；结构化时长 JSON 含 `activityMinutes`、`travelLegsMinutes[]`、`bufferMinutes` 与 `steps[]`
- **AND** replacement deletes the round's old pair and inserts the new pair in one transaction, preserving main-plan and other-round rows

#### Scenario: A 组合计等于时间窗（G7）

- **GIVEN** 主线在边界之间按序排列且无重叠
- **WHEN** 生成路线
- **THEN** A 组 `activityMinutes + ΣtravelLegsMinutes + bufferMinutes` = `windowMinutes`
- **AND** A 组 `steps` 的名称与顺序 = 边界之间的主线站点

#### Scenario: AI 提供者生成 B 组窗口内分支（AI1）

- **GIVEN** 已配置 `gogo.plan.ai.api-key`，AI 提供者返回合法 JSON：steps = Gardens by the Bay(60)，legs = [15, 15]，总耗时 90 ≤ 窗口 150
- **WHEN** 发起人触发生成
- **THEN** 响应 `200`，A 组沿主线不变，B 组采用 AI 返回值
- **AND** `activityName` = 首末站拼接、`locationName` = 首站名，`draftVersion` 递增

#### Scenario: B 组超窗被拦并降级（AI2-N）

- **GIVEN** 已配置 AI key，AI 返回总耗时 160 分钟（窗口 150）
- **WHEN** 发起人触发生成
- **THEN** 响应 `200`，B 组为确定性夹具候选
- **AND** 不持久化任何 AI 产出片段

#### Scenario: AI 失败无感降级为夹具（AI3-N）

- **GIVEN** 已配置 AI key，但 AI 调用超时、返回非 2xx 或空白/非 JSON
- **WHEN** 发起人触发生成
- **THEN** 响应 `200` 且 B 组为夹具候选（失败仅 `log.warn`）
- **AND** A 组沿主线、`draftVersion` 照常递增

#### Scenario: 半对失败整对回滚（G2-N）

- **WHEN** 夹具构造提供者对 B 组抛错（A 组成功）
- **THEN** 错误响应 `ROUTE_GENERATION_FAILED`
- **AND** 库中无该轮任何新路线，该轮 draftVersion 不变；其他轮与全部主线行保持原样

#### Scenario: 过期结果拒绝（G3-N）

- **WHEN** generation starts at draftVersion N and a concurrent boundary re-selection advances the round to N+1 before results return
- **THEN** 响应 `409 STALE_DRAFT_VERSION`
- **AND** the result for N is discarded and state at N+1 is not overwritten

#### Scenario: 无边界拒绝（G4-N）

- **WHEN** 该轮边界未保存时触发生成
- **THEN** 响应 `409 SPLIT_BOUNDARIES_REQUIRED`
- **AND** 无路线落库，不对 AI 发起调用

#### Scenario: 非发起人拒绝（G5-N）

- **WHEN** 非该轮发起人成员触发生成
- **THEN** 响应 `403 NOT_SPLIT_INITIATOR`
- **AND** 无路线落库，不对 AI 发起调用

#### Scenario: 分组不完整时拒绝生成（G6-N）

- **WHEN** 该轮存在空组、未分组或重复分组成员
- **THEN** 响应 `409 SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 按事实列出 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`
- **AND** 该轮 `split-r{n}-a/b` 行数为 0，draftVersion 不变，不对 AI 发起调用

#### Scenario: 生成期间显示 AI 进度提示（AI4）

- **GIVEN** 发起人在某轮分组路线屏幕触发生成/重新生成
- **WHEN** `routes:generate` 请求仍在进行
- **THEN** 页面内可见常驻、非阻塞的“AI 正在生成中…”提示条，生成按钮保持禁用
- **AND** 请求成功或失败后提示关闭，失败由现有行内/`ErrorState` 展示

#### Scenario: 路线卡内联编辑与终态只读（S1）

- **GIVEN** 某轮为 `active` 且已生成 A/B 两条路线
- **WHEN** 任一成员打开分组路线屏幕
- **THEN** A/B 两组均以站点列表编辑（站名 + 停留分钟，可添加/删除站点）
- **AND** 路程逐段标注为「路程」，A/B 预览按地点与路程交替展示
- **AND** 站点名称展示与保存时去除「主线·」前缀；新增站点留空并以「新站点」占位
- **AND** 草稿为 `confirmed` 或 `cancelled` 时字段只读，且不出现「下一步」
- **AND** 前端不自行判定路线合法性或时间可行性

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **WHEN** 任一成员打开分组路线屏幕
- **THEN** 页面呈现分组卡与成对路线卡；A/B 卡均为站点列表
- **AND** 路线卡字段可编辑；「下一步」在保存/校验进行中禁用重复点击；生成按钮在请求进行中禁用
- **AND** 每张路线卡显示「合计 X 分 / 窗口 Y 分」；超窗在表头标红
- **AND** 顶部显示时间窗与「由所选出发/会合站决定」的说明
- **AND** 已生成路线在成员改组后仍原样呈现并提示需重新生成；终态路线只读；判定归后端

#### Scenario: 第 2 轮按轮生成且不重复活动（R2-G1）

- **GIVEN** 第 1 轮已确认，B 组活动为 Gardens by the Bay；第 2 轮分组完整、边界已保存
- **WHEN** 第 2 轮发起人触发生成
- **THEN** 响应 `200`，第 2 轮 A 组沿其窗口主线，B 组使用不同活动
- **AND** `BranchCandidateContext.roundIndex = 2`，`excludeActivityNames` 含 Gardens by the Bay

#### Scenario: 第 2 轮生成不删除第 1 轮行（R2-G2）

- **GIVEN** 第 1 轮 `split-r1-a/b` 行存在
- **WHEN** 第 2 轮生成路线
- **THEN** 只删除/插入 `split-r2-a/b`；第 1 轮行逐行不变
- **AND** 第 1 轮 `draftVersion` 与文档不变

#### Scenario: 第 2 轮 Provider 排除前轮活动（R2-G3）

- **GIVEN** 第 1 轮 B 组活动为 X
- **WHEN** 第 2 轮使用夹具或 AI 生成
- **THEN** 候选活动不得为 X
- **AND** AI 提示词包含排除列表；夹具选择另一个目的地活动

### Requirement: Split confirmation

系统 SHALL 提供按轮确认：旧 `POST /api/trips/{tripId}/split-draft:confirm` 固定第 1 轮；新 `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:confirm`（认证会话，body 含 `draftVersion`）用于任意轮，仅允许行程组织者确认该轮活跃草稿。校验顺序 = 成员资格 → 组织者 → 该轮活跃 → 版本一致 → 该轮完整性（边界已存、两条路线齐备、分组完整）→ 该轮时间窗复算 → n>1 时第 n−1 轮仍为 confirmed → 预算聚合通过；客户端声明不参与判定。拒绝时不改变该轮 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE`、`SPLIT_TIMING_INFEASIBLE` 或既有硬预算错误。成功 SHALL 在单一事务内将**该轮** `status` 置 `confirmed`（版本不变），该轮路线、分组与边界生效并锁定编辑；其他轮不变。确认第 2 轮 SHALL 使用两轮聚合预算（见 `Split round budget aggregation`）。复核屏 SHALL 显示轮次并以其预览为返回目标；确认复算 SHALL 使用最近一次保存的编辑后路线。

#### Scenario: 组织者确认成功并锁定（CF1）

- **GIVEN** 第 1 轮活跃版本 3，两组齐全互斥，边界已保存，路线对 A = 150、B = 100（窗口 150）
- **WHEN** 组织者携带 `draftVersion: 3` 调用确认
- **THEN** 响应 `200`，`data.status = confirmed`，`data.draftVersion = 3`
- **AND** 之后该轮边界保存与路线生成均返回 `409 SPLIT_DRAFT_NOT_ACTIVE`

#### Scenario: 编辑后确认按新路线复算（CF9）

- **GIVEN** 成员通过 Split route pair edit 保存了修改后的 A `steps` 与 B 分解（版本 4），复算仍可行
- **WHEN** 组织者携带 `draftVersion: 4` 确认
- **THEN** 响应 `200`，`data.status = confirmed`，确认使用编辑后的派生合计
- **AND** 若编辑值不可行，返回 `409 SPLIT_TIMING_INFEASIBLE`

#### Scenario: 超窗拦住整对确认（CF2-N）

- **GIVEN** A 路线末段交通被改为 80 分钟（A = 215），窗口 150
- **WHEN** 组织者确认
- **THEN** 响应 `409 SPLIT_TIMING_INFEASIBLE`，`status` 与版本不变
- **AND** `error.details.routes` 为长度 2 的数组：A 项 `totalMinutes = 215`、`overrunMinutes = 65`；B 项 `totalMinutes = 100`、`overrunMinutes = 0`

#### Scenario: 缺输入不得判为可确认（CF3-N）

- **WHEN** 任一必填时长（activity / travel leg / buffer）缺失
- **THEN** 响应 `409 SPLIT_TIMING_INFEASIBLE`；`error.details.routes` 对应项列出缺失字段
- **AND** 不得把缺失输入按 0 处理为可行

#### Scenario: 草稿不完整无确认（CF7-N）

- **WHEN** 该轮边界或任一路线缺失
- **THEN** 响应 `409 SPLIT_DRAFT_INCOMPLETE`，`details.missing` 列出缺失部分

#### Scenario: 分组不完整无确认（CF8-N）

- **WHEN** 该轮分组有空组 / 未分组 / 重复
- **THEN** 响应 `409 SPLIT_DRAFT_INCOMPLETE`，`details.missing` 列出 `groups.*`

#### Scenario: 版本过期拒绝（CF4-N）

- **WHEN** 携带过期 `draftVersion` 确认
- **THEN** 响应 `409 STALE_DRAFT_VERSION`

#### Scenario: 非组织者拒绝（CF5-N）

- **WHEN** 非组织者成员确认
- **THEN** 响应 `403 NOT_SPLIT_ORGANIZER`

#### Scenario: 无活跃草稿时确认拒绝（CF6-N）

- **WHEN** 该轮无草稿或处于终态
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`（或 `404`，按既有顺序）

#### Scenario: 确认屏幕展示契约（Screen 15）

- **WHEN** 组织者打开复核页
- **THEN** 页面显示轮次、边界时间窗、分组、每条路线分解与状态；A 组按编辑后的 `steps` 展示
- **AND** 失败明细来自 `error.details`；终态只读；返回目标为该轮预览页

#### Scenario: 第 2 轮组织者确认（R2-CF1）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `active` 且完整、时间窗可行、预算聚合通过
- **WHEN** 组织者携带第 2 轮 `draftVersion` 确认
- **THEN** 响应 `200`，第 2 轮 `status = confirmed`
- **AND** 第 1 轮状态、版本、路线、分组逐字不变

#### Scenario: 第 1 轮未确认时第 2 轮确认拒绝（R2-CF2-N）

- **GIVEN** 第 1 轮不是 `confirmed`
- **WHEN** 组织者确认第 2 轮
- **THEN** 响应 `409 SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`
- **AND** 第 2 轮仍为 `active`

#### Scenario: 第 2 轮预算聚合硬超支拒绝（R2-CF3-N）

- **GIVEN** 第 1 轮已确认，第 2 轮新增活动使某成员两轮总额超过硬预算
- **WHEN** 组织者确认第 2 轮
- **THEN** 响应 `409`，按既有硬预算错误返回超支成员明细
- **AND** 第 2 轮仍为 `active`，第 1 轮不变

#### Scenario: 确认只冻结本轮（R2-CF4）

- **GIVEN** 第 1 轮已确认、第 2 轮完整
- **WHEN** 组织者确认第 2 轮
- **THEN** 第 2 轮边界/路线/分组编辑均被 `SPLIT_DRAFT_NOT_ACTIVE` 拒绝
- **AND** 第 1 轮的只读状态不受影响

### Requirement: Split draft cancellation

系统 SHALL 提供按轮取消：旧 `POST /api/trips/{tripId}/split-draft:cancel` 固定第 1 轮；新 `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel` 用于任意轮，仅允许该轮发起人取消该轮活跃草稿。成功 SHALL 在单一事务内将该轮 `status` 置 `cancelled`、清空该轮 `document.routes`（版本不变）并删除该轮 `split-r{n}-a/b` 的 `plan_node` 行；`main` 与其他轮节点逐行不变。版本不符 SHALL 以 stale 拒绝；已确认轮不可通过此端点取消（使用 `:cancel-confirmed`）。取消后 SHALL 允许替换：`POST split-draft`（第 1 轮）或 `POST split-draft/rounds`（第 2 轮）在同一 `round_index` 行重建（`draftVersion = 1`、`status = active`、边界与路线为空）。取消 SHALL NOT 改变 `draftVersion`。

已确认轮的取消由 `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel-confirmed`（旧 `/split:cancel` 固定第 1 轮）提供：仅组织者、该轮 `confirmed`、不存在非 cancelled 的后续轮、且该轮分头站 `start_at` 未到；否则分别返回 `SPLIT_LATER_ROUNDS_EXIST` / `SPLIT_ALREADY_DEPARTED`。成功只删除该轮 `split-r{n}-a/b` 行，版本不变。

#### Scenario: 发起人取消并允许替换（CN1）

- **GIVEN** Ben 发起第 1 轮并完成边界与路线生成（版本 3）
- **WHEN** Ben 携带 `draftVersion: 3` 调用取消
- **THEN** 响应 `200`，`data.status = cancelled`，`data.routes = []`
- **AND** `branch_id = 'main'` 行逐行不变，`split-r1-a/b` 行数为 0
- **AND** 随后读取第 1 轮仍返回 `status = cancelled` 且 `routes = []`
- **AND** 随后 Alice 调用 `POST .../split-draft` 返回 `201`，新草稿 `round_index = 1`、`initiatorMemberId = 1`、`draftVersion = 1`、`status = active`

#### Scenario: 已确认草稿不可取消（CN2-N）

- **GIVEN** 第 1 轮已确认
- **WHEN** 发起人调用 `:cancel`
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 已确认文档与既有路线行不变

#### Scenario: 非发起人拒绝（CN3-N）

- **GIVEN** 第 1 轮由 Ben 发起，Chloe 是同一行程成员
- **WHEN** Chloe 取消 Ben 的草稿
- **THEN** 响应 `403 NOT_SPLIT_INITIATOR`
- **AND** 草稿仍为 `active`

#### Scenario: 无活跃草稿时取消拒绝（CN4-N）

- **GIVEN** 该轮从未发起草稿
- **WHEN** 成员调用取消
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无状态变化

#### Scenario: 取消的版本过期拒绝（CN6-N）

- **GIVEN** 第 2 轮被取消后已由 Alice 重建为新草稿（`draftVersion = 1`、`status = active`）
- **WHEN** Alice 携带重建前的旧版本号调用取消
- **THEN** 响应 `409 STALE_DRAFT_VERSION`
- **AND** 新草稿仍为 `active`

#### Scenario: 取消的守卫顺序（CN5-N）

- **GIVEN** 请求分别缺失或携带未知身份、已知身份的未知行程、Eve 的身份
- **WHEN** 取消请求到达
- **THEN** 分别响应 `401 MEMBER_REQUIRED`、`404 TRIP_NOT_FOUND`、`403 NOT_A_MEMBER`
- **AND** 无状态变化

#### Scenario: 取消与替换的屏幕契约（Screen 15 cancel）

- **GIVEN** 查看者为该行程成员，且该轮为 `active` 或 `confirmed`
- **WHEN** 发起人在复核屏幕使用取消动作
- **THEN** 页面显示二次确认提示，成功后提示草稿已取消并可重新发起
- **AND** 非发起人未见取消动作；已确认轮的取消动作按组织者/后续轮/出发时间规则显示
- **AND** loading / error 态可观察；前端不自行改变草稿状态

#### Scenario: 取消第 2 轮活跃草稿（R2-CN1）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active`
- **WHEN** 第 2 轮发起人取消第 2 轮
- **THEN** 响应 `200`，第 2 轮 `status = cancelled`、`routes = []`、`split-r2-a/b` 行数为 0
- **AND** 第 1 轮文档、状态、`plan_node` 不变

#### Scenario: 取消第 2 轮已确认分队只删本轮（R2-CN2）

- **GIVEN** 第 1、2 轮均 `confirmed`，第 2 轮尚未出发
- **WHEN** 组织者调用 `:cancel-confirmed` 取消第 2 轮
- **THEN** 响应 `200`，只删除 `split-r2-a/b`；第 1 轮行不变
- **AND** 第 2 轮 `draftVersion` 不变

#### Scenario: 存在第 2 轮时取消第 1 轮拒绝（R2-CN3-N）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `active` 或 `confirmed`
- **WHEN** 组织者调用 `:cancel-confirmed` 取消第 1 轮
- **THEN** 响应 `409 SPLIT_LATER_ROUNDS_EXIST`
- **AND** 两轮均不变

#### Scenario: 第 2 轮取消后第 1 轮可取消（R2-CN4）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `cancelled`，第 1 轮未出发
- **WHEN** 组织者取消第 1 轮
- **THEN** 响应 `200`，第 1 轮 `status = cancelled`
- **AND** 第 2 轮 cancelled 行保留

#### Scenario: 取消不改变版本（R2-CN5）

- **GIVEN** 某活跃轮 `draftVersion = N`
- **WHEN** 发起人取消该轮
- **THEN** `split_draft.draft_version` 仍为 `N`
- **AND** `updated_at` 刷新

### Requirement: Member group assignment

系统 SHALL 提供按轮改组：旧 `PUT /api/trips/{tripId}/split-draft/assignment` 固定第 1 轮；新 `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/assignment`（认证会话，body 含可选 `memberId`、`groupLabel` 与 `draftVersion`）用于任意轮，允许任意行程成员把**任意行程成员**在该轮 `groups` 中移到 A 或 B。`memberId` 缺省为调用者；目标成员 SHALL 属于本行程（否则 `403 NOT_A_MEMBER`）。服务端 SHALL 依序校验成员资格、该轮活跃、版本一致、组别合法、目标成员归属。目标成员已在该组时 SHALL 按现有幂等语义返回 `200`，不写库、不增版本；否则成功后 SHALL 以版本条件更新该轮文档并令该轮 `draftVersion + 1`，原样保留该轮边界与已生成路线；其他轮逐字不变。`confirmed` / `cancelled` 轮 SHALL 以 `SPLIT_DRAFT_NOT_ACTIVE` 拒绝。第 2 轮创建时 `groups` SHALL 复制第 1 轮已确认分组，之后按本要求改组。

#### Scenario: 成员把自己切到另一组（A1）

- **GIVEN** 第 1 轮活跃版本 1，`groups = {"A": [Alice, Ben, Chloe, Daniel], "B": []}`
- **WHEN** Chloe 携带 `{"groupLabel": "B", "draftVersion": 1}` 调用
- **THEN** 响应 `200`，`groups.A` 不含 Chloe、`groups.B` 恰含 Chloe，`draftVersion = 2`
- **AND** 未保存的边界仍为空、`routes` 仍为空

#### Scenario: 同一成员往返切换（A2）

- **GIVEN** A1 之后 Chloe 位于 B 组、版本 2
- **WHEN** Chloe 携带 `{"groupLabel": "A", "draftVersion": 2}` 再次调用
- **THEN** 响应 `200`，Chloe 只出现在 A 组，`draftVersion = 3`

#### Scenario: 提交自己当前所在组（A3）

- **GIVEN** 成员已位于 A 组，携带当前 `draftVersion`
- **WHEN** 请求 `groupLabel = "A"`
- **THEN** 响应 `200` 且 `groups` 内容不变，`draftVersion` 不变（幂等，不写库）
- **AND** 响应 SHALL 返回最新 `draftVersion`，前端以响应值为唯一来源

#### Scenario: 改组保留已生成路线与边界（A4）

- **GIVEN** 第 1 轮活跃版本 3（边界已保存、路线已生成）
- **WHEN** 成员切到另一组并携带 `draftVersion: 3`
- **THEN** 响应 `200` 且 `draftVersion = 4`
- **AND** 边界、路线、发起人、主线版本、状态逐字不变
- **AND** 该轮 `split-r1-a/b` 行不被删除或重写

#### Scenario: 已确认或已取消草稿不可改组（A5-N）

- **GIVEN** 该轮 `status = confirmed` 或 `cancelled`
- **WHEN** 任一成员调用 assignment
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** `groups`、`routes`、`status`、`draftVersion` 均不变

#### Scenario: 版本过期拒绝（A6-N）

- **GIVEN** 该轮已推进到版本 4
- **WHEN** 请求携带 `draftVersion: 2`
- **THEN** 响应 `409 STALE_DRAFT_VERSION`
- **AND** `groups` 与版本不变

#### Scenario: 守卫顺序（A7-N）

- **GIVEN** 请求分别缺失/未知身份、未知行程、Eve 的身份
- **WHEN** assignment 请求到达
- **THEN** 分别响应 `401 MEMBER_REQUIRED`、`404 TRIP_NOT_FOUND`、`403 NOT_A_MEMBER`
- **AND** 无状态变化

#### Scenario: 非法组别拒绝（A8-N）

- **GIVEN** 请求 `groupLabel` 不是 `A` 或 `B`
- **WHEN** assignment 到达
- **THEN** 响应 `400 INVALID_GROUP_LABEL`
- **AND** 无持久化

#### Scenario: 任意成员可移动其他成员（A9）

- **GIVEN** 第 1 轮活跃版本 1，Ben 与 Chloe 都在 A 组
- **WHEN** Ben 携带 `{"memberId": <Chloe>, "groupLabel": "B", "draftVersion": 1}` 调用
- **THEN** 响应 `200`，`groups.B` 恰含 Chloe、`groups.A` 不含 Chloe，`draftVersion = 2`
- **AND** Ben 自己的分组不变

#### Scenario: 目标成员不属于本行程拒绝（A9b-N）

- **GIVEN** Eve 不是该行程成员
- **WHEN** Ben 携带 `{"memberId": <Eve>, "groupLabel": "B", "draftVersion": <当前版本>}` 调用
- **THEN** 响应 `403 NOT_A_MEMBER`
- **AND** `groups` 与版本不变

#### Scenario: 分组卡展示与切组契约（Screen 13）

- **GIVEN** 查看者为该行程成员，该轮为 `active`
- **WHEN** 打开「分组与路线」屏幕
- **THEN** 分组卡把成员渲染为头像 chip，点击 chip 在 A/B 间移动
- **AND** 改组成功后提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」
- **AND** 任一组为空时提示「至少一人加入另一组后才能生成路线与确认」
- **AND** `confirmed`/`cancelled` 不显示切组控件；判定归后端

#### Scenario: 第 2 轮改组不影响第 1 轮（R2-A1）

- **GIVEN** 第 1 轮 `confirmed`，第 2 轮 `active`，两轮分组相同
- **WHEN** 第 2 轮把 Chloe 从 A 移到 B
- **THEN** 第 2 轮 `groups` 更新且版本 +1
- **AND** 第 1 轮 `groups`、`status`、`plan_node` 逐字不变

#### Scenario: 第 2 轮初始分组复制第 1 轮（R2-A2）

- **GIVEN** 第 1 轮 `confirmed`，`groups = {A:[Alice,Ben], B:[Chloe,Daniel]}`
- **WHEN** 发起第 2 轮
- **THEN** 第 2 轮初始 `groups` 与第 1 轮完全一致
- **AND** 不是「全员 A、B 为空」

#### Scenario: 第 2 轮改组保留本轮路线（R2-A3）

- **GIVEN** 第 2 轮已生成路线，版本 3
- **WHEN** 成员在第 2 轮改组
- **THEN** 第 2 轮版本 +1，边界与路线原样保留
- **AND** 页面提示需重新生成路线

#### Scenario: 已确认第 1 轮不可改组（R2-A4-N）

- **GIVEN** 第 1 轮 `confirmed`
- **WHEN** 成员尝试第 1 轮 assignment
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 第 2 轮不受影响

### Requirement: Split route pair edit

系统 SHALL 提供按轮整对保存路线：旧 `PUT /api/trips/{tripId}/split-draft/routes` 固定第 1 轮；新 `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes` 用于任意轮。仅该轮 `active`、任意行程成员。A/B 均为有序站点列表（站名+停留分钟）；A 每站后一段路程（legs=站点数），B 含去程/回程（legs=站点数+1）。服务端派生 activity=停留之和、buffer=0、活动名=首末站拼接、地点=首站名，并写入该轮 `routes.steps`。SHALL 单事务更新该轮 `split-r{n}-a/b` 的 `plan_node.title`/`location_name` 与该轮 `routes` 并令该轮 `draftVersion+1`，失败回滚；不得修改其他轮、groups、边界或 main。错误码与成功形状由场景约束；生成仍仅该轮发起人。

#### Scenario: 任意成员保存整对路线（S2）

- **GIVEN** 第 1 轮已生成 A/B 两条路线，成员 Ben（非发起人）打开第 2 步
- **WHEN** Ben 提交 `draftVersion`、A/B 站点列表与各自路程分钟
- **THEN** 响应 `200`，`data.draftVersion` 比提交值大 1，`data.routes` 返回更新后的两条 `GroupRoute`
- **AND** 两组活动名 = 首末站拼接、地点 = 首站名，`activityMinutes` = 停留之和，`bufferMinutes` = 0
- **AND** A 组路段数 = 站点数，B 组路段数 = 站点数 + 1
- **AND** `plan_node` 的 `split-r1-a/b` `title`/`location_name` 与文档 `routes`、`updated_at` 同一事务更新
- **AND** groups、边界、main 与 status 不变

#### Scenario: A 组站点编辑派生合计（S2b）

- **GIVEN** A 组原 `steps` = City Hall MRT(30) / National Gallery(30) / Gardens by the Bay(15)，legs = [30,30,15]
- **WHEN** 成员把 National Gallery 停留改为 20 分钟并保存
- **THEN** A 组 `activityMinutes = 65`、`travelLegsMinutes` 保持 3 段、`bufferMinutes = 0`
- **AND** 保存响应与后续读取一致，前端不自行改写派生值

#### Scenario: 过期版本拒绝且不部分写入（S3）

- **GIVEN** 该轮当前版本为 4
- **WHEN** 请求携带 `draftVersion: 3`
- **THEN** 响应 `409 STALE_DRAFT_VERSION`
- **AND** 该轮 plan_node 与文档 routes 均保持原值

#### Scenario: 尚未生成路线时拒绝保存（S4）

- **GIVEN** 该轮已保存边界但 `routes` 为空
- **WHEN** 成员提交路线编辑
- **THEN** 响应 `409 SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 含 `routes.A` 与 `routes.B`
- **AND** 无任何写入

#### Scenario: 非法输入拒绝（S5）

- **WHEN** 路线数不为 2、组别重复/非 A/B、站名为空、分钟为负/非整数、A 组路段数≠站点数、或 B 组路段数≠站点数+1
- **THEN** 响应 `400`，按事实返回 `INVALID_ROUTE_PAIR`、`INVALID_GROUP_LABEL` 或 `INVALID_ROUTE_INPUT`
- **AND** plan_node 与文档 routes 均无写入

#### Scenario: 终态草稿拒绝保存（S6）

- **GIVEN** 该轮状态为 `confirmed` 或 `cancelled`
- **WHEN** 成员提交路线编辑
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 终态数据不变

#### Scenario: 非成员或未登录拒绝保存（S8）

- **WHEN** Eve（非成员）或未认证会话调用保存
- **THEN** 分别响应 `403 NOT_A_MEMBER` 或 `401 MEMBER_REQUIRED`
- **AND** 不返回该轮或路线私有值

#### Scenario: 第 2 轮保存路线只写本轮（R2-S2）

- **GIVEN** 第 1 轮 `confirmed`、第 2 轮 `active` 且已生成路线
- **WHEN** 成员保存第 2 轮路线
- **THEN** 只更新第 2 轮文档与 `split-r2-a/b`
- **AND** 第 1 轮 `split-r1-a/b`、文档、版本、状态不变

#### Scenario: 第 2 轮保存不覆盖第 1 轮（R2-S3-N）

- **GIVEN** 第 1 轮 `split-r1-a/b` 存在
- **WHEN** 第 2 轮保存路线失败（非法输入/过期版本）
- **THEN** 第 2 轮与第 1 轮均无部分写入
- **AND** 两个轮次的 `draftVersion` 均不变

#### Scenario: 第 2 轮终态只读（R2-S6）

- **GIVEN** 第 2 轮 `confirmed`
- **WHEN** 成员提交第 2 轮路线编辑
- **THEN** 响应 `409 SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 第 2 轮数据不变
