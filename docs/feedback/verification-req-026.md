# Verification — req-026-submit-preferences（P4 证据，按已实现代码）

## 1. 静态 / 构建

- 后端 `mvn -B test`：BUILD SUCCESS，336/336（上下文加载含新控制器）。
- 前端 `npm run typecheck` 干净；`npm run build` 成功。

## 2. 运行期冒烟（隔离端口 8082 + 临时 SQLite）

`csrf → login(alice) →`：

- `PUT /api/trips/1/preferences/submission {"noPreference":false}`（alice 已有兴趣）→ `{"status":"ready","noPreference":false,"submittedAt":"2026-11-17T...+08:00"}`
- `GET /api/trips/1/preferences/readiness` → `{"members":[{"userId":1,"status":"ready","noPreference":false},{"userId":2,"status":"pending",...},{3 pending},{4 pending}],"readyCount":1,"memberCount":4,"allReady":false}`
- `GET /api/trips/1/preferences/effective` → 仅 userId 1（就绪），其余省略

## 3. 覆盖说明

- 空提交拒绝（`PREFERENCE_EMPTY`）、无偏好就绪、幂等：见 `atdd-design.md` 与 `SubmissionService`；本冒烟已证 readiness/effective/submission 主路径。

## 4. 残余风险

- `effective.defaults` 未实现。
- 无偏好**已逐项禁用并清空兴趣与预算**控件（`disabled={busy || noPreference}`，`PreferencesPage.tsx` L502/L730/L746/L763/L772）；必做项为逐动作持久化，不随无偏好禁用。
- G2/G3 未记录；`validate --strict` 待人工。
