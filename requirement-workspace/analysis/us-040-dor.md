# DoR 自检 — US-040 发起分队并查看成员分组

- 日期：2026-11-17
- 条目：`requirement-workspace/requirements/US-040.md`
- 意图：`requirement-workspace/intents/2026-11-17-us-040.md`
- 深度设计：`requirement-workspace/deep-dive.md` §US-040（⑨–⑫ 见表尾，完成后回填）
- 性质：条目自检，不是 Gate；不作 Pass/Fail 门禁决定

## 12 项结果

| # | 项 | 严重度 | 状态 | 位置 | 证据 / 说明 |
|---|---|---|---|---|---|
| ① | Intent 清晰 | — | Pass | US-040 §Intent | 一句话可讲清：分队草稿的分组从「自动均分」变成「成员自选 + 全员可见 + 确认前校验」；外部读者可理解 what + why |
| ② | Actors 已定义 | — | Pass | §Actors and boundaries | 行程成员（读分组、改自己）、组织者（确认前门禁）、发起人（重新生成）、后端 `splits` 包、前端 Screen 13/15；权限边界显式（不能替他人改、生成仅发起人） |
| ③ | 范围有界 | — | Pass | §In scope / §Out of scope | In 9 条（端点、groups 结构、初始分组、生成前置、确认前置、完整性口径、Screen 13 卡片、文案、Screen 15 成员名）；Out 含替他人改组、迁移、已确认再调、路线-成员绑定、自动分组算法、既有语义、名册、通知 |
| ④ | 场景 / AC 具体 | — | Pass | §Scenarios S1–S17 | 每条都有可观察结果（HTTP 状态、`groups` 内容、`draftVersion` 变化、`error.details.missing` 项、可见成员名与提示文案） |
| ⑤ | 异常 / 边界 | — | Pass | §R1–R10 | 401/403/404/409 四类门禁、过期版本、非法组别、请求体夹带他人、终态改组、字段不变性、R10 明确「改组未重新生成不构成确认拒绝」 |
| ⑥ | 结果可验证 | — | Pass | §Scenarios / §Constraints | 状态码、`groups` 键与元素、版本号、`details.missing` 字面值、DOM 文案均可断言；无「运行良好」式表述 |
| ⑦ | 依赖 / 应用架构触点 | — | Pass | §Affected capabilities / §Context | `splits` 1 ADDED + 3 MODIFIED；前端 Screen 13/15；复用成员名册端点；**零迁移、零新依赖**；错误码全部复用既有枚举（非法组别留 OQ-9 非阻塞） |
| ⑧ | 开放问题门禁 | — | Pass | §Open questions | blocking 未 resolved = **0**（OQ-1…OQ-8 全部按 BQ-1…BQ-8 裁决）；non-blocking OQ-9…OQ-12 全部 `deferred` 且有 owner 提示 |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §US-040 ⑨ | `groups` 粒度/字段/状态迁移、请求 DTO、`draftVersion` 双表示（文档 + CAS 列）、路线保留、成员集合、`details.missing` 取值、成员名投影全部列明；无 `{TBD}`；三项不变式已写 |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §US-040 ⑩ | 18 行分支：身份/行程/成员/无草稿/终态/版本/非法组别/夹带他人/同组幂等/正常改组/路线保留/空组/漏组/重复组/生成权限/确认权限/可确认/成员表；每条有 In-Out 与依据 |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §US-040 ⑪ | `splits` 内部 7 条 requirement 逐条对齐（3 条 MODIFIED、4 条不变）；`trips` 名册、`app-shell`、`auth` 均标 ✓；`main-itinerary`/`invitations`/`preferences` 无影响 |
| ⑫ | 通知 / 显示契约 | — | Pass | deep-dive §US-040 ⑫ | 9 个显示面（分组卡、切组按钮、改组提示、生成/确认错误卡、复核屏、空组引导、权限态、四态）均有触发/受众/内容与字段/通道/数量；无通知 |

## Advisory 发现

| 严重度 | 状态 | 位置 | 问题 | 处理 |
|---|---|---|---|---|
| WARNING | **resolved** | AC 第 2 条 / BQ-2 | issue AC 写「分组变化使旧路线失效或要求重新生成」，与用户裁决「保留 routes」字面张力 | 用户裁决优先：保留 routes、仅 `draftVersion + 1`，重新生成时按当前分组标签重建；P2 delta 的 MODIFIED 块需显式写入取代表述（S14/R10 已固化） |
| WARNING | **resolved** | S1 / BQ-7 | 初始「全员 A 组、B 空」改变既有夹具前置（现测试期望 A/B 各 2 人），会打破已归档场景的夹具假设 | 已列入影响面：P2/P3 需更新受影响的后端集成测试与 `acceptance-test-fixtures.md` 的 splits 段；不改 Living Spec 既有场景的「S1 成员发起唯一草稿」结论，但需在 delta 中同步初始分组 |
| SUGGESTION | **resolved** | Screen 13 文案 | 现有卡片写「分组由夹具按偏好齐全分区；本期不开放成员移动控件」，副标题「分组移动本期不开放」 | In scope 已明示移除该文案并改为分组卡；「自动分组」标题亦需改（OQ-11 视觉细节 deferred） |
| SUGGESTION | **resolved** | Screen 15 | 复核屏以 `memberId` 原串展示 A/B 组 | In scope 已改为成员名展示（复用名册），纳入 S17 |
| SUGGESTION | deferred | OQ-9…OQ-12 | 非法组别错误码、重复提交幂等、头像首字母、空 B 组引导文案 | 均为实现/文案细节，留 P3 定；风险已记录，不阻塞 impact 与 split |
| WARNING | **resolved** | `SplitRouteGenerationApiTest` | 既有负向用例断言 `POST .../split-draft/groups:move` 不存在（404/405），与本变更新增的分组端点直接冲突 | BQ-1 定为 `PUT .../assignment`（不采用 `groups:move`）；已写入条目 §Context 与 impact §4 / R6：P4 必须删除或改写该负向断言 |

## 退出判定（完整：①–⑫）

- BLOCKER 数量：**0**
- blocking 开放问题未 resolved：**0**
- WARNING 3 条均 resolved；SUGGESTION 3 条（2 resolved / 1 deferred 不阻塞）
- ⑨–⑫：deep-dive §US-040 已完成，四项均 Pass（数据契约/边界 18 行/跨 REQ 12 行/显示 9 面）
- 结论：可进入 `/sdd:proposal-split`（单 change：`splits` 1 ADDED + 3 MODIFIED）
