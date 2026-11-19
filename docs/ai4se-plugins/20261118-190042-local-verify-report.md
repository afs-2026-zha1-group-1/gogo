# Local Verify Report: us-091-dashboard-navigate-progress-fix-bug

**Date:** 2026-11-18 (UTC+08:00)  
**Root:** `D:\NGSA5\OneDrive - Orient Overseas Container Line Ltd\Documents\TATP\Bootcamp\Group Project\gogo_prod`  
**Scope:** local+evidence; independent pre-PR verification

## Summary

| Dimension | Status | Evidence |
|---|---|---|
| Build | Pass | Supplied frontend build and prior backend logs show completion; process exit values are reported, not embedded as independently captured exit metadata. |
| Static scan | Pass | Six selected commands actually executed; six individual log blocks show exit 0 and no logged grep errors. |
| Code review | Fail | A pending-write re-entry path renders unselected cards even with a stored current trip; the currently unconditional first-render scenario does not except this case. This is a source-derived conclusion, not a claimed browser reproduction. |
| Evidence (OpenSpec) | Fail | Five requirements and 35 scenarios reviewed. The normal slow-read race and previous split wording gap are addressed, but B4's pending-write case remains inconsistent with the current specification. |
| **Overall** | **Fail** | A required first-render clause is not met on the identified pending-write path. The exact combined case needs focused browser confirmation and resolution; no waiver. |

This is a new report, not a retrospective revision or waiver of
`20261118-184749-local-verify-report.md` or earlier reports. The earlier
report's A2 wording gap and normal slow-current-read gap are reassessed below,
not silently inherited. No source/specification changes, PR, deployment,
G1/G2 decision or waiver were made by the verifier.

**PR gate:** `/sdd:pr-submit` must stop on Fail without a complete
human-signed waiver. No waiver is created or self-approved here.

## Human evidence and provenance

- The requester reported that Sammi Ng, as process owner, selected the
  stage-aware V1 rule. This is a reported process approval, not G1/G2 or waiver.
- The requester separately reported that IO Emily Li and SA Sammi Ng each
  explicitly approved the member milestone revision and, separately, the
  split-fallback clarification. These are **requester-reported confirmations**,
  not direct signatures or a newly authored G1 decision; no time or
  independently verifiable record was supplied. The historical
  `g1-decision.md` alone does not establish approval of those later revisions.
  The requester reports the subsequent hash/highlight wording correction;
  no separate direct signed record for that precise wording was supplied.
- The user previously authorized runner, portability and historical path/link
  corrections as separate scope. E3 human review remains pending; none of
  these reports is an overall human QA sign-off.

## Local commands and raw results

Current static fence: `docs/feedback/verification-commands.md`. The probe
extracted `docs/ai4se-plugins/20261118-185718-local-verify-commands.txt`; all
individual blocks in `docs/ai4se-plugins/20261118-185740-local-verify-run.log`
were read. The runner's exit and its cumulative summaries are not used alone.

| Command | Source | Exit | Actual block output |
|---|---|---:|---|
| `! grep -rn "Hello World" frontend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | static whitelist | 0 | No output or logged error. |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | static whitelist | 0 | No output or logged error. |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | static whitelist | 0 | No output or logged error. |
| `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); j=sorted(d['jobs']); assert j==['backend','browser-acceptance','frontend'], j; print('ci jobs:', j)"` | static whitelist | 0 | `ci jobs: ['backend', 'browser-acceptance', 'frontend']`. |
| `python3 -c "import yaml; d=yaml.load(open('.github/workflows/ci.yml'), Loader=yaml.BaseLoader); p=d['on']['push']; assert p is None or 'branches' not in p, p; assert 'main' in d['on']['pull_request']['branches']; print('ci triggers: any-branch push + pull request to main')"` | static whitelist | 0 | `ci triggers: any-branch push + pull request to main`. |

**6 attempted, 0 failed.** Negated grep can hide errors; all named targets
exist and the corresponding log blocks have no error output. Probe reports
WSL `node` unavailable; no selected static command requires it. Separately,
`openspec validate us-091-dashboard-navigate-progress-fix-bug --strict`
was independently run and reported valid, and `git diff --check` exited 0.
No destructive whitelist command, dependency install, service stop, deletion
or browser test rerun was performed.

Supplied raw logs were read directly with PowerShell encoding detection.
The requester reported Edge, an isolated database and successful commands;
raw logs do not themselves contain independently recorded process-exit
metadata. Logs are evidence of the recorded runs, not fresh verifier runs.

| Log under `docs/ai4se-plugins/` | Observed summary | SHA-256 |
|---|---|---|
| `20261118-us091-picker-final-e2e.log` | `Running 94 tests` / `94 passed`; includes slow-read, empty-list failure, pending-write and split-fallback tests. | `1E9A75532E31E4AA2BE95CDF9F5A24D042FE7165F6F4179DA09978D9384482D2` |
| `20261118-us091-picker-unit.log` | 48 tests, 48 pass; 0 fail, cancelled, skipped or todo. | `B0F18CEEFF45A70AB534DB5F6E062F8A751A42703E7C3677CCA18D2E13F3D020` |
| `20261118-us091-picker-build.log` | `tsc --noEmit`, Vite built; 734.67 kB JS chunk, over-500-kB warning wrapped by PowerShell `NativeCommandError`. | `5CF38232ED80F53E6A3CF1E7AA56DB42BC95379133CE0E9750A29B4D890C0DF0` |
| `20261118-us091-backend-test.log` | Maven `BUILD SUCCESS`; 409 tests, 0 failures, errors or skipped. | `DC461EF77D8EED8B486678D1B2BBCC3BDBD48791286866984A25239F0FEB119F` |
| `20261118-us091-portability.log` | 8 tests, 8 pass; 0 fail, cancelled, skipped or todo. | `B0D7D5C22ED181BB282EEC52548B1B96F30814DD6FBE5C464137A8910C9485C9` |

The browser log also includes `Unable to load the current trip` as a
PowerShell `NativeCommandError` between passing malformed-current-trip tests.
`dashboard-list.spec.ts:338-363` deliberately mocks invalid/current-trip error
responses, and `App.tsx:216-220` logs that message for an invalid response.
[inference] The output is consistent with the deliberate failure path, but
the log does not conclusively bind it to a particular test; isolate console
capture if needed. Backend and portability logs predate the latest frontend
changes; the requester says those logs remain unchanged. No independently
recorded source-tree hash binds any supplied log to the current tree.

## Tasks (V1)

OpenSpec reports **8 total, 6 complete, 2 incomplete**:

| Task | Stage evidence | Current result |
|---|---|---|
| 1.1 Push branch/open PR | Governing local-verify workflow places PR submission after local verification. | Future for this run; due at handoff; not done or waived. |
| 5.2 Reconcile architecture plan | Task explicitly says “Before archive”. | Future for this run; due before archive; not done or waived. |

No unchecked currently due or ambiguously staged task was identified. V1 is
the pre-PR assessment, not a claim that the entire change is complete.

## Requirements and scenarios

`DO` = `frontend/tests/e2e/dashboard-overview.spec.ts`; `DL` =
`frontend/tests/e2e/dashboard-list.spec.ts`; `DS` =
`frontend/tests/e2e/dashboard-selected-trip.spec.ts`; `IA` =
`backend/src/test/java/com/gogo/invitation/InvitationApiTest.java`;
`CT` = `backend/src/test/java/com/gogo/trip/CurrentTripApiTest.java`;
`DP` = `frontend/tests/dashboard-progress.test.mjs`. Actual code evidence
is distinguished from tested assertions. The prior detailed mapping in
`20261118-184749-local-verify-report.md` remains historical.

| Requirement | Implementation basis | Scenarios |
|---|---|---|
| Bottom dock navigation | `frontend/src/TabBar.tsx:12-49`, `frontend/src/App.tsx:86,96-108,138-155,234-242` | A1–A6 |
| Current trip and my-trips list | `App.tsx:234-242,318-348`; `frontend/src/pages/CurrentTrip.tsx:15-96`, `TripsList.tsx:32-205` | B1–B14 |
| Invitation issuance | `backend/src/main/java/com/gogo/invitation/InvitationController.java:20-25`, `InvitationRepository.java:26-45`; `TripRepository.java:35-52,69-74` | C1–C6 |
| Invitation page entry | `frontend/src/components/TripOverview.tsx:35-44`, `frontend/src/pages/TripDetailsLegacy.tsx:53-66`, `InvitationPage.tsx:25-105`, `InvitationPanel.tsx:26-74,91-98` | D1–D6 |
| Role-specific milestones | `frontend/src/pages/dashboardProgress.ts:15-53`, `DashboardTrip.tsx:223-252`, `frontend/src/app.css:251-262` | E1–E3 |

### A — Bottom dock (6)

| ID | Evidence and residual |
|---|---|
| A1 | `TabBar.tsx:12-49` supplies ordered names/icons and route-based highlight; `DO:416-460` asserts labels and active tabs. Each icon and both dashboard-entry active states are not individually asserted. |
| A2 | Revised `app-shell/spec.md:7-13,24-29` explicitly says same-target Split keeps hash and Trips highlight; `DS:70-91` checks URL, Trips `aria-current`, Split not current and guidance. `DO:416-442` checks other hash navigation, retained window marker and identities. The prior wording conflict is resolved. |
| A3 | `App.tsx:96-108,318` maps create to Trips; `DO:454-460` checks active/back; `CreateTrip.tsx:20-46,100-120` implements date validation, not specifically asserted in that named test. |
| A4 | Revised spec permits shared no-trip guidance; `DS:70-91` tests non-dashboard fallback and `DL:409-455` checks failed, refresh and pending dashboard guards. A complete forward/reverse walk including Split is not directly asserted. |
| A5 | `DO:444-447` checks browser back/forward active tabs with surrounding identity/persistence checks. |
| A6 | `TripRepository.java:105-112` rechecks saved-trip membership; `TripApiTest.java:190-208` covers detail authorization. No browser case specifically revokes a saved trip's membership. |

### B — Current trip and list (14)

| ID | Evidence and residual |
|---|---|
| B1 | `AccountPage.tsx:90-97` links 我的行程 to `#/my-trips`; no specific browser click assertion found. |
| B2 | `TripsList.tsx` renders fields, organizer/ended markers, `.qcard` and `.empty`; `DL:40-63` checks membership and card fields. Markers and prototype visual equivalence were not independently asserted/visually compared. |
| B3 | `TripsList.tsx:83-107,175-205` updates one selected ID without navigation and has no arrow; `DL:230-246` checks selection/persistence. No explicit assertions found for no navigation, previous tag removal or no arrow. |
| B4 | `DL:248-276` holds GET current-trip until after the list response and asserts no cards until release, then one selected card: the **normal** first-render race is covered. But on re-entry while a PUT is pending, `App.tsx:325-344` remounts `TripsList` with `selectionInFlight=true`; `TripsList.tsx:32,62,121,175-198` initializes selected ID to null, skips current GET, deliberately bypasses the loading guard and renders disabled unselected cards. [inference] If an old current trip is still stored while PUT is held before reaching the server, this conflicts with the unconditional first-render tag scenario. `DL:364-398` confirms disabled cards/no second write but does not assert the selected tag or ensure an old stored trip in that test. Reproduce the combined case by pre-seeding A, holding a PUT to B before forwarding, leaving and reopening the picker, and checking A's stored ID and first card render. No such reproduction was run here. |
| B5 | `CurrentTrip.tsx:15-96`, `DS:34-52`, `DL:197-228` cover saved trip route and persistence; authorization separately API-tested. |
| B6 | `CurrentTrip.tsx:85-96`, `DS:54-68` provide empty guidance and link, without fabricated trip fields. |
| B7 | `TripRepository.java:105-124` reads/writes `app_user.current_trip_id` by user; `CT:71-82,123-130` checks persistence/account isolation and `DS:34-52` reload. Actual re-login on another device is not asserted. |
| B8 | `App.tsx:319`, `DL:137-142` cover a valid direct detail URL; `TripApiTest.java:209-214` checks missing API and `TripDetailsLegacy.tsx` handles 404. Direct missing-URL browser assertion not found. |
| B9 | `App.tsx:234-237,348` passes context-dependent `tripHref` to `Members`; `Members.tsx:147-151` renders return. Both roster-back origins not separately browser-asserted. |
| B10 | `App.tsx:318` supplies trips back; `CreateTrip.tsx:35-38,58` navigates on success; `DO:454-460` checks back. Exact successful destination not asserted in that named test. |
| B11 | `TripsList.tsx:40,65` reads list/current; `CurrentTrip.tsx:21` and `TripDetails` read current/detail. No separate cache or list-all source identified in reviewed paths; no test explicitly asserts all network sources. |
| B12 | `DL:154-196` asserts dashboard selection leaves picker selection unchanged and handles late current-trip response. |
| B13 | `DS:34-52` checks B dashboard, A details, reload and persisted A. |
| B14 | `DS:93-104` checks Trips current-trip failure, no empty state and retry. Picker failure separately has `DL:338-355`; see error-recovery warning below. |

### C — Invitation issuance (6)

| ID | Evidence |
|---|---|
| C1 | `IA:93-105`: organizer 200, token, join path, one row. |
| C2 | `IA:107-114`: same token and one row on repeated issue. |
| C3 | `IA:116-130`: member-first issue, organizer/member reuse and one row; historical denial title contrasts with authorized body. |
| C4 | `IA:132-144`: non-member 403/no token before and after issue, row counts. |
| C5 | `IA:146-157`: missing/unknown identity 401 `USER_REQUIRED`, no row. |
| C6 | `IA:159-165`: unknown trip 404 `TRIP_NOT_FOUND`. |

### D — Invitation page (6)

| ID | Evidence |
|---|---|
| D1 | `TripDetailsLegacy.tsx:53-66` renders ready-state app-bar link; `DS:167-193` creates plan-less trip and clicks as member and organizer. No retained-window-marker assertion checks no reload in this particular case. |
| D2 | `DS:174-217` checks same URL on re-entry and one DB invitation row; `IA:107-114` checks reuse. |
| D3 | `DS:207-211` clicks Back and checks same detail URL and ready heading. |
| D4 | `DS:174-217` checks member and organizer shared URL, QR and sharing; historical scenario title has denial wording but body authorizes member. |
| D5 | `DS:218-223` checks outsider denial and no URL/QR on all three entry paths; `IA:132-144` also checks denied issuance. |
| D6 | `DS:194-207` checks real clipboard content and no observed non-GET `/api/trips/` request during copy; it does not monitor unrelated URL prefixes. |

### E — Role milestones (3)

| ID | Evidence |
|---|---|
| E1 | `DO:32-52` checks organizer/member orders, invitation, removed milestones and grid widths. |
| E2 | `DP:15-47,66-72`, `DO:56-68,102-114` and `dashboardProgress.ts:15-53` exercise readiness and plan/split state mappings. |
| E3 | `DP:66-72`, `DO:32-48`, `DS:236-246` cover member joined and closed/done states. |

## Code-review highlights

- [fact] Normal picker first render waits for the current-trip GET when no
  write is pending, and `DL:248-276` asserts this with controlled delay.
  The raw 94-test log includes that passing test. The requested red run was
  reported in `tasks.md`, but no independent raw red log is claimed here.
- [fact] Pending writes deliberately prevent a second picker selection:
  `DL:364-398` asserts a disabled card and one pending PUT. The first-render
  requirement has no pending-write exception. [inference] The code path in
  B4 produces an unselected first rendered card after picker remount even
  when the server still stores A. Verify with the pre-seeded A/held PUT/re-entry
  sequence above; resolve implementation or obtain an explicitly authorized
  specification decision before a new verification. Do not equate this with
  the passing normal slow-read test.
- [fact] `TripsList.tsx:62-75` sets `selectError` on failed current reads,
  but a later successful current read does not clear it. A retry of the list
  error screen increments `reloadKey` (`:130-143`), rerunning both reads.
  [inference] If both reads initially fail, then both succeed on list retry,
  the picker can retain the obsolete current-read error. Confirm by mocking
  that failure/recovery sequence; no such focused test was found. This is
  distinct from the tested error display with an empty list.
- [fact] `app-shell/spec.md` now explicitly describes same-hash Trips highlight;
  `DS:70-91` asserts it. The prior report's A2 conflict is resolved against
  the current words, without claiming a new human gate decision.
- [fact] Issuance changes 403 code `NOT_ORGANIZER` to `NOT_A_MEMBER`.
  `InvitationPanel.tsx:52-59` handles HTTP 403 rather than that code; external
  consumers are not established (`tasks.md:28`). Identify consumers and verify
  compatibility before release.
- [fact] Earlier review classified historical process-record diff lines: 44
  files of root/cwd redactions, one executable-path redaction and five links
  to archived req-019. Archive/knowledge edits adjust fixture links, redact
  two CI roots, correct author-machine and React-hooks links, and replace a
  nonexistent optional-backlog link with explanatory text. These were expressly
  authorized; raw portability suite reports 8/8. Git history retains prior
  historical content. Runner summaries remain cumulative and PyYAML is an
  implicit prerequisite.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|---|---|---|---|---|
| V1 | Stage-aware tasks | Pass | [fact] | 6/8 complete; future 1.1 and 5.2 remain pending. |
| V2 | Requirement coverage | Fail | [inference] | Five requirements mapped; B4 unconditional first-render clause conflicts with pending-write path. Verify the controlled sequence above. |
| V3 | Scenario coverage | Fail | [inference] | 35 mapped; normal slow read tested, combined stored-A/pending-write re-entry not asserted and code indicates mismatch. Verify as above. |
| V4 | Requirement-to-implementation | Fail | [inference] | B4 pending-write first render differs from current unconditional wording; verify as above. A2 split exception now matches code/test. |
| V5 | Spec drift | Fail | [inference] | B4 pending-write case remains an implementation/spec conflict; verify as above. |
| V6 | Design follow-through | Partial | [fact] | Split fallback, invitation and progress paths match design; B4 case needs resolution. |
| V7 | Code pattern fit | Pass | [inference] | Entry and picker follow nearby component patterns; verify future changes against neighboring flows. |
| V8 | Necessity | Pass | [fact] | Product diff mapped to change; tooling and historical corrections separately authorized and reviewed. |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|---|---|---|
| E1 Machine | Pass | Six fresh command blocks and directly read supplied logs, with provenance and warnings above; not remote CI. |
| E2 AI | Fail | Independent code review finds B4 conditional mismatch; exact browser reproduction remains outstanding. |
| E3 Human | Pending | Separate role confirmations are requester-reported; no direct records or overall human QA sign-off. |

## Five-question map

| Q | Maps to | Status |
|---|---|---|
| Q1 Fully implemented? | V1–V3 | ❌ B4 pending-write re-entry mismatch; future tasks remain pending at their own stages. |
| Q2 Correctly implemented? | V4–V5 | ❌ B4 conflict; prior split hash/active conflict resolved against revised text. |
| Q3 Architecturally coherent? | V6–V7 | ⚠️ Shared patterns fit, but pending-write behavior needs resolution. |
| Q4 Only what was needed? | V8 | ✅ Separately authorized tooling/history changes identified. |
| Q5 Risk controllable? | Residuals/red lines | ⚠️ [inference] Reproduce B4 and error recovery, check external consumers and obtain required human records. |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | On picker re-entry during a held pending PUT, cards can render with no selected tag although the server still stores a current trip; B4 requires the matching tag on first render without an exception. | [inference] | `TripsList.tsx:32,62,121,175-198`; `App.tsx:325-344`; `specs/app-shell/spec.md` selected-tag scenario | Reproduce with stored A and PUT to B held before forwarding; resolve the implementation or obtain an authorized spec clarification, cover the combined case, then reverify. |

### WARNING

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Current-read error may remain after successful list/current retry. | [inference] | `TripsList.tsx:62-75,130-143` | Test initial dual failure followed by successful retry; resolve any stale error. |
| 2 | External consumers of changed invitation 403 code are unknown. | [fact] | `InvitationRepository.java:29-30`, `tasks.md:28` | Identify consumers and verify compatibility. |
| 3 | Later role confirmations are requester-reported, not direct records; E3 pending. | [fact] | Provenance above | Obtain appropriate human records and review if required; do not fabricate. |
| 4 | Build size warning and e2e console error appear in successful reported logs. | [fact] | Raw build/e2e logs | Assess bundle impact; isolate error-path output if further assurance is needed. |
| 5 | Runner summaries are cumulative; negated grep can mask errors; PyYAML prerequisite is implicit. | [fact] | Run log and whitelist | Continue checking per-command blocks; document prerequisites separately if authorized. |

### SUGGESTION

| # | Finding | Mark | Location | Action needed |
|---|---|---|---|---|
| 1 | Other inherited unasserted clauses are itemized in the A/B/D map; absence of a particular browser assertion is not automatically missing behavior. | [fact] | Scenario map | Add focused tests or equivalent review where additional assurance is needed; do not claim absent tests exist. |
| 2 | Two historical invitation scenario titles disagree with their revised bodies. | [fact] | `specs/invitations/spec.md:26,82` | Clarify via an authorized spec change. |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|---|---|---|
| 1 | Pending-write first render | Source-derived B4 conflict; exact combined browser reproduction not run in this restricted verification. | Tracking: reproduce, resolve, test and reverify. |
| 2 | Picker error recovery | Failed current read may remain displayed after successful retry. | Tracking: controlled dual-failure/recovery test. |
| 3 | External consumers and human evidence | Contract inventory and direct role records absent; E3 pending. | Tracking: owners verify consumer compatibility and necessary human records. |
| 4 | Lifecycle and machine caveats | 1.1/5.2 future; process exits reported rather than embedded; warnings present. | Tracking: perform each stage when due, assess warnings and retain raw logs. |

## Waiver

N/A — no waiver. No self-approval or gate decision was made.
