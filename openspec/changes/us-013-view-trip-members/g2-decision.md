# G2 decision — us-013-view-trip-members

- Change id: `us-013-view-trip-members`
- Gate: G2 (Verify)
- Status: **RECORDED — Conditional** (2026-11-16)
- Decision owner: VL **Leo** (human sign-off). The agent recorded the named VL's
  statement; it did not approve the gate itself.
- Conditional is **not Verified**: merge and P5 archive stay blocked until every
  condition in §Conditions is closed and G2 is re-recorded (Pass) or Fail is
  recorded.

## Inputs

| Input | Path / value |
|---|---|
| G1 record | `g1-decision.md` — Pass by IO Emily + SA Johnson (2026-11-16); G1 signatures are **not** inherited by G2 |
| Delta specs | `specs/trips/spec.md` (ADDED, 8 scenarios) + `specs/app-shell/spec.md` (MODIFIED, 3 scenarios); `openspec validate` valid |
| Local verify | `docs/ai4se-plugins/20261116-165153-local-verify-report.md` — merged-head re-run: Build Pass, Static 5/5 Pass, Code review Pass, Evidence Partial (human gates open); Overall **Partial**, no Waiver. The earlier `20261116-144729` report is superseded. |
| Verification evidence | `docs/feedback/verification-us-013.md` — `mvn test` 101/101 (new 11/11), `npm run build` green, API matrix M1–M10, browser U1–U3 + loading/error/retry |
| E2E checklist | `docs/feedback/e2e-us-013.md` |
| CI | **merged head** run `43834492224`, head `6061579`, event `push`, **both jobs success**; `ci-report.md` and `docs/ai4se-plugins/20261116-165200-pipeline-report.md` |
| Tasks | `tasks.md` — implementation and CI tasks 0–6.2 checked; 7.1/7.2 land in the tree but boxes are unchecked; 7.3 and 8.x open |
| Story | GitHub issue #9 |
| VL review (2026-11-16) | Independent check against `origin/main` `b73a921`: the branch baseline is `729a889`, **28 commits behind** main. `git merge-tree origin/main HEAD` reports content conflicts in `TripController.java`, `TripRepository.java`, `acceptance-test-fixtures.md`, `deep-dive.md`, `handoff.md`, `impact-brief.md` and `registry.md`. Main now ships `V4__splits.sql`, `MemberGuard` (`MEMBER_REQUIRED`) and the real `#/split` entry (`10736d9`). |

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | `mvn -B test` 101/101; `npm run build` green |
| Static scan | Pass | whitelist 5/5 exit 0; no ORM/H2/internal registry/hard-coded greeting |
| Code review | Pass | endpoint reuses identity/access; read-only join; projection excludes personal fields; no new dependency |
| Evidence V1–V8 | V1 Partial (gate tasks open); V2–V8 Pass | local-verify report |
| Merge readiness | Fail | 7 conflicting files vs `origin/main`; branch 28 commits behind; see VL review row |
| E1 machine | Pass | merged-head CI run `43834492224`, both jobs success on `6061579` |
| E2 AI | Pass | local-verify + verification documents |
| E3 human | Conditional | Recorded by VL Leo in this sheet (2026-11-16); not Verified |

## Residual concerns for the VL

1. Empty-roster and missing-trip **UI** states are not reachable from
   `#/members` (the route carries no trip id; the organizer is inserted
   atomically). Both states are implemented and inspected; API M6 covers the
   404 contract.
2. CI trigger was broadened to all branch pushes by user instruction
   2026-11-16. Job contents are unchanged; the branch produces its own run
   without a main PR (R37).
3. The frontend maps a bare 404 to the missing-trip state without checking
   `code`; the observed Vite proxy outage returned 502 and correctly rendered
   the error state. Optional hardening, not a blocker.
4. Stack plan AntD/TanStack is not adopted; the merged frontend uses token CSS
   + plain fetch (R35, separate migration).
5. No durable last-opened-trip memory; the no-trip guidance state is
   contractual (R33).
6. The `app-shell` delta keeps the 分队 tab as a not-implemented placeholder,
   but main's `#/split` already renders the real split entry (`10736d9`); the
   Living Spec on main is drift. Archiving this delta as written would codify a
   false statement.
7. `MEMBER_REQUIRED` (splits, already on main) vs `USER_REQUIRED` (trips, this
   change) is now a live main-branch divergence; proposal risk R32 still
   describes the split branch as unmerged.

## Sign-off

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| VL | Leo | **Conditional** | 2026-11-16 | C1–C5 below, owners Dev (Johnson) / SA (Johnson) | This sheet + `docs/ai4se-plugins/20261116-165153-local-verify-report.md` + `docs/ai4se-plugins/20261116-165200-pipeline-report.md` + VL merge check 2026-11-16 |

## Conditions (must be closed before merge / archive)

| # | Condition | Owner | Deadline | Closure evidence |
|---|---|---|---|---|
| C1 | Merge `origin/main` into the branch and resolve the `TripController` / `TripRepository` conflicts by keeping both main's `main-plan:confirm` + `mainPlanConfirmed` and this change's `/members` + `findMembers`; resolve the 5 requirement-workspace conflicts without dropping main's rows. Do not overwrite main's real `#/split` entry. | Dev (Johnson) | Before G2 re-record | Merged head + clean `git merge-tree` |
| C2 | Re-run the full gate on the merged head: `mvn -B test` (now includes V4 + split suites), `npm run build`, browser regression for 成员 and 分队; refresh the local-verify report and CI evidence for that exact head. | Dev (Johnson) | Before G2 re-record | Fresh local-verify + CI run on the merged head |
| C3 | Fix the `app-shell` delta: the 分队 clause must match main's shipped `#/split` entry (`10736d9`) instead of "not implemented"; reconcile the Purpose prose and the stale "分队 stays a placeholder" statements in `US-013.md` and the proposal. | SA (Johnson) | Before G2 re-record | Updated delta + proposal/US-013 |
| C4 | Decide and record the `USER_REQUIRED` vs `MEMBER_REQUIRED` divergence (align, or accept with a named follow-up); update proposal risk R32 and the registry/handoff rows. | SA (Johnson) | Before G2 re-record | Decision note + follow-up row |
| C5 | Repair evidence integrity: check tasks 7.1/7.2 (already done in the branch) and correct the "7.x open by design" wording in local-verify V1 and this sheet; align M8/M9 wording with the direct-insert test (or add the accept→roster case); add blank/non-numeric `X-User-Id` and PUT/DELETE cases; state the accepted reason for the unreachable empty/missing UI states; add `.openspec.yaml` or cite a reproducible `openspec validate`; and decide the CI trigger change (revert and use the existing `pull_request` CI, or record it as a separate approved infra change). | Dev (Johnson) | Before G2 re-record | Updated tasks/evidence/tests |

## Decision

- Decision: **Conditional** — the `trips` implementation appears to meet its
  delta, but the branch is not mergeable against current main and the
  `app-shell` delta contradicts shipped main behavior. Conditional is **not
  Verified**; merge and P5 archive must not start.
- Defect grades: CRITICAL 2 (stale baseline + merge conflicts; 分队 delta
  conflicts with main), WARNING 4 (identity-code divergence, task/evidence
  mismatch, missing UI-state spec, E2E reachability), SUGGESTION 3 (extra
  negative tests, 404 `code` check, `.openspec.yaml`).
- Waivers: none; no condition is waived.
- Approvers: **VL = Leo** (recorded 2026-11-16).
- Re-record rule: after C1–C5 close, the VL records the next G2 decision on the
  merged head — Pass if verified, Fail if a condition cannot be met.

## Recording rules

1. G2 requires a **named VL** decision. G1's IO/SA signatures do not carry over.
2. A Conditional decision is invalid without remediation items and owners.
3. Conditional requires every condition to carry an owner and a closure
   milestone; an incomplete list invalidates the record.
4. This record is **not Verified**. G2 closes only when the VL records Pass
   after the conditions close; merge and archive must not start before that.

## Condition remediation evidence (2026-11-16, merged head)

Status remains **Conditional**; this section records closure evidence only. The
VL re-records G2 (Pass/Fail) on the merged head; merge and archive stay blocked
until then.

| # | Evidence |
|---|---|
| C1 | Merged `group1/main` `135d3df` into the branch. `TripController` keeps US-066 `@AuthenticationPrincipal` + `main-plan:confirm` and adds `GET /{id}/members`; `TripRepository` keeps `findById`/`isMember`/`confirmMainPlan` and adds `findMembers`; `App.tsx` keeps the login gate and shipped `#/split` entry and renders `Members`; README and five requirement-workspace conflicts resolved without dropping main rows |
| C2 | `mvn -B test` **198/198** (new `TripMembersApiTest` 12/12, 6 migrations); `npm run build` green; browser on the merged head: Ben roster 4 rows + Alice organizer only, full reload on `#/members` shows no-trip guidance, Eve login shows denied with no names, `#/split` with a trip shows the shipped entry (button) and no placeholder; fresh CI run `43834492224` on `6061579` both jobs success |
| C3 | `specs/app-shell/spec.md` MODIFIED requirement now says 分队 = shipped split entry, 成员 = roster; Purpose/proposal/US-013 statements updated; no "分队 stays a placeholder" wording remains |
| C4 | Decision recorded: trips/members use US-066 session auth + `USER_REQUIRED`; splits are session-based but return `MEMBER_REQUIRED` for anonymous callers. Accepted divergence; follow-up **F2**; R32/registry/handoff updated |
| C5 | Tasks 7.1/7.2 checked; V1 wording corrected (evidence open only for G2/archive/gates); M8/M9 renamed to direct insert; retired-header 401 (blank/non-numeric/seeded) and POST/PUT/DELETE 405 tests added; unreachable empty/missing UI states documented; `openspec validate` cited; all-branch CI trigger recorded as user-approved infra R37 |

Only the VL's re-record remains open. Status stays **Conditional** until the VL
records Pass/Fail on the merged head; merge and archive must not start before
that.
