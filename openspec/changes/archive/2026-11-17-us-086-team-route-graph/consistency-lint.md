# Consistency lint — us-086-team-route-graph（phase=p2）

- Date: 2026-11-17（+08:00）
- Change: `openspec/changes/us-086-team-route-graph/`
- Focus: full change（proposal + delta spec；无 tasks/design）
- Artifact level: 2（proposal + specs）
- Authority: proposal / spec / requirement-workspace；不重写任何权威正文

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 1 / N/A 3

## Findings

| id | Severity | Location | Issue | Suggested fix | Authority | Fact/Inference |
|---|---|---|---|---|---|---|
| L1 | SUGGESTION | `specs/splits/spec.md` §`发起屏幕展示契约（Screen 11）` | MODIFIED 保留了旧场景标题、但步骤已按队伍路线页重写；OpenSpec 要求 MODIFIED 不得丢失既有场景标题 | 保留现状即可；G1/归档时按本 delta 合并 Living | spec | [fact] |

## 规则检查

| Rule | Result | Evidence / note |
|---|---|---|
| P1 Why | Pass | proposal `## Why` 说明旧页看不到全队路线 |
| P2 What Changes | Pass | 页面重写、只读图、数据装配、状态动作、零后端 |
| P3 Non-Goals / Out-of-scope | Pass | proposal `## Out of scope` 明确弹层、后端、其它分队页面、个人视角、多日分段、新依赖 |
| P4 Impact self/upstream/downstream | Pass | Impact 表覆盖前端/后端/数据库/依赖/认证/specs/跨 change |
| S1 Spec structure | Pass | `openspec validate --strict` = valid |
| S2 / S2b / S2c citations | N/A | delta/proposal 无 `@knowledge:` / `@rule:` 引用 |
| S3 Requirement traces to proposal | Pass | MODIFIED `Split draft start` ↔ proposal「What Changes」 |
| S4 Given/When/Then | Pass | 项目既有场景允许 WHEN/THEN；新场景在状态分叉处使用 GIVEN |
| S5 Scenario belongs to requirement | Pass | 所有 `#### Scenario:` 均在 MODIFIED requirement 下 |
| T1–T3 Tasks | N/A | 无 `tasks.md`（P3 产出） |
| D1–D3 Design | N/A | 无 `design.md`（P3 产出） |
| C1 proposal → spec | Pass | 页面标题/动作、只读路线图、状态覆盖均在 delta 有场景 |
| C2 spec → tasks | N/A | 无 tasks |
| C6 citation reachability | N/A | 无引用前缀 |
| p2-1 scope vs delta | Pass | 无静默扩范围；弹层明确不在 delta |
| p2-2 delta internal consistency | Pass | 状态、动作、节点、空态一致 |
| p2-3 key scenarios have a home | Pass | issue AC1–AC8 全部映射（见 `dov-ac-review.md`） |
| p2-4 tasks contradiction | N/A | 无 tasks |
| p2-5 traceability | Pass | 无孤立 requirement/scenario |

## N/A 说明

- Tasks / Design：P3 才产出，本阶段不适用。
- Citation rules：本 change 未使用知识库/规则引用前缀。

## Residual risks

- 多日行程仍按单一时间线展示（OQ-2 deferred）；后续另立按天分段。
- 有/无草稿的主线数据源时间格式不同，P3 需固定格式化规则。
- 实现若改动 `app.css` 会与 active `req-020` / `us-067` 共享；建议新样式留在 split 组件内（Tailwind）。

## Reviewer

agent（P2 consistency-lint）；human sign-off pending（G1 由 IO/SA 签署）。

## Next

`/sdd:g1-decision-record`（需具名 IO + SA）或继续 `/sdd:p2`。
