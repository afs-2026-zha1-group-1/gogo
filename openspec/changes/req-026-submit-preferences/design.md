# Design — req-026-submit-preferences（US-026 提交就绪 + 无偏好）

- Change: `openspec/changes/req-026-submit-preferences/`
- Capability: `preferences`
- Stage: P3（设计）/ P4（实现已先行）。按**已实现代码**回写。
- 关联：REQ-019（兴趣，归档）、REQ-020（必做项）、REQ-024（预算）。就绪判断复用 `trip_member.ready` 语义但以 `submission` 行为准。

## 1. 目标 / 非目标

- 目标：成员显式「提交并标记就绪」；可选「没有特别偏好」；读取就绪名单与就绪投影。
- 非目标（本轮简化）：`effective.defaults`（交通/节奏默认值）未实现；「无偏好」当前仅禁用预算输入，未逐项禁用兴趣/必做项控件；主计划生成接入不在本变更。

## 2. 数据模型

| 存储 | 形状 | 说明 |
|---|---|---|
| `member_preference(kind='submission')` | `{"status":"ready","noPreference":bool,"submittedAt":"<ISO-8601 +08:00>"}` | 复用 V7 表；pending = 无行；零新迁移 |

## 3. 接口

| 方法 路径 | 请求 | 响应 |
|---|---|---|
| PUT `/api/trips/{id}/preferences/submission` | `{"noPreference":bool}` | `{"status":"ready","noPreference",bool,"submittedAt"}` |
| GET `/api/trips/{id}/preferences/readiness` | — | `{"members":[{"userId","status":"ready"\|"pending","noPreference"}],"readyCount","memberCount","allReady"}` |
| GET `/api/trips/{id}/preferences/effective` | — | `{"members":[{"userId","noPreference","interests":[...]}]}`（仅就绪成员） |

身份复用 `caller()` 门禁（401/403/404）。

## 4. Decisions

| # | 决策 | 理由 |
|---|---|---|
| SD1 | 就绪是独立 `kind='submission'` 行，由显式动作写入 | 保存 ≠ 提交（“沉默不等于同意”） |
| SD2 | 空提交（`noPreference=false` 且兴趣/必做/预算均无内容）返回 `400 PREFERENCE_EMPTY` | “沉默不等于同意” |
| SD3 | `noPreference=true` 无需内容即可就绪 | 用户显式选择不参与 |
| SD4 | `submittedAt` 服务端生成（`Asia/Singapore`），调用方不可设 | 防伪造 |
| SD5 | `noPreference` 在 UI 上禁用相关控件而非隐藏 | 隐藏不阻止已存值参与 |
| SD6 | `effective` 只含就绪成员；`noPreference` 成员 interests 置空 | 生成侧投影 |
| SD7 | 重复提交覆盖同一行（幂等） | 一行一成员 |

## 5. 错误码

- `PREFERENCE_EMPTY`(400)：空提交。
- 复用 `USER_REQUIRED`(401)/`NOT_A_MEMBER`(403)/`TRIP_NOT_FOUND`(404)。

## 6. 前端

- 行程偏好页新增「提交（US-026）」分区：就绪状态文案、就绪进度 `readyCount/memberCount`、「我没有特别偏好」勾选、「提交并标记就绪」按钮（就绪后可“重新提交”）。无偏好勾选时禁用预算输入。

## 7. 简化与偏差

- `effective` 未带 `defaults`（proposal 提及）——后续跟进。
- **无偏好逐项禁用（已实现，2026-11-17 核对）**：切到「无偏好」时，兴趣 chips 与预算金额/币种/限额控件均 `disabled={busy || noPreference}` 并被清空（`PreferencesPage.tsx` L502 / L730 / L746 / L763 / L772；清空逻辑 `toggleNoPreference`）。**必做项**控件（增/改/删）为逐动作即时持久化，**不随无偏好禁用**——如产品要求也禁用，再补。
- 页面已重构为**统一提交**：顶部「我没有特别偏好」开关 + 底部单个「提交并标记就绪」按钮，一次点击依次写 interest、budget 再写 submission；原先“各分区独立保存/清除”的页面描述已被取代，delta 中“submit 独立于保存”的措辞需在复核时更新。

## 8. 实现文件

- 后端：`com.gogo.preference` 下 `SubmissionSaveRequest`/`SubmissionResponse`/`SubmissionMember`/`ReadinessResponse`/`EffectiveMember`/`EffectiveResponse`/`SubmissionService`、`PreferenceController`（+submission/readiness/effective 端点）。
- 前端：`types/preferences.ts`（Readiness/Submission 类型）、`api/preferences.ts`（`submitPreferences`/`fetchReadiness`）、`PreferencesPage.tsx`（提交分区）。
