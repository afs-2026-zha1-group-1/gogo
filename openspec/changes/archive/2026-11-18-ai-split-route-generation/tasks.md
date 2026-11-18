# Tasks: ai-split-route-generation

- 依据：`design.md`（D1–D6）、`specs/splits/spec.md`、`proposal.md`
- 执行规则：验收测试先行（红-绿），实现阶段先建 change 分支；push/PR/合并需用户另行授权，
  禁止直推 `main`（见 `config.yaml` rules）。

## Implementation

### 0. 验收测试先行（红）

- [x] 0.1 先写 `AiBranchValidatorTest`：合法 B 组 JSON、超窗拒绝、站数越界、空/负停留、
      legs 数量 ≠ steps+1、负路段、非 JSON —— 先红
- [x] 0.2 先写 `AiBranchCandidateProviderTest`（`DeepSeekPlanClient` stub）：AI 成功返回合法
      B 候选（locationName = 目的地）、AI 超时/HTTP/空响应/非法输出降级为夹具 B、A 组始终委托夹具
- [x] 0.3 先写 `BranchCandidateProviderConfigTest`：key 空 → 夹具 Bean；key 非空 → AI Bean
      （stub client 注入），先红

### 1. 可见性与配置接线

- [x] 1.1 将 `DeepSeekPlanClient`、`HttpDeepSeekPlanClient`、`PlanAiException` 改为 public
      （含 `HttpDeepSeekPlanClient.create`）；无逻辑变化
- [x] 1.2 新增 `BranchCandidateProviderConfig`（`@EnableConfigurationProperties(PlanAiProperties.class)`）：
      key 非空装配 `AiBranchCandidateProvider`，否则装配 `FixtureBranchCandidateProvider`
- [x] 1.3 移除 `FixtureBranchCandidateProvider` 的 `@Component`，确认全应用仍只有一个
      `BranchCandidateProvider` Bean

### 2. B 组 AI 提供者

- [x] 2.1 新增 `AiBranchValidator`：steps 数组 1..N、name 非空、minutes 非负整数、
      legs = steps.length + 1 且非负整数、`Σminutes + Σlegs ≤ windowMinutes`；非法抛
      `PlanAiException(INVALID_OUTPUT)`
- [x] 2.2 新增 `AiBranchCandidateProvider`：A 组委托夹具；B 组组装数据 JSON →
      `DeepSeekPlanClient.complete` → `AiBranchValidator` → `RouteCandidate`
      （activityName 用 `RoutePairEdit.deriveActivityName`、locationName = 目的地）
- [x] 2.3 B 组失败降级：捕获 `PlanAiException` → 夹具候选 + `log.warn`（原因类别，
      不记 key/完整提示词）；不捕获数据库异常
- [x] 2.4 提示词 system 指令固定 schema/规则，user 消息仅含数据；mainPlanSegment 只含站名
      透团结语义

### 3. 测试收口与回归

- [x] 3.1 0.1–0.3 红测转绿；补 API 用例（`SplitRouteGenerationApiTest` 扩展或新类）：
      AI1 成功带 steps 的 B 组、AI2-N 超窗降级夹具、AI3-N 异常降级
- [x] 3.2 确认 G4-N/G5-N/G6-N 门禁失败时不对 AI 发起调用（stub 调用次数 = 0）
- [x] 3.3 既有 `FixtureBranchCandidateProviderTest`、`SplitRouteGenerationApiTest`、编辑/校验/
      确认测试不改断言即通过（无 key = 夹具路径）
- [x] 3.4 后端全量 `mvn -B test` 通过，并核对总数

### 4. 前端生成中提示

- [x] 4.1 `screen-routes.tsx` 在 `generate.isPending` 期间渲染既有 `AiGeneratingNotice`
      （置于路线卡上方）；结束（成功/失败）后自动关闭
- [x] 4.2 生成按钮保持禁用，重复点击不产生并发生成；不用新状态管理
- [x] 4.3 前端 `npm run typecheck`、`npm run build` 通过

## Verification

- [x] 5.1 无 `LLM_API_KEY`：生成路线得到夹具 B 组，编辑/校验/确认正常（既有 splits 测试覆盖）
- [ ] 5.2 配置真实 `LLM_API_KEY`：生成 B 组得到 AI 站点列表且总耗时 ≤ 窗口，记录一次结果
- [x] 5.3 制造失败（错误 base-url）：生成仍 200，B 组为夹具并记录 `log.warn`（不泄露 key/提示词）
- [ ] 5.4 浏览器验收：AI4 生成中提示条可见、结束后关闭，错误由 `ErrorState` 展示；
      S1/Screen 13 展示契约无回归
- [x] P4 任务：推送 change 分支并开 PR（不直推 main）；PR #161 合并 `b48c176`；
      后端相关套件与前端 typecheck/单测/构建全绿（Browser acceptance 的 2 例失败为
      main 既有、与本次无关）
- [x] P5 归档前对账：`tech-stack-plan.md` §30 + `docs/knowledge/_LOG.md` 一行已补