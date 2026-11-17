# Proposal — US-049-050 确认拆分与取消未确认草稿

## Why

B 拆分链（US-038/039/042/043，已归档并在 main）走到「时间校验」就断了：成员可以发起草稿、选边界、生成成对路线、校验会合窗口，但**永远无法把结论定稿**，也**无法主动放弃**。结果是草稿一旦生成就永久占着 `split_draft.trip_id` 唯一位，团队既不能执行拆分，也不能重新提案。US-049（issue #21）与 US-050（issue #22）补上这两个收口动作：组织者在服务端重校验后成对确认（路线对 + 分组 + 边界一次冻结），发起人可取消未确认草稿并允许替换。二者共享同一 Screen 15 与同一草稿状态机（`active → confirmed / cancelled`、`cancelled → active` 重建），因此打包为一个 change。

同时，P0 发现 Living Spec 与 main 代码存在漂移（spec 写 `X-Member-Id` / `trip_member.id` / `trip.split_draft` 列 / V2 迁移，代码是 `X-User-Id` / `app_user.id` / 独立 `split_draft` 表 / V4）。本变更一并以 MODIFIED requirement 收敛，避免新契约贴在幻影契约旁边。

## What Changes

- **ADDED — 确认拆分（US-049）**：`POST /api/trips/{tripId}/split-draft:confirm`（`{draftVersion}`）
  - 守卫顺序 = 身份 → 行程存在 → 成员资格 → **组织者**（新增 `403 NOT_SPLIT_ORGANIZER`）→ 活跃草稿 → 版本匹配 → 草稿完整性（边界 + 两条路线）。
  - **服务端从草稿文档复算**两条路线的时间可行性（复用 `ReunionTimingCalculator`：活动 + 全部交通段 + buffer vs 窗口），**客户端 `confirmable` 不参与判定**（US-049 AC2 的 125/120 用例即「客户端说 true、服务端算出超 5 分钟」）。不可行 → `409 SPLIT_TIMING_INFEASIBLE`（附 `totalMinutes` / `overrunMinutes` / `missingInputs`）。
  - 成功 → 单事务把 `split_draft.document.status` 置 `confirmed`，`draft_version` 不变；路线对、分组、边界即生效契约（生成时已落 `plan_node`），草稿从此锁定：后续 `PUT boundaries`、`POST routes:generate` 返回 `409 SPLIT_DRAFT_NOT_ACTIVE`。
- **ADDED — 取消未确认草稿（US-050）**：`POST /api/trips/{tripId}/split-draft:cancel`（`{draftVersion}`）
  - 守卫同上但权限为**发起人**（复用 `403 NOT_SPLIT_INITIATOR`）→ 活跃草稿 → 版本匹配。
  - 成功 → 单事务把 `status` 置 `cancelled` 并删除该行程的 split 路线节点（`plan_node.branch_id IN ('split-a','split-b')`）；`branch_id='main'` 节点逐行不变（US-050 AC1「main plan remains unchanged」）。
  - 已确认草稿不可取消 → `409 SPLIT_DRAFT_NOT_ACTIVE`（US-050 AC2）。
- **MODIFIED — 发起草稿的重建语义**：`POST /api/trips/{tripId}/split-draft` 在「行存在且 `status = cancelled`」时**在同一行重建**（调用者为新发起人、`draftVersion = 1`、`status = active`、边界/路线清空），即 US-050 AC1「unused split allowance permits a replacement draft」。`active` / `confirmed` 行仍返回 `409 SPLIT_DRAFT_CONFLICT`。`split_draft.trip_id UNIQUE` 保持不变，**无新迁移**。
- **MODIFIED — 链级约定纠偏**：`splits` 的身份头 `X-Member-Id` → `X-User-Id`（`app_user.id`）、草稿载体 `trip.split_draft` 列 → `split_draft` 表、迁移编号 V2 → V4（与 main 的 `V1–V5` 实际序列一致）。落地形态：delta 的 Purpose 重写链级约定，并把五个既有 requirement（start / boundary / route generation / timing check / detail read）整体以 MODIFIED 重述——只改身份头、载体、迁移编号与活跃态语义，既有场景集合不变，另新增两个场景（S8 取消后重建、D1b 已确认/已取消仍可读）。
- **错误契约扩展（+2）**：`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409（明细体）；其余复用既有 13 码（`MEMBER_REQUIRED` 401、`TRIP_NOT_FOUND` 404、`NOT_A_MEMBER` 403、`NOT_SPLIT_INITIATOR` 403、`STALE_DRAFT_VERSION` 409、`SPLIT_DRAFT_NOT_ACTIVE` 409、`SPLIT_BOUNDARIES_REQUIRED` 409、`INVALID_ROUTE_PAIR` 400 等）。只有 `code` 是契约。
- **Frontend — Screen 15**：`/trips/:tripId/split/confirm`，展示两条路线卡（分组 + 活动/交通/buffer 分解 + 窗口对比）、边界、校验结论与状态徽标；组织者确认按钮、发起人取消动作；强制 error / empty（无草稿）/ loading / permission 四态，并渲染 `confirmed` 与 `cancelled` 终态。
- **测试**：`SplitConfirmApiTest`、`SplitCancelApiTest`（红先）+ `SplitDraftDocument` 状态迁移单测 + `SplitDraftStartApiTest` 重建用例；夹具矩阵 CF1–CF6 / CN1–CN4 / R1–R2。

不变：greeting、trips、invitations、main-itinerary 行为；`V1–V5` 迁移（无新迁移）；`.github/workflows/ci.yml`；app-shell 导航；真实地图/路径供给（R2）。无破坏性契约变更。

## Non-Goals

- 不新增表、不新增迁移，不建拆分历史/审计（单行草稿只保留最新状态）。
- 不做确认后的重新规划、回滚或版本并存（R2 预留）。
- 不做多草稿并存、半边界保存、分组移动控件。
- 不做通知（邮件/推送/队列）、保留期与 SLA 策略（OQ-N7 deferred，owner Dev）。
- 不引入会话认证/真实鉴权，不以 `X-User-Id` 作为安全控制。
- 不改 app-shell 导航结构，不新增 tab。

## Capabilities

### New Capabilities

无（两能力都落在既有 `splits` 能力内）。

### Modified Capabilities

- `splits`：
  - **MODIFIED** 链级约定（身份头、草稿载体、迁移编号）与 G requirement（草稿状态机加入 `confirmed` / `cancelled` 迁移、取消后同重建语义）。
  - **ADDED** 两条 requirement：「Confirm the split」（组织者、服务端复算、成对提交、锁定）与「Cancel an unconfirmed split」（发起人、清除 split 路线、允许替换）。

## Impact

- **Requirement**：`requirement-workspace/requirements/US-049-050.md`；intent `intents/2026-11-16-us-049-050-split-confirm-cancel.md`；DoR `analysis/us-049-050-dor.md`（BLOCKER = 0）；deep-dive §US-049-050（⑨–⑫ 全 Pass）；impact brief §US-049-050；fixtures §US-049-050。
- **Code**：`backend/src/main/java/com/gogo/hello/splits/**`（Controller +2 端点、Service 状态机与复算编排、Repository +3 查询、`SplitDraftDocument` 状态迁移、2 个新 DTO）、`common/ErrorCode`（+2）；前端 `frontend/src/features/split/**` + `router.tsx`。greeting / trip / invitation / mainplan 包不动。
- **APIs**（契约在 P2 delta-craft 定死）：`POST /api/trips/{tripId}/split-draft:confirm`（200，返回既有草稿详情投影、`status=confirmed`）、`POST /api/trips/{tripId}/split-draft:cancel`（200，同投影、`status=cancelled`）；既有两个写端点在 `confirmed` 后统一 `409 SPLIT_DRAFT_NOT_ACTIVE`。
- **Database**：**无 schema 变更、无新迁移**。状态落在既有 `split_draft.document` JSON 的 `status`；取消额外删除 `plan_node` 的 split 分支行（同一事务）。
- **Stories**：issue #21（US-049）、#22（US-050），2026-11-16 已 `Backlog → Req Analysis`；`/sdd:story-split` Skipped（issue 已在看板，两条 US 一个切片）。
- **Delivery**：直接在 `main` 开发，不建特性分支、不提交 PR（用户 2026-11-16 裁决）；`ci.yml` 在 main push 触发，push 即验证。
- **Risks**（impact §7）：R1 spec 漂移（本 delta 收敛）、R2 split 路线删除与「主线不变」口径（夹具逐行比对）、R3 锁定语义依赖既有 `SPLIT_DRAFT_NOT_ACTIVE`、R4 `main` 直开发缺 PR 审查（以 G1/G2/G3 补偿）、R5 错误枚举扩展（G1 IO 复核）、R6 旧 change 残留噪声。
- **Upstream（本变更依赖）**：US-038 发起端点与 `split_draft` 表/`trip_id UNIQUE`、US-039 边界与版本条件更新、US-042 成对路线生成与 `plan_node(split-a/b)`、US-043 纯计算校验域、`main-itinerary` 的 `trip.main_plan_confirmed`、`trips` 的成员/组织者读模型。均为已归档且已在 main 的契约，本期只读/复用，除 `startDraft` 的 cancelled 重建与写端点活跃态拒绝外不改其行为。
- **Downstream（本变更影响）**：US-052（查看自己路线）、US-058（完成共享行程）、US-063（重聚倒计时）等后续 story 读到的「已确认拆分」将成为已确认事实；`tech-stack-plan` 的 API 清单需在 P5 归档时补两行；看板 #21/#22 在 G3 后转 Done。

## Effort and ordering

**Small-medium**：2 个写端点、2 个新错误码、0 迁移、1 个新屏幕、约 12 条验收 case（CF/CN + 反向），体量小于 US-031-037。依赖草图：`状态机与守卫 → 服务端复算与确认 → 取消与重建 → 错误契约与夹具 → Screen 15 → ATDD 矩阵`。无并行轨道。

## A0 deep-dive gate

US-049-050 属新增能力（在既有 capability 内），deep-dive 在范围内。`deep-dive.md` §US-049-050：⑨ 数据契约（单行草稿模型、三态状态机、确认/取消/重建的列与文档变更表，无 `{TBD}`）；⑩ 边界枚举（14 行覆盖全部场景分支，锁定/历史/重规划显式 out）；⑪ 跨 REQ（与 US-038/039/042/043 的守卫、版本、节点语义逐项对齐；D1 漂移收敛为 MODIFIED）；⑫ 展示契约（Screen 15 单表面的触发/接收者/字段/通道 + 四态）。**四项全 Pass → A0 Pass，允许拆分**。单 change 与四条 blocking 裁决已由用户 2026-11-16 确认。

## Known deviations carried into later stages

- `splits` Living Spec 的三处历史漂移在本 delta 内以 MODIFIED 修正（P2 必须落地，否则 P3/P4 会按旧身份实现）。
- P0 quality-checklist 为 **Partial**（Rules 缺分支/流水线/环境/IaC/NFR 载体）；本变更以 `main` 直开发的新裁决替代分支规则，需在 G1 记录为已知偏差。
- `main` 直开发无 PR 审查：G2 证据以「本地验证 + main push CI」组合呈现，G3 由 SA 具名签核。
- OQ-N7 的 NFR 遗留（确认记录保留期 / SLA）仍 deferred，owner Dev；本期不发明保留策略。
