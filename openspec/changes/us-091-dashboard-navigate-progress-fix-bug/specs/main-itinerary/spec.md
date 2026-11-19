## MODIFIED Requirements

### Requirement: Readiness-gated main plan generation

The system SHALL allow any trip member to generate a main-plan draft using
`POST /api/trips/{id}/main-plan` only when every trip member is ready at their
recorded preference revision, returning 201 and a draft projection. The
configured plan provider SHALL be used: an external AI service when an API key
is configured, otherwise the deterministic fixture provider. Generation SHALL
persist a new draft version with ordered stops, times, travel durations, input
revisions and per-person cost, without automatically confirming it.
Regeneration SHALL replace the previous current draft. Generation after a
confirmed version SHALL be rejected (G6). Non-members SHALL be denied.
Confirmation remains organizer-only under the separate confirmation requirement.

The AI provider SHALL treat trip facts and every ready member's interests,
must-dos and hard budgets as data rather than instructions. Before persistence,
AI output SHALL have at least two stops, contiguous `seq` starting at 1, valid
`HH:mm` start and end times with end after start, a nonnegative integer travel
time for non-final stops, null travel time for the final stop and a nonnegative
integer per-person cost in cents. AI timeout, transport or HTTP failure, or
blank or invalid output SHALL fall back to a deterministic minimal itinerary,
persisted as a draft without changing the response status or error code. It
SHALL contain exactly two stops: the completed trip start location from
09:00 to 09:30 with 30 minutes' travel to the next stop, and the completed trip
end location from 17:00 to 17:30 with null onward travel, with zero per-person
cost. Supplied locations are preserved; blank locations use completion results.

During generation or regeneration from the inputs or plan page, the client
SHALL show a persistent, non-blocking in-page `AI 正在生成中…` indicator,
disable the triggering action until the request finishes, and allow navigation
and reading the rest of the page. The indicator SHALL close on success or
failure; existing inline action errors SHALL remain the failure surface.

At persistence the system SHALL use `place_cache`, keyed by stop name and city,
to complete each stop's address and WGS-84 coordinates. On a cache miss the
coordinates SHALL remain null and the provider-supplied address SHALL be
preserved for later coordinate backfill. The 201 projection SHALL include
`address`, `lat` and `lng` for each stop.

#### Scenario: G1 — all members ready, draft generated (US-031 AC1)

- **GIVEN** four members are ready at revision 1 and the fixture provider supplies four stops
- **WHEN** organizer Alice generates the main plan
- **THEN** 201 returns current draft version 1, unconfirmed and not stale, with per-person cost 5000 cents and all four input revisions
- **AND** the four ordered stops have the supplied names and times and travel times 30, 30, 15 and null
- **AND** the trip is not marked confirmed

#### Scenario: Member generates and regenerates a draft

- **GIVEN** all members are ready and the main plan is not confirmed
- **WHEN** a member who is not the organizer generates or regenerates the main plan
- **THEN** the request succeeds and creates a new current draft version
- **AND** only the organizer may confirm it

#### Scenario: Non-member cannot generate

- **WHEN** an authenticated non-member requests generation
- **THEN** the request is denied and no draft is created

#### Scenario: G2 — pending member blocks generation (US-031 AC2)

- **GIVEN** Daniel (id 4) is not ready
- **WHEN** a member generates the main plan
- **THEN** 409 `MEMBERS_NOT_READY` identifies Daniel in `pendingMembers` by user ID and display name
- **AND** no draft is persisted

#### Scenario: G5 — regeneration creates a new version

- **GIVEN** current draft version 1 exists
- **WHEN** a member regenerates the main plan
- **THEN** 201 returns version 2 as the current draft and version 1 is no longer returned as current

#### Scenario: G6 — generation after confirmation rejected

- **GIVEN** version 1 is confirmed
- **WHEN** a member requests generation
- **THEN** 409 `ALREADY_CONFIRMED` is returned, no new draft is persisted and the confirmed version is unchanged

#### Scenario: AI 提供者产出草稿

- **GIVEN** an AI API key is configured and the provider returns a valid itinerary whose stops fall within the trip day
- **WHEN** a member generates the main plan
- **THEN** 201 returns a persisted draft with the AI's ordered stops, travel durations and per-person cost
- **AND** input revisions match each member's recorded generation-time revision

#### Scenario: AI 失败时降级为最小两站行程

- **GIVEN** the start is City Hall MRT, the end is Merlion Park, and the configured AI times out, returns non-2xx or fails output validation
- **WHEN** a member generates the main plan
- **THEN** 201 returns exactly those two stops at 09:00–09:30 and 17:00–17:30, with onward travel 30 and null respectively and per-person cost zero
- **AND** no AI-specific status or error code or partially parsed AI output is persisted

#### Scenario: 未填写地点时降级使用补全后的地点

- **GIVEN** both trip locations are blank and the configured AI call fails
- **WHEN** a member generates the main plan
- **THEN** location completion happens first and the fallback stops use the completed start and end

#### Scenario: 生成期间显示非阻塞的 AI 进度提示

- **GIVEN** a member starts generation from the inputs page or regeneration from the plan page
- **WHEN** the request is in flight
- **THEN** `AI 正在生成中…` remains visible, the triggering action is disabled, and other page content remains readable and navigable
- **AND** the indicator closes on success or failure and failures use existing inline action errors

#### Scenario: AI 输出在入库前被校验

- **GIVEN** AI output has noncontiguous `seq`, invalid `HH:mm` times, end not after start, invalid travel time or negative cost
- **WHEN** a member generates the main plan
- **THEN** the output is rejected and the minimal two-stop fallback is persisted with status 201

#### Scenario: G7 — generation persists stop address and coordinates from the place cache

- **GIVEN** the place cache contains addresses and WGS-84 coordinates for fixture stops
- **WHEN** a member generates the main plan
- **THEN** every persisted stop and its 201 projection contain the cached `address`, `lat` and `lng`

#### Scenario: G8 — cache miss leaves coordinates null without blocking generation

- **GIVEN** a supplied stop name is absent from the place cache
- **WHEN** a member generates the main plan
- **THEN** generation succeeds with null `lat` and `lng` for that stop
- **AND** the provider-supplied address is preserved and no coordinate is fabricated
