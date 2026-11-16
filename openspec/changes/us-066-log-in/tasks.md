# 任务 — us-066-log-in

- Change：`us-066-log-in`（REQ-008，US-066）
- Spec：`specs/{auth,trips,invitations,app-shell,main-itinerary,splits}/spec.md`
- 设计：`design.md`（D1–D13）；ATDD：`atdd-design.md`
- 执行方式：红 → 绿 → 重构；每个任务组结束跑对应测试；不 push/merge 除非用户授权。
- 基线：`origin/main` `f6419a5`，本分支 merge `53bdcc6`。

## 0. 基线与准备

- [ ] 0.1 确认分支已含 `origin/main` `f6419a5`，`V1`–`V5` 占用、`V6` 空闲；
      记录当前后端/前端测试基线（`cd backend && mvn -B test`；
      `cd frontend && npm run build`）。
- [ ] 0.2 在 `acceptance-test-fixtures.md` §REQ-008 中确认五个账号、email 与
      `gogo-demo-2026`；确认 splits/main-plan 夹具仍可解析（无新 demo 数据）。

## 1. 后端认证（auth 能力）

- [ ] 1.1 `V6__create_account_credential.sql`：凭据表 + 唯一 email 索引 + 五个
      BCrypt 种子（不含明文）；测试数据库迁移通过。
- [ ] 1.2 `AccountCredentialRepository`：按 email 读取 user_id/name/hash；email
      trim + lower-case；无 email 时返回空。
- [ ] 1.3 `AccountPrincipal`（UserDetails）+ `CredentialUserDetailsService` +
      `BCryptPasswordEncoder`；principal 暴露 id/name/email。
- [ ] 1.4 `AuthController`：`POST /api/auth/login`（成功 200 `{id,name,email}`；
      空白/未知/错误密码统一 401 `INVALID_CREDENTIALS`）、`GET /api/auth/me`
      （200/401 `USER_REQUIRED`）、`GET /api/auth/csrf`（公开 bootstrap）。
- [ ] 1.5 登录 session fixation 轮换、`server.servlet.session.timeout=30m`；
      不创建 logout/form-login 端点。

## 2. 安全链、CSRF 与错误契约（C3/C5）

- [ ] 2.1 `SecurityFilterChain`：公开 matcher（login/csrf/greeting/GET preview/
      splits/static）、其余 authenticated；关闭 form-login、httpBasic、logout。
- [ ] 2.2 CSRF：`CookieCsrfTokenRepository.withHttpOnlyFalse()`；POST/PUT/PATCH/DELETE
      校验 `X-XSRF-TOKEN`；缺失/非法 403 `CSRF_INVALID`。
- [ ] 2.3 `AuthenticationEntryPoint`/`AccessDeniedHandler` 返回扁平 `{code,message}`；
      auth/trip/invitation/main-plan 保持扁平；splits 继续 envelope + `MEMBER_REQUIRED`。
- [ ] 2.4 splits 例外：permit 5 个 split-draft 路径，由 `MemberGuard` 处理未认证
      （`MEMBER_REQUIRED`）；确认 Security 不会抢先返回 `USER_REQUIRED`/HTML。
- [ ] 2.5 C5：测试辅助 `AuthTestSupport`（csrf → login → session）与短超时 profile
      测试类；显式断言 greeting/preview 无 session 可读。

## 3. 后端身份迁移

- [ ] 3.1 `TripController`：删除 `X-User-Id` 解析，改用 principal id；保留
      `USER_REQUIRED`/`NOT_A_MEMBER`/`TRIP_NOT_FOUND` 等结果。
- [ ] 3.2 `InvitationController`：issuance/accept 用 principal；preview 保持公开；
      身份错误优先于无效 token。
- [ ] 3.3 `MainPlanController`：四个端点改用 principal；organizer/member 结果与码不变。
- [ ] 3.4 splits：`SplitDraftController` 不再读 header；从 `Authentication` 取
      principal id（匿名 null）传给 `MemberGuard`；5 个端点行为/码/envelope 不变。
- [ ] 3.5 全后端搜索 `X-User-Id`：生产代码不再读取；测试改为 session 辅助。

## 4. 前端认证基础

- [ ] 4.1 `features/auth/AuthProvider`：启动 `GET /api/auth/me` + CSRF bootstrap；
      `checking/signedIn/signedOut`、account、登录/跳转辅助。
- [ ] 4.2 `api.ts`：移除 `X-User-Id`；同源 cookies；非 GET 自动带 `X-XSRF-TOKEN`；
      401 交给 auth 层。
- [ ] 4.3 `LoginPage`（全屏、无 dock，Ant Design 语言 + 现有 tokens）：email/password、
      busy、通用错误；成功回调。
- [ ] 4.4 hash 路由：`#/login` 公开；`#/join/<token>` 公开；其余受保护 hash 路由
      未登录跳 `#/login`；登录后无 pending → `#/`；已登录 `#/login` → `#/`。
- [ ] 4.5 React Router：`/login` 公开；split 路由包 `RequireAuth`；未登录跳 `/login`，
      登录后无 pending → `/`；不改变 split URL 结构。
- [ ] 4.6 移除 `ScaffoldBar`、`users()` 种子列表、`IdentityProvider`/`IdentityBar`/
      localStorage 身份；shell 显示只读账号名；保持 dock/frame 合同。
- [ ] 4.7 待邀请：`sessionStorage` 存 token；登录后恢复到 `#/join/<token>`；
      不自动 accept；离开/成功后清理。

## 5. 页面与 splits 适配

- [ ] 5.1 `CreateTrip`、`TripDetails`、`Join`、`InvitationPanel`、`MainPlan`、
      `MainPlanInputs` 去掉 `userId` props/header 依赖；详情权限显示用 auth account。
- [ ] 5.2 `features/split/api.ts`：移除 header；cookie + CSRF；保留 `{data,error}` 解析。
- [ ] 5.3 `features/split/hooks.ts`：React Query key 去掉 `memberId`；改用 auth 状态。
- [ ] 5.4 split screens/identity：移除可编辑身份栏与 trip/member 输入；tripId 仍取 URL；
      401/403 状态映射到登录/权限提示；四个 screen 样式不回归。
- [ ] 5.5 `types.ts`/`types/*` 与 TS 严格构建：新增 auth 类型，`tsc -b` 零错误。

## 6. 测试与验收

- [ ] 6.1 `AuthApiTest`（红先）：A1–A9（登录、me、fixation、header-only、公开面、
      CSRF、错误体、splits 例外、短超时）。
- [ ] 6.2 迁移 `TripApiTest`/`InvitationApiTest`/`MainPlanApiTest`/4 个 splits 测试到
      session + CSRF；既有业务断言/码不变。
- [ ] 6.3 `GreetingApiTest` 保持无 session 公开；新增 preview 公开/accept 401 的断言。
- [ ] 6.4 浏览器 E2E：A10–A14（登录、受保护跳转、邀请恢复、split 守卫、身份展示、
      既有回归）；文本检查表记录于 `docs/feedback/`。
- [ ] 6.5 全量回归：`mvn -B test`、`npm run build`；记录命令与结果。

## 7. 文档与对账

- [ ] 7.1 `README.md`：登录方式、演示账号/密码（demo-only）、公开/受保护面。
- [ ] 7.2 `registry.md`/`handoff.md`：REQ-008 状态与 G1 条件闭合；不覆盖历史记录。
- [ ] 7.3 `docs/knowledge/architecture/tech-stack-plan.md`：记录 Spring Security/
      V6/session 偏差与 API 清单（OpenSpec config 要求归档前对账）。
- [ ] 7.4 `g1-addendum-c1-c4.md` 保持最新；转 Pass 需 IO+SA 明确确认，不由 agent 自签。

## 8. 最终验证与对齐自检

- [ ] 8.1 Spec ↔ Design ↔ Tasks ↔ ATDD 对齐自检（下表）通过，无静默扩缩。
- [ ] 8.2 C5 检查：CSRF MockMvc、短超时 profile、greeting/preview 显式公开均有测试。
- [ ] 8.3 全量验收 + 浏览器 E2E 完成；无 BLOCKER；残余风险记录（splits Purpose 漂移、
      in-memory session、demo 凭据）。
- [ ] 8.4 交给 P4 `/sdd:atdd-apply`；不 push/merge 除非用户授权。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Spec requirement | Design | Tasks | ATDD |
|---|---|---|---|
| auth: Account credential login | D2/D3/D4 | 1.1–1.4 | A1 |
| auth: Server session and current account | D1/D3/D4 | 1.3–1.5 | A2/A3 |
| auth: Protected request identity and public surfaces | D5/D7 | 2.1–2.4, 3.1–3.4 | A4/A5/A7 |
| auth: CSRF protection | D5/D11 | 2.2, 2.5 | A6 |
| auth: Login page and post-login resume | D8/D9 | 4.1–4.7 | A10–A12 |
| auth: Error response shape and split exception | D6 | 2.3–2.4 | A8/A9 |
| trips: Trip caller identity | D7 | 3.1 | A4/A5 |
| invitations: issuance/acceptance/unusable | D7 | 3.2 | A4/A5/A9 |
| app-shell: frame/dock/dashboard/join | D8/D10 | 4.4–4.6, 5.4 | A10–A13 |
| main-itinerary: identity | D7 | 3.3 | A4/A5 |
| splits: five endpoints identity | D7/D10 | 3.4, 5.2–5.4 | A8/A14 |

无静默扩缩：登出/账号/注册/扫码/性能测试均未进入任务；NFR 已按用户决定 deferred。
