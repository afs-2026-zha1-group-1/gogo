# ATDD design — req-024-set-trip-budget

- Change: `openspec/changes/req-024-set-trip-budget/`（REQ-024 US-024 + 并入的 US-019 默认偏好）
- Capability: `preferences`
- Stage: P3，按**已实现代码**回写。
- Layers: **API**（MockMvc / 运行期冒烟）+ **E2E**（浏览器编号步骤）；本仓库无 Playwright 层。

## 1. 验收层

- **API**：预算保存/读取矩阵、默认偏好 GET/PUT、错误码分支、零写入。
- **E2E**：偏好页预算分区交互、`#/my-preferences` 默认偏好页、行程偏好页自动预勾选。

## 2. 检查项

| # | 场景 | 层 | 期望 |
|---|---|---|---|
| BUD-S1 | 保存硬上限 `1000 SGD` | API | 200 `{"budget":{"amount":1000,"currency":"SGD","limitType":"hard"}}`；库中一行 payload 含 `amount=1000` |
| BUD-S2 | 改限额类型 `hard→soft` 保留一行 | API | 200；`amount`/`currency` 不变、`limitType=soft` |
| BUD-S3 | 0 是有效值 | API | 200；读取 `amount=0` 且 `budget` 非 null |
| BUD-S4 | 清除 `{"amount":null}` | API | 200 `{"budget":null}`；行保留 payload `{}` |
| BUD-V1 | 负/小数/超范围金额 | API | 400 `BUDGET_AMOUNT_INVALID`，零写入 |
| BUD-V2 | 缺 currency 或 limitType | API | 400 `BUDGET_FIELDS_INCOMPLETE` |
| BUD-V3 | 非法币种 / 限额类型 | API | 400 `BUDGET_CURRENCY_NOT_ALLOWED` / `BUDGET_LIMIT_TYPE_INVALID` |
| BUD-V4 | 缺 `amount` 键 vs `amount:null` | API | 前者 400 `INVALID_REQUEST`，后者清除 |
| BUD-R1 | 读取全员、无预算者 null、按 userId 升序 | API | `members` 含全部成员 |
| DEF-1 | 保存默认兴趣并读回 | API | 200 `{"interests":[...]}` |
| DEF-V1 | 非法兴趣标签 | API | 400 `INTEREST_NOT_ALLOWED` |
| PAGE-B1 | 输入金额 + 选软上限 + 保存 | E2E | 一次 PUT；展示 ±20% 区间与当前值 |
| PAGE-B2 | 清除带确认 | E2E | 确认后一次 PUT `{amount:null}`，回到未设置 |
| PAGE-D1 | 我的 → 偏好设置 → 选默认兴趣保存 | E2E | 走 `/api/me/preferences` |
| PAGE-D2 | 新行程偏好页自动预勾选默认（未保存） | E2E | 兴趣为空时预勾选、徽标“未保存” |

## 3. 门禁

- 本设计不签发 AC/DoV；`dov-ac-review.md` 为既有 P2 产物，G2 由人工判定。`soft` ±20% 的主计划成本校验接入不在本层。
