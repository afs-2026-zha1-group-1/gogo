# Proposal — US-072 行程详情增加主线方案入口

## Why

成员在行程详情页看到"邀请朋友"和"分队规划"两个操作区，但两者之间缺少一条到主线方案的自然入口。底部 Tab "行程"虽已可跳到主线方案页（App.tsx `tripsHref` 逻辑），但那是一条隐式跳转——成员在行程详情页浏览完行程信息后，无法就地发现"查看大家的行程安排"这一操作。US-072 补上这条入口，使成员在分队规划前可以方便地查看已有的主线方案或了解方案尚未生成的状态。

## What Changes

- **ADDED — 行程详情页主线方案入口**：`frontend/src/pages/TripDetails.tsx` 在 `InvitationPanel` 组件之后、"分队规划" section 之前新增一个 section：标题"主线方案"，内含"查看主线方案"按钮，`href` 指向 `#/trips/{tripId}/main-plan`。
  - 入口对所有行程成员可见（组织者与普通成员均可看到并点击）。
  - 点击入口进入 MainPlan 页面，该页面已有的六种状态（loading/ready/empty/denied/missing/failed）处理后续所有场景，本故事不修改 MainPlan 逻辑。
  - 返回：MainPlan appbar 已有的 info 图标按钮 `href="#/trips/${tripId}"` 满足"回到同一行程详情"；浏览器返回同样有效。
  - 权限：非成员或未登录用户由现有 route guard（App.tsx 登录拦截）和后端 API（`GET /api/trips/{id}/main-plan` → 401/403）处理，本故事不新增鉴权。

不变：后端 API/路由/数据模型；MainPlan/MainPlanInputs 页面逻辑；InvitationPanel；分队规划 section；App.tsx parseRoute；TabBar；CSS 新增类。

## Non-Goals

- 不改变主线方案页的返回箭头（左箭头→`#/`）行为。
- 不新增"方案未确认时隐藏/禁用分队"等跨功能门控。
- 不新增列表/搜索/筛选能力。
- 不新增后端端点或修改现有端点契约。
- 不引入新 UI 组件库或依赖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `trips`：**ADDED** requirement "Trip detail main-plan navigation entry"——行程详情页必须展示一条到主线方案页面的导航入口。现有 API（`GET /api/trips/{id}`、`POST /api/trips`、`GET /api/trips/{id}/members`）不变。

## Impact

- **Requirement**：`requirement-workspace/requirements/US-072.md`；intent `intents/2026-11-16-us-072.md`；DoR `analysis/us-072-dor.md`（BLOCKER = 0）；impact brief §US-072（方向 extend，无 deep-dive）。
- **Code**：`frontend/src/pages/TripDetails.tsx`（+~8 行 JSX）。无后端改动。
- **APIs**：无新增或修改。
- **Database**：无变更。
- **Stories**：US-072（单条）。
- **Delivery**：待 P4 实施。
- **Risks**：R1 入口位置与未来 UI redesign 重排（Low）。
- **Upstream**：复用 `main-itinerary` 的 MainPlan 页面（US-031-037 已归档）、`auth` 的 session 拦截（US-066 已归档）、`app-shell` 的 `#/trips/{id}` 路由（REQ-005/US-064 已归档）。均为已签且已在 main 的契约。
- **Downstream**：后续可能为入口添加方案状态徽标或"待生成"提示文案，届时以本 requirement 的 MODIFIED 扩展。

## Effort and ordering

**Trivial**：单文件 ~8 行 JSX，无依赖/后端/新路由。预估 < 30 分钟实施含验证。无并行轨道。

## A0 deep-dive gate

US-072 为纯前端入口，impact 方向 extend 且不涉及新数据模型、新 API 契约或跨 REQ 数据交互。Deep-dive（⑨–⑫）不适用，跳过。DoR ①–⑧ 全 Pass → **A0 Pass**。
