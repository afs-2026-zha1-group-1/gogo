# Design

## Context

US-013 adds a member-only roster read to the existing `trips` capability and
places Screen 7 inside the merged app shell. The baseline (`group1/main`
`729a889`) already contains `app_user`, `trip`, `trip_member` (`V2`), the
`X-User-Id` scaffold, the `trips` error vocabulary, the `app-shell` dock and
the 成员 placeholder. G1 is **Pass** (2026-11-16, IO Emily + SA Johnson); the
delta fixes 2 requirements / 8 + 3 scenarios and the fixtures fix the wire
contract.

Links: [ATDD design](atdd-design.md) · [trips delta](specs/trips/spec.md) ·
[app-shell delta](specs/app-shell/spec.md) · [tasks](tasks.md) ·
[fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
[G1 record](g1-decision.md).

## Goals / Non-Goals

**Goals:** one member-gated roster endpoint with a deterministic projection;
Screen 7 with organizer identification and the mandatory states; the 成员 tab
renders the real list instead of a placeholder; no migration and no write path.

**Non-Goals:** readiness/preferences/budgets/generation; invite/remove/role
changes; authentication; list-all; durable trip selection across reloads; new
frontend dependencies or CI jobs. Each has a reverse check in the
[ATDD design](atdd-design.md).

## Decisions

**D1 — Backend placement: extend the existing `trip` package.**
`TripController`, `TripRepository`, `TripApiException` and `TripErrorAdvice`
already own the `/api/trips` surface and the identity/access contract. Adding a
method there keeps one error advice and one caller helper.
*Alternative rejected:* a new `members` package/controller would duplicate the
identity and error plumbing for one read.

**D2 — Response contract: `{tripId, members:[{userId, displayName, organizer}]}`,
ascending `userId`.**
Records: `TripMemberListResponse(long tripId, List<TripMember> members)` and
`TripMember(long userId, String displayName, boolean organizer)`.
*Alternatives rejected:* a bare array (loses the trip context and is harder to
extend) and a separate `organizerId` field (redundant with the per-row flag).

**D3 — Access control: identity → trip existence → membership.**
Reuse `caller()` (401 `USER_REQUIRED`), `findById` (404 `TRIP_NOT_FOUND`) and
`isMember` (403 `NOT_A_MEMBER`), matching `TripController.read`. The denial body
is the existing `{code, message}` with a generic message, so no member identity
leaks. *Alternative rejected:* checking membership before trip existence, which
would turn an unknown trip into a 403 and break the `trips` precedent.

**D4 — Read-only query, no migration.**
`TripRepository.findMembers(tripId)` joins `trip_member` to `app_user` and
`trip`, deriving `organizer` with
`CASE WHEN u.id = t.organizer_id THEN 1 ELSE 0 END`, ordered by `u.id`.
`trip_member(trip_id, user_id)` is the composite primary key, so each member is
unique by construction. No write, no new column, no seed change.

```sql
SELECT u.id, u.display_name,
       CASE WHEN u.id = t.organizer_id THEN 1 ELSE 0 END AS organizer
FROM trip_member tm
JOIN app_user u ON u.id = tm.user_id
JOIN trip t ON t.id = tm.trip_id
WHERE tm.trip_id = ?
ORDER BY u.id
```

**D5 — Frontend route and trip selection: keep `#/members`, use the app-level
last-opened trip.**
The app-shell contract fixes `#/members` as the 成员 tab target. The page
receives the last trip id set when the details route opened; with no trip it
shows a guidance state linking back to 行程. No durable storage is added in
this change (OQ-2 deferred). *Alternative rejected:* `/trips/<id>/members`,
which changes the shell contract and the dock target.

**D6 — Screen 7 scope and states.**
The page renders a member count, one row per member with an avatar initial,
`displayName` and an 组织者 pill on the organizer row. It renders loading,
empty, error, permission-denied and missing-trip states, plus the no-trip
guidance state. It does **not** render the readiness ring, readiness pills,
preference summaries, budgets or the generate action; a hint says the page shows
members only. *Alternative rejected:* copying Screen 7 wholesale, which would
add US-026/US-027/US-031 behavior without an AC.

**D7 — app-shell integration: replace only the 成员 placeholder.**
`App.tsx` renders `Members` for `route.page === 'members'` and keeps
`Placeholder` for `#/split`. The dock order, active-tab mapping and identity
scaffold are untouched. The MODIFIED `Placeholder tabs` requirement records the
supersession; the Purpose prose is reconciled at P5.

**D8 — Testing: MockMvc API tests plus a manual browser checklist.**
`TripMembersApiTest` uses its own in-memory SQLite database, the merged
migrations and the V2 seed. The browser checklist lives in
`docs/feedback/e2e-us-013.md`; no Playwright/POM generator and no new frontend
test framework is introduced (`package.json` has none today).
*Alternative rejected:* adding Vitest/RTL for one screen, which expands scope
and dependencies.

**D9 — Follow the merged frontend baseline, not the planned AntD/TanStack
stack.**
The stack plan names Ant Design 5 + TanStack Query v5, but the merged frontend
uses token CSS and a plain `api()` helper; US-031 follows the same pattern. This
read screen does too. Adopting the planned stack is US-065/US-066, not this
story. Recorded as a known deviation in the proposal (R35).

**D10 — Error bodies stay `{code, message}`; only `code` is contractual.**
The generic message is "Caller is not a member of this trip" (or the existing
trip-not-found text). No test asserts message wording; S3 asserts the absence of
identity values.

## Risks

- Screen 7 scope creep (R30) — guarded by S10/U1 and the hint copy.
- Placeholder contract (R31) — MODIFIED requirement; P5 purpose reconciliation.
- Split-branch `MEMBER_REQUIRED` divergence (R32) — follow merged
  `USER_REQUIRED`, flag at split merge.
- No durable trip selection (R33) — no-trip guidance state is contractual.
- Stack deviation (R35) — recorded, separate migration.
- Denial-body leakage (R36) — generic message + S3 absence assertion.
