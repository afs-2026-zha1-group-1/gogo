# Proposal

## Why

「行程」tab 目前只在没有当前行程时显示一个「按编号打开行程」的空壳；一旦打开过某个行程，tab 又直接跳到该行程的主线方案。旅行者要么记住数字行程编号，要么反复点回上一程，无法一眼看到自己创建和加入过的全部行程。归属关系其实早已记录在 `trip` + `trip_member` 中，缺的只是一个按会话账号过滤的只读列表投影。

## What Changes

- 新增成员范围列表读取：`GET /api/trips` 返回包封套 `{trips:[{id, name, destination, startDate, endDate, organizer, mainPlanConfirmed}]}`，只含当前会话账号作为成员的行程，按 `start_date` 升序、同日按 `id` 升序；每个行程恰好一条。
- 「行程」tab 恒指向 `#/trips` 列表页，不再因 `lastTripId` 跳到 `#/trips/<id>/main-plan`；`lastTripId` 仅保留给「分队」tab 的进入逻辑。
- `tripsHref` 不再单一复用：dock tab、分队「去行程」（无已解析行程时）与创建页返回指向 `#/trips`；成员名册的「返回行程」属于行程内页面，保持指向 `#/trips/<id>`，不因本次收敛丢失行程上下文。
- 列表页（`#/trips`）：
  - 行内展示名称、目的地、`startDate – endDate`；自己创建的行程显示「我创建的」徽标；`endDate` 早于当天显示「已结束」徽标（同列表、不分区）。
  - 点击行 → 既有 `#/trips/<id>` 详情。
  - loading 态；失败 → 错误信息 + 重试；空列表 → 空态 + 「创建行程」入口。
- **移除**「按编号打开行程」输入与按钮（列表成为唯一入口；`#/trips/<id>` 深链本身保留）。
- 行程详情页的「主线方案」入口**已由 US-072 交付并归档**（Living `trips` requirement "Trip detail main-plan navigation entry"，代码在 main 的 `TripDetails.tsx`，E2E `docs/feedback/e2e-us-072.md` E1–E7 Pass）；本变更**不重复实现**该入口，只在 E2E 中回归验证 tab 收敛后它仍可达 `#/trips/<id>/main-plan`。
- Delta specs：`trips` +1 ADDED（Trip list read）；`app-shell` 1 MODIFIED（Trips tab placement and no-trip empty state，含删除「本变更不得新增列表端点/调用」的禁令）。
- 明确不改：`POST /api/trips`、`GET /api/trips/<id>`、`GET /api/trips/<id>/members`、`POST /api/trips/<id>/main-plan:confirm` 的语义；`SecurityConfig`（`/api/**` 已要求认证）；无 Flyway 迁移；无新依赖。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `trips`: 2 ADDED requirements — "Trip list read"（会话成员范围的只读行程列表）与 "Current trip selection"（`GET/PUT /api/trips/current`，服务端持久化的每用户当前行程，成员资格校验）。
- `app-shell`: 1 REMOVED（"Trips tab placement and no-trip empty state"，被当前行程模型取代）+ 1 ADDED（"Current trip tab and my-trips list"：「我的」入口 → `#/my-trips` 列表；「行程」tab → 当前行程详情；无当前行程空态引导）。

## Impact

| Area | Effect |
|---|---|
| Backend | `trip` 包新增 1 个只读端点 `GET /api/trips`（controller + repository 查询 + 2 个 DTO：包封套与行）；不改既有四个端点 |
| Frontend | `#/trips` 由 `TripsEmpty` 占位替换为列表页；`App.tsx` 的行 tab 目标收敛为 `#/trips`（成员名册「返回行程」仍落 `#/trips/<id>`）；`TripDetails.tsx` **不新增**入口（US-072 已交付）；`types.ts` 增列表类型 |
| Database | 无变更（只读 `trip` + `trip_member`，零迁移） |
| Dependencies | 无新增；列表用手写 `api()` + `useEffect` |
| Auth | 无变更；`/api/**` 已 `authenticated()`，新端点自动受保护 |
| Specs | `openspec/specs/trips/spec.md` +1 requirement；`openspec/specs/app-shell/spec.md` 1 MODIFIED（归档时合并） |
| Requirement source | `requirement-workspace/requirements/US-071.md`（DoR：`analysis/us-071-dor.md`，BLOCKER = 0；A0 deep-dive：`deep-dive.md` §US-071，⑨–⑫ 全 Pass） |
| Impact brief | `requirement-workspace/impact-brief.md` §US-071 |
| Story | GitHub issue #45（`Iteration 1`、`Priority - Must`、`Type - Trip Setup`）；相邻已交付故事 US-072（行程详情主线入口，已归档） |
| Effort | 小：后端 1 查询 + 1 端点 + 2 DTO；前端 1 列表页 + 路由收敛（详情页主线入口已存在，不重复实现）；零迁移 |
| Stack deviation | `docs/knowledge/architecture/tech-stack-plan.md` 计划中的 TanStack Query 未被本故事采用（用户裁决 2026-11-16 用手写 `api()` + `useEffect`），与当前已落地基线一致；记为已知偏离，不在本变更迁移 |
| Open design item | 仪表盘 tab 的 Home 页标题目前也是「我的行程」，与新的列表页标题同名，违反 app-shell「每个 tab 页唯一标题」；P3 需定文案（建议列表页用「我的行程」、Home 改「仪表盘」），不改变 API。Home 改名的联动：仍开放的 `us-067-qr-scanner` delta 把首页称作 "Home `我的行程` dashboard"，改文案时须同步该 delta 与已归档 US-067 的验收记录 |
| Supersedes | 本变更取代 REQ-005（US-064）的验收基线：`docs/feedback/verification-req-005.md` TR2（空态恰为「创建行程 + 按编号打开行程」）、TR3（编号输入校验）、TR4（create 返回 `#/trips/1`）、TR5（无 `GET /api/trips`）在合并后不再成立；`requirements/REQ-005.md` S5/OQ-1 与 `openspec/specs/app-shell/spec.md` 的 `Trips tab placement and no-trip empty state` 由本条 REMOVED+ADDED 收敛，归档时以 Living Spec 为准，旧验收记录仅作历史证据 |

## Revision（2026-11-17，当前行程模型）

P4 完成后用户修订范围（四项裁决见 `requirements/US-071.md` §Revision）：

- 「我的」页新增「我的行程」入口 → 新路由 `#/my-trips`（shell 内），展示原列表数据；点行 = 设为当前行程并跳 `#/trips`。
- 「行程」tab（`#/trips`）改为展示**当前行程详情**；无当前行程 → 空态 + 跳 `#/my-trips` 引导。
- 当前行程**后端持久化**：迁移 `V8__add_current_trip.sql`（`app_user.current_trip_id` 可空外键）+ `GET/PUT /api/trips/current`。
- `app-shell` delta 由 MODIFIED 改为 **REMOVED 旧条 + ADDED 新条**，避免保留与新语义矛盾的场景名。
- 既有 `#/trips/<id>` 深链、成员名册返回、创建返回、US-072 主线入口均保留。
- G1 重开复审：见 `g1-decision.md` §Revision re-review（Conditional，待 IO/SA 补签）。
