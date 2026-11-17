# G1 decision — us-049-050-split-confirm-cancel

- Gate: **G1（Align）**
- 记录日期: 2026-11-16
- 状态: **Pass**（SA = Leo 已具名签核；IO = Emily 2026-11-16 复核批准，C1/C2 closed）
- 性质: 人工签核驱动的 Gate 决策记录；不自动批准、不改 Delta Spec、不 merge Living Spec

## Input artifacts

- Delta Spec: `specs/splits/spec.md` — **2 ADDED + 5 MODIFIED / 7 requirement / 49 场景**
  - ADDED：`Split confirmation`（7 场景，CF1–CF6 + Screen 15）、`Split draft cancellation`（6 场景，CN1–CN5 + Screen 15 cancel）
  - MODIFIED：`Split draft start`（10，含新增 S8 重建）、`Split boundary selection`（7）、`Group route generation`（6）、`Reunion timing check`（7）、`Split draft detail read`（6，含新增 D1b）
- 工具校验：`openspec validate us-049-050-split-confirm-cancel --strict` = **valid**
- AC/DoV 评审: `dov-ac-review.md` — AC-1~4 / DoV-1~5 **全 Pass**，无 blocking Fail/Partial
- 一致性 lint: `consistency-lint.md` — phase=p2，**Pass**（0 BLOCKER / 0 WARNING / 4 SUGGESTION）
- 阶段 DoV: `docs/ai4se-plugins/20261116-145045-quality-checklist-report.md` — p2 **Pass**
- Proposal: `proposal.md`（含 `## Non-Goals` + Impact Upstream/Downstream）
- 需求侧权威：`requirement-workspace/requirements/US-049-050.md`（BQ-1..BQ-9）、`analysis/us-049-050-dor.md`（BLOCKER = 0）、`deep-dive.md` §US-049-050（⑨–⑫ Pass）、`acceptance-test-fixtures.md` §US-049-050、`impact-brief.md` §US-049-050
- 上游基线：P0 产出（`20261116-141840-repo-understand-brief.md`、`20261116-142356-quality-checklist-report.md` = Partial）、`openspec/specs/splits/spec.md`（既有 5 requirement）、`docs/knowledge/architecture/tech-stack-plan.md`
- 远端证据：main push CI run **43819674916**（Backend tests + Frontend build 双 job success）
- IO 复核：2026-11-16 具名复核，结论见 §IO review findings；C1/C2 closed，C7–C11 承接

## Check conclusions（findings）

- **Scope（范围）**: delta 的 2 ADDED（确认 / 取消）+ 5 MODIFIED ↔ proposal §What Changes 的六组变更点，无静默扩/缩；5 条 MODIFIED 全部属于同一条「链级约定纠偏」的落地形态（身份头 `X-Member-Id`→`X-User-Id`、草稿载体 `trip.split_draft` 列→`split_draft` 表、迁移编号 V2→V4、活跃态写入拒绝），proposal 已在本会话补充该落地形态说明（DoV-1 依据）。新增场景仅 S8、D1b 两个。
- **Ambiguity（歧义）**:
  - **BQ-1**（打包粒度）→ **resolved**：单 change 含 049+050（用户 2026-11-16）。
  - **BQ-2 / OQ-N7**（确认时如何消费校验结论）→ **resolved**：服务端从草稿文档复算（复用 `ReunionTimingCalculator`），客户端 `confirmable` 不参与；对应 CF2-N 125/120 用例。
  - **BQ-3**（取消与 `trip_id UNIQUE`）→ **resolved**：`status='cancelled'` + 同行重建（`draftVersion` 重置 1），无新迁移；对应 CN1、S8。
  - **BQ-4**（Living Spec 漂移）→ **resolved**：本 delta 以 MODIFIED 收敛，Purpose 重写链级约定。
  - **BQ-5/6/7/8** → resolved（新增 `NOT_SPLIT_ORGANIZER`；IO 复核追加 `SPLIT_DRAFT_INCOMPLETE`，见 C2；confirmed 仍可读；取消删除 split 节点；两端点 body = `{draftVersion}`）。
  - **BQ-9**（确认记录保留期 / SLA）→ **deferred**（owner Dev，非阻塞）。
  - blocking open questions 未解决数 = **0**；DoR BLOCKER = **0**。
- **Conflict（冲突）**: 初版记录为“无”，IO 复核（2026-11-16）判定该结论不成立：发现 6 处契约级缺口/冲突（取消后投影与删节点自相矛盾、取消缺版本校验场景、确认完整性无失败码、错误明细无容器、Screen 11 无替换入口、缺输入在草稿模型不可表达），另有 3 项实现口径风险（状态 CAS/列版本、S8 主线版本来源、下游读模型）。处置见 §IO review findings 与 C7–C11。身份守卫序（identity → trip → membership，401/404/403）、`{data,error}` 包封套、状态机三态、数值（A 105 / B 110 / 超窗 125 超 5、窗口 120）在 requirement、delta、fixtures、deep-dive、proposal 五处一致；既有 greeting / trips / invitations / main-itinerary 契约不受影响；SQLite 与 Flyway 无新增迁移，不与 main 现有 `V1–V5` 冲突。

## IO review findings (2026-11-16)

| id | 严重度 | 冲突 / 缺口 | 处置 |
|---|---|---|---|
| IO-1 | 高 | CN1 取消删除 `split-a/b` 节点，但 D1b 要求 cancelled 详情仍返回 routes；现有 detail 的 `activityName` 从 `plan_node` 读取，取消后为 `null`（幽灵路线） | C7 |
| IO-2 | 高 | 草稿 `RouteDurations` 用 primitive `int`，活动时长/buffer 缺失不可表达；Jackson 把 JSON `null` 落为 0，可能误判 `feasible=true`，CF3-N 不可达 | C8 |
| IO-3 | 高 | confirm 要求“边界与两条路线齐全”，但无失败码与场景；缺路线时行为未定义 | C7（新增 `SPLIT_DRAFT_INCOMPLETE` 409） |
| IO-4 | 高 | cancel 缺 stale 场景；迟到/重放的旧版本取消请求可误取消刚重建的新草稿 | C7（CN6-N） |
| IO-5 | 高 | `ApiError` 仅 `{code,message}`，`SPLIT_TIMING_INFEASIBLE` 的 `totalMinutes/overrunMinutes/missingInputs` 无容器，也未定义按 A/B 路线形状 | C7（`error.details.routes[]`） |
| IO-6 | 高 | Screen 11 以 `detail` 非空判断按钮，cancelled 后只显示“下一步”，无“发起替换”入口，CN1 端到端不可用 | C7 |
| IO-7 | 中 | 确认/取消版本不变与 `updateDraftIfVersion`（+1）冲突；并发 confirm/cancel 可双成功；重建未重置 `split_draft.draft_version` 列会卡死新草稿 | C8 |
| IO-8 | 中 | S8 要求 `mainPlanVersion = 当前主线版本`，现有 start 固定 1，来源未定义 | C7 |
| IO-9 | 中 | 下游读模型未定义；按 `split_draft` 行存在判定会把 cancelled/confirmed 都当“已有方案” | C9 |

## Decision

**Pass**

理由: delta 与 proposal/requirements/fixtures 对齐，`openspec validate --strict` 通过，AC/DoV 9 项全 Pass，lint 无 BLOCKER/WARNING，阻塞型歧义为 0，**SA Leo 已具名签核**；**IO Emily 已于 2026-11-16 复核批准**修订包（2 ADDED + 5 MODIFIED / 49 场景），并批准契约错误枚举扩展（`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409、`SPLIT_DRAFT_INCOMPLETE` 409，共 **+3**）及 `error.details.routes[]` 明细形状，C1/C2 closed。IO 复核发现的 6 处契约缺口与 3 项实现口径风险转 C7–C11：其中 **C7 必须在 P3 design 定稿前以 delta 补丁落地**并复跑 `openspec validate --strict` 与 consistency-lint；C8/C9 随 P3 design 承接；C10 P4、C11 P5。C7–C11 全部 closed 前不得进入 P4 实现与 G2。不存在未批准的 blocking 歧义。

## Conditions + owners（remediation）

| # | 整改项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| C1 | IO 具名审核并批准修订包（2 ADDED + 5 MODIFIED / 49 场景） | IO（Emily） | 2026-11-16 复核 | **阻塞**（G1 升级 Pass） | **closed** |
| C2 | IO 具名批准契约错误枚举扩展：`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409、`SPLIT_DRAFT_INCOMPLETE` 409（共 +3）；明细容器 `error.details.routes:[{groupLabel,totalMinutes,overrunMinutes,missingInputs}]` | IO（Emily） | 2026-11-16 复核 | **阻塞**（G2 前必闭） | **closed** |
| C3 | P3 design 承接：无新迁移的单行三态状态机、条件更新 SQL 与事务边界（取消 = 状态 + 删 split 节点同事务）、confirmed 后写端点 `409 SPLIT_DRAFT_NOT_ACTIVE` 反向用例 | SA / Dev | P3 | 非阻塞承接 | 待 P3 |
| C4 | P3 承接 Screen 15：路线对/分组/边界/校验结论展示 + error/empty/loading/permission 四态 + confirmed/cancelled 终态 | Dev | P3 | 非阻塞承接 | 待 P3 |
| C5 | P5 归档：`tech-stack-plan` API 清单补 `:confirm`/`:cancel` 两行；living-merge 必须以 delta Purpose 覆盖旧链级约定（lint F4） | SA / Dev | P5 | 非阻塞承接 | 待 P5 |
| C6 | 清理残留 change 噪声：空壳 `req-004-split-draft-start`、未归档 `req-002-greeting-json-sqlite`（lint F2） | Dev | 可并行 | 非阻塞 | pending |
| C7 | P3 定稿前完成 delta 补丁：① D1b 改为 cancelled 返回 `routes=[]`（取消同事务清空 `document.routes`），CN1 增加投影断言；② 补 CN6-N（取消携带过期版本 → 409 `STALE_DRAFT_VERSION`，草稿仍 active）；③ 补 CF7-N（active 但缺路线/半边界 → 409 `SPLIT_DRAFT_INCOMPLETE`，含 `missing` 明细）；④ 定义 `error.details.routes[]` 形状；⑤ Screen 11 按 status 分支（active→下一步；cancelled→发起替换；confirmed→只读终态）并补场景断言；⑥ 明确 S8 `mainPlanVersion` 口径（本期恒为 1，R2 多版本再扩展）；复跑 `openspec validate --strict` 与 consistency-lint(p2) | SA / Dev | P3 design 定稿前 | **阻塞**（P4 前必闭） | **closed**（2026-11-16，P3 首步：delta 51 场景，`validate --strict` valid，lint 复跑 Pass，fixtures 同步） |
| C8 | P3 design：① confirm/cancel 使用状态 CAS（`WHERE draft_version=? AND document.status='active'`），保持列版本不变；② 重建同事务重置 `split_draft.draft_version=1`，以 `WHERE status='cancelled'` 条件更新，失败 409 `SPLIT_DRAFT_CONFLICT`；③ 补 S9-N 并发重建与 confirm/cancel 并发用例；④ 草稿时长模型改可空（`RouteDurations` 用 `Integer` 或显式 missing），使 CF3-N 可测 | SA / Dev | P3 | 非阻塞承接（P4 前必闭） | **closed**（2026-11-16 design D4/D5/D7/D8；S9-N 并发重建落 ATDD/Tasks 测试级用例） |
| C9 | P3 design：定义下游读模型（US-052/058/063）只读 `GET split-draft` 的 `status`，禁止按 `split_draft` 行存在判定“已拆分/已确认” | SA | P3 | 非阻塞承接 | **closed**（2026-11-16 design D13：下游只读 `status`） |
| C10 | P4：Screen 14/15 增加 `status` 门禁；确认/取消收到 409 时重新 GET 判定是否已成功（重试幂等 UX） | Dev | P4 | 非阻塞承接 | 待 P4 |
| C11 | P5：fixtures 投影字段对齐（`tripId` 去掉或 delta 明确加入）；proposal 夹具矩阵补 CN5/S9；`tech-stack-plan` 补两端点、3 个错误码与 `error.details`；`initiatorMemberId` 命名注（实为 `app_user.id`） | SA / Dev | P5 | 非阻塞承接 | 待 P5 |

> C1/C2 已 closed；**C7 已于 2026-11-16 P3 首步 closed**（delta 51 场景、validate valid、lint 复跑 Pass）；C8/C9 随 P3 design 承接；C3–C6、C10、C11 按阶段承接。C8–C11 未全部 closed 前**不得进入 P4 实现与 G2**。

## Approvers

- **SA = Leo**：**已签核**（2026-11-16，「开始生成g1」，对 2 ADDED + 5 MODIFIED / 49 场景 delta 记录批准）
- **IO = Emily**：**已签核**（2026-11-16，复核批准 C1/C2；批准 +3 错误码与 `error.details.routes[]` 形状；C7–C11 作为 P3/P4/P5 承接条件）

## Timestamp

- SA Leo 签核: 2026-11-16
- IO Emily 补签: 2026-11-16
- 记录生成: 2026-11-16T15:05+0800

## Next（non-Gate）

- **G1 = Pass** → 可启动 P3 `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist stage=p3`）。
- P3 首步必须完成 **C7** 的 delta 补丁并复跑 `openspec validate --strict` 与 consistency-lint；C3/C4/C8/C9 随 design/tasks 落实；C10 P4、C11 P5。
- **C7–C11 全部 closed 前不得进入 P4 实现与 G2**。
- 本记录不自动批准、不改 Delta Spec、不 merge Living Spec（C7 的 delta 修订由 P3 显式执行）。
