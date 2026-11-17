# AC / DoV 复核 — US-068-070 delta spec

- 日期：2026-11-16
- 范围：
  - `openspec/changes/us-068-070-account-register/specs/auth/spec.md` — 3 ADDED + 3 MODIFIED / 6 requirement / **38** scenario
  - `openspec/changes/us-068-070-account-register/specs/app-shell/spec.md` — 4 MODIFIED / 4 requirement / **19** scenario
- 方法：`/sdd:delta-craft` step=all（生成 + 复核）；`openspec validate us-068-070-account-register --strict` = **valid**
- 性质：复核表，非 Gate；不写 G1 结论

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 requirement 至少一条可测 AC | Pass | auth 每条 ADDED 8–9 场景、每条 MODIFIED 4–6 场景；app-shell 每条 4–6 场景 | 共 57 个场景，全部挂在 10 个 requirement 块下 |
| AC-2 AC 可观察（无模糊措辞） | Pass | 注册统一 `200 {"next":"login"}`、重复邮箱同响应、改名 200/400、退出 204 → `me` 401、CSRF 403、行数/哈希断言 | 无 "works well / correctly" 类措辞 |
| AC-3 高风险负向/边界已点名 | Pass | 重复/并发注册、非法邮箱/名/密码、事务失败、注册不自动登录、未登录改名、改他人账号、退出无会话/无 CSRF/失败、邀请恢复、注册页无 dock | 与 US-068/069/070 的负向 AC 一一对应 |
| AC-4 AC 未退化为实现细节 | Pass | 场景描述端点/状态码/响应体/数据行/展示结果等契约，不指定类或方法 | `app_user`/`account_credential`/BCrypt 仅作为数据契约出现 |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致（无静默扩张） | Pass | proposal：auth ADDED 3 + MODIFIED 3、app-shell MODIFIED 4 ↔ delta 的 3+3 / 4 | 3 条 auth MODIFIED 仅移除“本变更不提供注册/退出”的历史措辞，属 Living Spec 一致性收敛；proposal 已在本次复核中补齐说明 |
| DoV-2 歧义已列出或解决 | Pass | REQ-009 OQ-1–OQ-14：blocking 全 resolved；OQ-13（限流/锁定）deferred 非阻塞 | 注册隐私响应、凭据策略、退出语义、无迁移、US-068 并入均已写成契约 |
| DoV-3 角色关切已记录（IO/SA） | Pass | 见下方「残留关切」 | IO：隐私/不自动登录/邀请恢复/My Account；SA：无迁移、事务与并发、会话失效、导航契约；Dev：错误映射与缓存 |
| DoV-4 未声称实现完成 | Pass | 本文件与 delta 均未声称代码完成；`openspec list` 显示本 change 无 tasks | 代码与测试属 P4 |
| DoV-5 delta 可追溯到 proposal / requirements | Pass | registration → REQ-009 §In scope/ADDED；profile/name → S4–S11；logout → S12–S16；app-shell 五 tab/问候/全屏 → S1–S2、S17、S22；MODIFIED auth 措辞 → proposal §MODIFIED auth | 每条 requirement 均可映射到 REQ-009 场景或 proposal 变更点 |

## 残留关切（非阻塞，交 G1 复核）

| 角色 | 关切 | delta 位置 | 处置建议 |
|---|---|---|---|
| IO | 注册成功与重复邮箱必须**完全不可区分**（状态/响应体），且不得自动登录或泄露邮箱存在 | ADDED Account registration（重复/并发场景） | G1 批准该隐私契约；P4 断言响应逐字节一致 |
| IO | 新增 4 个 400 校验码：`INVALID_EMAIL` / `INVALID_NAME` / `INVALID_PASSWORD` / `INVALID_REQUEST` | ADDED Account registration / Account profile and display name；proposal §APIs | G1 明确批准错误枚举扩展（仅 `code` 为契约，message 非契约） |
| IO | 注册期间持有邀请仍要恢复 preview、不得自动 join | ADDED Account registration「A pending invitation survives registration」、app-shell「Registration during an invitation resumes the preview after login」 | P4 浏览器走查邀请恢复 |
| IO | `Create account` 入口与注册页全屏；仪表盘问候不追加"组织者"；扫码控件归 US-067 | app-shell Dashboard tab placement、Guest join exclusion；ADDED Account registration | G1 确认"scan remains available"按"不破坏既有控件"执行 |
| SA | 无新迁移：注册两表同事务、并发由 V6 唯一索引兜底；BCrypt 72 字节上限 | ADDED Account registration；REQ-009 §Constraints | P3 design 明确事务边界与冲突映射 |
| SA | 退出必须真正失效服务端会话；`SecurityConfig` 当前禁用 logout，需显式端点而非默认表单 logout | ADDED Logout and session invalidation；MODIFIED Protected surfaces | P3 design 明确 filter chain 与 401/403 行为 |
| SA | 五 tab 与身份条移除改变 app-shell 既有契约 | MODIFIED 4 条 app-shell requirement | G1 确认导航变更；P4 浏览器回归三处身份条 |
| Dev | `AuthErrorAdvice` 把不可读 JSON 统一映射 401 `INVALID_CREDENTIALS`，注册/改名应 400 | proposal §Known deviations；impact R54 | P3 调整 advice 作用域 |
| Dev | issue #40（US-068）仍指派 `DENGLU-OOCL`，卡片交接未完成 | proposal §Stories；REQ-009 OQ-2 | P4 前由用户/团队确认交接 |

## P4 UI amendment（2026-11-17）

用户提供注册页与 My Account 两张 UI 参考稿后追加（不改变 API 契约）：注册页需
包含品牌头部、返回按钮、名字/邮箱/密码/确认密码字段与“已有账号？去登录”；前端
密码至少 8 个字符并校验确认密码一致，服务端仍接受 6–72 字节。My Account 需包含
返回 + “我的”、头像首字母 + 名字 + 邮箱、名字输入、“保存名字”主按钮与红色描边
“退出登录”，底部 dock 五列；用户 2026-11-17 进一步要求重复邮箱在注册时直接弹窗
提示（服务端 `409 EMAIL_TAKEN`，覆盖原“不披露”隐私 AC，接受邮箱枚举风险；IO
复核待补）。delta 已补三条 UI 场景并重新校验；AC-1~4 / DoV-1~5 结论不变。

## 结论

- AC / DoV 9 项全部 **Pass**，无阻塞 Fail；delta 通过
  `openspec validate --strict`。
- 具备进入 `/sdd:g1-decision-record` 的条件（G1 由 IO/SA 具名签核，本复核不代签）。
