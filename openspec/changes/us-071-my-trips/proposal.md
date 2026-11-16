# Proposal

## Why

「行程」tab 目前只在没有当前行程时显示一个「按编号打开行程」的空壳；一旦打开过某个行程，tab 又直接跳到该行程的主线方案。旅行者要么记住数字行程编号，要么反复点回上一程，无法一眼看到自己创建和加入过的全部行程。归属关系其实早已记录在 `trip` + `trip_member` 中，缺的只是一个按会话账号过滤的只读列表投影。

## What Changes

- 新增成员范围列表读取：`GET /api/trips` 返回包封套 `{trips:[{id, name, destination, startDate, endDate, organizer, mainPlanConfirmed}]}`，只含当前会话账号作为成员的行程，按 `start_date` 升序、同日按 `id` 升序；每个行程恰好一条。
- 「行程」tab 恒指向 `#/trips` 列表页，不再因 `lastTripId` 跳到 `#/trips/<id>/main-plan`；`lastTripId` 仅保留给「分队」tab 的进入逻辑。
- 列表页（`#/trips`）：
  - 行内展示名称、目的地、`startDate – endDate`；自己创建的行程显示「我创建的」徽标；`endDate` 早于当天显示「已结束」徽标（同列表、不分区）。
  - 点击行 → 既有 `#/trips/<id>` 详情。
  - loading 态；失败 → 错误信息 + 重试；空列表 → 空态 + 「创建行程」入口。
- **移除**「按编号打开行程」输入与按钮（列表成为唯一入口；`#/trips/<id>` 深链本身保留）。
- 行程详情页新增「主线方案」入口卡片（与既有「设置我的兴趣」同风格），承接 tab 不再直达 main-plan 后的入口空缺。
- Delta specs：`trips` +1 ADDED（Trip list read）；`app-shell` 1 MODIFIED（Trips tab placement and no-trip empty state，含删除「本变更不得新增列表端点/调用」的禁令）。
- 明确不改：`POST /api/trips`、`GET /api/trips/<id>`、`GET /api/trips/<id>/members`、`POST /api/trips/<id>/main-plan:confirm` 的语义；`SecurityConfig`（`/api/**` 已要求认证）；无 Flyway 迁移；无新依赖。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `trips`: 1 ADDED requirement — "Trip list read"（会话成员范围的只读行程列表，包封套形状、字段与排序契约）。
- `app-shell`: 1 MODIFIED requirement — "Trips tab placement and no-trip empty state"（行程 tab 恒落 `#/trips` 列表；空态动作改为「创建行程」；移除按编号打开入口与「不得新增列表端点/调用」禁令）。

## Impact

| Area | Effect |
|---|---|
| Backend | `trip` 包新增 1 个只读端点 `GET /api/trips`（controller + repository 查询 + 2 个 DTO：包封套与行）；不改既有四个端点 |
| Frontend | `#/trips` 由 `TripsEmpty` 占位替换为列表页；`App.tsx` 的 `tripsHref` 收敛为 `#/trips`；`TripDetails.tsx` 增「主线方案」入口卡片；`types.ts` 增列表类型 |
| Database | 无变更（只读 `trip` + `trip_member`，零迁移） |
| Dependencies | 无新增；列表用手写 `api()` + `useEffect` |
| Auth | 无变更；`/api/**` 已 `authenticated()`，新端点自动受保护 |
| Specs | `openspec/specs/trips/spec.md` +1 requirement；`openspec/specs/app-shell/spec.md` 1 MODIFIED（归档时合并） |
| Requirement source | `requirement-workspace/requirements/US-071.md`（DoR：`analysis/us-071-dor.md`，BLOCKER = 0；A0 deep-dive：`deep-dive.md` §US-071，⑨–⑫ 全 Pass） |
| Impact brief | `requirement-workspace/impact-brief.md` §US-071 |
| Story | GitHub issue #45（`Iteration 1`、`Priority - Must`、`Type - Trip Setup`） |
| Effort | 小：后端 1 查询 + 1 端点 + 2 DTO；前端 1 列表页 + 路由收敛 + 详情卡片；零迁移 |
| Stack deviation | `docs/knowledge/architecture/tech-stack-plan.md` 计划中的 TanStack Query 未被本故事采用（用户裁决 2026-11-16 用手写 `api()` + `useEffect`），与当前已落地基线一致；记为已知偏离，不在本变更迁移 |
| Open design item | 仪表盘 tab 的 Home 页标题目前也是「我的行程」，与新的列表页标题同名，违反 app-shell「每个 tab 页唯一标题」；P3 需定文案（建议列表页用「我的行程」、Home 改「仪表盘」），不改变 API |
