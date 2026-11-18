# Spec Delta — main-itinerary (us-079-map-navigation)

## MODIFIED Requirements

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

### Requirement: Draft review with computed staleness

The system SHALL let trip members read the current draft at
`GET /api/trips/{id}/main-plan`, responding 200 with the draft projection
(`tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions`,
ordered `stops` with times and travel legs). After confirmation the same read
SHALL return the confirmed version. `stale` SHALL be computed on read, not
stored, and applies to unconfirmed drafts only; the confirmed version SHALL be
frozen (P2 lint ruling 2026-11-15). The projection's `stops` SHALL additionally
carry `address`, `lat`, `lng` when persisted; null values SHALL be omitted from
the wire (additive, old clients unaffected).

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists and every input revision matches the member's current revision
- **WHEN** Ben (member, `X-User-Id: 2`) reads the main plan
- **THEN** the response status is 200 with `version`, `confirmed` false, `stale` false, `costPerPersonCents`, `inputRevisions` and the ordered `stops` with times and legs

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true (any member's current revision differing from the revision recorded at generation makes an unconfirmed draft stale)
- **AND** the draft version and its recorded `inputRevisions` are unchanged

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
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false (the confirmed version is frozen: `stale` is always false for it regardless of later revision changes; staleness applies to unconfirmed drafts only)

#### Scenario: Read carries persisted stop location fields

- **GIVEN** a draft whose stops carry persisted `address`, `lat`, `lng`
- **WHEN** a trip member reads the main plan
- **THEN** the 200 body's `stops` carry the three fields for those stops
- **AND** stops without persisted location omit the fields (null)

## ADDED Requirements

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
