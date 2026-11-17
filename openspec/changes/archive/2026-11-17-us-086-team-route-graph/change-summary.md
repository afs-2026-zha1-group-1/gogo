# Change summary — us-086-team-route-graph

- Change: `us-086-team-route-graph`（US-086，issue #113）
- Archived: 2026-11-17
- PR / merge: #119 / `f5b6297`（main）
- G1: Pass（IO Johnson + SA Elian Jiang，含 P4 amendment）
- G2: Pass（VL lumi）
- G3: pending SA sign-off

## What shipped

- Screen 11 从「智能分队说明页」重写为「队伍路线」：只读 git 风格路线图（主线 / 分头 / Route A 右 / Route B 左 / 会合），右上角按草稿状态分支的分队动作。
- 分支节点由既有 `GroupRoute` 派生「活动 → 路程（travel legs 求和）→ 缓冲」；空时长显示「待补全」，不伪造 A/B。
- 无草稿/已取消仅显示已确认主线；active 未选边界显示提示；路线待生成显示占位；confirmed 只读且无发起入口。
- 入口收敛：分队 tab 直达 `/trips/{currentTripId}/split`；删除 `#/split`「分队规划」占位页与 TripDetails 分队规划区块。
- Chrome：移除拆分流程身份条；confirmed 复核页无左上返回；confirmed 队伍路线页无重复提示卡。
- 节点详情弹层、逐节点任务/费用/地点明确不在范围（2026-11-17 用户裁决）。

## Capability impact

- `splits`：1 MODIFIED（Screen 11 展示契约）。
- 无 `app-shell` / `main-itinerary` delta。
- 零后端端点、零迁移、零新依赖。

## Verification

- Final local verify: `docs/ai4se-plugins/20261117-152912-local-verify-report.md` — Overall Pass.
- CI: runs `44039479156` / `44039487042`（代码 `d2767e3`）与 `44040091852` / `44040101278`（docs head）全绿；G2 记录另引 `44040443008` / `44040451744`。
- Tests: frontend unit 12/12、typecheck/build 绿；backend 296/296。
- E2E: `docs/feedback/e2e-us-086.md` E1–E13（E7/R1 Partial）。

## Residual

- E7 网络/5xx 未构造；R1 未重复完整动作链。
- 多日行程单时间线（OQ-2 deferred）；`GroupRoute` 无逐节点时刻/地点/费用。
- 既有 AuthProvider 深链首次打开偶发竞态（非本 change）。