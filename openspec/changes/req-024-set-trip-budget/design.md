# Design — req-024-set-trip-budget（US-024 预算 + US-019 默认偏好）

- Change: `openspec/changes/req-024-set-trip-budget/`
- Capability: `preferences`
- Stage: P3（设计）/ P4（实现已先行）。本文件按**已实现代码**回写，供 P5 归档与人工门禁评审。
- 关联：REQ-019（兴趣，已归档）、REQ-020（必做项，P4 完成）。本变更在同一偏好页上追加「预算」分区，并顺带承载 US-019「个人默认偏好 + 行程自动预勾选」。

## 1. 目标 / 非目标

- 目标：成员为自己设置**每人预算**（金额 + 币种 + 硬/软上限），可清除；并在「我的」里设置**个人默认兴趣**，在新行程偏好页自动预勾选（未保存）。
- 非目标：汇率换算、跨币种比较、把软上限的 ±20% 接入主计划成本校验（列为 P5 跟进）、按默认偏好自动写入 `member_preference`。

## 2. 数据模型

| 存储 | 形状 | 说明 |
|---|---|---|
| `member_preference(kind='budget')` | `{"amount":int,"currency":"SGD","limitType":"hard"/"soft"}`；清除写 `{}` | 复用 REQ-019 的 V7 表与 `UNIQUE(trip_id,user_id,kind)`，**零新迁移** |
| `user_default_interest`（**V9 新增**） | `(user_id PK, payload {"codes":[...]}, updated_at)` | US-019 个人默认兴趣；仅默认值，**不写入任何行程** |
| `trip_member.ready / preference_revision`（V5 已有） | — | 供 US-026 就绪判断复用，本变更不新增列 |

## 3. 接口

| 方法 路径 | 请求 | 响应 |
|---|---|---|
| GET `/api/trips/{id}/preferences/budget` | — | `{"members":[{"userId","budget":{amount,currency,limitType}\|null}]}`（按 userId 升序，含无预算成员） |
| PUT `/api/trips/{id}/preferences/budget` | `{amount:int,currency,limitType}`；清除 `{"amount":null}` | `{"budget":{...}\|null}` |
| GET `/api/me/preferences` | — | `{"interests":["摄影",...]}` |
| PUT `/api/me/preferences` | `{"interests":[label,...]}` | `{"interests":[...]}` |

身份：全部取登录会话（`AccountPrincipal`）；`/api/trips/**` 复用 REQ-019 的 `caller()` 门禁（401/403/404），`/api/me/**` 仅要求已登录。

## 4. Decisions

| # | 决策 | 取舍 / 理由 |
|---|---|---|
| BD1 | 预算金额按**主货币单位整数**（1000=1000），`0..2147483647` | 修订已签 REQ-024 delta 的“最小单位”口径（产品负责人 2026-11-17 裁定） |
| BD2 | `limitType=soft` = “尽量不超、可上下浮动约 20%”；`hard` = “绝对不超过” | 页面展示 ±20% 区间；**主计划成本校验接入为 P5 跟进** |
| BD3 | 清除用 `{"amount":null}`，保留 `{}` 行；`0` 是有效值 ≠ 未设置 | 与 delta“零 vs 未设置可区分”一致 |
| BD4 | 预算存 `member_preference kind='budget'`，零新迁移 | 复用 REQ-019/020 的 kind 参数化仓储 |
| BD5 | 币种枚举 `SGD/CNY/USD/EUR/JPY`，大小写精确 | 拒绝 `sgd`/`SGDX`/`XXX`/空 |
| BD6 | 个人默认兴趣独立表 `user_default_interest`，**预勾选不落库** | 产品负责人裁定“预勾选但不落库”；不改写成员的每行程已保存状态 |
| BD7 | 默认兴趣复用 `InterestCatalogue`（label↔code） | 与 REQ-019 校验/存储一致 |
| BD8 | HTTP body 以 `JsonNode` 读入，以区分“缺 amount 键”(INVALID_REQUEST) 与 `amount:null`(清除) | 契约要求 |

## 5. 错误码（沿用 `PreferenceApiException` → `PreferenceErrorAdvice`）

- `INVALID_REQUEST`：body 非对象 / 缺 `amount` 键 / 不可读 JSON
- `BUDGET_AMOUNT_INVALID`：负数、小数、超 int 范围、非数字
- `BUDGET_FIELDS_INCOMPLETE`：有金额但缺币种或限额类型；`amount:null` 却带币种/类型
- `BUDGET_CURRENCY_NOT_ALLOWED`、`BUDGET_LIMIT_TYPE_INVALID`
- `INTEREST_NOT_ALLOWED`（默认兴趣非法标签）；`USER_REQUIRED`(401)

## 6. 前端

- 行程偏好页新增「预算（US-024）」分区：金额输入（仅数字）、币种下拉、硬/软上限二选一；选软上限且已填金额时显示 ±20% 区间；「清除」带确认。
- 「我的」账户页新增「偏好设置」卡片 → `#/my-preferences`（仅兴趣 tag，与 US-019 页一致）→ 调用 `/api/me/preferences`。
- 行程偏好页在**该成员尚未保存兴趣**时，拉取 `/api/me/preferences` 并**预勾选（未保存）**。

## 7. 与已签契约的偏差

- 预算金额口径由“最小单位 + 不做算术”改为“主单位 + hard/soft（+±20% 语义）”。delta spec 顶部已加「修订说明」并在本 design 记录；需在 G2 / IO 复核时确认。

## 8. 风险与跟进

- `soft` ±20% 尚未接入 `BudgetOverruns` / 主计划成本校验（P5）。
- delta 修订需重新确认（原 G1 签署基于旧口径）。
- `user_default_interest` 为新增 V9 迁移，需确认与 `main` 上迁移号不冲突。

## 9. 实现文件

- 后端：`com.gogo.preference` 下 `Budget`/`BudgetMember`/`BudgetMembersResponse`/`BudgetSaveResponse`/`BudgetService`、`UserInterestSaveRequest`/`UserInterestsResponse`/`UserDefaultInterestRepository`/`UserDefaultInterestService`/`UserPreferenceController`、`PreferenceController`（+budget 端点）、`db/migration/V9__create_user_default_interest.sql`。
- 前端：`src/types/preferences.ts`、`src/api/preferences.ts`、`src/pages/PreferencesPage.tsx`、`src/pages/UserPreferencesPage.tsx`（新）、`src/App.tsx`、`src/types.ts`、`src/features/auth/AccountPage.tsx`。
