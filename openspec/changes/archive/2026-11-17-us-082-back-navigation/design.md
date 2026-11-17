# Design

## Context

前端同时存在两套导航：`router.tsx` 的 `BrowserRouter`（`/`、`/login`、`/register`、`/trips/:tripId/split/*`）与 `App.tsx` 的 hash 路由（`#/`、`#/trips/<id>`、`#/members`、`#/scan`、`#/join/<token>` 等）。当前返回按钮全部写死目标，且 `TripDetails`/`MainPlan`/`App` 用 `window.location.href` 整页跳到分队路由，导致 `App` 重挂载、会话内 `lastTripId` 归零。入会成功页只回首页，但首页没有行程列表；`AcceptResult` 类型声明了 `tripId`，但后端 accept 实际只返回 `joined` / `alreadyMember`，前端没有行程 id 可跳。

US-071（G1 Pass，active）已定义行程 tab 恒落 `#/trips`、成员返回 `#/trips/<id>`、创建返回 `#/trips`。本变更消费该口径，不重复实现，避免两个 active change 同时拥有同一返回行为。

## Goals / Non-Goals

**Goals:**

- 入会成功后直接进入被接受的行程。
- 分队首页与主线方案页的返回落到该行程详情，并恢复行程上下文。
- 未登录访问分队深链，登录后回到原页；仅允许同源站内路径。
- 登录/注册页互相跳转统一走 `/login`、`/register`。

**Non-Goals:**

- 不新增后端端点、不改会话/CSRF/数据库；仅在既有 accept 响应增加 additive `tripId`。
- 不改行程 tab、成员名册返回、创建页返回（由 US-071 交付）。
- 不改扫码路由与关闭恢复逻辑（US-067 的 active surface）。
- 不引入 `navigate(-1)`/`history.back()`，不改浏览器历史策略。

## Decisions

### D1 返回目标继续显式声明，不用 `navigate(-1)`

分队路由由整页跳转进入，直接打开深链时历史里没有可回退的站内页；`navigate(-1)` 会把用户带出应用或回到登录页。显式目标可测试、与 AC 一一对应。

### D2 分队首页返回 `/#/trips/<id>`

`screen-start.tsx` 的 `backTo` 改为 `/#/trips/${tripId}`，由 `SplitLayout` 现有的 `navigate(backTo)` 执行 SPA 跳转。React Router 把 `/#/trips/5` 解析为路径 `/` + hash `#/trips/5`，`App` 挂载后 `parseRoute` 进入详情，详情 effect 重新设置 `lastTripId`，成员/分队入口随之恢复该行程。备选 `window.location.assign` 会整页刷新并丢状态，不采用。

### D3 入会成功页携带 `tripId`（accept 响应 additive 补齐）

后端 `JoinResult` 增加 `tripId`（既有 `joined` / `alreadyMember` 不变），`Join` 的 `joined` 状态保存该 id；预览态仍不暴露行程 id（保持接受前只显示公开信息）。主按钮「进入行程」→ `#/trips/<id>`，「返回首页」保留为次要按钮。备选在 joined 后重新请求预览以拿 id，预览契约仍不暴露 id；备选改 join URL 携带 trip id，会破坏 US-067 锁定的 `#/join/<token>` 形状，均不采用。

### D4 登录回跳用 `?next=`，并做同源校验

`RequireAuth` 在重定向时把当前 `pathname + search + hash` 编码进 `/login?next=...`，`replace` 掉受保护路由。`LoginPage` 用 `URLSearchParams` 读取 `next`（不依赖 Router hook，因为登录页同时被 hash 路由复用），登录成功后：

1. `pendingInvite` 存在 → 回 `#/join/<token>`（现有优先级不变）。
2. `next` 存在且校验通过 → `window.location.assign(next)`。
3. 否则 → `/`。

校验规则：必须以单个 `/` 开头；用 `new URL(value, window.location.origin)` 解析后 origin 必须等于当前 origin；`/login`、`/register` 自身也丢弃，避免登录后自跳循环；否则回 `/`。备选用 Router `state` 传来源，无法跨整页刷新且 hash 登录页拿不到，不采用。

### D5 登录/注册内部链接统一到 Router 路由

`RegisterPage` 返回与「已有账号？去登录」→ `/login`；`LoginPage`「创建账号」→ `/register`；`Join` 的登录交接 → `/login`。`App.parseRoute` 的 `#/login`、`#/register` 分支保留为既有深链入口，但不再由站内链接产生，避免扩大改动面与破坏 US-068-070 的既有验收证据。

### D6 跨 change 协调

本变更只改 `Join.tsx`、`screen-start.tsx`、`MainPlan.tsx`、`RequireAuth.tsx`、`LoginPage.tsx`、`RegisterPage.tsx`。不触碰 `App.tsx`、`Members.tsx`、`CreateTrip.tsx`，因此与 US-067（`App.tsx` 扫描路由）无文件冲突，与 US-071（行程 tab / 成员 / 创建返回）无重复实现。成员与创建返回在 US-071 合并后按本 change 的 AC2/AC3 回归。

## Risks / Trade-offs

- [accept 响应的前端类型早于后端字段] → `JoinResult` 只做 additive 字段，`InvitationApiTest` 断言 `tripId`，前端类型同步收敛；既有 joined/alreadyMember 语义不变。
- [登录页被两套路由复用] → 只用 `window.location` 与 `URLSearchParams`，不用 `useLocation`/`useNavigate`，保证 hash 入口同样可用。
- [`next` 开放重定向] → 同源 + 单斜杠前缀校验；非法值静默回 `/`。
- [入会跳 `/login` 变成整页刷新] → 依赖 sessionStorage 中的 `pendingInvite` 与 `next`，刷新后仍可恢复；E2E 覆盖从邀请到登录再回邀请的完整链路。
- [US-071 未合并时 AC2/AC3 无法验证] → 任务中显式记录依赖；合并后回归，未合并则以“依赖未落地”记录，不冒充通过。
- [两套路由下详情页重复挂载] → 返回详情走 hash 路由并由详情 effect 重建 `lastTripId`；直接打开 `/trips/<id>/split` 的返回场景单独覆盖。

## Migration Plan

无数据迁移。上线为纯前端路由改动；回滚只需回退该变更的前端提交。分支从 `origin/main` 创建，PR 合并后再执行 US-071 相关回归。

## Open Questions

无阻塞项。`#/login`、`#/register` 分支是否最终移除留待后续清理 change，本变更不删除。
