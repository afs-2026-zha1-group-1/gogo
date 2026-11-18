# US-096 二次分队 — 设计分析提示词（交付 Opus）

> 用法：把本文件整段交给 Opus，或让 Opus 直接读这个文件。
> 目标不是让 Opus 立刻写代码，而是让它先给出**数据模型、接口合同、领域规则、前端信息架构、迁移与分阶段任务**，并明确指出推荐方案的风险与反对意见。
> 仓库：`afs-2026-zha1-group-1/gogo`（Java Spring Boot + SQLite + React/TypeScript）。
> 本文所有路径均相对仓库根目录。

---

## 0. 给 Opus 的任务说明

请基于下面的现状和目标，回答：

1. 二次分队应该采用哪种数据模型？为什么？请对比“每轮一行”“单行 rounds[]”“新表”三种方案。
2. 后端 API 应该怎么组织？请给出完整的端点、请求/响应字段、错误码和兼容策略。
3. 领域规则应该怎么表达？重点是多轮顺序、每轮分组、每轮确认、预算聚合、取消边界。
4. 前端信息架构应该怎么改？包括总览页、每轮四步流程、队伍路线图、个人路线、仪表盘。
5. 数据库迁移怎么做？SQLite 的表重建、唯一约束、旧数据迁移、`plan_node` 分支 id。
6. 请给出可执行的分阶段任务清单和测试清单。
7. 请指出本文件中推荐方案的反对意见和更简单的替代方案。

不要直接开始写代码；先给设计结论和决策表。

---

## 1. 一句话目标

当前一次行程只能有一次“分头 → 会合”。目标是在第一次会合之后，**在旅途中再发起第二次“分头 → 会合”**，两次可以选择不同的主线节点；仍然只有 A/B 两支队伍，但**每一轮都可以重新分组**、独立生成路线、独立校验时间窗、独立由组织者确认。

---

## 2. 已确认的产品决定

以下不是开放问题，而是用户已经拍板的前提：

| 编号 | 决定 |
|---|---|
| D-1 | 二次分队在**第一次会合之后、旅途中单独发起**，不是出发前一次性规划两轮。 |
| D-2 | 第二轮有**独立的草稿生命周期**：独立边界、独立路线、独立时间窗校验、独立确认/取消。 |
| D-3 | 第二轮**可以重新分组**：同一批成员在第二轮可以重新落到 A/B，第二轮的分组不影响第一轮已确认的分组。 |
| D-4 | 仍然只有**两支队伍**（A/B），不引入 C 组，也不允许成员在某一轮“不参加/待定”。 |
| D-5 | 第一轮保持现有行为（包括“行程起点分头” `FROM_START`）；第二轮只考虑“从某个主线站分头 → 某个主线站会合”。 |
| D-6 | 首版只支持**最多两轮**；数据模型可以预留更多轮，但接口/界面在第三轮时明确拒绝。 |
| D-7 | 第二轮必须等第一轮**已确认**后才能发起；第一轮仍是 `active` / `cancelled` 时不能发起第二轮。 |
| D-8 | 第二轮的分头站必须在第一轮会合站**之后或同一站**；会合站必须排在分头站之后；窗口必须为正。 |

---

## 3. 现状：只支持一次分队的实现事实

### 3.1 领域与持久化

- 一次行程只有一条 `split_draft` 记录：
  - `backend/src/main/resources/db/migration/V4__splits.sql:7` 起：
    `split_draft(id, trip_id INTEGER NOT NULL UNIQUE REFERENCES trip(id), document, draft_version, created_at, updated_at)`。
  - 也就是说“每 trip 至多一个草稿”是数据库级唯一约束，不只是业务规则。
- 草稿业务字段是 `document` JSON，对应：
  - `backend/src/main/java/com/gogo/hello/splits/domain/SplitDraftDocument.java:15`
  - 字段：`initiatorMemberId`、`mainPlanVersion`、`draftVersion`、`status`、`departureStopId`、`reunionStopId`、`splitMode`（US-095 新增）、`groups`、`routes`、`createdAt`、`updatedAt`。
  - `status` 只有 `active` / `confirmed` / `cancelled`。
  - `groups` 恒为 `{A: [...], B: [...]}`；当前邀请/确认前要求“全员恰好分配到 A 或 B 一次，且两组都非空”。
- 边界模式（US-095，仅当前分支有，`group1/main` 还没有）：
  - `backend/src/main/java/com/gogo/hello/splits/domain/SplitMode.java`
  - `MIDDLE`：选定主线站 → 选定主线站。
  - `FROM_START`：第一站 → 选定主线站，`departureStopId = null`。
  - `SplitBoundaries.resolve`（`SplitBoundaries.java:29`）负责把模式解析成 `fromIndex` / `toIndexExclusive` / `startAt` / `endAt`。
  - 窗口 = 会合站开始 − 分头站开始，必须为正。
- 分队路线结构存在 `plan_node`：
  - 主线：`branch_id = 'main'`，`plan_version` = 已确认主线版本。
  - 分队：每组一行，`branch_id = 'split-a'` / `'split-b'`，`node_type = 'activity'`，`start_at/end_at` = 本轮窗口起止，`title/location_name` 是活动名/地点。
  - 写入：`SplitDraftRepository.java:185` `insertSplitRoute`。
  - 删除：`SplitDraftRepository.java:119` `deleteSplitRoutes`，固定删除 `split-a` / `split-b`。
  - 读取：`SplitDraftRepository.java:222` `findSplitRouteActivities`，固定读 `split-a` / `split-b`。
- 主线版本：
  - `MainPlanProjection.projectConfirmed` 把已确认主线投影到 `plan_node`，返回版本；`SplitDraftService.confirmedMainPlanVersion` 使用该版本。
  - 每份草稿固定 `mainPlanVersion`，边界站必须属于该版本。
- 现有迁移只到 V4（当前分支）；`group1/main` 已经到 V17，包含 AI 分队路线、预算、站点坐标/费用等（见第 3.5 节）。

### 3.2 后端服务与接口

核心服务：`backend/src/main/java/com/gogo/hello/splits/SplitDraftService.java`

| 方法 | 行号 | 作用 |
|---|---:|---|
| `startDraft` | 76 | 发起唯一草稿；已存在 `active/confirmed` 冲突；`cancelled` 可在同一行重建 |
| `saveBoundaries` | 126 | 发起人保存边界；校验主线站、顺序、正窗口；清空旧路线 |
| `assign` | 187 | 任意成员把任意成员移到 A/B；改组保留边界和路线 |
| `generateRoutes` | 223 | 发起人成对生成 A/B 路线；A 沿主线，B 用 provider；单事务替换 |
| `saveRoutes` | 301 | 任意成员手动保存 A/B 路线 |
| `checkTiming` | 388 | 无状态时间窗校验（两路快照） |
| `getDraftDetail` | 403 | 成员读取草稿快照 |
| `confirmDraft` | 462 | 组织者确认；完整性 + 时间窗 + 预算复算 |
| `cancelDraft` | 495 | 发起人取消活跃草稿 |
| `cancelConfirmedSplit` | 520 | 组织者取消已确认分队；出发后拒绝 |

控制器：`backend/src/main/java/com/gogo/hello/splits/SplitDraftController.java`

- `GET /api/trips/{tripId}/split-draft`
- `POST /api/trips/{tripId}/split-draft`
- `PUT /api/trips/{tripId}/split-draft/boundaries`
- `POST /api/trips/{tripId}/split-draft/routes:generate`
- `PUT /api/trips/{tripId}/split-draft/routes`
- `POST /api/trips/{tripId}/split-draft/routes:check-timing`
- `PUT /api/trips/{tripId}/split-draft/assignment`
- `POST /api/trips/{tripId}/split-draft:confirm`
- `POST /api/trips/{tripId}/split-draft:cancel`
- `POST /api/trips/{tripId}/split:cancel`（已确认分队取消）

统一 `{data,error}` 包封套；稳定错误码在 `backend/src/main/java/com/gogo/hello/common/ErrorCode.java`，与分队相关的包括：

`NOT_SPLIT_INITIATOR`、`NOT_SPLIT_ORGANIZER`、`NONPOSITIVE_SPLIT_WINDOW`、`BOUNDARY_NOT_IN_MAIN_PLAN`、`INVALID_ROUTE_PAIR`、`INVALID_ROUTE_INPUT`、`INVALID_GROUP_LABEL`、`SPLIT_MEMBERS_INSUFFICIENT`、`SPLIT_DRAFT_CONFLICT`、`SPLIT_DRAFT_NOT_ACTIVE`、`SPLIT_BOUNDARIES_REQUIRED`、`SPLIT_DRAFT_INCOMPLETE`、`SPLIT_TIMING_INFEASIBLE`、`SPLIT_ALREADY_DEPARTED`、`ROUTE_GENERATION_FAILED`。

### 3.3 前端流程

路由：`frontend/src/router.tsx`

- `/trips/:tripId/split` → `ScreenStart`（队伍路线总览）
- `/trips/:tripId/split/boundaries` → `ScreenBoundary`
- `/trips/:tripId/split/routes` → `ScreenRoutes`
- `/trips/:tripId/split/preview` → `ScreenPreview`
- `/trips/:tripId/split/timing` → 重定向到 preview
- `/trips/:tripId/split/confirm` → `ScreenConfirm`

关键文件：

- `frontend/src/features/split/types.ts`：与后端 DTO 镜像的 TS 类型。
- `frontend/src/features/split/api.ts`：fetch 客户端。
- `frontend/src/features/split/hooks.ts`：TanStack Query hooks，`useSplitDraft` 每 5 秒轮询。
- `frontend/src/features/split/screen-start.tsx:107`：副标题明确写着“本次行程仅一次分队”。
- `frontend/src/features/split/screen-boundary.tsx`：边界选择；US-095 增加“行程起点”。
- `frontend/src/features/split/screen-routes.tsx`：分组 + 路线编辑；第 2 步点“下一步”先保存再 `check-timing`，不可行弹窗，可行进入 preview。
- `frontend/src/features/split/screen-preview.tsx`：只读预览。
- `frontend/src/features/split/screen-confirm.tsx`：组织者确认 / 发起人取消 / 组织者取消已确认。
- `frontend/src/features/split/graph-model.ts:253` `buildGraphRows`：**单窗口**模型，一次只接受一组 `departureStopId/reunionStopId/routes`，产出单条主线的 `fork` / `join` 与 A/B 分支。
- `frontend/src/features/split/team-route-graph.tsx`：三泳道 SVG（B 左、主线中、A 右），只画一个 fork/join。
- `frontend/src/lib/personal-route.ts:60` `derivePersonalRoute`：**单窗口**个人路线；A 组在窗口内沿主线，B 组把活动居中放在窗口内；窗口外的主线站点作为共享段。
- `frontend/src/hooks/useTripOverview.ts` 调用 `selectSchedule`，`TripDetails` 渲染“我的方案”。
- `frontend/src/pages/dashboardProgress.ts`：仪表盘里程碑/下一步只认一个 `split` 状态。

### 3.4 现有规格

- `openspec/specs/splits/spec.md`
  - 第 4 行 Purpose：“唯一拆分草稿”“冻结为唯一拆分方案”。
  - 第 11 行：“`split_draft` 表一行（`trip_id` UNIQUE）”“不新增表、不新增迁移”。
  - 第 21 行：`Split draft start` 明确“每 trip 至多一行（`trip_id` UNIQUE）”。
  - 第 130 行起：边界选择、生成、确认、取消、分组等场景都基于单草稿/单窗口。
- `requirement-workspace/requirements/US-095.md` 记录了“起点分头”的边界模式，但仍是单窗口。
- `requirement-workspace/requirements/US-089.md`、`US-040` 等历史故事都假设单次分队。

### 3.5 当前分支与 `group1/main` 的差异（重要）

- 当前分支：`US-096-second-split`，从 `US-095-split-boundary-modes` 的 HEAD `10fcfb3` 切出。
  - 相对 `group1/main`：**落后 36 个提交，领先 3 个提交**（领先的是 US-095 的起点分头实现）。
  - 本地 `main` 已快进到 `group1/main` 的 `bc13608`。
- `group1/main` 已经包含、但当前 US-095 分支**没有**的能力：
  - AI 分队 B 组路线：`AiBranchCandidateProvider`、`AiBranchValidator`、`BranchCandidateProviderConfig`，规格已写入 `openspec/specs/splits/spec.md` 的 `Group route generation`。
  - 分组预算/活动：`SplitBudgetCalculator`、`RouteActivity`、`saveActivities`、`recommendActivities`、`budgetCheck`，以及前端预算面板。
  - `plan_node` 增加 `cost_cents`，主线投影写入坐标/费用；迁移到 V17。
  - `MainPlanStopsChangedListener`：主线站点编辑后作废活跃分队路线。
  - 路线编辑界面已经变成“每站停留 + 费用/预算”一张卡。
- 因此：US-096 的实现不能只基于当前 US-095 分支，也不能只基于 main；它需要**同时包含 US-095 和 main 的改动**。这是本任务最大的集成风险。
- 推荐顺序（需要用户确认）：
  1. 先把 US-095 合入 `group1/main`（当前 US-095 没有 PR）；
  2. 再从最新 `group1/main` 切 `US-096-second-split`；
  3. 如果必须先做，则保留当前分支，但实现前必须 rebase/merge main，预期冲突集中在：
     `SplitDraftService.java`、`SplitDraftDocument.java`、`SplitDraftRepository.java`、`BranchCandidateProvider`/`FixtureBranchCandidateProvider`、`frontend/src/features/split/{types,api,hooks,screen-*,graph-model}.ts(x)`、`openspec/specs/splits/spec.md`。

---

## 4. 目标行为（v1 建议）

### 4.1 名词

- **轮次（round）**：一次“分头 → 会合”的窗口。第 1 轮、第 2 轮。
- **轮次草稿**：某一轮自己的草稿生命周期（边界、分组、路线、状态、版本）。
- **共享段**：不在任何一轮窗口内、全员一起走的主线站点。
- **本轮窗口**：该轮分头站开始 → 该轮会合站开始。

### 4.2 轮次规则

1. 第 1 轮保持现有行为和接口。
2. 第 2 轮只能在第 1 轮 `confirmed` 后发起。
3. 第 2 轮发起人可以是任意行程成员；不必与第 1 轮发起人相同。
4. 第 2 轮发起时，A/B 分组默认**复制第 1 轮已确认的分组**，然后允许任意成员改组（这是对 US-040“初始全员 A”的轮次 2 例外）。
5. 第 2 轮分头站的下标必须 ≥ 第 1 轮会合站的下标；允许等于（会合后立即再分头）。
6. 第 2 轮会合站下标必须 > 第 2 轮分头站下标，且 ≤ 主线最后一站。
7. 第 2 轮窗口必须为正。
8. 第 2 轮不支持 `FROM_START`；分头站必填。若产品希望“从上一轮会合站直接再分头”，把分头站选为上一轮会合站即可。
9. 第 2 轮所有成员必须恰好分配到 A 或 B 一次；两组都非空；不允许某轮“不参加”。
10. 首版最多 2 轮；第 3 轮请求明确拒绝。
11. 第 2 轮的 `mainPlanVersion` 必须与第 1 轮相同（同一份已确认主线），不允许混用不同主线版本。
12. 已确认轮次冻结：不能改边界、分组、路线、活动；只能在满足取消规则时取消。

### 4.3 每轮状态机

每轮独立：

`active`（可编辑/可确认/可取消）
→ `confirmed`（冻结）
→ 只能通过“取消已确认轮次”回到 `cancelled`（受出发时间与后续轮次限制）。

`cancelled` 轮次可以在同一轮次号上重建为新 `active`（沿用现有“取消后替换”语义），重建后 `draftVersion = 1`。

### 4.4 用户流程

1. 第 1 轮按现有四步完成并确认。
2. 回到 `/split` 总览，看到第 1 轮的会合信息和“再次分队”入口。
3. 点“再次分队” → 创建第 2 轮草稿，进入第 2 轮边界页；分头站默认选第 1 轮会合站（可改到更后的站）。
4. 保存边界 → 分组页（预填第 1 轮分组，可改组）→ 生成/编辑 A/B 路线 → 下一步校验第 2 轮时间窗 → 预览 → 组织者确认。
5. 确认后，总览显示两轮；个人路线按两轮拼接；仪表盘显示“已确认（2 轮）”或等价聚合。
6. 第 2 轮未确认时，总览同时显示第 1 轮“已确认”和第 2 轮“进行中”。

### 4.5 取消规则（建议，需拍板）

- 第 2 轮 `active`：发起人可取消；第 1 轮不受影响；取消后可在同一轮次号重建第 2 轮。
- 第 2 轮 `confirmed`：组织者可在第 2 轮出发前取消；只删除第 2 轮的 `plan_node` 行；第 1 轮保留。
- 第 1 轮 `confirmed` 且已存在第 2 轮：**拒绝**取消第 1 轮，返回新的“存在后续轮次”错误；要求先处理第 2 轮。
- 第 1 轮 `active` / `cancelled`：不存在第 2 轮。
- 已出发判断使用“该轮分头站 `start_at`”；当前 US-051 只对已确认轮次做了这个判断，建议保持。

---

## 5. 数据模型：候选方案与推荐

### 方案 A（推荐）：`split_draft` 每轮一行

- 新增 `round_index INTEGER NOT NULL DEFAULT 1`。
- 唯一约束从 `UNIQUE(trip_id)` 改为 `UNIQUE(trip_id, round_index)`。
- 每一行仍保留 `document` JSON、`draft_version`、`created_at/updated_at`；`document` 内的 `status/groups/routes/boundaries` 都是该轮自己的。
- 第 1 轮旧数据迁移为 `round_index = 1`。
- `plan_node` 分支 id 改为 `split-r1-a` / `split-r1-b` / `split-r2-a` / `split-r2-b`；旧 `split-a` / `split-b` 迁移为 `split-r1-*`。
- 优点：
  - 每轮天然拥有独立 `status`、`draft_version`、条件更新和取消/重建语义；
  - SQL 查询简单，`json_extract(document, '$.status')` 仍可按行判断；
  - 与现有 `updateDraftIfVersion` / `confirmDraftIfActive` / `cancelDraftIfActive` 模型一致；
  - 后续扩展到 N 轮只是去掉上限。
- 缺点：
  - SQLite 不能直接删除表级 UNIQUE，需要表重建迁移；
  - 所有“按 trip 读一行”的仓储方法都要加 `round_index`；
  - `GET /split-draft` 的语义要从“唯一草稿”变成“当前/指定轮次”。

### 方案 B：单行 `split_draft` + `document.rounds[]`

- 保持 `trip_id UNIQUE`，在 JSON 里放 `rounds: [{roundIndex, status, draftVersion, groups, boundaries, routes, ...}]`。
- 优点：无表结构迁移，旧文档缺 `rounds` 时合成第 1 轮。
- 缺点：
  - 每轮状态/版本都在 JSON 内，SQL 条件更新要按 `rounds[n]` 定位，复杂且易错；
  - `draft_version` 列是 trip 级还是轮次级需要重新定义；
  - “已确认轮次冻结、另一轮活跃”在同一行里容易互相覆盖；
  - 现有 `updateDraftIfVersion` 的乐观锁语义不再够用。
- 结论：不推荐作为 v1，除非明确“两轮一次性确认”。

### 方案 C：新建 `split_round` 表，保留 `split_draft` 作为第 1 轮

- 新增 `split_round(id, trip_id, round_index, document, draft_version, ...)`，`split_draft` 继续只存第 1 轮。
- 优点：避免表重建。
- 缺点：两套来源、两套查询、迁移和测试都翻倍；不推荐。

### 推荐结论

采用方案 A。请 Opus 重点评审：

- SQLite 表重建的具体步骤与 Flyway 版本号（当前 main 已到 V17，建议 V18）；
- `round_index` 放在表列还是同时写进 `document`（建议表列作为唯一事实，DTO 暴露 `roundIndex`）；
- `plan_node` 分支 id 的迁移与所有查询的更新；
- `GET /split-draft` 的兼容语义。

---

## 6. 逐层改动清单

### 6.1 数据库/迁移

- `V18__split_rounds.sql`（建议）：
  - 重建 `split_draft`：`round_index INTEGER NOT NULL DEFAULT 1`，`UNIQUE(trip_id, round_index)`。
  - 旧行 `round_index = 1`。
  - `UPDATE plan_node SET branch_id = 'split-r1-a' WHERE branch_id = 'split-a'`；`split-b` 同理。
  - 检查 `V15__repair_main_plan_confirmation_drift.sql` 仍引用 `split-a/b`：它已在 V18 前执行，不需要改；但新代码不要再依赖旧 id。
  - 注意 SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on）与表重建顺序。
- 是否需要为 `plan_node` 增加 `round_index` 列？
  - 建议不增加，用 `branch_id = split-r{n}-a/b` 编码轮次；如果 Opus 认为查询/索引需要，可加列，但会扩大改动面。

### 6.2 领域模型

- `SplitDraftDocument`：
  - 仍表示“一轮”的文档；增加 `roundIndex`（或由仓储/DTO 注入）。
  - `withAssignment` / `withBoundaries` / `withRoutes` / `confirmed` / `cancelled` 保持单轮语义。
  - 新增 `withGroupsPrefilled(...)` 或在 `initial` 增加“从上一轮复制分组”的工厂方法。
- 新增领域规则（建议放在 `domain/`，不要在 service 里写 if/else）：
  - `SplitRoundSequence` / `SplitRoundRules`：
    - 第 2 轮必须存在已确认的第 1 轮；
    - 最多 2 轮；
    - 第 2 轮分头下标 ≥ 第 1 轮会合下标；
    - 第 2 轮模式只能是 `MIDDLE`；
    - `mainPlanVersion` 必须与第 1 轮一致。
  - `SplitBoundaries` 增加按轮次解析的入口，或由 service 传入 `previousReunionIndex`。
- 预算（如果合入 main 的 US-045）：
  - `SplitBudgetCalculator` 目前按单窗口计算 `totalShared` / `replaced` / 每组活动。
  - 多轮需要：
    - `replaced` = 所有非取消轮次窗口内主线站的并集（每站只算一次）；
    - `totalShared` = 全部主线站 − `replaced`；
    - 每个成员的总额 = 共享 + 各轮“该成员所在组”的活动费用之和；
    - 第 2 轮确认时按两轮聚合校验硬预算。
  - 需要决定：预算检查是“每轮独立”还是“整趟聚合”（建议整趟聚合，因为预算是按行程/人的）。

### 6.3 仓储

- `SplitDraftRepository`：
  - `createDraftIfAbsent(tripId, roundIndex, json)`；
  - `findDraftJson(tripId, roundIndex)`；
  - `findRounds(tripId)` / `findLatestRound(tripId)` / `findActiveRound(tripId)`；
  - `updateDraftIfVersion(tripId, roundIndex, json, expectedVersion)`；
  - `confirmDraftIfActive` / `cancelDraftIfActive` / `cancelConfirmedIfConfirmed` / `rebuildIfCancelled` 都加轮次参数；
  - `deleteSplitRoutes(tripId, roundIndex)`（只删 `split-r{n}-a/b`）和 `deleteAllSplitRoutes(tripId)`（取消整趟/迁移用）；
  - `insertSplitRoute(..., branchId = split-r{n}-a/b)`；
  - `findSplitRouteActivities(tripId, roundIndex)`。
- `MainPlanStopsChangedListener` / `invalidateRoutesAfterMainPlanChange`：
  - 遍历活跃轮次（最多一个），清空该轮路线；已确认轮次是否要作废需要拍板（建议保持现状：只处理 active）。

### 6.4 服务与控制器

- `SplitDraftService`：
  - `startDraft` 保持第 1 轮语义；
  - 新增 `startNextRound(tripId, memberId)`：校验第 1 轮 confirmed、无活跃第 2 轮、未超 2 轮、成员数 ≥ 2；创建第 2 轮，分组复制第 1 轮；
  - `saveBoundaries` / `assign` / `generateRoutes` / `saveRoutes` / `confirmDraft` / `cancelDraft` / `cancelConfirmedSplit` 增加 `roundIndex` 或“当前轮次”解析；
  - `getDraftDetail(tripId, memberId, roundIndex)`；
  - 新增 `listRounds(tripId, memberId)` 返回总览；
  - 确认第 1 轮时仍走现有逻辑；确认第 2 轮时额外校验“第 1 轮已确认”和预算聚合；
  - 取消第 1 轮时检查是否存在第 2 轮；
  - 取消第 2 轮只删第 2 轮 plan_node。
- `SplitDraftController`：
  - 推荐新增轮次子资源：
    - `POST /api/trips/{tripId}/split-draft/rounds`：发起下一轮；
    - `GET /api/trips/{tripId}/split-draft/rounds`：轮次摘要列表；
    - `GET /api/trips/{tripId}/split-draft/rounds/{roundIndex}`：指定轮详情；
    - `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/boundaries`；
    - `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/assignment`；
    - `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes:generate`；
    - `PUT /api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes`；
    - `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}/routes:check-timing`；
    - `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:confirm`；
    - `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel`；
    - `POST /api/trips/{tripId}/split-draft/rounds/{roundIndex}:cancel-confirmed`。
  - 兼容策略：保留旧端点，默认映射到第 1 轮（或当前活跃轮），避免一次性改爆所有测试/客户端；也可以让旧端点只在只有第 1 轮时可用，第二轮必须走新端点。
  - 请 Opus 给出最终选择，并解释为什么。

### 6.5 DTO 与错误码

- 新增/修改 DTO：
  - `SplitRoundSummaryResponse`：`roundIndex`、`status`、`draftVersion`、`departureStopId`、`reunionStopId`、`splitMode`、`departureAt`、`reunionAt`、`windowMinutes`、`groups` 人数、`initiatorMemberId`。
  - `SplitRoundsResponse`：`rounds[]` + 聚合状态。
  - 各请求体加可选 `roundIndex`（如果采用旧路径兼容）或从路径取。
- 建议错误码：
  - `SPLIT_ROUND_LIMIT_REACHED`（409）：第 3 轮；
  - `SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`（409）：第 1 轮未确认就发起第 2 轮；
  - `SPLIT_LATER_ROUNDS_EXIST`（409）：存在第 2 轮时取消第 1 轮；
  - `ROUND_NOT_FOUND`（404）；
  - `BOUNDARY_BEFORE_PREVIOUS_REUNION`（400）：第 2 轮分头早于第 1 轮会合；
  - `INVALID_ROUND_MODE`（400）：第 2 轮传 `FROM_START`。
  - 其余沿用现有错误码。请 Opus 判断哪些可以复用、哪些必须新增。

### 6.6 `plan_node` 与路线

- 每轮每组一行：`split-r{n}-a` / `split-r{n}-b`。
- `start_at` / `end_at` = 该轮窗口。
- `sort_order` 建议按“轮次 * 10 + 组序号”或全局递增，避免多轮覆盖；读取不依赖它。
- 生成/保存/删除都必须带轮次，绝不能误删其他轮。
- A 组路线：该轮分头站（含）→ 该轮会合站（不含）之间的主线站。
- B 组路线：
  - 当前分支是夹具/AI；`FixtureBranchCandidateProvider` 第二轮会和第一轮给出同一个活动（按目的地固定），演示上会重复。
  - 建议给 `BranchCandidateProvider.candidateFor` 增加 `roundIndex` 或 `roundSeed`，让第二轮换一个活动；AI 提示词也要带“第几次分队/前后窗口”上下文。
  - 这会改动 `group1/main` 的 AI provider 接口与测试，属于集成风险。

### 6.7 前端 API/types/hooks

- `types.ts`：
  - 新增 `SplitRoundSummary`、`SplitRoundList`；
  - `SplitDraftDetail` 增加 `roundIndex`、`rounds` 摘要（可选）；
  - 请求体加 `roundIndex`（如果走旧路径）。
- `api.ts`：新增轮次端点；旧端点保留。
- `hooks.ts`：
  - `useSplitDraft(tripId, roundIndex?)`；
  - `useSplitRounds(tripId)`；
  - `useStartNextRound(tripId)`；
  - 所有 mutation 带轮次参数/失效对应 query。

### 6.8 前端路由与屏幕

推荐信息架构：

- `/trips/:tripId/split`：总览。展示第 1 轮、第 2 轮的卡片/时间线、聚合状态、入口。
- `/trips/:tripId/split/rounds/:roundIndex/boundaries`
- `/trips/:tripId/split/rounds/:roundIndex/routes`
- `/trips/:tripId/split/rounds/:roundIndex/preview`
- `/trips/:tripId/split/rounds/:roundIndex/confirm`
- 旧路径重定向到第 1 轮或当前活跃轮，避免书签/测试断裂。

屏幕改动要点：

- `screen-start.tsx`：
  - 去掉“本次行程仅一次分队”的副标题；
  - 总览按轮次展示；第 1 轮 confirmed 且无第 2 轮时显示“再次分队”；
  - 第 2 轮 active 显示“继续第 2 次分队”；
  - 两轮都 confirmed 显示“查看已确认分队”；
  - 取消/重建入口按轮次状态分支。
- `screen-boundary.tsx`：
  - 支持轮次上下文；第 2 轮分头站默认选第 1 轮会合站；
  - 第 2 轮只提供 `MIDDLE`；分头选项必须 ≥ 第 1 轮会合站；会合必须 > 分头；
  - 显示“第 1 次会合 → 第 2 次分头”的连续性提示。
- `screen-routes.tsx`：
  - 分组卡按轮次保存/读取；第 2 轮预填第 1 轮分组；
  - 保留现有“下一步先保存再校验”的顺序；
  - 轮次内改组不影响其他轮。
- `screen-preview.tsx` / `screen-confirm.tsx`：
  - 显示“第 N 次分队”、该轮窗口、该轮分组；
  - 第 2 轮确认时显示“两轮合计预算/时间”或至少提示预算聚合；
  - 取消按钮按轮次权限与后续轮次规则显示。
- `graph-model.ts`：
  - 输入从单窗口改为 `rounds[]`；
  - 行序列：共享主线 → 第 1 轮 fork → A/B 分支 → 第 1 轮 join → 共享主线 → 第 2 轮 fork → A/B 分支 → 第 2 轮 join → 共享主线；
  - `forkRow/joinRow` 变为每轮一组；
  - join 与下一轮 fork 同站时合并为一个“会合/立即再分头”节点，避免重复。
- `team-route-graph.tsx`：
  - 为每轮画独立的 branch span 和 fork/join 曲线；
  - 保持 A 右、B 左、主线中；
  - 轮次标签/徽标区分第 1/2 次；
  - 图可能变长，考虑折叠/轮次筛选（但总览默认应能看到两轮）。
- `node-detail.ts` / `node-detail-sheet.tsx`：
  - `fork/join/branch` 行需要携带 `roundIndex`，详情标题显示轮次；
  - 当前详情是 mock，不阻塞主流程，但不要显示错轮次。

### 6.9 个人路线与仪表盘

- `personal-route.ts`：
  - `derivePersonalRoute` 改为按轮次循环：
    1. 第 1 轮分头前的主线共享段；
    2. 第 1 轮：该成员在第 1 轮所在组；A 组走主线窗口站，B 组活动居中；
    3. 第 1 轮会合 → 第 2 轮分头之间的共享段（若同站则为空）；
    4. 第 2 轮：该成员在第 2 轮所在组；
    5. 第 2 轮会合之后的主线共享段。
  - 不要重复会合站/分头站；同一站既是 join 又是 fork 时只出现一次。
  - 成员两轮组别不同时，个人路线要分别标注（建议 `ScheduleItem` 增加 `roundIndex`，保留 `groupLabel` 为 A/B）。
  - 任何一轮缺路线/缺时长时按“待确认”处理，不造假时间。
- `useTripOverview` / `TripDetails`：
  - 使用轮次列表；个人路线用新的多轮派生。
- `dashboardProgress.ts`：
  - `split` 聚合状态：任一轮 active → active；所有非取消轮次 confirmed 且至少一轮 → confirmed；只有 cancelled → cancelled；无轮次 → absent；
  - 文案可显示“已确认（2 轮）”；`destination` 仍指向 `/split`。

### 6.10 测试

后端建议新增/更新：

- `SplitRoundStartApiTest`：第 1 轮未确认、已有第 2 轮、第 3 轮、成员不足、非成员、取消后重建。
- `SplitRoundBoundaryApiTest`：第 2 轮分头早于/等于/晚于第 1 轮会合；`FROM_START` 拒绝；窗口非正；主线外节点。
- `SplitRoundAssignmentApiTest`：第 2 轮改组不影响第 1 轮；两轮分组独立；重复/空组/未分配。
- `SplitRoundRouteApiTest`：第 2 轮 A 沿主线、B 不同活动、`plan_node` 分支 id、互不删除。
- `SplitRoundConfirmCancelApiTest`：第 2 轮独立确认；第 1 轮有第 2 轮时不可取消；第 2 轮确认后只删第 2 轮；出发后拒绝。
- `SplitRoundBudgetApiTest`：两轮共享费用只算一次；成员换组后费用按轮归属；硬预算聚合拦截第 2 轮确认。
- `SplitRoundDetailApiTest`：轮次列表、指定轮详情、旧单轮数据兼容。
- `SplitRoundsMigrationTest`：旧行迁移为 round 1；旧 `split-a/b` 迁移为 `split-r1-*`；唯一约束生效。
- 更新现有测试：`SplitDraftStartApiTest`、`SplitBoundaryApiTest`、`SplitAssignmentApiTest`、`SplitRouteGenerationApiTest`、`SplitRouteEditApiTest`、`SplitConfirmApiTest`、`SplitCancelApiTest`、`SplitDraftDetailApiTest`、`AbstractSplitApiTest`（清理逻辑按轮次）。

前端建议新增/更新：

- `graph-model` 多轮行序列、join=fork 合并、FROM_START 第 1 轮 + 第 2 轮。
- `personal-route` 多轮拼接、成员换组、同站不重复、缺时长待确认。
- `team-route` 多轮 SVG 路径（至少快照/结构断言）。
- 路由参数与重定向。
- `typecheck`、`test:unit`、`build`。

### 6.11 规格与文档

- 新建 `openspec/changes/us-096-second-split/`（proposal、design、delta spec、tasks），因为这是新能力，不能用“实现先行”绕过 spec-first。
- `openspec/specs/splits/spec.md`：
  - Purpose 从“唯一拆分草稿”改为“每轮一份草稿、按轮次顺序”；
  - 链级约定：`split_draft` 唯一键改为 `(trip_id, round_index)`；
  - 新增 `Requirement: Split rounds`；
  - 更新 `Split draft start`、`Split boundary selection`、`Group route generation`、`Split confirmation`、`Split draft cancellation`、`Member group assignment` 的适用轮次语义；
  - 明确第 1 轮兼容与旧数据迁移。
- `requirement-workspace/requirements/US-096.md`：六字段条目、In/Out scope、AC、Open questions。
- `requirement-workspace/registry.md`、`deep-dive.md`、`impact-brief.md` 视需要更新。
- 如需 UI 参考，`ui-design-reference/screenshots/` 目前没有二次分队屏，需要新增设计或明确复用现有四步。

---

## 7. 必须拍板的问题（带建议）

| id | 问题 | 选项 | 建议 | 影响 |
|---|---|---|---|---|
| Q1 | 数据模型 | 每轮一行 / 单行 rounds[] / 新表 | 每轮一行 | 决定迁移、API、状态机复杂度 |
| Q2 | 第 2 轮初始分组 | 复制第 1 轮 / 全员 A | 复制第 1 轮 | 影响 US-040 初始分组语义与 UI |
| Q3 | 第 2 轮边界模式 | 仅 MIDDLE / 也允许 FROM_START | 仅 MIDDLE | `FROM_START` 对第 2 轮没有“行程起点”语义 |
| Q4 | 分头站是否可等于第 1 轮会合站 | 允许 / 必须严格在后 | 允许 | 允许“会合后立即再分头”，图需合并节点 |
| Q5 | 最多轮次 | 2 / N | v1 为 2，模型预留 N | 影响接口上限与 UI |
| Q6 | 第 2 轮确认时预算 | 只算第 2 轮 / 两轮聚合 | 两轮聚合 | 预算按人/整趟，分开算会漏超支 |
| Q7 | 取消第 1 轮时已有第 2 轮 | 拒绝 / 级联取消 | 拒绝 | 避免误删后续已确认安排 |
| Q8 | 第 2 轮取消后重建 | 同轮次号重建 / 新轮次号 | 同轮次号重建 | 保持最多 2 轮与轮次稳定 |
| Q9 | 主线站点编辑后的失效范围 | 只失效 active 轮 / 所有轮 | 只失效 active 轮 | 已确认轮次冻结；若要全失效需单独立项 |
| Q10 | API 形态 | 轮次子资源 / 旧路径 + round 参数 | 轮次子资源 + 旧端点兼容第 1 轮 | 影响前端路由与测试迁移 |
| Q11 | 总览图 | 多窗口一张图 / 轮次切换单窗口 | 多窗口一张图，必要时可折叠 | 直接影响 `graph-model`/SVG 复杂度 |
| Q12 | 个人路线标注 | `roundIndex` + A/B / 改成 A1/B1 | `roundIndex` + A/B | 后端组键保持 A/B，避免大改 |
| Q13 | 第 2 轮 B 组活动 | 与第 1 轮同一夹具 / 轮次感知换活动 | 轮次感知 | 演示不重复，需改 provider 接口 |
| Q14 | 第 2 轮发起时机 | 任意时刻（只要第 1 轮 confirmed）/ 必须在其会合前/后 | 任意时刻 | 不做额外 now 门禁，保留计划能力 |
| Q15 | 成员是否可某轮不参加 | 不允许 / 允许 | 不允许 | 与现有“全员恰好一次”一致 |
| Q16 | 第 2 轮 `mainPlanVersion` | 必须与第 1 轮一致 / 允许新版本 | 必须一致 | 主线确认后不可重生成，保持一致最简单 |

---

## 8. 验收场景草案

| id | 场景 | 期望 |
|---|---|---|
| AC1 | 第 1 轮全流程 | 与现有行为完全一致（含 `FROM_START`、单轮接口、单轮数据） |
| AC2 | 第 1 轮未确认时发起第 2 轮 | `409 SPLIT_PREVIOUS_ROUND_NOT_CONFIRMED`，不创建第 2 轮 |
| AC3 | 第 1 轮 confirmed 后发起第 2 轮 | `201`，第 2 轮 `active`、`draftVersion = 1`、分组预填第 1 轮 |
| AC4 | 第 2 轮分头早于第 1 轮会合 | `400 BOUNDARY_BEFORE_PREVIOUS_REUNION`，不写入 |
| AC5 | 第 2 轮分头等于第 1 轮会合 | 允许保存；窗口为正时成功 |
| AC6 | 第 2 轮传 `FROM_START` | `400 INVALID_ROUND_MODE`，不写入 |
| AC7 | 第 2 轮重新分组 | 第 2 轮 `groups` 变化，第 1 轮 `groups` 逐字不变 |
| AC8 | 第 2 轮改组后生成路线 | A 沿该轮主线窗口，B 使用不同活动；`plan_node` 为 `split-r2-a/b`；第 1 轮行不变 |
| AC9 | 第 2 轮时间窗校验 | 使用第 2 轮窗口；超窗/缺输入按现有 `SPLIT_TIMING_INFEASIBLE` 规则 |
| AC10 | 第 2 轮确认 | 组织者可独立确认；第 1 轮保持 confirmed；第 2 轮冻结 |
| AC11 | 第 2 轮 active 取消 | 发起人可取消；第 1 轮不变；可在同轮次号重建 |
| AC12 | 第 1 轮 confirmed 且有第 2 轮时取消第 1 轮 | `409 SPLIT_LATER_ROUNDS_EXIST`，两轮都不变 |
| AC13 | 第 2 轮 confirmed 且未出发时组织者取消 | 只删第 2 轮 `plan_node`；第 1 轮保留 |
| AC14 | 第 3 轮 | `409 SPLIT_ROUND_LIMIT_REACHED` |
| AC15 | 个人路线（同一成员两轮同组） | 共享段 + 第 1 轮组路线 + 中间共享段 + 第 2 轮组路线；无重复站点 |
| AC16 | 个人路线（成员两轮换组） | 第 1 轮按 A、第 2 轮按 B 展示；轮次可区分 |
| AC17 | 队伍路线图 | 两轮 fork/join 都可见；join 与 fork 同站时只画一个合并节点 |
| AC18 | 仪表盘 | 两轮都确认显示“已确认（2 轮）”/等价聚合；第 2 轮进行中显示 active |
| AC19 | 预算 | 两轮共享费用只算一次；成员换组后费用按轮归属；第 2 轮确认按两轮总额拦截硬超支 |
| AC20 | 旧数据迁移 | 旧单轮草稿迁移为第 1 轮；旧 `split-a/b` 节点迁移为 `split-r1-*`；旧接口仍可读第 1 轮 |
| AC21 | 主线站点编辑 | 只失效 active 轮的路线；已确认轮次保持只读 |
| AC22 | 成员不足 | 少于 2 人时第 1/2 轮均 `409 SPLIT_MEMBERS_INSUFFICIENT` |

---

## 9. 非目标（v1）

- 3 支及以上队伍（C 组）。
- 超过 2 轮。
- 某一轮允许成员“不参加/待定”。
- 两轮窗口重叠。
- 多日行程按天分段；主线仍是单日。
- 真实路网/地图算路；B 组仍用夹具或 AI provider。
- 每轮使用不同的主线版本。
- 修改邀请、主线确认、成员加入等既有链路。
- 引入第二套 UI 组件库。

---

## 10. 风险与集成顺序

1. **US-095 未合入 main**：当前新分支已从 US-095 HEAD 切出，但缺少 main 的 36 个提交（AI provider、预算、V15–V17、站点费用/坐标、US-090 失效监听）。
   - 推荐：先把 US-095 合入 `group1/main`，再从 main 切 US-096。
   - 备选：保留当前分支，实现前 rebase 到 main；冲突点见 3.5。
2. **SQLite 表重建**：`split_draft` 的 UNIQUE 约束不能直接改；迁移必须可重复、可回滚（至少可重跑），并验证外键/索引。
3. **范围膨胀**：多轮 + 每轮重新分组 + 预算聚合 + 多窗口图 + 个人路线拼接，工作量远大于 US-095；建议按“数据/API → 第 2 轮发起/边界 → 分组/路线 → 确认/取消 → 图/个人路线/预算 → 迁移兼容”分阶段。
4. **测试面广**：现有 10 个后端 API 测试、3 个前端 node 测试、规格/夹具都假设单轮；必须同步更新，否则“全绿”不代表多轮正确。
5. **语义冲突**：`status` 是轮次级还是行程级、`draftVersion` 是轮次级还是行程级、`GET /split-draft` 返回哪一轮，这三个问题必须在写代码前定死。
6. **预算**：如果 main 的 US-045 已合入，多轮共享费用/换组费用的算法是本任务最容易出错的部分；建议先写纯领域测试再改服务。
7. **演示数据**：`scripts/demo-seed.py` 目前按单轮造数；需要增加“两轮已确认”夹具，否则演示无法走通。

---

## 11. 请 Opus 最终输出

请按以下顺序回答，尽量具体到类/端点/字段/迁移号：

1. **结论**：数据模型选型与一句话理由。
2. **决策表**：对第 7 节 Q1–Q16 给出选择与理由；不同意的直接反驳。
3. **数据模型**：表结构、唯一约束、迁移 SQL 草案、`plan_node` 分支 id 方案。
4. **API 合同**：端点、请求/响应 JSON、错误码、旧接口兼容策略。
5. **领域规则**：第 2 轮顺序、模式、分组、预算、取消、冻结的判定表。
6. **前端信息架构**：路由、总览页、四步流程、图、个人路线、仪表盘。
7. **分阶段任务**：每阶段可独立验证的产出与测试。
8. **风险清单**：按严重度排序，给出规避方案。
9. **更简单的替代方案**：如果认为“每轮一行 + 独立确认”过重，给出能接受的最小方案及取舍。

---

## 12. 附：当前分支操作记录

- 已执行 `git fetch group1 --prune`。
- 本地 `main` 已快进到 `group1/main` `bc13608`（`0 / 0` 差异）。
- 已从 `US-095-split-boundary-modes` HEAD `10fcfb3` 切出新分支 `US-096-second-split`。
- 新分支与 `group1/main` 的关系：`36 behind / 3 ahead`（3 个是 US-095 提交）。
- 本文只做设计分析，没有改生产代码。
