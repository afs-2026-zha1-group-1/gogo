# CI report — us-065-frontend-typescript-migration

- **Evidence collected:** 2026-11-16 16:56 +0800
- **Phase:** CI
- **Target:** `main` merge commit
  [`f11d395cfaff5467c9d3fb6a4087edfc37fbe822`](https://github.com/afs-2026-zha1-group-1/gogo/commit/f11d395cfaff5467c9d3fb6a4087edfc37fbe822)
  from PR #46
- **Run:** [CI #57, 43827240908](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43827240908),
  triggered by a push to `main`
- **Result:** **Pass** — completed successfully on 2026-11-16 at 07:56:17 UTC.

## Jobs

| Job | Result | Commands | Evidence |
|---|---|---|---|
| Backend tests | Pass | `mvn -B test` | [Job 133163873473](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43827240908/job/133163873473) |
| Frontend build | Pass | `npm ci`; `npm run build` | [Job 133163873797](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43827240908/job/133163873797) |

Both job conclusions and the run conclusion were obtained from the GitHub
Actions API; the commands are from the CI workflow at the merge commit.
This is a **post-merge push run**, not a green pre-merge PR run.

## Other evidence and limitations

- The separate
  [PR-head run 43827156592](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43827156592)
  for `b71cd11b2cd6ddc48c0c6eb083fa1b7a6e32372f` concluded failure. The jobs
  API returned no jobs for that run, so its failure cause is not established.
- This report restores the change's CI evidence slot; it does not refresh the
  local-verify report or establish completion of other G2/G3 conditions.
- No separate CD, security scan, SAST, or dependency-audit result is claimed.
