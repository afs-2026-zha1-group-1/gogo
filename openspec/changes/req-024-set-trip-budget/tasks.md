# Tasks — req-024-set-trip-budget（按已实现代码回写，P3/P4 勾选）

## 1. 后端

- [x] 1.1 `V9__create_user_default_interest.sql`（`user_default_interest`：user_id PK, payload, updated_at）
- [x] 1.2 `Budget`/`BudgetMember`/`BudgetMembersResponse`/`BudgetSaveResponse` + `BudgetService`（`JsonNode` 解析、校验、`amount:null` 清除、`{}` 保留行）
- [x] 1.3 `PreferenceController` 增 `GET/PUT /api/trips/{id}/preferences/budget`（复用 `caller()`）
- [x] 1.4 `UserDefaultInterestRepository`/`UserDefaultInterestService` + `UserPreferenceController`（`/api/me/preferences` GET/PUT）

## 2. 前端

- [x] 2.1 `types/preferences.ts` + `api/preferences.ts` 增预算/默认偏好类型与调用（`fetchBudgets`/`saveBudget`/`fetchUserInterests`/`saveUserInterests`）
- [x] 2.2 `PreferencesPage` 预算分区（金额/币种/硬软二选一/清除确认/±20% 区间）
- [x] 2.3 `UserPreferencesPage`（`#/my-preferences`）+ `AccountPage` 入口卡片
- [x] 2.4 行程偏好页 US-019 预勾选（仅未保存成员、不落库）

## 3. 测试

- [x] 3.1 `mvn -B test` 336/336（含 V9 迁移应用）
- [x] 3.2 隔离 8082 冒烟：预算 save/read、默认偏好 GET/PUT、清除

## 4. 验证

- [x] 4.1 前端 `typecheck` + `build` 绿
- [x] 4.2 证据落 `docs/feedback/verification-req-024.md`

## 5. 文档 / 收尾

- [x] 5.1 delta 修订说明 + `design.md` / `atdd-design.md` / `tasks.md` / `change-summary.md`
- [ ] 5.2 G1/G2/G3 人工门禁（未签；本变更不自批）
- [ ] 5.3 `openspec validate --strict`（待人工运行；不得伪造结论）
