# Proposal

## Why

当前前端返回按钮全部是硬编码目标，且跨 `BrowserRouter` 外壳与 `App` 内部 hash 两套路由：入会成功后只能回首页，刚加入的行程没有入口；从分队或主线方案返回会跳首页并丢失当前行程；未登录访问分队深链，登录后固定回首页；登录/注册页之间混用 `/#/login`、`/#/register` 与 `/login`、`/register`。用户在多条流程间切换时会迷路或丢失行程上下文。

## What Changes

- accept 响应增加 `tripId`（additive，不改既有字段）；入会成功页保存该 id，主按钮改为「进入行程」→ `#/trips/<id>`，「返回首页」降为次要入口。
- 分队首页返回改为 `/#/trips/<id>`（行程详情）；返回后详情路由重建 `lastTripId`，成员/分队等行程内入口仍能解析该行程。
- 主线方案页返回改为 `#/trips/<id>`，不再回首页。
- 未登录访问受保护的行程深链时，登录页携带 `?next=` 保留原路径；登录成功后回到原页。`pendingInvite` 仍优先于 `next`。
- 登录/注册互相跳转统一使用 `/login`、`/register` 路由；不再新产生 `/#/login`、`/#/register` 链接。
- 成员名册「返回行程」与创建页返回到 `#/trips` 的行为由 active change **US-071** 交付（G1 已 Pass）。本变更不重复实现，只在合并后回归验证。
- 不新增端点、数据库迁移或依赖；仅在既有 accept 响应增加 `tripId`。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `app-shell`: 1 MODIFIED — "Guest join exclusion"：加入成功后的主行动改为进入该行程详情。
- `app-shell`: 2 ADDED — "Trip-context return links"（分队/主线方案返回保留行程上下文）与 "Auth deep-link resume and route consistency"（登录后回原深链、登录/注册路由统一）。

## Impact

| Area | Effect |
|---|---|
| Frontend | `Join.tsx`（joined 状态带 tripId + 进入行程）；`screen-start.tsx`（返回目标）；`MainPlan.tsx`（返回目标）；`RequireAuth.tsx` + `LoginPage.tsx`（`?next=` 回跳、路由统一）；`RegisterPage.tsx`（返回与去登录链接） |
| Backend | `JoinResult` 增加 `tripId`（additive）；accept 响应多一个字段，既有字段与状态码不变 |
| Database | 无变更（零迁移） |
| Dependencies | 无新增 |
| Auth | 只调整前端跳转；会话、登录、CSRF 契约不变 |
| Specs | `openspec/specs/app-shell/spec.md` 1 MODIFIED + 2 ADDED（归档时合并） |
| Requirement source | GitHub issue #105（`US-082`，Iteration 1、Priority - Must、Type - Trip Setup） |
| Cross-change | US-071 已拥有「行程 tab 恒落 `#/trips`、成员返回 `#/trips/<id>`、创建返回 `#/trips`」，本变更消费其口径；US-067 共享 `App.tsx` 扫描路由，本变更不改 `App.tsx`；G1 前按 `@rule:g1-cross-change-scan` 产出扫描文件 |
| Stack deviation | 无；沿用 React Router 外壳 + hash 路由现状 |
| Effort | 小：6 个前端文件 + 1 个后端 record/构造 + 1 条测试断言；无新端点、零迁移 |

## Acceptance mapping

| Issue AC | Owner |
|---|---|
| 1 入会成功直达行程 | 本 change |
| 2 成员页返回行程详情 | US-071（本 change 合并后回归） |
| 3 创建页返回行程列表 | US-071（本 change 合并后回归） |
| 4 分队返回保留行程上下文 | 本 change |
| 5 登录后回原深链 | 本 change |
| 6 登录/注册路由统一 | 本 change |
| 7 主线方案返回行程详情 | 本 change |
