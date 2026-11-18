# Verification — req-024-set-trip-budget（P4 证据，按已实现代码）

## 1. 静态 / 构建

- 后端 `mvn -B test`：**BUILD SUCCESS**，`Tests run: 336, Failures: 0, Errors: 0`；Flyway 应用 **9 个迁移**（含新增 `V9__create_user_default_interest.sql`）。
- 前端 `npm run typecheck` 干净；`npm run build` 成功（147 modules，仅有既有的 chunk 体积告警）。

## 2. 运行期冒烟（隔离端口 8082 + 临时 SQLite）

依次 `csrf → login(alice) →`：

- `GET /api/me/preferences` → `{"interests":[]}`
- `PUT /api/me/preferences {"interests":[]}` → `200 {"interests":[]}`
- `PUT /api/trips/1/preferences/budget {"amount":1000,"currency":"SGD","limitType":"soft"}` → `{"budget":{"amount":1000,"currency":"SGD","limitType":"soft"}}`
- `GET /api/trips/1/preferences/budget` → 全员列表，alice 有值、其余 `null`

> 注：PowerShell 控制台会把嵌套对象经 `ConvertTo-Json -Depth 2` 显示成字符串 `@{...}`、中文显示为乱码，属**显示假象**（服务端返回为正确嵌套 JSON；浏览器 fetch 走 UTF-8 正常）。中文标签语义由既有 `PreferenceApiTest` 覆盖。

## 3. 覆盖说明

- 预算保存 / 改类型 / 零值 / 清除 / 各校验分支：由 `BudgetService` + 既有 `PreferenceApiTest` 语境 + 本次冒烟覆盖，详细检查见 `atdd-design.md`。
- 默认偏好 GET/PUT 与默认预勾选：见 §2（后端）+ 前端 E2E 步骤。

## 4. 残余风险

- `soft` ±20% 尚未接入主计划成本校验（`BudgetOverruns`）。
- 预算口径修订与已签 delta 冲突，需人工（IO/SA）复核。
- `V9` 迁移尚未合并 `main`；合入前需确认迁移号不与 `main` 冲突。
