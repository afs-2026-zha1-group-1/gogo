# DoR 轻量自检 — REQ-019

- 日期：2026-11-15
- 条目：`requirement-workspace/requirements/REQ-019.md`
- 深潜在范围内：是（新能力，impact 方向 = add），因此 ⑨–⑫ 适用
- 性质：条目自检，不是 Gate；此处不记录 Pass/Fail 的 Gate 判定

## 发现

| # | 项 | 严重度 | 状态 | 位置 | 结论 / 证据 |
|---|---|---|---|---|---|
| ① | 意图清晰 | — | Pass | REQ-019 §Intent | 受控 7 项兴趣、唯一化保存、非法值不改数据、reload 可见 |
| ② | 角色与边界 | — | Pass | REQ-019 §Actors | 成员/组织者/非成员/后端/前端均已列；身份 `X-User-Id`，写边界=自身，非成员 403 |
| ③ | 范围有界 | — | Pass | REQ-019 §In/Out scope | Out of scope 9 条，含其它三类偏好、就绪门控、邀请、方案生成、目录维护、锁定 |
| ④ | 场景/AC 具体 | — | Pass | REQ-019 §Scenarios | AC1、AC2 逐条可观察，另加 10 个派生的成功/失败/边界场景 |
| ⑤ | 异常与边界 | — | Pass | deep-dive §REQ-019 ⑩ | 未知值、混合值、大小写、空数组、缺 header、非成员、未知 trip、并发幂等均有归属 |
| ⑥ | 结果可验证 | — | Pass | REQ-019 §Scenarios | 断言锚在 HTTP 状态 + `code` + payload 解析后的集合 + chip 选中态 + 写前后 payload 逐字比较 |
| ⑦ | 依赖与应用架构触点 | — | Pass | impact brief §REQ-019 | 复用 V2 三表、`TripRepository.isMember`、`V4` 与 `V3` 的先后、前端 `App.jsx` 身份选择器、`TripErrorAdvice` 的包作用域均已具名 |
| ⑧ | 开放问题闸门 | — | Pass | REQ-019 §Open questions | blocking 未 resolved = 0；OQ-15/16/17 为 non-blocking 且 `deferred` 带 owner |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §REQ-019 ⑨ | `member_preference` 的粒度、字段、payload 形状与状态迁移齐全，无 `{TBD}` |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §REQ-019 ⑩ | 每个场景分支都有 in/out 归属，含 out-of-scope 的理由 |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §REQ-019 ⑪ | 与 REQ-003 共用表、与 REQ-004 的迁移顺序、`tag` 词表、封套/身份/持久化漂移、UI 清单差异全部有收敛结论，无遗留 ✗ |
| ⑫ | 展示契约已定 | — | Pass | deep-dive §REQ-019 ⑫ | 6 个界面态各自给出触发、接收者、内容字段与通道 |

## A0 深潜闸门

⑨ Pass、⑩ Pass、⑪ Pass、⑫ Pass → **A0 Pass**，允许拆分。
`/sdd:story-split` 跳过：单条故事（US-019）、单能力、12 个场景，不需要故事 backlog。

## 建议项（WARNING / SUGGESTION）

| 严重度 | 状态 | 位置 | 问题 | 处置 / owner |
|---|---|---|---|---|
| WARNING | open | REQ-019 §Constraints | `V4` 与 REQ-004 的 `V3` 存在落库顺序耦合：若 `V4` 先应用、`V3` 后到，Flyway 默认会因 out-of-order 失败 | 合入前必须确认 `V3` 已在 main；否则按合入时下一可用版本调整。owner Dev/SA |
| WARNING | open | `com.gogo.trip.TripErrorAdvice` | 该 advice 的 `basePackages` 只覆盖 `com.gogo.trip`，新包抛出的 `INVALID_REQUEST` 不会被它处理 | P3 设计定：新增 preference 专属 advice 或把作用域放宽到 `com.gogo`；owner Dev |
| WARNING | open | `docs/knowledge/architecture/tech-stack-plan.md` §6 | 计划写的 `{data,error}` 封套、`X-Member-Id`、`JdbcClient` 与已合并代码（裸 DTO、`X-User-Id`、`JdbcTemplate`）不一致 | 本需求跟随代码；计划文档修正为团队任务（OQ-16）；owner 团队 |
| WARNING | open | `AGENTS.md` | "UI 参考 shadcn/ui"与仓库实际的 `app.css` 手写风格冲突 | 后续补一条决议并修正指引；owner 本人 |
| WARNING | open | `application.yml` | 现有配置无 `hikari.maximum-pool-size=1` / WAL / `busy_timeout` / 外键开关；REQ-003 只做读与单行写，本需求引入幂等覆盖写 | P4 前评估是否需要补齐；owner Dev |
| SUGGESTION | deferred | REQ-019 OQ-15 | `acceptance-test-fixtures.md` 的 scope 仍是 US-001/002，US-019 用例未写入 | P3/ATDD 决定是否扩写；owner 本人 / 团队 |
| SUGGESTION | deferred | REQ-019 OQ-17 | `/api/greeting` 与 trip 接口的响应风格不一致 | 团队级统一项；owner 团队 |

被推迟项保留原严重度，没有 BLOCKER 被推迟。

## 出口闸门

- BLOCKER 数量：**0**
- blocking 开放问题未 `resolved`：**0**
- WARNING / SUGGESTION：未要求当场澄清，全部带 owner 记录在案
- 可以进入 `/sdd:delta-craft`（新能力 `preferences` 的 ADDED 增量）与 `/sdd:proposal-split`
