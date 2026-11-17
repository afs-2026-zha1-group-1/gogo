# Cross-change scan — us-082-back-navigation

- change-id：`us-082-back-navigation`
- 执行人（SA）：Johnson（脚本由 Dev 代跑，结论由 SA 签字）
- 时间（+08:00）：2026-11-17
- 基线：merge-base `3334e7d8`；落后 main `0` 个提交
- 输入：`proposal.md`、`design.md`、`specs/app-shell/spec.md`、`requirements/US-082.md`、`requirement-workspace/registry.md`、`openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV 与 consistency-lint

## Verdict

**BLOCKER 0 / WARNING 3 / WAIVER 0**

> 脚本全仓输出含 4 条 BLOCKER，均属未归档 `us-068-070-account-register` 的身份横切启发式；本 change 无 `specs/auth/spec.md`，按规则第 4 条不触发该门禁，不计入本 change，由 `us-068-070` 自己的门禁与归档承接。

## 1. 自动扫描

命令：

```bash
scripts/cross-change-scan.sh us-082-back-navigation --advisory
```

摘要：

```text
ref: main; upstream: main; merge-base: 3334e7d8; behind: 0
active changes (8): req-002 req-020 req-024 req-026 us-067 us-068-070 us-071 us-082
identity surfaces: living=[auth main-itinerary preferences splits trips] code_files=7
migrations: disk=[1..7] next=V8; planned=none
Verdict: BLOCKER 4 / WARNING 3
A1–A4 BLOCKER 身份横切 -> us-068-070-account-register（非本 change）
A5 WARNING Living 漂移 -> splits X-Member-Id vs X-User-Id（非本 change）
A6 WARNING 共享面 -> frontend/src/App.tsx（us-067, us-068-070）
A7 WARNING 共享面 -> frontend/src/pages/Home.tsx（us-067, us-071）
```

本 change 不修改 `App.tsx`、`Home.tsx`、`Members.tsx`、`CreateTrip.tsx`，上述共享面不与本 change 交集。

## 2. 九轴复核

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一（registry、active change 目录） | **Pass** | active 目录无重复 `us-082`；registry 新增 US-082 行；脚本未报重复 |
| 2 | 迁移号唯一，且等于下一个空号 | **N/A** | 本 change 零迁移；disk=[1..7]，next=V8，planned=none |
| 3 | 认证或身份横切：delta 覆盖全部含身份头的 capability | **N/A** | 无 `specs/auth/spec.md`；不改身份头与会话；US-068-070 的 A1–A4 不属本 change |
| 4 | 错误契约：新增错误码、envelope 形状与 Living 一致 | **N/A** | 无新错误码、无新端点、无 envelope 变更 |
| 5 | 基线：落后 main 数、merge-base、proposal 提到的文件仍存在 | **Pass** | behind 0；merge-base `3334e7d8`；`Join.tsx`、`screen-start.tsx`、`MainPlan.tsx`、`RequireAuth.tsx`、`LoginPage.tsx`、`RegisterPage.tsx` 均存在 |
| 6 | Living 与代码漂移：本 change 声称修正的 drift 已在 delta 中落地 | **Pass** | `Guest join exclusion` 原文整段复制后追加 joined 行动；新增两条 requirement；`validate --strict` = valid |
| 7 | 共享面：与其它 active change 的文件交集、串行 owner | **Warning** | `LoginPage.tsx`、`RegisterPage.tsx` 与已合并未归档的 `us-068-070` 有交集；其 P4 已合并（PR #101），本 change 在其之上串行修改。`App.tsx`/`Home.tsx` 与 us-067/us-071 共享，本 change 不编辑 |
| 8 | 依赖队列：依赖的 capability 已在 `openspec/specs/` | **Warning** | `app-shell` Living 存在；AC2/AC3 依赖 active `us-071-my-trips`（G1 Pass，未实现）；本 change 不重复实现 |
| 9 | 夹具 / seed：迁移号、身份头、状态码口径一致 | **Pass** | 无新端点/迁移；复用既有演示账号与行程 seed；E2E 文档在 P4 新增 |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| — | 本 change 无 BLOCKER | — | — | — |

说明：脚本的 A1–A4 为 `us-068-070-account-register` 的存量 BLOCKER，由该 change 的 G2/G3/归档流程处理；不在 `us-082` 的 delta 或代码范围内。

## 4. Waiver

none

## 5. G1 引用行

```text
- Cross-change scan: openspec/changes/us-082-back-navigation/cross-change-scan.md — BLOCKER 0 / WARNING 3 / waivers 0
- Waiver: none
```
