# Cross-change scan — us-086-team-route-graph

- change-id：`us-086-team-route-graph`
- 执行人：Dev 代跑，G1 输入；结论由 SA 签署
- 时间（+08:00）：2026-11-17
- 基线：`main` `42a9239`（落后 0；本 change 尚未建分支，P4 按 PR-only 流程创建）
- 输入：`proposal.md`、`specs/splits/spec.md`、`dov-ac-review.md`、`consistency-lint.md`、`requirements/US-086.md`、`registry.md`、`openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV / consistency-lint

## Verdict

**BLOCKER 0 / WARNING 1 / WAIVER 0**

## 1. 自动扫描

`scripts/cross-change-scan.sh` 在当前仓库不存在（脚本已从 main 移除）；本文件按 9 轴手动复核，命令与证据如下：

```text
baseline: main 42a9239 (behind 0)
active changes (6): req-002 req-020 req-024 req-026 us-067 us-086
living specs (8): app-shell auth greeting invitations main-itinerary preferences splits trips
migrations disk: V1..V8; planned: none; next: V9
requirements: US-086 free in registry; no duplicate change dir
```

## 2. 九轴复核

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一（registry、active change 目录） | **Pass** | `us-086-team-route-graph` 唯一；registry 已有 US-086 行；issue #113 唯一 |
| 2 | 迁移号唯一，且等于下一个空号 | **N/A** | 零迁移；disk V1–V8，next V9，planned none |
| 3 | 认证或身份横切 | **N/A** | 无 `specs/auth` delta；不改会话、身份头或权限端点 |
| 4 | 错误契约 | **N/A** | 无新端点、无新错误码；消费既有 401/403/404 与 `MAIN_PLAN_NOT_CONFIRMED` 等 |
| 5 | 基线（落后 main / merge-base / 文件存在） | **Pass** | HEAD `42a9239`，behind 0；`screen-start.tsx`、`split-layout.tsx`、`hooks.ts`、`types.ts`、`router.tsx` 均存在 |
| 6 | Living 与代码漂移 | **Pass** | delta 基于当前 `splits` Living 的 `Split draft start` 整段重写；`openspec validate us-086... --strict` = valid；`validate --specs --strict` 8/8 通过 |
| 7 | 共享面（与 active change 的文件交集） | **Warning** | 本 change 计划改 `features/split/screen-start.tsx` 并新增同目录组件；active `us-067` 触及 `App.tsx`/`app.css`，`req-020` 复用 `app.css`。**本 change 不计划改 `App.tsx` 或 `app.css`**（沿用既有路由与 Tailwind/token）；若 P3 需要共享样式，需与 us-067/req-020 串行 |
| 8 | 依赖队列（capability 已在 Living） | **Pass** | `splits` Living 7 条 requirement；US-038/039/042/043 已归档于 `2026-11-16-req-004-split-planning-chain`，US-049/050 已归档于 `2026-11-17-us-049-050-split-confirm-cancel`；`main-itinerary` Living 提供主线读 |
| 9 | 夹具 / seed 一致性 | **Pass** | 无新端点/迁移；复用 `Singapore Friends Day` 与既有成员/行程 seed；E2E 文档 P4 新增 |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| — | 本 change 无 BLOCKER | — | — | — |

## 4. Waiver

none

## 5. Residual risk

- W1（共享样式）：如实现阶段需要改 `app.css`，先确认 `us-067` / `req-020` 的当前状态；优先把样式留在 split 组件内。
- 多日分段（OQ-2）仍 deferred，不影响本次 Living 合并。
- 本 change 尚无分支/PR；G1 记录不代表已实现或已合入。
