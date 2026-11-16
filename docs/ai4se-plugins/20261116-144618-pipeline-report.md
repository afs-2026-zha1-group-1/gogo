# Pipeline Report: us-013-view-trip-members

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:/Documents/AI_training/Day15/GOGO/gogo
**Phase:** ci
**Data source:** API (gh CLI, authenticated)
**Change id:** us-013-view-trip-members
**Target:** branch `US-013-view-trip-members-planning`, push event, run 43818961221
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818961221
**Commit:** 077e762351c6b1683615e6996832d7f7c5fe044e

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818961221 | Both jobs green on the first attempt |
| cd | n/a | — | — | Not in scope (no deploy before merge) |
| **Overall** | Pass | — | — | All in-scope jobs success |

## E1 decision (machine evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | E1 green |

**E1:** green — run 43818961221, event `push`, headSha `077e762` matches the
pushed branch head. The trigger was broadened to all branch pushes by user
instruction on 2026-11-16 (R37); job contents are unchanged and no PR exists.

**Re-run on the current head (docs-only):** after the P4 evidence commit, run
43819461209 on head `5dd3d6f` also succeeded — Backend tests 25 s, Frontend
build 14 s; both jobs success. The docs-only commit does not change the tested
code.

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests | pass | 24 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818961221/job/133137352226 | — |
| ci | Frontend build | pass | 10 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43818961221/job/133137351838 | — |

Backend steps: checkout → setup-java → `mvn test`, success. Frontend steps:
checkout → setup-node → install from lockfile → `tsc -b && vite build`, success.

## Annotations (advisory, not failures)

- `actions/checkout@v4` and `actions/setup-node@v4` target Node.js 20, forced to
  run on Node.js 24 (deprecation notice from GitHub).
- `actions/setup-java@v4` is deprecated in favor of v5.
- `ubuntu-latest` will migrate to Ubuntu 26 after 2026-10-19.

## Security and compliance

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | Not part of the two-job workflow (house baseline) |
| SAST | n/a | Same |
| Dependency audit | n/a | Same; no dependency added |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | G2 by VL Elian Jiang pending | gate process | open — verdict to be collected |
| 2 | CI now runs on every branch push | user instruction 2026-11-16 (R37) | accepted — broader runner usage; job contents unchanged |
| 3 | Action-version deprecation notices | GitHub annotations | advisory — no workflow failure; separate maintenance |

## Artifacts

- E1 slot copy: `openspec/changes/us-013-view-trip-members/ci-report.md`
- Local evidence: `docs/feedback/verification-us-013.md`,
  `docs/feedback/e2e-us-013.md`
