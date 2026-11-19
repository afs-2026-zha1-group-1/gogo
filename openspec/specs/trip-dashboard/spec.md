# trip-dashboard Specification

## Purpose

Give an authenticated trip member an overview of the selected trip using
authorized source data, with access to existing trip-planning destinations.

## Requirements

### Requirement: Current-trip dashboard selection

The dashboard SHALL read the signed-in traveler's persisted current trip and
show its authorized overview. When no current trip is selected, it SHALL
offer the existing My Trips picker and trip creation instead of inventing a
trip. A direct selected-trip dashboard route SHALL NOT change the persisted
current trip.

#### Scenario: An explicitly selected trip survives reload

- **GIVEN** a member selects a trip in My Trips
- **WHEN** the member opens or reloads the dashboard
- **THEN** the selected trip's overview is shown
- **AND** other member trips are not presented as dashboard cards

#### Scenario: No selected trip

- **GIVEN** the current-trip read succeeds with no selection
- **WHEN** the dashboard loads
- **THEN** it shows an empty-selection state and links to My Trips and create

#### Scenario: Current-trip read fails

- **WHEN** the current-trip read fails or returns invalid data
- **THEN** the dashboard displays an error and retry rather than a trip

#### Scenario: Direct selection does not persist

- **GIVEN** the traveler has a different saved current trip
- **WHEN** the traveler opens an authorized `#/dashboard/trips/<id>` directly
- **THEN** the requested overview is shown without changing the saved selection
- **AND** a late current-trip response does not replace that overview

### Requirement: Authorized trip overview

The selected dashboard SHALL show the saved trip summary, member and ready
counts, main-plan status and split status using authorized owning reads. It
SHALL distinguish valid absence from failure and SHALL NOT persist separate
dashboard progress.

#### Scenario: Overview reflects a stale draft

- **GIVEN** an authorized trip has four members, three ready members, a stale
  main-plan draft and no split draft
- **WHEN** the required reads succeed
- **THEN** the overview shows those values and the saved trip details

#### Scenario: Inconsistent or failed source

- **WHEN** required source data is invalid, inconsistent or unavailable
- **THEN** it is not represented as a verified count or absent draft

#### Scenario: Successful absent drafts

- **GIVEN** the authorized reads report no main-plan or split draft
- **WHEN** the overview loads
- **THEN** each is displayed as absent rather than as a failed read

#### Scenario: Changed source data

- **WHEN** the overview rereads changed membership, readiness, plan or split
  data successfully
- **THEN** it displays the updated source values without persisting progress

### Requirement: Role-specific journey milestones

仪表盘 SHALL 向组织者显示建局、偏好、邀请、主线方案和分队，向其他成员显示
偏好、邀请、主线方案和分队。规划里程碑的详情和完成、进行中、待处理状态 SHALL
基于现有就绪、成员、主线方案和分队数据；进度条 SHALL NOT 显示汇合和完成。

#### Scenario: Organizer and member milestones

- **GIVEN** the source reads are valid
- **WHEN** an organizer views the dashboard
- **THEN** the five organizer milestones appear in the specified order
- **WHEN** another member views it
- **THEN** the four member milestones appear in the specified order
- **AND** reunion and completion do not appear in the progress strip

#### Scenario: Planning state changes

- **GIVEN** valid readiness, membership, plan and split data
- **WHEN** the dashboard renders the progress strip
- **THEN** it shows the viewer's readiness and ready/member count
- **AND** it distinguishes absent, draft, stale and confirmed main plans and
  absent, active, confirmed and cancelled splits
- **AND** organizers and other members see invitation joining status and membership context

#### Scenario: Ready members can still invite before generation

- **GIVEN** 查看者的偏好已就绪、加入未关闭且尚无主线方案草稿
- **WHEN** 组织者或其他成员查看仪表盘
- **THEN** 邀请仍为进行中，且可使用生成主线方案和邀请朋友两个操作
- **AND** 下一步推荐生成主线方案

#### Scenario: Generated plan and closed joining

- **GIVEN** 主线方案草稿已存在
- **WHEN** 组织者或其他成员查看仪表盘
- **THEN** 邀请里程碑显示完成
- **AND** 加入状态反映行程实际的关闭状态，即使确认随后被取消

### Requirement: Source-backed next step and quick links

After valid required reads, the dashboard SHALL provide a source-backed next
step and links to invitation, preferences and main plan. It SHALL preserve
existing destination authorization and SHALL NOT itself generate or confirm
a plan or split.

#### Scenario: Guidance depends on role and planning state

- **GIVEN** the main plan is confirmed
- **WHEN** the dashboard selects the next step
- **THEN** it offers the split destination
- **WHEN** the main plan is unconfirmed and the viewer is not ready
- **THEN** it offers preferences
- **WHEN** a ready viewer has no plan, including an organizer who is the only member
- **THEN** it offers main-plan inputs
- **WHEN** a draft or stale plan exists
- **THEN** it offers the main-plan view

#### Scenario: Required source is unavailable

- **WHEN** required source reads are pending, invalid or failed
- **THEN** the dashboard does not present a source-backed recommendation

#### Scenario: Quick links

- **WHEN** an authorized member views the selected dashboard
- **THEN** invitation, preferences and main-plan links target the selected trip
- **AND** the destination applies its existing access rules and behavior

### Requirement: Explicit dashboard read and access states

The dashboard SHALL distinguish pending, no selection, invalid, missing,
denied and failed reads from successful data. Existing authentication and
membership boundaries SHALL apply; no other trip SHALL be substituted.

#### Scenario: Missing and denied trips

- **WHEN** a signed-in traveler requests a malformed, missing or unauthorized
  selected-trip dashboard
- **THEN** the applicable state is shown without disclosing another trip

#### Scenario: Signed-out visitor

- **WHEN** a signed-out traveler opens a dashboard
- **THEN** the authentication boundary applies before private data is shown

#### Scenario: Account or trip changes during a read

- **WHEN** an earlier request completes after the account or trip changes
- **THEN** it does not replace the new selection with the earlier private data

### Requirement: Dashboard create-trip quick entry

仪表盘 SHALL 在左上角显示创建行程快捷入口，并导航到我的行程所使用的同一创建页。

#### Scenario: Create a trip from the dashboard

- **WHEN** 成员选择仪表盘的创建行程快捷入口
- **THEN** 应用导航至 `#/create`
- **AND** 显示现有创建行程页面

### Requirement: Dashboard destination side effects

The dashboard overview SHALL read existing state without persisting progress.
Destinations SHALL retain their existing permissions and side effects.
Opening invitation or trip-details pages as organizer invokes the existing
invitation POST; navigation to those destinations is not write-free.

#### Scenario: Organizer opens invitations

- **GIVEN** the viewer is the trip organizer
- **WHEN** the invitation destination loads
- **THEN** its existing invitation panel requests an invitation

#### Scenario: Non-member opens invitations

- **WHEN** a non-member opens the invitation destination
- **THEN** the existing trip authorization denies access
