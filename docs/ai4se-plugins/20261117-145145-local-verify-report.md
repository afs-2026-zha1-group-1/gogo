# Local Verify Report: us-086-team-route-graph

**Date:** 2026-11-17 (timezone: +0800)
**Root:** C:/Users/JIANGEL5/code/bootcamp/GoGo
**Scope:** local+evidence
**Change id:** us-086-team-route-graph
**Branch:** US-086-team-route-graph（未提交）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Pass — 可进入 `/sdd:pr-submit`。远程 CI 在 PR 后由 `/sdd:pipeline-report` 记录。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | verification-commands.md | 0 | 无硬编码 |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | verification-commands.md | 0 | 无 ORM |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | verification-commands.md | 0 | 无 H2 |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | verification-commands.md | 0 | 无内网 registry |
| `python -c "...ci jobs..."` | verification-commands.md | 0 | CI 两个 job |
| `python -c "...ci triggers..."` | verification-commands.md | 0 | any-branch push + PR main |
| `cd frontend && npm run test:unit` | agent（ATDD U1–U4） | 0 | 12/12 Pass |
| `cd frontend && npm run typecheck` | agent | 0 | tsc 无错误 |
| `cd frontend && npm run build` | agent | 0 | Vite build 绿（仅既有 chunk-size 提示） |
| `cd backend && mvn -B test` | agent（回归） | 0 | 296/296 Pass |
| `openspec validate us-086-team-route-graph --strict` | agent | 0 | valid |

## Code-review highlights

- `screen-start.tsx` 只做只读装配；唯一动作按状态分支，`confirmed` 无发起入口（US-049 保持）。
- `graph-model.ts` 纯函数覆盖主线左右交替、边界切分、A/B 交错、空时长与状态动作；单测 12/12。
- `team-route-graph.tsx` 为内联 SVG；节点无点击/handler；标签按近似宽度截断并提供 `<title>` 全名。
- 无后端、迁移、依赖变更；未改 `app.css`，未触碰 active `us-067` / `req-020` 共享面。
- `hooks.ts` 仅在无草稿/已取消时读取主线；既有 5s 草稿轮询不变。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 23/26 checked；剩余 6.3（归档对账）、7.3（PR/CI）、7.4（G2/归档）均为本报告之后的流程项 |
| V2 | Requirement coverage | Pass | [fact] | `splits` MODIFIED 的 4 条 Screen 11 场景：标题/动作、无草稿、边界/路线状态、状态动作 |
| V3 | Scenario coverage | Pass | [fact] | E1–E9 在 `docs/feedback/e2e-us-086.md` 记录；E7/R1 Partial 见风险 |
| V4 | Requirement↔impl mapping | Pass | [fact] | `screen-start.tsx`（DD1/DD2/DD7）、`graph-model.ts` + `team-route-graph.tsx`（DD3–DD6） |
| V5 | Spec drift | Pass | [fact] | 无弹层、无 A/B 虚构、confirmed 只读与 delta 一致 |
| V6 | Design follow-through | Pass | [fact] | DD1–DD10 均有实现/测试对应；多日分段按 OQ-2 未做 |
| V7 | Code pattern fit | Pass | [inference] | 命名、TanStack Query、Tailwind/token 与 split 既有屏一致；建议 P5 复核 |
| V8 | Necessity / anti-creep | Pass | [fact] | 变更文件均可追溯到 tasks 组 1–5；无后端/依赖/UI 库新增 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass（本地） | whitelist 6/6 + `mvn -B test` 296/296 + frontend 12/12/typecheck/build；远程 CI 待 PR |
| E2 AI | Pass | 本报告 + `dov-ac-review.md` + E2E 文档 |
| E3 Human | Pending | G2 由具名 VL 签署 |

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
| 1 | E7 未模拟断网/5xx，仅覆盖 403/404 | [fact] | `docs/feedback/e2e-us-086.md` | ErrorState 复用既有可重试组件；可在 G2 前补网络失败手工检查 |
| 2 | R1 只验证 12–15 屏渲染，未重复完整生成/确认动作链 | [fact] | 同上 | 既有屏未改；PR CI + 后续回归覆盖 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | Vite 构建仍有既有 >500kB chunk 提示 | [fact] | build log | 非本 change 引入；后续统一 code-split |
| 2 | 观察：全页深链首次打开偶发 AuthProvider 竞态落到 `/#/` | [uncertain] | 本 session 一次 | 既有登录守卫行为；另立 story 排查 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 多日行程仅单时间线 | OQ-2 deferred | accepted；后续按天分段另立 |
| 2 | 有/无草稿主线来源不同（`plan_node` vs `main_plan_stop`） | 既有契约 | mitigated：分别格式化，不互相换算 |
| 3 | `GroupRoute` 无逐节点时刻/地点/费用 | 用户裁决不做弹层 | accepted；只展示时长分解 |
| 4 | 远程 CI 未跑 | PR 尚未创建 | tracking：PR 后 `/sdd:pipeline-report phase=ci` |

## Waiver

N/A — no waiver
