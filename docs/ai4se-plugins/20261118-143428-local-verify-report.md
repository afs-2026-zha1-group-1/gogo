# Local Verify Report: us-003-edit-trip-basics

**Date:** 2026-11-18 (timezone: +0800)
**Root:** D:\Documents\AI_training\Day15\GOGO\gogo-us003-formal
**Scope:** local+evidence
**Change id:** us-003-edit-trip-basics

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** 本报告是 G2 的 local-verify 证据，不阻塞 PR 提交；PR #120 的 CI 需在分支推送后重跑，remote CI 结果属 E1 的剩余槽位。

## Basis

- 分支 `US-003-edit-trip-basics` 先快进到本地对账提交 `2a344f3`（相对旧 head `f6cfd1b` 为 fast-forward），再合入 `group1/main` `519b76a`，解决 9 处冲突后形成 `8e78238`；main 随后前进到 `b173c6a`（US-031 AI 归档），再次合入并保留 `AiGeneratingNotice`，后端随基线上涨到 471 例。
- 冲突口径：邀请预览同时保留 `joiningClosed` 与 `organizerId/tripId/viewerMember`；主线确认同时执行 `setTripConfirmedAndJoiningClosed` 与 `projection.projectConfirmed`；split hooks/imports 取并集；分队确认保留 US-051 取消弹窗并采用 main 的 `dashboardOrigin` 导航；types/fixtures/registry 取并集。
- 验证库：`backend/data/g2check.db`（全新 Flyway 1–10），服务端口 8082 / 5199，未触碰 8080/5173 上的既有实例。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `mvn -B -DskipTests compile`（backend） | 构建前置 | 0 | 编译通过 |
| `mvn -B test`（backend） | docs/feedback/verification-commands.md Runtime | 0 | **471/471** tests，0 failures / 0 errors |
| `npm ci`（frontend） | docs/feedback/verification-commands.md Runtime（前置） | 0 | 84 packages |
| `npm run typecheck` | docs/feedback/verification-commands.md Runtime | 0 | TypeScript 无错误 |
| `npm run test:unit` | docs/feedback/verification-commands.md Runtime | 0 | **47/47** tests pass |
| `npm run build` | docs/feedback/verification-commands.md Runtime | 0 | Vite production build 成功 |
| `openspec validate us-003-edit-trip-basics --strict` | 变更包约定 | 0 | valid |

## Browser checks

Playwright 驱动真实浏览器，种子账号 Alice（组织者）/ Ben（成员），`localhost:5199` 代理到 `:8082`。

| # | 场景 | 结果 | 证据 |
|---|---|---|---|
| B1 | 我的页名字按钮化 | Pass | `#/account` 初始 `#account-name` 数量 0、`.account-profile button.iconbtn` 数量 1；点击后输入框出现且预填 `Alice`；保存 `Alice G2` 后输入框收起、头部更新；已改回 `Alice` |
| B2 | 行程编辑入口与预填 | Pass | `#/trips/1` 存在 `a[href="#/trips/1/edit"]`；编辑页六字段 = Singapore Friends Day / Singapore / 2026-12-05 / 2026-12-05 / City Hall MRT / Merlion Park |
| B3 | 规划变更保存前弹窗 | Pass | 改目的地 → 提交后 `.dialog[role=dialog]` 出现、hash 仍为 `#/trips/1/edit`、输入保留；点取消后弹窗关闭且未发 PUT |
| B4 | stop 编辑（组织者、未确认） | Pass | 4 个 stop 均有编辑入口；`City Hall G2` 09:00–09:30 保存成功，表单收起，GET 返回新值 |
| B5 | stop 时间校验 | Pass | 结束 09:00 < 开始 10:00 时页面显示错误、仍处编辑态，GET 仍为 09:00–09:30 |
| B6 | 重叠导致确认被拦 | Pass | 首站与次站同为 10:00–10:30 时确认，页面出现拦截列表，GET `confirmed=false` |
| B7 | 确认后锁定 | Pass | 修正首站为 09:00–09:30 后确认成功：`confirmed=true`、编辑入口 0 个；直连 `PUT /main-plan/stops/1` 返回 **409 ALREADY_CONFIRMED** |
| B8 | 成员只读 | Pass | Ben 登录后主线页编辑入口 0、确认按钮 0；直连 PUT 返回 **403 NOT_ORGANIZER** |

## Code-review highlights

- 邀请预览契约合并后保持 additive：旧字段 `organizerId/tripId/viewerMember` 与 US-003 的 `joiningClosed` 同时存在，构造器顺序与 SQL 列一致。
- 主线确认在同一事务中先写 trip 状态与 `joining_closed`，再投影主线站点，满足 splits 读取同一批已确认行。
- 前端只保留一种导航与弹窗载体：`useSplitNavigate` + `ConfirmDialog`；`useNavigate` 与原生 confirm 不再出现。
- Join 页同时响应「已登录成员直达提示」与「joiningClosed 后仍关闭」，点击/直连均在服务端二次校验。
- 零新增依赖；迁移号沿用对账后的 V10。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 本轮补 8.4 / 9.3 / 9.4 / 9.5 / 10.2；10.3 待推送后 CI |
| V2 | Requirement coverage | Pass | [fact] | 5 capabilities / 11 delta requirements 均有实现与测试 |
| V3 | Scenario coverage | Pass | [fact] | 后端 444 例；浏览器 B1–B8 覆盖编辑、弹窗、stop、确认与成员门禁 |
| V4 | Requirement↔impl mapping | Pass | [fact] | Trip/MainPlan/Invitation/Split 控制器与 EditTrip/MainPlan/Join/Account 页面一一对应 |
| V5 | Spec drift | Pass | [fact] | 合并未改 delta 语义；`openspec validate --strict` valid |
| V6 | Design follow-through | Pass | [fact] | D2/D3/D5/D7/D8/D10–D13 与实现一致 |
| V7 | Code pattern fit | Pass | [fact] | 沿用 shadcn 组件、`{data,error}` 包封套与会话鉴权；无新库 |
| V8 | Upstream basis | Pass | [fact] | 所有改动来自 US-003 change 与本次 main 对账，无 scope creep |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Partial | 本地白名单命令全绿；remote CI 待分支推送后重跑 |
| E2 AI | Pass | 本报告 + code review + 浏览器记录 |
| E3 System | Pending | PR #120 CI 双 job |
