# main-itinerary Specification

## Purpose
Lets a trip organizer generate a timed main-plan draft from ready members'
preferences and confirm it into one shared, validated itinerary version,
closing joining so the group follows a single feasible plan.
## Requirements
### Requirement: Readiness-gated main plan generation

系统必须只允许行程组织者通过 `POST /api/trips/{id}/main-plan` 生成主线方案草稿，
且仅在每位行程成员都在已记录的偏好修订号上就绪时，返回 201 与草稿投影。生成必须
使用已配置的方案提供者：配置了 API key 时使用外部 AI 模型服务，否则使用确定性夹具
提供者。生成必须持久化一个新的草稿版本（有序站点、时间、车程、输入修订号、人均
费用），不得自动确认；重新生成必须取代先前的当前草稿。一旦已有已确认版本，必须
拒绝生成（G6）。

使用 AI 提供者时，生成必须把行程事实以及每位就绪成员的兴趣、必做项与硬预算作为
数据处理，不得把成员提供的文本当作指令。AI 输出在入库前必须校验：至少 2 站、
`seq` 从 1 连续、`startTime` 与 `endTime` 为 `HH:mm`、结束晚于开始、非末站车程为
≥0 的整数、末站车程为 null、人均费用为 ≥0 的整数分。当 AI 调用超时、传输或 HTTP
失败，或返回空白/非法输出时，生成必须降级为确定性的最小行程并仍持久化草稿；降级
不得改变响应状态码或错误码。最小行程必须恰好包含两站：行程出发地 09:00–09:30 且
到下一站车程 30 分钟，行程返程地 17:00–17:30 且无车程，人均费用为 0。降级必须
使用生成时地点补全后的出发地与返程地：已提供值原样保留，空白值使用补全结果。

在输入页或方案页发起生成/重新生成且请求仍在进行时，客户端必须显示常驻、非阻塞的
页内提示“AI 正在生成中…”，触发操作必须保持禁用直到请求结束，并必须允许导航与
阅读页面其余内容。提示必须在请求成功或失败后关闭。提示不得引入新的错误面；失败仍
由现有行内操作错误展示。

US-079：生成落库时必须按站名+城市查 `place_cache` 补全每站地址与 WGS-84 坐标；
缓存未命中时坐标留 null（地址保留提供者供给值），由程序查坐标回写端点后续补全；
201 投影逐站携带 address/lat/lng 三字段。

> 规范性说明：本需求中的“必须/不得”即 RFC 2119 的 **SHALL / MUST NOT**。

#### Scenario: G1 — all members ready, draft generated (US-031 AC1)

- **GIVEN** 四位成员在偏好修订号 1 就绪，且未配置 AI API key，因此夹具提供者提供四个夹具站点
- **WHEN** 组织者（Alice，`X-User-Id: 1`）生成主线方案
- **THEN** 响应状态为 201，草稿版本 1 保存为当前草稿
- **AND** 响应体携带 `version` 1、`confirmed` false、`stale` false、`costPerPersonCents` 5000，且 `inputRevisions` 将用户 1–4 与修订号 1 配对
- **AND** `stops` 按提供顺序列出四个夹具站点，包含 `seq`、`name`、`startTime`、`endTime` 与 `travelMinutesToNext` 30/30/15（末站为 null）
- **AND** 行程未被标记为主线方案已确认

#### Scenario: G2 — pending member blocks generation (US-031 AC2)

- **GIVEN** Daniel（id 4）未就绪
- **WHEN** 组织者生成主线方案
- **THEN** 请求被拒绝，返回 409 与错误码 `MEMBERS_NOT_READY`
- **AND** `pendingMembers` 指出 Daniel（`userId` 4、`displayName` Daniel）需要响应
- **AND** 不持久化任何草稿

#### Scenario: G5 — regeneration creates a new version

- **GIVEN** 已存在当前草稿版本 1
- **WHEN** 组织者再次生成主线方案
- **THEN** 响应状态为 201，`version` 2 成为当前草稿
- **AND** 版本 1 被取代，不再由草稿读取返回

#### Scenario: G6 — generation after confirmation rejected

- **GIVEN** 主线方案已在版本 1 确认
- **WHEN** 组织者再次生成主线方案
- **THEN** 请求被拒绝，返回 409 与错误码 `ALREADY_CONFIRMED`
- **AND** 不持久化新草稿，已确认版本不变
  （用户 2026-11-15 产品评审明确接受；Emily IO 审批另行记录；重规划延后到 R2 —
  版本化草稿结构已预留接缝）

#### Scenario: AI 提供者产出草稿

- **GIVEN** 已配置 AI API key，且 AI 提供者返回一份站点都落在行程日内的合法行程
- **WHEN** 组织者生成主线方案
- **THEN** 响应状态为 201，持久化草稿携带 AI 提供的有序站点、车程与人均费用
- **AND** `inputRevisions` 仍将每位成员与生成时记录的修订号配对

#### Scenario: AI 失败时降级为最小两站行程

- **GIVEN** 已配置 AI API key，行程出发地为 “City Hall MRT”、返程地为 “Merlion Park”，且 AI 调用超时、返回非 2xx 或输出校验失败
- **WHEN** 组织者生成主线方案
- **THEN** 响应状态为 201，草稿恰好包含两站：“City Hall MRT” 09:00–09:30、到下一站车程 30 分钟，“Merlion Park” 17:00–17:30、末站车程为 null
- **AND** `costPerPersonCents` 为 0
- **AND** 不返回 AI 专属错误码或状态码，且不会持久化任何解析到一半的 AI 输出

#### Scenario: 未填写地点时降级使用补全后的地点

- **GIVEN** 已配置 AI API key，行程出发地与返程地为空，且 AI 调用失败
- **WHEN** 组织者生成主线方案
- **THEN** 先完成行程地点补全，两个降级站点使用补全后的出发地与返程地

#### Scenario: 生成期间显示非阻塞的 AI 进度提示

- **GIVEN** 组织者在输入页发起生成，或在方案页发起重新生成
- **WHEN** 生成请求仍在进行
- **THEN** 页面内可见常驻提示“AI 正在生成中…”，触发操作保持禁用，页面其余内容仍可阅读与导航
- **AND** 请求成功或失败后提示关闭，失败随后由现有行内操作错误展示

#### Scenario: AI 输出在入库前被校验

- **GIVEN** AI 返回的站点存在 `seq` 不连续、时间不是合法 `HH:mm`、结束不晚于开始、车程非法或费用为负
- **WHEN** 组织者生成主线方案
- **THEN** 该输出被拒绝，改为持久化最小两站降级行程
- **AND** 响应状态为 201

#### Scenario: G7 — generation persists stop address and coordinates from the place cache

- **GIVEN** the place cache holds the fixture stops' addresses and WGS-84 coordinates
- **WHEN** the organizer generates the main plan
- **THEN** each persisted stop row carries `address`, `lat`, `lng` from the cache
- **AND** the 201 body's `stops` carry the same three fields per stop

#### Scenario: G8 — cache miss leaves coordinates null without blocking generation

- **GIVEN** a supplied stop name is absent from the place cache
- **WHEN** the organizer generates the main plan
- **THEN** generation succeeds and that stop's `lat`, `lng` are null
- **AND** the provider-supplied `address` is preserved and no coordinate is fabricated

### Requirement: Location completion at generation

When the trip's start or end location is empty at generation time, the system
SHALL complete it from member preferences first, with a random fallback when
preferences yield nothing. Supplied nonblank locations SHALL be preserved
unchanged. Completion SHALL happen only during generation (signed 2026-11-14
ruling).

#### Scenario: G3 — null locations completed

- **GIVEN** the trip has null start and end locations
- **WHEN** the organizer generates the main plan
- **THEN** both locations are completed (preferences first, random fallback)

#### Scenario: G3 — supplied locations preserved

- **GIVEN** the trip has nonblank start and end locations
- **WHEN** the organizer generates the main plan
- **THEN** both locations are preserved unchanged

### Requirement: Draft review with computed staleness

The system SHALL let trip members read the current draft at
`GET /api/trips/{id}/main-plan`, responding 200 with the draft projection
(`tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions`,
ordered `stops` with times and travel legs). After confirmation the same read
SHALL return the confirmed version while it remains valid. `stale` SHALL be
computed on read, not stored, and applies to unconfirmed drafts only; the
confirmed version SHALL be frozen against preference revision changes. A
planning-basics edit (destination, start date, end date, start location or end
location) SHALL invalidate a confirmed plan by superseding its draft and
resetting the trip's confirmation state, after which the read SHALL return 404
`NO_DRAFT` until a new draft is generated. The projection's `stops` SHALL
additionally carry `address`, `lat`, `lng` when persisted; null values SHALL be
omitted from the wire (additive, old clients unaffected).

For an unconfirmed draft, `stale` SHALL be true when any member's current
preference revision differs from the revision recorded at generation, or when
the trip's current planning basics differ from the snapshot recorded at
generation, or when the draft has no snapshot (a draft generated before this
change). The planning-basics snapshot SHALL cover destination, start date, end
date, start location and end location; a name-only change SHALL NOT make a
draft stale. A stale draft SHALL remain readable with its recorded version,
revisions and stops unchanged; regeneration SHALL create a new version.

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists and every input revision matches the member's current revision
- **WHEN** Ben (member, `X-User-Id: 2`) reads the main plan
- **THEN** the response status is 200 with `version`, `confirmed` false, `stale` false, `costPerPersonCents`, `inputRevisions` and the ordered `stops` with times and legs

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true (any member's current revision differing from the revision recorded at generation makes an unconfirmed draft stale)
- **AND** the draft version and its recorded `inputRevisions` are unchanged

#### Scenario: A destination change surfaces staleness

- **GIVEN** a draft was generated while the trip destination was `Singapore`
- **WHEN** a member changes the destination to `Bali` and then reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true
- **AND** the draft version, recorded `inputRevisions` and stops are unchanged

#### Scenario: A date or location change surfaces staleness

- **GIVEN** a draft was generated with the trip's dates and locations
- **WHEN** a member changes any start date, end date, start location or end location and then reads the main plan
- **THEN** the response status is 200 with `stale` true
- **AND** the draft content is unchanged

#### Scenario: A name-only change keeps the draft fresh

- **GIVEN** a draft was generated and its preference revisions still match
- **WHEN** the organizer renames the trip and a member reads the main plan
- **THEN** the response status is 200 with `stale` false

#### Scenario: A draft without a snapshot is stale

- **GIVEN** an unconfirmed draft was created before this change and carries no planning-basics snapshot (documented test-only setup)
- **WHEN** a member reads the main plan
- **THEN** the response status is 200 with `stale` true
- **AND** the draft cannot be confirmed until it is regenerated

#### Scenario: No draft yet

- **GIVEN** no draft has been generated for the trip
- **WHEN** a trip member reads the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`

#### Scenario: Confirmed plan read

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** a trip member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false
- **AND** the confirmed version is the existing draft marked confirmed, not a newly created version

#### Scenario: Confirmed plan stays frozen after a revision bump

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false (the confirmed version is frozen against preference revision changes; staleness applies to unconfirmed drafts only)

#### Scenario: A planning edit supersedes a confirmed plan

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** any member changes a planning basic through the trip update endpoint
- **THEN** the confirmed draft is superseded and the trip's confirmation state is reset
- **AND** a subsequent main-plan read returns 404 `NO_DRAFT`
- **AND** generating again creates a new version that can be confirmed

#### Scenario: Read carries persisted stop location fields

- **GIVEN** a draft whose stops carry persisted `address`, `lat`, `lng`
- **WHEN** a trip member reads the main plan
- **THEN** the 200 body's `stops` carry the three fields for those stops
- **AND** stops without persisted location omit the fields (null)

### Requirement: Generation inputs read projection

The system SHALL let trip members read a generation-inputs summary at
`GET /api/trips/{id}/main-plan/inputs`, responding 200 with `tripId`, `readyCount`,
`memberCount`, `members` (`userId`, `displayName`, `ready`,
`preferenceRevision`), `commonInterests`, `mustDo`, per-member `budgets` (null
`hardBudgetCents` = no limit) and the `rules` list.
The summary SHALL be readable before any draft exists (P2 ruling 2026-11-15:
member-readable; resolves F6).

#### Scenario: I1 — member reads inputs summary (Screen 9)

- **GIVEN** the four members are ready at revision 1 with seeded preferences and no hard budgets
- **WHEN** Ben (member, `X-User-Id: 2`) reads the generation inputs
- **THEN** the response status is 200 with `readyCount` 4, `memberCount` 4 and `members` naming Alice, Ben, Chloe and Daniel as ready at revision 1
- **AND** `commonInterests` and `mustDo` carry the seeded preference summary, every `budgets` line has `hardBudgetCents` null (no limit), and `rules` lists the generation rule identifiers

#### Scenario: I2 — inputs readable before any draft

- **GIVEN** no draft has been generated for the trip
- **WHEN** the organizer reads the generation inputs
- **THEN** the request succeeds with the summary (no `NO_DRAFT` error)

#### Scenario: I3 — non-member denied inputs

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, `X-User-Id: 5`) reads the generation inputs
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

### Requirement: Validation-gated confirmation

The system SHALL allow only the organizer to confirm the current draft via
`POST /api/trips/{id}/main-plan/confirm`, responding 200 with the same
projection as the draft read, and only when schedule validation, hard-budget
validation and the staleness check all pass. On success the draft's version
SHALL become the shared confirmed plan, the trip SHALL be marked
main-plan-confirmed and joining SHALL be closed. A blocked confirmation SHALL
leave the plan unconfirmed and SHALL change no trip or split state.

The trip-detail shortcut `POST /api/trips/{id}/main-plan:confirm` SHALL be
available only to the organizer and SHALL delegate to this validated
confirmation; on success it SHALL return the updated trip projection. No other
endpoint or UI path SHALL set the confirmation state. A non-organizer SHALL
receive 403 `NOT_ORGANIZER`; no current draft SHALL receive 404 `NO_DRAFT`; an
unconfirmed stale draft SHALL receive 409 `STALE_DRAFT`; an already-confirmed
current plan SHALL receive 409 `ALREADY_CONFIRMED`; validation failures SHALL
keep the existing 422 `VALIDATION_FAILED`. Every rejection SHALL leave all state
unchanged.

After a planning-basics edit invalidates a confirmed plan, the next generation
SHALL create a new draft that can be confirmed by the organizer; no
`ALREADY_CONFIRMED` outcome SHALL apply because the previous confirmed draft is
superseded. Re-confirmation SHALL keep joining closed.

#### Scenario: C1 — valid draft confirmed, joining closed (US-037 AC1)

- **GIVEN** the current draft version 1 is not stale, its stops are time-ordered and non-overlapping with a travel leg between consecutive stops that fits the gap to the next stop (arriving exactly at the next start is allowed) and all stops within the trip day, and every member's hard budget is at least the cost per person (a null hard budget imposes no limit)
- **WHEN** the organizer confirms the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true, `stale` false and the same `stops` and `costPerPersonCents` as the draft read
- **AND** version 1 becomes the shared confirmed plan based on that draft's inputs and preferences
- **AND** the trip is marked main-plan-confirmed, so a subsequent invitation accept is rejected with 403 `JOINING_CLOSED` (REQ-004 J4 behavior)

#### Scenario: C2 — hard-budget overrun blocks (US-037 AC2)

- **GIVEN** the draft costs 50 SGD per person and Alice's hard budget is 40 SGD
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED`
- **AND** `overruns` carries Alice (`userId` 1) with `hardBudgetCents` 4000 and `overrunCents` 1000 (10 SGD)
- **AND** the plan stays unconfirmed

#### Scenario: C3 — schedule errors block

- **GIVEN** the current draft has overlapping stops, a missing travel leg, a travel leg longer than the gap to the next stop, or a stop outside the trip day
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 422 and code `VALIDATION_FAILED`
- **AND** `scheduleErrors` lists each specific error with its `type` (`OUT_OF_ORDER`, `OVERLAP`, `MISSING_LEG`, `TRAVEL_EXCEEDS_GAP` or `OUT_OF_DAY`) and the offending stop `seq`
- **AND** the plan stays unconfirmed
- **AND** for `TRAVEL_EXCEEDS_GAP` the offending stop is the one carrying the too-long leg: its end time plus `travelMinutesToNext` is later than the next stop's start time; equality passes (G1 C1 recommended default A, user-selected 2026-11-15; IO Emily ratified 2026-11-15 — the type extends the contractual error enumeration)

#### Scenario: C4 — stale draft blocks until regeneration

- **GIVEN** a member's preference revision or a planning basic changed after the draft was generated
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 409 and code `STALE_DRAFT`
- **AND** after regeneration the new draft can be confirmed

#### Scenario: The shortcut is organizer-only

- **WHEN** Ben, a member but not the organizer, calls the trip-detail confirmation shortcut for a valid draft
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** the trip confirmation state, the plan and the split state are unchanged

#### Scenario: The shortcut reports a missing draft

- **WHEN** the organizer calls the shortcut while no draft exists
- **THEN** the response status is 404 with `code` equal to `NO_DRAFT`
- **AND** no state changes

#### Scenario: The shortcut blocks a stale draft

- **WHEN** the organizer calls the shortcut while the current draft is stale
- **THEN** the response status is 409 with `code` equal to `STALE_DRAFT`
- **AND** the plan stays unconfirmed

#### Scenario: The shortcut confirms a valid draft

- **WHEN** the organizer calls the shortcut for a valid, non-stale draft
- **THEN** the response status is 200 with the updated trip projection
- **AND** `mainPlanConfirmed` is true and `joiningClosed` is true
- **AND** the draft becomes the shared confirmed plan

#### Scenario: Re-confirmation after invalidation succeeds

- **GIVEN** a confirmed plan was invalidated by a planning-basics edit, the confirmed draft was superseded and joining remains closed
- **WHEN** the organizer generates a new draft and confirms it
- **THEN** the response status is 200 with the new version confirmed
- **AND** `joiningClosed` remains true
- **AND** no `ALREADY_CONFIRMED` outcome is returned

### Requirement: Confirmation boundaries

The system SHALL reject confirmation when no draft exists and SHALL reject
re-confirmation of an already-confirmed plan without changing any state.
`ALREADY_CONFIRMED` also covers generation after confirmation (G6; behavior
accepted by user 2026-11-15; Emily IO approval recorded, overall G1 Pass).

#### Scenario: V6 — confirm before any generation

- **GIVEN** no draft has been generated for the trip
- **WHEN** the organizer confirms the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`
- **AND** nothing changes

#### Scenario: V7 — re-confirm an already-confirmed plan

- **GIVEN** the main plan is already confirmed
- **WHEN** the organizer confirms the main plan again
- **THEN** the request is rejected with 409 and code `ALREADY_CONFIRMED`
- **AND** no state changes

### Requirement: Authorization and identity for main-plan operations

Main-plan generation, confirmation and stop editing SHALL require the trip
organizer's identity; draft review and generation-inputs read SHALL require
trip membership. Requests SHALL be rejected with the established error codes:
missing or unknown identity 401 `USER_REQUIRED`, unknown trip 404
`TRIP_NOT_FOUND`, non-member 403 `NOT_A_MEMBER`, non-organizer member on writes
403 `NOT_ORGANIZER`. Only the `code` field is contractual; message wording is
free.

#### Scenario: G4/C5 — non-organizer member writes

- **GIVEN** Ben is a trip member but not the organizer
- **WHEN** Ben (member, non-organizer, authenticated as Ben) generates or confirms the main plan, or edits a draft stop
- **THEN** the request is rejected with 403 with code `NOT_ORGANIZER`
- **AND** no draft, stop or confirmation state changes

#### Scenario: Non-member access

- **GIVEN** Eve is a seeded user who is not a member of the trip
- **WHEN** Eve (non-member, authenticated as Eve) generates, confirms, edits a stop of, or reads the main plan
- **THEN** the request is rejected with 403 and code `NOT_A_MEMBER`

#### Scenario: Missing or unknown identity

- **GIVEN** the fixture trip exists
- **WHEN** a main-plan request arrives without `authenticated session` or with an id that is
  not a seeded user
- **THEN** the request is rejected with 401 and code `USER_REQUIRED`

#### Scenario: Unknown trip

- **GIVEN** the caller is a seeded user
- **WHEN** a main-plan request targets a trip that does not exist
- **THEN** the request is rejected with 404 and code `TRIP_NOT_FOUND`

### Requirement: Main plan stop editing

The system SHALL expose `PUT /api/trips/{id}/main-plan/stops/{seq}` for the
trip organizer to edit one stop of the current, unconfirmed main-plan draft.
The request body SHALL carry `name`, `startTime` and `endTime`, and the
response SHALL be the same draft projection as the draft read. Only those
three fields SHALL be editable: the stop order (`seq`), its
`travelMinutesToNext` and its interest tags SHALL NOT change through this
operation, and any submitted value for them SHALL be ignored. The name SHALL
be non-blank (`400 NAME_REQUIRED`); each time SHALL be a parseable `HH:MM`
value (`400 INVALID_TIME`); the end time SHALL be later than the start time
(`400 INVALID_TIME_RANGE`). Guards SHALL apply in order: unknown trip 404
`TRIP_NOT_FOUND`; non-member 403 `NOT_A_MEMBER`; non-organizer 403
`NOT_ORGANIZER`; confirmed draft 409 `ALREADY_CONFIRMED`; no current draft 404
`NO_DRAFT`; unknown stop 404 `STOP_NOT_FOUND`. Every rejection SHALL
leave the draft unchanged. An accepted edit SHALL update the current draft in
place without creating a new version, without changing `inputRevisions`, and
without changing staleness, which remains driven by member preference
revisions and the trip-basics snapshot. Cross-stop feasibility (order, overlap, missing or overlong travel
legs, trip-day bounds) SHALL continue to be validated only at confirmation,
with the existing `scheduleErrors` types. Regeneration SHALL keep superseding
the whole current draft, including manual edits. A stop edit SHALL be applied
only while the draft is still unconfirmed, so a confirmation racing the edit
still yields 409 `ALREADY_CONFIRMED` with no partial write.

#### Scenario: Organizer edits a stop before confirmation

- **WHEN** the organizer submits a non-blank name and valid start/end times for an existing stop of the current unconfirmed draft
- **THEN** the response status is 200 with the same draft projection showing the edited `name`, `startTime` and `endTime`
- **AND** a subsequent draft read by any member returns the edited values
- **AND** the draft `version` and `inputRevisions` are unchanged

#### Scenario: Order, travel time and tags cannot be edited

- **WHEN** the organizer submits `seq`, `travelMinutesToNext` or interest-tag values in the body
- **THEN** the response is 200 and those values remain exactly as before
- **AND** the stop keeps its position and travel leg

#### Scenario: Repeating the same values is idempotent

- **WHEN** the organizer submits the stop's currently saved values
- **THEN** the response status is 200 with the same projection
- **AND** the stored stop is unchanged

#### Scenario: Blank name is rejected without write

- **WHEN** the organizer submits an empty or whitespace-only name
- **THEN** the response status is 400 with `code` equal to `NAME_REQUIRED`
- **AND** the stored stop is unchanged

#### Scenario: Malformed time is rejected without write

- **WHEN** the organizer submits a time that is not parseable as `HH:MM`
- **THEN** the response status is 400 with `code` equal to `INVALID_TIME`
- **AND** the stored stop is unchanged

#### Scenario: End not after start is rejected without write

- **WHEN** the organizer submits an end time equal to or earlier than the start time
- **THEN** the response status is 400 with `code` equal to `INVALID_TIME_RANGE`
- **AND** the stored stop is unchanged

#### Scenario: Unknown stop is reported separately

- **WHEN** the organizer targets a `seq` that does not exist in the current draft
- **THEN** the response status is 404 with `code` equal to `STOP_NOT_FOUND`
- **AND** the draft is unchanged

#### Scenario: No draft yet

- **WHEN** the organizer edits a stop before any draft exists
- **THEN** the response status is 404 with `code` equal to `NO_DRAFT`

#### Scenario: A confirmed draft rejects editing even its organizer

- **WHEN** the organizer edits a stop of the confirmed plan
- **THEN** the response status is 409 with `code` equal to `ALREADY_CONFIRMED`
- **AND** the confirmed stop values are unchanged

#### Scenario: Confirmation racing the edit still locks

- **WHEN** the draft becomes confirmed after the guard read but before the write is applied (documented test-only setup)
- **THEN** the conditional write applies no row and the response is 409 `ALREADY_CONFIRMED`
- **AND** no partial field write is stored

#### Scenario: A non-organizer member is denied

- **WHEN** Ben, a member but not the organizer, submits a valid stop edit
- **THEN** the response status is 403 with `code` equal to `NOT_ORGANIZER`
- **AND** the draft is unchanged

#### Scenario: A non-member is denied

- **WHEN** Eve, who is not a member, submits a stop edit
- **THEN** the response status is 403 with `code` equal to `NOT_A_MEMBER`
- **AND** the response contains no draft values

#### Scenario: An unknown trip is reported separately

- **WHEN** an authenticated caller edits a stop of a trip id that does not exist
- **THEN** the response status is 404 with `code` equal to `TRIP_NOT_FOUND`

#### Scenario: An unauthenticated request is rejected

- **WHEN** a stop edit request carries no authenticated session
- **THEN** the response status is 401 with `code` equal to `USER_REQUIRED`
- **AND** nothing is written

#### Scenario: Edited times remain subject to confirmation validation

- **WHEN** the organizer edits stop times so that consecutive stops overlap and then confirms the main plan
- **THEN** the edit itself was accepted with 200
- **AND** the confirmation is rejected with 422 `VALIDATION_FAILED` and `scheduleErrors` naming the offending stop `seq` (existing `OVERLAP` / `TRAVEL_EXCEEDS_GAP` semantics)
- **AND** the plan stays unconfirmed

#### Scenario: Regeneration discards manual edits

- **WHEN** the organizer edits a stop and then regenerates the main plan
- **THEN** the new draft version carries the provider's stop values, not the manual edit
- **AND** the previous draft version is superseded as before (G5 semantics unchanged)

### Requirement: Plan invalidation prompts

The edit page SHALL show a blocking confirmation dialog before saving when the
submitted form changes any planning basic and a main plan exists (an
unconfirmed draft or a confirmed plan). The dialog SHALL state that the existing
plan will expire and require regeneration or re-confirmation, and when a split
draft is active or confirmed, that the split must be cancelled first. Cancelling
the dialog SHALL send no request. The main-plan page SHALL show a blocking
dialog before confirming when the current draft is stale, explaining that trip
information or member preferences changed and offering regeneration; cancelling
SHALL send no confirmation request. The confirmation shortcut endpoint SHALL
reject a stale draft with 409 `STALE_DRAFT`; confirmation itself is performed
from the main-plan page (the trip-detail page no longer embeds a confirm action
after the US-083/085 page split), which SHALL show the same stale guidance with
a way to regenerate. No prompt SHALL itself confirm, regenerate or mutate any
state.

#### Scenario: Saving a planning change warns about the existing draft

- **GIVEN** an unconfirmed draft exists and a member changes the destination on the edit page
- **WHEN** the member activates save
- **THEN** a blocking dialog explains that the draft will become stale and must be regenerated
- **AND** cancelling the dialog sends no PUT
- **AND** continuing sends exactly one PUT

#### Scenario: Saving a planning change warns about the confirmed plan

- **GIVEN** a confirmed main plan exists and a member changes a date on the edit page
- **WHEN** the member activates save and continues past the dialog
- **THEN** the PUT succeeds and the plan returns to the unconfirmed/needs-regeneration state

#### Scenario: A name-only save skips the plan dialog

- **WHEN** the organizer changes only the name and saves
- **THEN** no plan-invalidation dialog is shown

#### Scenario: A split lock is named in the save dialog

- **GIVEN** an active or confirmed split exists and a member changes a planning basic
- **THEN** the save dialog states that the split must be cancelled first
- **AND** continuing leads to the split-gate error with no trip change

#### Scenario: Confirming a stale draft prompts regeneration

- **GIVEN** the current draft is stale and the organizer is on the main-plan page
- **WHEN** the organizer activates confirm
- **THEN** a blocking dialog explains that the plan is outdated and must be regenerated
- **AND** no confirm request is sent
- **AND** cancelling closes the dialog without changes

#### Scenario: The shortcut rejects a stale draft

- **GIVEN** the current draft is stale
- **WHEN** the organizer calls the trip-detail confirmation shortcut endpoint
- **THEN** the server returns 409 `STALE_DRAFT`
- **AND** the main-plan page shows the stale guidance with a way to regenerate
- **AND** no state changes

#### Scenario: A valid confirmation shows no stale prompt

- **GIVEN** the current draft is not stale
- **WHEN** the organizer confirms from the main-plan page
- **THEN** no stale dialog is shown and the confirmation proceeds

### Requirement: Stop location write-back and place cache sedimentation

The system SHALL let the trip organizer write programmatically geocoded
coordinates via `POST /api/trips/{id}/main-plan/stop-locations` with body
`{stops:[{seq,lat,lng}]}` (WGS-84), responding 200 with the same projection as
the draft read. The write SHALL update only the current draft's matching stop
rows and SHALL upsert the place cache (`place_cache`, name+city) with
`source=geocode` so later trips reuse the resolved location. Coordinates are
program-produced (browser geocode write-back); the AI generation contract
SHALL NOT supply coordinates. Rejections SHALL use the established codes:
no current draft 404 `NO_DRAFT` (including confirmed-only trips), non-organizer
403 `NOT_ORGANIZER`, unknown stop seq 422 `UNKNOWN_STOP`, out-of-range
coordinates 422 `INVALID_COORDS`.

#### Scenario: W1 — write-back persists coordinates and sediments the cache

- **GIVEN** a current draft exists and the caller is the organizer
- **WHEN** the organizer posts `{stops:[{seq:1,lat:1.3,lng:103.86}]}`
- **THEN** the response status is 200 and stop 1 of the current draft carries lat 1.3 / lng 103.86
- **AND** the place cache row for that stop's name+city is upserted with `source=geocode`

#### Scenario: W2 — unknown stop seq rejected

- **GIVEN** a current draft exists
- **WHEN** the organizer posts a seq not present in the draft
- **THEN** the request is rejected with 422 and code `UNKNOWN_STOP`
- **AND** no stop row or cache row changes

#### Scenario: W3 — out-of-range coordinates rejected

- **GIVEN** a current draft exists
- **WHEN** the organizer posts lat 91 (or lng beyond ±180)
- **THEN** the request is rejected with 422 and code `INVALID_COORDS`
- **AND** no stop row or cache row changes

#### Scenario: W4 — non-organizer member cannot write locations

- **GIVEN** Ben is a member but not the organizer
- **WHEN** Ben posts stop locations
- **THEN** the request is rejected with 403 and code `NOT_ORGANIZER`

#### Scenario: W5 — no current draft rejected

- **GIVEN** the trip has no current draft (never generated, or only a confirmed version)
- **WHEN** the organizer posts stop locations
- **THEN** the request is rejected with 404 and code `NO_DRAFT`
- **AND** the confirmed version is untouched

#### Scenario: W6 — sedimented cache reused by a later trip

- **GIVEN** a stop location was sedimented into the place cache by write-back
- **WHEN** another trip with the same stop name+city generates its main plan
- **THEN** generation completes that stop's address/coordinates from the cache without a new geocode
