# DoR 自检 — US-071 查看我的行程

- 日期：2026-11-16
- 条目：`requirement-workspace/requirements/US-071.md`
- 意图：`requirement-workspace/intents/2026-11-16-us-071.md`
- 深度设计：`requirement-workspace/deep-dive.md` §US-071（⑨–⑫ 已完成，deep-dive 在范围内）
- 性质：条目自检，不是 Gate；不作 Pass/Fail 门禁决定

## 12 项结果

| # | 项 | 严重度 | 状态 | 位置 | 证据 / 说明 |
|---|---|---|---|---|---|
| ① | Intent 清晰 | — | Pass | US-071 §Intent | 一句话可讲清：打开行程 tab 就看到自己创建/加入的全部行程，点击进详情；外部读者可理解 what + why |
| ② | Actors 已定义 | — | Pass | §Actors and boundaries | 已登录账号（读取自己所属行程）、非成员（不可见）、后端 `trip` 包（范围查询与投影）、前端列表页（渲染四态 + 标记）；身份为 US-066 会话 |
| ③ | 范围有界 | — | Pass | §In scope / §Out of scope | In 9 条（端点、tab 落点、列表项、徽标、已结束标记、空态、错误重试、详情页主线入口、delta 形状）；Out 含分页搜索、增删改、US-061、迁移、编号入口、logout UI |
| ④ | 场景 / AC 具体 | — | Pass | §Scenarios S1–S14 + R1–R6 | 每条都有可观察结果（HTTP 状态、响应字段、可见徽标、路由跳转、页面无编号输入） |
| ⑤ | 异常 / 边界 | — | Pass | §R1–R6；deep-dive ⑩ | 无会话 401、仅 `X-User-Id` 401、非成员不可见、空数组、去重、只读、已结束与已确认主线两个非异常分支 |
| ⑥ | 结果可验证 | — | Pass | §Scenarios / §Constraints | 状态码、字段集、排序（`start_date`→`id`）、DOM 徽标与文案均可断言；无「运行良好」式表述 |
| ⑦ | 依赖 / 应用架构触点 | — | Pass | §Constraints / §Affected capabilities | `trips` ADDED + `app-shell` MODIFIED；`main-itinerary` 入口迁移；零迁移；`/api/**` 已认证故无需改 `SecurityConfig` |
| ⑧ | 开放问题门禁 | — | Pass | §Open questions | blocking 未 resolved = 0（OQ-1/2/3/4/8 全部 resolved）；non-blocking OQ-5/6/7/9 亦全部 resolved |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §US-071 ⑨ | 投影粒度、wire 字段、`organizer` 派生、已结束为显示态、排序契约；无 `{TBD}` |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §US-071 ⑩ | 身份 / 可见范围 / 空集 / 去重 / 已结束 / 已确认主线 / 写语义 / 排序逐分支 in-out |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §US-071 ⑪ | 与 `trips` 详情/名册、`app-shell` 三条 requirement、`invitations`、`main-itinerary`、`splits` 全部标 ✓；US-061 标范围外 |
| ⑫ | 通知 / 显示契约 | — | Pass | deep-dive §US-071 ⑫ | 7 个界面（列表、行点击、loading、空态、错误、账号切换、详情页主线入口）均有触发/受众/内容/通道/数量；无通知 |

## Advisory 发现

| 严重度 | 状态 | 位置 | 问题 | 处理 |
|---|---|---|---|---|
| WARNING | **resolved** | AC7 / OQ-9 | 跨账号切换的 UI 层验收需要 logout，当前后端无该端点 | 用户指令先查 GitHub 看板：US-069（issue #41）已存在且已在 Req Analysis，AC 覆盖会话失效与重新认证 → 本变更只在 API 层验收（两个独立会话互不可见），UI 补测登记给 US-069 |
| WARNING | **resolved** | §Affected capabilities | `app-shell` 现有 requirement 明文禁止新增列表端点与调用，与 AC1 直接冲突 | 以 MODIFIED 收敛（删除禁令、tab 恒落列表、空态动作改为创建）；已在条目与 deep-dive ⑪ 记录 |
| SUGGESTION | resolved | §In scope | 「已结束」若放服务端会产生时区与状态字段争议 | 决策：服务端只返回 `endDate`，前端按本地当天判定，仅显示层语义 |
| SUGGESTION | deferred | 设计参考 | `ui-design-reference/screenshots/` 无该屏；参考只有 issue #45 附件 `us-071-my-trips` | P3 按 issue 附件与现有 `@theme` token 复刻；如需入库再补截图资产（不阻塞 P2） |
| SUGGESTION | resolved | §Constraints | `tripsHref` 同时驱动 TabBar / 分队未选行程 / 成员页 / 创建页返回 | 收敛为恒 `#/trips`，四处一致指向列表，符合 `app-shell`「创建返回行程」既有约定 |

## 退出判定

- BLOCKER 数量：**0**
- blocking 开放问题未 resolved：**0**
- WARNING 2 条均 resolved；SUGGESTION 4 条（3 resolved / 1 deferred，不阻塞）
- 结论：可进入内嵌 impact analysis，随后可跑 `/sdd:proposal-split`（单 change：`trips` ADDED + `app-shell` MODIFIED + 详情页入口）
