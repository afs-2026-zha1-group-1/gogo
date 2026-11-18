# 任务 — us-096-second-split

- 依据：`proposal.md`、`design.md`（DD0–DD18）、`specs/splits/spec.md`（3 ADDED + 7 MODIFIED）
- 分支：`US-096-ui-preview`（从 `group1/main` `bc13608` 切出；US-095 仍未合入 main）
- 执行规则：红先（先写失败测试再实现）；push/PR/合并需用户授权；不做 3 支队伍、超过 2 轮、某轮不参加、两轮重叠。
- 旧测试说明：分支 id 改名后，`AbstractSplitApiTest` 与 3 个直接断言 `split-a/b` 的测试必须更新；不要承诺“旧测试零改动”。

## 实现状态（2026-11-18）

- 已完成：
  - V18 `split_draft` 每轮一行 + `(trip_id, round_index)` 唯一键；旧 `split-a/b` 迁移为 `split-r1-a/b`。
  - `SplitBranchId`、仓储/服务/控制器轮次化；旧端点固定第 1 轮；新增 `/split-draft/rounds` 系列端点与 6 个错误码。
  - 前端 types/api/hooks 轮次化；`/split/rounds/:roundIndex/{boundaries,routes,preview,confirm}`；旧路径重定向第 1 轮。
  - 总览多轮卡片与多轮 `TeamRouteGraph`（join-fork）；预览页显示所有非取消轮次。
  - 个人路线多轮拼接；仪表盘使用 `aggregateStatus`。
  - 预算按所有非取消轮次聚合：替换站点并集、共享费用、成员按各轮所在组累计；确认第 2 轮会拦截两轮合计硬超支，预算面板展示逐轮活动费用。
  - `BranchCandidateContext` 传入 `excludeActivityNames`；AI 提示词与夹具 B 都避免重复前轮活动。
  - 验证：后端 549 测试全绿；前端 typecheck、80 单测、build 全绿；真实浏览器走通「第 1 轮已确认 → 再次分队 → 边界 → 生成 → 预览 → 确认 → 两轮总览/我的方案」。
- 已知偏差（待补）：
  - US-095 未合入 main，本轮未实现第 1 轮 `FROM_START`；当前只支持 `MIDDLE`（站→站）。
  - `scripts/demo-seed.py` 尚未增加两轮已确认夹具；浏览器验证使用复制库手工走通。
  - PR、G1/G2/G3、归档前置任务未做。

## P0 集成前置

- [ ] 0.1 确认 US-095 已合入 `group1/main`（当前 US-095 无 PR；需先推分支并开 PR）
- [ ] 0.2 从最新 `group1/main` 重新切 `US-096-second-split`，把本 change 文档带入
- [ ] 0.3 确认 `group1/main` 全绿（含 US-095 `FROM_START`、AI 分队路线、US-045 预算/活动、V15–V17 迁移）
- [ ] 0.4 记录基线提交与差异；本 change 不修改 `trip` / `main_plan_*` 归属

## P1 规格与门禁

- [x] 1.1 本 change 目录与 `proposal.md` / `design.md` / `tasks.md` / `specs/splits/spec.md` 建立
- [x] 1.2 `openspec validate us-096-second-split --strict` = valid
- [ ] 1.3 创建 `requirement-workspace/requirements/US-096.md`（六字段、In/Out scope、AC、OQ）
- [ ] 1.4 更新 `requirement-workspace/registry.md`（US-096 状态）
- [ ] 1.5 G1 前跨 change 契约扫描：`scripts/cross-change-scan.sh` + `openspec/templates/cross-change-scan.md`；重点检查 US-095、US-045、US-090、US-049/050
- [ ] 1.6 若存在跨 change 冲突，写 `cross-change-scan.md` 并由 SA/IO 具名签署或 waiver
- [x] 1.7 确认 `SPLIT_BOUNDARIES_REQUIRED` 仍为 409；新增错误码与 HTTP 状态和 delta spec 一致

## P2 存储重构（先保持旧测试绿）

- [ ] 2.1 新增 `SplitBranchId` 工具（`of/parse/forRound/all/legacy`），单测覆盖
- [ ] 2.2 新增 V18 迁移：`split_draft` 表重建、`round_index`、`UNIQUE(trip_id, round_index)`、旧行 round 1、`split-a/b` → `split-r1-a/b`
- [ ] 2.3 迁移保留 `id TEXT PRIMARY KEY` 与 `document` 可空；验证 NULL document 不失败
- [ ] 2.4 新增 `SplitRoundsMigrationTest`：旧行、NULL document、id 不变、分支改名、唯一约束
- [ ] 2.5 `SplitDraftRepository` 所有方法加 `roundIndex`；新增 `findRounds/findLatestRound/findActiveRound`
- [ ] 2.6 旧 service 方法内部固定 `roundIndex = 1`，先让现有 API 测试通过
- [ ] 2.7 更新 `AbstractSplitApiTest` 清理逻辑：`split-r%` + 旧 `split-a/b`
- [ ] 2.8 更新 `SplitRouteEditApiTest`、`SplitRouteGenerationApiTest`、`SplitConfirmedCancelApiTest` 的 `split-a/b` 断言为 `split-r1-*`
- [ ] 2.9 全仓库 grep `split-a|split-b`，确认无遗漏读取方（含 main 的 US-045/US-090）
- [ ] 2.10 回归：现有 splits API 测试全绿（允许断言更新，不允许行为回归）

## P3 第 2 轮发起、边界、分组

- [ ] 3.1 新增 `SplitRoundRules`（纯领域）：上限、上一轮 confirmed、顺序、模式、主线版本；单测先红
- [ ] 3.2 新增 `POST /split-draft/rounds`：创建/重建第 2 轮，分组复制第 1 轮
- [ ] 3.3 新增 `GET /split-draft/rounds` 与 `GET /split-draft/rounds/{n}`：完整轮次详情 + `aggregateStatus` + `canStartNextRound` + `boundaryConstraints`
- [ ] 3.4 `SplitRoundStartApiTest`：R1–R12 / AC2–6；并发、上限、上一轮未确认、版本不一致
- [ ] 3.5 新增轮次边界端点：第 2 轮仅 `MIDDLE`、分头 ≥ 上一轮会合、允许相等、窗口为正
- [ ] 3.6 `SplitRoundBoundaryApiTest`：R2-B1–B5、主线外、非正窗口、非发起人、过期版本
- [ ] 3.7 新增轮次 assignment：第 2 轮预填、独立改组、不影响第 1 轮
- [ ] 3.8 `SplitRoundAssignmentApiTest`：R2-A1–A4、完整性、已确认轮拒绝

## P4 路线与 Provider

- [ ] 4.1 `BranchCandidateProvider` 改为接收 `BranchCandidateContext`（`roundIndex/windowStart/windowEnd/excludeActivityNames`）
- [ ] 4.2 `AiBranchCandidateProvider` 提示词加入轮次与排除列表；校验/降级规则不变
- [ ] 4.3 `FixtureBranchCandidateProvider` 在排除列表中时选择另一个目的地活动
- [ ] 4.4 生成/保存/删除按轮写 `split-r{n}-a/b`；不触碰其他轮
- [ ] 4.5 `SplitRoundRouteApiTest`：R2-G1–G3、生成/编辑/校验、plan_node 隔离
- [ ] 4.6 回归 AI1–AI3、G1/G7/G2-N/G3-N/G4-N/G5-N/G6-N、S2/S2b
- [ ] 4.7 第 1 轮 AI 进度提示与按钮禁用保持

## P5 确认、取消、预算

- [ ] 5.1 确认端点按轮：第 n 轮 active、组织者、完整性、时间窗、第 n−1 轮 confirmed
- [ ] 5.2 确认只冻结本轮，版本不变；其他轮不变
- [ ] 5.3 预算聚合纯领域函数：`R` 非 cancelled、窗口站 id 去重、按轮组归属；先写表格测试
- [ ] 5.4 接入预算检查与确认；第 2 轮确认按两轮聚合拦截硬超支
- [ ] 5.5 取消活跃轮：发起人、清空本轮 routes、删本轮 plan_node、版本不变
- [ ] 5.6 取消已确认轮：组织者、无后续非 cancelled 轮、未出发；条件 SQL + 同一事务
- [ ] 5.7 `SplitRoundConfirmCancelApiTest` / `SplitRoundBudgetApiTest`：R2-CF1–CF4、R2-CN1–CN5、B1–B5
- [ ] 5.8 回归 CF1/CF9/CF2-N/CF7-N/CF8-N/CF4-N/CF5-N/CF6-N、CN1–CN6

## P6 前端底座与轮次路由

- [ ] 6.1 `types.ts`：`SplitRoundSummary`、`SplitRoundDetail`、`SplitRoundsResponse`、`BoundaryConstraints`、`ScheduleItem.roundIndex`
- [ ] 6.2 `api.ts`：轮次端点；旧端点保留第 1 轮
- [ ] 6.3 `hooks.ts`：`useSplitRounds`（5s 轮询）、`useSplitDraft(tripId, round)`、`useRoundIndex`；mutation 失效 `["split", tripId]`
- [ ] 6.4 `router.tsx`：`/split` 总览；`/split/rounds/:roundIndex/{boundaries,routes,preview,confirm}`；旧路径重定向第 1 轮
- [ ] 6.5 四个屏幕参数化：标题/步骤条显示「第 N 次分队」；第 2 轮边界默认 `minDepartureStopId`，更早置灰
- [ ] 6.6 总览页：去掉「仅一次分队」；每轮卡片；`canStartNextRound` 驱动「再次分队」；`nextRoundBlockedReason` 文案
- [ ] 6.7 第 2 轮发起响应 `roundIndex` → 导航到对应边界页
- [ ] 6.8 回归第 1 轮全流程（AC1）

## P7 第 2 轮流程与总览

- [ ] 7.1 总览显示两轮状态、窗口、分组人数、发起人
- [ ] 7.2 「再次分队」→ 创建第 2 轮 → 边界 → 分组（预填提示）→ 路线 → 预览 → 确认
- [ ] 7.3 第 2 轮取消/重建入口按状态与权限显示
- [ ] 7.4 手工走通 AC3–AC14；错误码按 `error.code` 渲染
- [ ] 7.5 430px shell 无横向滚动、无遮挡

## P8 图、个人路线、仪表盘

- [ ] 8.1 `graph-model`：`buildGraphRows(stops, rounds, {focusRound})`；`GraphRow.roundIndex`；`join-fork` 合并
- [ ] 8.2 `team-route-graph`：多轮 fork/join span；`focusRound` 调暗；v1 不折叠
- [ ] 8.3 `node-detail`：轮次徽标；`join-fork` 处理
- [ ] 8.4 `personal-route`：多轮拼接、换组、同站去重、缺时长待确认；`ScheduleItem.key` 含轮次
- [ ] 8.5 `useTripOverview` / `TripDetails`：读取轮次总览；`myGroupLabel` 改为按轮或移除
- [ ] 8.6 仪表盘：`aggregateStatus` 与「已确认 1 轮 · 第 2 轮进行中」文案
- [ ] 8.7 单测：`graph-model` 多轮/join-fork；`personal-route` 多轮/换组/去重；`team-route` 多轮路径

## P9 演示、验证与归档前置

- [ ] 9.1 `scripts/demo-seed.py` 增加「两轮已确认」夹具；保留单轮夹具
- [ ] 9.2 后端 `mvn -B test` 全绿（Windows 用 IDEA 内置 `mvn.cmd` 全路径）
- [ ] 9.3 前端 `npm run typecheck`、`npm run test:unit`、`npm run build` 全绿
- [ ] 9.4 E2E：第 1 轮 → 再次分队 → 第 2 轮 → 个人路线/图/仪表盘；取消/重建
- [ ] 9.5 `openspec validate us-096-second-split --strict` = valid；归档前场景数不丢失
- [ ] 9.6 P4 首个任务：推送 `US-096-second-split` 并开 PR；不直接推 main；不为了跟 main 同步而把 main 合进分支（需要新代码时再处理）
- [ ] 9.7 归档前对账 `docs/knowledge/architecture/tech-stack-plan.md`：新增端点、`round_index`、`split-r{n}`、聚合状态、预算聚合
- [ ] 9.8 追加 `docs/knowledge/_LOG.md` 行
- [ ] 9.9 更新 `requirement-workspace/registry.md` 的 P4/G2/G3 状态
- [ ] 9.10 归档后手动更新 `openspec/specs/splits/spec.md` 的 Purpose 与链级约定（`(trip_id, round_index)`、`split-r{n}-a/b`、轮次状态机）；delta 只覆盖 requirements
- [ ] 9.11 更新 `requirement-workspace/acceptance-test-fixtures.md`：两轮已确认、第 2 轮 active/cancelled、换组夹具

## 10. 自检（Spec ↔ Design ↔ Tasks）

| 维度 | 结果 | 证据 |
|---|---|---|
| Spec → Design | 待评审 | DD1–DD18 覆盖 3 ADDED + 7 MODIFIED；待 `validate --strict` |
| Design → Tasks | 待评审 | P2–P9 逐条映射 DD2–DD16 |
| 非目标反证 | 待评审 | DD17 与 proposal 非目标一致 |
| 风险 | 待评审 | DD18；P0 为硬前提 |
| 迁移 | 待验证 | V18 的 `id TEXT`、`document` 可空、分支改名、唯一约束 |
