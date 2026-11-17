# Design — us-068-070-account-register

- Change: `openspec/changes/us-068-070-account-register/`（US-068 My Account / US-069 退出 / US-070 注册）
- Delta: `specs/auth/spec.md`（3 ADDED + 3 MODIFIED / 38 场景）、`specs/app-shell/spec.md`（4 MODIFIED / 19 场景）；G1 Pass
- 约束基线：无新表无新迁移；沿用 V6 `account_credential`（邮箱唯一、BCrypt）与 `app_user`；Spring Security session/CSRF；React + Vite + 双路由

## D1 分层与职责

- **Context**：既有 `auth` 包为 Controller → Repository → SecurityConfig；无 service 层。Rules 要求 orchestration 与 execution 分离、层边界清晰。
- **Decision**：新增 `AccountService`（注册/资料/改名的校验、事务编排）与 `AuthController` 三个端点（register/logout/patch me）；`AccountCredentialRepository` 扩为账号读写仓库；SecurityConfig 只加路径与 logout 语义。Controller 只做 DTO 解析、principal 读取与委托。
- **Alternatives**：把逻辑塞进 Controller（不可测、越层）；新建独立 `registration` 模块（当前规模过度）；引入 ORM（偏离技术栈）。
- **Consequences**：`auth` 包新增 1 个 service + 2 个 DTO；行程域代码不动。

## D2 数据模型与“零迁移”

- **Context**：`app_user(id INTEGER PRIMARY KEY, display_name)`；`account_credential(user_id PK/FK, email UNIQUE, password_hash)`；V6 已种子五个账号。
- **Decision**：注册在同一事务插入 `app_user`（rowid 自增）后插入 `account_credential`；改名只更新 `app_user.display_name`；退出不写业务表。**不新增迁移、不加列**。
- **Alternatives**：新增 `registered_at`/`status` 列（无 AC 需要，需迁移）；把邮箱并入 `app_user`（破坏 V6 与 REQ-008 契约）。
- **Consequences**：无 Flyway 撞版本；P4 用 schema 断言（迁移仍 V1–V6、两表列集不变）防误加。

## D3 校验策略与错误码

- **Context**：G1 批准 4 个 400 校验码；既有扁平 `{code,message}`。
- **Decision**：
  - 邮箱：`strip().toLowerCase(Locale.ROOT)`；基础格式 `^[^@\s]+@[^@\s]+\.[^@\s]+$`；失败 `INVALID_EMAIL`。
  - 显示名：`String.strip()`；按 Unicode code point 计数 1–30；失败 `INVALID_NAME`。
  - 密码：不 strip；UTF-8 字节数 6–72（BCrypt 上限）；失败 `INVALID_PASSWORD`。注册页 UI 按参考稿要求至少 8 个字符并要求确认密码一致（客户端更严格；服务端契约不变）。
  - 畸形请求体：400 `INVALID_REQUEST`；登录路径保持 401 `INVALID_CREDENTIALS`。
  - 字段顺序固定：邮箱 → 显示名 → 密码；只返回第一个失败码（扁平体，不新增 details）。
- **Alternatives**：返回 `details.fields[]`（引入第三层错误体，与 REQ-008 冲突）；按字符数而非字节数限制密码（BCrypt 会静默截断）。
- **Consequences**：客户端与服务端使用同一规则；客户端校验仅为体验，服务端为准。

## D4 注册事务、并发与隐私

- **Context**：AC 要求恰好一个账号、重复/并发不建第二行、响应不可区分。
- **Decision**：
  - 先计算 BCrypt 哈希（无论是否重复），再在 `TransactionTemplate` 内：`INSERT app_user` → `SELECT last_insert_rowid()` → `INSERT account_credential`。
  - 唯一索引冲突在事务回调外捕获：SQLite 驱动把唯一约束上报为 `UncategorizedSQLException`（SQL state 为 null），因此捕获 `DataAccessException` 并检查 cause 链是否包含 `account_credential.email` → 抛出 `409 EMAIL_TAKEN`；事务回滚两表，不留半条账号。其他数据访问异常继续抛出（500）。这是用户 2026-11-17 的明确指令，覆盖原“不披露邮箱是否存在”的 AC；接受邮箱枚举风险。
  - 其他持久化异常 → 事务回滚 → 500 扁平 `{code:"INTERNAL_ERROR",message}`；重试仍受唯一索引保护。
  - **不预查邮箱**（避免“存在则跳过哈希”的耗时差）；重复路径与成功路径做同样的哈希工作。
- **Alternatives**：先 `findByEmail` 再插入（时序可枚举）；应用层锁（单实例可取但 SQLite 唯一索引已足够）；返回 409（泄露存在性，违反 AC）。
- **Consequences**：并发最终恰一行；响应体与状态逐字节一致；`INTERNAL_ERROR` 仅用于 5xx，不属于 G1 的 4xx 契约。

## D5 注册端点与会话

- **Decision**：`POST /api/auth/register` 公开（SecurityConfig permitAll）但受 CSRF；不创建 SecurityContext、不写 session；新邮箱响应 `200 {"next":"login"}`，重复邮箱响应 `409 EMAIL_TAKEN`；前端在注册页弹窗确认后再跳登录。
- **Alternatives**：注册后自动登录（AC 明确否定）；返回账号投影（会泄露/绕过隐私响应）。
- **Consequences**：注册与登录职责分离；邀请 token 留在 sessionStorage，登录后恢复。

## D6 资料读取、改名与 principal 新鲜度

- **Context**：`GET /api/auth/me` 目前从 session 内的 `AccountPrincipal` 返回姓名；改名后其他会话仍会看到旧名。
- **Decision**：
  - `GET /api/auth/me` 改为按 principal.id 从数据库读取最新 `app_user` + `account_credential`；账号不存在 → 401 `USER_REQUIRED`。
  - `PATCH /api/auth/me` 只接受 `{name}`，目标 id 只取自 principal；校验 → `UPDATE app_user SET display_name=? WHERE id=?`（0 行 → 401）→ 构建新的 `AccountPrincipal`（同 id/email/passwordHash，新 name）→ 写入 SecurityContext 并 `securityContextRepository.saveContext` → 返回 `{id,name,email}`。
- **Alternatives**：只更新数据库、不刷新 session（当前会话 `me` 继续旧名）；只刷新 session、不读库（其他会话旧名）；接受目标 id（越权）。
- **Consequences**：当前会话与其他会话在下一次 `me` 都拿到最新名；成员列表等由 SQL join `app_user` 的读模型天然最新。

## D7 退出与会话失效

- **Decision**：`POST /api/auth/logout`（认证 + CSRF）调用 `SecurityContextLogoutHandler`（`invalidateHttpSession=true`、清 SecurityContext）→ 返回 204；不删除/更新账号、成员、行程。无会话时由安全链返回 401 `USER_REQUIRED`；重复退出同 401。
- **Alternatives**：启用 Spring 默认 logout filter（会引入 `/logout` 路径与重定向语义，偏离 JSON API）；JWT/黑名单（当前无 JWT）。
- **Consequences**：旧 session id 立即失效；前端仅在 204 后清状态并跳登录。

## D8 SecurityConfig 变更

- **Decision**：`permitAll` 增加 `/api/auth/register`；保持 `/api/auth/login`、`/api/auth/csrf`、greeting、邀请预览、splits 例外；`PATCH /api/auth/me` 与 `/api/auth/logout` 落在 `/api/**` authenticated；继续显式 `logout(AbstractHttpConfigurer::disable)`（不用默认 filter logout）；CSRF cookie/handler 不变。
- **Alternatives**：把 logout 设为 permitAll（无意义且绕过 CSRF）；启用 formLogin（不符合 JSON SPA）。
- **Consequences**：注册可匿名调用但仍需 CSRF；退出/改名必须带会话与 token。

## D9 错误处理边界

- **Context**：`AuthErrorAdvice` 目前把所有 `HttpMessageNotReadableException` 映射为 401 `INVALID_CREDENTIALS`，会破坏注册/改名的 400 契约。
- **Decision**：advice 按请求路径分流：`/api/auth/login` → 401 `INVALID_CREDENTIALS`；`/api/auth/register`、`PATCH /api/auth/me` → 400 `INVALID_REQUEST`。新增 `DataAccessException` → 500 `{code:"INTERNAL_ERROR",message}`（注册持久化失败）；其余 `AuthApiException` 维持扁平响应。
- **Alternatives**：为每个端点建独立 advice（重复）；让 500 走 Spring 默认错误体（非扁平）。
- **Consequences**：登录错误语义不变；注册/改名畸形体可测；错误体仍只有扁平与 splits 例外两种。

## D10 前端认证状态

- **Decision**：`AuthProvider` 增 `register(email,name,password)`（不设置 signedIn）、`logout()`（成功后清 account/status，失败保持）、`updateName(name)`（成功后更新 account 并 `queryClient.invalidateQueries()`）。沿用 `ensureCsrf`/`csrfHeaders`；`api` 的 401 广播保持（logout/patch 401 视为已登出）。
- **Alternatives**：注册后自动设置会话（无会话可设）；改名后 `window.location.reload()`（粗暴但简单；不采用）。
- **Consequences**：名称更新在本会话立即生效，跨页面缓存通过 React Query 失效 + 导航重取。

## D11 路由与壳

- **Decision**：hash `parseRoute` 与 React Router 同时支持 `/register`、`/account`；`TabId` 增 `account`，`TAB_FOR_PAGE` 映射；`TabBar` 增第 5 个“我的”（user 图标）；`App.tsx` 三处 `AccountBar` 全部移除；My Account 在壳内渲染，注册/登录全屏无 dock。
- **Alternatives**：替换“成员”tab（丢失既有入口）；只做 React Router 路由（hash 壳内不可达）。
- **Consequences**：五 tab 文本走查可用；既有 split 的“已登录 · 姓名”身份条需同步核对移除/替换。

## D12 My Account 与仪表盘问候

- **Decision**：新增 `AccountPage`，按 UI 参考稿呈现：顶部返回按钮 + “我的”、头像首字母 + 显示名 + 邮箱、名字输入（1–30）、“保存名字”主按钮（check 图标）、红色描边“退出登录”按钮；保存（busy/成功/错误）调用 `updateName`，退出调用 `logout` 成功后 `window.location.assign('/login')`。`Home` 问候显示 `你好，{account.name}`，不追加“组织者”；组织者徽标仍按行程角色。头像首字母由显示名派生（本次新增的唯一头像位置）。
- **Alternatives**：把 My Account 做成弹层（AC 要求页面/tab）；在右上角保留姓名（AC 要求移除）。
- **Consequences**：S1/S2/M4 可观察；无新增 UI 库。

## D13 注册页与登录入口

- **Decision**：新增 `RegisterPage`，按 UI 参考稿呈现：顶部返回按钮 + “创建 GoGo 账号”、品牌头部（GoGo / 一起出发，各有所爱）、名字/邮箱/密码/确认密码字段、密码提示“至少 8 个字符”、主按钮“创建账号”、次按钮“已有账号？去登录”；全屏无 dock。客户端逐字段校验（密码 ≥8 字符、最多 72 字节；确认密码必须一致；镜像 D3 其余规则）；成功 → 弹窗“注册成功 / 去登录”；重复邮箱（409 `EMAIL_TAKEN`）→ 弹窗“该邮箱已注册 / 去登录 / 修改邮箱”；点击“去登录”才写 `sessionStorage['gogo.login.email']` 并 `window.location.assign('/login')`；`LoginPage` 读取并清除预填邮箱；登录页增加 “Create account” 链接到 `/#/register`。
- **Alternatives**：成功后停在同一页显示“请去登录”（多一步操作）；URL query 预填（与 hash 路由混用易丢）。
- **Consequences**：注册→登录路径短；隐私响应不显示“邮箱已存在”，新老邮箱都显示同一“前往登录”。

## D14 名称联动

- **Decision**：服务端读模型（成员列表 join `app_user`、邀请身份、偏好、路线/分组标签）在每次读取时取最新名；前端 `updateName` 更新 auth 状态并失效 React Query；头像首字母按新名派生（若渲染）。
- **Alternatives**：在各表冗余姓名（需迁移与同步写，违反零迁移）；全局事件广播（无必要）。
- **Consequences**：刷新/导航即最新；无跨表同步风险。

## D15 测试接缝

- **Decision**：后端验收用 MockMvc + 真实内存 SQLite（每类独立库名，`maximum-pool-size=1`），真实登录/CSRF；注册测试用公开端点 + `csrfCookie()`；并发用 `CountDownLatch` + 两线程；改名/退出用真实登录 session（不用 `TestAuth` 的假名，避免掩盖 DB 读取）。E2E 手工步骤写入 `docs/feedback/e2e-us-068-070.md`。
- **Alternatives**：全部用 `TestAuth.asUser`（假 principal 无 passwordHash/真实姓名，测不出 DB 读写）；H2（与 SQLite 行为不一致）。
- **Consequences**：测试与生产路径一致；`TestAuth` 仍服务行程域既有测试。

## D16 Non-Goals 反向自检

- 不加表/列/迁移；不做邮箱验证；不自动登录；不做账号删除/改密/找回/SSO/remember-me；不做头像上传；不做扫码/仪表盘聚合；不做限流/锁定；不改行程/邀请/主线/拆分行为与错误码。对应反向用例见 `atdd-design.md` §5。
