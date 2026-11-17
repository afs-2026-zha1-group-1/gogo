# Proposal — US-068-070 我的账号、退出登录与注册

## Why

REQ-008（US-066）把 `X-User-Id` 脚手架换成了真实登录与会话，但账号生命周期只完成了"进来"这一半：登录后姓名只读、看不到邮箱对应的资料页，没有退出登录的端点或入口，也没有注册能力（只有五个种子演示账号）。US-068（issue #40）、US-069（issue #41）、US-070（issue #43）补齐"看自己、改自己、离开、进来"四个动作，均为 `Iteration 1`、`Priority - Must`、`Type - Members`。

三张卡共享同一个账号记录（`app_user` + `account_credential`）、同一个 My Account 表面与同一个 `auth` API 边界：US-069 的退出动作挂在 US-068 的"我的"页；US-070 注册出的新账号资料由 US-068 展示；注册后的登录复用 US-066。拆开会产出"有退出 API 无入口 / 有注册无资料页 / 有改名无页面"的半成品，因此按用户 2026-11-16 裁决打包为一个 change（原指令 US-069/070，同日在阻塞问题中裁决并入 US-068）。

## What Changes

- **ADDED — 我的账号与显示名（US-068）**
  - 底部导航在既有 仪表盘/行程/分队/成员 之后新增"我的"tab（`#/account` 与 `/account`）；移除右上角 `AccountBar` 资料快捷入口；既有信息（i）等控件保留，扫码入口仍归 US-067，本 change 不新增。
  - My Account 展示当前账号显示名、邮箱、改名输入、保存与退出登录；未登录访问打开登录页 / 401 `USER_REQUIRED`。
  - `PATCH /api/auth/me`（`{name}`，会话主体 + CSRF）→ 200 `{id,name,email}`；显示名 `trim()` 后 1–30 字符；空/纯空白/31 字符 → 400 扁平校验错误，旧值不变。端点不接受目标账号 id，只作用于会话主体。
  - 改名后所有名称展示面与头像首字母（若页面已渲染头像）使用最新名称；仪表盘问候使用账号名、不追加"组织者"；组织者徽标仍按行程角色。账号 id、成员关系、组织者身份、分组与其他成员名称不变。
  - 保存失败显示可恢复错误，已保存名称不变；重新读取或重新登录恢复最新名称。
- **ADDED — 退出登录（US-069）**
  - My Account 内提供"退出登录"，不是右上角仪表盘动作。
  - `POST /api/auth/logout`（CSRF）→ 204；失效当前 HTTP session、清空 SecurityContext 与 cookie；前端清除本地认证状态并打开登录页。
  - 退出后受保护页（含 My Account）再次要求认证；直接访问或浏览器导航不恢复授权。账号、显示名、成员关系、组织者角色、分组与共享行程数据保持完整。
  - 退出失败（网络/服务）显示可恢复错误，不错误报告会话已失效、不清空本地状态。
- **ADDED — 注册账号（US-070）**
  - 登录页新增"Create account"入口；注册页全屏无 dock（`#/register` 与 `/register`），含邮箱、显示名、密码、提交与返回登录。
  - `POST /api/auth/register`（公开 + CSRF）`{email,name,password}`：邮箱 trim + 小写 + 基础格式；显示名 trim 后 1–30；密码 6–72 字节（BCrypt 上限）、无组合复杂度；只存 BCrypt 哈希。
  - 同一事务写 `app_user`（rowid 自增）与 `account_credential`；成功返回 `200 {"next":"login"}`，**不建立会话、不返回账号投影**；注册后必须通过 US-066 显式登录。
  - 重复邮箱（含大小写/空格差异与并发提交）返回 `409 EMAIL_TAKEN`，不建第二行；注册页弹窗“该邮箱已注册”并提供去登录/修改邮箱（用户 2026-11-17 指令，覆盖原“不披露邮箱是否已注册”的响应）；唯一索引兜底并发，冲突映射为 409。
  - 校验失败 → 400 扁平 `{code,message}`（具体码 P2 定死）；服务失败 → 5xx，事务回滚、重试不产生重复。
  - 注册期间持有邀请：token 仍留在 sessionStorage；登录后恢复邀请预览，接受仍显式；新账号默认无行程成员关系。
- **MODIFIED — auth 历史契约措辞**
  - `Account credential login`：移除"本变更不提供注册/账号创建"的历史语句，改为指向 `Account registration`；改密/找回/删除仍不提供。
  - `Server session and current account`：把"Logout 属于 US-069、本变更不添加"改为指向 `Logout and session invalidation`。
  - `Protected request identity and public surfaces`：公开面加入注册端点与登录/注册页；资料与退出端点保持受保护。
- **MODIFIED — app-shell**
  - 底部导航加入"我的"（五 tab：仪表盘/行程/分队/成员/我的）；右上角身份条移除；仪表盘问候使用账号名且不追加"组织者"；登录/注册页全屏无 dock；壳、dock、join 全屏例外不变。
- **测试与夹具**
  - 扩展 auth 端点测试（注册成功/重复/并发/边界校验、改名、退出、CSRF、401）与名称联动断言；既有 trip/invitation/main-plan/splits 套件按会话回归。
  - 新增 `acceptance-test-fixtures.md` §REQ-009：注册账号、重复/并发、名与密码边界、退出与邀请恢复。

不变：greeting、trips、invitations、main-itinerary、splits 的行为与错误码；V1–V6 迁移；`.github/workflows/ci.yml` 结构；无新表、无新迁移。

## Non-Goals

- 不做邮箱验证、找回/修改密码、SSO/社交登录、remember-me、多设备会话管理、账号删除/停用、管理员用户管理。
- 不做头像上传/裁剪；首字母只由显示名派生。
- 不做扫码控件（US-067，issue #39）与仪表盘聚合（US-061）。
- 不改行程/邀请/主线/拆分的行为、权限或错误码；只读取最新显示名。
- 不做注册/登录限流、账号锁定、验证码（部署关注点，OQ-13 文档化例外）。
- 不改变 US-068 看板卡的指派流程；卡片交接属于 P4 前的协作事项。

## Capabilities

### New Capabilities

无（`auth` 能力已由 REQ-008 建立）。

### Modified Capabilities

- `auth`（ADDED 3 条 + MODIFIED 3 条 requirement）：
  - ADDED「Account registration」：公开注册、统一隐私响应、事务写入、无自动登录。
  - ADDED「Account profile and display name」：读取/更新会话主体资料、显示名规则、全表面生效。
  - ADDED「Logout and session invalidation」：显式退出端点、CSRF、会话失效、受保护面重新认证。
  - MODIFIED「Account credential login」「Server session and current account」「Protected request identity and public surfaces」：移除“本变更不提供注册/退出”的历史措辞，公开面加入注册端点；行为契约本身不变。
- `app-shell`（MODIFIED 4 条）：「Mobile shell frame」「Bottom dock navigation」「Dashboard tab placement」「Guest join exclusion」——五 tab、身份条移除、账号名问候、注册页全屏；壳/dock/join 例外不变。

## Impact

- **Requirement**：`requirement-workspace/requirements/REQ-009.md`；intent `intents/2026-11-16-req-009.md`；DoR `analysis/req-009-dor.md`（BLOCKER = 0）；deep-dive §REQ-009（⑨–⑫ Pass）；impact brief §46–53；fixtures §REQ-009。
- **Code**：`backend/src/main/java/com/gogo/auth/**`（AuthController +3 端点、凭据/账号仓库写方法、校验与事务、SecurityConfig 匹配器）；前端 `frontend/src/features/auth/**`（注册页、My Account、AuthProvider register/logout/updateName）、`frontend/src/App.tsx`、`TabBar.tsx`、`router.tsx`、受影响名称展示面。
- **APIs**（契约在 P2 delta-craft 定死）：`POST /api/auth/register`（新邮箱 200 `{"next":"login"}`；重复邮箱 409 `EMAIL_TAKEN`）、`PATCH /api/auth/me`（200 `{id,name,email}`）、`POST /api/auth/logout`（204）；`GET /api/auth/me`、`POST /api/auth/login`、`GET /api/auth/csrf` 不变。扁平错误 `{code,message}`；P2 定死新增校验码 `INVALID_EMAIL` / `INVALID_NAME` / `INVALID_PASSWORD` / `INVALID_REQUEST`（400）与 `EMAIL_TAKEN`（409）；`USER_REQUIRED` 401、`CSRF_INVALID` 403 沿用。
- **Database**：**无 schema 变更、无新迁移**。注册写既有 `app_user` + `account_credential`（V6 唯一邮箱索引），改名写 `app_user.display_name`；退出不写业务表。
- **Stories**：issue #40（US-068）、#41（US-069）、#43（US-070），均已在看板 `Req Analysis`；`/sdd:story-split` Skipped（issue 已存在，三条 US 一个切片）。issue #40 当前指派 `DENGLU-OOCL`；用户 2026-11-16 裁决并入本 change，P4 前确认卡片交接。
- **Delivery**：分支 `US-068-070-account-register`（用户 2026-11-16 裁决新建分支走 PR）；`ci.yml` 在 PR/分支 push 验证。
- **Risks**（impact §52）：R48 US-068 队友卡片重叠、R49 注册邮箱枚举、R50 并发重复、R51 BCrypt 72 字节、R52 退出未真正失效会话、R54 不可读 JSON 错误映射、R55 名称缓存残留、R59 绑定计划偏差、R62 无限流。
- **Upstream**：REQ-008 的 `auth`（登录/会话/CSRF/扁平错误/`AccountResponse`）、V6 凭据表、`app-shell` 登录页与壳、既有名称展示面。均为已归档/已在 main 的契约。
- **Downstream**：US-067 扫码、US-061 仪表盘聚合、US-058/US-063 行程侧故事；`tech-stack-plan` API/数据模型清单需在归档时补注册/退出/改名并收敛"无注册登录"偏差；看板 #40/#41/#43 在 G3 后转 Done。

## Effort and ordering

**Medium**：3 个新端点、2 个新页面（注册、My Account）+ 导航/身份条改造、0 迁移、约 26 条验收 case（S1–S24 + 反向）。依赖草图：`账号写入与校验 → 资料读写 → 退出 → 注册页/My Account/导航 → 名称联动 → 夹具与回归`。US-068 页面与 US-069 退出耦合，建议同批实现；US-070 注册页可并行但共享 auth 状态与测试夹具。

## A0 deep-dive gate

三张卡在既有 `auth` 能力内新增行为并修改 `app-shell`，deep-dive 在范围内。
`deep-dive.md` §REQ-009：⑨ 数据契约（账号/凭据粒度、注册请求与统一响应、
改名投影、退出语义、并发与归一化，无 `{TBD}`）；⑩ 边界枚举（23 行覆盖成功/
重复/并发/校验/失败/未登录/他人账号/邀请恢复/退出失败与明确 out）；⑪ 跨 REQ
（REQ-008 auth、app-shell、行程域只读名称、V6、绑定计划偏差逐项对齐）；⑫ 展示
契约（登录/注册/My Account/问候/全名称面/首字母/错误反馈）。**四项全 Pass →
A0 Pass，允许拆分**。单 change 与三卡范围已由用户 2026-11-16 确认。

## Known deviations carried into later stages

- `tech-stack-plan.md` §2 写明"MVP 不做账号体系/注册登录"；REQ-008 已记录登录
  偏差，本 change 继续记录注册偏差，归档时按 `openspec/config.yaml` 收敛。
- 注册/登录限流与账号锁定为部署例外（OQ-13），本期不实现。
- US-068 看板卡当前在队友 `DENGLU-OOCL` 名下；代码并入本 change 后需在 P4 前
  完成卡片交接/协作确认。
- 前端当前无扫码控件；US-068 AC 中的 "scan remains available" 按"不破坏既有
  控件"执行，扫码入口由 US-067 交付。
- 既有 `AuthErrorAdvice` 把不可读 JSON 统一映射为 401 `INVALID_CREDENTIALS`；
  P3 需为注册/改名提供 400 校验错误路径，避免复用登录语义。
