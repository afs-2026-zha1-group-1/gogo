# G1 decision — req-026-submit-preferences（草稿，待 IO + SA 签署）

> **状态：草稿（DRAFT）— Conditional；闸门未关闭（gate NOT closed）。** 由代理起草，**不自批、不代签**。`Decision` 与 §签核区由 IO + SA 填写。

- **Change id:** `req-026-submit-preferences`（US-026 提交就绪 + 无偏好；合并 US-027）
- **Gate:** G1 (Align)
- **Status:** **DRAFT — Conditional; SA signed Pass (relayed 2026-11-18); IO sign-off reserved/pending; gate NOT closed**
- **Inputs:** `proposal.md`；`specs/preferences/spec.md`（submission/readiness/effective + `Preferences page` 第 4 版）；`dov-ac-review.md`；`design.md` / `atdd-design.md` / `tasks.md`；`docs/feedback/verification-req-026.md`
- **Validation:** `openspec validate --strict` **未运行**（待人工；不得伪造）
- **Findings:**
  - 范围：单一 capability `preferences` 的第 4 版页面修订；新增 `400 PREFERENCE_EMPTY` 与 `kind='submission'`。
  - 依赖顺序：019 → 020 → 024 → 026；`effective` 读其余 kind 的 payload。
  - 简化：`effective.defaults` 暂缓；`noPreference` 逐项禁用兴趣+预算（必做项逐动作持久化，不随禁用）。
- **Decision:** 待签（Conditions 见下）
- **Conditions + owner:**

| # | 条件 | Owner | State |
|---|---|---|---|
| 1 | IO 评审并就绪/无偏好契约签署 | Emily | **sign-off: not recorded（签名位保留）** |
| 2 | SA 评审并就绪/无偏好契约签署 | evelyn.huang | **Pass — 2026-11-18, relayed by change author, no findings** |

- **Approvers:** IO = 待签（**签名位保留**）；SA = **evelyn.huang — Pass（2026-11-18，relayed by the change author；no findings relayed）**
- **Provenance:** 本 SA 签署为 **relayed**（非 documented），仓库无 SA 亲笔评审文字；提交不得更改已签措辞。
- **Timestamp:** 待填

## §签核区（待 IO + SA 填写；代理不代签）

```
IO  (Emily):        [ ] Pass   [ ] Fail   [ ] Conditional   姓名/时间: __________（签名位保留）
SA  (evelyn.huang): [X] Pass   [ ] Fail   [ ] Conditional   姓名/时间: evelyn.huang / 2026-11-18 (relayed)
Conditional 整改项 + owner（若判 Conditional 必须逐条写明）:
______________________________________________________
```

## Next

- IO + SA 签署 → G1 关闭 → G2（具名 VL）。`openspec validate --strict` 由人工运行后再记结论。
