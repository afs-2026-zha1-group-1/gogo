# US-040 AC / DoV 复核（delta-craft）

- 复核人：sdd-delta-craft（P2 review），2026-11-17；IO Emily 复核补记 2026-11-17
- change：`us-040-split-grouping`
- delta：`specs/splits/spec.md`（1 ADDED / 10 场景；3 MODIFIED / 28 场景，其中新增 S9、S10-N、G6-N、CF8-N）
- 证据：`requirement-workspace/requirements/US-040.md`、`analysis/us-040-dor.md`、`deep-dive.md` §US-040、`impact-brief.md` §US-040
- 校验：`openspec validate us-040-split-grouping --strict` = **valid**

## 验收条件（AC）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| AC-1 | 每条 requirement 至少有 1 条可测 AC | **Pass** | ADDED「Member group assignment」10 场景；MODIFIED 三条各保留原场景并新增 S9 / S10-N / G6-N / CF8-N（共 38 条） | 新增能力与三条修改均有 WHEN/THEN |
| AC-2 | AC 可观察 | **Pass** | 200 + `groups` 键与元素、`draftVersion` 增量、409 + `error.code`、`error.details.missing` 字面项（`groups.A` 等）、`plan_node` 行数、页面成员名与提示文案 | 无「运行良好」式表述 |
| AC-3 | 负向 / 边界 | **Pass** | A5-N 终态、A6-N stale、A7-N 401/404/403 守卫顺序、A8-N 非法组别、A9-N 夹带他人、S10-N 成员数不足、G6-N 分组不完整生成、CF8-N 分组不完整确认、CF7-N 既有缺失项 | 每条主路径都有对应拒绝分支 |
| AC-4 | AC 不是伪装的实现细节 | **Pass** | 场景不含类名/函数名/库名；`groups`、`draftVersion`、`error.details.missing` 为 wire 契约；`withAssignment`、`groupProblems` 只出现在 proposal/impact 的实现说明中 | — |

## Definition of Verified（DoV）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| DoV-1 | 范围与 proposal 一致 | **Pass** | proposal「What Changes」= 1 新端点 + 初始分组 + 生成/确认门禁 + 两屏展示；delta 无新表、无迁移、无新依赖、不新增路由 | 无静默扩范围 |
| DoV-2 | 歧义已列或已解 | **Pass** | `requirements/US-040.md` OQ-1…OQ-8 与 OQ-13 全部 `resolved`（BQ-1…BQ-9）；OQ-9…OQ-12 `deferred` 且有 owner | blocking 未解 = 0 |
| DoV-3 | 角色关注已记录 | **Pass** | IO：AC 第 2 条「旧路线失效」被 BQ-2 取代（proposal `Supersedes`）、单人行程门禁（BQ-9）、US-049/050 E2E 基线取代、陈旧路线提示、空 B 组引导文案（OQ-12）；SA：初始分组改变既有测试假设、`groups` 存 `app_user.id`、`groups:move` 负向断言、splits `permitAll` 匹配器 | 见残留关注 |
| DoV-4 | 未声称实现完成 | **Pass** | 本复核只评审 delta 与契约 | 无代码改动 |
| DoV-5 | 需求可追溯到 proposal / 已批准需求 | **Pass** | S1–S17 / R1–R11 全部映射，见追溯表 | 无孤立场景 |

## 追溯表（需求 → delta 场景）

| 需求场景 | delta 覆盖 | 状态 |
|---|---|---|
| S1 发起后初始全员 A、B 空 | Split draft start「初始分组为全员 A 组（S9）」 | ✅ |
| S2 成员切到 A | Member group assignment「成员把自己切到另一组（A1）」 | ✅ |
| S3 切回 B | 「同一成员往返切换（A2）」 | ✅ |
| S4 提交当前组幂等 | 「提交自己当前所在组（A3）」（版本语义挂 OQ-10，P3 定稿；但响应恒返回最新版本） | ✅ |
| S5 全员可见成员名 | 「分组卡展示与切组契约（Screen 13）」+ Split draft detail read（不改契约） | ✅ |
| S6 空组确认被拦 | Split confirmation「分组不完整无确认（CF8-N）」 | ✅ |
| S7 漏分组 | CF8-N +「分组不完整时拒绝生成（G6-N）」（`groups.unassigned`） | ✅ |
| S8 重复分组 | CF8-N + G6-N（`groups.duplicate`） | ✅ |
| S9 分组完整可确认 | Split confirmation「组织者确认成功并锁定（CF1）」 | ✅ |
| S10 confirmed 后改组被拒 | 「已确认或已取消草稿不可改组（A5-N）」 | ✅ |
| S11 cancelled 后改组被拒 | A5-N | ✅ |
| S12 空组生成被拦 | Group route generation「分组不完整时拒绝生成（G6-N）」 | ✅ |
| S13 分组完整时按当前标签生成 | 「成对生成（G1）」+ 描述「current `groups` keys」 | ✅ |
| S14 改组保留路线与边界 | 「改组保留已生成路线与边界（A4）」 | ✅（BQ-2） |
| S15 改组后重新生成按新分组 | G1 + Screen 13「可点击重新生成」 | ✅ |
| S16 非发起人不可重新生成 | 「非发起人拒绝（G5-N）」+ Screen 13「重新生成不可用」 | ✅ |
| S17 复核屏显示成员名 | Split confirmation「确认屏幕展示契约（Screen 15）」（含陈旧路线提示） | ✅ |
| R1 无会话 401 | 「守卫顺序（A7-N）」 | ✅ |
| R2 非成员 403 | A7-N | ✅ |
| R3 未知行程 404 | A7-N | ✅ |
| R4 无活跃/终态 409 | A5-N（+ CF6-N 既有） | ✅ |
| R5 过期版本 409 | 「版本过期拒绝（A6-N）」 | ✅ |
| R6 非法 groupLabel 400 | 「非法组别拒绝（A8-N）」（错误码 OQ-9） | ✅ |
| R7 不可替他人改组 | 「不能替其他成员改组（A9-N）」 | ✅ |
| R8 改组不改边界/路线/发起人 | A4 的 AND 列表 | ✅ |
| R9 不改成员归属 | A1「`initiatorMemberId` 与 `status` 不变」+ A4 的 `plan_node` 断言 | ✅ |
| R10 改组未重生成不阻塞确认 | CF1（确认只校验边界/路线/分组）+ proposal `Supersedes` | ✅ |
| R11 单人行程不可分队 | Split draft start「成员不足两人拒绝发起（S10-N）」 | ✅（IO 复核 2026-11-17 补） |

## Fixture 对齐

`requirement-workspace/acceptance-test-fixtures.md` 尚无 §US-040。既有 §US-049-050 的四成员（Alice/Ben/Chloe/Daniel）与边界/路线数值可直接复用；**P3 ATDD 设计必须补 §US-040**：初始分组 4/0、改组序列（A→B→A）、空组/漏组/重复组构造、版本序列（1→2→3→4）、**单人行程（成员数=1）发起拒绝**。本项为 P3 承接，不阻塞 G1。

## 残留关注（IO / SA）

- **SA**：初始分组由「前后均分」改为「全员 A 组」，会连带打翻既有 splits 测试与夹具的 2/2 假设（`AbstractSplitApiTest.prepareConfirmableDraftAs`、`SplitDraftDetailApiTest`、`SplitDraftDocumentTest`、`SplitRouteGenerationApiTest`、`SplitConfirmApiTest`）；P3/P4 必须先改夹具再跑断言。
- **SA**：`SplitRouteGenerationApiTest.generateRoutes_groupMoveEndpoint_notImplemented` 断言 `groups:move` 不存在；本变更采用 `assignment`，P4 必须删除或改写该负向断言（impact R6）。
- **SA**：`groups` 元素为 `app_user.id`（`trip_member.user_id`），与会话主体同源；实现不得引入成员行 id 的二次映射。
- **SA**：splits 路径在 `SecurityConfig` 为 `permitAll`，401 由 `MemberGuard` 产出 `MEMBER_REQUIRED`；新 `PUT .../assignment` 必须命中 `"/api/trips/*/split-draft/**"`，P4 需核对匹配器。
- **IO**：已关闭项：单人行程门禁（BQ-9，新码 `SPLIT_MEMBERS_INSUFFICIENT`）、US-049/050 E2E 基线取代（proposal `Supersedes` ②）、路线只绑组标签 + Screen 15 陈旧提示、A3 版本以响应为准。
- **IO**：issue AC 第 2 条「分组变化使旧路线失效」由 BQ-2 取代为「保留路线 + 重新生成按当前分组」；已在 proposal `Supersedes` 与 delta A4 固化，归档时以 Living Spec 为准。
- **IO**：OQ-9（非法组别错误码）、OQ-10（同组提交是否递增版本）、OQ-11（头像首字母）、OQ-12（空 B 组引导文案）留 P3；其中 OQ-10 与 OQ-9 会影响 `SplitAssignmentApiTest` 的断言写法。
- **IO**：`groups` 空数组与「缺键」必须在实现中区分：detail 投影恒返回两个键，前端不得把缺键当作空组。

## 结论

**AC 4/4 Pass；DoV 5/5 Pass；无阻塞 Fail / Partial。** IO 已于 2026-11-17 具名签核（G1 = Pass）；P3 fixture 补充、既有测试改写与 OQ-9/OQ-10 定稿作为 P3 承接项跟踪。
