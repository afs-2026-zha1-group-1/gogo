# ATDD design — us-068-070-account-register

- Change: `openspec/changes/us-068-070-account-register/`（US-068 My Account / US-069 退出 / US-070 注册）
- Delta Spec: `specs/auth/spec.md`（3 ADDED + 3 MODIFIED / 38 场景）、`specs/app-shell/spec.md`（4 MODIFIED / 19 场景）；G1 **Pass**（IO Emily + SA Elian Jiang，2026-11-16）
- Fixtures authority: `requirement-workspace/acceptance-test-fixtures.md` §REQ-009（注册账号、重复/并发、边界值、改名、退出、邀请恢复）
- Stage: P3，`/sdd:atdd-design`。只定义验收层与红先顺序；不写生产代码、不写 UT 套件计划（UT 留 P4）。

## 1. ATDD 层与范围

**API 层（MockMvc + 真实 SQLite + Flyway，沿用 `AuthApiTest` 的 session/CSRF 模式）**：注册/资料/退出三个端点、校验矩阵、重复与并发、会话失效、CSRF、错误体；断言「HTTP 状态 + body + 数据库行数/字段 + 会话是否仍有效」。

**E2E 层（浏览器 + 真实后端 + Vite dev，P4 手工编号步骤）**：注册页、登录页入口、My Account、五 tab 导航、身份条移除、仪表盘问候、改名全表面联动、退出后跳登录与受保护页、邀请恢复。CI 不含浏览器（沿用 REQ-004/US-031-037/US-049-050 先例）。

**Defer UT（P4 apply-time TDD）**：邮箱归一化/格式、显示名 `strip()` 与 Unicode 字符计数、密码 72 字节边界、注册初始字母派生（若实现为纯函数）、事务回滚辅助逻辑。

| # | 场景（delta / fixtures） | 层 | 附加建议 | 断言要点 |
|---|---|---|---|---|
| R1 | 有效注册创建恰好一个账号 | API | security | 200 体恰为 `{"next":"login"}`；`app_user`/`account_credential` 各 +1；name=trim 值；hash 以 `$2` 开头；无 session cookie |
| R2 | 重复邮箱不可区分 | API | security | 第二次（含 `  ALICE@Example.COM  `）状态+body 与成功逐字节一致；行数不变；无 id/email 字段 |
| R3 | 并发重复只建一个 | API | consistency | 两线程同时提交；两边通用 200；恰一行 |
| R4 | 非法邮箱/名/密码 | API | — | 400 `INVALID_EMAIL`/`INVALID_NAME`/`INVALID_PASSWORD`；无行；无会话 |
| R5 | 畸形 JSON | API | — | 400 `INVALID_REQUEST`（注册/改名）；登录保持 401 `INVALID_CREDENTIALS` |
| R6 | 注册不自动登录 | API | — | 注册后 `GET /api/auth/me` 无会话 → 401 `USER_REQUIRED` |
| R7 | 持久化失败无半条账号 | API | consistency | 强制第二行插入失败 → 5xx 扁平错误；`app_user` 行数不变；重试恰一行 |
| R8 | 注册后登录 | API | — | `POST /api/auth/login` 200；`me` 返回新账号；无验证步骤 |
| R9 | 邀请 token 在注册后恢复 | E2E | — | 注册不建会话；登录后 `#/join/<token>` 恢复；未显式接受前无 membership |
| M1 | 读取自己的资料 | API | — | 200 `{id,name,email}`；无 password/hash |
| M2 | 改名成功（trim） | API | — | 200 新名；`app_user.display_name` 新值；再次 `me`/重新登录仍新值 |
| M3 | 空白/31 字符名 | API | — | 400 `INVALID_NAME`；库值与展示不变 |
| M4 | 改名全表面生效 | E2E | — | My Account、仪表盘问候、成员列表、邀请身份、偏好、路线/分组标签一致；问候不追加组织者 |
| M5 | 账号身份/成员关系不变 | API | consistency | id、memberships、organizer、groups、其他成员名不变；重复成员按 id |
| M6 | 不能改他人账号 | API | security | 请求体/路径带他人 id 不生效；仅会话主体变化 |
| M7 | 改名失败保留旧值 | API | — | 5xx/网络失败 → 可恢复错误；库值与展示旧值 |
| M8 | 未登录访问 My Account | API + E2E | — | `PATCH` 401；页面打开登录页 |
| L1 | 退出失效会话 | API | security | 204 无体；旧 session `me` 401；受保护请求 401 |
| L2 | 退出后受保护页重新认证 | E2E | — | `#/`、`#/trips/<id>`、`#/account` 打开登录页；不恢复授权 |
| L3 | 退出保留数据 | API + E2E | consistency | 重新登录后账号/名称/成员/角色/分组/行程完整 |
| L4 | 重复/无会话退出 | API | — | 401 `USER_REQUIRED`；UI 按已登出处理但不宣称新成功 |
| L5 | 退出缺 CSRF | API | security | 403 `CSRF_INVALID`；会话仍有效 |
| L6 | 退出失败不误报 | E2E | — | 可恢复错误；不清空本地状态 |
| S1 | 我的 tab 与资料 | E2E | — | 五 tab（仪表盘/行程/分队/成员/我的）；My Account 含名/邮箱/编辑/保存/退出；无右上角快捷入口 |
| S2 | 仪表盘问候 | E2E | — | 问候使用账号名；无硬编码小明；不追加组织者；信息(i)控件保留；不新增扫码 |
| S3 | 注册页全屏 | E2E | — | `#/register` 与 `/register` 无 dock；返回登录 |
| S4 | 登录页 Create account | E2E | — | 入口打开注册页 |
| S5 | 已登录访问登录/注册页 | E2E | — | 回到 `#/` |
| S6 | 五 tab 文本走查 | E2E | — | 正向/反向每页唯一标题；hash 不整页刷新；身份保持 |
| REG | 既有会话/登录/CSRF 回归 | API | consistency | `AuthApiTest` 全绿；登录/me/csrf 行为不变 |
| BIZ | 行程域回归 | API | consistency | 既有 trip/invitation/mainplan/splits 测试全绿；名称更新后成员列表显示新名 |
| UT-1 | 校验器（邮箱/名/密码字节） | Defer UT | — | P4 单测 |
| UT-2 | 注册事务回滚/唯一冲突映射 | Defer UT | — | P4（repository/service 级，真实 SQLite） |
| UT-3 | 首字母派生（若为纯函数） | Defer UT | — | P4；当前无头像组件则不实现 |

不做比例管控：契约行为全部落在 API；E2E 只覆盖「必须看到页面才能证明」的展示与导航契约。

## 2. 先于生产代码写什么

1. **`RegisterApiTest`（红）**：R1–R8 + 字段边界（邮箱格式、名 1/30/31、密码 5/6/72/73 字节）+ 畸形 JSON；每个测试使用独立内存 SQLite（沿用 `jdbc:sqlite:file:...?mode=memory&cache=shared` + `maximum-pool-size=1`），`@BeforeEach` 统计基线行数；当前树端点不存在 → 404/401 全红。
2. **`ProfileApiTest`（红）**：M1–M3、M5–M8 + 改名后 `me`/重新登录；用真实登录获取 session；改名断言库值。
3. **`LogoutApiTest`（红）**：L1、L4、L5 + 退出后受保护 API 401；真实登录 session。
4. **`RegistrationConcurrencyTest`（红）**：R3，两线程 `CountDownLatch` + 各自 CSRF/session；断言恰一行。若 MockMvc 并发不稳定，退化为 service/repository 级并发测试（仍为验收路径，不是 UT 替身）。
5. **E2E 步骤清单**：`docs/feedback/e2e-us-068-070.md`，覆盖 R9/M4/L2/L3/L6/S1–S6，含编号步骤、期望观察、清理说明；P4 执行并回填。
6. 上述红检查存在前，不写 controller/service/repository/前端页面代码。

## 3. Gate 期望（本地 vs CI）

- 本地：`cd backend && mvn -B test`（真实 SQLite + Flyway，含既有 186+ 测试）；`cd frontend && npm run build`（`tsc` 零错误）；`openspec validate us-068-070-account-register --strict`。
- CI：现有两 job 不变（backend `mvn -B test` / frontend build）；本 change 走分支 PR（用户 2026-11-16 裁决），PR CI 即 E1 证据；G2 使用 fresh run。
- 浏览器 E2E 不进 CI；P4 以手工编号步骤 + 观察记录作为证据。

## 4. 数据 / fixtures 策略

- 权威：`acceptance-test-fixtures.md` §REQ-009。既有五个账号与 V6 凭据沿用；注册测试账号 `nina@example.com` / `Nina` / `nina2026` 由测试自行创建，不写入迁移。
- 每个测试类独立内存 SQLite：`jdbc:sqlite:file:<unique-name>?mode=memory&cache=shared` + `spring.datasource.hikari.maximum-pool-size=1`；Flyway V1–V6 自动迁移。
- 行数基线：`@BeforeEach` 读取 `SELECT COUNT(*) FROM app_user` / `account_credential`，断言相对增量而非绝对 id（新账号 id 依赖既有行）。
- 重复/并发：同一邮箱请求两次/两线程；唯一索引兜底；不预插重复行。
- 邀请恢复：E2E 用既有 fixture invitation 或现场创建邀请；token 从 UI/网络读取，不硬编码。
- 失败注入：R7 用 test-only 的 `JdbcTemplate` 触发器/包装或在 service 测试接缝注入异常（不改产品路径）；若难以在 MockMvc 层注入，拆成 service 级事务测试并在报告中注明层降级理由。

## 5. 反向 / non-goals 覆盖（每条 ≥1 反向 case）

| Non-goal | 反向 case | 层 |
|---|---|---|
| 不做邮箱验证 | 注册响应 `{"next":"login"}`；无验证邮件/验证端点；注册后 `me` 401 | API |
| 不自动登录 | R6：注册后 `me` 无会话 401 | API |
| 不做账号删除/改密/找回/SSO/remember-me | 路由/端点不存在（404/405）；UI 无入口 | API + E2E |
| 不新增表/迁移 | 断言迁移仍为 V1–V6；`app_user`/`account_credential` 列集不变 | API（JdbcTemplate） |
| 不做头像上传 | 无上传入口；首字母为派生（若渲染） | E2E |
| 不做扫码/仪表盘聚合 | S2：无新增 scan；无聚合数据 | E2E |
| 不改行程/邀请/主线/拆分行为 | 既有测试全绿；名称更新后成员列表读新名 | API |
| 不做限流/锁定 | 无相关端点/配置；记录为部署例外 | Static |

## 6. NFR 测试（已询问）

用户 2026-11-17 裁决：**不纳入** NFR 测试（性能/可观测性/韧性）。安全性由上述 API 断言覆盖（重复注册不可区分、CSRF、会话失效、不泄露账号），不新增性能基准。

## 7. 自检

- 每个 ADDED requirement ≥1 API case：注册（R1–R8）、资料（M1–M8）、退出（L1–L6）→ Pass。
- 每条 MODIFIED auth requirement 由 `AuthApiTest` + 行程域回归覆盖 → Pass。
- app-shell 四条 MODIFIED requirement 由 S1–S6 + L2 覆盖 → Pass。
- 每设计决策（design D1–D16）在 tasks.md 有落地任务或显式 defer → 见 tasks「决策映射」。
- Non-goals 每项 ≥1 反向 case → 上表。
