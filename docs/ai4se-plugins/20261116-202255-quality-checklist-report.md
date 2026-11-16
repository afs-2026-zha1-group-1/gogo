# Quality Checklist Report: p0

**Date:** 2026-11-16 (timezone: +08:00)
**Root:** d:\study\gogo
**Stages:** p0
**Focus:** full-stage

## Summary

### p0

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P0-1 Harness / baseline skeleton present or explicitly deferred | yes | Pass | `openspec/`（7 个能力 spec：app-shell/auth/greeting/invitations/main-itinerary/splits/trips + `changes/`、`changes/archive/`）、`docs/knowledge/`（architecture/domain/interfaces/operations/external/rules + `_INDEX/_LOG/_SCHEMA`）、`AGENTS.md`、`requirement-workspace/`（analysis/requirements/ready/archive）、`scripts/`、`.github/workflows/ci.yml` 均存在 |
| P0-2 Rules carrier covers branch / test / pipeline / env / IaC / NFR (or lists gaps) | yes | Partial | `docs/knowledge/rules/` 31 文件：architecture 6（含 TS）、quality 5、testing 4、security 7、process 4（`spec-first` + java/react/ts hooks）、documentation（仅 README）。缺口：**无分支策略规则**、**无流水线 / 环境 / IaC 专项规则**（`ci.yml` 存在但无规则载体）、**无 NFR 专项规则**（详见 Gaps） |
| P0-3 Catalog `/sdd:p0` sequence skills are resolvable | yes | Pass | `vendor/ai4se-plugins/commands/catalog.md` 中 `/sdd:repo-understand`、`/sdd:bootstrap`、`/sdd:pipeline-iac`、`/sdd:rules-govern`、`/sdd:quality-checklist` 均 `status=ready`；本次实际执行 `init-checkpoint-log.sh` 与 `probe-stage.sh --stage p0` 均退出 0 |
| P0-4 No pack isolation violations in edited pack files | no (only when pack files edited) | Skipped | 本次未编辑 `vendor/ai4se-plugins` 包内文件，仅调用其脚本（未触发隔离扫描） |
| P0-5 Pipeline / IaC skeleton when required by Rules | no | Skipped | Rules 未要求 IaC 骨架；`.github/workflows/ci.yml` 已存在（backend `mvn -B test` + frontend typecheck/build），无需 `/sdd:pipeline-iac` |

| **Stage Overall** | — | Partial | 焦点内必需项：P0-1 Pass、P0-2 Partial、P0-3 Pass；无 Fail，按聚合规则取 Partial |

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p0) | Partial | 唯一 Partial 来源 = P0-2 Rules 载体缺口（分支 / 流水线 / 环境 / IaC / NFR），与 US-049-050 的 P0 判定一致 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| P0-2 | 无分支策略规则（分支命名 / 保护 / 合并口径），当前以会话裁决（main 直开发、无特性分支/PR）替代 | SA | `/sdd:rules-govern` check-merge 增补 `process/branching.md` |
| P0-2 | 无流水线 / 环境 / IaC 规则文件；`ci.yml`、Maven PKIX/trustStore、gh 绝对路径（`%LOCALAPPDATA%\Programs\gh\bin`）等经验未成规则 | Dev | `/sdd:pipeline-iac` 或 `/sdd:rules-govern` 增量补齐 |
| P0-2 | 无 NFR 专项规则（性能 / 可用性 / 保留期）；US-071 的列表分页与加载性能口径目前无规则可依 | SA | 在 P1/P3 以非功能条目显式登记，或先在 Rules 立 NFR 载体 |

## Notes

- Optional / not-run / out-of-focus 项记 Skipped，不阻塞 Overall Pass；Overall 仅聚合焦点内必需项。
- 本报告不是 Gate 决定（G1/G2/G3 须由具名角色单独记录）。
- Probe 事实：`FOUND` docs/、docs/ai4se-plugins/、docs/knowledge/、docs/knowledge/rules/、docs/feedback/、openspec/、openspec/changes/、requirement-workspace/、AGENTS.md、README.md；`NOTE tool:rg:no`（本机缺 ripgrep）。
- `NOTE active-change` 共 8 个：req-002-greeting-json-sqlite、req-004-split-draft-start、req-019-save-interests、req-020-manage-must-do、req-024-set-trip-budget、req-026-submit-preferences、us-049-050-split-confirm-cancel、us-067-qr-scanner。其中 `req-002`、`req-004-split-draft-start` 为历史残留空壳，会污染后续阶段探测（沿用 2026-11-16 报告 S2）。
- 与 US-071（查看我的行程）直接相关的 P0 级发现，供 P1 承接（不改变本表判定）：
  1. Living Spec `openspec/specs/trips/spec.md` 现有 5 条 requirement（caller identity / creation / detail read / main-plan confirmation state / member list read），**无「我的行程列表」能力**，需在 delta 中新增。
  2. 后端 `TripController` 仅暴露 `GET /api/trips/{id}` 与 `GET /api/trips/{id}/members`，**列表端点不存在**；AC 要求「只返回当前用户参加的行程」，会话身份已由 US-066 提供（`AccountPrincipal`），无需 `X-User-Id`。
  3. 前端 `#/trips` 目前落在 `TripsEmpty`（空列表占位），且 `App.tsx` 中「行程」tab 在有 `lastTripId` 时优先跳 `#/trips/{id}/main-plan`；US-071 把行程 tab 变为「我的行程列表」后，该跳转语义需显式裁决（P1 阻塞项候选）。
  4. 故事中的「待决定：已完成行程是否单独分区」仍开放，属 P1 需澄清的业务问题（非架构级，不阻塞 P1 起草）。
- 输入证据：本会话 probe 输出 + `docs/knowledge/rules/` 文件清单 + `vendor/ai4se-plugins/commands/catalog.md` + `openspec/specs/trips/spec.md` + `backend/src/main/java/com/gogo/trip/TripController.java` + `frontend/src/App.tsx`。
