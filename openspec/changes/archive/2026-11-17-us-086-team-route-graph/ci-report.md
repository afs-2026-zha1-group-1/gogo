# Pipeline Report: us-086-team-route-graph

**Date:** 2026-11-17 (timezone: +0800)
**Root:** C:/Users/JIANGEL5/code/bootcamp/GoGo
**Phase:** ci
**Data source:** API（gh CLI 全路径，已认证）
**Change id:** us-086-team-route-graph
**Target:** PR #119 / branch `US-086-team-route-graph`
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44039479156
**Commit:** d2767e3905cfceabace87834c18fe79f509a65b0

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | 两个 workflow run 双 job 全绿 | runs 44039479156 / 44039487042 | push + pull_request 各跑一次 |
| cd | n/a | — | — | 未部署 |
| **Overall** | Pass | CI 全绿 | — | — |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests（run 44039479156） | success | 48s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44039479156/job/133890288243 | — |
| ci | Frontend build（run 44039479156） | success | 22s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44039479156/job/133890287869 | — |
| ci | Backend tests（run 44039487042） | success | 56s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44039487042/job/133890312504 | — |
| ci | Frontend build（run 44039487042） | success | 16s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44039487042/job/133890312804 | — |

## 失败详情

无失败 job。

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | 仓库未配置独立 secret scan；PR 内无敏感文件 |
| SAST | n/a | 仓库未配置 SAST |
| Dependency audit | n/a | 无依赖变更（package.json 仅 test 脚本） |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | E7 网络/5xx 分支未在浏览器构造 | local E2E | accepted |
| 2 | R1 只验证 12–15 屏渲染，未重复完整动作链 | local E2E | accepted |
| 3 | 多日行程单时间线、`GroupRoute` 无逐节点时刻 | OQ-2 / 数据契约 | accepted |

## Artifacts

- PR: https://github.com/afs-2026-zha1-group-1/gogo/pull/119
- Final local verify: `docs/ai4se-plugins/20261117-152912-local-verify-report.md`
- E2E: `docs/feedback/e2e-us-086.md`

## Human confirmation

N/A — remote CI fetched via authenticated API.

## Next

- ✅ E1 全绿 → `/sdd:g2-decision-record`（具名 VL）