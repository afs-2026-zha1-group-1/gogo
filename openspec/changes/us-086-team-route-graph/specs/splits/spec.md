# Spec Delta

## MODIFIED Requirements

### Requirement: Split draft start

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft`（认证会话），允许任意行程成员从已确认主线发起该行程唯一的拆分草稿。系统 SHALL 依序校验成员资格、主线确认前置、活跃唯一性，并以条件写入在 `split_draft` 表创建 JSON 文档（`initiatorMemberId`、`mainPlanVersion`、`draftVersion = 1`、`status = active`、可空边界字段、`groups`、`createdAt`、`updatedAt`）；每 trip 至多一行（`trip_id` UNIQUE），撞车即冲突。当且仅当已存在行的文档 `status = cancelled` 时，系统 SHALL 在该行重建草稿：以调用者为新发起人、`draftVersion` 重置为 1、`status = active`、边界与路线清空；`active` 或 `confirmed` 行 SHALL 返回冲突。系统 SHALL 通过既有 V4 Flyway 迁移提供 `split_draft` 与 `plan_node` 两表，且落地 SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on）。系统 SHALL 在 Screen 11 以只读路线图展示已确认主线、已保存的分头/会合边界与已生成的 A/B 路线；节点仅展示时间、名称、分组与时长，不提供节点详情弹层。

#### Scenario: V2 迁移与自包含种子（REQ-004 In scope / OQ-1）

- **WHEN** 后端在已应用 V1–V3 的库上启动
- **THEN** 迁移创建 `split_draft`（`id`、`trip_id` UNIQUE、`document`、`draft_version`、`created_at`、`updated_at`）与 `plan_node` 两表，不新增第三表、不改 `trip` 列（迁移编号纠偏：实际为 **V4**，非 V2）
- **AND** V2/V3 既有种子（`app_user` 1–5、Singapore Friends Day 行程、四名成员、`main_plan_confirmed` 标志）不受影响
- **AND** 迁移写入主线 v1 的 City Hall MRT（01:00:00Z–01:30:00Z）与 Merlion Park（03:30:00Z–04:00:00Z）两条 `branch_id = 'main'` stop，以及一条 `optional` stop

#### Scenario: 成员发起唯一草稿（S1）

- **WHEN** 主线 v1 已确认且无活跃草稿，成员 Ben 携带有效 `X-User-Id` 发起
- **THEN** 响应 `201`，`data` 含 initiatorMemberId = Ben、mainPlanVersion = 1、draftVersion = 1、status = active
- **AND** 库中该行程恰有一份草稿行

#### Scenario: 并发发起至多一个活跃草稿（S2）

- **WHEN** Alice 与 Ben 同时对同一行程发起
- **THEN** 至多一个请求成功（`201`），另一请求 `409` 且 `error.code = SPLIT_DRAFT_CONFLICT`
- **AND** 库中该行程草稿行数 = 1

#### Scenario: 主线未确认拒绝（S3-N）

- **WHEN** `trip.main_plan_confirmed` 为 0 时成员发起
- **THEN** 响应 `409` 且 `error.code = MAIN_PLAN_NOT_CONFIRMED`
- **AND** 不创建草稿

#### Scenario: 非成员拒绝（S4-N）

- **WHEN** Eve（非本行程成员）携带其 `X-User-Id` 发起
- **THEN** 响应 `403` 且 `error.code = NOT_A_MEMBER`
- **AND** 不创建草稿，响应不含行程私有数据

#### Scenario: 缺失或未知身份拒绝（S5-N）

- **WHEN** 请求无认证会话，或会话账号不在 `app_user` 中
- **THEN** 响应 `401` 且 `error.code = MEMBER_REQUIRED`
- **AND** 不创建草稿

#### Scenario: 未知行程拒绝（S6-N）

- **WHEN** 对不存在的 tripId 发起
- **THEN** 响应 `404` 且 `error.code = TRIP_NOT_FOUND`

#### Scenario: 重复发起拒绝（S7）

- **WHEN** 已存在 `active` 或 `confirmed` 草稿时再次发起
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_CONFLICT`
- **AND** 原草稿文档不变

#### Scenario: 取消后同一行重建（S8）

- **GIVEN** 该行程已存在 `status = cancelled` 的草稿行，主线仍为已确认
- **WHEN** 成员 Alice 携带有效 `X-User-Id` 发起
- **THEN** 响应 `201`，改写同一行的文档：`initiatorMemberId = Alice`、`mainPlanVersion = 1`（本期恒为主线 v1；多版本重建延后 R2）、`draftVersion = 1`、`status = active`、边界与路线为空
- **AND** `split_draft` 行数仍为 1（未新增行、未新增迁移），`split_draft.draft_version` 列为 1

#### Scenario: 发起屏幕展示契约（Screen 11）

- **GIVEN** 行程成员打开该行程的拆分入口页，且主线已确认
- **WHEN** 页面渲染
- **THEN** appbar 标题为「队伍路线」，右上角为唯一的分队动作，页面不出现「智能分队」标题与底部发起按钮
- **AND** 页面以只读、按时间排序的路线图展示已确认主线；存在草稿时展示已保存的分头/会合边界与已生成的 A/B 路线
- **AND** 节点仅展示时间、名称、分组与时长；点击节点不打开详情弹层，不展示逐节点任务、费用或地点
- **AND** loading、无已确认主线、无权限、行程缺失与读取失败状态均可观察，且不泄露其他行程数据

#### Scenario: 无草稿或已取消只显示主线

- **GIVEN** 该行程无草稿，或最近的草稿已 `cancelled`
- **WHEN** 页面渲染
- **THEN** 仅按时间顺序展示已确认主线节点
- **AND** 显示可发起分队的提示；不得虚构 Route A 或 Route B

#### Scenario: 活跃草稿的边界与路线状态

- **GIVEN** 草稿为 `active`
- **WHEN** 尚未保存分头/会合边界
- **THEN** 仅展示主线与「待选择分头/会合边界」提示，不展示分头/会合节点或 A/B 轨道
- **WHEN** 边界已保存但路线尚未生成
- **THEN** 展示分头节点、会合节点与主线暂停段，A/B 轨道显示「路线待生成」，不编造活动
- **WHEN** 两条路线已生成
- **THEN** Route A 在右、Route B 在左，分支节点由现有 `GroupRoute` 字段派生为「活动 → 路程（travel legs 求和）→ 缓冲」；空时长显示为「待补全」而非 0
- **AND** 主线节点文字左右交替，Route B 文字靠左、Route A 文字靠右

#### Scenario: 状态分支的右上动作

- **GIVEN** 成员触发右上角分队动作
- **WHEN** 草稿不存在或为 `cancelled`
- **THEN** 客户端先发起（或替换）草稿，再进入边界步骤
- **WHEN** 草稿为 `active`
- **THEN** 客户端进入边界步骤
- **WHEN** 草稿为 `confirmed`
- **THEN** 客户端进入只读复核页，且不出现发起入口
- **AND** 客户端不得自行判定唯一性或确认资格；判定归后端
