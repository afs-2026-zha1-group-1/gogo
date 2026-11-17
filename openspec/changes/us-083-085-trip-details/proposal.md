# Proposal: us-083-085-trip-details

## Why

看板 US-083 #106 / US-084 #110 / US-085 #111（Iteration 1 / Must）要求把行程详情页从"多个跳转入口的中转站"重构为"一屏掌握行程"：紧凑摘要 + 倒计时 + 同行成员 + 内嵌我的方案，分队确认后显示个人路线，活动中显示倒计时与下一站详情。版式权威为 US-083 两张附件参考截图（trip-current / invitation-current）。三条同屏、同读组合数据模型，作为一个垂直切片整体验收（用户裁决 R2 三合一）。

## What Changes

- **trips**
  - ADDED `Trip detail overview layout`：紧凑两行摘要（删重复信息列表）、区块顺序摘要→倒计时→同行成员→我的方案、内嵌方案时间轴（有方案直显/无方案空态）、移除偏好卡/内嵌邀请区/分队规划区/确认主线按钮。
  - ADDED `Personal route after split confirmation`：confirmed 且成员已分配 → 我的方案=我组路线+共同活动；成员隔离；未分配/未确认/cancelled 不显个人路线。
  - ADDED `Activity countdown and next stop`：未出发/活动中/活动间三态实时倒计时（每秒 tick、clamp≥0、边界切换）；下一站详情（名称/时间/地址/小组/建议出发时间，缺失=待确认，无后续=没有更多活动）。
  - MODIFIED `Trip detail main-plan navigation entry`：US-072 的"查看主线方案"链接入口由内嵌时间轴取代；MainPlan 页保留作 US-081 确认面，六态不变。
- **invitations**
  - ADDED `Invitation page entry`：独立全屏页 `#/trips/<id>/invitation`（QR+链接+复制+返回）；详情顶栏右上人形图标入口；非组织者权限态不泄链。后端签发契约（`Invitation issuance`）不变。
- **app-shell**
  - MODIFIED `Mobile shell frame`：邀请页加入全屏例外（无底部 dock，先例 login/register/join/scan/preferences）。

## Non-Goals

- 仪表盘与生成入口收敛（US-061 另行负责）。
- 分队发起/确认/取消写路径（splits capability 不动）。
- MainPlan/MainPlanInputs 页逻辑（US-081 确认面保留）。
- 邀请有效期/撤销/微信分享（参考图2 原型 extras，后端无能力；偏离 D-1）。
- 后端新增端点/迁移/依赖；新 UI 库。

## Impact

- Affected specs: `trips`（3 ADDED + 1 MODIFIED）、`invitations`（1 ADDED）、`app-shell`（1 MODIFIED）。
- Affected code: `frontend/src/pages/TripDetails.tsx`（重构）、新增 `InvitationPage.tsx`、`App.tsx`（invitation 路由 + 全屏例外）、新增组件/hook（MyPlanTimeline / CountdownCard / useCountdown / useTripOverview）、`app.css` 样式。后端预计零改动。
- 数据源：复用 `GET /api/trips/{id}`、`GET /api/trips/{id}/main-plan`、`GET /api/trips/{id}/split-draft`、`GET /api/trips/{id}/members`、`GET /api/trips/{id}/main-plan/inputs`（全部已在 main）。
- Supersedes: US-072 入口 requirement 的链接形态（内嵌取代，非删除能力——MainPlan 页仍可达）。
- 残留：D-1（邀请 extras 不做）/ D-2（时区=设备本地待 G1）/ D-3（HH:mm 拼 startDate，单日 MVP）。
- 需求证据：`requirement-workspace/requirements/US-083-085.md`、`analysis/us-083-085-dor.md`（BLOCKER=0）、`acceptance-test-fixtures.md` §US-083-085。