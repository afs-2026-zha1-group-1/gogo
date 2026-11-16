# Change summary — req-004-split-planning-chain

> P5 执行摘要（OpenSpec 归档 overlay）。G1 Pass（SA Leo + IO Emily，2026-11-15）、
> G2 Pass（VL Elian Jiang，2026-11-16）。本摘要不是 G3 决策，也不是 Living Spec 权威；
> 归档在分支 `sdd-req-004-split-planning`，PR #36 开放（MERGEABLE、CI 绿），最终并入 main 待 G3/merge。

## Intent

把"B 拆分主链"做成一条可用链路（REQ-004~007）：从**已确认主线**发起本次行程唯一拆分草稿
→ 选择出发/会合边界 → 成对原子生成 A/B 两组路线 → 校验会合时间窗，并共同提供一个
member-only 的草稿详情读取。覆盖 US-038/039/042/043（issue #17/18/19/20）。技术基准为
main 整合后的表结构 + 独立扩展表。

## What shipped

- **能力 `splits`（Living Spec 新增）**：`openspec/specs/splits/spec.md`，**5 ADDED requirement / 34 场景**
  （draft start / boundary / generation / timing / detail read）。
- **后端**：
  - common 内核 `ApiResponse`/`ErrorCode`/`ApiException`/`GlobalExceptionHandler`（13 错误码）。
  - splits：`SplitDraftController/Service/Repository` + domain/dto/provider；`X-User-Id` 身份、
    `trip.main_plan_confirmed` 判确认、独立 `split_draft`/`plan_node` 表（`V4__splits.sql`，
    与 main 的 `V5` 主行程并存）；`ensureMainPlanStops` 为新行程自动 seed 主线站点。
  - trip 侧 glue：`TripResponse.mainPlanConfirmed` + `POST /api/trips/{id}/main-plan:confirm`（成员校验）。
- **前端**（shadcn/ui + Tailwind v4 + TS + TanStack Query v5 + React Router 7）：
  - 分屏 Screen 11–14（发起/边界/路线/时间窗）；`SplitLayout` + 身份栏（X-User-Id）。
  - 入口贯通：`TripDetails`「分队规划」（确认主线 + 进入分队）、底部 TabBar「分队」标签接真实流程；
    进入时同步身份并跳 `/trips/:id/split`。
  - 修复：`app.css` 全局 `*` 重置移入 `@layer base`（修合并后 Tailwind 间距塌陷）；
    `TripsEmpty` "按编号打开" 输入框 28px→自适应（F-3）。
- **文档**：local-verify、quality-checklist、pipeline-report/ci-report、G1/G2、本摘要、G3。
- **未做（out-of-scope）**：分组移动控件（C3）、确认/取消分队端点（US-049/050）、逐景点时长可编辑并持久化。

## Verify highlights

- **本地**：`mvn -B clean test` **174/174 绿**（splits + main trip/invitation/mainplan）；`npm run build` 绿（132 modules）。
- **远端 CI（PR #36，pull_request，双 job 全绿）**：`43791174218`@0cd351f、`43791477174`@4bc8d1d、
  `43800049243`@b96f30b、`43800364414`@3539975、`43806414475`@1c00a06、`43813230077`@e20775f。
- **链路走查**：新行程 id=2 — 创建(未确认)→确认主线(true)→发起(v1)→详情(自动 2 主线站点)→边界(120min,v2)
  →生成(A National Gallery / B Gardens by the Bay,v3)→时间窗(feasible,A105/B110)；前端 TripDetails/Tab「分队」→`/trips/2/split` Screen 11(v3)。
- 证据：`docs/ai4se-plugins/20261115-231508-local-verify-report.md`、`openspec/changes/archive/2026-11-16-req-004-split-planning-chain/ci-report.md`。

## Residual risks / followups

- **F-2 spec/design 口径与实现不一致**（`X-Member-Id` vs `X-User-Id`；严格 4 表 vs 独立 `split_draft`/`plan_node` + `V5`）→ P5 同步 spec/design/UI 文案（C2，accepted deviation）。
- **pyyaml 工具缺口**：Static 扫描该命令失败，CI 2-job 结构以 node 等效核实；非阻塞。
- **未实现功能**（另开 change）：分组移动控件、逐景点停留/路程可编辑并持久化。
- **requirement-workspace REQ 编号撞车**：main 的 REQ-004/005 已被 trip-invitations/其它占用，
  split 需求文档以 `openspec/changes/.../specs/splits` 为准；requirement-workspace 并集/重编号延后。
- `X-User-Id` 为脚手架给定值信任，永不作为安全控制。
- **KB update: Skipped (not configured)** — `scripts/kb-lint.sh` 返回 SKIP(exit 0)，`scripts/README.md` 文档化；KB 未校验。

## Links

- 归档：`openspec/changes/archive/2026-11-16-req-004-split-planning-chain/`
- Living Spec：`openspec/specs/splits/spec.md`
- 设计/任务/Gate：`design.md`、`atdd-design.md`、`tasks.md`、`g1-decision.md`(Pass)、`g2-decision.md`(Pass)、`g3-decision.md`(本阶段)
- CI 证据：`ci-report.md`、`docs/ai4se-plugins/20261116-101844-pipeline-report.md`
- PR #36：https://github.com/afs-2026-zha1-group-1/gogo/pull/36
