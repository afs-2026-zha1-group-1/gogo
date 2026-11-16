# Tasks — us-049-050-split-confirm-cancel

- Change: `openspec/changes/us-049-050-split-confirm-cancel/`
- Delta: 7 requirement / 51 scenario；Design: D1–D16；ATDD: API + E2E（`atdd-design.md`）
- 执行模式：**红先**（先写失败测试再实现）；本文件由 P3 产出，P4 `/sdd:atdd-apply` 执行
- 分支：`main` 直开发（无特性分支/PR），push 即触发 CI

## 1. 地基：错误契约 + 可空模型（D2/D3/D8）

- [ ] 1.1 **红**：`ErrorEnvelopeDetailsTest`（common）断言 `ApiError` 含 `details` 可空字段、成功响应 `error=null`、失败 `data=null`；`SplitDraftDocumentTest` 断言 `RouteDurations`/`GroupRoute` 接受 null 并回读为 null → 当前编译/断言失败
- [ ] 1.2 **绿**：`ApiResponse.ApiError` 增 `Map<String,Object> details`；`ApiException` 增可选 details 构造；`GlobalExceptionHandler` 透传（D2）
- [ ] 1.3 **绿**：`ErrorCode` +3（`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409、`SPLIT_DRAFT_INCOMPLETE` 409）（D3）
- [ ] 1.4 **绿**：`SplitDraftDocument.RouteDurations` 三处时长与 `GroupRoute` 三处时长改 `Integer`；既有调用点与 `SplitRouteGenerationApiTest` 断言放宽（值不变、允许 null）（D8）
- [ ] 1.5 **绿**：`SplitDraftDocument` 增纯方法 `confirmed(now)` / `cancelled(now)`（置 status、取消清 routes、版本不变）与 `initialRebuilt(initiator, now)`（v1/active/无边界无路线）（D4/D7）
- [ ] 1.6 验证：`cd backend && mvn -B test` 全绿（既有 90+ 测试不回归）

## 2. 确认 API（D5/D10/D11）

- [ ] 2.1 **红**：`SplitConfirmApiTest`（MockMvc + JdbcTemplate，`AbstractSplitApiTest` 基类）覆盖 CF1、CF2-N、CF3-N、CF7-N、CF4-N、CF5-N、CF6-N、R-N、守卫复用；`@BeforeEach` 重置 `split_draft` / `plan_node(split-*)` / `trip.main_plan_confirmed`；当前树 → 404 全红
- [ ] 2.2 **绿**：`SplitDraftController` 增 `POST .../split-draft:confirm`（`X-User-Id` 可缺省以落到 401）；DTO `ConfirmDraftRequest(draftVersion)`
- [ ] 2.3 **绿**：`SplitDraftRepository` 增 `findOrganizerId(tripId)`、`confirmDraftIfActive(tripId, expectedVersion, newDocument, now)`（CAS：`json_extract(document,'$.status')='active'`，`draft_version` 不变）
- [ ] 2.4 **绿**：`SplitDraftService.confirmDraft` 按 D5 顺序实现：守卫 → 组织者 → 草稿存在/active → 版本 → 完整性（`SPLIT_DRAFT_INCOMPLETE` + `details.missing`）→ 复算（`ReunionTimingCalculator`，可空映射）→ 不可行（`SPLIT_TIMING_INFEASIBLE` + `details.routes[]`）→ CAS 更新 → 返回 `getDraftDetail` 投影
- [ ] 2.5 验证：2.1 转绿；确认路径无额外写库（仅 1 次 UPDATE）；CF1 后续写端点 409 断言通过

## 3. 取消 API（D6/D10/D11）

- [ ] 3.1 **红**：`SplitCancelApiTest` 覆盖 CN1、CN2-N、CN3-N、CN4-N、CN5-N、CN6-N；CN1 含主线 `plan_node(branch_id='main')` **全列逐行快照**、split 行数=0、`routes=[]`、列 `draft_version` 回 1（重建后）
- [ ] 3.2 **绿**：`SplitDraftController` 增 `POST .../split-draft:cancel`；DTO 复用 `{draftVersion}`
- [ ] 3.3 **绿**：`SplitDraftRepository.cancelDraftIfActive(tripId, expectedVersion, newDocument, now)`（CAS + 返回行数）
- [ ] 3.4 **绿**：`SplitDraftService.cancelDraft`：守卫 → 草稿存在/active → 发起人（`NOT_SPLIT_INITIATOR`）→ 版本（`STALE_DRAFT_VERSION`）→ 事务内：CAS 更新（status=cancelled、routes=null）+ `deleteSplitRoutes` → 返回投影（`routes=[]`）
- [ ] 3.5 验证：3.1 转绿；取消后 `plan_node` 仅剩 `main` 行；重复取消 → `SPLIT_DRAFT_NOT_ACTIVE`

## 4. 发起端点的重建语义（D7）

- [ ] 4.1 **红**：`SplitDraftStartApiTest` 扩展 S8（cancelled 行重建、`mainPlanVersion=1`、列版本回 1、行数=1）、S9-N（并发重建至多一个 201）、S7′（active/confirmed → `SPLIT_DRAFT_CONFLICT`）
- [ ] 4.2 **绿**：`SplitDraftRepository.rebuildIfCancelled(tripId, newDocument, now)`（CAS `json_extract(...)='cancelled'` + `SET draft_version=1`）；`SplitDraftService.startDraft` 改为「无行→插入 / cancelled→重建 / active|confirmed→冲突」三分支
- [ ] 4.3 验证：4.1 转绿；既有 S1/S2/S3-N…S7 不回归

## 5. 详情投影终态（D9）

- [ ] 5.1 **红**：`SplitDraftDetailApiTest` 扩展 D1b（cancelled → `routes=[]` 且无幽灵 `activityName`；confirmed → 保留 routes）、确认/取消后投影与 GET 同形
- [ ] 5.2 **绿**：`getDraftDetail` 在 `routes == null` 时返回空数组；`activityName` 缺失时允许 null（不抛错）；读取不改版本
- [ ] 5.3 验证：5.1 转绿；D2（无草稿 200 data=null）不回归

## 6. 前端 Screen 15 + Screen 11 分支（D12）

- [ ] 6.1 **绿**：`api.ts` 增 `confirmSplitDraft` / `cancelSplitDraft`（`POST :confirm` / `:cancel`，body `{draftVersion}`）；`types.ts` 增 `SplitDraftStatus`、`SplitErrorDetails`（`routes[]` / `missing[]`）
- [ ] 6.2 **绿**：`hooks.ts` 增 `useConfirmDraft` / `useCancelDraft`（成功后 `invalidateQueries` 草稿查询）
- [ ] 6.3 **绿**：新增 `features/split/screen-confirm.tsx`（路线卡 + 分组 + 分解 + 窗口对比 + 状态徽标 + 组织者确认 + 发起人取消 + `error.details` 渲染 + 四态）；`router.tsx` 注册 `/trips/:tripId/split/confirm`
- [ ] 6.4 **绿**：`screen-timing.tsx` 底部动作改为「复核并确认」跳 Screen 15；confirmed/cancelled 时只读提示（C10 的 status 门禁）
- [ ] 6.5 **绿**：`screen-start.tsx` 按 `status` 分支：无草稿/cancelled → 「发起（替换）分队草稿」；active → 「下一步」；confirmed → 只读终态（S11）
- [ ] 6.6 验证：`cd frontend && npm run build`（tsc 零错误）；浏览器走查 S15 / S15-err / S11 / S14-gate / 四态

## 7. 验证与证据

- [ ] 7.1 E2E 步骤清单 `docs/feedback/e2e-us-049-050.md`（P4 执行并回填观察结果）
- [ ] 7.2 `mvn -B test` 全量 + `npm run build`；schema 断言（迁移计数 `V1–V5`、`split_draft` 列集不变）（D15）
- [ ] 7.3 `openspec validate us-049-050-split-confirm-cancel --strict` 复跑；fixtures §US-049-050 与实现逐项核对
- [ ] 7.4 `/sdd:local-verify-report`（P4 末）→ G2 前必备

## 8. 文档与收尾（P5 承接）

- [ ] 8.1 `tech-stack-plan` 补 `:confirm` / `:cancel` 两行、3 个错误码与 `error.details`（C11）
- [ ] 8.2 `registry.md` / `handoff.md` 状态更新；`_LOG.md` 追加（若动知识库）
- [ ] 8.3 下游读模型约束写入 P5 归档说明（C9/D13）
- [ ] 8.4 清理残留 change（空壳 `req-004-split-draft-start`、`req-002` 归档）（C6，可并行）

## 决策映射（design → tasks）

| 决策 | 落地任务 |
|---|---|
| D1 分层 | 2.2/2.4、3.2/3.4、5.2 |
| D2 `error.details` | 1.1/1.2、2.4、6.1/6.3 |
| D3 错误码 +3 | 1.3、2.4、3.4 |
| D4 状态机/单一真源 | 1.5、2.3/2.4、3.3/3.4、4.2 |
| D5 确认编排 | 2.2–2.5 |
| D6 取消编排 | 3.2–3.5 |
| D7 重建 | 4.1–4.3 |
| D8 可空时长 | 1.1/1.4、2.4 |
| D9 详情投影 | 5.1–5.3 |
| D10 组织者/发起人 | 2.3/2.4、3.4 |
| D11 并发/幂等 | 2.3、3.3、4.2（CAS）+ 6.3 重试 UX |
| D12 前端结构 | 6.1–6.6 |
| D13 下游读模型 | 8.3（文档约束，本变更不改下游代码） |
| D14 测试接缝 | 2.1、3.1、4.1、5.1 |
| D15 Schema 不变 | 7.2 schema 断言 |
| D16 Non-Goals 反向 | 7.2 + 各测试负向用例 |

## 四向对齐自检（Spec ↔ Design ↔ ATDD ↔ Tasks）

- **场景计数**：delta 51 场景（confirm 8 / cancel 7 / start 10 / boundary 7 / routes 6 / timing 7 / detail 6）；ATDD 矩阵覆盖全部新增与变更场景（CF1–CF7-N、CN1–CN6-N、S7′/S8/S9-N、D1b/D2、S11/S15/S14-gate、R-N）→ Pass。
- **错误码全集**：既有 13 + 新增 3 = 16，逐一在 delta/design D3/fixtures/ATDD 出现 → Pass。
- **状态迁移**：`active→confirmed`、`active→cancelled`、`cancelled→active` 各有至少一条场景（CF1、CN1、S8）与至少一个任务（2.4、3.4、4.2）→ Pass。
- **Non-Goals 反向**：不加表/迁移（7.2 schema 断言）、不改主线（3.1 快照）、confirmed 不可编辑（2.1 CF1+CF6-N）、无历史（4.1 S8 行数）、信任模型（注释约束）→ 每项 ≥1 反向 case。
- **未承接的 G1 条件**：C3→2.3/2.4/3.3/3.4/5.2；C4→6.3；C8→D4/D5/D7/D8 + 4.1/4.2；C9→8.3；C10→6.4；C11→8.1。无遗漏。
