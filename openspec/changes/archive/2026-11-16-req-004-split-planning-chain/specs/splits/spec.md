# Spec Delta

## Purpose

能力 `splits`（B 拆分主链，REQ-004~007 / US-038、039、042、043）：主线确认后，
成员发起唯一拆分草稿 → 发起人成对选择拆分边界 → 按分组偏好成对生成路线 →
任意成员校验会合时间窗口。硬约束 =「两组都能按时会合」：草稿唯一且版本可控、
路线成对原子、校验覆盖每条路线全部交通段与 buffer，超窗或缺输入拦住整对确认。

链级约定（五条 requirement 共用，源自用户 2026-11-15 裁决与 tech-stack-plan）：

- 身份 = 邀请码 + 昵称加入后的成员，请求头 `X-Member-Id` 携带 `trip_member.id`；
  MVP 按给定值信任，不校验签名（DR-05，不得描述为安全控制）。
- All five endpoints SHALL validate identity, then trip existence, then membership:
  missing or globally unknown member id returns `401 MEMBER_REQUIRED`; a known
  member id with an unknown trip returns `404 TRIP_NOT_FOUND`; a known member of
  another trip returns `403 NOT_A_MEMBER`. Rejections return `data = null` and
  no private trip, draft or route values. Only authorized calls reach calculation.
- 响应统一 `{data,error}` 包封套；`error.code` 为稳定机器可读契约，
  `error.message` 为实现文本非契约；成功时 `error = null`。
- 严格 4 表（trip / trip_member / member_preference / plan_node），不建第 5 表、
  不加 plan_node 列；拆分草稿 = `trip.split_draft` 可空 TEXT 列存 JSON 文档
  （V2 迁移内唯一 schema 扩展）；分组存草稿文档 `groups` 字段。
- 时间一律 TEXT（ISO-8601 UTC）；窗口与时长粒度 = 分钟（整数）。
- 「主线已确认」谓词 = 该行程全部成员 `plan_ack_version` = `trip.plan_version`。
- `draftVersion` 从 1 起，任何草稿变更（边界重选/分组移动/路线重生成）+1；
  写操作携带版本条件更新，不符即 stale 拒绝。
- 本期不实现确认（US-049）/取消（US-050）端点；草稿 `status` 预留 `cancelled` 值。

## ADDED Requirements

### Requirement: Split draft start

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft`（`X-Member-Id` 头），
允许任意行程成员从已确认主线发起该行程唯一的拆分草稿。系统 SHALL 依序校验
成员资格、主线确认前置、活跃唯一性，并以条件更新在 `trip.split_draft` 创建
JSON 文档（`initiatorMemberId`、`mainPlanVersion`、`draftVersion = 1`、
`status = active`、可空边界字段、`groups`、`createdAt`、`updatedAt`）；
每 trip 至多一份活跃草稿文档，撞车即冲突。系统 SHALL 通过 V2 Flyway 迁移
建 4 表与 `trip.split_draft` 列并写入自包含种子，且落地 SQLite 三铁律
（池=1、WAL、busy_timeout=5000、foreign_keys=on）。

#### Scenario: V2 迁移与自包含种子（REQ-004 In scope / OQ-1）

- **WHEN** 后端在已应用 V1 的库上启动
- **THEN** V2 迁移创建 `trip`、`trip_member`、`member_preference`、`plan_node`
  四表与 `trip.split_draft` 可空 TEXT 列，不新增第 5 表、不加 plan_node 列
- **AND** 种子含行程 Singapore Friends Day（id = 固定 UUID、invite_code =
  `SGF26A`、plan_version = 1、split_draft = NULL）、本行程 4 名成员
  （Alice = owner，Ben/Chloe/Daniel = member，均 plan_ack_version = 1）、
  Eve 为另一行程的种子成员、主线 v1 两个 stop（City Hall MRT
  01:00:00Z–01:30:00Z、Merlion Park 03:30:00Z–04:00:00Z，branch_id = main）
- **AND** 既有 greeting 表与 V1 种子不受影响

#### Scenario: 成员发起唯一草稿（S1）

- **WHEN** 主线 v1 已确认且无活跃草稿，成员 Ben 携带有效 `X-Member-Id` 发起
- **THEN** 响应 `201`，`data` 含 initiatorMemberId = Ben、mainPlanVersion = 1、
  draftVersion = 1、status = active
- **AND** 库中该行程恰有一份活跃草稿文档

#### Scenario: 并发发起至多一个活跃草稿（S2）

- **WHEN** Alice 与 Ben 同时对同一行程发起
- **THEN** 至多一个请求成功（`201`），另一请求 `409` 且
  `error.code = SPLIT_DRAFT_CONFLICT`
- **AND** 库中活跃草稿数 = 1

#### Scenario: 主线未确认拒绝（S3-N）

- **WHEN** 至少一名成员 plan_ack_version 落后于 trip.plan_version 时成员发起
- **THEN** 响应 `409` 且 `error.code = MAIN_PLAN_NOT_CONFIRMED`
- **AND** 不创建草稿

#### Scenario: 非成员拒绝（S4-N）

- **WHEN** Eve（非本行程成员）携带其 `X-Member-Id` 发起
- **THEN** 响应 `403` 且 `error.code = NOT_A_MEMBER`
- **AND** 不创建草稿，响应不含行程私有数据

#### Scenario: 缺失或未知身份拒绝（S5-N）

- **WHEN** 请求缺失 `X-Member-Id` 头或其 id 在全局成员记录中不存在
- **THEN** 响应 `401` 且 `error.code = MEMBER_REQUIRED`
- **AND** 不创建草稿

#### Scenario: 未知行程拒绝（S6-N）

- **WHEN** 对不存在的 tripId 发起
- **THEN** 响应 `404` 且 `error.code = TRIP_NOT_FOUND`

#### Scenario: 重复发起拒绝（S7）

- **WHEN** 已存在活跃草稿时再次发起（串行重复）
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_CONFLICT`
- **AND** 原草稿文档不变

#### Scenario: 发起屏幕展示契约（Screen 11）

- **WHEN** 成员打开拆分发起屏幕并触发起
- **THEN** 页面呈现草稿状态（initiator、mainPlanVersion、draftVersion）
- **AND** 冲突 / 主线未确认 / 无权限错误态与 loading / empty 态均可观察
- **AND** 前端不自行判定唯一性或确认状态（判定归后端）

### Requirement: Split boundary selection

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/boundaries`
（`X-Member-Id` 头，body 含 `departureStopId`、`reunionStopId`、`draftVersion`），
仅允许草稿发起人成对保存出发与会合边界（不开放半边界）。两 stop SHALL 均属
已确认主线；出发时刻 = 出发 stop 的 `end_at`（scheduled end），会合时刻 =
会合 stop 的 `start_at`（scheduled start），窗口 = 会合 − 出发（分钟）且
SHALL 为正。保存 SHALL 以 draftVersion 条件更新写入草稿文档边界字段并使
draftVersion+1；任何拒绝 SHALL 不改动已保存边界与版本。草稿详情 SHALL 返回
当前边界 stop、对应时刻与窗口分钟数。

#### Scenario: 正窗口成对保存（B1）

- **WHEN** 发起人 Ben 选 City Hall MRT 出发、Merlion Park 会合，携带当前 draftVersion = 1
- **THEN** 响应 `200`，保存出发 = City Hall MRT @ 09:30 本地（01:30:00Z，
  scheduled end）、会合 = Merlion Park @ 11:30 本地（03:30:00Z，scheduled start）、
  窗口 = 120 分钟
- **AND** draftVersion 递增为 2

#### Scenario: 非正窗口拒绝（B2-N）

- **WHEN** 反向选择（Merlion Park 出发 scheduled end 12:00、City Hall MRT
  会合 scheduled start 09:00）
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

- **WHEN** 无活跃草稿时保存边界
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

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate`
with `draftVersion` for the initiator after boundaries are saved. It SHALL
atomically replace both group routes using fixed in-process candidates, preserve
main-plan rows, increment the version on success, roll back on failure, and
reject stale results without overwriting newer state. Complete, disjoint A/B
groups are a fixture-guaranteed defensive precondition in this slice.

#### Scenario: 成对生成（G1）

- **WHEN** 草稿含 A 组（Alice+Ben）、B 组（Chloe+Daniel），边界 City Hall MRT
  09:30 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存：A 访问 National Gallery Singapore、
  B 访问 Gardens by the Bay，两条均起于 City Hall MRT、终于 Merlion Park
- **AND** 时长分解 = 活动 60 分钟、交通 A: 15/20 与 B: 20/20 分钟、buffer 各 10 分钟
- **AND** draftVersion 递增
- **AND** candidates come from replaceable `BranchCandidateProvider`, with a
  fixed in-process fixture implementation and no external network call
- **AND** routes use existing `plan_node` rows with `branch_id = split-a/split-b`,
  associated by trip id without new columns; structured duration JSON contains
  `activityMinutes`, `travelLegsMinutes[]` and `bufferMinutes`
- **AND** replacement deletes the old pair and inserts the new pair in one
  transaction, preserving main-plan rows; fixture groups are complete and disjoint,
  with invalid-group paths deferred to the out-of-scope group-movement feature

#### Scenario: 半对失败整对回滚（G2-N）

- **WHEN** 夹具构造提供者对 B 组抛错（A 组成功）
- **THEN** 错误响应 `error.code = ROUTE_GENERATION_FAILED`
- **AND** 库中无该草稿的任何新路线（无可确认半成品对），draftVersion 不变
- **AND** any previously saved pair and all main-plan rows remain unchanged

#### Scenario: 过期结果拒绝（G3-N）

- **WHEN** generation starts at current draftVersion N after boundary selection,
  and a concurrent boundary re-selection advances the draft to N+1 before results return
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

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:check-timing`
for trip members. The entry guard MAY read identity, trip and membership data.
The calculator SHALL use only the supplied window and two-route snapshot, with
no repository access or persistence. It SHALL report totals, overruns and missing
inputs; return 200 with pair `feasible=false` for overruns or missing inputs;
and reject an empty snapshot or route count other than two with 400 `INVALID_ROUTE_PAIR`.

#### Scenario: 双双通过（T1）

- **WHEN** 成员携带快照：窗口 120 分钟，A = 15+60+20+10、B = 20+60+20+10（buffer 各 10）
- **THEN** 响应 `200`，A totalMinutes = 105、B totalMinutes = 110，均 ≤ 120
- **AND** 整对 feasible = true
- **AND** after the entry guard checks identity, trip existence and membership,
  the calculator performs no database reads or writes and no result is persisted
- **AND** input contains `windowMinutes` and two `routes` with `groupLabel`,
  `activityMinutes`, `travelLegsMinutes[]` and `bufferMinutes`; each total is
  activity duration plus every travel leg plus buffer

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

- **WHEN** the timing endpoint receives a missing or globally unknown member id,
  a known member with an unknown trip, or known outsider Eve for the fixture trip
- **THEN** the respective response is `401 MEMBER_REQUIRED`, `404 TRIP_NOT_FOUND`
  or `403 NOT_A_MEMBER`, with `data = null`
- **AND** the calculator is not invoked and no snapshot or route values are returned

#### Scenario: 窗口校验屏幕展示契约（Screen 14）

- **WHEN** 成员打开窗口校验屏幕并触发校验
- **THEN** 页面呈现两条路线的活动/交通/buffer 分解与 totalMinutes
- **AND** 通过态、超窗态（显示超出分钟数）、缺输入态（列出缺失项）三态可观察
- **AND** loading / empty / permission 态可观察；前端不自行宣布可行

### Requirement: Split draft detail read

The system SHALL expose member-only `GET /api/trips/{tripId}/split-draft` using
the shared identity guards and `{data,error}` envelope. It SHALL return a
consistent saved draft snapshot with versions, groups, selectable main-plan
stops, boundaries, window and route pair. An existing trip without an active
draft SHALL return 200 with `data=null` and `error=null`. Reads SHALL NOT mutate
the draft, routes or versions, and SHALL NOT require initiator status.

#### Scenario: Member reloads the saved draft and routes (D1)

- **WHEN** member Chloe refreshes the draft page after Ben saves boundaries
  and generates both routes, then requests the draft detail endpoint
- **THEN** response is 200 with `error=null`; `data` contains `initiatorMemberId`,
  `mainPlanVersion`, `draftVersion`, `status`, `groups`, `createdAt`, `updatedAt`,
  `mainPlanStops`, `departureStopId`, `reunionStopId`, `departureAt`, `reunionAt`,
  `windowMinutes` and `routes`
- **AND** stops belong to the draft's main-plan version with id, name, start/end
  timestamps; boundaries yield window 120 and routes contain A/B groups, activity
  names, departure/reunion stops and `activityMinutes`, `travelLegsMinutes[]`,
  `bufferMinutes`, sufficient to build the timing snapshot without client guesses
- **AND** before boundary selection boundary ids/times/window are null; before
  generation `routes=[]`; otherwise saved boundary and pair values are returned
- **AND** all fields describe one consistent saved state; no version is incremented

#### Scenario: Existing trip has no active draft (D2)

- **WHEN** a member requests detail for an existing trip with no active draft
- **THEN** response is 200 with `data=null` and `error=null` for the empty state
- **AND** no draft is created and no data or version changes

#### Scenario: Known outsider cannot read draft detail (D3-N)

- **WHEN** Eve uses her known member id to read the fixture trip's draft detail
- **THEN** response is 403 with `error.code=NOT_A_MEMBER` and `data=null`
- **AND** no trip, draft or route values are returned

#### Scenario: Missing or globally unknown identity cannot read detail (D4-N)

- **WHEN** a detail request has a missing or globally unknown `X-Member-Id`
- **THEN** response is 401 with `error.code=MEMBER_REQUIRED` and `data=null`
- **AND** no trip, draft or route values are returned

#### Scenario: Known member requests an unknown trip (D5-N)

- **WHEN** a known member requests detail with a trip id that does not exist
- **THEN** response is 404 with `error.code=TRIP_NOT_FOUND` and `data=null`
- **AND** no draft is created and no data or version changes