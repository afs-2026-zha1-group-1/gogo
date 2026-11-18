# G1 decision — us-079-map-navigation

- Gate: G1 (Align)
- Inputs:
  - Delta Specs：`specs/main-itinerary/spec.md`（2 MODIFIED + 1 ADDED，18 scenarios）、
    `specs/trips/spec.md`（1 MODIFIED + 1 ADDED，20 scenarios）；合计 5 requirements / 38 scenarios；
    MODIFIED 已逐字重基线 Living Spec 全部场景（main-itinerary 4+5、trips 8）。
  - AC/DoV 评审：`dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass，无 blocking Fail）。
  - P1 基线：`requirement-workspace/requirements/US-079.md`（AC1–AC13）、
    `analysis/us-079-dor.md`（12 项 Pass，BLOCKER=0）、`intents/2026-11-18-us-079.md`、
    `impact-brief.md §US-079`、`deep-dive.md §US-079`（P1 commit `f694dab`）。
  - 校验：`openspec validate us-079-map-navigation --strict` = 0 ERROR，2 条长度 WARNING（非阻塞）。
- Findings:
  - 范围：与 proposal 一致（main-itinerary + trips 两能力），无 silent expansion。
  - 歧义：blocking OQ = 0（OQ-1…4 会话裁决 resolved）；OQ-5…8 与 DoR W1…3 / S1…2 均
    deferred（2026-11-18 用户一次性确认），非阻塞，不挡 G1。
  - 冲突：与 Living Spec 无冲突（MODIFIED 重基线）；splits 契约不变（只读消费投影坐标）；
    US-031-037 确认后冻结口径不变（stop-locations 仅作用 current 草稿）。
  - 送裁议程及结论：
    - IO 议程：新错误码 `UNKNOWN_STOP` / `INVALID_COORDS` 扩 mainplan 错误枚举、
      新端点 `POST /api/trips/{id}/main-plan/stop-locations` 契约面 → **Emily 批准，无附加条件**。
    - SA 议程：GCJ-02 矩形 bbox 边界误判（W2）、place_cache (name,city) 消歧（W3）、
      JS Key 前端暴露（R2，.env 不入库 + 建议域名白名单）→ **Lumi 确认，残余风险接受（deferred 记录在案）**。
- Decision: **Pass**
- Conditions + owners: 无（Pass 无附加条件；deferred 残余项 owner 见 requirements/US-079.md OQ 表：
  OQ-5 用户/IO 后续立项、OQ-6 用户可选回填、OQ-7 US-090 立项时、OQ-8 脚本护栏后续打磨）。
- Approvers: IO = **Emily**；SA = **Lumi**（2026-11-18 由用户明确转达署名："IO：Emily SA：Lumi pass"，
  按仓库先例代记，非代理自批）。
- Timestamp: 2026-11-18（+08:00）

## Next

P3：`/sdd:atdd-design` + `/sdd:task-plan`（design.md / tasks.md 本轮起才生成）。
