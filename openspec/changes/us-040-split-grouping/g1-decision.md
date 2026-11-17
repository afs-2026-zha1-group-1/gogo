# G1 decision — us-040-split-grouping（草稿，待签核）

- Gate: G1 (Align)
- Timestamp: 2026-11-17（草稿创建时间，+08:00）
- Branch: `US-040-split-grouping-p0`（PR #117，含 P0/P1/P2 文档产物）
- 状态：**DRAFT / Decision = OPEN** —— 本文件不含任何签核，不构成门禁结论；由具名 IO + SA 复核后自行择一填写 Pass / Fail / Conditional

## Inputs

- Proposal: `openspec/changes/us-040-split-grouping/proposal.md`
- Delta Spec: `openspec/changes/us-040-split-grouping/specs/splits/spec.md`（1 ADDED「Member group assignment」/ 10 场景；3 MODIFIED：Split draft start 11 场景、Group route generation 7 场景、Split confirmation 9 场景；共 37 场景）
- AC/DoV review: `openspec/changes/us-040-split-grouping/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass）
- OpenSpec 校验：`openspec validate us-040-split-grouping --strict` = **valid**（deltas = 4）
- Requirement source: `requirement-workspace/requirements/US-040.md`（OQ-1…OQ-8 resolved，OQ-9…OQ-12 deferred）
- DoR: `requirement-workspace/analysis/us-040-dor.md`（①–⑫ 全 Pass，BLOCKER = 0，blocking 未 resolved = 0）
- Deep-dive: `requirement-workspace/deep-dive.md` §US-040（⑨–⑫ Pass，A0 Pass）
- Impact brief: `requirement-workspace/impact-brief.md` §US-040（No critical blocker）
- P0 基线：`docs/ai4se-plugins/20261117-135147-quality-checklist-report.md`（Overall Partial，仅既有 Rules 载体缺口）
- 依赖的已归档资产：US-038（#17）、US-039（#18）、US-042（#19）、US-049-050（`openspec/changes/archive/2026-11-17-us-049-050-split-confirm-cancel/`）
- Story: GitHub issue #84（`Iteration 1`、`Priority - Must`、`Type - Split Planning`；并入 US-041 #85 / US-076 #55）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：`splits` 新增 1 条分组写入能力（`PUT .../split-draft/assignment`，仅本人、active、版本条件、保留边界与路线），并 MODIFIED 三条既有 requirement（初始分组全员 A、生成前置分组完整性、确认完整性明细）。零迁移、零新依赖、不新增路由、不改 `SecurityConfig`；分队发起、边界选择、会合校验、确认/取消的既有语义不变（仅回归） |
| Ambiguity | blocking 开放问题未 resolved = 0（BQ-1…BQ-8 全部固化）；OQ-9（非法组别错误码）、OQ-10（同组提交是否递增版本）、OQ-11（头像首字母）、OQ-12（空 B 组引导文案）标记 `deferred`，owner = P3 设计者，不阻塞 G1 |
| Conflict | ① issue #84 AC 第 2 条写「分组变化使旧路线失效或要求重新生成」，与用户裁决 BQ-2「保留 routes、仅 `draftVersion + 1`」字面冲突 → 已由 proposal `Supersedes` 行显式取代，并在 delta A4 场景固化（改组不改动 routes/边界/`plan_node` 行）。② Living Spec `Group route generation` 以「完整互斥 A/B 组为夹具保证的前置」为前提，Screen 13 场景写明「分组移动控件本期不实现」→ 本变更以 MODIFIED 收敛为真实校验 + 真实分组卡，原 6 个场景标题逐字保留。③ 既有测试 `generateRoutes_groupMoveEndpoint_notImplemented` 断言 `groups:move` 不存在（404/405）→ 本变更采用 `PUT .../assignment`，P4 必须删除/改写该负向断言（impact R6，已入 Residual）。④ 初始分组由「前后均分」改为「全员 A 组」，会推翻既有 splits 测试与夹具的 2/2 假设（已入 Residual，P3/P4 承接） |
| Verifiability | 37 条场景（ADDED 10 + MODIFIED 27），全部为可观察结果：HTTP 状态、`groups` 键与元素、`draftVersion` 增量、`error.code`、`error.details.missing` 字面项（`groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`）、`plan_node` 行数、页面成员名与提示文案。三条 MODIFIED 均保留 Living Spec 原有全部场景标题，仅新增 S9 / G6-N / CF8-N 三条 |
| Residual | 见下方「Residual notes」，均为非阻塞承接项 |

## Approvers（待具名签署，代理不自填）

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | | | |
| IO | | | |

## Decision: OPEN

草稿阶段不填写结论。请具名复核人基于上述输入择一勾选：

- [ ] **Pass** —— delta 与既有能力无未解冲突，可进入 P3
- [ ] **Conditional** —— 允许进入 P3，但须列明整改项与 owner（无整改项/owner 的 Conditional 视为无效）
- [ ] **Fail** —— 退回 `/sdd:delta-craft` 或需求澄清

填写后请同时更新本文件的「状态」行与 `requirement-workspace/registry.md` 的 US-040 行。

## Conditions（拟议，签核人可增删）

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | IO 对本期 delta 与 `dov-ac-review.md` 具名签核 | Emily（IO） | P3 开工前 | draft |
| C2 | SA 复核「初始分组全员 A」与「改组保留 routes」两项契约取舍 | Leo（SA） | P3 开工前 | draft |
| C3 | P3 定稿 OQ-9 错误码与 OQ-10 幂等语义，并写入 `acceptance-test-fixtures.md` §US-040 | P3 设计者 | ATDD 设计完成前 | draft |

## Residual notes（非阻塞，承接至 P3/P4）

- **SA（高风险实现面）**：初始分组改为全员 A 后，`AbstractSplitApiTest.prepareConfirmableDraftAs`（start→boundaries→routes）缺少分组步骤，`SplitDraftDetailApiTest`（断言 A/B 各 2 人）、`SplitDraftDocumentTest`（`partitionGroups` 单测）、`SplitRouteGenerationApiTest` 与 `SplitConfirmApiTest` 的既有通过用例都会受影响；P3 必须先改夹具与 helper，再补分组前置用例。
- **SA**：`SplitRouteGenerationApiTest.generateRoutes_groupMoveEndpoint_notImplemented` 必须删除或改写为「`assignment` 已实现」，否则必然失败。
- **SA**：`groups` 元素为 `app_user.id`（`trip_member.user_id`），与会话主体同源；实现不得二次映射为成员行 id。
- **IO**：AC 第 2 条「旧路线失效」已被 BQ-2 取代；归档时以 Living Spec 为准，issue #84 的原文保留但不再作为验收口径。
- **IO**：OQ-9 / OQ-10 会直接影响 `SplitAssignmentApiTest` 的断言写法，P3 定稿前不得在测试中固化相反断言（delta A3 已写明）。
- **IO**：`groups` 空数组与「缺键」必须区分——detail 投影恒返回 A/B 两个键，前端不得把缺键当空组。
- **存量警告**：`openspec validate --specs --strict` 仍 exit 1，原因是 5 个既有 Living Spec 的「requirement >500 字符」WARNING（`splits` 也在其中）；本变更未改动 Living Spec，属存量问题，不阻塞 G1。
- **过程说明**：本记录以草稿形式随 PR #117 合入，合入时 Decision 为 `OPEN`；不得据此认为 G1 已通过。

## Closure path

- Decision = **Pass** → 进入 `/sdd:atdd-design`（补 `acceptance-test-fixtures.md` §US-040）+ `/sdd:task-plan`，再进 P4。
- Decision = **Conditional** → 按 Conditions 整改后关闭，再进 P3；Conditions 未关闭不得声称 G1 通过。
- Decision = **Fail** → 回到 `/sdd:delta-craft` 修补 delta 或回 P1 澄清，重开本记录。
