# Design — us-087-088-split-route-edit-preview

- 依据：`proposal.md`、`specs/splits/spec.md`（1 ADDED + 4 MODIFIED / 46 场景）、`atdd-design.md`、`dov-ac-review.md`、`g1-decision.md`、`requirement-workspace/requirements/US-087-088.md`、`deep-dive.md` §US-087-088
- 基线：`US-087-088-p0`（已并入 `origin/main`，含 US-089 `RouteStep`/`destination`）

## DD1 API 契约：整对保存

- 新增 `PUT /api/trips/{tripId}/split-draft/routes`，body：
  ```json
  {
    "draftVersion": 3,
    "routes": [
      { "groupLabel": "A",
        "steps": [{ "name": "City Hall MRT", "minutes": 30 }, { "name": "National Gallery Singapore", "minutes": 20 }, { "name": "Gardens by the Bay", "minutes": 15 }],
        "travelLegsMinutes": [30, 30, 15] },
      { "groupLabel": "B",
        "steps": [{ "name": "Gardens by the Bay", "minutes": 60 }],
        "travelLegsMinutes": [20, 20] }
    ]
  }
  ```
- 响应 200 复用 `RouteGenerationResponse` 形状 `{data:{draftVersion, routes:[GroupRoute]}, error:null}`。
- 两组均为站点列表：A 路段数 = 站点数；B 路段数 = 站点数 + 1；活动名/地点/合计由服务端派生（名称=首末站拼接、地点=首站名）。

## DD2 站点列表派生与校验（服务端权威）

- 新增纯函数 `RoutePairEdit.derive(groupLabel, steps[{name,minutes}], legs)`：
  - 校验站点非空、站名非空、停留分钟整数 ≥ 0；
  - A 组 `legs.size == steps.size`；B 组 `legs.size == steps.size + 1`；
  - `activityMinutes = Σ minutes`，`bufferMinutes = 0`，`steps` 使用提交的站名/分钟；
  - 返回 `RouteDurations(activity, legs, 0, steps)`；活动名 = `deriveActivityName(steps)`（首末站拼接），地点 = 首站名。
- 非法值 → `400 INVALID_ROUTE_INPUT`；结构/组别问题 → `INVALID_ROUTE_PAIR` / `INVALID_GROUP_LABEL`。
- **不**在保存端点判定时间窗；超窗由下一步 `check-timing` 返回 `feasible=false`（N3a）。

## DD3 持久化与并发

- 新增 `SaveRoutesRequest(draftVersion, List<RouteEditInput> routes)` 与 `RouteEditInput`。
- `SplitDraftService.saveRoutes`：
  1. `guard.requireMember` → 读草稿 JSON（无行 → `SPLIT_DRAFT_NOT_ACTIVE`）；
  2. `status != active` → `SPLIT_DRAFT_NOT_ACTIVE`；
  3. `draftVersion` 失配 → `STALE_DRAFT_VERSION`；
  4. `routes` 为空或键集合 ≠ `groups` 键 → `SPLIT_DRAFT_INCOMPLETE` / `INVALID_ROUTE_PAIR`；
  5. 以提交的站点列表/路段派生 A/B（A legs=站点数、B legs=站点数+1）；
  6. 单事务：
     - `plan_node` 更新 `title`、`location_name`（split-a/split-b，当前 `mainPlanVersion`）；
     - 文档 `routes` 覆盖、`updated_at` 刷新、`draftVersion + 1`；
     - `UPDATE split_draft ... WHERE draft_version = ?`，0 行 → 抛 `STALE_DRAFT_VERSION` 回滚。
- `SplitDraftDocument` 增加 `withRoutes(Map, now)` 已存在，直接复用；不新增迁移。

## DD4 读侧 additive

- `GroupRoute` 记录增加 `String locationName`（nullable），`SplitDraftDetailResponse.routes` 同步。
- `getDraftDetail` 的 `findSplitRouteActivities` 改为返回 `branch_id → (title, location_name)`；`locationName` 为 null 时前端不渲染。
- 旧数据：生成时 `location_name` 回填为活动名 → 前端在 `locationName == activityName` 或空时不重复显示（D-2）。

## DD5 前端类型与 API

- `types.ts`：`RouteStep` 保持 `{name, minutes}`；`GroupRoute` 增 `locationName?: string | null`；
  新增 `SaveRoutesRequest` / `RouteEditInput`；`api.ts` 增 `saveRoutes`；`hooks.ts` 增 `useSaveRoutes`（成功后 invalidate detail）。
- `useCheckTiming` 复用；`api.ts` 不改 check-timing 契约。

## DD6 Screen 13 编辑态

- `screen-routes.tsx` 维护 `draftForm` 本地状态（从 `detail.routes` 初始化，`draftVersion` 变化时重置）：
  - 生成预填（DD2/DD4）：A 活动名 = 首末站拼接、地点 = 首站真实 `location_name`；B 初始一个站点（活动名 + 时长），地点 = 行程 `destination`，buffer = 0。
  - 编辑（Revision 3）：A/B 均以站点列表编辑，可添加/删除站点（至少 1 站），每站编辑站名/停留分钟；不再提供活动名/地点/缓冲输入；
  - 路程：A 每站后一段、B 首站前与末站后各一段，统一标注「路程」；
  - 展示（Revision 4）：行默认只读（站名 + 分钟 + 铅笔图标），点击铅笔才展开输入；新增站点名留空、以「新站点」占位；站名统一去除「主线·」前缀（前端展示与服务端保存各清洗一次）；数字输入隐藏原生步进按钮。
  - `dirty` = 深比较当前表单与最后一次快照（数字字符串归一化）。
- 终态（`confirmed`/`cancelled`）渲染只读卡片，不出现「下一步」。
- 分组卡与「重新生成」保持不变；分组变更后提示旧路线（既有逻辑）。

## DD7 下一步编排

- `onNext`：
  1. `dirty` → `saveRoutes({draftVersion, routes})`；无改动跳过；
  2. 保存成功后以**保存响应**的 `routes` + `windowMinutes` 调 `checkTiming`；
  3. `feasible=true` → `navigate('/trips/{id}/split/preview')`；
  4. `feasible=false` → 打开失败弹窗（DD8），停留本页；
  5. 保存/校验请求失败 → 页内 `ErrorState`/提示，保留输入；`STALE_DRAFT_VERSION` 时 `refetch` 并提示重试。
- 进行中禁用「下一步」与编辑控件，防重复提交。

## DD8 失败弹窗

- 新增 `frontend/src/components/ui/dialog.tsx`（shadcn 风格、受控 `open`、遮罩不可点外关闭、`role="dialog"` + `aria-modal`）。
- 内容：标题「时间窗校验未通过」；A/B 组各自「合计 / 窗口 / 超窗」；缺失输入项列表；底部仅「关闭」。
- 关闭后焦点回到路线卡；不自动跳转、不回滚已保存草稿。

## DD9 预览页与路由

- 新增 `screen-preview.tsx`（`/trips/:tripId/split/preview`）：
  - `useSplitDraft` 读详情；`buildGraphRows` 复用 A/B 站点列表；预览按「地点 → 路程 → 地点 …」交替（A 首站无前置路程、B 首站前为去程），每段统一标注「路程」，不合并求和；
  - `SplitLayout`：标题「队伍路线预览」、副标题「校验通过 · 只读预览」、step=3、返回 `/split/routes`；
  - 顶部 A/B 人数徽标；底部「前往复核并确认」→ `/split/confirm`；
  - loading / error / 无草稿 / 无路线对 / 终态只读。
- `router.tsx`：注册 preview；`/split/timing` 渲染 `<Navigate to="/split/preview" replace />`；删除 `ScreenTiming` 引用（组件文件可删除）。
- `screen-confirm.tsx` 的 `backTo` 改为 `/split/preview`。

## DD10 权限与安全

- 保存端点任意行程成员可调用；`generate` 仍仅发起人（既有 `NOT_SPLIT_INITIATOR` 不变）。
- 不改 `SecurityConfig`：`/api/trips/*/split-draft/**` 已覆盖；401 由 `MemberGuard` 产出。
- 不信任客户端 A 合计；不接收 `memberId`；响应不新增他人私密字段。

## DD11 测试与夹具

- 后端：新增 `SplitRouteEditApiTest`（S2/S2b/S3/S4/S5/S6/S8）；扩展 `SplitDraftDetailApiTest`（`locationName`/`steps`）、`SplitConfirmApiTest`（CF9）；新增 `ReunionTimingApiTest` A 超窗（N3a 数值）。
- 前端：扩展 `team-route.test.ts`（A steps 节点）；新增 Playwright `tests/e2e/split-route-edit.spec.ts` + `tests/fixtures/split-route-edit.sql`；`playwright.config.ts` 增加第二个 SQL init location。
- `requirement-workspace/acceptance-test-fixtures.md` 增 §US-087-088。

## DD12 非目标

- 不做费用/必做标识、A 站名编辑、路程段数变化、通知、迁移、新依赖、新 CI 产品。
- 不做性能/可观测性 NFR（用户 2026-11-18 裁决）。
