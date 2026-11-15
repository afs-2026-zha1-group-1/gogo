# DoR 轻量自检 — REQ-024

- 日期：2026-11-15
- 条目：`requirement-workspace/requirements/REQ-024.md`
- 深潜在范围内：是（修改已有能力 `preferences`，impact 方向 = modify），因此 ⑨–⑫ 适用
- 性质：条目自检，不是 Gate；此处不记录 Pass/Fail 的 Gate 判定

## 发现

| # | 项 | 严重度 | 状态 | 位置 | 结论 / 证据 |
|---|---|---|---|---|---|
| ① | 意图清晰 | — | Pass | REQ-024 §Intent | 可选预算的三字段落库；负数拒绝且不影响既有值；未设置与 0 可区分；reload 后仍在 |
| ② | 角色与边界 | — | Pass | REQ-024 §Actors | 成员/非成员/后端/前端均已列；写边界=自身 `kind='budget'` 行；金额边界=最小单位非负整数；非成员 403 |
| ③ | 范围有界 | — | Pass | REQ-024 §In/Out scope | Out of scope 12 条，含兴趣、必做项、约束、就绪提交、对比 summary、生成消费、汇率、成员摘要、上限、鉴权、新迁移 |
| ④ | 场景/AC 具体 | — | Pass | REQ-024 §Scenarios | AC1/AC2/AC3 可观察，另加 22 个派生场景（含 0 与 null 往返、JPY 零小数位、行数恒 1 的断言） |
| ⑤ | 异常与边界 | — | Pass | deep-dive §REQ-024 ⑩ | 缺身份、未 seed、非成员、未知 trip、坏 body、缺 `amount` 键、负数、小数、超 int32、字段联动缺失、非法币种、非法上限类型、半预算、幂等、只读、已确认后写入均有归属 |
| ⑥ | 结果可验证 | — | Pass | REQ-024 §Scenarios | 断言锚在 HTTP 状态 + `code` + `budget` 对象/null 的可区分性 + `member_preference` 行数与 payload 解析结果 + 跨成员逐字比较 + 界面格式化结果 |
| ⑦ | 依赖与应用架构触点 | — | Pass | impact brief §REQ-024 | 依赖 REQ-019 的 `V4` 与 preference 包、`TripRepository.isMember`、`App.jsx` 身份选择器、`tech-stack-plan.md` §5 的金额与 kind 约定，均已具名 |
| ⑧ | 开放问题闸门 | — | Pass | REQ-024 §Open questions | blocking 未 resolved = 0；OQ-10~14 为 non-blocking 且 `deferred` 带 owner |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §REQ-024 ⑨ | payload 形状 `{"amount","currency","limitType"}` 与清除态 `{}`、最小单位与币种小数位表、联动必填、校验顺序、状态迁移齐全，无 `{TBD}` |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §REQ-024 ⑩ | 35 条分支各有 in/out 归属，含 out-of-scope 的理由 |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §REQ-024 ⑪ | 与 REQ-019（同表、同包、同页）、REQ-020（同表不同 kind、写入时机差异）、REQ-003（行程日期）、REQ-004（主线确认）、US-031（消费方）、计划文档（§5/§6 漂移）均有收敛结论 |
| ⑫ | 展示契约已定 | — | Pass | deep-dive §REQ-024 ⑫ | 10 个界面态各自给出触发、接收者、内容字段与通道 |

## A0 深潜闸门

⑨ Pass、⑩ Pass、⑪ Pass、⑫ Pass → **A0 Pass**，允许拆分。
`/sdd:story-split` 跳过：单条故事（US-024）、单能力（`preferences` 的修改）、25 个场景，不需要故事 backlog。

## 建议项（WARNING / SUGGESTION）

| 严重度 | 状态 | 位置 | 问题 | 处置 / owner |
|---|---|---|---|---|
| WARNING | open | REQ-024 §Constraints | 本需求**零迁移**，但硬依赖 REQ-019 的 `V4__create_member_preference.sql` 与偏好页；且 REQ-020 已先一次 MODIFIED 页面契约，形成 019 → 020 → 024 的链式基线 | 合入顺序硬前置，PR 描述必须写明；三段按序合入则本条无需动作。owner Dev/SA |
| WARNING | open | REQ-024 §Constraints + deep-dive ⑨ | API 与 payload 用最小单位（40 SGD = `4000`），而 AC 用主单位表述；断言若只写 `4000`，无法证明「界面是 40 SGD」 | P4 断言必须双写：接口层 `4000` + 界面层 `SGD 40.00`。owner Dev/QA |
| WARNING | open | deep-dive §REQ-024 ⑨ | `JPY` 最小单位 = 1 日元（零位小数）。前端若硬编码 `value * 100` / `/ 100`，JPY 会显示成 `12.00` 并被加两个零 | 前端必须按币种查小数位表（`SGD/CNY/USD/EUR = 2`、`JPY = 0`），禁止硬编码 ×100。owner Dev |
| WARNING | open | 后端反序列化 | 「`amount` 键缺失」与「`amount: null`」必须可区分（前者 400 `INVALID_REQUEST`，后者是清除）。若用 record + Jackson，缺失会被静默当成 null，AC7-N 直接失败 | P3 决定用 `Map<String,Object>` 或 `JsonNode` 做 presence 检查，再映射到 DTO。owner Dev |
| WARNING | open | deep-dive §REQ-024 ⑨ | payload 是单对象，数据库无法约束「行数恒 1」；并发或重复插入会产生多行（UNIQUE 会挡住重复，但 `INSERT ... ON CONFLICT` 的写法决定成败） | P4 用 `INSERT ... ON CONFLICT(trip_id,user_id,kind) DO UPDATE` 或先 UPDATE 再 INSERT；测试断言行数恒 1。owner Dev |
| WARNING | open | `com.gogo.preference` 错误 advice | 若 REQ-019 未落地其 `PreferenceErrorAdvice`，本需求的 `INVALID_REQUEST` 与 `BUDGET_*` 不会产生（`TripErrorAdvice` 只覆盖 `com.gogo.trip`） | 复用 REQ-019 的 preference advice；缺失时本变更补齐。owner Dev |
| WARNING | open | `ui-design-reference` 节点 8 预算卡 | 原型 `f-cur` 只有 CNY/USD/EUR/JPY，不含 AC 要求的 SGD；且金额默认值 `1200`、提交按钮走全页 `submitPref()` | 币种下拉必须含 SGD；预算段需独立「保存预算」按钮（D4），不能挂在全页提交上。owner Dev |
| WARNING | open | `application.yml` | 现有配置无 `hikari.maximum-pool-size=1` / WAL / `busy_timeout` / 外键开关；`tech-stack-plan.md` §7 要求池=1 | 与 REQ-019/020 的同一 WARNING 合并处理，P4 前评估。owner Dev |
| SUGGESTION | deferred | REQ-024 OQ-10 | 金额业务上限未定，实现层只拒绝超 int32 | 若 US-031 需要边界提示再定；owner Dev / SA |
| SUGGESTION | deferred | REQ-024 OQ-11 | `acceptance-test-fixtures.md` 尚未收录 US-024 样例 | P3/ATDD 决定是否扩写；owner 本人 / 团队 |
| SUGGESTION | deferred | REQ-024 OQ-12/OQ-13 | 成员摘要展示他人预算、跨币种换算 | 属 US-013 / US-031；owner 团队 |
| SUGGESTION | deferred | REQ-024 OQ-14 | 计划文档 §6「单 PUT 提交四类偏好」与本需求独立端点漂移 | 并入 REQ-019 OQ-16 的团队文档任务；owner 团队 |

被推迟项保留原严重度，没有 BLOCKER 被推迟。

## 出口闸门

- BLOCKER 数量：**0**
- blocking 开放问题未 `resolved`：**0**
- WARNING / SUGGESTION：未要求当场澄清，全部带 owner 记录在案
- 可以进入 `/sdd:delta-craft`（`preferences` 的 ADDED 预算 requirement + 第三次 MODIFIED 页面 requirement）与 `/sdd:proposal-split`
