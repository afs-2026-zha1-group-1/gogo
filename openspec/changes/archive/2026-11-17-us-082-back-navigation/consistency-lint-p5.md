# Consistency lint — us-082-back-navigation (phase=p5)

- change-id: `us-082-back-navigation`
- phase: p5 (post living-merge / archive)
- focus: default (Living Spec + archived change + KB reconciliation)
- timestamp: 2026-11-17T11:56+0800
- artifact level: 3 (proposal + specs + tasks + design + ATDD + summary)

## Verdict

**Pass** — 0 BLOCKER / 0 WARNING / 3 SUGGESTION / 1 N/A

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority | 判定 |
|---|---|---|---|---|---|---|---|---|
| F1 | SUGGESTION | p5 | `openspec/specs/app-shell/spec.md` Purpose | Archive kept the existing Purpose; the delta had no Purpose block | No Purpose rewrite needed; new requirements sit under the existing shell purpose | Living `app-shell` now has `Trip-context return links` and `Auth deep-link resume and route consistency` | spec | [fact] — accepted |
| F2 | SUGGESTION | p5 | E2E evidence | A2 (pending invitation precedence) was not browser-tested on the shared 8080 backend | Re-run in an isolated environment if G3 requires it; code path unchanged | `docs/feedback/e2e-us-082.md` A2 row | code | [fact] — accepted |
| F3 | SUGGESTION | p5 | `tasks.md` | AC2/AC3 dependency rows remain Blocked until US-071 merges | Regress after US-071; do not mark Pass early | `e2e-us-082.md` D1/D2; US-071 active | spec | [fact] — accepted |
| — | N/A | p5 | `#/login` / `#/register` hash entries | Kept intentionally as legacy entry surfaces | Separate cleanup change if desired | `LoginPage.tsx`, `RegisterPage.tsx`, `App.tsx` | code | N/A |

## phase=p5 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Living Spec vs merge intent | Pass | `app-shell` +2 ADDED / 1 MODIFIED; joined action present at line 203/251; return links and auth resume present |
| 2 | Leftover open delta / archive side notes | Pass | `openspec list` shows no active `us-082`; change moved to `archive/2026-11-17-us-082-back-navigation/` |
| 3 | Post-merge terminology/cross-ref drift | Pass | No stale `backTo="/"` or `/#/login` internal links; return targets consistent with `#/trips/<id>` |
| 4 | change-summary claims vs evidence | Pass | 279/279, clean build, CI runs, PR #107 merge `ee8bf8f`, G1/G2 all cited |
| 5 | tasks/design/ATDD consistency | Pass | design D1–D6, ATDD 14 mappings, tasks 24/25 (10.3 closed by archive) |

## Rule table

| Rule | Result | Notes |
|---|---|---|
| P1-P4 (proposal) | Pass | Why / What Changes / Capabilities / Impact present |
| S1-S5 (spec) | Pass | `openspec validate --specs --strict` = 8 passed / 0 failed |
| T1-T3 (tasks) | Pass | 24/25 before G3; 10.3 archive task closed by this archive |
| D1-D3 (design) | Pass | D1–D6 with context/alternatives/consequences |
| C1/C2/C6 | Pass / n/a / n/a | proposal→spec coverage; no task/design delta; no `@knowledge` prefixes |

## Residual risks

- **R-a**: A2 browser evidence absent; code path unchanged.
- **R-b**: AC2/AC3 depend on US-071.
- **R-c**: legacy hash auth entries retained.
