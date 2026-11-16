# G1 补充记录 — 登录页展示演示账号

- Change：`us-066-log-in`（REQ-008 / US-066）
- Gate：G1（原记录 Pass，2026-11-16）
- 变更时间：2026-11-16
- 指令来源：用户要求“登录要显示演示账号，方便后续演示登录”

## 变更内容

- 登录页新增“演示账号（仅演示）”区块：列出 Alice/Ben/Chloe/Daniel/Eve 的
  邮箱与统一密码 `gogo-demo-2026`，点击账号自动填入表单；仍由用户显式提交登录。
- 明确标注“仅演示环境，不是生产账号目录”。
- Delta Spec `specs/auth/spec.md` 新增场景：
  “Demo accounts are offered on the login page”。

## 安全与契约影响

- 登录失败仍统一 401 `INVALID_CREDENTIALS`，不因账号展示而改变；
- 凭据仍是 `V6` 中的 BCrypt 哈希，明文只存在于演示夹具/登录页提示；
- 这是演示可用性变更，不改变 session/CSRF/身份迁移契约；
- 生产部署应移除该区块（部署/安全事项，不在本 change 的 AC 内）。

## Gate 状态

- G1 仍为 **Pass**；本次为用户明确指令下的演示 UI 补充，不重开 Gate。
- G2 仍为人工门。
