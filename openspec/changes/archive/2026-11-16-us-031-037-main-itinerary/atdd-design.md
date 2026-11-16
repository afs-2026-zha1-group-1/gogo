# ATDD design — us-031-037-main-itinerary

- Change: `openspec/changes/us-031-037-main-itinerary/` (US-031 + US-037)
- Delta Spec: `specs/main-itinerary/spec.md` (7 requirements, 24 scenarios;
  G1 **Pass** 2026-11-15, IO Emily + SA Lumi, C1/C2 ratified)
- Fixtures authority: `requirement-workspace/acceptance-test-fixtures.md`
  §US-031-037 (M1–M14 / V1–V7 matrix, error contract, state setup, wire
  projections)
- Stage: P3, `/sdd:atdd-design`. Acceptance checks guide implementation; no
  production feature code and no unit-test suite plan is written here.

## 1. ATDD layers in scope

**API** (MockMvc against the real SQLite engine and Flyway migrations, the
pattern of `InvitationApiTest`): every endpoint contract, authorization branch
and stored-row assertion, including the cross-capability confirm → accept
closure (REQ-004 classified its J4 the same way: two endpoints, one service,
real DB). **E2E** (browser against the running backend + Vite dev server):
Screen 9 / Screen 10 surfaces and the four mandatory states, executed as
numbered manual steps at P4 (REQ-004 precedent; no browser automation in CI).
Pure-logic items are deferred to apply-time unit TDD.

| # | Scenario (delta / fixtures) | Layer | Recommended extras | Rationale |
|---|---|---|---|---|
| G1 | All ready → 201 draft v1 (M1) | API | consistency | single endpoint; projection fields + draft row + flag 0 asserted via JDBC in the same test |
| G2 | Pending member blocks (M2) | API | — | 409 `MEMBERS_NOT_READY` + `pendingMembers` names Daniel + no draft row |
| G3a | Null locations completed (M3) | API | — | completion observed through `GET /api/trips/{id}`; two endpoints, one service (J2 precedent) |
| G3b | Supplied locations preserved (M3) | API | — | same read shows the seeded values unchanged |
| G4/C5 | Non-organizer writes (M4/V5) | API | security (advisory) | 403 `NOT_ORGANIZER`; no draft/confirm state change |
| G5 | Regeneration → v2 supersedes v1 (M5) | API | consistency | 201 `version` 2; draft read no longer returns v1; status rows asserted |
| G6 | Generate after confirm (M14) | API | consistency | 409 `ALREADY_CONFIRMED`; no new draft; confirmed version unchanged |
| I1 | Member reads inputs summary (M6) | API | — | 200; field-set assertion incl. the six fixed `rules` identifiers |
| I2 | Inputs before any draft (M7) | API | — | 200 summary; no `NO_DRAFT` |
| I3 | Non-member denied inputs (M8) | API | security (advisory) | 403 `NOT_A_MEMBER` |
| — | Member reads current draft (M9) | API | — | 200; full plan projection, `stale` false |
| — | Revision bump surfaces staleness (M10) | API | consistency | test-only bump; 200 `stale` true; version + `inputRevisions` unchanged |
| — | No draft yet (M11) | API | — | 404 `NO_DRAFT` |
| — | Confirmed plan read (M12) | API | — | 200 `confirmed` true, `stale` false; same version row, not a new one |
| — | Confirmed stays frozen after bump (M13) | API | consistency | 200 `stale` false regardless of later revisions |
| C1 | Valid draft confirmed, joining closed (V1) | API | integration + consistency | full product path generate → confirm → issue → accept: 200 same projection, `status='confirmed'`, flag 1, then accept 403 `JOINING_CLOSED` (J4, now local) |
| C2 | Hard-budget overrun blocks (V2) | API | — | 422 `VALIDATION_FAILED` + `overruns` Alice 4000/1000; stays unconfirmed |
| C3 | Schedule errors block (V3) | API | — | 422 + `scheduleErrors` per type (`OUT_OF_ORDER`/`OVERLAP`/`MISSING_LEG`/`TRAVEL_EXCEEDS_GAP`/`OUT_OF_DAY`) with offending `seq`; travel-fit equality passes (C1 ruling) |
| C4 | Stale blocks until regeneration (V4) | API | consistency | 409 `STALE_DRAFT`; regenerate then confirm passes |
| V6 | Confirm before any generation | API | — | 404 `NO_DRAFT`; nothing changes |
| V7 | Re-confirm already-confirmed | API | consistency (idempotency) | 409 `ALREADY_CONFIRMED`; no state change |
| M-N/V-N | Missing/unknown identity; unknown trip; Eve on all four endpoints | API | security (advisory) | 401 `USER_REQUIRED` / 404 `TRIP_NOT_FOUND` / 403 `NOT_A_MEMBER` |
| S9 | Screen 9 (`#/trips/<id>/main-plan/inputs`): inputs/rules summary; member-readable; write actions organizer-only | E2E | — | only the rendered page proves the display contract (deep-dive ⑫) |
| S10 | Screen 10 (`#/trips/<id>/main-plan`): draft timeline → blocked confirm with errors → confirmed state + joining-closed notice | E2E | — | user-visible review/confirm path across the two surfaces |
| S9/S10-states | Loading skeleton, no-draft empty CTA, load-failure text, permission/read-only UI | E2E | — | four mandatory states even if unpictured (intent ruling) |
| UT-1 | Staleness computation; schedule validator (five rules incl. travel-fit equality); overrun cents math; budget payload mapping | Defer UT | — | pure logic; apply-time unit TDD |
| UT-2 | Location completion selection (preferences first, random fallback, preserve supplied); inputs aggregation (intersection / dedup union); version status transitions | Defer UT | — | pure logic; apply-time unit TDD |

Recommended extras are advisory (待确认 at design review), not gates. No ratio
policing: the E2E set stays small because every contractual behavior is
observable at the API layer.

## 2. What is written before production code

1. **V5 migration + seeds first** (schema prerequisite, not feature code):
   `main_plan_draft`, `main_plan_stop`, `trip_member.ready` /
   `preference_revision`, readiness + rev-1 preference kind seeds per fixtures.
   `member_preference` is REQ-019's V4 table (not on this branch yet): V5
   carries a `CREATE TABLE IF NOT EXISTS` stand-in matching the V4 shape
   exactly (`id`, `trip_id`, `user_id`, `kind`, `payload`, `updated_at`,
   UNIQUE(`trip_id`,`user_id`,`kind`) — verified against
   `origin/feat/travel_preference` req-019 proposal) so the fixture-self-contained
   ruling holds before REQ-019 merges. Product code only **reads** the table;
   the stand-in and seeds are migration/test artifacts. Decision record +
   merge-time shape check belong to design.md (F1 alignment, SA).
2. `MainPlanApiTest` authored **red** next, covering M1–M14, V1–V7, the
   identity/trip negatives and the API halves of §5 reverses, using the fixture
   users/trip and reading the trip id from the seed lookup (REQ-004 pattern).
   It must fail against the tree (no main-plan routes → 404).
3. The E2E check list (S9, S10, states) written into
   `docs/feedback/e2e-us-031-037.md` as numbered browser steps with expected
   observations, executed at P4 against the running apps.
4. No controller/service/provider code and no frontend change until the red
   API checks exist. Red-green execution itself is owned by `/sdd:atdd-apply`.

## 3. Local vs CI gate expectations

- Local gate: `cd backend && mvn test` (same engine and migrations as
  production) and `cd frontend && npm ci && npm run build`; then the P4
  local-verify report with runtime evidence per scenario (API matrix + browser
  steps).
- CI gate: the existing two-job workflow **unchanged** (backend `mvn -B test`,
  Java 21; frontend `npm ci && npm run build`, Node 24). Browser E2E is not run
  in CI — no browser or service orchestration, REQ-001/004 precedent.
- G2 requires a fresh CI run read with `gh` (v2.104.0 installed and logged in
  on this machine; full path needed in old shells), never an inherited green.
- No second CI semantics is invented; the harness placeholder scripts stay
  untouched.

## 4. Data / fixtures strategy

- Shared authority: `requirement-workspace/acceptance-test-fixtures.md`
  §US-031-037. Users 1–5 and the fixture trip come from the merged V2/V3 seed;
  V5 adds readiness + preference kind rows for the four members (later joiners
  default to not ready).
- Each test class runs against its own isolated SQLite database
  (`jdbc:sqlite:file:main-plan-test?mode=memory&cache=shared`,
  `InvitationApiTest` pattern) migrated by Flyway V1–V5; `@BeforeEach` resets
  draft/stop rows, readiness/revisions, test budget rows, locations and
  `main_plan_confirmed`. No shared mutable state between classes.
- Test-only JDBC flips, exactly per the fixtures "State setup" table: Daniel
  `ready = 0`; Alice `budget` row payload
  `{"amount":4000,"currency":"SGD","limitType":"hard"}`; Ben revision bump to 2;
  null start/end locations (restored afterwards); draft-stop mutations for the
  V3 schedule cases (overlap, missing leg, 45-minute leg into a 30-minute gap,
  out-of-day stop). No product write path for preferences exists in this REQ.
- The fake provider **is** the MVP production implementation (ruled): the four
  fixture stops with times 09:00–09:30 / 10:00–10:30 / 11:00–11:15 /
  11:30–12:00, legs 30/30/15, cost 5000 cents. API tests run against the real
  fake provider — no test double, deterministic output.
- E2E uses the dev database seeded by V2/V5; browser cases needing
  pending/overrun/stale/null-location states use the same documented test-only
  flips before opening the page.
- Draft ids and timestamps are never hard-coded: tests read them from
  responses. Randomized completion outputs are not fixed (inherited ruling).

## 5. Non-goals

This skill writes no business feature code, no detailed UT suite plan, no
Playwright/POM/Excel generators, and no new CI product.

### Non-goal reverse verification

| Non-goal (source) | Reverse check | Expected | Layer |
|---|---|---|---|
| Preference-entry UI / write path (later REQ; proposal) | `POST`/`PUT`/`PATCH` on preference paths; `member_preference` row snapshot before/after generate + confirm | no route accepts it (404/405); rows byte-identical (read-only here) | API + static |
| Split flows (later REQs) | route inventory for split endpoints | none exists | API + static |
| Real provider integration (OQ-2 ruling) | inspect the `MainPlanProvider` implementation | only the fake provider; no external HTTP client | static |
| Session auth (OQ-5 ruling) | any seeded `X-User-Id` without credentials | accepted as given; scaffold stand-in, not a security control | API |
| Notifications (deep-dive ⑫) | route inventory + Screen 9/10 surfaces | no notification endpoint or UI surface | API + static |
| Soft-budget enforcement (OQ-10) | test-only `budget` row with `limitType` soft; inspect inputs/422 shapes | does not block confirmation; no soft-budget field in any projection | API |
| Invitation behavior changes (proposal "Unchanged") | re-run `InvitationApiTest` untouched | all green; only the flag is set by this change | API |
| Replanning after confirmation (R2 deferral, G6) | M14 generate + V7 re-confirm after a confirmed version | 409 `ALREADY_CONFIRMED`; no new draft, no state change | API |
| Auto-confirm at generation (US-031 AC1) | M1 then read trip flag + draft status | `confirmed` false, flag 0, status `current` | API |
| No ORM (REQ-001 non-goal, carried) | inspect `backend/pom.xml` + the new package | `JdbcTemplate` only | static |

## 6. NFR tests (optional)

**Not in scope — user explicitly declined 2026-11-15** (asked at P3; selected
"不纳入，记推迟"). No AC requires performance/SLA/observability behavior; the
deep-dive NFR layer records retention/volume/SLA as not decidable for this
slice. Recorded as deferred, owner Dev/SA to raise if needed. No NFR test
section is designed here.