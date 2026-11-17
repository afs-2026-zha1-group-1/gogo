# 设计 — us-071-my-trips

- 依据：`specs/trips/spec.md`（9 场景）、`specs/app-shell/spec.md`（12 场景）、`g1-decision.md`（G1 Pass）、`atdd-design.md`
- 需求源：`requirement-workspace/requirements/US-071.md`
- 技术基线：`docs/knowledge/architecture/tech-stack-plan.md`（偏离见 DD13）

## 目标与非目标

**目标**：新增会话成员范围的只读行程列表 `GET /api/trips`；把底部「行程」tab 收敛到 `#/trips` 列表页；列表行进入既有详情；空态/loading/失败重试；已结束与「我创建的」行内标记。

**非目标**：不动 US-072 已交付的详情页主线方案入口（只回归）；不做分页/搜索/排序切换；不做行程增删改与角色变更；不引入 TanStack Query；无迁移；不改 `SecurityConfig`。

## 后端

### DD1 端点契约

| 项 | 决定 |
|---|---|
| 方法 / 路径 | `GET /api/trips`（与既有 `POST /api/trips` 同集合路径，REST 语义） |
| 鉴权 | 已认证会话；`/api/**` 已 `authenticated()`，**不改 `SecurityConfig`** |
| 响应 | `TripListResponse(List<TripListItem> trips)`，包封套与既有 `TripMemberListResponse` 风格一致 |
| 行字段 | `id`, `name`, `destination`, `startDate`, `endDate`, `organizer`, `mainPlanConfirmed` |
| 排序 | `ORDER BY t.start_date ASC, t.id ASC` |
| 失败 | 仅继承 401 `USER_REQUIRED`（未认证）；无 403/404 语义（列表不按 id 读取） |

### DD2 DTO

`com.gogo.trip` 包新增两个 record：`TripListItem`、`TripListResponse`（与 `TripResponse` 同包，避免跨层类型）。`organizer` 为 `boolean`，由 SQL `CASE WHEN t.organizer_id = tm.user_id THEN 1 ELSE 0 END` 派生，不落库。

### DD3 查询

```sql
SELECT t.id, t.name, t.destination, t.start_date, t.end_date,
       t.main_plan_confirmed,
       CASE WHEN t.organizer_id = tm.user_id THEN 1 ELSE 0 END AS organizer
FROM trip t
JOIN trip_member tm ON tm.trip_id = t.id
WHERE tm.user_id = ?
ORDER BY t.start_date ASC, t.id ASC
```

`trip_member` 是 `(trip_id, user_id)` 复合主键，同一用户对同一行程只有一行 → 天然去重（R4），不需要 `DISTINCT`。

### DD4 Controller

`TripController` 新增：

```java
@GetMapping
public TripListResponse list(@AuthenticationPrincipal AccountPrincipal principal)
```

只读、无事务、无写路径。既有 `create/read/members/confirm` 保持原样。

## 前端

### DD5 路由与页面

- `parseRoute`：`#/trips` 由 `trips-empty` 改为新的 `trips-list` page；`TAB_FOR_PAGE['trips-list'] = 'trips'`。
- 新页面 `frontend/src/pages/TripsList.tsx`，替换 `TripsEmpty.tsx`（当前仅 `App.tsx` 引用，删除后无悬挂引用）。
- 页面标题用 **「行程」**：Home 仪表盘页标题已是「我的行程」，两个 tab 页不得同名；选「行程」可同时避免改动已归档 US-067 的验收文档（其 delta 仍称 "Home `我的行程` dashboard"）。

### DD6 `tripsHref` 拆分（IO-3）

现在一个 `tripsHref` 被四处共用；收敛后拆为两个语义：

| 使用点 | href | 说明 |
|---|---|---|
| TabBar「行程」tab | `#/trips` | 恒落列表（S10） |
| 分队 tab 无已解析行程时的「去行程」 | `#/trips` | 无行程上下文 |
| `CreateTrip` 的 back | `#/trips` | 创建后仍落 `#/trips/<id>` |
| `Members`「去行程」（无行程） | `#/trips` | — |
| `Members`「返回行程」（有行程） | `#/trips/<id>` | **保留行程上下文**（新 prop `tripHref`） |

`lastTripId` 仅继续服务「分队」tab 的进入按钮，不再参与 dock 的 href。

### DD7 列表页状态与渲染

四态：`loading` → `ready`（含空数组时走 `empty`）→ `failed`（错误 + 重试）。

行渲染：名称（主标题）、`目的地 · startDate – endDate`（次要行）、徽标组（`我创建的` / `已结束`）。整行是一个 `<a href={'#/trips/' + id}>`（无嵌套交互元素），保证键盘可达。

复用现有 `app.css`/`@theme` token 与 `components/ui/` 组件；不新增 UI 库、不新增全局 CSS 之外的第二套样式体系（如需新增类，限定在 `app.css` 现有命名空间内）。

### DD8 已结束判定

`isEnded(endDate: string, today: string)`：`endDate < today` 的字典序比较即可（`YYYY-MM-DD`）；`today` 由 `new Date()` 本地时区格式化为 `YYYY-MM-DD`。纯函数，apply 时补 UT。服务端不引入状态字段（A6）。

### DD9 类型

`types.ts` 新增 `TripListItem`、`TripListResponse`，`Trip` 保持不变（详情/创建仍用它）。

### DD10 数据获取

手写 `api<TripListResponse>('/api/trips')` + `useEffect`，与 `Members.tsx`/`TripDetails.tsx` 一致；重试按钮重新触发同一请求（可用 `reloadKey` 递增）。

## 测试

### DD11 验收测试

- 新增 `backend/src/test/java/com/gogo/trip/TripListApiTest.java`，覆盖 `atdd-design.md` A1–A9（9 例），沿用 `TripMembersApiTest` 的 `TestAuth.asUser` + 真实 SQLite 测试库模式，红先行。
- 前端 gate：`npm run typecheck`（`tsc --noEmit`）+ `npm run build`。
- E2E：`docs/feedback/e2e-us-071.md` 手工清单 E1–E12。

## 数据与配置

### DD12 零迁移

只读 `trip` + `trip_member`（V2 已含 `main_plan_confirmed`）；不新增 Flyway 脚本、不改种子数据。

### DD13 已知偏离

| id | 偏离 | 处置 |
|---|---|---|
| TS-1 | `tech-stack-plan` 计划中的 TanStack Query 未采用，列表用手写 `api()` + `useEffect` | 用户 2026-11-16 裁决；与当前已落地基线一致，记录不迁移 |
| TS-2 | 前端无 UT runner（无 vitest/jest），`isEnded` / `todayIso` 未配单测 | 纯函数保留在页面模块内并由 E2E E5 覆盖；引入测试框架属独立工具变更，不在本变更扩范围 |
| TS-3 | 既有 `TripApiTest.noEditDeleteOrListRoutesExist` 断言 `GET /api/trips` 为 405 | 该断言基于本变更取代的旧契约；P4 改为断言 200 + `trips` 数组（编辑/删除仍 405），重命名 `noEditOrDeleteRoutesExistAndListIsReadOnly` |

## 风险

| 风险 | 缓解 |
|---|---|
| `tripsHref` 改动影响 TabBar / 分队 / 成员 / 创建四处导航 | E2E E2、E8、E11 与回归套件逐处断言 |
| 同日排序漂移 | SQL 显式 `ORDER BY start_date, id`；A2 断言 |
| 列表页与 Home 标题撞名 | 列表页用「行程」，Home 不改；不触发 us-067 delta 变更 |
| 无分页的极端账号 | OQ-5 已知限制；超预算另立变更 |
| `TripsEmpty` 删除后残留引用 | 实施前 grep 确认（当前仅 `App.tsx`） |
