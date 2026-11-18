# G1 decision — ai-main-plan-generation

- Gate: G1 (Align)
- Timestamp: 2026-11-18（+08:00）
- Change: `openspec/changes/ai-main-plan-generation/`
- Recorded by: agent，按用户 2026-11-18「签 g1，IO 用 Emily，SA 用 Elian」的明确指令代记

## Inputs

- Proposal: `openspec/changes/ai-main-plan-generation/proposal.md`
- Delta Spec: `openspec/changes/ai-main-plan-generation/specs/main-itinerary/spec.md`
  （1 MODIFIED；G1/G2/G5/G6 保留 + 4 条新场景 + 1 条校验场景，共 9 条场景；中文正文）
- AC/DoV review: `openspec/changes/ai-main-plan-generation/dov-ac-review.md`
  （AC 4/4 Pass、DoV 5/5 Pass）
- Consistency lint: `openspec/changes/ai-main-plan-generation/consistency-lint.md`
  （Partial；BLOCKER 0 / WARNING 1 / SUGGESTION 2）
- OpenSpec 校验：`openspec validate ai-main-plan-generation --strict` = **valid**
- Requirement source: `requirement-workspace/requirements/US-031-AI.md`
  （DoR `analysis/us-031-ai-dor.md`：BLOCKER = 0，blocking OQ = 0；deep-dive §US-031-AI ⑨–⑫ Pass）
- Impact: `requirement-workspace/analysis/us-031-ai-impact-brief.md`；
  intent `requirement-workspace/intents/2026-11-18-us-031-ai.md`
- Dependencies: `openspec/specs/main-itinerary/spec.md`（既有 7 requirements）；
  技术栈方案 §7/§13；US-031/US-037、US-066（session）、US-089（城市夹具演示）
- Provider ruling: DeepSeek `deepseek-v4.1-flash`（2026-11-18；opencode 配置的
  `llm-gateway-alicloud` 内部网关，`LLM_API_KEY` 认证；期间曾切智谱，外部不可用后改回；
  无 thinking、`max_tokens` 8192、读取超时 30s）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：只改主线生成的 provider 路径（AI 客户端、输出校验、最小两站降级、无 key 夹具、非阻塞提示、`PLAN_AI_*` 配置）；零迁移、零端点、零鉴权改动。确认校验、草稿版本/过期、地点补全与 splits 投影不变 |
| Ambiguity | blocking 未解 = 0。OQ-1…OQ-6 均 resolved；OQ-7（提示词/temperature 校准）与 OQ-8（真实额度）为 non-blocking deferred |
| Conflict | ① 技术栈 §7 原列 DeepSeek / 通义，最终使用 opencode 的内部 DeepSeek 网关（期间曾切智谱，外部不可用后改回）；已在 proposal 记录为 provider 来源偏差，调用方式仍为单 provider `RestClient` + JSON + 降级，技术栈结构不变。② G1 场景沿用 `X-User-Id` 简写，而实现使用 session principal（US-066）；属既有 Living Spec 漂移，本变更不扩大、不修正（lint WARNING L1）。③ 无 key 路径保持城市夹具，仅 AI 失败走两站降级；两条路径由 G1 的“无 key”前提区分 |
| Verifiability | 9 条场景均可观察：201、草稿站点/时刻/车程/费用、两站降级、空地点补全、提示可见/可导航/关闭、错误码沿用。AI 路径用 stub 客户端与 `MockRestServiceServer` 验证，不依赖真实网络 |
| Residual | 见下方 Residual notes，均非阻塞 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| IO | Emily | **Pass** | 2026-11-18 |
| SA | Elian Jiang | **Pass** | 2026-11-18 |

按用户 2026-11-18 的明确指令记录。代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pass

Rationale：delta 与 proposal/requirement 一致；AI 生成、输出校验、最小两站降级、
无 key 夹具与非阻塞提示均有可观察场景；`validate --strict` valid；AC/DoV 无阻塞项；
一致性 lint 的 1 条 WARNING 为既有身份口径漂移，不构成本变更的未解歧义，2 条
SUGGESTION 已记录为非阻塞。

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| — | 无 | — | — | — |

## Residual notes（非阻塞，承接至 P3/P4）

- AI 输出无站数上限（SUGGESTION L2）；由确认时的排期/预算校验兜底，实际出现风险再另立上限。
- 降级对用户静默且只有两站；用户 2026-11-18 已接受，演示前需确认 `LLM_API_KEY` 可用。
- 真实 key 的额度/限流未验证（OQ-8 deferred），P4 需跑一次真实生成并记录耗时。
- 中文 spec 末尾以一行 SHALL/MUST NOT 映射满足校验器；归档后如转英文可删除。
- G1 的 `X-User-Id` 简写保留，以会话实现为准；统一身份文档口径属另一个变更。
- 本记录不声称实现或测试已完成；代码分支与 PR 归 P4，按 PR-only 流程执行。

## P4 revision — 2026-11-18

用户 2026-11-18 最终指令：改用 opencode 已配置的 DeepSeek 内部网关
（`llm-gateway-alicloud`，环境变量 `LLM_API_KEY` 认证），默认 `deepseek-v4.1-flash`；
期间曾从 DeepSeek 切智谱，因外部访问不可用再改回。为适配该模型的耗时与输出长度，
读取超时最终为 30s、`max_tokens` 8192，前端提示副文案“通常需要 10–30 秒”。该调整
只改 provider 来源、参数、配置默认值与文档，不改变 delta、AC/DoV、失败降级或 API
契约；G1 **Pass** 结论保留。IO/SA 未就本次来源/参数调整单独复签，按用户作为需求
owner 的指令记录。

## Closure path

G1 **Pass** → `/sdd:p3`：ATDD 设计、`design.md` 细化、`tasks.md` 对齐自检；随后 P4
实现、本地验证与 G2。
