# 任务 — us-089-split-window-demo

- 依据：`design.md`（DD1–DD10）、`specs/splits/spec.md`、`specs/trips/spec.md`、`proposal.md`
- 执行规则：分支 `US-089-split-window-demo`（自 `group1/main` `0bf699c`）；push/PR/合并需用户另行授权。

## 1. 分支与口径

- [x] 1.1 从 `group1/main` 建分支 `US-089-split-window-demo`，重接本会话演示改动
- [x] 1.2 复用 US-040 的 `MainPlanProjection`，删除重复的投影实现
- [x] 1.3 固化窗口口径：会合开始 − 出发开始（DD1）

## 2. 后端窗口与边界

- [x] 2.1 `SplitDraftService` 四处窗口改用 `departure.startAt()`
- [x] 2.2 `withBoundaries` 清空 routes；保存边界单事务删除 split-a/b 节点（DD2）
- [x] 2.3 `BoundaryResponse` / 详情 `departureAt` 语义同步
- [x] 2.4 测试：`SplitBoundaryApiTest`（窗口 150）、`SplitDraftDetailApiTest`、`SplitConfirmApiTest`（215/65）

## 3. A 组沿主线

- [x] 3.1 新增 `RouteStep`；扩展 `RouteCandidate`、`RouteDurations`、`GroupRoute`（nullable steps）
- [x] 3.2 `FixtureBranchCandidateProvider` 按边界派生 A 组 steps/activities/legs/buffer
- [x] 3.3 `generateRoutes` 传入 main-plan stops；响应与文档携带 steps
- [x] 3.4 单测：`FixtureBranchCandidateProviderTest`（steps/合计=窗口）；API 测试 A=沿主线方案
- [x] 3.5 详情返回 `destination` + `steps`（DD4）

## 4. 前端

- [x] 4.1 边界页：开始时间、非法组合置灰、取消选择、保存并下一步、未保存提示（DD5）
- [x] 4.2 路线卡：steps 展开、合计/窗口、超窗提示；路线页时间窗说明（DD6）
- [x] 4.3 队伍路线图：steps 逐节点渲染（DD6）
- [x] 4.4 行程详情：A 组用主线站点填充分头→会合段，移除合成块（DD7）
- [x] 4.5 时区与币种：`trip-zone.ts` / `formatClock` / 主计划费用（DD8）
- [x] 4.6 测试：`personal-route.test.ts` P12；前端单测 45/45

## 5. 演示数据

- [x] 5.1 主线夹具香港 6 站 / 伦敦 7 站；B 组活动按目的地（DD3/DD4）
- [x] 5.2 `LocationCompletion` 目的地候选点
- [x] 5.3 `scripts/demo-seed.py` 自适应 schema、可建两条演示行程、幂等（DD9）
- [x] 5.4 本地库重建并验证港/伦两城全链路

## 6. 验证

- [x] 6.1 后端 `mvn -o test`：371/371
- [x] 6.2 前端 `typecheck` + `test:unit`（45/45）+ `build`
- [x] 6.3 API 全链路：确认主线 → 分组 → 边界 09:00→15:15（375）→ A 375 / B 90 → 改边界清旧路线 → 重生成 → 确认
- [x] 6.4 浏览器：A 组行程详情逐站显示、B 组显示小组活动（截图留档）
- [x] 6.5 `openspec validate us-089-split-window-demo --strict`

## 7. 门禁与归档

- [x] 7.1 G1：IO Johnson + SA Johnson Pass（用户 2026-11-17 指令代记）
- [x] 7.2 G2：VL Leo Pass（用户告知已确认）
- [x] 7.3 P4 收尾：push 分支并开 PR #138（用户 2026-11-17 授权）
- [x] 7.4 G3 合并与 CI 双绿确认：run 44112482366 / 44112533101 全绿，merge `3fcfbfc`
- [x] 7.5 P5：`sdd:living-merge`（splits 4 MODIFIED + trips 1 MODIFIED）并从 `openspec/changes/` 归档
- [x] 7.6 知识库对账：`docs/knowledge/architecture/tech-stack-plan.md` + `docs/knowledge/_LOG.md`
