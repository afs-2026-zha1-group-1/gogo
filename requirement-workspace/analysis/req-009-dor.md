# DoR light self-check — REQ-009（US-068 + US-069 + US-070）

- Date: 2026-11-16
- Entry: `requirement-workspace/requirements/REQ-009.md`
- Deep-dive in scope: yes（`requirement-workspace/deep-dive.md` §REQ-009），
  因此 ⑨–⑫ 适用
- 性质：条目自检，不是 Gate；此处不记录 Pass/Fail 门裁决。

## Findings

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-009 §Intent | 账号生命周期三件事：My Account/改名、退出、注册；各自边界与不变项明确 |
| ② | Actors defined | — | Pass | REQ-009 §Actors | 已登录持有人、未登录旅行者、邀请访客、其他账号（负向）、角色徽标读取方 |
| ③ | Scope bounded | — | Pass | REQ-009 §In/Out scope | Out 明确排除邮箱验证、改密/找回、SSO、账号删除、头像上传、US-067/061、限流 |
| ④ | Scenarios / AC concrete | — | Pass | REQ-009 §Scenarios | S1–S24 + R-1–R-8，均有可观察状态码/页面/数据结果 |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-009 ⑩ | 重复/并发注册、校验失败、服务失败、无会话改名、退出失败、邀请恢复等分支逐项枚举 |
| ⑥ | Results verifiable | — | Pass | REQ-009 §Scenarios + deep-dive ⑫ | 200/204/400/401/403/CSRF、数据库行数、渲染文案与首字母均可断言 |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | impact brief §REQ-009；REQ-009 §Affected capabilities | 依赖 REQ-008 的 `auth`/`SecurityConfig`/V6；`auth` ADDED 三类；`app-shell` MODIFIED；无新迁移 |
| ⑧ | Open-questions gate | — | Pass | REQ-009 §Open questions | Blocking not-resolved = 0；OQ-1–OQ-4 已 resolved；OQ-5–OQ-12/OQ-14 resolved；OQ-13 deferred（非阻塞） |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-009 ⑨ | 账号/凭据粒度、注册请求与统一响应、改名投影、退出语义、并发与归一化规则明确；无 `{TBD}` |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-009 ⑩ | 15 行覆盖成功/重复/并发/校验/失败/未登录/他人账号/邀请恢复/退出失败；明确 out 项 |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-009 ⑪ | 与 US-066 auth、US-064 app-shell、行程域只读名称、V6 唯一索引、绑定计划偏差逐项对齐 |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-009 ⑫ | 登录/注册/My Account/仪表盘问候/全名称面/首字母/错误反馈的触发、接收者、字段、通道 |

## A0 deep-dive gate

⑨ Pass、⑩ Pass、⑪ Pass、⑫ Pass → **A0 Pass**。允许拆分；单 change
`us-068-070-account-register` 已由用户 2026-11-16 裁决。

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | resolved | REQ-009 OQ-2 | US-068（issue #40）当前指派队友 `DENGLU-OOCL`，本 change 却实现其页面 | 用户裁决并入本 change；P4 前完成卡片交接/协作确认。Owner IO/团队 |
| WARNING | resolved | REQ-009 OQ-3 | 注册凭据策略未在 issue 中定值 | 宽松策略（邮箱基础格式、密码 6–72、显示名 1–30），用户 2026-11-16。Owner SA |
| WARNING | resolved | REQ-009 OQ-4 | 重复邮箱如何反馈 | 用户 2026-11-17 覆盖原隐私 AC：重复返回 `409 EMAIL_TAKEN`，注册页弹窗提示“该邮箱已注册”；接受邮箱枚举风险。Owner IO/SA |
| WARNING | resolved | deep-dive ⑨ | BCrypt 只取前 72 字节，长密码可能被截断 | 密码上限按 72 字节校验；P2 夹具覆盖 72/73 字节边界。Owner Dev |
| WARNING | resolved | deep-dive ⑨ | 并发注册可能产生竞态重复 | 单事务 + `uk_account_credential_email` 唯一索引；冲突映射为统一成功。Owner Dev |
| WARNING | resolved | REQ-009 §Constraints | `AuthErrorAdvice` 把所有不可读 JSON 映射为 401 `INVALID_CREDENTIALS`（登录语义） | 注册/改名路径的不可读请求体应为 400 校验错误；P3 调整 advice 作用域或新增处理。Owner Dev |
| SUGGESTION | resolved | REQ-009 OQ-9 | 现有右上角 `AccountBar` 在 app-shell、main-plan、split 三处渲染 | 统一移除，身份只在 My Account 与仪表盘问候展示；split 页已有"已登录 · 姓名"条需一并核对。Owner Dev |
| SUGGESTION | resolved | REQ-009 S2 | issue 提到"scan 控件保持可用"，但当前前端尚无扫码控件（US-067 未实现） | 本 change 只保留既有控件（信息 i 等），不新增扫码；US-067 负责扫码入口。Owner IO/Dev |
| SUGGESTION | resolved | REQ-009 OQ-14 | 头像组件/首字母工具当前不存在 | 若页面已有头像占位则按首字母派生；无头像处不新造组件。Owner Dev |
| SUGGESTION | deferred | REQ-009 OQ-13 | 注册/登录无限流与锁定 | 部署关注点；按 `security-baseline` 文档化例外，owner Dev/SA。 |

无 deferred 的 BLOCKER。Blocking open questions not `resolved`: **0**。

## Exit gate

- BLOCKER 数：**0**
- Blocking open questions not `resolved`：**0**
- WARNING/SUGGESTION 均有 owner；不阻塞 proposal。
- Advisory round：2026-11-16 完成——OQ-3/OQ-4 直接由用户裁决或 US-070 AC
  推导解决，其余为可执行默认；单 change 与三卡范围已确认。可进入 proposal。
