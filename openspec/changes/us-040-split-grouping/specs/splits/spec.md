# Spec Delta

## Purpose

能力 `splits`（B 拆分主链，US-038/039/040/042/043 + US-049/050）：主线确认后，成员发起唯一拆分草稿 → 发起人成对选择拆分边界 → 成员自选/更换本人小组（全员可见分组）→ 按分组偏好成对生成路线 → 任意成员校验会合时间窗口 → 组织者成对确认（冻结为唯一拆分方案）或发起人取消草稿（放弃提案并允许替换）。硬约束 =「两组都能按时会合」：草稿唯一且版本可控、分组完整（两组非空、无人漏组或重复）、路线成对原子、校验覆盖每条路线全部交通段与 buffer，不可行或输入缺失拦住整对确认。

链级约定（各 requirement 共用）：

- 调用者身份取自认证会话（`POST /api/auth/login` 建立的 principal，`AccountPrincipal.id` = `app_user.id`）；`X-User-Id` / `X-Member-Id` 请求头不再用于认证（见 `trips` capability「Caller identity」）。场景中的 `X-User-Id: N` 仅作夹具简写，等价于「已登录 account N 的会话」。
- All endpoints SHALL validate identity, then trip existence, then membership: missing or globally unknown account returns `401 MEMBER_REQUIRED`; a known account with an unknown trip returns `404 TRIP_NOT_FOUND`; a known member of another trip returns `403 NOT_A_MEMBER`. Rejections return `data = null` and no private trip, draft or route values. Only authorized calls reach calculation.
- 响应统一 `{data,error}` 包封套；`error.code` 为稳定机器可读契约，`error.message` 为实现文本非契约；成功时 `error = null`。需要明细的拒绝 SHALL 在 `error.details` 携带对象（本期 `SPLIT_TIMING_INFEASIBLE`、`SPLIT_DRAFT_INCOMPLETE` 使用；后者在分组不完整时以 `missing` 数组列出 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`）；`details` 缺失不影响 `code` 的判定。
- 拆分草稿 = `split_draft` 表一行（`trip_id` UNIQUE），业务字段存 `document` JSON 列；主线与拆分路线结构存 `plan_node`（`branch_id` = `main` / `split-a` / `split-b`）。不新增表、不新增迁移（V4 为既有迁移）。文档 `groups` = `{"A": [app_user.id ...], "B": [...]}`，两个键恒存在、允许空数组。
- 时间一律 TEXT（ISO-8601 UTC）；窗口与时长粒度 = 分钟（整数）。
- 「主线已确认」谓词 = `trip.main_plan_confirmed`（V3 列，0/1）。
- `draftVersion` 从 1 起，任何草稿变更（边界重选/路线重生成/分组变更/取消后重建）+1；写操作携带版本条件更新，不符即 stale 拒绝。确认与取消 SHALL NOT 改变 `draftVersion`。
- 草稿状态机：`active`（可编辑/可确认/可取消）→ `confirmed`（冻结）／`cancelled`（终止，可被替换重建）；`cancelled → active` 仅限同行重建；`confirmed → *` 禁止。
- 分组完整性谓词（新增）：`groups.A` 与 `groups.B` 均非空，且两组元素并集 = 该行程当前 `trip_member.user_id` 集合、交集为空。生成与确认均以该谓词为前置。

## ADDED Requirements

### Requirement: Member group assignment

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/assignment`（认证会话，body 含可选 `memberId`、`groupLabel` 与 `draftVersion`），允许任意行程成员把**任意行程成员**在草稿 `groups` 中移到 A 组或 B 组（对齐原型头像切组交互）。`memberId` 指定被移动成员，缺省为调用者本人；目标成员 SHALL 属于本行程（否则 `403 NOT_A_MEMBER`）。服务端 SHALL 依序校验成员资格、活跃草稿、版本一致、组别合法、目标成员归属。成功后 SHALL 以版本条件更新写入文档并令 `draftVersion + 1`，同时原样保留边界与已生成路线；`confirmed` / `cancelled` 草稿 SHALL 以 `SPLIT_DRAFT_NOT_ACTIVE` 拒绝；任何拒绝 SHALL 不改动 `groups`、版本与路线。

#### Scenario: 成员把自己切到另一组（A1）

- **GIVEN** 活跃草稿版本 1，`groups = {"A": [Alice, Ben, Chloe, Daniel], "B": []}`，Chloe 是本行程成员
- **WHEN** Chloe 携带 `{"groupLabel": "B", "draftVersion": 1}` 调用 assignment
- **THEN** 响应 `200`，`data.groups.A` 不含 Chloe、`data.groups.B` 恰含 Chloe，`data.draftVersion = 2`
- **AND** 未保存的边界仍为空、`routes` 仍为空，`initiatorMemberId` 与 `status` 不变

#### Scenario: 同一成员往返切换（A2）

- **GIVEN** A1 之后 Chloe 位于 B 组、版本 2
- **WHEN** Chloe 携带 `{"groupLabel": "A", "draftVersion": 2}` 再次调用
- **THEN** 响应 `200`，Chloe 只出现在 A 组，`data.draftVersion = 3`

#### Scenario: 提交自己当前所在组（A3）

- **GIVEN** 成员已位于 A 组，携带当前 `draftVersion`
- **WHEN** 请求 `groupLabel = "A"`
- **THEN** 响应 `200` 且 `groups` 内容不变；版本是否递增按 OQ-10 在 P3 定稿，实现前不得在测试中固化相反断言
- **AND** 无论如何，响应 SHALL 返回写入后的最新 `draftVersion`，前端以响应值为唯一来源、不自行推算版本增减

#### Scenario: 改组保留已生成路线与边界（A4）

- **GIVEN** 活跃草稿版本 3（边界已保存、路线已生成），成员切到另一组并携带 `draftVersion: 3`
- **WHEN** assignment 成功
- **THEN** 响应 `200` 且 `data.draftVersion = 4`
- **AND** `departureStopId`、`reunionStopId`、`routes`（两组活动与时长分解）、`initiatorMemberId`、`mainPlanVersion`、`status` 逐字不变
- **AND** 该行程 `plan_node` 的 `split-a` / `split-b` 行不被删除或重写

#### Scenario: 已确认或已取消草稿不可改组（A5-N）

- **GIVEN** 草稿 `status = confirmed`，或 `status = cancelled`
- **WHEN** 任一成员调用 assignment
- **THEN** 两种情形均响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** `groups`、`routes`、`status`、`draftVersion` 均不变

#### Scenario: 版本过期拒绝（A6-N）

- **GIVEN** 活跃草稿已推进到版本 4
- **WHEN** 请求携带 `draftVersion: 2`
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** `groups` 与版本不变

#### Scenario: 守卫顺序（A7-N）

- **GIVEN** 请求分别缺失或携带未知身份、携带已知身份的未知行程、携带 Eve（非成员）的身份
- **WHEN** assignment 请求到达
- **THEN** 分别响应 `401 MEMBER_REQUIRED`、`404 TRIP_NOT_FOUND`、`403 NOT_A_MEMBER`，`data = null`
- **AND** 不返回草稿或分组私有值，无状态变化

#### Scenario: 非法组别拒绝（A8-N）

- **GIVEN** 请求 `groupLabel` 不是 `A` 或 `B`
- **WHEN** assignment 到达
- **THEN** 响应 `400`（错误码按 OQ-9 在 P3 定稿，候选 `INVALID_GROUP_LABEL`）
- **AND** 无持久化，`groups` 与版本不变

#### Scenario: 任意成员可移动其他成员（A9）

- **GIVEN** 活跃草稿版本 1，Ben 与 Chloe 都是行程成员，两人当前都在 A 组
- **WHEN** Ben 携带 `{"memberId": <Chloe>, "groupLabel": "B", "draftVersion": 1}` 调用 assignment
- **THEN** 响应 `200`，`groups.B` 恰含 Chloe、`groups.A` 不含 Chloe，`data.draftVersion = 2`
- **AND** 调用者 Ben 自己的分组不变（仍在 A 组）

#### Scenario: 目标成员不属于本行程拒绝（A9b-N）

- **GIVEN** Eve 不是该行程成员
- **WHEN** Ben 携带 `{"memberId": <Eve>, "groupLabel": "B", "draftVersion": <当前版本>}` 调用
- **THEN** 响应 `403` 且 `error.code = NOT_A_MEMBER`
- **AND** `groups` 与版本不变

#### Scenario: 分组卡展示与切组契约（Screen 13）

- **GIVEN** 查看者为该行程成员，草稿为 `active`
- **WHEN** 打开「分组与路线」屏幕
- **THEN** 分组卡把成员渲染为头像 chip（首字头像 + 显示名），点击 chip 把该成员移到另一组（A ↔ B）；所有行程成员都可操作
- **AND** 改组成功后页面提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」并刷新草稿
- **AND** 任一组为空时卡内提示「至少一人加入另一组后才能生成路线与确认」
- **AND** `confirmed` / `cancelled` 终态不显示切组控件；loading / empty / permission / error 态均可观察
- **AND** 合法性判定归后端，前端不自行宣布改组成功

## MODIFIED Requirements

### Requirement: Split draft start

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft`（认证会话），允许任意行程成员从已确认主线发起该行程唯一的拆分草稿。系统 SHALL 依序校验成员资格、主线确认前置、活跃唯一性、当前行程成员数至少 2（双组分队要求每组至少一人），并以条件写入在 `split_draft` 表创建 JSON 文档（`initiatorMemberId`、`mainPlanVersion`、`draftVersion = 1`、`status = active`、可空边界字段、`groups`、`createdAt`、`updatedAt`）；`groups` SHALL 初始化为 `{"A": [全部行程成员 id], "B": []}`（`app_user.id`，按 `display_name` 升序），不再按成员数量前后均分；每 trip 至多一行（`trip_id` UNIQUE），撞车即冲突。当且仅当已存在行的文档 `status = cancelled` 时，系统 SHALL 在该行重建草稿：以调用者为新发起人、`draftVersion` 重置为 1、`status = active`、边界与路线清空、`groups` 同样初始化为全员 A 组；`active` 或 `confirmed` 行 SHALL 返回冲突。当前成员数少于 2 时，创建与重建 SHALL 均以 `409 SPLIT_MEMBERS_INSUFFICIENT` 拒绝，不创建或改写任何行（单人行程无法满足「两组非空」）。系统 SHALL 通过既有 V4 Flyway 迁移提供 `split_draft` 与 `plan_node` 两表，且落地 SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on）。

#### Scenario: V2 迁移与自包含种子（REQ-004 In scope / OQ-1）

- **WHEN** 后端在已应用 V1–V3 的库上启动
- **THEN** 迁移创建 `split_draft`（`id`、`trip_id` UNIQUE、`document`、`draft_version`、`created_at`、`updated_at`）与 `plan_node` 两表，不新增第三表、不改 `trip` 列（迁移编号纠偏：实际为 **V4**，非 V2）
- **AND** V2/V3 既有种子（`app_user` 1–5、Singapore Friends Day 行程、四名成员、`main_plan_confirmed` 标志）不受影响
- **AND** 迁移写入主线 v1 的 City Hall MRT（01:00:00Z–01:30:00Z）与 Merlion Park（03:30:00Z–04:00:00Z）两条 `branch_id = 'main'` stop，以及一条 `optional` stop

#### Scenario: 成员发起唯一草稿（S1）

- **WHEN** 主线 v1 已确认且无活跃草稿，成员 Ben 携带有效 `X-User-Id` 发起
- **THEN** 响应 `201`，`data` 含 initiatorMemberId = Ben、mainPlanVersion = 1、draftVersion = 1、status = active
- **AND** 库中该行程恰有一份草稿行

#### Scenario: 初始分组为全员 A 组（S9）

- **GIVEN** 该行程有 Alice、Ben、Chloe、Daniel 四名成员，且无活跃草稿
- **WHEN** 任一成员发起草稿
- **THEN** 响应 `201` 且 `data.groups.A` 恰为这四名成员的 `app_user.id`（按 `display_name` 升序）
- **AND** `data.groups.B` 为空数组；两个键均存在，不出现 `groups` 缺键或 `null`

#### Scenario: 成员不足两人拒绝发起（S10-N）

- **GIVEN** 该行程仅有 1 名成员（组织者本人），主线已确认，且无活跃草稿
- **WHEN** 该成员发起草稿
- **THEN** 响应 `409` 且 `error.code = SPLIT_MEMBERS_INSUFFICIENT`
- **AND** 不创建草稿行；若已存在 `cancelled` 行也不被重建，`groups` 与版本不变

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
- **AND** `groups` 重置为全员 A 组、B 组为空
- **AND** `split_draft` 行数仍为 1（未新增行、未新增迁移），`split_draft.draft_version` 列为 1

#### Scenario: 发起屏幕展示契约（Screen 11）

- **GIVEN** 成员打开拆分发起屏幕（该行程可能无草稿、有活跃草稿、或已有终态草稿）
- **WHEN** 草稿读取返回
- **THEN** 页面呈现草稿状态（initiator、mainPlanVersion、draftVersion、status）
- **AND** 动作按 `status` 分支：无草稿或 `cancelled` → 展示「发起（替换）分队草稿」并调用 `POST split-draft`；`active` → 「下一步：选择边界」；`confirmed` → 只读终态（无发起入口，但提供「查看已确认分队」入口跳转复核页）
- **AND** 冲突 / 主线未确认 / 无权限 / 成员不足两人错误态与 loading / empty 态均可观察（错误按 `error.code` 渲染）
- **AND** 前端不自行判定唯一性或确认状态（判定归后端）

### Requirement: Group route generation

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate` with `draftVersion` for the initiator after boundaries are saved and while the draft is `active`. Before generating, it SHALL require a complete group partition: both `groups.A` and `groups.B` non-empty, every current trip member assigned exactly once. An incomplete partition SHALL be rejected with `409 SPLIT_DRAFT_INCOMPLETE` and `error.details.missing` listing `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate` as applicable, with no route rows written and no version change. When complete, it SHALL atomically replace both group routes using fixed in-process candidates, preserve main-plan rows, increment the version on success, roll back on failure, and reject stale results without overwriting newer state. Routes SHALL be generated for the current `groups` keys (A/B) regardless of membership changes since the last generation. Each saved route SHALL bind to a group label only and SHALL NOT carry member ids; a later group change SHALL NOT invalidate, rewrite or delete the saved pair. A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`.

#### Scenario: 成对生成（G1）

- **GIVEN** 草稿含完整分组 A 组（Alice+Ben）、B 组（Chloe+Daniel），边界 City Hall MRT 09:30 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
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

#### Scenario: 分组不完整时拒绝生成（G6-N）

- **GIVEN** 草稿初始状态 B 组为空，或夹具构造出某成员不在任何组 / 同时出现在 A 与 B；边界已保存、版本为当前
- **WHEN** 发起人触发生成
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 按事实列出：`groups.B`（B 组无人）、`groups.unassigned`（有成员未分组）、`groups.duplicate`（有成员重复分组）
- **AND** 该行程 `split-a` / `split-b` 的 `plan_node` 行数为 0，`draftVersion` 不变

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **GIVEN** 发起人或任一成员打开分组路线屏幕（草稿 active，可能尚无路线）
- **WHEN** 草稿读取返回
- **THEN** 页面呈现分组卡（A/B 组人数与成员名、「我」标记、切组控件）与成对路线卡（组标签、活动名、起终点、时长/交通/buffer 分解）
- **AND** 已生成路线在成员改组后仍原样呈现，并提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」
- **AND** 任一组被搬空且仍留有旧路线时，该组路线卡标注「需重新生成」，且不得暗示可直接确认
- **AND** 分组不完整 / 无边界 / 失败 / 过期错误态与 loading / empty / permission 态均可观察；非发起人的「重新生成」不可用
- **AND** 前端不自行判定分组完整性或路线合法性（判定归后端）

### Requirement: Split confirmation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:confirm`（认证会话，body 含 `draftVersion`），仅允许行程组织者确认当前活跃草稿。校验顺序 = 成员资格 → 组织者 → 活跃草稿 → 版本一致 → 草稿完整性（边界已存、两条路线齐备、**分组完整**），随后从草稿文档复算两条路线的时长与窗口；客户端声明不参与判定。拒绝时不改变 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE` 或 `SPLIT_TIMING_INFEASIBLE`；分组缺失项 SHALL 以 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate` 出现在 `error.details.missing`。成功 SHALL 在单一事务内将 `status` 置 `confirmed`（版本不变），路线对、分组与边界成对生效并锁定编辑（写端点 `409 SPLIT_DRAFT_NOT_ACTIVE`），响应返回草稿详情投影。

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

#### Scenario: 分组不完整无确认（CF8-N）

- **GIVEN** 边界与两条路线齐备，但 `groups.B` 为空；或夹具构造出成员漏分组 / 重复分组
- **WHEN** 组织者调用确认
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 恰含 `groups.B`、`groups.unassigned` 或 `groups.duplicate` 中对应项，不混入无关缺失项
- **AND** 不进入时间复算，草稿仍为 `active`，`draftVersion` 不变

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
- **THEN** 页面呈现两条路线卡（组标签、分组、活动/交通/buffer 分解、合计与窗口对比）、边界与窗口、校验结论与草稿状态徽标；A/B 组以成员名展示
- **AND** 组织者可见确认按钮，非组织者只见只读视图（permission 态）
- **AND** 若分组在路线生成之后被变更，页面 SHALL 显示与 Screen 13 相同的「分组已更新，路线仍为上次生成的版本」提示，不得让查看者把旧路线当作当前分组的结果
- **AND** 超窗 / 缺输入 / 不完整（含分组不完整）错误态按 `error.details` 渲染逐路线数值与缺失项（`groups.*` 映射为中文提示），已确认终态、loading 与 empty（无草稿）态均可观察
- **AND** 前端不自行宣布可确认（判定归后端）
