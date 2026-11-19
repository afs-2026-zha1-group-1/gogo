# Local Verify Report: us-091-dashboard-navigate-progress-fix-bug

**Date:** 2026-11-18 (UTC+08:00)  
**Root:** `D:\NGSA5\OneDrive - Orient Overseas Container Line Ltd\Documents\TATP\Bootcamp\Group Project\gogo_prod`  
**Scope:** local+evidence; independent pre-PR verification

## Summary

| Dimension | Status | Evidence |
|---|---|---|
| Build | Pass | Supplied prior backend and frontend logs show successful Maven/build summaries; exit 0 was previously reported, not embedded as independently captured exit metadata. |
| Static scan | Pass | All six current static whitelist command blocks independently inspected: six exit 0, no logged grep errors. |
| Code review | Partial | The new no-trip fallback and dashboard guard match the expressly reported choice; the still-unqualified hash-switching wording conflicts with the tested same-hash fallback. |
| Evidence (OpenSpec) | Partial | Five requirements and 35 scenarios reassessed; the specification wording and first-render timing require resolution/verification. |
| **Overall** | **Partial** | Not Pass: clarify the mandatory hash/active-tab clauses for the accepted fallback and verify the specified picker first render. No CRITICAL implementation defect is newly asserted from those unresolved questions. |

This is a new report, not a retrospective revision or waiver of
`20261118-180938-local-verify-report.md` or other earlier reports. That
report's A4 mismatch has been addressed **by a specification clarification**,
not a routing change. This report does not authorize or execute a PR,
deployment, G1, G2, or waiver. Partial is not Pass and is not a PR handoff.

## Provenance and human evidence

- The requester reports the user chose “保留现有共用空状态，并修改规格允许标签共用状态” after being offered that option and distinct split guidance. This explicitly covers the subsequent app-shell clarification, not a general waiver.
- The requester separately reports “两位角色均已分别明确批准” for **IO Emily Li and SA Sammi Ng** on the subsequent split-fallback clarification. No approval time, independently verifiable record, direct signatures, or new G1 decision file was supplied. These are requester-reported confirmations only; do not extend the earlier milestone confirmations to this later change or represent them as a new G1 decision.
- For the earlier invitation milestone revision, the requester separately reported explicit confirmation by each of IO Emily Li and SA Sammi Ng. The requester also reported process owner Sammi Ng's approval of the stage-aware V1 rule. Neither is a G2 or waiver. `g1-decision.md` records an earlier reported G1 decision; it does not independently approve either later revision.
- The requester expressly authorized runner, portability and historical path/link corrections as separate scope. No business implementation or spec was edited by this verifier.

## Local commands and raw results

The current first static bash fence in `docs/feedback/verification-commands.md`
was probed and run in WSL using
`docs/ai4se-plugins/20261118-184423-local-verify-commands.txt`. Full blocks
in `docs/ai4se-plugins/20261118-184442-local-verify-run.log` were inspected;
the runner's own exit and repeated cumulative summaries are not used alone.

| Command | Source | Exit | Actual block output |
|---|---|---:|---|
| `! grep -rn "Hello World" frontend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | static whitelist | 0 | No output or logged error. |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | static whitelist | 0 | No output or logged error. |
| `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); j=sorted(d['jobs']); assert j==['backend','browser-acceptance','frontend'], j; print('ci jobs:', j)"` | static whitelist | 0 | `ci jobs: ['backend', 'browser-acceptance', 'frontend']`. |
| `python3 -c "import yaml; d=yaml.load(open('.github/workflows/ci.yml'), Loader=yaml.BaseLoader); p=d['on']['push']; assert p is None or 'branches' not in p, p; assert 'main' in d['on']['pull_request']['branches']; print('ci triggers: any-branch push + pull request to main')"` | static whitelist | 0 | `ci triggers: any-branch push + pull request to main`. |

**6 attempted, 0 failed.** Targets exist; negated grep can mask errors, but
its four log blocks contain none. Probe found WSL `node` unavailable;
none of the six selected static commands requires it. Separately,
`openspec validate us-091-dashboard-navigate-progress-fix-bug --strict`
was independently run and reported the change valid; `git diff --check`
was independently run and exited 0. No destructive whitelist command,
dependency installation, service stop, deletion, or browser rerun was performed.

Supplied raw repository logs were read with PowerShell encoding detection.
The requester reported the latest 92-test run, Edge/isolated DB context for
the browser suite, and prior zero process exits; raw logs do not independently
embed those exit values. Prior runs were not repeated in this verification.

| Log under `docs/ai4se-plugins/` | Observed summary | SHA-256 |
|---|---|---|
| `20261118-us091-split-e2e.log` | `Running 92 tests` and `92 passed`; includes new fallback test `dashboard-selected-trip.spec.ts:70` and guard tests described below. | `84EB5F1EEAA5901AEB4548CC0C19E9B0293B8BE517E7B405D4E513A2A626058B` |
| `20261118-us091-backend-test.log` | Maven `BUILD SUCCESS`; 409 tests, 0 failures, errors or skipped. | `DC461EF77D8EED8B486678D1B2BBCC3BDBD48791286866984A25239F0FEB119F` |
| `20261118-us091-final-unit.log` | 48 tests, 48 pass; 0 fail, cancelled, skipped or todo. | `75E25BCEB33A7A49EB7CD3ACB735872556402B98BB88D079BBF38CD6FB7DEC84` |
| `20261118-us091-final-build.log` | `tsc --noEmit`, Vite built; 734.51 kB JS chunk, over-500-kB warning wrapped by PowerShell `NativeCommandError`. | `31EF1ABD44A2A679C3CAC7F283A8254B7F73F422E0F1D719BD7C2ABEC8C866F8` |
| `20261118-us091-portability.log` | 8 tests, 8 pass; 0 fail, cancelled, skipped or todo. | `B0D7D5C22ED181BB282EEC52548B1B96F30814DD6FBE5C464137A8910C9485C9` |

The latest browser log also includes `Unable to load the current trip` as a
PowerShell `NativeCommandError` between passing malformed-current-trip tests.
`dashboard-list.spec.ts:308-322` deliberately supplies an invalid ID and
`App.tsx:216-220` logs that message for an invalid response. [inference] This
is consistent with the deliberate error path, but the log does not conclusively
bind it to one test; isolate console capture if that distinction is required.
The requester reports no production routing change for this clarification.
Older logs are retained evidence, but no independently recorded source-tree
hash binds them to the present tree; they are not represented as fresh runs.

## Tasks (V1)

OpenSpec reports **8 total, 6 complete, 2 incomplete**:

| Task | Stage evidence | Current result |
|---|---|---|
| 1.1 Push branch/open PR | The governing local-verify workflow puts PR submission after local verification. | Future for this run; due at handoff; not done or waived. |
| 5.2 Reconcile architecture plan | Task explicitly says “Before archive”. | Future for this run; due before archive; not done or waived. |

No unchecked currently due or ambiguously staged task was identified. V1 is a
pre-PR stage assessment, not a claim that the entire change is complete.

## Requirements and scenarios

`DO` = `frontend/tests/e2e/dashboard-overview.spec.ts`; `DL` =
`frontend/tests/e2e/dashboard-list.spec.ts`; `DS` =
`frontend/tests/e2e/dashboard-selected-trip.spec.ts`; `IA` =
`backend/src/test/java/com/gogo/invitation/InvitationApiTest.java`;
`CT` = `backend/src/test/java/com/gogo/trip/CurrentTripApiTest.java`;
`DP` = `frontend/tests/dashboard-progress.test.mjs`. The detailed previous
35-scenario mapping remains in `20261118-180938-local-verify-report.md`;
the current review below revisits each, with shifted DS test lines corrected.
Code evidence is not described as an absent test.

| Requirement | Implementation basis | Scenarios |
|---|---|---|
| Bottom dock navigation | `frontend/src/TabBar.tsx:12-49`, `frontend/src/App.tsx:96-108,138-155,234-242` | A1–A6 |
| Current trip and my-trips list | `App.tsx:234-242,318-348`; `frontend/src/pages/CurrentTrip.tsx:15-96`, `TripsList.tsx:32-90,147-197` | B1–B14 |
| Invitation issuance | `backend/src/main/java/com/gogo/invitation/InvitationController.java:20-25`, `InvitationRepository.java:26-45`; `TripRepository.java:35-52,69-74` | C1–C6 |
| Invitation page entry | `frontend/src/components/TripOverview.tsx:35-44`, `frontend/src/pages/TripDetailsLegacy.tsx:53-66`, `InvitationPage.tsx:25-105`, `InvitationPanel.tsx:26-74,91-98` | D1–D6 |
| Role-specific milestones | `frontend/src/pages/dashboardProgress.ts:15-53`, `DashboardTrip.tsx:223-252`, `frontend/src/app.css:251-262` | E1–E3 |

### A — Bottom dock (6)

| ID | Evidence and residual |
|---|---|
| A1 | `TabBar.tsx:12-49` supplies ordered names/icons and route-based highlight; `DO:416-460` asserts five labels and selected active tabs. Each rendered icon and both dashboard-entry active states are not individually asserted. |
| A2 | `DO:416-442` checks hash navigation, retained window marker, active attributes and two identities, but omits Split. `specs/app-shell/spec.md:7-8,21-25` still requires hash-routed activations to change hash and highlight the newly active tab; `DS:70-88` shows Split from `#/trips` keeps `#/trips`. `App.tsx:86,105,234-242` maps that route to Trips. This conflicts with a literal unconditional A2 reading even though shared guidance is now allowed. The test does not assert `aria-current`. Confirm and explicitly reconcile the exception's hash and highlight semantics with the authorized choice. |
| A3 | `App.tsx:96-108,318` maps create to Trips; `DO:454-460` checks active/back; `CreateTrip.tsx:20-46,100-120` implements date validation, not specifically asserted in that named test. |
| A4 | Revised `app-shell/spec.md:10-12,34-39` permits shared selection guidance when no trip is available. `DS:70-88` asserts no saved trip, `#/trips` fallback, shared empty guidance and unchanged stored selection. `App.tsx:234-242` retains dashboard `#/dashboard/trip-entry` guard. `DL:369-415` tests failed/refresh and pending dashboard selection. The full log includes those tests and the fallback. The full forward/reverse walk including Split is not directly asserted. The previous report's unique-state mismatch is no longer a mismatch against A4's revised wording. |
| A5 | `DO:444-447` checks browser back/forward active tabs with surrounding identity/persistence checks. |
| A6 | `TripRepository.java:105-112` rechecks saved-trip membership; `TripApiTest.java:190-208` covers detail authorization; current/detail paths are browser-tested in DS and DL. No browser assertion specifically revokes a saved trip's membership. |

### B — Current trip and list (14)

| ID | Evidence and residual |
|---|---|
| B1 | `AccountPage.tsx:90-97` links 我的行程 to `#/my-trips`; no specific browser click assertion found. |
| B2 | `TripsList.tsx:147-197` renders fields, organizer/ended markers, `.qcard` and `.empty`; `DL:40-63` checks membership and card fields. Markers and prototype visual equivalence were not independently asserted/visually compared. |
| B3 | `TripsList.tsx:75-90,176-194` updates a single selected ID without navigation and has no arrow; `DL:230-245` checks selection and persistence, not explicit no-navigation, previous-tag removal or no-arrow assertions. |
| B4 | `TripsList.tsx:32-73` initializes `selectedId` to null and starts independent list/current reads; cards render from list readiness (`:147-197`). `CT:55-62` and `DL:230-245` cover stored selection but not its first ready render. [inference] If the list returns before current-trip, matching cards can appear without the required first-render tag. Delay only current-trip while allowing the list to resolve in a controlled browser test; compare the first visible ready list to the requirement. This is a timing risk, not a claimed observed test failure. |
| B5 | `CurrentTrip.tsx:15-96`, `DS:34-52`, `DL:197-245` cover saved trip route and persistence; authorization separately API-tested. |
| B6 | `CurrentTrip.tsx:85-96`, `DS:54-68` provide empty guidance and link, without fabricated trip fields. |
| B7 | `TripRepository.java:105-124` reads/writes `app_user.current_trip_id` by user; `CT:71-82,123-130` checks persistence/account isolation and `DS:34-52` reload. Actual re-login on another device is not asserted. |
| B8 | `App.tsx:319`, `DL:137-142` cover a valid direct detail URL; `TripApiTest.java:209-214` checks missing API and `TripDetailsLegacy.tsx:35-44,77-89` handles 404. Direct missing-URL browser assertion not found. |
| B9 | `App.tsx:234-237,348` passes context-dependent `tripHref` to `Members`; `Members.tsx:147-151` renders return. Both roster-back origins not separately browser-asserted. |
| B10 | `App.tsx:318` supplies trips back; `CreateTrip.tsx:35-38,58` navigates on success; `DO:454-460` checks back. Exact successful destination not asserted in that named test. |
| B11 | `TripsList.tsx:40,63` reads list/current; `CurrentTrip.tsx:21` and `TripDetails` read current/detail. No separate cache or list-all source identified in reviewed paths; no test explicitly asserts all network sources. |
| B12 | `DL:154-196` asserts dashboard selection leaves picker selection unchanged and handles late current-trip response. |
| B13 | `DS:34-52` checks B dashboard, A details, reload and persisted A. |
| B14 | `DS:91-102` checks current-trip failure, no empty state and retry. |

### C — Invitation issuance (6)

| ID | Evidence |
|---|---|
| C1 | `IA:93-105`: organizer 200, token, join path, one row. |
| C2 | `IA:107-114`: same token and one row on repeated issue. |
| C3 | `IA:116-130`: member-first issue, organizer/member reuse and one row; historical denial title contrasts with the authorized body. |
| C4 | `IA:132-144`: non-member 403/no token before and after issue, row counts. |
| C5 | `IA:146-157`: missing/unknown identity 401 `USER_REQUIRED`, no row. |
| C6 | `IA:159-165`: unknown trip 404 `TRIP_NOT_FOUND`. |

### D — Invitation page (6)

| ID | Evidence |
|---|---|
| D1 | `TripDetailsLegacy.tsx:53-66` renders ready-state app-bar link; `DS:165-191` creates a plan-less trip and clicks it as both member and organizer. The latest full log includes this test. No explicit retained-window-marker assertion checks no reload in this particular case. |
| D2 | `DS:172-215` checks same URL on re-entry and one DB invitation row; `IA:107-114` checks reuse. |
| D3 | `DS:205-209` clicks Back and checks same detail URL and ready heading. |
| D4 | `DS:172-215` checks member and organizer shared URL, QR and sharing; historical scenario title has denial wording but body authorizes member. |
| D5 | `DS:216-221` checks outsider denial and no URL/QR on all three entry paths; `IA:132-144` also checks denied issuance. |
| D6 | `DS:192-205` checks real clipboard content and no observed non-GET `/api/trips/` request during copy; it does not monitor unrelated URL prefixes. |

### E — Role milestones (3)

| ID | Evidence |
|---|---|
| E1 | `DO:32-52` checks organizer/member orders, invitation, removed milestones and grid widths. |
| E2 | `DP:15-47,66-72`, `DO:56-68,102-114` and `dashboardProgress.ts:15-53` exercise readiness and plan/split state mappings. |
| E3 | `DP:66-72`, `DO:32-48`, `DS:234-244` cover member joined and closed/done states. |

## Code-review highlights

- [fact] The new test codifies the user-selected non-dashboard fallback and confirms the stored current-trip selection remains null; it does not assert that no write request was sent. The `design.md` decision and ATDD E6 also preserve the dashboard guard. The full raw run logs the new case and failed/refresh/pending dashboard guard cases; the requester additionally reports focused 4/4 but no separate focused raw log was supplied.
- [fact] `app-shell/spec.md` revised the distinct-**state** clause but retained the unconditional hash-switching requirement and A2 expectation. The tested same-hash fallback cannot change the hash when Split is clicked from `#/trips`; the route maps to Trips. [inference] The intended scope of that exception for hash switching and active-tab highlight is not explicit. Obtain owner clarification and align the spec and tests with the chosen shared state, without inventing authorization for an implementation change.
- [fact] The pre-plan invitation app-bar fix remains in `TripDetailsLegacy.tsx:53-66`; current full E2E log includes the organizer/member sharing test. Outsider denial and no-extra-copy-write assertions remain present.
- [fact] Issuance changes 403 code `NOT_ORGANIZER` to `NOT_A_MEMBER`. In-repo `InvitationPanel.tsx:52-59` handles HTTP 403 rather than that code; external consumers are not established (`tasks.md:28`). Identify consumers and verify compatibility before release.
- [fact] Earlier review classified all changed historical process-record diff lines: 44 files of root/cwd redactions, one executable-path redaction and five links to an archived req-019 location. Archive/knowledge edits adjust fixture links, redact two CI roots, correct author-machine and React-hooks links, and replace a nonexistent optional-backlog link with explanatory text. These were expressly authorized; raw portability suite reports 8/8. Git history retains prior historical content.
- [fact] Runner copies isolate child stdin; earlier orchestration reported the helper suite and stdin-consumption regression passed, including a prior red result. No independent raw helper-suite log is claimed here. The static workflow checks require PyYAML, implicit in the prerequisite paragraph; runner summaries remain cumulative.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|---|---|---|---|---|
| V1 | Stage-aware tasks | Pass | [fact] | 6/8 complete; future 1.1 and 5.2 remain pending. |
| V2 | Requirement coverage | Partial | [fact] | Five requirements mapped; A2's mandatory wording versus the chosen same-hash fallback is unresolved. |
| V3 | Scenario coverage | Partial | [inference] | All 35 mapped; A2 requires clarification and B4 first-render timing requires a controlled delayed-current-response test. |
| V4 | Requirement-to-implementation | Partial | [fact] | A4 shared guidance now matches revision, while A2's unconditional hash clause remains in tension with the tested fallback. |
| V5 | Spec drift | Partial | [inference] | Resolve A2 hash/active wording against owner intent; compare actual URL and `aria-current` in fallback test. |
| V6 | Design follow-through | Pass | [fact] | Shared non-dashboard fallback and dashboard guard match design and E6; no production routing change was reported. |
| V7 | Code pattern fit | Pass | [inference] | Invitation entry follows existing hash link/ready-state patterns; verify future changes against neighboring flows. |
| V8 | Necessity | Pass | [fact] | Product diff mapped to change; tooling and historical corrections separately authorized and reviewed. |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|---|---|---|
| E1 Machine | Pass | Six fresh command blocks and directly read supplied logs, with provenance and warnings above; not remote CI. |
| E2 AI | Partial | Independent review identifies A2 wording conflict and B4 timing evidence gap. |
| E3 Human | Pending | Separate role confirmations are requester-reported; no direct records or overall human QA sign-off. |

## Five-question map

| Q | Maps to | Status |
|---|---|---|
| Q1 Fully implemented? | V1–V3 | ⚠️ No new A4 distinct-state conflict under revised wording; B4 first-render timing not verified and future lifecycle tasks remain pending. |
| Q2 Correctly implemented? | V4–V5 | ⚠️ A2 hash/active wording must be reconciled with expressly chosen fallback. |
| Q3 Architecturally coherent? | V6–V7 | ✅ Reviewed design and existing patterns match the selected fallback; spec-level A2 tension is recorded under Q2. |
| Q4 Only what was needed? | V8 | ✅ Separately authorized tooling/history changes identified. |
| Q5 Risk controllable? | Residuals/red lines | ⚠️ [inference] Verify external error-code consumers, picker timing and required human records; use contract inventory, delayed-response browser test and human review. |

## Findings

### CRITICAL

None established. This does not turn Partial into Pass or complete future tasks.

### WARNING

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Unconditional hash-change/new-active-tab language is not explicitly excepted for the tested same-hash Split fallback. | [fact] | `specs/app-shell/spec.md:7-12,21-25,33-37`; `DS:70-88`; `App.tsx:86,105,234-242` | Owner to clarify the selected fallback's hash and active-highlight semantics, align spec/test accordingly, then reverify. |
| 2 | Picker first-ready-render tag may be absent when current read is slower than list read. | [inference] | `TripsList.tsx:32-73,147-197`; B4 | Delay current-trip response only and inspect first ready render; resolve any observed requirement mismatch. |
| 3 | External consumers of changed invitation 403 code are unknown. | [fact] | `InvitationRepository.java:29-30`, `tasks.md:28` | Identify consumers and verify compatibility. |
| 4 | Role confirmations for both later revisions are requester-reported, not direct records; E3 pending. | [fact] | Provenance above | Obtain appropriate human records and review if required; do not fabricate. |
| 5 | Build size warning and e2e console error appear in successful reported logs. | [fact] | Raw build/e2e logs | Assess bundle impact; isolate error-path output if further assurance is needed. |
| 6 | Runner summaries are cumulative; negated grep can mask errors; PyYAML prerequisite is implicit. | [fact] | Run log and whitelist | Continue checking per-command blocks; document prerequisites separately if authorized. |

### SUGGESTION

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Other inherited unasserted clauses are itemized in the A/B/D map; absence of a particular browser assertion is not automatically missing behavior. | [fact] | Scenario map | Add focused tests or equivalent review where additional assurance is needed; do not claim absent tests exist. |
| 2 | Two historical invitation scenario titles disagree with their revised bodies. | [fact] | `specs/invitations/spec.md:26,82` | Clarify via an authorized spec change. |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|---|---|---|
| 1 | A2 hash/active-tab requirement | Same-hash accepted fallback conflicts with unconditional wording; chosen behavior is clear but exception scope is not. | Tracking: owner clarification, spec/test reconciliation and fresh verification. |
| 2 | Picker first-render timing and other unasserted clauses | B4 reads are concurrent; exact gaps itemized above. | Tracking: controlled browser checks where necessary; prototype visuals not compared. |
| 3 | External consumers and human evidence | Contract inventory and direct role records absent; E3 pending. | Tracking: owners verify consumer compatibility and necessary human records. |
| 4 | Lifecycle and machine caveats | 1.1/5.2 future; process exits reported rather than embedded; warnings present. | Tracking: perform each stage when due, assess warnings and retain raw logs. |

## Waiver

N/A — no waiver. No self-approval or gate decision was made.
