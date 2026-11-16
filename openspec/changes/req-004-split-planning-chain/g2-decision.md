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
  — **Pass at `b96f30b`，E1 全绿**。run `43800049243`：**Backend tests pass（27s）/ Frontend build pass（15s）**。
  - 历史绿 run：`43791174218`@0cd351f、`43791477174`@4bc8d1d。
- 当前 tip `1c00a06`（`10736d9` 分队 tab 接线 + `1c00a06` 合并 US-031-037）：本地
  `mvn -B test` **174/174 绿**、`npm run build` 绿（2026-11-16，VL 走查期间执行）；
  远端 CI 未覆盖该 tip → 见 F-1。
- PR #36 `WIP: split-planning P4`：**mergeable=CLEAN，mergeStateStatus=MERGEABLE**（已同步最新 main）。
- 本地等价证据（历史）：`mvn -B clean test` **115 绿**；`npm run build`（130 modules）绿；
  浏览器走查 Screen 11–14 正常。
- G1：`g1-decision.md` Pass（SA Leo + IO Emily，2026-11-15）；不被 G2 继承。
- Delta：`specs/splits/spec.md`（5 ADDED requirement / 34 场景）。

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | 本地 `mvn -B test` 174、`npm run build` 绿（tip `1c00a06`） |
| Static scan | Partial | pyyaml 工具缺口（CI 2-job 结构以 node 等效核实）；非阻塞 |
| Code review | Pass | local-verify highlights，0 CRITICAL |
| Evidence E1 (machine) | Pass @`b96f30b`；tip 未跑远端 CI（Partial，条件 C1） | run 43800049243；本地 174/174 + build |
| Evidence E2 (AI) | Pass | local-verify + 本地测试/走查 |
| Evidence E3 (human) | **Pass** — VL Elian Jiang 2026-11-16 | 本轮抽查：Screen 11 未设身份 401 态、成员=1 加载态、身份透传；174 绿 + build 绿。Screen 12–14 采信既有 local-verify/E2E 证据 |

## Findings at VL sign-off（2026-11-16）

- **F-1（WARNING）远端 CI 证据停在 `b96f30b`**：之后的 `10736d9`（分队 tab 接线）
  与 `1c00a06`（合并 US-031-037）没有远端 CI 记录。本轮已补本地证据（`mvn -B test`
  174/174 绿、`npm run build` 绿），但合并前仍须对最终 head 重跑 CI 双 job（条件 C1）。
- **F-2（WARNING）spec/design 与实现口径不一致**：delta spec 与 `design.md` §"4 表"
  仍写 `X-Member-Id` = `trip_member.id`、UUID 行程、严格 4 表、`trip.split_draft` 列；
  实际实现为 `X-User-Id`（user id，`features/split/api.ts` 与全部后端测试均如此）、
  整数行程 id、独立 `split_draft`/`plan_node` 表（`V4__splits.sql`）、`V5` 主行程表；
  UI 身份栏仍显示 "X-Member-Id (trip_member.id)"。`consistency-lint.md` 仅将
  X-User-Id/X-Member-Id 记为 deferred（R1/OQ-N1）。本记录按 **accepted deviation**
  处理，P5 前同步 spec/design/UI 文案（条件 C2）。
- **F-3（SUGGESTION）行程空态输入框 28px 缺陷在本分支仍存在**：`app.css` 的
  `.open-by-id` 行内按钮沿用 `.btn { width: 100% }`，实测输入框宽 28px、按钮 328px。
  与 split 无关（US-064 遗留），另开 change 修复（条件 C3），非阻塞。

## Defect grades

- CRITICAL: none。
- WARNING: F-1（tip CI 未覆盖）、F-2（spec/design 与实现口径）。
- SUGGESTION: 3 — F-3（28px 输入框）；requirement-workspace 文档并集/REQ 编号统一延后；
  pyyaml 工具缺口。

## Decision

- Decision: **Pass（RECORDED）**。证据：E1 机器证据在 `b96f30b` 双 job 绿，tip `1c00a06`
  由本地 174/174 + build 绿承接；E2 Pass；E3 由 VL **Elian Jiang** 于 2026-11-16 具名签核
  （用户明示「我是 VL，先签上」，agent 代录，非自批）。F-1/F-2/F-3 记录为条件 C1–C3，
  均不阻塞 G2 记录；C1 阻塞合并。
- Waivers: 无（local-verify 无 Fail）。

## Conditions + owners

| # | 事项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| G2-Sign | VL 具名签核本记录 | VL（Elian Jiang） | 2026-11-16 | 阻塞（G2 生效） | **resolved**（Elian Jiang，2026-11-16） |
| C1 | 最终 head 推 PR #36 后确认 CI 双 job 绿（覆盖 `1c00a06` 及后续提交） | Dev / SA | 合并前 | **阻塞合并**（非阻塞 G2 记录） | open |
| C2 | 同步 spec/design/UI 的身份头与 schema 口径（`X-User-Id` vs `X-Member-Id`；V4/V5、独立表） | Dev / SA | P5 前 | 非阻塞（accepted deviation） | open |
| C3 | 修复行程空态「按编号打开行程」输入框 28px（`.open-by-id .btn` 宽度） | US-064 实现者（sammingoocl） | 另开 change | 非阻塞 | open |
| Post-G2 | PR #36 由 draft 转正式 + 合并 | SA | C1 完成后 | 合并动作 | open |
| P5 | change-summary + G3 + archive（`/sdd:living-merge`） | SA / Dev | 合并后 | 收尾 | open |

## Next

- 本记录生效（Pass）。合并前完成 C1；随后 PR #36 转正式 + 合并 → P5（change-summary /
  G3 by SA / archive），C2 在 P5 一并同步。
- C3 独立于本 change 跟踪，不阻塞签核与合并。
