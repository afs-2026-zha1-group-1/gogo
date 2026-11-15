# G1 decision — req-004-split-planning-chain

- Gate: **G1（Align）**
- 记录日期: 2026-11-15
- 状态: **Conditional** (IO Emily approved; SA Leo re-review of revised contracts pending)
- 性质: 人工签核驱动的 Gate 决策记录；不自动批准、不改 Delta Spec、不 merge Living Spec

## Input artifacts

- Delta Spec: `specs/splits/spec.md` (5 ADDED requirements / 34 scenarios)
- AC/DoV: `dov-ac-review.md` current review correction supersedes the original report.
- Consistency: `consistency-lint.md` current amendment records strict validation
  success and resolved contract findings; historical findings remain below it.
- Proposal: `proposal.md`（G1 评审稿）
- 上游权威: REQ-004~007、`deep-dive.md` B 链段、`acceptance-test-fixtures.md` B 链段、`docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版）

## Check conclusions（findings）

- **Scope**: five requirements match proposal Capabilities: four business REQs
  plus shared member-only draft detail read. The read supports saved-state reload,
  stop selection and timing snapshot assembly; it adds no table or business story.
  13 错误码全集逐一覆盖；US-049 确认 / US-050 取消端点显式排除；前端栈以展示契约
  场景承载（栈选择属设计决策，defer P3）。
- **Ambiguity（歧义）**:
  - **F1**（lint WARNING：「分组齐全」生成前置缺负向 AC/错误码）→ **resolved**：
    用户 2026-11-15 裁决「**防御性前置，负向延后**」——本期分组由夹具保证齐全，
    「分组齐全/成员不跨组」为防御性前置，负向路径随「分组移动」特性（已 out-of-scope）
    延后；P3 design 显式注明（见 C2）。
  - **F2**（lint WARNING：proposal §下一步 G1 顺序措辞与 recipe 倒置）→ **noted**：
    按 `recipes/p2.md`，delta 于 P2 内、G1 之前产出；**G1 评审范围 = proposal + delta +
    AC/DoV + lint**。The proposal now reflects this current P2-to-G1 order.
  - blocking OQ-1/2/3/4/5/7 全 resolved；非阻塞 OQ-N1/N7 deferred（owner 已指）。
  - F5 is resolved with actual version N -> N+1 and concurrent boundary re-selection.
    F3/F4 remain optional/P3 handoff items; see C3.
- **Conflict（冲突）**: 无。「三表→四表」漂移已修正（REQ-004 + deep-dive），全仓
  grep「三表/3 表」残留 = 0；身份 `X-Member-Id` / draftVersion 语义 / `{data,error}` /
  确认谓词跨产物一致；数值算式（105/110/125/超 5、窗口 120）与夹具逐项吻合；
  Living `greeting` 不被触碰（req-002 未 merge 为独立 harness debt R2，不在本 change）。

## Decision

**Conditional**

The original SA signature covered the original four-requirement spec only (the
report said 27 scenarios; actual heading count was 28). The revised
five-requirement / 34-scenario package fixes identity precedence, permits
entry-guard reads while keeping the timing calculator pure, and defines draft GET.
`openspec validate req-004-split-planning-chain --strict` passes, but does not
approve those revised contracts. Per the user's explicit instruction, IO Emily
approves the revised five-requirement / 34-scenario package on 2026-11-15 (C1
closed). SA Leo's revised-contract re-review (C4) remains pending, so G1 stays
Conditional. Emily's approval does not extend or replace Leo's historical signature.

## Conditions + owners（remediation）

| # | 整改项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| C1 | IO approval of revised five-requirement / 34-scenario package | IO Emily | 2026-11-15; explicit user instruction | Required approval | completed; Emily approved |
| C4 | Re-review revised five-requirement / 34-scenario contracts | SA Leo | Before G1 Pass | **Blocking** | pending |
| C2 | P3 design 显式注明「分组齐全为防御性前置，负向路径随分组移动特性延后」（落实 F1 裁决） | SA / Dev | P3 | 非阻塞承接 | 待 P3 |
| C3 | P3 carries frontend stack OQ-N3 (F4); tests use N -> N+1 via boundary re-selection (F5 resolved in spec); named Non-Goals section remains optional (F3) | SA / Dev | P3 / P4 | Non-blocking handoff | pending P3 |

> C1 is closed by Emily's approval. C4 still blocks G1 Pass. C2/C3 are non-blocking P3 handoffs.

## Approvers

- **SA = Leo** (historical signature 2026-11-15 for original four-requirement spec;
  revised-contract re-review pending, C4)
- **IO = Emily** (approved, 2026-11-15; revised five-requirement / 34-scenario
  package; recorded per the user's explicit instruction)

## Timestamp

- SA 签核: 2026-11-15
- Revised SA approval: not recorded (C4 pending)
- IO Emily approval: 2026-11-15 (C1 completed)

## Next（non-Gate）

- Current Conditional: IO Emily has approved the revised package; SA Leo re-review
  remains pending. No P3 design or implementation until C4 is explicitly satisfied.
- After SA re-review approval: a human may update Decision and the SA timestamp,
  then proceed to `/sdd:p3` (`/sdd:atdd-design`).
- 本记录由人工签核驱动，不自动批准；不改 Delta Spec / 不 merge Living Spec。