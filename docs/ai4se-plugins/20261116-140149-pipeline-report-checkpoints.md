# Checkpoint log — pipeline-report

- skill: skill.verify.pipeline-report
- command: /sdd:pipeline-report
- root: /d/NGSA5/OneDrive - Orient Overseas Container Line Ltd/Documents/TATP/Bootcamp/Group Project/gogo_prod
- started_at: 2026-11-16T14:01:49+0800
- host_agent: unknown

## Checkpoints

| id | topic | choice | rationale | status |
|----|-------|--------|-----------|--------|
| C1 | phase | ci | The requested G2 evidence requires CI; the repository configures CI but no CD workflow. | default-applied |
| C2 | target | branch `US-065-migrate-frontend-fully-from-JavaScript-to-TypeScript`, commit `c27453d807f6b076928e514b7bb46908962f803e` | This is the current branch and HEAD for the active change. | default-applied |

## Probe

- summary: GitHub origin and active change branch detected; GitHub Actions MCP API available.
- host: github
- tool_glab: no
- tool_gh: no
- remotes: `origin git@github.com:afs-2026-zha1-group-1/gogo.git` (fetch/push)

## Fetch

- data_source: API
- phases_covered: ci
- upstream_urls: No workflow run or PR exists for the target branch; GitHub API queries returned empty results.

## Report

- mode: persisted
- report_path: `docs/ai4se-plugins/20261116-141105-pipeline-report.md`; E1 slot copied to `openspec/changes/us-065-frontend-typescript-migration/ci-report.md`
- overall: Partial
- human_confirmation: N/A

## Next

- suggested: Create/authorize a PR targeting `main`, wait for the CI workflow, then regenerate this report.
- CD: n/a; no CD workflow is configured.
- G2: record only after required evidence is complete and the VL decision is valid.
