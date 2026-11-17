# Spec Delta

## Purpose

能力 `trips`（US-089 增量）：已确认分队后，“我的方案”按当前成员所在组展开。沿用已确认主线的组（路线携带 `steps`）用其站内停留与真实时刻填满分头→会合区间；另一组显示其生成活动。共享段仅保留分头之前与会合（含）之后的站点。

## MODIFIED Requirements

### Requirement: Personal route after split confirmation

When the trip's split draft is confirmed and the current member is assigned to a group, the 我的方案 section SHALL display that member's group route together with the shared main-plan activities strictly before the departure stop and from the reunion stop onward, using the confirmed snapshot's timestamps. For the group whose route carries `steps` (the group that keeps the confirmed plan), the departure→reunion segment SHALL be filled by those main-plan stops with their scheduled times and the member's group label; no synthetic "group activity" block SHALL be inserted. The other group SHALL show its generated activity between the boundaries. Each member SHALL see only their own group's route. An unconfirmed or cancelled draft SHALL NOT be presented as a confirmed personal plan.

#### Scenario: Assigned member sees their own route with shared activities

- **WHEN** the split draft is confirmed and Alice is assigned to group A (route keeps the confirmed plan)
- **THEN** Alice's 我的方案 lists the main-plan stops from the departure stop (inclusive) to the reunion stop (exclusive) with their scheduled start/end times, each labelled with group A
- **AND** the shared main-plan activities before the departure stop and from the reunion stop onward are retained
- **AND** no synthetic "沿主线方案" block appears

#### Scenario: Different members see different routes

- **WHEN** Alice is assigned to group A and Eve to group B in the same confirmed split
- **THEN** Alice's detail follows the main-plan stops inside the window
- **AND** Eve's detail shows group B's generated activity with its times
- **AND** neither member sees the other group's route as their own plan

#### Scenario: Unassigned member does not see another group's route

- **WHEN** the split is confirmed but the member is not present in any group
- **THEN** their 我的方案 does not display any group's route as their personal plan

#### Scenario: Unconfirmed or cancelled draft is not a personal plan

- **WHEN** the split draft is active (unconfirmed) or cancelled
- **THEN** the 我的方案 section falls back to the main plan when one exists, or the legacy detail page otherwise (R9)
- **AND** no unconfirmed route is labelled or presented as confirmed

#### Scenario: Confirmation returns to the same trip detail

- **WHEN** the organizer completes a successful split confirmation
- **THEN** the app returns to the same trip's detail page
- **AND** the detail page shows the confirmed personal route for that organizer
