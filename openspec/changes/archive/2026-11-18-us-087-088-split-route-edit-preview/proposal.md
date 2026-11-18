# Proposal

## Why

分队第 2 步「分组与路线」目前只读：成员要修正活动名称、地点或时长必须跳到第 3 步的可编辑校验页，而该页的校验结果不落库，确认时服务端再从旧草稿复算，容易出现「页面显示可行、确认却失败」。同时第 3 步独立校验页与后续「队伍路线」预览割裂，一次继续要跨两屏。

需求来源：US-087（#122）、US-088（#134）；前置分析见 `requirement-workspace/requirements/US-087-088.md`、`analysis/us-087-088-dor.md`、`deep-dive.md` §US-087-088、`impact-brief.md` §US-087-088。用户 2026-11-17 裁决：两条 story 合并为一个 change，先保存后校验。

## What Changes

- 第 2 步路线卡片支持内联编辑：活动名称、地点、活动时长、各段路程时长、缓冲时长；仅 `active` 草稿可编辑，终态只读。
- 新增 `PUT /api/trips/{tripId}/split-draft/routes`（整对保存）：
  - 任意行程成员可调用（重新生成仍仅发起人）；
  - 单事务更新 `plan_node.title` / `location_name`（split-a/split-b，当前 planVersion）与草稿文档 `routes` / `updated_at`；
  - `draftVersion + 1` 乐观锁；成功后返回 `{draftVersion, routes[]}`。
- `GET /api/trips/{tripId}/split-draft` 的 `GroupRoute` **additive** 新增 `locationName`（nullable）。
- 错误契约新增 `INVALID_ROUTE_INPUT`（400，字段级非法值）；复用 `INVALID_ROUTE_PAIR`、`INVALID_GROUP_LABEL`、`SPLIT_DRAFT_INCOMPLETE`（`routes.A`/`routes.B`）、`STALE_DRAFT_VERSION`、`SPLIT_DRAFT_NOT_ACTIVE`。
- 第 2 步「下一步」改为「先保存（有改动时）→ 再 `routes:check-timing`」：
  - `feasible=true` → 进入第 3 步「队伍路线预览」；
  - `feasible=false` → 停留第 2 步，弹窗列 A/B 合计、时间窗、超窗分钟、缺失输入项；
  - 保存或校验请求失败 → 页内错误，保留输入，不跳转。
- 第 3 步由「会合时间窗校验」页改为只读「队伍路线预览」：复用 `TeamRouteGraph` / `buildGraphRows`，标题「队伍路线预览」、副标题「校验通过 · 只读预览」、A/B 人数徽标，底部「前往复核并确认」。
- 旧 `/trips/:tripId/split/timing` 重定向到 `/split/preview`；`screen-confirm.tsx` 的 `backTo` 改为预览页。
- 新增 shadcn 风格 `components/ui/dialog.tsx`，用于时间窗失败弹窗（仅「关闭」+ 完整明细）。
- 不在范围：费用与必做标识、逐节点任务、真实地图/路径、确认/取消规则、通知。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `splits`：
  - **ADDED** — "Split route pair edit"：任意成员整对编辑路线（活动名/地点/时长）、单事务双写、版本 +1、`locationName` 读取、字段级错误码。
  - **MODIFIED** — "Group route generation"：Screen 13 从只读展示改为可编辑并承接「下一步」；生成仍仅发起人、仍成对原子。
  - **MODIFIED** — "Reunion timing check"：端点与计算域不变；校验入口迁移到第 2 步「下一步」，Screen 14 由只读队伍路线预览取代。
  - **MODIFIED** — "Split draft detail read"：`GroupRoute` additive `locationName`。
  - **MODIFIED** — "Split confirmation"：判定与错误码不变；复核屏返回目标改为预览页。

## Impact

| Area | Effect |
|---|---|
| Backend | `splits` 包新增 1 个 controller 方法、1 个 service 方法、2 个 DTO、1 个错误码、1 个 repository 双写方法；复用 `ReunionTimingCalculator` |
| Frontend | Screen 13 编辑态与保存/校验链、新 `screen-preview.tsx`、`router.tsx` 新增 preview 与 timing 重定向、`screen-confirm.tsx` 返回、`types.ts`/`api.ts`/`hooks.ts`、新 `components/ui/dialog.tsx` |
| Database | 无迁移 —— 写既有 `split_draft.document` 与 `plan_node`（`title`/`location_name`） |
| Dependencies | 无新增 |
| Security | 不改 `SecurityConfig`；`PUT` 命中既有 `/api/trips/*/split-draft/**` 匹配器，401 由 `MemberGuard` 产出 |
| Specs | `openspec/specs/splits/spec.md`：1 ADDED + 4 MODIFIED（归档后生效） |
| Tests | 新增 `SplitRouteEditApiTest`；既有 splits 测试补 `locationName`；`team-route.test.ts` 扩展；E2E 编辑→失败弹窗→修正→预览→复核 |
| Requirement source | `requirement-workspace/requirements/US-087-088.md` |
| Impact brief | `requirement-workspace/impact-brief.md` §US-087-088 |

## Effort and phasing

- **Effort: L**（跨前后端；回归面含 6 个 splits 测试类与分队 11–15 屏 E2E）。
- 单 change，P3 建议三组顺序实现：① 后端保存能力与 `locationName`；② Screen 13 编辑 + 下一步保存/校验/弹窗；③ 预览页 + 路由/返回 + E2E 回归。
- 无跨 change 依赖：US-038/039/040/042/043/049/050 均已归档；US-086 图组件仅复用。

## Supersedes / boundaries

- 本变更调整 US-087（#122）原口径「第 3 步仍负责会合时间窗校验」：校验改由第 2 步「下一步」触发，第 3 步为只读预览。
- 不改变 US-049/050 的确认/取消规则与 `SPLIT_TIMING_INFEASIBLE` / `SPLIT_DRAFT_INCOMPLETE` 判定。
- 费用与必做标识（US-087 原文涉及）移出本变更，另立需求。
