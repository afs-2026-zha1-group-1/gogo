# Local Verify Report: req-020-manage-must-do

**Date:** 2026-11-17 (timezone: +0800)
**Root:** D:\code\training\gogo
**Scope:** local+evidence
**Change id:** req-020-manage-must-do

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Partial |
| Code review | Pass |
| Evidence (OpenSpec) | Partial |
| **Overall** | Partial |

**PR gate:** Overall=Partial, so there is no hard stop from this report, but a PR may not be
presented as fully verified. Three page-level evidence rows and the screen-08 comparison are still
outstanding (`tasks.md` 5.1 / 5.2 / 5.4), no remote CI run exists for this change's commit, and G2
needs a named VL. No Waiver is offered below: the gaps are tracked, not waived. Agents must not
self-approve a Waiver.

## Local commands

Whitelist source: `docs/feedback/verification-commands.md`. Runner log:
`docs/ai4se-plugins/20261117-110950-local-verify-run.log`; commands file:
`docs/ai4se-plugins/20261117-111500-local-verify-commands.txt`. `commands_attempted:8`,
`commands_failed:2` (both failures are the machine's Python interpreter, not this change).

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | verification-commands.md (Static) | 0 | No hard-coded greeting left in the frontend |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | verification-commands.md (Static) | 0 | No ORM dependency |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | verification-commands.md (Static) | 0 | No H2 dependency, driver or JDBC URL |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | verification-commands.md (Static) | 0 | No internal registry host leaked into the lockfile |
| `python -c "... safe_load ... jobs == ['backend','frontend']"` | verification-commands.md (Static) | 1 | `ModuleNotFoundError: No module named 'yaml'`. The interpreter on this PATH is `C:\Python315\python.exe` (3.15.1) without PyYAML. The claim itself still holds: `.github/workflows/ci.yml` declares exactly `backend` and `frontend` |
| `python -c "... BaseLoader ... 'main' in d['on']['push']['branches']"` | verification-commands.md (Static) | 1 | Same missing module; independently, the assertion does not match the current workflow (`push:` carries no branch filter, only `pull_request: branches: [main]`), the known environment item from the 2026-11-16 report |
| `(cd backend && mvn -B test)` (bundled IDEA Maven 3, `JAVA_HOME` converted with `cygpath`) | verification-commands.md (Runtime) | 0 | `Tests run: 295, Failures: 0, Errors: 0, Skipped: 0`, BUILD SUCCESS in 15.6 s. New: `MustDoApiTest` 33, `MustDoCodecAndServiceTest` 4, `MustDoValidatorTest` 3. Untouched neighbours: `PreferenceApiTest` 29, `MainPlanApiTest` 34 |
| `(cd frontend && npm run build)` (runs `tsc --noEmit` first) | verification-commands.md (Runtime, adapted) | 0 | Typecheck clean; 142 modules transformed; `index.js` 650.91 kB (gzip 204.89 kB), `index.css` 44.49 kB (gzip 9.24 kB), built in 241 ms |

Agreed adaptation (C2): `npm ci` was replaced by `npm run build` because a clean install deletes
`node_modules` while the developer's own vite dev server (pid 43376) holds the rolldown binding
open, and P4 must not restart the developer's processes.

## Additional change-scoped evidence (outside the whitelist)

| Evidence | Result | Location |
|---|---|---|
| Red-first run of `MustDoApiTest` before implementation | Every new-route request failed with 404 "no handler" (right reason, not a SQL error) while the branch baseline stayed 255/255 green | `tasks.md` 1.3 and the REQ-020 row of `requirement-workspace/registry.md` |
| Runtime API replay of all 25 API scenarios + 12 reverse checks | **45 checks, 0 failures** against an isolated instance of the packaged jar (port 8081, own SQLite file) | `docs/ai4se-plugins/20261117-105552-req020-runtime-api-{commands.ps1,run.log,db-dump.py}`, written up in `docs/feedback/verification-req-020.md` §3 |
| `openspec validate req-020-manage-must-do --strict` | exit 0, rerun after every P4 wording change | `tasks.md` 6.6 |
| Developer database | **not touched** by P4; the runtime evidence used `%TEMP%\gogo-req020-runtime.db` | `tasks.md` 5.6 |

## Code-review highlights

- The two new endpoints reuse the existing class-level mapping and the private `caller()` gate, so
  identity → trip existence → membership is written once (MD2). No new route, no second advice class:
  `PreferenceErrorAdvice` gained exactly one `@ExceptionHandler(MustDoApiException.class)` branch.
- `PreferenceRepository` lost its hard-coded `INTEREST` constant in favour of a `kind` argument on
  `save` / `membersOf`; the interest call sites pass `"interest"`, the must-do call sites pass
  `"must_do"`, both against the same `UNIQUE (trip_id, user_id, kind)` upsert. No migration was
  added, no dependency was introduced, and `PreferenceService` keeps its previous behaviour.
- `MustDoValidator` holds steps 3–7 of the signed order in five separate loops (activity, place or
  time, time format, duplicate id, unknown id) so step precedence is observable, and the whole
  validation runs before any write. Steps 1–2 are answered by `StrictMustDoItemListDeserializer`
  with `INVALID_REQUEST`.
- `MustDoService.save` reads the caller's current ids, validates, normalises with trim/blank-to-null,
  then issues `++maxId` in request order — a cleared list restarts at 1 — and writes the entire list
  through one upsert, so omission is the only delete path. `MustDoPayload.encode` writes the `name`
  mirror and `decode` drops it, which keeps `name` off the wire (MDR-5).
- Frontend: a second query key `['must-dos', tripId]` with its own `useMutation`; every confirmed
  action sends exactly one whole-list `PUT` and adopts the server response (so ids come from the
  server); `setQueryData` patches only the caller's member entry in the must-do cache, leaving the
  interest cache and unsaved selections untouched; failure renders the response message inside the
  must-do section and rolls back. No `localStorage` use anywhere in the page.

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Partial | [fact] | `tasks.md` 29 checked / 7 open. Open rows: 5.1, 5.2, 5.4 (browser page evidence, deferred to the owner who restarts 8080), 6.2 (push authorization + fresh CI run), 6.3 (G2/G3 by named humans), 6.4 (README and ledger rows done; only the TS-14 report inside the G2 record remains), 6.5 (tech-stack reconciliation, blocked until archive) |
| V2 | Requirement coverage | Pass | [fact] | All three delta requirements have implementation: `Save member must-do items` (`PreferenceController` PUT + `MustDoValidator` + `MustDoService`), `Read member must-do items` (GET + `MustDoService.members`), `Preferences page` (second section of `PreferencesPage.tsx`) |
| V3 | Scenario coverage | Partial | [fact] | 44 scenarios in the delta. API side: 33 `MustDoApiTest` cases plus a 45-check runtime replay covering all 25 API scenarios and the 12 reverse checks. Page side: the 20 PAGE rows are written as steps but not yet observed in a browser. UT 5 cases implemented and green |
| V4 | Requirement↔impl mapping | Pass | [fact] | Each requirement maps to located code as listed above; the only mismatch noted is the identity wording covered by V5 |
| V5 | Spec drift | Partial | [fact] | TS-14: the delta still phrases identity as `X-User-Id` (specs/preferences/spec.md lines 16 and 107) while the implementation follows the session identity that US-066 introduced and `atdd-design.md` already assumes (0 hits for `X-User-Id`). Deliberately not reconciled here — signed text must be corrected by IO/SA in G2 |
| V6 | Design follow-through | Pass | [fact] | MD1 `kind` parameterization, MD2 single gate + one advice branch, MD5 seven-step order with all validation before the first write, MD6 Jackson-level `INVALID_REQUEST`, MD7 id issuing, MD8/MD9 whole-list upsert on `member_preference`, MD10 lenient decode, MD11 no new dependency, MD12 identity via session, MD13 exactly one new CSS class (`.mustdo-row`), MD14 no new route — each verified against the diff |
| V7 | Code pattern fit | Pass | [fact] | New classes live in `com.gogo.preference` with the package's existing naming (`*ApiException`, `*Payload`, `*Service`, `*Validator`), plain records for DTOs, `JdbcClient` for access, and the page keeps the REQ-019 section/`sec-title`/`card pad` markup conventions |
| V8 | Necessity (anti-creep) | Pass | [fact] | Tracked diff: 4 modified backend main files (+60/−13 region), 10 new backend main classes, 3 new test classes, 4 frontend files, README + verification docs + tasks + two ledger rows. Every file traces to `tasks.md` §1–§6. No migration file, no `pom.xml`/`package.json`/lockfile/`ci.yml`/`App.tsx` change, no `PreferenceApiTest`/`MainPlanApiTest`/`com.gogo.mainplan` edit. `budget` / `submission` kinds are not implemented early |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Partial | Local command table above (build/test green; 2 whitelist Python checks fail on the machine's missing PyYAML). No remote CI run exists for this change's commit yet — `ci-report.md` has not been produced, and REQ-019's runs are not evidence here |
| E2 AI | Partial | This report: V1–V8 graded with the page-evidence and TS-14 gaps named; `openspec validate --strict` exit 0; p3 quality-checklist Overall Pass (`docs/ai4se-plugins/20261117-100305-quality-checklist-report.md`) |
| E3 Human | Pending | Requires a named VL for G2 (including the TS-14 ruling) and a named SA for G3 — never agent-signed |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Fully implemented? | V1–V3 | ⚠️ code and API evidence complete; 20 page rows and 4 process rows open |
| Q2 Correctly implemented? | V4–V5 | ⚠️ behaviour matches the signed contract; identity wording in the delta lags the implementation (TS-14) |
| Q3 Architecturally coherent? | V6–V7 | ✅ |
| Q4 Only what was needed? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ✅ zero migration, zero new dependency, zero new route; neighbour suites untouched and green |

## Findings

### CRITICAL

None.

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | PAGE-1…PAGE-20 and the screen-08 layout comparison have never been observed in a browser: the developer's 8080 instance is the pre-P4 build (answers 404 on the new route) and `vite.config.ts` proxies `/api` to 8080 | [fact] | `docs/feedback/verification-req-020.md` §2; `tasks.md` 5.1/5.2/5.4 | Owner restarts 8080 on the P4 jar, then run the page rows and attach screenshots to the G2 evidence set |
| 2 | Delta text still says `X-User-Id`, implementation uses session identity (TS-14) | [fact] | `openspec/changes/req-020-manage-must-do/specs/preferences/spec.md` lines 16, 107 | Report to IO/SA in `g2-decision.md`; do not silently edit signed text |
| 3 | Two whitelist static commands fail because this machine's Python has no PyYAML, and the `BaseLoader` trigger assertion no longer matches the workflow shape | [fact] | `docs/feedback/verification-commands.md` | Fix the command list in a separate change (`safe_load` plus `d.get('on') or d.get(True)`, and assert `push:` filters correctly); the underlying CI facts were confirmed by reading `.github/workflows/ci.yml` |
| 4 | No remote CI evidence for this change's commit; P4 changes are still uncommitted by the owner's instruction | [fact] | `tasks.md` 6.2 | After authorization, push, read the fresh run for the new commit and write the pipeline report before G2 |
| 5 | `.metals/` (IDE artifacts) is untracked and not covered by `.gitignore`, so a `git add .` would sweep it into the change | [fact] | `.gitignore` | Add `.metals/` to `.gitignore` as a separate hygiene change; stage P4 files by name in the meantime |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `MustDoService.currentItems` reads every member's row to find the caller's | [fact] | `backend/src/main/java/com/gogo/preference/MustDoService.java` | A single-row read (`payloadOf(tripId, userId, kind)`) would be cheaper; harmless at MVP scale, revisit only if the member roster grows |
| 2 | `PreferenceRepository` now carries two near-identical upserts (`save` and `savePayload`) | [inference] | `backend/src/main/java/com/gogo/preference/PreferenceRepository.java` | Verification method: collapse `save` into `savePayload` behind the codec and rerun `mvn -B test`; belongs to a follow-up cleanup, not to this acceptance slice |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | Page-level behaviour (add / edit / confirmed delete / rollback on 400 / section isolation) is unverified in a browser | 8080 still runs the pre-P4 build and the owner restarts it personally | tracking: the steps and expected observations are pre-written in `docs/feedback/verification-req-020.md` §2; the equivalent behaviour is covered at API level (45/45) and by `MustDoApiTest` |
| 2 | Stacked delivery: REQ-020 sits on `feat/travel_preference` whose REQ-019 payload is already in `main`, and REQ-024/026 will modify the same page | Ordering is a human decision (G2/G3) | tracking: `registry.md` records the 019 → 020 → 024 → 026 order; the delta keeps the must-do section additive |
| 3 | Runtime evidence came from an isolated instance and an independent SQLite file, not from the developer database | P4 must not overwrite the developer's data or kill their processes | accepted: the isolated instance applied the same Flyway V1–V7 sequence; `tasks.md` 5.6 states the untouched dev database and the final row state of the runtime database |
| 4 | Two whitelist static commands cannot run on this interpreter | Environment gap, unrelated to this change | tracking: WARNING 3 proposes the fix as a separate change; CI in `main` still runs both jobs |

## Waiver

N/A — no waiver. Overall is Partial, not Fail, and the open items above are tracked with owners
rather than waived. A Waiver would need an item, a VL or designated owner, a remedy deadline and a
human sign-off; the agent must not supply any of those.

## Next

`/sdd:pr-submit` is not appropriate yet: the owner restarts 8080 so the page rows can be observed,
then P4 changes are committed and pushed on explicit authorization so a fresh CI run exists for this
change's commit. G2 then needs a named VL (who also rules on TS-14), and G3 a named SA.
