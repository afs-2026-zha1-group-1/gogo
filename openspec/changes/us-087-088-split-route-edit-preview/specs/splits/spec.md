# Splits — US-087-088 delta

## ADDED Requirements

### Requirement: Split route pair edit

系统 SHALL 提供 `PUT /api/trips/{tripId}/split-draft/routes` 整对保存路线：仅 `active` 草稿、任意成员可写。A 组提交有序停留分钟（站名沿用主线，只读）与各段路程分钟，B 组提交单一活动分解；服务端按 A 的 `steps` 派生活动/路程合计并写入文档 `routes.steps`。SHALL 单事务更新 split-a/split-b 的 `plan_node.title`/`location_name` 与文档 `routes` 并 `draftVersion+1`，失败回滚。错误码：`SPLIT_DRAFT_INCOMPLETE`（无路线）、`STALE_DRAFT_VERSION`、`SPLIT_DRAFT_NOT_ACTIVE`、`INVALID_ROUTE_PAIR`、`INVALID_GROUP_LABEL`、`INVALID_ROUTE_INPUT`。成功返回 200 `{draftVersion,routes[]}`；不改 groups/边界/main，生成仍仅发起人。

#### Scenario: 任意成员保存整对路线（S2）

- **GIVEN** 活跃草稿已生成 A/B 两条路线，成员 Ben（非发起人）打开第 2 步
- **WHEN** Ben 提交 `draftVersion`、A 组各站停留分钟与各段路程、B 组活动名/地点/三项分钟
- **THEN** 响应 `200`，`data.draftVersion` 比提交值大 1，`data.routes` 返回更新后的两条 `GroupRoute`
- **AND** A 组的站名沿用主线顺序，`activityMinutes`/`travelLegsMinutes` 由停留分钟与路段派生，`steps` 原样落库
- **AND** `GET /api/trips/{tripId}/split-draft` 返回新的活动名、`locationName`、`steps` 与时长
- **AND** `plan_node` 的 split-a/split-b `title`、`location_name` 与文档 `routes`、`updated_at` 在同一事务内更新
- **AND** `groups`、边界、main 节点与 `status` 不变

#### Scenario: A 组站点编辑派生合计（S2b）

- **GIVEN** A 组原 `steps` = City Hall MRT(30) / National Gallery(30) / Gardens by the Bay(15)，legs = [30,30,15]
- **WHEN** 成员把 National Gallery 停留改为 20 分钟并保存
- **THEN** A 组 `activityMinutes` = 70、`travelLegsMinutes` 保持 3 段、`bufferMinutes` = 0
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

- **WHEN** 请求路线数不为 2、组别重复或非 A/B、活动名为空、分钟为负或非整数、A 组路段数与站点数不一致、或 B 组路程段数与既有不一致
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

The system SHALL expose `POST /api/trips/{tripId}/split-draft/routes:generate` with `draftVersion` for the initiator after boundaries are saved and while the draft is `active`. Before generating, it SHALL require a complete group partition: both `groups.A` and `groups.B` non-empty, every current trip member assigned exactly once; incomplete partitions SHALL be rejected with `409 SPLIT_DRAFT_INCOMPLETE` and `error.details.missing`. When complete, it SHALL atomically replace both group routes, preserve main-plan rows, increment the version on success, roll back on failure, and reject stale results without overwriting newer state.

Group A SHALL keep the confirmed itinerary: its candidate SHALL be derived from the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive), exposing ordered `RouteStep` entries (`name` + scheduled stay minutes); `activityMinutes` = sum of stays, `travelLegsMinutes` = scheduled gaps between consecutive stops (last gap ends at the reunion start), `bufferMinutes` = 0, so the total equals the window exactly. Group A's `activityName` SHALL join the first and last step names with ` → ` (a single step keeps its name) and its `locationName` SHALL be the first stop's real location, so the editable fields prefill real values instead of a placeholder. Group B SHALL keep a destination-keyed synthetic activity with empty `steps` and its `locationName` SHALL be the trip destination. Persisted route views and the draft document SHALL carry `steps` (nullable for old documents). A `confirmed` or `cancelled` draft SHALL be rejected with `SPLIT_DRAFT_NOT_ACTIVE`. After generation, any trip member SHALL be able to edit the pair through Split route pair edit; generation itself SHALL remain initiator-only.

#### Scenario: 成对生成（G1）

- **GIVEN** 草稿含完整分组，边界 City Hall MRT 09:00 → Merlion Park 11:30，发起人携带当前 draftVersion 触发
- **THEN** 响应 `200`，恰好两条路线成对保存，均起于 City Hall MRT、终于 Merlion Park
- **AND** A 组活动名 = `City Hall MRT → Gardens by the Bay`、地点 = `City Hall MRT`：steps = City Hall MRT(30) / National Gallery Singapore(30) / Gardens by the Bay(15)，activity = 75，legs = [30, 30, 15]，buffer = 0
- **AND** B 组为夹具活动：Gardens by the Bay，地点 = `Singapore`，activity = 60，legs = [20, 20]，buffer = 10
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

#### Scenario: 路线卡内联编辑与终态只读（S1）

- **GIVEN** 草稿为 `active` 且已生成 A/B 两条路线
- **WHEN** 任一成员打开分组路线屏幕
- **THEN** A 组卡按 `steps` 逐站提供停留分钟与各段路程分钟编辑（站名只读，沿用主线）；路程按“去程 / 回程”标注，多站时中间段标注“段间 N”；B 组卡提供活动名、地点、活动/路程/缓冲分钟编辑（去程 / 回程）
- **AND** 草稿为 `confirmed` 或 `cancelled` 时同样字段只读，且不出现「下一步」动作
- **AND** 前端不自行判定路线合法性或时间可行性（判定归后端）

#### Scenario: 分组路线屏幕展示契约（Screen 13）

- **WHEN** 任一成员打开分组路线屏幕
- **THEN** 页面呈现分组卡与成对路线卡；A 组卡按 `steps` 逐站显示（站名 + 分钟），B 组卡显示单一活动分解
- **AND** 路线卡字段按 S1 可编辑；「下一步」在保存/校验进行中禁用重复点击
- **AND** 每张路线卡显示「合计 X 分 / 窗口 Y 分」；路程逐段显示为“去程 / 段间 N / 回程”，不合并为单一总数；超窗在表头标红并提示回边界页把会合站后移或下调站点/路程分钟
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
- **AND** 复用队伍路线图展示主线、分头、A/B 分支、会合与暂停段；A 组节点按编辑后的 `steps` 展开，B 组显示活动分解；每段路程单独成节点并标注“去程 / 段间 N / 回程”与各自分钟数，不合并展示；地点为空或等于活动名时不重复显示
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

- **GIVEN** 活跃草稿为版本 3（发起 1 → 保存边界 2 → 生成路线 3），两组齐全互斥，边界已保存，路线对 A = 75+30+30+15+0 = 150、B = 60+20+20+10 = 110（窗口 150）
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
- **THEN** 页面显示边界时间窗、分组、每条路线分解与状态；A 组按编辑后的 `steps` 展示；确认由服务端复算，客户端不宣布可行性
- **AND** 失败明细来自 `error.details`；终态只读；返回目标为 `/split/preview`

## REMOVED Requirements

*(none)*
