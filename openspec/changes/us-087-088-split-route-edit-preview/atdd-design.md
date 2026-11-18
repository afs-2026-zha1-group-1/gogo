# ATDD design — us-087-088-split-route-edit-preview

Change: `openspec/changes/us-087-088-split-route-edit-preview/` · Gate: G1 Pass + Revision Pass
（2026-11-18）· Author: `/sdd:atdd-design` (P3) · Timestamp: 2026-11-18

Inputs：`proposal.md`；`specs/splits/spec.md`（1 ADDED + 4 MODIFIED / 46 场景，
`openspec validate --strict` valid）；`dov-ac-review.md`（AC 4/4 + DoV 5/5，含 US-089
Revision）；`g1-decision.md`；`requirements/US-087-088.md`；`deep-dive.md` §US-087-088。

## 1. ATDD layers in scope

**Layers exercised**：**API**（后端集成测试，real SQLite）+ **E2E**（Playwright
browser acceptance，`frontend/tests/e2e/`）。**UT 延后**到 `/sdd:atdd-apply`。

### Scenario → layer inference

| 范围 | 场景 | Layer | 理由 |
|---|---|---|---|
| 保存写入 | S2 任意成员整对保存；S2b A 站点派生合计 | **API** | 单端点 + 持久化断言 |
| 保存写入 | S3 过期版本；S4 无路线；S5 非法输入；S6 终态；S8 权限 | **API** | 状态码 + 无部分写入 + 权限矩阵 |
| 编辑 UI | S1 编辑态/终态只读；Screen 13 A 逐站/B 活动 + 合计/窗口 | **E2E** | 控件可编辑性、只读态、布局与文案 |
| 下一步 | N1 先保存后校验通过；N2 无改动跳过保存 | **E2E**（API 断言版本）+ API 回归 | 跨两请求的编排；版本变化由 API 断言 |
| 下一步 | N3 不可行弹窗；N3a A 超窗；N4 请求失败不跳转；N5 校验失败不跳转 | **E2E** | 弹窗内容、停留/不跳转、输入保留 |
| 下一步 | N10 清空分钟 | **E2E** | 表单校验与错误提示定位 |
| 预览/流转 | N6 预览展示；N7 进复核；N8 旧地址重定向；N9 终态只读 | **E2E** | 路由与页面状态 |
| 详情读 | D1 详情含 `locationName`/`steps`；S7 旧地点回填去重 | **API + E2E** | DTO 断言 + 展示去重 |
| 校验 API | T1/T2-N/T3-N/T4-N/T5-N/T6-N；N3a 的 `feasible=false` 数值 | **API 回归 + API 新增** | 既有快照计算不变；A 超窗值新增断言 |
| 确认 | CF1/CF2–CF8 回归；CF9 编辑后确认复算 | **API**；Screen 15 返回目标为 **E2E** | 判定与错误码服务端；返回按钮是 UI |
| 生成/分组回归 | G1/G7/G2-N–G6-N；分组分配既有用例 | **API 回归** | 证明本变更未改生成/分组语义 |
| 非目标反证 | 见 §5 | **API + E2E** | 断言「不做」而非只断言「做」 |

**Deferred to `/sdd:atdd-apply`（unit-level TDD）**：
- 后端 `deriveRouteDurations(steps, legs, buffer)`：A 合计派生与路段数校验；
- 后端保存请求校验器（pair/labels/minutes/legs/steps 长度）；
- 前端 `RouteDraftForm` 脏值比较与字段级错误映射（纯函数部分）；
- `graph-model` 对 A `steps` 节点的映射（扩展 `team-route.test.ts`）。

**Recommended extras（advisory，非 Gate）**：无。并发一致性（`STALE_DRAFT_VERSION`）
已由 S3 API 用例覆盖；不新增性能/可观测性层（用户 2026-11-18 明确不做 NFR）。

## 2. What is written before production code（red-first）

| 先写 | 文件 | 初始状态 | 覆盖 |
|---|---|---|---|
| 后端 API 验收 | `backend/src/test/java/com/gogo/hello/splits/controller/SplitRouteEditApiTest.java` | 红（端点不存在 404） | S2/S2b/S3/S4/S5/S6/S8 |
| 后端 API 扩展 | 既有 `SplitConfirmApiTest` 增 CF9；`SplitDraftDetailApiTest` 增 `locationName`/`steps` 断言；新增 `check-timing` A 超窗（N3a 数值） | 红/改断言 | CF9 / D1 / S7 / N3a |
| 后端回归 | 既有 `SplitRouteGenerationApiTest`（G1/G7/G6-N…）、`SplitAssignmentApiTest` | 保持绿 | 证明生成/分组未被破坏 |
| E2E 验收 | `frontend/tests/e2e/split-route-edit.spec.ts` | 红（页面无编辑控件/无预览路由） | S1 / Screen 13 / N1–N10 / Screen 13b / Screen 14 / Screen 15 |
| E2E 夹具 | `frontend/tests/fixtures/split-route-edit.sql` + `playwright.config.ts` 增加第二个 data location | 红 | 预置 active 草稿 + A steps + B 活动 |
| 手工台账（可选） | `docs/feedback/e2e-us-087-088.md` | 待填 | 弹窗文案与视觉截图（CI 断言之外的补充证据） |

不写：production 功能代码、完整 UT 套件、Playwright generator、Excel 用例生成器。

## 3. Local vs CI gate expectations

| Gate | 命令 | 何时 | Pass 条件 |
|---|---|---|---|
| Backend API + 回归 | `mvn -B test`（Windows 用 IDEA 内置 `mvn.cmd` 全路径） | 每次提交 / PR | 新增 `SplitRouteEditApiTest` 与既有 splits 用例全绿 |
| Frontend 静态与单测 | `npm run typecheck`、`npm run test:unit`（含 `team-route.test.ts` 扩展）、`npm run build` | 每次提交 / PR | 0 type error；纯函数用例绿；build 绿 |
| E2E | `npm run test:e2e -- tests/e2e/split-route-edit.spec.ts` | 提交前 / PR | S1/N1–N10/预览/确认返回目标全 Pass |
| CI | 既有 `.github/workflows/ci.yml`（Backend tests / Frontend build / Browser acceptance） | PR | 三个 job 绿；不新增 CI 产品 |

本地 E2E 使用 `GOGO_E2E_DB_PATH` 隔离库（`run-e2e.mjs` 已提供）；CI Browser
acceptance 用同一脚本。截图只作辅助，不作为 Pass 依据。

## 4. Data / fixtures strategy

### 4.1 API 夹具（后端测试基类）

沿用 `AbstractSplitApiTest` 的 trip 99xx 成员集（Alice 1 / Ben 2 / Chloe 3 / Daniel 4）：

| Fixture | 内容 | 用途 |
|---|---|---|
| F1 基准草稿 v3 | 主线 City Hall(09:00–09:30) → National Gallery(10:00–10:30) → Gardens(11:00–11:15) → 会合 Merlion 11:30（窗口 150）；A steps 30/30/15，legs 30/30/15，buffer 0，合计 150；B 活动 60，legs 20/20，buffer 10，合计 110；`plan_node` split-a/b 已写入 | S2/S2b/D1/S7/CF1 基线 |
| F2 编辑后 | A 第二站 30→20（合计 140）；B 地点改为「Gardens by the Bay · 滨海湾」 | S2/S2b 持久化断言 |
| F3 A 超窗 | A 第三站 15→40（合计 175，窗口 150，超 25） | N3a 的 check-timing 数值 |
| F4 过期/缺失/终态 | v2 请求；`routes=null`；`status=confirmed/cancelled` | S3/S4/S6 |
| F5 非法载荷 | 非两条 / 重复组别 / 负分钟 / A legs≠steps / B legs 变化 | S5 |
| F6 权限 | Eve 非成员；未认证 | S8/D3–D5 |

### 4.2 E2E 夹具（Playwright）

新增 `frontend/tests/fixtures/split-route-edit.sql`，并在 `playwright.config.ts` 的
`SPRING_SQL_INIT_DATA_LOCATIONS` 中与 `dashboard.sql` 并列（逗号分隔）：

- trip `9101`「路线编辑演示」，destination `Singapore`，organizer 1，成员 1–4；
- 已确认主线 v1（同上 4 站）+ `split_draft` v3 `active`，`document.routes` 含 A
  `steps` 与 B 分解；`plan_node` split-a/b 的 `title`/`location_name`；
- 登录 `ben@example.com`（A 组）与 `alice@example.com`（组织者）覆盖「任意成员编辑」
  与「组织者确认」两条路径。

### 4.3 清理

API 测试使用独立 SQLite 临时库（`@TempDir`/test profile），每个用例事务回滚或重建；
E2E 由 `run-e2e.mjs` 每次创建并删除临时库，夹具只读 seed、测试自身写入不影响其他 trip。

## 5. Non-goals（含反向验证）

| Non-goal | 反向验证 |
|---|---|
| 不做费用与必做标识编辑 | E2E 断言路线卡无费用/必做字段；API `GroupRoute` JSON 无 fee 字段 |
| A 组站名不可改（仅分钟） | E2E 断言站名为文本而非输入框；API 不接收站名修改（提交被忽略/4xx） |
| 不改生成与分组语义 | `SplitRouteGenerationApiTest` / `SplitAssignmentApiTest` 全绿；`git diff` 不改 `generateRoutes`/`assign` 行为 |
| 不新增迁移或依赖 | `backend/src/main/resources/db/migration` 无新增 `V*.sql`；`package.json`/`pom.xml` 无新依赖 |
| 不新增 CI 产品 | `.github/workflows/ci.yml` 不改 |
| 不实现 Playwright/POM/Excel 生成器 | 无新增生成器脚本；E2E 仅一个手写 spec |
| 不发送通知 | 无邮件/推送/队列调用；无新事件 |

## 6. NFR tests

**Asked**：2026-11-18 用户明确「不做，保持既有覆盖」。

**Decision**：**Out of scope**。版本并发（S3）/双写无部分写入（S2/S3）由 API 用例
覆盖；无 SLA、无性能阈值、无新增可观测性要求。

## Next

`/sdd:task-plan` — 产出 `design.md`（DD1–DDn）与 `tasks.md`（红先切片映射到
S1–S8 / N1–N10 / Screen 13/13b/14/15），并补 `acceptance-test-fixtures.md`
§US-087-088。
