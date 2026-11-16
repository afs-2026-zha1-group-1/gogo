# Consistency lint — us-013-view-trip-members

- Phase: `p2`
- Focus: change package (`proposal.md` + delta specs); no `tasks.md` or
  `design.md` yet
- Date: 2026-11-16
- Artifact level: **2** (proposal + specs); Tasks/Tests/Design rules N/A
- Method: manual checklist pass (OpenSpec 1.6.0 on this machine; `openspec
  validate` used for structural validity)

## Verdict

**Pass** — 0 BLOCKER / 0 WARNING / 4 SUGGESTION / 5 N/A.

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| WARNING | 0 |
| SUGGESTION | 4 |
| N/A | 5 |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Authority |
|---|---|---|---|---|---|---|
| CL-1 | SUGGESTION | p2 | `openspec/specs/app-shell/spec.md` Purpose | Purpose still says "future areas stay honest text placeholders"; US-013 replaces the 成员 placeholder | Reconcile the Purpose prose during P5 living-merge when the MODIFIED requirement is applied | spec `[fact]` |
| CL-2 | SUGGESTION | p2 | unmerged `sdd-req-004-split-planning` `MemberGuard` | Uses `MEMBER_REQUIRED` for a missing `X-User-Id`, while merged `trips`/`main-itinerary` use `USER_REQUIRED` | Keep `USER_REQUIRED` here; raise at split-merge review; no code change in this change | code `[fact]` |
| CL-3 | SUGGESTION | p2 | `docs/knowledge/architecture/tech-stack-plan.md` §3 | Plan names AntD 5 + TanStack Query v5; the merged frontend uses token CSS + plain `api()` | Recorded as a known deviation in the proposal; adopt the planned stack in the separate US-065/US-066 migration | code `[fact]` |
| CL-4 | SUGGESTION | p2 | `#/members` route | The route carries no trip id; a reload loses the last-opened trip and shows the no-trip guidance state | P3 UX choice; the guidance state is contractual and no list-all endpoint is added | spec `[fact]` |

## Checks run

| Check | Result | Evidence |
|---|---|---|
| P1 `## Why` present and substantive | Pass | proposal §Why |
| P2 `## What Changes` present and substantive | Pass | proposal §What Changes |
| P3 Non-goals present and non-empty | Pass | proposal §Non-Goals / Out of scope |
| P4 Impact covers self / upstream / downstream | Pass | proposal §Impact: requirement/code/API/data + Upstream + Downstream |
| S1 spec structure follows project schema | Pass | `openspec validate us-013-view-trip-members` → valid |
| S2 citation prefixes | Pass | no unknown `@…:` citation prefixes |
| S2b/S2c knowledge/rule references resolve | N/A | no `@knowledge:` / `@rule:` references |
| S3 every requirement traces to proposal | Pass | both delta requirements map to proposal bullets |
| S4 scenarios use project WHEN/THEN/AND form | Pass | project OpenSpec convention; Given is implicit |
| S5 scenarios belong to a numbered requirement | Pass | 8 scenarios under the ADDED requirement, 3 under the MODIFIED requirement |
| C1 proposal → spec coverage | Pass | no silent expansion or drop; readiness/preferences, invite/remove, auth, list-all and migrations stay out |
| C2 spec → tasks | N/A | `tasks.md` not authored at P2 |
| C6 knowledge/rule reachability | N/A | no citations |
| p2 scope consistency | Pass | Delta scope equals proposal scope; actors, identity and error vocabulary consistent |
| p2 key scenarios have a home | Pass | S1–S10 / U1–U3 represented in the deltas and fixtures §US-013 |
| p2 orphan requirements | Pass | none |

## N/A / skipped

- `tasks.md` — not authored at P2.
- `design.md` — not authored at P2.
- T1–T3, D1–D3, C2 — dependent on the absent artifacts.
- Living Spec merge checks — p5 only.

## Residual risks

- R31: the `app-shell` placeholder requirement must be merged as MODIFIED at
  archive; the stale Purpose sentence (CL-1) is the only prose drift.
- R32: the split-branch error-code divergence (CL-2) remains until that branch
  is merged and reviewed.
- R35: stack-plan adoption (CL-3) stays a separate migration; this change does
  not widen the gap.
- R33: durable trip selection (CL-4) is a P3 UX choice; the no-trip state is
  covered by U3 and the app-shell delta.
- No other known residual risk.

## Reviewer metadata

- Agent pass, 2026-11-16; human IO/SA sign-off pending at G1.
- This report is guidance, not a Gate decision and not Living Spec authority.

## Next

`/sdd:g1-decision-record` after IO Emily and SA Johnson decide, or continue
`/sdd:p2` if a finding needs a spec edit. G1 is **not** recorded by this file.
