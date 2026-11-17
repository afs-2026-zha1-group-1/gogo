# US-040 任务清单（tasks）

- change：`us-040-split-grouping`；设计依据：`design.md`（DD1–DD17）、`atdd-design.md`
- 验收驱动：每条实现任务先有红测试（`atdd-design.md` §2），后补实现
- 零迁移、零新依赖、不新增路由；PR-only（不直推 `main`）

## 1. 分支与 PR（P4 起手）

- [x] 1.1 沿用既有分支 `US-040-split-grouping-p0`（P0–P3 文档已在该分支；**偏差**：未从 `origin/main` 另切 `US-040-split-grouping`）
- [x] 1.2 代码随 PR #117 提交（**偏差**：未另开代码专用 PR；PR #117 覆盖 P0–P4）

## 2. Fixtures 与红测试

- [x] 2.1 在 `requirement-workspace/acceptance-test-fixtures.md` 补 §US-040（初始 4/0、改组序列 v1→v2→v3、空组/漏组/重复组构造、单成员行程）（P3 已完成）
- [x] 2.2 `AbstractSplitApiTest` 增加 `assignAs(displayName, label, draftVersion)` 与 `updateGroups(...)`；`prepareConfirmableDraftAs` 插入「把 Chloe 分到 B 组」并把版本序列改为 1→2→3→4→5（DD17）
- [x] 2.3 新增 `SplitAssignmentApiTest`：A1–A9-N 共 10 例（含「请求体不可移动他人」）
- [x] 2.4 `SplitDraftStartApiTest` 增 S9（A=4/B=0）与 S10-N（单成员行程 → 409 `SPLIT_MEMBERS_INSUFFICIENT`）
- [x] 2.5 `SplitRouteGenerationApiTest` 增 G6-N（空组/漏组/重复组 → 409 `SPLIT_DRAFT_INCOMPLETE`），并把 `groups:move` 负向用例改写为 `assignment` 已实现
- [x] 2.6 `SplitConfirmApiTest` 增 CF8-N（空组/漏组/重复组两条）；`SplitDraftDetailApiTest` 断言改为 A=3/B=1（改组后）；`SplitDraftDocumentTest` 的 `partitionGroups` 用例改为 `initialGroups` + `withAssignment` 两条

## 3. 后端领域模型

- [x] 3.1 `SplitDraftDocument`：删除 `partitionGroups`，新增 `initialGroups(orderedMemberIds)`（A=全部、B 空），`initial`/`initialRebuilt` 改用它（DD6）
- [x] 3.2 `SplitDraftDocument`：新增 `withAssignment(groupLabel, memberId, now)`（先双组移除再加目标组、`draftVersion + 1`、保留 boundaries/routes/initiator/status）（DD7）
- [x] 3.3 纯逻辑 UT：`initialGroups`、`withAssignment`（移动/保留字段/往返不重复）红→绿

## 4. 后端端点与门禁

- [x] 4.1 `ErrorCode` 增 `INVALID_GROUP_LABEL`（400）与 `SPLIT_MEMBERS_INSUFFICIENT`（409）（DD3）
- [x] 4.2 新增 `AssignmentRequest(groupLabel, draftVersion)` DTO（DD1）
- [x] 4.3 `SplitDraftService.assign`：守卫顺序 → 幂等分支 → `withAssignment` + CAS → 返回 detail（DD2/DD4）
- [x] 4.4 `SplitDraftController` 增 `PUT /split-draft/assignment` 返回 `ApiResponse<SplitDraftDetailResponse>`
- [x] 4.5 `startDraft`（含重建）增加「成员数 ≥ 2」前置 → `SPLIT_MEMBERS_INSUFFICIENT`（DD5）
- [x] 4.6 抽出 `groupProblems(draft, memberIds)`（固定顺序 `groups.A`/`groups.B`/`groups.unassigned`/`groups.duplicate`）（DD8）
- [x] 4.7 `generateRoutes` 在 provider 前接入 `groupProblems`（DD9）
- [x] 4.8 `confirmDraft` 的 `missingDraftParts` 合并 `groupProblems`（DD10）
- [x] 4.9 A1–A9-N、S9、S10-N、G6-N、CF8-N 全绿；`mvn -B test` **314/314** 通过（含既有回归）

## 5. 前端契约层

- [x] 5.1 `types.ts` 增 `AssignmentRequest`；`api.ts` 增 `assignGroup`；`hooks.ts` 增 `useAssignGroup` 与 `useTripMembers`（DD12/DD16）
- [x] 5.2 `states.tsx`：补 `INVALID_GROUP_LABEL` / `SPLIT_MEMBERS_INSUFFICIENT` 文案，泛化 `SPLIT_DRAFT_INCOMPLETE`，新增 `details.missing` 中文化映射（DD15）

## 6. Screen 13 分组卡

- [x] 6.1 分组卡改为 A/B 两列：成员名、「我」标记、人数；标题「分组」，删除「本期不开放」文案与过时注释（DD13）
- [x] 6.2 切组按钮（非本组可点；终态隐藏）；成功后 invalidate + 提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」
- [x] 6.3 空组引导文案（OQ-12）与「需重新生成」徽标（任一组为空且仍有路线）（DD14）
- [x] 6.4 `npm run typecheck && npm run build` 通过

## 7. Screen 15 复核屏

- [x] 7.1 A/B 组改用成员名（复用 `useTripMembers`）（DD12）
- [x] 7.2 `routes` 非空时显示「路线为上次生成的版本」提示（DD14）
- [x] 7.3 `SPLIT_DRAFT_INCOMPLETE` 的 `groups.*` 缺失项以中文渲染

## 8. E2E 与验收台账

- [ ] 8.1 新建 `docs/feedback/e2e-us-040.md`，登记 Screen 11/13/15 与 A1–A9 的浏览器验收行
- [ ] 8.2 执行：单人行程发起被拒；初始 B 空；Chloe 切 B→生成被拦→切回 A/另一人切 B→生成成功；改组后旧路线保留与提示；确认/取消后切组被拒
- [ ] 8.3 反向：`#/trips/{id}/split/groups` 无页面；`git diff` 不含 `SecurityConfig.java`；无新 migration 文件

## 9. Spec 与文档对账

- [x] 9.1 `openspec validate us-040-split-grouping --strict` = valid（若需语义调整，回 `/sdd:delta-craft` 并重开 G1）
- [x] 9.2 更新 `requirement-workspace/registry.md`（US-040 行：P4 实现完成与测试计数）与 `handoff.md`
- [ ] 9.3 `docs/knowledge/architecture/tech-stack-plan.md` 增 §US-040（assignment 端点、分组完整性门禁、零迁移）+ `docs/knowledge/_LOG.md` 一行

## 10. 验证与门禁

- [ ] 10.1 `/sdd:local-verify-report`（V1–V8 + E1/E2 证据；E3 归 G2）
- [ ] 10.2 PR CI 双 job 绿（backend `mvn -B test` + frontend typecheck/build）
- [ ] 10.3 `/sdd:g2-decision-record` 后合并；P5 归档时把 delta 合入 Living Spec

## 11. P4 打磨（2026-11-17，用户反馈）

- [x] 11.1 Screen 15：终态（confirmed/cancelled）不再提供「去生成路线」，改为说明 + 「返回分队首页」；仅 active 且无路线时保留跳转
- [x] 11.2 Screen 14：底部主按钮改为「前往复核并确认」；正文的「校验时间窗」降为 outline 次按钮（仅 active 显示）
- [x] 11.3 404 诊断：无 envelope 的 404 映射为 `ENDPOINT_NOT_FOUND`，错误卡提示「后端需更新并重启」
- [x] 11.4 成员不足前置拦截：行程详情「进入分队规划」点击时先查成员数（< 2 就地提示并阻止跳转）；Screen 11 与 Screen 13 同步阻断页并隐藏发起/生成按钮

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）
| 检查项 | 结果 | 证据 |
|---|---|---|
| 38 场景全部有层归属 | Pass | `atdd-design.md` §1（API 28 / E2E 3 / 既有回归 7 行合并项） |
| 每个 ADDED/MODIFIED requirement 有实现任务 | Pass | A1–A9 → 任务 4.3/4.4；S9/S10-N → 3.1/4.5；G6-N → 4.7；CF8-N → 4.8；Screen 13/15 → 6.x/7.x |
| 每条设计决策被任务覆盖 | Pass | DD1–DD17 与任务 3.x–9.x 一一对应（DD17 → 任务 2.2–2.6） |
| Non-goals 有反向验证 | Pass | `atdd-design.md` §5 七行 + 任务 8.3 |
| 无 UT 套件设计混入 ATDD | Pass | UT 仅列为 apply 阶段 3.3 |
| 偏离已登记 | Pass | `design.md` TS-1…TS-6 |
