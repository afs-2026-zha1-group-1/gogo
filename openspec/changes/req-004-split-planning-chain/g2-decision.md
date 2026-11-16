# G2 decision — req-004-split-planning-chain

- Change id: `req-004-split-planning-chain`
- Gate: G2 (Verify)
- Decision: **RECORDED — Pass**（2026-11-16）
- Approvers: **VL = Elian Jiang**（2026-11-16 用户明示「我是 VL，先签上」；按
  REQ-003/004 与 US-031-037 先例由 agent 代录 VL 具名签核，非 agent 自批）

## Inputs

- local-verify: `docs/ai4se-plugins/20261115-231508-local-verify-report.md`
  — Overall Partial（Build Pass / Static Partial[pyyaml 工具缺口，node 结构等效接受，非阻塞] / Code review Pass / Evidence Partial）；其"remote CI pending"已关闭。
- pipeline ci: `openspec/changes/req-004-split-planning-chain/ci-report.md` + `docs/ai4se-plugins/20261116-101844-pipeline-report.md`
  — **Pass，E1 全绿**。**覆盖当前 tip 的最新绿 run：`43806414475` @`1c00a06` — Backend tests pass（30s）/ Frontend build pass（11s）**。
  - 历史绿 run：`43800049243`@b96f30b、`43791477174`@4bc8d1d、`43791174218`@0cd351f。
- 当前 tip `1c00a06`（`10736d9` 分队 tab 接线 + `1c00a06` 合并 US-031-037）：远端 CI **已绿（43806414475）**；本地 `mvn -B test` **174/174 绿**、`npm run build` 绿。
- PR #36 `WIP: split-planning P4`：**mergeable=CLEAN，mergeStateStatus=MERGEABLE**（已同步最新 main）。
- G1：`g1-decision.md` Pass（SA Leo + IO Emily，2026-11-15）；不被 G2 继承。
- Delta：`specs/splits/spec.md`（5 ADDED requirement / 34 场景）。

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | 本地 `mvn -B test` 174、`npm run build` 绿（tip `1c00a06`） |
| Static scan | Partial | pyyaml 工具缺口（CI 2-job 结构以 node 等效核实）；非阻塞 |
| Code review | Pass | local-verify highlights，0 CRITICAL |
| Evidence E1 (machine) | **Pass** @`1c00a06` | run 43806414475 双 job success（覆盖当前 tip） |
| Evidence E2 (AI) | Pass | local-verify + 本地测试/走查 |
| Evidence E3 (human) | **Pass** — VL Elian Jiang 2026-11-16 | 签核时抽查 Screen 11 身份/权限态、身份透传；174 绿 + build 绿 |

## Findings at VL sign-off（2026-11-16）

- **F-1（WARNING）远端 CI 证据停在 `b96f30b`** → **resolved（2026-11-16）**：
  已对当前 tip `1c00a06`（含 `10736d9` 分队 tab 接线 + 合并 US-031-037）重跑 CI，
  run `43806414475` Backend tests pass / Frontend build pass，双 job 全绿。
- **F-2（WARNING）spec/design 与实现口径不一致** → **open（P5 承接，accepted deviation）**：
  delta spec 与 `design.md` §"4 表" 仍写 `X-Member-Id`=`trip_member.id`、UUID 行程、严格 4 表、
  `trip.split_draft` 列；实际实现为 `X-User-Id`（user id）、整数行程 id、独立
  `split_draft`/`plan_node` 表（`V4__splits.sql`）、`V5` 主行程表。`consistency-lint.md`
  将 X-User-Id/X-Member-Id 记为 deferred（R1/OQ-N1）。P5 前同步 spec/design/UI 文案（条件 C2）。
- **F-3（SUGGESTION）行程空态「按编号打开」输入框 28px** → **resolved（2026-11-16）**：
  本分支已修 `frontend/src/pages/TripsEmpty.tsx`（`.row` flex + 输入框 `flex:1/minWidth:0` +
  「打开」按钮 `width:auto`），输入框不再被 `.btn{width:100%}` 挤成 28px，可正常输入并打开行程；
  前端 `npm run build` 绿。

## Defect grades

- CRITICAL: none。
- WARNING: F-2（spec/design 与实现口径，P5 承接）。
- SUGGESTION: requirement-workspace 文档并集/REQ 编号统一延后；pyyaml 工具缺口。

## Decision

- Decision: **Pass（RECORDED）**。证据：E1 机器证据在当前 tip `1c00a06` 双 job 绿
  （run 43806414475）；E2 Pass；E3 由 VL **Elian Jiang** 于 2026-11-16 具名签核
  （用户明示「我是 VL，先签上」，agent 代录，非自批）。F-1/F-3 已 resolved；
  F-2 为 accepted deviation，P5 承接（条件 C2），不阻塞 G2。
- Waivers: 无（local-verify 无 Fail）。

## Conditions + owners

| # | 事项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| G2-Sign | VL 具名签核本记录 | VL（Elian Jiang） | 2026-11-16 | 阻塞（G2 生效） | **resolved**（Elian Jiang，2026-11-16） |
| C1 | 最终 head 确认 CI 双 job 绿 | Dev / SA | 合并前 | 阻塞合并 | **resolved**（run 43806414475 @1c00a06） |
| C2 | 同步 spec/design/UI 的身份头与 schema 口径（`X-User-Id` vs `X-Member-Id`；V4/V5、独立表） | Dev / SA | P5 前 | 非阻塞（accepted deviation） | open |
| C3 | 修复行程空态「按编号打开」输入框 28px | Dev | — | 非阻塞 | **resolved**（本分支 `TripsEmpty.tsx`） |
| Post-G2 | PR #36 由 draft 转正式 + 合并 | SA | C1 完成后 | 合并动作 | open |
| P5 | change-summary + G3 + archive（`/sdd:living-merge`） | SA / Dev | 合并后 | 收尾 | open |

## Next

- G2 生效（Pass）。C1 已满足（tip CI 绿）；PR #36 转正式 + 合并 → P5（change-summary /
  G3 by SA / archive），C2 在 P5 一并同步。
- C3 已在本分支修复。
