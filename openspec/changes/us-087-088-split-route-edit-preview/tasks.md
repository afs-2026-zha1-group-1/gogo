# 任务 — us-087-088-split-route-edit-preview

- 依据：`design.md`（DD1–DD12）、`atdd-design.md`、`specs/splits/spec.md`（46 场景）、`proposal.md`、`g1-decision.md`
- 执行规则：分支 `US-087-088-p0`（PR #135）；push/PR/合并需用户授权；不做费用/必做标识、不加迁移与依赖。
- 红先：每组先写失败验收/API 断言，再写实现，绿后勾选。

## 1. 基线与口径

- [x] 1.1 确认 `origin/main` 已并入分支（含 US-089 `RouteStep`/`destination`），delta 仍 `validate --strict` valid
- [x] 1.2 固定 A 组编辑口径：站名只读、逐站停留分钟 + 路段分钟；服务端派生合计（DD2）
- [x] 1.3 固定保存端点契约与错误码（DD1/DD3）；`INVALID_ROUTE_INPUT` 列入 `ErrorCode`

## 2. 后端领域与契约（红先）

- [x] 2.1 新增 `SaveRoutesRequest` / `RouteEditInput` DTO（A 组 `steps[].minutes`，B 组三项分钟）
- [x] 2.2 `GroupRoute` 增 `locationName`（nullable）；`SplitDraftDetailResponse` 同步
- [x] 2.3 新增 `RoutePairEdit.deriveForGroupA` 纯函数（校验段数/非负/派生合计，站名沿用）
- [x] 2.4 单测（红先）：A 派生、段数不匹配、负分钟、B 段数变化、空活动名
- [x] 2.5 `ErrorCode` 增 `INVALID_ROUTE_INPUT`（400）

## 3. 后端保存端点（红先 → 绿）

- [x] 3.1 新增 `SplitRouteEditApiTest`：S2 保存成功 + `plan_node`/文档双写 + `draftVersion+1`
- [x] 3.2 同测试：S2b 站点编辑派生合计；S3 stale 无部分写入；S4 无路线 409
- [x] 3.3 同测试：S5 非法载荷 400（pair/label/input）；S6 终态 409；S8 401/403
- [x] 3.4 `SplitDraftService.saveRoutes`：守卫 → 状态/版本 → 派生/校验 → 单事务双写 + CAS（DD3）
- [x] 3.5 `SplitDraftController` 增 `PUT /split-draft/routes`，返回 `RouteGenerationResponse`
- [x] 3.6 `SplitDraftRepository` 增 split 行 `title`/`location_name` 更新方法（按 `mainPlanVersion` + `branch_id`）

## 4. 后端读侧、校验与确认

- [x] 4.1 `getDraftDetail` 读 `location_name` 并返回 `locationName`；旧数据回填场景 S7
- [x] 4.2 `findSplitRouteActivities` 改为返回 `(title, location_name)`，不新增列/迁移
- [x] 4.3 `SplitDraftDetailApiTest` 增 `locationName`/`steps` 断言（D1/S7）
- [x] 4.4 `check-timing` A 超窗数值用例（N3a：A=175/窗口 150/overrun 25），确认端点契约不变
- [x] 4.5 `SplitConfirmApiTest` 增 CF9：编辑后按新派生合计确认；不可行仍 `SPLIT_TIMING_INFEASIBLE`
- [x] 4.6 回归：`SplitRouteGenerationApiTest`（G1/G7/G6-N…）、`SplitAssignmentApiTest`、`SplitBoundaryApiTest` 保持绿

## 5. 前端类型、API 与 hook

- [x] 5.1 `types.ts`：`GroupRoute.locationName`；`SaveRoutesRequest`/`RouteEditInput`
- [x] 5.2 `api.ts`：`saveRoutes(tripId, body)`；`hooks.ts`：`useSaveRoutes`（成功后 invalidate detail）
- [x] 5.3 `useCheckTiming` 复用；不改 check-timing 契约

## 6. Screen 13 编辑态（DD6）

- [x] 6.1 `screen-routes.tsx` 维护表单状态 + 从 detail 初始化 + `draftVersion` 变化重置
- [x] 6.2 A 组：`steps` 逐站分钟输入（站名只读）+ 路段输入 + 合计/窗口徽标
- [x] 6.3 B 组：活动名、地点、活动/路段/缓冲输入；地点与活动名相同时不重复显示
- [x] 6.4 `dirty` 比较与归一化；终态（confirmed/cancelled）只读、无「下一步」
- [x] 6.5 编辑控件在 430px shell 内不横向滚动、不遮挡状态标签

## 7. 下一步编排与弹窗（DD7/DD8）

- [x] 7.1 `onNext`：dirty → `saveRoutes`；无改动跳过；保存中禁用重复点击
- [x] 7.2 保存成功后以响应 `routes` + `windowMinutes` 调 `checkTiming`
- [x] 7.3 `feasible=true` → `/split/preview`；`feasible=false` → 弹窗（A/B 合计、窗口、超窗、缺失项）
- [x] 7.4 保存/校验失败 → 页内错误、保留输入、不跳转；`STALE_DRAFT_VERSION` 触发 refetch
- [x] 7.5 新增 `components/ui/dialog.tsx`（受控、遮罩不可点外关闭、仅「关闭」）；关闭后焦点回卡片
- [x] 7.6 E2E 断言 N1–N5、N10、N3a（A 超窗弹窗 + 停留）

## 8. 预览页与路由（DD9）

- [x] 8.1 新增 `screen-preview.tsx`：`TeamRouteGraph` + `buildGraphRows`，A steps/B 活动、只读
- [x] 8.2 标题「队伍路线预览」/副标题「校验通过 · 只读预览」/A·B 人数徽标/返回第 2 步
- [x] 8.3 底部「前往复核并确认」→ `/split/confirm`；四态（loading/error/无草稿/无路线对）
- [x] 8.4 `router.tsx` 注册 `/split/preview`；`/split/timing` 重定向；移除 `ScreenTiming` 引用
- [x] 8.5 `screen-confirm.tsx` 的 `backTo` 改为 `/split/preview`
- [x] 8.6 E2E 断言 N6/N7/N8/N9 与 Screen 13b/14/15 返回目标

## 9. 测试夹具与 E2E

- [x] 9.1 `acceptance-test-fixtures.md` 增 §US-087-088（F1–F6 + E2E trip 9101/9102）
- [x] 9.2 新增 `frontend/tests/fixtures/split-route-edit.sql`（active v3、A steps、B 分解、plan_node）
- [x] 9.3 `playwright.config.ts` 加入第二个 SQL data location（与 `dashboard.sql` 并列）
- [x] 9.4 新增 `frontend/tests/e2e/split-route-edit.spec.ts`（S1/N1–N10/Screen 13/13b/14/15）
- [x] 9.5 扩展 `frontend/tests/team-route.test.ts`（A steps 节点映射）
- [x] 9.6 反向验证：无费用字段、A 站名只读、无新迁移/依赖、CI 不改

## 10. 验证与门禁

- [x] 10.1 后端 `mvn -B test`（Windows 用 IDEA 内置 `mvn.cmd` 全路径）全绿
- [x] 10.2 前端 `npm run typecheck`、`npm run test:unit`、`npm run build` 全绿
- [x] 10.3 本地 E2E：`npm run test:e2e -- tests/e2e/split-route-edit.spec.ts` 全 Pass
- [x] 10.4 `openspec validate us-087-088-split-route-edit-preview --strict` = valid（deltaCount = 5）
- [ ] 10.5 `/sdd:local-verify-report`（含 CI E1 slot）→ G2 输入
- [x] 10.6 `/sdd:quality-checklist stage=p3`（本计划完成后）

## 11. 归档前（P5 前置）

- [ ] 11.1 对账 `docs/knowledge/architecture/tech-stack-plan.md`（新增端点、`locationName`、A steps 编辑）
- [ ] 11.2 追加 `docs/knowledge/_LOG.md` 行
- [ ] 11.3 更新 `requirement-workspace/registry.md`（P4/G2/G3 状态按实际）

## 12. 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 维度 | 结果 | 证据 |
|---|---|---|
| Spec → Design | **Pass** | 46 场景由 DD1–DD12 覆盖：保存 S2/S2b/S3–S6/S8（DD1–DD3）、读 D1/S7（DD4）、UI S1/Screen13（DD6）、下一步 N1–N5/N10/N3a（DD7/DD8）、预览 N6–N9（DD9）、确认 CF9/Screen15（DD4/DD9） |
| Design → Tasks | **Pass** | 第 2–9 组逐条映射 DD1–DD11；第 10 组验证；第 11 组归档前置 |
| ATDD → Tasks | **Pass** | API 红先（3.1–3.6、4.1–4.6）对应 atdd §2；E2E（7.6、8.6、9.4）对应 §2；UT 延后项（2.4、9.5）对应 atdd Deferred |
| 非目标反证 | **Pass** | 9.6 覆盖 atdd §5 全部 7 条 |
| 风险/阻塞 | **Pass** | G1 Revision 已 Pass；无未决 blocking OQ；R10 已由 BQ-7/BQ-8 收敛 |

自检结论：**Pass**。计划完成，下一步 `/sdd:quality-checklist stage=p3`，随后 P4 `/sdd:atdd-apply`。
