# Spec Delta

## MODIFIED Requirements

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