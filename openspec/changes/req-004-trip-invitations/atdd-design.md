# ATDD design — req-004-trip-invitations

- Change: `openspec/changes/req-004-trip-invitations/` (REQ-004, US-008/US-010/US-012)
- Delta Specs: `specs/invitations/spec.md`, `specs/trips/spec.md` (G1 draft pending)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` §REQ-004
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no
  production feature code and no unit-test suite plan is written here.

## 1. ATDD layers in scope

**API** (MockMvc against the real SQLite engine and Flyway migrations, the
pattern of `GreetingApiTest`): every endpoint contract, authorization branch and
stored-row assertion. **E2E** (browser against the running backend + Vite dev
server): the invitation panel, the join page states and the QR equality case.
Pure-logic items are deferred to apply-time unit TDD.

| # | Scenario | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| I1 | Organizer obtains invitation; one row | API | — | single endpoint; row count read from the real DB in the same test |
| I2 | Re-issue returns same token; one row | API | consistency (idempotency) | token equality observable in two responses |
| I3 | Non-organizer denied; nothing created | API | security (advisory) | 403 + `NOT_ORGANIZER` + unchanged row count |
| I4 | Issue without/unknown identity | API | — | 401 + `USER_REQUIRED` |
| I5 | Issue for unknown trip | API | — | 404 + `TRIP_NOT_FOUND` |
| I6 | QR decodes to the copied absolute URL; same joining rules | E2E | — | only the rendered page proves the QR encodes the real URL |
| J1 | Preview public basics; no private fields | API | security/privacy (advisory) | field-set assertion on the response shape |
| J2 | Eve joins; member read flips 403→200 | API | integration | two endpoints, one service, real DB |
| J3 | Double acceptance; exactly one membership | API | consistency (idempotency) | row-count assertion |
| J4 | Confirmed main plan rejects acceptance; list unchanged | API | — | test-only state flip, then 403 + `JOINING_CLOSED` |
| J5 | Accept without/unknown identity | API | — | 401 + `USER_REQUIRED` |
| J6 | Existing member accepts with joining open and closed | API | consistency (idempotency) | 200 joined, `alreadyMember` true, membership count unchanged in both states |
| J7 | Missing/unknown identity combined with an invalid token | API | authorization precedence | 401 + `USER_REQUIRED`, no membership change; a known identity with the same invalid token receives 404 |
| U1 | Invalid preview exposes nothing | API | privacy (advisory) | 404 + `INVITATION_NOT_FOUND` + absence assertion |
| U2 | Invalid accept creates nothing | API | privacy (advisory) | 404 + no membership row |
| U3 | Join page with invalid token shows generic unusable surface | E2E | — | user-visible privacy behavior |
| S1 | Panel shows link, copy action copies it, QR visible | E2E | — | screen 04 surfaces |
| S2 | Join page preview → accept → joined; closed state; loading/error states | E2E | — | screens 05/06 plus mandatory states |
| R-1 | No main-plan confirmation endpoint | API + static | — | reverse case for the US-037 non-goal |
| R-2 | No revocation/expiry endpoint or field | API + static | — | reverse case for the non-MVP controls |
| UT-1 | Token generator format/entropy; join-path builder; preview field whitelist | Defer UT | — | pure logic; apply-time unit TDD |

## 2. What is written before production code

1. `InvitationApiTest` authored red first, covering I1–I5, J1–J7, U1–U2 and the
   API halves of R-1/R-2, using the fixture users/trip and reading the token from
   the I1 response. It must fail against the current tree (no invitation code).
2. The E2E check list (I6, U3, S1, S2) written as numbered browser steps with
   expected observations, to be executed at P4 against the running apps; the QR
   decode step uses a local decoder (see design.md D7), never an external upload.
3. No production feature code, no migration and no frontend change until the red
   API checks exist.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` (same engine and migrations as production)
  and `cd frontend && npm run build`; then the P4 local-verify report with runtime
  evidence per scenario.
- CI gate: the existing two-job workflow on a feature-branch pull request; G2
  requires a fresh CI run read with `gh` (now available at
  `C:\Users\SUNJO\AppData\Local\Programs\gh\gh.exe`), never an inherited green.
- No second CI semantics is invented; the harness placeholders stay untouched.

## 4. Data / fixtures strategy

- Shared authority: `requirement-workspace/acceptance-test-fixtures.md` §REQ-004.
  Users 1–5 and the fixture trip come from REQ-003's `V2` seed; no new seed rows.
- `V3` adds `trip_invitation` and `trip.main_plan_confirmed` default 0; a fresh
  database therefore starts joinable.
- Tokens are never hard-coded: tests read them from the I1 response. The invalid
  token input is any never-issued string (`no-such-invitation`).
- J4 sets `main_plan_confirmed = 1` by a direct test-only database update,
  documented in the fixtures; no product path sets it (R-1).
- Each test class runs against its own temporary SQLite file migrated by Flyway,
  following the existing test pattern; no shared mutable state between classes.
- E2E uses the dev database seeded by `V2`; the J4 browser case uses the same
  documented test-only flip before opening the join page.

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| No main-plan confirmation flow (US-037 backlog; REQ-004 OQ-1) | `POST`/`PUT`/`PATCH` with a confirmation payload to every trip and invitation path; route inventory | no route accepts it (404/405); state unchanged | API + static |
| No revocation / expiry controls (US-008 design scope) | `DELETE /api/invitations/{token}`, `POST .../revoke`; inspect preview/issue shapes | 404/405; no expiry or revocation field | API + static |
| No reminder notification workflow (US-012 design scope) | inspect join-page unusable surface and backend routes | no notification endpoint; the surface offers only back-home | E2E + static |
| No private data before acceptance (US-010) | inspect J1 response keys and U1/U3 surfaces | only the five preview fields; invalid token shows none | API + E2E |
| No real authentication (REQ-003 scaffold) | issue/accept with any seeded id without credentials | accepted as given; documented as scaffold, not a security control | API |
| No ORM (REQ-001 non-goal) | inspect `backend/pom.xml` and the new package | `JdbcTemplate` only | static |
| No second membership per identity (US-010 AC2) | J3 row count; primary key inspection | exactly one row; PK (trip_id, user_id) prevents duplicates | API + static |

## 6. NFR tests (optional)

**Not in scope.** No intent source requests observability, performance or
resilience testing, and the deltas contain no NFR requirement. Explicit user
confirmation was not obtained — the user asked for continuous P0–P3 execution.
Recorded as deferred, owner Dev/SA to raise if needed. No NFR test section is
designed here.