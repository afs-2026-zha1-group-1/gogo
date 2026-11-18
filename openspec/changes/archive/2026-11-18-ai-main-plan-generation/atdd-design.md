# ATDD 设计 — ai-main-plan-generation

- 依据：`specs/main-itinerary/spec.md`（1 MODIFIED / 9 场景）、`proposal.md`、
  `g1-decision.md`（G1 Pass）、`design.md`（D1–D8）
- 范围：后端 provider 路径 + 两个前端页面的等待提示；无新端点、无迁移
- 测试栈：后端 JUnit 5 + MockMvc + `MockRestServiceServer`；前端 `node:test` +
  `typecheck` + 手工/脚本浏览器验收（沿用既有 CI，不新增 job）

## 1. ATDD 分层

| 层 | 覆盖 | 说明 |
|---|---|---|
| API | A1–A8、R-A1…R-A4 | 生成端点端到端（真实 SQLite + Spring 上下文），外部DeepSeek调用用测试 stub 替换；覆盖成功、失败降级、地点补全、校验拒绝与无 key 回归 |
| E2E | E1–E4、R-E1 | 浏览器验证“AI 正在生成中…”提示的可见、非阻塞、按钮禁用、结束关闭；确认流程不出现提示 |
| UT（apply 时） | U1–U4 | `AiPlanValidator`、`MinimalFallbackPlan`、`AiMainPlanProvider` 降级分支、`HttpDeepSeekPlanClient` 解析；apply 时红-绿实现。Bean 选择（key 空/非空）由 API 测试上下文覆盖 |

推荐附加层（仅提示、非门禁）：**LLM eval**（输出可用性）与 **Security**
（提示词注入）在 MVP 不做独立套件，由 API 校验与确认校验兜底；NFR 经用户
2026-11-18 确认**不纳入**。

## 2. API 验收场景

| id | 场景 | 预期 | 层 |
|---|---|---|---|
| A1 | 已配置 key，stub 返回合法行程 | 201；草稿站点/车程/费用来自 stub；`inputRevisions` 按生成时修订号 | API |
| A2 | stub 抛 `PlanAiException`（超时/非 2xx） | 201；恰好两站：出发地 09:00–09:30（leg 30）→ 返程地 17:00–17:30（leg null）；费用 0 | API |
| A3 | stub 返回非法 JSON / 断号 / 坏时间 / 负费用 | 同 A2；不落任何半成品；错误码/状态不变 | API |
| A4 | 行程地点为空 + stub 失败 | 生成先补全；两站名称等于生成后 `GET /api/trips/{id}` 的出发地/返程地 | API |
| A5 | 未配置 key（既有 `MainPlanApiTest`） | 201；仍为新加坡 4 站/5000 分；G1 断言不变 | API |
| A6 | 成员未就绪 / 已确认 / 非组织者 / 非成员 | AI 调用前返回既有 409/409/403/403；stub 调用次数为 0 | API |
| A7 | 重新生成（AI 成功） | 201；版本 +1；旧草稿被取代 | API |
| A8 | 响应形状 | 无新增字段（无 `source`/`degraded`）；错误体仍为 `{code,message}` | API |

### 反向验证（Non-goals）

| id | 非目标 | 反向断言 |
|---|---|---|
| R-A1 | 不做异步/重试 | 单次 `POST` 同步返回；stub 调用次数 = 1；无新增异步端点 |
| R-A2 | 不改无 key 夹具 | `FakeMainPlanProviderTest` + `MainPlanApiTest` 原断言通过 |
| R-A3 | 不改确认校验 | 既有 422/409 确认测试不改断言 |
| R-A4 | 不泄露密钥/提示词 | 日志断言不含 key；stub 收到的 system/user 消息只含 JSON 数据字段 |

## 3. E2E 验收场景

| id | 场景 | 预期 | 层 |
|---|---|---|---|
| E1 | 输入页点「一键生成」 | 请求期间提示条“AI 正在生成中…”可见；按钮 disabled；页面可滚动、可点返回；结束后提示消失并进入方案页 | E2E |
| E2 | 方案页点「重新生成」 | 同上；成功后方案内容刷新（草稿版本变化） | E2E |
| E3 | 失败（如成员未就绪） | 提示消失；既有行内错误出现；无新错误面 | E2E |
| E4 | 确认主线方案 | 不显示“AI 正在生成中…”；沿用“正在校验…” | E2E |
| R-E1 | 非组织者/非成员 | 不显示生成入口或提示；既有权限态不变 | E2E |

> 无 key 时生成很快，提示可能一闪而过。E2E 执行可用真实 key、限速网络或
> 测试环境延迟 stub；不为此在生产代码加人为延迟。

## 4. 生产代码之前先写什么

1. 新建 `docs/feedback/e2e-us-031-ai.md` 空表（E1–E4、R-E1），P4 逐行填结果。
2. 先写 API 验收（红）：`AiMainPlanApiTest`——用 `@TestConfiguration`/`@MockitoBean`
   提供 `DeepSeekPlanClient` stub，覆盖 A1–A4、A8；保留 `MainPlanApiTest` 作为 A5。
3. 先写 UT（红）：`AiPlanValidatorTest`、`MinimalFallbackPlanTest`、
   `AiMainPlanProviderTest`、`HttpDeepSeekPlanClientTest`。
4. 再实现客户端、校验、降级与 provider 装配，直到上述测试转绿。
5. 最后接入前端提示并做 E1–E4。

## 5. Local vs CI gate

| 层 | Local | CI |
|---|---|---|
| 后端 | `cd backend && mvn -B test`（含新增 API/UT） | 既有 `Backend tests` job |
| 前端 | `cd frontend && npm run typecheck && npm run test:unit && npm run build` | 既有 `Frontend build` |
| 浏览器 | 手工/脚本按 `e2e-us-031-ai.md` 执行 | 既有 Browser acceptance（如触发） |
| 规范 | `openspec validate ai-main-plan-generation --strict` | — |

不新增 CI job、不引入 Playwright/POM/Excel 生成器。

## 6. Fixtures 策略

复用 `Singapore Friends Day`（4 成员、就绪修订 1）与既有种子账号；不新增迁移。

| 状态 | 构造方式 | 清理 |
|---|---|---|
| 无 key / 夹具路径 | 测试不设 `gogo.plan.ai.api-key` | 既有 `MainPlanApiTest` 清理草稿与投影 |
| AI 成功 | 测试上下文注入返回固定合法 JSON 的 `DeepSeekPlanClient` stub | 同上 |
| AI 失败 | stub 抛 `PlanAiException` | 同上 |
| AI 非法输出 | stub 返回断号/坏时间/负费用 JSON | 同上 |
| 空地点 | 测试内 `UPDATE trip SET start_location=NULL,end_location=NULL` | 事务/`@BeforeEach` 复位 |
| E2E 延时 | 真实 key 或测试环境延迟 stub（不改进生产代码） | 恢复原配置 |

AI 成功 stub 的站点/费用写入测试常量，避免依赖真实模型输出。

## 7. 非目标

- 不在本 skill 写业务实现或完整 UT 套件；UT 由 apply 的红-绿 TDD 产出。
- 不设计 Playwright/POM/Excel 生成器，不新增 CI 产品。
- 不验证模型行程的“质量评分”；只验证结构与可确认性。
- 不做真实额度/限流压测（OQ-8 deferred，P4 手工记录一次真实调用）。

## 8. NFR 测试

经用户 2026-11-18 确认：**不纳入**。无 SLA/性能指标；超时与降级用 API 层行为
验证（A2/A3），日志脱敏用 R-A4 静态/单元断言。若后续需要可观测性指标，另立变更。
