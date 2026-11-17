# CI report（E1 slot）— us-040-split-grouping

- Date: 2026-11-17 (+08:00)
- Branch: `US-040-split-grouping-p0`，head `3d4cf28`（合并 origin/main `b0fbd79` 后），PR #117
- Runs（均为机器读取）:
  - [44062093032](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062093032)（push，head `3d4cf28`）
  - [44062087362](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062087362)（pull_request，head `3d4cf28`）
- 历史：run [44046339433](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433)（head `6b6c2c9`）与 44046867411（head `8446714`）均双绿
- PR 状态：`mergeable = MERGEABLE`、`mergeStateStatus = CLEAN`
- 完整报告：`docs/ai4se-plugins/20261117-162544-pipeline-report.md`（首次）；本轮合并后结果见本节

## E1 判定

**Pass** —— 机器读取（`gh` CLI 已认证，直接读取 run/job 结果）。

| Run | Job | Status | Duration | URL |
|---|---|---|---|---|
| 44062093032 | Backend tests | **Pass** | 54s | [job 133966292448](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062093032/job/133966292448) |
| 44062093032 | Frontend build | **Pass** | 23s | [job 133966292849](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062093032/job/133966292849) |
| 44062087362 | Backend tests | **Pass** | 44s | [job 133966273652](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062087362/job/133966273652) |
| 44062087362 | Frontend build | **Pass** | 16s | [job 133966273091](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44062087362/job/133966273091) |

## 覆盖

- 后端：`mvn -B test`，合并 main 后本地 **356/356**（与 CI 同命令）；含 `SplitAssignmentApiTest` 11 例（A9 可移动他人、A9b-N 目标非成员 403）。
- 前端：`npm ci` + `typecheck` + `vite build`；覆盖分组卡原型化改造与终态按钮禁用修复。
- 不含浏览器 E2E（由 `docs/feedback/e2e-us-040.md` 承载，12 行 Pass）。

## 失败与风险

- 失败 job：0。
- 安全：无新增依赖、无内网 lockfile 源、无凭据引入、`SecurityConfig` 未改；assignment 放开为任意成员可改组但目标必须属于本行程（`403 NOT_A_MEMBER`）且仅 `active` 草稿可写。
- 残余：无 CD 阶段（项目未配置），本 change 无部署需求。
