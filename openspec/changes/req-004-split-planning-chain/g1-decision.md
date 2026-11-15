# G1 decision — req-004-split-planning-chain

- Gate: **G1（Align）**
- 记录日期: 2026-11-15
- 状态: **Pass**（SA=Leo re-review 批准 + IO=Emily 批准，双具名签核针对同一修订 5-req/34 包，2026-11-15）
- 性质: 人工签核驱动的 Gate 决策记录；不自动批准、不改 Delta Spec、不 merge Living Spec

## Input artifacts

- Delta Spec: `specs/splits/spec.md`（**5 条 ADDED requirement / 34 场景**：start 9 / boundaries 7 / generation 6 / timing 7 / detail 5）
- AC/DoV 评审: `dov-ac-review.md`（Current correction：AC-1~4 / DoV-1~5 全 Pass，5 req/34；无 blocking Fail/Partial）
- 一致性 lint: `consistency-lint.md`（phase=p2；Current amendment：F1/F2/F5 resolved、F3 optional、F4 P3 handoff；`openspec validate --strict` 通过；historical Overall Partial）
- Proposal: `proposal.md`（G1 评审稿，5 端点；IO Emily approved 2026-11-15）
- 上游权威: REQ-004~007、`deep-dive.md` B 链段、`acceptance-test-fixtures.md` B 链段、`docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版）

## Check conclusions（findings）

- **Scope（范围）**: delta **5 requirement** ↔ proposal §Capabilities（4 业务 REQ + shared draft read）一一对应，无静默扩/缩；
  13 错误码全集逐一覆盖（GET 读取复用既有守卫码，不新增错误码）；US-049 确认 / US-050 取消端点显式排除；
  前端栈以展示契约场景承载（栈选择属设计决策，P3 承接）。
- **Ambiguity（歧义）**:
  - **F1**（分组齐全前置缺负向 AC）→ **resolved in spec**：G requirement 写明「Complete, disjoint A/B
    groups are a fixture-guaranteed defensive precondition in this slice」，invalid-group 负向随分组移动
    特性（out-of-scope）延后；与用户 2026-11-15 裁决一致。P3 design 续注明（C3）。
  - **F2**（proposal G1 顺序措辞倒置）→ **resolved**：proposal §下一步已改为 P2 delta/review → G1 → P3 顺序。
  - **F5**（stale v1→v2 示意张力）→ **resolved in spec**：G3-N 以「边界后实际版本 N 启动生成 + 并发边界
    重选 N+1」构造，stale N 不覆盖 N+1。
  - blocking OQ-1/2/3/4/5/7 全 resolved；非阻塞 OQ-N1/N7 deferred（owner 已指）。
  - F3（命名 Non-Goals 段）optional；F4（前端栈）P3 handoff——**Leo 2026-11-15 确认 shadcn/ui + Tailwind
    取代 OQ-N3 AntD5**（见 C4）。
- **Conflict（冲突）**: 无。「三表→四表」漂移已修正，全仓 grep 残留 = 0；身份守卫 identity→trip→membership
  （401/404/403）、draftVersion 语义、`{data,error}`、确认谓词、timing 算子零 I/O 跨产物一致；数值
  （105/110/125/超 5、窗口 120）与夹具吻合；Living `greeting` 不被触碰（R2 独立 debt）。

## Decision

**Pass**

理由: 修订包（5 req/34）spec 对齐完成、F1/F2/F5 resolved、0 BLOCKER、AC/DoV 全 Pass、
`openspec validate --strict` 通过；**IO Emily 已批准修订包（2026-11-15）**，**SA Leo 审阅
修订摘要后显式 re-review 批准（2026-11-15，「确定，继续 p3」）**。IO + SA 双具名签核
针对同一修订 5-req/34 包成立，C1/C2 均 resolved，满足 G1 硬约束，故记 **Pass**。
F1/F2/F5 已 resolved，不存在「Pass 带未解歧义」之禁止情形。

## Conditions + owners（remediation）

| # | 整改项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| C1 | IO 具名审核并批准修订包（5 req/34） | IO（Emily） | push 后 | 阻塞（G1 Pass） | **resolved**（Emily 批准 2026-11-15） |
| C2 | SA Leo 对修订契约（GET 读取 / 统一守卫 / F1·F5 入 spec）显式 re-review 并签核 | SA（Leo） | 审阅修订摘要后 | **阻塞**（G1 Pass） | **resolved**（Leo re-review 批准 2026-11-15） |
| C3 | P3 design 注明「分组齐全为防御性前置，负向随分组移动延后」（F1 已入 spec，design 续承） | SA / Dev | P3 | 非阻塞承接 | 待 P3 |
| C4 | P3 design 承接前端栈 **shadcn/ui + Tailwind**（Leo 确认取代 OQ-N3 AntD5）+ TS/TanStack Query v5/React Router 7；stale 以 N→N+1 构造（F5 已入 spec）；proposal/KB 口径 P5 同步 | SA / Dev | P3 / P5 | 非阻塞承接 | 待 P3 |

> C1（IO）/ C2（SA re-review）均已 resolved，G1=Pass；C3/C4 为非阻塞 P3 承接项。

## Approvers

- **SA = Leo**：修订 5-req/34 包 re-review **已批准**（2026-11-15，审阅修订摘要后「确定，继续 p3」）；旧 4-req 包签名仅历史
- **IO = Emily**：已批准修订 5-req/34 包（2026-11-15，per explicit user instruction）

## Timestamp

- SA 旧包签核: 2026-11-15（历史，针对旧 4-req 包）
- IO 修订包批准: 2026-11-15（Emily）
- SA 修订包 re-review: 2026-11-15（Leo 批准，C2 resolved，G1 升级 Pass）

## Next（non-Gate）

- **G1=Pass** → 进入 P3 `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- **P3 已确认裁决**：前端 **shadcn/ui + Tailwind**（取代 AntD5，保留 TS/Query v5/Router 7，视觉锚
  `ui-design-reference/`）；**NFR 测试 defer**（OQ-N7，ATDD 仅 API+E2E，UT 延后 P4）。
- C3/C4 非阻塞 P3 承接项随 design/tasks 落实；本记录不自动批准、不改 Delta Spec / 不 merge Living Spec。