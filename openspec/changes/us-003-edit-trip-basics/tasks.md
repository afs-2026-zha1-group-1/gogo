# 任务 — us-003-edit-trip-basics

- 依据：`proposal.md`、`design.md`（D1–D17）、`specs/trips/spec.md`（2 ADDED）、`specs/main-itinerary/spec.md`（3 MODIFIED + 2 ADDED）、`specs/invitations/spec.md`（2 MODIFIED）、`specs/splits/spec.md`（1 ADDED）、`specs/auth/spec.md`（1 MODIFIED）
- 执行规则：P4 起手先建分支并开 PR（`.githooks/pre-push` 禁止直推 main）；不以「main 直开发」方式落地。
- 角色：IO Leo / SA Emily（2026-11-17 用户裁决；G1 记录已签）。
- 用户裁决：确认后全员可改规划字段；名称仅组织者；主计划退回待重生成；加入保持关闭；分队需先取消（补 US-051）；保存前+确认前双弹窗；确认入口组织者独占；主线 stop 编辑（组织者、未确认草稿）并入。

## 1. 分支与 PR（P4 起手）

- [x] 1.1 从最新 `main` 建分支 `US-003-edit-trip-basics`（基于 group1/main `42a9239`）
- [x] 1.2 推送分支并开 PR 到 `main`（PR #120，标题 `US-003: 修改行程基本信息 + 我的页名字编辑按钮化`，正文链接本 change 的 proposal/design/specs，注明 Spec ID: us-003-edit-trip-basics）
- [x] 1.3 PR 正文补「Supersedes」声明：取代 US-003~007 确认后锁定、US-016 规划字段组织者独占、US-017 锁定，细化 US-018，新增 US-051（已写入 PR #120）

## 2. 迁移、夹具与红先行

- [x] 2.1 新建 `V10__add_joining_closed_and_trip_snapshot.sql`：
  - `ALTER TABLE trip ADD COLUMN joining_closed INTEGER NOT NULL DEFAULT 0;`
  - `UPDATE trip SET joining_closed = main_plan_confirmed;`
  - `ALTER TABLE main_plan_draft ADD COLUMN trip_basics_json TEXT;`
- [x] 2.2 更新 `requirement-workspace/acceptance-test-fixtures.md` §US-003：Alice/Ben/Eve、确认态 trip、active/confirmed 分队夹具、`joining_closed` 断言、V10 快照
- [x] 2.3 改既有测试构造器/夹具：`TripResponse` +`joiningClosed`、`InvitationPreview` +`joiningClosed`、`MainPlanRepository.DraftRow` +`tripBasicsJson`；跑 `mvn -B test` 确认仅预期失败
- [x] 2.4 新建 `backend/src/test/java/com/gogo/trip/TripUpdateApiTest.java` 覆盖 trips delta 全部场景（21 例）
- [x] 2.5 新建 `backend/src/test/java/com/gogo/mainplan/MainPlanSnapshotApiTest.java` 覆盖快照写入、stale、确认快捷入口（11 例）
- [x] 2.6 新建 `backend/src/test/java/com/gogo/invitation/InvitationJoiningClosedApiTest.java` 覆盖预览 + accept（6 例）
- [x] 2.7 新建 `backend/src/test/java/com/gogo/hello/splits/SplitConfirmedCancelApiTest.java` 覆盖 US-051 全部场景（10 例）
- [x] 2.8 新建 `backend/src/test/java/com/gogo/mainplan/MainPlanStopEditApiTest.java` 覆盖 stop 编辑 16 场景（15 例，竞态由条件写 SQL 覆盖）

## 3. 后端 trips

- [x] 3.1 `TripResponse` +`joiningClosed`；`TripRepository.findById`/`create` 适配
- [x] 3.2 `TripRepository` 新增 `@Transactional updateBasics(...)`：D2 守卫、D3 条件写、`joining_closed` 保持/置 1、规划变更时 `main_plan_confirmed=0` + 确认草稿 superseded
- [x] 3.3 `TripController` +`@PutMapping("/{id}")`：名称权限、规划/名称变化判定、错误码 `NOT_ORGANIZER`/`SPLIT_DRAFT_ACTIVE`/`SPLIT_CONFIRMED`、复用创建校验
- [x] 3.4 确认快捷端点 `POST /{id}/main-plan:confirm` 改为组织者 + 委托 `MainPlanService.confirm`，返回 `TripResponse`；删除 `TripRepository.confirmMainPlan`
- [x] 3.5 全局搜索 `main_plan_confirmed` 判断加入的位置，改为 `joining_closed`；确认无遗漏
- [x] 3.6 2.4 转绿；`cd backend && mvn -B test` 全绿

## 4. 后端 main-plan

- [x] 4.1 `MainPlanRepository.insertDraft` +`tripBasicsJson`；`DraftRow`/`findDraftByStatus` 读写该列；新增 `supersedeConfirmedDraft(tripId)` 与 `setTripConfirmedAndJoiningClosed(tripId)`
- [x] 4.2 `MainPlanService.generate` 在 `LocationCompletion` 后生成 D5 快照并写入 draft
- [x] 4.3 `MainPlanService.isStale` 加入 trip 快照比较（含 NULL→stale）；`readPlan`/`confirm` 共用
- [x] 4.4 `MainPlanService.confirm` 成功时同时置 `joining_closed=1`；确认快捷入口委托后返回 trip 投影
- [x] 4.5 2.5 转绿；既有 main-plan 测试回归（确认/frozen/预算/时间窗）
- [x] 4.6 `MainPlanRepository` 新增 stop 条件编辑方法（D13：当前草稿 + seq CAS，0 行二次查询区分 409/404）
- [x] 4.7 `MainPlanService`/`MainPlanController` 新增 `PUT /api/trips/{id}/main-plan/stops/{seq}` + 请求 record（D10/D11 守卫链与三码校验；响应复用 `PlanResponse`）
- [x] 4.8 stop 编辑不改 version/inputRevisions/行程快照；重生成仍整份替换并丢弃手动编辑（D12）
- [x] 4.9 2.8 转绿；既有 main-plan 测试回归

## 5. 后端 invitations

- [x] 5.1 `InvitationPreview` +`joiningClosed`；`InvitationRepository.preview` 选 `joining_closed`
- [x] 5.2 `InvitationRepository.join` 以 `joining_closed` 判 `JOINING_CLOSED`；保留既有成员重复 accept 语义
- [x] 5.3 2.6 转绿；既有 invitations 测试回归

## 6. 后端 splits（US-051）

- [x] 6.1 `ErrorCode` +`SPLIT_ALREADY_DEPARTED` 409
- [x] 6.2 `SplitDraftRepository` +`cancelConfirmedIfConfirmed(tripId, draftVersion, document, now)` 与出发时间查询
- [x] 6.3 `SplitDraftService.cancelConfirmedSplit`：MemberGuard、组织者、confirmed、版本、出发判定、事务内删 split 节点 + 清空 routes + status cancelled
- [x] 6.4 `SplitDraftController` +`POST /split:cancel`，沿用 `{data,error}` 与 `caller(authentication)`
- [x] 6.5 2.7 转绿；既有 US-038/039/042/043/049/050 split 测试回归（尤其 CN2：`split-draft:cancel` 对 confirmed 仍 409）

## 7. 前端

- [x] 7.1 `types.ts`：`Trip`/`InvitationPreview` +`joiningClosed`
- [x] 7.2 新 `EditTrip.tsx`：mount GET 预填；名称非组织者只读；规划字段可编辑；日期校验；保存前弹窗（规划变化 + 主计划探测）；409 分队错误 + 去分队页；成功回详情并保留入口
- [x] 7.3 `App.tsx`：`parseRoute` 在通用 `/trips/<id>` 之前匹配 `/trips/<id>/edit`；`TAB_FOR_PAGE` +`trip-edit: 'trips'`；渲染 EditTrip
- [x] 7.4 `TripDetails.tsx`：「行程信息」编辑入口对所有成员渲染；确认按钮仅 `isOrganizer`；409 `STALE_DRAFT` 展示 stale 引导
- [x] 7.5 `MainPlan.tsx`：`stale` 时确认前弹窗（重新生成/取消），取消不发 confirm
- [x] 7.6 `Join.tsx`：用 `preview.joiningClosed` 判加入关闭；`InvitationPanel` 用 `trip.joiningClosed` 展示关闭态
- [x] 7.7 split confirm 屏：confirmed 状态下组织者显示“取消已确认分队”，二次确认后调 `POST /split:cancel`；非组织者不显示
- [x] 7.8 `AccountPage.tsx`：移除常驻名字表单；edit 图标按钮 + 原位展开 + 保存/取消；沿用 `updateName`/1–30 校验
- [x] 7.9 `cd frontend && npm run typecheck && npm run build && npm run test:unit` 绿（提取规划字段变化/快照提示纯函数补 UT）
- [x] 7.10 `MainPlan.tsx`：组织者 + 未确认草稿 per-stop 编辑入口（name/开始/结束 + 保存/取消，响应替换投影，失败按 code 保留输入）；重生成旁常驻“重新生成将丢弃手动修改”（D10–D12）

## 8. E2E 与回归

- [x] 8. `docs/feedback/e2e-us-003.md` 逐行 Pass/Partial/N/A：
  - 全员编辑入口（组织者/普通成员/非成员 denied）；名称只读；确认后仍可编辑
  - 保存前弹窗（草稿/确认/分队锁）；名称-only 不弹；取消不发请求
  - 确认后编辑 → 主计划回 `NO_DRAFT`；重新生成 + 重新确认；加入仍关闭（邀请预览 `joiningClosed=true`）
  - 确认前 stale 弹窗；取消不发 confirm；重新生成后可确认
  - 详情确认按钮仅组织者；非组织者直达 API 403
  - US-051：组织者出发前取消 confirmed 分队；非组织者 403；出发后 409；取消后可重建；主线仍确认
  - 我的页名字编辑展开/保存/取消/错误态；退出登录仍在
- [x] 8. 回归：创建行程、详情各入口、成员名册、邀请发放/预览/加入、偏好、主线生成/确认、分队全链路、US-082 返回
- [x] 8. 反向验证：`PATCH/DELETE /api/trips/{id}` 不存在；非组织者改名称 403；分队锁态改规划 409；无守卫 `confirmMainPlan` 已删除
- [x] 8.4 stop 编辑 E2E：组织者未确认可编辑、成员/确认后无入口、时间格式/结束≤开始拦截、编辑致重叠确认被 422 拦、重生成提示与值回退、直达 PUT 409/404（2026-11-18 浏览器复验：E8/E9；重生成提示与「值回退」由 D12 既有 API 用例覆盖）

## 9. Spec 与文档

- [x] 9. `openspec validate us-003-edit-trip-basics` = valid（deltaCount = 11 / capabilities = 5）；`--strict` 预期仅 5 条 >500 字符 WARNING，无结构错误
- [x] 9. 更新 `requirement-workspace/registry.md`：US-003 行注明合并 #61–#64、本 change 取代确认后锁定/组织者独占规划字段、新增 US-051
- [x] 9.3 归档前对账：`docs/knowledge/architecture/tech-stack-plan.md` §28 增补 `PUT /api/trips/{id}`、`POST /split:cancel`、V10 列、`SPLIT_DRAFT_ACTIVE`/`SPLIT_CONFIRMED`/`SPLIT_ALREADY_DEPARTED`/`joiningClosed`；`docs/knowledge/_LOG.md` 追加一行
- [x] 9.4 记录既有漂移：Living trips「不暴露确认操作」与列表 read-only 措辞（不在本 change 修；见 §28）
- [x] 9.5 归档前补 `PUT /main-plan/stops/{seq}`、`STOP_NOT_FOUND`/`INVALID_TIME`/`INVALID_TIME_RANGE`、stop 编辑与重生成提示的 API/交互记录（§28）

## 10. 验证与门禁

- [x] 10.1 G1 输入齐备：cross-change-scan.md（SA 具名）+ IO/SA 签署；新错误码 IO 批准（G1 已记 Pass）
- [x] 10.2 local-verify 报告（后端 444/444、前端 47/47 + typecheck/build、浏览器 E8–E10；`docs/ai4se-plugins/20261118-143428-local-verify-report.md`）
- [ ] 10.3 PR CI 双 job 绿（backend `mvn -B test` + frontend typecheck/build）
- [ ] 10.4 G2（具名 VL）逐条审 → 合并 PR → living-merge（trips +2、main-itinerary 3 MODIFIED + 2 ADDED、invitations 2 MODIFIED、splits +1、auth MODIFIED 全文替换）+ G3（具名 SA）→ 归档
