# Change summary — req-026-submit-preferences（US-026 提交就绪 + 无偏好）

## 交付

- 提交就绪：`PUT /api/trips/{id}/preferences/submission`（`noPreference`，`submittedAt` 服务端生成，空提交 `400 PREFERENCE_EMPTY`）。
- 就绪读取：`GET .../readiness`（全员 + `readyCount/memberCount/allReady`）。
- 就绪投影：`GET .../effective`（仅就绪成员；无偏好不贡献 personal）。
- 前端：偏好页「提交（US-026）」分区（无偏好开关、提交并标记就绪、就绪进度）。

## 验证

`mvn -B test` 336/336；前端 build 绿；8082 冒烟：submission/readiness/effective 主路径通过（见 `verification-req-026.md`）。

## 关键决策

- 就绪为独立 `kind='submission'` 行（保存≠提交）、空提交拒绝、`noPreference` **逐项禁用并清空兴趣与预算控件**（`disabled={busy || noPreference}`）；页面重构为**统一提交**（顶部无偏好开关 + 底部单按钮一次写 interest/budget/submission）；`effective` 仅就绪成员。

## 未闭合 / 跟进

- `effective.defaults`（交通/节奏）未实现；无偏好逐项禁用（兴趣+预算）已实现；必做项不随无偏好禁用（待产品确认）。
- G1/G2/G3 未记录；`openspec validate --strict` 待人工运行。

## Links

`proposal.md` · `specs/preferences/spec.md` · `dov-ac-review.md` · `design.md` · `atdd-design.md` · `tasks.md` · `docs/feedback/verification-req-026.md`
