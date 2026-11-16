# G1 decision — us-066-log-in（Conditional → Pass 转换）

- Change id：`us-066-log-in`（REQ-008 / US-066）
- Gate：G1（Align）
- 原记录：`g1-decision.md` — 2026-11-16 **Conditional**（IO Johnson / SA Elian Jiang）
- 转换依据：原 Conditional 写明“C1–C4 全部关闭后转 Pass”；C1–C4 已于
  2026-11-16 关闭，`openspec validate us-066-log-in` valid，一致性 lint 重跑无
  BLOCKER。
- 转换指令：SA **Elian Jiang** 于 2026-11-16 明确指示“先转成 pass”。IO **Johnson**
  的原签署已接受“条件关闭后转 Pass”的规则；本记录**不声称** IO 有新的单独签署。
- 记录时间：2026-11-16

## Inputs

| 输入 | 路径/结果 |
|---|---|
| Delta Specs | `specs/{auth,trips,invitations,app-shell,main-itinerary,splits}/spec.md` |
| AC/DoV | `dov-ac-review.md`（AC-1…4 / DoV-1…5 Pass；R1 已关闭） |
| 一致性 lint | `consistency-lint.md` §Re-run after G1 C1–C4（无 BLOCKER；L5 为既有 splits Purpose 文案漂移） |
| 条件闭合 | `g1-addendum-c1-c4.md`（C1–C4） |
| 校验 | `openspec validate us-066-log-in` → valid |

## Findings

- C1：splits 已纳入，`specs/splits/spec.md` MODIFIED；`MEMBER_REQUIRED` +
  `{data,error}` 作为例外。
- C2：`main-itinerary` 已归档/进入 Living Spec；MODIFIED delta 已添加。
- C3：auth/trip/invitation/main-plan + Security handler 使用扁平
  `{code,message}`；splits 保留 envelope + `MEMBER_REQUIRED`。
- C4：分支已合并 `origin/main` `f6419a5`（merge `53bdcc6`）；V1–V5 占用，
  `V6` 仍为凭据迁移；清单/基线已刷新。
- 残余（不阻塞 Pass）：
  1. `openspec/specs/splits/spec.md` Purpose 仍写 `X-Member-Id`（代码/delta 已用
     session），由 SA 在 archive/living-merge 修正；
  2. 历史场景名由 OpenSpec 归档规则保留；
  3. in-memory session 重启失效、demo 凭据仅演示用途。

## Decision

- **Pass**
- Conditions + owners：无未关闭条件；上述残余由 SA/Dev 在归档/运行阶段处理。
- Approvers：**IO = Johnson**；**SA = Elian Jiang**（原 Conditional 签署；本次
  转换由 SA 明确指示，IO 原签署接受条件关闭即转 Pass 的规则）。
- Timestamp：2026-11-16

原始 `g1-decision.md` 保留为历史 Conditional 记录，不修改已签内容。
