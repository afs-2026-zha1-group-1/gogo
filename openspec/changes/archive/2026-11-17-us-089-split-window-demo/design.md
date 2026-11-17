# Design — us-089-split-window-demo

- 依据：`proposal.md`、`specs/splits/spec.md`、`specs/trips/spec.md`、`requirement-workspace/requirements/US-089.md`
- 基线：`group1/main` `0bf699c`（含 US-040 成员分组与 `MainPlanProjection`）

## DD1 窗口口径改为「会合开始 − 出发开始」

- `SplitDraftService` 的四处窗口引用统一改为 `departure.startAt()`：`saveBoundaries`、`generateRoutes` 的 split 节点起点、`getDraftDetail.departureAt`、`confirmDraft` 的 `windowMinutes` 复算。
- `PlanStop` 的 javadoc 同步；`BoundaryResponse.departureAt` 语义 = 出发站开始时刻。
- 兼容性：不需要迁移；已存在的 confirmed 草稿仍按存储边界展示（读侧不重算确认状态）。

## DD2 保存边界即作废旧路线（单事务）

- `SplitDraftDocument.withBoundaries` 将 `routes` 置 `null`。
- `saveBoundaries` 用 `TransactionTemplate` 包住「版本条件更新 + 删除 split-a/b 节点」，避免“新边界 + 旧路线”。
- 失败（stale）整体回滚；拒绝路径不触碰既有边界/路线。

## DD3 A 组沿主线（RouteStep）

- 领域新增 `RouteStep(name, minutes)`；`RouteCandidate`、`SplitDraftDocument.RouteDurations`、`GroupRoute` 增加 nullable `steps`。
- `FixtureBranchCandidateProvider.candidateFor(groupLabel, departure, reunion, destination, mainPlanStops)`：
  - A：取 `[departureIndex, reunionIndex)` 的主线站点；`steps` = 站点名 + `endAt-startAt`；`activityMinutes` = Σsteps；`travelLegsMinutes` = 相邻站 `next.start − current.end`（末段到会合开始）；`bufferMinutes = 0`；`activityName = "沿主线方案"`。
  - B：保留按目的地夹具（香港/伦敦/新加坡），`steps = []`。
- 该实现的合计恒等于窗口（可由时间差望远镜求和验证），并新增单测覆盖。

## DD4 服务与持久化

- `generateRoutes` 一次性读取 `findMainPlanStops(tripId, version)` 传入 provider；生成响应与草稿文档携带 `steps`。
- `getDraftDetail` 从草稿文档读取 `steps`，并新增 `destination`；`plan_node` split 行仍只存活动名（A 存“沿主线方案”）。
- 旧草稿 JSON 无 `steps` 字段 → 反序列化为 null；前端以 `steps?.length` 判定是否展开，向后兼容。

## DD5 边界页交互

- 出发/会合 chip 均显示 `startAt`；按站点顺序禁用非法组合（会合必须在出发之后）；已选项再点取消。
- “下一步”：当前选择与已保存不一致时先 `mutateAsync` 保存，再跳转；失败留在本页展示错误。
- 文案提示未保存状态与旧路线作废。

## DD6 路线展示

- `RouteCard`：有 steps 时逐站显示（站名 + 分钟），保留路程/缓冲/合计；右上角显示“合计/超窗”（stale 优先）。
- `screen-routes`：顶部显示时间窗（出发→会合，共 N 分钟）与来源说明；检测任一组合计超窗时提示回边界页后移会合站。
- `graph-model.buildGraphRows`：有 steps 时每个 step 生成一个分支节点。

## DD7 行程详情个人路线

- `derivePersonalRoute`：若我的组路线带 `steps`，用 `mainPlanStops[departureIndex, reunionIndex)` 填充分头→会合段（真实时刻、`groupLabel = 我的组`），`before = [0, departureIndex)`，`after = [reunionIndex, end]`；否则维持既有“生成活动居中”逻辑。
- 未确认/已取消仍回退主线方案。

## DD8 目的地时区与币种

- `TripZones.of(destination)`（香港/伦敦/新加坡）供 `MainPlanProjection` 与前端 `tripZone` 共用；投影把本地 HH:MM 放到出发日对应时区。
- 主线费用按目的地显示 HK$/£/S$（`MainPlan.tsx`）。
- 分队详情新增 `destination` 供前端按目的地时区渲染。

## DD9 演示数据脚本

- `scripts/demo-seed.py` 读取 `pragma table_info` 自适应 V1–V9 / V10 结构（`joining_closed`、`trip_basics_json` 仅在存在时写入）。
- 空库自动创建「演示 · 香港两日」「演示 · 伦敦一周」（Ben 组织者 + Eve，均提交 ready），写入主线草稿 v1 与 `plan_node`，清空分队。
- 反复执行幂等；每次先做 SQLite backup。

## DD10 非目标

- 不做经纬度/路网自动计算（OQ-1 deferred）。
- 不新增迁移、不改变分组/确认/取消状态机、不改安全配置。
