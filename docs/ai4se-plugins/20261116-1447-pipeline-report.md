# Pipeline Report: us-065-frontend-typescript-migration

**Recorded:** 2026-11-16 14:47 +0800  
**Phase:** ci  
**Change id:** `us-065-frontend-typescript-migration`  
**Target:** branch `US-065-migrate-frontend-fully-from-JavaScript-to-TypeScript`, commit `066b9b09fe39ac98b375edd5e445ce53c05033e6`

## Result

GitHub Actions reported [run 43818290075](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818290075) completed successfully for the target commit on a branch push.

| Job | Result | Evidence |
|---|---|---|
| Backend tests | Pass | [Job 133135258675](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818290075/job/133135258675); acceptance-test step succeeded |
| Frontend build | Pass | [Job 133135258974](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818290075/job/133135258974); lockfile install and build steps succeeded |
| **CI overall** | **Pass** | Both reported jobs succeeded for the target commit |
| CD | n/a | No CD workflow was found in `.github/workflows` |

This is a branch-push run, not a pull-request run. The GitHub API returned no pull request for the branch at the time of this report. The workflow currently does not trigger on pushes to `main`, unlike the baseline and the approved design; this is a separate open issue and must not be hidden by the green run. A later commit requires new CI evidence.
