# Cross-change contract scan — us-096-second-split

- Date: 2026-11-18
- Command: `bash scripts/cross-change-scan.sh us-096-second-split`
- Verdict: BLOCKER 2 / WARNING 3 (auto heuristics; human disposition below)

## Auto findings

| id | severity | axis | location | finding |
|---|---|---|---|---|
| A1 | BLOCKER | identity cross-cut | `us-003-edit-trip-basics` | auth change does not cover preferences |
| A2 | BLOCKER | baseline | `US-096-second-split` | behind main by 36 commits (threshold 20) |
| A3 | WARNING | Living drift | `openspec/specs/splits/spec.md` | Living spec says `X-Member-Id`, code uses `X-User-Id` |
| A4 | WARNING | shared surface | `frontend/package-lock.js` | touched by req-002, req-020 |
| A5 | WARNING | shared surface | `frontend/src/pages/PreferencesPage.tsx` | touched by req-020, req-024 |

## Human disposition

- **A1 — not ours.** It belongs to `us-003-edit-trip-basics`. This change does not touch authentication or `preferences`; SA/IO record it as an existing follow-up on that change.
- **A2 — false positive from merge topology.** The scan sees the US-095 merge side as behind, but `git rev-list --left-right --count group1/main...HEAD` is `0 5`: the branch contains `group1/main` and is 5 commits ahead. No action.
- **A3 — existing drift.** The Living Spec still uses the legacy `X-Member-Id` wording; this change uses the session principal like the rest of the code. Recorded as a doc follow-up, not a code blocker.
- **A4/A5 — unrelated active changes.** No new shared dependency or preferences page change is introduced by US-096.

## Conclusion

No US-096-specific blocker remains. G1 may rely on this disposition; the two auto blockers are not introduced by this change.
