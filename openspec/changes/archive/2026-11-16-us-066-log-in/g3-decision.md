# G3 decision — us-066-log-in

- Gate: G3 (Merge & Archive)
- Change id: `us-066-log-in`（REQ-008 / US-066）
- Inputs:
  - living-merge: `openspec/changes/archive/2026-11-16-us-066-log-in/`; `openspec validate --all` 9/9 pass
  - change summary: `openspec/changes/archive/2026-11-16-us-066-log-in/change-summary.md`
  - G2: `g2-decision.md`（Pass，VL lumi）
  - PRs: #47 merged `135d3df`（code）; #48 merged `80d3dce`（archive/P5）
  - KB update: `scripts/kb-lint.sh` → `SKIP: KB lint is not configured for this project.`（documented baseline policy; not a KB Pass）
- Conclusions:
  - Merge: complete; no open conflicts for this change.
  - Archive completeness: active change folder removed; archive contains proposal/specs/design/tasks/ATDD/G1/G2/change summary.
  - Harness/Rules evolve: no blocking evolution needed for this change; splits Purpose prose drift is a follow-up.
- Decision: **Pass**
- Conditions + owners: none; residual risks recorded below.
- Approvers: **SA = Elian Jiang**（用户 2026-11-17 明确指定）
- Timestamp: 2026-11-17

## Residual risks

| # | Risk | Owner | Handling |
|---|---|---|---|
| 1 | `openspec/specs/splits/spec.md` Purpose still has pre-existing `X-Member-Id` prose drift while requirements are session-based | SA | small follow-up in Living Spec |
| 2 | In-memory sessions are lost on backend restart | SA/Dev | accepted for MVP; re-login |
| 3 | Demo credentials are shown on the demo login page | SA | labeled demo-only; remove for production deployment |
| 4 | Session-expiry acceptance uses invalidated/restarted sessions (Tomcat minute granularity) | Dev | documented; equivalent 401/re-login branch covered |

## Note

The PR merges preceded G2/G3 on user instruction; both records cite the
post-merge verification evidence and are not retroactive approvals of unverified
code.
