# Local Verify Report: us-086-team-route-graph

**Date:** 2026-11-17 (timezone: +0800)
**Root:** [original checkout path redacted]
**Scope:** local+evidence
**Change id:** us-086-team-route-graph
**Branch:** US-086-team-route-graph（最终复验，含 P4 chrome 修订）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Pass — 可更新 PR #119。远程 CI 由 `/sdd:pipeline-report phase=ci` 记录。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| 6 条 static whitelist | docs/feedback/verification-commands.md | 0 | 无硬编码/ORM/H2/内网 registry；CI 两个 job 与触发正确 |
| `cd frontend && npm run test:unit` | agent（ATDD U1–U4） | 0 | 12/12 Pass |
| `cd frontend && npm run typecheck` | agent | 0 | tsc 无错误 |
| `cd frontend && npm run build` | agent | 0 | Vite build 绿（仅既有 chunk-size 提示） |
| `cd backend && mvn -B test` | agent（回归） | 0 | 296/296 Pass |
| `openspec validate us-086-team-route-graph --strict` | agent | 0 | valid |

## Code-review highlights

- 分队 tab 直接指向 `/trips/{currentTripId}/split`；`#/split`「分队规划」占位页和行程详情旧区块已删除。
- `SplitLayout` 移除身份条，11–15 屏统一生效；`ScreenConfirm` 在 confirmed 只读态不渲染左上返回；confirmed 队伍路线页去掉重复提示卡。
- `graph-model.ts` 纯函数 + `team-route-graph.tsx` 只读 SVG；节点无点击/handler；空时长「待补全」。
- 无后端、迁移、依赖变更；未改 `app.css`。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 28/31 checked；剩余 6.3（归档对账）、7.3（PR/CI）、7.4（G2/归档）为本报告之后的流程项 |
| V2 | Requirement coverage | Pass | [fact] | `splits` MODIFIED 场景覆盖标题/入口、无草稿、边界/路线状态、状态动作、身份条/返回按钮 |
| V3 | Scenario coverage | Pass | [fact] | E1–E13 在 `docs/feedback/e2e-us-086.md`；E7/R1 Partial 见风险 |
| V4 | Requirement↔impl mapping | Pass | [fact] | `screen-start.tsx`、`graph-model.ts`、`team-route-graph.tsx`、`TabBar.tsx`、`App.tsx`、`TripDetails.tsx`、`split-layout.tsx`、`screen-confirm.tsx` |
| V5 | Spec drift | Pass | [fact] | 无弹层、无 A/B 虚构、confirmed 只读、无中间页 |
| V6 | Design follow-through | Pass | [fact] | DD1–DD11 均有实现对应 |
| V7 | Code pattern fit | Pass | [inference] | 与 split 既有屏的 Query/Tailwind/token 一致；P5 复核 |
| V8 | Necessity / anti-creep | Pass | [fact] | 变更文件均可追溯到 tasks 组 1–5 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass（本地） | whitelist 6/6 + `mvn -B test` 296/296 + frontend 12/12/typecheck/build |
| E2 AI | Pass | 本报告 + `dov-ac-review.md` + E2E 文档 |
| E3 Human | Pending | G2 待具名 VL |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️（E7/R1 见残余风险） |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | E7 未模拟断网/5xx，仅覆盖 403/404 | [fact] | `docs/feedback/e2e-us-086.md` | ErrorState 复用既有重试；G2 前可补手工网络失败检查 |
| 2 | R1 只验证 12–15 屏渲染，未重复完整生成/确认动作链 | [fact] | 同上 | 既有屏未改；PR CI + 后续回归覆盖 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Vite 构建仍有既有 >500kB chunk 提示 | [fact] | build log | 非本 change 引入 |
| 2 | 全页深链首次打开偶发 AuthProvider 竞态落到 `/#/` | [uncertain] | 本 session 一次 | 既有登录守卫行为；另立 story 排查 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 多日行程仅单时间线 | OQ-2 deferred | accepted；后续按天分段另立 |
| 2 | 有/无草稿主线来源不同 | 既有契约 | mitigated：分别格式化 |
| 3 | `GroupRoute` 无逐节点时刻/地点/费用 | 用户裁决不做弹层 | accepted |
| 4 | 远程 CI 未跑 | PR 待更新 | tracking：PR 后 pipeline-report |

## Waiver

N/A — no waiver