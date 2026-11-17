# ATDD 设计 — us-086-team-route-graph

- 依据：`specs/splits/spec.md`（1 MODIFIED；4 条 Screen 11 场景）、`proposal.md`、`g1-decision.md`（G1 Pass）
- 范围：纯前端；无新增/修改 API、无迁移

## 1. ATDD 分层

| 层 | 覆盖 | 说明 |
|---|---|---|
| API | **N/A** | 本 change 不改端点；`GET /split-draft`、`GET /main-plan` 只作为 E2E 前置数据与状态来源，不产生新的 API 验收 |
| E2E | E1–E9 + R1–R2 | 浏览器内验证标题/动作/路线图/状态/权限；手动或脚本化浏览器步骤记录到 `docs/feedback/e2e-us-086.md` |
| UT（apply 时） | U1–U4 | 纯函数：`buildGraphRows`、`branchNodes`、`formatStopTime`、`actionForStatus`；复用 `node --test`（Node 24 TS type stripping） |

## 2. E2E 场景

| id | 场景 | 预期 |
|---|---|---|
| E1 | 无草稿、主线已确认 | 标题「队伍路线」；右上「发起分队」；仅主线；无 A/B |
| E2 | 无已确认主线 | 前置条件态；分队动作不可用；不渲染其他行程 |
| E3 | `active` 未选边界 | 主线 + 「待选择分头/会合边界」；无分头/会合节点 |
| E4 | `active` 已选边界、未生成路线 | 分头/会合节点 + 主线暂停段；A/B 显示「路线待生成」 |
| E5 | 两条路线已生成 | A 右 B 左；分支「活动 → 路程 → 缓冲」时长；主线文字左右交替 |
| E6 | 状态动作 | 无草稿/取消 → 发起后进边界；active → 边界；confirmed → 只读复核且无发起入口 |
| E7 | 权限 / 行程缺失 / 读取失败 | 403 / 404 / 可重试错误；无跨行程泄漏 |
| E8 | 节点只读 | 点击节点不打开弹层、无任务/费用/地点 |
| E9 | 已取消草稿 | 回主线视图，不残留 A/B |
| R1 | 分队 12–15 屏回归 | 边界/路线/时间窗/确认页面仍可进入并完成既有动作 |
| R2 | 返回上下文 | 返回行程详情仍解析当前 trip（US-082） |

## 3. 生产代码之前先写什么

1. `docs/feedback/e2e-us-086.md` 建 E1–E9 + R1–R2 的空表（P4 执行时逐行填结果）。
2. `frontend/tests/team-route.test.ts` 先写 U1–U4（红），再实现纯函数。
3. 不新增 API 测试；既有 splits/mainplan 测试保持绿。

## 4. Local vs CI gate

- Local：`cd frontend && npm run test:unit && npm run typecheck && npm run build`；`cd backend && mvn -B test`（回归，不改后端）；浏览器 E2E。
- CI：沿用 `.github/workflows/ci.yml`（Backend tests + Frontend build），不新增 job。
- G2 前需 PR + CI 绿（P4 之后、人工授权）。

## 5. Fixtures 策略

复用既有 `Singapore Friends Day` 演示行程与成员，不新增 seed/迁移。状态通过既有流程或测试夹具构造：

| 状态 | 构造方式 |
|---|---|
| 无草稿 | 新行程或已取消后删除草稿行（测试夹具） |
| active 无边界 | 发起草稿后不保存边界 |
| active 有边界无路线 | 保存边界后不生成路线 |
| active 有路线 | 保存边界 + 生成路线 |
| confirmed | 生成路线 + 组织者确认（US-049） |
| cancelled | 发起后取消（US-050） |
| 无已确认主线 | 未确认主线的新行程 |

## 6. 非目标与反向验证

| 非目标 | 反向验证 |
|---|---|
| 不加后端/迁移/依赖 | `git diff --stat backend/ package.json` 为空；无新迁移文件 |
| 不做节点弹层 | E8：点击任意节点无 dialog/sheet，无任务/费用/地点文本 |
| 不虚构 A/B | E1/E3/E9：无路线或无边界时不出现 A/B 活动名 |
| 不做多日分段 | 页面只有一个时间线，无日期切换控件 |
| 不改变分队规则 | E6/R1：confirmed 无发起入口；已取消可替换；唯一性仍由后端拒绝 |

## 7. NFR 测试

本需求未定义可测 NFR（无性能/SLA/可观测性指标）；经用户 2026-11-17 确认，**不纳入** ATDD。若后续需要，另立变更或补验收项。
