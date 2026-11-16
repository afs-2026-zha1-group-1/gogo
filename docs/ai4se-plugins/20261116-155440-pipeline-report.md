# Pipeline Report: us-066-log-in

**Date:** 2026-11-16 (timezone: Asia/Shanghai)
**Root:** C:\Users\JIANGEL5\code\bootcamp\GoGo
**Phase:** ci
**Data source:** API (GitHub Actions via `gh` at `%LOCALAPPDATA%\Programs\gh\bin\gh.exe`)
**Change id:** us-066-log-in
**Target:** PR #47 / branch `US-066-log-in`
**Pipeline URL:** https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43826922671
**Commit:** f10447744af0f57d96a0495911f2858549e3fd08

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43826922671 | both CI jobs green |
| cd | n/a | not run | — | deploy is a later human-gated step |
| **Overall** | Pass | success | — | CI phase only |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿 |

**E1:** ✅ 全绿

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend tests (`mvn -B test`) | success | 44 s (07:52:57–07:53:41Z) | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43826922671/job/133162851397 | — |
| ci | Frontend build (`npm ci && npm run build`) | success | 16 s (07:52:57–07:53:13Z) | https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43826922671/job/133162850997 | — |

## 失败详情

None.

## 安全与合规

| Check | Status | Notes |
|-------|--------|-------|
| Secret scan | n/a | no dedicated CI job; local static checks passed |
| SAST | n/a | no SAST job configured in the two-job CI |
| Dependency audit | n/a | `npm ci`/Maven resolve only; no audit job in CI |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | No dedicated security scan job in CI | workflow | accepted for MVP; local verify has static checks and security-focused tests |
| 2 | Session expiry acceptance uses invalidated/restarted sessions (Tomcat minute granularity) | local verify | accepted; documented |
| 3 | Splits Living Spec Purpose prose drift (`X-Member-Id`) | local verify | tracking; SA at archive |
| 4 | Demo-only seeded credentials | local verify | accepted; never shown in UI |

## Artifacts

- PR: https://github.com/afs-2026-zha1-group-1/gogo/pull/47
- CI run: https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43826922671
- Local verify: `docs/ai4se-plugins/20261116-154649-local-verify-report.md`

## Human confirmation

N/A — remote data was available via the GitHub API.

## Next

- ✅ E1 全绿 → local verify E1 ready; G2 remains a human decision.
- Do not merge/deploy from this report.
