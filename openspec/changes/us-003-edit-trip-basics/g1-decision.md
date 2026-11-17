# G1 decision — us-003-edit-trip-basics（IO + SA Pass）

- Gate: G1 (Align)
- Timestamp: 2026-11-17（+08:00）
- Branch: `US-003-edit-trip-basics`（基于 `group1/main` `42a9239`；PR #120，含规划产物）
- 状态：**IO Pass（Leo）+ SA Pass（Emily），均 2026-11-17**；G1 Decision = **Pass**
- 说明：本记录取代 2026-11-17 早先的 Pending 草稿；用户当日作出新一轮业务裁决，delta 已按裁决重写。

## Inputs

- Proposal: `openspec/changes/us-003-edit-trip-basics/proposal.md`
- Design: `openspec/changes/us-003-edit-trip-basics/design.md`（D1–D17）
- Delta Spec: `specs/trips/spec.md`（2 ADDED：Trip basic info update / Trip detail edit entry）
- Delta Spec: `specs/main-itinerary/spec.md`（3 MODIFIED：Draft review with computed staleness / Validation-gated confirmation / Authorization and identity for main-plan operations；2 ADDED：Main plan stop editing / Plan invalidation prompts）
- Delta Spec: `specs/invitations/spec.md`（2 MODIFIED：Invitation preview / Invitation acceptance and joining）
- Delta Spec: `specs/splits/spec.md`（1 ADDED：Confirmed split cancellation，US-051）
- Delta Spec: `specs/auth/spec.md`（1 MODIFIED：Account profile and display name，仅 UI 布局与编辑交互）
- Cross-change scan: `cross-change-scan.md` — 手工九轴 BLOCKER 0 / WARNING 2 / WAIVER 1（A2 preferences 误报 W1；A4 splits 既有漂移）
- Waiver: W1 by Emily (SA), scope=preferences identity no-op, expiry=delta 触及 preferences 身份/API 契约即失效
- OpenSpec 校验：`openspec show --json --deltas-only` = deltaCount **11**，结构与场景全部解析；`validate --strict` 退出 1 **仅**因 5 条 ADDED requirement 文本 >500 字符（既有 Living Spec 同类 WARNING，无结构错误/缺失场景）
- Requirement source：issue #60（历史）+ 本地 `story-detail-iteration-1.md` US-003~007 / US-016~018 / US-051 + **2026-11-17 用户裁决（权威）**；主线 stop 编辑由同日并行裁决并入，issue #60 / PR #120 正文同步情况待核验
- 代码基线：`TripController`/`TripRepository`/`MainPlanService`/`MainPlanRepository`/`InvitationRepository`/`SplitDraft*`/`TripDetails`/`MainPlan`/`Join`/`screen-confirm` 均存在；V9 紧随 V8
- 角色：IO Leo / SA Emily（用户 2026-11-17 指定；SA 按角色轮换代记）
- Story：issue #60（US-003，OPEN）；合并来源 #61–#64 已 CLOSED；US-051 此前未实现，本 change 补齐

## 用户裁决（2026-11-17，权威）

1. **确认后仍可编辑**：所有行程成员可改规划字段（目的地/日期/起终点），名称仍仅组织者。
2. **主计划退回待重生成**：规划字段变化使确认态归零、确认草稿 superseded、未确认草稿 stale；必须重新生成并重新确认。
3. **加入保持关闭**：首次确认后 `joiningClosed` 永久关闭，不因编辑/重生成重新开放。
4. **分队需先取消**：`active` 草稿由发起人取消（US-050）；`confirmed` 分队由组织者取消（本 change 补 US-051）。
5. **双弹窗**：保存规划变更前提示方案过期/分队需取消；确认主线前若 stale 提示重新生成。
6. **确认入口收口**：详情页确认按钮/旧端点仅组织者可见可用，并委托校验式确认。
7. **My Account 名字编辑按钮化**（方案 B 并入本 change）。
8. **主线 stop 编辑**：主线生成后，组织者可在未确认草稿上编辑单个 stop 的地点名与起止时间；先存后验，重生成整份替换并丢弃手动编辑；US-075 的延迟/跳过/替换与通知不在范围。

## Supersedes

- 取代 US-003/004/005/006/007 的「主线确认后拒绝修改」AC；以本 delta 的「确认后可改、改后主计划待重生成」为准。
- 取代 US-016 对规划字段的组织者独占；名称仍仅组织者（US-016 对名称继续有效）。
- 取代 US-017 的「确认后基本信息不变」；改为「确认信息可编辑但触发主计划失效/重新确认」。
- 细化 US-018：加入在首次确认后关闭并保持关闭，`mainPlanConfirmed` 归零不再重新开放。
- 补 US-051：已确认分队取消入口从「未实现」变为本 change 的 ADDED requirement。
- 新增主线 stop 编辑：用户 2026-11-17 裁决把“主线方案生成后活动地点/时间可编辑”并入同一 story；只编辑未确认草稿的 name/start/end，先存后验；不改 US-036 的“重生成整份替换”语义，手动编辑在重生成时丢弃；US-075 的延迟/跳过/替换+通知仍不在范围。
- issue #60 与 story-detail 旧文本保留为历史；PR #120 正文须贴出上述取代声明。

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：5 个 capability（trips 2 ADDED、main-itinerary 3 MODIFIED + 2 ADDED、invitations 2 MODIFIED、splits 1 ADDED、auth 1 MODIFIED）；V9 单迁移（`joining_closed` + `trip_basics_json`）；新增 6 个错误码（3 个 trips/splits 分队、3 个 mainplan stop）；删除无守卫 `confirmMainPlan` 写路径；stop 编辑仅组织者/未确认草稿；不改偏好/成员/邀请发放身份语义。 |
| Ambiguity | 用户已裁决全部 blocking 项：全员规划字段、名称组织者、确认后编辑、主计划失效、加入保持关闭、分队先取消（补 US-051）、双弹窗、确认入口收口、主线 stop 编辑。无未解决 blocking 开放问题。 |
| Conflict | ① 旧 US-003~007/016/017/018 与新裁决字面冲突 → 已在 proposal/G1 显式 Supersedes。② Living trips「不暴露确认操作」与列表 read-only 措辞为既有漂移，记录不修。③ splits `X-Member-Id` 漂移为既有（A4）。④ 旧 confirmed split 无取消入口 → 本 change 补 US-051。⑤ 加入原本绑 `main_plan_confirmed`，归零会重开 → 新增 `joining_closed`。⑥ stop 编辑与重生成/确认校验冲突 → 先存后验、重生成整份替换并提示丢弃手动编辑，US-036/G5 语义不变。⑦ 脚本扫描工具链不在仓 → 手工九轴 + Residual。 |
| Verifiability | 112 条场景（trips 35 + auth 13 + main-itinerary 46 + invitations 10 + splits 8）全部为可观察结果：HTTP 状态/码、字段、`mainPlanConfirmed`/`joiningClosed`、stale、draft status、stop 投影、`plan_node` 行数、路由/入口可见性、弹窗开合、分队状态。后端 API 测试先红后绿；前端纯逻辑 node:test + E2E。 |
| Residual | 见下方「Residual notes」，均为非阻塞承接项。 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| IO | Leo | **Pass** | 2026-11-17 |
| SA | Emily | **Pass** | 2026-11-17 |

IO Pass 为用户 2026-11-17 以 IO 身份明确给出（「根据建议和我的决定签署g1，并且pass」）；SA Pass 按用户同日指定（角色轮换，签核名 Emily）代记。代理不独立核实签署人身份，也不代替签署人判断；若签署人身份有误，需重开本记录。

## Decision: Pass

理由：产物与扫描输入齐备；用户裁决已全部落入 5 个 delta；旧口径冲突已显式 Supersedes；错误码、迁移号、身份横切与共享面均已复核；剩余项均为 P3/P4 承接或既有漂移，不构成 blocking。G1 Align 达成。

## IO 复核记录（2026-11-17）

| # | 复核项 | 严重度 | 处置 |
|---|---|---|---|
| IO-1 | 旧详情按钮/端点任何成员可置 `main_plan_confirmed`，伪造确认态锁死基本信息 | 阻塞 | **closed**：main-itinerary D7 + tasks 3.4——按钮仅组织者、端点委托 `MainPlanService.confirm`、删除 `TripRepository#confirmMainPlan`；delta 增组织者/无草稿/stale/校验场景 |
| IO-2 | 规划字段修改不使旧主线草稿失效，可能确认旧目的地/旧日期方案 | 阻塞 | **closed**：V9 `trip_basics_json` + main-itinerary MODIFIED；快照（目的地/日期/起终点，不含名称）纳入 stale；确认 409 `STALE_DRAFT` |
| IO-3 | 「新增两码」表述错误（`NOT_ORGANIZER` 既有）；`MAIN_PLAN_CONFIRMED` 与既有码族重叠 | 中 | **closed**：修正为复用 `NOT_ORGANIZER`；不再使用 `MAIN_PLAN_CONFIRMED`；新增 `SPLIT_DRAFT_ACTIVE`/`SPLIT_CONFIRMED`/`SPLIT_ALREADY_DEPARTED`；C1 批准 |
| IO-4 | auth UI 变更搭车 US-003，缺独立需求追溯 | 中 | **closed（accepted）**：用户方案 B 明确并入；auth delta 仅 UI，13 场景 = 旧 8 + 新 5；W1 覆盖 preferences 误报 |
| IO-5 | cross-change-scan 脚本/模板/规则不在仓库，扫描不可复现 | 中 | **carried**：手工九轴 + 本文记录；工具链缺口入 Residual，非阻塞（US-082 同口径） |
| IO-6 | issue #60 私有不可核验，本地 US-003 文件仍是旧拆分 | 中 | **closed（superseded）**：以用户 2026-11-17 裁决为准；PR #120 正文须贴 Supersedes；registry 在 P4 补记 |
| IO-7 | 已确认分队无取消入口，「分队需先取消」不可执行 | 阻塞 | **closed**：本 change 补 US-051（组织者、出发前、版本校验、恢复主线、可重建）；splits delta 8 场景 |
| IO-8 | 加入关闭绑 `main_plan_confirmed`，编辑归零会重新开放加入 | 阻塞 | **closed**：V9 `joining_closed` + invitations 2 MODIFIED；首次确认置 1 且永不归零；预览/accept 以 `joiningClosed` 判定 |
| IO-9 | 确认后可编辑会让拆分/加入/分队级联失控 | 高 | **closed**：已确认规则——规划变更需先无 active/confirmed 分队；确认态归零；加入保持关闭；US-051 提供取消入口 |
| IO-10 | 非组织者改名称、名称-only 误触发方案失效 | 中 | **closed**：名称仅组织者（403 `NOT_ORGANIZER`）；快照不含名称，名称-only 不动主计划/草稿/加入 |
| IO-11 | 主线 stop 编辑缺失；编辑与确认/重生成的接缝未定义 | 高 | **closed**：本 change 新增 `PUT /main-plan/stops/{seq}`（组织者、未确认草稿、name/start/end、不 bump version/不改 stale）；跨 stop 冲突仍由确认 422 把关；重生成整份替换并提示丢弃手动编辑；新增 3 码 |

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | 批准新码 `SPLIT_DRAFT_ACTIVE` 409、`SPLIT_CONFIRMED` 409、`SPLIT_ALREADY_DEPARTED` 409、`STOP_NOT_FOUND` 404、`INVALID_TIME` 400、`INVALID_TIME_RANGE` 400；复用 `NOT_ORGANIZER`/`STALE_DRAFT`/`ALREADY_CONFIRMED`/`NO_DRAFT`/`SPLIT_DRAFT_NOT_ACTIVE`/`STALE_DRAFT_VERSION`/`NOT_SPLIT_ORGANIZER`/`NAME_REQUIRED`；不再使用 `MAIN_PLAN_CONFIRMED` | Leo（IO） | G1 签署时 | **closed 2026-11-17** |
| C2 | W1：preferences 身份横切误报豁免（auth delta 纯 UI，preferences 零变化） | Emily（SA） | G1 签署时 | **closed 2026-11-17** |
| C3 | IO / SA 具名角色分配 | 用户 | G1 签署前 | **closed 2026-11-17**（IO Leo / SA Emily） |
| C4 | IO 对 5 个 capability / 11 个 delta 与用户裁决逐条复核签署 | Leo（IO） | G1 签署时 | **closed 2026-11-17** |
| C5 | 确认入口收口（组织者可见可用 + 委托校验 + 删除无守卫写路径） | Dev | P4 | **closed（G1 口径已落；P4 实现）** |
| C6 | 主计划失效：V9 快照 + stale + 保存前/确认前弹窗 | Dev | P4 | **closed（G1 口径已落；P4 实现）** |
| C7 | 加入保持关闭：`joiningClosed` 解耦 + 邀请 delta | Dev | P4 | **closed（G1 口径已落；P4 实现）** |
| C8 | 分队门禁 + US-051 取消入口 | Dev | P4 | **closed（G1 口径已落；P4 实现）** |
| C9 | cross-change-scan 工具链补仓或注明来源 | SA / 用户 | P4 前 | **carried（非阻塞）**：已手工九轴并注明 |
| C10 | PR #120 正文补 Supersedes 与新增 scope；registry/handoff 更新 | Dev / SA | P4 | **carried（非阻塞）** |
| C11 | 主线 stop 编辑：端点/守卫/三码、先存后验、重生成丢弃手动编辑、MainPlan per-stop 入口 | Dev | P4 | **closed（G1 口径已落；P4 实现）** |

## Residual notes（非阻塞，承接至 P3/P4）

- **迁移/构造器**：V9 新增列后，`TripResponse`/`InvitationPreview`/`MainPlanRepository.DraftRow` 构造器变化会波及大量既有测试；P4 先改夹具再补新用例。
- **加入门禁替换**：全局搜索所有以 `main_plan_confirmed` 判断加入的代码（后端 invitation + 前端 Join/InvitationPanel），统一改读 `joining_closed`；遗漏即回归缺陷。
- **旧草稿兼容**：V9 之前生成的未确认 draft 无快照，按 stale 处理，必须重新生成；验收夹具需覆盖。
- **US-051 出发判定**：MVP 用出发 stop `start_at`（UTC）；缺失按未出发。引入行程时区后需重开语义。
- **superseded 确认草稿**：本 change 不提供历史回顾；US-059/060 再补。
- **既有漂移**：Living trips「不暴露确认操作」、列表 read-only 措辞、splits `X-Member-Id` 不在本 change 修。
- **扫描工具链**：`scripts/cross-change-scan.sh`、`openspec/templates/cross-change-scan.md`、`@rule:g1-cross-change-scan` 不在仓（US-082 同样引用）；本记录以手工九轴为准。
- **strict 警告**：5 条 ADDED requirement >500 字符；与既有 Living Spec 同类，无结构错误；如 P2 lint 要求可拆分，但不得改变语义。
- **需求文本**：issue #60 与 story-detail 旧口径保留为历史；PR #120 正文、registry、handoff 必须写明 Supersedes，避免后续误用旧 AC。并行提交称 issue #60 / PR #120 正文已同步主线 stop 编辑，本机无 gh 无法核验，P4 前复核。
- **测试面**：`TripDetails` 确认按钮、`MainPlan` 确认弹窗与 per-stop 编辑、split confirm 屏取消按钮、`Join` 的 `joiningClosed` 都需要 E2E 证据。
- **stop 编辑面**：`MainPlanStopEditApiTest` 覆盖 16 场景；手动编辑不 bump version、不改 stale；重生成必须整份替换并提示丢弃手动编辑；确认时跨 stop 冲突仍 422 `scheduleErrors`。

## Closure path

- 当前 **Pass** → 进入 P3（ATDD 设计 + fixtures + task plan），再进 P4。
- P3/P4 必须带走：C9/C10、V9 与构造器改造、全局 `joining_closed` 替换、US-051 前端入口、主线 stop 编辑与重生成提示、双弹窗 E2E、旧测试改写（确认后锁定/加入门禁/`TripResponse` 构造器）。
- 若实现阶段发现 delta 需要语义变化，回到 `/sdd:delta-craft` 修补后重开本记录；不得以已关闭的 C1–C11 覆盖新增业务级问题。
