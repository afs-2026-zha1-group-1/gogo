# ATDD 设计 — us-066-log-in

- Change：`us-066-log-in`
- Spec：`openspec/changes/us-066-log-in/specs/{auth,trips,invitations,app-shell,main-itinerary,splits}/spec.md`
- 基线：`origin/main` `f6419a5`（本分支 merge `53bdcc6`）
- G1：Conditional（IO Johnson / SA Elian Jiang），C1–C4 已于 2026-11-16 闭合
- NFR 测试：**用户决定不纳入**（2026-11-16），记录为 deferred，不写性能/可观测性/压测项

## 1. ATDD 层次

| # | 场景/主题 | 层次 | 说明 |
|---|---|---|---|
| A1 | 有效/未知邮箱/错误密码/空白凭据登录；邮箱 trim+大小写 | API | `POST /api/auth/login` 的单端点契约 |
| A2 | 登录建立 session；`GET /api/auth/me`；session id 轮换；无/未知 session | API | `MockMvc` 的 cookie/session 断言 |
| A3 | 过期 session 的 401 与重新登录 | API | 独立短超时 profile；`MockMvc` 用失效 session 覆盖“无有效 session”分支 |
| A4 | 受保护 trip/invitation/main-plan/splits 接口无 session 或只有旧 header | API | 旧 header 必须 401，不得授权 |
| A5 | 认证后 member/organizer 结果不变（Alice/Ben/Eve） | API | 复用既有 trip/invitation/main-plan/splits 断言 |
| A6 | CSRF：bootstrap、缺失/有效 token、GET 不需要 | API | `MockMvc` 的 `csrf()`/cookie 断言 |
| A7 | 公开面：greeting 与 invitation preview 无 session 可读 | API | C5 的显式安全链回归 |
| A8 | splits 例外：无 session → 401 `MEMBER_REQUIRED` + `{data,error}`；认证后行为不变 | API | C3 的契约例外 |
| A9 | 错误体形状：auth/trip/invitation/main-plan 扁平 `{code,message}`；splits envelope | API | Spring Security handler 也走此层 |
| A10 | 登录页成功 → dashboard；失败 → 通用错误；已登录访问 `#/login` → `#/` | E2E | 浏览器路径，用户可感知 |
| A11 | 未登录访问 `#/trips/<id>`/`#/create`/split 路由 → 登录页，无私有数据 | E2E | 双路由（hash shell + React Router split） |
| A12 | 待邀请：公开 preview → 操作 → 登录 → 同一 preview 恢复 → 显式 accept | E2E | 不自动加入；membership 只在显式 accept 后出现 |
| A13 | 登录后 shell 显示只读账号名；无切换器/种子用户列表 | E2E | 移除 ScaffoldBar / split IdentityBar |
| A14 | 既有 create/details/invitation/join/main-plan/split 行为回归 | E2E + API | 业务结果和错误码不变 |

**Deferred to `/sdd:atdd-apply`（unit-level TDD）**：BCrypt 编码/邮箱标准化、密码比较、
session principal 映射、CSRF token 解析、React auth reducer/guard 纯逻辑。

**Reverse cases（Non-goals）**：无注册/登录页外注册入口（API+E2E）；无 logout 端点/UI
（API）；`X-User-Id` 单独不授权（API）；登录错误不泄露账号存在性（API）；splits 不返回
扁平错误体（API）；不引入第三套错误体（API）。

## 2. 生产代码之前先写什么

- `AuthApiTest`（红）：登录成功/失败、`me`、session 轮换、CSRF、公开面、错误体、
  header-only、短超时 profile。
- 既有 `TripApiTest`、`InvitationApiTest`、`MainPlanApiTest`、4 个 splits API 测试的
  identity 辅助改为 session login + CSRF；业务断言先保持不变。
- 浏览器 E2E 检查表（文本）：登录、受保护跳转、邀请恢复、split 路由守卫、身份展示。
- 先红后绿：认证契约与 identity 迁移的失败用例必须先于实现出现；`/sdd:atdd-apply`
  负责红绿循环和单元测试。

## 3. 本地 vs CI 门

| 门 | 命令/方式 | 说明 |
|---|---|---|
| 本地后端 | `cd backend && mvn -B test` | 所有 API 验收 + Spring Security 测试 |
| 本地前端 | `cd frontend && npm run build`（`tsc -b && vite build`） | 类型与构建 |
| 本地 E2E | Vite + Spring Boot 浏览器走查 | 登录、邀请、双路由守卫、splits |
| CI | `.github/workflows/ci.yml` 两个 job 不变 | 不新增 CI 产品/服务 |

## 4. Fixtures 策略

- 账号：`acceptance-test-fixtures.md` §REQ-008 的 Alice…Eve、email、`gogo-demo-2026`；
  V6 只存 BCrypt 哈希。
- MockMvc 登录辅助：`GET /api/auth/csrf` 取 token/cookie → `POST /api/auth/login` →
  返回 `MockHttpSession`；写请求统一 `csrf()` 或 `X-XSRF-TOKEN`。
- 短超时 profile：独立 `@SpringBootTest(webEnvironment=RANDOM_PORT, properties =
  server.servlet.session.timeout=1s)`；等待后断言 401，再登录恢复。
- splits：复用既有 in-memory SQLite 基类，`memberId` 来自 session principal（app_user.id），
  不再从 header 读取；无 session 走 `MemberGuard` 的 `MEMBER_REQUIRED`。
- 邀请：preview 公开；accept 需 session；测试先 preview 再登录再 accept，断言无自动 membership。
- 每个测试独立 DB/会话，不共享 cookie；`GreetingApiTest` 保持无 session。

## 5. Non-goals

- 不写生产业务代码、不写完整单元测试套件、不生成 Playwright/POM/Excel。
- 不新增 CI 语义；不新增性能/可观测性 NFR 测试（用户已决定 deferred）。
- 不把 splits 的 `MEMBER_REQUIRED`/envelope 改成扁平错误；只记录例外。
