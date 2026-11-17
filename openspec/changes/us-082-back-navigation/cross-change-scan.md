# Cross-change scan — us-082-back-navigation

- change-id：`us-082-back-navigation`
- 执行人（SA）：Johnson（脚本由 Dev 代跑，结论由 SA 签字）
- 时间（+08:00）：2026-11-17（G1 初扫）；2026-11-17 合并 main 后复扫
- 基线：merge-base `9241d6f`；落后 main `0` 个提交。G1 初扫时为 `3334e7d`、behind 0；之后 main 前进 4 个提交（US-068-070 P5 archive/finalize），已合入本分支
- 输入：`proposal.md`、`design.md`、`specs/app-shell/spec.md`、`requirements/US-082.md`、`requirement-workspace/registry.md`、`openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV 与 consistency-lint

## Verdict

**BLOCKER 0 / WARNING 3 / WAIVER 0**

## 1. 自动扫描

命令：

```bash
scripts/cross-change-scan.sh us-082-back-navigation --advisory
```

摘要：

```text
ref: US-082-back-navigation; upstream: main; merge-base: 9241d6f7; behind: 0
active changes (7): req-002 req-020 req-024 req-026 us-067 us-071 us-082
identity surfaces: living=[auth main-itinerary preferences splits trips] code_files=7
migrations: disk=[1..7] next=V8; planned=none
Verdict: BLOCKER 0 / WARNING 3
A1 WARNING Living 漂移 -> splits X-Member-Id vs X-User-Id（存量，非本 change）
A2 WARNING 共享面 -> frontend/src/App.tsx（us-067, us-082）
A3 WARNING 共享面 -> frontend/src/pages/Home.tsx（us-067, us-071, us-082）
```

说明：A2/A3 是脚本按 change 文档中的路径引用做的启发式；本 change 的实际代码 diff 只改 `Join.tsx`、`screen-start.tsx`、`MainPlan.tsx`、`RequireAuth.tsx`、`LoginPage.tsx`、`RegisterPage.tsx`、`types.ts` 与 invitations 后端 record，未编辑 `App.tsx` 或 `Home.tsx`。

## 2. 九轴复核

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一（registry、active change 目录） | **Pass** | active 目录无重复 `us-082`；registry 有 US-082 行；合并 main 后保留新 REQ-009 行与 US-082 行 |
| 2 | 迁移号唯一，且等于下一个空号 | **N/A** | 本 change 零迁移；disk=[1..7]，next=V8，planned=none |
| 3 | 认证或身份横切：delta 覆盖全部含身份头的 capability | **N/A** | 无 `specs/auth/spec.md`；不改身份头与会话；us-068-070 已归档，初扫的 A1–A4 不再出现 |
| 4 | 错误契约：新增错误码、envelope 形状与 Living 一致 | **N/A** | 无新错误码、无新端点；accept 响应仅 additive `tripId` |
| 5 | 基线：落后 main 数、merge-base、proposal 提到的文件仍存在 | **Pass** | merge-base `9241d6f`；behind 0；六个前端文件与 `JoinResult` 均存在 |
| 6 | Living 与代码漂移：本 change 声称修正的 drift 已在 delta 中落地 | **Pass** | MODIFIED `Guest join exclusion` 已按 US-068-070 归档后的 Living 文本整段重同步（含注册页、注册保留邀请），再叠加 joined 行动；`validate --strict` = valid |
| 7 | 共享面：与其它 active change 的文件交集、串行 owner | **Warning** | 文档启发式列 `App.tsx`/`Home.tsx`；实际代码未编辑。`us-067` 拥有扫描路由、`us-071` 拥有行程列表/成员/创建返回，本 change 均不重复实现 |
| 8 | 依赖队列：依赖的 capability 已在 `openspec/specs/` | **Warning** | `app-shell` Living 存在；AC2/AC3 依赖 active `us-071-my-trips`（G1 Pass，未合并）；本 change 只回归 |
| 9 | 夹具 / seed：迁移号、身份头、状态码口径一致 | **Pass** | 无新端点/迁移；复用既有演示账号与行程 seed；E2E 文档为本 change 新增 |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| — | 本 change 无 BLOCKER | — | — | — |

## 4. Waiver

none

## 5. G1 引用行

```text
- Cross-change scan: openspec/changes/us-082-back-navigation/cross-change-scan.md — BLOCKER 0 / WARNING 3 / waivers 0
- Waiver: none
```
