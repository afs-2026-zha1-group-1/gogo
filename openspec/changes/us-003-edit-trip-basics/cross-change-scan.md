# Cross-change scan — us-003-edit-trip-basics

- change-id：us-003-edit-trip-basics
- 执行人（SA）：待具名（角色分配待用户确认）
- 时间（+08:00）：2026-11-17
- 基线：分支 `US-003-edit-trip-basics` 基于 `group1/main` `42a9239`（最新远端 main）；落后远端 main `0` 个提交。脚本输出的 merge-base `cc149635` 是本地 `main` ref（落后远端 8 个提交，均为 US-071 followups 与 US-083 原型，与本 change 无文件冲突），不代表分支基线
- 输入：proposal / delta specs（trips 2 ADDED + auth 1 MODIFIED）/ `requirement-workspace/registry.md` / `openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV 与 consistency-lint

## Verdict

**脚本：BLOCKER 3 / WARNING 1。SA 复核：A1–A3 判定为启发式误报（待 SA 具名确认 + waiver），A4 为既有漂移、不在本 change 范围。见轴 3 / 轴 6。**

## 1. 自动扫描

命令：

```bash
scripts/cross-change-scan.sh us-003-edit-trip-basics --advisory
```

输出：

```text
- ref: main; upstream: main; merge-base: cc149635; behind: 0
- active changes (6): req-002-greeting-json-sqlite req-020-manage-must-do req-024-set-trip-budget
  req-026-submit-preferences us-003-edit-trip-basics us-067-qr-scanner
- identity surfaces: living=[auth main-itinerary preferences splits trips] code_files=8
- migrations: disk=[1..8] next=V9; planned=none

BLOCKER 3 / WARNING 1
A1 BLOCKER 身份横切 us-003-edit-trip-basics 认证类 change 未覆盖含身份头的 capability：main-itinerary
A2 BLOCKER 身份横切 us-003-edit-trip-basics 认证类 change 未覆盖含身份头的 capability：preferences
A3 BLOCKER 身份横切 us-003-edit-trip-basics 认证类 change 未覆盖含身份头的 capability：splits
A4 WARNING Living 漂移 openspec/specs/splits/spec.md Living Spec 写 X-Member-Id，代码使用 X-User-Id
```

## 2. 九轴复核

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一 | Pass（待登记） | active change 仅本目录用 US-003；registry.md 尚无 US-003 行（tasks 6.2 补）。issue #60 为合并版权威，#61–#64 已 CLOSED 作重复项；story-detail-iteration-1.md 旧拆分文本留作历史 |
| 2 | 迁移号唯一 | N/A | 零迁移；disk 至 V8，next=V9 未被占用 |
| 3 | 认证/身份横切 | 误报待 SA 确认 | 脚本把「含 auth delta」一律判为认证类 change（脚本 L99–104）。本 change 的 auth delta 仅改 My Account **UI 布局句与 layout scenario**，`PATCH /api/auth/me` 契约、会话主体、CSRF、1–30 校验逐字保留（MODIFIED 全文携带）；trips delta 复用既有 session principal，不引入/修改任何身份机制。main-itinerary / preferences / splits 的身份语义零变化，无需覆盖。需 SA 具名确认误报并按 §4 记 waiver |
| 4 | 错误契约 | Pass（新码待 IO 批准） | +2 码 `NOT_ORGANIZER` 403、`MAIN_PLAN_CONFIRMED` 409，扁平 `{code,message}` 与 trips/main-plan 既有包封套一致；409 与 `ALREADY_CONFIRMED`/`STALE_DRAFT` 同族。校验四码复用创建。IO 批准列入 G1 |
| 5 | 基线 | Pass | 分支基于 group1/main 42a9239，落后 0；proposal 引用的 TripController/TripRepository/TripDetails/CreateTrip/AccountPage/App.tsx 均存在。上游 8 提交带来 node:test runner（`npm run test:unit`）与 trip-date 工具，design D8 / tasks 4.5 已同步 |
| 6 | Living 与代码漂移 | Pass（记录不修） | ① Living trips "Trip main-plan confirmation state" 的「不暴露确认操作」为历史 change 口径，确认已由 US-037 交付——本 change 不修，proposal 已记录；② "Trip list read" 的 read-only 场景限定列表路径，本 change PUT 落详情资源，列表端点不变；③ A4 splits X-Member-Id 漂移为既有问题（tech-stack-plan §18 已登记 envelope 例外），不在本 change 范围 |
| 7 | 共享面 | Pass（需串行协调） | spec 面：req-020/024/026 只动 `preferences`，与本 change trips/auth 零交集。代码面：req-020/024/026 只读复用 `TripRepository.findUserId/isMember`（本 change 新增方法不改它们）；req-026 提及 TripDetails 成员区（本 change 动「行程信息」区，不同区域）；us-067 与本 change 都改 `App.tsx parseRoute`——合并时注意路由匹配顺序（scan 与 edit 都须在通用 `/trips/<id>` 之前），后合者负责 rebase 验证 |
| 8 | 依赖队列 | Pass | 依赖的 `trips`、`auth` capability 均已在 `openspec/specs/`；锁定态依赖的 main-plan 确认流程已落地（main-itinerary） |
| 9 | 夹具/seed | Pass | 沿用 V2 种子（Alice=1 组织者 trip 1，Ben=2 成员，Eve=5 非成员）；身份用会话 principal（US-066 基线）；错误码扁平包封套；锁定态用既有 confirm 端点或文档化测试 setup，与 trips spec 既有口径一致 |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| A1–A3 | 脚本误报：auth delta 为纯 UI，不涉身份横切 | SA（待具名） | G1 前 | 待 SA 确认误报并签 waiver；若 SA 判定需覆盖，则回 delta 评审 |

## 4. Waiver

| id | 范围 | 批准人（IO / SA） | 失效条件 |
|---|---|---|---|
| W1（待签） | A1–A3：本 change auth delta 仅 UI 布局，身份/会话/CSRF 契约不变，豁免 main-itinerary/preferences/splits 覆盖要求 | 待具名 SA | 若 delta 后续修订触及任何身份/API 契约语义，本 waiver 立即失效，须重跑扫描 |

## 5. G1 引用行

复制到 `g1-decision.md` 的 Inputs：

```text
- Cross-change scan: openspec/changes/us-003-edit-trip-basics/cross-change-scan.md — 脚本 BLOCKER 3 / WARNING 1；SA 复核 A1–A3 误报（W1 待签）/ A4 既有漂移不在范围
- Waiver: W1 by <SA name>, scope=auth UI-only delta 豁免身份横切覆盖, expiry=delta 触及身份/API 契约即失效
```