# Proposal

## Why

行程基本信息此前「一次写入、终身只读」：详情页没有编辑入口，后端没有更新端点，`TripRepository` 没有 update 方法。US-003（issue #60，已合并 US-004 #61 / US-005 #62 / US-006 #63 / US-007 #64）要求组织者在主线方案确认前可修改名称、目的地、日期、出发地与结束地点，确认后锁定。2026-11-17 用户（IO Leo）对该口径作出新一轮裁决：

1. **确认后仍可编辑**：不再因主线已确认而拒绝修改；所有行程成员都可修改规划字段（目的地、开始/结束日期、出发/结束地点），名称仍仅组织者可变。
2. **主计划退回待重生成**：规划字段一旦变化，已确认的主线方案失效（确认态归零、原确认草稿 superseded），必须重新生成并重新确认；未确认草稿标记为 stale。
3. **加入保持关闭**：首次确认后加入入口永久关闭，不因后续编辑/重生成重新开放；为此把「加入关闭」从 `main_plan_confirmed` 解耦为独立的 `joining_closed`。
4. **分队需先取消**：有 `active` 分队草稿时拒绝规划字段编辑（发起人可取消）；有 `confirmed` 分队时由组织者先取消（补 US-051 入口），再编辑。
5. **双弹窗**：保存规划字段变更前提示「现有方案将过期/需重生成，分队需先取消」；确认主线前若草稿 stale 提示「需重新生成」。
6. **确认入口收口**：详情页“确认主线方案”按钮/旧端点仅组织者可见可用，并委托到校验式确认；任何成员不能再伪造确认态。
7. **主线 stop 编辑**：主线方案生成后，组织者可在未确认草稿上编辑单个 stop 的地点名与起止时间；可行性仍由既有确认校验把关，重生成整份替换并丢弃手动编辑。

同时沿用 2026-11-17 裁决：My Account 名字编辑由常驻表单改为按钮触发（方案 B 并入本 change）。

## What Changes

- 后端 `PUT /api/trips/{id}`：整表单覆盖六字段。规划字段任何成员可改；名称变更仅组织者（`403 NOT_ORGANIZER`）。守卫链：404 `TRIP_NOT_FOUND` → 403 `NOT_A_MEMBER` → 403 `NOT_ORGANIZER`（仅名称变更）→ 409 `SPLIT_DRAFT_ACTIVE` / `SPLIT_CONFIRMED`（仅规划字段变更）→ 400 校验（复用创建码）。
- 规划字段变更的落库语义：单事务更新 trip；若存在已确认主计划，则 `main_plan_confirmed = 0`、`joining_closed` 保持 1、确认草稿 `status = 'superseded'`；若存在未确认当前草稿，则保留并依赖快照判 stale。名称-only 变更不影响主计划、草稿或加入状态。
- 主计划失效判定：`main_plan_draft` 新增 `trip_basics_json`（目的地/日期/起终点快照，不含名称）；`stale` = 成员偏好 revision 不一致 OR 快照不一致 OR 旧草稿无快照。确认仍由 `POST /api/trips/{id}/main-plan/confirm` 校验式完成。
- 确认入口收口：详情页“确认主线方案”按钮仅组织者渲染；其旧端点 `POST /api/trips/{id}/main-plan:confirm` 仅组织者可用并委托到 `MainPlanService.confirm`，返回更新后的 trip 投影；无草稿 404 `NO_DRAFT`、stale 409 `STALE_DRAFT`、已确认 409 `ALREADY_CONFIRMED`、校验失败 422 `VALIDATION_FAILED`。删除 `TripRepository#confirmMainPlan` 这条无守卫写路径。
- 加入门禁解耦：`trip` 新增 `joining_closed`（V10 回填 = `main_plan_confirmed`）；首次确认时置 1 且不再归零。邀请预览新增 `joiningClosed`（保留 `mainPlanConfirmed` 表示当前计划态）；非成员 accept 以 `joiningClosed` 判 `403 JOINING_CLOSED`。
- 补 US-051：新增 `POST /api/trips/{tripId}/split:cancel`（组织者、`confirmed`、出发前），取消已确认分队：状态 `cancelled`、删除 `split-a/split-b` `plan_node`、清空 `document.routes`，主线与 `joiningClosed` 不变，可重新发起分队。出发判定取出发 stop 的 `start_at`；缺失按未出发（MVP）。
- 主线 stop 编辑：新增 `PUT /api/trips/{id}/main-plan/stops/{seq}`（组织者、仅当前未确认草稿），可改 `name`/`startTime`/`endTime`（`HH:MM`）；顺序 `seq`、`travelMinutesToNext`、兴趣标签不可改。守卫复用 `TRIP_NOT_FOUND`/`NOT_A_MEMBER`/`NOT_ORGANIZER`/`NO_DRAFT`/`ALREADY_CONFIRMED`，新增 `STOP_NOT_FOUND` 404、`INVALID_TIME` 400、`INVALID_TIME_RANGE` 400。原位改当前草稿，不 bump version、不改 `inputRevisions`、不改 stale；跨 stop 冲突仍由确认 `scheduleErrors` 把关；重生成整份替换并丢弃手动编辑。
- 前端：详情页编辑入口对所有成员可见（确认后也保留）；编辑页名称对非组织者只读、规划字段可编辑；保存前弹窗；主计划页确认前 stale 弹窗；详情页确认按钮仅组织者；主线页组织者未确认时提供 per-stop 编辑（name/开始/结束 + 保存/取消，重生成旁提示“将丢弃手动修改”）；分队确认页对组织者提供“取消已确认分队”。My Account 名字编辑按钮化（API/校验不变）。
- Delta specs：`trips` +2 ADDED；`main-itinerary` 3 MODIFIED + 2 ADDED；`invitations` 2 MODIFIED；`splits` +1 ADDED；`auth` 1 MODIFIED（仅 UI 布局）。
- 迁移：V10 新增 `trip.joining_closed`、`main_plan_draft.trip_basics_json`（含回填）。无新依赖。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `trips`：+2 ADDED —「Trip basic info update」（全员规划字段、名称组织者独占、分队门禁、确认后编辑使主计划失效、`joiningClosed` 投影）与「Trip detail edit entry」（全员入口、名称只读、保存前弹窗、分队拒绝态、保存后可再次编辑）。
- `main-itinerary`：3 MODIFIED —「Draft review with computed staleness」（行程快照纳入 stale 判定、确认草稿被规划编辑 superseded）、「Validation-gated confirmation」（旧确认快捷入口组织者独占并委托校验、失效后重新生成/重新确认）、「Authorization and identity for main-plan operations」（写操作范围纳入 stop 编辑）；+2 ADDED —「Main plan stop editing」（组织者、未确认草稿、地点名/起止时间、先存后验）与「Plan invalidation prompts」（保存前/确认前双弹窗与详情快捷入口的 stale 引导）。
- `invitations`：2 MODIFIED —「Invitation preview」（新增 `joiningClosed`）与「Invitation acceptance and joining」（以 `joiningClosed` 而非当前计划态判加入关闭）。
- `splits`：+1 ADDED —「Confirmed split cancellation」（US-051：组织者、出发前取消已确认分队，恢复主线，可重建）。
- `auth`：1 MODIFIED —「Account profile and display name」（仅 My Account 布局句与编辑交互场景；API/CSRF/1–30 校验逐字保留）。

## Supersedes / Decisions

- **取代 US-003/004/005/006/007 的“确认后拒绝修改”AC**：以本 change 的“确认后可改、改后主计划待重生成”为准；issue #60 原文与 `requirement-workspace/requirements/story-detail-iteration-1.md` 旧拆分文本保留为历史，不再作为验收口径。
- **取代 US-016 对规划字段的组织者独占**：规划字段任何成员可改；名称仍仅组织者（US-016 对名称继续有效）。
- **取代 US-017 的“确认后基本信息不变”**：确认信息可被编辑，但会触发主计划失效/重新确认；名称-only 不触发。
- **细化 US-018**：加入在首次确认后关闭并保持关闭；`mainPlanConfirmed` 归零不再重新开放加入。
- **补 US-051**：此前未实现的“取消已确认分队”纳入本 change，作为“分队需先取消”规则的可执行入口。
- **新增主线 stop 编辑**：用户 2026-11-17 裁决把“主线方案生成后活动地点/时间可编辑”并入同一 story；只编辑未确认草稿的 name/start/end，先存后验；不改 US-036 的“重生成整份替换”语义，手动编辑在重生成时丢弃。
- **用户裁决（2026-11-17）**：全员改规划字段；主计划退回待重生成；加入保持关闭；分队需先取消（补 US-051）；保存前+确认前弹窗；确认入口组织者独占；主线 stop 编辑并入；My Account 名字编辑按钮化并并入本 change。

## Impact

| Area | Effect |
|---|---|
| Backend trips | `TripController` +`PUT /{id}`；`TripRepository` +条件更新/计划失效事务；`TripResponse` +`joiningClosed`；确认快捷端点改为组织者+委托校验；删除无守卫 `confirmMainPlan` |
| Backend main-plan | `MainPlanService.generate` 记录 `trip_basics_json`；`readPlan`/`confirm` stale 判定加入快照；`MainPlanRepository` 读写快照、supersede confirmed 草稿；确认快捷入口委托；新增 `PUT /main-plan/stops/{seq}` 与条件编辑 |
| Backend invitations | `InvitationRepository` 预览返回 `joiningClosed`、accept 以 `joining_closed` 判定；`InvitationPreview` +字段 |
| Backend splits | `SplitDraftController` +`POST /split:cancel`；`SplitDraftService` +已确认取消（组织者/出发前/版本）；`SplitDraftRepository` +`cancelConfirmedIfConfirmed`；`ErrorCode` +`SPLIT_ALREADY_DEPARTED` |
| Frontend | `EditTrip.tsx`（全员入口、名称只读、双弹窗）；`TripDetails.tsx`（入口全员、确认按钮仅组织者、stale 引导）；`MainPlan.tsx`（stale 确认弹窗 + 组织者 per-stop 编辑/重生成提示）；`Join.tsx`（`joiningClosed`）；split confirm 屏（取消已确认分队）；`AccountPage.tsx`（名字编辑按钮化）；`types.ts` +`joiningClosed` |
| Database | **V10**：`trip.joining_closed`（回填 `main_plan_confirmed`）+ `main_plan_draft.trip_basics_json`（旧行 NULL 视为 stale） |
| Dependencies | 无新增 |
| Auth | 端点契约不变；`/api/**` 已 `authenticated()`，新端点自动受保护；CSRF 沿用 `api()` |
| Error contract | 新码：`SPLIT_DRAFT_ACTIVE` 409、`SPLIT_CONFIRMED` 409、`SPLIT_ALREADY_DEPARTED` 409、`STOP_NOT_FOUND` 404、`INVALID_TIME` 400、`INVALID_TIME_RANGE` 400；复用 `NOT_ORGANIZER`、`STALE_DRAFT`、`ALREADY_CONFIRMED`、`NO_DRAFT`、`SPLIT_DRAFT_NOT_ACTIVE`、`STALE_DRAFT_VERSION`、`NOT_SPLIT_ORGANIZER`、`NAME_REQUIRED`；不再使用 `MAIN_PLAN_CONFIRMED` |
| Specs | 4 个 capability delta + auth；归档时 living-merge |
| Requirement source | issue #60（历史）+ 2026-11-17 用户裁决（权威）+ 本地 US-003~007 / US-016~018 / US-051 文本 |
| Effort | 中：V10 迁移、4 个后端模块、7 个前端触点、双弹窗、US-051、主线 stop 编辑 |
| Stack deviation | 无新增。沿用手写 `api()` + `useEffect` 基线；归档对账补 tech-stack-plan 的 `PUT /api/trips/{id}`、`POST /split:cancel`、V10 与新码 |

## Explicit Non-Goals

- 不允许非组织者改名称；不做名称/规划字段的逐字段 PATCH。
- 不做分队自动作废/自动取消；必须显式取消（US-050 草稿、US-051 已确认）。
- 不做 stop 增删/拖拽重排；不改 stop 顺序、交通时长、兴趣标签。
- 不做 US-075 的延迟/跳过/替换 + 成员通知，也不做 US-077 的建议讨论。
- 不做行程完成态（US-059/060）的新锁定；本 change 只处理“主线确认”这一层。
- 不做主计划历史版本 UI；被 superseded 的确认草稿不在本 change 提供回顾页。
- 不修 Living `trips` 两处历史措辞漂移（“不暴露确认操作”、列表 read-only 场景），另行收敛。
- 不改偏好/成员/邀请发放的既有身份与权限语义。
- 无新依赖。

## Risks / Open Questions

- **V10 兼容**：旧未确认草稿无 `trip_basics_json`，按 stale 处理，必须重新生成；测试夹具需补快照。
- **确认/编辑竞态**：编辑与分队确认、主计划确认并发时以条件写和单事务兜底；E2E 不可稳定复现，由后端测试置状态断言。
- **加入关闭语义迁移**：所有读取 `main_plan_confirmed` 判断加入的地方必须改读 `joining_closed`；遗漏会让编辑后重新开放加入。
- **US-051 出发判定**：MVP 取出发 stop `start_at`，缺失按未出发；时区沿用现有 UTC 存储。若后续引入行程时区，需重新定义。
- **双弹窗 UX**：保存前弹窗只在规划字段实际变化且存在主计划时出现；名称-only 不弹，避免打断。
- **stop 编辑与重生成**：手动编辑不 bump version；重生成整份替换并丢弃手动编辑，前端必须常驻提示，避免被误认为会合并。
- **stop 编辑与确认校验**：编辑只做单 stop 自洽校验；跨 stop 冲突在确认时 422 `scheduleErrors` 拦截，不把“已保存”误当“已可行”。
- **旧需求文件口径**：issue #60 不可在本机核验（私有仓库/无 gh）；以用户 2026-11-17 裁决和本 delta 为准，PR #120 正文需贴出该取代声明。
