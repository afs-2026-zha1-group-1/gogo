# Pipeline Report: req-004-split-planning-chain

**Date:** 2026-11-16 (timezone: UTC+08:00)
**Root:** `d:\study\gogo`
**Phase:** ci
**Data source:** API（gh 只读，绝对路径调用）
**Change id:** `req-004-split-planning-chain`
**Target:** branch `sdd-req-004-split-planning` / commit `e708a30`
**Pipeline URL:** n/a — 本提交无 run
**Commit:** `e708a306338e6a128d06daab5a8dc816ec7eff87`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Partial | **未建立 / not established** — 本提交零 run | n/a | `.github/workflows/ci.yml` 仅 `on: push[main]` 与 `pull_request[main]`；特性分支 push 不触发，且本分支无 PR |
| cd | n/a | 无部署 / CD（design Non-Goals） | — | 未宣称 |
| **Overall** | **Partial** | gh 可读，但本提交确无 run | — | E1 ❓ 未验证 |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | 未建立 — 无 run 存在 |
| Any failed job | 未观测到（"无数据"不等于"绿灯"） |
| Skipped / manual not run | E2E 设计不覆盖（atdd §3） |
| No remote data | ❓ E1 未验证 — gh 已登录(lianyue910-a11y) 但 `gh run list --branch sdd-req-004-split-planning` 与 `--commit e708a30` 均返回空；无 PR 触发 |

**E1:** ❓ 未验证

本地机器证据（绿）：`mvn -B test` 91 绿、`npm ci` 0 vuln、`tsc -b && vite build` 91 modules、greeting 回归 200 裸 JSON + 405×3、Screen 11–14 浏览器走查。这些记录在 `docs/ai4se-plugins/20261115-231508-local-verify-report.md`，但**本地绿不等于 E1 远程证据**。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | `backend`（mvn -B test, Java 21） | not run for this commit | n/a | n/a | 提交未进 PR；特性分支 push 不触发 |
| ci | `frontend`（npm ci + build, Node 24） | not run for this commit | n/a | n/a | 同上 |
| ci | E2E / 浏览器验收 | 设计不覆盖 | n/a | n/a | 无浏览器编排（atdd §3） |
| cd | any | n/a | n/a | n/a | 无部署在范围内 |

## 失败详情 (when any failed)

无。未观测到任何运行，故无失败可报；本节不得读作"无失败发生"。

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | `ci.yml` 未配置 secret-scan job |
| SAST | n/a | 未配置 |
| Dependency audit | ⏭️ | `npm ci` 本地 "found 0 vulnerabilities" 为安装期审计，非 CI audit job |

补充：L3 深度安全评审（qodersec）已对 e708a30 运行 → **0 findings**（属本地/工具证据，非 CI 任务，不改 E1 判定）。

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | 本提交无远程 CI；要 E1 全绿须先解决与 main 的 9 处合并冲突（Flyway V2 撞车 / 前端架构互斥 / REQ-004 编号撞车）再开 PR | merge-tree 预演 | open |
| 2 | 特性分支 push 不触发 CI（仅 main push / PR-to-main） | ci.yml triggers | open |
| 3 | 依赖在 GitHub runner 的解析（Maven Central / npm registry）未证 | 首次远程跑即测 | open |
| 4 | gh 仅非 PATH 绝对路径可用（探针 gh:no） | 环境 | accepted（绝对路径已用） |

## Artifacts (if any)

- `docs/ai4se-plugins/20261116-093556-pipeline-report-checkpoints.md` — checkpoint
- `docs/ai4se-plugins/20261116-093707-pipeline-report.md` — 本报告持久化副本
- `docs/ai4se-plugins/20261115-231508-local-verify-report.md` — 本地证据（Overall Partial）

## Human confirmation

N/A — 未申请人工确认，agent 不自签。

## Next

- ✅ 要 E1 全绿：重启合并解 9 冲突 → 开 PR-to-main → CI 真跑 → 重跑本技能
- 或具名人工接受 ci 阶段（Overall → Partial `Pass-by-human-confirm`，绝不称 API-verified Pass）
- `/sdd:g2-decision-record` 仍需 VL 具名签核 + 证据（本报告 E1 未验证，G2 无法干净 Pass）
