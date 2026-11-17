# G1 decision — us-071-my-trips

- Gate: G1 (Align)
- Timestamp: 2026-11-16（记录时间，+08:00）；2026-11-17 IO 复核并具名补签
- Branch: `main`（用户 2026-11-16 裁决：main 直开发、无特性分支/PR）。实际落库路径为 `feat/travel_preference` 分支经 PR #50 合入 main（`81af3d1`），与上述裁决的执行方式不一致；本记录如实登记该过程偏差，不改变门禁结论

## Inputs

- Proposal: `openspec/changes/us-071-my-trips/proposal.md`
- Delta Spec: `openspec/changes/us-071-my-trips/specs/trips/spec.md`（1 ADDED requirement / 9 场景）
- Delta Spec: `openspec/changes/us-071-my-trips/specs/app-shell/spec.md`（1 MODIFIED requirement / 12 场景）
- AC/DoV review: `openspec/changes/us-071-my-trips/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass；2026-11-17 IO 复核补记）
- 相邻已交付资产：US-072（`openspec/changes/archive/2026-11-16-us-072-trip-detail-main-plan-entry/`，Living `trips` requirement "Trip detail main-plan navigation entry"，E2E `docs/feedback/e2e-us-072.md` E1–E7 Pass）
- 被取代的验收基线：`docs/feedback/verification-req-005.md` TR2–TR5、`requirement-workspace/requirements/REQ-005.md` S5/OQ-1
- OpenSpec 校验：`openspec validate us-071-my-trips --strict` = valid（deltaCount = 2）
- Requirement source: `requirement-workspace/requirements/US-071.md`（DoR：`analysis/us-071-dor.md`，BLOCKER = 0）
- Deep-dive: `requirement-workspace/deep-dive.md` §US-071（⑨–⑫ 全 Pass，A0 Pass）
- Impact brief: `requirement-workspace/impact-brief.md` §US-071
- Story: GitHub issue #45（`Iteration 1`、`Priority - Must`、`Type - Trip Setup`）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：`trips` 新增 1 条只读列表读取（成员范围、包封套、排序契约）；`app-shell` 修改 1 条行程 tab 放置要求（tab 恒落 `#/trips`、空态只留创建入口、行程内返回链接保留行程上下文）。详情页「主线方案」入口由 US-072 拥有，本变更只声明「不新增第二个入口、既有入口保持可达」。零迁移、零新依赖、不改 `SecurityConfig`、不改既有四个 trip 端点 |
| Ambiguity | blocking 开放问题未 resolved = 0；九项裁决已固化（tab 落点、端点形状、已结束呈现、移除编号入口、主线入口、不做分页/搜索、显示「我创建的」徽标、手写 `api()`、AC7 仅 API 层验收） |
| Conflict | ① `app-shell` 原 requirement 明文写着「本变更 SHALL NOT 新增列出全部行程的端点或调用」，且空态要求「创建行程 + 按编号打开行程」，与本故事 AC1 直接冲突 → 已以 MODIFIED 收敛（旧禁令删除、编号入口移除）。② 详情页主线入口原作为本故事 OQ-8 交付物，实际已由 US-072（同日 21:22 归档）交付 → 复核后将 S13 与 app-shell 条款改为「回归验证既有入口、不新增第二个入口」，消除两个 capability 同时拥有同一行为的双权威。③ 本变更会推翻 REQ-005（US-064）TR2–TR5 四条已 Pass 的验收口径 → 已在 proposal 增 `Supersedes` 行并记入 Residual，归档时以 Living Spec 为准 |
| Verifiability | 21 条场景（trips 9 + app-shell 12），全部为可观察结果（HTTP 状态、字段集、路由、行内徽标、重试动作、返回链接落点）；AC/DoV 复核发现的两处覆盖缺口（S8 loading/失败重试、S13 详情页主线入口）已补场景，IO 复核新增「行程内返回链接保留行程上下文」与「已结束日期不改变任何行为」两条场景 |
| Residual | 见下方「Residual notes」，均为非阻塞承接项 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-16 |
| IO | Emily | **Pass** | 2026-11-17 |

SA 的 Pass 按用户 2026-11-16 的指令代记（用户本人担任 SA，签核名 Leo）；IO 的 Pass 为用户 2026-11-17 以 IO 身份复核本记录、两份 delta 与 `dov-ac-review.md` 后明确给出（「没什么其他问题就 pass 让 SA 实现」）。代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pass

Rationale：IO 复核提出的两项业务级冲突已在本次文档修订中关闭（US-072 重复范围 → 改为回归验证；REQ-005 验收基线 → 显式 supersede），两项口径问题已固化为 delta 文本（行程内返回链接保留行程上下文）与 Residual（已结束仅展示、排序按既有裁决）。SA 已于 2026-11-16 Pass，IO 于 2026-11-17 具名 Pass，G1 达成。

## IO 复核记录（2026-11-17）

| # | 复核项 | 严重度 | 处置 |
|---|---|---|---|
| IO-1 | 详情页主线方案入口与已归档 US-072 重复，`trips` 与 `app-shell` 同时拥有同一行为 | 阻塞 | 已关闭：`proposal.md` 改为「不重复实现、仅回归」；app-shell delta 中该场景改为「既有入口保持可达、不新增第二个入口」（保留原场景名不改，避免 MODIFIED 丢场景） |
| IO-2 | 本变更使 REQ-005（US-064）TR2/T3/T4/T5 四条已 Pass 的验收口径静默失效 | 阻塞 | 已关闭：proposal 增 `Supersedes` 行（逐条点名 TR2–TR5 与 REQ-005 S5/OQ-1）；归档时以 Living Spec 为准 |
| IO-3 | `tripsHref` 收敛为 `#/trips` 会让成员名册「返回行程」丢掉当前行程上下文 | 中 | 已关闭：app-shell delta 增「行程内返回链接保留行程上下文」条款与场景；`proposal.md` Impact 与 What Changes 同步 |
| IO-4 | 「已结束」仅有展示语义，与邀请 `JOINING_CLOSED` 规则不同步；列表按 `start_date` 升序会把已结束行程排在首屏 | 中 | 已关闭：trips delta 新增场景「A finished end date changes no behaviour」（已结束 → 仍返回、无服务端状态、邀请/主线/分队行为不变）；排序保持用户 2026-11-16 裁决的 `start_date` 升序并记为 P3 验收项 |

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | IO Emily 对本期 delta 与 `dov-ac-review.md` 具名签核（push 后补签） | Emily（IO） | P3 开工前 | **closed 2026-11-17** |
| C2 | 消除与 US-072 重复的主线入口范围，避免第二个入口 | Emily（IO）/ Leo（SA） | P3 开工前 | **closed 2026-11-17**（delta 与 proposal 已改） |
| C3 | 显式声明取代 REQ-005 TR2–TR5 验收口径 | Emily（IO） | P3 开工前 | **closed 2026-11-17**（proposal `Supersedes` + Residual） |

C1–C3 全部关闭，Decision = `Pass`；后续任何 delta 语义变化都需重开本记录。

## Residual notes（非阻塞，承接至 P3/P4）

- 标题撞名：`frontend/src/pages/Home.tsx` 的仪表盘页标题现为「我的行程」，与新列表页标题同名，违反 app-shell「每个 tab 页唯一可见标题」；P3 定文案（建议列表页「我的行程」、Home 改「仪表盘」）。Home 改名须同步仍开放的 `us-067-qr-scanner` delta（其场景把首页称作 "Home `我的行程` dashboard"）。
- AC7（切换账号）只在 API 层验收（两个独立会话互不可见）；UI 层补测归 US-069（issue #41，看板 Req Analysis，elian-jiang 认领）。
- `acceptance-test-fixtures.md` 尚无 §US-071；P3 ATDD 设计必须补（列表行、排序、双 401、空账号、已结束行程、成员名册返回链接）。
- SA：排序契约（`start_date` 升序 → `id` 升序）须在集成测试中锁定。业务后果已知：已结束的旧行程排在前、最近行程排在后面，本期按用户裁决接受；若 P4/E2E 发现首屏可用性不足，另立「未结束优先」的排序变更（不在本变更扩范围）。
- 「已结束」为前端本地日期判定，仅显示层语义（trips delta 已新增对应场景），不改变邀请加入、主线方案、分队的任何能力；跨时区差异接受。
- 排序、已结束、成员名册返回链接三项须在 P3 的 E2E/集成用例中显式断言，避免实现漂移。
- 技术栈偏离：列表用手写 `api()` + `useEffect`（用户裁决），与 `tech-stack-plan` 计划的 TanStack Query 不一致，已记录在 proposal，不在本变更迁移。
- 过程偏差：本变更文档未走「main 直开发」而是经 PR #50 进入 main，且在 C1 未关闭时将 Conditional 记录合入；后续 change 建议在 G1 关闭后才合入门禁记录。

## Closure path

G1 **Pass** → 进入 `/sdd:atdd-design` + `/sdd:task-plan`（P3），再进 P4 实现。若实现阶段发现 delta 需要语义变化，回到 `/sdd:delta-craft` 修补后重开本记录；不得以已关闭的 C1–C3 覆盖新增业务级问题。

## Revision re-review（2026-11-17，当前行程模型）

- 触发：用户 2026-11-17 范围修订（裁决 R2-1…R2-4，见 `requirements/US-071.md` §Revision）。
- delta 变化：`trips` 新增 ADDED「Current trip selection」（8 场景）；`app-shell` 由 MODIFIED 改为 **REMOVED「Trips tab placement and no-trip empty state」+ ADDED「Current trip tab and my-trips list」**（10 场景）；新增迁移 V8。
- 原 G1 Pass（SA Leo 2026-11-16、IO Emily 2026-11-17）覆盖原范围；Revision 部分经 IO/SA 复审后于 2026-11-17 补签 **Pass**（见下）。
- 已完成的 Revision 规格工作：`requirements/US-071.md` §Revision、`proposal.md` §Revision、`design.md` DD14–DD19、`tasks.md` 组 8/9 + Revision 对齐自检 Pass；`openspec validate --strict` = valid。

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C4 | IO Emily + SA Leo 对 Revision delta / design 复审并具名签核 | Emily（IO）/ Leo（SA） | 合并 PR 前 | **closed 2026-11-17** |

### Revision 签核区

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-17 |
| IO | Emily | **Pass** | 2026-11-17 |

签核按用户 2026-11-17 指令代记（「IO 和 SA 已经审核过了，直接签名」）；代理不独立核实签署人身份，也不代替签署人判断。

**Revision Decision: Pass** —— C4 关闭，与原 G1 Pass 合并生效；Revision 范围（当前行程模型、选择交互、原型视觉、已结束排序）获准进入合并与归档流程。
