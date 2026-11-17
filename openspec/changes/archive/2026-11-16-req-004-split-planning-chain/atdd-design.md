# ATDD design — req-004-split-planning-chain

- change-id: `req-004-split-planning-chain`｜phase: **P3**｜G1: **Pass**（SA Leo + IO Emily，2026-11-15）
- 依据: `specs/splits/spec.md`（5 requirement / 34 场景）、`acceptance-test-fixtures.md`（B 链权威夹具）、
  `java-testing` 规则、`.github/workflows/ci.yml`、`docs/feedback/verification-commands.md`（三层 stop checks）、
  `ui-design-reference/`（视觉权威，shadcn/ui + Tailwind）
- 性质: **仅 ATDD 设计，非实现**；不写生产代码、不展开 UT 套件（UT 属 P4 `/sdd:atdd-apply`）、不造 Playwright/POM/Excel 生成器、不新造 CI 产品
- 已确认裁决: 前端 **shadcn/ui + Tailwind**（取代 OQ-N3 AntD5）；**NFR 测试 defer**（见 §6）

## 1. ATDD 分层范围（API + E2E）

按 `layer-inference.md` first-match 分类：**30 API + 4 E2E**；纯逻辑标 **Defer-UT**（apply 时单元 TDD，不在此展开）。
API = 单端点请求/响应 + 真实 DB 断言（MockMvc + JdbcTemplate，无 UI）；E2E = 跨前后端用户可观察路径（Screen 展示契约）。

| # | 场景 | 层 | 建议附加（advisory） | rationale（命中信号） |
|---|---|---|---|---|
| V2 | 迁移与自包含种子 | API | Integration（schema） | 启动后 JdbcTemplate 断言 4 表 + split_draft 列 + 种子，无 UI |
| S1 | 成员发起唯一草稿 | API | — | POST 201 + 库中活跃草稿数=1 |
| S2 | 并发发起至多一个 | API | Integration（一致性） | 并发 POST 一 201 一 409 + 计数=1（条件更新） |
| S3-N | 主线未确认拒绝 | API | — | 409 MAIN_PLAN_NOT_CONFIRMED + 不创建 |
| S4-N | 非成员拒绝 | API | Security（authz，DR-05 非安全控制） | 403 NOT_A_MEMBER + 无私有值 |
| S5-N | 缺失/未知身份拒绝 | API | Security（authz） | 401 MEMBER_REQUIRED |
| S6-N | 未知行程拒绝 | API | — | 404 TRIP_NOT_FOUND |
| S7 | 重复发起拒绝 | API | — | 409 SPLIT_DRAFT_CONFLICT + 原草稿不变 |
| B1 | 正窗口成对保存 | API | — | PUT 200 + 窗口 120 + draftVersion 2 |
| B2-N | 非正窗口拒绝 | API | — | 400 NONPOSITIVE_SPLIT_WINDOW + 边界/版本不变 |
| B3-N | 主线外节点拒绝 | API | — | 400 BOUNDARY_NOT_IN_MAIN_PLAN |
| B4-N | 非发起人拒绝 | API | Security（authz） | 403 NOT_SPLIT_INITIATOR |
| B5-N | 无活跃草稿拒绝 | API | — | 409 SPLIT_DRAFT_NOT_ACTIVE |
| B6-N | 过期版本拒绝 | API | Integration（一致性） | 409 STALE_DRAFT_VERSION + 不变 |
| G1 | 成对生成 | API | Integration（原子性） | POST 200 + 恰两路线 + 时长分解 + 版本+1 + 进程内提供者 |
| G2-N | 半对失败整对回滚 | API | Integration（rollback） | failing provider → ROUTE_GENERATION_FAILED + 无新路线 + main 保留 |
| G3-N | 过期结果拒绝 | API | Integration（并发） | N 启动 + 并发重选 N+1 → 409 STALE + N+1 不被覆盖 |
| G4-N | 无边界拒绝 | API | — | 409 SPLIT_BOUNDARIES_REQUIRED |
| G5-N | 非发起人拒绝 | API | Security（authz） | 403 NOT_SPLIT_INITIATOR |
| T1 | 双双通过 | API | — | POST 200 + A105/B110 + feasible=true + 算子零 DB |
| T2-N | 超窗拦住整对 | API | — | 200 + A125/overrun5 + feasible=false |
| T3-N | 缺输入不得判可行 | API | — | 200 + missingInputs + feasible=false |
| T4-N | 非成员拒绝 | API | Security（authz） | 403 NOT_A_MEMBER |
| T5-N | 非法快照拒绝 | API | — | 400 INVALID_ROUTE_PAIR |
| T6-N | 守卫先于计算 | API | Security（authz） | 401/404/403 + 算子不被调用 |
| D1 | 成员重载草稿+路线 | API | — | GET 200 + 一致快照 + 无变更/无版本递增 |
| D2 | 无活跃草稿空态 | API | — | 200 {data:null,error:null} + 不隐式创建 |
| D3-N | outsider 不可读 | API | Security（authz） | 403 NOT_A_MEMBER + data=null |
| D4-N | 缺失/未知身份不可读 | API | Security（authz） | 401 MEMBER_REQUIRED + data=null |
| D5-N | 未知行程不可读 | API | — | 404 TRIP_NOT_FOUND + 无变更 |
| Screen 11 | 发起屏幕展示契约 | **E2E** | — | THEN 断言页面态（draft 状态/冲突/未确认/无权限/loading/empty） |
| Screen 12 | 边界选择屏幕展示契约 | **E2E** | — | 选择器仅主线 stop + 窗口分钟 + 错误/loading/empty/permission 态 |
| Screen 13 | 分组路线屏幕展示契约 | **E2E** | — | 成对路线卡 + 时长分解 + 失败/过期态；分组移动控件不实现（反向） |
| Screen 14 | 窗口校验屏幕展示契约 | **E2E** | — | 活动/交通/buffer 分解 + 通过/超窗/缺输入三态 + loading/empty/permission |

**Defer-UT（apply-time 单元 TDD，本文件不展开套件）**：窗口分钟计算（reunion.start − departure.end）；
timing 算子纯算术（totalMinutes=activity+ΣtravelLegs+buffer、overrunMinutes、missingInputs 探测、整对 feasible 聚合）；
draftVersion 状态迁移/条件更新谓词；草稿 JSON 文档序列化映射。这些由 API 场景在集成层覆盖，单元红绿留 P4。

**建议测试类（mirror main package，task-plan 细化）**：`SplitDraftStartApiTest`（V2/S1~S7）、`SplitBoundaryApiTest`（B1~B6-N）、
`SplitRouteGenerationApiTest`（G1~G5-N + provider double）、`ReunionTimingApiTest`（T1~T6-N）、`SplitDraftDetailApiTest`（D1~D5-N）；
E2E = `SplitScreens` 本地浏览器验收走查（Screen 11~14，非 CI runner）。

## 2. 先于生产代码写什么（red-first）

- **API 验收测试（MockMvc）**：30 个 API 场景先写为**红**（端点/schema 尚不存在 → 失败），引导 P4 实现转绿；
  沿用 `GreetingApiTest` 约定：`@SpringBootTest` + `@AutoConfigureMockMvc` + 内存 SQLite（shared-cache、pool=1）+ JdbcTemplate 断言库态。
- **E2E 验收清单**：Screen 11~14 的可观察态（loading/empty/error/permission + 展示契约）先写成文档化检查，P4 前端实现后本地浏览器逐屏核验。
- **夹具先行**：V2 Flyway 迁移自包含种子（prod+test 同一迁移）；测试 reset 助手；G2-N failing-provider 测试替身。
- 测试组织按 `java-testing`：`controller/`（API）、`integration/`（并发/原子）、`repository/`（schema/种子）；AssertJ  fluent 断言、Mockito 替身可用。
- **不在此写**：UT 套件（Defer 清单见 §1）、生产业务代码。

## 3. 本地 vs CI 门（对齐三层 stop checks，不新造 CI 语义）

| 层 | 本地命令 | CI（ci.yml，恰 2 job） | 覆盖 |
|---|---|---|---|
| Static | 反向 grep（无 ORM/H2/第5表/硬编码密钥/外网提供者）+ workflow 2-job 校验 | —（CI 不含 static grep） | non-goal 反向 + 配置 |
| Runtime | `cd backend && mvn -B test`；`cd frontend && npm ci && npm run build` | backend `mvn -B test`；frontend `npm ci && npm run build` | **API 验收红绿** + 前端构建 |
| System | 起 backend jar(8080)+frontend dev(5173)，浏览器走查 Screen 11~14 + curl API smoke | **无**（CI 无 E2E runner，不新造） | **E2E 验收（仅本地）** |

- CI 命令与现状**完全一致**（不增 job/runner）；E2E 属本地 system 层人工/浏览器验收，锚 `ui-design-reference/`。
- 前端引入 TS 后，`npm run build` 应含类型检查（建议 build 脚本 `tsc -b && vite build`，属 design 决策）；**CI 命令仍 `npm run build` 不变**。
- 红绿门：API 验收测试 red-first（P4 apply 拥有红绿 TDD 含 UT）；本设计只规定验收检查，不代写实现。
- Java hooks（google-java-format/checkstyle/compile）属 P4 apply PostToolUse，编译门 `mvn compile/test` 对齐。

## 4. 数据 / 夹具策略

- **共享种子**：V2 迁移自包含（trip `SGF26A` plan_version=1；Alice owner + Ben/Chloe/Daniel member 均 ack=1；Eve 属另一行程；
  主线 v1 两 stop：City Hall MRT 01:00–01:30Z、Merlion Park 03:30–04:00Z）；prod 与 test 同一迁移种子。
- **API 隔离/清理**：内存 SQLite（pool=1 避 SQLITE_BUSY）；每测试 reset 到种子态——`split_draft=NULL`、删 `plan_node` branch_id∈{split-a,split-b}、
  还原全员 `plan_ack_version=1`（`@BeforeEach` JdbcTemplate reset 或 try/finally，避免逐测试 `@DirtiesContext`）。
- **特殊构造**：未确认态（S3-N）置某成员 ack=0 验后还原；G2-N 注入对 B 组抛错的 `BranchCandidateProvider` 替身（Mockito/`@TestConfiguration`）；
  G3-N 以「边界后实际 N 启动 + 并发重选 N+1」构造（latch 控制提供者或版本条件断言，确定性）；S2 用 `CountDownLatch` 双线程并发 POST。
- **E2E 数据**：运行态 backend（file DB，V2 种子）+ frontend dev（proxy /api→8080）；**数据用 B 链种子（SGF26A/窗口120/A105·B110）**，
  **非原型演示数据（青岛/210）**；视觉/交互锚 `ui-design-reference/` Screen 11~14（shadcn/ui + Tailwind 风格）；E2E 前删 `backend/data/` 重建干净种子。
- **非固定值**：草稿 id / 路线节点 id（DB 分配，从响应读取）、error.message（仅 code 为契约）、R2 真实提供者输出——不字面断言。
- **数据权威**：`acceptance-test-fixtures.md`（B 链）；夹具所有权归测试，reset 助手集中管理。

## 5. Non-goals + 反向验证行

**本技能 non-goals**：不写业务功能代码；不展开 UT 套件计划；不造 Playwright/POM/Excel/批量用例生成器；不新造 CI 产品。

**out-of-scope 反向验证（每项 ≥1 reverse case，断言系统「不做」该行为）**：

| Non-goal / out-of-scope | 反向 case | 层 |
|---|---|---|
| US-049 确认端点不实现 | `POST .../split-draft:confirm`（或 /confirm）无路由 → 404/405；草稿不被锁定 | API |
| US-050 取消端点不实现 | `POST .../split-draft:cancel` 无路由 → 404/405；status 预留 cancelled 但无端点 | API |
| 分组移动控件不实现 | Screen 13 无成员移动控件；无 group-move 端点（后端分组变更→版本递增语义仍成立） | E2E + API |
| 不建第 5 表 / 不加 plan_node 列 | schema 断言：恰 trip/trip_member/member_preference/plan_node + trip.split_draft 列，无额外表/列 | API（JdbcTemplate）/ Static |
| 真实地图/路径供给（R2）不在本期 | `BranchCandidateProvider` 进程内夹具，无外网调用（无 HTTP client 依赖） | API / Static 反向 grep |
| 不开放半边界 | PUT boundaries 仅含一个 stop → 400（成对必填） | API |
| timing 算子零 DB I/O | T1 断言算子无 Repository 依赖/零 DB 调用（spy verify），仅读快照 | API |
| greeting 能力/ V1 种子不受影响 | `GET /api/greeting` 仍 200 `{"message":"Hello World"}`；V1 种子 intact（回归） | API |
| 无 ORM / H2 / 硬编码密钥 | 反向 grep：pom 无 jpa/hibernate、backend 无 h2、源码无密钥（沿用 verification-commands static） | Static |
| NFR 不发明（OQ-N7） | 无 NFR 测试段；保留期/SLA 记录备查（见 §6） | — |

## 6. NFR 测试（deferred — 已询问并确认）

- **Leo 2026-11-15 确认：NFR 测试 defer / 不纳入**（OQ-N7+NFR 用户裁决：保留期/SLA 不发明、记录备查）。
- 本 ATDD 仅 **API + E2E** 验收层；**无 NFR 测试段**（可观测性/性能/韧性不在本期）。
- 并发/原子性（S2/G2-N/G3-N）作为**功能一致性**验收（Integration advisory），非性能/压力 NFR。

## Next（non-Gate）

- `/sdd:task-plan`：产 `design.md`（D 决策：架构/schema/草稿 JSON/错误码/并发/前端 shadcn 栈/门/风险，承接 C3 分组防御性前置、C4 前端栈+N→N+1 stale）
  + `tasks.md`（T 任务，红先绿后，挂 design 决策与 atdd 场景）+ Spec↔Design↔Tasks↔ATDD 对齐自检。
- 随后 `/sdd:quality-checklist`（phase=p3，基于真实产物）。