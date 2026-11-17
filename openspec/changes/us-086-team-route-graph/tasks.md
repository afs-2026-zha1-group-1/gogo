# 任务 — us-086-team-route-graph

- 依据：`design.md`（DD1–DD10）、`atdd-design.md`（E1–E9 / U1–U4）、`specs/splits/spec.md`、`g1-decision.md`（G1 Pass）
- 执行规则：P4 起手从最新 `main` 建分支；PR/合并需单独授权（`.githooks/pre-push` 禁止直推 main）。

## 1. 分支与验收准备

- [x] 1.1 从最新 `main` 建分支 `US-086-team-route-graph`
- [x] 1.2 新建 `docs/feedback/e2e-us-086.md`，写入 E1–E9 + R1–R2 空表
- [x] 1.3 复核 `requirement-workspace/acceptance-test-fixtures.md`，补 §US-086 状态构造说明（无新 seed）

## 2. 纯函数与红测

- [x] 2.1 新建 `frontend/src/features/split/graph-model.ts`：`buildGraphRows`、`branchNodes`、`formatStopTime`、`actionForStatus`
- [x] 2.2 新建 `frontend/tests/team-route.test.ts`，U1–U4 先红（`node --test`）
- [x] 2.3 实现到 U1–U4 全绿

## 3. 只读路线图组件

- [x] 3.1 新建 `frontend/src/features/split/team-route-graph.tsx`：主线、分头/会合、A/B 分支、暂停段、图例
- [x] 3.2 节点只读（无点击/无弹层）；B 左 A 右、主线文字左右交替
- [x] 3.3 空时长「待补全」、路线待生成、无边界提示
- [x] 3.4 430px 内无横向滚动；渐变底使用局部样式，不改 `app.css`

## 4. 页面与状态

- [x] 4.1 `hooks.ts` 增加 `useMainPlan(tripId, enabled)`（无草稿/已取消时读取主线）
- [x] 4.2 重写 `screen-start.tsx`：标题「队伍路线」、右上状态动作、移除旧示意图/规则卡/底部按钮
- [x] 4.3 状态优先级 DD3：loading / 403 / 404 / 失败可重试 / 主线未确认 / 无边界 / 路线待生成 / 完整图 / confirmed 只读
- [x] 4.4 右上动作 DD7：发起后进边界、active 进边界、confirmed 进复核；无主线时禁用；错误内联展示
- [x] 4.5 返回仍指向当前行程详情（US-082）
- [x] 4.6 底部「分队」tab 直接指向 `/trips/{currentTripId}/split`（无当前行程回退 `#/trips`）
- [x] 4.7 删除 `App.tsx` 的 `#/split`「分队规划」占位页与 `TripDetails.tsx` 的「分队规划」section
- [x] 4.8 移除 `SplitLayout` 的「已登录 · 姓名」身份条（11–15 屏共享生效）
- [x] 4.9 confirmed 复核页不显示左上返回按钮（保留底部返回分队首页）
- [x] 4.10 移除 confirmed 队伍路线页底部重复的「分队已确认」提示卡

## 5. E2E 与回归

- [x] 5.1 执行 E1–E9（无草稿 / 无主线 / 无边界 / 待生成 / 完整 / 状态动作 / 权限缺失失败 / 节点只读 / 已取消）
- [x] 5.2 回归 R1：分队 12–15 屏（边界 / 路线 / 时间窗 / 确认）仍可完成既有动作
- [x] 5.3 回归 R2：返回行程详情保留 trip 上下文
- [x] 5.4 反向验证：无弹层、无 A/B 虚构、无多日切换、无新依赖/迁移

## 6. 文档与校验

- [x] 6.1 `openspec validate us-086-team-route-graph --strict` = valid（如需改 delta，先回 P2）
- [x] 6.2 更新 `requirement-workspace/registry.md`、`handoff.md` 进度
- [ ] 6.3 归档前对账 `docs/knowledge/architecture/tech-stack-plan.md` 与 `_LOG.md`（若实现未改 API/DB，记录「无变更」）

## 7. 验证与门禁

- [x] 7.1 本地：`npm run test:unit`、`npm run typecheck`、`npm run build`、`mvn -B test` 全绿
- [x] 7.2 `/sdd:local-verify-report`（记录 E2E 与构建证据）
- [x] 7.3 推送分支 + 开 PR（PR #119）；CI 双 job 绿（runs 44039479156 / 44039487042）
- [ ] 7.4 `/sdd:g2-decision-record`（具名 VL）→ 合并 → `/sdd:living-merge` + G3

## 对齐自检（P3，2026-11-17）

| 检查 | 结果 | 证据 |
|---|---|---|
| Delta 场景 → Design | Pass | 4 条新场景分别落在 DD1/DD3/DD4/DD5/DD7；既有 9 场景不受影响 |
| Delta 场景 → Tasks | Pass | 组 3（图）、组 4（页面/状态/动作）、组 5（E2E）逐条覆盖 |
| Delta 场景 → ATDD | Pass | E1–E9 与场景一一对应；U1–U4 覆盖纯函数 |
| Design → Tasks | Pass | DD1–DD10 在组 2–4 有对应实现任务；DD9 对应组 2/7 |
| 任务是否越过 Spec | Pass | 无后端/DB/弹层/多日任务；组 7 的 PR/G2 属流程，不扩功能 |
| 反向验证 | Pass | ATDD §6 为每条非目标列出反向验证，组 5.4 执行 |
| 命名/依赖 | Pass | 复用 `splits` Living 与既有读接口；无新依赖 |

结论：**对齐自检 Pass**，可进入 P4。
