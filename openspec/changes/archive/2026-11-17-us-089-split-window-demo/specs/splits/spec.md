# Spec Delta

## Purpose

能力 `splits`（US-089 增量）：分队窗口改为“会合开始 − 出发开始”；保存边界即作废旧路线；A 组沿已确认主线站点成段生成，B 组保留按目的地的新路线；草稿详情暴露 `destination` 与 `RouteStep`。既有成员分组、确认、取消与唯一性状态机不变。

## MODIFIED Requirements

### Requirement: Split boundary selection

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/boundaries`（认证会话，body 含 `departureStopId`、`reunionStopId`、`draftVersion`），仅允许草稿发起人成对保存出发与会合边界（不开放半边界）。`active` 之外的草稿状态 SHALL 拒绝写入。两 stop SHALL 均属已确认主线；出发时刻 = 出发 stop 的 `start_at`（在该站开始分头），会合时刻 = 会合 stop 的 `start_at`，窗口 = 会合 − 出发（分钟）且 SHALL 为正。保存 SHALL 以 draftVersion 条件更新写入草稿文档边界字段并使 draftVersion+1，并在同一事务内清空草稿 `routes` 与 `split-a` / `split-b` 的 `plan_node` 行（旧路线按旧窗口生成，必须重新生成）；任何拒绝 SHALL 不改动已保存边界、版本与既有路线。草稿详情 SHALL 返回当前边界 stop、对应时刻与窗口分钟数。

#### Scenario: 正窗口成对保存（B1）

- **WHEN** 发起人 Ben 选 City Hall MRT 出发、Merlion Park 会合，携带当前 draftVersion = 1
- **THEN** 响应 `200`，保存出发 = City Hall MRT @ 09:00 本地（01:00:00Z，scheduled start）、会合 = Merlion Park @ 11:30 本地（03:30:00Z，scheduled start）、窗口 = 150 分钟
- **AND** draftVersion 递增为 2

#### Scenario: 保存新边界清空旧路线（B7）

- **GIVEN** 已按旧边界生成两条路线，版本 N
- **WHEN** 发起人保存一对不同的边界（版本 N，通过校验）
- **THEN** 响应 `200`，`draftVersion = N+1`，草稿 `routes = null`
- **AND** 该行程 `split-a` / `split-b` 的 `plan_node` 行数为 0，详情 `routes = []`；必须重新生成

#### Scenario: 非正窗口拒绝（B2-N）

- **WHEN** 反向选择或同一 stop 作为出发与会合（窗口 ≤ 0）
- **THEN** 响应 `400` 且 `error.code = NONPOSITIVE_SPLIT_WINDOW`
- **AND** 已保存边界、版本与既有路线不变（此前从未保存则仍为空）

#### Scenario: 主线外节点拒绝（B3-N）

- **WHEN** 任一边界选择不在已确认主线 stop 中的节点
- **THEN** 响应 `400` 且 `error.code = BOUNDARY_NOT_IN_MAIN_PLAN`
- **AND** 不创建无关会合点，已保存边界与路线不变

#### Scenario: 非发起人拒绝（B4-N）

- **WHEN** 非发起人成员尝试保存边界
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 边界与路线不变

#### Scenario: 无活跃草稿拒绝（B5-N）

- **WHEN** 无活跃草稿（或草稿已 `confirmed` / `cancelled`）时保存边界
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 无持久化

#### Scenario: 过期版本拒绝（B6-N）

- **WHEN** 保存请求携带过期 draftVersion
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** 当前边界、版本与路线不变

#### Scenario: 边界选择屏幕展示契约（Screen 12）

- **WHEN** 发起人打开边界选择屏幕
- **THEN** 出发/会合选择器选项仅来自主线 stop，均呈现 stop 名 + 开始时刻；窗口卡在保存后显示后端派生的窗口
- **AND** 会合站必须排在出发站之后：不合法选项置灰，已选项可再次点击取消
- **AND** “下一步”在存在未保存改动时先保存再进入路线页，并提示“边界已修改但尚未保存，旧路线将作废”
- **AND** 非正窗口 / 主线外错误态与 loading / empty / permission 态均可观察；判定归后端

### Requirement: Group route generation

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate` with `draftVersion` for the initiator after boundaries are saved and while the draft is `active`. Before generating, it SHALL require a complete group partition: both `groups.A` and `groups.B` non-empty, every current trip member assigned exactly once; incomplete partitions SHALL be rejected with `409 SPLIT_DRAFT_INCOMPLETE` and `error.details.missing`. When complete, it SHALL atomically replace both group routes, preserve main-plan rows, increment the version on success, roll back on failure, and reject stale results without overwriting newer state.

Group A SHALL keep the confirmed itinerary: its candidate SHALL be derived from the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive), exposing ordered `RouteStep` entries (`name` + scheduled stay minutes); `activityMinutes` = sum of stays, `travelLegsMinutes` = scheduled gaps between consecutive stops (last gap ends at the reunion start), `bufferMinutes` = 0, so the total equals the window exactly. Group B SHALL keep a destination-keyed synthetic activity with empty `steps`. Persisted route views and the draft document SHALL carry `steps` (nullable for old documents). A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`.

#### Scenario: 成对生成（G1）

- **GIVEN** 草稿含完整分组，边界 City Hall MRT 09:00 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存，均起于 City Hall MRT、终于 Merlion Park
- **AND** A 组为「沿主线方案」：steps = City Hall MRT(30) / National Gallery Singapore(30) / Gardens by the Bay(15)，activity = 75，legs = [30, 30, 15]，buffer = 0
- **AND** B 组为夹具活动：Gardens by the Bay，activity = 60，legs = [20, 20]，buffer = 10
- **AND** draftVersion 递增；candidates come from replaceable `BranchCandidateProvider`（无外部网络）
- **AND** routes 使用既有 `plan_node` split-a/split-b 行；结构化时长 JSON 含 `activityMinutes`、`travelLegsMinutes[]`、`bufferMinutes` 与 `steps[]`
- **AND** replacement deletes the old pair and inserts the new pair in one transaction, preserving main-plan rows

#### Scenario: A 组合计等于时间窗（G7）

- **GIVEN** 主线在边界之间按序排列且无重叠
- **WHEN** 生成路线
- **THEN** A 组 `activityMinutes + ΣtravelLegsMinutes + bufferMinutes` = `windowMinutes`
- **AND** A 组 `steps` 的名称与顺序 = 边界之间的主线站点

#### Scenario: 半对失败整对回滚（G2-N）

- **WHEN** 夹具构造提供者对 B 组抛错（A 组成功）
- **THEN** 错误响应 `error.code = ROUTE_GENERATION_FAILED`
- **AND** 库中无该草稿的任何新路线，draftVersion 不变；既有路线与全部主线行保持原样

#### Scenario: 过期结果拒绝（G3-N）

- **WHEN** generation starts at draftVersion N and a concurrent boundary re-selection advances the draft to N+1 before results return
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** the result for N is discarded and state at N+1 is not overwritten

#### Scenario: 无边界拒绝（G4-N）

- **WHEN** 边界未保存时触发生成
- **THEN** 响应 `409` 且 `error.code = SPLIT_BOUNDARIES_REQUIRED`
- **AND** 无路线落库

#### Scenario: 非发起人拒绝（G5-N）

- **WHEN** 非发起人成员触发生成
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 无路线落库

#### Scenario: 分组不完整时拒绝生成（G6-N）

- **WHEN** 草稿存在空组、未分组或重复分组成员
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 按事实列出 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`
- **AND** `split-a` / `split-b` 行数为 0，draftVersion 不变

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **WHEN** 任一成员打开分组路线屏幕
- **THEN** 页面呈现分组卡与成对路线卡；A 组卡按 `steps` 逐站显示（站名 + 分钟），B 组卡显示单一活动分解
- **AND** 每张路线卡显示“合计 X 分 / 窗口 Y 分”，超窗在表头标红并提示回边界页把会合站后移
- **AND** 顶部显示时间窗与“由所选出发/会合站决定”的说明
- **AND** 已生成路线在成员改组后仍原样呈现并提示需重新生成；终态路线只读；判定归后端

### Requirement: Split draft detail read

The system SHALL expose member-only `GET /api/trips/{tripId}/split-draft` using the shared identity guards and `{data,error}` envelope. It SHALL return a consistent saved draft snapshot with versions, status, groups, selectable main-plan stops, boundaries, window, route pair and the trip `destination`. Each route view SHALL include `groupLabel`, `activityName`, boundary ids, `activityMinutes`, `travelLegsMinutes[]`, `bufferMinutes` and nullable `steps[]` (group A carries its main-plan steps). An existing trip without any draft row SHALL return 200 with `data=null`. Reads SHALL NOT mutate the draft, routes or versions, and SHALL NOT require initiator status.

#### Scenario: Member reloads the saved draft and routes (D1)

- **WHEN** member refreshes the draft page after boundaries and routes are saved
- **THEN** response is 200 with `error=null`; `data` contains versions, status, groups, timestamps, `mainPlanStops`, boundary ids/times, `windowMinutes`, `routes` and `destination`
- **AND** boundaries yield window = reunion start − departure start (150 for City Hall → Merlion); routes expose `steps` for group A and B's activity breakdown
- **AND** before boundary selection boundary ids/times/window are null; before generation `routes=[]`
- **AND** no version is incremented

#### Scenario: Confirmed and cancelled drafts remain readable (D1b)

- **GIVEN** the draft was confirmed or cancelled by a previous call
- **WHEN** a member reads the draft detail
- **THEN** response is 200 with `status` = `confirmed` or `cancelled`; a `confirmed` draft returns its saved groups/boundaries/routes, a `cancelled` draft returns `routes = []`
- **AND** no version or document change is caused by the read

#### Scenario: Existing trip has no active draft (D2)

- **WHEN** a member requests detail for an existing trip with no draft row
- **THEN** response is 200 with `data=null` and `error=null`
- **AND** no draft is created and no data or version changes

#### Scenario: Known outsider cannot read draft detail (D3-N)

- **WHEN** a known non-member reads the draft detail
- **THEN** response is 403 with `error.code=NOT_A_MEMBER` and `data=null`

#### Scenario: Missing or globally unknown identity cannot read detail (D4-N)

- **WHEN** a detail request has no authenticated session
- **THEN** response is 401 with `error.code=MEMBER_REQUIRED` and `data=null`

#### Scenario: Known member requests an unknown trip (D5-N)

- **WHEN** a known member requests detail with a trip id that does not exist
- **THEN** response is 404 with `error.code=TRIP_NOT_FOUND` and `data=null`

### Requirement: Split confirmation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:confirm`（认证会话，body 含 `draftVersion`），仅允许行程组织者确认当前活跃草稿。校验顺序 = 成员资格 → 组织者 → 活跃草稿 → 版本一致 → 草稿完整性（边界已存、两条路线齐备、分组完整），随后从草稿文档复算两条路线的时长与新窗口（会合开始 − 出发开始）；客户端声明不参与判定。拒绝时不改变 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE` 或 `SPLIT_TIMING_INFEASIBLE`。成功 SHALL 在单一事务内将 `status` 置 `confirmed`（版本不变），路线对、分组与边界成对生效并锁定编辑，响应返回草稿详情投影。

#### Scenario: 组织者确认成功并锁定（CF1）

- **GIVEN** 活跃草稿为版本 3（发起 1 → 保存边界 2 → 生成路线 3），两组齐全互斥，边界已保存，路线对 A = 75+30+30+15+0 = 150、B = 60+20+20+10 = 110（窗口 150）
- **WHEN** 组织者携带 `draftVersion: 3` 调用确认
- **THEN** 响应 `200`，`data.status = confirmed`，`data.draftVersion = 3`
- **AND** 之后边界保存与路线生成均返回 `409 SPLIT_DRAFT_NOT_ACTIVE`

#### Scenario: 超窗拦住整对确认（CF2-N）

- **GIVEN** 客户端声明可确认，但 A 路线末段交通被改为 80 分钟（A = 215），窗口 150
- **THEN** 响应 `409` 且 `error.code = SPLIT_TIMING_INFEASIBLE`，`status` 与版本不变
- **AND** `error.details.routes` 为长度 2 的数组：A 项 `totalMinutes = 215`、`overrunMinutes = 65`；B 项 `totalMinutes = 110`、`overrunMinutes = 0`

#### Scenario: 缺输入不得判为可确认（CF3-N）

- **WHEN** 任一必填时长（activity / travel leg / buffer）缺失
- **THEN** 响应 `409` 且 `SPLIT_TIMING_INFEASIBLE`；`error.details.routes` 对应项列出缺失字段
- **AND** 不得把缺失输入按 0 处理为可行

#### Scenario: 草稿不完整无确认（CF7-N）

- **WHEN** 边界或任一路线缺失
- **THEN** 响应 `409` 且 `SPLIT_DRAFT_INCOMPLETE`，`details.missing` 列出缺失部分

#### Scenario: 分组不完整无确认（CF8-N）

- **WHEN** 分组有空组 / 未分组 / 重复
- **THEN** 响应 `409` 且 `SPLIT_DRAFT_INCOMPLETE`，`details.missing` 列出 `groups.*`

#### Scenario: 版本过期拒绝（CF4-N）

- **WHEN** 携带过期 `draftVersion` 确认
- **THEN** 响应 `409` 且 `STALE_DRAFT_VERSION`

#### Scenario: 非组织者拒绝（CF5-N）

- **WHEN** 非组织者成员确认
- **THEN** 响应 `403` 且 `NOT_SPLIT_ORGANIZER`

#### Scenario: 无活跃草稿时确认拒绝（CF6-N）

- **WHEN** 无草稿或草稿处于终态
- **THEN** 响应 `409` 且 `SPLIT_DRAFT_NOT_ACTIVE`（或 `404 NO_DRAFT`，按既有顺序）

#### Scenario: 确认屏幕展示契约（Screen 15）

- **WHEN** 组织者打开复核页
- **THEN** 页面显示边界时间窗、分组、每条路线分解与状态；确认由服务端复算，客户端不宣布可行性
- **AND** 失败明细来自 `error.details`；终态只读
