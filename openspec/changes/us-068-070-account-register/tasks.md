# Tasks — us-068-070-account-register

- Change: `openspec/changes/us-068-070-account-register/`
- Delta: auth 3 ADDED + 3 MODIFIED（38 场景）、app-shell 4 MODIFIED（19 场景）；Design: D1–D16；ATDD: API + E2E（`atdd-design.md`）
- 执行模式：**红先**（先写失败验收测试再实现）；本文件由 P3 产出，P4 `/sdd:atdd-apply` 执行
- 分支：`US-068-070-account-register`（用户 2026-11-16 裁决，走 PR）

## 1. 地基：校验、错误边界与测试基座（D3/D9/D15）

- [x] 1.1 **红**：`AuthValidationTest`（UT，P4 内）覆盖邮箱 trim/小写/格式、名 strip + 1/30/31 code point、密码 5/6/72/73 字节；当前无校验器 → 红
- [x] 1.2 **绿**：新增 `AccountValidation`（或等价纯函数）：`normalizeEmail`、`validEmail`、`normalizeName`、`nameLength`、`passwordBytes`；错误码 `INVALID_EMAIL`/`INVALID_NAME`/`INVALID_PASSWORD`（D3）
- [x] 1.3 **绿**：`AuthErrorAdvice` 按路径分流畸形 JSON（login → 401 `INVALID_CREDENTIALS`；register/patch me → 400 `INVALID_REQUEST`）；新增 `DataAccessException` → 500 扁平 `INTERNAL_ERROR`（D9）
- [x] 1.4 **绿**：`PasswordEncoder` 复用既有 BCrypt bean；不新增依赖（D2/D4）
- [x] 1.5 验证：`cd backend && mvn -B test` 既有 186+ 测试全绿（无行为回归）

## 2. 注册 API（D2/D4/D5）

- [x] 2.1 **红**：`RegisterApiTest` 覆盖 R1–R8：有效注册、重复/大小写、非法邮箱/名/密码、畸形 JSON、注册后 `me` 401、持久化失败回滚、注册后登录；独立内存 SQLite + 行数基线；当前树 → 404 全红
- [x] 2.2 **绿**：`AccountCredentialRepository` 增 `insertAccount(displayName, email, passwordHash)`：`TransactionTemplate` 内 `INSERT app_user` → `last_insert_rowid()` → `INSERT account_credential`；返回新 id（D2/D4）
- [x] 2.3 **绿**：`AccountService.register(email,name,password)`：校验 → 始终 BCrypt 哈希 → 事务插入 → 冲突捕获为通用成功；其他异常回滚（D3/D4）
- [x] 2.4 **绿**：`AuthController` 增 `POST /api/auth/register`，返回 `RegisterResponse("login")`；不写 SecurityContext/session（D5）
- [x] 2.5 **绿**：`SecurityConfig` permitAll 增加 `/api/auth/register`；CSRF 保持（D8）
- [x] 2.6 **红/绿**：`RegistrationConcurrencyTest` 两线程同邮箱 → 两边通用 200、恰一行；如 MockMvc 并发不稳，降级 service/repository 级并记录（D4/D15）
- [x] 2.7 验证：2.1/2.6 转绿；响应体逐字节一致；无 session cookie

## 3. 资料 API（D2/D3/D6）

- [x] 3.1 **红**：`ProfileApiTest` 覆盖 M1–M3、M5–M8：读资料、trim 改名、空白/31 字符、身份/成员不变、他人账号不可改、失败保留旧值、未登录 401；真实登录 session；当前树 PATCH → 405 红
- [x] 3.2 **绿**：`AccountCredentialRepository` 增 `findById(userId)`（join `app_user` + `account_credential`）与 `updateDisplayName(userId, name)`（返回行数）（D6）
- [x] 3.3 **绿**：`AuthController.me` 改为按 principal.id 读库，返回最新投影；账号缺失 → 401 `USER_REQUIRED`（D6）
- [x] 3.4 **绿**：`AuthController` 增 `PATCH /api/auth/me`：只接受 `{name}`、目标 id 取自 principal、校验 → 更新（0 行 → 401）→ 新 `AccountPrincipal` 写回 SecurityContext 并保存 → 返回 `{id,name,email}`（D6）
- [x] 3.5 验证：3.1 转绿；`AuthApiTest` 的 `me` 仍返回 Alice；改名后新 session/旧 session 的 `me` 均为新名

## 4. 退出 API（D7/D8）

- [x] 4.1 **红**：`LogoutApiTest` 覆盖 L1、L4、L5：退出 204、旧 session `me`/受保护 API 401、重复/无会话 401、缺 CSRF 403；当前树 → 404 红
- [x] 4.2 **绿**：`AuthController` 增 `POST /api/auth/logout`（认证 + CSRF）：`SecurityContextLogoutHandler` 失效 session/清 context → 204；不写业务表（D7）
- [x] 4.3 验证：4.1 转绿；退出后重新登录数据完整；既有 `SessionExpiryApiTest` 不回归

## 5. 前端认证状态（D10）

- [x] 5.1 **绿**：`AuthProvider` 增 `register`（不设 signedIn）、`logout`（204 后清状态；失败保持）、`updateName`（成功后更新 account + `invalidateQueries`）；沿用 `ensureCsrf`/`csrfHeaders`（D10）
- [x] 5.2 **绿**：`types.ts` 增 `RegisterRequest/RegisterResponse` 等 wire 类型；`Account` 复用 `{id,name,email}`（D10）
- [x] 5.3 验证：`cd frontend && npm run build`（tsc 零错误）；既有登录/邀请恢复不回归

## 6. 路由、底部导航与壳（D11）

- [x] 6.1 **绿**：`App.tsx` `parseRoute` 支持 `/register`、`/account`；`router.tsx` 注册 `/register`、`/account`；`types.ts` `TabId` 增 `account`，`TAB_FOR_PAGE` 映射（D11）
- [x] 6.2 **绿**：`TabBar` 增第 5 个“我的”（user 图标，`#/account`）；`App.tsx` 移除三处 `AccountBar`；split 身份条同步核对（D11）
- [x] 6.3 **绿**：My Account 在壳内渲染（`#/account` 与 `/account`），注册/登录页全屏无 dock（D11）
- [x] 6.4 验证：五 tab 文本走查；已登录访问登录/注册页回 `#/`；未登录访问 `#/account` 打开登录页

## 7. My Account、问候与名称联动（D12/D14）

- [x] 7.1 **绿**：新增 `AccountPage`，按 UI 参考稿：返回 + “我的”、头像首字母 + 名字 + 邮箱、名字输入（1–30，客户端校验）、“保存名字”主按钮、红色描边“退出登录”（busy/错误，成功跳 `/login`）（D12）
- [x] 7.2 **绿**：`Home` 问候显示 `你好，{account.name}`，不追加“组织者”；信息（i）控件保留；不新增扫码（D12）
- [x] 7.3 **绿**：改名成功后 auth 状态与 React Query 缓存失效；成员列表、邀请身份、偏好、路线/分组标签在导航/刷新后显示新名；头像首字母若渲染则更新（D14）
- [x] 7.4 验证：浏览器走查 M4/M5/M8/S1/S2；旧名无残留

## 8. 注册页与登录入口（D13）

- [x] 8.1 **绿**：新增 `RegisterPage`（按 UI 参考稿：返回按钮 + “创建 GoGo 账号”、品牌头部、名字/邮箱/密码/确认密码、密码提示“至少 8 个字符”、主/次按钮，全屏无 dock）；客户端逐字段校验镜像 D3（密码 ≥8 字符、确认一致）；成功写 `sessionStorage['gogo.login.email']` 并跳 `/login`（D13）
- [x] 8.2 **绿**：`LoginPage` 增加 “Create account” 链接到 `/#/register`；读取并清除预填邮箱（D13）
- [x] 8.3 验证：R4/R5/R9/R10/S3/S4 走查；重复邮箱与新邮箱 UI 都显示“前往登录”，不提示已注册
- [x] 8.4 **绿**：注册页弹窗：新邮箱“注册成功 / 去登录”，重复邮箱 `409 EMAIL_TAKEN` → “该邮箱已注册 / 去登录 / 修改邮箱”；点击去登录才跳转并预填邮箱（S25）

## 9. 回归、E2E 与证据（D15/D16）

- [x] 9.1 **红/绿**：E2E 步骤清单 `docs/feedback/e2e-us-068-070.md`（R9/M4/L2/L3/L6/S1–S6），P4 执行并回填观察
- [x] 9.2 `mvn -B test` 全量 + `npm run build`；schema 断言（迁移仍 V1–V6、`app_user`/`account_credential` 列集不变）（D2/D16）
- [x] 9.3 `openspec validate us-068-070-account-register --strict` 复跑；fixtures §REQ-009 与实现逐项核对
- [x] 9.4 Non-goals 反向用例：无验证邮件/端点、无自动登录、无账号删除/改密/SSO、无头像上传、无扫码/聚合、无行程域行为变化（D16）
- [x] 9.5 `/sdd:local-verify-report`（P4 末）→ G2 前必备

## 10. 文档与归档承接（P5）

- [ ] 10.1 `tech-stack-plan` 补注册/退出/改名 API 与 4 个 400 错误码，收敛“MVP 不做注册登录”偏差；`_LOG.md` 追加（`openspec/config.yaml` 的最终任务）
- [ ] 10.2 `registry.md` / `handoff.md` 状态更新；US-068/069/070 看板卡在 G3 后转 Done
- [ ] 10.3 归档时以 delta Purpose 覆盖 Living Purpose；旧场景标题（四 tab / identity switcher）做 Living Spec 卫生改名
- [ ] 10.4 P4 前确认 issue #40（US-068）卡片交接（当前指派 `DENGLU-OOCL`，流程事项）

## 决策映射（design → tasks）

| 决策 | 落地任务 |
|---|---|
| D1 分层 | 2.2–2.4、3.2–3.4、4.2 |
| D2 数据模型/零迁移 | 1.4、2.2、3.2、9.2 |
| D3 校验/错误码 | 1.1–1.3、2.3、3.4、8.1 |
| D4 注册事务/并发/隐私 | 2.2/2.3/2.6 |
| D5 注册响应/无会话 | 2.4/2.5、8.1 |
| D6 资料/principal 新鲜度 | 3.2–3.4 |
| D7 退出 | 4.2 |
| D8 SecurityConfig | 2.5、4.2 |
| D9 错误边界 | 1.3 |
| D10 前端认证状态 | 5.1–5.3 |
| D11 路由/壳 | 6.1–6.4 |
| D12 My Account/问候 | 7.1/7.2 |
| D13 注册页/登录入口 | 8.1/8.2 |
| D14 名称联动 | 7.3 |
| D15 测试接缝 | 2.1/2.6、3.1、4.1、9.1 |
| D16 Non-Goals 反向 | 9.2/9.4 |

## 四向对齐自检（Spec ↔ Design ↔ ATDD ↔ Tasks）

- **场景覆盖**：auth 38 + app-shell 19 = 57 场景。ADDED 注册由 R1–R8 覆盖；资料由 M1–M8 覆盖；退出由 L1–L6 覆盖；MODIFIED auth 由 `AuthApiTest` + BIZ 回归覆盖；app-shell 4 条由 S1–S6 + L2 覆盖 → Pass。
- **Decision 覆盖**：D1–D16 均有至少一个落地任务（见上表）→ Pass。
- **错误码**：`INVALID_EMAIL`/`INVALID_NAME`/`INVALID_PASSWORD`/`INVALID_REQUEST`（400）、`USER_REQUIRED` 401、`CSRF_INVALID` 403、`INTERNAL_ERROR` 500 均在 delta/design/ATDD/tasks 出现 → Pass。
- **Non-Goals 反向**：每项 ≥1 case（9.4 + atdd §5）→ Pass。
- **G1 承接**：F1（P3 design：事务/logout/advice）→ 1.3/2.2/3.4/4.2；F2（卡片交接）→ 10.4；F3（浏览器回归）→ 7.4/9.1；F4（P5 文档）→ 10.1–10.3 → Pass。
- **范围**：无 delta 之外的新增能力；无新表/迁移/依赖 → Pass。
