# G1 decision — req-004-split-planning-chain

- Gate: **G1（Align）**
- 记录日期: 2026-11-15
- 状态: **Conditional**（SA 已具名签核；IO 具名签核待补，补齐后升级 Pass）
- 性质: 人工签核驱动的 Gate 决策记录；不自动批准、不改 Delta Spec、不 merge Living Spec

## Input artifacts

- Delta Spec: `specs/splits/spec.md`（4 条 ADDED requirement / 27 场景）
- AC/DoV 评审: `dov-ac-review.md`（AC-1~4 / DoV-1~5 **全 Pass**，无 blocking Fail/Partial）
- 一致性 lint: `consistency-lint.md`（phase=p2，手工运行，Overall **Partial**；0 BLOCKER / 2 WARNING / 3 SUGGESTION）
- Proposal: `proposal.md`（G1 评审稿）
- 上游权威: REQ-004~007、`deep-dive.md` B 链段、`acceptance-test-fixtures.md` B 链段、`docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版）

## Check conclusions（findings）

- **Scope（范围）**: delta 4 requirement ↔ proposal §Capabilities 一一对应，无静默扩/缩；
  13 错误码全集逐一覆盖；US-049 确认 / US-050 取消端点显式排除；前端栈以展示契约
  场景承载（栈选择属设计决策，defer P3）。
- **Ambiguity（歧义）**:
  - **F1**（lint WARNING：「分组齐全」生成前置缺负向 AC/错误码）→ **resolved**：
    用户 2026-11-15 裁决「**防御性前置，负向延后**」——本期分组由夹具保证齐全，
    「分组齐全/成员不跨组」为防御性前置，负向路径随「分组移动」特性（已 out-of-scope）
    延后；P3 design 显式注明（见 C2）。
  - **F2**（lint WARNING：proposal §下一步 G1 顺序措辞与 recipe 倒置）→ **noted**：
    按 `recipes/p2.md`，delta 于 P2 内、G1 之前产出；**G1 评审范围 = proposal + delta +
    AC/DoV + lint**。proposal §下一步为 P1 冻结快照，不改正文。
  - blocking OQ-1/2/3/4/5/7 全 resolved；非阻塞 OQ-N1/N7 deferred（owner 已指）。
  - F3/F4/F5（SUGGESTION）为非阻塞卫生/承接项，见 C3。
- **Conflict（冲突）**: 无。「三表→四表」漂移已修正（REQ-004 + deep-dive），全仓
  grep「三表/3 表」残留 = 0；身份 `X-Member-Id` / draftVersion 语义 / `{data,error}` /
  确认谓词跨产物一致；数值算式（105/110/125/超 5、窗口 120）与夹具逐项吻合；
  Living `greeting` 不被触碰（req-002 未 merge 为独立 harness debt R2，不在本 change）。

## Decision

**Conditional**

理由: spec 对齐已完成（F1 歧义经用户裁决消除，0 BLOCKER，AC/DoV 全 Pass），
**SA 已具名签核（Leo）**；但 G1 要求 **IO + SA 双具名签核**，IO 签核暂缺
（用户工作流：push 代码后由 IO 审核补签）。按技能规则「缺签核角色不得记 Pass」，
故记 **Conditional**，IO 补签为阻塞整改项（C1）；C1 补齐后升级 **Pass**。
F1 已 resolved，不存在「Pass 带未解歧义」之禁止情形。

## Conditions + owners（remediation）

| # | 整改项 | owner | 触发 / 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| C1 | IO 具名审核并补签 G1（升级 Pass 的前置） | IO（push 后指定具名） | 代码 push 后 | **阻塞**（G1 升级 Pass） | pending |
| C2 | P3 design 显式注明「分组齐全为防御性前置，负向路径随分组移动特性延后」（落实 F1 裁决） | SA / Dev | P3 | 非阻塞承接 | 待 P3 |
| C3 | P3 design 承接前端栈裁决 OQ-N3（F4）；stale 以「发起时版本 vs 变更后版本」构造并注记 v1/v2 为示意（F5）；F3 命名 Non-Goals 段可选 | SA / Dev（F3 owner IO 可选） | P3 / P4 | 非阻塞承接 | 待 P3 |

> C1 为 G1 升级 Pass 的**阻塞**整改项；C2/C3 为非阻塞 P3 承接项（记录备查，不阻 G1）。

## Approvers

- **SA = Leo**（已签，2026-11-15）
- **IO = 待补**（pending；用户 push 代码后由 IO 审核签名，补签后回填具名 + 时间）

## Timestamp

- SA 签核: 2026-11-15
- IO 补签: 待记录（C1 完成时回填）

## Next（non-Gate）

- **当前 Conditional**：可提交并 push P2 产物供 IO 审核；**IO 签核前不视为 G1 Pass，
  不进入 P3 实现**。
- **C1 补齐后**：更新本记录 Decision=Pass、Approvers IO 具名、IO 补签时间 →
  `/sdd:p3`（`/sdd:atdd-design`）。
- 本记录由人工签核驱动，不自动批准；不改 Delta Spec / 不 merge Living Spec。