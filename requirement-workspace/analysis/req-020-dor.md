# DoR 轻量自检 — REQ-020

- 日期：2026-11-15
- 条目：`requirement-workspace/requirements/REQ-020.md`
- 深潜在范围内：是（修改已有能力 `preferences`，impact 方向 = modify），因此 ⑨–⑫ 适用
- 性质：条目自检，不是 Gate；此处不记录 Pass/Fail 的 Gate 判定

## 发现

| # | 项 | 严重度 | 状态 | 位置 | 结论 / 证据 |
|---|---|---|---|---|---|
| ① | 意图清晰 | — | Pass | REQ-020 §Intent | 添加/修改/删除必做项；修改原地生效、删除只影响自己、改动 reload 后仍在 |
| ② | 角色与边界 | — | Pass | REQ-020 §Actors | 成员/非成员/后端/前端均已列；写边界=自身 `kind='must_do'`，条目 id 仅本人列表内唯一，非成员 403 |
| ③ | 范围有界 | — | Pass | REQ-020 §In/Out scope | Out of scope 10 条，含兴趣、其它 kind、就绪门控、方案生成、锁定、上限、鉴权、新迁移 |
| ④ | 场景/AC 具体 | — | Pass | REQ-020 §Scenarios | AC1/AC2/AC3 可观察，另加 15 个派生成功/失败/边界场景（含 AC2 的条数与 id 断言） |
| ⑤ | 异常与边界 | — | Pass | deep-dive §REQ-020 ⑩ | 缺身份、未 seed、非成员、未知 trip、坏 body、空 activity、地点时间双空、非法时间、他人 id、重复 id、空列表、幂等、双字段并存均有归属 |
| ⑥ | 结果可验证 | — | Pass | REQ-020 §Scenarios | 断言锚在 HTTP 状态 + `code` + 条目数与 `id` 稳定性 + payload 解析结果 + 跨成员逐字比较 + 页面状态 |
| ⑦ | 依赖与应用架构触点 | — | Pass | impact brief §REQ-020 | 依赖 REQ-019 的 `member_preference`(V4) 与偏好页、`TripRepository.isMember`、`App.jsx` 身份选择器、preference 包的错误 advice 均已具名 |
| ⑧ | 开放问题闸门 | — | Pass | REQ-020 §Open questions | blocking 未 resolved = 0；OQ-10~14 为 non-blocking 且 `deferred` 带 owner |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §REQ-020 ⑨ | payload `{"items":[{id,activity,location,time}]}`、id 签发与不复用规则、字段可空语义、状态迁移齐全，无 `{TBD}` |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §REQ-020 ⑩ | 24 条分支各有 in/out 归属，含 out-of-scope 的理由 |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §REQ-020 ⑪ | 与 REQ-019（同表、同包、同页、写入时机差异）、REQ-003（行程日期隐含）、REQ-004（主线确认仅上下文）、US-031（消费方）均有收敛结论 |
| ⑫ | 展示契约已定 | — | Pass | deep-dive §REQ-020 ⑫ | 9 个界面态各自给出触发、接收者、内容字段与通道 |

## A0 深潜闸门

⑨ Pass、⑩ Pass、⑪ Pass、⑫ Pass → **A0 Pass**，允许拆分。
`/sdd:story-split` 跳过：单条故事（US-020）、单能力（`preferences` 的修改）、20 个场景，不需要故事 backlog。

## 建议项（WARNING / SUGGESTION）

| 严重度 | 状态 | 位置 | 问题 | 处置 / owner |
|---|---|---|---|---|
| WARNING | open | REQ-020 §Constraints | 本需求**零迁移**，但硬依赖 REQ-019 的 `V4__create_member_preference.sql` 与偏好页先落库；`V4` 未在 main 时本变更无法合入 | 合入顺序硬前置，PR 描述必须写明；REQ-019 先合则本条无需动作。owner Dev/SA |
| WARNING | open | deep-dive §REQ-020 ⑨ | 条目 `id` 存在 JSON payload 内，数据库无唯一约束；「id 不复用」只由 Service 保证，缺陷会静默产生重复 id | P4 断言：更新后 `id` 集合不变、条数不变；代码评审重点看 id 分配分支。owner Dev |
| WARNING | open | REQ-020 OQ-11 | 无条目数量与字段长度上限，每次写入整行 JSON 重写；极端输入会放大写放大与响应体 | P4 前评估是否需要防御性上限；本轮不臆造限制。owner Dev |
| WARNING | open | `com.gogo.preference` 错误 advice | 若 REQ-019 未落地其 `PreferenceErrorAdvice`，本需求的 `INVALID_REQUEST` 与 `MUST_DO_*` 不会产生（`TripErrorAdvice` 只覆盖 `com.gogo.trip`） | P3 设计确认 advice 归属；倾向于复用 REQ-019 的 preference advice。owner Dev |
| WARNING | open | `ui-design-reference` 节点 8 | 原型表单标签写「地点 二选一 / 固定时间」，`addMustdo()` 也按「至少一项」校验——前者与 Design scope「不得阻止同时保存地点与时间」冲突 | UI 文案必须改为「地点（可选）/ 固定时间（可选），至少填一项」；不改会误导实现。owner Dev |
| WARNING | open | `application.yml` | 现有配置无 `hikari.maximum-pool-size=1` / WAL / `busy_timeout` / 外键开关；本需求与 REQ-019 共享同一条幂等覆盖写路径 | 与 REQ-019 的同一 WARNING 合并处理，P4 前评估。owner Dev |
| SUGGESTION | deferred | REQ-020 OQ-10 | `acceptance-test-fixtures.md` 尚未收录 US-019/US-020 样例 | P3/ATDD 决定是否扩写；owner 本人 / 团队 |
| SUGGESTION | deferred | REQ-020 OQ-12 | `time` 不带日期，多日行程无法定位 | 由 US-031 的需要决定是否扩展；owner 团队 |
| SUGGESTION | deferred | REQ-020 OQ-13 | 删除是否需要二次确认未定 | AC 未要求；P3 定，倾向直接删除 + 失败回滚；owner Dev |

被推迟项保留原严重度，没有 BLOCKER 被推迟。

## 出口闸门

- BLOCKER 数量：**0**
- blocking 开放问题未 `resolved`：**0**
- WARNING / SUGGESTION：未要求当场澄清，全部带 owner 记录在案
- 可以进入 `/sdd:delta-craft`（`preferences` 的 MODIFIED 增量 + 一个 ADDED 必做项 requirement）与 `/sdd:proposal-split`
