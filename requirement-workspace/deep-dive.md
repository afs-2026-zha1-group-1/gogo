# Deep-dive — Phase 2.5

Trigger: impact solution direction is **add** (new capability, greenfield repo).

## REQ-001

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` | One row per greeting message; this change seeds exactly one row, `id = 1` | `id` INT PRIMARY KEY; `message` VARCHAR(255) NOT NULL | None. Static seed written by migration `V1__create_greeting.sql`; no create/update/delete path is in scope. |

Ownership: the backend service owns the table and the migration. The frontend
never reads the database directly. No `{TBD}` fields remain.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| Database file absent at startup | in | Created automatically by the embedded engine, then migrated |
| Database file already migrated | in | Migration is a no-op on subsequent starts (idempotent) |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior; no defensive branch is specified |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; it must not fall back to a hard-coded greeting |
| Concurrent writers | out of scope | Single seeded row, read-only API |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-001 is the only requirement in the registry. No cross-REQ conflict exists;
nothing to converge. Recorded as N/A with rationale rather than left blank.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message`, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, proxied by the dev server |
| Home page failure message | Endpoint request fails or returns non-2xx | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

Retention, volume and SLA are not decidable for a scaffold slice and are not
required by any AC. Recorded as a non-blocking item for Dev, not invented.

## REQ-002

Trigger: impact solution direction is **modify** (one requirement of the existing
`greeting` capability changes). The IO rulings of 2026-11-13 close REQ-001's
OQ-2/OQ-3/OQ-4 and reopen the data contract and the wire contract.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `greeting` (storage) | One row per greeting message; exactly one row seeded, `id = 1` | `id` INTEGER PRIMARY KEY; `message` TEXT NOT NULL — SQLite dialect, replacing the H2 `INT` / `VARCHAR(255)` | None. Static seed written by `V1__create_greeting.sql`; no create/update/delete path is in scope. |
| Greeting response (wire) | One JSON object per `GET /api/greeting` call | `message`: string, required, the stored value verbatim. No other field. Media type `application/json` | None. Read-only projection of the single stored row. |

Ownership unchanged: the backend owns the table, the migration and the response
shape; the frontend never reads the database directly. No `{TBD}` fields remain.
The JSON field name `message` is fixed by the IO ruling, not chosen by Dev.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Seeded row present | in | Migration guarantees it on first start; repository reads `id = 1` |
| SQLite file absent at startup | in | Created by the JDBC driver on first connection, then migrated by Flyway |
| SQLite file already migrated | in | Flyway records the applied version in `flyway_schema_history`; a later start is a no-op |
| Response body is not the ruled JSON shape | out of scope | The endpoint is the only producer and its shape is fixed by the delta spec; no defensive branch is specified |
| Row missing / table empty | out of scope | No write API exists, so this state cannot be reached through in-scope behavior |
| Backend unreachable from the browser | in (reverse case AC3-N) | Frontend renders a load-failure message; unchanged from REQ-001 |
| Non-JSON body with a 200 status (e.g. a dev-server fallback page) | in | `response.json()` rejects and the existing `.catch` renders the load-failure message; no new branch is needed |
| Concurrent writers | out of scope | Single seeded row, read-only API. SQLite locking under the test connection pool is a design concern, not a product branch |
| Migrating existing H2 rows | out of scope | `backend/data/` is gitignored dev state with a constant seed (OQ-5, resolved) |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

REQ-002 modifies REQ-001's endpoint requirement. The conflict is explicit and
resolved by the IO ruling, not by editing the archived record:

| Item | REQ-001 (archived) | REQ-002 | Convergence |
|---|---|---|---|
| Response body | exactly `Hello World`, `text/plain` | `{"message":"Hello World"}`, `application/json` | MODIFIED delta supersedes; REQ-001 archive stays immutable |
| Engine | H2 file mode | SQLite file mode | Design-level; the storage requirement is engine-agnostic, so no spec conflict |
| Migration tooling | Flyway kept under a working interpretation (OQ-2 deferred) | Flyway kept by explicit ruling | `TODO.md` line 33 amended to `- ORM`; contradiction removed |
| Visitor-visible heading | `Hello World` | `Hello World` | Identical — no display regression |

No ✗ remains.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Home page heading | Page load | Anonymous visitor | `greeting.message` read from the JSON `message` field, rendered as the page's `h1` text | `GET /api/greeting` over HTTP, `application/json`, proxied by the dev server |
| Home page failure message | Request fails, returns non-2xx, or the body cannot be parsed as JSON | Anonymous visitor | Static error text plus the failure reason; no greeting value | Same request path |

The rendered text and the failure behavior are unchanged; only the parsing step
changes. No notifications are in scope.

### NFR business-policy layer

Unchanged from REQ-001: not decidable for a scaffold slice, not required by any
AC, recorded as a non-blocking item for Dev.

## REQ-003

Trigger: impact solution direction is **add** (new `trips` capability on the
existing stack). Two stories, one aggregate, one change.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | One row per seeded traveller | `id` INTEGER PRIMARY KEY; `display_name` TEXT NOT NULL | None. Seeded by `V2`; no user API in scope |
| `trip` | One row per created trip | `id` INTEGER PRIMARY KEY AUTOINCREMENT; `name` TEXT NOT NULL; `destination` TEXT NOT NULL; `start_date` TEXT NOT NULL (ISO `YYYY-MM-DD`); `end_date` TEXT NOT NULL; `start_location` TEXT NULL; `end_location` TEXT NULL; `organizer_id` INTEGER NOT NULL REFERENCES `app_user(id)` | Created once in REQ-003; location completion belongs to US-031 under resolved OQ-6. No edit, delete or archive endpoint in this change |
| `trip_member` | One row per (trip, user) pair | `trip_id` INTEGER NOT NULL REFERENCES `trip(id)`; `user_id` INTEGER NOT NULL REFERENCES `app_user(id)`; PRIMARY KEY (`trip_id`, `user_id`) | Created with the trip for the creator only. No invite, leave or removal path is in scope |

Creation is one transaction: insert `trip`, then insert the creator's
`trip_member` row. A failure in either leaves no trip behind (this is what C2/C3
assert when they compare the row count).

Wire contract:

| Message | Fields | Notes |
|---|---|---|
| Create request | Required `name`, `destination`, `startDate`, `endDate` strings; optional nullable `startLocation`, `endLocation` strings | Dates are ISO `YYYY-MM-DD`; missing/null/blank destination rejected; unspecified locations normalize to null |
| Trip response | `id` (integer), `name`, `destination`, `startDate`, `endDate` (strings), `startLocation`, `endLocation` (string or null), `organizerId` (integer) | Same shape for `201` and for the `200` read |
| Error response | `code` (stable string), `message` (human text) | `code` values: `NAME_REQUIRED`, `DESTINATION_REQUIRED`, `INVALID_DATE`, `INVALID_DATE_RANGE`, `USER_REQUIRED`, `TRIP_NOT_FOUND`, `NOT_A_MEMBER` |

No `{TBD}` field remains.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Valid create, dates in order (equal dates allowed) | in | C1; the fixture trip uses the same start and end date |
| End date strictly before start date | out (rejected `400`) | C2 |
| Blank or whitespace-only name | out (rejected `400`) | C3 |
| Missing/null/blank destination | out (rejected `400`) | C6; `DESTINATION_REQUIRED`, no writes |
| Missing/null/blank start or end location | in | C7; stored/read as null; supplied locations preserved |
| Preference-based location completion | later US-031, outside REQ-003/004 | Resolved OQ-6: at main-plan generation use submitted member preferences for missing locations only; random locations if no preferences or suitable result; preserve user input. Owners IO Emily / SA Johnson |
| Unparseable date | out (rejected `400`) | C4-N |
| `X-User-Id` missing or not a seeded user | out (rejected `401`) | C5-N, R2-N |
| Read by a member | in | R1 |
| Read by a non-member | out (denied `403`) | R2 |
| Read of an id that does not exist | out (`404`) | R3-N |
| Trip whose only member is the organizer | in | Valid state; R1 simply is not exercised for it |
| Concurrent creates | out of scope | Each request inserts an independent row; ids come from the database, no shared state |
| Cross-trip access within one request | out of scope | The read query is scoped to the path id and the membership join |
| Edit, delete, invite, leave | out of scope | No endpoint exists |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

`trips` shares no table, endpoint or identifier with the `greeting` capability.
`req-002-greeting-json-sqlite` is still active, but it modifies `greeting` only;
the two delta specs cannot conflict and both can be applied to the Living Spec in
either order. No conflict row.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Create page | Navigating to the create route | Traveller | Six inputs (name, destination, start/end date, start/end location), a submit action, a busy state while the request is in flight, and the server `message` when the response is `400`/`401` | `POST /api/trips` |
| Details page | Opening a trip by id | Trip member | The six saved values; a loading state; the denial message on `403`; a not-found message on `404` | `GET /api/trips/{id}` |
| Details page failure | Endpoint unreachable or non-JSON response | Viewer | Static failure text plus the reason; no trip values | Same request path |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

A trip holds a handful of members; no AC states a size limit, retention rule or
SLA. Recorded as a non-blocking item for Dev, not invented.

## B 拆分主链（REQ-004~007，2026-11-15）

Trigger: impact solution direction is **add**（新能力 `splits`，四个 REQ 一个 change）。
技术基准 = 4 表精简版 tech-stack-plan（用户 2026-11-15 裁决）；身份 = `X-Member-Id`；
上游夹具自包含；draft_version 任何变更递增；**严格 4 表：不建第 5 表、不加
plan_node 列，草稿 = trip.split_draft JSON 文档**；分组存草稿 JSON；边界成对保存；
校验 = 显式快照 body 零读库；前端增量引入新栈（均为用户 2026-11-15 裁决）。
注：上方 REQ-003 段为遗留草稿（保留不提交，未生效），与本段口径冲突处按本段为准。

### ⑨ Data contract

| 概念 | 粒度 | 字段 | 状态迁移 |
|---|---|---|---|
| `trip` | 一行一行程；种子 1 行 | tech-stack-plan §5：`id`(UUID TEXT PK)、`title`、`destination`、`start_date`、`end_date`、`invite_code`(UNIQUE)、`plan_version`、`created_at`；**新增可空 `split_draft` TEXT 列（JSON 文档，B 链唯一 schema 扩展，用户裁决）** | 本期无创建/编辑端点；种子 plan_version=1、split_draft=NULL；确认态由成员 ack 谓词表达；草稿创建/变更 = 条件更新该列 |
| `trip_member` | 一行一（行程,成员）；种子 5 行（含另一行程的 Eve） | §5：`id`(PK)、`trip_id`(FK)、`display_name`、`role`(owner/member)、`plan_ack_version`、`joined_at`；UNIQUE(trip_id, display_name) | 本期无加入/退出端点；ack 值仅夹具构造两态 |
| `plan_node`（主线） | 一行一 stop；种子主线 v1 两行 | §5 全字段；`branch_id='main'`、`parent_id` 预留；**不加列**（用户裁决） | 本期主线只读 |
| 拆分草稿（trip.split_draft JSON 文档，非独立表） | 每 trip 至多一份活跃文档 | 文档字段：`initiatorMemberId`、`mainPlanVersion`、`draftVersion`(从 1 起)、`status`(active/cancelled)、`departureStopId`(可空)、`reunionStopId`(可空)、`groups`（`{"A":[memberId…],"B":[memberId…]}`）、`createdAt`、`updatedAt`；活跃唯一 = 每 trip 至多一份文档 + 条件更新（撞车即 409） | active 创建（REQ-004）→ 边界/分组/路线变更使 draftVersion+1（REQ-005/006）→ cancelled 归 US-050（本期不实现，状态值预留） |
| 分组（草稿文档 groups 字段） | 每草稿一份；成员不跨组、两组齐全 | 组标签 A/B + 成员 id 列表；物理载体 = 草稿 JSON（用户裁决，不建独立表）；约束由服务层校验 | 夹具供给初始值；变更→draftVersion+1 |
| `plan_node`（分组路线） | 一行一路线节点；每草稿恰两条活动节点（+起终点引用） | 同主线字段，**不加列**；`branch_id='split-a'/'split-b'`，按 trip_id 归属当前活跃草稿；`plan_version`=草稿 mainPlanVersion；活动时长/交通段/buffer 存结构化 JSON 字段（activityMinutes、travelLegsMinutes[]、bufferMinutes，复用 §5 「结构化字段 TEXT 存 JSON」约定） | 成对单事务写入（REQ-006）；失败整对回滚；重生成同事务先删旧对再写新对 |
| 时间校验快照（wire） | 一次校验一份；恰两条路线 | 入参：`windowMinutes` + `routes[2]{groupLabel, activityMinutes, travelLegsMinutes[], bufferMinutes}`；出参：逐路线 `totalMinutes`、`overrunMinutes`、`missingInputs[]` + 整对 `feasible` | 无持久化（Database: No）；纯计算 |

所有权：后端独占全部表与迁移（V2 起：四表 + trip.split_draft 列 + 种子；member_preference 本链无需种子）；前端不直读数据库。
无 `{TBD}` 字段；存储载体类裁决已全部落地（OQ-N2/N5 resolved）。

### ⑩ Boundary enumeration

| 分支 | In / out | 归属 |
|---|---|---|
| 主线已确认 + 无活跃草稿，成员发起 | in | REQ-004 S1；确认谓词 = 全员 ack = plan_version |
| 并发发起 | in | REQ-004 S2；每 trip 至多一份草稿文档 + 条件更新，撞车→409 SPLIT_DRAFT_CONFLICT |
| 主线未确认 | out（拒 409） | REQ-004 S3-N；MAIN_PLAN_NOT_CONFIRMED |
| 非成员 / 缺失身份 / 未知行程 | out（拒 403/401/404） | REQ-004 S4-N/S5-N/S6-N；链级通用身份契约 |
| 重复发起（已有活跃草稿） | out（拒 409） | REQ-004 S7 |
| 主线内 stop 成对选择且窗口为正 | in | REQ-005 S1；出发=end_at、会合=start_at |
| 非正窗口 | out（拒 400） | REQ-005 S2-N；已存边界与版本不变 |
| 主线外节点 | out（拒 400） | REQ-005 S3-N；不创建无关会合点 |
| 非发起人编辑 / 无活跃草稿 / 过期版本 | out（拒 403/409/409） | REQ-005 S4-N/S5-N/S6-N |
| 半边界（只选其一） | out of scope | OQ-N4 resolved：成对保存，不开放半边界（用户裁决） |
| 边界/分组齐全，fake 候选生成 | in | REQ-006 S1；单事务成对保存 |
| 一组生成失败 | out（整对回滚） | REQ-006 S2-N；ROUTE_GENERATION_FAILED，无半成品对 |
| 生成期间草稿变版 | out（拒 409） | REQ-006 S3-N；条件更新 draft_version，STALE_DRAFT_VERSION |
| 无边界生成 / 非发起人生成 | out（拒 409/403） | REQ-006 S4-N/S5-N |
| 分组移动 UI 控件 | out of scope | issue 明示可选；后端变更→版本递增语义仍成立 |
| 两路线均含全部输入且不超窗 | in | REQ-007 S1；feasible=true |
| 任一路线超窗 | out（整对不可确认） | REQ-007 S2-N；overrunMinutes 显式给出 |
| 任一输入缺失 | out（整对不可确认） | REQ-007 S3-N；missingInputs 逐项列出，不得呈现为通过 |
| 快照非法（空/路线数≠2） | out（拒 400） | REQ-007 S5-N；INVALID_ROUTE_PAIR |
| 确认/取消拆分 | out of scope | US-049/US-050；本期只输出校验结论与预留 cancelled 状态 |
| 真实认证/签名校验 | out of scope | DR-05；X-Member-Id 按给定值信任 |

每个场景引用的分支均有行。

### ⑪ Cross-REQ consistency

| 项 | 涉及 REQ | 收敛 |
|---|---|---|
| 身份契约 X-Member-Id | 004~007 | 统一；用户裁决 OQ-2 |
| draft_version 语义 | 005/006（004 创建从 1 起） | 任何变更递增；条件更新防 stale；用户裁决 OQ-5 |
| 边界→生成→校验数据流 | 005→006→007 | 边界存 trip.split_draft JSON；路线存 plan_node(branch_id=split-a/b)；校验消费显式快照 body（零读库），字段同源 |
| 错误码与包封套 | 004~007 | 统一 {data,error}；code 表见夹具 B 链段；无重名冲突 |
| 与 REQ-003 草稿的 trips 口径 | 004 vs REQ-003（未立项） | ✗→已收敛：用户 2026-11-15 裁决 B 链按 tech-stack-plan（UUID id、invite_code、X-Member-Id）；REQ-003 草稿口径作废待对齐（OQ-N1，owner IO/SA）；REQ-003 非活跃 change，不构成 Living Spec 冲突 |
| 与 greeting 能力 | 无 | 无共享表/端点；V1 迁移不动，B 链从 V2 起；前端 greeting 页保持 JSX（增量新栈裁决） |
| 与未来 US-037/049/050 | 004/007 | 确认谓词、校验结论、cancelled 状态均预留契约；对齐事项 OQ-N1/N7（non-blocking，owner 已指） |

无未收敛 ✗。

### ⑫ Notification / display contract

| 表面 | 触发 | 接收者 | 内容 + 展示字段 | 通道 |
|---|---|---|---|---|
| Screen 11 发起拆分 | 成员点击发起 | 行程成员 | 草稿状态（initiator、mainPlanVersion、draftVersion）；冲突/未确认/无权限错误态；loading/empty | POST /api/trips/{tripId}/split-draft |
| Screen 12 边界选择 | 发起人选择 stop | 拆分发起人 | 出发/会合 stop 名 + 时刻 + 窗口分钟数；非正窗口/主线外错误态；loading/empty/permission | PUT …/split-draft/boundaries + 草稿详情读 |
| Screen 13 分组路线 | 发起人点击生成 | 拆分发起人 | 成对路线（组标签、活动名、起终点、时长分解）；失败/过期错误态；loading/empty/permission | POST …/split-draft/routes:generate |
| Screen 14 窗口校验 | 成员点击校验 | 行程成员 | 逐路线 activity/travel/buffer 分解 + totalMinutes；通过/超窗（overrunMinutes）/缺输入（missingInputs）三态；loading/empty/permission | POST …/split-draft/routes:check-timing |

无通知（email/push/queue）；多人可见性靠轮询刷新（DR-06，P3 细化）。

### NFR business-policy layer

并发 = SQLite 单写者（池=1），无写 QPS/SLA 要求；草稿/路线无保留期策略（无软删除，
取消语义归 US-050）。记录为 Dev 的 non-blocking 项，不发明。
