# US-040 设计（design）

- change：`us-040-split-grouping`；G1 Pass（SA Leo + IO Emily，2026-11-17）
- delta：`specs/splits/spec.md`（38 场景）；ATDD：`atdd-design.md`
- 范围：`splits` 1 ADDED + 3 MODIFIED；零迁移、零新依赖、不新增路由

## 后端

### DD1 端点与 DTO

- `PUT /api/trips/{tripId}/split-draft/assignment`，`@RequestMapping("/api/trips/{tripId}")` 下新增 `@PutMapping("/split-draft/assignment")`。
- 请求：新增 `AssignmentRequest(String memberId, String groupLabel, int draftVersion)`。`memberId` 可选，指定被移动成员（缺省为调用者）——**2026-11-17 用户修订**：任意行程成员可编辑分组（对齐原型头像切组），目标不属于本行程 → `403 NOT_A_MEMBER`；原「刻意不接收 `memberId`」已作废（见 TS-7）。
- 响应：复用 `SplitDraftDetailResponse`，与 `:confirm` / `:cancel` 一致，一次返回 `groups`、`draftVersion`、`routes`、边界与窗口，前端无需二次 GET。
- 调用者：沿用 `caller(Authentication)` → `service.assign(tripId, memberId, request)`。

### DD2 服务流程与守卫顺序

`SplitDraftService.assign`：

1. `guard.requireMember(memberId, tripId)` → 401 / 404 / 403；
2. `findDraftJson` 为空 → `SPLIT_DRAFT_NOT_ACTIVE`；
3. `status != "active"` → `SPLIT_DRAFT_NOT_ACTIVE`（含 confirmed / cancelled）；
4. `request.draftVersion()` ≠ 文档版本 → `STALE_DRAFT_VERSION`；
5. `groupLabel` ∉ {A, B} → `INVALID_GROUP_LABEL`（400）；
6. 目标成员 = `request.memberId()`（空则调用者）；目标非本行程成员 → `NOT_A_MEMBER`（403）；
7. 幂等分支：目标已在目标组 → 直接返回 `getDraftDetail`，**不写库、不递增版本**；
8. `draft.withAssignment(label, target, now)` → `updateDraftIfVersion(...)`；CAS 返回 0 → `STALE_DRAFT_VERSION`；
9. 返回 `getDraftDetail(tripId, memberId)`，响应 `200`。

顺序约束：状态与版本校验先于组别校验，保证终态草稿收到 `409 SPLIT_DRAFT_NOT_ACTIVE` 而不是 400（A5-N）。

### DD3 错误码

- `ErrorCode` 新增 `INVALID_GROUP_LABEL(HttpStatus.BAD_REQUEST)`（OQ-9 定稿）。
- 不新增其他错误码：`SPLIT_MEMBERS_INSUFFICIENT` 已由 IO 复核落入 delta（S10-N），需在同一次实现中补入 `ErrorCode(HttpStatus.CONFLICT)`。

### DD4 幂等语义（OQ-10 定稿）

- 提交自己当前所在组：`200`、`groups` 不变、`draftVersion` **不变**、不写库。
- 理由：避免无意义的版本膨胀导致其他成员页面频繁 stale；响应恒携带最新 `draftVersion`（A3 已固化），前端以响应为准。

### DD5 单成员行程与存量草稿

- 新规则：发起/重建前 `findMemberIdsOrdered(tripId).size() < 2` → `409 SPLIT_MEMBERS_INSUFFICIENT`，不建行、不改写 cancelled 行。
- 存量 1 人 active 草稿（升级前已存在）：**不做兼容放宽**；生成/确认继续以 `SPLIT_DRAFT_INCOMPLETE`（`groups.B`）拦住，前端在分组卡提示「至少一人加入另一组后才能生成路线与确认」。理由：双组分队要求每组至少一人，放宽等于允许「单组路线」这一未定义方案。

### DD6 初始分组

- `SplitDraftDocument.partitionGroups(...)` 删除，替换为 `initialGroups(List<String> orderedMemberIds)`：返回 `LinkedHashMap{"A": ordered, "B": []}`（保留 `display_name` 升序）。
- `initial(...)` 与 `initialRebuilt(...)` 均改用 `initialGroups`；`startDraft` 与取消后重建两条路径共用同一实现。

### DD7 `withAssignment`

```
withAssignment(String groupLabel, String memberId, String now)
  → groups 深拷贝；从 A、B 两组都移除 memberId；加入目标组末尾；
    draftVersion + 1；boundaries / routes / initiatorMemberId / status / createdAt 原样保留；updatedAt = now
```
- 必须先从两组移除再加入，天然防重复分组；不触碰 `plan_node`（A4）。

### DD8 分组完整性投影

新增 `SplitDraftService.groupProblems(SplitDraftDocument draft, List<String> memberIds)`，返回按固定顺序排列的缺失项：

1. `groups.A`：A 组空；
2. `groups.B`：B 组空；
3. `groups.unassigned`：成员集合中存在不在任何组的成员；
4. `groups.duplicate`：某成员在 A/B 出现多于一次。

固定顺序保证 `details.missing` 可逐项断言。生成与确认共用同一方法。

### DD9 `generateRoutes` 前置

在「成员 → 发起人 → 活跃 → 边界 → 版本」既有顺序之后、`provider.candidateFor` 之前插入 `groupProblems`：

- 非空 → `409 SPLIT_DRAFT_INCOMPLETE`，`details = {"missing": [...]}`，不写 `plan_node`、不动版本；
- 为空 → 继续按 `draft.groups().keySet()`（A/B）成对生成，行为不变。

### DD10 `confirmDraft` 完整性

`missingDraftParts(draft)` 改为 `missingDraftParts(draft, memberIds)`：既有 `boundaries` / `routes` / `routes.A` / `routes.B` 之后追加 `groupProblems(...)` 的结果；其余流程（复算、条件更新、锁定）不变。

### DD11 认证口径（IO-4）

- splits 路径维持 `permitAll` + `MemberGuard` 例外（`SecurityConfig` 第 59–60 行已覆盖 `/api/trips/*/split-draft/**`），**新增子路径自动命中，无需修改 `SecurityConfig`**。
- 无会话仍由 `MemberGuard` 映射 401 `MEMBER_REQUIRED`（A7-N）。
- P4 检查项：确认匹配器确实覆盖 `PUT .../split-draft/assignment`（不新增 `authenticated()` 式假设）。

## 前端

### DD12 成员名映射

- `features/split/screen-routes.tsx` 与 `screen-confirm.tsx` 共用新增 hook `useTripMembers(tripId)`（`GET /api/trips/{id}/members`），构建 `Map<userId, displayName>`。
- 无名字时回退 `shortId`；分组卡显示首字头像（OQ-11 经 2026-11-17 Revision 改为显示首字头像）。

### DD13 分组卡与切组（Screen 13，2026-11-17 修订）

- 卡片标题「分组」；两列 A/B：组名、人数、成员头像 chip（首字头像 + 显示名，「我」标记）。
- **点击成员 chip 把该成员移到另一组**（A ↔ B），对齐原型 `gogo-mvp-prototype.html` 的 `groupA`/`groupB` chip 点击实现；**任意行程成员都可操作**（不再限制本人）。
- 调 `useAssignGroup`（`assignGroup(tripId, {memberId, groupLabel, draftVersion})`），成功 → `invalidate` detail + 内联提示「分组已更新，路线仍为上次生成的版本，可点击重新生成」。
- 终态（`confirmed` / `cancelled`）chip 不可点（`disabled`），不显示操作提示。
- 副标题去掉「分组移动本期不开放」；删除「no members endpoint」过时注释。
- 空组引导：任一组为空时显示「至少一名成员加入另一组后才能生成路线与确认」+「点击成员头像可把他移到另一组；所有行程成员都可以调整分组」（OQ-12）。

### DD14 陈旧路线提示（IO-3，不新增字段）

- 判定不引入新 wire 字段：**只要 `detail.routes` 非空**，Screen 13 与 Screen 15 都显示「路线为上次生成的版本，可点击重新生成」提示；Screen 13 额外在「该组为空且仍有路线」时给该组路线卡加「需重新生成」徽标。
- 理由：草稿文档不记录「路线生成时的分组」，精确判定需新增字段（属契约扩展）；常驻提示满足 delta 的可观察断言且零契约变更。已知代价：未改组时提示略冗余（记 TS-1）。

### DD15 错误态文案

- `states.tsx` 的 `ERROR_TEXT` 增加 `INVALID_GROUP_LABEL`（「目标组别无效，只能是 A 或 B。」）与 `SPLIT_MEMBERS_INSUFFICIENT`（「行程至少需要两名成员才能发起与确认分队。」）。
- `SPLIT_DRAFT_INCOMPLETE` 文案泛化为「草稿尚不完整：请补齐边界、路线或分组。」
- 新增 `details.missing` 键中文化映射：`boundaries`/`routes`/`routes.A`/`routes.B`/`groups.A`/`groups.B`/`groups.unassigned`/`groups.duplicate`。

## 契约层

### DD16 前端类型与请求封装

- `types.ts`：`AssignmentRequest {groupLabel: "A" | "B"; draftVersion: number}`。
- `api.ts`：`assignGroup(tripId, body): Promise<SplitDraftDetail>`（PUT）。
- `hooks.ts`：`useAssignGroup(tripId)`，`onSuccess` invalidate `[split-draft, tripId]`。

## 测试影响（P4 必做，IO/SA 已列）

### DD17 既有测试改写清单

| 文件 | 改动 |
|---|---|
| `AbstractSplitApiTest` | 新增 `assignAs(displayName, label, version)`、`updateGroups(...)`；`prepareConfirmableDraftAs` 在 boundaries 之后插入「把 Chloe 分到 B 组」并调整版本序列（1→2→3→4→5） |
| `SplitDraftDocumentTest` | `partitionGroups` 用例改为 `initialGroups`（A=全部、B 空） |
| `SplitDraftDetailApiTest` | `groups.A.length=4`、`groups.B.length=0` |
| `SplitRouteGenerationApiTest` | 删除/改写 `generateRoutes_groupMoveEndpoint_notImplemented`；生成前先分组；新增 G6-N |
| `SplitConfirmApiTest` | 现有「可确认」用例先分组；新增 CF8-N |
| `SplitDraftStartApiTest` | 新增 S9（初始 4/0）与 S10-N（单成员 trip → 409） |
| 新增 `SplitAssignmentApiTest` | A1–A9-N 9 例 |

## 偏离与已知限制

| id | 偏离 / 限制 | 处置 |
|---|---|---|
| TS-1 | 陈旧路线提示为常驻（无法精确判定「改组后」），未新增 `routesGeneratedAtVersion` 字段 | 接受；若 IO/SA 要求精确提示，回 `/sdd:delta-craft` 增字段并重开 G1 |
| TS-2 | 同组提交不递增版本（OQ-10 定稿） | 与 A3「响应恒返回最新版本」一致；测试只断言「groups 不变 + 版本以响应为准」 |
| TS-3 | 存量单人 active 草稿不放宽（生成/确认仍 409） | 接受；前端空组引导 + 成员不足发起门禁覆盖新路径 |
| TS-4 | 分组写入不触发路线重算、不删除 `plan_node` | 与 BQ-2 / A4 一致；旧路线仍可展示并标注 |
| TS-5 | 成员名走 `GET /api/trips/{id}/members`，detail 不新增名字段 | 复用 US-013；两屏各一次额外请求，MVP 接受 |
| TS-6 | 未新增分组路由/页面 | 分组卡落在 Screen 13；E2E 反向断言 `#/trips/{id}/split/groups` 不存在 |
| TS-7 | **2026-11-17 修订**：分组编辑权限由「仅本人」改为「任意行程成员可移动任意成员」（原 A9-N 作废），入参新增可选 `memberId` | 已同步 delta A9/A9b-N、Screen 13 头像 chip、requirements OQ-14/BQ-10、fixtures 与 `SplitAssignmentApiTest`；G1 开 Revision 复审（C8 待 IO 签） |
