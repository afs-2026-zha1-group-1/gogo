# DoR 轻量自检 — REQ-026

- 日期：2026-11-15
- 条目：`requirement-workspace/requirements/REQ-026.md`
- 深潜在范围内：是（修改已有能力 `preferences`，impact 方向 = modify），因此 ⑨–⑫ 适用
- 性质：条目自检，不是 Gate；此处不记录 Pass/Fail 的 Gate 判定

## 发现

| # | 项 | 严重度 | 状态 | 位置 | 结论 / 证据 |
|---|---|---|---|---|---|
| ① | 意图清晰 | — | Pass | REQ-026 §Intent | 提交 = 状态迁移 `pending → ready`，两种子态（带个人值 / 显式无偏好）；保存偏好不产生就绪；沉默者不出现在生成侧投影 |
| ② | 角色与边界 | — | Pass | REQ-026 §Actors | 成员/非成员/后端/前端均已列；写边界 = 自身 `kind='submission'` 行且**不触碰**其他 kind；空提交判定属读边界；非成员 403 |
| ③ | 范围有界 | — | Pass | REQ-026 §In/Out scope | Out of scope 10 条，含三段偏好改动、`constraint` kind、撤销提交、就绪失效、生成本身、通知、默认画像可配置、鉴权、新迁移 |
| ④ | 场景/AC 具体 | — | Pass | REQ-026 §Scenarios | 4 条 AC 直映射（AC1、AC2、AC3 = US-027 的 AC2、NP1 = US-027 的 AC1）+ 36 条派生 = **40 条**；含 AC2 的失败注入、AC3 的「不在投影里」断言 |
| ⑤ | 异常与边界 | — | Pass | deep-dive §REQ-026 ⑩ | 34 条分支：身份三类、trip/成员、body 五类、空提交六类、覆盖与幂等、并发、写失败、名册四态、投影六类、只读与主线状态、前端网络失败均有归属 |
| ⑥ | 结果可验证 | — | Pass | REQ-026 §Scenarios | 断言锚在 HTTP 状态 + `code` + `submittedAt` 格式 + `member_preference` 行数与 payload 解析结果 + `readiness` 各字段 + `effective` 的成员集合与字段 + pill 文案三类区分 |
| ⑦ | 依赖与应用架构触点 | — | Pass | impact brief §REQ-026 | 依赖 REQ-019 的 `V4` 与 preference 包、REQ-020/024 的 payload 形状、`TripRepository.isMember`、`App.jsx` 身份选择器、偏好页与成员页（节点 7），均已具名 |
| ⑧ | 开放问题闸门 | — | Pass | REQ-026 §Open questions | blocking 未 resolved = 0；OQ-1~OQ-11 为 non-blocking，带 owner 与去向 |
| ⑨ | 数据契约已定 | — | Pass | deep-dive §REQ-026 ⑨ | payload 形状（含 `defaults`）、pending=无行、三端点字段表、「四类全无」判定口径、8 步校验顺序、投影规则齐全，无 `{TBD}` |
| ⑩ | 边界已枚举 | — | Pass | deep-dive §REQ-026 ⑩ | 34 条分支各有 in/out 归属，含 out-of-scope 的理由 |
| ⑪ | 跨 REQ 一致 | — | Pass | deep-dive §REQ-026 ⑪ | 与 REQ-019（同表同包同页）、REQ-020、REQ-024（payload 只读消费）、REQ-004（主线确认）、US-013（节点 7）、US-031（消费方）、计划文档（§5 kind 枚举、§6 端点）均有收敛结论 |
| ⑫ | 展示契约已定 | — | Pass | deep-dive §REQ-026 ⑫ | 12 个界面态各自给出触发、接收者、内容字段与通道 |

## A0 深潜闸门

⑨ Pass、⑩ Pass、⑪ Pass、⑫ Pass → **A0 Pass**，允许拆分。
`/sdd:story-split` 跳过：单条需求（US-026 + US-027 合并）、单能力（`preferences` 的修改）、40 个场景，不需要故事 backlog。

## 建议项（WARNING / SUGGESTION）

| 严重度 | 状态 | 位置 | 问题 | 处置 / owner |
|---|---|---|---|---|
| WARNING | open | REQ-026 §Constraints | 本需求**零迁移**，但 `effective` 投影要读 REQ-019/020/024 三类 payload；任一未落地则投影字段只能为 `null`，AC1「输入可供生成」无法证明 | 合入顺序硬前置 REQ-019(`V4`) → 020 → 024 → 026，PR 描述必须写明。owner Dev/SA |
| WARNING | open | deep-dive §REQ-026 ⑨ | `kind='submission'` 超出 `tech-stack-plan.md` §5 的四类枚举，且语义从「偏好内容」扩到「提交状态」 | P2 delta 必须显式写明 `kind` 取值域扩展与理由；文档修正并入 REQ-019 OQ-16。owner SA |
| WARNING | open | REQ-026 §Contract | 空提交判定要读四类 kind，其中 `constraint` 尚未实现；若实现时对缺失 kind 抛异常，所有正常提交都会 500 | 判定必须把「无行」当「无」，并对 `constraint` 显式短路；EMPTY1~EMPTY5 覆盖各 kind 的空态。owner Dev |
| WARNING | open | 后端错误映射 | 现状 500 走 Spring 默认响应体（不是 `{"code","message"}`），AC2 与 UI5 都要求可展示的错误体 | 本变更需在 preference 包补 500 映射为 `INTERNAL_ERROR`（固定文案，不泄露内部异常）。owner Dev |
| WARNING | open | deep-dive §REQ-026 ⑨ | payload 内 `submittedAt`（+08:00）与表内 `updated_at`（UTC）是两个时间源，容易在 P4 被混用 | 断言与界面一律用 `submittedAt`；`updated_at` 只用于「未被写入」的负向断言。owner Dev/QA |
| WARNING | open | `ui-design-reference` 节点 8 | 原型 `submitPref()` 一次点击同时保存四段字段并置就绪；`noPrefSw` 只 `hide` 字段 | 实现必须拆开：提交只负责就绪；无偏好开关要**禁用**字段并写服务端标记。这一段同时修掉 REQ-024 记录的 R8 冲突。owner Dev |
| WARNING | open | `specs/preferences/spec.md` | 偏好页契约第 4 次修订（REQ-019 → 020 → 024 → 026），每次都在同一 requirement 上加修改 | P2 以 REQ-024 的版本为基线再修订，把四段的写入时机与就绪动作逐段写明。owner Dev/SA |
| WARNING | open | deep-dive §REQ-026 ⑨ | `effective` 读路径遇到损坏 payload（非法 JSON、类型不符）时行为未定 | P3 决定：按「空」处理并记 warn，不因脏数据打挂整页（倾向），或按 500 失败。owner Dev |
| WARNING | open | `analysis/req-020-dor.md`、`req-020-manage-must-do/proposal.md` | REQ-020 文档写 `UNAUTHENTIC` / `TRIP_FORBIDDEN`，而 `TripController` 实际是 `USER_REQUIRED`(401) / `NOT_A_MEMBER`(403) | 本需求按代码实况写；REQ-020 的 P2 修订或 G1 条件里一并更正。owner SA |
| SUGGESTION | deferred | REQ-026 OQ-4 | 撤销提交（`ready → pending`）是否补故事 | 待 SA 排期；本需求单向。owner SA |
| SUGGESTION | deferred | REQ-026 OQ-5 | `defaults` 未来是否需要可配置（交通/节奏选项） | 属 US-031 相关设计；owner SA |
| SUGGESTION | deferred | REQ-026 OQ-6/OQ-8 | 提交后通知组织者、名册运营字段（全员就绪时间） | 本需求无通知、无运营字段；owner 团队 |
| SUGGESTION | deferred | REQ-026 OQ-7 | 就绪失效是否需要 `stale` 标记 | D10 裁定本需求不做；交 US-031/037；owner SA |
| SUGGESTION | deferred | REQ-026 OQ-9 | `acceptance-test-fixtures.md` 尚未收录 US-026/US-027 样例 | P3/ATDD 决定是否扩写；owner 本人 / 团队 |
| SUGGESTION | deferred | REQ-026 OQ-10 | 计划 §5 的 kind 枚举与 §6 的「单 PUT 提交四类偏好」与本需求漂移 | 并入 REQ-019 OQ-16 的团队文档任务；owner 团队 |

被推迟项保留原严重度，没有 BLOCKER 被推迟。

## 出口闸门

- BLOCKER 数量：**0**
- blocking 开放问题未 `resolved`：**0**
- WARNING / SUGGESTION：未要求当场澄清，全部带 owner 记录在案
- 可以进入 `/sdd:delta-craft`（`preferences` 的 3 个 ADDED requirement + 第四次 MODIFIED 页面 requirement）与 `/sdd:proposal-split`
