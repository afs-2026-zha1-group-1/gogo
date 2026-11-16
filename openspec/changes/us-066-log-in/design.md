# 设计 — us-066-log-in

- Change：`us-066-log-in`（REQ-008）
- 基线：`origin/main` `f6419a5`，本分支 merge `53bdcc6`
- 目标：以服务端 session 替换 `X-User-Id` scaffold，新增登录页/受保护访问/CSRF，
  同时迁移 trip、invitation、main-itinerary、splits 四类既有接口的身份来源。
- 约束：只做 US-066；登出（US-069）、我的账号（US-068）、扫码（US-067）不在范围。
- NFR 测试：用户 2026-11-16 决定不纳入，deferred。

## D1 认证与会话栈

**Context**：当前没有 Spring Security；所有接口自行解析 `X-User-Id`。
**Decision**：引入 `spring-boot-starter-security`，使用服务端 HTTP Session
（JSESSIONID，`SessionCreationPolicy.IF_REQUIRED`）、BCrypt 密码编码、JSON 登录
端点。登录成功由 Spring Security 的 `SecurityContextRepository` 写入 session；
登出留给 US-069，本 change 显式关闭 form-login 与 logout filter。
**Rejected**：自建 `auth_session` 表 + 自写过滤器（多一套安全代码与 CSRF 逻辑）；
JWT（注销需要黑名单，US-069 复杂化）；前端本地模拟（不满足受保护页 AC）。
**Consequences**：session 在单实例内存中，重启后全部失效（用户需重新登录）；
不引入 Spring Session/JWT 依赖。

## D2 凭据模型与种子

**Context**：`app_user(id, display_name)` 没有 email/password；五个夹具用户已存在。
**Decision**：新增 `account_credential(user_id PK/FK, email UNIQUE, password_hash)`
（`V6__create_account_credential.sql`），seed 五个账号：
`alice@example.com` … `eve@example.com`，统一演示密码 `gogo-demo-2026`
（夹具文件记录，并在演示登录页展示、标注仅演示）。邮箱比较前 trim + lower-case；密码仅存 BCrypt 哈希。
`app_user.id` 保持不变，供既有 trip_member/plan 引用。
**Rejected**：直接给 `app_user` 加列（SQLite ALTER 限制、凭据与展示混表）；
单独凭据服务/外部 IdP（超出 MVP）；注册流程（无故事）。
**Consequences**：运行时数据库对凭据只读；迁移时 seed 是唯一写操作。只有五个账号
能登录，注册是未来故事。

## D3 Principal 与 UserDetailsService

**Context**：既有代码需要 user id（`app_user.id`），登录返回还需要 name/email。
**Decision**：`AccountPrincipal`（record，实现 `UserDetails`）携带 `id`、`name`、
`email`；`CredentialUserDetailsService` 按 email 读取 `account_credential` +
`app_user`；`AccountResponse` 为 `{id,name,email}`。Controller 通过
`@AuthenticationPrincipal AccountPrincipal`（或 `Authentication.getPrincipal()`）
取身份，统一由 `CurrentAccount.id(...)` 读取；不在 controller 重复解析 header。
**Rejected**：只用 Spring 默认 `User`（丢失 id/name，需要额外查询）；
把 email 当主键（与 app_user id 不一致）。
**Consequences**：splits 的 `memberId` 可直接取 principal id 的字符串形式，保持
`MemberGuard`/`trip_member.user_id` 语义。

## D4 登录 / 当前账号 / CSRF 端点

**Context**：SPA 需要登录、会话探测、CSRF bootstrap。
**Decision**：
- `POST /api/auth/login`：JSON `{email,password}`；成功 200 `AccountResponse`，
  建立 session；任何失败（空白/未知邮箱/错误密码）统一 401
  `{code:"INVALID_CREDENTIALS", message}`；不返回账号存在性。
- `GET /api/auth/me`：已认证 200 `AccountResponse`；无/失效 session 401
  `{code:"USER_REQUIRED"}`。
- `GET /api/auth/csrf`：公开；返回 204/空体并确保 `XSRF-TOKEN` cookie 可被同源 JS
  读取（`CookieCsrfTokenRepository.withHttpOnlyFalse()`）。
**Rejected**：让登录 POST 免除 CSRF（降低安全性）；在 `me` 里返回 CSRF token
（缓存/时序复杂）。
**Consequences**：前端启动先 bootstrap CSRF，再登录；所有非 GET 请求带
`X-XSRF-TOKEN`。

## D5 安全链与公开面

**Context**：需要区分公开登录/预览与受保护业务，同时保留 splits 的既有 401 语义。
**Decision**：`SecurityFilterChain`（顺序如下）：
1. permitAll：`/api/auth/login`、`/api/auth/csrf`、`GET /api/greeting`、
   `GET /api/invitations/**`、`/api/trips/*/split-draft/**`、静态/非 `/api` 路径。
2. authenticated：其余 `/api/**`。
3. session：fixation protection（默认 `changeSessionId`）、30 分钟 idle timeout
   （`server.servlet.session.timeout=30m`，测试 profile 可覆盖）、
   `SessionCreationPolicy.IF_REQUIRED`。
4. CSRF：`CookieCsrfTokenRepository`，POST/PUT/PATCH/DELETE 校验
   `X-XSRF-TOKEN`；CSRF 失败 → 403 `CSRF_INVALID`。
5. 关闭 form login、HTTP Basic、logout（US-069 再开）。
6. 旧 `X-User-Id` 不注册为认证来源；只有 session principal。
**Rejected**：让 splits 走全局 401 `USER_REQUIRED`（破坏既有 `MEMBER_REQUIRED`
契约）；用 header 兼容层（留下绕过口）。
**Consequences**：splits 路径进入 controller 时由 `MemberGuard` 处理身份；
`MemberGuard` 从 principal 取 id，无 principal 时返回 `MEMBER_REQUIRED`。
greeting/preview 的公开性由 matcher 显式保证（C5）。

## D6 错误契约

**Context**：trip/invitation/main-plan 用扁平 `{code,message}`；splits 用
`{data,error:{code,message}}` 且 401 码 `MEMBER_REQUIRED`。
**Decision**：auth、trip、invitation、main-plan 及 Spring Security 的
`AuthenticationEntryPoint`/`AccessDeniedHandler` 统一扁平 `{code,message}`；
splits 保留 envelope + `MEMBER_REQUIRED`，并在 auth/splits delta 中写明为唯一例外。
CSRF 失败映射 403 `CSRF_INVALID`（扁平）；登录失败 401 `INVALID_CREDENTIALS`
（扁平）。不引入第三套形状。
**Rejected**：把所有端点改成 envelope（大范围破坏）；两套新错误体并存。
**Consequences**：前端 `api.ts` 继续按扁平 `code` 解析；`features/split/api.ts`
继续按 envelope 解析。

## D7 后端身份迁移

**Context**：trip、invitation、mainplan、splits 各自解析 header。
**Decision**：
- `TripController`、`InvitationController`、`MainPlanController` 改为读取
  `AccountPrincipal`，删除 `X-User-Id` 解析与相关 401 分支；保留
  `USER_REQUIRED`（由 Security 统一返回）/`NOT_A_MEMBER`/`NOT_ORGANIZER`/
  `NOT_ORGANIZER` 等业务码不变。
- splits 5 个端点：matcher permitAll；controller 不再读 header，改从
  `Authentication` 取 principal id（匿名则 null）并传给 `MemberGuard`；
  `MemberGuard` 的校验顺序/错误码/ envelope 不变。
- 测试辅助统一 session login；不保留 header 兼容分支。
**Rejected**：在过滤器里把 header 转成 principal（安全绕过）；只改 trip 不改
splits/main-plan（B1/B2 已指出会破坏既有功能）。
**Consequences**：所有受保护接口只有一种身份来源；旧 header 请求 401。

## D8 前端认证基础与双路由

**Context**：`main.jsx` 用 React Router（`/trips/:tripId/split/*`），`App.tsx`
用 hash 路由（`#/`、`#/join` 等）；split 另有 `IdentityProvider`/`IdentityBar`。
**Decision**：
- 新增 `features/auth/AuthProvider`：启动调用 `GET /api/auth/me` + CSRF bootstrap；
  暴露 `status`（checking/signedIn/signedOut）、`account`、`login`、`logout?`（不实现
  登出 UI）、`requireLogin(pending?)`。
- 共享 `LoginPage`（全屏、无 dock，Ant Design 语言 + 现有 tokens）；在 hash 路由
  注册 `#/login`，在 React Router 注册 `/login`；两处复用同一组件。
- hash `App.tsx`：除 `#/login` 与 `#/join/<token>` 外，未登录访问受保护 hash 路由
  跳转 `#/login`；登录后无 pending → `#/`；已登录访问 `#/login` → `#/`。
- React Router：`/login` 公开；split 路由包 `RequireAuth`，未登录跳 `/login`；
  登录后无 pending → `/`（渲染 App 的 `#/`）。
- 移除 `ScaffoldBar`、`users()` 种子列表、`IdentityProvider`/`IdentityBar`/
  localStorage 身份；shell 显示只读账号名。
- `api.ts` 与 `features/split/api.ts`：移除 `X-User-Id`，同源 cookies；非 GET 自动
  带 `X-XSRF-TOKEN`；401 交给 AuthProvider（受保护页跳登录，preview 不跳）。
**Rejected**：为两套路由各写一套认证状态（漂移）；把 split 强行并入 hash 路由
（大重构，超出故事）。
**Consequences**：两个 router 共享一个 auth 源；split 屏不再依赖可编辑身份栏；
类型/导入迁移为 TS/TSX。

## D9 待邀请恢复

**Context**：AC2 要求登录后恢复 invitation preview；不得自动加入。
**Decision**：`#/join/<token>` preview 公开；未登录用户执行 accept 或显式登录时，
把 token 存入 `sessionStorage`（`gogo.pendingInvite`）；登录成功后：
- 有 pending token → `window.location.assign('/#/join/<token>')`，重新渲染公开
  preview；不自动 accept；
- 无 pending → dashboard `#/`。
明确 accept 仍走 `POST /api/invitations/{token}/accept`（需 session）。
**Rejected**：localStorage（跨 tab 泄漏/陈旧 token）；登录后自动 accept（违反 AC2）。
**Consequences**：token 只在当前 tab 生命周期内保留；离开 preview 或成功后清理。

## D10 splits 功能适配

**Decision**：`features/split/api.ts` 去掉 header，改用同源 cookie + CSRF；
`hooks.ts` 的 React Query key 去掉 `memberId`，改用 auth account id（或不再包含身份，
因为身份来自 session）；`identity.tsx` 删除/替换为只读账号展示；四个 screen 去掉
`IdentityBar` 与可编辑 trip/member 输入，tripId 仍从 URL 读取；401 由 `SplitApiError`
交给 AuthProvider/导航。splits 的 `{data,error}` 解析保持不变。
**Rejected**：保留 localStorage 身份（绕过登录）；保留 header（与 session 冲突）。
**Consequences**：split 页面成为受保护页面；无 session 时由后端 `MemberGuard`
返回 `MEMBER_REQUIRED`，前端映射到登录。

## D11 会话过期与测试策略（G1 C5）

**Decision**：
- **MockMvc CSRF**：统一 `AuthTestSupport`（`GET /api/auth/csrf` → 取 token/cookie →
  `POST /api/auth/login` → 返回 session）；写请求用 `SecurityMockMvcRequestPostProcessors.csrf()`
  或 cookie/header；不关闭测试里的 CSRF。
- **过期 session**：`MockMvc` 覆盖“无/失效 session → 401”；另加
  `@SpringBootTest(webEnvironment=RANDOM_PORT, properties="server.servlet.session.timeout=1s")`
  的真实 cookie 测试，等待后请求 401，再登录恢复（C5）。
- **公开面**：`AuthApiTest` 显式断言 greeting 与 invitation preview 无 session 可读，
  且受保护接口无 session 401；不依赖“默认放行”。
- **短超时 profile**：测试属性覆盖 `server.servlet.session.timeout=1s`，只在该测试类
  使用；生产默认 30m。
**Rejected**：只在单元层 mock session（无法证明容器/session 行为）；关闭 CSRF 测试。
**Consequences**：C5 在 P3 设计层面闭环；P4 执行时按此实现。

## D12 迁移、顺序与运行

- `V6` 在 `V5` 之后；`V1`–`V5` 已占用（V4=splits，V5=main plan）；不修改历史迁移。
- 生产 `application.yml` 增加 `server.servlet.session.timeout=30m`；不引入 DB session。
- 先登录后端契约与测试 → 安全链/身份迁移 → 前端 auth/登录/守卫 → split 适配 →
  全量回归；测试与文档随任务组提交，不 push/merge 除非用户授权。
- 已合并 main 的 splits/main-itinerary Living Spec 由本 change 的 MODIFIED delta 对齐；
  splits Purpose 的 `X-Member-Id` 文案是既有漂移，归档时由 SA 修正（残余）。

## D13 非目标与残余

- 不做 logout/账号/注册/扫码；不做 rate limiting/账户锁定/HTTPS 终止。
- 不引入 JWT/Spring Session/ORM；不新增前端依赖（React Router/TanStack 已在 main）。
- 残余：splits Purpose 文案漂移；demo 凭据只用于演示；session 重启失效；
  G1 仍为 Conditional，转 Pass 需 IO/SA 确认。
