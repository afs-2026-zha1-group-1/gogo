# Consistency lint — req-004-split-planning-chain

## Current amendment (2026-11-15)

This amendment supersedes affected verdict reasons, scope/counts, tool availability
and outstanding-finding claims in the historical report below. It is not a Gate
approval or a rerun of every historical checklist rule.

- Current package: five requirements / 34 scenarios; proposal lists five endpoints
  and the shared member-only draft GET. Four business REQs remain unchanged.
- Review defects corrected: missing/globally unknown identity 401 vs known outsider
  403; entry-guard database reads vs repository-free snapshot calculator; explicit
  draft read with empty state and no writes; overlong requirement bodies shortened.
- Executable check: `openspec validate req-004-split-planning-chain --strict`
  passes. The former CLI/schema-validation tool gap no longer applies.
- F1 resolved in spec G1: fixture-guaranteed complete/disjoint groups, defensive
  precondition; invalid-group negatives deferred to group movement (out of scope).
- F2 resolved: current proposal orders P2 delta/review before G1 before P3.
- F5 resolved in spec, REQ-006 and fixtures: generate at actual N after boundaries;
  concurrent boundary re-selection advances N+1; stale N cannot overwrite it.
- F3 remains optional; F4 frontend stack is a P3 handoff, not a blocking AC issue.
- Strict validation is not behavioral execution or a human sign-off. G1 stays
  Conditional: IO Emily approved the revised package on 2026-11-15 per explicit
  user instruction; SA Leo's revised-contract re-review remains pending.

The original report undercounted start scenarios: 9, not 8. The original spec had
28 scenarios, not 27. Six added scenarios bring the current count to 34.

## Historical report (original version; reported counts retained verbatim)

## 运行元数据

- change-id: `req-004-split-planning-chain`
- phase: **p2**（用户指定，无需再问）
- focus: 全 change 包 + Living 根（未限定 focus glob）
- 日期: 2026-11-15
- artifact level: **2**（proposal + specs；无 `tasks.md` / `design.md`）
- 运行方式: **手工 checklist**（openspec CLI 不在 PATH，documented gap，同 req-001/002 既有实践）
- 只读发现根:
  - Delta/change: `openspec/changes/req-004-split-planning-chain/`（`proposal.md` / `specs/splits/spec.md` / `dov-ac-review.md` / `.openspec.yaml`）
  - Living Spec: `openspec/specs/greeting/spec.md`（唯一现有能力）
- 性质: 一致性 lint，**非 Gate**；本报告不构成 Living Spec 权威，不改 proposal/spec 正文

## Verdict + counts

- **Overall: Partial**
  - 上限规则: 手工运行（无 OpenSpec 工具）→ verdict **capped at Partial**
  - 严重度映射: 0 BLOCKER + 2 WARNING → Partial（与上限一致）
- counts: **BLOCKER 0 / WARNING 2 / SUGGESTION 3**；N/A 见下（tasks/design/C2/citation 可达性）

## Findings（按严重度排序）

| id | severity | phase | location | authority | 标记 | 摘要 |
|---|---|---|---|---|---|---|
| F1 | WARNING | p2 | delta G requirement；REQ-006 OQ-N5/In scope；fixtures G 段 | spec+proposal | [fact] | 「分组齐全」SHALL 前置缺负向 AC/错误码 |
| F2 | WARNING | p2 | proposal §下一步 vs `recipes/p2.md` | proposal | [fact] | G1 顺序措辞与 p2 recipe 倒置 |
| F3 | SUGGESTION | p2 | proposal（无命名 Non-Goals 段） | proposal+code | [fact] | out-of-scope 内联，合 req-001 惯例 |
| F4 | SUGGESTION | p2 | proposal §What Changes 前端栈 vs delta | proposal+spec | [fact] | 前端栈属设计决策，delta 未显式 defer |
| F5 | SUGGESTION | p2 | delta G3-N / REQ-006 S3-N / fixtures G3-N | spec | [fact]+[inference] | v1→v2 示意与边界前置字面张力 |

### F1 — WARNING（分组齐全前置缺可观察负向契约）

- location: `specs/splits/spec.md` §Group route generation（line 160–161「分组齐全（A/B 两组、成员不跨组）时触发」）；`REQ-006.md` OQ-N5（line 98「两组齐全由服务层校验」）+ In scope（line 40）；`acceptance-test-fixtures.md` G 段（line 69–77）
- issue: delta 与 REQ-006 把「分组齐全/成员不跨组」列为生成 SHALL 前置，但：① 13 个错误码全集（proposal §Impact）无「分组不齐/跨组」拒绝码；② REQ-006 Scenarios、delta G 场景、夹具 G 段均无对应负向用例（对比：同为前置的「边界已保存」有 G4-N `SPLIT_BOUNDARIES_REQUIRED`）。分组本期由夹具供给恒齐全（REQ-006 line 32/57、fixtures line 38），生成 body 仅含 `draftVersion` 不含 groups，故该前置的负向路径在本期不可达且未显式声明为防御性。
- suggested_fix: G1 由 IO/SA 确认二选一——(a) 若分组校验属本期可测行为：P3 细化 delta 增「分组不齐/跨组」负向场景 + 稳定错误码；(b) 若本期分组由夹具保证齐全：在 delta/design 显式注明「分组齐全为防御性前置，负向路径随分组移动特性（out-of-scope）延后」，避免 P4 误以为缺测。**不改权威正文，待人工裁决。**
- evidence: REQ-006 line 32「分组成员：本期由夹具供给」、line 57「不实现前端移动 UI」、OQ-N5；fixtures line 38「分组…（夹具供给）」、G1 body `{draftVersion:<当前>}`；proposal §Impact 错误码全集无分组码
- authority: spec + proposal（REQ-006）
- 标记: 缺口存在 = **`[fact]`**；本期是否可达/是否需补 AC = **`[inference]`**（待 IO/SA 确认）

### F2 — WARNING（G1 顺序措辞与 p2 recipe 倒置）

- location: `proposal.md` §下一步（line 150–151「1. G1 评审…2. G1 通过后进入 P2：/sdd:delta-craft」）+ 状态头（line 3「P1 收尾产物…严禁在本阶段启动 P2」）vs `vendor/ai4se-plugins/recipes/p2.md` §Sequence
- issue: proposal 的 P1 冻结 roadmap 把 G1 置于 delta-craft **之前**（「G1 通过后进入 P2」）；而 p2 recipe 权威顺序为 delta-craft → consistency-lint → 人工澄清 → **g1-decision-record（G1 在 P2 末尾）**。实际 P2 已产出 delta（本 lint 即运行其上），G1 将连同 delta 一起评审。两者顺序倒置，可能令 G1 评审者误判 G1 范围（仅 proposal vs proposal+delta）。
- suggested_fix: G1 决策记录中注明「按 recipes/p2.md，delta 于 P2 内、G1 之前产出；G1 评审范围 = proposal + delta spec + AC/DoV 评审」。proposal §下一步为 P1 快照，**无需改正文**（lint 不重写 proposal）。人工确认 G1 范围与顺序。
- evidence: recipes/p2.md line 10–15（Sequence）、line 8（Goal「Proposal → verifiable Delta Spec; pass G1」）；proposal line 150–151
- authority: proposal（vs recipe 过程权威）
- 标记: **`[fact]`**（两处文本可直接对照）

### F3 — SUGGESTION（Non-Goals 命名段缺失，合项目惯例）

- location: `proposal.md`（无单一命名 `## Non-Goals` / `## Out of scope` 段）
- issue: pack-default P3 方法偏好「命名段 + 内容」。本 proposal 的 out-of-scope 实质内容**内联散布**：真实供给 R2 不在本期（line 44）、No breaking changes（line 51）、Modified Capabilities None（line 64–68）、story-split Skipped（line 108）；delta 侧 US-049/050 不实现（line 23）、分组移动控件不实现（line 209）。内容非空且精确，但无命名段。
- suggested_fix: **可选**——如需对齐 pack-default 可收敛一个命名 Non-Goals 段；但权威先例 `archive/2026-11-13-req-001-hello-world/proposal.md` 同样内联（无命名段）且已过 G1/G2/G3，故本项目惯例接受内联，**非阻塞、不强制**。
- evidence: req-001 归档 proposal 结构（Why/What Changes/Capabilities/Impact/…，无 Non-Goals 段，out-of-scope 内联于 line 18/32/42/76）
- authority: proposal + code（req-001 先例）
- 标记: **`[fact]`**

### F4 — SUGGESTION（前端栈裁决未在 delta 显式承接/defer）

- location: `proposal.md` §What Changes（line 45–47「TS + AntD 5 + TanStack Query v5 + React Router 7」，OQ-N3）vs `specs/splits/spec.md`（Screen 11–14 展示契约场景）
- issue: delta 以展示契约场景承载 UI **行为**（正确——栈选择属设计决策，AC-4 禁伪装实现细节），但未重述前端栈，也未显式注明「栈裁决 defer 至 P3 design」。p2 check 3「关键约束在 delta 有归属或显式 deferral」对该约束缺显式 deferral 注记。
- suggested_fix: P3 `/sdd:atdd-design` / design 显式承接 OQ-N3 栈裁决（TS/AntD/Query/Router + greeting 保持 JSX 混编）；delta **无需改**。非阻塞。
- evidence: proposal line 45–47、OQ-N3（line 131）；delta Screen 11–14 场景仅描述行为不描述栈
- authority: proposal + spec
- 标记: **`[fact]`**

### F5 — SUGGESTION（stale 生成场景 v1→v2 为示意，字面与前置有张力）

- location: delta §Group route generation G3-N（line 186–190「为草稿 v1 启动生成…变 v2」）；`REQ-006.md` S3-N（line 69）；`acceptance-test-fixtures.md` G3-N（line 75）
- issue: 生成前置要求「边界已保存」，而边界保存（B1）已使 draftVersion 1→2，故生成发起时版本 ≥2；G3-N 字面「为草稿 v1 启动生成」与该前置存在张力。三产物口径一致（均 v1→v2），stale **行为**清晰可测，仅示意数字易被 P4 误读为字面 draftVersion=1。
- suggested_fix: P3/P4 以「发起时版本 N vs 变更后版本 N+1」构造 stale（N 取决于此前边界保存次数），并在 design/测试注记 v1/v2 为示意旧/新标签。非矛盾、非阻塞。
- evidence: delta B1（line 113–117，v1→2）+ G 前置（line 160「边界已保存」）+ G3-N（line 188）；REQ-006 line 69；fixtures line 62/75
- authority: spec
- 标记: 前置/版本算式 = **`[fact]`**；「示意而非字面」之解读 = **`[inference]`**

## N/A / skipped（不计入 pass/warn/block）

| 规则组 | 状态 | 原因 |
|---|---|---|
| T1–T3（tasks 规则） | N/A | 无 `tasks.md`（Level 2，tasks 属 P3） |
| D1–D3（design 规则） | N/A | 无 `design.md`（属 P3） |
| C2（spec→tasks 覆盖） | N/A | 无 tasks |
| S2b/S2c/C6（`@knowledge:`/`@rule:` 可达性） | N/A | delta 用散文引用（REQ-004~007 / tech-stack-plan / DR-05 / Screen 11–14 / DoR / intent），无 `@` 前缀引用；散文引用已手工核验可达（见下） |
| p2 check 4（tasks 不违背 delta） | N/A | 无 tasks |

## 通过项（要点，含证据）

- **P1/P2**（Why / What Changes 命名段非空）: Pass — proposal line 9–17 / 19–51 [fact]
- **P3**（out-of-scope 实质非空）: Pass（内容存在，结构见 F3）— 内联多处 [fact]
- **P4**（Impact 覆盖上游/自身/下游）: Pass — Requirement（上游）/ Code·APIs·Dependencies·Runtime（自身）/ CI·Docs-harness（下游），结构同 req-001 [fact]
- **S1**（结构合项目 OpenSpec schema）: Pass — `.openspec.yaml`（schema: spec-driven）+ `# Spec Delta`/`## Purpose`/`## ADDED Requirements`/`### Requirement:`/`#### Scenario:` [fact]
- **S2**（引用前缀在约定集）: Pass — 无未知 `@` 前缀（未使用 `@` 引用）[fact]
- **S3**（每 Requirement 溯源 proposal What Changes）: Pass — 4 requirement ↔ proposal §Capabilities 4 命名一一对应，无孤儿 [fact]
- **S4**（场景 Given/When/Then）: Pass（按项目 schema）— 权威 Living `greeting/spec.md` 与 req-001 delta 均用 **WHEN/THEN/AND**（GIVEN 语境嵌入 WHEN），本 delta 一致；pack-default 的 Given 非本项目硬约定 [fact]
- **S5**（场景归属 Requirement）: Pass — 27 场景均挂命名 Requirement（OpenSpec 用命名非编号），无孤儿场景 [fact]
- **Shared 1**（交叉引用可达）: Pass — `analysis/req-004-007-dor.md`、`intents/2026-11-15-req-004-007-split-planning.md` 经 Glob 核实**存在**（顶部目录树为旧快照）；REQ-004~007 / Screen 11–14 / tech-stack-plan 均可达 [fact]
- **Shared 2**（无两处不相容陈述）: Pass — 全仓 grep「三表/3 表」残留 = **0**，21 处均「4 表/四表/严格 4 表」；身份 X-Member-Id、版本语义、{data,error}、确认谓词跨产物一致 [fact]
- **Shared 3**（AC 无模糊/不可测）: Pass — 全部落到 HTTP 状态 + error.code + data 字段 + 库态计数 + 数值算式（105/110/125/超 5）+ UI 三态，无「works well」类措辞 [fact]
- **C1**（proposal→spec 覆盖）: Pass — What Changes 4 能力点 ↔ delta 4 requirement；13 错误码全集逐一在 delta 出现；US-049/050 显式排除 [fact]
- **p2 check 1**（范围无静默扩/缩）: Pass — 恰 4 requirement，无第 5 条；前端栈以展示契约承载（F4 注记）[fact]
- **p2 check 2**（delta 内部一致）: Pass — 窗口 120（01:30Z→03:30Z）、A=15+60+20+10=105 / B=20+60+20+10=110 / A 末段 40→125 超 5、stop 时刻、分组 A(Alice+Ben)/B(Chloe+Daniel) 与 REQ-005/006/007 + 夹具逐项吻合 [fact]
- **p2 check 3/5**（约束有归属/可溯源）: Pass（F1/F4 为显式缺口注记）[fact]

## Fix suggestions（按优先级）

1. **WARNING（G1 前人工确认，不自动改正文）**
   - F1: IO/SA 裁决分组齐全校验——补负向 AC+错误码，或显式声明防御性/延后
   - F2: G1 决策记录注明 p2 recipe 实际顺序（delta 先于 G1），确认 G1 范围 = proposal+delta
2. **SUGGESTION（可选 / P3 承接）**
   - F3: 可选收敛命名 Non-Goals 段（项目惯例接受内联，不强制）
   - F4: P3 design 显式承接 OQ-N3 前端栈裁决
   - F5: P3/P4 以「发起时版本 vs 变更后版本」构造 stale，注记 v1/v2 为示意

## Residual risks（MUST）

| 风险 | 性质 | 处置 / owner | 标记 |
|---|---|---|---|
| R2：Living `greeting` 仍 REQ-001 text/plain 口径，req-002 JSON delta 未 merge | harness debt，非本 change | splits 为新能力不依赖 greeting；归档处置独立，不在本 change | [fact] |
| R1/OQ-N1：REQ-003 草稿口径（X-User-Id/多表/V2 编号）与 B 链分叉 | non-blocking | deferred，owner IO/SA + 未来 US-037；草稿夹具 untracked 保留不提交 | [fact] |
| R4：SQLite 单写者下条件更新/成对原子实现 | 设计风险 | P3 design 细化、P4 用例验证（S2/G2-N/G3-N） | [fact] |
| R5：前端 JSX/TS 混编 + 新依赖 lockfile CI 可达性 | 集成风险 | P4 本地 build + CI 观察 | [fact] |
| OQ-N7：US-049 如何消费校验结论（重算 vs 引用） | non-blocking | deferred，owner 未来 US-049 实现者 | [fact] |
| 路线行 `plan_version`=草稿 main_plan_version（REQ-006 Constraints line 82）未在 delta/proposal 重述 | 设计承接 | P3 design 显式指定（delta 行为级已覆盖成对/branch_id/原子） | [fact] |
| F1 分组齐全负向路径归属未定 | 待 G1 裁决 | 见 F1 suggested_fix | [inference] |
| 手工 lint（无 OpenSpec CLI）：未跑自动 schema 校验 | 工具 gap | verdict 上限 Partial；documented gap，同 req-001/002 | [fact] |

## Reviewer metadata

- agent: Qoder（手工 checklist pass，只读发现 + 交叉核验）
- human sign-off: **pending**（G1 由人工显式签核；本 lint 不批 Gate）
- date: 2026-11-15

## Next（non-Gate）

- phase=p2 → `/sdd:g1-decision-record`（人工显式签核；G1 评审时处置 F1/F2 WARNING）
- 或继续 `/sdd:p2`（人工 IO/SA 澄清残余歧义）
- 本 skill **不写 Gate Pass/Fail**、不自动 merge、不改权威 proposal/spec 正文；
  Partial 非 Gate 结果，建议修复在人工确认前仅为指引。