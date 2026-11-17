# Proposal — US-086 队伍路线页

## Why

分队流程的入口页 `screen-start.tsx` 仍停留在旧设计：标题「智能分队」，主体是 fork-join 示意图与规则卡，底部才有一个「发起分队草稿」按钮。成员看不到“全队实际怎么走”，也不知道分头点和会合点在全天时间线中的位置；已生成 A/B 路线后，入口页依旧只显示说明文字。

原型已把该页重设计为「队伍路线」：一张 git 风格的时间线图展示全员主线、分头、A/B 并行与重新会合，右上角保留唯一的分队动作。本变更将原型落地为前端实现，消费既有读接口，不改变分队的创建、唯一性、确认与取消规则。

## What Changes

- `screen-start.tsx` 改为队伍路线页：appbar 标题「队伍路线」，右上角状态动作按钮；移除旧 fork-join 示意图、规则卡与底部主按钮。
- 新增只读 `team-route-graph` 组件：主线节点、分头/会合节点、A/B 分支、暂停段、图例；内联 SVG/CSS 实现，无新依赖。
- 数据装配：
  - 有草稿：`GET /split-draft` 的 `mainPlanStops`、`departureStopId`/`reunionStopId`、`routes`。
  - 无草稿/已取消：`GET /main-plan` 的 `stops` 与 `confirmed`。
  - 分支节点由 `GroupRoute` 派生为「活动 → 路程（travelLegs 求和）→ 缓冲」；空值显示「待补全」。
- 右上动作按状态分支：无草稿/已取消 → 发起（或替换）后进入边界；`active` → 边界；`confirmed` → 只读复核页（不出现发起入口）。
- 状态覆盖：加载、无已确认主线、待选边界、路线待生成、权限、行程缺失、读取失败可重试。
- **不做**节点详情弹层、逐节点任务/费用/地点（2026-11-17 用户裁决）。
- 零后端、零数据库迁移、零新依赖；`/trips/:tripId/split` 路由与后续四步页面不变。

## Capabilities

### New Capabilities

*（none）*

### Modified Capabilities

- `splits`：P2 将写 1 MODIFIED — Screen 11 展示契约从“发起说明页”改为“队伍路线总览 + 状态分支动作”，并声明节点只读、无详情弹层。

## Impact

| Area | Effect |
|---|---|
| Frontend | `screen-start.tsx` 重写；新增 `team-route-graph.tsx`；`hooks.ts` 增加无草稿时的主线读取；`split-layout.tsx` 复用右侧插槽；复用 `types.ts` 契约 |
| Backend | 无变更（消费 `GET /split-draft`、`GET /main-plan`） |
| Database | 无变更（零迁移） |
| Dependencies | 无新增 |
| Auth | 无变更；成员范围与 401/403/404 语义由既有后端与路由守卫提供 |
| Specs | `openspec/specs/splits/spec.md` 1 MODIFIED（P2 落地） |
| Requirement source | GitHub issue #113（US-086，Iteration 2、Priority - Must、Type - Split Planning） |
| Cross-change | US-038/049/050 的状态机与唯一性不变；US-039/042/043 页面不改；US-052/063 的个人视角与倒计时不在本变更 |
| UI reference | `ui-design-reference/screenshots/screen-11-split-start.png`（原型 `3790a22`） |
| Effort | M：1 个页面重写 + 1 个只读图组件 + 状态/数据装配与回归；无后端 |

## Acceptance mapping

| Issue AC | Owner |
|---|---|
| 1 标题「队伍路线」+ 右上动作 | 本 change |
| 2 无草稿/已取消仅主线 | 本 change |
| 3 有边界未生成路线 | 本 change |
| 4 A 右/B 左双轨与时长节点 | 本 change |
| 5 状态分支动作 | 本 change（复用 US-038/049/050 规则） |
| 6 无已确认主线前置态 | 本 change |
| 7 权限/缺失/失败态 | 本 change（沿用既有错误语义） |
| 8 节点只读、无弹层 | 本 change（不实现弹层） |

## Out of scope

见 `requirement-workspace/requirements/US-086.md` §Out of scope：节点弹层与逐节点任务/费用/地点、后端/数据库、边界/路线/时间窗/确认页面、个人路线与倒计时、多日分段、新图表依赖。

## Risks

- Living Spec 旧展示契约需在 P2 精确 MODIFIED（R1）。
- 有/无草稿的主线数据源时间格式不同，需分别格式化（R2）。
- 空时长、路线未生成、未选边界的占位必须显式，不能虚构 A/B（R3/R6）。
- `confirmed` 必须保持只读，右上动作不得出现发起入口（R4）。

详见 `requirement-workspace/impact-brief.md` §US-086。
