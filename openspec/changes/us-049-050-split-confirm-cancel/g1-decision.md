# G1 decision — us-049-050-split-confirm-cancel

- Gate: **G1（Align）**
- 记录日期: 2026-11-16
- 状态: **Conditional**（SA = Leo 已具名签核；IO = Emily 待补签 → C1/C2 阻塞整改项）
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

## Check conclusions（findings）

- **Scope（范围）**: delta 的 2 ADDED（确认 / 取消）+ 5 MODIFIED ↔ proposal §What Changes 的六组变更点，无静默扩/缩；5 条 MODIFIED 全部属于同一条「链级约定纠偏」的落地形态（身份头 `X-Member-Id`→`X-User-Id`、草稿载体 `trip.split_draft` 列→`split_draft` 表、迁移编号 V2→V4、活跃态写入拒绝），proposal 已在本会话补充该落地形态说明（DoV-1 依据）。新增场景仅 S8、D1b 两个。
- **Ambiguity（歧义）**:
  - **BQ-1**（打包粒度）→ **resolved**：单 change 含 049+050（用户 2026-11-16）。
  - **BQ-2 / OQ-N7**（确认时如何消费校验结论）→ **resolved**：服务端从草稿文档复算（复用 `ReunionTimingCalculator`），客户端 `confirmable` 不参与；对应 CF2-N 125/120 用例。
  - **BQ-3**（取消与 `trip_id UNIQUE`）→ **resolved**：`status='cancelled'` + 同行重建（`draftVersion` 重置 1），无新迁移；对应 CN1、S8。
  - **BQ-4**（Living Spec 漂移）→ **resolved**：本 delta 以 MODIFIED 收敛，Purpose 重写链级约定。
  - **BQ-5/6/7/8** → resolved（新增 `NOT_SPLIT_ORGANIZER`；confirmed 仍可读；取消删除 split 节点；两端点 body = `{draftVersion}`）。
  - **BQ-9**（确认记录保留期 / SLA）→ **deferred**（owner Dev，非阻塞）。
  - blocking open questions 未解决数 = **0**；DoR BLOCKER = **0**。
- **Conflict（冲突）**: 无。身份守卫序（identity → trip → membership，401/404/403）、`draftVersion` 语义（确认/取消不改版本）、`{data,error}` 包封套、状态机三态（`active`/`confirmed`/`cancelled`）、数值（A 105 / B 110 / 超窗 125 超 5、窗口 120）在 requirement、delta、fixtures、deep-dive、proposal 五处一致；既有 greeting / trips / invitations / main-itinerary 契约不受影响；SQLite 与 Flyway 无新增迁移，不与 main 现有 `V1–V5` 冲突。

## Decision

**Conditional**

理由: delta 与 proposal/requirements/fixtures 对齐，`openspec validate --strict` 通过，AC/DoV 9 项全 Pass，lint 无 BLOCKER/WARNING，阻塞型歧义为 0，**SA Leo 已具名签核**；但 **IO Emily 尚未对修订包具名批准**，且本次 delta 扩展了契约错误枚举（+2 码）—— 该扩展按项目惯例须由 IO 具名批准。因此不满足 G1 Pass 的双签核硬约束，记 **Conditional**，并把 IO 具名批准列为阻塞整改项（C1/C2）。不存在「Pass 带未解歧义」情形。

## Conditions + owners（remediation）

| # | 整改项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| C1 | IO 具名审核并批准修订包（2 ADDED + 5 MODIFIED / 49 场景） | IO（Emily） | P4 实现开始前；G2 前必须 closed | **阻塞**（G1 升级 Pass） | pending |
| C2 | IO 具名批准契约错误枚举扩展：`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409（明细 `totalMinutes`/`overrunMinutes`/`missingInputs`） | IO（Emily） | 同 C1 一次签核可合并 | **阻塞**（G2 前必闭） | pending |
| C3 | P3 design 承接：无新迁移的单行三态状态机、条件更新 SQL 与事务边界（取消 = 状态 + 删 split 节点同事务）、confirmed 后写端点 `409 SPLIT_DRAFT_NOT_ACTIVE` 反向用例 | SA / Dev | P3 | 非阻塞承接 | 待 P3 |
| C4 | P3 承接 Screen 15：路线对/分组/边界/校验结论展示 + error/empty/loading/permission 四态 + confirmed/cancelled 终态 | Dev | P3 | 非阻塞承接 | 待 P3 |
| C5 | P5 归档：`tech-stack-plan` API 清单补 `:confirm`/`:cancel` 两行；living-merge 必须以 delta Purpose 覆盖旧链级约定（lint F4） | SA / Dev | P5 | 非阻塞承接 | 待 P5 |
| C6 | 清理残留 change 噪声：空壳 `req-004-split-draft-start`、未归档 `req-002-greeting-json-sqlite`（lint F2） | Dev | 可并行 | 非阻塞 | pending |

> C1/C2 阻塞 G1 升级为 Pass；在 C1/C2 closed 之前，P3（设计）可在跟踪下启动，但**不得进入 P4 实现与 G2**。

## Approvers

- **SA = Leo**：**已签核**（2026-11-16，「开始生成g1」，对 2 ADDED + 5 MODIFIED / 49 场景 delta 记录批准）
- **IO = Emily**：**待补签**（C1、C2；本次未取得具名批准，不代签）

## Timestamp

- SA Leo 签核: 2026-11-16
- IO Emily 补签: pending
- 记录生成: 2026-11-16T15:05+0800

## Next（non-Gate）

- **G1 = Conditional** → 可启动 P3 `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist stage=p3`），C3/C4 随 design/tasks 落实。
- P4 / G2 之前必须 closed C1、C2（IO 具名批准 + 枚举扩展批准）。
- 本记录不自动批准、不改 Delta Spec、不 merge Living Spec。
