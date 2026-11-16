# Spec Delta

## MODIFIED Requirements

### Requirement: Placeholder tabs

The 分队 tab SHALL target `#/split` and SHALL render the shipped split entry
for the selected trip (the entry that leads to the trip-scoped split flow),
with a unique visible heading; with no trip selected it SHALL show guidance
back to 行程. The 成员 tab SHALL target `#/members` and SHALL render the trip
member list defined by the `trips` capability requirement "Trip member list
read". Neither tab SHALL render a not-implemented placeholder or fabricate demo
members, routes or statuses. The shell frame, bottom-dock order, active-tab rule
and signed-in account bar SHALL remain unchanged.

#### Scenario: 分队 shows the shipped split entry

- **WHEN** the 分队 tab is activated with a resolved trip
- **THEN** `#/split` renders the shipped split entry for that trip with a unique
  visible heading
- **AND** the 分队 tab is active
- **AND** no not-implemented placeholder is rendered

#### Scenario: 成员 shows the member list

- **WHEN** the 成员 tab is activated with a resolved trip and an authenticated
  account that is a member of that trip
- **THEN** `#/members` renders the trip's member roster with the organizer row
  identified
- **AND** the 成员 tab is active
- **AND** the roster comes from `GET /api/trips/{id}/members`
- **AND** no readiness, preference summary or generate action is rendered

#### Scenario: No demo data is fabricated

- **WHEN** either tab renders
- **THEN** no demo member, route or status value is displayed
- **AND** an outsider sees the permission-denied state with no member names
