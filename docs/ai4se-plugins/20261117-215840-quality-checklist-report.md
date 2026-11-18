# Quality Checklist Report: p0

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\study\gogo
**Stages:** p0
**Focus:** full-stage
**Story:** US-087 手动调整分队路线并直接继续（#122）+ US-088 下一步校验时间窗并进入队伍路线预览（#134）

## Summary

### p0

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P0-1 Harness / baseline skeleton present or explicitly deferred | yes | Pass | `openspec/`（8 个 Living Spec：app-shell/auth/greeting/invitations/main-itinerary/preferences/splits/trips + `changes/`、`changes/archive/`）、`docs/knowledge/`（architecture/domain/interfaces/operations/external/rules + `_INDEX/_LOG/_SCHEMA`）、`AGENTS.md`、`requirement-workspace/`、`scripts/`、`.github/workflows/ci.yml` 均存在；本次 `probe-stage.sh --stage p0` 对应条目全部 FOUND |
| P0-2 Rules carrier covers branch / test / pipeline / env / IaC / NFR (or lists gaps) | yes | Partial | `docs/knowledge/rules/` 共 31 个 md：architecture 6、quality 5、testing 4、security 7、process 4（`spec-first` + java/react/ts hooks）、documentation 仅 README。缺口：**无分支策略规则**（PR-only 由 `.githooks/pre-push` + AGENTS.md 承载）、**无流水线 / 环境 / IaC 专项规则**（`ci.yml` 存在但无规则载体）、**无 NFR 专项规则**（详见 Gaps） |
| P0-3 Catalog `/sdd:p0` sequence skills are resolvable | yes | Pass | `vendor/ai4se-plugins/commands/catalog.md` 中 `/sdd:bootstrap`、`/sdd:rules-govern`、`/sdd:repo-understand`、`/sdd:quality-checklist` 均 `status=ready`；本次 `init-checkpoint-log.sh` 与 `probe-stage.sh --stage p0` 均退出 0 |
| P0-4 No pack isolation violations in edited pack files | no (only when pack files edited) | Skipped | 本次未编辑 `vendor/ai4se-plugins` 包内文件，仅调用其脚本；本机 `NOTE tool:rg:no`（缺 ripgrep），未触发隔离扫描 |
| P0-5 Pipeline / IaC skeleton when required by Rules | no | Skipped | Rules 未要求 IaC 骨架；`.github/workflows/ci.yml`（backend `mvn -B test` + frontend typecheck/build）已存在，无需 `/sdd:pipeline-iac` |

| **Stage Overall** | — | Partial | 焦点内必需项：P0-1 Pass、P0-2 Partial、P0-3 Pass；无 Fail，按聚合规则取 Partial |

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p0) | Partial | 唯一 Partial 来源 = P0-2 Rules 载体缺口，属既有项目级存量缺口，不由 US-087 / US-088 引入；与 US-040、US-049-050、US-071 的 P0 判定一致 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| P0-2 | 无分支策略规则（分支命名 / 保护 / 合并口径）；当前以 `.githooks/pre-push` + AGENTS.md 承载 | SA | `/sdd:rules-govern` check-merge 增补 `process/branching.md` |
| P0-2 | 无流水线 / 环境 / IaC 规则文件；`ci.yml`、Maven PKIX/trustStore、gh 绝对路径等经验未成规则 | Dev | `/sdd:pipeline-iac` 或 `/sdd:rules-govern` 增量补齐 |
| P0-2 | 无 NFR 专项规则；US-087 / US-088 涉及草稿写入、时间窗复算与弹窗提示，缺少性能/并发口径 | SA | P1 以非功能条目显式登记，或先在 Rules 立 NFR 载体 |

## Notes

- Optional / not-run / out-of-focus 项记 Skipped，不阻塞 Overall Pass；Overall 仅聚合焦点内必需项。
- 本报告不是 Gate 决定（G1/G2/G3 须由具名角色单独记录）。
- Probe 事实：`FOUND` docs/、docs/ai4se-plugins/、docs/knowledge/、docs/knowledge/rules/、docs/feedback/、openspec/、openspec/changes/、requirement-workspace/、AGENTS.md、README.md；`NOTE tool:rg:no`（本机缺 ripgrep）；`NOTE stage:p0` + `FOUND requirement-workspace/`。
- `NOTE active-change` 共 7 个：`req-002-greeting-json-sqlite`、`req-004-split-draft-start`、`req-020-manage-must-do`、`req-024-set-trip-budget`、`req-026-submit-preferences`、`us-061-view-trip-dashboard`、`us-067-qr-scanner`。其中 `req-002`、`req-004-split-draft-start` 为历史残留，探测时会持续出现，不影响 p0 判定。
- 与本批两个故事直接相关的 P0 级发现，供 P1 承接（不改变本表判定）：
  1. **第 2 步现状是只读展示**：`frontend/src/features/split/screen-routes.tsx` + `route-card.tsx` 仅渲染 `GroupRoute`（活动名与活动/路程/缓冲分钟），唯一写操作是分组迁移（`PUT .../split-draft/assignment`）。US-087（#122）的「手动调整路线并直接继续」目前**没有后端保存载体**。
  2. **路线数据分散在两处**：时长存于 `split_draft` 文档的 `routes`（`RouteDurations`），活动名称存于 `plan_node.title`（`branch_id=split-a/split-b`，由 `SplitDraftRepository.findSplitRouteActivities` 读回），`GET .../split-draft` 再拼成 `GroupRoute`。任何「编辑活动名 / 时长」的保存都必须同时覆盖这两处，并沿用 `draftVersion` 乐观锁（`STALE_DRAFT_VERSION`）。
  3. **US-088 依赖 US-087 的持久化**：若 #122 未落地，「下一步」只能校验前端未保存的编辑值，而 `:confirm` 仍从已保存文档复算（`SPLIT_TIMING_INFEASIBLE`），会出现「校验通过但确认失败」的口径分裂。P1 需裁决实现顺序（建议 #122 先于 #134）或合并为同一变更包。
  4. **校验接口可直接复用**：`POST .../split-draft/routes:check-timing` 为只读快照（`SplitDraftService.checkTiming` 仅做成员校验后调用 `ReunionTimingCalculator`），超窗/缺输入返回 200 + `feasible=false` + 每路线 `overrunMinutes` / `missingInputs`，足以支撑 US-088 的弹窗原因；前端现有 `useCheckTiming` 可直接迁移到第 2 步。
  5. **预览页可复用**：`TeamRouteGraph` + `buildGraphRows`（`frontend/src/features/split/team-route-graph.tsx`、`graph-model.ts`）已由 Screen 11「队伍路线」使用，US-088 第 3 步预览属复用而非新建图形能力。
  6. **流转触点需同步改动**：`frontend/src/router.tsx` 的 `/trips/:tripId/split/timing` 路由、`screen-routes.tsx` 的「下一步」、`screen-confirm.tsx` 的 `backTo`，以及 `frontend/tests/run-e2e.mjs`、`frontend/tests/team-route.test.ts` 中涉及时序页/流程的断言。
  7. **Living Spec 影响面**：`openspec/specs/splits/spec.md` 现有 8 条 requirement（含 `Reunion timing check` 与 `Member group assignment`）。US-088 改的是「时间窗校验入口与呈现」，P2 delta 的 MODIFIED 块必须逐字保留既有场景标题（archive 会做场景 diff）。
  8. **US-087 编辑范围含「地点和费用」，当前数据模型不支持费用**：`GroupRoute` 无费用字段，`plan_node` 无费用列（`insertSplitRoute` 仅写 `location_name`，且当前复用活动名）。P1 需收窄编辑范围或显式引入费用/地点字段，否则 P3 无法落地。
- 输入证据：本会话 `probe-stage.sh --stage p0` 输出、`docs/knowledge/rules/` 文件清单、`vendor/ai4se-plugins/commands/catalog.md`、`.github/workflows/ci.yml`、`openspec/specs/splits/spec.md`、`backend/src/main/java/com/gogo/hello/splits/SplitDraftController.java`、`SplitDraftService.java`、`SplitDraftRepository.java`、`frontend/src/features/split/`、`frontend/src/router.tsx`、`frontend/tests/`、GitHub issues #122/#134。
