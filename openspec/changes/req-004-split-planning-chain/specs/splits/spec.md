# Spec Delta

## Purpose

能力 `splits`（B 拆分主链，REQ-004~007 / US-038、039、042、043）：主线确认后，
成员发起唯一拆分草稿 → 发起人成对选择拆分边界 → 按分组偏好成对生成路线 →
任意成员校验会合时间窗口。硬约束 =「两组都能按时会合」：草稿唯一且版本可控、
路线成对原子、校验覆盖每条路线全部交通段与 buffer，超窗或缺输入拦住整对确认。

链级约定（四条 requirement 共用，源自用户 2026-11-15 裁决与 tech-stack-plan）：

- 身份 = 邀请码 + 昵称加入后的成员，请求头 `X-Member-Id` 携带 `trip_member.id`；
  MVP 按给定值信任，不校验签名（DR-05，不得描述为安全控制）。
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

- **WHEN** 请求缺失 `X-Member-Id` 头或其 id 不属于该行程成员
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

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft/routes:generate`
（`X-Member-Id` 头，body 含 `draftVersion`），仅允许草稿发起人在边界已保存、
分组齐全（A/B 两组、成员不跨组）时触发成对生成。候选活动 SHALL 由进程内
可替换提供者接口（`BranchCandidateProvider`）供给，MVP 为固定夹具实现，
不引入外部网络调用。系统 SHALL 组装恰两条路线（同出发/会合边界、按组差异化
活动），在单事务内先删旧对再写新对并条件校验 draftVersion：任一失败整对
回滚（`ROUTE_GENERATION_FAILED`），版本过期拒绝（`STALE_DRAFT_VERSION`）
且不覆盖新草稿，成功后 draftVersion+1。路线 SHALL 存于 `plan_node`
（`branch_id = 'split-a'/'split-b'`，按 trip_id 归属活跃草稿，不加列），
时长存结构化 JSON（activityMinutes、travelLegsMinutes[]、bufferMinutes）；
不删除主线行。草稿详情 SHALL 返回成对路线（分组、活动、起终点、时长分解）。

#### Scenario: 成对生成（G1）

- **WHEN** 草稿含 A 组（Alice+Ben）、B 组（Chloe+Daniel），边界 City Hall MRT
  09:30 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存：A 访问 National Gallery Singapore、
  B 访问 Gardens by the Bay，两条均起于 City Hall MRT、终于 Merlion Park
- **AND** 时长分解 = 活动 60 分钟、交通 A: 15/20 与 B: 20/20 分钟、buffer 各 10 分钟
- **AND** draftVersion 递增

#### Scenario: 半对失败整对回滚（G2-N）

- **WHEN** 夹具构造提供者对 B 组抛错（A 组成功）
- **THEN** 错误响应 `error.code = ROUTE_GENERATION_FAILED`
- **AND** 库中无该草稿的任何新路线（无可确认半成品对），draftVersion 不变

#### Scenario: 过期结果拒绝（G3-N）

- **WHEN** 为草稿 v1 启动生成，期间分组成员移动使草稿变 v2，v1 结果返回
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** v1 结果被丢弃，v2 状态不被覆盖

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

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft/routes:check-timing`
（`X-Member-Id` 头），允许任意行程成员对显式供给的成对路线快照做纯计算校验
（Database: No，零读库零写库，不持久化结果）。快照 body SHALL 含
`windowMinutes` 与恰两条 `routes{groupLabel, activityMinutes,
travelLegsMinutes[], bufferMinutes}`。系统 SHALL 逐路线计算
`totalMinutes = activityMinutes + Σ travelLegsMinutes + bufferMinutes`
并与窗口比较：超窗给出 `overrunMinutes`，任一输入缺失逐项列出 `missingInputs`；
整对 `feasible = true` 仅当两条路线均无超窗且无缺失。超窗/缺输入 SHALL 返回
`200 + feasible = false`（校验成功执行、结论不可行），不得呈现为通过；
快照非法（空或路线数 ≠ 2）SHALL 拒绝 `400 INVALID_ROUTE_PAIR`。

#### Scenario: 双双通过（T1）

- **WHEN** 成员携带快照：窗口 120 分钟，A = 15+60+20+10、B = 20+60+20+10（buffer 各 10）
- **THEN** 响应 `200`，A totalMinutes = 105、B totalMinutes = 110，均 ≤ 120
- **AND** 整对 feasible = true
- **AND** 校验过程不读库不写库（纯计算）

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

#### Scenario: 窗口校验屏幕展示契约（Screen 14）

- **WHEN** 成员打开窗口校验屏幕并触发校验
- **THEN** 页面呈现两条路线的活动/交通/buffer 分解与 totalMinutes
- **AND** 通过态、超窗态（显示超出分钟数）、缺输入态（列出缺失项）三态可观察
- **AND** loading / empty / permission 态可观察；前端不自行宣布可行