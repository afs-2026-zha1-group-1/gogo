# 意图捕获 — B 拆分链收口（US-049 确认拆分 / US-050 取消草稿）

- 日期: 2026-11-16
- 来源: GitHub 仓库 `afs-2026-zha1-group-1/gogo` issues **#21**（US-049）/ **#22**（US-050）；Project #2 `gogo`，均 Open / `Iteration 1` / `Priority - Must` / `Type - Split Planning`
- 看板: 两卡 2026-11-16 由 `Backlog` → **`Req Analysis`**（用户指令「US-049/050 现在开始 p0」，P0 会话内迁移）
- 捕获方式: 编码代理经 `gh issue view`（绝对路径 `%LOCALAPPDATA%\Programs\gh\bin\gh.exe`）逐字读取 issue 正文；JSON 快照核对后已删除临时文件
- 分支/交付约定: **直接在 `main` 开发**，不建特性分支、不提交 PR（用户 2026-11-16 裁决；`ci.yml` 仅在 main push / PR 触发，故 push 即跑 CI）
- 上游: P0 产出 `docs/ai4se-plugins/20261116-141840-repo-understand-brief.md`（含 D1–D7 风险、OQ-1~OQ-5）；Living Spec `openspec/specs/splits/spec.md`（5 requirement，显式排除确认/取消端点）；夹具 `requirement-workspace/acceptance-test-fixtures.md`（B 链段未含 049/050）
- ID 约定: 沿用 2026-11-15 的 US-based 命名（同 `US-031-037`），本组记为 **US-049-050**

## 共同测试上下文（两 issue 正文一致声明）

> Synthetic Singapore Friends Day trip on 2026-12-05, Asia/Singapore (+08:00).
> Alice is organizer; Ben, Chloe, and Daniel are members.
> Group A is Alice and Ben; group B is Chloe and Daniel.
> Departure is City Hall MRT at 09:30; reunion is Merlion Park at 11:30.
> Each route has a 60-minute visit and a 10-minute buffer.
> Group assignments and reunion resolution may be supplied test fixtures.

- 行程: Singapore Friends Day，2026-12-05，Asia/Singapore（+08:00）
- 成员与角色: Alice = organizer（`trip.organizer_id = 1`）、Ben/Chloe/Daniel = member
- 分组夹具: A = Alice+Ben，B = Chloe+Daniel（两组齐全、互斥、每成员恰一次）
- 窗口: 出发 City Hall MRT 09:30（scheduled end）→ 会合 Merlion Park 11:30（scheduled start），可用窗口 120 分钟
- 每路线: 60 分钟活动 + 10 分钟 buffer；US-043 夹具算式 A = 15+60+20+10 = 105、B = 20+60+20+10 = 110；超窗变体 A 末段交通 40 → 125（超 5 分钟）
- 两条 issue 均声明 **Required layers: Frontend Yes | Backend Yes | Database Yes (Read/Write)**

## 逐字 story 意图（节译，关键句保留原文）

### US-049 — Confirm the Split（issue #21 → 确认拆分）

- 意图: As a trip organizer, I would like to confirm the current route pair and assignments together after server-side revalidation, so that both groups follow one feasible agreement with locked boundaries.
- AC1: Given version 1 of the split draft has two nonempty groups, each member assigned once, and two routes passing server-side validation, When Alice confirms that version, Then **both routes, assignments, and boundaries are committed together as one confirmed split and draft editing is locked**.
- AC2: Given the client sends `confirmable=true` but route A requires **125 minutes in a 120-minute window**, When Alice confirms the split, Then the server **rejects** confirmation and the split plan remains a draft.
- AC3: Given Alice requests version 1 but the split draft is now version 2, **or Ben attempts organizer-only confirmation in a separate scenario**, When the request is processed, Then it is rejected without changing the split state.
- Design scope: 当前路线对、分组、边界、校验反馈、组织者确认；**服务器重校验决定成败**；同一屏幕上的取消动作属 US-050。
- UI 参考: Screen 15 - Split review and confirmation（截图为呈现参考，非额外 AC）。

### US-050 — Cancel an Unconfirmed Split（issue #22 → 取消草稿）

- 意图: As a split initiator, I would like to cancel my unconfirmed draft, so that the group can abandon that proposal and start a replacement without changing the main plan.
- AC1: Given **Ben initiated** the split draft and the main plan is confirmed, When Ben cancels his split draft, Then the draft is cancelled, **the main plan remains unchanged**, and **an unused split allowance permits a replacement draft**.
- AC2: Given the split plan is **confirmed**, When Ben uses the unconfirmed-draft cancellation action, Then cancellation is **rejected** and the confirmed routes remain unchanged.
- AC3: Given **Chloe did not initiate** the split draft, When she attempts to cancel Ben's draft directly, Then the request is **denied** and the split plan remains a draft.
- Design scope: 发起人专属的未确认草稿取消 + 回到未改变的主线；**不得允许取消已确认路线**；确认属 US-049。
- UI 参考: Screen 15 - Split review, cancel action。

## 承上（B 链既有事实，来自 Living Spec 与 main 代码）

| 事实 | 值 | 证据 |
|---|---|---|
| 身份 | 请求头 `X-User-Id` = `app_user.id`（字符串形式）；MVP 信任头值，非安全控制 | `MemberGuard`、`SplitDraftRepository#memberExistsGlobally`；与 `trips`/`invitations`/`main-itinerary` 一致 |
| 草稿载体 | 独立表 `split_draft(id TEXT PK, trip_id INTEGER **UNIQUE**, document TEXT, draft_version, created_at, updated_at)` | `V4__splits.sql` |
| 草稿文档 | `SplitDraftDocument(initiatorMemberId, mainPlanVersion, draftVersion, status, departureStopId, reunionStopId, groups, routes, createdAt, updatedAt)`；`status` 现仅写 `active` | `domain/SplitDraftDocument`；Living Spec 预留 `cancelled` |
| 版本语义 | 任一草稿变更 → `draft_version + 1`；写操作携带版本条件更新，不符即 `409 STALE_DRAFT_VERSION` | `updateDraftIfVersion`；spec Chain 约定 |
| 已有端点 | `GET /api/trips/{tripId}/split-draft`、`POST /api/trips/{tripId}/split-draft`、`PUT .../boundaries`、`POST .../routes:generate`、`POST .../routes:check-timing` | `SplitDraftController` |
| 校验端点 | `routes:check-timing` **纯计算、零写库**，输出 `totalMinutes/overrunMinutes/missingInputs/feasible`，不持久化 | `ReunionTimingCalculator`、REQ-007 契约 |
| 错误码 | 13 码：`MEMBER_REQUIRED 401`、`TRIP_NOT_FOUND 404`、`NOT_A_MEMBER 403`、`NOT_SPLIT_INITIATOR 403`、`NONPOSITIVE_SPLIT_WINDOW 400`、`BOUNDARY_NOT_IN_MAIN_PLAN 400`、`INVALID_ROUTE_PAIR 400`、`MAIN_PLAN_NOT_CONFIRMED 409`、`SPLIT_DRAFT_CONFLICT 409`、`SPLIT_DRAFT_NOT_ACTIVE 409`、`STALE_DRAFT_VERSION 409`、`SPLIT_BOUNDARIES_REQUIRED 409`、`ROUTE_GENERATION_FAILED 500` | `common/ErrorCode` |
| 主线确认谓词 | `trip.main_plan_confirmed`（V3 列，0/1） | `SplitDraftRepository#isMainPlanConfirmed` |
| 编号漂移（P0 发现 D1） | Living Spec 仍写 `X-Member-Id` / `trip_member.id` / `trip.split_draft` 列 / V2 迁移；代码为 `X-User-Id` / `app_user.id` / `split_draft` 表 / V4 | P0 brief §4 D1；待本变更 delta 决定是否 MODIFIED 修正 |

## 本组需要裁决的歧义（待用户裁决，P1 阻塞项）

| id | 歧义 | 为何阻塞 |
|---|---|---|
| BQ-1 | 打包粒度：US-049+US-050 合一个 change（同一 Screen 15、同一草稿状态机）还是拆两个 change | 决定 proposal/delta 边界与看板流转 |
| BQ-2 | 确认的服务端重校验口径：从草稿文档复算（复用 `ReunionTimingCalculator`，忽略客户端 `confirmable`）／要求客户端提交快照 body 再校验／引用最近一次 `check-timing` 结论 | 端点输入契约与 Database 读写点；issue AC2 只约束「服务器必须拒绝不可行」 |
| BQ-3 | 取消后「未使用额度允许替换草稿」与 `split_draft.trip_id UNIQUE` 的冲突解法：保留行置 `cancelled` 并允许在同行重建／删除行／放开唯一约束（新迁移） | 决定是否新增 V6 迁移与是否改动 US-038 的 `startDraft` 语义 |
| BQ-4 | Living Spec `splits` 的 D1 漂移：本变更 delta 内以 MODIFIED requirement 修正／先做独立 spec 修正 change／暂不修正 | 决定 delta 的 ADDED/MODIFIED 结构，避免新契约基于幻影身份 |
| BQ-5（非阻塞，建议默认） | 非 organizer 确认的错误码：新增 `NOT_SPLIT_ORGANIZER 403`（推荐，与 `NOT_SPLIT_INITIATOR` 对称）／复用 `NOT_A_MEMBER` | 契约枚举扩展，可在 P2 delta-craft 定死 |
| BQ-6（非阻塞，建议默认） | 确认后草稿可见性：`GET split-draft` 继续返回 `status='confirmed'` 的文档（编辑被锁，写端点返回 `SPLIT_DRAFT_NOT_ACTIVE`） | 影响前端 Screen 15 已确认态渲染 |
