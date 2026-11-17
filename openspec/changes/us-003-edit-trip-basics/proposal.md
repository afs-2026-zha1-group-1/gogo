# Proposal

## Why

行程基本信息目前「一次写入、终身只读」：详情页没有任何编辑入口，后端没有更新端点，`TripRepository` 没有 update 方法。组织者建错名称、目的地或日期后无法纠正，只能重建行程并重新邀请。US-003（issue #60，已合并 US-004 #61 / US-005 #62 / US-006 #63 / US-007 #64）要求组织者在主线方案确认前可修改名称、目的地、日期、出发地与结束地点，确认后锁定（US-016 / US-017 的权限与锁定语义）。

同时，用户 2026-11-17 裁决：「我的」页常驻的「名字」输入框 + 「保存名字」表单观感差，改为按钮触发的编辑；并选择方案 B，将该 UI 调整与 US-003 合并为一个 change。该布局是 Living `auth` spec 明文要求（"Account profile and display name" 的 layout 句与 scenario），因此必须带 auth delta，不能只改代码。

用户 2026-11-17 进一步裁决（范围扩写）：**主线方案生成后，活动的地点与时间也要能编辑，并入同一个 story**。现状主线只有生成/确认/读取，无任何 stop 编辑能力；本 change 增加未确认草稿上的单 stop 编辑（地点名 + 起止时间），可行性仍由既有确认校验把关。US-075 的延迟/跳过/替换与成员通知不在本次范围。

## What Changes

- 后端新增 `PUT /api/trips/{id}`：整表单覆盖更新六字段（name / destination / startDate / endDate / startLocation / endLocation），校验与创建完全一致（非空名称/目的地、ISO 日期、结束≥开始、空白起终点归一为 null）。
- 更新守卫链：未知行程 404 `TRIP_NOT_FOUND` → 非成员 403 `NOT_A_MEMBER` → 非组织者 403 `NOT_ORGANIZER`（复用 main-itinerary 既有码）→ 主线已确认 409 `MAIN_PLAN_CONFIRMED`（新码）→ 字段校验 400（复用 `NAME_REQUIRED` / `DESTINATION_REQUIRED` / `INVALID_DATE` / `INVALID_DATE_RANGE`）。任何拒绝不落写。
- 并发安全：更新用条件写 `UPDATE trip SET ... WHERE id = ? AND main_plan_confirmed = 0`，影响行数 0 视为已确认冲突（SQLite 铁律 2，避免读-改-写竞态）。
- 起终点允许清空回 null（创建时本就可选），详情页恢复「未设置」展示。
- 前端行程详情页「行程信息」区新增编辑入口，仅 `isOrganizer && !mainPlanConfirmed` 渲染；新编辑页 `#/trips/<id>/edit` 复用创建页的字段与校验，预填现值；保存成功回 `#/trips/<id>`。非组织者/已确认成员直达编辑页 hash 时显示拒绝态 + 返回（后端仍是权威守卫）。
- 保存后同步面：详情、我的行程列表（`#/my-trips`）、邀请预览均按 mount 重新读取（手写 `api()` + `useEffect` 基线，无缓存层），导航即刷新，不引入缓存失效机制。
- 「我的」页名字编辑按钮化：profile 头部名字旁加编辑图标按钮，点击后原位展开输入框 + 保存/取消；移除常驻「名字」表单与「保存名字」大按钮。`PATCH /api/auth/me` 契约、1–30 字符校验、错误提示语义全部不变。
- 主线 stop 编辑（范围扩写）：新增 `PUT /api/trips/{id}/main-plan/stops/{seq}`，仅组织者、仅当前未确认草稿；可编辑字段为 `name`（地点/活动名）、`startTime`、`endTime`（`HH:MM`）；顺序 seq、`travelMinutesToNext`、兴趣标签不可改。守卫复用 main-itinerary 既有码：404 `TRIP_NOT_FOUND` / 403 `NOT_A_MEMBER` / 403 `NOT_ORGANIZER` / 404 `NO_DRAFT` / 409 `ALREADY_CONFIRMED`；未知 seq 404 `STOP_NOT_FOUND`（新码）；空白名 400 `NAME_REQUIRED`、时间格式错 400 `INVALID_TIME`（新码）、结束≤开始 400 `INVALID_TIME_RANGE`（新码）。编辑原位改当前草稿、不 bump version、不改 `input_revisions`（staleness 仍按偏好 revision 计算）；编辑造成的时间冲突不在编辑时拦截，由既有确认校验 `scheduleErrors` 把关。重生成整份替换草稿（含手动编辑，US-036 语义不变），前端提示「重新生成将丢弃手动修改」。
- 前端主线方案页（`MainPlan.tsx`，屏幕 10）：组织者且未确认时每 stop 显示编辑入口，展开 name/开始/结束三字段表单，保存后重读方案；成员与确认后纯只读。
- Delta specs：`trips` +2 ADDED（"Trip basic info update"、"Trip detail edit entry"）；`auth` 1 MODIFIED（"Account profile and display name"，仅 UI 布局句与 layout scenario 改写 + 编辑交互 scenario，API 行为不变）；`main-itinerary` +1 ADDED（"Main plan stop editing"）+1 MODIFIED（"Authorization and identity for main-plan operations"，写操作范围纳入 stop 编辑）。
- 明确不改：`organizerId` 与 `mainPlanConfirmed` 不可经本端点修改；创建 / 详情读取 / 列表 / current / members / 主线确认 / 邀请 / 分队语义不变；`SecurityConfig` 不变（`/api/**` 已要求认证，写请求沿用既有 CSRF 处理）；无 Flyway 迁移（六列 V2 已存在）；无新依赖。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `trips`: 2 ADDED requirements — "Trip basic info update"（组织者 + 未确认双守卫的整表单更新端点、校验、错误契约、清空起终点、读后一致）与 "Trip detail edit entry"（详情页编辑入口可见性、编辑页预填/拒绝态、保存回详情）。
- `auth`: 1 MODIFIED requirement — "Account profile and display name"：My Account 布局由常驻名字表单改为「profile 头部编辑按钮 → 原位展开输入 + 保存/取消」；API 与校验行为逐字保留。
- `main-itinerary`: 1 ADDED requirement — "Main plan stop editing"（未确认草稿上单 stop 的地点名/起止时间编辑、守卫、先存后验、重生成丢弃手动编辑）；1 MODIFIED requirement — "Authorization and identity for main-plan operations"（写操作范围由生成/确认扩至 stop 编辑，错误码族不变）。

## Impact

| Area | Effect |
|---|---|
| Backend | `com.gogo.trip`：`TripController` +1 `@PutMapping("/{id}")`；`TripRepository` +1 条件更新方法；请求体复用 `TripCreateRequest`，响应复用 `TripResponse`，不新增 DTO。`com.gogo.mainplan`：`MainPlanController` +1 `@PutMapping("/api/trips/{id}/main-plan/stops/{seq}")`；`MainPlanService`/`MainPlanRepository` +1 条件编辑方法（当前草稿 + status='draft' CAS）；+1 stop 编辑请求 record，响应复用 `PlanResponse` |
| Frontend | 新 `EditTrip.tsx`（复用创建页字段/校验）；`TripDetails.tsx` 加编辑入口；`App.tsx` 加 `trip-edit` 路由（须在通用 `/trips/<id>` 匹配之前，US-067 D1 教训）；`AccountPage.tsx` 名字编辑改按钮触发 inline 展开；`MainPlan.tsx` 未确认草稿加 per-stop 编辑表单（name/startTime/endTime）+ 重生成丢弃手动编辑提示 |
| Database | 无变更（零迁移；条件更新复用 V2 `trip.main_plan_confirmed` 与 V5 `main_plan_draft.status` / `main_plan_stop`） |
| Dependencies | 无新增 |
| Auth | 端点契约不变；`/api/**` 已 `authenticated()`，新端点自动受保护；CSRF 沿用 `api()` 既有处理 |
| Error contract | trips +1 新码 `MAIN_PLAN_CONFIRMED` 409，复用 main-itinerary 既有 `NOT_ORGANIZER` 403；main-itinerary +3 新码 `STOP_NOT_FOUND` 404、`INVALID_TIME` 400、`INVALID_TIME_RANGE` 400，锁定复用既有 `ALREADY_CONFIRMED` 409、无草稿复用 `NO_DRAFT` 404。全部扁平 `{code,message}`；新码需 IO 在 G1 确认 |
| Specs | `openspec/specs/trips/spec.md` +2 requirements；`openspec/specs/auth/spec.md` 1 MODIFIED；`openspec/specs/main-itinerary/spec.md` +1 ADDED +1 MODIFIED（归档时 living-merge） |
| Requirement source | GitHub issue #60（合并版 AC 为权威，2026-11-17 用户裁决扩写主线地点/时间编辑，issue 描述同步更新）；本地 `requirement-workspace/requirements/story-detail-iteration-1.md` §US-003 仍是旧「重命名行程」拆分口径，US-004~007 已作为重复项关闭——以 issue #60 为准，旧文件留作历史，不在本 change 重写 |
| Story | issue #60（US-003，OPEN）；合并来源 #61/#62/#63/#64 已 CLOSED；相邻锁定语义 US-016 / US-017 未单独立项，由本 change 的守卫场景覆盖；主线编辑为 2026-11-17 用户裁决的范围扩写，US-074/075/077 的其余能力（预订信息、延迟/跳过/替换+通知、建议讨论）仍不在范围 |
| Effort | 中：后端 2 端点 + 2 条件更新；前端 1 编辑页 + 1 入口 + 路由 + AccountPage 局部重构 + MainPlan per-stop 编辑；零迁移 |
| Stack deviation | 无新增。沿用手写 `api()` + `useEffect` 已落地基线（tech-stack-plan §3 TanStack Query 为已知历史偏离，US-071 已记录）；新端点在归档对账时补入 tech-stack-plan API 记录 |
| 既有漂移观察（不在本 change 修） | Living `trips` "Trip main-plan confirmation state" 仍写「不暴露确认操作」，实际确认已由 US-037 主线流程交付（`POST /{id}/main-plan:confirm`）；"Trip list read" 的「no other write verb」场景限定列表路径，本 change 的 PUT 落在详情资源，不改列表端点。两处均为历史 change 口径措辞，记录于 cross-change-scan 轴 6，另行收敛 |