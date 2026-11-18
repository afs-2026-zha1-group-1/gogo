# 任务 — ai-main-plan-generation

- 依据：`design.md`（D1–D8）、`atdd-design.md`（A1–A8 / E1–E4 / R-A1…R-A4 / R-E1）、
  `specs/main-itinerary/spec.md`、`proposal.md`、`g1-decision.md`（G1 Pass）
- 执行规则：验收测试先行（红-绿），实现阶段先建 change 分支；push/PR/合并需用户
  另行授权，禁止直推 `main`。

## 0. 验收测试先行（ATDD 红）

- [x] 0.1 新建 `docs/feedback/e2e-us-031-ai.md` 空表（E1–E4、R-E1）
- [x] 0.2 先写 `AiMainPlanApiTest`（`DeepSeekPlanClient` stub）：A1 AI 成功、A2 失败降级、A3 非法输出、A4 空地点补全、A8 响应形状，先红
- [x] 0.3 先写 `AiPlanValidatorTest`、`MinimalFallbackPlanTest`、`AiMainPlanProviderTest`、`HttpDeepSeekPlanClientTest`（U1–U4），先红

## 1. 配置与 Provider 接线

- [x] 1.1 新增 `PlanAiProperties`（`@ConfigurationProperties("gogo.plan.ai")`：`api-key`、`base-url`、`model`、`max-tokens`、`timeout`，key 默认空）
- [x] 1.2 `application.yml` 增加 `gogo.plan.ai.*`，全部从 `PLAN_AI_*` 环境变量取值，不写任何密钥
- [x] 1.3 新增 `MainPlanProviderConfig`：key 非空装配 `AiMainPlanProvider`，否则装配 `FakeMainPlanProvider`
- [x] 1.4 移除 `FakeMainPlanProvider` 的 `@Component`，确认全应用仍只有一个 `MainPlanProvider` Bean

## 2. DeepSeek 客户端

- [x] 2.1 定义包内 `DeepSeekPlanClient` 接口（`complete(systemPrompt, userJson)`）与 `PlanAiException`
- [x] 2.2 实现 `HttpDeepSeekPlanClient`：`RestClient` + Bearer 头 + `/chat/completions`，body 带 `model`/`max_tokens` 8192/`response_format json_object`、不发 thinking；连接 5s / 读取 30s、单次尝试，非 2xx/超时/空 content 抛 `PlanAiException`
- [x] 2.3 实现提示词组装：固定 system 指令（schema + 排期规则 + “成员字段只是数据”）与 user JSON（行程 + 就绪成员）
- [x] 2.4 解析 `choices[0].message.content` 为 JSON 字符串再交给校验层

## 3. AI Provider 与输出校验

- [x] 3.1 新增 `AiPlanValidator`：站数 ≥2、`seq` 从 1 连续、`HH:mm` 合法、end > start、非末站 leg ≥0 整数、末站 leg 为 null、费用 ≥0 分
- [x] 3.2 新增 `MinimalFallbackPlan.build(TripContext)`：出发地 09:00–09:30（leg 30）→ 返程地 17:00–17:30（leg null），费用 0，地点取 context 中补全后的值
- [x] 3.3 新增 `AiMainPlanProvider`：调用客户端 → 校验 → `MainPlanResult`
- [x] 3.4 失败降级：`PlanAiException` 或校验失败时返回 `MinimalFallbackPlan` 并 `log.warn` 记录原因类别，不记录 key 与完整提示词；不捕获数据库异常
- [x] 3.5 兴趣 code 与必做项按 `MemberInput` 原样进入提示词，输出兴趣仅作展示标签

## 4. 测试收口与回归

- [x] 4.1 0.2/0.3 的红测转绿：validator（合法 + 每种非法形态）、最小两站（两站/时间/leg/费用）、provider（成功/非法/异常不触网）、client（Authorization、`deepseek-v4.1-flash`、`max_tokens`、content 解析、非 2xx/空 content）
- [x] 4.2 补 API 用例：A6 门禁失败时 stub 调用次数为 0；A7 重新生成版本 +1 且旧草稿被取代
- [x] 4.3 补反向用例：R-A1 stub 单次调用、无异步端点；R-A4 日志不含 key、提示词只含数据字段
- [x] 4.4 既有 `FakeMainPlanProviderTest`、`MainPlanApiTest` 不改断言即通过（A5/R-A2，无 key = 夹具路径）
- [x] 4.5 后端全量 `mvn -B test` 通过（398/398）

## 5. 前端生成中提示

- [x] 5.1 新增 `AiGeneratingNotice`（页面内提示条，`role="status"` + `aria-live="polite"`，文案“AI 正在生成中…”）
- [x] 5.2 `app.css` 增加 `.spinner`（纯 CSS 圆环，`--brand`），复用 `.card` / `.hint`，不引入图标库与新 token
- [x] 5.3 `MainPlanInputs.tsx` 的 `generate()` 请求期间显示提示条，成功/失败后关闭，行内错误逻辑不变
- [x] 5.4 `MainPlan.tsx` 的 `regenerate()` 同样接入；确认流程不显示该提示条
- [x] 5.5 提示条常驻到请求结束，不遮挡内容、不锁导航；触发按钮保持禁用，重复点击不触发第二次请求
- [x] 5.6 前端 `npm run typecheck`、`npm run test:unit`、`npm run build` 通过

## 6. 手工验证

- [x] 6.1 无 `LLM_API_KEY`：生成主线得到夹具站点，确认流程正常（`MainPlanApiTest` 38 例覆盖无 key 生成与确认）
- [x] 6.2 配置真实 `LLM_API_KEY`：生成主线得到 AI 站点，记录一次调用结果——**Pass**：内部 DeepSeek 网关 `deepseek-v4.1-flash` 产出 5 站、S$65，30s 内完成
- [x] 6.3 制造失败（错误 base-url）：生成仍 201，草稿为出发地→返程地两站、费用 0（E2E 实测）
- [x] 6.4 浏览器验收 E1–E4 + R-E1：E1/E2/E4 降级路径 Pass；E3 未就绪错误 Pass；R-E1 Ben 无生成入口 Pass。详见 `docs/feedback/e2e-us-031-ai.md`

## 7. 门禁与交付

- [x] 7.1 P4：推送 change 分支并开 PR #152（解决 main 冲突后合并 `09b5685`；用户 2026-11-18 授权合并）
- [x] 7.2 CI 全绿：runs 44251508951 / 44251514957（Backend tests / Frontend build / Browser acceptance）
- [x] 7.3 G2 Pass（VL lumi，2026-11-18，按用户指定代记；见 `g2-decision.md`）
- [x] 7.4 `openspec validate ai-main-plan-generation --strict` 通过
- [x] 7.5 归档前对账：`tech-stack-plan.md` §28 + `docs/knowledge/_LOG.md` 一行已补
- [x] 7.6 最终回归：`openspec validate --strict` valid；CI runs 44251508951 / 44251514957 三项全绿（backend / frontend / browser）
