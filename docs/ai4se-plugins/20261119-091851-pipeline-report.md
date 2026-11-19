# CI 流水线报告：us-091-dashboard-navigate-progress-fix-bug

- **日期：** 2026-11-19（UTC+08:00）
- **根目录：** 仓库根目录
- **阶段：** ci；CD 不在本次范围内
- **数据来源：** GitHub Actions API（只读）
- **变更：** us-091-dashboard-navigate-progress-fix-bug
- **目标：** [PR #172](https://github.com/afs-2026-zha1-group-1/gogo/pull/172) 及合并后 main 提交
- **PR head：** `88a09053f4afcd175e69cead8a04f4f3f29c2a8c`
- **合并后提交：** `d534eb728218c7c61b408b6ea84149927d8bcb05`

## 汇总

| 阶段 | 结果 | 结论 | 运行 |
|---|---|---|---|
| CI（PR） | Pass | 三项任务成功；pull_request 事件，关联上述 PR head。 | [运行 44434646837](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434646837) |
| CI（合并后） | Pass | 三项任务成功；main push 事件，针对上述合并后提交。 | [运行 44434995599](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434995599) |
| CD | 不适用 | 本次未检查部署或 CD。 | — |
| **总体** | **Pass** | 本次范围内 CI 运行完成且任务全部成功。 | — |

## E1 判定（机器证据）

**E1：✅ 全绿。** 两次 CI 运行均为 completed/success，且各自三个任务均为 completed/success；没有失败或跳过的任务。PR 运行关联 head SHA，不将其等同于合并后提交；合并后提交有独立的 push 运行。此次判定不涵盖其他提交、CD、独立验收或 G2 决策。

## 任务与检查

| 运行 | 任务 | 结果 | 时长 | 详情 | 失败原因 |
|---|---|---|---|---|---|
| PR | Backend tests | success | 64 秒 | [任务 135260330646](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434646837/job/135260330646) | 无 |
| PR | Frontend build | success | 31 秒 | [任务 135260331009](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434646837/job/135260331009) | 无 |
| PR | Browser acceptance | success | 148 秒 | [任务 135260330971](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434646837/job/135260330971) | 无 |
| main | Backend tests | success | 85 秒 | [任务 135261513046](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434995599/job/135261513046) | 无 |
| main | Frontend build | success | 30 秒 | [任务 135261513303](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434995599/job/135261513303) | 无 |
| main | Browser acceptance | success | 199 秒 | [任务 135261513714](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44434995599/job/135261513714) | 无 |

两次运行中，后端测试、前端契约检查、类型检查、单元测试、构建和 Chromium 浏览器验收步骤均显示成功。时长由 API 返回的任务开始和完成时间计算。

## 失败详情

无失败任务。

## 安全与合规

| 检查 | 结果 | 说明 |
|---|---|---|
| Secret scan | 未观察到 | CI 工作流没有明确的独立任务或步骤；不代表仓库其他控制不存在。 |
| SAST | 未观察到 | CI 工作流没有明确的独立任务或步骤。 |
| Dependency audit | 未观察到 | CI 工作流没有明确的独立任务或步骤。 |

## 残余风险

| # | 风险 | 来源 | 状态 |
|---|---|---|---|
| 1 | 本次没有验证 CD 或部署；既有 G2 Conditional 记录指出所需 CD 证据缺失。 | [G2 决策](https://github.com/afs-2026-zha1-group-1/gogo/blob/d534eb728218c7c61b408b6ea84149927d8bcb05/openspec/changes/us-091-dashboard-navigate-progress-fix-bug/g2-decision.md) | 待处理 |
| 2 | 既有本地验证 Fail 和独立验收缺口不能由 CI 成功自动消除。 | [G2 决策](https://github.com/afs-2026-zha1-group-1/gogo/blob/d534eb728218c7c61b408b6ea84149927d8bcb05/openspec/changes/us-091-dashboard-navigate-progress-fix-bug/g2-decision.md) | 待处理 |
| 3 | 当前 CI 工作流未明确运行 secret scan、SAST 或依赖审计；其他控制未检查。 | CI 工作流任务和步骤 | 待确认 |
| 4 | 本报告不证明后续提交通过 CI，也不自动变更 G2 决策。 | 运行的提交 SHA | 持续适用 |

## 产物

API 显示两个运行均无上传的 Actions artifact；不代表没有构建输出或部署产物。

## 人工确认

不适用；CI 结果由 API 取得，未申请或记录人工豁免。

## 下一步

完成既有 G2 条件，包括独立本地验证、验收及所需 CD 证据；条件完成后取得新的具名 VL 决策。本报告不触发部署，也不更改 G2。
