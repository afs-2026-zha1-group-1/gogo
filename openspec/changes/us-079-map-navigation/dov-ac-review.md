# AC / DoV review — us-079-map-navigation（P2，2026-11-18）

Delta：`specs/main-itinerary/spec.md`（2 MODIFIED + 1 ADDED，18 scenarios）、
`specs/trips/spec.md`（1 MODIFIED + 1 ADDED，20 scenarios）；合计 5 requirements / 38 scenarios。
`openspec validate us-079-map-navigation --strict` = 0 ERROR，2 条长度 WARNING（非阻塞，沿用仓库先例保留）。
MODIFIED 块已逐字重基线 Living Spec 全部场景（main-itinerary 4+5、trips 8）。

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每 requirement 至少一条可测 AC | Pass | 5 requirements 各带 6–11 条 scenario | G1–G8 / W1–W6 / M1–M9 / 倒计时 11 |
| AC-2 AC 可观察 | Pass | 状态码/字段/页面元素均具体（201/200/404/403/422、address/lat/lng、地址待确认、新标签页） | 无"works well"类措辞 |
| AC-3 高风险反向/边界 | Pass | W2/W3/W4/W5（未知 seq/越界/越权/无草稿）、G8/M9（缓存 miss/海外留空不造假）、M6（兜底不空转）、倒计时负值/缺失态继承 | |
| AC-4 非实现细节伪装 | Pass | 坐标纠偏/缓存键等实现口径仅在 proposal/deep-dive；spec 只写可观察行为（lnglat 携带、null 省略、新标签页） | GCJ 纠偏作为可观察坐标口径写入 M2 |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal Capabilities = main-itinerary + trips；delta 无第三能力 | 无 silent expansion |
| DoV-2 歧义列明或已决 | Pass | P1 OQ-1…4 resolved（会话裁决）；OQ-5…8 deferred 用户确认；W1…3 deferred | 见 requirements/US-079.md OQ 表 |
| DoV-3 角色残余 concern | Pass（列明） | IO：新错误码 UNKNOWN_STOP/INVALID_COORDS 扩 mainplan 枚举 + 新端点 stop-locations 契约面 → G1 议程；SA：GCJ 矩形 bbox 边界误判（W2）、place_cache (name,city) 消歧（W3）、JS Key 前端暴露（R2） | 送 G1，不在本 skill 自批 |
| DoV-4 不声称业务实现完成 | Pass | 本 skill 仅产 spec/评审；实现先于 P1 存在（379/379、64/64 证据在 P1 条目），门禁未写 | |
| DoV-5 delta 追溯 proposal/需求 | Pass | AC1→M1；AC2→M2+G7；AC3→M3；AC4→M4；AC5→M5；AC6→trips MODIFIED 地址行三场景；AC7→trips MODIFIED origin 场景；AC8→M6；AC9→G7/G8/W1/W6+read 场景；AC10→M7；AC11→M8；AC12→M9+G8；AC13→ADDED write-back 正文 | 无未匹配项 |

## 结论

无 blocking Fail；**G1 = Pass（2026-11-18，IO Emily + SA Lumi，用户转达署名）**，见 `g1-decision.md`。
下一步：P3（`/sdd:atdd-design` + `/sdd:task-plan`）。design.md / tasks.md 属 P3，不在 P2 生成。
