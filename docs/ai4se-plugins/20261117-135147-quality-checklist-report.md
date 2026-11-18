# Quality Checklist Report: p0

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\study\gogo
**Stages:** p0
**Focus:** full-stage
**Story:** US-040 发起分队并查看成员分组（issue #84）

## Summary

### p0

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P0-1 Harness / baseline skeleton present or explicitly deferred | yes | Pass | `openspec/`（8 个 Living Spec：app-shell/auth/greeting/invitations/main-itinerary/preferences/splits/trips + `changes/`、`changes/archive/`）、`docs/knowledge/`（architecture/domain/interfaces/operations/external/rules + `_INDEX/_LOG/_SCHEMA`）、`AGENTS.md`、`requirement-workspace/`（analysis/requirements/ready/archive/intents）、`scripts/`、`.github/workflows/ci.yml` 均存在 |
| P0-2 Rules carrier covers branch / test / pipeline / env / IaC / NFR (or lists gaps) | yes | Partial | `docs/knowledge/rules/` 31 个 md：architecture 6、quality 5、testing 4、security 7、process 4（`spec-first` + java/react/ts hooks）、documentation 仅 README。缺口：**无分支策略规则**（`.githooks/pre-push` + AGENTS.md 的 PR-only 约定未成规则载体）、**无流水线 / 环境 / IaC 专项规则**（`ci.yml` 存在但无规则）、**无 NFR 专项规则**（详见 Gaps） |
| P0-3 Catalog `/sdd:p0` sequence skills are resolvable | yes | Pass | `vendor/ai4se-plugins/commands/catalog.md` 中 `/sdd:repo-understand`、`/sdd:bootstrap`、`/sdd:pipeline-iac`、`/sdd:rules-govern`、`/sdd:quality-checklist` 均 `status=ready`；本次 `init-checkpoint-log.sh` 与 `probe-stage.sh --stage p0` 均退出 0 |
| P0-4 No pack isolation violations in edited pack files | no (only when pack files edited) | Skipped | 本次未编辑 `vendor/ai4se-plugins` 包内文件，仅调用其脚本（未触发隔离扫描；且本机 `NOTE tool:rg:no`） |
| P0-5 Pipeline / IaC skeleton when required by Rules | no | Skipped | Rules 未要求 IaC 骨架；`.github/workflows/ci.yml`（backend `mvn -B test` + frontend typecheck/build）已存在，无需 `/sdd:pipeline-iac` |

| **Stage Overall** | — | Partial | 焦点内必需项：P0-1 Pass、P0-2 Partial、P0-3 Pass；无 Fail，按聚合规则取 Partial |

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p0) | Partial | 唯一 Partial 来源 = P0-2 Rules 载体缺口，与 US-049-050、US-071 的 P0 判定一致，属既有项目级存量缺口，不由本故事引入 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| P0-2 | 无分支策略规则（分支命名 / 保护 / 合并口径）；当前以 `.githooks/pre-push` + AGENTS.md + 会话裁决承载 | SA | `/sdd:rules-govern` check-merge 增补 `process/branching.md` |
| P0-2 | 无流水线 / 环境 / IaC 规则文件；`ci.yml`、Maven PKIX/trustStore、gh 绝对路径（`%LOCALAPPDATA%\GitHubCLI\bin\gh.exe`）等经验未成规则 | Dev | `/sdd:pipeline-iac` 或 `/sdd:rules-govern` 增量补齐 |
| P0-2 | 无 NFR 专项规则（性能 / 可用性 / 保留期）；US-040 的分组变更与重新生成路线可能涉及并发/性能口径 | SA | 在 P1/P3 以非功能条目显式登记，或先在 Rules 立 NFR 载体 |

## Notes

- Optional / not-run / out-of-focus 项记 Skipped，不阻塞 Overall Pass；Overall 仅聚合焦点内必需项。
- 本报告不是 Gate 决定（G1/G2/G3 须由具名角色单独记录）。
- Probe 事实：`FOUND` docs/、docs/ai4se-plugins/、docs/knowledge/、docs/knowledge/rules/、docs/feedback/、openspec/、openspec/changes/、requirement-workspace/、AGENTS.md、README.md；`NOTE tool:rg:no`（本机缺 ripgrep）。
- `NOTE active-change` 共 6 个：req-002-greeting-json-sqlite、req-004-split-draft-start、req-020-manage-must-do、req-024-set-trip-budget、req-026-submit-preferences、us-067-qr-scanner。其中 `req-002`、`req-004-split-draft-start` 为历史残留空壳（US-049/050 已归档到 `changes/archive/`），会污染后续阶段探测。
- 与 US-040（发起分队并查看成员分组）直接相关的 P0 级发现，供 P1 承接（不改变本表判定）：
  1. Living Spec `openspec/specs/splits/spec.md` 现有 7 条 requirement（split draft start / boundary selection / group route generation / reunion timing check / draft detail read / confirmation / cancellation），**无「成员分组」能力**；其中 Screen 13 场景明确「分组移动控件本期不实现」，且 Group route generation 以「完整互斥 A/B 组为夹具保证的前置」为前提。
  2. 后端分组写死在发起草稿时：`SplitDraftDocument.partitionGroups()` 按成员顺序把前一半划入 A、余下划入 B（design D16）；`SplitDraftController` 7 个端点（GET/POST `split-draft`、PUT `boundaries`、`routes:generate`、`routes:check-timing`、`:confirm`、`:cancel`）**无分组/assignment 端点**，分组变更后「旧路线失效 → 版本递增」语义尚无实现载体。
  3. `SPLIT_DRAFT_INCOMPLETE` 已存在于 confirm 校验链（`SplitDraftService.missingDraftParts`），但只检查 `boundaries` 与 `routes.A/B`，**完全不校验分组完整性**（空组 / 未分组 / 重复分组不会被拦）；US-040 的「分组问题阻止确认」需在同一错误码下新增分组缺失项（如 `groups.A` / `groups.unassigned` / `groups.duplicate`）。
  4. 读面已有基础：`GET /api/trips/{tripId}/split-draft` 为 member-only 且返回 `groups`（`Map<String, List<String>>` memberId），可直接支撑「查看各小组的成员」；`draftVersion` 乐观锁机制（`STALE_DRAFT_VERSION` 409）可复用为分组变更的并发口径。
  5. 前端 `frontend/src/features/split/`（`split-layout.tsx`、`screen-routes.tsx`、`route-card.tsx`）只覆盖边界与路线展示，**无分组编辑界面**；US-040 的「选择或更换自己的小组」「组织者查看分组」需新增 UI，且分组仅本人可改（与原型允许改他人不同）。
  6. 依赖关系已闭合：US-038（#17）、US-039（#18）、US-042（#19）均 CLOSED 且能力已在 Living Spec；US-041（#85）、US-076（#55）已 CLOSED 并入本故事。故本故事增量集中在「成员自选/更换小组」+「分组完整性门禁」，P1 需裁决分组变更端点形状、成员自选与他人查看的权限边界、分组变更后草稿版本与旧路线失效语义。
- 输入证据：本会话 `probe-stage.sh --stage p0` 输出、`docs/knowledge/rules/` 文件清单、`vendor/ai4se-plugins/commands/catalog.md`、`.github/workflows/ci.yml`、`openspec/specs/splits/spec.md`、`backend/src/main/java/com/gogo/hello/splits/SplitDraftController.java`、`backend/src/main/java/com/gogo/hello/splits/SplitDraftService.java`、`backend/src/main/java/com/gogo/hello/splits/domain/SplitDraftDocument.java`、`frontend/src/features/split/`、GitHub issues #17/#18/#19/#55/#84/#85。
