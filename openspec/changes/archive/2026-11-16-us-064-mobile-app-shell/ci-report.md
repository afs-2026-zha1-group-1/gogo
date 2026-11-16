# Pipeline Report: us-064-mobile-app-shell

**Date:** 2026-11-15 (timezone: +0800)
**Root:** C:\Users\JIANGEL5\code\bootcamp\GoGo
**Phase:** ci
**Data source:** API (gh CLI at %LOCALAPPDATA%\Programs\gh\bin; not on PATH in
the probe shell, but authenticated API access verified)
**Change id:** us-064-mobile-app-shell
**Target:** PR #34, branch US-064-mobile-app-shell, run 43697575941
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43697575941
**Commit:** 976620d43c467d4eb95d69f68650f1c91aaef518

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43697575941 | Fresh run on the exact PR head; both jobs green |
| cd | n/a | — | — | Not in scope (no deploy before merge; apply lane) |
| **Overall** | Pass | — | — | All in-scope jobs success |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿 — run 43697575941, event pull_request, headSha 976620d matches
the pushed PR head (verified via gh API before and after the run).

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Frontend build (build) | success | 12 s (09:05:55–09:06:07Z) | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43697575941/job/132761402592 | — |
| ci | Backend tests (test) | success | 26 s (09:05:56–09:06:22Z) | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43697575941/job/132761402811 | — |

Frontend steps: checkout → setup-node → install from lockfile → build, all
success. Backend steps: checkout → setup-java → acceptance tests, all success.

## 失败详情

None — no failed job.

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | Not part of the two-job workflow (house baseline since REQ-001) |
| SAST | n/a | Same |
| Dependency audit | n/a | Same; lockfile unchanged by this change, public-registry check green locally |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | E3 human review (G2) pending | gate process | open — VL verdict to be collected |
| 2 | Pre-existing invitation first-issuance race (one 500 under StrictMode) | local verification reqid=27; backend untouched | tracking — separate change proposed |
| 3 | CD not exercised | phase=ci only; deploy after merge is apply lane | accepted — out of scope here |

## Artifacts

- E1 slot copy: `openspec/changes/us-064-mobile-app-shell/ci-report.md`
- Local evidence: `docs/feedback/verification-req-005.md`,
  `docs/ai4se-plugins/20261115-165423-local-verify-report.md`

## Human confirmation

N/A — remote fetch succeeded via authenticated gh API.

## Next

- ✅ E1 全绿 → `/sdd:g2-decision-record` (named VL); local-verify E1 slot updated
- `phase=cd` only after merge, via `/sdd:deploy-artifacts` (apply lane, separate authorization)