# splits Specification

## Purpose
能力 `splits`（B 拆分主链，US-038/039/042/043 + US-049/050 + US-040）：主线确认后，任一成员发起唯一拆分草稿（初始全员 A 组）→ 任意成员可把任意成员移到 A/B 组（分组须两组非空且成员恰好一次）→ 发起人成对选择拆分边界 → 成对生成路线（生成前校验分组完整性）→ 任意成员校验会合时间窗口 → 组织者成对确认（同样校验分组完整性，冻结为唯一拆分方案）或发起人取消草稿（放弃提案并允许替换）。硬约束 =「两组都能按时会合」：草稿唯一且版本可控、路线成对原子、校验覆盖每条路线全部交通段与 buffer，不可行或输入缺失拦住整对确认。

链级约定（各 requirement 共用）：

- 调用者身份取自认证会话（`POST /api/auth/login` 建立的 principal，`AccountPrincipal.id` = `app_user.id`）；`X-User-Id` / `X-Member-Id` 请求头不再用于认证（见 `trips` capability「Caller identity」）。场景中的 `X-User-Id: N` 仅作夹具简写，等价于「已登录 account N 的会话」。
- All endpoints SHALL validate identity, then trip existence, then membership: missing or globally unknown account returns `401 MEMBER_REQUIRED`; a known account with an unknown trip returns `404 TRIP_NOT_FOUND`; a known member of another trip returns `403 NOT_A_MEMBER`. Rejections return `data = null` and no private trip, draft or route values. Only authorized calls reach calculation.
- 响应统一 `{data,error}` 包封套；`error.code` 为稳定机器可读契约，`error.message` 为实现文本非契约；成功时 `error = null`。需要明细的拒绝 SHALL 在 `error.details` 携带对象（本期仅 `SPLIT_TIMING_INFEASIBLE` 与 `SPLIT_DRAFT_INCOMPLETE` 使用）；`details` 缺失不影响 `code` 的判定。
- 拆分草稿 = `split_draft` 表一行（`trip_id` UNIQUE），业务字段存 `document` JSON 列；主线与拆分路线结构存 `plan_node`（`branch_id` = `main` / `split-a` / `split-b`）。不新增表、不新增迁移（V4 为既有迁移）。
- 时间一律 TEXT（ISO-8601 UTC）；窗口与时长粒度 = 分钟（整数）。
- 「主线已确认」谓词 = `trip.main_plan_confirmed`（V3 列，0/1）。
- `draftVersion` 从 1 起，任何草稿变更（边界重选/路线重生成/取消后重建）+1；写操作携带版本条件更新，不符即 stale 拒绝。确认与取消 SHALL NOT 改变 `draftVersion`。
- 草稿状态机：`active`（可编辑/可确认/可取消）→ `confirmed`（冻结）／`cancelled`（终止，可被替换重建）；`cancelled → active` 仅限同行重建；`confirmed → *` 禁止。

## Requirements

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

Group A SHALL keep the confirmed itinerary: its candidate SHALL be derived from the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive), exposing ordered `RouteStep` entries (`name` + scheduled stay minutes); `activityMinutes` = sum of stays, `travelLegsMinutes` = scheduled gaps between consecutive stops (last gap ends at the reunion start), `bufferMinutes` = 0, so the total equals the window exactly. Group A's `activityName` SHALL join the first and last step names with ` → ` (a single step keeps its name) and its `locationName` SHALL be the first stop's real location, so the editable fields prefill real values instead of a placeholder.

Group B candidates SHALL come from the configured `BranchCandidateProvider`, selected like the main-plan AI provider: when `gogo.plan.ai.api-key` is present the `AiBranchCandidateProvider` runs while a blank key keeps the deterministic `FixtureBranchCandidateProvider`. The AI provider SHALL prompt a DeepSeek (OpenAI-compatible `/chat/completions`) call with the trip destination, the departure/reunion stop names and start times, the window minutes (reunion start − departure start) and the main-plan stop names inside the boundaries, all as data (never as instructions); the returned JSON SHALL be validated before persistence: 1–N named stops with non-negative integer stay minutes, travel legs count = stops + 1 (group B), every leg a non-negative integer, and the route total (stays + legs + 0 buffer) SHALL NOT exceed the window minutes. AI timeout, transport/HTTP failure, empty/non-JSON/invalid output, or an over-window total SHALL degrade to the deterministic fixture B candidate (log-only) without changing the response status or error code and without persisting partial AI output. The fixture B candidate SHALL remain a destination-keyed synthetic station (`steps` = a single activity, legs = 2) and its `locationName` SHALL be the trip destination.

Persisted route views and the draft document SHALL carry `steps` (nullable for old documents). A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`. After generation, any trip member SHALL be able to edit the pair through Split route pair edit; generation itself SHALL remain initiator-only.

While route generation is running the client SHALL show the reusable non-blocking notice “AI 正在生成中…” (`AiGeneratingNotice`, `role="status"`, `aria-live="polite"`) above the route cards, keep the generate button disabled until the request ends, and SHALL NOT block navigation or scrolling; the notice SHALL close when the request succeeds or fails, and failures continue to use the existing inline/`ErrorState` rendering.

> 规范性说明：本需求中的“必须/不得/应该”即 RFC 2119 的 **SHALL / MUST NOT / SHOULD**。

#### Scenario: 成对生成（G1）

- **GIVEN** 草稿含完整分组，边界 City Hall MRT 09:00 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存，均起于 City Hall MRT、终于 Merlion Park
- **AND** A 组活动名 = `City Hall MRT → Gardens by the Bay`、地点 = `City Hall MRT`：steps = City Hall MRT(30) / National Gallery Singapore(30) / Gardens by the Bay(15)，activity = 75，legs = [30, 30, 15]，buffer = 0
- **AND** 无 AI key 时 B 组为夹具活动：Gardens by the Bay，地点 = `Singapore`，steps = Gardens by the Bay(60)，activity = 60，legs = [20, 20]，buffer = 0
- **AND** draftVersion 递增；candidates come from replaceable `BranchCandidateProvider`（无 key 时无外部网络）
- **AND** routes 使用既有 `plan_node` split-a/split-b 行；结构化时长 JSON 含 `activityMinutes`、`travelLegsMinutes[]`、`bufferMinutes` 与 `steps[]`
- **AND** replacement deletes the old pair and inserts the new pair in one transaction, preserving main-plan rows

#### Scenario: A 组合计等于时间窗（G7）

- **GIVEN** 主线在边界之间按序排列且无重叠
- **WHEN** 生成路线
- **THEN** A 组 `activityMinutes + ΣtravelLegsMinutes + bufferMinutes` = `windowMinutes`
- **AND** A 组 `steps` 的名称与顺序 = 边界之间的主线站点

#### Scenario: AI 提供者生成 B 组窗口内分支（AI1）

- **GIVEN** 已配置 `gogo.plan.ai.api-key`，AI 提供者返回合法 JSON：steps = Gardens by the Bay(60)，legs = [15, 15]，总耗时 90 ≤ 窗口 150
- **WHEN** 发起人触发生成
- **THEN** 响应 `200`，A 组沿主线不变，B 组 `steps`/`activityMinutes`/`travelLegsMinutes` 采用 AI 返回值，`bufferMinutes` = 0，B 组 `locationName` = 行程目的地
- **AND** `activityName` = 首末站拼接、`locationName` = 首站名，`draftVersion` 递增

#### Scenario: B 组超窗被拦并降级（AI2-N）

- **GIVEN** 已配置 AI key，AI 返回总耗时 160 分钟（窗口 150）
- **WHEN** 发起人触发生成
- **THEN** 响应 `200`，B 组为确定性夹具候选（语义上视为无效 AI 输出，不产生新错误码/状态码）
- **AND** 不持久化任何 AI 产出片段，`plan_node` split-b 行与草稿文档 `routes` 为夹具 B 值

#### Scenario: AI 失败无感降级为夹具（AI3-N）

- **GIVEN** 已配置 AI key，但 AI 调用超时、返回非 2xx 或返回空白/非 JSON
- **WHEN** 发起人触发生成
- **THEN** 响应 `200` 且 B 组为夹具候选（失败仅 `log.warn`，不返回 AI 专属错误）
- **AND** A 组沿主线、`draftVersion` 照常递增，成对原子替换照常进行

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
- **AND** 无路线落库，不对 AI 发起调用

#### Scenario: 非发起人拒绝（G5-N）

- **WHEN** 非发起人成员触发生成
- **THEN** 响应 `403` 且 `error.code = NOT_SPLIT_INITIATOR`
- **AND** 无路线落库，不对 AI 发起调用

#### Scenario: 分组不完整时拒绝生成（G6-N）

- **WHEN** 草稿存在空组、未分组或重复分组成员
- **THEN** 响应 `409` 且 `error.code = SPLIT_DRAFT_INCOMPLETE`
- **AND** `error.details.missing` 按事实列出 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`
- **AND** `split-a` / `split-b` 行数为 0，draftVersion 不变，不对 AI 发起调用

#### Scenario: 生成期间显示 AI 进度提示（AI4）

- **GIVEN** 发起人在分组路线屏幕触发生成/重新生成
- **WHEN** `routes:generate` 请求仍在进行
- **THEN** 页面内可见常驻、非阻塞的“AI 正在生成中…”提示条，生成按钮保持禁用，页面其余内容仍可阅读
- **AND** 请求成功或失败后提示关闭，失败由现有行内/`ErrorState` 展示，不引入新的错误面

#### Scenario: 路线卡内联编辑与终态只读（S1）

- **GIVEN** 草稿为 `active` 且已生成 A/B 两条路线
- **WHEN** 任一成员打开分组路线屏幕
- **THEN** A/B 两组均以站点列表编辑（站名 + 停留分钟，可添加/删除站点）；A 组每站后一段路程，B 组含首站去程与末站回程；不再提供活动名/地点/缓冲输入
- **AND** 路程逐段标注为「路程」，A/B 预览按地点与路程交替展示
- **AND** 站点名称展示与保存时去除「主线·」前缀；新增站点留空并以「新站点」占位提示；每行默认只读，右侧铅笔图标进入编辑
- **AND** 草稿为 `confirmed` 或 `cancelled` 时同样字段只读，且不出现「下一步」动作
- **AND** 前端不自行判定路线合法性或时间可行性（判定归后端）

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **WHEN** 任一成员打开分组路线屏幕
- **THEN** 页面呈现分组卡与成对路线卡；A/B 卡均为站点列表（站名 + 停留分钟），可添加/删除站点
- **AND** 路线卡字段按 S1 可编辑；「下一步」在保存/校验进行中禁用重复点击；生成按钮在请求进行中禁用
- **AND** 每张路线卡显示「合计 X 分 / 窗口 Y 分」；路程逐段显示为「路程」，不合并为单一总数；超窗在表头标红并提示回边界页把会合站后移或下调站点/路程分钟
- **AND** 顶部显示时间窗与「由所选出发/会合站决定」的说明
- **AND** 已生成路线在成员改组后仍原样呈现并提示需重新生成；终态路线只读；判定归后端

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

- **GIVEN** 草稿 `active`，成员修改了 A 组某站停留或 B 组时长且本地值已变更
- **WHEN** 成员点击「下一步」
- **THEN** 系统先调用 Split route pair edit 保存，`draftVersion + 1`
- **AND** 随后以保存后的两条路线（A 由 `steps` 派生合计）与 `windowMinutes` 调用 check-timing
- **AND** `feasible=true` 时导航到 `/trips/{tripId}/split/preview`

#### Scenario: 无改动继续跳过保存（N2）

- **GIVEN** 本地路线值与草稿快照一致
- **WHEN** 成员点击「下一步」
- **THEN** 系统不调用保存端点，`draftVersion` 不变
- **AND** 直接调用 check-timing，并按结果进入预览或弹窗

#### Scenario: A 组编辑超过时间窗被拦（N3a）

- **GIVEN** A 组编辑后合计为 160 分、窗口 150 分
- **WHEN** 成员点击「下一步」并完成校验
- **THEN** 响应 `200` 且 `feasible=false`，A 项 `totalMinutes=160`、`overrunMinutes=10`
- **AND** 弹窗提示 A 组超窗 10 分并停留在第 2 步，不进入预览
- **AND** 已保存的编辑值保留

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
- **AND** 复用队伍路线图展示主线、分头、A/B 分支、会合与暂停段；A/B 均按站点列表展开，路程与地点交替成节点（A 从首站开始、逐站后接路程；B 首站前为去程、末站后为回程），每段标注「路程」与分钟数，不合并展示；地点为空或等于活动名时不重复显示
- **AND** 页面只读，底部「前往复核并确认」进入 `/split/confirm`，返回目标为第 2 步
- **AND** loading / error / 无草稿 / 无路线对 / 终态只读态均可观察

#### Scenario: 窗口校验屏幕展示契约（Screen 14）

- **WHEN** 成员在第 2 步点击「下一步」并完成校验
- **THEN** 页面不再渲染可编辑校验表单；可行时进入 Screen 13b 预览，不可行时以弹窗呈现 A/B 组合计、时间窗、超窗与缺失项三态
- **AND** 直接访问旧 `/trips/{tripId}/split/timing` 时重定向到 `/split/preview`
- **AND** loading / empty / permission 态可观察；前端不自行宣布可行

### Requirement: Split draft detail read

The system SHALL expose member-only `GET /api/trips/{tripId}/split-draft` using the shared identity guards and `{data,error}` envelope. It SHALL return a consistent saved draft snapshot with versions, status, groups, selectable main-plan stops, boundaries, window, route pair and the trip `destination`. Each route view SHALL include `groupLabel`, `activityName`, additive nullable `locationName`, boundary ids, `activityMinutes`, `travelLegsMinutes[]`, `bufferMinutes` and nullable `steps[]` (group A carries its main-plan or edited steps). An existing trip without any draft row SHALL return 200 with `data=null`. Reads SHALL NOT mutate the draft, routes or versions, and SHALL NOT require initiator status.

#### Scenario: Member reloads the saved draft and routes (D1)

- **WHEN** member refreshes the draft page after boundaries and routes are saved
- **THEN** response is 200 with `error=null`; `data` contains versions, status, groups, timestamps, `mainPlanStops`, boundary ids/times, `windowMinutes`, `routes` and `destination`
- **AND** boundaries yield window = reunion start − departure start (150 for City Hall → Merlion); routes expose `steps`, `locationName` for group A and B's activity breakdown
- **AND** before boundary selection boundary ids/times/window are null; before generation `routes=[]`
- **AND** no version is incremented

#### Scenario: 旧草稿地点回填活动名（S7）

- **GIVEN** 路线由生成接口写入，`plan_node.location_name` 被回填为活动名
- **WHEN** 成员读取草稿详情
- **THEN** 该路线的 `locationName` 等于 `activityName`
- **AND** 展示层在两者相等或 `locationName` 为空时不重复渲染地点行，保存后以用户输入值为准

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

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:confirm`（认证会话，body 含 `draftVersion`），仅允许行程组织者确认当前活跃草稿。校验顺序 = 成员资格 → 组织者 → 活跃草稿 → 版本一致 → 草稿完整性（边界已存、两条路线齐备、分组完整），随后从草稿文档复算两条路线的时长与新窗口（会合开始 − 出发开始）；客户端声明不参与判定。拒绝时不改变 `status` 与 `draftVersion`，按缺失/不可行返回 `SPLIT_DRAFT_INCOMPLETE` 或 `SPLIT_TIMING_INFEASIBLE`。成功 SHALL 在单一事务内将 `status` 置 `confirmed`（版本不变），路线对、分组与边界成对生效并锁定编辑，响应返回草稿详情投影。复核屏 SHALL 以队伍路线预览为返回目标，且确认复算 SHALL 使用最近一次保存的编辑后路线。

#### Scenario: 组织者确认成功并锁定（CF1）

- **GIVEN** 活跃草稿为版本 3（发起 1 → 保存边界 2 → 生成路线 3），两组齐全互斥，边界已保存，路线对 A = 75+30+30+15+0 = 150、B = 60+20+20+0 = 100（窗口 150）
- **WHEN** 组织者携带 `draftVersion: 3` 调用确认
- **THEN** 响应 `200`，`data.status = confirmed`，`data.draftVersion = 3`
- **AND** 之后边界保存与路线生成均返回 `409 SPLIT_DRAFT_NOT_ACTIVE`

#### Scenario: 编辑后确认按新路线复算（CF9）

- **GIVEN** 成员通过 Split route pair edit 保存了修改后的 A `steps` 与 B 分解（版本 4），复算仍可行
- **WHEN** 组织者携带 `draftVersion: 4` 确认
- **THEN** 响应 `200`，`data.status = confirmed`，确认使用编辑后的派生合计
- **AND** 若编辑值不可行，同样返回 `409 SPLIT_TIMING_INFEASIBLE` 且 `error.details.routes` 反映编辑后的合计与超窗

#### Scenario: 超窗拦住整对确认（CF2-N）

- **GIVEN** 客户端声明可确认，但 A 路线末段交通被改为 80 分钟（A = 215），窗口 150
- **THEN** 响应 `409` 且 `error.code = SPLIT_TIMING_INFEASIBLE`，`status` 与版本不变
- **AND** `error.details.routes` 为长度 2 的数组：A 项 `totalMinutes = 215`、`overrunMinutes = 65`；B 项 `totalMinutes = 100`、`overrunMinutes = 0`

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
- **THEN** 页面显示边界时间窗、分组、每条路线分解与状态；A 组按编辑后的 `steps` 展示；确认由服务端复算，客户端不宣布可行性
- **AND** 失败明细来自 `error.details`；终态只读；返回目标为 `/split/preview`

### Requirement: Split draft cancellation

系统 SHALL 提供 `POST /api/trips/{tripId}/split-draft:cancel`（认证会话，body 含 `draftVersion`），仅允许草稿发起人取消当前活跃草稿。成功 SHALL 在单一事务内将 `status` 置 `cancelled`、清空 `document.routes`（版本不变）并删除该行程 `split-a`/`split-b` 的 `plan_node` 行；`main` 节点逐行不变。版本不符 SHALL 以 stale 拒绝；已确认草稿不可取消。取消后 SHALL 允许替换：`POST split-draft` 以调用者为新发起人在同一行重建（`draftVersion = 1`、`status = active`、边界与路线为空，列版本同步为 1）。响应返回草稿详情投影且 `routes = []`。

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

### Requirement: Split route pair edit

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/routes` 整对保存路线：仅 `active`、任意成员。A/B 均为有序站点列表（站名+停留分钟）；A 每站后一段路程（legs=站点数），B 含去程/回程（legs=站点数+1）。服务端派生 activity=停留之和、buffer=0、活动名=首末站拼接、地点=首站名，并写入 `routes.steps`。SHALL 单事务更新 split-a/b 的 `plan_node.title`/`location_name` 与 `routes` 并 `draftVersion+1`，失败回滚。错误码与成功形状由场景约束；不改 groups/边界/main，生成仍仅发起人。

#### Scenario: 任意成员保存整对路线（S2）

- **GIVEN** 活跃草稿已生成 A/B 两条路线，成员 Ben（非发起人）打开第 2 步
- **WHEN** Ben 提交 `draftVersion`、A/B 两组的站点列表（站名 + 停留分钟）与各自路程分钟
- **THEN** 响应 `200`，`data.draftVersion` 比提交值大 1，`data.routes` 返回更新后的两条 `GroupRoute`
- **AND** 两组的活动名 = 首末站拼接、地点 = 首站名，`activityMinutes` = 停留之和，`bufferMinutes` = 0，`steps` 原样落库
- **AND** A 组路段数 = 站点数，B 组路段数 = 站点数 + 1
- **AND** `GET /api/trips/{tripId}/split-draft` 返回新的活动名、`locationName`、`steps` 与时长
- **AND** `plan_node` 的 split-a/split-b `title`、`location_name` 与文档 `routes`、`updated_at` 在同一事务内更新
- **AND** `groups`、边界、main 节点与 `status` 不变

#### Scenario: A 组站点编辑派生合计（S2b）

- **GIVEN** A 组原 `steps` = City Hall MRT(30) / National Gallery(30) / Gardens by the Bay(15)，legs = [30,30,15]
- **WHEN** 成员把 National Gallery 停留改为 20 分钟并保存
- **THEN** A 组 `activityMinutes` = 65、`travelLegsMinutes` 保持 3 段、`bufferMinutes` = 0
- **AND** 保存响应与后续 `GET split-draft` 的 `steps`/分钟一致，前端不自行改写派生值

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

- **WHEN** 请求路线数不为 2、组别重复或非 A/B、站名为空、分钟为负或非整数、A 组路段数≠站点数、或 B 组路段数≠站点数+1
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
