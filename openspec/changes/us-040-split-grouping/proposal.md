# Proposal

## Why

分队草稿的「分组」目前完全由服务端在发起时按成员顺序前后均分（`partitionGroups`），成员无法选择与谁同行；前端 Screen 13 只显示「A 组 N 人 / B 组 N 人」，并把「分组移动本期不开放」写死在文案里。更关键的是，路线生成与确认都直接消费这份写死的分组，却没有任何分组完整性校验——只要分组不再自动生成，空组、漏分组、重复分组就会产生「无法按时会合却仍可确认」的方案。

US-040 合并了原 US-041（#85）与 US-076（#55）：成员要能把自己选进 A 组或 B 组、全员能看到每组有哪些人、组织者确认前系统必须拦住不完整的分组。

## What Changes

- 新增分组写入：`PUT /api/trips/{tripId}/split-draft/assignment`，body 仅 `{groupLabel, draftVersion}`；服务端按**会话身份**把调用者本人从原组移出并加入目标组，**不能替他人选择**；成功后 `draftVersion + 1`，**不改动**已保存边界与已生成路线。
- 草稿初始分组改为「A = 全部行程成员、B 为空」（取代 `partitionGroups` 前后均分）；取消后重建同样适用。
- `POST .../split-draft/routes:generate` 增加分组完整性前置：任一组为空、成员漏分组或重复分组 → `409 SPLIT_DRAFT_INCOMPLETE`（`error.details.missing` 含 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate`）；补齐后才按**当前**分组标签成对生成。
- `POST .../split-draft:confirm` 的完整性检查（`missingDraftParts`）合并同一份分组问题，与 `boundaries`、`routes.A/B` 同列返回。
- Screen 13「分组与路线」的分组卡从只读人数改为：A/B 两组列出成员名（复用 `GET /api/trips/{id}/members` 的 `displayName`）、人数、「我」标记、切组按钮；改组成功提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」；移除「分组移动本期不开放」文案。
- Screen 15 复核屏的 A/B 组从 `memberId` 原串改为成员名展示。
- Delta specs：`splits` +1 ADDED（Member group assignment），3 MODIFIED（Split draft start / Group route generation / Split confirmation）。
- 明确不改：`split_draft` / `plan_node` 表结构、Flyway 迁移（`groups` 已在 `document` JSON）、`SecurityConfig`、`routes:check-timing`、确认/取消的权限与状态机、分队发起与边界选择的既有场景（US-038/US-039 已交付，本变更只回归）。

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `splits`: **ADDED** "Member group assignment"（仅本人、`active`、版本条件、保留路线）；**MODIFIED** "Split draft start"（初始分组全员 A）、"Group route generation"（分组完整性前置取代夹具前置）、"Split confirmation"（完整性明细增加 `groups.*`）。

## Impact

| Area | Effect |
|---|---|
| Backend | `splits` 包新增 1 个 PUT 端点（controller + service + 请求 DTO）；`SplitDraftDocument` 增 `withAssignment`、初始分组改为全员 A；`generateRoutes` 与 `missingDraftParts` 共用新的分组完整性投影；复用 `findMemberIdsOrdered` |
| Frontend | `features/split/screen-routes.tsx`（分组卡改造，最大改动）、`screen-confirm.tsx`（成员名）、`api.ts` / `hooks.ts` / `types.ts` / `states.tsx`（`SPLIT_DRAFT_INCOMPLETE` 文案与 `groups.*` 映射）；无新路由、不改 stepbar |
| Database | 无变更（`groups` 已在 `split_draft.document` JSON，零迁移） |
| Dependencies | 无新增 |
| Auth | 无变更；`/api/**` 已 `authenticated()`，新 PUT 自动受保护 |
| Specs | `openspec/specs/splits/spec.md`：+1 requirement、3 MODIFIED（归档时合并） |
| Requirement source | `requirement-workspace/requirements/US-040.md`（DoR：`analysis/us-040-dor.md`，BLOCKER = 0；A0 deep-dive：`deep-dive.md` §US-040，⑨–⑫ 全 Pass） |
| Impact brief | `requirement-workspace/impact-brief.md` §US-040 |
| Story | GitHub issue #84（`Iteration 1`、`Priority - Must`、`Type - Split Planning`；并入 US-041 #85 / US-076 #55） |
| Effort | 中：后端 1 端点 + 1 域方法 + 两处门禁；前端 1 卡改造 + 1 屏文案；零迁移 |
| Supersedes | issue #84 AC 第 2 条的「分组变化使旧路线失效或要求重新生成」由用户裁决（2026-11-17 BQ-2）取代：**保留已生成路线**，仅 `draftVersion + 1`；重新生成时按当前分组标签重建。该取舍已写入 `requirements/US-040.md` S14/R10 与 `impact-brief.md` §US-040 R2 |
| Regression risk | 既有 splits 测试与夹具普遍假设 A/B 各 2 人；`SplitRouteGenerationApiTest` 还有 `groups:move` 不存在的负向断言。P3/P4 必须同步调整（见 impact §4） |
| Open design items | OQ-9 非法 `groupLabel` 的错误码、OQ-10 同组重复提交是否递增版本、OQ-11 头像首字母、OQ-12 空 B 组引导文案——均非阻塞，P3 定 |
