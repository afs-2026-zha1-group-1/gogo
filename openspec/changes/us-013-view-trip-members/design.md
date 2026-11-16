# Design

## Context

US-013 adds a member-only roster read to the existing `trips` capability and
places Screen 7 inside the merged app shell. The baseline is the merged
`group1/main` (`135d3df`): `app_user`, `trip`, `trip_member` (`V2`), US-066
account/session auth (`AccountPrincipal`, `V6` credentials), the `trips` error
vocabulary, `V4` splits, the shipped `#/split` entry and the 成员 placeholder.
G1 is **Pass** (2026-11-16, IO Emily + SA Johnson); the delta was amended under
G2 conditions C1/C4 for the merged auth/session baseline and the VL re-records
G2.

Links: [ATDD design](atdd-design.md) · [trips delta](specs/trips/spec.md) ·
[app-shell delta](specs/app-shell/spec.md) · [tasks](tasks.md) ·
[fixtures](../../../requirement-workspace/acceptance-test-fixtures.md) ·
[G1 record](g1-decision.md).

## Goals / Non-Goals

**Goals:** one authenticated member roster endpoint with a deterministic
projection; Screen 7 with organizer identification and the mandatory states; the
成员 tab renders the real list; no migration and no write path.

**Non-Goals:** readiness/preferences/budgets/generation; invite/remove/role
changes; changing the US-066 auth flow; list-all; durable trip selection across
reloads; new frontend dependencies or CI jobs. Each has a reverse check in the
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

**D3 — Access control: authentication → trip existence → membership.**
Use the `@AuthenticationPrincipal AccountPrincipal` supplied by US-066;
`SecurityConfig` returns 401 `USER_REQUIRED` for an anonymous request, then
`findById` returns 404 `TRIP_NOT_FOUND` and `isMember` returns 403
`NOT_A_MEMBER`, matching `TripController.read`. The denial body is the existing
`{code, message}` with a generic message, so no member identity leaks.
*Alternative rejected:* checking membership before trip existence, which would
turn an unknown trip into a 403 and break the `trips` precedent.

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
last-opened trip and the signed-in session.**
The app-shell contract fixes `#/members` as the 成员 tab target. The page
receives the last trip id set when the details route opened; the shared
`api()` helper sends the session cookies and CSRF token, so no `userId` prop is
passed. With no trip it shows a guidance state linking back to 行程. No durable
storage is added (OQ-2 deferred). *Alternative rejected:* `/trips/<id>/members`,
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
`App.tsx` renders `Members` for `route.page === 'members'`; `#/split` keeps the
shipped split entry shipped by main. The dock order, active-tab mapping and
signed-in account bar are untouched. The obsolete `Placeholder tabs`
requirement is REMOVED and replaced by the ADDED `Tab content` requirement
(a MODIFIED block cannot drop the obsolete placeholder scenarios); the Purpose
prose is reconciled at P5.

**D8 — Testing: MockMvc API tests plus a manual browser checklist.**
`TripMembersApiTest` uses its own in-memory SQLite database, the merged
migrations V1–V6 and the V2/V6 seeds; identity is driven with `TestAuth.asUser`
(the merged test convention), not `X-User-Id`. The browser checklist lives in
`docs/feedback/e2e-us-013.md`; no Playwright/POM generator and no new frontend
test framework is introduced.
*Alternative rejected:* adding Vitest/RTL for one screen, which expands scope
and dependencies.

**D9 — Follow the merged frontend baseline.**
The merged frontend combines its shell/token CSS with shared UI primitives and
the session-aware `api()` helper. This read screen uses those conventions and
adds no dependency; the design-system migration remains a separate track.
Recorded as R35 in the proposal.

**D10 — Error bodies stay `{code, message}`; only `code` is contractual.**
The generic message is "Caller is not a member of this trip" (or the existing
trip-not-found text). No test asserts message wording; S3 asserts the absence of
identity values.

## Risks

- Screen 7 scope creep (R30) — guarded by S10/U1 and the hint copy.
- Placeholder contract (R31/C3) — the REMOVED/ADDED requirement covers both
  real tabs; the Purpose prose is reconciled at P5.
- `USER_REQUIRED` vs `MEMBER_REQUIRED` (R32/C4) — accepted divergence, follow-up
  F2; no split code change.
- No durable trip selection (R33) — no-trip guidance state is contractual.
- Design-system migration (R35) — separate track.
- Denial-body leakage (R36) — generic message + S3 absence assertion.
- Auth arrived after G1 (R38) — delta amended under G2 C1/C4; VL re-records G2.
