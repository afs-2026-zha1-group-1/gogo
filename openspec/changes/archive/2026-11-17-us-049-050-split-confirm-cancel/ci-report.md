# CI pipeline report — us-049-050-split-confirm-cancel

- phase: **ci**（PR 阶段 n/a：本变更按用户裁决在 `main` 直开发，push 即触发）
- 采集时间: 2026-11-16（+0800），工具 `gh` v2.104.0（绝对路径）
- head: `60f44d1`（fix: view-confirmed entry）/ `64060f5`（feat: confirm & cancel + Screen 15）

## Jobs

| Run | Head | Backend tests | Frontend build | Conclusion |
|---|---|---|---|---|
| 43839036207 | `60f44d1` | success | success | **success** |
| 43833884672 | `64060f5` | success | success | **success** |
| 43822967754 | `c4f9e32`（G1 记录） | success | success | success |
| 43819674916 | `bac8095`（P2 delta） | success | success | success |

- 工作流：`.github/workflows/ci.yml`（`on.push.branches: [main]`，`on.pull_request.branches: [main]`）；job 集合 `backend` / `frontend` 未改动。
- Backend job: `mvn -B test`（Java 21，见本地等价 **214/214**）；Frontend job: `npm ci && npm run build`（tsc + vite build）。

## Failure summaries

无失败。无重跑、无 flaky 记录。

## E1 判定

**E1 = 全绿**（head `60f44d1` 的 run 43839036207，backend + frontend 双 job success）；实现提交 `64060f5` 的 run 43833884672 同样双绿。

## Security / residual risk

- 无新增密钥/凭据；未新增外网调用；`X-User-Id` 信任模型已随 US-066 会话认证收敛为 Spring Security principal。
- 残余风险见 local-verify 报告 R1–R4（确认后不可重拆属产品契约、C10 重试 UX、main 直开发无 PR、开发库漂移）。
