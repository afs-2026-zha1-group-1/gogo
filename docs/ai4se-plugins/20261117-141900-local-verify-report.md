# Local Verify Report: US-061 Main Integration

**Date:** 2026-11-17 (UTC+08:00)
**Change:** `us-061-view-trip-dashboard`
**Scope:** feature branch integrated with main commit
`42a9239e718db33ce0113cf20ad840c1ea71e259`
**Overall:** Fail — required post-PR CI and pre-archive reconciliation are
still outstanding. Local checks below include the review fixes but do not
constitute a G2 decision.

## Local results

| Check | Result | Evidence |
|---|---|---|
| Backend `mvn -B test` | Pass | 299 tests, zero failures or errors. |
| Frontend lockfile and progress checks | Pass | Six tests, zero failures. |
| Frontend `npm run test:unit` | Pass | Six tests, zero failures. |
| Frontend `npm run build` | Pass with warning | Typecheck and production build succeeded; JavaScript bundle exceeds 500 kB. |
| Frontend `npm run test:e2e` | Pass | 73 browser tests using installed Microsoft Edge and an isolated SQLite database. |
| Six static whitelist commands | Pass | Four reverse checks and both CI job/trigger checks succeeded. |
| `openspec validate us-061-view-trip-dashboard --strict` | Pass | Change is structurally valid. |
| `git diff --cached --check MERGE_HEAD` | Pass | Integration diff is whitespace-clean relative to the actual merge parent. |

The browser suite covers member isolation, malformed list data, current-trip
picker persistence, dashboard read-only selection, delayed current-trip
responses, overlapping picker writes, malformed current-trip responses,
account changes, guarded navigation after refresh, and safe split and
main-plan returns. Persisted-state snapshots include account current-trip IDs
and exclude account credentials.

## Outstanding evidence and limitations

- An independent integration review identified five navigation and selection
  risks. Focused red-green browser regressions and the full local browser suite
  were run after the fixes; the reviewer did not perform a second review.
- Required GitHub CI has not run. Task 4.3b remains open.
- Archive reconciliation remains task 5.1 and must occur only at archive.
- Completion-aware filtering and the original outstanding criteria of issue
  #26 are not delivered; the issue remains open.
- Deployment, G2, and final acceptance have not occurred.
- Local browser verification used Edge; CI is configured to run Chromium.

The existing [ordering waiver](20261117-134143-local-verify-report.md) permits
PR submission only, with Sammi Ng as the named owner and a remedy deadline of
2026-11-18. It does not waive CI, archive, G2, or issue #26. This report
remains Fail until the required evidence exists.
