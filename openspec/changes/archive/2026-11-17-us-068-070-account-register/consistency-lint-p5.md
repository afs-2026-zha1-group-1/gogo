# Consistency lint — us-068-070-account-register (phase=p5)

- change-id: `us-068-070-account-register`
- phase: p5 (post living-merge / archive)
- focus: default (Living Spec + archived change + KB reconciliation)
- timestamp: 2026-11-17T10:15+0800
- artifact level: 3 (proposal + specs + tasks + design + ATDD + summary)

## Verdict

**Pass** — 0 BLOCKER / 0 WARNING / 3 SUGGESTION / 1 N/A

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority | 判定 |
|---|---|---|---|---|---|---|---|---|
| F1 | SUGGESTION | p5 | `openspec/specs/{auth,app-shell}/spec.md` Purpose | `openspec archive` ignored the delta Purpose because the Living files already had one | Manually synced both Purposes (registration/profile/logout; five-tab shell + My Account) | archive output warned "delta Purpose ignored"; current Purpose text | spec | [fact] — resolved |
| F2 | SUGGESTION | p5 | Living `app-shell` scenarios | Legacy titles "four ordered tabs" / "identity switcher stays a scaffold" remained after archive | Renamed to "five ordered tabs" and "No shell-wide identity bar or profile shortcut"; removed the archive-compatibility notes | `openspec/specs/app-shell/spec.md`; `openspec validate --specs --strict` valid | spec | [fact] — resolved |
| F3 | SUGGESTION | p5 | `docs/knowledge/architecture/tech-stack-plan.md` §14 | §14 still contains the historical "不做注册" wording | §19 explicitly supersedes §14; no rewrite of the historical section | tech-stack-plan §14 + §19 | spec | [fact] — accepted |
| — | N/A | p5 | `tasks.md` remaining 10.4 | US-068 issue #40 card handoff is a process item | Confirm with the user/team; not an archive-completeness blocker | tasks 40/44; board card | code | N/A |

## phase=p5 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Living Spec vs merge intent | Pass | `auth` 41 scenarios / `app-shell` 19; EMAIL_TAKEN, five-tab dock, My Account and registration all present |
| 2 | Leftover open delta / archive side notes | Pass | change moved to `archive/2026-11-17-us-068-070-account-register/`; stale scenario notes removed |
| 3 | Post-merge terminology/cross-ref drift | Pass | no "four ordered tabs" or "no registration" in the living auth/app-shell specs; §14 superseded by §19 |
| 4 | change-summary claims vs evidence | Pass | 279/279, CI runs 43999674160/43999680155, PR #101 merge `3334e7d`, G2 Pass all cited |
| 5 | tasks/design/ATDD consistency | Pass | design D1–D16 and the decision map still match the shipped code; 40/44 tasks, remaining 10.4 is process |

## Rule table

| Rule | Result | Notes |
|---|---|---|
| P1-P4 (proposal) | Pass | Why/What Changes/Non-Goals/Impact present |
| S1-S5 (spec) | Pass | living specs validate; requirements trace to the proposal |
| T1-T3 (tasks) | Pass | 40/44; 10.4 is a board-handoff process item |
| D1-D3 (design) | Pass | D1–D16 numbered with context/alternatives/consequences |
| C1/C2/C6 | Pass / n/a / n/a | proposal→spec coverage; no task/design delta; no @knowledge prefixes |

## Residual risks

- **R-a**: duplicate-email disclosure was a user-directed override of the original privacy AC; email enumeration is accepted and IO re-confirmation is pending.
- **R-b**: US-068 issue #40 is still assigned to `DENGLU-OOCL`; card handoff remains a process item.
- **R-c**: registration/login rate limiting is a documented deployment exception.
- **R-d**: G3 is pending until this archive PR merges.

## Reviewer metadata

- Agent: Qoder, 2026-11-17
- Human sign-off: G3 pending (SA); this lint is not a gate decision.

## Next

- `/sdd:g3-decision-record` after the archive PR is merged.
