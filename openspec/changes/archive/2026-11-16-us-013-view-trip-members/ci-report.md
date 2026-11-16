# Pipeline Report: us-013-view-trip-members (merged head)

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:/Documents/AI_training/Day15/GOGO/gogo-us013-merge
**Phase:** ci
**Data source:** API (gh CLI, authenticated)
**Change id:** us-013-view-trip-members
**Target:** branch `US-013-view-trip-members-planning`, push event, run 43834492224
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43834492224
**Commit:** 6061579fd7025c17bba54f2db1b89d54a76accb2 (merge of `group1/main` 135d3df)

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43834492224 | Both jobs green on the merged head (first attempt) |
| cd | n/a | — | — | Not in scope before merge |
| **Overall** | Pass | — | — | All in-scope jobs success |

## E1 decision (machine evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | E1 green |

**E1:** green — run 43834492224, event `push`, headSha `6061579` is the merged
head. The all-branch trigger is the user-approved R37; no PR exists.

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests | pass | 35 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43834492224/job/133187628194 | — |
| ci | Frontend build | pass | 17 s | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43834492224/job/133187628703 | — |

Backend steps: checkout → setup-java → `mvn test` (198/198 locally on the same
head), success. Frontend steps: checkout → setup-node → lockfile portability →
`npm ci` → build, success.

## Annotations (advisory)

- Node.js 20 actions forced onto Node.js 24 (checkout/setup-node).
- `ubuntu-latest` will migrate to Ubuntu 26 after 2026-10-19.
- `actions/setup-java@v4` deprecation notice.

## Security and compliance

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | Not part of the two-job workflow |
| SAST | n/a | Same |
| Dependency audit | n/a | Same; no new dependency |

## Residual risks (for G2 re-record)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | G2 re-record by VL Leo pending | gate process | open |
| 2 | Docs-only commits after the verified code head | this record | code head `6061579` verified; later commits are docs |
| 3 | Split anonymous error code differs from trips | C4/F2 | accepted, follow-up |
| 4 | CI runs on every branch push | R37, user-approved | accepted; job contents unchanged |

## Artifacts

- E1 slot copy: `openspec/changes/us-013-view-trip-members/ci-report.md`
- Local evidence: `docs/ai4se-plugins/20261116-165153-local-verify-report.md`,
  `docs/feedback/verification-us-013.md`
