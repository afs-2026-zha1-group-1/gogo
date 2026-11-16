# G3 decision — req-004-split-planning-chain

- Change id: `req-004-split-planning-chain`
- Gate: G3 (Merge & Archive)
- Decision: **Conditional**（归档 + 摘要 + 看板完成；**代码并入 main 待办**）
- Approvers: **SA = Leo**（2026-11-16 用户指令「开始 p5」，agent 代录 SA 签核；非自批）
- Timestamp: 2026-11-16（UTC+08:00）

## Inputs

- living-merge（归档）：`openspec archive req-004-split-planning-chain -y` 成功 —
  delta 已并入 Living Spec `openspec/specs/splits/spec.md`（**+5 requirement**）；change 归档为
  `openspec/changes/archive/2026-11-16-req-004-split-planning-chain/`。
- change-summary：`change-summary.md`（本归档目录）。
- KB update：**Skipped (not configured)** — `scripts/kb-lint.sh` 返回 `SKIP`(exit 0)，`scripts/README.md`
  文档化；KB **未校验**（不宣称 KB lint/index/consistency 通过）。
- G2：`g2-decision.md` **Pass**（VL Elian Jiang，2026-11-16）。
- CI：PR #36 双 job 绿（最新 run `43813230077`@e20775f；另 `43806414475`@1c00a06 等多次绿）。
- 看板：GitHub Project #2 `gogo` — US-038/039/042/043 已置 **Done**。

## Conclusions

- **Archive completeness：complete**（specs 合并 + change 移入 archive）。
- **Merge：未完成** — 代码仍在 PR #36（draft/open，MERGEABLE，CI 绿），**尚未并入 `main`**。
- **Conflicts：无**（归档成功；无未解冲突）。
- **Harness/Rules evolve：可选**，留待后续 `/sdd:evolve`；本阶段不实现。

## Decision

- Decision: **Conditional**。归档、change-summary、看板 Done 均完成；唯一未闭合项是
  **把代码 PR #36 合并到 `main`（共享仓库远端写操作，需用户显式授权）**。
- Conditions + owners（Conditional 必须列整改项）：

| # | 整改项 | owner | 触发 / 期限 | 状态 |
|---|---|---|---|---|
| C1 | PR #36 由 draft 转正式并**合并到 `main`**（合并前确保与最新 origin/main 同步、CI 双 job 绿；共享仓库，需用户显式「合并到 main」授权） | SA（Leo）/ Dev | 立即 | **open（阻塞 G3 Pass）** |
| C2 | P5 文档口径同步（spec/design/UI：`X-User-Id` vs `X-Member-Id`；独立 `split_draft`/`plan_node` + `V5`） | Dev | 合并后 | open（accepted deviation） |

> C1 完成（PR 合并 main + 最终 head CI 绿）且 C2 跟进后，本记录可升级为 **Pass**。

## Next

- 授权后：PR #36 转正式 → 合并 `main` → 最终 head CI 绿 → G3 升级 Pass。
- 可选（后续 wave）：`/sdd:evolve`（harness/Rules）、`/sdd:followups`（tech-debt）。
- 本记录在 C1 未完成前为 **Conditional（未 fully merged）**；agent 不擅自合并共享 main。
