# Change summary — req-024-set-trip-budget（US-024 预算 + US-019 默认偏好）

## 交付

- **预算（US-024）**：`GET/PUT /api/trips/{id}/preferences/budget`，金额为主货币单位整数 + 五个币种 + `hard/soft` 上限；`{"amount":null}` 清除且保留 `{}` 行；存 `member_preference kind='budget'`（零新迁移）。
- **个人默认偏好（US-019，并入本页）**：`GET/PUT /api/me/preferences` + `V9 user_default_interest`；行程偏好页对**尚未保存兴趣**的成员自动预勾选默认（不落库）。
- **前端**：偏好页新增预算分区；新增 `#/my-preferences` 默认偏好页；`我的` 账户页新增入口卡片。

## 验证

`mvn -B test` 336/336（含 V9）；前端 `typecheck`+`build` 绿；隔离 8082 冒烟通过（详见 `docs/feedback/verification-req-024.md`）。

## 关键决策

主单位金额、`soft` ±20% 语义（修订已签 delta）、`kind='budget'` 零新迁移、默认偏好独立表且预勾选不落库。详见 `design.md` §4。

## 未闭合 / 跟进

- `soft` ±20% 接入主计划成本校验。
- 预算 delta 修订需 IO/SA 复核（原 G1 基于“最小单位/不做算术”口径）。
- G2 / G3 未记录；`openspec validate --strict` 待人工运行。
- `V9` 迁移合并前确认与 `main` 迁移号无冲突。

## Links

`proposal.md` · `specs/preferences/spec.md`（含顶部「修订说明」）· `dov-ac-review.md` · `design.md` · `atdd-design.md` · `tasks.md` · `docs/feedback/verification-req-024.md`
