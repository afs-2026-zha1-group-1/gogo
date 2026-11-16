# Pipeline Report: us-031-037-main-itinerary

**Date:** 2026-11-16 (timezone: +0800)
**Root:** d:\Bootcamp Training\Trip\gogo
**Phase:** ci
**Data source:** API (gh CLI at %LOCALAPPDATA%\Programs\gh\bin; authenticated)
**Change id:** us-031-037-main-itinerary
**Target:** PR #37, branch US-031-037-main-itinerary-planning, run 43799584379
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43799584379
**Commit:** 2bc8ed10c7febd5754b9d128481f3a104caff53e

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43799584379 | Both jobs green after 2 re-runs; see failure history |
| cd | n/a | — | — | Not in scope (no deploy before merge; apply lane) |
| **Overall** | Pass | — | — | All in-scope jobs success |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿 — run 43799584379, event pull_request, headSha 2bc8ed1 matches
the pushed PR head (verified via gh API and `refs/pull/37/merge` = 4da1d6b).
PR #37 state after the green run: OPEN · MERGEABLE · mergeStateStatus CLEAN.

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests | pass | 27 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43799584379/job/133078123939 | — |
| ci | Frontend build | pass | 12 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43799584379/job/133078124172 | — |

Frontend steps: checkout → setup-node → install from lockfile → `tsc -b && vite
build`, all success. Backend steps: checkout → setup-java → `mvn test`, success.

## 失败详情 (transient, resolved by re-run)

The first two attempts of run 43799584379 failed identically at
`actions/checkout@v4` (both jobs, ~27–38 s), before any build/test executed:

```
git fetch --depth=1 origin +4da1d6b5...:refs/remotes/pull/37/merge
remote: Repository not found.
fatal: repository '.../gogo/' not found   (exit 128, retried 3×)
```

Diagnosis: GitHub-side checkout/auth transient on the runner, not a code defect.
`refs/pull/37/merge` was confirmed present and pointing at the fetched SHA
(4da1d6b); the same two-job workflow is green on main and on prior PRs
(#30/#31/#34). Local verification of the identical head was fully green
(`npm ci`, `tsc -b && vite build`, `mvn test` 90/90). Two `gh run rerun
--failed` attempts; the third attempt passed. No source change was needed
between attempts (head SHA unchanged at 2bc8ed1).

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | Not part of the two-job workflow (house baseline since REQ-001) |
| SAST | n/a | Same |
| Dependency audit | n/a | Same; lockfile adopted from main (US-064 public-registry fix present); `npm ci` green locally |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | E3 human review (G2) pending | gate process | open — VL verdict to be collected |
| 2 | CI checkout flakiness (transient `Repository not found`) | run 43799584379 attempts 1–2 | mitigated — green on attempt 3; monitor for recurrence |
| 3 | TS convergence onto main's shared `api`/shell is new integration surface | this merge (US-064 shell × US-031/037 screens) | mitigated — tsc/build green, runtime routes wired as full-page (join-style); recommend browser regression at G2 |
| 4 | CD not exercised | phase=ci only; deploy after merge is apply lane | accepted — out of scope here |

## Artifacts

- E1 slot copy: `openspec/changes/us-031-037-main-itinerary/ci-report.md`
- Local evidence: `docs/feedback/verification-us-031-037.md` and the
  `docs/ai4se-plugins/` local-verify reports.

## Human confirmation

N/A — remote fetch succeeded via authenticated gh API.

## Next

- ✅ E1 全绿 → `/sdd:g2-decision-record` (named VL); local-verify E1 slot updated
- `phase=cd` only after merge, via `/sdd:deploy-artifacts` (apply lane, separate authorization)
