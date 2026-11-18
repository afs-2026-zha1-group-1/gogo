# Impact brief — US-031-AI (2026-11-18)

## 1. Requirement set

| id | Path |
|---|---|
| US-031-AI | `requirement-workspace/requirements/US-031-AI.md` |

Supporting: `requirement-workspace/intents/2026-11-18-us-031-ai.md`,
`requirement-workspace/analysis/us-031-ai-dor.md`, `requirement-workspace/deep-dive.md`
§US-031-AI。Change: `openspec/changes/ai-main-plan-generation/`。

## 2. As-is asset inventory

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/architecture/tech-stack-plan.md` §7/§13 | §7 约定 `RestClient` 单 provider + 模板降级；§13 记录 MVP 以 `FakeMainPlanProvider` 交付、真实 provider 延后 |
| Rules | `docs/knowledge/rules/security/{no-hardcoded-secrets,prompt-injection-defense,security-baseline}.md` | 密钥只走 env；用户文本按数据处理；输出在信任边界校验 |
| Living Spec | `openspec/specs/main-itinerary/spec.md` | 生成需求以 `fixture stops` 为默认路径；G2/G5/G6 与确认/读取规则为现状 |
| Existing requirement set | `requirement-workspace/requirements/US-031-037.md` | 主线生成 + 确认的既有条目，未描述 AI provider |
| Active change | `openspec/changes/ai-main-plan-generation/` | P1 proposal/spec/design/tasks 已生成；无代码改动 |
| Provider port | `backend/src/main/java/com/gogo/mainplan/MainPlanProvider.java` | 单方法端口；注释写明 fake 为 MVP 实现、真实 provider 走此接缝 |
| Fake provider | `backend/src/main/java/com/gogo/mainplan/FakeMainPlanProvider.java` | `@Component`；新加坡 4 站 / 香港 6 站 / 伦敦 7 站；忽略 `MemberInput` |
| Generation service | `backend/src/main/java/com/gogo/mainplan/MainPlanService.java` | 生成先门禁 + `LocationCompletion`，再 `provider.plan`（第 111 行），最后版本化落库 |
| Confirmation | `MainPlanService.confirm` + `ScheduleValidator` + `BudgetOverruns` | 单日窗口、顺序/重叠/车程、硬预算；错误码 422/409 固定 |
| Projection | `MainPlanProjection.projectConfirmed` | 确认草稿投影为 `plan_node` 供 splits 读取 |
| Config / deps | `backend/src/main/resources/application.yml`, `backend/pom.xml` | 无 AI 配置；无额外 HTTP 客户端依赖（`RestClient` 随 web starter） |
| Tests | `backend/src/test/java/com/gogo/mainplan/*` | `MainPlanApiTest` 断言 4 个新加坡站点与 5000 分；`FakeMainPlanProviderTest` 断言三城夹具；splits 测试依赖城市夹具 |
| Frontend generation | `frontend/src/pages/MainPlanInputs.tsx`（`generate()`，约第 100 行）、`frontend/src/pages/MainPlan.tsx`（`regenerate()`，约第 104 行） | 已有 `generating` / `busy` 状态与行内 `actionError`；`api.ts` 无超时 |
| Frontend styles | `frontend/src/app.css` | 已有 `.dialog-*`（注册结果）与 `.card` / `.hint` token；无 spinner 类 |

## 3. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `MainPlanProvider` wiring | `FakeMainPlanProvider` 是唯一 `@Component` | 新增 `MainPlanProviderConfig` 单一 Bean：key 非空 → `AiMainPlanProvider`，否则 → `FakeMainPlanProvider`；去掉 Fake 的 `@Component` |
| `com.gogo.mainplan` | 无外部调用、无输出校验 | 新增DeepSeek 客户端（`RestClient`，Bearer，json_object，`deepseek-v4.1-flash`，max_tokens 8192，5s/30s，单次）、提示词组装、`AiPlanValidator`、`MinimalFallbackPlan`、`AiMainPlanProvider` |
| 生成行为 | 固定城市夹具 | key 存在时 AI 生成；AI 超时/非 2xx/空/非法 → 两站最小行程（出发地→返程地，费用 0）；无 key 仍夹具 |
| `application.yml` | 无 AI 配置 | 新增 `gogo.plan.ai.{api-key,base-url,model,max-tokens,timeout}`，由 `PLAN_AI_*` env 注入 |
| `backend/pom.xml` | 无 AI 依赖 | 不改（`RestClient`/Jackson 已具备） |
| Living Spec delta | G1 以夹具为默认 | MODIFIED 生成需求：AI-first + 校验 + 最小两站降级 + 非阻塞提示；G2/G5/G6 保留 |
| `MainPlanInputs.tsx` / `MainPlan.tsx` | 按钮仅文案变化 | 新增 `AiGeneratingNotice`，请求期间常驻、非阻塞；结束后关闭；错误沿用行内展示 |
| `app.css` | 无 spinner | 新增纯 CSS `.spinner`（`--brand`），复用 `.card`/`.hint` |
| Tests | 夹具断言 | 新增客户端/校验/降级/provider 单测；无 key 的既有 API/夹具测试不改断言 |
| Database / API | — | 零迁移、零端点、零错误码变化 |
| Config / ops | — | 部署注入 `LLM_API_KEY`；删除即回滚到夹具路径 |

## 4. Blast radius

后端 `com.gogo.mainplan` 的生成路径与 Spring 装配；新增对 `mlop-llm-gateway-dev.home-np.oocl.com:443` 的
出站调用（仅生成时、同步、单次）；前端两个既有页面的等待提示。无数据库 schema、
无 API 契约、无鉴权、无 splits/invitations/preferences 变更；无 key 环境完全走旧路径。

## 5. Artifact impact

- 预规格：新增 intent、US-031-AI 条目、DoR、deep-dive §US-031-AI、本 impact brief。
- 变更包：`openspec/changes/ai-main-plan-generation/`（proposal/specs/design/tasks 已在 P1）。
- 实现：约 8 个后端文件 + `application.yml` + 2 个前端页面 + `app.css` + 新测试。
- 归档前：`docs/knowledge/architecture/tech-stack-plan.md` §7 落地说明 + `_LOG.md` 一行。

## 6. Dual-track notes

OpenSpec 为交付规格权威；本次为 US-031 的生成口径增强，不新建 Jira/ADO 故事。
一个 change 足够，不做前后端拆分：提示条与后端生成同属一个可观察结果（等待体验），
拆开会产生“生成变慢但无反馈”的中间态。

## 7. Risks and blockers

| id | Risk | Severity | Status | Mitigation / owner |
|---|---|---|---|---|
| R1 | 成员文本（必做项名）引发的提示词注入 | Security | Resolved（design D4） | 用户文本仅作 JSON 数据；system 声明；输出仍需通过校验与确认门禁 |
| R2 | 模型延迟超过前端/代理阈值 | Reliability | Resolved（design D3） | 读取超时 20s、单次尝试，超时降级 |
| R3 | 模型输出漂移 / 非法 JSON | Data quality | Resolved（design D5） | `json_object` + 严格校验 + 最小行程降级 |
| R4 | 测试意外触网 | Test reliability | Resolved（design D2/D3） | 无 key 不创建 AI Bean；客户端单测用 stub / `MockRestServiceServer` |
| R5 | 演示时 AI 不可用导致只有两站 | Demo quality | Open, non-blocking | P4 用真实 key 手工跑一次并记录；演示前确认额度 |
| R6 | 真实额度/限流未知 | Operations | Deferred，non-blocking | 首次真实调用后记录；失败自动降级，不阻断演示 |
| R7 | 降级两站信息量少被误认为 bug | Product perception | Accepted（2026-11-18 用户裁决） | 降级静默、无标识；如后续需要可在另一变更增加提示 |

无 critical blocker；blocking OQ = 0，DoR BLOCKER = 0。

## 8. Suggested split boundaries

单一 change `ai-main-plan-generation`：

1. 配置与 provider 选择；
2. DeepSeek 客户端 + 提示词；
3. 校验 + 最小两站降级；
4. 测试；
5. 两页非阻塞提示。

不建议按前后端拆分（见 §6）；不建议拆出“无 key 夹具”或“降级形态”独立 change，
它们与 AI 路径共享同一 provider 端口与同一需求场景。
