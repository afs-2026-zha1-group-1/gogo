# Consistency lint — ai-main-plan-generation（phase=p2）

- Date: 2026-11-18（+08:00）
- Change: `openspec/changes/ai-main-plan-generation/`
- Focus: 全变更（proposal + delta spec + design + tasks）
- Artifact level: 4（proposal + specs + tasks + design）
- Authority: proposal / spec / design / tasks / requirement-workspace；不重写任何权威正文

## Verdict

**Partial** — BLOCKER 0 / WARNING 1 / SUGGESTION 2 / N/A 1

## Findings

| id | Severity | Location | Issue | Suggested fix | Authority | Fact/Inference |
|---|---|---|---|---|---|---|
| L1 | WARNING | `specs/main-itinerary/spec.md` §G1 | G1 场景仍写 `X-User-Id: 1`，而当前实现使用 session principal（US-066 已退役该头） | 保持现状以兼容既有 Living 场景；归档合并时若统一身份口径，另开文档变更处理 | spec / code | [fact] |
| L2 | SUGGESTION | `specs/main-itinerary/spec.md` 生成需求 + `design.md` D5 | AI 输出校验只有“至少 2 站”，没有上限；超大行程仍会通过结构与确认校验 | 实现期观察；若出现实际风险，另立变更补上限（例如 12 站） | spec / design | [inference] |
| L3 | SUGGESTION | `specs/main-itinerary/spec.md` 末尾规范性说明 | 中文“必须/不得”通过一句 SHALL/MUST NOT 映射满足校验器；属工具适配而非业务内容 | 保留；归档后如改英文可删除该说明 | spec | [fact] |

## 规则检查

| Rule | Result | Evidence / note |
|---|---|---|
| P1 Why | Pass | proposal `## Why`：fake provider 与偏好无关，§7 接缝延后 |
| P2 What Changes | Pass | DeepSeek 客户端、AI provider、校验、两站降级、无 key 夹具、非阻塞提示、配置 |
| P3 Non-Goals | Pass | proposal `## Non-Goals` 明确异步/新字段/确认校验/其他能力/调参均不做 |
| P4 Impact self/upstream/downstream | Pass | `Impact dimensions` 三段显式列出 |
| S1 Spec structure | Pass | `openspec validate --strict` = valid |
| S2/S2b citation prefixes | Pass / N/A | 仅使用 `@rule:`；无 `@knowledge:` |
| S2c `@rule:` resolves | Pass | `prompt-injection-defense` → `docs/knowledge/rules/security/prompt-injection-defense.md` |
| S3 Requirement traces to proposal | Pass | MODIFIED 生成需求 ↔ proposal `What Changes` 全部条目 |
| S4 Given/When/Then | Pass | 9 条场景均含 GIVEN/WHEN/THEN |
| S5 Scenario belongs to requirement | Pass | 所有 `#### Scenario:` 位于唯一 MODIFIED requirement 下 |
| T1 Task size estimates | N/A | tasks 未含工时估算 |
| T2 Verify tail | Pass | 7.6 为归档前最终回归；7.5 为配置规则要求的对账 |
| T3 Tasks inside Spec | Pass | 客户端/校验/降级/提示均对应 delta 场景；配置与测试属使能项 |
| D1 Numbered decisions | Pass | D1–D8 |
| D2 Decision context | Pass | 每条均含触发条件与理由 |
| D3 Rejected alternatives | Pass | D1/D2/D3/D4/D5/D6/D7/D8 均列出被弃方案 |
| C1 proposal → spec | Pass | AI 成功、失败降级、空地点补全、输出校验、非阻塞提示均有场景 |
| C2 spec → tasks | Pass | 每组场景对应 1.x/2.x/3.x/4.x/5.x 任务 |
| C6 citation reachability | Pass | 规则文件存在 |
| p2-1 scope vs delta | Pass | 无静默扩范围；确认/DB/API 明确不改 |
| p2-2 delta internal consistency | Pass | 两站降级、费用 0、地点来源、no-key 前提一致 |
| p2-3 key scenarios have a home | Pass | US-031-AI AC1–AC9 全部映射（见 `dov-ac-review.md`） |
| p2-4 tasks contradict delta | Pass | 任务方向与 delta 一致 |
| p2-5 traceability | Pass | 无孤立 requirement/scenario |

## N/A 说明

- T1：tasks 未写工时估算，规则不适用。

## Residual risks

- G1 的 `X-User-Id` 简写属于既有漂移，本变更不修正；以会话实现为准。
- AI 输出无站数上限；确认校验能挡住时间/预算冲突，但挡不住“很长但合法”的行程。
- 降级对用户静默，且只有两站；用户已接受，演示需提前确认 key 可用。
- 真实 key 的额度/限流尚未验证（OQ-8 deferred）。
- P2 期间 provider 由 DeepSeek 改为DeepSeek，P4 再把默认模型由 `deepseek-v4.1-flash` 换为
  `deepseek-v4.1-flash`（用户指令）；delta 不含厂商/模型名，lint 结论不变，
  proposal/design/tasks 已同步，配置名改为 `PLAN_AI_*`。

## Reviewer

agent（P2 consistency-lint）；human sign-off pending（G1 由 IO/SA 签署）。

## Next

`/sdd:g1-decision-record`（需具名 IO + SA）或继续 `/sdd:p2`。
