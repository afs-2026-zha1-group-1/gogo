# Better Trips — 技术栈方案（MVP 精简版）

> 输入：`backlog-backbone (1).md`（10 个 Activity + Fork/Join 主干）
> 前置要求：React + Spring Boot / Java + SQLite（嵌入式）+ Flyway 迁移、无 ORM
> 原则：先跑通链路，再长业务；MVP 只留"明天就能上线给人用"的东西

## 1. 一句话结论

一个 **模块化单体 Spring Boot 服务 + React SPA + 单文件 SQLite**，四张表、九个接口，覆盖 Activity 1→3 主线（创建行程 → 录偏好 → 生成并确认主线方案），不做账号体系、不做分叉、不做实时协同。先用 M0「Hello World 全链路」验证脚手架可信，再往上叠业务。

## 2. 范围边界

**MVP 做（对应 Release 1 主线，不分叉）**

| Activity | MVP 落地程度 |
| --- | --- |
| 1 Create Trip | 建行程（标题/目的地/日期）+ 邀请码邀请 + 昵称加入 |
| 2 Input Preferences | 兴趣 / 必做项 / 约束 / 预算四项录入（按成员） |
| 2 半 Compare Preferences | 共同点 vs 差异点对比视图（纯计算，无 AI） |
| 3 Generate Initial Main Plan | 单次 LLM 生成结构化主线方案 + 模板降级 + 成员确认 |
| 同行 | 同一行程多人查看同一份方案（轮询刷新） |

**MVP 不做**

- 账号体系 / 权限 / 注册登录（身份 = 邀请码 + 昵称）
- Fork 1、Fork 2、Join、行程中重规划（R2）
- WebSocket 实时协同、消息推送（R2）
- 地图渲染、求解器排期、多语言、问候语管理后台

**对"非目标"的理解口径**

- "ORM"：一律不引入 JPA/MyBatis，持久化用 Spring 自带的 `JdbcClient` + `record`。
- "数据库迁移工具"：不额外搭建迁移平台，仅 `Flyway` 做最小 schema 版本化（这是前置要求本身）。

## 3. 技术栈总表

| 层 | 选型 | 版本 | 备注 |
| --- | --- | --- | --- |
| 语言 | Java | 21 LTS | 记录类、模式匹配 |
| 后端框架 | Spring Boot（Web + Validation） | 3.5.x | 单体，无 Spring Cloud |
| 持久化 | Spring `JdbcClient` | 随 Boot | 手写 SQL，`record` 映射，无 ORM |
| 数据库 | SQLite（`sqlite-jdbc`） | 3.4x | `./data/bettertrips.db`，WAL |
| 迁移 | Flyway（core + SQLite 社区模块） | 11.x | 两模块版本严格一致 |
| 连接池 | HikariCP | 随 Boot | `maximum-pool-size=1`（硬约束） |
| 前端 | React + TypeScript + Vite | 19 / 5.x / 7.x | SPA |
| UI | shadcn/ui（`components.json`，new-york 风格）+ Tailwind CSS | Tailwind 4.3.x | 组件源码在 `frontend/src/components/ui/`，主题令牌在 `src/index.css` 的 `@theme`；不引入第二个 UI 库（Ant Design 5 为旧口径，2026-11-15 由 G1 C4 / Leo 裁定取代） |
| 数据请求 | TanStack Query | v5 | 缓存 + 轮询（`refetchInterval`） |
| 路由 | React Router | 7.x | 5 个页面足够 |
| 全局状态 | 不引入 | — | Query 缓存 + Context 已够；Zustand 留到 R2 |
| AI | 单 Provider（DeepSeek / 通义）HTTP 调用 | — | MVP 直接 `RestClient`，不引 Spring AI |
| 构建 | Maven Wrapper / npm | — | monorepo：`/backend`、`/frontend` |
| 部署 | 单机 `java -jar` + Nginx 托管静态资源 | — | 单实例，SQLite 不可多副本 |

## 4. 架构与工程结构

```
user journey/
├── backlog-backbone (1).md
├── tech-stack-plan.md
├── backend/                       # Spring Boot 单体，按业务分包
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/bettertrips/
│       │   ├── BetterTripsApplication.java
│       │   ├── trip/              # Trip/TripMember：Controller·Service·Repository·dto
│       │   ├── preference/        # 偏好录入与对比
│       │   ├── plan/              # PlanNode + PlanGenerator（Llm / Template 两实现）
│       │   └── common/            # ApiResponse、GlobalExceptionHandler、WebConfig
│       └── resources/
│           ├── application.yml
│           └── db/migration/      # V1__greeting.sql, V2__trip.sql ...
└── frontend/                      # React SPA
    └── src/
        ├── api/                   # client.ts（fetch 封装）、trips.ts
        ├── pages/                 # Home / TripCreate / TripDetail / Preferences / Plan
        ├── components/
        └── types/                 # 与后端 DTO 对齐的 TS 类型
```

分层原则：Controller 只做参数校验与 DTO 转换，Service 承载用例，Repository 只放 SQL。**领域逻辑不跨包直接调 Repository**，为 R2 拆 Modulith 留缝。

## 5. 数据模型（4 张表）

> 完整 ER 图、逐字段明细、外键与索引清单见 `data-model.md`。

SQLite 类型约定：时间一律 `TEXT`（ISO-8601 UTC，如 `2026-11-13T10:00:00Z`）；金额用 `INTEGER` 分；坐标用 `REAL`；结构化字段用 `TEXT` 存 JSON。

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `trip` | `id`(PK, UUID TEXT), `title`, `destination`, `start_date`, `end_date`, `invite_code`(UNIQUE), `plan_version`(INTEGER, 当前方案版本), `created_at` | 一个行程一行 |
| `trip_member` | `id`(PK), `trip_id`(FK), `display_name`, `role`(`owner`/`member`), `plan_ack_version`(INTEGER, 已确认的方案版本), `joined_at` | 轻量身份：不带密码 |
| `member_preference` | `id`(PK), `trip_id`, `member_id`, `kind`(`interest`/`must_do`/`constraint`/`budget`), `payload`(TEXT JSON), `updated_at` | 一张表装四类偏好，避免四张宽表 |
| `plan_node` | `id`(PK), `trip_id`, `plan_version`, `parent_id`(自引用), `branch_id`(默认 `main`), `node_type`(`day`/`activity`), `title`, `start_at`, `end_at`, `location_name`, `lat`, `lng`, `sort_order`, `created_at` | 方案是树不是列表 |

要点：

- 唯一索引：`trip(invite_code)`、`trip_member(trip_id, display_name)`；普通索引：`member_preference(trip_id, member_id, kind)`、`plan_node(trip_id, plan_version, parent_id, sort_order)`。
- `parent_id` + `branch_id` **建表时就留好**（SQLite 改表能力弱，R2 的 Fork 直接复用，不用迁移结构）。
- 方案重新生成时 `trip.plan_version + 1`，旧版本行不删（天然可回溯、可对比）。
- 不做软删除、不做审计字段堆叠，只留 `created_at`/`updated_at`。

## 6. API 清单（MVP）

统一返回 `{ "data": ..., "error": null }`；错误返回 `{ "data": null, "error": { "code": "...", "message": "..." } }`。路径统一 `/api` 前缀，除 M0 的 `/api/greeting` 外都由"当前行程 + 当前成员"上下文驱动（成员身份通过 `X-Member-Id` 头传递，MVP 不做签名校验）。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/greeting` | M0 链路验证：返回库里的 `Hello World` |
| POST | `/api/trips` | 创建行程，返回 `trip` + `inviteCode` + owner `memberId` |
| GET | `/api/trips/{tripId}` | 行程详情 + 成员列表 + 当前方案版本 |
| POST | `/api/trips/join` | `{inviteCode, displayName}` → 加入并返回 `memberId` |
| GET | `/api/trips/{tripId}/preferences` | 全员偏好明细 |
| PUT | `/api/trips/{tripId}/preferences` | 提交当前成员的四类偏好（幂等覆盖） |
| GET | `/api/trips/{tripId}/preferences/summary` | 共同兴趣 / 独有项 / 约束与预算差异 |
| POST | `/api/trips/{tripId}/plan:generate` | 生成主线方案（同步，前端 30s 超时） |
| GET | `/api/trips/{tripId}/plan` | 当前版本 `plan_node` 树 |
| POST | `/api/trips/{tripId}/plan:ack` | 当前成员确认当前方案版本 |

## 7. 关键实现约定

**SQLite 三条铁律**

1. 连接池固定 1（`maximum-pool-size=1`）：单写者模型，池大于 1 只会放大 `SQLITE_BUSY`。
2. 无 `SELECT ... FOR UPDATE`：并发控制靠"唯一索引 + 条件更新"（`UPDATE ... WHERE plan_version = ?`，影响行数为 0 即视为冲突）。
3. 单实例部署：数据库文件不可被多副本共享；备份 = 停写或 `PRAGMA wal_checkpoint(TRUNCATE)` 后复制 `.db`。

**Flyway + SQLite**

```yaml
spring:
  datasource:
    url: jdbc:sqlite:./data/bettertrips.db?journal_mode=WAL&busy_timeout=5000&foreign_keys=on
    driver-class-name: org.sqlite.JDBC
    hikari:
      maximum-pool-size: 1
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
```

`flyway-core` 与 SQLite 社区模块必须同版本，否则启动即报 `Unsupported Database: SQLite`。做法是覆盖 Spring Boot BOM 里的 `flyway.version`，让两者共用同一个值：

```xml
<properties>
  <!-- 覆盖 Boot BOM 托管的版本；core 与 SQLite 社区模块由此天然同值 -->
  <flyway.version>11.x</flyway.version>
  <sqlite-jdbc.version>3.4x</sqlite-jdbc.version>
</properties>

<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-nc-sqlite</artifactId>
</dependency>
<dependency>
  <groupId>org.xerial</groupId>
  <artifactId>sqlite-jdbc</artifactId>
  <version>${sqlite-jdbc.version}</version>
</dependency>
```

两个具体值以创建工程时的实际可用版本为准，关键是**不要在 `flyway-core` 与社区模块上写两个不同数字**。若某个 Flyway 版本没有对应的 SQLite 社区模块，就把 Flyway 整体升降到有模块的版本，而不是绕过 Flyway 手写 DDL（那会直接违背 DR-09）。

**schema 所有权（OQ-2 结论）**

- 唯一权威源是 `src/main/resources/db/migration/V{n}__*.sql`：建表、索引、种子数据全部走迁移，M0 的 `greeting` 表也不例外。
- 禁止隐式建表/初始化：`spring.jpa.hibernate.ddl-auto` 禁止出现（本来也无 ORM）；`spring.sql.init.mode` 只允许在 `src/test` 生效。
- 已发布的迁移文件不可修改（Flyway 校验 checksum），任何改动一律新增 `V{n+1}`。
- 评审卡点：任何表/字段变更的 PR 必须同时带一个迁移文件，否则不合并。

**AI 生成主线方案**

- 契约先行：LLM 只输出受约束的 JSON（按天/按活动，含 `start_at`/`end_at`/`title`）；后端用 Jackson 反序列化 + Jakarta Validation 校验，不合法即丢弃。
- 必须可降级：`PlanGenerator` 接口两实现——`LlmPlanGenerator`、`TemplatePlanGenerator`（按偏好模板拼装）。LLM 超时/报错/校验失败自动落模板，保证演示永远有结果。
- 一次生成 = 一次调用，不做多轮反思、不做函数调用、不做 agent 编排（R2 再谈求解器）。

**前后端联调**

- 前端只写相对路径 `/api/...`，Vite 用 `server.proxy` 转发到 `localhost:8080`，开发期不开 CORS。
- 同源部署时前端由 Nginx 直接反代 `/api`，生产不暴露 8080。
- 方案页用 TanStack Query `refetchInterval: 5000` 做轮询刷新，代替 WebSocket。

## 8. M0 — 脚手架验证规格（Hello World 全链路）

目标：一次性证明 **Flyway 建表 → SQLite 落数据 → Spring Boot 读数据 → React 展示** 四段链路可用。

落地清单：

1. `V1__greeting.sql`：建 `greeting(id INTEGER PRIMARY KEY, message TEXT NOT NULL)` 并 `INSERT ('Hello World')`。
2. `GreetingRepository`：`JdbcClient.create("SELECT message FROM greeting LIMIT 1").query(String.class).single()`。
3. `GreetingController`：`GET /api/greeting` → `{"data":{"message":"Hello World"},"error":null}`。
4. 前端 `HomePage`：`useQuery` 调 `/api/greeting`，展示文字 + loading / error 三态。
5. 无硬编码：前端不出现 "Hello World" 字面量，只渲染接口值。

验收命令：

```powershell
# 后端
cd backend; .\mvnw.cmd spring-boot:run
# 预期：./data/bettertrips.db 自动创建，flyway_schema_history 含 V1 记录
curl http://localhost:8080/api/greeting

# 前端
cd frontend; npm install; npm run dev
# 浏览器打开 http://localhost:5173 ，页面显示 Hello World（来自接口）
```

M0 通过后，后续每个 Activity 只追加 Flyway 迁移与业务包，不回改脚手架配置。

## 9. 里程碑（约 8.5 人日，2 人并行）

| 阶段 | 交付 | 人日 |
| --- | --- | --- |
| M0 | 脚手架 Hello World 全链路（含 Flyway/SQLite/Vite 代理） | 0.5 |
| M1 | Activity 1：建行程、邀请码加入、成员列表 | 2 |
| M2 | Activity 2：偏好录入 + 共同/差异对比 | 2 |
| M3 | Activity 3：方案生成（LLM + 模板降级）+ 方案页 + 确认 | 3 |
| M4 | 联调、错误态打磨、单机部署与备份脚本 | 1 |

## 10. 风险与对策

| 风险 | 对策 |
| --- | --- |
| SQLite 单写者导致写超时 | 池=1 + `busy_timeout=5000` + 写操作短事务；写 QPS 上不去时再评估 PostgreSQL（Repository 层已隔离 SQL） |
| Flyway SQLite 社区模块版本冲突 | 在 `pom.xml` 用同一 property 锁定两模块版本；CI 加一条"空库启动"冒烟测试 |
| LLM 输出不可用 | 模板降级 + 30s 超时 + 生成结果落库后可人工微调（R2 再做编辑能力） |
| 轻量身份被猜中 | 邀请码用 6 位大写字母数字且一码一行程；MVP 接受该风险，R2 换 JWT |
| 多人同时确认方案 | `plan_ack_version` 与 `trip.plan_version` 条件更新，版本不一致返回 409 |

## 11. 已定决策（DR）

| 编号 | 决策 | 理由 / 代价 |
| --- | --- | --- |
| DR-01 | 单体 + 传统分包，不上 Spring Modulith | 5 人以内团队，模块边界靠包与代码评审守；R2 再评估 |
| DR-02 | 持久化 `JdbcClient` + 手写 SQL，无 ORM | 前置要求；代价是 SQL 手写，用 record + 公共查询工具抵消 |
| DR-03 | SQLite 单文件 + WAL + 池=1 | 零运维、可整库拷贝；代价是单实例、单写者 |
| DR-04 | 方案是树（`parent_id` + `branch_id`），MVP 只写 `main` | 避免 R2 因 Fork 重构表结构 |
| DR-05 | MVP 无账号体系，邀请码 + 昵称 | 用户体系明确不在本期范围；R2 上 JWT |
| DR-06 | 实时同步用 5s 轮询 | 省掉 WS 网关与状态同步；代价是延迟与请求量 |
| DR-07 | AI 走 `RestClient` 单 provider，不引 Spring AI | 只一次 JSON 调用，不值得引框架；R2 需要多 provider 再换 |
| DR-08 | 全局状态不引 Zustand，先靠 Query 缓存 | 减少一层抽象；出现跨页复杂状态再引 |
| DR-09 | schema 变更由 Flyway 独占；"非目标：数据库迁移工具"仅指不引入第二套迁移工具/平台 | 双轨（Flyway + 手工 DDL/schema.sql）必然漂移；代价是必须显式对齐社区模块版本 |
| DR-10 | `/api/greeting` 返回 JSON 包封套，不用 `text/plain` | M0 要验证的是统一契约与错误分支，纯文本会让前端 `client.ts` 之后返工；只有 `/api/health` 这类探针才用 `text/plain` |
| DR-11 | 旧 `TODO.md` 归档为历史记录，不重写为 H2 口径 | H2 是已被 DR-03 替换的过渡选型，重写会把废弃选型拉回主线；任务权威源只保留本方案的里程碑与 DR |

## 12. R2 预留（本期不实现）

PostgreSQL/PostGIS 替换 SQLite（Repository 层已隔离 SQL 与方言）→ Fork/Join 用现成 `branch_id` → 求解器替代模板排期 → STOMP WebSocket 替代轮询 → JWT 账号体系 → 编辑态协同与冲突提示。

## 13. Landed reconciliation — US-031-037 main itinerary (archived 2026-11-16)

> Scope discipline (per `openspec/config.yaml`): this addendum records **only what
> the `us-031-037-main-itinerary` change actually shipped** and how it diverges from
> the aspirational design above. It deliberately does **not** rewrite sections that
> belong to earlier changes (trip/invitation identity, envelope, provider) — those
> alignments are out of this change's scope and are left as recorded observations.

**Main-plan capability (US-031 generate + US-037 confirm), as shipped:**

- Data model (Flyway `V5__create_main_plan.sql`) — §5 of this plan described a
  `plan_node` tree with `trip.plan_version` / `trip_member.plan_ack_version`. What
  actually landed for the main plan is different and self-contained:
  - new tables `main_plan_draft` (one row per generated version, `status`
    `draft`/`confirmed`, `cost_per_person_cents`, `input_revisions`) and
    `main_plan_stop` (ordered stops: `seq`, `name`, `start_time`, `end_time`,
    `travel_minutes_to_next`, per-stop `lat`/`lng`);
  - new `trip_member` columns `ready` and `preference_revision` (readiness gate +
    staleness source); the confirmed version is the draft row marked
    `status='confirmed'` — there is **no** `trip.plan_version` bump and **no**
    `plan_node` tree for this capability;
  - a read-only `member_preference` stand-in table is created `IF NOT EXISTS` so
    the migration is self-contained until REQ-019 lands its authoritative
    kind/payload `member_preference` at `V4` (this change renumbers to `V5` per
    G1 C2; REQ-019 renumbered again to `V6` when the two branches met, so on a
    merged database this stand-in is the first and only declaration and the
    preference migration is a no-op).
- API (§6 listed `POST /plan:generate`, `GET /plan`, `POST /plan:ack`). The main
  plan instead ships four endpoints under the trip resource:
  - `POST /api/trips/{id}/main-plan` → 201 draft projection (readiness-gated;
    rejects with 409 `MEMBERS_NOT_READY` / `ALREADY_CONFIRMED`);
  - `GET /api/trips/{id}/main-plan` → 200 current-or-confirmed projection (404
    `NO_DRAFT`; `stale` computed on read, confirmed version frozen);
  - `GET /api/trips/{id}/main-plan/inputs` → 200 member-readable generation
    summary (ready count, common interests, must-do, budgets, rules);
  - `POST /api/trips/{id}/main-plan/confirm` → 200 same projection, gated by
    schedule + hard-budget + staleness validation (422 `VALIDATION_FAILED` with
    `scheduleErrors`/`overruns`, 409 `STALE_DRAFT`), closes joining on success.
- Provider (§7 planned a real LLM `PlanGenerator` with `TemplatePlanGenerator`
  fallback). MVP ships a `MainPlanProvider` port with a deterministic
  `FakeMainPlanProvider` (four fixture stops) behind the seam; the real provider is
  deferred, consistent with the signed fake-provider MVP ruling.
- Identity / envelope: main-plan calls reuse the trip capability's established
  `X-User-Id` header and `{code, message}` error envelope (introduced by earlier
  changes, not by this one) rather than the `X-Member-Id` header / `{data, error}`
  envelope sketched in §6–§7. Noted as a pre-existing divergence, out of scope here.
- Frontend: Screens 9/10 (`MainPlanInputs.tsx`, `MainPlan.tsx`) added as
  join-style full-page routes on the shared TypeScript `api<T>()` client (§4
  sketch of `client.ts` was not adopted; the shell already provides `api.ts`).

No other section of this plan was modified by this change.

## 14. US-066 登录与会话（2026-11-16，偏差记录）

US-066 按 IO/SA 决策把 `X-User-Id` scaffold 替换为已验证登录；这是对 §2
“MVP 不做账号体系 / 权限 / 注册登录”的明确偏差。

- **技术栈新增**：Spring Security 6（`spring-boot-starter-security`）+ 服务端
  HTTP Session（JSESSIONID，30 分钟空闲超时）+ BCrypt；不引入 JWT/Spring Session。
- **数据模型新增**：`V6__create_account_credential.sql` 增加
  `account_credential(user_id PK/FK, email UNIQUE, password_hash)`，只存 BCrypt
  哈希；五个夹具账号（Alice…Eve）共享演示密码 `gogo-demo-2026`，不做注册。
- **API 新增**：`POST /api/auth/login`、`GET /api/auth/me`、
  `GET /api/auth/csrf`；CSRF cookie `XSRF-TOKEN` + `X-XSRF-TOKEN` 头。
- **身份**：所有受保护 trip/invitation/main-plan/splits 端点从 session principal
  取 `app_user.id`；`X-User-Id` 不再认证。公开面仍为 `/api/greeting`、
  `GET /api/invitations/{token}`、登录/CSRF。
- **错误契约**：auth/trip/invitation/main-plan + Security handler 用扁平
  `{code,message}`；splits 保留 `{data,error}` 与 `401 MEMBER_REQUIRED` 作为唯一例外。
- **前端**：`#/login` 与 React Router `/login` 共用登录页；hash shell 与 split
  router 共用 AuthProvider；移除 scaffold 切换器与 split 身份栏；待邀请 token
  存 sessionStorage，登录后恢复 preview，不自动 join。
- **测试**：`AuthApiTest`、`SessionExpiryApiTest` 及全部既有 trip/invitation/
  main-plan/splits API 测试改为 session/principal；C5 覆盖 CSRF、短超时（以失效
  session 等价验证，Tomcat 超时粒度为分钟）与 greeting/preview 公开 matcher。

## 15. US-013 成员列表（2026-11-16，归档对齐）

US-013 在 US-066 会话认证基线上新增成员名册读取；不新增迁移。

- **API 新增**：`GET /api/trips/{id}/members`，仅行程成员可读，身份取 session
  principal（不使用已退役的 `X-User-Id`）。成功 200 返回
  `{tripId, members:[{userId, displayName, organizer}]}`，按 `userId` 升序；
  未登录 401 `USER_REQUIRED`、非成员 403 `NOT_A_MEMBER`、未知行程 404
  `TRIP_NOT_FOUND`；拒绝响应不含成员身份。只读，无写路径。
- **数据**：复用 `V2` 的 `trip_member` / `app_user` / `trip.organizer_id`；无新表、
  无新列、无种子变更。
- **前端**：成员 Tab（`#/members`）渲染真实名册（头像首字母、姓名、组织者徽章、
  成员数）及 loading/empty/error/permission/no-trip 状态；不展示就绪、偏好、预算
  或生成主线操作。
- **App shell**：Living Spec 的 `Placeholder tabs` 被移除，新增 `Tab content`：
  分队渲染已上线的 split entry，成员渲染本名册；shell frame/dock/active-tab/
  登录账号栏不变。
- **身份口径**：trips/members 使用 session principal + `USER_REQUIRED`；split
  端点使用 session 但匿名时返回 `MEMBER_REQUIRED`。该差异已接受为后续项 F2，
  本 change 不改 split 代码。

本 change 未修改技术栈、其他数据模型或其他 API。
## 16. Landed reconciliation — US-067 QR scanner (P4 apply, not yet archived)

> Scope discipline: this addendum records what the `us-067-qr-scanner` change
> actually shipped on the frontend. It is a **pre-archive** note; living-merge
> at G3 will fold it into §7 (关键实现约定) and the §3 stack table once the
> change lands on `main`.

> **2026-11-17 revision (user rulings, pre-archive):** scanner × always returns
> to `#/` (restore-origin D2/S-5 superseded, `from` plumbing removed); the
> scan→join hand-off lands signed-in existing members directly on an
> already-in-team notice (organizer wording variant), backed by additive
> preview fields `tripId`/`viewerMember` (viewer-only membership; guests
> unchanged). Backend 364/364 incl. `memberPreviewReportsViewerMember`;
> membership probe must run after the preview query releases the SQLite
> single connection. See us-067 design D11 / tasks group 11.

**Scanner capability (US-067), as shipped:**

- **Frontend stack alignment with the shell's shipped conventions.** US-067
  keeps the existing shell conventions rather than the aspirational plan:
  - The scanner routes on the **hash** `#/scan` (no router). `App.tsx
    parseRoute` matches `/scan` BEFORE the generic `/trips/<id>` regex so
    the scanner top-level hash cannot be swallowed by the details route
    (design D1, G1 C2). `react-router-dom` in the merged tree belongs to
    US-065/US-066 (splits + login), not to US-067.
  - The three scan entry points (camera rAF loop, image picker, manual link)
    call **no** `/api/*` endpoint; they hand off to the existing Join page,
    which reuses REQ-004 `GET /api/invitations/{token}` / `POST …/accept`.
    The added **demo-only** “模拟扫描” mode (for camera-less desktops) is the
    one exception: it issues a single `POST /api/trips/1/invitation` as the
    signed-in organizer to obtain a real token, then pipes the resulting link
    through the same matcher — a UI aid, not part of the AC scan paths.
  - **Dashboard scan entry (AC S1–S2, landed).** A `.iconbtn` button (`scan`
    icon, `aria-label` "扫码加入行程") sits to the right of the `我的行程`
    title in the Home appbar and links to `#/scan`. It is a plain hash link:
    no new backend call, permission gate, or router (design D1).
  - Styling stays CSS tokens in `frontend/src/app.css` (`.screen`, `.appbar`,
    `.card`, `.btn`, `.field`, `--brand / --warn-soft / --err-soft`). No
    `antd` import; Ant Design is a **semantic** reference (primary + secondary
    action row, error panel with retry) per G1 C5.
- **QR decode library.** `jsqr ^1.4.0` is a production `dependency` in
  `frontend/package.json`. Decoding uses two paths behind a single matcher:
  - Camera: `navigator.mediaDevices.getUserMedia({video:{facingMode:
    'environment'}})` → `requestAnimationFrame` loop drawing video into a
    480×360 canvas → `jsQR(...)`.
  - Image file: hidden `<input type="file" accept="image/*">` →
    `createImageBitmap(file)` → offscreen canvas → `jsQR(..., {
    inversionAttempts: 'attemptBoth'})`. `bitmap.close?.()` releases the decoder.
- **Invitation-link matcher (single source of truth, G1 C3).** New
  `frontend/src/scan.ts` exports `parseJoinHash(text, appOrigin)`. Contract
  locked at the module header: token form is exactly `#/join/<32-char
  lowercase-hex>` (backend `InvitationTokens.next()` = `HexFormat.of().
  formatHex(new byte[16])`), absolute URLs are same-origin only, and
  cross-origin inputs are rejected before the token regex is even reached.
  All Scanner entry points (camera, image, manual link, demo mode) call this
  one function so behavior cannot drift.
- **Route / type surface.** `frontend/src/types.ts` extends `Route` with
  `{ page: 'scan'; from: string | null }`; `InAppPage` is
  `Exclude<Route['page'], 'join' | 'login' | 'main-plan' | 'main-plan-inputs' |
  'scan'>`, so `TAB_FOR_PAGE: Record<InAppPage, TabId>` stays total and
  the scanner is guaranteed not to receive a dock tab. Closing the scanner
  restores the last non-scanner hash tracked by `App.tsx`, or falls back
  to `#/` (spec S-5).
- **Backend impact.** None from US-067. The scanner adds no `backend/**`
  change and no `V*.sql` migration; its demo mode rides on the US-066 session
  model for the organizer-scoped `POST /api/trips/1/invitation`.

No other section of this plan is modified by US-067. Sections §5 (data
model) and §6 (API) remain accurate because the scanner introduces
neither tables nor endpoints.

## 17. REQ-019 成员兴趣（2026-11-16，归档对齐）

REQ-019 在 US-066 会话认证基线上落地 `preferences` 能力的兴趣段：一张新表、两个端点。

- **API 新增**：`GET` / `PUT /api/trips/{tripId}/preferences`。身份取 session principal
  （`AccountPrincipal`；US-066 已退役 `X-User-Id`，匿名 401 `USER_REQUIRED`），仅本行程
  成员可读写（非成员 403 `NOT_A_MEMBER`，未知行程 404 `TRIP_NOT_FOUND`）。
  - `PUT` 接受 `{"interests": string[]}`，整集替换并按首次出现顺序去重；写入前完成
    校验：清单外元素 400 `INTEREST_NOT_ALLOWED`，畸形 body 400 `INVALID_REQUEST`
    （`StrictStringListDeserializer` 拦数字/`null` 元素）；成功 200 返回去重后的集合，
    `[]` 清空兴趣但保留记录。
  - `GET` 返回 `{members:[{userId, interests:[label…]}]}`，按 `userId` 升序，每个对象
    只有这两个字段；从未保存过的成员为 `interests: []`；只读。
- **兴趣清单**：`InterestCatalogue` 十个中文标签（`水上运动`/`潜水`/`摄影`/`美食`/
  `咖啡`/`历史人文`/`手作`/`自然风景`/`冒险`/`慢游`）↔ 十个 code（`water`/`diving`/
  `photo`/`food`/`coffee`/`heritage`/`craft`/`nature`/`adventure`/`slow`）；线上传标签、
  库里存 code，字面匹配（不做大小写折叠、去空白、别名或子串）。清单是代码常量，
  不依赖 `tag` 表或 `/api/tags`。
- **数据**：`V7__create_member_preference.sql`（两次改号：`main` 先取 `V4` 给 splits、
  再取 `V6` 给账号凭证）建 `member_preference(id, trip_id→trip, user_id→app_user,
  kind, payload TEXT JSON, updated_at TEXT)` + `UNIQUE(trip_id, user_id, kind)`；
  `V5__create_main_plan.sql` 已以 `IF NOT EXISTS` 预先声明该表，故本迁移在原基线上是 no-op。
  与 §5 的差异：列名是 `user_id` 而非 `member_id`，去重键是唯一约束
  `UNIQUE(trip_id,user_id,kind)` 而非普通索引。
- **前端**：`frontend/src/pages/PreferencesPage.tsx`（`#/trips/{tripId}/preferences`，行程
  详情页的「旅行偏好」卡片给入口），只实现 `screen-08-preferences.png` 的兴趣段；选中态
  来自 `GET` 中与当前身份匹配的条目，保存是单次 `PUT` 并采用响应，失败回滚并显示服务端
  `message`。沿用 main 的 `api()` + `useAuth()` + `lib/csrf`，无新依赖。
- **CI**：前端 job 在 `npm ci` 与 `npm run build` 之间增加 `npm run typecheck`。
- **已登记偏差**：该 change 的 delta spec 文本沿用 G1 原文的 `X-User-Id` 口径，实现在合并后
  改取会话（两条反向用例钉住匿名 401 与头/会话不一致）；`flyway-database-nc-sqlite` 在受管
  Flyway 版本下无发布物，维持 `flyway-core` 单模块（TS-2 / TS-11）。

§3 技术栈表与 §7 关键实现约定无需改动；§5/§6 中计划期的 `member_id`、普通索引与
`X-Member-Id` 口径以本节为准。本 change 未修改其他数据模型或其他 API。

## 18. Landed reconciliation - US-049-050 split confirm/cancel (archived 2026-11-17)

US-049（确认拆分，issue #21）+ US-050（取消未确认草稿，issue #22）已实现并归档，补齐 B 拆分链收口；单 change / 2 ADDED + 5 MODIFIED requirement，`main` 直开发（无 PR）。

- **API 增量**：`POST /api/trips/{tripId}/split-draft:confirm` 与 `POST /api/trips/{tripId}/split-draft:cancel`，body 均为 `{draftVersion}`，成功 `200` 返回既有草稿详情投影（`status` 分别为 `confirmed` / `cancelled`，取消时 `routes=[]`）。身份取自认证会话（US-066），与既有 splits 端点一致；`SecurityConfig` 的 split-draft `permitAll` 匹配器同步补入 `:confirm` / `:cancel`，匿名请求仍由控制器守卫返回 `401 MEMBER_REQUIRED`。
- **错误契约 +3**（累计 16 码）：`NOT_SPLIT_ORGANIZER 403`（非组织者确认）、`SPLIT_TIMING_INFEASIBLE 409`（服务端复算超窗或输入缺失）、`SPLIT_DRAFT_INCOMPLETE 409`（边界/路线不齐）。包封套扩展可选 `error.details`：`SPLIT_TIMING_INFEASIBLE` → `details.routes[]`（定长 2，`{groupLabel,totalMinutes,overrunMinutes,missingInputs}`）；`SPLIT_DRAFT_INCOMPLETE` → `details.missing[]`。`code` 仍是唯一契约字段。
- **数据模型**：无新表、无新迁移（沿用 V4 `split_draft` / `plan_node`）。`split_draft.document.status` 为单一行真源，状态机 `active → confirmed / cancelled`、`cancelled → active`（同行重建，列 `draft_version` 重置 1）；确认/取消不改列版本，写操作走 `json_extract(document,'$.status')` + 版本 CAS。取消在单事务内清空 `document.routes` 并删除 `split-a/b` 节点，`main` 行逐行不变。
- **可空时长模型**：`SplitDraftDocument.RouteDurations` 与 `GroupRoute` 的时长改为可空 `Integer`，使「缺输入」可表达并复用 `ReunionTimingCalculator` 的 `missingInputs`。
- **前端**：新增 Screen 15 `#/trips/:tripId/split/confirm`（复核/确认/取消 + error/empty/loading/permission 四态 + `error.details` 逐路线渲染）；Screen 11 按 `status` 分支（无草稿/cancelled → 发起替换、active → 下一步、confirmed → 查看已确认分队）；Screen 14 终态只读并提供同一入口。
- **已登记偏差**：本节同时覆盖归档时对 Living `splits` Purpose 的纠正（身份改为会话、草稿载体为 `split_draft` 表、迁移编号 V4、状态机与 `error.details`）——`openspec archive` 不替换既有 Purpose，已手工同步；场景中的 `X-User-Id: N` 仅作夹具简写。
- **验证**：后端 `mvn -B test` **214/214**；前端 build 绿；E2E 10 Pass / 1 N/A（logout 属 US-069）；CI `43839036207` / `43833884672` 双 job 绿；local-verify Pass。

§5/§6 之外无其他数据模型或 API 变化；确认后不可再拆/不可编辑属产品契约（版本化重拆需新需求）。

## 19. US-068/069/070 账号生命周期（2026-11-17，归档对齐）

US-068（我的）、US-069（退出登录）、US-070（注册）已实现并合并（PR #101，merge `3334e7d`）；单 change、需求 REQ-009。本节覆盖 §14 “不做注册”的历史口径。

- **API 增量**：`POST /api/auth/register`（公开 + CSRF；新邮箱 `200 {"next":"login"}`，重复邮箱 `409 EMAIL_TAKEN`）、`PATCH /api/auth/me`（会话主体，body `{name}`，返回 `{id,name,email}`）、`POST /api/auth/logout`（CSRF，`204`，失效服务端 session）。`GET /api/auth/me` 改为按 principal.id 读库，改名对其他会话在下一次读取时可见。
- **数据模型**：无新表、无新迁移；复用 V6 `account_credential`（唯一邮箱、BCrypt）与 `app_user.display_name`。注册在同一事务插入 `app_user` + `account_credential`，`app_user.id` 由 SQLite rowid 生成；重复邮箱由唯一索引兜底并回滚半条账号。BCrypt 密码字节数 6–72（前端注册页要求 ≥8 字符 + 确认一致）。
- **错误契约 +1**：`EMAIL_TAKEN 409`；注册/改名校验码 `INVALID_EMAIL` / `INVALID_NAME` / `INVALID_PASSWORD` / `INVALID_REQUEST`（400）。错误体仍为扁平 `{code,message}`。
- **已登记偏差**：用户 2026-11-17 明确要求重复邮箱在注册时直接弹窗披露“该邮箱已注册”，覆盖 US-070 原“不披露邮箱是否已注册”的 AC；接受邮箱枚举风险，记录于 G1 addendum，IO 复核待补。
- **前端**：底部 dock 五 tab（仪表盘/行程/分队/成员/我的）；移除右上角 `AccountBar`；`AccountPage` 按参考稿（头像首字母、名字/邮箱、保存名字、红色描边退出）；`RegisterPage` 按参考稿（确认密码、≥8 字符提示、成功/重复弹窗）；仪表盘问候使用账号名且不追加“组织者”；登录页保留创建账号入口。
- **验证**：合并 `origin/main` 后后端 `mvn -B test` **279/279**；前端 clean install/build 绿；浏览器 E2E 18 Pass / 1 Skipped；PR #101 CI 双 job 绿（runs 43999674160 / 43999680155）；G1 Pass（IO Emily + SA Elian Jiang）、G2 Pass（VL lumi）。

§3/§4/§7 无需改动；§14 的“不做注册”由本节取代；其余数据模型/API 未变。

## 20. US-082 返回导航修复（2026-11-17，归档对齐）

US-082（修复返回按钮异常跳转与上下文丢失）已实现并合并（PR #107，merge `ee8bf8f`）；单 change，路由修复为主。

- **API 增量**：无新端点、无迁移。`POST /api/invitations/{token}/accept` 响应 additive `tripId`（既有 `joined` / `alreadyMember` 与状态码 200/401/403/404 不变），供入会成功页直达 `#/trips/<id>`。
- **路由/前端**：`#/trips/<id>` 仍是行程详情真源；分队首页与主线方案返回该路由；登录深链使用 `/login?next=<encoded>`，只恢复单斜杠同源站内路径并拒绝 `/login`、`/register` 自跳；登录/注册内部链接统一 `/login`、`/register`，既有 `#/login`、`#/register` hash 入口保留。
- **数据模型**：无变化。
- **验证**：`mvn -B test` 279/279；clean `npm ci` + build 绿；PR #107 CI 双 job 绿（runs 44012217311 / 44012221844 / 44012751115 / 44012755875）；local-verify Pass；G1/G2 Pass（Johnson）。
- **未改**：行程 tab、成员名册、创建页返回口径由 US-071 拥有，本变更不重复实现。

§3/§5/§6/§7 无需改动；本节只记录 accept 响应字段与前端返回/回跳口径。

## 21. Landed reconciliation — US-071 我的行程与当前行程（archived 2026-11-17）

US-071（PR #102，merge `b07f4c1`）已归档。单 change：`trips` +2 ADDED、`app-shell` REMOVED 1 + ADDED 1。

- **API 增量**：
  - `GET /api/trips` → 200 `{trips:[{id,name,destination,startDate,endDate,organizer,mainPlanConfirmed}]}`；仅会话账号作为成员的行程；排序 `(end_date < date('now')) ASC, start_date ASC, id ASC`（**已结束最后**）；未登录 401 `USER_REQUIRED`。
  - `GET /api/trips/current` → 200 `{tripId}`（未选或成员关系失效时为 `null`）。
  - `PUT /api/trips/current` `{tripId}` → 200 `{tripId}`；400 `TRIP_REQUIRED` / 404 `TRIP_NOT_FOUND` / 403 `NOT_A_MEMBER` / 401 `USER_REQUIRED`。
- **数据模型**：V8 `ALTER TABLE app_user ADD COLUMN current_trip_id INTEGER REFERENCES trip(id)`（可空）。§5「4 张表」口径不变（加列而非新表）。
- **路由/前端**：`#/my-trips` = 选择页（`.qcard` 卡片、点选**不跳转**、右缘「已选择」tag、选中高亮、无右箭头）；`#/trips` = 当前行程详情（无 current 时空态引导跳 `#/my-trips`）；`#/trips/<id>` 深链保留；「我的」页加「我的行程」入口。已结束徽标用本地日期、排序用 UTC（DD21 边界接受）。
- **验证**：`mvn -B test` 296/296；`npm ci` + build 绿；E2E E1–E12 + AC7 + R1–R9 全 Pass；CI runs `44020071898`/`44020065562` @`8b7b1c7`；G1 Pass（C1–C4 closed）、G2 Pass（VL Leo + Johnson Sun）。
- **未改**：邀请/主线/分队/成员名册读取语义；US-072 的详情页主线入口不重复实现。

§6 清单为 MVP 计划口径；实际端点以本节与 §13–§20 为准。

**残余承接（2026-11-17 followups）**：F2 已修复——`gogo.db` 的 V2 校验和与代码一致，默认启动 `No migration necessary`；F3 已落地——`src/lib/trip-date.ts` 纯函数 + `tests/trip-date.test.ts`（node:test，6 例，零新依赖）+ CI `test:unit` step；F4 评估维持接受——排序 UTC 与徽标本地日期的凌晨边界不引入时区协商或前端重排（避免破坏 API 排序契约），若出现客诉再立独立变更。

## 22. Landed reconciliation — US-086 队伍路线页（archived 2026-11-17）

US-086（PR #119，merge `f5b6297`）已归档。单 change：`splits` 1 MODIFIED（Screen 11 展示契约）。

- 前端：Screen 11 重写为 `screen-start.tsx` 队伍路线；新增 `graph-model.ts`（纯函数）+ `team-route-graph.tsx`（只读 SVG）；`useMainPlan` 仅在无草稿/已取消时读取 `GET /main-plan`。
- 入口：分队 tab 直达 `/trips/{currentTripId}/split`；删除 `#/split` 分队规划占位页与 TripDetails 分队规划区块。
- Chrome：SplitLayout 去掉身份条；confirmed 复核页无左上返回；confirmed 队伍路线页无重复提示卡。
- 后端/数据：无变更（零端点、零迁移、零新依赖）；节点详情弹层/任务/费用/地点不在范围。
- 验证：前端 node:test 12/12、tsc/build 绿、后端 296/296、CI 双绿；E2E E1–E13。

## 23. Landed reconciliation — US-083-085 行程详情三合一（archived 2026-11-17）

US-083/084/085（PR #127，merge `d2708f3`）已归档。单 change：`trips` +3 ADDED / 1 MODIFIED、`invitations` +1 ADDED、`app-shell` 1 MODIFIED。

- 前端详情页三分结构（R9 分流）：`TripDetails.tsx` 入口（useTripOverview 五读并发 + 四态统一渲染）；plan==null → `TripDetailsLegacy.tsx`（main 旧版逐字保留）；有 plan → `components/TripOverview.tsx`（hero 两行/CountdownCard/同行成员/MyPlanTimeline + 右上邀请图标）。
- 新增纯函数与 hook：`lib/countdown.ts`（resolveCountdown 状态机、半开区间、clamp≥0）、`lib/personal-route.ts`（selectSchedule/derivePersonalRoute，组活动 interests 按名补全）、`hooks/useCountdown.ts`（每秒 tick）、`hooks/useTripOverview.ts`；组件 CountdownCard/MyPlanTimeline/NextStopDetail。
- 邀请全屏页 `InvitationPage.tsx`（`#/trips/{id}/invitation`，App.tsx 提前 return 无 tabbar）；InvitationPanel 加 showTitle/onReadyChange 可选 prop；screen-confirm 确认成功整页返回 `/#/trips/{id}`。
- 后端/数据：本 change 零变更（零端点、零迁移、零新依赖）；合并 main 带入 V9（偏好默认兴趣，属 REQ-026）。
- 验证：前端 37/37（C1–C11/P1–P11 + 日期 helper + team-route）、tsc/build 绿、后端 337/337、CI run 44051875289 双绿；浏览器七轮 + R9 分流轮全 PASS。
- 残留：D-2 时区=设备本地、组活动段居中派生、「免费」固定文案、current trip 上下文不一致（范围外跟踪）。

## 24. Landed reconciliation — US-040 成员分组（待合并 2026-11-17）

US-040（issue #84；PR #117）G2 Pass（VL Leo），待 G1 Revision C8（IO）与 G3 后归档。单 change：`splits` 1 ADDED（Member group assignment）+ 3 MODIFIED（Split draft start / Group route generation / Split confirmation）。

- 后端：新增 `PUT /api/trips/{tripId}/split-draft/assignment`（body `{memberId?, groupLabel, draftVersion}`，返回 draft detail 投影）；**任意行程成员可移动任意行程成员**（2026-11-17 用户修订，对齐原型头像切组），目标非本行程 → `403 NOT_A_MEMBER`；仅 `active` 可写，同组提交幂等不递增版本，变更后 `draftVersion + 1` 且**保留 boundaries/routes**。
- 完整性门禁：`SplitDraftService.groupProblems` 固定顺序 `groups.A → groups.B → groups.unassigned → groups.duplicate`，`routes:generate` 与 `:confirm` 共用；`SPLIT_DRAFT_INCOMPLETE.details.missing` 新增 `groups.*` 项。
- 初始分组：`partitionGroups` 删除，改为 `initialGroups`（全员 A、B 空）；发起/重建新增成员数 ≥ 2 前置，否则 `409 SPLIT_MEMBERS_INSUFFICIENT`（新码）。另新增 `INVALID_GROUP_LABEL`（400）。
- 前端：Screen 13 分组卡按原型 `.route` 重绘（彩色 A/B 头 + 成员胶囊，点击切组）；分组不完整或终态时禁用生成/下一步；Screen 15 成员名 + 陈旧路线提示；`states.tsx` 的 `details.missing` 中文化。
- 后端/数据：**零迁移、零新依赖，未改 `SecurityConfig`**（splits 维持 `permitAll` + `MemberGuard`）。
- 验证：后端 356/356（合并 main 后）、前端 typecheck/build 绿、E2E 12 行 Pass、E1 run 44046339433 双绿。
- 残留：TS-1 陈旧路线提示为常驻（未记录路线生成版本）；存量单人 active 草稿仍不可生成/确认。
