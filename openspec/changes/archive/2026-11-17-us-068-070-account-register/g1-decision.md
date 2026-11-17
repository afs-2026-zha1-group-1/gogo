# G1 decision — us-068-070-account-register

- Gate: **G1（Align）**
- 记录日期: 2026-11-16
- 状态: **Pass**（IO = Emily、SA = Elian Jiang 具名签核）
- 性质: 人工签核驱动的 Gate 决策记录；不自动批准、不改 Delta Spec、不 merge Living Spec

## Input artifacts

- Delta Spec:
  - `openspec/changes/us-068-070-account-register/specs/auth/spec.md` — **3 ADDED + 3 MODIFIED / 6 requirement / 38 场景**
  - `openspec/changes/us-068-070-account-register/specs/app-shell/spec.md` — **4 MODIFIED / 4 requirement / 19 场景**
- 工具校验：`openspec validate us-068-070-account-register --strict` = **valid**（10 个 delta 块 / 57 场景）
- AC/DoV 评审：`dov-ac-review.md` — AC-1~4 / DoV-1~5 **全 Pass**，无 blocking Fail/Partial
- 一致性 lint：`consistency-lint.md` — phase=p2，**Pass**（0 BLOCKER / 0 WARNING / 6 SUGGESTION）
- Proposal：`proposal.md`（含 `## Non-Goals`、Impact self/upstream/downstream、auth 3 ADDED + 3 MODIFIED、app-shell 4 MODIFIED）
- 需求侧权威：`requirement-workspace/requirements/REQ-009.md`（OQ-1–OQ-14；blocking 全 resolved、OQ-13 deferred）、`analysis/req-009-dor.md`（BLOCKER = 0、A0 Pass）、`deep-dive.md` §REQ-009（⑨–⑫ Pass）、`acceptance-test-fixtures.md` §REQ-009、`impact-brief.md` §46–53
- P1 阶段 DoV：`docs/ai4se-plugins/20261116-173218-quality-checklist-report.md` — p1 **Pass**
- P2 阶段 DoV：`docs/ai4se-plugins/20261116-174029-quality-checklist-report.md` — p2 **Pass**
- 上游基线：REQ-008（已归档 `auth` / `app-shell` 契约）、`V6__create_account_credential.sql`、既有名称展示面
- 看板：issue #40（US-068）、#41（US-069）、#43（US-070），均 `Req Analysis`

## Check conclusions（findings）

- **Scope（范围）**：auth 的 3 ADDED（注册 / 资料与改名 / 退出）对应 US-070 / US-068 / US-069；3 MODIFIED auth 仅移除“本变更不提供注册/退出”的历史措辞并把注册端点加入公开面，不改变登录/会话/CSRF/错误体行为；app-shell 的 4 MODIFIED（Mobile shell frame / Bottom dock navigation / Dashboard tab placement / Guest join exclusion）对应五 tab、身份条移除、账号名问候与注册页全屏。与 proposal 一一对应，无静默扩张。
- **Ambiguity（歧义）**：
  - OQ-1（打包）→ resolved：单 change 覆盖 US-068/069/070（用户 2026-11-16）。
  - OQ-2（US-068 归属/依赖）→ resolved：并入本 change；issue #40 当前指派 `DENGLU-OOCL`，P4 前交接（非阻塞）。
  - OQ-3（凭据策略）→ resolved：邮箱 trim+小写+基础格式；密码 6–72 字节、无组合复杂度；显示名 trim 1–30（用户 2026-11-16）。
  - OQ-4（重复邮箱隐私）→ resolved：成功与重复返回完全相同的 `200 {"next":"login"}`；并发由唯一索引兜底。
  - OQ-5–OQ-12、OQ-14 → resolved；OQ-13（限流/锁定）→ deferred（部署例外，owner Dev/SA）。
  - blocking open questions 未解决数 = **0**；DoR BLOCKER = **0**。
- **Conflict（冲突）**：
  - Living `auth` 原写“Registration … SHALL NOT be exposed by this change”“Logout … belongs to US-069”；Living `app-shell` 原写四个 tab 与只读姓名。本 delta 以 MODIFIED 收敛为注册/资料/退出与五 tab，避免新旧口径并存。
  - 注册错误码扩展为 `INVALID_EMAIL` / `INVALID_NAME` / `INVALID_PASSWORD` / `INVALID_REQUEST`（400），本 G1 一并批准；仅 `code` 为契约，message 为实现文本。
  - 无新表、无新迁移；V6 唯一索引与 BCrypt 沿用；退出只失效会话，不改账号/成员/行程数据。
  - 既有 greeting / trips / invitations / main-itinerary / splits 行为与错误码不受影响；splits 的 `MEMBER_REQUIRED` 与 `{data,error}` 例外保留。

## Decision

**Pass**

理由：delta 与 proposal / REQ-009 / deep-dive / fixtures 对齐，57 个场景均可观察；`openspec validate --strict` 通过；AC/DoV 9 项全 Pass；consistency-lint 无 BLOCKER/WARNING；阻塞型歧义为 0。IO Emily 具名批准注册隐私契约与 4 个新校验码；SA Elian Jiang 具名批准能力边界、无迁移的数据契约与 app-shell 导航变更。无未批准的 blocking 歧义。

## Conditions + owners（remediation）

本 G1 为 **Pass**，无阻塞整改项。非阻塞承接事项：

| # | 承接项 | owner | 阶段 | 性质 |
|---|---|---|---|---|
| F1 | P3 design：注册两表同事务、并发冲突映射通用成功、BCrypt 72 字节校验、`SecurityConfig` 显式 logout、`AuthErrorAdvice` 作用域化 | SA / Dev | P3 | 非阻塞承接 |
| F2 | P4 前确认 issue #40（US-068）卡片交接（当前指派 `DENGLU-OOCL`） | IO / 团队 | P4 前 | 流程事项 |
| F3 | P4 浏览器回归：五 tab、身份条移除、账号名问候、注册/邀请恢复、改名全表面、退出后 401 | Dev | P4 | 非阻塞承接 |
| F4 | P5 归档：以 delta Purpose 覆盖 Living Purpose；`tech-stack-plan` 补注册/退出/改名 API 与 4 个错误码并收敛“无注册登录”偏差；旧场景标题卫生改名 | SA / Dev | P5 | 非阻塞承接 |

## Approvers

- **IO = Emily**：**已签核**（2026-11-16，Pass；批准注册隐私响应、不自动登录、邀请恢复与 4 个新校验码）
- **SA = Elian Jiang**：**已签核**（2026-11-16，Pass；批准能力边界、无迁移数据契约、五 tab/身份条/问候/Auth 历史措辞收敛）

## Timestamp

2026-11-16T17:40+0800（Asia/Shanghai）

## Next

- `/sdd:p3`（design / tasks）。P4 前完成 F2 卡片交接；F1/F3/F4 按阶段承接。

## P4 amendment (2026-11-17)

用户提供注册页与 My Account 两张 UI 参考稿并在 P4 中要求按稿实现。注册页：品牌
头部、返回按钮、名字/邮箱/密码/确认密码字段、密码提示“至少 8 个字符”、主按钮
“创建账号”、次按钮“已有账号？去登录”。My Account：返回 + “我的”、头像首字母 +
名字 + 邮箱、名字输入、“保存名字”主按钮、红色描边“退出登录”、五列底部 dock。
处置：

- 前端注册页与 My Account 按参考稿重新实现，注册页前端要求密码 ≥8 字符、确认密码一致；
- 服务端密码契约保持 6–72 字节不变（原 G1 批准内容不变）；
- 用户明确要求重复邮箱在注册时直接弹窗提示：服务端改为 `409 EMAIL_TAKEN`，注册页新增成功/重复两种弹窗；该指令覆盖原“不披露邮箱是否已注册”的 AC，接受邮箱枚举风险，IO 复核待补（原隐私条款由 IO Emily 批准）；
- delta 的注册与资料 requirement 补 UI 场景（含中性提醒），并重新通过 `openspec validate --strict`；
- 本 amendment 不改变错误码、隐私响应或数据契约，不构成新的 Gate 决策；原 G1
  具名签核记录保留。
