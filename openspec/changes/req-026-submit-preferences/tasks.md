# Tasks — req-026-submit-preferences（按已实现代码回写，P3/P4 勾选）

## 1. 后端

- [x] 1.1 `SubmissionService`（保存就绪、`PREFERENCE_EMPTY` 空提交判定、`submittedAt` 服务端生成）
- [x] 1.2 `readiness` / `effective` 读模型
- [x] 1.3 `PreferenceController` 增 `PUT .../submission`、`GET .../readiness`、`GET .../effective`（复用 `caller()`）
- [x] 1.4 复用 `member_preference kind='submission'`，零新迁移

## 2. 前端

- [x] 2.1 `types/preferences.ts` + `api/preferences.ts` 增 `ReadinessResponse`/`SubmissionResponse`、`submitPreferences`/`fetchReadiness`
- [x] 2.2 `PreferencesPage` 「提交（US-026）」分区（无偏好开关、提交并标记就绪、就绪进度、错误提示）

## 3. 测试

- [x] 3.1 `mvn -B test` 336/336（上下文加载、端点注册）
- [x] 3.2 隔离 8082 冒烟：submission/readiness/effective

## 4. 验证

- [x] 4.1 前端 `typecheck` + `build` 绿
- [x] 4.2 证据落 `docs/feedback/verification-req-026.md`

## 5. 文档 / 收尾

- [x] 5.1 delta spec + dov + `design.md` / `atdd-design.md` / `tasks.md` / `change-summary.md`
- [ ] 5.2 G1/G2/G3 人工门禁（未签）
- [ ] 5.3 `openspec validate --strict`（待人工运行）
- [x] 5.4 noPreference 逐项禁用并清空兴趣 + 预算控件（已实现，见 `PreferencesPage.tsx` L502/L730/L746/L763/L772）
- [ ] 5.5 `effective.defaults`（后续跟进）；必做项是否随无偏好禁用（待产品确认）
