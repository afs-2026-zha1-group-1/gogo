# Local verification — US-013 View Trip Members

- Change: `us-013-view-trip-members`
- Date: 2026-11-16
- Branch: `US-013-view-trip-members-planning`
- Baseline: `group1/main` `729a889`
- Scope: `GET /api/trips/{id}/members` + Screen 7 member roster

## Backend

Command: `cd backend && mvn -B test`

Result: **101/101 tests pass** (0 failures, 0 errors, 0 skipped), including the
new `TripMembersApiTest` **11/11**. Flyway applied **4 migrations** (V1, V2, V3,
V5) — no stale V4 from the unmerged split branch.

> Note: a `mvn clean test` run was blocked because a previously running
> `target/gogo-backend-0.0.1-SNAPSHOT.jar` process held the jar handle. The
> process was stopped with the user's approval; `target/classes` had already
> been cleared, so the subsequent `mvn -B test` compiled and migrated from the
> source tree (4 migrations). The extracted V4 observation is therefore not a
> test artifact.

### API matrix (fixtures §US-013)

| Case | Call | Observed |
|---|---|---|
| M1 member list | `GET /api/trips/1/members`, `X-User-Id: 2` | `200`; `tripId=1`; 4 rows userId 1–4; `organizer=true` only Alice |
| M2 organizer reads | same, `X-User-Id: 1` | `200`; same 4 rows; Alice still the only organizer |
| M3 outsider denied | same, `X-User-Id: 5` | `403` `NOT_A_MEMBER`; no `userId` / `displayName` / organizer value |
| M4 no identity | same without `X-User-Id` | `401` `USER_REQUIRED`; no member data |
| M5 unknown identity | same, `X-User-Id: 999999` | `401` `USER_REQUIRED` |
| M6 unknown trip | `GET /api/trips/999999/members`, `X-User-Id: 2` | `404` `TRIP_NOT_FOUND` |
| M7 outsider unknown trip | same, `X-User-Id: 5` | `404` `TRIP_NOT_FOUND` (trip existence before membership) |
| M8 joined member | test-only `trip_member (trip, 5)` insert, read as Eve | `200`; 5 rows; Eve exactly once |
| M9 duplicate accept | insert twice (composite PK), read | still 5 rows; Eve once |
| M10 no personal fields | read as Ben | no `ready` / `preferenceRevision` / `interests` / `hardBudgetCents` / `mainPlan` |
| Reverse write | `POST /api/trips/1/members` | `405` method not allowed |

## Frontend

Command: `cd frontend && npm run build` (`tsc -b && vite build`)

Result: **build green**; 57 modules transformed; no TypeScript errors.

## Browser E2E (Playwright, dev server 5173 → backend 8080)

Backend restarted from the current jar with a separate seeded database
(`./data/gogo-us013.db`), preserving the existing dev database.

| Case | Observation |
|---|---|
| U1 roster | Navigated `#/trips/1` → 成员 tab: 4 rows Alice, Ben, Chloe, Daniel; Alice only `organizer`; 0 readiness pills; 0 generate actions; count label 4 位成员 |
| U2 denial | Switched identity to Eve: denied card, 0 member rows, no names inside `.shell-content` (the scaffold selector is the only place user names remain); switched back to Ben: 4 rows restored |
| U3 no trip | Fresh page at `#/members`: no-trip guidance, link to 行程, 0 fabricated rows |
| Loading | Delayed `fetch` 2 s, changed identity: 1 fetch call, `.loading` visible, 0 rows; after completion 4 rows |
| Error + retry | Stopped backend, changed identity: `无法加载成员` + HTTP 502, 0 rows, retry button present; restarted backend, clicked 重试: 4 rows |
| Shell regression | `#/split` still the honest placeholder (0 member rows, 分队 active); 仪表盘/行程/成员 active-tab hrefs correct; 成员 list survives tab navigation |
| Missing trip UI | Not reachable from `#/members` (route carries no trip id); API M6 covers `404 TRIP_NOT_FOUND`; state implemented and inspected |
| Empty roster UI | Not reachable through product writes (organizer is inserted atomically); empty state implemented and inspected |

Screenshots (local, not committed): `logs/us-013-u1-members.png`,
`logs/us-013-u2-denied.png`, `logs/us-013-u3-no-trip.png`,
`logs/us-013-error-state.png`.

## Not verified / remaining

- CI run on the pushed branch (P4 pipeline report).
- G2 by VL Elian Jiang; G3 after human merge and archive.
- The existing dev database was not migrated or modified; the verification
  backend used `gogo-us013.db`.
