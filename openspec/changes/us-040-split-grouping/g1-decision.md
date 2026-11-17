# G1 decision — us-040-split-grouping（SA + IO Pass）

- Gate: G1 (Align)
- Timestamp: 2026-11-17（SA 签核时间，+08:00）；IO 复核并签核 2026-11-17
- Branch: `US-040-split-grouping-p0`（PR #117，含 P0/P1/P2 文档产物）
- 状态：**SA Pass（Leo）+ IO Pass（Emily），均 2026-11-17**；G1 Decision = **Pass**（C1–C7 全部 closed）

## Inputs

- Proposal: `openspec/changes/us-040-split-grouping/proposal.md`
- Delta Spec: `openspec/changes/us-040-split-grouping/specs/splits/spec.md`（1 ADDED「Member group assignment」/ 10 场景；3 MODIFIED：Split draft start 12 场景、Group route generation 7 场景、Split confirmation 9 场景；共 38 场景；2026-11-17 Revision 后 39，合并 main 后 US-086 新增 3 条 Screen 11 场景已补入 → 41，见 `g2-decision.md`）
- AC/DoV review: `openspec/changes/us-040-split-grouping/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass；2026-11-17 IO 复核补记）
- OpenSpec 校验：`openspec validate us-040-split-grouping --strict` = **valid**（deltas = 4）
- Requirement source: `requirement-workspace/requirements/US-040.md`（OQ-1…OQ-8 resolved，OQ-9…OQ-12 deferred，OQ-13 由 IO 复核 resolved = BQ-9）
- DoR: `requirement-workspace/analysis/us-040-dor.md`（①–⑫ 全 Pass，BLOCKER = 0，blocking 未 resolved = 0）
- Deep-dive: `requirement-workspace/deep-dive.md` §US-040（⑨–⑫ Pass，A0 Pass）
- Impact brief: `requirement-workspace/impact-brief.md` §US-040（No critical blocker）
- P0 基线：`docs/ai4se-plugins/20261117-135147-quality-checklist-report.md`（Overall Partial，仅既有 Rules 载体缺口）
- 依赖的已归档资产：US-038（#17）、US-039（#18）、US-042（#19）、US-049-050（`openspec/changes/archive/2026-11-17-us-049-050-split-confirm-cancel/`）
- 被取代的验收基线：`docs/feedback/e2e-us-049-050.md` E2/E3/E5/E8/E10 与 A/B 1/2·3/4 夹具口径（本变更插入分组步后失效）
- Story: GitHub issue #84（`Iteration 1`、`Priority - Must`、`Type - Split Planning`；并入 US-041 #85 / US-076 #55）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：`splits` 新增 1 条分组写入能力（`PUT .../split-draft/assignment`，仅本人、active、版本条件、保留边界与路线），并 MODIFIED 三条既有 requirement（初始分组全员 A + 成员数 ≥ 2 前置、生成前置分组完整性、确认完整性明细）。零迁移、零新依赖、不新增路由、不改 `SecurityConfig`（splits 维持 `permitAll` + `MemberGuard` 例外）；分队发起、边界选择、会合校验、确认/取消的既有语义不变（仅回归） |
| Ambiguity | blocking 开放问题未 resolved = 0（BQ-1…BQ-9 全部固化）；OQ-9（非法组别错误码）、OQ-10（同组提交是否递增版本）、OQ-11（头像首字母）、OQ-12（空 B 组引导文案）标记 `deferred`，owner = P3 设计者，不阻塞 G1（A3 已锁定「版本以响应为准」，OQ-10 不影响前端契约） |
| Conflict | ① issue #84 AC 第 2 条写「分组变化使旧路线失效或要求重新生成」，与用户裁决 BQ-2「保留 routes、仅 `draftVersion + 1`」字面冲突 → 已由 proposal `Supersedes` 行显式取代，并在 delta A4 场景固化（改组不改动 routes/边界/`plan_node` 行）。② Living Spec `Group route generation` 以「完整互斥 A/B 组为夹具保证的前置」为前提，Screen 13 场景写明「分组移动控件本期不实现」→ 本变更以 MODIFIED 收敛为真实校验 + 真实分组卡，原 6 个场景标题逐字保留。③ 既有测试 `generateRoutes_groupMoveEndpoint_notImplemented` 断言 `groups:move` 不存在（404/405）→ 本变更采用 `PUT .../assignment`，P4 必须删除/改写该负向断言（impact R6，已入 Residual）。④ 初始分组由「前后均分」改为「全员 A 组」，会推翻既有 splits 测试与夹具的 2/2 假设（已入 Residual，P3/P4 承接）。⑤ **IO 复核新增**：新规则下单人行程（成员数 = 1）永久不可分队 → 已引入 `SPLIT_MEMBERS_INSUFFICIENT` 发起门禁（BQ-9）。⑥ **IO 复核新增**：本变更推翻 US-049/050 已 Pass 的 E2E 验收基线（`docs/feedback/e2e-us-049-050.md` E2/E3/E5/E8/E10）→ proposal `Supersedes` 已显式声明 |
| Verifiability | 38 条场景（ADDED 10 + MODIFIED 28），全部为可观察结果：HTTP 状态、`groups` 键与元素、`draftVersion` 增量、`error.code`、`error.details.missing` 字面项（`groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`）、`plan_node` 行数、页面成员名与提示文案。三条 MODIFIED 均保留 Living Spec 原有全部场景标题，仅新增 S9 / S10-N / G6-N / CF8-N 四条 |
| Residual | 见下方「Residual notes」，均为非阻塞承接项 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-17 |
| IO | Emily | **Pass** | 2026-11-17 |

SA 的 Pass 按用户 2026-11-17 指令代记（用户本人担任 SA，签核名 Leo）；IO 的 Pass 为用户 2026-11-17 以 IO 身份复核本记录、delta 与 `dov-ac-review.md` 后明确给出（「按照建议修改文档，然后签名记pass」），代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pass

SA（Leo）2026-11-17 Pass；IO（Emily）2026-11-17 复核后 Pass。IO 复核提出的 2 项业务级冲突（单人行程永久不可分队、推翻 US-049/050 E2E 验收基线）与 3 项口径缺口（路线只绑组标签/复核屏陈旧提示、splits 401 契约、A3 版本口径）均已在本次文档修订中关闭，G1 门禁达成。

## IO 复核记录（2026-11-17）

| # | 复核项 | 严重度 | 处置 |
|---|---|---|---|
| IO-1 | 单人行程（成员数 = 1）在新完整性判据下永久不可分队（旧行为可确认） | 阻塞 | 已关闭：新增发起前置「成员数 ≥ 2」，创建/重建均 `409 SPLIT_MEMBERS_INSUFFICIENT`；delta 增 S10-N、requirements 增 OQ-13/BQ-9 与 R11，Screen 11 错误态覆盖 |
| IO-2 | 本变更推翻 US-049/050 已 Pass 的 E2E 验收基线（E2/E3/E5/E8/E10、A/B 1/2·3/4） | 阻塞 | 已关闭：proposal `Supersedes` ②点名该证据表与版本序列变化；impact R8、requirements Context 同步 |
| IO-3 | 「路线不绑成员、改组不使路线失效」仅在需求 Out of scope，delta 无正面表述；Screen 15 无陈旧路线提示 | 中 | 已关闭：delta 增「route 只绑组标签、不携带成员 id」；Screen 13 空组+旧路线标注「需重新生成」；Screen 15 增「路线仍为上次生成版本」提示 |
| IO-4 | 多处写「`/api/**` 已 authenticated，新 PUT 自动受保护」，而 splits 实为 `permitAll` + `MemberGuard`（401 `MEMBER_REQUIRED`） | 中 | 已关闭：proposal / impact §3.1·§3.7 / deep-dive ⑪ / requirements Constraints 均改为「维持 permitAll + 例外，新 PUT 必须命中 `/api/trips/*/split-draft/**`」 |
| IO-5 | A3「提交当前组」版本语义悬空，前端无从实现 | 中 | 已关闭：A3 增「响应恒返回最新 `draftVersion`，前端以响应为准」，版本是否 +1 仍留 OQ-10 |

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | IO 对本期 delta 与 `dov-ac-review.md` 具名复核并签核 | Emily（IO） | P3 开工前 | **closed 2026-11-17**（IO Pass） |
| C2 | SA 复核「初始分组全员 A」与「改组保留 routes」两项契约取舍 | Leo（SA） | P3 开工前 | **closed 2026-11-17**（SA Pass 已签） |
| C3 | P3 定稿 OQ-9 错误码与 OQ-10 幂等语义，并写入 `acceptance-test-fixtures.md` §US-040 | P3 设计者 | ATDD 设计完成前 | **carried to P3**（非阻塞） |
| C4 | 裁决单人行程（成员数 < 2）时分队行为并落入 delta | Emily（IO）/ Leo（SA） | P3 开工前 | **closed 2026-11-17**（BQ-9：发起门禁 + `SPLIT_MEMBERS_INSUFFICIENT`） |
| C5 | 声明取代 US-049/050 的 E2E 验收基线 | Emily（IO） | P3 开工前 | **closed 2026-11-17**（proposal `Supersedes` ②） |
| C6 | delta 补「route 只绑组标签」+ Screen 15 陈旧路线提示 + A3 版本口径 | P3 设计者 | G1 关闭前 | **closed 2026-11-17**（delta 已写入） |
| C7 | 将「新 PUT 自动受保护」改为 splits `permitAll` + `MemberGuard` 例外，并列为 P4 检查项 | Leo（SA） | G1 关闭前 | **closed 2026-11-17**（proposal/impact/deep-dive/requirements 已改） |

C1–C7（除 C3 转 P3 承接）均已关闭，Decision = `Pass`；后续任何 delta 语义变化需重开本记录。

## Residual notes（非阻塞，承接至 P3/P4）

- **SA（高风险实现面）**：初始分组改为全员 A 后，`AbstractSplitApiTest.prepareConfirmableDraftAs`（start→boundaries→routes）缺少分组步骤，`SplitDraftDetailApiTest`（断言 A/B 各 2 人）、`SplitDraftDocumentTest`（`partitionGroups` 单测）、`SplitRouteGenerationApiTest` 与 `SplitConfirmApiTest` 的既有通过用例都会受影响；P3 必须先改夹具与 helper，再补分组前置用例。
- **SA**：`SplitRouteGenerationApiTest.generateRoutes_groupMoveEndpoint_notImplemented` 必须删除或改写为「`assignment` 已实现」，否则必然失败。
- **SA**：`groups` 元素为 `app_user.id`（`trip_member.user_id`），与会话主体同源；实现不得二次映射为成员行 id。
- **IO**：AC 第 2 条「旧路线失效」已被 BQ-2 取代；归档时以 Living Spec 为准，issue #84 的原文保留但不再作为验收口径。
- **IO**：US-049/050 的 `docs/feedback/e2e-us-049-050.md`（E2/E3/E5/E8/E10、A/B 1/2·3/4）已被本变更取代；P4 需重新跑一份 US-040 E2E（包含切组步与版本序列 v1→v2→v3→v4）作为 G2 证据。
- **IO**：单人行程门禁只拦「新发起/重建」；若升级前已存在 1 人行程的 `active` 草稿，其生成与确认仍会 `SPLIT_DRAFT_INCOMPLETE`。P3 需在 fixture 里明确该情形或选择「允许存量草稿走完」的兼容口径（不得静默放宽分组完整性）。
- **IO**：OQ-12 引导文案需明示「只能由成员本人切组」，否则组织者会反复重试生成。
- **IO**：OQ-9 / OQ-10 会直接影响 `SplitAssignmentApiTest` 的断言写法，P3 定稿前不得在测试中固化相反断言（delta A3 已写明）。
- **IO**：`groups` 空数组与「缺键」必须区分——detail 投影恒返回 A/B 两个键，前端不得把缺键当空组。
- **存量警告**：`openspec validate --specs --strict` 仍 exit 1，原因是 5 个既有 Living Spec 的「requirement >500 字符」WARNING（`splits` 也在其中）；本变更未改动 Living Spec，属存量问题，不阻塞 G1。
- **过程说明**：本记录原随 PR #117 以 Conditional 合入（SA 已签、IO 待补签）；2026-11-17 IO 复核并签 Pass，同期提交修订 delta/proposal/需求条目/impact/deep-dive，现为 **Pass**。

## Closure path

- 当前 **Pass** → 进入 `/sdd:atdd-design`（补 `acceptance-test-fixtures.md` §US-040）+ `/sdd:task-plan`，再进 P4。
- P3 必须带走：C3（OQ-9/OQ-10 定稿）、单成员存量草稿口径、陈旧路线提示落地、旧测试改写（`groups:move` 负向用例、`prepareConfirmableDraftAs` 分组步）、US-040 新 E2E。
- 若实现阶段发现 delta 需要语义变化，回到 `/sdd:delta-craft` 修补后重开本记录；不得以已关闭的 C1–C7 覆盖新增业务级问题。

## Revision re-review（2026-11-17，任意成员可编辑分组 + 头像切组）

- 触发：用户 2026-11-17 指令「现在需要所有人都能编辑分组……点击头像换到另外一个分组」，取代原 A9-N「不能替其他成员选择」。
- delta 变化：ADDED requirement 描述改为「任意成员可移动任意成员（body 可选 `memberId`，缺省为调用者；目标非成员 `403 NOT_A_MEMBER`）」；A9-N 拆为「可移动他人（A9）」+「目标非成员拒绝（A9b-N）」；Screen 13 场景改为头像 chip 点击切组。场景总数 38 → **39**（2026-11-17 合并 main 后，US-086 新增的 3 条 Screen 11 场景已逐字补入 → **41**）。
- 已同步：`proposal.md` `Supersedes ③`、`requirements/US-040.md` OQ-14/BQ-10 + Revision 段、`design.md` DD1/DD2/DD13 + TS-7、`atdd-design.md` A9 行、`acceptance-test-fixtures.md` §US-040、`tasks.md` 11.5、代码与 `SplitAssignmentApiTest`。
- 签核：SA Leo **Pass**（用户 2026-11-17 指令代记）；IO Emily **Pass**（2026-11-17，用户告知已复核；代理代记，未附具体整改意见）。

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C8 | IO 对 Revision delta（A9/A9b-N、Screen 13 头像交互、memberId 入参）复核并具名签核 | Emily（IO） | 合并 PR 前 | **closed（2026-11-17）** |

### Revision 签核区

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-17 |
| IO | Emily | **Pass** | 2026-11-17 |

**Revision Decision: Pass** —— C8 closed（2026-11-17）；G1 全程 Pass，原范围与 Revision 合并生效。
