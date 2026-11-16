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
