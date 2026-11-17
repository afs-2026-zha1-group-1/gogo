# G1 decision — us-086-team-route-graph

- Gate: G1 (Align)
- Timestamp: 2026-11-17（+08:00）
- Change: `openspec/changes/us-086-team-route-graph/`

## Inputs

- Proposal: `openspec/changes/us-086-team-route-graph/proposal.md`
- Delta Spec: `openspec/changes/us-086-team-route-graph/specs/splits/spec.md`（1 MODIFIED / 9 条既有场景保留 + 4 条 Screen 11 场景重写/新增）
- AC/DoV review: `openspec/changes/us-086-team-route-graph/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass）
- Consistency lint: `openspec/changes/us-086-team-route-graph/consistency-lint.md`（Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 1）
- Cross-change scan: `openspec/changes/us-086-team-route-graph/cross-change-scan.md`（BLOCKER 0 / WARNING 1 / WAIVER 0）
- OpenSpec 校验：`openspec validate us-086-team-route-graph --strict` = **valid**；`openspec validate --specs --strict` = 8/8 passed
- Requirement source: `requirement-workspace/requirements/US-086.md`（DoR：`analysis/us-086-dor.md`，BLOCKER = 0，blocking OQ = 0）
- Impact: `requirement-workspace/impact-brief.md` §US-086；`intents/2026-11-17-us-086.md`
- Dependencies: `openspec/specs/splits/spec.md`（7 requirements）；归档 `2026-11-16-req-004-split-planning-chain`（US-038/039/042/043）；归档 `2026-11-17-us-049-050-split-confirm-cancel`（US-049/050）；`main-itinerary` Living（主线读）
- Story: GitHub issue #113（US-086，Iteration 2、Priority - Must、Type - Split Planning）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：只改 Screen 11 的展示契约（标题、右上动作、只读路线图、状态覆盖）；零后端、零迁移、零新依赖。节点详情弹层经 2026-11-17 用户裁决移出范围 |
| Ambiguity | blocking 未解 = 0；OQ-2 多日分段为 non-blocking deferred；OQ-3 双数据源、OQ-4 confirmed 文案、OQ-5 路线名、OQ-6 空时长均已 resolved |
| Conflict | ① `splits` Living 的 Screen 11 旧场景（initiator/version/status 展示 + 底部动作）由本 delta 重写，标题保留以满足 OpenSpec MODIFIED 要求。② 无 auth/identity delta，不触及 us-067/req-020 的共享面；`app.css` 共享列为 WARNING，实现优先使用局部样式 |
| Verifiability | 4 条新场景 + 9 条既有场景均可观察：标题、动作目标、主线/分支节点、A 右 B 左、空时长、confirmed 只读、权限/缺失/失败态 |
| Residual | 见下方 Residual notes，均非阻塞 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| IO | Johnson | **Pass** | 2026-11-17 |
| SA | Elian Jiang | **Pass** | 2026-11-17 |

按用户 2026-11-17 的明确选择记录（IO Johnson + SA Elian Jiang）。代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pass

Rationale：delta 与 proposal/requirement 一致；节点只读、无弹层；状态机与唯一性规则不变；`validate --strict` valid；AC/DoV 无阻塞项；跨 change 扫描无 BLOCKER；共享样式风险有明确规避。G1 达成。

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| — | 无 | — | — | — |

## Residual notes（非阻塞，承接至 P3/P4）

- 多日行程仍按后端返回的单一时间线展示（OQ-2 deferred）；后续另立按天分段。
- 有/无草稿的主线数据源时间格式不同（ISO vs 本地 `HH:MM`），P3 需固定分批格式化规则。
- `GroupRoute` 无逐节点时刻/地点/费用/任务；分支节点只显示时长分解，空值「待补全」。
- 若实现需要改共享 `app.css`，先与 active `us-067` / `req-020` 协调；优先局部样式。
- 分支/PR 尚未创建：本记录不授权直推 main，P4 按 PR-only 流程执行。
- 本记录不声称实现或测试已完成。

## Closure path

G1 **Pass** → `/sdd:p3`：ATDD 设计、`design.md`、`tasks.md` 与对齐自检；随后 P4 实现与本地验证。
