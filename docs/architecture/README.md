# GoGo 架构文档（C4 / C4-PlantUML）

本目录用 C4 模型反向记录 **GoGo 行程协作应用** 的既有架构。内容全部来自仓库中可验证的证据（源码、配置、迁移脚本、构建文件、OpenSpec 规格），不做重新设计。

> 生成方式：源文件是 `.puml`，用仓库内的 PlantUML JAR 离线渲染成 SVG（内置 C4 标准库，未额外下载 C4-PlantUML）。
> 重新渲染：`java -jar .tools/plantuml/plantuml.jar -tsvg docs/architecture/*.puml`

---

## 1. 文档范围（Scope）

| 项 | 说明 |
| --- | --- |
| 记录对象 | 本仓库 `backend/` + `frontend/` 两个应用，以及它们依赖的外部服务 |
| 不在范围内 | 本地开发/CI 工具链（`.agents/`、`openspec/`、`scripts/`、`vendor/`）、UI 原型目录 `ui-design-reference/` |
| 运行时形态 | 单体后端 + 独立 SPA 前端 + 单文件 SQLite，非微服务 |
| 部署证据 | 仓库内 **没有** Dockerfile / compose / nginx 配置 / k8s 清单；只有 `.github/workflows/ci.yml`（测试与构建） |

> 说明：仓库 `README.md` 把自身描述为 "AI4SE Baseline"，其中 `backend/`（Spring Boot API）与 `frontend/`（React app）是实际的业务应用；本套图只记录这两个应用。

---

## 2. 三张图与对应文件

| 层级 | 目的 | 文件 |
| --- | --- | --- |
| **L1 系统上下文** | 谁在用、系统边界在哪、外部依赖是什么 | `system-context.puml` / `system-context.svg` |
| **L2 容器视图（主图）** | 有哪些可运行/可部署单元、用什么技术、彼此怎么通信 | `container.puml` / `container.svg` |
| **L3 组件视图** | 后端 API 内部按职责拆分的组件 | `component.puml` / `component.svg` |

没有 L4 代码级图（按任务要求与 C4 惯例省略）。

---

## 3. 每张图的读法

### L1 系统上下文（`system-context.*`）

- **两个角色**：旅行者（组织者 / 成员）、受邀访客。角色来自 `frontend/src/App.tsx` 的路由与页面集合，以及 `openspec/specs/invitations/spec.md` 的访客路径。
- **系统边界**：一个系统，即 GoGo 行程协作应用（前后端一起算一个系统）。
- **两个外部系统**：
  - **LLM 推理网关** —— `application.yml` 的 `gogo.plan.ai.base-url` 默认指向公司内网 OpenAI 兼容网关（`/v2/openai/deployments/ali-copilot`），模型默认 `deepseek-v4.1-flash`。
  - **高德地图 Web 服务** —— 前端 `lib/amap.ts` 生成 `www.amap.com` 搜索/导航深链；`lib/amap-geocode.ts` 动态加载 `webapi.amap.com` 的 JS API 做地理编码。

### L2 容器视图（`container.*`，主图）

| 容器 | 技术证据 | 职责 |
| --- | --- | --- |
| 单页应用 SPA | `package.json`：React 19 + TypeScript + Vite；`react-router-dom` 7；TanStack Query 5；`jsqr`、`qrcode` | 仪表盘、偏好录入、主线方案、分组路线、二维码扫描加入 |
| 后端 API 服务 | `pom.xml`：Spring Boot 3.5.14（web / jdbc / validation / security）+ Flyway + sqlite-jdbc，Java 21 | REST 接口、会话与 CSRF、业务规则校验、AI 与地理编排 |
| 嵌入式数据库 | `application.yml`：`jdbc:sqlite:./data/gogo.db?journal_mode=WAL`，Hikari `maximum-pool-size: 1` | 13 张业务表（见下） |

关键交互：

- **SPA → API**：`fetch` 同源请求（`src/api.ts`），带 `credentials: 'same-origin'`；非 GET 请求先取 CSRF 令牌写入 `X-XSRF-TOKEN`（`src/lib/csrf.ts`）。开发期由 `vite.config.ts` 把 `/api` 代理到 `localhost:8080`。
- **API → DB**：`JdbcClient` 手写 SQL，**无 ORM**；Flyway 在启动时按 `db/migration/V1..V18` 建表与写入种子数据。
- **API → LLM**：`HttpDeepSeekPlanClient` 用 `RestClient` POST `/chat/completions`，Bearer 密钥，`response_format: json_object`，单次调用（连接 5s / 读 30s）。
- **SPA → 高德**：浏览器直连，不经过后端；后端只负责把前端查到的坐标回写缓存（`POST /api/trips/{id}/main-plan/stop-locations`）。

数据库表（来自 `db/migration`）：

`greeting`、`app_user`、`account_credential`、`trip`、`trip_member`、`trip_invitation`、`member_preference`、`user_default_interest`、`main_plan_draft`、`main_plan_stop`、`plan_node`、`split_draft`、`place_cache`。

### L3 组件视图（`component.*`）

聚焦后端 API 容器，按**职责**（不是按文件夹逐条罗列）拆分：

| 组件 | 主要类 | 职责 |
| --- | --- | --- |
| 会话与安全 | `SecurityConfig` | Spring Session（`IF_REQUIRED`）+ Cookie CSRF，`/api/**` 默认要求认证；少数端点显式放行 |
| 账号与认证 | `AuthController`、`AccountService` | 注册、登录、`GET/PATCH /api/auth/me`、登出、CSRF 令牌下发 |
| 行程与成员 | `TripController` | 行程创建/编辑、`/api/trips/current`、成员列表 |
| 邀请与加入 | `InvitationController` | 签发邀请令牌、公开预览、一次性接受 |
| 偏好与预算 | `Preference/MustDo/Budget/Submission` 服务 | 兴趣、必做项、每人预算、就绪提交（"沉默不等于同意"） |
| 主线方案 | `MainPlanController`、`MainPlanService` | 生成、排期校验、站点增删改、确认 |
| 分组路线 | `SplitDraftController`、`SplitDraftService` + `domain/*` | 边界划分、路线生成、时机与预算校验、多轮 |
| AI 提供者适配 | `MainPlanProvider`、`BranchCandidateProvider` | 配置了 Key 走真实网关，否则用确定性样例 |
| 坐标补全与校验 | `LocationCompletion` + `place_cache` | 生成时补全起终点，查坐标成功即沉淀缓存 |
| 持久化访问层 | 8 个 `*Repository` | `JdbcClient` 手写 SQL，无 ORM |

组件之间有一条**单向事件**：`MainPlanStopsChanged` → `MainPlanStopsChangedListener` → `SplitDraftService` 让已生成的路线失效。方向刻意保持单向，`mainplan` 包从不 import `splits`。

---

## 4. Showcase 时值得重点讲的架构决策

按"能解释系统为什么长这样"的标准挑，均有代码证据：

1. **单库 + 单写连接，明确放弃并发写。**
   `application.yml` 里 Hikari `maximum-pool-size: 1`，SQLite 开 WAL + `busy_timeout=5000` + `foreign_keys=on`。这是刻意的取舍：演示规模下"永远不出锁"，代价是写吞吐只有一个连接。

2. **无 ORM，手写 SQL + `record` 映射。**
   `pom.xml` 没有 JPA/MyBatis，只有 `spring-boot-starter-jdbc`。`docs/knowledge/architecture/tech-stack-plan.md` 将其记为显式决策（DR 系列），便于后续换成 PostgreSQL 时只改 Repository。

3. **AI 是"可插拔的接缝"，不是硬依赖。**
   `MainPlanProviderConfig` / `BranchCandidateProviderConfig` 按 `apiKey` 是否为空二选一：空则 `FakeMainPlanProvider` / `FixtureBranchCandidateProvider`（确定性样例，无网络调用），非空则 `HttpDeepSeekPlanClient`。这意味着 CI、离线演示、纯单元测试都不需要 LLM 凭据，代码路径完全一致。

4. **AI 输出必须过校验，失败要能降级。**
   主线方案有 `ScheduleValidator` + `AiPlanValidator`（规则名写死在 `MainPlanService.RULES`）；分支路线 `AiBranchCandidateProvider` 在超时/HTTP 失败/空内容/JSON 非法/超窗口时**降级到确定性样例**并只打 warn 日志，保证分组流程始终可编辑、可确认。

5. **身份与会话：服务端 Session + Cookie CSRF，不用 JWT。**
   `SecurityConfig` 用 `HttpSessionSecurityContextRepository`，登录时 `changeSessionId()` 防固定攻击；CSRF 用 `CookieCsrfTokenRepository.withHttpOnlyFalse()`，前端读 `XSRF-TOKEN` Cookie 写到请求头。所有受保护接口的调用者身份**只从会话取**，不信任请求体里的 userId。

6. **偏好"保存"≠"提交就绪"。**
   `SubmissionService` 把就绪单独存为 `kind='submission'` 一行，只有显式提交才写；内容全空的成员会被 `PREFERENCE_EMPTY` 拒绝——注释里的原话是 "silence is not consent"。这条规则直接决定了主线方案能否生成（`MEMBERS_NOT_READY`）。

7. **主线方案与分组路线单向依赖，用 Spring 事件解耦。**
   `MainPlanStopsChangedListener` 消费 `MainPlanStopsChanged`，让分组草稿失效。依赖方向只有一个箭头，避免两个业务包互相耦合。

8. **地理编码放在浏览器端，后端只做缓存沉淀。**
   前端用高德的 JS API（`VITE_AMAP_KEY` + 安全密钥）查坐标，因为浏览器端密钥可控且不占后端出网；后端 `place_cache` 表按 `(name, city)` 主键 upsert，跨行程复用。另有前端 `lib/place-book.ts` 离线坐标簿兜底，保证无网络/无 Key 时演示仍能拿到坐标。

9. **多轮分组：`split_draft` 的唯一键从 `trip_id` 改成 `(trip_id, round_index)`。**
   `V18__split_rounds.sql` 建新表搬数据再改名，旧的两支路线节点被重命名为 `split-r1-a` / `split-r1-b`。这是"演进而非重写"的一个具体样本。

10. **两套前端路由共存。**
    `src/router.tsx` 用 `createBrowserRouter`（`/login`、`/register`、`/trips/:id/split/...`），而 `src/App.tsx` 用 `parseRoute(window.location.hash)` 解析 `#/...`。老 hash 深链通过 `<Navigate>` 重定向到新路径（`LegacyRoundRedirect`、`SplitTimingRedirect`），迁移期不破坏已有链接。

---

## 5. 真实集成 vs 模拟/占位（务必在 Showcase 上讲清楚）

| 能力 | 状态 | 证据 |
| --- | --- | --- |
| 账号登录/注册（BCrypt + Session） | **真实实现** | `account_credential` 存 BCrypt 哈希；`SecurityConfig` |
| 行程 / 邀请 / 偏好 / 预算 / 就绪 | **真实实现** | 各 `*Controller` + `*Repository` 落库 |
| 主线方案生成 | **双模式**：配了 `LLM_API_KEY` 走真实网关；未配置用 `FakeMainPlanProvider` | `MainPlanProviderConfig` 按 key 是否为空切换 |
| 分组分支路线生成 | **双模式**：同上，`AiBranchCandidateProvider` vs `FixtureBranchCandidateProvider` | `BranchCandidateProviderConfig` |
| 分组"活动推荐"（`activities:recommend`） | **模拟** | `MockSquadActivityRecommender` 注释明确写 "The real model is not wired yet"；返回按目的地写死的目录项，无网络、无持久化 |
| 起终点地点补全（`LocationCompletion`） | **规则实现（非 AI）** | 空缺时从固定候选清单按目的地挑选，`Singapore/Hong Kong/Hefei` + 通用兜底 |
| 高德地理编码 | **真实集成，但可选** | 有 `VITE_AMAP_KEY` 才真实调用；缺省返回 `null` 走导航搜索页兜底 |
| 站点导航深链 | **真实集成** | 生成 `https://www.amap.com/dir?...`，坐标先 WGS→GCJ-02 转换 |
| 演示账号 | **种子数据** | `V6` 插入 5 个 `@example.com` 账号，明文密码不进 UI/日志 |
| 实时协同（WebSocket / SSE） | **未实现** | 全仓库无 WebSocket/SSE；分组页用 TanStack Query `refetchInterval: 5000` 轮询替代（`features/split/hooks.ts`） |
| 部署编排（容器 / K8s / Nginx） | **仓库中不存在** | 无 Dockerfile、compose、nginx 配置 |

---

## 6. 假设与推断（需要团队确认）

以下为**推断**，不是代码里的直接事实：

1. **生产部署形态未知。** 仓库只有 CI（`mvn test` / `npm build` / Playwright），没有部署清单。图中只画了"单机 `java -jar` + 静态 SPA"这一可从代码推得的最小形态；若有真实 Nginx/K8s 拓扑需补充。
2. **SPA 与 API 同源假设。** 前端用相对路径 `/api`，开发期靠 Vite 代理。生产上必然由某个反向代理把两者放到同一源（否则 Cookie/CSRF 无法直接工作），但**该代理不在仓库里**。
3. **LLM 网关地址是 dev 环境。** `PlanAiProperties` 默认值含 `-dev` 段，生产是否同上未在仓库中体现。
4. **"13 张业务表"不含迁移过程中的临时表** `split_draft_new`（`V18` 里建完即改名），已排除。
5. **角色划分来自 UI 与规格，不是权限模型。** 代码里只有"是否该行程成员""是否组织者"的检查，没有独立的 RBAC 表；图中的"旅行者/受邀访客"是 UX 层面的人设，不是数据库角色。
6. **`plan_node` 的双重身份。** 它既承载分组路线的结构节点，也承载 V4 种下的主线站点样例行（`branch_id='main'`）。主线方案实际持久化在 `main_plan_draft` / `main_plan_stop`，两处并存是演进遗留。
7. **访客路径是否需要账号。** `GET /api/invitations/*` 在 `SecurityConfig` 里被显式放行（公开预览），但 `POST .../accept` 需要认证。若产品期望"完全匿名加入"，需要业务确认。

---

## 7. 重新生成与校验

```powershell
# 只渲染 SVG（提交到仓库的产物）
java -jar .tools/plantuml/plantuml.jar -tsvg -failfast2 docs/architecture/*.puml

# 需要 PNG 预览时（不提交）
java -jar .tools/plantuml/plantuml.jar -tpng docs/architecture/*.puml
```

`.tools/` 已在 `.gitignore` 中排除，PlantUML JAR 不入库。

---

## 8. 未做成图的部分（按需再补）

- **L3 前端组件视图**：如果演示更想讲 UI 分层，可另做一张聚焦 `frontend/src`（features/split、pages、lib、api）的组件图。
- **动态/时序图**：主线方案生成（就绪校验 → 坐标补全 → AI 调用 → 校验 → 版本化落库 → 确认）流程信息量大，用 Sequence 图比 C4 更合适。
- **部署图**：等确定真实部署形态后再补。