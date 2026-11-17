# ATDD design — us-049-050-split-confirm-cancel

- Change: `openspec/changes/us-049-050-split-confirm-cancel/`（US-049 确认拆分 + US-050 取消未激活草稿）
- Delta Spec: `specs/splits/spec.md` — 7 requirement / **51 场景**；G1 **Pass**（SA Leo + IO Emily，2026-11-16），C7 已由 P3 首步 delta 补丁 closed
- Fixtures authority: `requirement-workspace/acceptance-test-fixtures.md` §US-049-050（CF/CN 矩阵、state setup、error details 形状、wire 投影）
- Stage: P3，`/sdd:atdd-design`。本文件只定义**验收层**与红先顺序；不写生产功能代码、不写单元测试套件计划（UT 留 P4）。

## 1. ATDD 层与范围

**API 层（MockMvc + 真实 SQLite + Flyway，沿用 `AbstractSplitApiTest`）**：两个新端点、状态机、CAS 并发、详情投影、错误明细体、守卫矩阵，全部以「HTTP 状态 + `error.code` + `error.details` + 文档 `status`/`draftVersion` + `plan_node` 行数/逐行内容」断言。**E2E 层（浏览器 + 真实后端 + Vite dev）**：Screen 15 确认/取消面、Screen 11 状态分支、四态（error/empty/loading/permission），P4 以编号手工步骤执行（REQ-004 / US-031-037 先例；CI 不含浏览器）。**UT（P4）**：文档状态迁移与可空时长模型、CAS SQL 行为。

| # | 场景（delta / fixtures） | 层 | 附加建议 | 断言要点 |
|---|---|---|---|---|
| CF1 | 组织者确认成功并锁定 | API | consistency | `200`；`status=confirmed`；`draftVersion` 不变；随后 `PUT boundaries` / `routes:generate` → `409 SPLIT_DRAFT_NOT_ACTIVE` |
| CF2-N | 超窗拦住整对（125/120） | API | — | `409 SPLIT_TIMING_INFEASIBLE`；`error.details.routes[0]={A,125,5,[]}`、`routes[1]={B,110,0,[]}`；仍 `active` |
| CF3-N | 缺输入不得判可行 | API | consistency | `409` 同码；`routes[0].missingInputs` 非空（字段名），`routes[1]` 空；仍 `active` |
| CF7-N | 草稿不完整（缺路线/半边界） | API | — | `409 SPLIT_DRAFT_INCOMPLETE`；`error.details.missing` 含 `routes`/`boundaries`；不进入复算 |
| CF4-N | 版本过期 | API | — | `409 STALE_DRAFT_VERSION`；状态/版本不变 |
| CF5-N | 非组织者（Ben） | API | security | `403 NOT_SPLIT_ORGANIZER`；状态不变 |
| CF6-N | 无草稿 / 已 confirmed / 已 cancelled | API | — | 三情形 `409 SPLIT_DRAFT_NOT_ACTIVE` |
| CN1 | 发起人取消并允许替换 | API | integration + consistency | `200`；`status=cancelled`、`routes=[]`；main 行逐行不变、split 行 0；再 GET 同值；随后重建 `201`（initiator=调用者、v1、active、边界/路线空；**列 `draft_version`=1**） |
| CN2-N | 已确认草稿不可取消 | API | — | `409 SPLIT_DRAFT_NOT_ACTIVE`；已确认文档与 split 行不变 |
| CN3-N | 非发起人（Chloe） | API | security | `403 NOT_SPLIT_INITIATOR`；仍 `active` |
| CN4-N | 无草稿时取消 | API | — | `409 SPLIT_DRAFT_NOT_ACTIVE` |
| CN6-N | 取消携带过期版本（重建后到达） | API | consistency（并发） | `409 STALE_DRAFT_VERSION`；新草稿 initiator/边界/路线不变 |
| CN5-N | 取消的三守卫 | API | security | `401 MEMBER_REQUIRED` / `404 TRIP_NOT_FOUND` / `403 NOT_A_MEMBER`；`data=null` |
| S8 | 取消后同一行重建 | API | consistency | `201`；同一行改写；`split_draft` 行数=1；`mainPlanVersion=1` |
| S7′ | `active`/`confirmed` 行再发起 | API | — | `409 SPLIT_DRAFT_CONFLICT`；原文档不变 |
| S9-N | 并发重建（两个成员同时发起） | API | consistency | 至多一个 `201`，另一 `409 SPLIT_DRAFT_CONFLICT`；行数=1 |
| D1b | confirmed / cancelled 详情可读 | API | — | confirmed 返回保存的 routes；cancelled 返回 `routes=[]`（无幽灵路线）；读取不改版本 |
| D2 | 无草稿详情 | API | — | `200 {data:null,error:null}` |
| — | 确认后详情投影一致 | API | consistency | confirm 200 体与 `GET /split-draft` 同形同值（同一 serializer） |
| S15 | Screen 15：复核 → 确认/取消 → 终态 | E2E | — | 路线卡（分组/活动/交通/buffer/窗口对比）、边界、状态徽标；组织者可见确认、非组织者只读；发起人可取消；confirmed/cancelled 两终态 |
| S15-err | 超窗/缺输入/不完整错误渲染 | E2E | — | 按 `error.details` 渲染逐路线超窗分钟与缺失项；不自行宣布可行 |
| S11 | Screen 11 状态分支 | E2E | — | 无草稿或 cancelled → 「发起（替换）分队草稿」；active → 「下一步：选择边界」；confirmed → 只读终态 |
| S14-gate | Screen 14 的 status 门禁（C10 提前到 P4） | E2E | — | confirmed/cancelled 草稿进入校验页只读并提示终态 |
| states | loading / empty / error / permission 四态 | E2E | — | 截图未画也必须实现 |
| UT-1 | `SplitDraftDocument` 状态迁移（confirmed/cancelled/rebuild，版本不变/重置） | Defer UT | — | P4 apply-time 单元 TDD |
| UT-2 | 可空 `RouteDurations` → `RouteTimingInput` 映射（null 保留为 missing） | Defer UT | — | P4 |
| UT-3 | CAS 条件更新（版本/状态不匹配 → 0 行 → 409 映射） | Defer UT | — | P4（repository 层，真实 SQLite） |
| R-N | 反向：`POST .../split-draft/confirm`（斜杠形式）、`PATCH` 等未定义路由 | API | — | `404`/`405`；无状态变化 |

不做比例管控：契约行为全部在 API 层可观察，E2E 只覆盖「必须看到页面才能证明」的展示契约。

## 2. 先于生产代码写什么

1. **`SplitConfirmApiTest`（红）**：CF1、CF2-N、CF3-N、CF7-N、CF4-N、CF5-N、CF6-N、R-N、守卫复用；`@BeforeEach` 重置 `split_draft`、`plan_node(split-*)`、`trip.main_plan_confirmed`；读完即断言库态。对当前树应为 404（端点不存在）→ 红。
2. **`SplitCancelApiTest`（红）**：CN1–CN4-N、CN6-N、CN5-N、主线逐行快照（`branch_id='main'` 全列比较）、split 行清零、`routes=[]`。
3. **`SplitDraftStartApiTest` 扩展（红）**：S8（取消后重建、列版本重置）、S9-N（并发重建）、S7′（active/confirmed 冲突）。
4. **`SplitDraftDetailApiTest` 扩展（红）**：D1b（cancelled `routes=[]`、confirmed 保留）、确认/取消后同形。
5. **E2E 步骤清单** 写入 `docs/feedback/e2e-us-049-050.md`：S11、S15、S15-err、S14-gate、states 的编号步骤与期望观察（P4 执行）。
6. 上述红检查存在前，不写 controller/service/前端代码；红→绿由 `/sdd:atdd-apply` 执行。

## 3. Gate 期望（本地 vs CI）

- 本地：`cd backend && mvn test`（真实 SQLite + Flyway）；`cd frontend && npm run build`（tsc 必过）。P4 出 `local-verify` 报告，逐场景给命令与输出。
- CI：现有两 job 不变（backend `mvn -B test` / frontend build），`main` push 触发；本次变更在 `main` 直开发，故 push 即 E1 证据来源。
- G2 需 fresh CI run（`gh run list` 读取），不得沿用旧 run；浏览器 E2E 不进 CI。

## 4. 数据 / fixtures 策略

- 权威：`acceptance-test-fixtures.md` §US-049-050。用户 1–5、fixture trip、V4 种子主线 v1 两 stop 均来自既有迁移；**不新增迁移**。
- 每个测试类独立内存 SQLite（`jdbc:sqlite:file:split-confirm-test?mode=memory&cache=shared`，`AbstractSplitApiTest` 先例），Flyway V1–V5 迁移；`@BeforeEach` 重置草稿与 split 节点。
- 可确认草稿：`POST split-draft`（Ben）→ `PUT boundaries` → `POST routes:generate`，得 v2、A=105 / B=110。
- **test-only 变更**（仅测试内 JDBC，非产品路径）：
  - 超窗：把文档 `routes.A.travelLegsMinutes[1]` 改为 40（A=125）；
  - 缺输入：把 `routes.A.activityMinutes` 置 null（可空模型落地后可直接写入 JSON）；
  - 不完整：把 `document.routes` 置 null（或删 `routes.B`）；
  - 半边界：清空 `reunionStopId`。
- 断言口径：`plan_node` 主线快照取 (`id`,`branch_id`,`title`,`start_at`,`end_at`,`sort_order`,`plan_version`) 全列逐行比较；split 行数 = 0。
- 时间戳/草稿 id 一律从响应读取，不硬编码。

## 5. 反向 / non-goals 覆盖（每条 ≥1 反向 case）

| Non-goal | 反向 case | 层 |
|---|---|---|
| 不新增表/迁移 | 断言 schema 无变化（`V1–V5` 计数、`split_draft` 列集不变） | API（JdbcTemplate） |
| 不改主线 | CN1 主线逐行快照 | API |
| 不允许 confirmed 再编辑/再确认/取消 | CF6-N、CN2-N、CF1 后续写端点 409 | API |
| 不做历史保留 | 重建后 `split_draft` 行数仍 1（无历史行） | API |
| 不做真实鉴权 | 无签名校验；`X-User-Id` 信任模型不被描述为安全控制（仅注释/文档约束） | Static |
| 不改 greeting/trips/invitations/mainplan | 仅跑既有测试类全绿（`mvn test` 全量） | CI |

## 6. 自检

- 每 requirement ≥1 API case：confirm（CF1–CF7-N）、cancel（CN1–CN6-N）、start（S7′/S8/S9-N/S11）、detail（D1b/D2）→ Pass。
- 每设计决策（design.md D1–D16）至少在 tasks.md 有落地任务或显式 defer → 见 tasks「决策映射」。
- `error.details` 两种形状均有正/负断言（CF2-N/CF3-N/CF7-N）→ Pass。
