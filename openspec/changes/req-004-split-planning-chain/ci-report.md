# Pipeline Report: req-004-split-planning-chain

**Date:** 2026-11-16 (timezone: UTC+08:00)
**Root:** `d:\study\gogo`
**Phase:** ci
**Data source:** API（gh 只读）
**Change id:** `req-004-split-planning-chain`
**Target:** PR #36 `WIP: split-planning P4` / commit `b96f30b`（re-merge origin/main `e5fc23f` + US-064 app-shell + US-065 frontend TS + app.css fix）
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43800049243
**Commit:** `b96f30b`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | **Pass** | 两 job 全绿（backend + frontend） | run 43800049243 | PR #36 head b96f30b；mergeable=CLEAN / MERGEABLE |
| cd | n/a | 无部署 / CD（design Non-Goals） | — | 未宣称 |
| **Overall** | **Pass** | E1 全绿 | — | — |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 — Backend tests pass, Frontend build pass |
| Any failed job | 无 |
| Skipped / manual not run | E2E 设计不覆盖（ci.yml 无 E2E runner） |
| No remote data | 否 — gh 读到本次 PR run |

**E1:** ✅ 全绿（当前 head b96f30b）

历史绿 run：`43791174218`@0cd351f、`43791477174`@4bc8d1d（均双 job success）。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | `backend`（mvn -B test, Java 21） | success | 27s | job 133077833199 | — |
| ci | `frontend`（npm ci + npm run build, Node 24） | success | 15s | job 133077833645 | — |
| ci | E2E / 浏览器验收 | 设计不覆盖 | n/a | n/a | 无浏览器编排 |
| cd | any | n/a | n/a | n/a | 无部署在范围内 |

本地等价证据：`mvn -B clean test` → 115 tests, 0 failures（splits + main trip/invitation）；`npm run build`（tsc -b && vite build）130 modules 绿。

## 失败详情 (when any failed)

无。

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | ci.yml 未配置 secret-scan job |
| SAST | n/a | 未配置 |
| Dependency audit | ⏭️ | npm ci 本地 0 vulnerabilities |

补充：L3 深度安全评审（qodersec）对 e708a30 运行 → 0 findings（工具证据，非 CI 任务）。

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | PR #36 仍是 draft（WIP）；正式合并需转正式并走 G2/G3 | PR 元数据 | open |
| 2 | requirement-workspace 文档并集/REQ 编号统一延后（split 文档在 openspec change） | 整合决策 | accepted |
| 3 | E3 Human（G2 VL 签核）待定 | local-verify | open |

## Artifacts (if any)

- `docs/ai4se-plugins/20261116-101844-pipeline-report.md` — 早前 Pass（run 43791477174）
- `openspec/changes/req-004-split-planning-chain/ci-report.md` — 本报告（E1 slot，当前 head b96f30b）
- PR #36：https://github.com/afs-2026-zha1-group-1/gogo/pull/36

## Human confirmation

N/A — 远程 CI 已机器验证（gh）。

## Next

- E1 ✅ 全绿 → `/sdd:g2-decision-record`（已在 `g2-decision.md` 拟议 Pass，待 VL 签核）
- 正式合并前：PR #36 由 draft 转正式 + G2/G3
