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
either order. No ✗ row.

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

## REQ-004

Trigger: impact solution direction is **add** (new `invitations` capability) plus
one state requirement added to the pending `trips` capability. Three stories, one
token aggregate, one change.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `trip_invitation` | One row per trip (UNIQUE `trip_id`); created by the organizer's first issue call | `id` INTEGER PRIMARY KEY AUTOINCREMENT; `trip_id` INTEGER NOT NULL UNIQUE REFERENCES `trip(id)`; `token` TEXT NOT NULL UNIQUE | Created once per trip (get-or-create). No update, revoke or expiry path is in scope |
| `trip.main_plan_confirmed` | One boolean state per trip, added by `V3` | INTEGER NOT NULL DEFAULT 0 | 0 → 1 only by the future US-037 flow; in this change only test-only direct database setup may set it. No API transition exists |
| `trip_member` (read/write via accept) | One row per (trip, user) pair, unchanged grain from REQ-003 | unchanged | Acceptance inserts (trip, caller) once; a repeated acceptance inserts nothing |

Issuance is one transaction: select the trip's invitation; if absent, insert one
row with a freshly generated opaque token. Acceptance is one transaction: verify
token, verify joining open, insert the membership row only if absent. A rejected
acceptance leaves `trip_member` unchanged (this is what J4 asserts).

Wire contract:

| Message | Fields | Notes |
|---|---|---|
| Issue response | `token` (string), `joinPath` (string `/join/<token>`), `tripId` (integer), `tripName` (string) | `200` on first and repeated issue. The frontend composes the absolute URL from its own origin; the QR encodes that same URL |
| Preview response | `tripName`, `destination`, `startDate`, `endDate` (strings), `mainPlanConfirmed` (boolean) | No identity required. No member, itinerary or preference field exists in the shape |
| Accept response | `joined` (true), `alreadyMember` (boolean), `tripId` (integer), `tripName` (string) | `X-User-Id` required. Idempotent |
| Error response | `code` (stable string), `message` (human text) | New `code` values: `NOT_ORGANIZER`, `JOINING_CLOSED`, `INVITATION_NOT_FOUND`; reused from `trips`: `USER_REQUIRED`, `TRIP_NOT_FOUND` |

No `{TBD}` field remains.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Organizer issues, main plan unconfirmed | in | I1; token returned, one row |
| Organizer issues again | in | I2; same token, no second row |
| Member but not organizer issues | out (denied `403`) | I3; nothing created |
| Issue without identity / unknown identity | out (rejected `401`) | I4 |
| Issue for unknown trip id | out (`404`) | I5 |
| QR scan path | in | I6; decoded URL equals the composed link, same rules as J1–J4 |
| Preview of a valid token, joining open | in | J1; public basics only |
| Preview of a valid token, joining closed | in | J1 shape with `mainPlanConfirmed = true`; the join page shows the closed state instead of an accept action |
| Accept by a non-member, joining open | in | J2; membership created, member read now allowed |
| Accept twice, same identity | in | J3; exactly one membership row |
| Accept by an existing member, joining open or closed | in | J6; `alreadyMember = true`, no new row |
| Accept by a non-member after main-plan confirmation | out (rejected `403`) | J4; member list unchanged |
| Accept without identity / unknown identity | out (rejected `401`) | J5 |
| Accept with missing/unknown identity and unknown token | out (`401`) | J7; `USER_REQUIRED` takes precedence, no membership |
| Preview or identified accept of an unknown token | out (`404`) | U1/U2; generic unusable surface, no trip values, no membership |
| Join page with unknown token | in (reverse privacy case) | U3; generic message only |
| Revocation, expiry, reminder notification | out of scope | No endpoint, no field; R-2 reverse case |
| Setting main-plan confirmation through an API | out of scope | No endpoint; R-1 reverse case; US-037 owns the flow |
| Concurrent accepts of the same token by the same user | out of scope for races | The UNIQUE (trip_id, user_id) primary key from REQ-003 makes a duplicate insert impossible; SQLite serializes writers |
| Concurrent accepts by different users | in | Each inserts an independent membership row; no shared mutable state beyond the table |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-004 | Convergence |
|---|---|---|---|
| `trip` table ownership | REQ-003 `trips` (pending delta, unimplemented) | Adds one state column via `V3`, reads membership | Additive column with a default; REQ-003's six values and endpoints unchanged. Implementation order REQ-003 P4 → REQ-004 P4 |
| Identity contract | REQ-003 "Trip caller identity" | Reuses `X-User-Id`, `USER_REQUIRED` | Same contract, no second identity mechanism |
| Member read after joining | REQ-003 "Trip detail read" | J2 asserts Eve's read flips from `403` to `200` | Integration scenario, no spec change to the read requirement |
| `greeting` | REQ-001/REQ-002 | No shared table, endpoint or identifier | Independent |
| Main-plan confirmation flow | US-037 (backlog, issue #16) | State column only, no mutation path | US-037 will later add the flow as a `trips` modification; no conflict now |

No ✗ row remains. The two active changes (`req-002`, `req-003`) and this one touch
disjoint requirement sets; archive order is independent except that REQ-004's
`trips` ADDED requirement merges after REQ-003's.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Invitation panel (screen 04) | Organizer opens the trip's invitation surface | Organizer | Invitation link text, copy action, QR encoding the same absolute URL, joining-open hint; loading and error states; denial state for a non-organizer | `POST /api/trips/{id}/invitation` |
| Join page preview (screen 05) | Opening `/join/<token>` with a valid token | Invited traveler | Trip name, destination, start/end dates, joining-open hint; accept action; loading state; no member/itinerary/preference fields | `GET /api/invitations/{token}` |
| Join page joined state | Successful acceptance | New member | Joined confirmation with the trip name; repeated open shows the same joined state | `POST /api/invitations/{token}/accept` |
| Join page closed state | Preview or accept while main plan confirmed | Invited traveler | Joining-closed message; no accept action; no private fields beyond the preview basics | Same endpoints, `JOINING_CLOSED` on accept |
| Unusable surface (screen 06) | Unknown token on preview or accept | Any visitor | Generic unusable-invitation message, privacy note, back-home action; no trip name, members, destination or dates; no reminder notification workflow | Same endpoints, `INVITATION_NOT_FOUND` |
| Failure states | Endpoint unreachable or non-JSON response | Viewer | Static failure text plus reason; no trip values | Same request paths |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

Token entropy, invitation volume and retention are not decidable for a scaffold
slice and are not required by any AC. Recorded as a non-blocking item for Dev
(token generation uses a secure random source by design), not invented.

## REQ-019

触发：impact 方向为 **add**（新增能力 `preferences`）。REQ-019 复用 REQ-003 已合并的
`app_user` / `trip` / `trip_member` 三张表，只新增一张 `member_preference`。

### ⑨ 数据契约

| 概念 | 粒度 | 字段 | 状态迁移 |
|---|---|---|---|
| `member_preference`（存储） | 每 (trip, user, kind) 一行；本需求 `kind` 恒为 `interest` | `id` INTEGER PRIMARY KEY AUTOINCREMENT；`trip_id` INTEGER NOT NULL REFERENCES `trip(id)`；`user_id` INTEGER NOT NULL REFERENCES `app_user(id)`；`kind` TEXT NOT NULL；`payload` TEXT NOT NULL（JSON）；`updated_at` TEXT NOT NULL（ISO-8601 UTC）；UNIQUE(`trip_id`,`user_id`,`kind`) | 行不存在 → 首次 PUT 插入；行存在 → PUT 覆盖 `payload` 与 `updated_at`（幂等）；空数组 → 行保留、`payload` 为 `{"codes":[]}`；本需求无删除路径 |

`payload` 形状固定为 `{"codes":["art","nature"]}`：`codes` 是小写标识数组，顺序为去重后的首次出现顺序。**元素唯一性由 Service 层保证**——JSON 列内部无法附加唯一约束，这正是去重必须放在服务端的根因。

线上契约：

| 消息 | 字段 | 备注 |
|---|---|---|
| `PUT /api/trips/{tripId}/preferences` 请求 | `interests`：`string[]`，必填，可为空数组 | 元素必须是 7 个 label 之一，逐字匹配；不做大小写与空白归一化 |
| PUT 响应 | `interests`：`string[]` | 与落库集合一致（去重后），按首次出现顺序 |
| `GET /api/trips/{tripId}/preferences` 响应 | `members`：`[{userId: integer, interests: string[]}]` | 覆盖该 trip 全体成员；没有记录者返回 `interests: []` |
| 错误响应 | `code`（稳定字符串）、`message`（可读文本） | `code` 取值：`USER_REQUIRED`、`NOT_A_MEMBER`、`TRIP_NOT_FOUND`、`INTEREST_NOT_ALLOWED`、`INVALID_REQUEST` |
| 身份 | 请求头 `X-User-Id`，整数 | 指向 `app_user.id`；缺失或非 seed 用户一律 401 |

无 `{TBD}` 字段。

### ⑩ 边界枚举

| 分支 | in / out | 归属 |
|---|---|---|
| 提交含重复的合法值（`Art, Nature, Art`） | in（去重后落 2 项） | AC1 |
| 成功写入后重新加载页面 | in | AC1-R |
| 仅非法值（`teleportation`） | out（`400 INTEREST_NOT_ALLOWED`，不写入） | AC2 |
| 合法 + 非法混合 | out（整体拒绝，合法值也不落地） | AC2-M |
| 小写 code（`art`） | out（`400`） | AC2-C |
| 前后带空白（` Art `） | out（`400`） | AC2-C |
| 空数组 | in（清空语义，行保留） | AC3-N |
| 同一成员重复提交相同集合 | in（幂等，`payload` 不变） | AC8-N |
| 缺少 `X-User-Id` | out（`401`） | AC4-N |
| `X-User-Id` 指向非 seed 用户 | out（`401`） | AC4-N |
| 非成员调用 GET/PUT | out（`403 NOT_A_MEMBER`） | AC5-N |
| `tripId` 不存在 | out（`404 TRIP_NOT_FOUND`） | AC6-N |
| body 非对象、缺 `interests`、元素非字符串 | out（`400 INVALID_REQUEST`） | AC7-N |
| GET 失败时的前端表现 | in（错误态 + 重试，不把旧值渲染成已保存） | AC9-N |
| 成员从未保存过偏好 | in（GET 返回 `interests: []`，页面空态） | AC3-N 的读侧 |
| 修改他人偏好 | out of scope（写路径只认 header 身份，无跨成员入口） | REQ-019 §Actors |
| 其它三类偏好（必做项 / 约束 / 预算） | out of scope（`kind` 只实现 `interest`） | REQ-019 §Out of scope |
| 主线确认后锁定偏好 | out of scope（D4 裁定不实现锁定分支） | REQ-019 OQ-4 |
| 并发两次 PUT 同一成员 | out of scope（连接池 = 1，实际串行，结果 last-write-wins，无中间态可观察） | 技术约束 |

每个场景都有归属行。

### ⑪ 跨 REQ 一致性

| 触点 | 对方口径 | 本需求口径 | 收敛结论 |
|---|---|---|---|
| trip / user 表 | REQ-003 的 `V2__create_trip.sql` 建 `app_user` / `trip` / `trip_member` | 只读复用，不新建、不改列 | 一致：本需求只加 `member_preference`；seed 用户 1–5 与 trip 1 直接复用 |
| 成员判定 | `TripRepository.isMember(tripId, userId)` | 直接调用 | 一致：避免两套判定逻辑漂移 |
| 迁移序列 | REQ-003 用 `V2`；REQ-004（邀请）预留 `V3` | 本需求用 `V4` | 耦合：`V4` 必须在 `V3` 之后落库，否则 Flyway 报 out-of-order |
| 身份头 | 已合并代码用 `X-User-Id`（技术栈计划写的是 `X-Member-Id`） | 用 `X-User-Id` | 跟随代码；计划文档修正为团队任务（OQ-16） |
| 响应风格 | trip 接口为裸 DTO 成功 + `{"code","message"}` 失败（计划写的是 `{data,error}` 封套） | 同 trip | 跟随代码；`greeting` 仍是 `{message}`，差异记为团队级统一项（OQ-17） |
| 兴趣词表 | 技术栈计划 §5 的 `tag` 表为 24 码 | 本需求 7 项，代码常量 | 分离：不建 `tag` 表、不提供 `/api/tags`；合并词表是 M2.5 的团队任务 |
| 前端栈 | 计划写 Ant Design 5 + TS + TanStack Query + React Router | 已合并 `App.jsx` 为 hash 路由 + `api.js` + `app.css` | 跟随代码，不新增依赖（D5）；计划文档修正为团队任务 |
| UI 清单 | 参考图节点 8 展示 10 个中文 chip，映射 US-019~027 | AC 给出的 7 项英文 label | 行为以 AC 为准；示意差异记录在此，不回改参考图 |
| 偏好存储索引 | 计划 §5 为普通索引 | 改为 UNIQUE(`trip_id`,`user_id`,`kind`) | 有意偏离：幂等覆盖写需要唯一键定位行 |

### ⑫ 展示契约

| 界面态 | 触发 | 接收者 | 内容与展示字段 | 通道 |
|---|---|---|---|---|
| 加载中 | 进入 `#/trips/{id}/preferences` | 当前成员 | 静态加载提示；7 个 chip 禁用 | `GET /api/trips/{tripId}/preferences` |
| 已保存 | GET 成功且当前成员有记录 | 当前成员 | 7 个 chip 中已保存项为选中态，其余未选中 | 同上，取 `members[userId == X-User-Id].interests` |
| 空态 | GET 成功但当前成员无记录或为空数组 | 当前成员 | 7 个 chip 全未选中 + 说明文字 | 同上 |
| 保存中 | 点击保存、请求在途 | 当前成员 | 全部 chip 与保存按钮禁用 | `PUT /api/trips/{tripId}/preferences` |
| 保存成功 | PUT 2xx | 当前成员 | 选中态以响应 `interests` 为准，无额外提示 | 同上 |
| 非法值 | PUT `400 INTEREST_NOT_ALLOWED` | 当前成员 | 内联错误文本（服务端 `message`），选中态回滚到服务端已知值 | 同上 |
| 身份 / 成员 / 未知 trip 失败 | 401 / 403 / 404 | 当前成员 | 对应错误文本 + 重试入口；不渲染他人兴趣 | `GET` 与 `PUT` 同一路径 |
| GET 失败（不可达或非 2xx） | 网络错误 / 5xx | 当前成员 | 错误态 + 重试；**不得**把空白或旧值渲染成已保存 | 同上 |

无通知（邮件、推送、队列）在范围内。

### NFR business-policy layer

一个 trip 的成员数量为个位数，AC 未规定容量、保留期或 SLA；`payload` 是单行 JSON，读写各一条语句。记为 Dev 的非阻塞项，不臆造指标。

## REQ-020

触发：impact 方向为 **modify**（扩展 REQ-019 已引入的 `preferences` 能力）。本需求**零迁移**，
复用 `member_preference` 中 `kind = 'must_do'` 的行，与 `kind = 'interest'` 的行互不覆盖。

### ⑨ 数据契约

| 概念 | 粒度 | 字段 | 状态迁移 |
|---|---|---|---|
| `member_preference`（`kind='must_do'`） | 每 (trip, user, kind) 一行；行内 payload 是一个有序条目列表 | 表结构沿用 REQ-019 的 `V4`：`id`、`trip_id`、`user_id`、`kind`、`payload`（JSON）、`updated_at`；payload 形状固定为 `{"items":[{"id":1,"activity":"…","location":"…"\|"null","time":"HH:mm"\|"null"}]}` | 行不存在 → 首次 PUT 插入；行存在 → PUT 覆盖 `payload` 与 `updated_at`；`{"items":[]}` 合法且保留行；本需求无「删除整行」路径 |
| 条目 `item` | 属于该成员 payload 内的一个元素；`id` 仅在该成员列表内唯一 | `id`：INTEGER ≥ 1，服务端签发（当前最大 id + 1），删除后**不复用**；`activity`：去首尾空白后非空的字符串；`location`：字符串或 `null`；`time`：`HH:mm`（严格 `^([01][0-9]\|2[0-3]):[0-5][0-9]$`）或 `null` | 无 `id` 的入参条目 → 新增并签发 id；带 `id` 的入参条目 → 原地覆盖该条目；请求中缺失的既有条目 → 从 payload 移除；列表顺序 = 请求顺序 |

线上契约：

| 消息 | 字段 | 备注 |
|---|---|---|
| `PUT /api/trips/{tripId}/preferences/must-dos` 请求 | `items`：对象数组，必填，可为空数组 | 元素字段 `activity`（必填）、`location`、`time`、`id`（可选）；三字段先裁剪首尾空白，裁剪后空串等价于未提供 |
| PUT 响应 | `items`：对象数组，每条含 `id`、`activity`、`location`、`time` | 与落库 payload 一致；未填的 `location` / `time` 为 `null` |
| `GET /api/trips/{tripId}/preferences/must-dos` 响应 | `members`：`[{userId: integer, mustDos: [item]}]` | 覆盖该 trip 全体成员，按 `userId` 升序；无记录者返回 `mustDos: []` |
| 错误响应 | `code`（稳定字符串）、`message`（可读文本） | `code` 取值：`USER_REQUIRED`、`NOT_A_MEMBER`、`TRIP_NOT_FOUND`、`INVALID_REQUEST`、`MUST_DO_ACTIVITY_REQUIRED`、`MUST_DO_PLACE_OR_TIME_REQUIRED`、`MUST_DO_TIME_INVALID`、`MUST_DO_ITEM_UNKNOWN`、`MUST_DO_ITEM_DUPLICATE_ID` |
| 身份 | 请求头 `X-User-Id`，整数 | 指向 `app_user.id`；缺失或非 seed 用户一律 401 |

「改时间不产生第二条」的不变量落在两处：条目身份由 `id` 保真（AC2），条目数量由「整表覆盖」保真（AC2/AC3）。
两者都在 Service 层，数据库无法约束 JSON 数组内部。

无 `{TBD}` 字段。

### ⑩ 边界枚举

| 分支 | in / out | 归属 |
|---|---|---|
| 添加一条含 activity + location + time 的条目 | in（AC1 形态，两个可选字段同时保存） | AC1 / AC15-N |
| 保存后重新加载页面或重新 GET | in | AC1-R |
| 用同一条目 id 改时间 | in（原地覆盖，条数不变） | AC2 |
| 删除条目（整表覆盖为空） | in | AC3 |
| 其他成员条目在他人删除后是否变化 | in（必须不变） | AC3-M |
| 只填地点 / 只填时间 | in（另一字段为 `null`） | AC14-N |
| activity 为空或全空白 | out（`400 MUST_DO_ACTIVITY_REQUIRED`） | AC8-N |
| 地点与时间都缺失或裁剪后为空 | out（`400 MUST_DO_PLACE_OR_TIME_REQUIRED`） | AC9-N |
| `time` 非 `HH:mm`（`10:0`、`25:00`、`10am`） | out（`400 MUST_DO_TIME_INVALID`） | AC10-N |
| 提交他人或不存在的条目 id | out（`400 MUST_DO_ITEM_UNKNOWN`，双方不变） | AC11-N |
| 同一请求重复提交同一 id | out（`400 MUST_DO_ITEM_DUPLICATE_ID`） | AC12-N |
| 空数组 | in（清空语义，行保留） | AC3 |
| 重复提交完全相同的列表 | in（幂等，id 与 payload 不变） | AC13-N |
| `GET` 连续读两次 | in（只读：payload 与 `updated_at` 不变） | AC16-N |
| 缺少 `X-User-Id` / 非 seed 用户 | out（`401`） | AC4-N |
| 非成员调用 GET/PUT | out（`403 NOT_A_MEMBER`） | AC5-N |
| `tripId` 不存在 | out（`404 TRIP_NOT_FOUND`） | AC6-N |
| body 非对象、缺 `items`、元素非对象 | out（`400 INVALID_REQUEST`） | AC7-N |
| GET 失败 / PUT 失败时的前端表现 | in（错误态 + 重试；PUT 失败回滚） | AC17-N / AC18-N |
| 修改他人必做项 | out（写路径只认 header 身份，无跨成员入口） | REQ-020 §Actors |
| 兴趣段（US-019）与本段同页共存 | out of scope（本需求不改兴趣端点与保存按钮） | REQ-020 §Out of scope |
| 主线确认后锁定必做项 | out of scope（沿用 REQ-019 D4：仅测试上下文） | REQ-020 §Out of scope |
| 排序拖拽、跨成员共享、数量/长度上限 | out of scope（AC 未规定） | REQ-020 OQ-11 |
| 并发两次 PUT 同一成员 | out of scope（连接池 = 1，实际串行，last-write-wins） | 技术约束 |

每个场景都有归属行。

### ⑪ 跨 REQ 一致性

| 触点 | 对方口径 | 本需求口径 | 收敛结论 |
|---|---|---|---|
| 偏好表 | REQ-019 的 `V4` 建 `member_preference` + UNIQUE(`trip_id`,`user_id`,`kind`) | 只写 `kind='must_do'`，不建表、不改列 | 一致：同表不同 kind 互不覆盖，唯一键直接支撑幂等覆盖写 |
| 端点前缀 | REQ-019 的 `GET`/`PUT /api/trips/{tripId}/preferences` | 新增 `GET`/`PUT /api/trips/{tripId}/preferences/must-dos` | 同为路径前缀但资源不同；需在 P3 确认 Spring 的精确匹配不会把子路径落到旧映射 |
| 页面契约 | REQ-019 的页面要求「兴趣选择由一次显式保存提交」 | 同一页新增必做项段，且**动作即保存** | 需在 P2 把 `Preferences page` 标为 MODIFIED，写明「按段区分写入时机」，否则两条契约互相矛盾 |
| 错误 advice | REQ-019 计划在 `com.gogo.preference` 建专属 advice | 复用同一包与同一 advice | 一致；若 REQ-019 的 advice 缺失，本需求的错误码不会产生（WARNING） |
| 行程日期 | `V2` 的 `trip.start_date` / `end_date`（夹具为单日 2026-12-05） | `time` 只存 `HH:mm`，日期隐含行程日期 | 单日一致；多日行程无法定位具体哪天，记为已知偏离（OQ-12） |
| 主线确认 | REQ-004 的 `trip.main_plan_confirmed`；US-037 之前无产品写入路径 | 仅作测试上下文，不设锁定分支 | 一致：AC 的「main plan is unconfirmed」是前提，不是状态机分支 |
| 生成消费 | US-031 的节点 9 需要「必做项汇总」 | `GET` 返回全员明细即汇总输入 | 一致：本需求只提供数据，不实现生成 |
| 计划文档 | `tech-stack-plan.md` §5 的 24 码 `tag` 表、§6 的封套与 `X-Member-Id` | 跟随已合并代码（`X-User-Id`、裸 DTO、无 `tag` 表） | 与 REQ-019 OQ-16 同一文档修正任务，不重复登记 |
| 迁移序列 | `V3` 已随 REQ-004 落 main；`V4` 归 REQ-019 | 本需求零迁移 | 无编号竞争；唯一风险是 `V4` 尚未合入时本变更无法运行（R1） |
| UI 参考图 | 节点 8 表单写「地点 二选一 / 固定时间」 | 两字段可同时保存，至少一项 | 有意偏离：Design scope 明确要求不得阻止同时保存；文案需改（WARNING） |

### ⑫ 展示契约

| 界面态 | 触发 | 接收者 | 内容与展示字段 | 通道 |
|---|---|---|---|---|
| 加载中 | 进入 `#/trips/{id}/preferences` | 当前成员 | 必做项段的加载提示；添加与删除控件禁用 | `GET .../preferences/must-dos` |
| 空态 | GET 成功且当前成员 `mustDos` 为空 | 当前成员 | 「还没有必做项」说明 + 添加入口 | 同上 |
| 已有条目 | GET 成功且有条目 | 当前成员 | 按服务端顺序渲染 `activity`，有 `location` 时显示地点，有 `time` 时显示时间；每项带编辑与删除 | 同上 |
| 添加 / 编辑中 | 点击「添加必做项」或某项的编辑 | 当前成员 | 内联表单：活动名称（必填）、地点、固定时间；编辑态预填现值；保存 / 取消 | 本地态，无请求 |
| 保存中 | 添加、编辑或删除触发 PUT 且未返回 | 当前成员 | 表单与删除按钮禁用，防重复提交 | `PUT .../preferences/must-dos` |
| 保存成功 | PUT 2xx | 当前成员 | 列表以响应为准（新增条目获得 `id`），无残留错误 | 同上 |
| 保存失败 | PUT 4xx / 5xx | 当前成员 | 内联显示服务端 `message`；列表回滚到服务端已知状态 | 同上 |
| 身份 / 成员 / 未知 trip | 401 / 403 / 404 | 当前成员 | 对应错误文案 + 返回入口；不得渲染任何成员的条目 | 同上 |
| GET 失败 | 不可达或非 2xx | 当前成员 | 错误态 + 重试；**不得**把空列表或旧值渲染成「已保存」 | 同上 |

无通知（邮件、推送、队列）在范围内。

### NFR business-policy layer

单成员条目数量在实际使用中是两位数以内，AC 未规定容量、长度或 SLA；`payload` 是单行 JSON，读写各一条语句。
记为 Dev 的非阻塞项（OQ-11），不臆造上限。
