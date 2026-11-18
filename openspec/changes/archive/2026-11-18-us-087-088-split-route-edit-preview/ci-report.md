# Pipeline Report: us-087-088-split-route-edit-preview

**Date:** 2026-11-18 (timezone: +0800)
**Root:** d:\study\gogo
**Phase:** ci
**Data source:** API (GitHub Actions via `gh run view`, read-only)
**Change id:** us-087-088-split-route-edit-preview
**Target:** PR #135 / branch `US-087-088-p0`
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234811292
**Commit:** 4df79e161ad1d05b5469eb528d88be756df57fc7

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | 全部 job success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234811292 | 同一 SHA 的两次 run 均全绿（另一 run 44234803228） |
| cd | n/a | 未请求 | — | phase=ci，不含部署后验证 |
| **Overall** | **Pass** | CI 全绿 | — | E1 全绿 |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests | success | 58s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234811292/job/134568269263 | — |
| ci | Frontend build (contracts + typecheck + unit + build) | success | 18s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234811292/job/134568269035 | — |
| ci | Browser acceptance | success | 2m8s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234811292/job/134568269261 | — |
| ci | 同 SHA 另一 run（Backend / Frontend / Browser） | success | 42s / 24s / 2m46s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44234803228 | — |

## 失败详情

无失败 job。

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | 当前 CI 未配置独立 secret-scan job |
| SAST | n/a | 当前 CI 未配置独立 SAST job |
| Dependency audit | n/a | 当前 CI 未配置独立 audit job |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | 安全扫描未作为独立 CI job | CI 配置现状 | accepted（不属于本 change 新增面） |
| 2 | G1 Revision 2–4 仍待 IO 具名复签 | 人工 Gate 记录 | open（G2 前处理） |

## Artifacts (if any)

- GitHub Actions run 44234811292（commit 4df79e1）
- GitHub Actions run 44234803228（同一 commit）

## Human confirmation

N/A — remote fetch succeeded via GitHub Actions API.

## Next

- ✅ E1 全绿 → `/sdd:g2-decision-record`
