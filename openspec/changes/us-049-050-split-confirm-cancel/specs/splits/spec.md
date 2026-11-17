# Spec Delta

## Purpose

能力 `splits`（B 拆分主链）：主线确认后，成员发起唯一拆分草稿 → 发起人成对选择拆分边界 → 按分组偏好成对生成路线 → 任意成员校验会合时间窗口 → 组织者成对确认（冻结为唯一拆分方案）或发起人取消草稿（放弃提案并允许替换）。硬约束 =「两组都能按时会合」：草稿唯一且版本可控、路线成对原子、校验覆盖每条路线全部交通段与 buffer，不可行或输入缺失拦住整对确认。

链级约定（各 requirement 共用，2026-11-16 纠偏后与 main 代码一致）：

- 身份 = `app_user.id`，请求头 `X-User-Id` 携带；MVP 按给定值信任，不校验签名（DR-05，不得描述为安全控制）。
- All endpoints SHALL validate identity, then trip existence, then membership: missing or globally unknown id returns `401 MEMBER_REQUIRED`; a known id with an unknown trip returns `404 TRIP_NOT_FOUND`; a known member of another trip returns `403 NOT_A_MEMBER`. Rejections return `data = null` and no private trip, draft or route values. Only authorized calls reach calculation.
- 响应统一 `{data,error}` 包封套；`error.code` 为稳定机器可读契约，`error.message` 为实现文本非契约；成功时 `error = null`。需要明细的拒绝 SHALL 在 `error.details` 携带对象（本期仅 `SPLIT_TIMING_INFEASIBLE` 与 `SPLIT_DRAFT_INCOMPLETE` 使用）；`details` 缺失不影响 `code` 的判定。
- 拆分草稿 = `split_draft` 表一行（`trip_id` UNIQUE），业务字段存 `document` JSON 列；主线与拆分路线结构存 `plan_node`（`branch_id` = `main` / `split-a` / `split-b`）。不新增表、不新增迁移（V4 为既有迁移）。
- 时间一律 TEXT（ISO-8601 UTC）；窗口与时长粒度 = 分钟（整数）。
- 「主线已确认」谓词 = `trip.main_plan_confirmed`（V3 列，0/1）。
- `draftVersion` 从 1 起，任何草稿变更（边界重选/路线重生成/取消后重建）+1；写操作携带版本条件更新，不符即 stale 拒绝。确认与取消 SHALL NOT 改变 `draftVersion`。
- 草稿状态机：`active`（可编辑/可确认/可取消）→ `confirmed`（冻结）／`cancelled`（终止，可被替换重建）；`confirmed → *` 禁止。

## ADDED Requirements

### Requirement: Split confirmation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:confirm`（`X-User-Id` 头，body 含 `draftVersion`），仅允许行程组织者确认当前活跃草稿。校验顺序 = 成员资格 → 组织者 → 活跃草稿 → 版本一致 → 草稿完整性（边界已存且两条路线齐备），随后从草稿文档复算两条路线的时长与窗口；客户端声明不参与判定。拒绝时不改变 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE` 或 `SPLIT_TIMING_INFEASIBLE`。成功 SHALL 在单一事务内将 `status` 置 `confirmed`（版本不变），路线对、分组与边界成对生效并锁定编辑（写端点 `409 SPLIT_DRAFT_NOT_ACTIVE`），响应返回草稿详情投影。

#### Scenario: 组织者确认成功并锁定（CF1）

- **GIVEN** 活跃草稿为版本 3（发起 1 → 保存边界 2 → 生成路线 3），两组齐全互斥，边界已保存，路线对 A = 15+60+20+10 = 105、B = 20+60+20+10 = 110（窗口 120）
- **WHEN** 组织者 Alice（`X-User-Id: 1`）携带 `draftVersion: 3` 调用确认
- **THEN** 响应 `200`，`data.status = confirmed`，`data.draftVersion = 3`
- **AND** 再次读取草稿详情返回同一 `status = confirmed`
- **AND** 之后的 `PUT .../boundaries` 与 `POST .../routes:generate` 均返回 `409 SPLIT_DRAFT_NOT_ACTIVE`

#### Scenario: 超窗拦住整对确认（CF2-N）

- **GIVEN** 客户端声明可确认，但 A 路线末段交通为 40 分钟（A = 125），窗口 120
- **WHEN** 组织者调用确认
- **THEN** 响应 `409` 且 `error.code = SPLIT_TIMING_INFEASIBLE`
- **AND** `error.details.routes` 为长度 2 的数组，每项 `{groupLabel, totalMinutes, overrunMinutes, missingInputs}`：A 项 `totalMinutes = 125`、`overrunMinutes = 5`、`missingInputs = []`；B 项 `totalMinutes = 110`、`overrunMinutes = 0`
- **AND** 草稿仍为 `active`，`draftVersion` 不变
- **AND** 服务端判定不读取客户端声明

#### Scenario: 缺输入不得判为可确认（CF3-N）

- **GIVEN** A 路线的活动时长或末段交通估算缺失
- **WHEN** 组织者调用确认
- **THEN** 响应 `409` 且 `error.code = SPLIT_TIMING_INFEASIBLE`
- **AND** `error.details.routes` 中 A 项的 `missingInputs` 非空（以字段名标识，如 `activityMinutes` / `travelLegsMinutes[1]` / `bufferMinutes`），B 项 `missingInputs = []`
- **AND** 草稿仍为 `active`

#### Scenario: 草稿不完整无确认（CF7-N）

- **GIVEN** 活跃草稿版本 3，边界已保存但路线未生成（`routes = null`）；或边界只保存一侧（半边界）
- **WHEN** 组织者调用确认
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 列出缺失项（`boundaries` / `routes` / 某一组路线）
- **AND** 草稿仍为 `active`，`draftVersion` 不变；不进入时间复算

#### Scenario: 版本过期拒绝（CF4-N）

- **GIVEN** 活跃草稿已推进到版本 3
- **WHEN** 确认请求携带 `draftVersion: 1`
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** 草稿状态与版本不变

#### Scenario: 非组织者拒绝（CF5-N）

- **GIVEN** Ben（`X-User-Id: 2`）是本行程成员但不是组织者（组织者 = Alice 1）
- **WHEN** Ben 调用确认
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_ORGANIZER`
- **AND** 草稿状态与版本不变

#### Scenario: 无活跃草稿时确认拒绝（CF6-N）

- **GIVEN** 该行程从未发起草稿，或草稿已 `confirmed`，或草稿已 `cancelled`
- **WHEN** 成员调用确认
- **THEN** 三情形均响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无任何状态变化

#### Scenario: 确认屏幕展示契约（Screen 15）

- **GIVEN** 行程存在一份活跃草稿（已存边界与成对路线）
- **WHEN** 成员打开拆分复核与确认屏幕
- **THEN** 页面呈现两条路线卡（组标签、分组、活动/交通/buffer 分解、合计与窗口对比）、边界与窗口、校验结论与草稿状态徽标
- **AND** 组织者可见确认按钮，非组织者只见只读视图（permission 态）
- **AND** 超窗 / 缺输入 / 不完整错误态按 `error.details` 渲染逐路线数值与缺失项，已确认终态、loading 与 empty（无草稿）态均可观察
- **AND** 前端不自行宣布可确认（判定归后端）

### Requirement: Split draft cancellation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:cancel`（`X-User-Id` 头，body 含 `draftVersion`），仅允许草稿发起人取消当前活跃草稿。成功 SHALL 在单一事务内将 `status` 置 `cancelled`、清空 `document.routes`（版本不变）并删除该行程 `split-a`/`split-b` 的 `plan_node` 行；`main` 节点逐行不变。版本不符 SHALL 以 stale 拒绝；已确认草稿不可取消。取消后 SHALL 允许替换：`POST split-draft` 以调用者为新发起人在同一行重建（`draftVersion = 1`、`status = active`、边界与路线为空，列版本同步为 1）。响应返回草稿详情投影且 `routes = []`。

#### Scenario: 发起人取消并允许替换（CN1）

- **GIVEN** Ben 发起并完成边界与路线生成的活跃草稿（版本 3）
- **WHEN** Ben（`X-User-Id: 2`）携带 `draftVersion: 3` 调用取消
- **THEN** 响应 `200`，`data.status = cancelled`，`data.routes = []`
- **AND** 该行程 `branch_id = 'main'` 的 `plan_node` 行逐行不变，`split-a`/`split-b` 行数为 0
- **AND** 随后读取草稿详情仍返回 `status = cancelled` 且 `routes = []`（不出现已删节点撑起的幽灵路线）
- **AND** 随后 Alice 调用 `POST .../split-draft` 返回 `201`，新草稿 `initiatorMemberId = 1`、`draftVersion = 1`、`status = active`、边界与路线为空（`split_draft.draft_version` 列也为 1）

#### Scenario: 已确认草稿不可取消（CN2-N）

- **GIVEN** 草稿已确认（`status = confirmed`）
- **WHEN** 发起人调用取消
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 已确认文档与既有路线行不变

#### Scenario: 非发起人拒绝（CN3-N）

- **GIVEN** 草稿由 Ben（`X-User-Id: 2`）发起，Chloe（`X-User-Id: 3`）是同一行程的成员
- **WHEN** Chloe 取消 Ben 的草稿
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 草稿仍为 `active`

#### Scenario: 无活跃草稿时取消拒绝（CN4-N）

- **GIVEN** 该行程从未发起草稿
- **WHEN** 成员调用取消
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无状态变化

#### Scenario: 取消的版本过期拒绝（CN6-N）

- **GIVEN** 草稿被取消后已由 Alice 重建为新草稿（`draftVersion = 1`，`status = active`，initiator = Alice）
- **WHEN** Alice 携带重建前的旧版本号调用取消（页面停留后的迟到提交）
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** 新草稿仍为 `active`，`initiatorMemberId` 与边界/路线不变

#### Scenario: 取消的守卫顺序（CN5-N）

- **GIVEN** 请求分别缺失或携带未知身份、携带已知身份的未知行程、携带 Eve 的身份
- **WHEN** 取消请求到达
- **THEN** 分别响应 `401 MEMBER_REQUIRED`、`404 TRIP_NOT_FOUND`、`403 NOT_A_MEMBER`，`data = null`
- **AND** 不返回草稿或路线私有值，无状态变化

#### Scenario: 取消与替换的屏幕契约（Screen 15 cancel）

- **GIVEN** 查看者为该行程成员，且草稿状态为 `active` 或 `confirmed`
- **WHEN** 发起人在复核屏幕使用取消动作
- **THEN** 页面显示二次确认提示，成功后提示草稿已取消并可重新发起
- **AND** 非发起人未见取消动作（permission 态）；已确认草稿的取消动作不可用
- **AND** loading / error 态可观察；前端不自行改变草稿状态

## MODIFIED Requirements

### Requirement: Split draft start

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft`（`X-User-Id` 头），允许任意行程成员从已确认主线发起该行程唯一的拆分草稿。系统 SHALL 依序校验成员资格、主线确认前置、活跃唯一性，并以条件写入在 `split_draft` 表创建 JSON 文档（`initiatorMemberId`、`mainPlanVersion`、`draftVersion = 1`、`status = active`、可空边界字段、`groups`、`createdAt`、`updatedAt`）；每 trip 至多一行（`trip_id` UNIQUE），撞车即冲突。当且仅当已存在行的文档 `status = cancelled` 时，系统 SHALL 在该行重建草稿：以调用者为新发起人、`draftVersion` 重置为 1、`status = active`、边界与路线清空；`active` 或 `confirmed` 行 SHALL 返回冲突。系统 SHALL 通过既有 V4 Flyway 迁移提供 `split_draft` 与 `plan_node` 两表，且落地 SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on）。

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

- **WHEN** 请求缺失 `X-User-Id` 头或其 id 在 `app_user` 中不存在
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

- **GIVEN** 成员打开拆分发起屏幕（该行程可能无草稿、有活跃草稿、或已有终态草稿）
- **WHEN** 草稿读取返回
- **THEN** 页面呈现草稿状态（initiator、mainPlanVersion、draftVersion、status）
- **AND** 动作按 `status` 分支：无草稿或 `cancelled` → 展示「发起（替换）分队草稿」并调用 `POST split-draft`；`active` → 「下一步：选择边界」；`confirmed` → 只读终态（无发起入口，但提供「查看已确认分队」入口跳转复核页）
- **AND** 冲突 / 主线未确认 / 无权限错误态与 loading / empty 态均可观察
- **AND** 前端不自行判定唯一性或确认状态（判定归后端）

### Requirement: Split boundary selection

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/boundaries`（`X-User-Id` 头，body 含 `departureStopId`、`reunionStopId`、`draftVersion`），仅允许草稿发起人成对保存出发与会合边界（不开放半边界）。`active` 之外的草稿状态 SHALL 拒绝写入。两 stop SHALL 均属已确认主线；出发时刻 = 出发 stop 的 `end_at`（scheduled end），会合时刻 = 会合 stop 的 `start_at`（scheduled start），窗口 = 会合 − 出发（分钟）且 SHALL 为正。保存 SHALL 以 draftVersion 条件更新写入草稿文档边界字段并使 draftVersion+1；任何拒绝 SHALL 不改动已保存边界与版本。草稿详情 SHALL 返回当前边界 stop、对应时刻与窗口分钟数。

#### Scenario: 正窗口成对保存（B1）

- **WHEN** 发起人 Ben 选 City Hall MRT 出发、Merlion Park 会合，携带当前 draftVersion = 1
- **THEN** 响应 `200`，保存出发 = City Hall MRT @ 09:30 本地（01:30:00Z，scheduled end）、会合 = Merlion Park @ 11:30 本地（03:30:00Z，scheduled start）、窗口 = 120 分钟
- **AND** draftVersion 递增为 2

#### Scenario: 非正窗口拒绝（B2-N）

- **WHEN** 反向选择（Merlion Park 出发 scheduled end 12:00、City Hall MRT 会合 scheduled start 09:00）
- **THEN** 响应 `400` 且 `error.code = NONPOSITIVE_SPLIT_WINDOW`
- **AND** 已保存边界不变（此前从未保存则仍为空），draftVersion 不变

#### Scenario: 主线外节点拒绝（B3-N）

- **WHEN** 任一边界选择 Singapore Zoo（不在已确认主线 stop 中）
- **THEN** 响应 `400` 且 `error.code = BOUNDARY_NOT_IN_MAIN_PLAN`
- **AND** 不创建无关会合点，已保存边界不变

#### Scenario: 非发起人拒绝（B4-N）

- **WHEN** 非发起人成员 Chloe 尝试保存边界
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 边界不变

#### Scenario: 无活跃草稿拒绝（B5-N）

- **WHEN** 无活跃草稿（或草稿已 `confirmed` / `cancelled`）时保存边界
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无持久化

#### Scenario: 过期版本拒绝（B6-N）

- **WHEN** 保存请求携带过期 draftVersion
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** 当前边界与版本不变

#### Scenario: 边界选择屏幕展示契约（Screen 12）

- **WHEN** 发起人打开边界选择屏幕
- **THEN** 出发/会合选择器选项仅来自主线 stop，呈现 stop 名 + 时刻 + 窗口分钟数
- **AND** 非正窗口 / 主线外错误态与 loading / empty / permission 态均可观察
- **AND** 前端不自行计算合法性后直接落库（判定归后端）

### Requirement: Group route generation

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate` with `draftVersion` for the initiator after boundaries are saved and while the draft is `active`. It SHALL atomically replace both group routes using fixed in-process candidates, preserve main-plan rows, increment the version on success, roll back on failure, and reject stale results without overwriting newer state. Complete, disjoint A/B groups are a fixture-guaranteed defensive precondition in this slice. A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`.

#### Scenario: 成对生成（G1）

- **WHEN** 草稿含 A 组（Alice+Ben）、B 组（Chloe+Daniel），边界 City Hall MRT 09:30 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存：A 访问 National Gallery Singapore、B 访问 Gardens by the Bay，两条均起于 City Hall MRT、终于 Merlion Park
- **AND** 时长分解 = 活动 60 分钟、交通 A: 15/20 与 B: 20/20 分钟、buffer 各 10 分钟
- **AND** draftVersion 递增
- **AND** candidates come from replaceable `BranchCandidateProvider`, with a fixed in-process fixture implementation and no external network call
- **AND** routes use existing `plan_node` rows with `branch_id = split-a/split-b`, associated by trip id without new columns; structured duration JSON contains `activityMinutes`, `travelLegsMinutes[]` and `bufferMinutes`
- **AND** replacement deletes the old pair and inserts the new pair in one transaction, preserving main-plan rows

#### Scenario: 半对失败整对回滚（G2-N）

- **WHEN** 夹具构造提供者对 B 组抛错（A 组成功）
- **THEN** 错误响应 `error.code = ROUTE_GENERATION_FAILED`
- **AND** 库中无该草稿的任何新路线（无可确认半成品对），draftVersion 不变
- **AND** any previously saved pair and all main-plan rows remain unchanged

#### Scenario: 过期结果拒绝（G3-N）

- **WHEN** generation starts at current draftVersion N after boundary selection, and a concurrent boundary re-selection advances the draft to N+1 before results return
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** the result for N is discarded and state at N+1 is not overwritten

#### Scenario: 无边界拒绝（G4-N）

- **WHEN** 边界未保存时触发生成
- **THEN** 响应 `409` 且 `error.code = SPLIT_BOUNDARIES_REQUIRED`
- **AND** 无路线落库

#### Scenario: 非发起人拒绝（G5-N）

- **WHEN** 非发起人成员 Chloe 触发生成
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 无路线落库

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **WHEN** 发起人打开分组路线屏幕并触发生成
- **THEN** 页面呈现成对路线（组标签、活动名、起终点、时长/交通/buffer 分解）
- **AND** 失败 / 过期错误态与 loading / empty / permission 态均可观察
- **AND** 分组移动控件本期不实现（可选 UI，后端分组变更→版本递增语义仍成立）

### Requirement: Reunion timing check

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:check-timing` for trip members. The entry guard MAY read identity, trip and membership data. The calculator SHALL use only the supplied window and two-route snapshot, with no repository access or persistence. It SHALL report totals, overruns and missing inputs; return 200 with pair `feasible=false` for overruns or missing inputs; and reject an empty snapshot or route count other than two with 400 `INVALID_ROUTE_PAIR`. The confirmation endpoint SHALL reuse the same calculation domain over the saved draft document rather than this endpoint's response.

#### Scenario: 双双通过（T1）

- **WHEN** 成员携带快照：窗口 120 分钟，A = 15+60+20+10、B = 20+60+20+10（buffer 各 10）
- **THEN** 响应 `200`，A totalMinutes = 105、B totalMinutes = 110，均 ≤ 120
- **AND** 整对 feasible = true
- **AND** after the entry guard checks identity, trip existence and membership, the calculator performs no database reads or writes and no result is persisted
- **AND** input contains `windowMinutes` and two `routes` with `groupLabel`, `activityMinutes`, `travelLegsMinutes[]` and `bufferMinutes`; each total is activity duration plus every travel leg plus buffer

#### Scenario: 超窗拦住整对（T2-N）

- **WHEN** A 的最后一段交通改为 40 分钟（其余不变）
- **THEN** 响应 `200`，A totalMinutes = 125、overrunMinutes = 5
- **AND** 整对 feasible = false（拦住整对确认）；B 仍单独显示 110 通过

#### Scenario: 缺输入不得判为可行（T3-N）

- **WHEN** A 的活动时长或末段交通估算缺失
- **THEN** 响应 `200`，A missingInputs 逐项列出缺失项
- **AND** 整对 feasible = false，不得显示为通过

#### Scenario: 非成员拒绝（T4-N）

- **WHEN** Eve（非本行程成员）发起校验
- **THEN** 响应 `403` 且 `error.code = NOT_A_MEMBER`
- **AND** 不返回路线数据

#### Scenario: 非法快照拒绝（T5-N）

- **WHEN** 快照为空或路线数不为 2
- **THEN** 响应 `400` 且 `error.code = INVALID_ROUTE_PAIR`
- **AND** 不产生结论

#### Scenario: Timing identity and trip guards precede calculation (T6-N)

- **WHEN** the timing endpoint receives a missing or globally unknown user id, a known member with an unknown trip, or known outsider Eve for the fixture trip
- **THEN** the respective response is `401 MEMBER_REQUIRED`, `404 TRIP_NOT_FOUND` or `403 NOT_A_MEMBER`, with `data = null`
- **AND** the calculator is not invoked and no snapshot or route values are returned

#### Scenario: 窗口校验屏幕展示契约（Screen 14）

- **WHEN** 成员打开窗口校验屏幕并触发校验
- **THEN** 页面呈现两条路线的活动/交通/buffer 分解与 totalMinutes
- **AND** 通过态、超窗态（显示超出分钟数）、缺输入态（列出缺失项）三态可观察
- **AND** loading / empty / permission 态可观察；前端不自行宣布可行

### Requirement: Split draft detail read

The system SHALL expose member-only `GET /api/trips/{tripId}/split-draft` using the shared identity guards (`X-User-Id`) and `{data,error}` envelope. It SHALL return a consistent saved draft snapshot with versions, status, groups, selectable main-plan stops, boundaries, window and route pair, including `confirmed` and `cancelled` drafts. An existing trip without any draft row SHALL return 200 with `data=null` and `error=null`. Reads SHALL NOT mutate the draft, routes or versions, and SHALL NOT require initiator status.

#### Scenario: Member reloads the saved draft and routes (D1)

- **WHEN** member Chloe refreshes the draft page after Ben saves boundaries and generates both routes, then requests the draft detail endpoint
- **THEN** response is 200 with `error=null`; `data` contains `initiatorMemberId`, `mainPlanVersion`, `draftVersion`, `status`, `groups`, `createdAt`, `updatedAt`, `mainPlanStops`, `departureStopId`, `reunionStopId`, `departureAt`, `reunionAt`, `windowMinutes` and `routes`
- **AND** stops belong to the draft's main-plan version with id, name, start/end timestamps; boundaries yield window 120 and routes contain A/B groups, activity names, departure/reunion stops and `activityMinutes`, `travelLegsMinutes[]`, `bufferMinutes`, sufficient to build the timing snapshot without client guesses
- **AND** before boundary selection boundary ids/times/window are null; before generation `routes=[]`; otherwise saved boundary and pair values are returned
- **AND** all fields describe one consistent saved state; no version is incremented

#### Scenario: Confirmed and cancelled drafts remain readable (D1b)

- **GIVEN** the draft was confirmed or cancelled by a previous call
- **WHEN** a member reads the draft detail
- **THEN** response is 200 with `status` = `confirmed` or `cancelled`; a `confirmed` draft returns its saved groups/boundaries/routes, a `cancelled` draft returns `routes = []` (its split nodes were removed and the document routes cleared)
- **AND** no version or document change is caused by the read

#### Scenario: Existing trip has no active draft (D2)

- **WHEN** a member requests detail for an existing trip with no draft row
- **THEN** response is 200 with `data=null` and `error=null` for the empty state
- **AND** no draft is created and no data or version changes

#### Scenario: Known outsider cannot read draft detail (D3-N)

- **WHEN** Eve uses her known user id to read the fixture trip's draft detail
- **THEN** response is 403 with `error.code=NOT_A_MEMBER` and `data=null`
- **AND** no trip, draft or route values are returned

#### Scenario: Missing or globally unknown identity cannot read detail (D4-N)

- **WHEN** a detail request has a missing or globally unknown `X-User-Id`
- **THEN** response is 401 with `error.code=MEMBER_REQUIRED` and `data=null`
- **AND** no trip, draft or route values are returned

#### Scenario: Known member requests an unknown trip (D5-N)

- **WHEN** a known member requests detail with a trip id that does not exist
- **THEN** response is 404 with `error.code=TRIP_NOT_FOUND` and `data=null`
- **AND** no draft is created and no data or version changes
