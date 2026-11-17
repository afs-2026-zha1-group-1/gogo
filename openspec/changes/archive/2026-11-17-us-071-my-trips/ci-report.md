# Pipeline report — us-071-my-trips（phase=ci）

- Date: 2026-11-17（+08:00）
- Branch: `US-071-my-trips` → PR #102（base `main`）
- 读取方式：`gh run list` / `gh pr checks`（机器读取，非人工确认）

## Runs

| Run | Event | Head | Conclusion |
|---|---|---|---|
| `44020071898` | pull_request | `8b7b1c7`（G1 Revision 签核提交） | success |
| `44020065562` | push | `8b7b1c7` | success |
| `44014036932` | pull_request | `e3a6819`（Revision 实现） | success |
| `44014031392` | push | `e3a6819` | success |

## Jobs（最新 head `8b7b1c7`）

| Job | Result | 耗时 |
|---|---|---|
| Backend tests（`mvn -B test`） | pass | ~36–51s |
| Frontend build（lockfile check → `npm ci` → typecheck → build） | pass | ~20–23s |

## E1 判定

**E1 = 全绿**：PR 事件与 push 事件在最终 head `8b7b1c7` 上双 job success；非继承绿（每个 head 独立触发）。

## Overall

**Pass**（ci）。cd 不适用（合并前不部署）。
