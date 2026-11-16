# Local Verify Report: us-065-frontend-typescript-migration

**Recorded:** 2026-11-16 14:47 +0800  
**Change id:** `us-065-frontend-typescript-migration`  
**Target:** local HEAD `066b9b09fe39ac98b375edd5e445ce53c05033e6`

## Results

| Dimension | Result | Evidence |
|---|---|---|
| Frontend build | Pass | `npm --prefix frontend run build` exited 0; `tsc --noEmit` completed before Vite produced the bundle. This was not a fresh local `npm ci`; the current-commit CI job performed the clean install. |
| Configured static checks | Pass | The five checks in `docs/feedback/verification-commands.md` passed: greeting, ORM, H2 and internal-registry reverse checks, and expected CI jobs. |
| CI trigger regression check | Fail | YAML inspection and comparison with `origin/main` show that the workflow replaced the `main` push trigger with the feature-branch push trigger, contrary to the approved no-CI-topology-change design. |
| Code review | Partial | The earlier review is recorded in `20261116-141217-local-verify-report.md`; the later workflow change diverges from the design and needs remediation and renewed review. |
| OpenSpec evidence | Partial | 14/15 tasks are complete. Task 5.1 is intentionally deferred until pre-archive; it is not complete. |
| Browser/database flows | Partial | The earlier report records intercepted UI checks. Live trip creation, invitation issuance and acceptance were not verified against a database under the documented exception. |
| **Overall** | **Partial** | The CI trigger regression and outstanding evidence prevent claiming all checks pass. |

The local build was initially invoked from the repository root without a package prefix and failed because no root `package.json` exists. The corrected command above succeeded. The first attempt at the static check also failed due to an unsupported PowerShell `Select-String -Recurse` parameter; the corrected checks passed. Neither failed attempt was a product build or test failure.

The CI trigger assertion `main in workflow['on']['push']['branches']`, using PyYAML's `BaseLoader`, failed because the only configured push branch is the feature branch.

## Follow-up

- Restore or explicitly resolve the `main` push-trigger regression, then refresh review and CI evidence for the resulting commit.
- Retain the deferred pre-archive task and the database-flow exception without marking either as verified.
- A new G2 decision requires Evelyn's own sign-off; this report is evidence, not a decision.

## Follow-up at 14:49 +0800

The user selected restoration of the original `main`-only push trigger. The working-tree workflow was changed accordingly; the pull-request trigger was left unchanged. A YAML assertion confirmed that both triggers target `main` and that the backend and frontend jobs remain present. The workflow now matches `origin/main` for this file. `npm --prefix frontend run build` was rerun and passed.

The workflow fix and the added trigger check in `docs/feedback/verification-commands.md` are uncommitted. The successful remote run in `20261116-1447-pipeline-report.md` therefore does not verify the updated working tree. Overall remains **Partial** pending a commit, pull request, refreshed CI evidence, and review.
