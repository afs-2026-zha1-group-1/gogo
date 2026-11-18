# US-040 ATDD 设计

- change：`us-040-split-grouping`（G1 Pass：SA Leo + IO Emily，2026-11-17）
- delta：`specs/splits/spec.md`（1 ADDED / 10 场景；3 MODIFIED / 31 场景；共 41 场景；Revision 后 38 → 39，合并 main 的 US-086 新增 3 条 Screen 11 场景 → 41）
- 输入：`dov-ac-review.md`、`requirement-workspace/requirements/US-040.md`、`deep-dive.md` §US-040、`impact-brief.md` §US-040
- 本文件只设计 **API** 与 **E2E** 两层；UT 留 apply 阶段

## 1. ATDD 层划分

| # | 场景（delta 标题） | 层 | 附加建议 | 依据 |
|---|---|---|---|---|
| A1 | 成员把自己切到另一组（A1） | **API** | Security(advisory) | 单端点 200 + `groups`/`draftVersion` |
| A2 | 同一成员往返切换（A2） | **API** | - | 单端点，两次调用 |
| A3 | 提交自己当前所在组（A3） | **API** | - | 单端点幂等；断言「响应恒返回最新 `draftVersion`」 |
| A4 | 改组保留已生成路线与边界（A4） | **API** | Consistency(advisory) | 单端点 + 库内 `plan_node` 行数与文档字段比对 |
| A5-N | 已确认或已取消草稿不可改组（A5-N） | **API** | Security | 409 `SPLIT_DRAFT_NOT_ACTIVE` |
| A6-N | 版本过期拒绝（A6-N） | **API** | - | 409 `STALE_DRAFT_VERSION` |
| A7-N | 守卫顺序（A7-N） | **API** | Security | 401 / 404 / 403 三连 |
| A8-N | 非法组别拒绝（A8-N） | **API** | - | 400 `INVALID_GROUP_LABEL`（P3 定稿，见 DD3） |
| A9 | 任意成员可移动其他成员（A9） | **API** | Security | 任何成员可移动任意行程成员（BQ-10） |
| A9b-N | 目标成员不属于本行程拒绝（A9b-N） | **API** | Security | 403 `NOT_A_MEMBER` |
| S1 | 成员发起唯一草稿（S1） | **API** | - | 回归 + 201 |
| S9 | 初始分组为全员 A 组（S9） | **API** | - | `groups.A` = 4 人、`groups.B` = `[]` |
| S10-N | 成员不足两人拒绝发起（S10-N） | **API** | - | 409 `SPLIT_MEMBERS_INSUFFICIENT`（IO-1） |
| S2 | 并发发起至多一个活跃草稿（S2） | **API** | Consistency | 409 `SPLIT_DRAFT_CONFLICT` |
| S3-N–S7 | 主线未确认 / 非成员 / 身份 / 未知行程 / 重复发起 | **API** | Security | 既有场景回归，不受本变更影响 |
| S8 | 取消后同一行重建（S8） | **API** | - | 重建后 `groups` 亦为全员 A |
| V2 | V2 迁移与自包含种子 | **API** | - | 迁移回归（`SplitSchemaMigrationTest`），本变更零迁移 |
| G1 | 成对生成（G1） | **API** | - | 200 + 两条路线 + 版本递增 |
| G2-N | 半对失败整对回滚（G2-N） | **API** | - | 既有 provider 抛错夹具 |
| G3-N | 过期结果拒绝（G3-N） | **API** | Consistency | 409 `STALE_DRAFT_VERSION` |
| G4-N | 无边界拒绝（G4-N） | **API** | - | 409 `SPLIT_BOUNDARIES_REQUIRED` |
| G5-N | 非发起人拒绝（G5-N） | **API** | Security | 403 `NOT_SPLIT_INITIATOR` |
| G6-N | 分组不完整时拒绝生成（G6-N） | **API** | - | 409 `SPLIT_DRAFT_INCOMPLETE` + `details.missing` |
| CF1 | 组织者确认成功并锁定（CF1） | **API** | - | 200 + `confirmed` |
| CF2-N / CF3-N | 超窗 / 缺输入 | **API** | - | 既有夹具回归 |
| CF7-N | 草稿不完整无确认（CF7-N） | **API** | - | `details.missing` 既有项 |
| CF8-N | 分组不完整无确认（CF8-N） | **API** | - | 新增：`groups.B` / `groups.unassigned` / `groups.duplicate` |
| CF4-N–CF6-N | 过期版本 / 非组织者 / 无活跃草稿 | **API** | Security | 既有回归 |
| Screen 11 | 发起屏幕展示契约 | **E2E** | - | 新错误态：成员不足两人 |
| Screen 13 | 分组路线屏幕展示契约 | **E2E** | - | 分组卡头像 chip + 点击切组 + 空组标注 + 陈旧路线提示 |
| Screen 15 | 确认屏幕展示契约 | **E2E** | - | 成员名 + 陈旧路线提示 |

**Deferred to `/sdd:atdd-apply`（unit-level TDD）**

- `SplitDraftDocument.initialGroups(orderedMemberIds)`：全员 A、B 空、两键恒存在。
- `SplitDraftDocument.withAssignment(label, memberId, now)`：移出原组 + 加入目标组 + `draftVersion + 1` + 保留 boundaries/routes。
- `SplitDraftService.groupProblems(draft, memberIds)`：空组 / 漏组 / 重复组的判定与 `details.missing` 顺序。
- 同组提交幂等分支（不写库、版本不变）。

## 2. 生产代码之前先写什么

| 顺序 | 先写的验收代码 | 期望（红） |
|---|---|---|
| 1 | `SplitAssignmentApiTest`（A1–A9、A9b-N，Revision 后共 11 例） | 端点 404/405 → 全部失败 |
| 2 | `SplitDraftStartApiTest` 增 S9/S10-N | S9 期望 A=4/B=0（现均分 2/2 失败）；S10-N 期望 409（现 201） |
| 3 | `SplitRouteGenerationApiTest` 增 G6-N | 期望 409 `SPLIT_DRAFT_INCOMPLETE`（现仅夹具前置，无此分支） |
| 4 | `SplitConfirmApiTest` 增 CF8-N | 期望 409 + `groups.*`（现 `missingDraftParts` 不含分组） |
| 5 | `SplitDraftDetailApiTest` 断言改为改组后 A=3/B=1 | 现值 2/2 → 红 |
| 6 | `docs/feedback/e2e-us-040.md` 台账（先登记待执行） | P4 执行后填 Pass/Partial/N/A |

## 3. Local vs CI gate

| Gate | 命令 | 时点 | 证据 |
|---|---|---|---|
| Backend | `cd backend && mvn -B test` | 每任务后；CI `Backend tests` | 测试输出 / CI run |
| Frontend | `cd frontend && npm run typecheck && npm run build` | 每次前端改动 | 构建输出 |
| Spec | `openspec validate us-040-split-grouping --strict` | P3/P4 改动后 | exit 0 |
| E2E | `docs/feedback/e2e-us-040.md` 手工台账（无 Playwright） | P4 | 逐行 Pass/Partial/N/A + 截图 |
| PR | 分支 + PR，不直推 `main` | P4 起手 | `.githooks/pre-push` / AGENTS.md |

## 4. Fixtures 策略

- 位置：`requirement-workspace/acceptance-test-fixtures.md` 新增 §US-040（P3 本次补齐）。
- 复用：§Users / §Sample trip 的四成员（Alice/Ben/Chloe/Daniel）与 City Hall MRT → Merlion Park 边界、A=15+60+20+10 / B=20+60+20+10。
- 新增构造：
  - 初始分组：`{"A":[1,2,3,4],"B":[]}`；
  - 改组版本序列：v1 发起 → v2 Chloe 到 B → v3 Chloe 回 A → v4 生成（或按用例裁剪）；
  - 空组（B 空）、漏组（从 A 移除 Daniel 且不加 B）、重复组（Daniel 同时出现在 A、B）三种「构造数据」写法：直接 UPDATE `split_draft.document`；
  - 单成员行程：新建一个仅有 organizer 的 trip（插入 `trip` + 单行 `trip_member`），主线确认后发起 → 409。
- 清理：沿用 `AbstractSplitApiTest.resetToSeed()`（删 `split_draft`、删 `split-a/b` 节点、置 `main_plan_confirmed=1`）；新增 helper `assignAs(displayName, label, version)` 与 `updateGroups(...)`。
- E2E 数据：浏览器会话登录现有种子账号（Alice 组织者），不使用演示身份选择。

## 5. Non-goals 与反向验证

| Non-goal | 反向用例 | 层 |
|---|---|---|
| 不新增表 / 迁移 | `SplitSchemaMigrationTest` 回归：`split_draft` 列集不变；本变更无新 migration 文件 | API |
| 不改 `SecurityConfig` | A7-N 无会话仍 401 `MEMBER_REQUIRED`（splits 走 `permitAll` + `MemberGuard` 例外）；`git diff` 不含 `SecurityConfig.java` | API + 人工 |
| 不改 `routes:check-timing` | 既有 T1/T2-N/T4-N/T5-N 回归全绿 | API |
| 不新增分组相关路由/页面 | E2E：直接访问 `#/trips/{id}/split/groups` 不渲染分组屏（无该路由） | E2E |
| 不改邀请 / 主线语义 | 邀请加入、主线生成确认用例回归全绿 | API |
| 不允许替他人改组 | A9-N：请求体夹带 `memberId` 仍只动本人 | API |
| 不为单人行程放宽分组完整性 | 单人行程已有 active 草稿（构造）→ 生成/确认仍 409 `SPLIT_DRAFT_INCOMPLETE`（DD5） | API |

## 6. NFR tests（可选）

**deferred / out of scope**：本期 AC 未提出性能、可观测性或容量指标；分组规模为行程成员数（个位数），单次改组为一次 JSON CAS 写。若需补压测或埋点用例，另行提出（不纳入本 change）。
