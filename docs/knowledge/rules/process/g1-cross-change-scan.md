# g1-cross-change-scan — Cross-change contract scan before G1

## Metadata

| Field | Value |
|---|---|
| **ID** | g1-cross-change-scan |
| **Category** | process |
| **Priority** | Critical |
| **Activation** | auto |
| **Applies To** | all |
| **Stack** | — |

## Rule

1. 每个 change 在 **P2 出口、G1 评审包发出之前**必须产出一份
   `openspec/changes/<id>/cross-change-scan.md`，模板见
   `openspec/templates/cross-change-scan.md`。
2. 执行者是 **SA**（可由 Dev 代跑脚本，结论由 SA 签字）；时间盒 30 分钟。
   扫描只比对既有权威，不改写 delta、不替代 AC/DoV 复核与 consistency-lint。
3. 九轴必须逐条给出 Pass / Fail / N/A 和证据：需求号唯一、迁移号、身份/认证横切、
   错误契约、基线、Living 漂移、共享面、依赖队列、夹具/seed。
   自动信号来自 `scripts/cross-change-scan.sh`，判断项由 SA 填写。
4. 以下情况记 **BLOCKER**，G1 不得判 Pass：
   - registry 或 active change 目录出现重复需求号；
   - 两个 active change 预留同一迁移号，或本 change 引用的迁移号已被占用；
   - 认证类 change（delta 含 `specs/auth/spec.md`）漏掉任一含身份头的 capability；
   - delta 对某 capability 做 MODIFIED，但 `openspec/specs/<capability>/spec.md` 不存在；
   - 分支落后 `main` 超过 20 个提交（`MAX_BEHIND` 可覆盖）。
5. G1 记录的 Inputs 必须引用扫描文件；**无扫描文件不得记录 G1 Pass**。
   有 BLOCKER 时只能记 Conditional，整改项必须写 owner 和截止点。
6. Waiver 必须具名（IO 或 SA）、写明范围和失效条件；不接受“已知悉”“后续处理”。
7. 扫描结论与 G1 记录矛盾时（例如扫描 BLOCKER 0、G1 findings 仍记冲突），
   以扫描文件和证据为准，回填 G1 记录。
8. 本规则只对新增 change 生效，历史 change 不回填；纯文档 change 在无 spec/代码
   delta 时可整表 N/A，但必须写明理由。

## Rationale

G1 是最后一次低成本修改契约的窗口。单 change 的 consistency-lint 和 DoV 只看
自己的产物，看不见同仓库其它并行 change、Living Spec、迁移号和共享前端。
本仓已经发生过：需求号被 main 占用后重编号、两个 change 争 V4/V5、US-066 漏掉
splits 身份迁移、分支落后 25 个提交才发现。这些冲突在 G1 前扫描一次即可暴露，
漏到 G1 现场则要改 delta、设计甚至实现。

## Verification

| Check | Blocks |
|---|---|
| `g1-decision.md` 的 Inputs 有 Cross-change scan 行，且文件存在 | G1 |
| 扫描 BLOCKER = 0，或全部 BLOCKER 转为具名 waiver | G1 |
| 扫描时间不晚于 G1 记录时间 | G1 |
| 认证类 change 的 delta 覆盖全部含身份头的 capability | G1 |
| 扫描的九轴没有留空行 | G1 |

## Examples

### Good

- US-066 类：扫描先列出 auth 之外的 splits / main-itinerary / trips 三个 capability
  未覆盖、分支落后 25 个提交；SA 补齐 4 个 delta 并先吸收 main，再发 G1 评审包，
  G1 一次 Pass。
- 迁移号：扫描输出 `disk=[1..7] next=V8`，本 change 只引用既有 V4，不需要新号，
  结论直接引到 G1 Inputs。

### Bad

- 先记 G1 Pass，IO 复核才发现分支落后 25 个提交、splits 5 个端点未纳入身份迁移，
  再补 C1–C4 并重签。
- 两个 active change 都写“新增 V5”，直到归档合并时才冲突。

## Exceptions

- 纯文档 change（无 delta、无代码）可整表 N/A，需在 Verdict 下写一行理由。
- 仓库只有一条 active change、且落后 main 为 0 时，可以只跑脚本不填人工表，
  但扫描文件仍须存在并在 G1 Inputs 引用。

## References

- 模板：`openspec/templates/cross-change-scan.md`
- 脚本：`scripts/cross-change-scan.sh`
- 上游：`@rule:spec-first`；G1 产物：`g1-decision.md`
