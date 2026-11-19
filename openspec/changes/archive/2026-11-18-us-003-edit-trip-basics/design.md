# Design — us-003-edit-trip-basics

## Context

行程六字段（name / destination / startDate / endDate / startLocation / endLocation）在 V2 迁移即已落库，但整条更新链路不存在：`TripController` 只有创建/读取/current/主线确认，`TripRepository` 无 update 方法，`TripDetails.tsx` 纯只读。2026-11-17 用户（IO Leo）裁决把原「确认后锁定」改为「确认后仍可编辑规划字段，主计划退回待重生成、加入保持关闭、分队需先取消」，并要求补 US-051 已确认分队取消入口、保存前/确认前双弹窗、确认入口组织者独占。

既有基线：US-066 会话认证（`AccountPrincipal`）、扁平 `{code,message}` 错误包封套、手写 `api()` + `useEffect` 前端数据流、SQLite 单写者 + 条件更新铁律、splits 的 `{data,error}` 例外与 `MemberGuard`。

## Goals / Non-Goals

**Goals:**

- 所有行程成员可在任意时点修改规划字段；名称仍仅组织者可变。
- 规划字段变化使主计划失效：确认态归零、确认草稿 superseded、未确认草稿 stale；加入保持关闭。
- 有 `active`/`confirmed` 分队时拒绝规划编辑；补 US-051 让组织者能取消已确认分队。
- 确认入口唯一：详情按钮/旧端点仅组织者且委托校验式确认。
- 双弹窗：编辑保存前提示方案过期/分队需取消；主线确认前提示 stale 需重生成。
- 组织者可在未确认草稿上编辑单个 stop 的名称/起止时间；先存后验，重生成丢弃手动编辑。
- My Account 名字编辑按钮化，API 与校验不变。

**Non-Goals:**

- 不允许非组织者改名称；不做逐字段 PATCH。
- 不自动取消分队；必须显式取消。
- 不做行程完成态（US-059/060）的新锁定、不做主计划历史版本 UI。
- 不做 stop 增删/拖拽重排；不改 stop 顺序、交通时长、兴趣标签。
- 不做 US-075 的延迟/跳过/替换 + 成员通知，也不做 US-077 的建议讨论。
- 不引入新依赖或缓存层。

## Decisions

### D1 整表单 PUT 与字段权限

`PUT /api/trips/{id}`，body 与 `POST /api/trips` 相同（复用 `TripCreateRequest`），响应复用 `TripResponse`（新增 `joiningClosed`）。校验顺序与创建一致：日期解析 → 名称非空 → 目的地非空 → 结束≥开始 → 空白起终点 `blankToNull`。

规划字段 = destination / startDate / endDate / startLocation / endLocation；name 单独判定。规划字段任何成员可改；name 与已存值不同且调用者非组织者 → 403 `NOT_ORGANIZER`。规划字段不变时，非组织者提交原名称是允许的（整表单必须带名称）。

### D2 守卫链与分队门禁

顺序：404 `TRIP_NOT_FOUND` → 403 `NOT_A_MEMBER` → 403 `NOT_ORGANIZER`（仅名称变更）→ 409 `SPLIT_DRAFT_ACTIVE`（规划变更 + active 草稿）→ 409 `SPLIT_CONFIRMED`（规划变更 + confirmed 分队）→ 400 字段校验。任何拒绝零写入。

- 分队门禁只拦规划字段变更；名称-only 变更不拦（名称不影响分队）。
- active 草稿由发起人按 US-050 取消；confirmed 分队由组织者按 US-051 取消（D9）。
- 403/409 分界沿用既有：身份/角色 403，状态冲突 409。

### D3 事务写与主计划失效

`TripRepository` 新增 `@Transactional` 更新方法：

1. 读取当前 trip 与分队状态；执行 D2 守卫。
2. 单条条件更新 trip，`WHERE id = ? AND NOT EXISTS (SELECT 1 FROM split_draft WHERE trip_id = ? AND status IN ('active','confirmed'))`，防止守卫后并发确认分队；影响行数 0 → 重新读取分队状态并抛 409。
3. `joining_closed` 在更新中按旧值保持/置 1：`joining_closed = CASE WHEN main_plan_confirmed = 1 THEN 1 ELSE joining_closed END`（SQLite 以旧行值计算 RHS）。
4. 若规划字段变化且旧 `main_plan_confirmed = 1`：
   - `main_plan_confirmed = 0`；
   - `UPDATE main_plan_draft SET status = 'superseded' WHERE trip_id = ? AND status = 'confirmed'`。
5. 若规划变化但未确认：不动 flag；当前未确认草稿保留，由快照判 stale（D6）。
6. 名称-only：不动 flag、草稿、`joining_closed`。
7. 返回 `findById` 投影。

确认与编辑竞态：确认事务先提交则编辑看到 confirmed 并执行失效；编辑先提交则确认读到已 superseded 的草稿并返回 `NO_DRAFT`。两者都不产生部分写。

### D4 起终点可清空

空白/缺省起终点归一为 null（与创建同规则），详情页回到「未设置 / 尚未设置，可由后续主线生成补全」展示。名称与目的地仍必填。

### D5 行程快照与 V10

V10 迁移：

```sql
ALTER TABLE trip ADD COLUMN joining_closed INTEGER NOT NULL DEFAULT 0;
UPDATE trip SET joining_closed = main_plan_confirmed;
ALTER TABLE main_plan_draft ADD COLUMN trip_basics_json TEXT;
```

- 快照内容：`{"destination","startDate","endDate","startLocation","endLocation"}` 的规范化 JSON（不含 name）。
- `MainPlanService.generate` 在 `LocationCompletion` 写回 trip 之后取 `completed` 的起终点 + trip 的目的地/日期生成快照，随 draft 一并写入（`MainPlanRepository.insertDraft` 增参，`DraftRow` 增字段）。
- 旧 draft 的 `trip_basics_json` 为 NULL：未确认时一律 stale；确认态在被编辑失效前仍 frozen。
- 快照由服务端生成并比较，前端不参与。

### D6 stale 判定

未确认 draft 的 `stale` = 成员偏好 revision 不一致 OR 当前 trip 规划快照 ≠ draft 快照 OR draft 无快照。确认态在未被规划编辑 superseded 前 frozen（偏好变化不使其 stale）。名称变化不参与快照。

`MainPlanService.isStale` 改为同时读 trip 与 draft；`readPlan`/`confirm` 共用。确认仍返回 409 `STALE_DRAFT`。

### D7 确认入口收口

- `TripController.confirmMainPlan`（`POST /{id}/main-plan:confirm`）改为：校验行程/成员后委托 `MainPlanService.confirm(id, caller)`；成功后 `findById` 返回 `TripResponse`；失败由 `MainPlanErrorAdvice` 返回扁平错误（403 `NOT_ORGANIZER`、404 `NO_DRAFT`、409 `STALE_DRAFT`/`ALREADY_CONFIRMED`、422 `VALIDATION_FAILED`）。
- 删除 `TripRepository.confirmMainPlan` 这条无守卫写路径；确认态只由 `MainPlanService.confirm` 在单事务内设置。
- `MainPlanService.confirm` 成功时同时置 `main_plan_confirmed = 1` 与 `joining_closed = 1`（`MainPlanRepository` 新方法）。实现偏差：快捷端点声明在 `MainPlanController`（路径契约不变），避免 `com.gogo.trip ↔ com.gogo.mainplan` 包循环依赖（@rule:no-circular-dependency）。
- `TripDetails.tsx` 的“确认主线方案”按钮只在 `isOrganizer` 时渲染；非组织者不显示；409 `STALE_DRAFT` 时展示 stale 引导。

### D8 joiningClosed 解耦

- `trip.joining_closed` 首次确认置 1，之后永不归零；V10 回填历史值。
- `TripResponse` +`joiningClosed`；详情页/邀请面板用它判断“加入已关闭”，不再用 `mainPlanConfirmed`。
- `InvitationPreview` +`joiningClosed`；`InvitationRepository.join` 以 `joining_closed` 判 `JOINING_CLOSED`；预览同时保留 `mainPlanConfirmed` 表示当前计划态。
- `Join.tsx` 用 `preview.joiningClosed` 判关闭；`types.ts` 的 `InvitationPreview`/`Trip` +字段。
- 编辑失效主计划时 `mainPlanConfirmed=0` 但 `joiningClosed=1`；加入仍关闭。

### D9 US-051 已确认分队取消

新增 `POST /api/trips/{tripId}/split:cancel`（body `{draftVersion}`），沿用 splits 身份守卫与 `{data,error}` 包封套：

- 非成员 403 `NOT_A_MEMBER`、非组织者 403 `NOT_SPLIT_ORGANIZER`、非 confirmed 409 `SPLIT_DRAFT_NOT_ACTIVE`、版本不符 409 `STALE_DRAFT_VERSION`、出发 stop `start_at <= now` 409 `SPLIT_ALREADY_DEPARTED`（缺失按未出发）。
- 成功：`status = 'cancelled'`、删除 `split-a/split-b` `plan_node`、清空 `document.routes`；`main` 节点、`main_plan_confirmed`、`joining_closed`、trip 基本信息、成员不变；`split_draft` 行保留 cancelled，可重新发起。
- 与 US-050（active 草稿、发起人）并存：`split-draft:cancel` 保持原语义；`split:cancel` 只处理 confirmed。
- `ErrorCode` +`SPLIT_ALREADY_DEPARTED`。
- 前端 `screen-confirm.tsx`：confirmed 状态下组织者看到“取消已确认分队”，二次确认后调用新端点；非组织者不显示。

### D10 主线 stop 编辑：端点与可编辑面

`PUT /api/trips/{id}/main-plan/stops/{seq}`，请求体 `{name, startTime, endTime}`，响应复用 `PlanResponse`（与草稿读同一投影）。

- 仅组织者、仅当前未确认草稿；成员与确认后只读。
- 可编辑：`name`（地点/活动名）、`startTime`、`endTime`（`HH:MM`，与 `ScheduleValidator` 解析口径一致）。
- 不可编辑：`seq`、`travelMinutesToNext`、兴趣标签；请求中出现一律忽略。
- 原位改当前草稿，不 bump version、不改 `inputRevisions`；`stale` 仍只由偏好 revision 与行程快照驱动（stop 编辑不改行程快照）。
- 被规划编辑置 stale 的草稿仍可编辑 stop，但确认会被 409 `STALE_DRAFT` 拦住；确认态草稿被规划编辑 superseded 后，stop 编辑按 404 `NO_DRAFT` 处理。

### D11 stop 编辑守卫与错误码

顺序：404 `TRIP_NOT_FOUND` → 403 `NOT_A_MEMBER` → 403 `NOT_ORGANIZER` → 409 `ALREADY_CONFIRMED` → 404 `NO_DRAFT` → 404 `STOP_NOT_FOUND` → 400 校验：空白名 `NAME_REQUIRED`、时间不可解析 `INVALID_TIME`、结束≤开始 `INVALID_TIME_RANGE`。任何拒绝零写入。

- `NOT_ORGANIZER`/`ALREADY_CONFIRMED`/`NO_DRAFT`/`NAME_REQUIRED` 复用；`STOP_NOT_FOUND`/`INVALID_TIME`/`INVALID_TIME_RANGE` 新码。
- 与 trips 的 `SPLIT_*` 新码分属不同 capability；都在各自扁平包封套内，不强行统一。

### D12 先存后验与重生成

- 编辑只做单 stop 自洽校验；跨 stop 的 `OUT_OF_ORDER`/`OVERLAP`/`MISSING_LEG`/`TRAVEL_EXCEEDS_GAP`/`OUT_OF_DAY` 仍由既有 `ScheduleValidator` 在确认时计算，类型与 C3 场景不变。
- 手动编辑不改 `input_revisions`，也不改行程快照；`stale` 仍由偏好 revision + 快照驱动。编辑后即使不可行，也只在确认时 422 拦截，草稿可继续修。
- 重生成整份替换当前草稿，手动编辑随之丢弃（US-036/G5 语义不变）；主线页重生成入口常驻提示「重新生成将丢弃手动修改」。

### D13 stop 编辑并发

条件写 `UPDATE main_plan_stop SET ... WHERE draft_id=? AND seq=? AND EXISTS (SELECT 1 FROM main_plan_draft WHERE id=draft_id AND status='current')`（实现可等价为先条件更新草稿行），影响行数 0 → 二次查询区分 409 `ALREADY_CONFIRMED`（草稿已确认）或 404 `STOP_NOT_FOUND`（seq 不存在）。确认与编辑竞态不允许半写。

### D14 前端编辑页与路由

- 新 hash 路由 `#/trips/<id>/edit` → `EditTrip.tsx`；`App.tsx parseRoute` 必须在通用 `/trips/<id>` 之前匹配（US-067 D1 教训）；`TAB_FOR_PAGE` 归 `trips`。
- 详情页编辑入口对所有成员渲染（确认后也保留）；名称对非组织者只读；规划字段可编辑。
- 编辑页 mount `GET /api/trips/{id}` 预填；非成员 → 既有 denied；分队锁态 → 拒绝态 + 去分队页入口。
- 保存前弹窗：若规划字段相对预填值发生变化且探测到主计划存在（`GET /api/trips/{id}/main-plan` 返回 200），弹窗说明“方案将过期/需重生成；有分队需先取消”；取消不发请求，继续发一次 PUT。名称-only 不弹。
- 保存成功回 `#/trips/<id>`，入口保留可再次编辑；失败保留输入并按 code 显示文案（409 `SPLIT_DRAFT_ACTIVE`/`SPLIT_CONFIRMED` 给分队链接）。
- 不改缓存层，详情/列表/邀请预览按 mount 重读。

### D15 主计划确认弹窗

`MainPlan.tsx` 确认前若 `stale` 为 true：弹出阻塞对话框“行程信息或成员偏好已变化，方案已过期，请重新生成后再确认”，提供“去生成/取消”；取消不发 confirm；生成成功后重新读取。若 stale 为 false，直接调用确认。详情页快捷入口在 409 `STALE_DRAFT` 时展示同样的引导（链到主线页）。

### D16 My Account 名字编辑按钮化

- profile 头部名字行右侧加 `Icon name="edit"` 按钮（`aria-label="编辑名字"`）。
- 点击原位展开输入（预填、maxLength 30）+ 保存/取消；移除常驻表单。
- 保存沿用 `updateName`、1–30 校验、`INVALID_NAME` 文案；成功收起、失败留编辑态；取消丢弃输入。
- API/CSRF/会话零变化；Living auth 以 MODIFIED 全文收敛。

### D17 测试策略

- 后端 API：`TripUpdateApiTest` 覆盖 trips 全部场景（全员规划字段、名称权限、分队 409、确认后失效、快照 stale、清空起终点、幂等、401）；`MainPlanSnapshotApiTest` 覆盖快照写入/stale/确认快捷入口；`MainPlanStopEditApiTest` 覆盖 stop 编辑 16 场景；`InvitationJoiningClosedApiTest` 覆盖预览 + accept；`SplitConfirmedCancelApiTest` 覆盖 US-051 全场景；既有 create/read/list/current/members/confirm/split 回归。
- 前端：日期校验纯函数走 `node:test`；E2E 覆盖全员入口、名称只读、保存前/确认前弹窗、确认后编辑使主计划回空、加入保持关闭、US-051 取消、主线 per-stop 编辑与重生成提示、AccountPage 名字编辑。
- 夹具：V2 种子（Alice=1 组织者 trip 1，Ben=2 成员，Eve=5 非成员）；V10 快照/joining_closed；分队 confirmed 夹具用既有 confirm 流程。

## Migration Plan

V10 单迁移（见 D5），部署即生效；回滚 = revert PR + 回滚 V10（开发库重建）。旧未确认草稿因无快照按 stale 处理，需重新生成；旧确认行程 `joining_closed` 回填为 1。

## 合并对账（2026-11-17，main `b0fbd79`）

US-083-085 把详情页拆为「有方案 → `TripOverview`（新版概览）/ 无方案 → `TripDetailsLegacy`」，并把主线确认入口收口到主线方案页（US-081 裁定）。本 change 的对账：

- 编辑入口同时落在 `TripDetailsLegacy`（行程信息区）与 `TripOverview`（appbar 编辑图标），确认态仍可见。
- 详情页不再渲染「确认主线方案」快捷按钮；快捷端点保留且仅组织者可用（契约与测试不变），确认与 stale 引导由主线方案页承担（D15）。
- `main-itinerary` delta 的 stale 快捷入口 scenario 相应改为端点级断言 + 主线方案页引导（见 delta 文本）。
- 邀请面板在 `TripDetailsLegacy` 与 US-083 全屏邀请页（`/trips/<id>/invitation`）各自消费 `joiningClosed`。

## Risks / Trade-offs

- **旧测试大面积构造器变更**：`TripResponse` +`joiningClosed`、`InvitationPreview` +`joiningClosed`、`MainPlanRepository.DraftRow` +快照；P4 先改夹具/构造器再补新用例。
- **加入门禁遗漏**：任何仍读 `main_plan_confirmed` 判断加入的代码都会在编辑后错误开放加入；P4 全局搜索并替换为 `joining_closed`。
- **US-051 出发判定**：MVP 用 UTC `start_at`；缺失按未出发。引入行程时区后需重开。
- **弹窗探测成本**：编辑页额外一次 `GET main-plan`（404 属正常），失败时按“无主计划”处理，不阻塞保存。
- **superseded 草稿不可回顾**：本 change 不提供历史视图；US-059/060 再补。
- **stop 编辑被重生成丢弃**：手动编辑不 bump version，重生成整份替换；前端必须常驻提示，避免被误认为会合并。
- **stop 编辑与确认校验**：编辑只做单 stop 自洽校验；跨 stop 冲突在确认时 422 `scheduleErrors` 拦截，不把“已保存”误当“已可行”。
- **旧需求文本冲突**：issue #60 / story-detail 的确认后锁定条款已被用户 2026-11-17 裁决取代，G1 记录需显式声明。

## Open Questions

- 无阻塞开放项；IO / SA 具名角色已在 G1 记录（IO Leo / SA Emily，按用户指令与角色轮换代记）。
