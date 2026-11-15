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

无通知（邮件、推送、队列）不在范围内。

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

无通知（邮件、推送、队列）不在范围内。

### NFR business-policy layer

单成员条目数量在实际使用中是两位数以内，AC 未规定容量、长度或 SLA；`payload` 是单行 JSON，读写各一条语句。
记为 Dev 的非阻塞项（OQ-11），不臆造上限。

## REQ-024

触发：impact 方向为 **modify**（第三次扩展 REQ-019 引入的 `preferences` 能力）。本需求**零迁移**，
复用 `member_preference` 中 `kind = 'budget'` 的行；与 `kind = 'interest'`（REQ-019）、`kind = 'must_do'`（REQ-020）互不覆盖。

### ⑨ 数据契约

| 概念 | 粒度 | 字段 | 状态迁移 |
|---|---|---|---|
| `member_preference`（`kind='budget'`） | 每 (trip, user, kind) **一行**；行内 payload 是**单个对象**（不是数组） | 表结构沿用 REQ-019 的 `V4`：`id`、`trip_id`、`user_id`、`kind`、`payload`（JSON）、`updated_at`；payload 已设置态 `{"amount":4000,"currency":"SGD","limitType":"hard"}`，未设置态 `{}` | 行不存在 → 首次 PUT 插入；行存在 → 覆盖 `payload` 与 `updated_at`；`{"amount":null}` → payload 写 `{}` 且**保留行**；GET 不建行 |
| 预算值对象 | 属于该成员 payload 的唯一对象；无子条目 id | `amount`：INTEGER，`0 ≤ amount ≤ 2147483647`，含义为**最小货币单位**；`currency`：`SGD`/`CNY`/`USD`/`EUR`/`JPY`；`limitType`：`hard`/`soft` | 三字段只有两种合法组合：**全 null（未设置）** 或 **全有值（已设置）**；半个预算（只有 amount、或 amount 为 null 但另两字段有值）→ `400 BUDGET_FIELDS_INCOMPLETE` |
| 币种小数位 | 币种 → 最小单位的换算常量，前后端共用同一张表 | `SGD = 2`、`CNY = 2`、`USD = 2`、`EUR = 2`、`JPY = 0` | 不参与存储与校验，只决定界面格式化与用户输入的换算；**禁止**硬编码 ×100 |

线上契约：

| 消息 | 字段 | 备注 |
|---|---|---|
| `PUT /api/trips/{tripId}/preferences/budget` 请求 | `amount`：整数或 `null`，**键必须存在**；`currency`：字符串或 `null`；`limitType`：`"hard"`/`"soft"` 或 `null` | 三个字段都出现在 body 中时按联动规则校验；`amount` 键缺失 → `400 INVALID_REQUEST`，与 `amount:null`（清除）**语义不同** |
| PUT 响应 | `{"budget":{...}}` 或 `{"budget":null}` | 与落库 payload 一致；清除时为 `null` |
| `GET /api/trips/{tripId}/preferences/budget` 响应 | `members`：`[{userId: integer, budget: {...}\|null}]` | 覆盖该 trip 全体成员，按 `userId` 升序；未设置者 `budget: null`（与 `amount: 0` 必须可区分） |
| 错误响应 | `code`（稳定字符串）、`message`（可读文本） | `code` 取值：`USER_REQUIRED`、`NOT_A_MEMBER`、`TRIP_NOT_FOUND`、`INVALID_REQUEST`、`BUDGET_AMOUNT_INVALID`、`BUDGET_FIELDS_INCOMPLETE`、`BUDGET_CURRENCY_NOT_ALLOWED`、`BUDGET_LIMIT_TYPE_INVALID` |
| 身份 | 请求头 `X-User-Id`，整数 | 指向 `app_user.id`；缺失或非 seed 用户一律 401 |

校验顺序（D12，多字段同时非法时结果必须确定，任一失败**零写入**）：

1. `X-User-Id` 可解析且指向已 seed 用户；2. `tripId` 存在；3. 调用者是该 trip 成员；
4. body 可解析为 JSON 对象；5. `amount` 键存在；6. `amount` 为非负整数且不超 int32；
7. 三字段联动合法；8. `currency` 在白名单内；9. `limitType` ∈ `{hard, soft}`；10. 写库。

「改上限类型不产生第二条」的不变量落在两处：写入是 `ON CONFLICT(trip_id,user_id,kind) DO UPDATE`（行数恒 1，AC2），
清除写 `{}` 而不删行（AC3c）。两者都在 Service/SQL 层，数据库无法表达「payload 必须是单对象」。

无 `{TBD}` 字段。

### ⑩ 边界枚举

| 分支 | in / out | 归属 |
|---|---|---|
| 首次保存合法预算（amount + currency + hard） | in | AC1 |
| 保存后重新加载页面或重新 GET | in | AC1-R |
| 只改 `limitType`（hard → soft），金额与币种不变 | in | AC2 |
| 改上限类型后行数仍为 1、payload 仍是单对象 | in（核心不变量） | AC2 |
| 其他成员预算在他人修改后是否变化 | in（必须不变） | AC2-M |
| 从未设置 → GET | in（`budget: null` 且无行） | AC3a |
| 0 预算 + 硬上限 | in（`amount: 0` ≠ null） | AC3b |
| 清除预算（`amount: null`） | in（payload `{}`，行保留） | AC3c |
| 0 → 未设置 → 0 往返 | in | AC3d |
| `JPY` 零位小数 | in（`1200` 显示为 `JPY 1200`） | AC3e |
| `amount` 为负数 | out（`400 BUDGET_AMOUNT_INVALID`，前值不变） | AC8-N |
| `amount` 为小数（`4000.5`） | out（`400 BUDGET_AMOUNT_INVALID`） | AC9-N |
| `amount` 超出 int32（`2147483648`、`1e12`） | out（`400 BUDGET_AMOUNT_INVALID`） | AC10-N |
| `amount` 有值但 `currency` 缺失/为 null | out（`400 BUDGET_FIELDS_INCOMPLETE`） | AC11-N |
| `currency` 非白名单 / 小写 / 长度错 | out（`400 BUDGET_CURRENCY_NOT_ALLOWED`） | AC12-N |
| `limitType` 非法值（`HARD`、`medium`、`""`） | out（`400 BUDGET_LIMIT_TYPE_INVALID`） | AC13-N |
| `amount` 有值但 `limitType` 缺失/为 null | out（`400 BUDGET_FIELDS_INCOMPLETE`） | AC14-N |
| `amount` 为 null 但另两字段有值 | out（`400 BUDGET_FIELDS_INCOMPLETE`） | AC15-N |
| 重复提交完全相同的合法 body | in（幂等，行数与 payload 不变） | AC16-N |
| `GET` 连续读两次 | in（只读：payload 与 `updated_at` 不变） | AC17-N |
| 主线已确认后保存 | in（沿用 REQ-019 D4，不设锁） | AC18-N |
| 缺少 `X-User-Id` / 非 seed 用户 / 非整数 | out（`401`） | AC4-N |
| 非成员调用 GET/PUT | out（`403 NOT_A_MEMBER`） | AC5-N |
| `tripId` 不存在 | out（`404 TRIP_NOT_FOUND`） | AC6-N |
| body 非对象 / 缺 `amount` 键 / 非法 JSON | out（`400 INVALID_REQUEST`） | AC7-N |
| 前端保存失败（-1 或非法币种） | in（错误态 + 保留输入 + 回滚） | AC19-N |
| 前端 GET 失败 | in（错误态 + 重试，不把旧值当已保存） | ⑫ 第 10 行 |
| 约束类偏好（`kind='constraint'`） | out of scope（另一条故事） | REQ-024 §Out of scope |
| 兴趣段与必做项段的交互 | out of scope（两段的端点与保存时机均不改） | REQ-024 §Out of scope |
| 「无偏好」与就绪提交 | out of scope（US-027 / US-026） | REQ-024 §Out of scope |
| 成员摘要（节点 7）展示他人预算 | out of scope（US-013 的展示决策） | OQ-12 |
| 多币种换算 / 汇率比较 | out of scope（US-031 另开变更） | OQ-13 |
| 金额业务上限 | out of scope（AC 未规定；实现层只拒超 int32） | OQ-10 |
| 编辑他人预算 | out（写路径只认 header 身份，无跨成员入口） | REQ-024 §Actors |
| 并发两次 PUT 同一成员 | out of scope（连接池 = 1，实际串行，last-write-wins） | 技术约束 |

每个场景都有归属行。

### ⑪ 跨 REQ 一致性

| 触点 | 对方口径 | 本需求口径 | 收敛结论 |
|---|---|---|---|
| 偏好表 | REQ-019 的 `V4` 建 `member_preference` + UNIQUE(`trip_id`,`user_id`,`kind`) | 只写 `kind='budget'`，不建表、不改列 | 一致：同表不同 kind 互不覆盖；UNIQUE 直接支撑 `ON CONFLICT` 的单行覆盖写 |
| `kind` 取值域 | `tech-stack-plan.md` §5 的枚举含 `interest`/`must_do`/`constraint`/`budget` | 本需求只落地 `budget` | 一致：复用表、零迁移是计划原意，不是偏离 |
| 金额单位 | `tech-stack-plan.md` §5「金额用 `INTEGER` 分」；`attraction.price_cny` 同口径 | `amount` 为最小货币单位整数 | 一致：US-031 做预算过滤时可直接与 `price_cny` 比较；JPY 零位小数需在换算时按币种表处理 |
| 端点前缀 | REQ-019 的 `GET`/`PUT /api/trips/{tripId}/preferences`；REQ-020 的 `.../preferences/must-dos` | 新增 `GET`/`PUT /api/trips/{tripId}/preferences/budget` | 同为子资源兄弟路径；需在 P3 确认 Spring 精确匹配，三个映射互不落到对方 |
| 页面契约 | REQ-019「兴趣一次显式保存」→ REQ-020 MODIFIED「必做项动作即保存」 | 第三次 MODIFIED：预算段为段内显式保存 | 需在 P2 基于 REQ-020 的版本再修订，写明三段三种时机；基线顺序 019 → 020 → 024 |
| 错误 advice | REQ-019 计划在 `com.gogo.preference` 建专属 advice | 复用同一包与同一 advice，新增 4 个 `BUDGET_*` 码 | 一致；若 REQ-019 的 advice 缺失，本需求的错误码不会产生（WARNING） |
| 行程日期 | `V2` 的 `trip.start_date` / `end_date`（夹具 2026-12-05） | 预算是「全程」口径，不需要日期字段 | 一致：人均全程 = 整个 trip，不按天拆分 |
| 主线确认 | REQ-004 的 `trip.main_plan_confirmed`；US-037 之前无产品写入路径 | 仅作测试上下文，不设锁定分支 | 一致：AC 的「main plan is unconfirmed」是前提，不是状态机分支（D13） |
| 生成消费 | US-031 节点 9 需要「约束 / 预算」输入，节点 10 的 `pv2` 校验硬上限 | `GET` 返回全员 `budget`（含 `null`） | 一致：本需求只提供数据；「硬上限严格过滤、软上限尽量」的语义属 US-031 |
| 就绪状态 | US-026 的提交与就绪环、US-027 的显式无偏好 | 保存预算**不改变**就绪状态 | 需在 P2 的页面 requirement 里写明，避免实现时顺手把「保存预算」做成「提交就绪」 |
| 参考图 | 节点 8 预算卡：币种下拉 `CNY/USD/EUR/JPY`、金额默认 `1200`、提交走全页 `submitPref()` | 白名单含 `SGD`、无默认金额、预算段独立保存 | 有意偏离：Design scope 明确要求支持 SGD 且区分未设置与 0；UI 需改（WARNING） |
| 计划文档 §6 | 计划写「`PUT /preferences` 一次提交四类偏好」 | 独立子资源端点 + 段内显式保存 | 偏离：为不改 REQ-019 已冻结的 payload；文档修正并入 REQ-019 OQ-16 |
| 迁移序列 | `V3` 已随 REQ-004 落 main；`V4` 归 REQ-019 | 本需求零迁移 | 无编号竞争；唯一风险是 `V4` 未合入时本变更无法运行（R1） |

### ⑫ 展示契约

| 界面态 | 触发 | 接收者 | 内容与展示字段 | 通道 |
|---|---|---|---|---|
| 加载中 | 进入 `#/trips/{id}/preferences` | 当前成员 | 预算段的加载提示；金额框、币种、软硬选择器、保存按钮禁用 | `GET .../preferences/budget` |
| 未设置（空态） | GET 成功且当前成员 `budget` 为 `null` | 当前成员 | 金额框留空、币种与上限不预选、占位文案「留空 = 不设预算」、「保存预算」可用 | 同上 |
| 已设置 | GET 成功且 `budget` 非 null | 当前成员 | `SGD 40.00 · 硬上限` / `JPY 1200 · 软上限`；金额与币种按币种小数位表格式化；提供「清除预算」 | 同上 |
| 零预算 | GET 成功且 `budget.amount = 0` | 当前成员 | 显示 `SGD 0.00 · 硬上限`，**必须**与「未设置」在文案上不同（不得显示成空白） | 同上 |
| 编辑中 | 修改金额、切换币种或点击软/硬 | 当前成员 | 本地态变化 + 未保存提示；不发起请求 | 本地态，无请求 |
| 保存中 | 点击「保存预算」且未返回 | 当前成员 | 保存按钮禁用并显示进行中，防重复提交 | `PUT .../preferences/budget` |
| 保存成功 | PUT 2xx | 当前成员 | 以响应为准渲染金额/币种/上限；清除时回到未设置态；无残留错误 | 同上 |
| 保存失败 | PUT 4xx / 5xx | 当前成员 | 内联显示服务端 `message`（如负数、非法币种），保留用户输入，值回滚到服务端已知状态 | 同上 |
| 身份 / 成员 / 未知 trip | 401 / 403 / 404 | 当前成员 | 对应错误文案 + 返回入口；不得渲染任何成员的预算 | 同上 |
| GET 失败 | 不可达或非 2xx | 当前成员 | 错误态 + 重试；**不得**把空白或旧值渲染成「未设置」或「已保存」 | 同上 |

无通知（邮件、推送、队列）不在范围内。

### NFR business-policy layer

单个成员的预算是**一行一个对象**，读写各一条语句；5 个币种、int32 金额上限，无容量与 SLA 要求。
AC 未规定金额业务上限与汇率换算，记为 Dev/团队的非阻塞项（OQ-10 / OQ-13），不臆造限制。

## REQ-026 — 提交偏好并标记就绪 / 显式无偏好（US-026 + US-027）

### ⑨ 数据契约

**存储**：复用 `member_preference(id, trip_id, user_id, kind, payload, updated_at)`，`kind = 'submission'`；UNIQUE(`trip_id`,`user_id`,`kind`)；`INSERT ... ON CONFLICT DO UPDATE`，行数恒 1。**pending 就是没有这一行**，不存在「空提交态」行。

**payload 两种形状**（单对象，非数组）：

```json
{"status":"ready","noPreference":false,"submittedAt":"2026-11-15T10:12:00+08:00"}
{"status":"ready","noPreference":true,"submittedAt":"2026-11-15T10:12:00+08:00","defaults":{"transport":"walking","pace":"standard"}}
```

- `status` 恒为 `ready`（行存在即就绪，字段冗余但保证 payload 自解释）。
- `submittedAt` 服务端生成，`Asia/Singapore` 偏移的 ISO-8601（`OffsetDateTime`）；请求体同名字段一律忽略。
- `defaults` 只在 `noPreference = true` 时出现，值为固定常量（D8）。
- payload 内的 `submittedAt` 是读契约权威；表内 `updated_at` 仍是 housekeeping 列（UTC），两者不要求相等。

**线上契约**：

| 端点 | 方法 | 标识 | 请求 | 成功响应 | 说明 |
|---|---|---|---|---|---|
| `/api/trips/{tripId}/preferences/submission` | PUT | `X-User-Id` | `{"noPreference": false\|true}` | `{"status":"ready","noPreference":<bool>,"submittedAt":"…"}`（true 时含 `defaults`） | 幂等覆盖；只写调用者自己的行 |
| `/api/trips/{tripId}/preferences/readiness` | GET | `X-User-Id` | — | `{"members":[…4 条…],"readyCount":<int>,"memberCount":<int>,"allReady":<bool>}` | 全员含 pending；按 `userId` 升序 |
| `/api/trips/{tripId}/preferences/effective` | GET | `X-User-Id` | — | `{"members":[仅 ready]}` | 生成侧投影；pending 不出现 |

`readiness.members[i]` = `{userId, displayName, status("pending"|"ready"), noPreference(bool|null), submittedAt(string|null)}`；pending 时后两项为 `null`。

`effective.members[i]` = `{userId, status, noPreference, interests(label 数组), mustDos(items 数组), budget(对象|null), constraints(null), defaults(对象|null)}`。

**「四类偏好全无」判定**（仅作用于 `noPreference=false`）：`interest` 无行或 `codes` 为空；`must_do` 无行或 `items` 为空；`budget` 无行或 payload 不含 `amount`；`constraint` 无行。四类同时为无 → `400 PREFERENCE_EMPTY`；`constraint` 尚未实现，判定必须显式短路。

**校验顺序（固定 8 步，失败零写入）**：身份 → trip → 成员 → body 是对象 → `noPreference` 键存在 → 布尔类型 → 空提交判定 → upsert。

**错误码**：新增 `PREFERENCE_EMPTY`(400)、`INTERNAL_ERROR`(500，固定文案不泄露内部异常)；复用 `USER_REQUIRED`(401)、`NOT_A_MEMBER`(403)、`TRIP_NOT_FOUND`(404)、`INVALID_REQUEST`(400)；响应体统一 `{"code","message"}`。

**状态迁移**：`pending --PUT{false}--> ready(false)`、`pending --PUT{true}--> ready(true)`、`ready(false) --PUT{true}--> ready(true)`、`ready(true) --PUT{false}--> ready(false)`（需当下四类非全无，否则 `PREFERENCE_EMPTY`）；无 `ready --> pending` 的合法路径。

### ⑩ 边界枚举（34 条）

| # | 分支 | 归属 |
|---|---|---|
| B1 | 缺 `X-User-Id` | 三个端点均 401 `USER_REQUIRED`，零写入 |
| B2 | `X-User-Id` 非整数（`abc`） | 401 `USER_REQUIRED` |
| B3 | `X-User-Id` 指向未 seed 用户（`99`） | 401 `USER_REQUIRED` |
| B4 | 路径 `tripId` 非整数 | 400 `INVALID_REQUEST`（Spring 路径解析失败），不影响任何行 |
| B5 | `tripId` 不存在 | 404 `TRIP_NOT_FOUND`，先于 403 |
| B6 | 非成员（`X-User-Id: 5`） | 403 `NOT_A_MEMBER`，响应不含成员数据 |
| B7 | body 非法 JSON | 400 `INVALID_REQUEST`，零写入 |
| B8 | body 非对象（数组、字符串、数字、`null`） | 400 `INVALID_REQUEST` |
| B9 | 缺 `noPreference` 键 | 400 `INVALID_REQUEST`（键 presence 必须可判） |
| B10 | `noPreference` 非布尔（`"true"`、`1`、`null`） | 400 `INVALID_REQUEST`；已有 ready 行的 payload 与 `updated_at` 不变 |
| B11 | body 含未知键 | 忽略，200；落库 payload 不含未知键 |
| B12 | body 伪造 `status` / `submittedAt` | 忽略；落库值为服务端生成 |
| B13 | 空提交：四类偏好全无且 `noPreference=false` | 400 `PREFERENCE_EMPTY`，不建行 |
| B14 | 只有 `interest` 行但 `codes` 为空 | 计入「无」，可与其它 kind 组合 |
| B15 | 只有 `must_do` 行但 `items` 为空 | 计入「无」 |
| B16 | 只有 `budget` 行但 payload 为 `{}` | 计入「无」 |
| B17 | 只有 `budget` 行且 `amount = 0` | **不算无**，允许 `noPreference=false` 提交（0 是真实表达） |
| B18 | 只有 `constraint` 行且非空 | 允许提交（前向兼容：该 kind 由后续故事实现） |
| B19 | `noPreference=true` 且零偏好 | 允许，`ready(true)` + `defaults` |
| B20 | 重复提交相同 body | 幂等：200，行数 1，`noPreference` 不变，`submittedAt` 不早于上一次 |
| B21 | `ready(false)` → `PUT{true}` | 覆盖写，行数仍 1 |
| B22 | `ready(true)` → `PUT{false}` 且此刻四类全无 | 400 `PREFERENCE_EMPTY`；**原行不被改动**（保留 `noPreference=true`） |
| B23 | 同一成员并发两次提交 | UNIQUE + upsert 保证行数恒 1；最后一次写入生效 |
| B24 | 写库失败（stub 抛异常 / DB 锁超时） | 500 `INTERNAL_ERROR`；零写入；`readiness` 仍 `pending` |
| B25 | `readiness`：全员未提交 | 4 条全 `pending`，`readyCount=0`，`allReady=false` |
| B26 | `readiness`：部分就绪 | `readyCount` 与就绪人数一致，`allReady=false` |
| B27 | `readiness`：全员就绪 | `readyCount = memberCount`，`allReady=true`（不含主线确认等前置） |
| B28 | `readiness`：`memberCount = 0`（防御分支） | `allReady=false`（真空不视为可生成） |
| B29 | `effective`：无任何 ready 成员 | `{"members":[]}`，200 而非 404 |
| B30 | `effective`：`noPreference=true` 成员且无任何个人行 | 出现在列表，个人字段为空，`defaults` 有值 |
| B31 | `effective`：`budget` 行为清除态 `{}` | `budget` 为 `null`，不报错 |
| B32 | `effective`：某 kind 的 payload 损坏（非法 JSON / 类型不符） | 行为待 P3 定（倾向：按「无」处理并记 warn，不 500 打挂整页）——OQ-11 |
| B33 | 主线已确认（`main_plan_confirmed = 1`）后提交 | 200 正常落库（不设锁定分支，沿用 REQ-019 的 D4） |
| B34 | 前端请求失败（网络错误 / 502 / 超时） | pill 保持「未提交」，显示错误条与重试；**不得**本地先置「就绪」 |

### ⑪ 与相邻 REQ 的收敛

| 相邻点 | 邻居的约定 | 本需求的取值 | 结论 |
|---|---|---|---|
| 同一张表 / 同一个 UNIQUE（REQ-019） | `member_preference` 三列唯一，单行单对象 | `kind='submission'` 沿用同一模式 | 一致：不需要新表、新索引 |
| `kind` 取值域 | `tech-stack-plan.md` §5 只有 interest/must_do/constraint/budget；REQ-019 的 DoV 已裁定「后续 story 扩展」 | 追加 `submission` | 有意偏离：语义从「偏好内容」扩到「提交状态」，须在 P2 delta 与文档修正里写明 |
| payload 只读消费 | REQ-019 `{"codes":[…]}`、REQ-020 `{"items":[…]}`、REQ-024 `{"amount","currency","limitType"}` 或 `{}` | `effective` 把它们投影为 label/items/对象 | 一致：只读，不改三类 payload；三类未落地时字段为 `null` |
| 写入时机 | 兴趣=段内显式保存、必做项=动作即保存、预算=段内显式保存 | 就绪=页面级显式提交 | 四段四种时机并存；页面契约第 4 次修订必须逐段写明，防被「统一」成一次全页提交 |
| 端点前缀 | `/preferences`、`/preferences/must-dos`、`/preferences/budget` | 追加 `/preferences/submission`、`/preferences/readiness`、`/preferences/effective` | 风险：若用 `/preferences/{kind}` 通配会吞掉兄弟路径；P3 必须精确匹配 |
| 错误 advice | `com.gogo.preference` 包内的 advice（REQ-019 建立） | 追加 `PREFERENCE_EMPTY` 与 500 `INTERNAL_ERROR` | 一致：沿用同一 advice；500 为本需求新增映射 |
| 身份与错误码实况 | `TripController`：`USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST` | 同 | 发现不一致：REQ-020 的 DoR 与 proposal 写 `UNAUTHENTIC` / `TRIP_FORBIDDEN`，需一并更正（OQ-10） |
| 成员 / 组织者可见性 | REQ-019 的 GET 返回全员明细，前端只渲染自己那段 | `readiness` / `effective` 同样返回全员 | 一致；节点 7（US-013）直接消费 `readiness` |
| 主线确认 | REQ-004 的 `trip.main_plan_confirmed`；US-037 前无产品写入路径 | 提交不检查主线 | 一致：`allReady` 只报「全员已提交」，主线组合门控属 US-031 |
| 生成消费 | US-031 节点 9/10 需要就绪成员输入、硬上限过滤 | `effective` 成为唯一读路径 | 一致：本需求只提供投影，不实现生成 |
| 就绪失效 | US-031/US-037 的「偏好变更则草稿过期」 | 提交后保存偏好**不撤销**就绪（D10） | 有意留白：快照新鲜度由 US-031 自行判断（OQ-7） |
| 迁移序列 | `V3` 已落 main，`V4` 归 REQ-019 | 本需求零迁移 | 无编号竞争；唯一风险是 `V4` 未合入时本变更无法运行 |
| 计划文档 | §5 四类 kind、§6「`PUT /preferences` 一次提交四类偏好」 | 第五个 kind + 三个子资源端点 | 已知偏离：跟随 AC 与既有 delta；文档修正并入 REQ-019 OQ-16 |
| 参考图 | 节点 8 `submitPref()` 一次点击保存全部并置就绪、`noPrefSw` 只 `hide`；节点 7 三色 pill | 提交只负责就绪；开关禁用字段并写标记；三色 pill 由 `readiness` 驱动 | 有意偏离且互相修正：同时解决 REQ-024 记录的 R8 冲突 |

### ⑫ 展示契约（12 个界面态）

| 界面态 | 触发 | 接收者 | 内容与通道 | 断言点 |
|---|---|---|---|---|
| 加载中 | 首次进入 / 身份切换后请求在途 | 当前成员 | 提交段与 pill 显示骨架/占位，按钮禁用 | 不出现「就绪」文案 |
| 待提交（有已保存偏好） | `status=pending` 且四类之一有内容 | 当前成员 | pill「未提交」；提交按钮可点 | 按钮 enabled |
| 待提交（无任何偏好） | `status=pending` 且四类全无 | 当前成员 | 提交按钮**禁用** + 前置提示「先保存至少一项偏好，或勾选『我没有特别偏好』」 | 按钮 disabled + 提示文案存在 |
| 无偏好开关打开 | 用户打开开关 | 当前成员 | 表单区**禁用**（不只是隐藏）+ 常驻说明「将使用默认：步行、标准节奏；已保存的个人值不会被采用」；提交按钮可用 | 字段 disabled 属性为真 |
| 提交中 | 点提交后请求在途 | 当前成员 | 按钮 loading 且 disabled，防重复提交 | 只发一个请求 |
| 就绪 | `ready` 且 `noPreference=false` | 当前成员 | 绿色 pill「就绪」+ 就绪时间（`submittedAt` 本地化显示） | 文案与 7 不同 |
| 就绪 · 无偏好 | `ready` 且 `noPreference=true` | 当前成员 | 灰色 pill「就绪 · 无偏好」+ 就绪时间 | 文案与 6 不同 |
| 提交失败（500/网络） | 非 2xx 或网络错误 | 当前成员 | 段内错误条显示服务端 `message`；pill 仍「未提交」；已保存字段保持 | 不出现「就绪」 |
| 空提交被拒 | 400 `PREFERENCE_EMPTY` | 当前成员 | 提示先保存偏好或选择无偏好；不改变状态 | pill 仍「未提交」 |
| 身份切换 | 顶部选择器变更 | 新身份 | 重新拉取 `readiness` 与 `effective`，就绪态随身份切换 | 不保留上一身份的 pill |
| 读失败 | `readiness`/`effective` GET 失败 | 当前成员 | 错误态 + 重试；**不得**把未知状态渲染成「未提交」或「就绪」 | 两种文案均不出现 |
| 成员页就绪环（节点 7） | 进入成员页 / 有人提交 | 全组可见 | 环显示 `readyCount/memberCount`；绿色「就绪」、灰色「无偏好」、灰色「待提交」三态 | 三态文案互不相同 |

无通知（邮件、推送、长连接）不在范围内。

### NFR business-policy layer

单个成员的提交状态是**一行一个对象**，写一条语句；读路径为名册一条查询 + 投影一条查询，无容量与 SLA 要求。
AC 未规定提交频率限制、通知与就绪失效，记为 Dev/团队的非阻塞项（OQ-6 / OQ-7），不臆造限制。
