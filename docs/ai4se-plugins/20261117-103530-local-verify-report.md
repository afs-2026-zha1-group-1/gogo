# Local Verify Report: us-071-my-trips

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\study\gogo
**Scope:** local+evidence
**Change id:** us-071-my-trips
**Branch / PR:** `US-071-my-trips` / [#102](https://github.com/afs-2026-zha1-group-1/gogo/pull/102)

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** PR #102 已存在且 `mergeStateStatus` = CLEAN / `mergeable` = MERGEABLE，CI 双 job 绿；本报告不代签 G2（E3 仍 Pending，由具名 VL 签核）。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `mvn -B test`（backend） | `docs/feedback/verification-commands.md` §Runtime / CI `Backend tests` | 0 | **288/288**，含新增 `TripListApiTest` 9 例；合并 main 后无回归 |
| `npm ci && npm run build`（frontend） | 同上 / CI `Frontend build` | 0 | `tsc --noEmit` 零错误 + `vite build` 成功；`npm ci` 在停掉 dev server 后完成 |
| 白名单静态 6 条（反向 grep ×4 + CI YAML 断言 ×2） | `docs/feedback/verification-commands.md`（probe 生成） | 0 ×6 | 首轮 1 条失败：CI 触发断言仍假设 `push.branches=[main]`，而 PR-only 规则下 `push` 已不限分支 → 已把该断言改为「任意分支 push + PR → main」，复跑 **6/6 Pass** |
| `openspec validate us-071-my-trips --strict` | `openspec/config.yaml` | 0 | valid（deltaCount = 2；artifacts 4/4） |
| E2E E1–E12 + AC7 补测 | `docs/feedback/e2e-us-071.md` | — | 12/12 Pass + AC7 4 步 Pass |

## Code-review highlights

- 分层保持：`TripController`（薄，`AccountPrincipal`）→ `TripRepository`（JdbcTemplate 单查询）→ record DTO；无反向依赖、无事务写路径。
- 查询范围安全：`JOIN trip_member ... WHERE tm.user_id = ?` 只返回调用者成员行程；`trip_member` 复合主键天然去重，未用 `DISTINCT` 掩盖笛卡尔展开。
- 排序契约显式：`ORDER BY t.start_date, t.id`，同日按 id 升序，测试与 fixtures 双向锁定。
- `organizer` 为派生布尔（`CASE WHEN t.organizer_id = tm.user_id`），不落库、不代表权限；成员名册语义未受影响（A3 断言）。
- 前端四态齐全（loading / ready / empty / failed+retry），行是整块 `<a href>`（键盘可达），徽标复用既有 `.pill` / `.pill.brand` / `.pill.warn`。
- 导航收敛：`tripsHref` 恒 `#/trips`，成员名册用新 `tripHref` 保留 `#/trips/<id>`；顺带补上「有成员」状态缺失的返回链接（此前只有空/错误态有）。
- 契约收敛显式登记：旧 `TripApiTest.noEditDeleteOrListRoutesExist` 的「列表 405」断言基于被取代的旧契约，改为 200 + 数组（编辑/删除仍 405），并在 design TS-3 记录。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md` 1.1–1.2、2.1–2.2、3.1–3.4、4.1–4.7、5.1–5.3、6.1–6.2 全部 `[x]`；6.3（归档前 tech-stack-plan 对账）与 7.x（G2/G3）按阶段设计保留 |
| V2 | Requirement coverage | Pass | [fact] | `trips` ADDED「Trip list read」→ `TripController.list` + `TripRepository.findTripsForUser` + 两个 record；`app-shell` MODIFIED「Trips tab placement…」→ `TripsList.tsx` + `App.tsx`（`trips-list`/`tripsHref`/`tripHref`）+ `Members.tsx` |
| V3 | Scenario coverage | Pass | [fact] | 21 场景全绿：API 9（A1–A9，`TripListApiTest`）+ E2E 12（E1–E12，`docs/feedback/e2e-us-071.md`）；AC7 另做 4 步 UI 补测 |
| V4 | Requirement↔impl mapping | Pass | [fact] | 端点/包封套/字段/排序/401/只读；tab 恒落列表、空态只给创建、无编号入口、行内双徽标、失败重试、成员名册返回上下文、主线入口仅回归 |
| V5 | Spec drift | Pass | [fact] | 无未记录漂移；三处偏离已登记 design TS-1（未用 TanStack Query，用户裁决）、TS-2（前端无 UT runner）、TS-3（旧测试旧契约按 `Supersedes` 收敛）；`verification-commands.md` 的 CI 触发断言随 PR-only 规则更新 |
| V6 | Design follow-through | Pass | [fact] | DD1–DD13 全部落地：DD5 标题取「行程」避免与 Home「我的行程」撞名；DD6 `tripsHref`/`tripHref` 拆分；DD12 零迁移；DD13 偏离表 |
| V7 | Code pattern fit | Pass | [fact] | record DTO、JdbcTemplate、`TestAuth.asUser`、`ApiException` 既有风格；前端手写 `api()` + `useEffect` 与 `Members.tsx`/`TripDetails.tsx` 一致，无第二 UI 库 |
| V8 | Upstream basis | Pass | [fact] | 变更文件均可溯源 `proposal.md` / delta / `design.md` / `tasks.md`；`Members` 返回链接与 `verification-commands.md` 更新分别溯源 delta「行程内返回链接」条款与 PR-only 规则变更 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | PR #102 run `44002892695`（pull_request，head `3ad03c0`）双 job success；同 head 的 push run `44002887145` 亦 success |
| E2 AI | Pass | 本报告 + `docs/feedback/e2e-us-071.md`（E1–E12 + AC7，含 3 张截图） |
| E3 Human | Pending | G2 由具名 VL 签核（本报告不代签） |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ✅（残余风险已登记） |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| W1 | 开发库 `backend/data/gogo.db` 的 V2 迁移校验和与当前代码不一致，默认启动失败；本次用 `gogo-us049.db` 通过 `SPRING_DATASOURCE_URL` 启动 | [fact] | `backend/data/gogo.db` | 关掉 IDE 数据库连接后 `flyway repair`，或备份后删库重建；属环境问题，不阻塞本变更 |
| W2 | 前端无 UT runner（无 vitest/jest），`isEnded`/`todayIso` 未配单测 | [fact] | `frontend/src/pages/TripsList.tsx` | 已登记 design TS-2，由 E2E E5 覆盖；引入测试框架属独立工具变更 |
| W3 | dev 模式 `StrictMode` 使列表 effect 双调用（组件丢弃首个响应，无重复渲染）；生产构建单次 | [fact] | `frontend/src/main.tsx` | React 预期行为，E12 已记录；不引入额外缓存或去重层 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | `verification-commands.md` 的 CI 触发断言滞后于 PR-only 规则 | [fact] | `docs/feedback/verification-commands.md` | 已在本次更新为「any-branch push + PR→main」并复跑通过；后续规则变更需同步该文件 |
| S2 | 列表无分页（OQ-5 明确不做） | [fact] | `TripRepository.findTripsForUser` | 若单用户行程数量上升，另立「列表分页/性能」变更 |
| S3 | 「已结束」按客户端本地日期判定，排序仍以 `start_date` 升序（已结束行程可能在首屏） | [fact] | `TripsList.tsx` / delta | 用户 2026-11-16 裁决接受；如需「未结束优先」另立变更 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| R1 | 已结束行程排在首屏 | 排序契约按用户裁决 `start_date` 升序 | P5 后若要改排序，走独立变更；本期 E2E 已确认「已结束」徽标可辨识 |
| R2 | AC7 的服务端隔离只覆盖同账号会话替换 | `TripListApiTest` 断言 401 与成员范围，UI 切换仅验证会话替换 | US-069 logout 已实测；如需多会话并发隔离，可在后续补会话隔离用例 |
| R3 | 本地开发库漂移（W1）可能让后来者启动失败 | 本机 IDE 占用与历史校验和 | 文档已记 workaround（`SPRING_DATASOURCE_URL` 指向 `gogo-us049.db`） |
| R4 | 无分页 | OQ-5 | 超预算另立变更 |

## Waiver

N/A — no waiver（Overall=Pass）。

## Revision（2026-11-17，当前行程模型 + 二/三次修订）

- 范围：迁移 V8（`app_user.current_trip_id`）+ `GET/PUT /api/trips/current`；`#/my-trips` 选择页（点卡片**不跳转**、右缘「已选择」tag、选中高亮、无右箭头）；`#/trips` = 当前行程详情（无 current 时空态引导）；排序**已结束最后**；视觉对齐原型 `.qcard`/`.empty`。
- 验证：`mvn -B test` **296/296**（含 `CurrentTripApiTest` 8 例）；`npm run build` 绿；`openspec validate --strict` = valid；E2E **R1–R9 全 Pass**（`docs/feedback/e2e-us-071.md` §Revision）。
- 截图：`e2e-us-071-revision-selected.png`、`e2e-us-071-revision-empty.png`、`e2e-us-071-revision3.png`。
- 新增偏离：DD21——排序用 SQLite `date('now')`（UTC），前端徽标用本地日期；+08:00 凌晨边界日可能不一致，MVP 接受。
- 门禁：G1 Revision 复审 **C4 仍 open**（IO Emily / SA Leo 待签）；本报告 Overall 仍 Pass，但**合并与归档必须等 C4 关闭**。

## Next

Overall=Pass → 可进 `/sdd:pr-submit` 的等价状态（PR #102 已存在）。下一步：`/sdd:pipeline-report`（如需 E1 单独归档）→ 具名 VL 的 `/sdd:g2-decision-record` → 合并 PR → `/sdd:living-merge` + G3。
