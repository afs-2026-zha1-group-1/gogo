# CI report — req-019-save-interests (E1 slot)

Persisted copy of the pipeline report body for local-verify and G2 consumption.
Full report: `docs/ai4se-plugins/20261116-153521-pipeline-report.md`.

**Date:** 2026-11-16 15:35 (UTC+08:00)
**Phase:** ci
**Data source:** API (gh CLI, authenticated; `repo` scope)
**Target:** PR #44 `REQ-019: save member interests on main's shadcn baseline`, `feat/travel_preference` → `main`
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43824457379
**Commit:** `e7333f0` — equals local `HEAD`, `origin/feat/travel_preference` and PR #44 `headRefOid`

**Latest head (2026-11-16 16:15 UTC+08:00):** `f16d009` (third `origin/main` merge, base
`40381ac`), PR #44 `mergeStateStatus` = `CLEAN`, run
[43829662798](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43829662798) green on it —
see §"Update — E1 on the merged head". The section below stays as the first E1 evidence on
`e7333f0`.

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
`IF NOT EXISTS` stand-in — before `V6`. Reaching `v6` with 203/203 there is the off-machine proof
that the merge-time table reconciliation (tasks 8.8) is not a local-only artifact.

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
