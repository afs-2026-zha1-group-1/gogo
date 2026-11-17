# Splits — US-087-088 delta

## ADDED Requirements

### Requirement: Split route pair edit

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/routes` 整对保存路线：仅 `active` 草稿、任意成员可写，body 含 `draftVersion` 与两条路线（组别、活动名、地点、活动/路程/缓冲分钟）。SHALL 单事务更新 split-a/split-b 的 `plan_node.title`/`location_name` 与文档 `routes` 并 `draftVersion+1`，失败回滚。错误码：`SPLIT_DRAFT_INCOMPLETE`（无路线）、`STALE_DRAFT_VERSION`、`SPLIT_DRAFT_NOT_ACTIVE`、`INVALID_ROUTE_PAIR`、`INVALID_GROUP_LABEL`、`INVALID_ROUTE_INPUT`。成功返回 200 `{draftVersion,routes[]}`；不改 groups/边界/main，生成仍仅发起人。

#### Scenario: 任意成员保存整对路线（S2）

- **GIVEN** 活跃草稿已生成 A/B 两条路线，成员 Ben（非发起人）打开第 2 步
- **WHEN** Ben 提交 `draftVersion` 与两条修改后的路线（活动名、地点、活动/路程/缓冲分钟）
- **THEN** 响应 `200`，`data.draftVersion` 比提交值大 1，`data.routes` 返回两条更新后的 `GroupRoute`
- **AND** `GET /api/trips/{tripId}/split-draft` 返回新的活动名、`locationName` 与时长
- **AND** `plan_node` 中 `branch_id = split-a/split-b` 的 `title`、`location_name` 与草稿文档 `routes`、`updated_at` 在同一事务内更新
- **AND** `groups`、`departureStopId`/`reunionStopId`、main 节点与 `status` 不变

#### Scenario: 过期版本拒绝且不部分写入（S3）

- **GIVEN** 草稿当前版本为 4
- **WHEN** 请求携带 `draftVersion: 3`
- **THEN** 响应 `409` 且 `error.code = STALE_DRAFT_VERSION`
- **AND** `plan_node` 的 split 行与草稿文档 `routes` 均保持原值

#### Scenario: 尚未生成路线时拒绝保存（S4）

- **GIVEN** 活跃草稿已保存边界但 `routes` 为空
- **WHEN** 成员提交路线编辑
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 含 `routes.A` 与 `routes.B`
- **AND** 无任何写入

#### Scenario: 非法输入拒绝（S5）

- **WHEN** 请求路线数不为 2、组别重复或非 A/B、活动名为空、分钟为负或非整数、或路程段数与既有不一致
- **THEN** 响应 `400`，按事实返回 `INVALID_ROUTE_PAIR`、`INVALID_GROUP_LABEL` 或 `INVALID_ROUTE_INPUT`
- **AND** `plan_node` 与文档 `routes` 均无写入

#### Scenario: 终态草稿拒绝保存（S6）

- **GIVEN** 草稿状态为 `confirmed` 或 `cancelled`
- **WHEN** 成员提交路线编辑
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_NOT_ACTIVE`
- **AND** 终态数据不变

#### Scenario: 非成员或未登录拒绝保存（S8）

- **WHEN** Eve（非成员）或未认证会话调用保存
- **THEN** 分别响应 `403 NOT_A_MEMBER` 或 `401 MEMBER_REQUIRED`，`data = null`
- **AND** 不返回草稿或路线私有值

## MODIFIED Requirements

### Requirement: Group route generation

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate` with `draftVersion` for the initiator after boundaries are saved and while the draft is `active`. Before generating, it SHALL require a complete group partition: both `groups.A` and `groups.B` non-empty, every current trip member assigned exactly once. An incomplete partition SHALL be rejected with `409 SPLIT_DRAFT_INCOMPLETE` and `error.details.missing` listing `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate` as applicable, with no route rows written and no version change. When complete, it SHALL atomically replace both group routes using fixed in-process candidates, preserve main-plan rows, increment the version on success, roll back on failure, and reject stale results without overwriting newer state. Routes SHALL be generated for the current `groups` keys (A/B) regardless of membership changes since the last generation. Each saved route SHALL bind to a group label only and SHALL NOT carry member ids; a later group change SHALL NOT invalidate, rewrite or delete the saved pair. A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`. After generation, any trip member SHALL be able to edit the saved pair through Split route pair edit; generation itself SHALL remain initiator-only.

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

#### Scenario: 路线卡内联编辑与终态只读（S1）

- **GIVEN** 草稿为 `active` 且已生成 A/B 两条路线
- **WHEN** 任一成员打开分组路线屏幕
- **THEN** 两张路线卡的活动名称、地点、活动分钟、每段路程分钟与缓冲分钟均为可编辑控件
- **AND** 草稿为 `confirmed` 或 `cancelled` 时同样字段只读，且不出现「下一步」动作
- **AND** 前端不自行判定路线合法性或时间可行性（判定归后端）

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **GIVEN** 发起人或任一成员打开分组路线屏幕（草稿 active，可能尚无路线）
- **WHEN** 草稿读取返回
- **THEN** 页面呈现分组卡（A/B 组人数与成员名、「我」标记、切组控件）与成对路线卡（组标签、活动名、地点、起终点、时长/交通/buffer 分解）
- **AND** 路线卡字段按 S1 可编辑；「下一步」在保存/校验进行中禁用重复点击
- **AND** 已生成路线在成员改组后仍原样呈现，并提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」
- **AND** 任一组被搬空且仍留有旧路线时，该组路线卡标注「需重新生成」，且不得暗示可直接确认
- **AND** 分组不完整 / 无边界 / 失败 / 过期错误态与 loading / empty / permission 态均可观察；非发起人的「重新生成」不可用
- **AND** 前端不自行判定分组完整性或路线合法性（判定归后端）

### Requirement: Reunion timing check

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:check-timing` for trip members. The entry guard MAY read identity, trip and membership data. The calculator SHALL use only the supplied window and two-route snapshot, with no repository access or persistence. It SHALL report totals, overruns and missing inputs; return 200 with pair `feasible=false` for overruns or missing inputs; and reject an empty snapshot or route count other than two with 400 `INVALID_ROUTE_PAIR`. The step-2 Next action SHALL first save dirty route edits through Split route pair edit, then call this endpoint with the saved pair; when `feasible=false` the client SHALL stay on step 2 and show a dialog with the per-route totals, window, overruns and missing inputs, and SHALL NOT navigate. On `feasible=true` it SHALL navigate to the read-only team-route preview. The confirmation endpoint SHALL reuse the same calculation domain over the saved draft document rather than this endpoint's response.

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

#### Scenario: 下一步先保存后校验并通过（N1）

- **GIVEN** 草稿 `active`，成员修改了 A 组活动时长且本地值已变更
- **WHEN** 成员点击「下一步」
- **THEN** 系统先调用 Split route pair edit 保存，`draftVersion + 1`
- **AND** 随后以保存后的两条路线与 `windowMinutes` 调用 check-timing
- **AND** `feasible=true` 时导航到 `/trips/{tripId}/split/preview`

#### Scenario: 无改动继续跳过保存（N2）

- **GIVEN** 本地路线值与草稿快照一致
- **WHEN** 成员点击「下一步」
- **THEN** 系统不调用保存端点，`draftVersion` 不变
- **AND** 直接调用 check-timing，并按结果进入预览或弹窗

#### Scenario: 校验不可行弹窗阻断（N3）

- **GIVEN** 保存成功但 check-timing 返回 `feasible=false`（超窗或缺输入）
- **WHEN** 下一步校验完成
- **THEN** 页面停留在第 2 步，并弹窗显示判定结论、A/B 组各自合计分钟、时间窗分钟、超窗分钟与缺失输入项
- **AND** 弹窗仅提供「关闭」，不自动跳转；关闭后可修正并重试
- **AND** 已保存的草稿不回滚

#### Scenario: 保存或校验请求失败不跳转（N4-N）

- **WHEN** 保存请求或 check-timing 请求返回 4xx/5xx 或网络失败
- **THEN** 页面显示错误提示并保留当前输入，不导航到预览
- **AND** 若为 `STALE_DRAFT_VERSION`，提示重新拉取草稿；不将草稿视为已确认

#### Scenario: 队伍路线预览展示契约（Screen 13b）

- **GIVEN** 第 2 步校验通过
- **WHEN** 成员进入 `/trips/{tripId}/split/preview`
- **THEN** 页面标题为「队伍路线预览」、副标题为「校验通过 · 只读预览」，顶部显示 A 组 / B 组人数徽标
- **AND** 复用队伍路线图展示主线、分头、A/B 分支、会合与暂停段，分支显示活动·路程·缓冲时长与地点（地点为空或等于活动名时不重复显示）
- **AND** 页面只读，底部「前往复核并确认」进入 `/split/confirm`，返回目标为第 2 步
- **AND** loading / error / 无草稿 / 无路线对 / 终态只读态均可观察

#### Scenario: 窗口校验屏幕展示契约（Screen 14）

- **WHEN** 成员在第 2 步点击「下一步」并完成校验
- **THEN** 页面不再渲染可编辑校验表单；可行时进入 Screen 13b 预览，不可行时以弹窗呈现 A/B 组活动/交通/buffer 合计、时间窗、超窗与缺失项三态
- **AND** 直接访问旧 `/trips/{tripId}/split/timing` 时重定向到 `/split/preview`
- **AND** loading / empty / permission 态可观察；前端不自行宣布可行

### Requirement: Split draft detail read

The system SHALL expose member-only `GET /api/trips/{tripId}/split-draft` using the shared identity guards (authenticated session) and `{data,error}` envelope. It SHALL return a consistent saved draft snapshot with versions, status, groups, selectable main-plan stops, boundaries, window and route pair, including `confirmed` and `cancelled` drafts. Each route view SHALL include an additive nullable `locationName` read from `plan_node.location_name`. An existing trip without any draft row SHALL return 200 with `data=null` and `error=null`. Reads SHALL NOT mutate the draft, routes or versions, and SHALL NOT require initiator status.

#### Scenario: Member reloads the saved draft and routes (D1)

- **WHEN** member Chloe refreshes the draft page after Ben saves boundaries and generates both routes, then requests the draft detail endpoint
- **THEN** response is 200 with `error=null`; `data` contains `initiatorMemberId`, `mainPlanVersion`, `draftVersion`, `status`, `groups`, `createdAt`, `updatedAt`, `mainPlanStops`, `departureStopId`, `reunionStopId`, `departureAt`, `reunionAt`, `windowMinutes` and `routes`
- **AND** stops belong to the draft's main-plan version with id, name, start/end timestamps; boundaries yield window 120 and routes contain A/B groups, activity names, `locationName`, departure/reunion stops and `activityMinutes`, `travelLegsMinutes[]`, `bufferMinutes`, sufficient to build the timing snapshot without client guesses
- **AND** before boundary selection boundary ids/times/window are null; before generation `routes=[]`; otherwise saved boundary and pair values are returned
- **AND** all fields describe one consistent saved state; no version is incremented

#### Scenario: 旧草稿地点回填活动名（S7）

- **GIVEN** 路线由生成接口写入，`plan_node.location_name` 被回填为活动名
- **WHEN** 成员读取草稿详情
- **THEN** 该路线的 `locationName` 等于 `activityName`
- **AND** 展示层在两者相等或 `locationName` 为空时不重复渲染地点行，保存后以用户输入值为准

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

- **WHEN** a detail request has no authenticated session
- **THEN** response is 401 with `error.code=MEMBER_REQUIRED` and `data=null`
- **AND** no trip, draft or route values are returned

#### Scenario: Known member requests an unknown trip (D5-N)

- **WHEN** a known member requests detail with a trip id that does not exist
- **THEN** response is 404 with `error.code=TRIP_NOT_FOUND` and `data=null`
- **AND** no draft is created and no data or version changes

### Requirement: Split confirmation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:confirm`（认证会话，body 含 `draftVersion`），仅允许行程组织者确认当前活跃草稿。校验顺序 = 成员资格 → 组织者 → 活跃草稿 → 版本一致 → 草稿完整性（边界已存、两条路线齐备、**分组完整**），随后从草稿文档复算两条路线的时长与窗口；客户端声明不参与判定。拒绝时不改变 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE` 或 `SPLIT_TIMING_INFEASIBLE`；分组缺失项 SHALL 以 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate` 出现在 `error.details.missing`。成功 SHALL 在单一事务内将 `status` 置 `confirmed`（版本不变），路线对、分组与边界成对生效并锁定编辑（写端点 `409 SPLIT_DRAFT_NOT_ACTIVE`），响应返回草稿详情投影。复核屏 SHALL 以队伍路线预览为返回目标，且确认复算 SHALL 使用最近一次保存的编辑后路线。

#### Scenario: 组织者确认成功并锁定（CF1）

- **GIVEN** 活跃草稿为版本 3（发起 1 → 保存边界 2 → 生成路线 3），两组齐全互斥，边界已保存，路线对 A = 15+60+20+10 = 105、B = 20+60+20+10 = 110（窗口 120）
- **WHEN** 组织者 Alice（`X-User-Id: 1`）携带 `draftVersion: 3` 调用确认
- **THEN** 响应 `200`，`data.status = confirmed`，`data.draftVersion = 3`
- **AND** 再次读取草稿详情返回同一 `status = confirmed`
- **AND** 之后的 `PUT .../boundaries` 与 `POST .../routes:generate` 均返回 `409 SPLIT_DRAFT_NOT_ACTIVE`

#### Scenario: 编辑后确认按新路线复算（CF9）

- **GIVEN** 成员通过 Split route pair edit 保存了修改后的活动名/地点/时长（版本 4），复算仍可行
- **WHEN** 组织者携带 `draftVersion: 4` 确认
- **THEN** 响应 `200`，`data.status = confirmed`，确认使用编辑后的路线值
- **AND** 若编辑值不可行，同样返回 `409 SPLIT_TIMING_INFEASIBLE` 且 `error.details.routes` 反映编辑后的合计与超窗

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
- **THEN** 页面呈现两条路线卡（组标签、分组、活动/地点/交通/buffer 分解、合计与窗口对比）、边界与窗口、校验结论与草稿状态徽标；A/B 组以成员名展示
- **AND** 组织者可见确认按钮，非组织者只见只读视图（permission 态）
- **AND** 若分组在路线生成之后被变更，页面 SHALL 显示与 Screen 13 相同的「分组已更新，路线仍为上次生成的版本」提示，不得让查看者把旧路线当作当前分组的结果
- **AND** 超窗 / 缺输入 / 不完整（含分组不完整）错误态按 `error.details` 渲染逐路线数值与缺失项（`groups.*` 映射为中文提示），已确认终态、loading 与 empty（无草稿）态均可观察
- **AND** 返回目标为 `/split/preview`，前端不自行宣布可确认（判定归后端）

## REMOVED Requirements

*(none)*
