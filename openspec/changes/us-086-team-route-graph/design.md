# Design — us-086-team-route-graph

- 依据：`specs/splits/spec.md`（1 MODIFIED）、`atdd-design.md`（E1–E9 / U1–U4）、`g1-decision.md`
- 目标：把 Screen 11 改为只读「队伍路线」总览；零后端、零迁移、零新依赖。

## 目标与非目标

- 目标：标题与右上动作；主线 / 分头 / A-B 并行 / 会合的只读时间线；状态与空态覆盖；保留既有分队规则。
- 非目标：节点弹层、逐节点任务/费用/地点、后端/DB、个人路线/倒计时、多日分段、图表库。

## 前端

### DD1 页面与路由

复用 `/trips/:tripId/split` 与 `SplitLayout`；`ScreenStart` 重写为：

- `title="队伍路线"`，`backTo="/#/trips/:id"`（保留 US-082 行程上下文）。
- `right`：状态动作按钮（DD7）；不再使用 Fork 徽章。
- `action`：无；移除底部主按钮。
- `children`：状态区 + 只读路线图 + 图例/摘要。

入口收敛（2026-11-17 P4 修订）：底部「分队」tab 直接指向 `/trips/{currentTripId}/split`（无当前行程时回退 `#/trips`）；删除 `App.tsx` 的 `#/split`「分队规划」占位页与 `TripDetails.tsx` 的「分队规划」section，不再有中间跳转页。

### DD2 数据装配与查询

- 始终 `useSplitDraft(tripId)`（`fetchDraftDetail` 在无草稿时返回 `null`，2xx）。
- 新增 `useMainPlan(tripId, enabled)`：
  - `enabled = !draft.isPending && (draft.data == null || draft.data.status === "cancelled")`。
  - 用 `api<MainPlan>` 读 `GET /api/trips/{id}/main-plan`（裸 JSON）；`404 NO_DRAFT` → `null`；其他错误抛出。
  - queryKey `["main-plan", tripId]`；不做轮询。
- 主线来源：
  - 有 `active`/`confirmed` 草稿 → `detail.mainPlanStops`（`id/name/startAt/endAt`，ISO）。
  - 无草稿/已取消 → `plan.stops`（`name/startTime/endTime`，本地 `HH:MM`）。
- 分头/会合：`departureStopId` / `reunionStopId` 在 `mainPlanStops` 中定位；分支取 `routes`。
- 草稿轮询保持 5s；主线读取仅在无草稿状态启用，不增加持续请求。

### DD3 状态优先级

| 优先级 | 条件 | 渲染 |
|---|---|---|
| 1 | 任一查询 `isPending` | Loading |
| 2 | 401/403 | 权限/登录态（沿用 `ErrorState` / 全局 unauthorized） |
| 3 | 行程 404 | 行程缺失态 |
| 4 | 草稿查询失败（非 403/404） | 可重试错误 |
| 5 | 无草稿/已取消且主线查询失败 | 可重试错误 |
| 6 | 无草稿/已取消且 `plan == null` 或 `!plan.confirmed` | 「主线未确认」前置态；动作禁用 |
| 7 | `active` 且 `departureStopId`/`reunionStopId` 为空 | 主线 + 「待选择边界」提示 |
| 8 | `active`/`confirmed` 且 `routes` 为空 | 主线 + 分头/会合 + 暂停段 + 「路线待生成」 |
| 9 | 有路线 | 完整三轨图 |
| 10 | `confirmed` | 只读图 + 「查看已确认分队」动作 |

### DD4 路线图模型

- 纯函数 `buildGraphRows(input)` 输出行数组，供组件与 UT 复用：
  - 主线行：`{kind:'main', stop, timeLabel, side}`；`side` 按索引奇偶交替（偶右/奇左）。
  - 分头行 / 会合行：`{kind:'fork'|'join', stop, timeLabel}`。
  - 分支行：`{kind:'branch', route:'a'|'b', label, durationLabel}`。
- 分支行交错顺序：A 活动 → B 活动 → A 路程 → B 路程 → A 缓冲 → B 缓冲（缺项跳过/占位见 DD5）。
- 分头到会合之间的主线以虚线（暂停）绘制；会合后恢复实线。
- 图例：全员主线 / Route A（`activityName`）/ Route B（`activityName`）；无活动名时仅 Route A/B。

### DD5 分支节点与时长

- `activityName` + `activityMinutes` → 「活动名 · N 分钟」；`activityName` 为空 → 「活动 · 待补全」。
- `travelLegsMinutes`：数组求和；空数组 → 不渲染路程节点；含 `null` → 「待补全」。
- `bufferMinutes`：`>0` 显示缓冲节点；`0` 不显示；`null` → 「缓冲 · 待补全」。
- 空值一律显示「待补全」，不按 0 处理。
- 分支标签靠外：B 在左、A 在右；主线文字左右交替，避免与分叉曲线重叠。

### DD6 时间格式化

- 有草稿：ISO → 本地 `HH:mm`（`toLocaleTimeString`，24 小时制）。
- 无草稿：主线 `startTime`/`endTime` 已是本地 `HH:MM`，原样显示。
- 分头/会合用 `departureAt`/`reunionAt`；无值时用对应 stop。两者不互相换算。
- 分支节点显示持续时长，不伪造绝对开始时刻。

### DD7 右上动作

| 状态 | 文案 | 行为 |
|---|---|---|
| 无草稿 / `cancelled` | 发起分队 | `useStartDraft` 成功 → `/trips/{id}/split/boundaries` |
| `active` | 继续分队 | 直接进入 boundaries |
| `confirmed` | 查看已确认分队 | 进入 `/split/confirm`（只读） |
| 无已确认主线 | 发起分队（禁用） | 不可点击；显示前置说明 |
| 发起失败 | — | 按钮下方展示错误（`MAIN_PLAN_NOT_CONFIRMED` / `SPLIT_DRAFT_CONFLICT` / 网络） |

前端不判定唯一性或确认资格；以服务端错误码为准。

### DD8 样式

- 使用 Tailwind 与既有 token；路线图用内联 SVG + 文本，不引图表库。
- 渐变底用局部容器类（`bg-gradient-to-b` / radial 近似），不改 `app.css`，避免与 active `us-067` / `req-020` 冲突。
- 430px shell 内不横向滚动；SVG `viewBox` 固定宽度，`w-full` 自适应。
- 节点为只读：无 `onClick`、无 `cursor-pointer`、无弹层。

### DD9 测试

- `graph-model.ts`（纯函数）+ `frontend/tests/team-route.test.ts`（`node --test`）：
  - U1 主线左右交替；
  - U2 分支「活动/路程/缓冲」派生与空值；
  - U3 时间格式化（ISO / 本地）；
  - U4 状态 → 动作映射。
- E2E 见 `atdd-design.md` E1–E9 + R1–R2，记录到 `docs/feedback/e2e-us-086.md`。
- 回归：`npm run test:unit`、`npm run typecheck`、`npm run build`、`mvn -B test`。

### DD10 零后端/迁移/依赖

不改 `backend/`、`SecurityConfig`、DTO、迁移与 `package.json`；只消费既有读接口。

## 数据与配置

无新表、无新字段、无新配置。

## 风险与偏离

- **T1** 有/无草稿时间格式不同：按 DD6 分别格式化。
- **T2** `GroupRoute` 无逐节点时刻：分支只显示时长（已由用户裁决接受）。
- **T3** 多日行程单一时间线：OQ-2 deferred，不做日期切换。
- **T4** 共享 `app.css`：DD8 约束为局部样式。
- **T5** 旧页面删除 `StatusRow`/`ForkJoin`/规则卡后，分队 12–15 屏无引用（实施前 grep 确认）。
