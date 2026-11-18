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
| 前端栈 | 计划写 Ant Design 5 + TS + TanStack Query + React Router | 已合并 `App.jsx` 为 hash 路由 + `api.js` + `app.css` | 跟随代码，不新增依赖（D5）；2026-11-16 已收口：UI 定为 shadcn/ui + Tailwind v4，计划 §3 与 AGENTS.md 同步修正 |
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
| `member_preference`（`kind='must_do'`） | 每 (trip, user, kind) 一行；行内 payload 是一个有序条目列表 | 表结构沿用 REQ-019 的 `V6`（原 `V4`，2026-11-16 已落地于分支）：`id`、`trip_id`、`user_id`、`kind`、`payload`（JSON）、`updated_at`；payload 形状固定为 `{"items":[{"id":1,"activity":"…","location":"…"\|"null","time":"HH:mm"\|"null"}]}` | 行不存在 → 首次 PUT 插入；行存在 → PUT 覆盖 `payload` 与 `updated_at`；`{"items":[]}` 合法且保留行；本需求无「删除整行」路径 |
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
| 排序拖拽、跨成员共享、数量/长度上限 | out of scope（P2 裁定，见 delta C6） | REQ-020 OQ-11（已关闭） |
| 并发两次 PUT 同一成员 | out of scope（连接池 = 1，实际串行，last-write-wins） | 技术约束 |

每个场景都有归属行。

### ⑪ 跨 REQ 一致性

| 触点 | 对方口径 | 本需求口径 | 收敛结论 |
|---|---|---|---|
| 偏好表 | REQ-019 的 `V6`（原 `V4`）建 `member_preference` + UNIQUE(`trip_id`,`user_id`,`kind`) | 只写 `kind='must_do'`，不建表、不改列 | 一致：同表不同 kind 互不覆盖，唯一键直接支撑幂等覆盖写 |
| 端点前缀 | REQ-019 的 `GET`/`PUT /api/trips/{tripId}/preferences` | 新增 `GET`/`PUT /api/trips/{tripId}/preferences/must-dos` | 同为路径前缀但资源不同；需在 P3 确认 Spring 的精确匹配不会把子路径落到旧映射 |
| 页面契约 | REQ-019 的页面要求「兴趣选择由一次显式保存提交」 | 同一页新增必做项段，且**动作即保存** | 需在 P2 把 `Preferences page` 标为 MODIFIED，写明「按段区分写入时机」，否则两条契约互相矛盾 |
| 错误 advice | REQ-019 计划在 `com.gogo.preference` 建专属 advice | 复用同一包与同一 advice | 一致；若 REQ-019 的 advice 缺失，本需求的错误码不会产生（WARNING） |
| 行程日期 | `V2` 的 `trip.start_date` / `end_date`（夹具为单日 2026-12-05） | `time` 只存 `HH:mm`，日期隐含行程日期 | 单日一致；多日行程无法定位具体哪天，记为已知偏离（OQ-12） |
| 主线确认 | REQ-004 的 `trip.main_plan_confirmed`；US-037 之前无产品写入路径 | 仅作测试上下文，不设锁定分支 | 一致：AC 的「main plan is unconfirmed」是前提，不是状态机分支 |
| 生成消费 | US-031 的节点 9 需要「必做项汇总」 | `GET` 返回全员明细即汇总输入 | 一致：本需求只提供数据，不实现生成 |
| 计划文档 | `tech-stack-plan.md` §5 的 24 码 `tag` 表、§6 的封套与 `X-Member-Id` | 跟随已合并代码（`X-User-Id`、裸 DTO、无 `tag` 表） | 与 REQ-019 OQ-16 同一文档修正任务，不重复登记 |
| 迁移序列 | `V3` 已随 REQ-004 落 main；`V6`（原 `V4`）归 REQ-019 | 本需求零迁移 | 无编号竞争；唯一风险是 `V6` 尚未合入 `main` 时本变更无法运行（R1）——表与偏好页已于 2026-11-16 在分支落地 |
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
P2 已关闭 OQ-11：不设上限，P4 也不加防御性分支（delta C3/C6）；写放大只作观察项。

## REQ-024

触发：impact 方向为 **modify**（第三次扩展 REQ-019 引入的 `preferences` 能力）。本需求**零迁移**，
复用 `member_preference` 中 `kind = 'budget'` 的行；与 `kind = 'interest'`（REQ-019）、`kind = 'must_do'`（REQ-020）互不覆盖。

### ⑨ 数据契约

| 概念 | 粒度 | 字段 | 状态迁移 |
|---|---|---|---|
| `member_preference`（`kind='budget'`） | 每 (trip, user, kind) **一行**；行内 payload 是**单个对象**（不是数组） | 表结构沿用 REQ-019 的 `V6`（原 `V4`，2026-11-16 已落地于分支）：`id`、`trip_id`、`user_id`、`kind`、`payload`（JSON）、`updated_at`；payload 已设置态 `{"amount":4000,"currency":"SGD","limitType":"hard"}`，未设置态 `{}` | 行不存在 → 首次 PUT 插入；行存在 → 覆盖 `payload` 与 `updated_at`；`{"amount":null}` → payload 写 `{}` 且**保留行**；GET 不建行 |
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
| 金额业务上限 | out of scope（P2 裁定：只拒超 int32，见 delta C4） | OQ-10（已关闭） |
| 编辑他人预算 | out（写路径只认 header 身份，无跨成员入口） | REQ-024 §Actors |
| 并发两次 PUT 同一成员 | out of scope（连接池 = 1，实际串行，last-write-wins） | 技术约束 |

每个场景都有归属行。

### ⑪ 跨 REQ 一致性

| 触点 | 对方口径 | 本需求口径 | 收敛结论 |
|---|---|---|---|
| 偏好表 | REQ-019 的 `V6`（原 `V4`）建 `member_preference` + UNIQUE(`trip_id`,`user_id`,`kind`) | 只写 `kind='budget'`，不建表、不改列 | 一致：同表不同 kind 互不覆盖；UNIQUE 直接支撑 `ON CONFLICT` 的单行覆盖写 |
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
| 迁移序列 | `V3` 已随 REQ-004 落 main；`V6`（原 `V4`）归 REQ-019 | 本需求零迁移 | 无编号竞争；唯一风险是 `V6` 未合入 `main` 时本变更无法运行（R1）——表已于 2026-11-16 在分支落地 |

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
AC 未规定金额业务上限与汇率换算：金额上限已在 P2 关闭（OQ-10 → delta C4，只拒超 int32），汇率仍为非阻塞项（OQ-13）。

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
| 身份与错误码实况 | `TripController`：`USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST` | 同 | 一致：REQ-020 的 DoR 与 proposal 也用这四个码。原「文档写 `UNAUTHENTIC` / `TRIP_FORBIDDEN`」的判断有误，OQ-10 已于 P2 关闭（`git log -S` 只命中本需求的提交 `16e201f`） |
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
## REQ-005

Trigger: impact solution direction is **add** (new frontend-only `app-shell`
capability). One story, one shell frame, one change. No backend or database
concept is introduced; the data contract below covers the frontend navigation
state, which is the only state this change owns.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `route` (parsed hash) | One current route per app instance | `page` ∈ {home, trips-empty, details, create, split, members, join}; `tripId` (integer, details only); `token` (string, join only) | `hashchange` → re-parse; default home for `/` and unknown paths (as-is `App.jsx:8-16`); new entries: bare 行程 path (proposed `#/trips`, OQ-4), `#/split`, `#/members` |
| `userId` (scaffold identity) | One selected id per app instance, App-level state | integer, default 1, from the seeded user list | Switcher change updates it; hash navigation never resets it (App does not remount); every `api()` call sends it as `X-User-Id` (unchanged contract) |
| Tab model | Four fixed tabs | order 仪表盘 / 行程 / 分队 / 成员; each: icon, label, target route, active rule | Active rule: home→仪表盘; trips-empty/details/create→行程; split→分队; members→成员; join→no dock, no active tab |
| Trip selection (OQ-5) | Optional last-opened trip id, P3 decision | integer or none | Proposed: route-derived (details iff the hash carries an id); optional last-trip memory is a P3 UX choice, not a contract field |

No backend table, column, endpoint or wire shape is added or changed (reverse
case R-3). No `{TBD}` field remains: OQ-1/OQ-2/OQ-4/OQ-5 are naming/UX polish
with concrete proposals above, not undecided data fields.
## US-031-037

Trigger: impact solution direction is **add** (new `main-itinerary` capability).
Rulings of 2026-11-15 (intent §Inherited, OQ-6/OQ-7) and the signed 2026-11-14
fixtures ruling govern.
Merge note 2026-11-15: origin/main now includes REQ-003/004 (PR #30/#31, V2/V3
schema + invitations code), so the OQ-9 convergence trigger fired. P2 convergence
ruled: this change appends new tables plus two `trip_member` columns and does
**not** alter `trip` (`main_plan_confirmed` already exists from V3). The
pre-merge "self-built V2+, six tables" wording is superseded by the ownership
notes in ⑨. G1 C2 ruling 2026-11-15 (recommended default A, user-selected; SA
Lumi re-confirmed 2026-11-15): `member_preference` is the kind/payload table owned
by REQ-019's V4 on `feat/travel_preference`; this change appends **V5** with
two new tables (`main_plan_draft`, `main_plan_stop`) plus the two `trip_member`
columns and reads `member_preference`; merge order REQ-019 V4 first. Because
the accept endpoint is now local, the J4 `JOINING_CLOSED` E2E is verifiable in
this change (DoR W1 / impact R2 upgraded).

### ⑨ Data contract

Money is integer cents (SGD); times are local `HH:MM` strings on the trip date
(Asia/Singapore); no `{TBD}` fields remain. Flyway ownership after the OQ-9
convergence and the G1 C2 ruling: `app_user`, `trip`, `trip_member` and
`trip_invitation` come from the merged V2/V3 (REQ-003/004); `member_preference`
comes from REQ-019's V4 (`feat/travel_preference`, read-only here); this change
appends V5 with `main_plan_draft`, `main_plan_stop` and the two `trip_member`
columns. Backend owns every table and projection. Wire field names are
contractual at P2 (fixtures §US-031-037 "Wire projections").

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `app_user` | one row per seeded user | **V2, merged, unchanged**: `id` INTEGER PK; `display_name` TEXT NOT NULL | static seed (ids 1–5 per fixtures) |
| `trip` | one row per trip | **V2 + V3, merged; no V5 change**: `id` PK; `name`; `destination`; `start_date`; `end_date`; `start_location` NULL; `end_location` NULL; `organizer_id` FK; `main_plan_confirmed` INTEGER NOT NULL DEFAULT 0 (V3). No `confirmed_draft_id` column (P2 ruling 2026-11-15) | created(0) → confirmed(1) via US-037; no reopen in scope; null locations completed at generation (signed ruling); the confirmed version is the draft row with `status = 'confirmed'` |
| `trip_member` | one row per (trip, user) | **V2, merged**: `trip_id`; `user_id`. **V5 adds**: `ready` INTEGER NOT NULL DEFAULT 0; `preference_revision` INTEGER NOT NULL DEFAULT 1 | V5 seeds `ready = 1`, `preference_revision = 1` for the fixture trip's four members; later joiners default to not ready; ready 0→1 and revision bumps are test-only in this REQ. Cross-branch write-sync agreement (G1 C2; SA Lumi re-confirmed 2026-11-15; alignment with `feat/travel_preference` = non-gating follow-up F1): REQ-019/020/024 preference writes bump `preference_revision`; REQ-026 submission sets `ready = 1`; these columns stay the generation gate's source of truth |
| `member_preference` | one row per (trip, user, kind) | **REQ-019 V4, read-only here** (G1 C2 default A, user-selected 2026-11-15; SA Lumi re-confirmed 2026-11-15): `id` PK; `trip_id`; `user_id`; `kind` TEXT (`interest` / `must_do` / `budget` / `submission`); `payload` TEXT (JSON); `updated_at` TEXT; UNIQUE(`trip_id`,`user_id`,`kind`) | V5 seeds `interest` + `must_do` rows for the four fixture members (rev 1 via `trip_member.preference_revision`); no `budget` row = no hard limit; reads map `interest.payload.codes` → commonInterests input, `must_do.payload.items` → mustDo input (items carry optional `location`, the P3 source for preferences-first completion), `budget.payload.amount` (limitType `hard`) → hardBudgetCents; the earlier wide-table shape (`interests_json`/`must_do_json`/`hard_budget_cents`) is superseded |
| `main_plan_draft` | one row per (trip, version) | **V5 new**: `id` PK; `trip_id`; `version` INTEGER; `status` TEXT current/superseded/confirmed; `cost_per_person_cents` INTEGER; `input_revisions_json` TEXT (userId→revision); `created_at` | current→superseded on regeneration; current→confirmed on confirm (the confirmed row is the single source of truth for the shared version); stale is computed (input revisions vs current member revisions), not stored; the confirmed version is frozen — `stale` always false for it regardless of later revision changes (P2 lint ruling 2026-11-15) |
| `main_plan_stop` | one row per (draft, seq) | **V5 new**: `seq` INTEGER; `name` TEXT; `start_local` TEXT; `end_local` TEXT; `travel_minutes_to_next` INTEGER NULL (last stop NULL); `interests_json` TEXT NULL (provider-supplied tags, may be empty) | immutable per draft; supplied by MainPlanProvider |
| Plan projection (wire) | one object per plan read, generate 201 and confirm 200 — **same shape** | `tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions` [{userId, revision}], `stops` [{seq, name, startTime, endTime, travelMinutesToNext, interests}] | read-only; `stale` computed on read (unconfirmed drafts only); `confirmed` true for the confirmed version, whose `stale` is always false (frozen, P2 lint ruling 2026-11-15) |
| Confirm validation projection (wire) | detail fields inside the 422 `VALIDATION_FAILED` body | `scheduleErrors` [{type: OUT_OF_ORDER/OVERLAP/MISSING_LEG/TRAVEL_EXCEEDS_GAP/OUT_OF_DAY, seq, message}]; `overruns` [{userId, displayName, hardBudgetCents, overrunCents}] | read-only; confirmation blocks on any non-empty list; staleness blocks separately with 409 `STALE_DRAFT`. `TRAVEL_EXCEEDS_GAP` added by G1 C1 default A (user-selected 2026-11-15; IO Emily ratified 2026-11-15) |
| Generation inputs projection (wire) | one object per trip inputs read | `tripId`, `readyCount`, `memberCount`, `members` [{userId, displayName, ready, preferenceRevision}], `commonInterests`, `mustDo`, `budgets` [{userId, displayName, hardBudgetCents (null = no limit)}], `rules` [identifier] | read-only; readable before any draft exists; member-readable (P2 ruling 2026-11-15; resolves F6) |

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| `#/` default | in | S3; home content under shell, 仪表盘 active |
| Bare 行程 route, no trip selected | in | S5; text empty state, 创建行程 + 按编号打开行程, 行程 active |
| `#/trips/<id>` member read | in | S4; existing details under shell, 行程 active |
| `#/trips/<id>` non-member / unknown id / unreachable | in (unchanged states) | S4/S11; existing denied/missing/failed surfaces, no new behavior |
| `#/create` | in | S6; form + validation unchanged, 行程 active, back → 行程, submit → `#/trips/<id>` |
| `#/split`, `#/members` | in | S7; honest text placeholder + link back to 行程; no demo data |
| `#/join/<token>` valid | out of dock | S8; full-screen preview/accept/joined/closed exactly as today |
| `#/join/<token>` unknown | out of dock | S8; full-screen unusable, no private data, as today |
| Unknown hash path | in (fallback) | As-is home fallback retained; 仪表盘 active |
| Non-numeric id in `#/trips/…` | in (fallback) | As-is regex fails → home fallback; no new route contract |
| Tab switch forward and reverse | in | S2/S10; hash updates without reload, identity kept, unique heading per page |
| Browser back/forward | in | S10; hashchange drives route; identity survives |
| Identity switch on any shell route | in | S9; header updates on every request; label stays scaffold |
| Open-by-id with unknown id | in (existing 404) | OQ-1; reuses details missing state, no list-all call |
| List-all-trips endpoint or call | out of scope | R-1 reverse case; US-061 owns aggregation |
| Fabricated members/routes/statuses | out of scope | R-2 reverse case; placeholders are text only |
| Backend / migration / CI change | out of scope | R-3 reverse case |
| Dock on join/unusable | out of scope | S8 doubles as the guest-navigation reverse case |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-005 | Convergence |
|---|---|---|---|
| Home / greeting surface | REQ-001/REQ-002 `greeting` | Composed under shell at `#/`; fetch and states unchanged | No contract change; placement only |
| Create / details surfaces | REQ-003 `trips` (pending delta, implemented) | Composed under shell; create back-target moves from `#/` to 行程 per the story table | Placement change only; validation, permission and submit contracts unchanged (S11) |
| Invitation panel / join flow | REQ-004 `invitations` (pending delta, implemented) | Panel stays inside details; join/unusable excluded from dock, scaffold bar retained | No contract change; AC9 + OQ-6 |
| Identity contract | REQ-003 "Trip caller identity" | Reuses `X-User-Id` switcher, App-level state | Same contract, no second identity mechanism |
| Hash router | REQ-004 design D7 | Extends the shared `parseRoute` table, no new router dependency | One routing mechanism |
| Future tabs | US-013, US-038–062, US-061 (backlog) | Placeholders now; real features later replace placeholder content inside the same shell | Shell is the stable anchor; no conflict now |

No ✗ row remains. `app-shell` is disjoint from the three active changes'
delta sets (`greeting`, `trips`, `invitations`); archive order is independent.
| All members ready | in (G1) | readiness gate reads trip_member; generation proceeds |
| Any member pending | in (G2) | blocked; pending members named; no draft row |
| Provider supplies fixture stops | in | fake MainPlanProvider = MVP production (ruled); port seam |
| Provider returns empty | out of scope | fake provider contract always supplies the fixture stops; real-provider behavior belongs to the replacement seam |
| Null start/end location | in (G3) | completion per signed ruling: preferences first, random fallback |
| Supplied nonblank locations | in (G3) | preserved unchanged |
| Inputs read by a member | in (I1/M6) | member-readable summary (P2 ruling 2026-11-15); write actions stay organizer-only |
| Inputs read before any draft | in (I2/M7) | 200 summary; `NO_DRAFT` does not apply to the inputs read |
| Inputs read by a non-member | in (I3/M8) | 403 NOT_A_MEMBER |
| Schedule ordered, legs present and fitting the gaps, within trip day | in (C1) | OQ-6 minimal feasible set + G1 C1 travel-fit rule passes (equality allowed) |
| Overlap / missing leg / out-of-day | in (C3) | specific schedule errors; confirmation blocked |
| Travel leg longer than the gap to the next stop | in (C3/V3) | `TRAVEL_EXCEEDS_GAP` on the stop carrying the leg (end time + leg > next start); blocks confirmation; equality passes (G1 C1 default A, user-selected 2026-11-15; IO Emily ratified 2026-11-15) |
| Every hard budget ≥ cost | in (C1) | NULL hard budget = no limit |
| Any hard budget < cost | in (C2) | per-member overrun shown (cents → SGD display); blocked |
| Draft input revisions == current | in (C1) | current draft confirmable |
| Any revision advanced | in (C4) | stale; blocked until regeneration (OQ-7) |
| Revision advanced after confirmation | in (M13) | confirmed version frozen: `stale` stays false; staleness applies to unconfirmed drafts only (P2 lint ruling 2026-11-15) |
| Organizer writes | in | generate/confirm allowed |
| Non-organizer / non-member / no identity / unknown trip | in (G4, C5, M-N/V-N) | 403 NOT_ORGANIZER / 403 NOT_A_MEMBER / 401 USER_REQUIRED / 404 TRIP_NOT_FOUND |
| No draft at confirm | in (C5/V6) | 404 NO_DRAFT (ruled 2026-11-15) |
| Already confirmed | in (C6/V7) | 409 ALREADY_CONFIRMED (OQ-8 ruled 2026-11-15); no state change |
| Generate after confirmation | in (G6/M14) | 409 ALREADY_CONFIRMED; no new draft; replanning deferred to R2 (user accepted and Emily IO approved 2026-11-15; overall G1 Pass) |
| Joining after confirm | in (C1) | flag set here; JOINING_CLOSED enforced by REQ-004 accept (unchanged) |
| Concurrent confirms | out of scope | single organizer per trip; SQLite write serialization is a design concern, not a product branch |

### ⑪ Cross-REQ consistency

| Item | Other REQ | US-031-037 | Convergence |
|---|---|---|---|
| Location completion | REQ-003 C7: completion only during US-031 generation | G3 implements it | ✓ signed 2026-11-14 ruling (IO Emily/SA Johnson) |
| Closed joining | REQ-004 J4: accept 403 JOINING_CLOSED when flag=1; "US-037 owns the flow" | C1 sets the flag | ✓ fixtures anchor; invitations code unchanged and now merged locally, so the J4 E2E runs in this change (DoR W1 upgraded at P2) |
| Confirmed-state test setup | REQ-004 used test-only DB update | product confirm flow now produces it | ✓ precedent retained for later REQs; fixtures US-031-037 section records supersession |
| Schema divergence | REQ-003/004 V2/V3 merged into main (PR #30/#31); REQ-019 (`feat/travel_preference`) owns `member_preference` V4 | V5 extends: 2 new tables + `trip_member.ready` / `preference_revision`; no `trip` ALTER; confirmed version derived from draft status; `member_preference` read-only here (kind/payload) | ✓ OQ-9 converged at P2 2026-11-15; G1 C2 default A (user-selected 2026-11-15) fixes shape/numbering/merge order — SA Lumi re-confirmed 2026-11-15; write-sync alignment with `feat/travel_preference` (SA evelyn.huang) = non-gating follow-up F1 (g1-decision.md). Fixture-self-contained ruling stands: V2 seeds users/trip, V5 seeds readiness + preference kind rows |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Shell frame | Any in-app route renders | Traveler | Centered ≤430 px column, 100 dvh, scrolling content, fixed dock below, safe-area padding; existing tokens | Client render |
| Bottom dock | Shell present | Traveler | Four tabs (icon + label) in fixed order; active highlight from brand tokens; hash targets | Client navigation |
| 仪表盘 page | `#/` | Traveler | Existing home content: greeting status, create entry, identity scaffold; unique heading | `GET /api/greeting` (unchanged) |
| 行程 empty state | Bare 行程 route, no trip selected | Traveler | Text empty state + exactly two actions: 创建行程, 按编号打开行程; unique heading; no trip data | Client render; open-by-id → `#/trips/<id>` |
| 行程 details | `#/trips/<id>` | Trip member | Existing hero, information rows, organizer invitation panel; loading/denied/missing states unchanged | `GET /api/trips/{id}` (unchanged) |
| Create page | `#/create` | Traveler | Existing six inputs + validation; back → 行程; busy/error states unchanged | `POST /api/trips` (unchanged) |
| 分队 placeholder | `#/split` | Traveler | Honest "not implemented yet" text + link back to 行程; unique heading; no demo data | Client render |
| 成员 placeholder | `#/members` | Traveler | Honest "not implemented yet" text + link back to 行程; unique heading; no demo data | Client render |
| Join / unusable | `#/join/<token>` | Invited guest | Full-screen, no dock; preview/accept/joined/closed/unusable exactly as today; scaffold bar retained | Invitation endpoints (unchanged) |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

No retention, volume or SLA is stated by any AC; the shell adds no data.
Browser support for `100dvh` and safe-area insets is a verification item at P4
(R19), not a requirement unknown. Recorded, not invented.

## REQ-008

Trigger: impact solution direction is **add** (new `auth` capability) plus
**modify** (`trips`/`invitations` identity, `app-shell` login/switcher). This is
the first change that stores credentials and session-derived identity, so the
data contract covers both the persisted credential row and the runtime session.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions |
|---|---|---|---|
| `account_credential` (new, V6) | One row per `app_user` account | `user_id` INTEGER PRIMARY KEY REFERENCES `app_user(id)`; `email` TEXT NOT NULL with a UNIQUE index (trimmed, lower-cased for comparison); `password_hash` TEXT NOT NULL (BCrypt, never plaintext) | Seeded once for users 1–5 by `V6` (V1–V5 occupied: V4 = splits, V5 = main plan); no create/update/delete path in this change (registration/password change out of scope) |
| Authenticated account (wire) | One object per login/`me` response | `id` (integer), `name` (`app_user.display_name`), `email` (credential email); no password/hash field ever | Read-only projection |
| Session (Spring Security) | One server-side session per signed-in browser | Session id in an HttpOnly cookie; principal carries account id/email/name; CSRF token bound to the session; idle timeout configurable (30 min default, short in tests) | anonymous → authenticated on valid login (session id rotated); authenticated → anonymous on expiry, invalid cookie or future logout; restart of the single server drops in-memory sessions and therefore authenticates nobody |
| CSRF token | One token per session, exposed to the SPA | `XSRF-TOKEN` cookie readable by same-origin JS; required in the `X-XSRF-TOKEN` header for state-changing requests | Issued on bootstrap/login; validated per request; invalid/missing → 403 and no state change |
| Pending invitation (client) | At most one token per browser tab | Invitation token string plus the intended `#/join/<token>` route, held only while signed out | Set when a guest acts on a preview without a session; consumed after login to resume the preview; cleared when the preview is left or accepted; never triggers an automatic accept |
| Frontend auth state | One per app instance | `checking` (bootstrap `me` request), `signedIn` (account), `signedOut` (login required) | Boot → `checking`; 200 `me` → `signedIn`; 401 → `signedOut`; login success → `signedIn`; 401 on any protected call → `signedOut` + login page |

No `{TBD}` field remains. The only intentionally open values are the documented
demo password/emails (fixture content, OQ-8) and the timeout number (OQ-4); both
have concrete proposals and do not change grain or ownership.

### ⑩ Boundary enumeration

| Branch | In / out | Attribution |
|---|---|---|
| Valid seeded email + password | in | S1; 200 account + new session; `me` 200; dashboard opens |
| Unknown email, wrong password, malformed/blank fields | in | S3; one generic credential failure (401), no session, no account-existence signal |
| Same email with different letter case or surrounding spaces | in | Credential comparison trims and lower-cases; same account, no duplicate row |
| Protected endpoint without a session cookie | in | S4/S9; 401 `USER_REQUIRED`, no private data |
| Protected endpoint with an expired/invalid session | in | S5; 401 `USER_REQUIRED`, no private data; frontend opens login |
| Request with only the old `X-User-Id` header | in (reverse case) | S9/R-1; unauthenticated 401; the header is ignored by design |
| Login while already authenticated | in | S10-adjacent; new login rotates the session id; already-signed-in access to `#/login` returns to dashboard (OQ-10) |
| Login success on an existing anonymous session | in | S10; old session id stops authenticating (fixation protection) |
| Session cookie from a previous server run | in | Invalid after restart; 401/login (in-memory session store) |
| Public greeting / invitation preview | in | S7; unchanged, identity-free |
| Public preview → accept while signed out | in | S2; 401 on accept, pending invitation retained, login, preview resumes, explicit accept required |
| Authenticated accept for a valid/open invitation | in | S6; existing join rules and duplicate-membership protection unchanged |
| Authenticated non-member reading a trip | in | S6; 403 `NOT_A_MEMBER`, no trip values (unchanged) |
| State-changing request without a valid CSRF token | in | S8; 403, no state change; login POST also requires the bootstrap token |
| CSRF bootstrap request | in (public) | `GET /api/auth/csrf` issues/refreshes the token cookie without exposing account data |
| Logout / account edit / registration request | out of scope | R-2; no endpoint or UI is added (US-068/US-069 own them) |
| Identity switcher or seeded-user list in the browser | out of scope | R-3; removed, no replacement switch affordance |
| Plaintext password storage or logging | out of scope | R-5; BCrypt only; passwords never returned or logged |
| Membership rule change | out of scope | R-6; authentication proves identity, not membership |

Every branch referenced by a scenario has a row above.

### ⑪ Cross-REQ consistency

| Item | Other requirement | REQ-008 | Convergence |
|---|---|---|---|
| Caller identity | `trips` "Trip caller identity" (living) | MODIFY: session principal replaces `X-User-Id`; 401 `USER_REQUIRED` retained; 403 membership rule unchanged | One identity mechanism; no header fallback |
| Trip creation/detail | `trips` creation/detail requirements | Behavior unchanged; the organizer/member is the authenticated account | Scenarios rewritten to "after login as Alice/Ben" |
| Invitation issuance/accept | `invitations` issuance/acceptance (living) | MODIFY: principal replaces the header; preview stays public; identity-error precedence stays | Same outcomes and codes |
| Main-plan identity | `main-itinerary` "Authorization and identity for main-plan operations" (living) | MODIFY: session principal replaces `X-User-Id`; organizer/member outcomes and `USER_REQUIRED` retained | Delta added in this change |
| Split identity | `splits` five draft endpoints (living) | MODIFY: session principal replaces the header; `MEMBER_REQUIRED` and the `{data,error}` envelope remain documented exceptions | Delta added in this change; no split behavior change |
| Shell identity surface | `app-shell` "Mobile shell frame" (living) | MODIFY: switcher removed, signed-in name shown read-only; login is full-screen without dock; dock/frame/join exclusion unchanged | Shell is signed-in only; guest preview outside |
| Greeting | `greeting` (living) | Unchanged and public | No dependency |
| Dashboard landing | `app-shell` "Dashboard tab placement"; US-061 | `#/` becomes protected and is the post-login landing; aggregation still US-061 | No dashboard data added here |
| Scanner | US-067 (Backlog) | Consumes `#/login` and session; no scanner code | Downstream only |
| My Account / logout | US-068/US-069 (Backlog) | Session and principal support them; no account/logout endpoint added | Downstream only |
| Binding plan | `docs/knowledge/architecture/tech-stack-plan.md` | Plan states no accounts and `X-Member-Id`; this change adds Spring Security + credentials | Recorded deviation; reconcile at archive per `openspec/config.yaml` |
| Fixtures/tests | trip/invitation/main-plan/splits acceptance tests use the header | Rewrite to authenticate via session; expected outcomes/codes unchanged | Test-only migration, no product contract change |

No ✗ row remains. `auth` is new; `trips`, `invitations`, `app-shell`,
`main-itinerary` and `splits` are the modified capabilities; `greeting` is
untouched.

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Login page | Signed-out access to a protected page, or direct `#/login` | Signed-out traveler | Full-screen (no dock) email + password form, submit, busy and generic failure text; no account-existence hints, no account data, Ant Design language | Login/CSRF endpoints over HTTP |
| Post-login dashboard | Successful login with no pending invitation (or other intercepted page) | Signed-in traveler | `#/` dashboard/home content with the dock; signed-in account name shown read-only | Session cookie |
| Invitation resume | Successful login with a pending invitation | Signed-in invited guest | The same `#/join/<token>` preview resumes; no automatic join; explicit accept remains | Session cookie + public preview |
| Protected-page redirect | 401 from a protected page/API or an expired session | Signed-out/expired traveler | Login page opens; no private trip, member, invitation or account data is rendered | Client route guard + 401 |
| Shell identity indicator | Any signed-in shell route | Signed-in traveler | Read-only account display name; no switcher, no seeded-user list, no account actions | Session-derived `me` |
| Public greeting | Home/dashboard greeting request | Any visitor | Existing greeting content | `GET /api/greeting` (public) |
| Public invitation preview | Guest opens `#/join/<token>` | Any visitor | Existing public preview (trip name, destination, dates, joining state); no identities | `GET /api/invitations/{token}` (public) |
| Split error surface | Split endpoint without a valid session | Caller | `401 MEMBER_REQUIRED` with `{data:null,error:{code,message}}`; unchanged from the merged splits contract | Split endpoints (session-derived identity, documented exception) |

No notifications (email, push, queue) are in scope.

### NFR business-policy layer

The only policy values stated are the session idle timeout (proposed 30 minutes,
configurable) and BCrypt hashing. Rate limiting, account lockout, password
complexity and audit logging are deployment/security-operations concerns not
named by any AC; recorded as non-blocking for Dev/SA, not invented.

| Screen 9 generate summary | page load | members (P2 ruling 2026-11-15; write actions stay organizer-only) | ready count (4/4) + member names; common interests chips; must-do summary; constraints/budget lines; generation rules list | generation inputs projection (`GET /api/trips/{id}/main-plan/inputs`, P2 ruled; members may read) |
| Screen 10 draft timeline | draft read | members | per stop: name, time range, interest tags (provider-supplied, may be empty), cost per person; version badge; stale banner when stale | plan projection |
| Screen 10 validation status / blocked errors | confirm attempt | organizer | scheduleErrors list; per-member overrun amount (10 SGD case); stale message | confirm validation projection |
| Screen 10 confirmed state | confirm success | members | confirmed version badge; shared plan timeline; joining-closed notice | plan projection (confirmed flag) — the confirm 200 body is the same projection |
| Loading / empty / error / permission states | request lifecycle / no draft / failure / non-organizer | viewer | skeleton; no-draft CTA to generate; load-failure text; read-only or denied write UI | same projections; mandatory even if unpictured |

No notifications (email/push/queue) in scope.

### NFR business-policy layer

Retention/volume/SLA not decidable for this slice and not required by any AC;
recorded as non-blocking for Dev, not invented.

## US-049-050

补充 B 链收口（确认 / 取消）的数据契约、边界枚举、跨 REQ 对齐与展示契约。依据：`requirements/US-049-050.md`、`intents/2026-11-16-us-049-050-split-confirm-cancel.md`、main 代码与 `V4__splits.sql`。

### ⑨ Data contract

**概念：拆分草稿（单行，`split_draft`）**

| 维度 | 台账 |
|---|---|
| 粒度 | 一行 = 一个行程的当前草稿（`trip_id UNIQUE`）；无历史行 |
| 载体 | `split_draft(id TEXT PK, trip_id INTEGER UNIQUE, document TEXT, draft_version INTEGER, created_at, updated_at)`；业务字段全在 `document` JSON（`SplitDraftDocument`） |
| 关键字段 | `initiatorMemberId`（`app_user.id` 字符串）、`mainPlanVersion`、`draftVersion`、`status`、`departureStopId`/`reunionStopId`、`groups{A:[ids],B:[ids]}`、`routes{A|B:{activityMinutes,travelLegsMinutes[],bufferMinutes}}`、`createdAt`/`updatedAt` |
| 状态集 | `active`（可编辑/可确认/可取消）、`confirmed`（冻结，不可编辑/不可取消）、`cancelled`（终止，仅可被替换重建） |
| 状态迁移 | `active → confirmed`（组织者确认成功）；`active → cancelled`（发起人取消）；`cancelled → active`（同一行重建：`document` 全量替换为新发起者 + `draftVersion = 1`）；`confirmed → *` 禁止 |

**迁移与字段变更（无 schema 变更、无新迁移）**

| 动作 | 列变更 | 文档变更 | 其他写入 |
|---|---|---|---|
| 确认 | `document`、`updated_at`；`draft_version` **不变** | `status: active → confirmed`；其余字段原样保留（路线/分组/边界即生效契约） | 无（split 路线节点已在生成时落库） |
| 取消 | `document`、`updated_at`；`draft_version` **不变** | `status: active → cancelled` | `DELETE FROM plan_node WHERE trip_id=? AND branch_id IN ('split-a','split-b')`，与状态更新同一事务；`branch_id='main'` 节点不动 |
| 替换重建 | `document`、`draft_version` 重置 1、`updated_at` | 新文档：`initiatorMemberId = 调用者`、`mainPlanVersion = 当前`、`status = active`、边界/路线清空、`groups` 由夹具供给 | 沿用 US-038 的首次创建逻辑（无 split 路线节点可删） |

**确认的判定输入（服务端复算）**：窗口 = `departureStop.endAt → reunionStop.startAt`（分钟）；两条路线时长 = `activityMinutes + Σ travelLegsMinutes + bufferMinutes`；任一 `missingInputs` 非空或 `feasible = false` → 不可确认。判定完全来自草稿文档，零额外读库；**客户端 `confirmable` 不参与**。

**错误契约**（仅 `code` 为契约）：`NOT_SPLIT_ORGANIZER` 403（新增）、`SPLIT_TIMING_INFEASIBLE` 409（新增，附 `totalMinutes`/`overrunMinutes`/`missingInputs`）、`STALE_DRAFT_VERSION` 409、`SPLIT_DRAFT_NOT_ACTIVE` 409、`NOT_SPLIT_INITIATOR` 403、`SPLIT_BOUNDARIES_REQUIRED` 409、`INVALID_ROUTE_PAIR` 400，以及三守卫码 `MEMBER_REQUIRED` 401 / `TRIP_NOT_FOUND` 404 / `NOT_A_MEMBER` 403。

### ⑩ Boundary enumeration

| 分支 | in / out | 归属与可观察结果 |
|---|---|---|
| 确认成功（两组齐全、边界已存、路线对可行） | in | CF1：`200` + `status=confirmed` + 后续编辑 `409 SPLIT_DRAFT_NOT_ACTIVE` |
| 超窗（A=125 > 120） | in（拒绝） | CF2-N：`409 SPLIT_TIMING_INFEASIBLE` + `overrunMinutes=5`；草稿仍 `active` |
| 缺输入（活动时长/末段交通为 null） | in（拒绝） | CF3-N：`409 SPLIT_TIMING_INFEASIBLE` + `missingInputs`；不得宣布可行 |
| 版本落后（请求 v1、实际 v2） | in（拒绝） | CF4-N：`409 STALE_DRAFT_VERSION`；状态不变 |
| 非组织者确认 | in（拒绝） | CF5-N：`403 NOT_SPLIT_ORGANIZER` |
| 无草稿 / 已 confirmed / 已 cancelled 时确认 | in（拒绝） | CF6-N：`409 SPLIT_DRAFT_NOT_ACTIVE` |
| 取消成功（发起人 + 活跃草稿） | in | CN1：`200` + `status=cancelled`；main 节点逐行不变；split 节点清零；随后重建 `201` |
| 取消已确认草稿 | in（拒绝） | CN2-N：`409 SPLIT_DRAFT_NOT_ACTIVE`；已确认文档与路线不变 |
| 非发起人取消 | in（拒绝） | CN3-N：`403 NOT_SPLIT_INITIATOR` |
| 无草稿时取消 | in（拒绝） | CN4-N：`409 SPLIT_DRAFT_NOT_ACTIVE` |
| 身份/行程/成员前置 | in（拒绝） | R1-N：`401 MEMBER_REQUIRED` / `404 TRIP_NOT_FOUND` / `403 NOT_A_MEMBER`，`data=null` |
| 确认/取消后继续编辑（边界、生成） | **out** | 锁定语义：既有写端点返回 `409 SPLIT_DRAFT_NOT_ACTIVE` |
| 多草稿并存 / 历史保留 / 回滚已确认拆分 | **out** | 单行模型；不建历史表（如需审计另立需求） |
| 真实路径供给 / 重新规划 | **out** | R2 预留 |

### ⑪ Cross-REQ consistency

| 对手方 | 该方契约 | 本变更对齐 |
|---|---|---|
| US-038 发起 | 唯一活跃草稿 + 版本 1 + `MAIN_PLAN_NOT_CONFIRMED` 前置 | 本变更把 `startDraft` 扩展为「行不存在 → 插入；行存在且 `cancelled` → 同行重建」；`active`/`confirmed` 仍 `409 SPLIT_DRAFT_CONFLICT` |
| US-039 边界 | 仅发起人可写、版本条件更新 | 确认/取消沿用同一版本条件更新策略（`{draftVersion}`） |
| US-042 路线生成 | 成对原子写 `plan_node(split-a/split-b)` | 取消删除同一批节点；确认不改动它们 |
| US-043 时间校验 | 纯计算零写库，输出 `feasible` 等 | 确认复用同一计算域（服务端复算），**不复用其响应**（未持久化） |
| `main-itinerary` | `trip.main_plan_confirmed` 为主线索 | 确认/取消都不改该标志；取消后主线仍未拆分状态 |
| Living Spec `splits` | 写 `X-Member-Id`、`trip.split_draft` 列、V2 | **漂移**：本 delta 以 MODIFIED 修正为 `X-User-Id`、`split_draft` 表、V4（BQ-4 裁决） |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| Screen 15 复核页 | 进入 `/trips/:tripId/split/confirm` | 成员 | 两条路线卡（分组、活动/交通/buffer 分解、合计与窗口对比）；边界（出发/会合 + 窗口分钟）；校验结论（通过/超窗量/缺失项）；状态徽标（active/confirmed/cancelled） | `GET /api/trips/{tripId}/split-draft` |
| 确认按钮 | organizer + `status=active` | 组织者 | 可点/禁用 + 原因（非组织者、草稿未就绪、不可行） | `POST .../split-draft:confirm` |
| 取消动作 | initiator + `status=active` | 发起人 | 二次确认提示；成功后回到未拆分状态并提示可重新发起 | `POST .../split-draft:cancel` |
| 拒绝反馈 | 4xx | 操作者 | `error.code` 映射文案：超窗显示超出分钟数；缺输入列出缺失项；权限类只读提示 | 同上 |
| 四态 | 请求生命周期 / 无草稿 / 失败 / 无权限 | 查看者 | loading 骨架；empty=无草稿（入口回发起页）；error 文案 + 重试；permission 只读视图 | 现有投影；截图未画也必须实现 |

无通知类投递（邮件/推送/队列）在本期。

### NFR business-policy layer

确认记录的保留期与 SLA 无 AC 约束，OQ-N7 遗留仍 deferred（owner Dev）；本期以单行草稿状态承载，不发明保留策略。
## REQ-009

账号生命周期收口（My Account/改名 / 退出 / 注册）的数据契约、边界、跨 REQ
对齐与展示契约。依据：`requirements/REQ-009.md`、
`intents/2026-11-16-req-009.md`、REQ-008 归档代码与 `V6__create_account_credential.sql`。

### ⑨ Data contract

**概念：账号（`app_user` + `account_credential`，一对一）**

| 维度 | 台账 |
|---|---|
| 粒度 | 一行 `app_user` = 一个账号；一行 `account_credential` = 该账号的登录凭据（`user_id` PK/FK） |
| 既有字段 | `app_user(id INTEGER PRIMARY KEY, display_name TEXT NOT NULL)`；`account_credential(user_id, email, password_hash)`；`uk_account_credential_email(email UNIQUE)` |
| 注册写入 | 同一事务：`INSERT INTO app_user(display_name)`（rowid 自增）→ 取生成 id → `INSERT INTO account_credential(user_id,email,password_hash)`；显示名与邮箱均已 trim/归一化 |
| 改名写入 | `UPDATE app_user SET display_name = ? WHERE id = ?`（id 仅取自会话主体） |
| 退出 | 不写账号/凭据/成员表；只失效当前 HTTP session 与其 SecurityContext |
| 账号投影 | `AccountResponse {id, name, email}`（沿用 REQ-008）；不含密码、哈希或会话信息 |
| 迁移 | **无 schema 变更、无新迁移**。V6 已提供唯一邮箱索引；`app_user.id` 为 rowid 别名，可自动分配 |

**注册请求与响应**

| 项 | 契约（wire 细节 P2 定死） |
|---|---|
| 请求 | `POST /api/auth/register`，`{email, name, password}`；公开但要求 CSRF token |
| 归一化 | 邮箱 `trim().toLowerCase(Locale.ROOT)`；显示名 `strip()`；密码不 trim（原样校验/哈希） |
| 校验 | 邮箱基础格式（单个 `@`、两侧非空、域名含点）；显示名 1–30 字符；密码 6–72 **字节**（BCrypt 72 字节上限） |
| 成功 | `200 {"next":"login"}`；无 `Set-Cookie` 会话；无账号投影 |
| 重复邮箱 | `409 EMAIL_TAKEN`（扁平 `{code,message}`）；不建第二行；注册页弹窗“该邮箱已注册”并提供去登录/修改邮箱（用户 2026-11-17 指令，覆盖原不披露响应，接受邮箱枚举风险） |
| 并发重复 | 事务内唯一索引冲突 → 捕获并映射为同一通用成功；最终恰一行 |
| 校验失败 | `400` 扁平 `{code,message}`（`INVALID_EMAIL` / `INVALID_NAME` / `INVALID_PASSWORD`，具体码 P2）；不建行、不建会话 |
| 服务失败 | `5xx` 扁平 `{code,message}`；事务回滚，不留下半条账号；重试幂等（唯一索引兜底） |

**资料更新 / 退出**

| 端点 | 请求 | 成功 | 失败 |
|---|---|---|---|
| `PATCH /api/auth/me` | `{name}`；CSRF；会话主体 | `200 {id,name,email}`，名称为 trim 值 | 400 `INVALID_NAME`；401 `USER_REQUIRED`；403 `CSRF_INVALID` |
| `POST /api/auth/logout` | 无体；CSRF；会话主体 | `204`；session 失效、SecurityContext 清空、cookie 失效 | 401 `USER_REQUIRED`（无/已失效会话）；403 `CSRF_INVALID`；5xx 时前端显示可恢复错误 |

**错误契约**：沿用 REQ-008 的扁平 `{code,message}`；不新增第三层封装。登录
`INVALID_CREDENTIALS` 不变。`AuthErrorAdvice` 当前把所有不可读 JSON 映射为
401 `INVALID_CREDENTIALS`，P3 需让注册/改名的不可读请求体落到 400 校验错误。

### ⑩ Boundary enumeration

| 分支 | in / out | 归属与可观察结果 |
|---|---|---|
| 注册成功（合法邮箱/名/密码） | in | R1：`200 {"next":"login"}`；恰一行 `app_user` + 一行凭据；名称为 trim 值；无会话 |
| 重复邮箱（不同大小写/空格） | in（明确提示） | R2：`409 EMAIL_TAKEN`；行数不变；注册页弹窗“该邮箱已注册” |
| 并发同一邮箱 | in（静默） | R3：恰一行；两个请求均为通用成功；无 5xx 泄漏 |
| 邮箱非法/缺失 | in（拒绝） | R4：`400 INVALID_EMAIL`；无行 |
| 显示名空/纯空白/31 字符 | in（拒绝） | R5：`400 INVALID_NAME`；无行 |
| 密码 5 字符或 73 字节 | in（拒绝） | R6：`400 INVALID_PASSWORD`；无行 |
| 注册服务失败 | in（失败） | R7：5xx 扁平错误；事务回滚；重试不产生重复 |
| 注册时持有邀请 → 登录 | in | R8：注册不建会话；登录后恢复 preview；接受仍显式 |
| 新账号打开 My Account | in | R9：显示注册名/邮箱；无成员关系 |
| 未登录读/改资料 | in（拒绝） | M0：401 `USER_REQUIRED`；前端打开登录页 |
| 改名合法（1/30 字符、带空格） | in | M1：200；trim；全表面更新 |
| 改名空/纯空白/31 字符 | in（拒绝） | M2：400；旧值不变 |
| 改名请求带他人 id | **out** | 端点不接受目标 id；只作用于会话主体；他人资料不可寻址 |
| 改名服务失败 | in（失败） | M3：可恢复错误；旧值保持 |
| 退出成功 | in | L1：204；`me` 及受保护面 401；登录页 |
| 退出时无/已失效会话 | in（拒绝） | L2：401；前端按已登出展示，不宣称新成功 |
| 退出 CSRF 缺失 | in（拒绝） | L3：403 `CSRF_INVALID`；会话仍有效 |
| 退出服务失败 | in（失败） | L4：可恢复错误；本地不错误清空 |
| 退出后数据完整性 | in | L5：账号/名称/成员/组织者/分组/行程不变 |
| 邮箱验证 / 改密 / 找回 / SSO / remember-me | **out** | 明确非目标（R-1/R-2） |
| 账号删除 / 停用 / 管理员用户管理 | **out** | 明确非目标（R-3） |
| 头像上传 | **out** | 首字母由名称派生，无上传 |
| 扫码入口 | **out** | US-067；本 change 不新增 scan 控件 |
| 注册/登录限流、锁定、验证码 | **out** | 部署例外（OQ-13，owner Dev/SA） |

### ⑪ Cross-REQ consistency

| 对手方 | 该方契约 | 本变更对齐 |
|---|---|---|
| REQ-008 `auth` | login/me/csrf；BCrypt；session/CSRF；扁平错误；`USER_REQUIRED` | 复用同一投影与错误体；注册后必须走 `POST /api/auth/login`；`SecurityConfig` 只新增显式 logout/register/profile 路径，不启用表单登录 |
| REQ-008 `app-shell` | 登录页全屏无 dock；壳内页面需登录；右上角只读姓名（REQ-008 OQ-9） | MODIFIED：新增"我的"tab；移除右上角身份条；问候使用账号名；登录页/注册页全屏，壳/dock/join 例外不变 |
| `trips` / `invitations` / `main-itinerary` | 身份 = 会话主体；成员/组织者按 `app_user.id` | 行为不变；姓名展示读取最新 `display_name`；成员判断仍按 id |
| `splits` | 会话主体；`MEMBER_REQUIRED` + `{data,error}` 例外 | 不改拆分行为；split 页"已登录 · 姓名"身份条需与右上角身份条一并核对 |
| `greeting` | 公开问候 | 不变；仪表盘问候改用 `me` 的账号名是前端展示，不修改 greeting API |
| 数据库 V6 | 唯一邮箱索引 + BCrypt 种子 | 复用；无新迁移；并发重复由索引兜底 |
| tech-stack-plan §2/§14 | "MVP 不做账号体系/注册登录" | 继续记录偏差；归档时按 `openspec/config.yaml` 收敛 |
| US-067 | 扫码控件（未实现） | 本 change 不新增 scan；US-068 "scan remains available" 解释为不破坏既有控件 |
| US-061 | 仪表盘聚合（未实现） | 只加问候名称，不做聚合 |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel |
|---|---|---|---|---|
| 登录页 "Create account" | 未登录渲染 | 未登录旅行者 | 链接到注册页；保留演示账号区 | `#/login` / `/login` |
| 注册页 | 点击 Create account | 未登录旅行者 | 邮箱/显示名/密码字段、提交、返回登录；逐字段校验错误；成功后跳登录并预填邮箱 | `POST /api/auth/register` |
| My Account 资料 | 底部导航"我的" | 已登录持有人 | 显示名、邮箱、改名输入、保存、退出登录；无右上角快捷入口 | `GET/PATCH /api/auth/me` |
| 底部导航 | 已登录壳内 | 已登录持有人 | 新增"我的"tab（既有 仪表盘/行程/分队/成员 + 我的） | `TabBar` |
| 仪表盘问候 | 打开 `#/` | 已登录持有人 | 账号显示名；不追加"组织者"；角色徽标仍在行程角色处 | `me` 投影 |
| 全名称面 | 改名成功 / 任意读取 | 同行程用户 | 成员列表、邀请身份、偏好、路线/分组标签、头像首字母使用最新名称 | 既有读接口 |
| 退出反馈 | 点击退出成功/失败 | 已登录持有人 | 成功 → 登录页；失败 → 可恢复错误，不宣称失效 | `POST /api/auth/logout` |
| 错误反馈 | 4xx/5xx | 操作者 | 扁平 `code` 映射文案；字段校验可操作；重复邮箱按用户 2026-11-17 指令明确提示“该邮箱已注册”（覆盖原不披露条款） | 同上 |

无通知类投递（邮件/短信/推送/队列）在本期；无邮箱验证邮件。

### NFR business-policy layer

注册/登录限流、账号锁定与验证码作为部署关注点记录为文档化例外（OQ-13，
owner Dev/SA）；不发明账号保留期或删除策略；退出只结束会话，不触发数据清理。

## US-013

Trigger: impact solution direction is **add** (a member-only read in the
existing `trips` capability plus a MODIFIED `app-shell` requirement). One story,
one read-only vertical slice. No new business concept, no migration; the roster
is derived from existing `V2` tables. Post-merge remediation (2026-11-16): the
branch merged `group1/main` (`135d3df`), so identity is the US-066 account
session and 分队 is the shipped split entry.

### ⑨ Data contract

| Concept | Grain | Fields | State transitions | Source |
|---|---|---|---|---|
| Member roster | One list per trip read | Wire: `tripId`, `members[]` where each row is `{userId, displayName, organizer}` | None in this change (read-only); rows appear when membership is created | Derived from `trip_member` + `app_user` + `trip.organizer_id` |
| Trip membership | One row per (trip, user) | `trip_id`, `user_id` | Created by trip creation (organizer) or invitation acceptance (REQ-004 J2/J3); no update/delete path in this change | `V2__create_trip.sql` |
| User | One row per seeded user | `id`, `display_name` | Seeded by V2 | `V2__create_trip.sql` |
| Account identity | One credential row per seeded user | `user_id`, `email`, `password_hash` | Seeded by V6; session established by `/api/auth/login` | `V6__create_account_credential.sql` |
| Organizer flag | One boolean per member row | `organizer` = (`user_id` = `trip.organizer_id`) | Derived on read; never stored in `trip_member` | `trip.organizer_id` |

No `{TBD}` field remains. Ordering is contractual for deterministic tests:
ascending `userId`. Avatar colour/initial treatment is a visual choice, not a
data field.

### ⑩ Boundary enumeration

| Rule | Branch | In / Out | Rationale |
|---|---|---|---|
| Caller identity | No authenticated session | Out — `401 USER_REQUIRED` | SecurityConfig entry point (US-066) |
| Caller identity | Only a retired `X-User-Id` header (blank, non-numeric or seeded id) | Out — `401 USER_REQUIRED` | Header no longer authenticates |
| Trip existence | Known caller, unknown trip id | Out — `404 TRIP_NOT_FOUND` | Distinct from denial |
| Trip existence | Outsider, unknown trip id | Out — `404 TRIP_NOT_FOUND` | Existence is checked before membership (D4) |
| Membership | Known outsider on an existing trip | Out — `403 NOT_A_MEMBER`, body carries no identity | Issue AC2 |
| Membership | Member (including organizer) | In — `200`, full roster | Issue AC1 |
| Organizer identification | Row user equals `trip.organizer_id` | In — `organizer = true`; every other row `false` | Only Alice is organizer in the fixture |
| Joined member | Eve joined through a valid invitation | In — appears exactly once | REQ-004 J2/J3 |
| Duplicate membership | Same user accepted twice | In — still exactly one row | `trip_member` composite primary key |
| Empty roster | Trip with no membership rows | In — `200` with an empty `members` array; UI shows the empty state | Defensive boundary; unreachable through product writes because the organizer is inserted atomically |
| Personal data | Request would expose readiness/preference/budget | Out — fields are absent from the projection | Issue design scope; US-031 owns that read |
| Write verbs | POST/PUT/DELETE on the members path | Out — endpoint is read-only | Story requires Database read only |

### ⑪ Cross-REQ consistency

| Capability | Other REQ / surface | US-013 behavior | Convergence |
|---|---|---|---|
| `trips` identity and access | US-066 / REQ-008 login/session | Uses the authenticated principal, `USER_REQUIRED`, `NOT_A_MEMBER`, `TRIP_NOT_FOUND`; denial order auth → trip → membership | ✓ follows merged code; the Living `trips` header text is a US-066 drift |
| `invitations` | REQ-004 J2/J3 membership creation | Accepted member appears in the roster exactly once; invitation behavior untouched | ✓ composed, not modified |
| `app-shell` | US-064 `Bottom dock navigation` / `Placeholder tabs`; main ships real `#/split` | `#/members` renders the roster; `#/split` renders the shipped split entry | ✓ MODIFIED requirement reflects C3 |
| `app-shell` no-backend clause | US-064 `Mobile shell frame` | The shell frame/dock adds no endpoint; the roster is a `trips` capability read rendered inside the tab | ✓ shell clause remains true |
| `main-itinerary` | US-031 Screen 9 inputs | Roster exposes names only; readiness, preference revisions, interests, budgets and drafts are not included | ✓ no overlap |
| Split endpoints | Session-based; anonymous → `MEMBER_REQUIRED` | US-013 uses session auth with `USER_REQUIRED` | ⚠ error-code divergence accepted (C4); follow-up F2, no split code change |
| US-064 non-goals | Member list and readiness were explicitly deferred | This change implements the member list only; readiness remains deferred | ✓ |

### ⑫ Notification / display contract

| Surface | Trigger | Recipient | Content + display fields | Channel | Cardinality |
|---|---|---|---|---|---|
| Members screen list | 成员 tab activation with a resolved trip and signed-in account | Trip member | Screen heading 成员; member count; one row per member with avatar initial, `displayName` and an 组织者 badge on the organizer row | `GET /api/trips/{id}/members`; client render | Exactly one list per render |
| Loading state | Request in flight | Viewer | Skeleton or loading text; no stale rows | Client render | One |
| Empty state | `200` with zero members | Viewer | Text empty state; no fabricated rows | Client render | One |
| Error state | Network failure or non-403/404 HTTP error | Viewer | Generic retryable message; no private values | Client render | One |
| Permission-denied state | `403 NOT_A_MEMBER` | Outsider | Denial message; no names, ids or organizer values | Client render | One |
| Missing-trip state | `404 TRIP_NOT_FOUND` | Viewer | Trip-not-found message with a link back to 行程 | Client render | One |
| No-trip guidance | 成员 tab opened with no trip selected in the session | Viewer | Guidance to open a trip first + link to 行程; no fabricated members | Client render | One |
| Account switch | Signed-in account changes via logout/login | Viewer | The screen re-reads for the new account: member → list, outsider → denied | Same endpoint with the new session | One |

No readiness ring, preference summary, budget line or generate action is
displayed. No notification (email, push, queue) is in scope.

### NFR business-policy layer

No retention, volume or SLA is stated by the ACs. The endpoint is a read-only
projection over existing rows; no data is created or changed. Recorded, not
invented.

## US-071

触发：impact 方向为 **add**（`trips` 新增一条只读列表能力 + `app-shell` 一条
MODIFIED 放置 requirement + 详情页一个入口卡片）。单故事、单只读切片，零迁移，
无新业务概念。

### ⑨ Data contract

| 概念 | 粒度 | 字段 | 状态迁移 | 来源 |
|---|---|---|---|---|
| 我的行程列表（投影） | 每次请求一份，按会话账号过滤 | 包封套 `{trips:[...]}`；行 `{id, name, destination, startDate, endDate, organizer, mainPlanConfirmed}` | 本变更不改状态；行随 `trip_member` 增删自然增删 | `GET /api/trips` 由 `trip` + `trip_member` 派生 |
| 行程归属 | 一行 per (trip, user) | `trip_id`, `user_id` | 建行程时写入 organizer 行；接受邀请时写入受邀者行（REQ-004 J2/J3）；本变更只读 | `V2__create_trip.sql`（复合主键，天然去重） |
| 行程 | 一行 per 行程 | `id`, `name`, `destination`, `start_date`, `end_date`, `start_location`, `end_location`, `organizer_id`, `main_plan_confirmed` | `main_plan_confirmed` 由 confirm 写入，本变更不改 | `V2__create_trip.sql` |
| 账号身份 | 一行 per 种子账号凭据 | `user_id`, `email`, `password_hash` | 会话由 `/api/auth/login` 建立（US-066） | `V6__create_account_credential.sql` |
| `organizer` 派生 | 每行一个布尔 | `organizer` = (`trip.organizer_id` = 当前账号 id) | 读时派生，不落库 | `trip.organizer_id` |
| 「已结束」显示态 | 每行前端计算 | 无 wire 字段；由 `endDate` < 本地当天 推导 | 仅显示层判定，服务端无状态机、不写入 | 前端渲染 |

无 `{TBD}` 字段。排序契约：`start_date` 升序 → `id` 升序（同日可确定性断言）。

### ⑩ Boundary enumeration

| 规则 | 分支 | In / Out | 依据 |
|---|---|---|---|
| 调用者身份 | 无已认证会话 | Out — `401 USER_REQUIRED` | `SecurityConfig` entry point（US-066） |
| 调用者身份 | 仅携带退役 `X-User-Id`（含合法种子 id） | Out — `401 USER_REQUIRED` | 请求头不再认证 |
| 可见范围 | 当前账号是成员（含 organizer） | In — 该行出现在列表中 | S1 |
| 可见范围 | 当前账号非成员 | Out — 该行程不出现在列表中，响应体无其任何字段 | S4 / R3；列表不是按 id 读取，故无 403 语义 |
| 空集 | 当前账号无任何成员行 | In — `200` + `{"trips":[]}`；前端显示空态 | S5 |
| 去重 | 同一行程存在一行成员记录 | In — 恰好一条 | R4；`trip_member` 复合主键 |
| 已结束行程 | `end_date` < 当天 | In — 仍在列表，前端显示「已结束」徽标 | S9；用户裁决不分区 |
| 主线已确认 | `main_plan_confirmed = 1` | In — 正常出现，不影响可见性 | S12 |
| 写入语义 | `POST /api/trips` | 不变 — 仍为创建行程 | R6 |
| 详情读取 | 非成员按 id 读详情 | Out — 既有 `403 NOT_A_MEMBER` | 不在本变更范围，行为不变 |
| 排序 | 同 `start_date` | In — 按 `id` 升序 | 确定性测试 |

### ⑪ Cross-REQ consistency

| 能力 | 其他 REQ / 界面 | US-071 行为 | 收敛 |
|---|---|---|---|
| `trips` 身份与错误词汇 | US-066 / REQ-008 会话 | 沿用 `USER_REQUIRED`；列表不新增错误码 | ✓ 与既有 trip 端点一致 |
| `trips` 详情读取 | REQ-003 `Trip detail read` | 点击行进入 `#/trips/{id}`，读取行为不变 | ✓ 组合，不改 |
| `trips` 成员名册 | US-013 `Trip member list read` | 列表不显示成员名，名册仍由成员 tab 读取 | ✓ 无重叠 |
| `app-shell` 行程 tab 放置 | US-064 `Trips tab placement and no-trip empty state` | tab 恒落 `#/trips`；空态动作改为「创建行程」；删除「不得新增列表端点」禁令 | ✓ MODIFIED（本变更核心） |
| `app-shell` 底部导航 | US-064 `Bottom dock navigation` | 四个 tab 顺序、激活规则不变；`#/trips` 仍激活「行程」 | ✓ 不改 |
| `app-shell` 仪表盘 | US-064 `Dashboard tab placement` | 首页仍为 greeting/创建入口，不承载列表 | ✓ 不改 |
| `invitations` | REQ-004 接受邀请 | 接受成功后 Join 页回 `#/`；再进列表能看到新行程且仅一条 | ✓ 组合验证 S6 |
| `main-itinerary` | US-031-037 `#/trips/{id}/main-plan` | tab 不再承担跳转；改为详情页入口卡片 | ✓ 入口迁移，行为不变 |
| `splits` | US-049-050 分队屏 | `tripsHref` 改为 `#/trips` 后，分队页「去行程」指向列表 | ✓ 合理收敛 |
| US-061 单行程仪表盘 | 未实现 | 本故事不做聚合仪表盘 | ✓ 范围外 |

### ⑫ Notification / display contract

| 界面 | 触发 | 受众 | 内容 + 显示字段 | 通道 | 数量 |
|---|---|---|---|---|---|
| 我的行程列表 | 「行程」tab 激活或 `#/trips` 直达 | 已登录账号 | 标题「我的行程」；每行 `name`、`destination`、`startDate – endDate`；已结束时追加「已结束」徽标 | `GET /api/trips`；客户端渲染 | 每次渲染一份 |
| 行点击 | 点击某行 | 已登录账号 | 跳 `#/trips/{id}` 详情 | hash 路由 | 一次一程 |
| loading 态 | 请求进行中 | 查看者 | 加载文案或骨架；不显示旧数据 | 客户端渲染 | 一 |
| 空态 | `200` + 空数组 | 查看者 | 「还没有行程」文案 + 「创建行程」按钮（跳 `#/create`）；不要求输入编号 | 客户端渲染 | 一 |
| 错误态 | 网络失败或非 2xx | 查看者 | 错误信息 + 重试按钮；重试重新请求 | 客户端渲染 | 一 |
| 账号切换 | 会话账号变化后重新挂载/刷新 | 查看者 | 按新账号重新读取：只显示新账号行程 | 同一端点新会话 | 一 |
| 详情页主线方案入口 | 打开 `#/trips/{id}` | 行程成员 | 卡片 + 「主线方案」按钮，跳 `#/trips/{id}/main-plan` | 客户端链接 | 一 |

无通知（邮件/推送/队列）在范围内；不显示偏好、预算、就绪度等他人私密字段。

### NFR business-policy layer

AC 未声明保留期、SLA 或容量指标。列表是既有行的只读投影，按用户维度过滤，规模为
个位数到几十，MVP 不分页（OQ-5 deferred）。若后续出现首屏预算压力，再单独立项。

## US-040

触发：impact 方向为 **extend + modify**（`splits` 新增一条分组写入能力，并修改初始分组、
生成前置与确认完整性）。单故事、单 change，零迁移、零新依赖、无新表。

### ⑨ Data contract

| 概念 | 粒度 | 字段 | 状态迁移 | 来源 |
|---|---|---|---|---|
| 草稿分组 | 每草稿一份（`split_draft.document.groups`） | `{"A": [app_user.id...], "B": [...]}`，两个键恒存在、允许空数组 | 发起时 `A = 全部成员 / B = []`；每次 assignment 移动一人并 `draftVersion + 1`；确认冻结；取消保留 | `SplitDraftDocument.groups`（既有字段，无迁移） |
| 分组写入请求 | 每次调用一份 | `groupLabel`（`A`\|`B`）、`draftVersion` | 服务端解析调用者 `AccountPrincipal.id`；不接收 `memberId` | 新 `AssignmentRequest` DTO |
| 草稿版本 | 每草稿一个整数 | `draftVersion`（文档字段）+ `split_draft.draft_version`（CAS 列） | assignment `+1`；boundaries/generate `+1`；confirm/cancel 不变 | `V4__splits.sql` + 文档字段 |
| 已生成路线 | 每组一对（文档 `routes` + `plan_node` 行） | `RouteDurations{activityMinutes, travelLegsMinutes[], bufferMinutes}` | assignment **不改动**；generate 成对替换并 `draftVersion + 1` | 既有 `withRoutes` |
| 行程成员集合 | 一行 per (trip, user) | `trip_member.user_id`（= `app_user.id`） | 本变更只读；不增删成员 | `V2__create_trip.sql`；`findMemberIdsOrdered` |
| 完整性明细 | 每次拒绝一份 | `error.details.missing: string[]`，取值 `groups.A` / `groups.B` / `groups.unassigned` / `groups.duplicate` | 生成与确认共用 | 新 `groupProblems()` 投影 |
| 成员名投影 | 每次渲染一份 | `displayName`（按 `app_user.id` 查名册） | 前端派生，不落库 | `GET /api/trips/{id}/members` |

无 `{TBD}` 字段。不变式：`groups` 的两个键集合恒为 `{A, B}`；任一成员至多出现在一个组；
`groups` 元素必为当前行程成员（否则按 `groups.unassigned` 反例处理）。

### ⑩ Boundary enumeration

| 规则 | 分支 | In / Out | 依据 |
|---|---|---|---|
| 调用者身份 | 无认证会话 | Out — `401 MEMBER_REQUIRED` | R1；链级约定 |
| 行程归属 | 未知 tripId | Out — `404 TRIP_NOT_FOUND` | R3 |
| 成员资格 | 已知账号但非该行程成员 | Out — `403 NOT_A_MEMBER`，无分组数据 | R2 |
| 草稿状态 | 无草稿行 | Out — `409 SPLIT_DRAFT_NOT_ACTIVE` | R4 |
| 草稿状态 | `confirmed` / `cancelled` | Out — `409 SPLIT_DRAFT_NOT_ACTIVE` | R4 / S10 / S11 / BQ-6 |
| 版本 | `draftVersion` 不等于当前 | Out — `409 STALE_DRAFT_VERSION`，无持久化 | R5 |
| 组别 | `groupLabel` ∉ {A, B} | Out — `400`（码见 OQ-9） | R6 |
| 目标人 | 请求体夹带 `memberId` / `groups` | 忽略或 `400`；**永不移动他人** | R7 / AC「不能替其他成员选择」 |
| 正常改组 | 调用者在 A，目标 A | In — `200` 幂等，是否 `+1` 见 OQ-10 | S4 |
| 正常改组 | 调用者在 A，目标 B | In — `200`，从 A 移除、加入 B，`draftVersion + 1` | S2 / S3 |
| 路线保留 | 改组时已有 `routes` | In — `routes` 与边界字段逐字不变 | S14 / R8 / BQ-2 |
| 空组 | `groups.A` 或 `groups.B` 为空 | In（草稿态允许）；生成 Out（`409 SPLIT_DRAFT_INCOMPLETE`）；确认 Out（同码） | S6 / S12 / BQ-3 / BQ-8 |
| 漏分组 | 成员不在任何组 | 仅可由构造数据产生；生成/确认 Out（`groups.unassigned`） | S7 |
| 重复分组 | 同一成员同时在 A、B | 仅可由构造数据产生；生成/确认 Out（`groups.duplicate`） | S8 |
| 生成权限 | 非发起人调 generate | Out — `403 NOT_SPLIT_INITIATOR` | S16 / BQ-5 |
| 确认权限 | 非组织者调 confirm | Out — `403 NOT_SPLIT_ORGANIZER`（既有） | 不在本变更范围 |
| 确认门禁 | 分组完整、边界与路线齐备 | In — `200`，`status = confirmed` | S9 |
| 成员表 | 改组对 `trip_member` | 不变 — 不新增/删除成员、不改角色 | R9 |
| 成员数 | 当前行程成员数 < 2（单人行程） | Out — 发起/重建 `409 SPLIT_MEMBERS_INSUFFICIENT`，不创建也不改写草稿行 | OQ-13 / BQ-9（单人无法「两组非空」） |

### ⑪ Cross-REQ consistency

| 能力 | 其他 REQ / 界面 | US-040 行为 | 收敛 |
|---|---|---|---|
| `splits` Split draft start | US-038 | 发起后 `groups = {A: 全部成员, B: []}`，其余字段与返回不变 | ✓ MODIFIED（本变更） |
| `splits` Split boundary selection | US-039 | 保存边界仍保留 `groups`/`routes`；不改边界语义 | ✓ 不改 |
| `splits` Group route generation | US-042 | 新增分组完整性前置（取代「夹具保证」）；仍只准许发起人、仍按 `groups.keySet()` 成对生成 | ✓ MODIFIED（本变更） |
| `splits` Reunion timing check | US-043 | 仍按显式快照计算，不读分组 | ✓ 不改 |
| `splits` Split draft detail read | US-049/050 | `groups` 字段与 member-only 读取不变；前端新增名册映射 | ✓ 不改契约 |
| `splits` Split confirmation | US-049 | `missingDraftParts` 增加 `groups.*`；错误码不变 | ✓ MODIFIED（本变更） |
| `splits` Split draft cancellation | US-050 | 取消仍保留 `groups`、清空 `routes`；重建时初始分组改全员 A | ✓ 仅初始分组收敛 |
| `trips` 成员名册 | US-013 | 前端复用 `displayName`，不新增字段 | ✓ 组合，不改 |
| `trips` 行程详情/成员 | REQ-003 / US-013 | 无写入变更；Screen 13 入口仍在行程内 | ✓ 不改 |
| `app-shell` | US-064 / US-082 | 不新增路由、不改 stepbar、不改返回链 | ✓ 不改 |
| `auth` 会话 | US-066 / REQ-008 | 沿用会话主体；splits 路径在 `SecurityConfig` 为 `permitAll`，401 由 `MemberGuard` 产出 `MEMBER_REQUIRED` + `{data,error}`（auth 已登记的 splits 例外）；新 PUT 必须命中 `"/api/trips/*/split-draft/**"` | ✓ 不改配置，但实现需核对匹配器 |
| `main-itinerary` / `invitations` / `preferences` | — | 无交叉写入 | ✓ 无影响 |

### ⑫ Notification / display contract

| 界面 | 触发 | 受众 | 内容 + 显示字段 | 通道 | 数量 |
|---|---|---|---|---|---|
| Screen 13 分组卡 | 打开分组与路线屏（含草稿/无草稿/终态） | 全部行程成员 | A 组 / B 组标题、人数、成员 `displayName` 列表、「我」标记；副标题去掉「分组移动本期不开放」 | `GET split-draft` + `GET members` | 每次渲染一组 |
| 切组按钮 | 成员点击目标组 | 操作者本人 | 调 `PUT assignment`（`groupLabel` + `draftVersion`）；成功后 `invalidate` 并重绘，失败按 `code` 显示 | 写入 + 查询失效 | 一次一人一组 |
| 改组成功提示 | assignment `200` | 操作者本人 | 「分组已更新，路线仍为上次生成的版本，可点击重新生成」 | 页内提示 | 一 |
| 分组不完整（生成） | `routes:generate` 返回 `SPLIT_DRAFT_INCOMPLETE` | 发起人 | 错误卡：`SPLIT_DRAFT_INCOMPLETE` + 中文说明「分组不完整」+ `details.missing` 映射（`groups.A`=A 组无人、`groups.B`=B 组无人、`groups.unassigned`=有成员未分组、`groups.duplicate`=有成员重复分组） | `ErrorState` | 一 |
| 分组不完整（确认） | `:confirm` 返回 `SPLIT_DRAFT_INCOMPLETE` | 组织者 | 同上，且同时可含 `boundaries` / `routes.A` / `routes.B` | `ErrorState` | 一 |
| Screen 15 分组复核 | 打开复核屏 | 全部行程成员 | A 组 / B 组以成员名展示（无名字回退短 id）；若分组晚于路线生成，同屏显示「分组已更新，路线仍为上次生成的版本」提示 | `GET split-draft` + `GET members` | 每次渲染一组 |
| 空组引导 | 草稿 active 且任一组为空 | 全部行程成员 | 分组卡内提示「至少一人加入另一组后才能生成路线与确认」 | 页内文案 | 一 |
| 权限态 | `403 NOT_SPLIT_INITIATOR` / `NOT_A_MEMBER` / `401` | 操作者 | 现有 `ErrorState` 权限样式；非发起人的「重新生成」不可用 | `ErrorState` | 一 |
| loading / empty / 终态 | 读取中、无草稿、`confirmed`/`cancelled` | 查看者 | 沿用既有四态；终态不显示切组控件 | 客户端渲染 | 一 |

无通知（邮件/推送/队列）在范围内；分组卡不展示偏好、预算、就绪度等他人私密字段。

### NFR business-policy layer

分组规模 = 行程成员数（MVP 为个位数），单次改组为一次 JSON 文档 CAS 写入；无批量、无分页、
无 SLA/保留期声明。并发由 `draftVersion` 乐观锁 + 既有 5s 轮询覆盖（后到者 `STALE_DRAFT_VERSION`）。

## US-087-088

触发：impact 方向为 **extend + modify**（`splits` 新增整对路线编辑写入，并修改 Screen 13/14/15 的
编辑、校验与返回入口）。单 change 覆盖两条 story，零迁移、零新依赖、无新表。

### ⑨ Data contract

| 概念 | 粒度 | 字段 | 状态迁移 | 来源 |
|---|---|---|---|---|
| 草稿路线时长 | 每草稿每组成员（`split_draft.document.routes`） | `RouteDurations{activityMinutes:int, travelLegsMinutes:int[], bufferMinutes:int, steps?:RouteStep[]}`；A 组合计由 `steps` + 路段派生 | generate 成对替换并 `draftVersion + 1`；**routes 保存整对覆盖并 `+1`**（A 的 steps/派生值一并写入）；分组变更保留；确认冻结；取消清空 | `SplitDraftDocument.routes`（US-089 已含 steps，无迁移） |
| 路线节点（活动名/地点） | 每草稿每组一行（`plan_node`，`branch_id = split-a/split-b`） | `title`（活动名，必填非空）、`location_name`（地点，可空）、`start_at`/`end_at`（沿用草图边界）、`sort_order` | generate 成对删除+插入（`location_name` 当前回填活动名）；**routes 保存更新 `title`/`location_name`**；取消删除 split 行；主线行不动 | `plan_node`（V4/V5 既有列，无迁移） |
| 路线编辑请求 | 每次调用一份（整对） | `draftVersion:int`；`routes[2]`：A 组 `{groupLabel:'A', activityName, locationName?, steps[{stayMinutes}], travelLegsMinutes[]}`（站名沿用主线，路段数=站点数）；B 组 `{groupLabel:'B', activityName, locationName?, activityMinutes≥0, travelLegsMinutes[]≥0（段数=既有）, bufferMinutes≥0}` | 仅 `active` 草稿可写；成功后 `draftVersion + 1`；A 合计由服务端派生 | 新 `SaveRoutesRequest` / `RouteEditInput` DTO |
| 路线视图 | 每次读取一份 | `GroupRoute{groupLabel, activityName, locationName?, departureStopId, reunionStopId, activityMinutes, travelLegsMinutes[], bufferMinutes, steps?}` | 读取不写；`locationName` 为 additive；A 组返回编辑后的 steps | `GET split-draft`（`SplitDraftDetailResponse.routes`） |
| 草稿版本 | 每草稿一个整数 | 文档 `draftVersion` + `split_draft.draft_version`（CAS 列） | 保存 `+1`；boundaries/generate/assignment 既有语义不变；confirm/cancel 不变 | `V4__splits.sql` + 文档字段 |
| 时间窗校验快照 | 每次校验一份 | `windowMinutes:int`；`routes[2]{groupLabel, activityMinutes, travelLegsMinutes[], bufferMinutes}`；结果 `TimingResult{feasible, routes[{totalMinutes, overrunMinutes, missingInputs}]}` | 只读、零写库；不落库 | 既有 `CheckTimingRequest` / `ReunionTimingCalculator` |
| 编辑权限主体 | 每次调用一个身份 | 会话 `AccountPrincipal.id`（= `trip_member.user_id`） | 任意行程成员可写；不接收 `memberId` | `MemberGuard` / `SecurityConfig` |
| 完整性明细 | 每次拒绝一份 | `error.details.missing: string[]`（`routes.A` / `routes.B`） | 无路线时保存拒绝 | 复用 `SPLIT_DRAFT_INCOMPLETE` |

无 `{TBD}` 字段。不变式：`routes` 的键集合恒为草稿 `groups` 键集合（`{A, B}`）；`plan_node` 的
split 行每草稿每组恰好一行；`draftVersion` 是唯一并发令牌；活动名/地点与时长必须同事务生效；
A 组 `activityMinutes`/`travelLegsMinutes` 由 `steps` 派生，客户端提交的合计被忽略；生成时 A 合计 = 时间窗（US-089 G7），
手工编辑后以下一步校验的「A 合计 ≤ 时间窗」为准。

### ⑩ Boundary enumeration

| 规则 | 分支 | In / Out | 依据 |
|---|---|---|---|
| 身份 | 无认证会话 | Out — `401 MEMBER_REQUIRED` | 链级约定 |
| 行程归属 | 未知 tripId | Out — `404 TRIP_NOT_FOUND` | 既有守卫 |
| 成员资格 | 已知账号但非该行程成员 | Out — `403 NOT_A_MEMBER` | 既有守卫 |
| 草稿存在 | 无草稿行 | Out — `409 SPLIT_DRAFT_NOT_ACTIVE` | 既有语义 |
| 草稿状态 | `confirmed` / `cancelled` | Out — `409 SPLIT_DRAFT_NOT_ACTIVE`；页面只读 | S6 / N9 |
| 版本 | `draftVersion` 不等于当前 | Out — `409 STALE_DRAFT_VERSION`；无部分写入 | S3 |
| 路线存在 | 草稿 `routes` 为空 | Out — `409 SPLIT_DRAFT_INCOMPLETE`（`routes.A`/`routes.B`） | S4 |
| 路线数量 | 请求不是恰好两条 | Out — `400 INVALID_ROUTE_PAIR` | S5 |
| 组别集合 | 组别重复或非 A/B 或与 `groups` 键不一致 | Out — `400 INVALID_GROUP_LABEL` | S5 |
| 字段值 | 活动名或站名为空；分钟为负或非整数；A 组路段数与站点数不一致；B 组路程段数变化 | Out — `400 INVALID_ROUTE_INPUT`（新码） | S5 / N10 |
| A 组编辑超窗 | 保存后 A 合计 > `windowMinutes` | 保存 In（200）；下一步校验 Out（`feasible=false` + 弹窗），不进入预览 | N3a |
| 正常保存 | 任意成员、`active`、版本匹配、输入合法 | In — `200`，双写 `plan_node` + 文档 `routes`，`draftVersion + 1` | S2 |
| 无改动继续 | 本地值等于草稿快照 | In — 跳过保存，`draftVersion` 不变，直接校验 | N2 |
| 校验可行 | `feasible = true` | In — 200；前端进入 `/split/preview` | N1 |
| 校验不可行 | 超窗或缺输入 | In（200 + `feasible=false`）；前端弹窗阻断，不跳转 | N3 |
| 校验请求失败 | 4xx/5xx/网络 | Out — 页内错误，不跳转 | N5 |
| 保存请求失败 | 409/5xx/网络 | Out — 页内错误，不发起校验、不跳转 | N4 |
| 预览只读 | 预览页任何状态 | In — 只显示图；无编辑控件；终态无提交动作 | N6 / N9 |
| 复核入口 | 预览「前往复核并确认」 | In — 进入 `/split/confirm`；服务端复算 | N7 |
| 旧地址 | 访问 `/split/timing` | In — 重定向 `/split/preview` | N8 / D-1 |
| 生成权限 | 非发起人调 `routes:generate` | Out — `403 NOT_SPLIT_INITIATOR`（不变） | US-042 |
| 编辑权限 | 非发起人但为成员调 `PUT routes` | In — 允许（BQ-6） | S1 / BQ-6 |
| 主线/分组 | 保存对 `groups`、`boundaries`、main 节点 | 不变 — 不移动成员、不改边界与主线 | 约束 |
| 确认规则 | 保存后 `:confirm` | 不变 — 服务端从草稿复算（`SPLIT_TIMING_INFEASIBLE`） | N7 |

### ⑪ Cross-REQ consistency

| 能力 | 其他 REQ / 界面 | 本变更行为 | 收敛 |
|---|---|---|---|
| `splits` Split draft start | US-038 | 发起仍按成员顺序初始分组、`draftVersion = 1`；不变 | ✓ 不改 |
| `splits` Split boundary selection | US-039 | 边界保存保留 `groups`/`routes`；保存成功后版本语义不变 | ✓ 不改 |
| `splits` Group route generation | US-042 / Screen 13 | 生成仍成对原子、仅发起人；Screen 13 从只读展示改为可编辑，并承接「下一步」 | ✓ MODIFIED（P2） |
| `splits` Reunion timing check | US-043 / Screen 14 | `check-timing` 端点契约不变；校验入口从 Screen 14 迁移到第 2 步「下一步」，Screen 14 由只读预览取代 | ✓ MODIFIED（P2） |
| `splits` Split draft detail read | US-049/050 / Screen 11 | `GroupRoute` 增 `locationName`（additive）；读取仍只读、member-only | ✓ MODIFIED（P2，additive） |
| `splits` Split confirmation | US-049 / Screen 15 | 判定文本与错误码不变；复核屏 返回目标改为 `/split/preview` | ✓ MODIFIED（P2，导航） |
| `splits` Split draft cancellation | US-050 | 取消仍清空 split `plan_node` 与 routes；不变 | ✓ 不改 |
| `splits` Member group assignment | US-040 / Screen 13 | 任意成员可编辑路线，与「任意成员可移动成员」一致；生成仍仅发起人 | ✓ 组合，不改 |
| Screen 11 队伍路线（US-086） | `team-route-graph.tsx` / `graph-model.ts` | 复用图组件作为第 3 步预览；标题/动作不同，不改图组件契约 | ✓ 组合，不改 |
| `app-shell` | US-064 / US-082 | 新增 `/split/preview` 属流程内部路由；shell 契约不枚举该层 | ✓ 不改 |
| `trips` 成员名册 | US-013 | 编辑卡不新增成员数据依赖；分组仍用既有名册 | ✓ 不改 |
| `auth` 会话 | US-066 / REQ-008 | 沿用会话主体；`/api/trips/*/split-draft/**` 已在 `SecurityConfig` 匹配，PUT 自动受保护，401 由 `MemberGuard` 产出 | ✓ 不改配置 |
| `main-itinerary` / `invitations` / `preferences` | — | 无交叉写入 | ✓ 无影响 |

### ⑫ Notification / display contract

| 界面 | 触发 | 受众 | 内容 + 显示字段 | 通道 | 数量 |
|---|---|---|---|---|---|
| Screen 13 路线卡（编辑态） | 打开分组与路线屏，草稿 `active` 且有路线对 | 全部行程成员 | A 组按 `steps` 逐站编辑停留分钟与各段路段分钟（站名只读，沿用主线）；B 组编辑活动名、地点（可选，`locationName == activityName` 或空时不重复显示）、活动/路程/缓冲分钟；卡片显示「合计 X 分 / 窗口 Y 分」 | `GET split-draft`（含 `locationName`/`steps`） | 每次渲染 A/B 两张 |
| Screen 13 路线卡（只读） | 草稿 `confirmed` / `cancelled` | 查看者 | 同上字段但不可编辑；无「下一步」动作 | 客户端状态渲染 | 每次渲染 A/B 两张 |
| 「下一步」按钮 | 草稿 `active` 且有路线对、分组完整 | 操作者 | 文案「下一步」；保存/校验中显示进行态并禁用重复点击 | 保存 + 校验写入链 | 一 |
| 保存/校验成功 | `PUT routes` 200 且 `check-timing` `feasible=true` | 操作者 | 导航到 `/split/preview`；无额外成功提示（进入预览即反馈） | 路由跳转 | 一 |
| 时间窗失败弹窗 | `check-timing` 200 且 `feasible=false` | 操作者 | 新增 shadcn 风格 `components/ui/dialog.tsx`（受控 open、遮罩不可点外关闭）；标题「时间窗校验未通过」；结论；A/B 组各自「合计 X 分 / 时间窗 Y 分 / 超窗 Z 分」；缺失输入项列表；底部仅「关闭」；不自动跳转，关闭后焦点回列表 | 前端弹窗 | 一 |
| 保存/校验请求错误 | `PUT routes` 或 `check-timing` 非 2xx / 网络失败 | 操作者 | 既有 `ErrorState` / 页内错误提示，带 `error.code` 中文映射；保留输入；不跳转 | 页内错误 | 一 |
| Screen 预览（新第 3 步） | 校验通过后进入 | 全部行程成员 | 标题「队伍路线预览」；副标题「校验通过 · 只读预览」；顶部 A 组 / B 组人数徽标；`TeamRouteGraph` 图（主线/分头/会合/A-B 节点，活动·路程·缓冲时长，地点如非空且不等于活动名）；底部「前往复核并确认」；返回第 2 步 | `GET split-draft` | 一 |
| 预览空/错误态 | 无草稿、无路线对、读取失败 | 查看者 | 沿用 `states.tsx` 的 loading / empty / error；无路线对时提示返回第 2 步生成 | 客户端渲染 | 一 |
| 旧 Screen 14 地址 | 直接访问 `/split/timing` | 任意 | 重定向到 `/split/preview`，不渲染可编辑校验表单 | 路由重定向 | 一 |
| 终态复核（Screen 15） | `confirmed` / `cancelled` | 查看者 | 既有只读展示；返回指向预览页；无确认/取消可用动作 | 客户端渲染 | 一 |

无通知（邮件/推送/队列）在范围内；弹窗不展示他人偏好、预算等私密字段。

### NFR business-policy layer

单次保存 = 一次 JSON 文档 CAS + 两行 `plan_node` 更新，属 O(1) 写；路线规模固定为 A/B 两条，
无批量/分页。并发由 `draftVersion` 乐观锁 + 既有 5s 轮询覆盖，后到者获 `STALE_DRAFT_VERSION` 并需
重新拉取。无保留期/SLA 声明；校验为纯计算、零写库。
