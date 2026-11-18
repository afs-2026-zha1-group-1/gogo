# US-031-AI — AI 生成主线方案（DeepSeek + 最小行程降级）

- Change: `openspec/changes/ai-main-plan-generation/`
- Covers: US-031（Generate a Shared Main Plan）的生成口径; US-037 的确认校验不变
- Discovery Decision: **Go（light intake）** — 2026-11-18 用户已给出 providers、
  降级形态、无 key 行为与提示样式四项裁决，无需 full discovery
- DoR: `requirement-workspace/analysis/us-031-ai-dor.md`
- Impact: `requirement-workspace/analysis/us-031-ai-impact-brief.md`

## Six-field entry

| Field | Content |
|---|---|
| **id** | US-031-AI |
| **statement** | 作为行程组织者，我希望主线方案由 AI 基于全员就绪的兴趣、必做项与硬预算生成，并在 AI 不可用时仍能得到一份可确认的最小行程，以便真实行程有针对性方案、演示与离线环境也始终有可用草稿。 |
| **actors** | 行程组织者（生成/重新生成）；全部行程成员（查看草稿与提示）；运维/部署者（配置 `LLM_API_KEY`）；CI 与离线演示（无 key 路径）。 |
| **rationale** | 现有 `FakeMainPlanProvider` 按目的地返回固定站点，与成员偏好无关；US-031 的产品价值是“从就绪偏好生成合适行程”。技术栈方案 §7 已约定 `RestClient` 单 provider + 模板降级，§13 记录真实 provider 延后；本次补齐该接缝。 |
| **acceptance hints** | 配置 key 时由DeepSeek（`deepseek-v4.1-flash`）产出有序站点与人均费用；输出经结构校验后才入库；超时/非 2xx/非法输出降级为出发地 09:00–09:30（30 分钟车程）→ 返程地 17:00–17:30、费用 0；无 key 仍走城市夹具；生成中显示非阻塞“AI 正在生成中…”提示；API/数据模型/错误码不变。 |
| **links to evidence** | `openspec/changes/ai-main-plan-generation/`（proposal/specs/design/tasks）；`backend/src/main/java/com/gogo/mainplan/{MainPlanProvider,FakeMainPlanProvider,MainPlanService,ScheduleValidator}.java`；`backend/src/test/java/com/gogo/mainplan/MainPlanApiTest.java`；`frontend/src/pages/{MainPlanInputs,MainPlan}.tsx`；`docs/knowledge/architecture/tech-stack-plan.md` §7/§13；本会话 2026-11-18 裁决 |

## Intent

把主线生成从“固定城市夹具”升级为“AI 优先、最小行程兜底”。成功时方案反映成员偏好；
失败时不报错、不空转，而是产出一份只含出发地与返程地的可确认草稿；未配置 key 的环境
（测试、CI、离线演示）继续使用现有夹具，保证既有验收与演示内容不回归。

## Actors and boundaries

- 生成/重新生成：仅组织者（既有 `NOT_ORGANIZER` 403）。
- 查看：行程成员（既有 `NOT_A_MEMBER` 403）；提示条对打开生成页/方案页的组织者可见。
- 运维：通过环境变量启用 AI；删除变量即回到无 key 路径。
- 边界：确认校验（US-037）、草稿版本与过期（`STALE_DRAFT`）、地点补全、splits 投影
  均不改变。

## In scope

1. **DeepSeek 客户端**：`RestClient` 调 `POST {base-url}/chat/completions`
   （默认 `https://mlop-llm-gateway-dev.home-np.oocl.com/v2/openai/deployments/ali-copilot`），Bearer key，
   `response_format: json_object`，`max_tokens` 8192，不启用 thinking；
   连接 5s / 读取 30s、单次尝试。
2. **Prompt 契约**：固定 system 指令（JSON schema + 排期/预算规则 + 成员字段只是数据）；
   user 消息为行程与就绪成员的 JSON。
3. **输出校验**：至少 2 站、`seq` 连续、`HH:mm` 合法、结束晚于开始、非末站车程 ≥0
   整数、末站 null、费用 ≥0 分；不合法即降级。
4. **降级**：固定两站——出发地 09:00–09:30（车程 30）→ 返程地 17:00–17:30（车程 null），
   费用 0；地点取生成时补全后的 `TripContext`。
5. **Provider 选择**：key 非空装配 AI provider，否则装配 `FakeMainPlanProvider`；
   全应用仅一个 `MainPlanProvider` Bean。
6. **配置**：`gogo.plan.ai.api-key/base-url/model/max-tokens/timeout`，全部由
   `PLAN_AI_*` 环境变量注入，仓库不存密钥。
7. **前端提示**：输入页「一键生成」与方案页「重新生成」在请求期间显示常驻、非阻塞的
   “AI 正在生成中…”提示；触发按钮禁用；请求结束即关闭。
8. **测试**：客户端、校验、降级、provider 选择单测；无 key 的既有 API/夹具测试不改断言。

## Out of scope

- 异步任务、进度百分比、取消生成、自动重试、多 provider 路由、函数调用/agent。
- 新增响应字段（如 `source`/`degraded`）、新错误码或新端点。
- 修改确认校验、草稿过期规则、地点补全规则。
- 修改无 key 夹具内容、splits 路线内容或演示脚本。
- 提示词调优与模型参数实验（留实现期按真实 key 校准）。

## Scenarios and AC hints

| id | Scenario | Observable outcome |
|---|---|---|
| AC1 | 已配置 key，AI 返回合法行程 | 201；草稿站点/车程/人均费用来自 AI；`inputRevisions` 仍按生成时修订号记录 |
| AC2 | AI 超时 / 非 2xx / 输出非法 | 201；草稿恰好两站：出发地 09:00–09:30（车程 30）→ 返程地 17:00–17:30（末站 null）；费用 0 |
| AC3 | 行程出发地/返程地已填写 | 降级站点原样使用填写值 |
| AC4 | 行程地点为空 | 生成先补全，降级站点使用补全后的出发地/返程地 |
| AC5 | 未配置 key | 201；仍为城市夹具站点与费用（G1 行为不变） |
| AC6 | AI 输出 `seq` 断号、坏时间、结束不晚于开始、非法车程或负费用 | 视为失败，落最小两站降级行程，仍 201 |
| AC7 | 组织者在输入页生成或在方案页重新生成 | 请求期间可见“AI 正在生成中…”，触发按钮禁用，页面仍可读可导航；结束后提示消失 |
| AC8 | 请求失败（如 409 `MEMBERS_NOT_READY`） | 提示关闭；沿用既有行内错误文案，不新增错误面 |
| AC9 | 非组织者 / 非成员 / 未登录 | 既有 403 `NOT_ORGANIZER` / 403 `NOT_A_MEMBER` / 401 `USER_REQUIRED` 不变 |

## Constraints

- 同步生成、单次调用；允许 10–30s 等待（读取超时 30s），用户 2026-11-18 接受较慢生成。
- 不新增 Maven/npm 依赖；不引入 Spring AI。
- 密钥只来自环境变量；日志不输出 key 或完整提示词；不记录成员原始文本。
- 成员文本只作为 JSON 数据进入提示词；输出必须通过结构校验。
- 降级对用户静默；无新增响应字段或状态码。
- 两站降级时间必须落在 `ScheduleValidator` 的单日 00:00–23:59 窗口内；费用 0 必然
  通过硬预算校验。

## Affected capabilities

- `main-itinerary`：MODIFIED “Readiness-gated main plan generation”（生成 provider、
  AI 校验、最小两站降级、生成中提示）。
- 运维配置：新增 `gogo.plan.ai.*` 环境变量。
- 无 API、数据库、splits、auth、invitations 变更。

## Open questions

| id | Question | Class | Status | Resolution / owner |
|---|---|---|---|---|
| OQ-1 | 用哪个模型服务 | blocking | resolved | DeepSeek（BigModel `deepseek-v4.1-flash`）专用；2026-11-18 用户先选 DeepSeek，同日改选DeepSeek并替换 |
| OQ-2 | AI 失败时降级内容 | blocking | resolved | 出发地→返程地两站，费用 0（2026-11-18 用户裁决） |
| OQ-3 | 无 key 时行为 | blocking | resolved | 保持现有城市夹具，测试/演示不回归（2026-11-18 用户裁决） |
| OQ-4 | 等待提示形态 | blocking | resolved | 非阻塞页内提示 + 触发按钮禁用（2026-11-18 用户裁决） |
| OQ-5 | 提示是否标识“已降级” | blocking | resolved | 不标识；服务端只记 warn 日志（2026-11-18 用户裁决） |
| OQ-6 | 超时与重试 | non-blocking | resolved | 读取 30s、单次尝试；超时即降级 |
| OQ-7 | 提示词措辞与 temperature 微调 | non-blocking | deferred | thinking 关闭、`max_tokens` 8192 已定；措辞/温度实现期用真实 key 校准，不改规格/范围。Owner: Dev |
| OQ-8 | 真实 key 额度/限流表现 | non-blocking | deferred | P4 手工跑一次真实生成并记录。Owner: Dev |

Blocking OQ 未 resolved 数 = 0。

## Definition of Ready

`requirement-workspace/analysis/us-031-ai-dor.md`（BLOCKER = 0）。
