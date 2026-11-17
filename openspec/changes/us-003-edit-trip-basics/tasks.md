# 任务 — us-003-edit-trip-basics

- 依据：`proposal.md`、`design.md`（D1–D8）、`specs/trips/spec.md`（2 ADDED，27 场景）、`specs/auth/spec.md`（1 MODIFIED，13 场景）
- 执行规则：P4 起手先建分支并开 PR（`.githooks/pre-push` 禁止直推 main）；不以「main 直开发」方式落地。
- 角色：IO / SA / VL 具名分配待用户确认后补入 g1-decision；新错误码 `NOT_ORGANIZER` / `MAIN_PLAN_CONFIRMED` 需 IO 在 G1 批准。

## 1. 分支与 PR（P4 起手）

- [x] 1.1 从最新 `main` 建分支 `US-003-edit-trip-basics`（基于 group1/main `42a9239`）
- [x] 1.2 推送分支并开 PR 到 `main`（PR #120，标题 `US-003: 修改行程基本信息 + 我的页名字编辑按钮化`，正文链接本 change 的 proposal/design/specs，注明 Spec ID: us-003-edit-trip-basics）

## 2. Fixtures 与红先行

- [ ] 2.1 在 `requirement-workspace/acceptance-test-fixtures.md` 追加 §US-003（Alice 组织者 trip 1 未确认、Ben 成员、Eve 非成员、锁定态 trip 用既有 confirm 或测试 setup；编辑目标值「海边周末游」等）
- [ ] 2.2 新建 `backend/src/test/java/com/gogo/trip/TripUpdateApiTest.java`，覆盖 trips delta "Trip basic info update" 全部 17 场景（先红）：200 更新与读后一致、列表/预览新名、同日日期、四码校验零写入、清空起终点、403 NOT_ORGANIZER、403 NOT_A_MEMBER、404、409 锁定、条件写竞态、organizer/确认态不可改、幂等、401 无会话、401 仅旧头
- [ ] 2.3 回归断言：创建 / 详情读取 / 列表 / current / members / 主线确认语义不变（既有测试套件不回归）

## 3. 后端实现

- [ ] 3.1 `TripRepository` 新增条件更新方法（D3 SQL：`UPDATE trip SET 六列 WHERE id=? AND main_plan_confirmed=0`，返回影响行数）
- [ ] 3.2 `TripController` 新增 `@PutMapping("/{id}")`：守卫链 404→403 成员→403 组织者→409 锁定→400 校验（D2），请求体复用 `TripCreateRequest`、响应复用 `TripResponse`，校验逻辑与 create 共用（提取私有方法，不改 create 行为）
- [ ] 3.3 `TripApiException` 新增两码路径：`NOT_ORGANIZER` 403、`MAIN_PLAN_CONFIRMED` 409（扁平 `{code,message}`）
- [ ] 3.4 2.2 全部转绿；`cd backend && mvn -B test` 全绿

## 4. 前端实现

- [ ] 4.1 新建 `frontend/src/pages/EditTrip.tsx`：mount GET 预填；复用创建页字段布局与日期校验；守卫态（denied / 非组织者文案 / 已确认锁定文案 + 返回）；保存 PUT，成功回 `#/trips/<id>`，失败按 code 显示文案并保留输入（D5）
- [ ] 4.2 `App.tsx`：`parseRoute` 在通用 `/trips/<id>` 之前匹配 `/trips/<id>/edit`；`TAB_FOR_PAGE` 增 `trip-edit: 'trips'`；渲染 EditTrip（D5，US-067 D1 教训）
- [ ] 4.3 `TripDetails.tsx`：「行程信息」sec-title 行右侧加编辑入口，仅 `isOrganizer && !trip.mainPlanConfirmed` 渲染，链接 `#/trips/<id>/edit`（D6）
- [ ] 4.4 `AccountPage.tsx`：移除常驻名字表单；profile 头部名字旁加编辑图标按钮（`aria-label="编辑名字"`）；点击原位展开 input（预填、maxLength 30）+ 保存/取消；保存沿用 `updateName` 与 1–30 校验，成功收起、失败留编辑态显示错误；取消丢弃输入不发请求（D7）
- [ ] 4.5 `cd frontend && npm run typecheck && npm run build && npm run test:unit` 绿（如提取日期校验纯函数，补 node:test 用例）

## 5. E2E 与回归

- [ ] 5.1 新建 `docs/feedback/e2e-us-003.md`，逐行记 Pass/Partial/N/A：
  - 入口矩阵：组织者未确认可见 / 成员不可见 / 确认后不可见
  - 编辑页预填、日期倒挂拦截、保存回详情显示新值、`#/my-trips` 与邀请预览显示新名
  - 直达 hash：非组织者拒绝态、已确认锁定态、未登录走 login guard
  - 失败保存（先确认再提交）显示锁定文案且保留输入
  - 我的页：编辑按钮展开预填、保存收起显示新名（头像首字母联动）、取消丢弃、空名/超长报错留编辑态、退出登录仍在
- [ ] 5.2 回归：创建行程、行程详情各入口（偏好/主线/分队/邀请）、成员名册、仪表盘问候名、US-082 返回链路
- [ ] 5.3 反向验证：`PATCH/DELETE /api/trips/{id}` 不存在（405/404）；更新请求不能改 organizerId / mainPlanConfirmed；编辑入口不产生第二个主线入口

## 6. Spec 与文档

- [ ] 6.1 `openspec validate us-003-edit-trip-basics --strict` = valid
- [ ] 6.2 更新 `requirement-workspace/registry.md`（US-003 行，注明合并 #61–#64）与 `handoff.md` 进度
- [ ] 6.3 归档前对账：`docs/knowledge/architecture/tech-stack-plan.md` 增补 `PUT /api/trips/{id}` 与两新错误码、My Account 名字编辑交互（API 记录节）+ `docs/knowledge/_LOG.md` 追加一行；无数据模型变更

## 7. 验证与门禁

- [ ] 7.1 G1 输入齐备：cross-change-scan.md（SA 具名）+ IO/SA 对 proposal/specs 签署；新错误码 IO 批准
- [ ] 7.2 local-verify 报告（后端测试数、前端 build、E2E 证据）
- [ ] 7.3 PR CI 双 job 绿（backend `mvn -B test` + frontend typecheck/build）
- [ ] 7.4 G2（具名 VL）对规格逐条审 → 合并 PR → living-merge（trips +2、auth MODIFIED 全文替换）+ G3（具名 SA）→ 归档