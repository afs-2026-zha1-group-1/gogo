# G3 decision — us-040-split-grouping（草稿，待合并与归档后由 SA 签核）

- Gate: G3 (Merge & Archive)
- Timestamp: 2026-11-17（草稿创建，+08:00）
- Branch: `US-040-split-grouping-p0`；PR #117；当前 head `b32e9b4`（功能 head `3d4cf28`，其后仅文档）
- 状态：**DRAFT / Decision = OPEN** —— Merge 与 Archive 均未执行，合并前仍有 1 项门禁未关闭（C8）

## Inputs

- G1：`g1-decision.md` —— Gate Pass（SA Leo + IO Emily，2026-11-17）；**Revision Conditional，C8「IO 复核任意成员改组 + 头像切组 + `memberId` 入参」仍 open**
- G2：`g2-decision.md` —— **Pass**（VL Leo，2026-11-17）；F1 并入合并前置，F2 冲突已解、F3 由 VL 修正、F4/F5 已处理、F6 接受
- E1：`ci-report.md` —— head `3d4cf28` 双绿（run 44062093032 / 44062087362），PR `MERGEABLE / CLEAN`
- Local verify：`docs/ai4se-plugins/20261117-162107-local-verify-report.md`（Overall Partial，E1 已补齐；E3 由 G2 关闭）
- E2E：`docs/feedback/e2e-us-040.md`（12 行 Pass；E2E-1 已修回归）
- Delta/Design/Tasks：`specs/splits/spec.md`（**41 场景**：1 ADDED / 10 + 3 MODIFIED / 31，含合并 main 后 US-086 的 3 条 Screen 11 场景）、`design.md`（DD1–DD17 + TS-1…TS-7）、`tasks.md`
- 知识库：`docs/knowledge/architecture/tech-stack-plan.md` **§24** + `docs/knowledge/_LOG.md` **A24** 已对账
- 已知偏差：沿用既有分支与 PR（`tasks.md` 1.1/1.2）；TS-1 陈旧路线提示常驻；存量单人 active 草稿仍不可生成/确认

## 合并结论（待执行）

| 项 | 状态 |
|---|---|
| PR #117 | OPEN、非 draft、head `b32e9b4`、`mergeStateStatus = CLEAN`、`mergeable = MERGEABLE` |
| 合并前条件 | **C8 关闭**（IO Emily 补签 G1 Revision）；关闭后即可合并 |
| 合并方式 | GitHub PR 合并（禁止直推 main）；合并后记录 `mergeCommit` SHA 于本记录 |
| 其他依赖 | 无（US-083-085 / US-086 已在 main，本次已并入） |

## 冲突与偏差

- 合并 origin/main `b0fbd79` 时出现 6 个冲突文件，已逐一解决（详见 `g2-decision.md` §Merge reconciliation）：`hooks.ts`、`screen-start.tsx`、`TripDetails.tsx`、`impact-brief.md`、`registry.md`、`acceptance-test-fixtures.md`。
- delta 因 US-086 新增 3 条 `Split draft start` 场景而由 39 补至 **41**；`openspec validate --strict` = valid。
- 分支/PR 形式偏差记录在 `tasks.md` 1.1/1.2（未另切 `US-040-split-grouping` 代码分支）。

## 归档完整性（待执行）

| 项 | 预期 |
|---|---|
| 命令 | `openspec archive us-040-split-grouping -y`（在 PR 合并后的 `main` 上执行） |
| 新路径 | `openspec/changes/archive/2026-11-17-us-040-split-grouping/` |
| Living Spec | `openspec/specs/splits/spec.md`：合并 1 ADDED + 3 MODIFIED（41 场景）；**Purpose 段不会自动更新**（已知，需手动补「成员分组」到能力链描述） |
| 必须同步 | `change-summary.md`（P5）、`registry.md` 行改为 Archived、`handoff.md` 指向归档路径 |
| 归档后校验 | `openspec validate --specs --strict`（存量 >500 字符 WARNING 除外）；`openspec list --specs` 应为 8 个能力 |
| 知识库 | §24 + A24 已就位；归档后核对路径引用（`openspec/changes/us-040-split-grouping/` → archive 路径） |

## Harness / Rules evolve

- 本 change 无新增 Harness/Rules 需求。
- P0 记录的 Rules 载体缺口（分支策略 / 流水线·环境·IaC / NFR）仍为存量，指向 `/sdd:rules-govern` 治理，不在本 change 处理。

## 签核区（SA）

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | （待具名） | | |

## Decision: OPEN

建议 **Pass**，但需同时满足：

1. C8 关闭（IO Emily 对 Revision delta 与头像切组交互具名签核）；
2. PR #117 已合并并记录 merge SHA；
3. `openspec archive` 完成且归档目录/Living Spec/registry/handoff/change-summary 齐备。

上述未完成前不得填 Pass。代理不代签、不改判。
