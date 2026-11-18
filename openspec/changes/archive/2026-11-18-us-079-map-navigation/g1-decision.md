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

## Revision R1（2026-11-18，G1 后用户裁决）

- 内容：首站出发点统一固定为**珠海南方软件园**（原 M3/倒计时口径为"留空手填"）；
  place-book `FIRST_STOP_ORIGIN` + V11 种子 + StopMapButton 默认 origin 同步；
  delta trips M3/倒计时正文、P1 AC3、design DD8、atdd E3 同步修订。
- 坐标来源：高德 POI（唐家湾镇软件园路1号）GCJ 22.372424,113.577651 反算 WGS-84
  22.375463,113.572607（往返误差 <1m）。
- 影响面：仅首站起点可观察口径；错误码/端点/存储形状不变。
- 复审：**Pass（IO Emily + SA Lumi，2026-11-18 用户转达，随 G3 闭环）**，C-R1 closed。

## Revision R2（2026-11-18，P4 措辞澄清）

- 内容：G8 场景措辞澄清为"缓存 miss 时 lat/lng 留 null、provider 供给的 address 保留"，
  与实现一致（address 来自 AI 契约不应因缓存 miss 丢弃）；仅措辞澄清，无行为变更。
- 复审：**Pass（IO Emily + SA Lumi，2026-11-18 用户转达，随 G3 闭环）**，C-R2 closed。

## Next

P3：`/sdd:atdd-design` + `/sdd:task-plan`（design.md / tasks.md 本轮起才生成）。
