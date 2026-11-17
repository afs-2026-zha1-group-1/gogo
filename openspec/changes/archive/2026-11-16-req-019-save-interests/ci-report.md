# CI report — req-019-save-interests (E1 slot)

Persisted copy of the pipeline report body for local-verify and G2 consumption.
Full report: `docs/ai4se-plugins/20261116-153521-pipeline-report.md`.

**Date:** 2026-11-16 15:35 (UTC+08:00)
**Phase:** ci
**Data source:** API (gh CLI, authenticated; `repo` scope)
**Target:** PR #44 `REQ-019: save member interests on main's shadcn baseline`, `feat/travel_preference` → `main`
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43824457379
**Commit:** `e7333f0` — equals local `HEAD`, `origin/feat/travel_preference` and PR #44 `headRefOid`

**Latest head (2026-11-16 17:40 UTC+08:00):** `c1c1f89` — the fourth merge of `origin/main`
(`80d3dce` = PR #48) — base `80d3dce`; run
[43840919975](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43840919975) is green on it.
See §"Update — E1 on the fourth merge" for the details; the earlier heads listed below stay as
recorded history.

**Earlier head (2026-11-16 16:20 UTC+08:00):** `0e93804` — the merge commit `f16d009` plus the
G2-draft documentation only — base `40381ac`, PR #44 `mergeStateStatus` = `CLEAN`; run
[43830251839](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43830251839) is green on it
(`Backend tests` 203/203 + `BUILD SUCCESS`, `Frontend build` 20 s). See §"Update — E1 on the merged
head" for the code-bearing run `43829662798` on `f16d009`. Any later commit re-runs CI on the new
head; take the live check from `gh pr view 44`.

## E1

**✅ 全绿 (machine).** Run 43824457379, workflow `CI`, event `pull_request`, `conclusion: success`,
created 2026-11-16T07:31:18Z, completed 07:32:05Z. Both jobs succeeded on the first attempt; no
re-run was needed.

| Phase | Job | Status | Duration | Evidence |
|---|---|---|---|---|
| ci | `Backend tests` — `mvn -B test`, Java 21 | success | 43 s | job 133154826667; log shows `Tests run: 203, Failures: 0, Errors: 0, Skipped: 0` then `BUILD SUCCESS` |
| ci | `Frontend build` — `npm ci` → `npm run typecheck` → `npm run build`, Node 24 | success | 17 s | job 133154826397 |
| ci | E2E / browser acceptance | skipped by design | — | `atdd-design.md` §3 — no browser orchestration in CI |
| cd | any | n/a | — | No deployment in scope |

**Overall: Pass.** E1 is machine-read, so this slot is citable in the G2 Inputs without a human
confirmation.

Remote value of this run beyond "green": the 203 cases include `MainPlanApiTest` (34), and a clean
CI database applies `V5__create_main_plan` — which declares `member_preference` as an
`IF NOT EXISTS` stand-in — before the preference migration. Reaching that migration with 203/203
there is the off-machine proof that the merge-time table reconciliation (tasks 8.8) is not a
local-only artifact. (The file was `V6` at the time of this run; the fourth merge took `V6` for
US-066's credentials and renumbered it `V7`, see the last update.)

## Security / compliance

| Check | Status | Notes |
|---|---|---|
| Secret scan | n/a | No such job in the workflow |
| SAST | n/a | Same |
| Dependency audit | n/a | Not a CI job; local `npm ci` audit clean |

## Residual risks

1. The commit that records this report moves the PR head past `e7333f0`; CI re-runs there. The delta
   is documentation only — accepted, and the re-run is visible on PR #44.
2. `main` advanced to `c4f9e32` (docs-only) after the merge base `bac8095`; the range touches no
   migration/frontend/pom/ci.yml file and PR #44 is `CLEAN` — re-check at G3.
3. No named VL verdict yet (G2); the agent does not self-sign.
4. `cd` never exercised — accepted (phase=ci only).

## Human confirmation

N/A — no statement is used as the basis of E1.

## Update — E1 on the merged head (run 43829662798)

`origin/main` advanced twice after this report was written (`171ec00` fixes the frontend build
error, `40381ac` adds the US-049/050 G1 record), so the branch merged it a third time in `f16d009`
and CI re-ran there. Read through the same authenticated API:

| Phase | Job | Status | Duration | Evidence |
|---|---|---|---|---|
| ci | `Backend tests` | success | 33 s | job 133171672297; 23 per-class `Tests run` lines, aggregate `Tests run: 203, Failures: 0, Errors: 0, Skipped: 0`, then `BUILD SUCCESS` |
| ci | `Frontend build` | success | 20 s | job 133171671773; steps `Check lockfile portability` (`node --test tests/lockfile.test.mjs`, 2/2), `Install from the lockfile`, `Typecheck`, `Build` (136 modules, `488.36 kB` JS / `38.39 kB` CSS) |

Run created 2026-11-16T08:14:36Z, completed 08:15:14Z; head `f16d009`, base `40381ac`.

One residual risk from the section above is now closed: `main`'s lockfile no longer breaks Windows
`npm ci` — `171ec00` drops the `libc` constraints on non-Linux native packages and the new
`frontend/tests/lockfile.test.mjs` guards the regression as the first CI step.

## Update — E1 on the fourth merge (run 43840919975)

While the G2 signature was being recorded, `origin/main` advanced to `80d3dce` (PR #48: archives
US-066/US-065 and ships the US-049/050 follow-up), so PR #44 went `dirty`. The branch merged it a
fourth time in `c1c1f89` — four text conflicts plus two behaviour adaptations that the merge itself
surfaced: the preference migration renumbered `V6` → `V7` (`V6__create_account_credential.sql`
now exists on `main`) and both endpoints take the caller from `Authentication`/`AccountPrincipal`
because US-066 retired the `X-User-Id` header. Read through the same authenticated API:

| Phase | Job | Status | Duration | Evidence |
|---|---|---|---|---|
| ci | `Backend tests` | success | 35 s | job 133209064056, started 09:34:18Z; aggregate `Tests run: 243, Failures: 0, Errors: 0, Skipped: 0`, then `BUILD SUCCESS` (40 more than the 203 of the previous run — `40381ac..80d3dce` adds `AuthApiTest` and `SessionExpiryApiTest` and turns the splits suites onto `TestAuth`; `PreferenceApiTest` keeps 29 cases, rewritten to post a principal instead of the retired header) |
| ci | `Frontend build` | success | 20 s | job 133209064501; steps `Check lockfile portability` (2/2), `Install from the lockfile`, `Typecheck`, `Build` (139 modules transformed) |

Run created 2026-11-16T09:34:16Z, completed 09:34:53Z; head `c1c1f89`, base `80d3dce`.
Local mirror of the same tree: `mvn -B clean test` 243/243, `node --test tests/lockfile.test.mjs`
2/2, `npm run typecheck` clean, `npm run build` 500.89 kB JS / 38.87 kB CSS.

## Update — fifth merge (2026-11-16, US-013 member roster)

`origin/main` reached `5b7a1be` (US-013's roster: `GET /api/trips/{id}/members`, Screen 7,
`V1`–`V6` unchanged) before the fourth merge could be merged, so the branch merged it a fifth
time. Three conflicts, all "both sides added" rather than behavioural: `README.md` (kept the
US-013 section next to the preference paragraphs), `docs/knowledge/_LOG.md` (kept both KB rows)
and `frontend/src/App.tsx` (kept the `Members` and `PreferencesPage` imports); `app.css`,
`types.ts`, `ci.yml` and the `requirement-workspace` ledgers auto-merged. Nothing in the
preference feature changed — no migration, endpoint, test or page line was touched.

Local on the merged tree: `mvn -B clean test` **255/255** (the 243 above plus main's
`TripMembersApiTest` 12), `node --test tests/lockfile.test.mjs` 2/2, `npm run typecheck` clean,
`npm run build` 503.85 kB JS. The fifth merge's head `15bfa95` carries exactly the feature tree
that is merged — every later commit on the branch touches only `openspec/` and `docs/` — and CI is
green on it twice:

| Phase | Job | Status | Duration | Evidence |
|---|---|---|---|---|
| ci | `Backend tests` | success | 49 s | job 133215246924, push run 43842757828, started 09:46:26Z, ended 09:47:15Z; aggregate `Tests run: 255, Failures: 0, Errors: 0, Skipped: 0` |
| ci | `Frontend build` | success | 36 s | job 133215246482, push run 43842757828, started 09:46:27Z, ended 09:47:03Z; `Check lockfile portability` 2/2, `Install from the lockfile`, `Typecheck`, `Build` |
| ci | `Backend tests` | success | 36 s | job 133215288937, pull-request run 43842769894 (the PR #44 check), started 09:46:31Z, ended 09:47:07Z |
| ci | `Frontend build` | success | 22 s | job 133215288260, pull-request run 43842769894, started 09:46:31Z, ended 09:46:53Z |

Push run 43842757828 and pull-request run 43842769894 were both created 09:46:2xZ on head `15bfa95`
(base `5b7a1be`) and both concluded `success`; `pulls/44` reported `mergeable=true`,
`mergeable_state=clean` at merge time. The main-side push run that follows the merge belongs to the
merge commit, not to this change, and is recorded in the change's P5 archive notes.

## Update — sixth merge (2026-11-16, after PR #44 was merged)

`origin/main` reached `81af3d1` (US-067's QR scanner and US-071's P1/P2 documents) 24 commits after
the merge base, so the branch merged `main` a sixth time in `58d5cd9`. The merge was **conflict-free**:
both sides were kept automatically for `README.md`, `docs/knowledge/_LOG.md`, `frontend/src/App.tsx`,
`app.css`, `types.ts` and `package.json`/`package-lock.json`, and none of this change's files were
touched — the branch side carried only `specs/preferences/spec.md`, `tasks.md` and `g3-decision.md`.

Local on the merged tree: `mvn -B clean test` **255/255** across 28 suites (main's new work is
frontend and docs), `node --test tests/lockfile.test.mjs` 2/2, `npm run typecheck` clean,
`npm run build` 645.74 kB JS / 44.41 kB CSS / 142 modules (up from 503.85 kB / 139 modules because
of `Scanner.tsx` and `scan.ts`; the >500 kB chunk warning predates this change),
`openspec validate req-019-save-interests --strict` → `is valid`. No new remote run is claimed here:
this merge only re-bases the branch on main, and the change's CI evidence above stays attached to the
head that was actually merged (`9f24fa9`, runs 43842757828 / 43842769894).

## Update — PR #50 lands this record (2026-11-16, after PR #44)

PR #44 carried the feature; the G3 record, the strict-validation fix and the sixth merge were
committed after that merge, so they needed a second PR. **PR #50**
(`docs(req-019): G3 Pass, strict-validation fix and a sixth sync with main`,
`feat/travel_preference` → `main`, head `b3c5b92`, base `81af3d1`) carried three commits and five
files — `g3-decision.md` (new), `specs/preferences/spec.md`, `tasks.md`, this report and
`docs/feedback/verification-matrix.md` (+174 / −110, documentation only — no code, migration or
test line).

| Phase | Event | Run | Jobs | Evidence |
|---|---|---|---|---|
| ci | `pull_request` (PR #50) | 43876766780 | `Backend tests` success, `Frontend build` success | head `b3c5b92`; the frontend job ran `Check lockfile portability` 2/2 → `npm ci` → `typecheck` → `build` |
| ci | `push` | 43874225529 | both success | same head, created before the PR was opened |
| cd | `push` on `main` | 43877290310 | success | merge commit `5183291`, created 13:36Z |

`pulls/50` reported `mergeable=true`, `mergeable_state=clean` with 3 commits / 5 files and merged
at 2026-11-16T13:35:47Z as **`5183291`**. After the merge `origin/main` moved on again (US-072's
archive plus two `lumi_dev` syncs reached `db45609`), so the archive that follows is cut from
`db45609`; its result is recorded in `g3-decision.md` rather than here, because the runs above are
the last remote evidence this change itself produced.
