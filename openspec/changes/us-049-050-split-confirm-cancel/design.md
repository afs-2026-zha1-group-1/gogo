# Design — us-049-050-split-confirm-cancel

- Change: `openspec/changes/us-049-050-split-confirm-cancel/`（US-049 确认 / US-050 取消）
- Delta: `specs/splits/spec.md`（7 requirement / 51 场景；G1 Pass，C7 closed）
- 约束基线：无新表无新迁移；沿用 `split_draft`（`trip_id` UNIQUE）与 `plan_node`；SQLite 池=1；`{data,error}` 包封套；`X-User-Id` 信任模型

## D1 分层与职责

- **Context**：既有 splits 包为 Controller（薄）→ Service（编排/事务）→ Repository（JdbcTemplate）→ domain（纯模型）；Rules 要求 orchestration-execution 分离与层边界。
- **Decision**：新增逻辑仍落在同一四层：`SplitDraftController` 增两个端点（只做头/路径/体解析 + 委托）；`SplitDraftService` 增 `confirm` / `cancel` 编排与事务；`SplitDraftRepository` 增组织者查询、状态 CAS 更新、路线清除；domain 只加纯状态迁移方法。错误明细体属于 `common` 共享内核，不下沉到 splits。
- **Alternatives**：新建 `SplitConfirmationService`（重复守卫与事务样板）；把状态机放 Controller（破坏层边界）；先引入新模块包（当前规模无需）。
- **Consequences**：改动面集中在既有 4 个类 + 2 DTO；`ErrorCode` 扩展一次性影响三处（枚举、handler、测试）。

## D2 错误包封套扩展 `error.details`

- **Context**：现 `ApiResponse.ApiError(code,message)` 无明细容器；IO-5 要求逐路线明细与缺失项可表达。
- **Decision**：`ApiError` 增第三字段 `Map<String,Object> details`（可空）；`ApiException` 增可选 `details` 构造；`GlobalExceptionHandler` 透传，失败响应仍 `data=null`。契约形状：
  - `SPLIT_TIMING_INFEASIBLE` → `details.routes[]`：定长 2、按 A/B 顺序，每项 `{groupLabel,totalMinutes,overrunMinutes,missingInputs}`；
  - `SPLIT_DRAFT_INCOMPLETE` → `details.missing[]`：`boundaries` / `routes` / `routes.A` / `routes.B`。
  - `details` 缺失不影响 `code` 判定；`code` 仍是唯一契约。
- **Alternatives**：新增第二套错误体类型（前端要两套解析）；把明细塞进 `message`（不可机器读取）；不给明细（CF2-N/CF3-N/CF7-N 不可断言）。
- **Consequences**：既有 13 码响应体多一个 `null` 字段（向后兼容，不破坏 JSON 消费）。

## D3 错误码 +3 与状态映射

- **Decision**：

  | code | HTTP | 语义 |
  |---|---|---|
  | `NOT_SPLIT_ORGANIZER` | 403 | 成员但非组织者调用确认 |
  | `SPLIT_TIMING_INFEASIBLE` | 409 | 复算超窗或输入缺失（附 `details.routes[]`） |
  | `SPLIT_DRAFT_INCOMPLETE` | 409 | 边界/路线不齐（附 `details.missing[]`） |

  既有码复用：`MEMBER_REQUIRED` 401、`TRIP_NOT_FOUND` 404、`NOT_A_MEMBER` 403、`NOT_SPLIT_INITIATOR` 403、`STALE_DRAFT_VERSION` 409、`SPLIT_DRAFT_NOT_ACTIVE` 409、`SPLIT_DRAFT_CONFLICT` 409、`SPLIT_BOUNDARIES_REQUIRED` 409、`INVALID_ROUTE_PAIR` 400。
- **Alternatives**：用 `SPLIT_DRAFT_NOT_ACTIVE` 兼表「不完整」（错误语义混淆）；用 422 表达不可行（项目主计划用 422 `VALIDATION_FAILED`，但此处是草稿状态冲突，409 更贴合且与既有 splits 码一致）。
- **Consequences**：G1 C2 已由 IO 批准 +3；P5 需同步 `tech-stack-plan`。

## D4 状态机与单一真源

- **Context**：`status` 在 `document` JSON 内；`draft_version` 是列。C8 要求 CAS 且列版本不变。
- **Decision**：
  - 状态集 `active` / `confirmed` / `cancelled`；合法迁移 `active→confirmed`、`active→cancelled`、`cancelled→active`（重建）；`confirmed→*` 禁止。
  - **单一真源** = `split_draft.document.status`；列 `draft_version` 只表达「草稿内容版本」用于 CAS，确认/取消**不改列版本**。
  - CAS SQL 使用 SQLite JSON1：`WHERE trip_id=? AND draft_version=? AND json_extract(document,'$.status')='active'`（确认/取消），重建用 `... json_extract(document,'$.status')='cancelled'` 且 `SET draft_version=1`。
- **Alternatives**：新增 `status` 列（需迁移，违反 Non-Goals）；用应用层先读后写（池=1 下可行但无法防迟到请求，CN6-N 会失效）。
- **Consequences**：依赖 SQLite JSON1（3.9+ 内置，本项目 Dockerless 嵌入式版本满足）；`json_extract` 出现在两条 SQL 中，需 UT-3 覆盖。

## D5 确认编排（US-049）

- **Decision**（顺序固定）：守卫（身份→行程→成员）→ **组织者**（`NOT_SPLIT_ORGANIZER`）→ 读草稿（无行 → `SPLIT_DRAFT_NOT_ACTIVE`）→ `status` 必须 `active`（否则 `SPLIT_DRAFT_NOT_ACTIVE`）→ `draftVersion` 与请求一致（否则 `STALE_DRAFT_VERSION`）→ **完整性**：两侧边界非空且 `routes` 同时含 `A`、`B`（否则 `SPLIT_DRAFT_INCOMPLETE` + `missing[]`）→ **复算**：窗口 = 出发 stop `end_at` → 会合 stop `start_at`（从 `plan_node branch_id='main'` 按草稿 `mainPlanVersion` 读），每条路线映射为可空 `RouteTimingInput` 交 `ReunionTimingCalculator`（复用，不读库）→ 任一 `feasible=false` → `SPLIT_TIMING_INFEASIBLE` + `details.routes[]` → 否则 CAS 更新 `document.status='confirmed'`（版本不变，`updated_at` 前进）→ 返回详情投影。
- **Alternatives**：信任客户端 `confirmable`（CF2-N 明确反例）；引用 `check-timing` 响应（未持久化）；确认时重写 `plan_node`（无必要，路线已在生成时落库）。
- **Consequences**：确认路径读库仅限守卫 + 草稿 + 主线 stops；无写库除状态更新。

## D6 取消编排（US-050）

- **Decision**：守卫 → 读草稿（无行 → `SPLIT_DRAFT_NOT_ACTIVE`）→ `status=active` → **发起人**（`NOT_SPLIT_INITIATOR`）→ 版本一致（`STALE_DRAFT_VERSION`）→ 单事务：①CAS 更新 `status='cancelled'` 且 `document.routes=null`（版本不变）；②`DELETE plan_node WHERE trip_id=? AND branch_id IN ('split-a','split-b')`；③提交。返回详情投影（`routes=[]`）。
- **Alternatives**：保留 split 节点但详情过滤（幽灵数据留在库里，与「取消=放弃」语义不符）；删除 `split_draft` 行（丢审计语义，BQ-3 已否）。
- **Consequences**：取消后 `plan_node` 只剩 `main` 行；重建时无需清理旧节点。

## D7 发起端点扩展（重建）

- **Decision**：`startDraft` 改为三步判定：①无行 → 插入新草稿（既有路径）；②行存在且 `status=active|confirmed` → `SPLIT_DRAFT_CONFLICT`；③行存在且 `status=cancelled` → 同事务以「新文档（调用者为 initiator、`mainPlanVersion=1`、`draftVersion=1`、`status=active`、边界/路线 null）」覆盖写入，并 `SET split_draft.draft_version=1`；受影响行数 0 → `SPLIT_DRAFT_CONFLICT`（并发）。
- **Alternatives**：新建第二行（`trip_id UNIQUE` 不允许，需迁移）；保留旧版本号（S8 明确重置 1）。
- **Consequences**：`split_draft.draft_version` 列与文档版本在重建后都回到 1；并发重建由条件更新兜底（S9-N）。

## D8 可空时长模型

- **Context**：`RouteDurations(int,int,int)` 与 `GroupRoute(int,int,int)` 为 primitive，JSON `null` 落为 0 → CF3-N 不可达（IO-2）。
- **Decision**：`SplitDraftDocument.RouteDurations` 与 `GroupRoute` 三处时长改 `Integer`（可空）；`travelLegsMinutes` 元素类型保持 `Integer`。到 `RouteTimingInput` 的映射原样透传 null，交由 `ReunionTimingCalculator` 报 `missingInputs`。
- **Alternatives**：用哨兵值 `-1`（与业务值混淆）；另建 missing 位图（过度设计）。
- **Consequences**：`GroupRoute` 为 API 投影，`null` 会出现在生成/详情响应中——前端已渲染分解字段，需容忍 null（P4 补展示）；既有 `SplitRouteGenerationApiTest` 断言改为数值不变、类型放宽。

## D9 详情投影（含终态）

- **Decision**：`getDraftDetail` 保持读取文档；`routes` 从 `document.routes` 构建，名称仍从 `plan_node(split-*)` 取：若节点缺失（取消后）则 `activityName=null` 且 `routes` 为空数组（因为 `document.routes` 已清空）。`status` 原样返回，`confirmed` 返回已存路线，`cancelled` 返回 `routes=[]`。
- **Alternatives**：取消时保留 `document.routes` 并用 `status` 过滤（双真源）；从 `plan_node` 反推路线（取消后为空，无法复原）。
- **Consequences**：D1b 可断言；无幽灵路线。

## D10 组织者与发起人判定

- **Decision**：组织者 = `trip.organizer_id`；新增 `repository.findOrganizerId(tripId)`（`Optional<String>`），比较 `X-User-Id`。发起人为 `document.initiatorMemberId`。两者校验均在守卫之后、状态读取之前/之后按 D5/D6 顺序。
- **Alternatives**：复用 `trip_member` 角色列（当前 schema 无角色列，需迁移）。
- **Consequences**：`findOrganizerId` 为空（数据异常）→ 按非组织者拒绝（403）。

## D11 并发、幂等与重试语义

- **Decision**：所有状态写入走 CAS（D4）；池=1 序列化写；重复确认/取消在 `status` 非 `active` 时返回 `SPLIT_DRAFT_NOT_ACTIVE`（非幂等 200）；客户端收到 409 应重新 `GET` 判定是否已成功（C10，P4 前端实现）。
- **Alternatives**：把重复确认做成幂等 200（与 CF6-N 冲突）；分布式锁（单进程单库无必要）。
- **Consequences**：并发确认/取消至多一个成功；CN6-N 覆盖迟到取消。

## D12 前端结构

- **Decision**：
  - 新增 `frontend/src/features/split/screen-confirm.tsx`，路由 `/trips/:tripId/split/confirm`（14 → 15 的自然延伸；Screen 14 底部动作改为「复核并确认」）。
  - `api.ts` 增 `confirmSplitDraft(tripId, draftVersion)` / `cancelSplitDraft(tripId, draftVersion)`；`types.ts` 增 `SplitDraftStatus` 与 `SplitErrorDetails`；`hooks.ts` 增两个 mutation（成功后失效草稿查询）。
  - 展示：两条路线卡（分组、活动、活动/交通/buffer 分解、合计 vs 窗口）、边界与窗口、状态徽标；确认按钮仅 organizer + `active` 可见；取消动作仅 initiator + `active` 可见；错误按 `error.details` 渲染；四态齐全。
  - Screen 11 按 `status` 分支（无草稿/cancelled → 发起替换，active → 下一步，confirmed → 只读终态）。
- **Alternatives**：把确认并入 Screen 14（用户需要复核页，截图 15 存在）；新开独立页面栈（无必要）。
- **Consequences**：`router.tsx` 注册一条路由；Screen 14 的「本期不含确认」注释需更新。

## D13 下游读模型（C9）

- **Decision**：后续 story（US-052/058/063）判断「是否已拆分/已确认」**只读** `GET /api/trips/{tripId}/split-draft` 的 `status`：`confirmed` = 已确认拆分；`active` = 拆分进行中；`cancelled` 或 `data=null` = 未拆分。禁止按 `split_draft` 行是否存在判定（行在 cancelled 后仍保留）。
- **Alternatives**：下游直接读库/读 `plan_node`（越层且会踩幽灵节点）。
- **Consequences**：本变更不改下游代码，仅在 P5 文档与后续 story 中约束。

## D14 测试接缝

- **Decision**：测试通过既有 `AbstractSplitApiTest` 基类（真实 SQLite、Flyway、`@BeforeEach` 重置）；需要构造超窗/缺输入/不完整状态时，用测试内 `JdbcTemplate` 改写 `split_draft.document` JSON（test-only，与 REQ-004/US-031-037 先例一致）。Repository 新增 SQL 由 `Ut` 级测试（P4）直接验证 CAS 行为（受影响行数）。
- **Alternatives**：为测试加隐藏写接口（污染产品契约）。
- **Consequences**：JSON 改写依赖 D8 的可空模型（null 可被 Jackson 读回）。

## D15 Schema 不变

- **Decision**：不新增迁移；`split_draft` 与 `plan_node` 结构不变；`V1–V5` 序列不动。
- **Consequences**：无 Flyway 撞版本风险；P4 需有 schema 断言（列集合与迁移计数）防止误加。

## D16 反向自检（Non-Goals）

- 不加表/列/迁移；不改主线 `plan_node(main)`；不允许 confirmed 再编辑；不保留拆分历史；不做真实鉴权；不新增通知；不动 greeting/trips/invitations/mainplan 行为与 CI 结构。
