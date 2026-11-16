# Change summary — us-013-view-trip-members

## Intent

Give every trip member one honest roster: who has joined and which member is the
organizer. The page deliberately excludes readiness, preference summaries,
budgets and generation actions (issue #9 design scope); it is read-only and
available only to authenticated members.

## What shipped

- **Living Spec**: `trips` gained **1 ADDED requirement / 8 scenarios**
  (`GET /api/trips/{id}/members`, session principal, roster projection, denial
  without identities, no personal planning fields). `app-shell` **removed**
  `Placeholder tabs` and **added** `Tab content` (分队 = shipped split entry,
  成员 = roster); Purpose prose reconciled.
- **Backend**: `GET /api/trips/{id}/members` in the existing `trip` package;
  `@AuthenticationPrincipal` (US-066), read-only join over
  `trip_member`/`app_user`/`trip`, organizer derived, ascending `userId`;
  401 `USER_REQUIRED`, 403 `NOT_A_MEMBER`, 404 `TRIP_NOT_FOUND`.
- **Frontend**: Screen 7 under the shell (`Members.tsx`), member count, avatar
  initials, organizer badge, loading/empty/error/denied/missing/no-trip states;
  no readiness/preference/generate content.
- **Integration**: merged `group1/main` `135d3df` (US-066 auth, V4 splits, V6
  credentials), then merged the change into latest `main` as `364a52d`.
- **KB**: `tech-stack-plan.md` §15 landed reconciliation + `_LOG.md` row.

## Verify highlights

- Backend `mvn -B test` **198/198** on the branch merged head and **226/226** on
  the final main merge (new `TripMembersApiTest` 12/12; split/login suites
  included).
- `npm ci && npm run build` green on both heads.
- Browser on the merged branch: Ben roster 4 rows with Alice as the only
  organizer; full reload on `#/members` shows no-trip guidance; Eve login shows
  denied with no names; `#/split` shows the shipped entry.
- CI: branch merged head `43834492224` (6061579) and final main `43841187214`
  (364a52d), both jobs success.
- Gate: **G1 Pass** (IO Emily + SA Johnson), **G2 Pass** (VL Leo, re-recorded on
  merged head 47a8e3f; C1–C5 closed). **G3 pending SA Johnson.**

## Residual risks

- **F2**: trips/members return `USER_REQUIRED` while split endpoints return
  `MEMBER_REQUIRED` for anonymous callers; unify later.
- **OQ-2**: no durable last-opened-trip memory; a full reload on `#/members`
  shows the no-trip guidance state.
- Empty-roster and missing-trip UI states are implemented but not reachable from
  `#/members` (route carries no trip id; organizer is inserted atomically).
- Frontend maps a bare 404 to the missing-trip state without checking `code`;
  optional hardening.
- Docs-only commits after the verified code head do not change the tested code.

## Links

- Living Specs: `openspec/specs/trips/spec.md`, `openspec/specs/app-shell/spec.md`
- Change artifacts: this folder (`proposal.md`, `design.md`, `atdd-design.md`,
  `tasks.md`, `g1-decision.md`, `g2-decision.md`, `ci-report.md`)
- Evidence: `docs/ai4se-plugins/20261116-165153-local-verify-report.md`,
  `docs/ai4se-plugins/20261116-165200-pipeline-report.md`,
  `docs/feedback/verification-us-013.md`, `docs/feedback/e2e-us-013.md`
- Merge: `main` `364a52d`, CI `43841187214`
- KB: `docs/knowledge/architecture/tech-stack-plan.md` §15, `docs/knowledge/_LOG.md`
