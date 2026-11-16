# G2 decision — us-013-view-trip-members

- Change id: `us-013-view-trip-members`
- Gate: G2 (Verify)
- Status: **RECORDED — Pass** (2026-11-16, re-recorded on the merged head)
- Decision owner: VL **Leo**. The agent recorded the named VL's statement; it
  did not approve the gate itself.
- This Pass supersedes the **Conditional** record at commit `a5e0c51`; the
  Conditional decision and its C1–C5 remediation are retained in
  §Condition closure evidence.
- G2 is closed: merge (8.2) may start, followed by P5 `/sdd:living-merge` and
  G3.

## Inputs

| Input | Path / value |
|---|---|
| G1 record | `g1-decision.md` — Pass by IO Emily + SA Johnson (2026-11-16); the delta was amended under G2 C1/C4 for US-066 auth and the shipped split entry (R38) |
| Delta specs | `specs/trips/spec.md` (ADDED, 8 scenarios) + `specs/app-shell/spec.md` (REMOVED "Placeholder tabs" and ADDED "Tab content", 3 scenarios); `openspec validate us-013-view-trip-members` **valid** and `--strict` **valid** (CLI 1.16.1, 2026-11-16; no warnings) |
| Local verify | `docs/ai4se-plugins/20261116-165153-local-verify-report.md` — merged-head re-run: Build Pass, Static 5/5 Pass, Code review Pass, Evidence Partial (human gates open); Overall **Partial**, no Waiver |
| Verification evidence | `docs/feedback/verification-us-013.md` — merged-head `mvn test` 198/198 (new 12/12), `npm ci && npm run build` green, session-auth API matrix, browser U1–U3 + loading/error/retry + split regression |
| E2E checklist | `docs/feedback/e2e-us-013.md` |
| CI | merged head run `43834492224`, head `6061579`, event `push`, **both jobs success**; `ci-report.md` and `docs/ai4se-plugins/20261116-165200-pipeline-report.md`. The later head `d0ca2ff` is docs-only |
| Tasks | `tasks.md` — implementation, 7.1/7.2 and G2 conditions C1–C5 checked; 7.3 (archive reconciliation) and 8.2–8.5 (merge/archive/G3) remain |
| Story | GitHub issue #9 |
| VL re-check (2026-11-16) | Merged `group1/main` `135d3df`; verified code head `6061579`. `origin/main` `a9b662e` is 5 commits ahead (US-049/050 split confirm/cancel + US-065 docs); `git merge-tree origin/main HEAD` is clean, and those commits touch split/error plumbing only (additive `details`, new split codes), not the members read. The earlier 7-file conflict set and the "28 commits behind" state are resolved. |

## Dimension results

| Dimension | Result | Source |
|---|---|---|
| Build | Pass | `mvn -B test` 198/198 (new class 12/12; split/login suites included); `npm ci && npm run build` green |
| Static scan | Pass | whitelist 5/5 exit 0; no ORM/H2/internal registry/hard-coded greeting |
| Code review | Pass | `@AuthenticationPrincipal` + `SecurityConfig` auth, read-only join, projection excludes personal fields, no new dependency |
| Evidence V1–V8 | V1 Partial (only human gates/archive open); V2–V8 Pass | local-verify report |
| OpenSpec validation | Pass | `openspec validate --strict` valid on CLI 1.16.1; no warnings |
| Merge readiness | Pass | `git merge-tree` clean vs `origin/main` `a9b662e`; branch merged `135d3df`; later main commits are split-only + docs (residual 7) |
| E1 machine | Pass | CI run `43834492224`, both jobs success on `6061579` |
| E2 AI | Pass | local-verify + verification documents |
| E3 human | Pass | Recorded by VL Leo in this sheet (2026-11-16) |

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
4. Design-system migration (R35) remains a separate track; this screen follows
   the merged shell/auth conventions and the shared `api()` helper.
5. No durable last-opened-trip memory; the no-trip guidance state is
   contractual (R33).
6. The `app-shell` **Purpose** prose still says "future areas stay honest text
   placeholders"; reconciling it is a P5 living-merge task (CL-1), not a G2
   blocker.
7. `origin/main` is 5 commits ahead of the merged branch (US-049/050 split
   confirm/cancel + US-065 docs). The merge is textually clean and those
   changes are additive to shared error plumbing; the exact merge commit has
   not run CI. The merge/main push CI will re-run; if it conflicts or fails,
   re-verify before archive.
8. `USER_REQUIRED` (trips/members) vs `MEMBER_REQUIRED` (splits) is an accepted
   divergence with follow-up F2 (C4).

## Sign-off

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| VL | Leo | **Pass** | 2026-11-16 | None — the C1–C5 conditions from the superseded Conditional record are closed | This sheet + `20261116-165153-local-verify-report.md` + `20261116-165200-pipeline-report.md` + `openspec validate` + VL merge check |

## Condition closure evidence (C1–C5 closed, 2026-11-16)

| # | Evidence |
|---|---|
| C1 | Merged `group1/main` `135d3df` into the branch. `TripController` keeps US-066 `@AuthenticationPrincipal` + `main-plan:confirm` and adds `GET /{id}/members`; `TripRepository` keeps `findById`/`isMember`/`confirmMainPlan` and adds `findMembers`; `App.tsx` keeps the login gate and shipped `#/split` entry and renders `Members`; README and five requirement-workspace conflicts resolved without dropping main rows. |
| C2 | `mvn -B test` **198/198** (new `TripMembersApiTest` 12/12, 6 migrations); `npm ci && npm run build` green; browser on the merged head: Ben roster 4 rows + Alice organizer only, full reload on `#/members` shows no-trip guidance, Eve login shows denied with no names, `#/split` with a trip shows the shipped entry (button) and no placeholder; fresh CI run `43834492224` on `6061579` both jobs success. |
| C3 | `specs/app-shell/spec.md` now **REMOVES** `Placeholder tabs` and **ADDS** `Tab content` (分队 = shipped split entry, 成员 = roster); `trips` requirement text shortened; proposal/US-013/design/DoV wording updated; `openspec validate --strict` valid. The Living Spec **Purpose** prose remains a P5 archive task (CL-1). |
| C4 | Decision recorded: trips/members use US-066 session auth + `USER_REQUIRED`; splits are session-based but return `MEMBER_REQUIRED` for anonymous callers. Accepted divergence; follow-up **F2**; R32/registry/handoff updated. |
| C5 | Tasks 7.1/7.2 checked; V1 wording corrected (evidence open only for G2/archive/gates); M8/M9 renamed to direct insert; retired-header 401 (blank/non-numeric/seeded) and POST/PUT/DELETE 405 tests added; unreachable empty/missing UI states documented; all-branch CI trigger recorded as user-approved infra R37; `openspec validate --strict` re-run and passing |

## Decision

- Decision: **Pass** — the merged-head implementation matches the `trips` and
  `app-shell` deltas, the OpenSpec change validates cleanly (`--strict`), and
  the local + CI evidence is complete enough for merge.
- Defect grades: 0 CRITICAL, 0 WARNING; the suggestions from the Conditional
  record remain non-blocking (404 `code` check, empty/missing UI reachability).
- Waivers: none.
- Approvers: **VL = Leo** (recorded 2026-11-16).
- Next: 8.2 human merge → 8.3 `/sdd:living-merge` (apply the REMOVED/ADDED
  pair, add the `trips` requirement, reconcile the Purpose prose) → 8.4 G3 by
  named SA (Johnson) → 8.5 close issue #9.

## Recording rules

1. G2 requires a **named VL** decision; G1's IO/SA signatures do not carry over.
2. This Pass supersedes the Conditional record at `a5e0c51`; the closure
   evidence above is retained for history.
3. Merge and P5 archive may start only after this Pass; G3 remains with the SA.
4. `openspec validate --strict` is clean; keep it clean if the touched
   requirements are edited again.
