# Proposal

## Why

US-013 (issue #9, `Iteration 1`, `Priority - Must`, `Type - Members`) gives every
trip member one honest roster: who has joined and which row is the organizer.
Today the 成员 tab is an honest "not implemented yet" placeholder from US-064,
while the roster data already exists in `trip_member` and `trip.organizer_id`
(REQ-003 `V2`). Without this read, a member cannot tell who is traveling with
them or who owns organizer actions, and Screen 7 cannot leave its placeholder.

The change is one small, read-only vertical slice: an authenticated roster read
in the existing `trips` capability and the Screen 7 content inside the existing
app shell. It adds no table, no column, no write path and no new dependency.
The baseline now includes REQ-003/004, US-031-037, US-064, US-066 login/session
and the split flow, so this change composes them instead of rebuilding
membership, identity or the shell.

## What Changes

- **ADDED** `trips` requirement "Trip member list read":
  - `GET /api/trips/{id}/members`, member-only, read-only.
  - Identity is the authenticated account/session principal from US-066; no
    session → `401 USER_REQUIRED`; unknown trip → `404 TRIP_NOT_FOUND`; known
    outsider → `403 NOT_A_MEMBER`. The retired `X-User-Id` header does not
    authenticate. The denial body carries no `userId`, `displayName` or
    organizer value.
  - Success is `200` with
    `{ "tripId": <id>, "members": [{"userId", "displayName", "organizer"}] }`
    ordered by ascending `userId`. Every member appears exactly once.
  - `organizer` is derived by comparing the row's `userId` with
    `trip.organizer_id`; only Alice is `true` in the fixture.
  - The projection contains no readiness, preference, budget or main-plan
    field. Readiness/preferences stay with US-026/US-027/US-031.
- **REMOVED** the obsolete `app-shell` requirement "Placeholder tabs" and
  **ADDED** "Tab content":
  - The old placeholder requirement is removed because both tabs now render
    shipped content; the new requirement records that behavior.
  - The 成员 tab keeps `#/members` and its active-tab rule, but renders the real
    trip roster instead of a not-implemented placeholder.
  - The 分队 tab renders main's shipped split entry (the trip-scoped split
    flow) and is no longer a not-implemented placeholder.
  - The shell frame, dock order, active-tab rule and signed-in account bar stay
    unchanged. The member-list data is a `trips` read rendered inside the tab;
    the shell frame itself still adds no backend endpoint.
- **Frontend Screen 7** (US-013) inside the shell:
  - Member rows with avatar initial, display name, an 组织者 badge on the
    organizer row and a member count.
  - Mandatory loading, empty, error, permission-denied and no-trip guidance
    states.
  - The signed-in account drives the read; an authenticated outsider sees the
    denied state with no names.
  - No readiness ring, readiness pills, preference summaries or
    "生成主线方案" action (the screenshot shows them; the issue's design scope
    excludes them).
- **Acceptance fixtures** §US-013: request/response matrix, wire projection,
  error contract and deliberately unfixed visual values.
- **No database change**: `V2__create_trip.sql` already creates `app_user`,
  `trip` and `trip_member(trip_id, user_id)` and seeds users 1–5 plus the
  fixture trip with Alice, Ben, Chloe and Daniel as members.

Unchanged: trip creation/detail read, invitation preview/accept/closed
behavior, main-plan readiness and preference reads, the app shell frame/dock,
the shipped split flow, the US-066 login/session flow, SQLite datasource and the
two CI jobs. The CI **job contents** are unchanged; by user instruction on
2026-11-16 the workflow trigger was broadened from `main`-only pushes to every
branch push so this feature branch can produce its own run. No breaking change
to any published contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trips` — one **ADDED** requirement "Trip member list read". Existing
  identity, creation, detail-read and main-plan-state requirements are
  unchanged.
- `app-shell` — one **REMOVED** requirement "Placeholder tabs" and one
  **ADDED** requirement "Tab content". 分队 renders the shipped split entry and
  成员 renders the roster; the shell frame and dock requirements are unchanged.

## Impact

- **Requirement**: US-013 (`requirement-workspace/requirements/US-013.md`),
  intent `requirement-workspace/intents/2026-11-16-us-013.md`, DoR
  `analysis/us-013-dor.md` (BLOCKER = 0, A0 Pass), deep-dive §US-013, impact
  brief §US-013 (R30–R36).
- **Story**: GitHub issue #9, `Iteration 1`, `Priority - Must`,
  `Type - Members`; board card already in `Req Analysis`.
- **Code**: `backend/.../trip/TripController.java` (one GET method) and
  `TripRepository.java` (one read query), one response DTO; frontend
  `App.tsx` members route, new `pages/Members.tsx`, minimal token-based CSS.
  Invitation, main-plan, greeting and split code untouched.
- **APIs**: `GET /api/trips/{id}/members` (200 / 401 `USER_REQUIRED` /
  403 `NOT_A_MEMBER` / 404 `TRIP_NOT_FOUND`). Wire field names contractual at
  P2; only `code` is contractual in errors.
- **Data**: read-only; no migration, no new table/column, no seed change.
- **Dependencies**: none new.
- **Cross-REQ**: `invitations` accept creates membership rows that this read
  composes (Eve appears once); `main-itinerary` readiness/preferences are
  deliberately not exposed; the `app-shell` placeholder requirement is
  explicitly removed and replaced, not silently contradicted.
- **Upstream**: REQ-003/004 membership schema and invitation accept, US-064
  shell/dock, US-031-037 fixtures, US-066 login/session and the split flow are
  all merged on `group1/main` (`135d3df`); this change composes them without
  changing their contracts.
- **Downstream**: US-026/US-027 readiness and US-031 generation may later
  extend the same screen; split endpoints keep their separate anonymous error
  code until follow-up F2.
- **Risks**: R30 Screen 7 scope creep (guarded by S10/U1); R31 placeholder
  contract (REMOVED/ADDED requirement); R32 `USER_REQUIRED` vs `MEMBER_REQUIRED`
  live divergence (accepted, follow-up F2); R33 no durable trip selection on
  `#/members` (P3 choice); R34 deterministic ordering; R35 design-system
  migration gap; R36 denial-body leakage; R37 all-branch CI trigger
  (user-approved); R38 auth arrived after G1 (delta amended under G2 C1/C4).

## Non-Goals / Out of scope

- Readiness, preference summaries, budgets, the readiness ring and the
  generate-main-plan action (US-026 / US-027 / US-031).
- Inviting, removing or changing member roles; transferring organizer; member
  profiles or accounts.
- Changing the merged US-066 authentication/session flow; US-013 consumes the
  authenticated principal. Split endpoints retain their separate
  `MEMBER_REQUIRED` anonymous code (follow-up F2).
- List-all-trips, search, sorting, pagination or a new schema.
- Avatar uploads or a new design system; avatar treatment is a local visual
  choice using existing tokens.
- Changes to invitation, main-plan, split or greeting behavior.
- New frontend dependencies, i18n or CI job structure changes.

## Effort and ordering

Small. One vertical slice:
`schema-free read → controller/repository/DTO → backend API tests → Screen 7 page + states → fixture matrix → browser verification`.
No migration, no new package, no dependency. `/sdd:story-split` is Skipped: one
story (issue #9) and one slice. `/sdd:proposal-split` produces this single
change.

## A0 deep-dive gate

US-013 is new with deep-dive in scope. `deep-dive.md` §US-013 evaluates
⑨ data contract (roster grain, wire fields, ordering, organizer derivation,
existing `V2` source; no `{TBD}`), ⑩ boundary (identity, trip existence,
membership, joined member, duplicate accept, empty roster, write verbs all
in/out), ⑪ cross-REQ (`trips`/`invitations`/`app-shell`/`main-itinerary`
convergence rows; split-branch vocabulary divergence recorded non-blocking),
⑫ display contract (eight surfaces incl. loading/empty/error/permission/no-trip
states). All four Pass → **A0 Pass**, split permitted.

## Known deviations carried into later stages

- **Design-system migration (R35):** the component-library/design-system track
  is separate; this read-only screen follows the merged frontend's shell, token
  CSS and shared `api()` helper.
- **Placeholder supersession (R31/C3):** US-064's `Placeholder tabs` requirement
  is explicitly a pre-US-013 state. The REMOVED/ADDED pair records the shipped
  split entry for 分队 and the roster for 成员; the Living Spec purpose is
  reconciled at archive.
- **Identity divergence (R32/C4):** trips/members use the US-066 session
  principal and `USER_REQUIRED`; split endpoints are also session-based but
  return `MEMBER_REQUIRED` for anonymous callers. Accepted for this slice with
  follow-up **F2**; no split code is changed here.
- **G2 remediation (C1–C5):** main was merged (`135d3df`), the auth/session and
  app-shell deltas were applied, and the evidence matrix was expanded
  (retired-header 401, PUT/DELETE 405, direct-insert wording). The app-shell
  delta is structured as REMOVED + ADDED so `openspec validate --strict`
  passes on CLI 1.16.1. The VL re-recorded G2 **Pass** on the merged head
  (2026-11-16).
