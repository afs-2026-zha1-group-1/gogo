# Local Verify Report: us-091-dashboard-navigate-progress-fix-bug

**Date:** 2026-11-18 (UTC+08:00)  
**Root:** `D:\NGSA5\OneDrive - Orient Overseas Container Line Ltd\Documents\TATP\Bootcamp\Group Project\gogo_prod`  
**Scope:** local+evidence; independent pre-PR verification  
**Change:** `us-091-dashboard-navigate-progress-fix-bug`

## Summary

| Dimension | Status | Reason |
|---|---|---|
| Build | Pass | Supplied post-fix frontend build and applicable backend Maven logs show completion; process exits reported as 0. Build warning below. |
| Static scan | Pass | Six selected commands actually executed; six individual blocks show exit 0 and no logged grep errors. |
| Code review | Fail | A no-current-trip split-tab route aliases the Trips tab, contrary to the unique tab state requirement. This is a source-derived finding, not a claimed browser reproduction. |
| Evidence (OpenSpec) | Fail | The earlier invitation-entry divergence is resolved by the observed post-fix test, but A4 exposes a required behavior mismatch. Other unasserted conditions and human/consumer limitations remain explicit. |
| **Overall** | **Fail** | A currently applicable required scenario has a source-demonstrated route conflict. No waiver. |

This is a fresh verification, not a revision or waiver of any prior report.
The earlier reports, including `20261118-175652-local-verify-report.md`, remain
historical. The current fail is not inherited from them.

**PR gate:** `/sdd:pr-submit` must stop on Fail without a complete
human-signed waiver. This report creates no waiver, PR, deployment, G1, G2,
or other gate decision.

## Provenance and stage

- The requester reported that Sammi Ng, as process owner, selected “作为流程负责人，批准调整验证规则：明确区分当前到期任务与未来阶段任务，并重新独立验证”. This is reported process approval, not a waiver or G1/G2 decision.
- The requester reported “IO Emily Li 和 SA Sammi Ng 均已分别明确批准” the invitation milestone revision. These are separately **requester-reported** confirmations, not direct signatures or independently verifiable records; no time or new G1 decision file was supplied. The historical `g1-decision.md` alone does not establish approval of this later revision.
- The user authorized the runner, portability and historical path/link corrections as separate scope. No business source or specification was changed during this verification.

## Local commands and evidence

The current static fence in `docs/feedback/verification-commands.md` was run
in WSL using commands file
`docs/ai4se-plugins/20261118-180407-local-verify-commands.txt`. Full individual
blocks in `docs/ai4se-plugins/20261118-180429-local-verify-run.log` were read;
runner process exit and its cumulative summaries were not used as substitutes.

| Command | Source | Exit | Actual block output |
|---|---|---:|---|
| `! grep -rn "Hello World" frontend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | static whitelist | 0 | No output or logged error. |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | static whitelist | 0 | No output or logged error. |
| `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); j=sorted(d['jobs']); assert j==['backend','browser-acceptance','frontend'], j; print('ci jobs:', j)"` | static whitelist | 0 | `ci jobs: ['backend', 'browser-acceptance', 'frontend']`. |
| `python3 -c "import yaml; d=yaml.load(open('.github/workflows/ci.yml'), Loader=yaml.BaseLoader); p=d['on']['push']; assert p is None or 'branches' not in p, p; assert 'main' in d['on']['pull_request']['branches']; print('ci triggers: any-branch push + pull request to main')"` | static whitelist | 0 | `ci triggers: any-branch push + pull request to main`. |

**6 attempted; 0 failed.** Negated grep can hide grep errors: all named targets
exist and their blocks contain no errors. The runner's displayed summaries
repeat the start of the cumulative log, so individual blocks were checked.
`git diff --check` was also independently run, exit 0. No destructive whitelist
command, package install, service stop, or deletion was performed.

The following raw logs were supplied in the repository and read directly; their
process exit codes are requester-reported, not independently embedded exit
metadata. They were not rerun by this verifier, as requested. Edge and isolated
test database were reported by the requester.

| Log under `docs/ai4se-plugins/` | Reported exit | Observed summary | SHA-256 |
|---|---:|---|---|
| `20261118-us091-backend-test.log` | 0 | Maven `BUILD SUCCESS`; 409 tests, 0 failures, errors or skipped. | `DC461EF77D8EED8B486678D1B2BBCC3BDBD48791286866984A25239F0FEB119F` |
| `20261118-us091-final-unit.log` | 0 | 48 tests, 48 pass; 0 fail, cancelled, skipped or todo. | `75E25BCEB33A7A49EB7CD3ACB735872556402B98BB88D079BBF38CD6FB7DEC84` |
| `20261118-us091-final-build.log` | 0 | `tsc --noEmit`, Vite built; 734.51 kB JS chunk, over-500-kB warning wrapped by PowerShell `NativeCommandError`. | `31EF1ABD44A2A679C3CAC7F283A8254B7F422E0F1D719BD7C2ABEC8C866F8` |
| `20261118-us091-final-e2e.log` | 0 | 91 passed, including sharing test `dashboard-selected-trip.spec.ts:144`; log also has Vite `Unable to load the current trip`, wrapped as `NativeCommandError`. | `7FBEA31E977CD2535E3D1C3028EDBEB362A35338481FA4368F5566F92084D88A` |
| `20261118-us091-portability.log` | 0 | 8 tests, 8 pass; 0 fail, cancelled, skipped or todo. | `B0D7D5C22ED181BB282EEC52548B1B96F30814DD6FBE5C464137A8910C9485C9` |

The console error occurs adjacent to the passing malformed-current-trip tests:
`dashboard-list.spec.ts:308-322` deliberately mocks a string trip ID;
`App.tsx:216-220` logs this message on an invalid response. [inference] The
error is consistent with that deliberate path, but the log alone does not
bind it conclusively to a specific test; verify with isolated error-path
capture if necessary. Backend and portability logs predate the final frontend
fix and are applicable on the requester's statement that their relevant code
did not subsequently change; they do not prove a fresh post-fix rerun. Strict
OpenSpec validation was reported passed, not independently rerun here.

## Tasks (V1)

OpenSpec reports **8 total, 6 complete, 2 incomplete**. Task 1.1 is the PR
branch/handoff: the governing local-verify workflow explicitly precedes PR
submission, so it is future for this run, due at handoff. Task 5.2 explicitly
says “Before archive”, so it is future for this run and due before archive.
Neither is complete or waived. No currently due unchecked or ambiguously
staged task was found; this is not a claim that the change is complete.

## Five requirements and 35 scenarios

`DO` = `frontend/tests/e2e/dashboard-overview.spec.ts`; `DL` =
`frontend/tests/e2e/dashboard-list.spec.ts`; `DS` =
`frontend/tests/e2e/dashboard-selected-trip.spec.ts`; `IA` =
`backend/src/test/java/com/gogo/invitation/InvitationApiTest.java`;
`CT` = `backend/src/test/java/com/gogo/trip/CurrentTripApiTest.java`;
`DP` = `frontend/tests/dashboard-progress.test.mjs`. “Tested” identifies
assertions actually found; code evidence is not represented as a browser test.

| Requirement | Implementation basis | Scenarios |
|---|---|---|
| Bottom dock navigation | `frontend/src/TabBar.tsx:12-49`, `frontend/src/App.tsx:96-108,138-155,234-242` | A1–A6 |
| Current trip and my-trips list | `App.tsx:234-242,318-348`; `frontend/src/pages/CurrentTrip.tsx:15-96`, `TripsList.tsx:40-90,147-197` | B1–B14 |
| Invitation issuance | `backend/src/main/java/com/gogo/invitation/InvitationController.java:20-25`, `InvitationRepository.java:26-45`; `TripRepository.java:35-52,69-74` | C1–C6 |
| Invitation page entry | `frontend/src/components/TripOverview.tsx:35-44`, `frontend/src/pages/TripDetailsLegacy.tsx:53-66`, `InvitationPage.tsx:25-105`, `InvitationPanel.tsx:26-74,91-98` | D1–D6 |
| Role-specific milestones | `frontend/src/pages/dashboardProgress.ts:15-53`, `DashboardTrip.tsx:223-252`, `frontend/src/app.css:251-262` | E1–E3 |

### A — Bottom dock (6)

| ID | Evidence and remaining clause |
|---|---|
| A1 | `TabBar.tsx:12-49` supplies ordered names and icon mappings; `DO:416-460` asserts five labels and active tabs. Individual rendered icons and both dashboard-entry active states are not individually asserted. |
| A2 | `DO:416-442` checks hash switching, retained window marker, active attributes and two account identities; Split is explicitly allowed to use its path route. |
| A3 | `App.tsx:96-108,318` maps create to Trips; `DO:454-460` checks active/back. `CreateTrip.tsx:20-46,100-120` implements date validation; no specific unchanged-validation assertion found in that test. |
| A4 | **Mismatch:** `App.tsx:149-155,234-242` clears dashboard context on `#/trips`; with no current/last trip, both Trips and Split resolve to `#/trips`. `TabBar.tsx:36-48` renders both as links, and route ownership maps `trips-current` to Trips. Thus activating Split from this state cannot yield its own unique visible heading/state or active tab. `DO:428-453` does not walk Split. [inference] Reproduce with a signed-in account having no saved current trip: open Trips, then click Split; inspect URL, active tab and visible state. |
| A5 | `DO:444-447` checks browser back/forward active tabs with surrounding identity/persistence checks. |
| A6 | `TripRepository.java:105-112` rechecks membership on saved-current read; details API authorization is covered by `TripApiTest.java:190-208`; `DS:34-81,106-116` and `DL:197-214` exercise the current/detail flows. A browser case revoking a saved trip's membership is not asserted. |

### B — Current trip and list (14)

| ID | Evidence and remaining clause |
|---|---|
| B1 | `AccountPage.tsx:90-97` links 我的行程 to `#/my-trips`; no found browser click assertion for this specific entry. |
| B2 | `TripsList.tsx:147-197` renders fields, organizer/ended markers, `.qcard` and `.empty`; `DL:40-63` checks membership and card fields. Marker rendering and visual equivalence to the prototype were not independently asserted/visually compared. |
| B3 | `TripsList.tsx:75-90,176-194` updates one selected ID via PUT without navigation and has no arrow; `DL:230-245` checks selection and persistence. No explicit assertions for no navigation, previous tag removal or no arrow. |
| B4 | `TripsList.tsx:55-73,176-194` reads one stored ID and compares each card with it; `CT:55-62`, `DL:230-245` cover stored selection. First-render uniqueness is not separately asserted. List and current-trip reads are independent and `selectedId` starts null: [inference] a fast list response may display cards before the selected tag. Verify by delaying only the current-trip response and observing the first ready render. |
| B5 | `CurrentTrip.tsx:15-96`, `DS:34-52`, `DL:197-245` cover saved trip route and persistence; authorization is separately API-tested. |
| B6 | `CurrentTrip.tsx:85-96`, `DS:54-68` show empty guidance and link, without fabricated trip fields. |
| B7 | `TripRepository.java:105-124` reads/writes `app_user.current_trip_id` by user; `CT:71-82,123-130` checks persistence/account isolation and `DS:34-52` reload. Actual re-login on another device is not asserted. |
| B8 | `App.tsx:319`, `DL:137-142` cover a valid direct detail URL; `TripApiTest.java:209-214` checks missing API and `TripDetailsLegacy.tsx:35-44,77-89` handles 404. A direct missing-URL browser assertion was not found. |
| B9 | `App.tsx:234-237,348` passes context-dependent `tripHref` to `Members`; `Members.tsx:147-151` renders return. Both roster-back origins are not independently browser-asserted. |
| B10 | `App.tsx:318` supplies trips back link, `CreateTrip.tsx:35-38,58` navigates on success; `DO:454-460` checks back. The exact successful destination is not asserted in that named test. |
| B11 | `TripsList.tsx:40,63` reads list/current; `CurrentTrip.tsx:21` and `TripDetails` read current/detail. No separate cache or list-all source was identified in reviewed paths; no test explicitly asserts all network sources. |
| B12 | `DL:154-196` asserts dashboard selection leaves picker selection unchanged and handles late current-trip response. |
| B13 | `DS:34-52` checks B dashboard, A details, reload and persisted A. |
| B14 | `DS:70-81` checks current-trip failure, no empty state and retry. |

### C — Invitation issuance (6)

| ID | Evidence |
|---|---|
| C1 | `IA:93-105`: organizer 200, token, join path, one row. |
| C2 | `IA:107-114`: same token and one row on repeated issue. |
| C3 | `IA:116-130`: member-first issuance, organizer/member reuse and one row; scenario title retains historical denial wording while body authorizes member. |
| C4 | `IA:132-144`: non-member 403/no token before and after issue, row counts. |
| C5 | `IA:146-157`: missing/unknown identity 401 `USER_REQUIRED`, no row. |
| C6 | `IA:159-165`: unknown trip 404 `TRIP_NOT_FOUND`. |

### D — Invitation page (6)

| ID | Evidence |
|---|---|
| D1 | `TripDetailsLegacy.tsx:53-66` now renders ready-state app-bar link; `DS:144-170` creates a plan-less trip and clicks it as both member and organizer. This resolves the specific legacy app-bar absence recorded in the previous report. |
| D2 | `DS:151-194` checks the same URL on re-entry and one DB invitation row; `IA:107-114` checks token reuse. |
| D3 | `DS:184-188` clicks Back, checks same detail URL and ready trip heading. |
| D4 | `DS:151-194` checks member and organizer shared URL, QR and sharing; historical scenario title has denial wording but body authorizes member. |
| D5 | `DS:195-200` checks outsider denial and no URL/QR on all three entry paths; `IA:132-144` also checks denied issuance. |
| D6 | `DS:171-184` grants clipboard permission, checks real clipboard content and no observed non-GET `/api/trips/` request during the copy action. This does not claim to monitor unrelated URL prefixes. |

### E — Role milestones (3)

| ID | Evidence |
|---|---|
| E1 | `DO:32-52` checks organizer/member orders, invitation, removed milestones and grid widths. |
| E2 | `DP:15-47,66-72`, `DO:56-68,102-114` and `dashboardProgress.ts:15-53` exercise readiness and plan/split state mappings. |
| E3 | `DP:66-72`, `DO:32-48`, `DS:213-223` cover member joined and closed/done states. |

## Code-review highlights

- [fact] The new pre-plan entry is limited to ready details and uses the existing dedicated invitation hash route. The supplied post-fix full browser log includes the expanded test; it records 91 passed. It does not independently establish a red run before the fix; the requester reported that history.
- [fact] For A4, `tripsHref` is always `#/trips`, and `splitHref` becomes that same string when `lastTripId` is null and `dashboardContext` is false. Arrival at `trips-current` clears dashboard context; a missing saved trip resolves to null. The existing dock test omits Split. [inference] This conflicts with the required unique state for each tab in the no-current-trip forward walk. Reproduce in a browser with an account without a current trip and add a full forward/reverse regression before claiming resolution.
- [fact] Issuance changes the 403 code from `NOT_ORGANIZER` to `NOT_A_MEMBER`. The in-repo `InvitationPanel.tsx:52-59` handles HTTP 403 rather than that code; external consumers are not established (`tasks.md:28`). Check external contracts before release.
- [fact] Prior detailed review classified changed historical process-record diff lines: 44 files of root/cwd redactions, one executable-path redaction and five links to an archived req-019 location. Archive/knowledge edits adjust fixture links, redact two CI roots, correct author-machine and React-hooks links, and replace a nonexistent optional-backlog link with explanatory text. These were expressly authorized; the raw portability suite reports 8/8. Git history retains prior historical content.
- [fact] Both runner copies isolate child stdin; the previous orchestration report said the helper suite and stdin-consumption regression passed, including a prior red result. No independent raw helper-suite log is claimed here. The static workflow checks require PyYAML, which is not stated in the prerequisite paragraph.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|---|---|---|---|---|
| V1 | Stage-aware task completion | Pass | [fact] | 6/8 complete; 1.1 and 5.2 explicitly future and still pending. |
| V2 | Requirement coverage | Fail | [inference] | Five mapped; A4's no-current-trip Split alias conflicts with required distinct tab states. Reproduce as specified above. |
| V3 | Scenario coverage | Fail | [inference] | All 35 mapped; A4 conflict. Exact other unasserted clauses are distinguished from demonstrated absence above; controlled B4 first-render test is recommended. |
| V4 | Requirement-to-implementation | Fail | [inference] | Source-derived A4 conflict; reproduce with no current trip. Invitation D1–D6 are supported by post-fix code/tests. |
| V5 | Spec drift | Fail | [inference] | A4 drift; reproduce as above. Invitation C3/D4 titles retain historical wording opposite to their bodies. |
| V6 | Design follow-through | Partial | [fact] | Core shared mechanisms and invitation entry reviewed; A4 remains unresolved, so full coherence is not claimed. |
| V7 | Code pattern fit | Pass | [inference] | New entry follows existing hash link and ready-state patterns; verify future changes against adjacent flows. |
| V8 | Necessity | Pass | [fact] | Product diff mapped to change; runner/portability/historical edits separately user-authorized and reviewed as above. |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|---|---|---|
| E1 Machine | Pass | Six current command blocks and five supplied raw logs, with reported exit provenance and warnings above. This is local evidence, not remote CI. |
| E2 AI | Fail | Independent code review and 35-scenario mapping identify A4 mismatch; unasserted clauses are explicitly qualified. |
| E3 Human | Pending | Requester-reported process and role confirmations are not direct records; no overall human QA sign-off. |

## Five-question map

| Q | Maps to | Status |
|---|---|---|
| Q1 Fully implemented? | V1–V3 | ❌ A4 conflict; lifecycle tasks remain pending at their appropriate future stages. |
| Q2 Correctly implemented? | V4–V5 | ❌ A4 conflict; D1 legacy invitation entry now has post-fix test evidence. |
| Q3 Architecturally coherent? | V6–V7 | ⚠️ Shared patterns fit, but route conflict needs resolution. |
| Q4 Only what was needed? | V8 | ✅ Separately authorized tooling/history changes identified. |
| Q5 Risk controllable? | Residuals/red lines | ⚠️ [inference] External error-code consumers, human evidence and untested timing need follow-up; use consumer inventory, human records and controlled browser checks. |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | No-current-trip Split and Trips alias the same hash and visible state after entering Trips, conflicting with the required distinct tab walk. | [inference] | `App.tsx:149-155,234-242`, `TabBar.tsx:36-48`, `specs/app-shell/spec.md` A4 | Reproduce as described, resolve the behavior against the approved requirement, add forward/reverse no-current-trip coverage, then rerun independent verification. |

### WARNING

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Picker's independent reads may expose an untagged first ready render before current-trip read completes. No controlled browser assertion was found. | [inference] | `TripsList.tsx:32-73` | Delay the current-trip read in a browser test and inspect first ready render against B4. |
| 2 | External consumers of changed invitation 403 code are unknown. | [fact] | `InvitationRepository.java:29-30`, `tasks.md:28` | Identify consumers and verify compatibility. |
| 3 | Revision role confirmations are requester-reported, not direct records; E3 remains pending. | [fact] | Provenance above | Obtain appropriate human records and review if required; do not fabricate. |
| 4 | Build size warning and e2e console error are present in successful reported logs. | [fact] | Final build/e2e logs | Assess bundle impact; isolate error-path output if further assurance is needed. |
| 5 | Runner summaries are cumulative; negated grep can mask errors; PyYAML prerequisite is implicit. | [fact] | Run log and whitelist | Continue checking per-command blocks; document prerequisites separately if authorized. |

### SUGGESTION

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Other unasserted inherited clauses remain as itemized in A/B above, without an established missing implementation except A4 and possible B4 timing. | [fact] | Scenario map | Add focused tests or equivalent review where additional assurance is desired; do not mistake code review for an existing test. |
| 2 | Two historical invitation scenario titles disagree with their revised bodies. | [fact] | `specs/invitations/spec.md:26,82` | Clarify via an authorized spec change. |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|---|---|---|
| 1 | Split tab no-current-trip route | A4 source conflict; browser reproduction not run in this restricted verification. | Tracking: reproduce, resolve, test and reverify. |
| 2 | First-render selection timing and other unasserted clauses | B4 concurrent reads and scenario-specific assertion limitations above. | Tracking: controlled browser checks where necessary; prototype visuals not compared. |
| 3 | External consumers and human evidence | Contract inventory and direct role records absent; E3 pending. | Tracking: owners to verify consumer compatibility and required human records. |
| 4 | Lifecycle and machine caveats | 1.1/5.2 future; process exits reported; warnings present. | Tracking: execute stages when due; assess warnings and retain raw logs. |

## Waiver

N/A — no waiver. No self-approval or gate decision was made.
