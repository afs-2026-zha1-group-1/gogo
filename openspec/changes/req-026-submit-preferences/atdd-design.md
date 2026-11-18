# ATDD design — req-026-submit-preferences

- Change: `openspec/changes/req-026-submit-preferences/`（REQ-026 US-026 + US-027 合并）
- Capability: `preferences`
- Stage: P3，按**已实现代码**回写。
- Layers: **API** + **E2E**；无 Playwright 层。

## 1. 验收层

- **API**：提交/就绪/投影三端点契约、空提交拒绝、幂等、聚合。
- **E2E**：偏好页「提交（US-026）」分区的开关、提交、就绪徽标/进度。

## 2. 检查项

| # | 场景 | 层 | 期望 |
|---|---|---|---|
| SUB-S1 | 有内容提交 `noPreference=false` | API | 200 `{status:ready,...}`；一行 `submission` |
| SUB-S2 | 无内容提交 `noPreference=true` | API | 200 ready，`noPreference:true` |
| SUB-V1 | 无内容提交 `noPreference=false` | API | 400 `PREFERENCE_EMPTY`，零写入 |
| SUB-S3 | 重复提交幂等 | API | 仍一行，最新覆盖 |
| RD-1 | pending vs ready | API | 仅保存偏好者仍 `pending` |
| RD-2 | 聚合 | API | `readyCount/memberCount/allReady` 正确 |
| EFF-1 | 无偏好成员不贡献 | API | interests 为空 |
| EFF-2 | 非就绪成员被省略 | API | 不出现在 effective |
| PAGE-S1 | 勾「无偏好」+ 提交 | E2E | 一次 PUT `{noPreference:true}`，显示已就绪 |
| PAGE-S2 | 空提交 | E2E | 显示 `PREFERENCE_EMPTY`，不显示就绪 |

## 3. 门禁

- 不签发 AC/DoV；G2 由人工判定。`effective.defaults` 与逐项禁用控件不在本层。
