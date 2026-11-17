# Pipeline Report: us-083-085-trip-details

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\Bootcamp Training\Trip\gogo
**Phase:** ci
**Data source:** API（gh run view，read-only）
**Change id:** us-083-085-trip-details
**Target:** PR #127（merged）→ main push run 44051875289
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44051875289
**Commit:** d2708f3f5a97f1b871946996295fc1f5a8bddd16（Merge pull request #127）

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44051875289 | main 合并提交触发，2 job 全绿，总耗时 58s |
| cd | n/a | — | — | 本仓库无 CD 流水线 |
| **Overall** | Pass | CI 全绿 | — | PR head（64b0734）的 pull_request 检查亦全 SUCCESS（Backend tests / Frontend build，gh pr view statusCheckRollup 核实） |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Frontend build（lockfile 一致性 + tsc typecheck + vite build） | success | 20s（09:02:20→09:02:40Z） | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44051875289/job/133931427559 | — |
| ci | Backend tests（mvn test） | success | 55s（09:02:20→09:03:15Z） | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44051875289/job/133931427752 | — |

## 失败详情 (when any failed)

无失败 job。

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | CI 未配置独立 secret-scan job；local-verify 白名单含私有 registry/脚手架残留 grep 守卫（全 0） |
| SAST | n/a | CI 未配置 |
| Dependency audit | n/a | CI 未配置；前端 lockfile 一致性检查在 Frontend build job 内 |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | 无独立 secret-scan/SAST/audit job | CI 配置现状（全仓库通用，非本 change 引入） | accepted（local-verify 白名单守卫部分覆盖） |

## Artifacts (if any)

- checkpoint log：docs/ai4se-plugins/20261117-170638-pipeline-report-checkpoints.md
- E1 slot 副本：openspec/changes/us-083-085-trip-details/ci-report.md

## Human confirmation

N/A（远程 API 取数成功，无需人工确认）。

## Next

- ✅ E1 全绿 → `/sdd:g2-decision-record`（local-verify 已 Pass：docs/ai4se-plugins/20261117-161355-local-verify-report.md）