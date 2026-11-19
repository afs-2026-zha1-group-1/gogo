# Tasks

Implementation design: [design](design.md). Acceptance strategy:
[ATDD design](atdd-design.md).

## 1. P4 handoff

- [ ] 1.1 Push the change branch and open a PR, never push to main; verify its branch and PR exist. Do not merge main merely to stay current.
  - 已确认原变更分支 `us-091-dashboard-navigate-progress-fix-bug` 存在，且 [PR #172](https://github.com/afs-2026-zha1-group-1/gogo/pull/172) 已合并。该分支历史包含合并 `origin/main` 的提交 `ffe98b3`；合并原因未确认，因此暂不将整项标记完成。

## 2. Current-trip navigation

- [x] 2.1 Add failing browser coverage for dashboard → Trips, reload, distinct saved/dashboard IDs without changing the saved selection, empty selection, read failure and retry; confirm the regression is reproduced.
- [x] 2.2 Route the Trips tab through the current-trip flow and pass the focused browser tests without changing the saved selection.

## 3. Dashboard progress

- [x] 3.1 Update progress unit and browser tests for both roles and source-backed states; remove reunion and completion, show invitations to members after preferences with the organizer's joining-status derivation, and pass those tests.

## 4. Member invitations

- [x] 4.1 Add API tests for member-first issuance, shared token reuse, non-member/anonymous denial and joining cutoff; implement membership authorization and pass them.
- [x] 4.2 Write failing browser coverage, then enable member sharing in embedded and dedicated invitation views including dashboard entry; pass tests for both roles and denied outsiders.

## 4a. Expanded dashboard and plan scope

- [x] 4a.1 Add the create-trip quick entry and retain invitation and generation actions after personal preferences are ready, with joining status sourced from `joiningClosed`.
- [x] 4a.2 Permit members to generate and regenerate drafts while retaining readiness, confirmed-plan, outsider and organizer-only confirmation checks.
- [x] 4a.3 Obtain IO and SA G1 approval for the expanded generation-permission scope; the requester reported both approvals in the [G1 decision](g1-decision.md).
- [ ] 4a.4 Complete post-merge acceptance verification for both roles, invitation and plan authorization, joining closure and creation entry; record actual results in the local verification report.
  - [合并后 CI 报告](ci-report.md)记录了浏览器验收和后端测试任务成功，但现有本地验证报告仍有独立验证与完整验收证据缺口；不能仅凭 CI 任务结果关闭此项。

## 5. Integration and pre-archive

- [x] 5.1 Run focused frontend and backend tests, including existing plan/split authorization regressions, and the frontend build; review the diff for unchanged invitation lifecycle, API and data model; record results and any failures.
  - A controlled delayed current-trip read reproduced the picker first-render race; the picker now waits for the read before rendering selectable cards, while retaining disabled cards during an in-flight write and reporting read failures, including with an empty list. Frontend unit tests passed 48, the final Edge browser suite passed 94, and the build passed with the existing chunk-size warning. The same-hash split fallback now explicitly retains the Trips highlight in the app-shell specification and browser test.
  - After the requester confirmed the existing no-trip split fallback, focused browser tests passed for the shared non-dashboard empty state and dashboard guard; the full Edge browser suite passed 92 tests. The app-shell delta and ATDD now explicitly describe this exception.
  - After adding the missing pre-plan app-bar invitation entry, focused organizer/member browser coverage passed for navigation, no bottom dock, clipboard without additional writes, back and re-entry; the full Edge browser suite passed 91 tests, frontend unit tests passed 48, and the frontend build passed with the existing chunk-size warning.
  - After the member progress revision, backend `mvn -B test`: 409 passed, including plan/split authorization. The full portability suite was rerun after remediation: 8 passed. Historical failures below are retained for traceability.
  - The invitation review found no new endpoint or migration; token reuse and the joining cutoff remain in the existing paths. The outsider issuance error intentionally changes from `NOT_ORGANIZER` to `NOT_A_MEMBER`; no invitation UI consumer branches on the former, but external consumers were not established.
  - After the member progress revision: frontend `npm run test:unit`: 48 passed; `npm run build`: passed with a Vite chunk-size warning; `npm run test:e2e` using installed Edge: 91 passed. At that point backend verification and the broader review had not yet been repeated; later results are recorded above.
  - 2026-11-18: backend `mvn -B test`: 409 passed, including plan/split authorization; frontend `npm run test:unit`: 47 passed; `npm run build`: passed with a Vite chunk-size warning; `npm run test:e2e` using installed Edge: 91 passed.
  - The earlier full `node --test scripts/portability.test.mjs` run had 5 passes and 3 failures: absolute paths in old process records, broken Markdown links, and WSL Bash receiving a Windows path in the relocation test. These were subsequently remediated and retested as recorded above.
  - The changed production paths add no migration or endpoint; invitation lifecycle and join cutoff remain unchanged.
- [ ] 5.2 Obtain change-specific required CI/CD evidence and a named VL G2 decision; do not mark G2 Pass while evidence or a decision is missing.
- [ ] 5.3 Before archive, reconcile shipped capabilities, API and data model with `docs/knowledge/architecture/tech-stack-plan.md`; update only completed archived features and append `docs/knowledge/_LOG.md` if the plan changes. Record the reconciliation result.
