# G1 decision — us-003-edit-trip-basics

- Gate: G1 (Align)
- Timestamp: 2026-11-17（草稿，+08:00）
- Branch: `US-003-edit-trip-basics`（基于 `group1/main` `42a9239`；PR #120 已开，当前仅含规划产物）
- **Status: Pending — 待 IO / SA 具名签署，本记录尚不构成 G1 Pass**

## Inputs

- Proposal: `openspec/changes/us-003-edit-trip-basics/proposal.md`
- Design: `openspec/changes/us-003-edit-trip-basics/design.md`（D1–D8）
- Delta Spec: `openspec/changes/us-003-edit-trip-basics/specs/trips/spec.md`（2 ADDED requirements / 27 场景）
- Delta Spec: `openspec/changes/us-003-edit-trip-basics/specs/auth/spec.md`（1 MODIFIED requirement / 13 场景，全文携带）
- Cross-change scan: `openspec/changes/us-003-edit-trip-basics/cross-change-scan.md` — 脚本 BLOCKER 3 / WARNING 1；SA 复核 A1–A3 判为启发式误报（auth delta 纯 UI），W1 待签；A4 既有漂移不在范围
- OpenSpec 校验：`openspec validate us-003-edit-trip-basics --strict` = valid（deltaCount = 2）
- Requirement source: GitHub issue #60（US-003 合并版 AC 为权威；US-004 #61 / US-005 #62 / US-006 #63 / US-007 #64 已作重复项关闭）；本地 `requirement-workspace/requirements/story-detail-iteration-1.md` §US-003–US-007 为旧拆分口径，留作历史
- 用户裁决（2026-11-17）：① 编辑方案按推荐（整表单 PUT、403/409 分界、起终点可清空、详情页条件入口）；② 我的页名字编辑改按钮触发；③ 方案 B：两件事合并为一个 change
- 相邻锁定语义：US-016（仅组织者可改）/ US-017（确认后锁定）未单独立项，由本 change 守卫场景覆盖

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：`trips` +2 ADDED（更新端点 + 详情页编辑入口）；`auth` 1 MODIFIED（仅 My Account 布局句与 layout scenario，API/会话/CSRF/校验逐字保留）。零迁移、零新依赖、不改 SecurityConfig、不改既有端点语义；organizerId 与确认态不可经本端点修改 |
| Ambiguity | 用户已裁决四项取舍（PUT 整表单 / 409 锁定语义 / 起终点可清空 / 条件入口）与方案 B 合并；design D1–D8 固化。开放项仅剩角色具名与新码批准（见 Conditions） |
| Conflict | ① auth Living 明文锁定常驻名字表单 → 已以 MODIFIED 全文收敛，非静默改代码。② Living trips 两处历史措辞漂移（确认操作禁令、列表 read-only 场景）→ 记录于 proposal 与扫描轴 6，不在本 change 修。③ 旧需求文件拆分口径与 issue #60 合并口径 → 以 issue 为准，扫描轴 1 登记 |
| Verifiability | 40 条场景（trips 27 + auth 13）全部为可观察结果（HTTP 状态/码、字段集、路由、入口可见性、编辑态开合、文案）；后端 API 测试先红后绿，前端纯逻辑 node:test + 浏览器 E2E |
| Residual | App.tsx parseRoute 与 us-067 共享，后合者负责路由顺序 rebase（扫描轴 7）；registry.md US-003 行待 tasks 6.2 登记 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| IO | 待具名 | 待签 | — |
| SA | 待具名 | 待签 | — |

代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pending

Rationale：产物与扫描输入齐备、strict 校验通过；G1 达成尚缺 IO 对新错误码与 delta 的具名签核、SA 对 W1（身份横切误报豁免）的具名签署。

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | 新错误码 `NOT_ORGANIZER` 403 / `MAIN_PLAN_CONFIRMED` 409 批准（扫描轴 4） | IO（待具名） | G1 签署时 | open |
| C2 | W1 签署：auth delta 纯 UI，豁免 main-itinerary/preferences/splits 身份横切覆盖（扫描 A1–A3 误报）；delta 触及身份/API 契约即失效 | SA（待具名） | G1 签署时 | open |
| C3 | IO / SA / VL 具名角色分配（角色按 change 轮换） | 用户 | G1 签署前 | open |
| C4 | IO 对 trips 2 ADDED + auth MODIFIED 全文与 issue #60 AC 逐条复核签署 | IO（待具名） | G1 签署时 | open |