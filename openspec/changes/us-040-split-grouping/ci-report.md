# CI report（E1 slot）— us-040-split-grouping

- Date: 2026-11-17 (+08:00)
- Branch: `US-040-split-grouping-p0`，head `6b6c2c9`，PR #117
- Run: [44046339433](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433)（event = push）
- 完整报告：`docs/ai4se-plugins/20261117-162544-pipeline-report.md`

## E1 判定

**Pass** —— 机器读取（`gh` CLI 已认证，直接读取 run/job 结果）。

| Job | Status | Duration | URL |
|---|---|---|---|
| Backend tests | **Pass** | 38s | [job 133912841568](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433/job/133912841568) |
| Frontend build | **Pass** | 20s | [job 133912841896](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433/job/133912841896) |

## 覆盖

- 后端：`mvn -B test`，与本地 315/315 同命令；含 `SplitAssignmentApiTest` 11 例（A9 可移动他人、A9b-N 目标非成员 403）。
- 前端：`npm ci` + `typecheck` + `vite build`；覆盖分组卡原型化改造与终态按钮禁用修复。
- 不含浏览器 E2E（由 `docs/feedback/e2e-us-040.md` 承载，12 行 Pass）。

## 失败与风险

- 失败 job：0。
- 安全：无新增依赖、无内网 lockfile 源、无凭据引入、`SecurityConfig` 未改；assignment 放开为任意成员可改组但目标必须属于本行程（`403 NOT_A_MEMBER`）且仅 `active` 草稿可写。
- 残余：无 CD 阶段（项目未配置），本 change 无部署需求。
