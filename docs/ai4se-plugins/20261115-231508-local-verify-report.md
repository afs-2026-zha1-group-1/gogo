# Local Verify Report: req-004-split-planning-chain

**Date:** 2026-11-15 (timezone: UTC+08:00)
**Root:** `D:\study\gogo`
**Scope:** local+evidence
**Change id:** `req-004-split-planning-chain`

P4 verification run for the split-planning chain (REQ-004 draft start, REQ-005
boundary selection, REQ-006 group route generation, REQ-007 reunion timing, plus
split draft detail read). REQ-002's report
(`20261113-162526-local-verify-report.md`) is **not** inherited: it describes the
greeting JSON/SQLite endpoint only. Every dimension below was re-executed fresh
against the splits contract, the V2 migration and the new frontend stack.

Branch `sdd-req-004-split-planning`, HEAD `60c105c` (P3 artifacts); the P4 working
tree is **uncommitted** (single stage commit is deferred until P4 completes, and
push requires explicit user authorization plus a security scan).

Decision checkpoints: `20261115-225423-local-verify-report-checkpoints.md`
(C1–C2 `skipped-preanswered`, Probe, Run).

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Partial |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | **Partial** |

**PR gate:** Partial → `/sdd:pr-submit` is blocked until the open items below are
closed (remote CI 8.5, G2/E3 9.3). No Waiver is used or needed — Partial is not
Fail. Agents must not self-approve Waiver or E3.

Why Overall is **Partial**, against the aggregation rules:

1. **Local build/runtime/system are green.** `mvn -B test` → `Tests run: 91,
   Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`; `npm ci` → 48 packages,
   `found 0 vulnerabilities`; `npm run build` → `tsc -b && vite build`, 91 modules,
   `dist/` produced; greeting regression → GET 200 bare JSON + POST/PUT/DELETE 405.
   4 of 5 whitelist Static reverse checks exit 0.
2. **Static scan is Partial, not Pass.** The 5th whitelist command
   `python -c "import yaml; …assert j==['backend','frontend']…"` failed with
   `ModuleNotFoundError: No module named 'yaml'` (python3 present, pyyaml module
   absent). This is a **tool gap, not a code defect**. Its intent (CI has exactly
   two jobs) was verified by a node structural equivalent (`JOBS=2
   ["backend","frontend"]`, push/PR both `main`) plus a direct `ci.yml` read. Per
   the rule "required tools missing → never Pass", Static stays Partial. It is
   **non-blocking**: the assertion goal is covered by the equivalent.
3. **Evidence is Partial, not Pass.** V1 = 33/36; three process tasks are open
   (8.5 remote CI pending PR, 9.3 G2 NOT RECORDED pending VL, 9.4 P5). E3 Human is
   Pending. Remote CI is unverified (unpushed). V2–V8 all Pass.
4. **No CRITICAL and no blocking local Fail.** The single runner failure is a
   disclosed tool gap with equivalent coverage, not a defect in the change.

What would make Overall Pass: install pyyaml (or accept the node equivalent as the
whitelist authority), push the commit (user-authorized + security-scanned), obtain
fresh remote CI two-job green, and obtain a named G2 (VL) sign-off. Then re-record.

## Local commands

Runner-executed whitelist (source `docs/feedback/verification-commands.md`,
extracted to `20261115-225436-local-verify-commands.txt`, run log
`20261115-225501-local-verify-run.log`). The probe extracts only the **first** bash
fence (Static layer, 5 commands); the Runtime/System fences are not runner-covered
(WARNING 4).

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | whitelist Static | 0 | No hard-coded greeting in frontend source |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | whitelist Static | 0 | No ORM dependency |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | whitelist Static | 0 | No H2 dependency, driver class or JDBC URL |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | whitelist Static | 0 | No corporate registry host in the lockfile |
| `python -c "import yaml; …assert j==['backend','frontend']…"` | whitelist Static | 1 | `ModuleNotFoundError: No module named 'yaml'` (tool gap). Intent verified via the node equivalent below |

Runner totals: `commands_attempted:5`, `commands_failed:1` (tool gap, non-blocking).

Runtime, System and the Static equivalent, executed manually. `mvn` is not on the
Git Bash PATH (`probe tool:mvn:no`), so Runtime used a reliable PowerShell prefix
(IntelliJ Maven on PATH + `Windows-ROOT` truststore + `-XX:+EnableDynamicAgentLoading`);
this is a disclosed invocation deviation (WARNING 5), the commands themselves are
the whitelist Runtime commands.

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `node frontend/node_modules/.tmp/gate-check.mjs` | equivalent for the python yaml Static command | 0 | `JOBS=2 ["backend","frontend"]`; `PUSH_MAIN=true PR_MAIN=true`; `RESOLVED_COUNT=90 HOSTS={"registry.npmjs.org":90}` |
| `mvn -B test` (PowerShell prefix) | whitelist Runtime | 0 | `Tests run: 91, Failures: 0, Errors: 0, Skipped: 0`; `BUILD SUCCESS` (9.316 s); V1+V2 applied; SQLite 3.49; Java 21.0.11; iron-rules URL `?journal_mode=WAL&busy_timeout=5000&foreign_keys=on`, pool=1. Log `backend/test.log` |
| `npm ci` (vite stopped first to avoid Windows EPERM) | whitelist Runtime | 0 | `added 48 packages, and audited 55 packages`; `found 0 vulnerabilities`. Log `frontend/ci-install.log` |
| `npm run build` | whitelist Runtime | 0 | `tsc -b && vite build`; vite 8.3.8; `91 modules transformed`; `dist/index.html` 0.40 kB, css 27.11 kB, js 412.03 kB (gzip 127.64 kB). Log `frontend/build.log` |
| `Invoke-WebRequest GET http://localhost:8080/api/greeting` | whitelist System / greeting regression | 0 | `200`, `application/json`, body exactly `{"message":"Hello World"}` — bare JSON, one key, no envelope |
| `Invoke-WebRequest POST/PUT/DELETE …/api/greeting` | greeting regression (AC6-N) | 0 | `POST=405`, `PUT=405`, `DELETE=405` |

The packaged backend jar was confirmed alive on `localhost:8080` against
`backend/data/gogo-e2e.db` before the smoke. **Clean-seed deviation (WARNING 6):**
task 8.4 called for deleting `backend/data`, but `DeleteFile` is a no-op on that
Windows directory, so a fresh empty `gogo-e2e.db` was used as the equivalent clean
seed; the jar started, Flyway applied V1+V2, and Screen 11–14 were walked. All URLs
are local verification targets (`localhost:8080`); no proxy or substitute address
was introduced. The four run logs and `gate-check.mjs` are gitignored.

## Code-review highlights

- **Thin controllers.** `SplitDraftController` exposes 5 endpoints; `X-Member-Id`
  is `required=false` so a missing header reaches the guard (401), not a framework
  400. Every response uses the `ApiResponse` envelope; constructor injection;
  English comments.
- **Orchestration/execution separation.** `SplitDraftService` orchestrates;
  business decisions live in the domain (`SplitWindow`, `ReunionTimingCalculator`,
  `MainPlanConfirmation`, `SplitDraftDocument`). `common` is a leaf with no `splits`
  dependency.
- **Stable error contract.** `ErrorCode` is a 13-code leaf enum mapped to HTTP;
  `ApiResponse<T>(data, error)` record — success `error=null`, rejection
  `data=null`; `error.code` is the contract, `message` is not.
- **Guard order.** `MemberGuard` validates identity (401 `MEMBER_REQUIRED`) → trip
  (404 `TRIP_NOT_FOUND`) → membership (403 `NOT_A_MEMBER`), throwing before any
  private trip/draft/route value is read.
- **Pair-atomic route generation.** `generateRoutes` computes the provider
  **outside** the transaction (keeps the pool=1 single connection free), then in a
  `TransactionTemplate` deletes the old split-a/b pair, inserts the new pair, and
  does a conditional `updateDraftIfVersion`; a stale version throws
  `STALE_DRAFT_VERSION` and rolls back the inserts. D10 wrote `@Transactional`; the
  impl uses programmatic `TransactionTemplate` — equivalent atomicity, deliberate
  to keep the provider outside the tx (SUGGESTION 2).
- **Zero-DB timing.** `ReunionTimingCalculator` is pure domain, not a Spring bean:
  `total = activity + buffer + Σlegs`, `overrun = max(0, total − window)`,
  `missingInputs[]` probe, `feasible` only when nothing is missing, `pairFeasible`
  = all routes feasible. Over-window/missing → 200 `feasible=false`; empty/≠2
  routes → 400 `INVALID_ROUTE_PAIR`.
- **Member-only read snapshot.** `getDraftDetail` assembles a consistent read-only
  snapshot, does not bump the version and does not require the initiator; no active
  draft → 200 `{data:null,error:null}`.
- **Frontend stack (C4/D15, Leo-ruled 2026-11-15).** shadcn/ui + Tailwind v4 + TS +
  TanStack Query v5 (`retry:false`, `refetchInterval 5000`) + React Router 7;
  `SplitKeyed` remount on `tripId:memberId`; identity in `localStorage`
  (`X-Member-Id`), no hard-coded UUID; inline SVG icons (no icon library); greeting
  `App.jsx` untouched; group-move control not implemented (judgment stays backend).
- **Additive migration.** `V2__splits.sql` (78 lines) adds 4 tables + the nullable
  `trip.split_draft` TEXT column + self-contained seed; the V1 greeting migration
  (6 lines) is intact.
- **Tests.** 91 green; `@DisplayName` maps the 30 API scenarios; domain UTs are
  zero-DB; repository tests assert the three iron rules (WAL / busy_timeout /
  foreign_keys) and the V2 schema. Documentation and code comments are English per
  `AGENTS.md`.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Partial | [fact] | `tasks.md`: 33 `- [x]`, 3 `- [ ]`. Open: 8.5 remote CI (pending PR), 9.3 G2 NOT RECORDED (pending VL) + quality-checklist, 9.4 P5. Checkboxes 1.1–8.4/9.1/9.2 were ticked in this run as a record correction (see Post-run note); no implementation task is open |
| V2 | Requirement coverage | Pass | [fact] | 5/5 spec requirements implemented + observed: Split draft start, Split boundary selection, Group route generation, Reunion timing check, Split draft detail read. Each has controller + service + domain + test evidence |
| V3 | Scenario coverage | Pass | [fact] | 34/34 exercised: 30 API scenarios mapped via `@DisplayName` to the 91 green tests; 4 E2E (Screen 11–14) walked in the browser against the B-chain seed SGF26A / window 120 / A105·B110 |
| V4 | Requirement↔impl mapping | Pass | [fact] | controller→service→domain mapping confirmed per requirement; no mismatch found |
| V5 | Spec drift | Pass | [fact] | No drift. `JdbcTemplate` (D2) over the aspirational `JdbcClient`, and shadcn/ui over proposal AntD5 (D15/C4, Leo-ruled 2026-11-15), are documented deviations; D10 `TransactionTemplate` ≡ `@Transactional` atomicity. proposal/KB AntD5 sync deferred to P5 |
| V6 | Design follow-through | Pass | [fact] | D1–D17 confirmed against impl: leaf module + common (D1), JdbcTemplate (D2), `{data,error}` envelope + 13-code (D3), V2 + three iron rules + pool=1 (D4), JSON draft doc (D5/D6), derived boundary window (D7), guard order (D8), conditional update (D9), pair-atomic (D10/D11), fixture provider A105/B110 (D12), zero-DB calculator (D13), member-only snapshot (D14), TS/shadcn stack (D15), CI two jobs (D17) |
| V7 | Code pattern fit | Pass | [inference] | Judged against `AGENTS.md` + Spring/React/shadcn norms: thin adapters, orchestration separation, leaf common, English comments. Verification method: human review at G2 — **pending**, not signed |
| V8 | Upstream basis | Pass | [fact] | Every changed/new path maps to a task/design: `common`+`splits`+`V2__splits.sql` → slices 1–6; frontend TS stack (`components/`, `features/`, `lib/`, `router.tsx`, `index.css`, tsconfig, `components.json`) → slice 7; `application.yml`/`package.json`/`vite.config.js`/`main.jsx` → slice 7 wiring; `tasks.md` → record correction. `App.jsx` untouched. `requirement-workspace/acceptance-test-fixtures.req003-draft.md` is an OQ-7 leftover, excluded from the P4 commit. No unmarked creep |

Probe note: `change_artifacts:found` (tasks/design/proposal/specs/splits/spec.md);
`whitelist_empty:no`; `whitelist_format:bash-fence`; tools node/npm/python3/git=yes,
`mvn=no` on the Git Bash PATH.

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass (local) | Local command table above (build/runtime/system green) + runner log `20261115-225501-local-verify-run.log` (`commands_failed:1` = pyyaml tool gap, intent covered by the node equivalent). The slot accepts "remote/local CI machine logs **or local command table**"; this is the local table. **Remote CI is not claimed**: unpushed, task 8.5 pending PR |
| E2 AI | Pass | This report plus the P1–P3 quality-checklist reports |
| E3 Human | **Pending** | No named human has confirmed this change. G2 is NOT RECORDED. Required: a fresh remote CI green for **this** commit plus a named G2 (VL) approver. The agent must not self-approve |

## Five-question map (when evidence in scope)

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ⚠️ (implementation + 34 scenarios complete; 3 process tasks open) |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ (remote CI unverified; E2E manual; G2 pending; pyyaml tool gap; permission band M) |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | None open | [fact] | — | All 5 requirements + 34 scenarios have implementation and observed evidence; 91 tests green; no required evidence is missing |

### WARNING

| # | Finding | Mark | Location | Disposition / owner |
|---|---------|------|----------|---------------------|
| 1 | pyyaml missing → the whitelist CI-structure command failed | [fact] | run log cmd 5 | **Non-blocking tool gap.** Intent verified via node `gate-check.mjs` (`JOBS=2`) + `ci.yml` read. Install pyyaml or accept the node equivalent as the whitelist authority. Owner Dev |
| 2 | Remote CI has not run for this change | [fact] | task 8.5; `ci.yml` | **Open — owned.** Push needs user authorization + security scan, then fresh two-job green. Owner VL. REQ-002's confirmation must not be reused |
| 3 | E3/G2 pending; G2 NOT RECORDED | [fact] | task 9.3; `g2-decision.md` | **Open — owned.** The agent must not self-approve. Owner VL (named) |
| 4 | The probe extracts only the first bash fence → the runner covers Static only | [fact] | `probe-verify.sh` → commands.txt | **Accepted.** Runtime/System executed manually from the same document, exits recorded above. A pack-script change is out of scope. Owner Dev/SA |
| 5 | `mvn` not on the Git Bash PATH → Runtime via a PowerShell prefix | [fact] | `probe tool:mvn:no` | **Disclosed invocation deviation.** Windows-ROOT truststore + IntelliJ Maven; the same whitelist commands, green. Owner Dev |
| 6 | 8.4 clean-seed: `DeleteFile` on `backend/data` is a no-op on Windows | [fact] | slice 8.4 | **Disclosed.** A fresh empty `gogo-e2e.db` was used as the equivalent clean seed; jar started, V1+V2 applied, screens walked. Owner Dev |
| 7 | E2E acceptance is manual; no committed browser suite | [fact] | `atdd-design.md` §5; design non-goals | **Accepted — declared non-goal.** Per-scenario browser observation recorded (Screen 11–14). Repeatability risk tracked below. Owner Dev |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | proposal/KB still say AntD5; impl uses shadcn/ui | [fact] | `proposal.md`; KB | Documented deviation R7/C4 (Leo-ruled). Sync proposal/KB to shadcn in P5. Owner Dev |
| 2 | D10 wording `@Transactional` vs impl `TransactionTemplate` | [fact] | `design.md` D10; `SplitDraftService` | Equivalent atomicity; the provider is deliberately outside the tx. Clarify D10 wording in P5. Owner Dev |
| 3 | Mockito self-attaching agent warning in test output | [fact] | `mvn test` log | Configure the Mockito agent when the JDK disallows dynamic attach (the prefix already sets `-XX:+EnableDynamicAgentLoading`). Owner Dev |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Remote CI may fail to resolve dependencies on a GitHub runner | Unpushed; no machine-readable CI access from this host | tracking — WARNING 2; the pipeline report stays Partial until a fresh named confirmation lands |
| 2 | G2/E3 pending, so nothing is approved | Human-only decision | tracking — WARNING 3; `g2-decision.md` stays NOT RECORDED |
| 3 | Permission band M (member-only authz) | `X-Member-Id` guard is the authz boundary | mitigated — guard order tested (401/404/403), `data=null` on rejection; human G2 review pending |
| 4 | E2E not repeatable without a human/agent driving a browser | No committed browser suite (non-goal) | accepted — per-scenario observation recorded |
| 5 | pyyaml tool gap recurs on a fresh clone | Module not installed | tracking — WARNING 1; the node equivalent lives under gitignored `.tmp` — consider a committed structural check |
| 6 | SQLite locking under concurrent access | pool=1, WAL + busy_timeout=5000 | accepted — three iron rules tested; pair-atomic routes via conditional update |
| 7 | Port 8080 contested by other local projects | Shared machine | mitigated — the backend was confirmed alive on 8080 before the smoke; greeting content verified |

## Human review assist (overlay — assist only, E3 stays human)

1. **Risk band:** author self-assess **M** (medium). The five-dimension floor ≥M is
   triggered by **permission** (member-only authz via the `X-Member-Id` guard). No
   money/safety/irreversible dimension. No CRITICAL → no raise to H. Detectability:
   the remote-CI gap is tracked.
2. **E1/E2/E3:** see the table (E1 Pass-local, E2 Pass, E3 Pending).
3. **Q1–Q5:** see the map (Q1 ⚠️, Q2 ✅, Q3 ✅, Q4 ✅, Q5 ⚠️).
4. **Findings response guide** (suggested, not auto-approved):
   - W1 pyyaml → **accept** (tool gap, intent equivalently verified); or
     *need-more-info* if the human insists on the literal whitelist command.
   - W2 remote CI → **need-more-info**: must push + confirm green before release;
     do **not** accept as-is.
   - W3 E3/G2 → **reject** any agent self-approval; *need-more-info*: a named VL
     sign-off is required.
   - W4 first-fence → **accept** (manual Runtime/System recorded).
   - W5 mvn prefix → **accept** (disclosed, same commands green).
   - W6 clean-seed → **accept** (equivalent fresh DB); or *need-more-info* if the
     human wants a literal `data/` deletion.
   - W7 manual E2E → **accept** (declared non-goal).
   (Not all accept — W2/W3 explicitly require human action.)
5. **Red lines:** none triggered. Authz is enforced (guard, not bypassed); no
   secret/PII (identity in localStorage, no credentials); M-band with an owner; not
   "AI says pass" as the sole basis (G2 human pending); V2 is an additive migration
   (rollback = drop), not irreversible. **But** incomplete evidence (E3 + remote CI)
   → cannot recommend unconditional 放行.
6. **Release suggestion:** **阻断 (block)** unconditional release for now.
   `/sdd:pr-submit` stays blocked until (a) the user authorizes push + security
   scan, (b) remote CI two-job green is confirmed, (c) a named G2 (VL) sign-off
   lands. The human VL may then choose 带例外放行 with a named owner + deadline. The
   agent never self-signs.
7. **Residual risks:** see the table (7 rows).
8. **Feedback hook:** covered = 5 requirements / 34 scenarios / 91 tests / build /
   greeting regression / CI structure. Skipped = remote CI execution, a committed
   E2E suite, the literal pyyaml command, the group-move control (non-goal). On
   escape: re-check residual risks + the uncovered remote-CI/E2E range.

## Post-run task update (record correction)

During this verify run, `tasks.md` checkboxes 1.1–8.4, 9.1 and 9.2 were ticked
(33 `- [x]`) to reflect work completed in P4 slices 1–8 (91 tests green, build
green, Screen 11–14 walked). This is a **record correction** matching the
REQ-001/002 convention (tick on completion), not new implementation. Left open:
8.5 (remote CI, pending PR), 9.3 (G2 NOT RECORDED + quality-checklist), 9.4 (P5).
V1 = 33/36. **Overall stays Partial** — the correction closed no Partial driver
(E3 + remote CI are still open).

## Waiver

N/A — no waiver. Overall is Partial because items await human action (remote CI,
G2) and a tool gap (pyyaml) is equivalently covered — not because anything is
bypassed. Should a waiver ever be needed (Overall=Fail), it requires item, owner
(VL or designated), remedy deadline and a named human sign-off.

**Agent must not self-approve this section.** Incomplete rows ≡ no waiver.