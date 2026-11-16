# Spec Delta

## MODIFIED Requirements

### Requirement: Placeholder tabs

The 分队 tab SHALL target `#/split` and SHALL render an honest text placeholder
stating that the feature is not implemented yet, with a link back to 行程 and a
unique visible heading. The 成员 tab SHALL target `#/members` and SHALL render
the trip member list defined by the `trips` capability requirement "Trip member
list read"; it SHALL NOT render a not-implemented placeholder. The member-list
data SHALL come from the `trips` read endpoint and SHALL NOT cause the shell
frame or dock to add a backend endpoint. Neither tab SHALL fabricate demo
members, routes or statuses. The shell frame, bottom-dock order, active-tab rule
and identity scaffold SHALL remain unchanged.

#### Scenario: 分队 shows an honest placeholder

- **WHEN** the 分队 tab is activated
- **THEN** `#/split` renders a text placeholder stating the feature is not
  implemented yet, with a unique visible heading
- **AND** a link back to 行程 is present
- **AND** the 分队 tab is active

#### Scenario: 成员 shows the member list

- **WHEN** the 成员 tab is activated with a resolved trip and an identity that
  is a member of that trip
- **THEN** `#/members` renders the trip's member roster with the organizer row
  identified
- **AND** the 成员 tab is active
- **AND** the roster comes from `GET /api/trips/{id}/members`
- **AND** no readiness, preference summary or generate action is rendered

#### Scenario: No demo data is fabricated

- **WHEN** either tab renders
- **THEN** no demo member, route or status value is displayed
- **AND** an outsider sees the permission-denied state with no member names
