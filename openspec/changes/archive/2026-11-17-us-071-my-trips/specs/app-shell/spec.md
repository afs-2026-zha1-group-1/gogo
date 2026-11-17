# Spec Delta

## REMOVED Requirements

### Requirement: Trips tab placement and no-trip empty state

**Reason**: 2026-11-17 用户修订引入「当前行程」模型：列表移入「我的 → 我的行程」，「行程」tab 改为展示当前行程详情。原条的「tab 落列表 / 空态两动作 / 不得新增列表端点」语义全部被取代，继续以 MODIFIED 保留会留下与新语义矛盾的场景名。

**Migration**: 由本 delta 的 ADDED「Current trip tab and my-trips list」承接全部导航与空态契约；列表读取契约由 `trips` 的「Trip list read」承接；`#/trips/<id>` 深链与创建返回行为在新条中保留。

## ADDED Requirements

### Requirement: Current trip tab and my-trips list

The 我的 page SHALL expose an entry titled 我的行程 opening `#/my-trips`, listing the caller's trips as cards without a trailing arrow. Activating a card SHALL set it as the current trip, highlight that card and show an 已选择 tag at the card's right edge without navigating. The 行程 tab SHALL target `#/trips`, rendering the current trip's details or an empty state linking to `#/my-trips`. `#/trips/<id>` SHALL keep opening details directly.

#### Scenario: The account page exposes the my-trips entry

- **WHEN** a signed-in traveler opens `#/account`
- **THEN** an entry titled 我的行程 is visible
- **AND** activating it opens `#/my-trips` inside the shell

#### Scenario: The my-trips page lists the caller's trips

- **WHEN** the traveler opens `#/my-trips`
- **THEN** every row shows the trip name, destination and start–end dates with the created and ended markers
- **AND** only trips the caller belongs to are listed
- **AND** the page carries a unique visible heading
- **AND** cards and empty states follow the `ui-design-reference` prototype visuals (`.qcard` / `.empty`)

#### Scenario: Selecting a card tags it without navigating

- **WHEN** the traveler activates a card in `#/my-trips`
- **THEN** the selected trip becomes the caller's current trip on the server
- **AND** that card is highlighted and shows an 已选择 tag at its right edge (no trailing arrow), staying on `#/my-trips`
- **AND** any previously selected card loses its tag and highlight

#### Scenario: The selected tag reflects the stored current trip

- **WHEN** the traveler opens `#/my-trips` with a current trip already stored
- **THEN** the matching card shows the 已选择 tag on first render
- **AND** no other card shows it

#### Scenario: The trips tab shows the current trip's details

- **WHEN** the traveler activates the 行程 tab with a current trip set
- **THEN** `#/trips` renders that trip's details screen under the shell with the 行程 tab active
- **AND** the details' loading, denied and missing states behave as before

#### Scenario: Without a current trip the trips tab guides to my-trips

- **WHEN** the traveler opens `#/trips` and has no current trip
- **THEN** an empty state renders with a unique visible heading
- **AND** it offers a link to `#/my-trips`
- **AND** no trip name, member, route or status value is invented

#### Scenario: The current trip survives reload and re-login

- **WHEN** the traveler reloads the app or signs in again on another device
- **THEN** `#/trips` still shows the same current trip's details
- **AND** switching to another account shows that account's own current trip, or its empty state

#### Scenario: Details deep link still works

- **WHEN** the traveler opens `#/trips/<id>` directly by URL
- **THEN** the existing details flow runs for that id
- **AND** an id that does not exist surfaces the existing missing state

#### Scenario: Trip-scoped return links keep the trip context

- **WHEN** a member activates the back link on the 成员 roster of a trip
- **THEN** the app returns to that trip's details at `#/trips/<id>`
- **AND** guidance shown when no trip is resolved targets `#/trips`

#### Scenario: Create is reachable and returns to the trips tab

- **WHEN** the traveler opens `#/create` from the shell and uses the back action
- **THEN** the app returns to `#/trips`
- **AND** a successful create still navigates to `#/trips/<id>`

#### Scenario: No second list source is introduced

- **WHEN** `#/my-trips` and `#/trips` are exercised
- **THEN** the list comes only from the `trips` list read and the details only from the current-trip read plus the existing details read
- **AND** no alternate list-all-trips endpoint or client-side cache is introduced
