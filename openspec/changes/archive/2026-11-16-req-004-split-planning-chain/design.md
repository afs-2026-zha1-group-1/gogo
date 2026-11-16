# Design — req-004-split-planning-chain

- change-id: `req-004-split-planning-chain`｜phase: **P3**｜G1: **Pass**（SA Leo + IO Emily，2026-11-15）
- 依据: `specs/splits/spec.md`（5 requirement / 34 场景，权威契约）、`atdd-design.md`（30 API + 4 E2E 分层）、
  `proposal.md`（5 端点 / 13 错误码）、`docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版 + DR）、
  `requirement-workspace/deep-dive.md` B 链段（⑨ 数据契约）、`acceptance-test-fixtures.md`（B 链夹具）、
  `ui-design-reference/`（视觉权威，§五 React + Vite + shadcn/ui + Tailwind）
- 性质: **仅设计，非实现**；不写生产代码、不展开 UT 套件（UT 属 P4 `/sdd:atdd-apply`）、不批准 Gate
- 承接 G1: **C3**（分组齐全防御性前置）见 D16；**C4**（前端 shadcn/ui + Tailwind 取代 AntD5、stale N→N+1）见 D15 / D11

## Context（现状接地，非假设）

实际代码与 tech-stack-plan  aspirational 口径有差异，设计以**实际先例**为准：

- 后端包根 = `com.gogo.hello`（`HelloApplication` `@SpringBootApplication`，组件扫描该包及子包）；groupId `com.gogo`、artifactId `gogo-backend`、Boot **3.5.14** / Java **21**。
- `GreetingRepository` 用 **`JdbcTemplate`**（非 tech-stack-plan 的 `JdbcClient`）；`GreetingResponse` 是 `record(String message)`，`GET /api/greeting` 返回**裸** `{"message":"Hello World"}`（REQ-002 契约，**本 change 不动**）。
- 迁移仅 `V1__create_greeting.sql`；pom 仅 `flyway-core` + `sqlite-jdbc`（runtime），REQ-002 已证 SQLite 迁移可跑（无需新增 Flyway 模块，P4 空库冒烟复核）。
- `application.yml` 现状极简：`jdbc:sqlite:./data/gogo.db`，**未配** WAL / busy_timeout / foreign_keys / hikari pool=1 → V2 须落地 SQLite 三铁律（spec 硬约束）。
- 前端 `App.jsx`/`main.jsx` 纯 JSX，无 TS / Router / Query / Tailwind；`vite.config.js` port 5173 + proxy `/api`→8080；`package.json` build=`vite build`（无 tsc）。
- 测试先例 `GreetingApiTest`：`@SpringBootTest` + `@AutoConfigureMockMvc` + 内存 SQLite（shared-cache、pool=1）+ `JdbcTemplate` 断言库态。

约束（AGENTS.md + Rules）：最简实现、聚焦改动、可验证结果；`layer-boundaries`（Controller→Service→Repository，域不依赖 HTTP）、`orchestration-execution-separation`（编排不编码业务判定，timing 算子属纯域）、`no-circular-dependency`（共享内核为叶子）、`java-patterns`（构造注入、record DTO、Repository 接口、ApiResponse 包封套）。

## Goals / Non-Goals

**Goals:**

- 以可观察证据覆盖 34 场景（30 API + 4 E2E），五端点共享 identity→trip→membership 守卫与 `{data,error}` 包封套。
- 严格 4 表 + `trip.split_draft` JSON 文档（唯一 schema 扩展）；草稿唯一且版本可控、路线成对原子、timing 算子零 DB I/O。
- 前端增量引入 shadcn/ui + Tailwind + TS + Query v5 + Router 7，greeting 页保持 JSX 行为不变；视觉锚 `ui-design-reference/`。
- 本地与 CI 共享同一门语义（CI 恰 2 job 不变，E2E 仅本地）。

**Non-Goals:**

- 不实现确认（US-049）/取消（US-050）端点；`status` 仅预留 `cancelled` 值。
- 不实现分组移动控件与变更路径（夹具供给齐全分组）；不建第 5 表、不加 plan_node 列。
- 不引 ORM / H2 / 真实地图路径供给（R2）/ 外网调用 / 硬编码密钥；不动 greeting 能力与 V1 种子。
- 不写 NFR 测试（OQ-N7，Leo 2026-11-15 确认 defer，见 `atdd-design.md` §6）；不新造 CI 产品 / Playwright 套件。

## 架构与分层（D1）

新增两个子包（`com.gogo.hello` 扫描可达），共享内核为叶子，无环：

```text
com.gogo.hello
├── HelloApplication / Greeting*        # 既有，不动
├── common/                             # 叶子共享内核（无业务依赖）
│   ├── ApiResponse<T>                  # record {data, error}；ok(data)/error(code,msg)
│   ├── ErrorCode                       # enum，13 码 + HTTP 状态映射
│   ├── ApiException                    # RuntimeException，携带 ErrorCode
│   └── GlobalExceptionHandler          # @RestControllerAdvice → {data:null,error}
└── splits/                             # B 链能力模块
    ├── SplitDraftController            # 5 端点，薄：解析 X-Member-Id/DTO，委派
    ├── SplitDraftService               # 编排：守卫→用例时序→条件更新（不编码业务判定）
    ├── MemberGuard                     # identity→trip→membership（共享守卫组件）
    ├── SplitDraftRepository            # JdbcTemplate：trip/trip_member/plan_node SQL + 条件更新
    ├── domain/                         # 纯域，零 HTTP/零 DB
    │   ├── ReunionTimingCalculator     # 纯算术：total/overrun/missingInputs/feasible
    │   ├── SplitWindow                 # 窗口分钟 = reunion.start − departure.end
    │   └── SplitDraftDocument          # 草稿 JSON 文档模型（record）+ 版本谓词
    ├── provider/
    │   ├── BranchCandidateProvider     # 可替换接口（R2 留缝）
    │   └── FixtureBranchCandidateProvider  # 进程内固定夹具，无外网
    └── dto/                            # 请求/响应 record（与前端 TS 类型对齐）
```

分层方向：Controller→Service→Repository；`domain` 不 import HTTP/Repository；`common` 被 splits 依赖、不反依赖（`no-circular-dependency`）。编排（Service）只路由/排序，业务判定（窗口正性、版本谓词、timing 算术、feasible 聚合）落 `domain` 且有测试（`orchestration-execution-separation`）。

## Decisions

| id | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| D1 | 模块 = `com.gogo.hello.splits` + 叶子 `com.gogo.hello.common`；Controller→Service→Repository，domain 纯 | 组件扫描可达；对齐 layer-boundaries / no-circular / orchestration-execution；greeting 不动 | 独立 `com.gogo.splits`（需改扫描根，无谓改动）；flat 包（违分层） |
| D2 | 持久化 **`JdbcTemplate`** + record 映射，无 ORM | 匹配 `GreetingRepository`/`GreetingApiTest` 实际先例与 atdd-design；最简、聚焦 | `JdbcClient`（tech-stack-plan aspirational，但与实际代码不一致，徒增混用）；JPA（违 ORM non-goal） |
| D3 | `{data,error}` 包封套 = `ApiResponse<T>` record + `ErrorCode` enum + `ApiException` + `GlobalExceptionHandler`；成功 `error=null`，拒绝 `data=null` | spec 链级约定；`error.code` 稳定契约、`message` 非契约；集中异常→HTTP 映射 | 每端点手写 ResponseEntity（重复、易漂移）；沿用 java-patterns 示例的 `success` 字段（spec 只要 `{data,error}`，spec 为权威） |
| D4 | **V2 Flyway** `V2__splits.sql` 建 4 表 + `trip.split_draft` 可空 TEXT 列 + 自包含种子；`application.yml` 落地三铁律（URL `?journal_mode=WAL&busy_timeout=5000&foreign_keys=on` + hikari `maximum-pool-size=1`） | spec V2 硬约束；Flyway 独占 schema（DR-09）；prod/test 同一迁移种子；三铁律保单写者一致 | 手工 DDL/schema.sql（违 DR-09）；第 5 表/加列（违 OQ-N2）；池>1（放大 SQLITE_BUSY） |
| D5 | 草稿 = `trip.split_draft` JSON 文档（Jackson 序列化）：`initiatorMemberId/mainPlanVersion/draftVersion/status/departureStopId/reunionStopId/groups/routes/createdAt/updatedAt` | deep-dive ⑨ 文档字段；唯一 TEXT JSON 载体；活跃唯一 = 每 trip 至多一份 | 独立草稿表（违 OQ-N2/N5）；草稿字段散列 plan_node（违不加列） |
| D6 | **路线时长分解 JSON 存草稿文档 `routes`**（按组 A/B：`activityMinutes/travelLegsMinutes[]/bufferMinutes`）；`plan_node` split-a/b 行存路线结构节点（title=活动名、location_name、start/end_at、起终点引用、`plan_version`=mainPlanVersion） | 解决 deep-dive「时长存结构化 JSON 字段」与「plan_node 不加列」张力：唯一 TEXT JSON 载体是 split_draft（复用 §5 约定）；plan_node 仍承载路线行（spec G1） | 时长塞 plan_node 现有列（语义错）；加 plan_node JSON 列（违 OQ-N2）；第 5 表（违裁决） |
| D7 | 边界时刻/窗口**派生自主线 stop 行**：出发=departure stop `end_at`、会合=reunion stop `start_at`、窗口=会合−出发（分钟）；草稿仅存 stop id；保存时校验窗口为正 | 单一真相源 = 主线 stop；避免重复存储；spec B 要求详情返回时刻+窗口 | 草稿缓存时刻/窗口（双源易漂移）；前端算窗口落库（违「判定归后端」） |
| D8 | 共享守卫 **identity→trip→membership**：缺失/全局未知 id→401 `MEMBER_REQUIRED`；已知 id+未知 trip→404 `TRIP_NOT_FOUND`；已知 outsider→403 `NOT_A_MEMBER`；拒绝 `data=null` 无私有值；端点级再校验发起人/活跃草稿 | spec 链级约定 + T6-N/D3-D5-N；守卫先于计算/落库 | 各端点各自校验（顺序漂移、泄露风险）；membership 先于 trip（违 spec 顺序） |
| D9 | 并发 = **条件更新**（无 SELECT FOR UPDATE）：发起 `UPDATE trip SET split_draft=? WHERE id=? AND split_draft IS NULL`；变更 `... WHERE id=? AND json_extract(split_draft,'$.draftVersion')=?`；影响行数 0→409（CONFLICT/STALE）；pool=1 天然串行 | tech-stack-plan §7 铁律 2；S2 并发至多一个、B6-N/G3-N stale；SQLite JSON1 内置 | 悲观锁（SQLite 无 FOR UPDATE）；应用层 synchronized（多实例失效、违单写者模型） |
| D10 | 成对原子 = **`@Transactional` 单事务**：先删旧 split-a/b 对→插新对→版本条件更新；提供者任一组抛错→整对回滚 `ROUTE_GENERATION_FAILED`，主线行与旧对不变 | spec G1/G2-N；SQLite 单写者短事务；不留半成品对 | 两条独立写（半对风险）；先写后校验（违原子） |
| D11 | **G3-N stale 以 N→N+1 构造**：生成捕获边界后实际版本 N→提供者计算→落库前 `WHERE draftVersion=N` 条件更新；并发边界重选推进 N+1→0 行→409 `STALE_DRAFT_VERSION`，N 结果丢弃、N+1 不被覆盖 | F5 已入 spec；N 是边界后版本非 1；确定性可测（latch/版本条件） | 用 v1→v2 示意（与「边界后 N」张力，F5 已纠）；生成期间锁草稿（违单写者短事务） |
| D12 | `BranchCandidateProvider` 接口 + `FixtureBranchCandidateProvider`（进程内固定值：A→National Gallery 60/[15,20]/10、B→Gardens by the Bay 60/[20,20]/10），无外网；G2-N 注入对 B 抛错替身 | OQ-3 裁决；R2 可换真实供给不改用例层；DR-07 口径不引网络 | 直接硬编码路线于 Service（不可替换、违 OQ-3）；真实地图 API（R2，违 non-goal） |
| D13 | `ReunionTimingCalculator` **纯域零 DB**：入 `windowMinutes`+`routes[2]`，出逐路线 `totalMinutes=activity+ΣtravelLegs+buffer`、`overrunMinutes=max(0,total−window)`、`missingInputs[]` + 整对 `feasible`；超窗/缺输入→200 feasible=false；空/路线数≠2→400 `INVALID_ROUTE_PAIR`；entry guard 先于算子 | spec T1-T6-N + OQ-N6；orchestration-execution（算子属域）；算子不读库不写库 | 算子内查路线（违零 I/O）；超窗返 4xx（spec 要 200+feasible=false）；前端判可行（违判定归后端） |
| D14 | **GET 详情** member-only 一致快照：组装草稿文档 + `mainPlanStops`（branch=main、version=mainPlanVersion）+ 派生边界时刻/窗口 + 路线对（plan_node split 行 + 草稿 routes 时长）；无活跃草稿→200 `{data:null,error:null}`；只读不增版本、不要求发起人 | spec D1-D5-N；四屏刷新/轮询/快照组装共用；空态不隐式创建 | 详情要求发起人（违 D1 member-only）；读时增版本/创建（违只读）；前端拼快照（违「无客户端猜测」） |
| D15 | 前端 **TS + shadcn/ui + Tailwind + TanStack Query v5 + React Router 7**；Screen 11-14 新 `.tsx` 页；greeting `App.jsx` 保持 JSX；`main.jsx` 包 QueryClientProvider + Router；Tailwind theme 映射 ui-design-reference 色彩令牌；build 脚本 `tsc -b && vite build`（CI 命令仍 `npm run build`） | **C4**：Leo 2026-11-15 确认 shadcn/ui+Tailwind 取代 OQ-N3 AntD5；ui-design-reference §五权威；增量混编不动 greeting | AntD5（proposal 旧口径，已被 Leo 裁决取代，P5 同步 proposal/KB）；全量转 TS（违聚焦、动 greeting）；引 Zustand（DR-08 不引） |
| D16 | 分组 = **夹具保证的齐全/不相交防御性前置**（A=Alice+Ben、B=Chloe+Daniel），创建时初始化 `groups`；服务层校验齐全；invalid-group 负向路径随分组移动特性（out-of-scope）延后 | **C3** + F1 已入 spec；OQ-N5；本期无分组移动控件 | 本期实现 invalid-group 负向（扩范围，违 F1 裁决）；分组独立表（违 OQ-N5） |
| D17 | 门对齐 `atdd-design.md` §3：Static 反向 grep + workflow 2-job 校验；Runtime `mvn -B test` + `npm ci && npm run build`（本地+CI）；System 浏览器走查 Screen 11-14（**仅本地**，CI 无 E2E runner）；API red-first | 三层 stop checks + ci.yml 恰 2 job 不变；不新造 CI 语义 | CI 加 E2E job（违不新造 CI）；跳过 red-first（违 ATDD） |

## 数据模型与草稿文档

**4 表（V2，tech-stack-plan §5，不加列）**：`trip`（id UUID TEXT PK、title、destination、start/end_date、invite_code UNIQUE、plan_version、created_at、**split_draft TEXT NULL**）；`trip_member`（id PK、trip_id FK、display_name、role owner/member、plan_ack_version、joined_at、UNIQUE(trip_id,display_name)）；`member_preference`（id、trip_id、member_id、kind、payload TEXT JSON、updated_at；本链无需种子）；`plan_node`（id、trip_id、plan_version、parent_id、branch_id、node_type、title、start/end_at、location_name、lat、lng、sort_order、created_at）。时间一律 TEXT ISO-8601 UTC；分钟整数。

**草稿文档（`trip.split_draft`，D5/D6）**：

```json
{
  "initiatorMemberId": "<Ben>", "mainPlanVersion": 1, "draftVersion": 1, "status": "active",
  "departureStopId": null, "reunionStopId": null,
  "groups": {"A": ["<Alice>", "<Ben>"], "B": ["<Chloe>", "<Daniel>"]},
  "routes": {
    "A": {"activityMinutes": 60, "travelLegsMinutes": [15, 20], "bufferMinutes": 10},
    "B": {"activityMinutes": 60, "travelLegsMinutes": [20, 20], "bufferMinutes": 10}
  },
  "createdAt": "<ISO>", "updatedAt": "<ISO>"
}
```

`routes` 仅生成后存在（生成前空/缺省，GET 返回 `routes=[]`）；边界 id 保存前为 null。路线结构节点（活动名/地点/时刻/起终点）落 `plan_node` split-a/b 行，时长分解落草稿 `routes`（D6），GET 按组组装。

**种子（V2 自包含，夹具权威）**：trip Singapore Friends Day（固定 UUID、invite_code `SGF26A`、plan_version=1、split_draft=NULL）；Alice owner + Ben/Chloe/Daniel member 均 ack=1；Eve 属另一行程；主线 v1 两 stop（City Hall MRT 01:00–01:30Z、Merlion Park 03:30–04:00Z，branch=main）；Singapore Zoo 不在主线（B3-N 越界用）。greeting 表与 V1 种子不动。

## 端点契约与错误码

| 端点 | 方法 | 守卫/前置 | 成功 | 主要拒绝 |
|---|---|---|---|---|
| `/api/trips/{tripId}/split-draft` | GET | identity→trip→membership（member-only） | 200 一致快照 / 空态 200 data=null | 401/404/403 |
| `/api/trips/{tripId}/split-draft` | POST | + 主线确认 + 活跃唯一 | 201 草稿（draftVersion=1） | 409 MAIN_PLAN_NOT_CONFIRMED / SPLIT_DRAFT_CONFLICT；401/404/403 |
| `/api/trips/{tripId}/split-draft/boundaries` | PUT | + 发起人 + 活跃 + 版本 + 成对主线内 + 正窗口 | 200 边界+窗口，draftVersion+1 | 400 NONPOSITIVE_SPLIT_WINDOW / BOUNDARY_NOT_IN_MAIN_PLAN；403 NOT_SPLIT_INITIATOR；409 SPLIT_DRAFT_NOT_ACTIVE / STALE_DRAFT_VERSION |
| `/api/trips/{tripId}/split-draft/routes:generate` | POST | + 发起人 + 活跃 + 边界已存 + 版本 | 200 成对路线，draftVersion+1 | 409 SPLIT_BOUNDARIES_REQUIRED / STALE_DRAFT_VERSION；403 NOT_SPLIT_INITIATOR；ROUTE_GENERATION_FAILED（回滚） |
| `/api/trips/{tripId}/split-draft/routes:check-timing` | POST | identity→trip→membership（算子零 DB） | 200 逐路线 total/overrun/missingInputs + feasible | 400 INVALID_ROUTE_PAIR；401/404/403；超窗/缺输入=200 feasible=false |

**13 错误码 → HTTP**（`ErrorCode` enum，D3）：`MEMBER_REQUIRED`→401、`TRIP_NOT_FOUND`→404、`NOT_A_MEMBER`/`NOT_SPLIT_INITIATOR`→403、`NONPOSITIVE_SPLIT_WINDOW`/`BOUNDARY_NOT_IN_MAIN_PLAN`/`INVALID_ROUTE_PAIR`→400、`MAIN_PLAN_NOT_CONFIRMED`/`SPLIT_DRAFT_CONFLICT`/`SPLIT_DRAFT_NOT_ACTIVE`/`STALE_DRAFT_VERSION`/`SPLIT_BOUNDARIES_REQUIRED`→409、`ROUTE_GENERATION_FAILED`→500（整对回滚，无半对）。GET 读取复用既有守卫码，不新增错误码。

## 并发与原子性（D9/D10/D11）

- 单写者：hikari pool=1 + WAL + busy_timeout=5000 + foreign_keys=on（D4）；写操作短事务。
- 发起唯一：`split_draft IS NULL` 条件更新，0 行→409 CONFLICT（S2 并发一 201 一 409，计数=1）。
- 版本条件：`json_extract(split_draft,'$.draftVersion')=?` 条件更新，0 行→409 STALE（B6-N）；任何变更 draftVersion+1。
- 成对原子：单事务删旧对+插新对+版本更新；提供者抛错→回滚（G2-N），主线与旧对不变。
- stale 结果：生成捕获 N→计算→`WHERE draftVersion=N` 落库；并发重选 N+1→0 行→409，N+1 保留（G3-N，确定性 latch 构造）。

## 前端设计（D15，C4）

- 栈：TS + shadcn/ui + Tailwind + TanStack Query v5 + React Router 7；新增依赖入 lockfile（P4 验 CI 可达，impact R5）。
- 入口：`main.jsx` 保持 JSX，包 `QueryClientProvider` + `RouterProvider`；greeting `App.jsx` 不动（vite 混编 JSX/TSX）。
- 页面：Screen 11 发起 / 12 边界 / 13 分组路线 / 14 窗口校验（`.tsx`），路由 `/trips/:tripId/split/*`；四屏共用 member-only GET 详情刷新/轮询（DR-06 `refetchInterval`）。
- 视觉：Tailwind theme 映射 ui-design-reference `:root` 令牌（品牌青绿、A 蓝/B 橙、ok/warn/err）；shadcn 组件组合 card/button/pill/chip/select/route/valid-item；移动优先、克制风格。
- 状态：loading/empty/error/permission 四态可观察；前端不自行判唯一性/确认/窗口合法性/可行（判定归后端）；分组移动控件不实现（反向）。
- 构建：`tsconfig` 覆盖新 TS 代码（greeting JSX 不强制检查）；build=`tsc -b && vite build`；**CI 命令仍 `npm run build` 不变**。
- 数据：E2E 用 B 链种子（SGF26A/窗口 120/A105·B110），**非原型演示数据（青岛/210）**。

## 门（D17，链接 atdd-design §3）

Static（反向 grep + workflow 2-job）→ Runtime（`mvn -B test` + `npm ci && npm run build`，本地+CI）→ System（浏览器走查 Screen 11-14，仅本地）。CI 恰 2 job 不变；API red-first（P4 apply 拥有红绿 TDD 含 UT）；Java hooks（format/checkstyle/compile）属 P4 PostToolUse。

## Risks / Trade-offs

| id | Risk | Mitigation / trade-off |
|---|---|---|
| R1 | SQLite 单写者并发/成对原子（impact R4） | pool=1 + 短事务 + 条件更新；S2/G2-N/G3-N 集成用例 P4 验证（确定性 latch） |
| R2 | 时长 JSON 载体张力（deep-dive「结构化字段」vs「不加列」） | D6 定决：时长落 split_draft 文档、结构落 plan_node；P4 schema 断言恰 4 表无额外列（反向） |
| R3 | 前端新依赖 lockfile 的 CI runner 可达性（impact R5） | P4 `npm ci` 本地+CI 观察；公共 registry resolved URL（沿用 REQ-001 D6 口径），无内网 host |
| R4 | TS 引入后 build 含 tsc，greeting JSX 混编 | tsconfig 仅覆盖新 TS；CI 命令不变；P4 验 `npm run build` 绿 |
| R5 | application.yml 三铁律改动波及 greeting 数据源 | 仅加 WAL/pool/pragma，greeting 可观察行为不变；P4 回归 `GET /api/greeting` 200 裸 message |
| R6 | E2E 仅本地人工/浏览器验收，无可重复 CI 套件 | 接受（atdd non-goal 排除 Playwright）；锚 ui-design-reference 逐屏核验，记录残留风险 |
| R7 | proposal/KB 仍写 AntD5（OQ-N3 旧口径） | C4：design 承接 shadcn 裁决；proposal/KB 口径 **P5 living-merge 同步**，不静默改 committed proposal |

## G1 承接（C3/C4）

- **C3**（D16）：分组齐全/不相交为夹具保证防御性前置，invalid-group 负向随分组移动（out-of-scope）延后；F1 已入 spec，design 续承。
- **C4**（D15/D11）：前端 shadcn/ui + Tailwind 取代 AntD5（+TS/Query v5/Router 7）；stale 以 N→N+1 构造（F5 已入 spec）；路线 plan_version=草稿 mainPlanVersion（D6）；proposal/KB 口径 P5 同步（R7）。

## Next（non-Gate）

- `tasks.md`：T 任务（红先绿后，每任务挂 design D 决策 + atdd 场景，owner=Dev P4 apply）+ **Spec↔Design↔Tasks↔ATDD 对齐自检**（34 场景计数一致、无静默扩缩）。
- 随后 `/sdd:quality-checklist`（phase=p3，基于真实产物）；G2/G3 人工签核，不自动批准。