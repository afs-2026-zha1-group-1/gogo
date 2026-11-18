# Cross-change scan — us-003-edit-trip-basics

- change-id：`us-003-edit-trip-basics`
- 执行人（SA）：Emily（2026-11-17 用户指令代记）
- 时间（+08:00）：2026-11-17
- 基线：分支 `US-003-edit-trip-basics` 基于 `group1/main` `42a9239`（落后远端 main `0` 个提交）
- 输入：proposal / design / delta specs（trips 2 ADDED、main-itinerary 3 MODIFIED + 2 ADDED、invitations 2 MODIFIED、splits 1 ADDED、auth 1 MODIFIED）/ `requirement-workspace/registry.md` / `openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV 与 consistency-lint
- 口径说明：`scripts/cross-change-scan.sh`、`openspec/templates/cross-change-scan.md` 与 `@rule:g1-cross-change-scan` 当前不在仓库（US-082 归档同样引用），本次按九轴手工扫描；工具链缺口记入 G1 Residual，非阻塞。

## Verdict

**手工九轴：BLOCKER 0 / WARNING 2 / WAIVER 1。**

- A2 WARNING：脚本式“认证类 change 未覆盖 preferences”为启发式误报——本 change 不改 preferences 的身份/会话/CSRF 语义（W1）。
- A4 WARNING：Living `splits` 写 `X-Member-Id`、代码用 `X-User-Id`，属既有漂移，不在本 change 修。
- 说明：main-itinerary 已由真实 delta 覆盖（stop 编辑写入 + authorization MODIFIED），splits 已由 US-051 delta 覆盖；仅 preferences 需 W1。

## 1. 扫描范围

```text
ref: US-003-edit-trip-basics; upstream: main; merge-base: 42a9239; behind: 0
active changes (6): req-002 req-020 req-024 req-026 us-003-edit-trip-basics us-067-qr-scanner
identity surfaces: living=[auth invitations main-itinerary preferences splits trips]
migrations: disk=[1..9] next=V10; planned=V10 (us-003)
```

## 2. 九轴复核

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一 | Pass（待登记） | active change 仅本目录用 US-003；本 change 同时补 US-051（此前未实现）与 2026-11-17 裁决的“主线 stop 编辑”范围扩写（US-074 的地点/时间编辑；US-075/077 不在范围）。registry.md 尚无 US-003/US-051 行（tasks 9.2 补）。 |
| 2 | 迁移号唯一 | Pass | V10 紧随上游 V9（默认兴趣）；`trip.joining_closed` + `main_plan_draft.trip_basics_json` 单迁移；其他 active change 无迁移。 |
| 3 | 认证/身份横切 | Pass（W1） | auth delta 仅 My Account UI；trips 新写端点复用 session principal；main-itinerary 新增 stop 编辑写入面并 MODIFIED authorization，但复用既有 session principal/`NOT_ORGANIZER`，不引入/修改身份机制；invitations/splits delta 同样复用既有身份（splits 沿用 `MemberGuard` 例外）。preferences 零变化 → A2 误报，记 W1。 |
| 4 | 错误契约 | Pass（IO 批准） | 新码：`SPLIT_DRAFT_ACTIVE` 409、`SPLIT_CONFIRMED` 409（trips 扁平）、`SPLIT_ALREADY_DEPARTED` 409（splits `{data,error}`）、`STOP_NOT_FOUND` 404、`INVALID_TIME` 400、`INVALID_TIME_RANGE` 400（main-itinerary 扁平）；复用 `NOT_ORGANIZER`、`STALE_DRAFT`、`ALREADY_CONFIRMED`、`NO_DRAFT`、`SPLIT_DRAFT_NOT_ACTIVE`、`STALE_DRAFT_VERSION`、`NOT_SPLIT_ORGANIZER`、`NAME_REQUIRED`；不再使用 `MAIN_PLAN_CONFIRMED`。 |
| 5 | 基线 | Pass | `TripController`/`TripRepository`/`MainPlanService`/`MainPlanRepository`/`InvitationRepository`/`SplitDraft*`/`TripDetails`/`MainPlan`/`Join`/`screen-confirm` 均存在；V10 紧随上游 V9；US-050 active 取消已落地，US-051 待补；`main_plan_stop` 表与 `MainPlan.tsx` 已存在，可承载 stop 编辑。 |
| 6 | Living 与代码漂移 | Pass（记录不修） | ① Living trips「不暴露确认操作」为历史措辞，实际确认已由 US-037 交付；② 列表 read-only 场景限定列表路径，本 change PUT 落详情资源；③ splits `X-Member-Id` 漂移为既有；④ 新 `joining_closed` 改变加入门禁属本 change 显式 MODIFIED，非静默。 |
| 7 | 共享面 | Pass（需串行协调） | spec：req-020/024/026 只动 preferences；us-067 与本报 change 都改 `App.tsx parseRoute`（edit 路由须在通用 `/trips/<id>` 之前，后合者 rebase 验证）。代码：`TripDetails`（编辑区/确认按钮）、`MainPlan`（stale 弹窗 + per-stop 编辑）、`InvitationPanel`/`Join`（joiningClosed）、split confirm 屏（US-051）。 |
| 8 | 依赖队列 | Pass | 依赖 capability 均已在 `openspec/specs/`；主线确认/分队/邀请流程已落地；V10 在 V9 之后；US-051 以 ADDED 补入，不改 US-050 的 active 取消。 |
| 9 | 夹具/seed | Pass | 沿用 V2 种子（Alice=1 组织者 trip 1，Ben=2 成员，Eve=5 非成员）；V10 回填 `joining_closed`；confirmed split 用既有 confirm 流程；新夹具覆盖 active/confirmed 分队、行程快照与 stop 编辑（四 fixture stops、重叠场景）。 |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| — | 无 blocking 缺口 | — | — | closed |

## 4. Waiver

| id | 范围 | 批准人（IO / SA） | 失效条件 |
|---|---|---|---|
| W1 | A2：本 change 不改 preferences 的身份/会话/CSRF 语义，豁免 preferences 身份横切覆盖要求 | SA Emily（2026-11-17 按用户指令代记） | 若 delta 后续触及 preferences 的身份/API 契约，W1 立即失效，须重跑扫描 |

## 5. G1 引用行

复制到 `g1-decision.md` 的 Inputs：

```text
- Cross-change scan: openspec/changes/us-003-edit-trip-basics/cross-change-scan.md — 手工九轴 BLOCKER 0 / WARNING 2 / WAIVER 1（A2 preferences 误报 W1；A4 splits 既有漂移）；main-itinerary 已由 stop 编辑 + authorization delta 覆盖
- Waiver: W1 by Emily (SA), scope=preferences identity no-op, expiry=delta 触及 preferences 身份/API 契约即失效
```
