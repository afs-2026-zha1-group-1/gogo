# 任务 — us-071-my-trips

- 依据：`design.md`（DD1–DD13）、`atdd-design.md`（A1–A9 / E1–E12）、`specs/**`（21 场景）、`g1-decision.md`（G1 Pass）
- 执行规则：P4 起手先建分支并开 PR（`.githooks/pre-push` 禁止直推 main）；不以「main 直开发」方式落地。

## 1. 分支与 PR（P4 起手）

- [ ] 1.1 从最新 `main` 建分支 `US-071-my-trips`
- [ ] 1.2 推送分支并开 PR 到 `main`（标题 `US-071: 我的行程列表`，正文链接本 change 的 proposal/design/atdd/g1）

## 2. Fixtures 与红先行

- [x] 2.1 在 `requirement-workspace/acceptance-test-fixtures.md` 追加 §US-071（Alice 自建/受邀/已结束/同日两条、Eve 空账号、Eve 非成员；四条行程的 start/end/organizer 与预期顺序）
- [x] 2.2 新建 `backend/src/test/java/com/gogo/trip/TripListApiTest.java`，覆盖 A1–A9（9 例，先红）：200 字段集、排序（含同日 id 升序）、`organizer` true/false、空 `trips`、`mainPlanConfirmed` 只读投影、`endDate` 已过仍返回且无状态字段、401 无会话、401 仅 `X-User-Id`、`POST /api/trips` 语义不变

## 3. 后端实现

- [x] 3.1 `com.gogo.trip` 新增 `TripListItem`、`TripListResponse` record（字段见 DD1/DD2）
- [x] 3.2 `TripRepository` 新增成员范围查询（DD3 SQL，`ORDER BY start_date, id`，`organizer` 由 CASE 派生）
- [x] 3.3 `TripController` 新增 `@GetMapping` 列表端点（`AccountPrincipal`，只读）
- [x] 3.4 A1–A9 转绿；`cd backend && mvn -B test` 全绿（既有 226+ 测试不回归）

## 4. 前端实现

- [x] 4.1 `frontend/src/types.ts` 增加 `TripListItem` / `TripListResponse`
- [x] 4.2 新建 `frontend/src/pages/TripsList.tsx`：四态（loading / 列表 / 空态 / 错误+重试）、行内名称+目的地+日期、`我创建的` 与 `已结束` 徽标、整行 `<a href="#/trips/{id}">`；标题「行程」
- [x] 4.3 `isEnded` / `todayIso` 纯函数实现（`TripsList.tsx`）；**前端无 UT runner**（无 vitest/jest，既有仅 node:test 的 lockfile 检查），由 E2E E5 覆盖，偏离记入 design TS-2
- [x] 4.4 `App.tsx`：`parseRoute` 的 `#/trips` 改为 `trips-list`；`TAB_FOR_PAGE` 增 `trips-list: 'trips'`；渲染 `TripsList`
- [x] 4.5 `tripsHref` 收敛为 `#/trips`（TabBar、分队无行程、`CreateTrip` back）；`Members` 新增 `tripHref` prop，有行程时用 `#/trips/{id}`
- [x] 4.6 删除 `frontend/src/pages/TripsEmpty.tsx` 与 `App.tsx` 的 import/分支（删除前 grep 确认无其他引用）
- [x] 4.7 `cd frontend && npm run typecheck && npm run build` 绿

## 5. E2E 与回归

- [x] 5.1 新建 `docs/feedback/e2e-us-071.md`，按 E1–E12 逐行执行并记 Pass/Partial/N/A（E7 为 US-072 入口回归，E8 为成员名册返回上下文，E12 用网络面板确认只调用一次 `GET /api/trips`）
- [x] 5.2 回归：分队 tab 进入、成员名册（含返回）、创建流程（back → `#/trips`，成功后 → `#/trips/<id>`）、行程详情、`#/trips/<id>/main-plan` 可达
- [x] 5.3 反向验证：`GET /api/trips?page=1` 不产生分页元信息、无搜索框、无第二个主线入口、`PUT/DELETE /api/trips` 不改变数据

## 6. Spec 与文档

- [x] 6.1 `openspec validate us-071-my-trips --strict` = valid（如 delta 需改，先回 `/sdd:delta-craft`）
- [x] 6.2 更新 `requirement-workspace/registry.md`（US-071 行）与 `handoff.md`（P3/P4 进度）
- [ ] 6.3 归档前对账：`docs/knowledge/architecture/tech-stack-plan.md` 增补 `GET /api/trips`（API 清单）+ `docs/knowledge/_LOG.md` 追加一行；无数据模型变更

## 7. 验证与门禁

- [x] 7.1 `/sdd:local-verify-report`（V1–V8 + E1/E2 证据，E3 待 G2 签核）
- [x] 7.2 PR CI 双 job 绿（backend `mvn -B test` + frontend typecheck/build），E1 机器读取
- [ ] 7.3 `/sdd:g2-decision-record`（具名 VL）→ 合并 PR → `/sdd:living-merge` + G3（具名 SA）

## 对齐自检（P3，2026-11-17）

| 维度 | 结果 | 证据 |
|---|---|---|
| Spec → ATDD | **Pass** | 21 场景（trips 9 + app-shell 12）→ `atdd-design.md` A1–A9 + E1–E12，逐行对应；无遗漏、无多余场景 |
| ATDD → Tasks | **Pass** | API 层 → 2.2/3.x；E2E 层 → 5.1；UT（`isEnded`）→ 4.3；反向验证 → 5.3 |
| Design → Tasks | **Pass** | DD1–DD4 → 3.1–3.3；DD5–DD10 → 4.1–4.6；DD11 → 2.2/4.7/5.1；DD12 → 零迁移（无迁移任务）；DD13 → 偏离已在 design 记录 |
| 契约一致性 | **Pass** | 端点/字段/排序与 `specs/trips/spec.md` 一致；`tripsHref` 拆分与 app-shell「行程内返回链接」条款一致；不新增第二个主线入口与 US-072 边界一致 |
| Fixtures | **Pass** | `acceptance-test-fixtures.md` §US-071 已补（L1–L10）；四条行程的日期基于 V2 种子实际值（2026-12-05） |
| Config 规则 | **Pass** | 首条 P4 任务 = 分支 + PR（1.1/1.2）；归档前对账任务 = 6.3；无直推 main |

结论：**对齐自检 Pass**，可进入 P4。

## 8. Revision 实现（2026-11-17，当前行程模型）

- [x] 8.1 迁移 `V8__add_current_trip.sql`；`CurrentTripResponse`/`CurrentTripRequest` record；`TripRepository` 读/写 current；`TripController` `GET/PUT /api/trips/current`（DD14–DD15）
- [x] 8.2 `CurrentTripApiTest` 8 例（红→绿，对应 delta「Current trip selection」）
- [x] 8.3 `TripsList.tsx` 增 `title`/`subtitle`/`selectable` props；`#/my-trips` 装配：点卡片 PUT current 后仅打「已选择」tag（右上），**不导航**；mount 回显服务端 current
- [x] 8.4 新组件 `CurrentTrip.tsx`（`#/trips`：current 详情 / 空态引导 / loading / failed+retry）；`AccountPage.tsx` 加「我的行程」入口；视觉对齐原型 `.qcard`/`.empty`（app.css 新增类）
- [x] 8.5 `App.tsx`：`my-trips`/`trips-current` 路由与 `TAB_FOR_PAGE`；mount/账号/路由变化时从 current 初始化 `lastTripId`
- [x] 8.6 `mvn -B test` 全绿 + `npm run build` 绿

## 9. Revision 验证与门禁

- [x] 9.1 E2E Revision 段：account 入口、my-trips 点卡片打 tag 不跳转、tag 回显、切「行程」tab 看详情、reload/重登保留、换账号隔离、无 current 空态、原型视觉比对（`e2e-us-071.md`）
- [x] 9.2 `openspec validate us-071-my-trips --strict` = valid
- [x] 9.3 local-verify 报告补 Revision 段；提交推送分支
- [ ] 9.4 G1 Revision 复审（IO/SA 补签，C4）→ G2 → 合并 PR → living-merge + G3

## Revision 对齐自检（2026-11-17）

| 维度 | 结果 | 证据 |
|---|---|---|
| Spec → Design | Pass | delta「Current trip selection」8 场景 → DD15；app-shell ADDED 10 场景 → DD16/DD17 |
| Design → Tasks | Pass | DD14–DD15 → 8.1/8.2；DD16 → 8.3/8.4；DD17 → 8.5；DD18 → 8.2/9.1 |
| 契约一致性 | Pass | REMOVED 旧条的 Reason/Migration 指向新条与 `trips` 列表读；深链/返回/创建路径保留 |


