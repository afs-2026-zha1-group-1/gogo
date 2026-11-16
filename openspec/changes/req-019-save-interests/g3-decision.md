# G3 decision — req-019-save-interests（G3 Pass，SA evelyn.huang）

> **状态：已记录（RECORDED）。** `Decision` = **Pass**，由 SA **evelyn.huang** 于
> 2026-11-16 签署。来源是其在会话中的明确指示「G3 签署 evelyn.huang」；代理只记录该人类
> 表态并整理输入与核对结果，不代签、不改判。SA 未给出具体时分，`Timestamp` 只记日期。

- **Change id:** `req-019-save-interests`（REQ-019 / US-019 成员兴趣保存）
- **Gate:** G3 (Merge & Archive)
- **Decision:** **Pass**（SA evelyn.huang，2026-11-16）
- **Approvers:** SA = **evelyn.huang**（2026-11-16）；G1 的 IO Emily 与 G2 的 VL Sammi Ng
  属另两道门禁，不作继承
- **Timestamp:** 2026-11-16（SA 未指定时分）
- **Merge:** PR #44 `REQ-019: save member interests on main's shadcn baseline`，
  `feat/travel_preference` → `main`，**merge commit `6c0ccb1`**（head `9f24fa9`，base `3f7758f`；
  合并时 `mergeable=true`、`mergeable_state=clean`，42 commits / 90 files）
- **Archive path (target):** `openspec/changes/archive/2026-11-16-req-019-save-interests/`

## Inputs

| 输入 | 位置 | 状态 |
|---|---|---|
| 合并结果 | `main` `6c0ccb1`；main 侧 push run `43843455610` | success，双 job 全绿 |
| 合并前 head 的 CI | run `43842769894`（pull_request）/ `43842757828`（push）on `9f24fa9` | success（`Tests run: 255`，36 s / 49 s） |
| G1 | `g1-decision.md`（含 "Revision re-review"） | IO Emily + SA evelyn.huang Pass 2026-11-16 |
| G2 | `g2-decision.md` | VL Sammi Ng Pass 2026-11-16 17:19 (+0800) |
| local-verify | `docs/ai4se-plugins/20261116-1333-local-verify-report.md` | 早前为 Partial，驱动项（E1 / strict）现已闭合 |
| pipeline ci（E1） | `ci-report.md`；`docs/ai4se-plugins/20261116-153521-pipeline-report.md` | 机器读取，全绿 |
| 验证矩阵 | `docs/feedback/verification-matrix.md` §REQ-019 | 逐行证据（Build 255/255、remote-CI 指向 `9f24fa9`） |
| Delta Spec | `specs/preferences/spec.md` | 5 requirements / 31 scenarios（本次压字数后计数不变） |
| 验证命令 | `openspec validate req-019-save-interests --strict` | **`Change 'req-019-save-interests' is valid`，exit 0**（CLI 1.16.1） |

## Check conclusions

| 检查 | 结论 |
|---|---|
| Merge | **Pass** — PR #44 已合并为 `6c0ccb1`，无残留冲突 |
| Merge-time conflicts | 无 —— 分支已在收尾前五次并入 `origin/main`（`5b7a1be` 为第五次），GitHub 合并时报告 `clean`；main 在其后仅前进一个文档提交 `3f7758f`（US-049/050 的 G2 Pass 文档） |
| Archive completeness | **Pending** — 归档尚未执行（本记录授权执行，非归档本身）；`change-summary.md` 需随归档补齐 |
| Validation | **Pass** — 见上表，G1 条件 4 关闭；`validate --all` 中本变更项为 ✓（其余 ✗ 项属 req-020/024/026 与他人的 main specs） |
| Delta Spec 完整性 | **Pass** — 压字数只删冗余叙述，未增删或改写任何 scenario；被删细节仍由具名 scenario 承接（见下节映射） |
| Residual risks | TS-2 身份偏差（spec 文本写 `X-User-Id`，实现为登录会话，伴两条反向用例）；TS-11 `flyway-database-nc-sqlite` 无发布物 |

### 压字数与 scenario 的承接映射（供 SA 核对）

| Requirement | 从 prose 移出的内容 | 由哪个 scenario 承接 |
|---|---|---|
| Preference caller identity and membership | 「身份 → trip → membership」检查顺序、`matching GET /api/trips/{id}` | `An unknown trip is reported before membership`、`A non-member is denied`、`Caller identity is missing` / `is unusable` |
| Predefined interest catalogue | label→code 对照表、早期英文草稿标签不接受的说明 | `All ten interests are accepted`（含十个 label 与十个 code 的顺序）、`English labels from the earlier draft are rejected` |
| Save member interests | 畸形 body 的具体形态、幂等语义（`updated_at` 可刷新）、每成员每 `kind` 至多一行 | `A malformed request is rejected`、`Repeating the same set is idempotent`、`Duplicate values collapse to one`、`The first save creates exactly one row` |
| Read member interests | 不得携带 display name 等字段、排序可复现的理由 | `The response carries only the agreed fields, ordered by user id`、`Reading changes nothing` |
| Preferences page | 顶栏/标题/副标题/徽标/芯片配色/提示语/底栏的逐条描述 | 改为指向已批准的 `screen-08-preferences.png`（布局细节由该屏幕承载）；加载、保存、失败、回滚、空态均由 `Loading`…`Loading fails` 九个 scenario 承接 |

## Sign-off

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| SA | **evelyn.huang** | **Pass** | 2026-11-16 | 无 | 会话内明确指示「G3 签署 evelyn.huang」；合并 `6c0ccb1`、run `43843455610` success、`--strict` exit 0 |

## Decision

- Decision: **Pass**
- Conditions + owners: 无
- Approver: SA **evelyn.huang**

## Open at Pass（签名覆盖决策，不等于缺口已闭合）

1. **Archive 未执行。** 归档命令与本记录分离：需把 change 目录移到
   `openspec/changes/archive/2026-11-16-req-019-save-interests/`、把 delta 合入
   `openspec/specs/preferences/spec.md`，并补 `change-summary.md`。owner：实现方（代理）执行，
   SA 在归档后核对结果。
2. **台账未同步 G3 行。** `requirement-workspace/registry.md` 与 `handoff.md` 当前带有另一并行
   变更（REQ-020/024）的未提交改动，为避免把一个变更的改动夹带进本变更提交，本次未写入；
   待该并行改动提交后由同一处补齐「G3 Pass evelyn.huang / 归档待执行」。
3. **TS-2 身份偏差仍在。** delta spec 的 requirement 文本沿用 G1 原文的 `X-User-Id` 表述，而
   合并后的实现取登录会话；两条反向用例钉住「匿名 401」与「头与会话不一致时不改变存储成员」。
   若后续要让 Living Spec 直接写「会话身份」，需单开一次契约修订。
4. **TS-11 未闭合。** `flyway-database-nc-sqlite` 在受管 Flyway 版本下无发布物，classpath 仅
   `flyway-core`；作为已登记偏差随归档保留。

## 本记录允许与不允许

- 允许：按 `openspec archive` 流程把本变更归档并合并 Living Spec。
- 不允许：代替 SA 复核归档结果；把本记录当作对归档后新增提交（例如后续再并入 `origin/main`）
  的批准；把 G1/G2 的签署算作 G3 的签署。

## Update — 归档前的第六次并入 main（2026-11-16，签署后）

PR #44 合并后 `origin/main` 又前进到 `81af3d1`（US-067 的扫码入口与 US-071 的 P1/P2 文档，
相对 merge base 共 24 个提交），故本分支作第六次并入，合并提交 `58d5cd9`。该次合并没有冲突：
`README.md`、`docs/knowledge/_LOG.md`、`frontend/src/App.tsx`、`app.css`、`types.ts` 与
`package.json`/`package-lock.json` 均由 git 自动保留两侧内容，**本变更的 spec/tasks/g3 三个文件
未被触碰**。合并后本地复验：`mvn -B clean test` 255/255（28 套件）、lockfile 2/2、`typecheck`
干净、`npm run build` 645.74 kB / 142 modules（main 的 `Scanner.tsx` + `scan.ts` 导致体积增长）、
`openspec validate req-019-save-interests --strict` 仍为 `is valid`（tasks 8.13）。

这条更新不改变 SA 的 Pass 结论：它只说明合并后的分支基线更新，签署的对象仍是已合并的 PR #44
（`6c0ccb1`）。

## Recording rules

1. G3 需要具名 SA 决策，G1/G2 签名不继承。
2. Conditional 缺少整改项与 owner 时无效。
3. 归档完成后，代理在本文追加「Archive result」节并引用归档提交，不改写上面的签署内容。
