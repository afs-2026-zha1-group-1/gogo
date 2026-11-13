# Change summary — req-001-hello-world

## Intent

REQ-001 asked for a minimal Hello World slice that proves the whole chain: the
greeting text lives in a database, a Spring Boot endpoint reads it, and a React
home page renders the response. The point is evidence, not features — the text
must provably come from storage rather than from the frontend.

Scope came from `TODO.md` plus three user instructions on 2026-11-13: substitute
H2 for SQLite to make verification fast, add a GitHub Actions pipeline and push
`main`, and author the full P1–P5 OpenSpec trail with one commit per stage.

Non-goals honored: no ORM, no user system or permissions, no greeting management
UI or write API, no i18n, no deployment/CD, no committed browser automation suite,
no NFR tests.

## What shipped

| Area | Delivered | Commit |
|---|---|---|
| P1 intent & proposal | `requirement-workspace/` intent capture, REQ-001 six-field entry, deep-dive (⑨–⑫), impact brief, DoR self-check (BLOCKER 0), handoff note; `proposal.md` | `b2d8cb1` |
| P2 delta spec | `specs/greeting/spec.md` — 3 requirements, 6 scenarios; `dov-ac-review.md`; `g1-decision.md` (unsigned draft at that commit) | `9f55c8e` |
| P3 design & decomposition | `atdd-design.md` (API + E2E layers), `design.md` (D1–D8, R1–R6), `tasks.md` (30 tracked tasks) | `55d907e` |
| P4 implementation | `backend/` — Spring Boot 3.5.14 / Java 21, Flyway `V1__create_greeting.sql`, embedded H2 file at `backend/data/gogo.mv.db`, `JdbcTemplate` repository, read-only `GET /api/greeting` (`text/plain`), 3 acceptance tests. `frontend/` — React 19 + Vite 8, fetch-and-render `App.jsx` with a failure branch, `/api` dev proxy, public-registry lockfile. `.github/workflows/ci.yml` — backend `mvn -B test` (Java 21) + frontend `npm ci && npm run build` (Node 24). `README.md` run instructions and CI description; `.gitignore` for `data/` and `logs/` | `fb2ed91` |
| P4 verification records | local verify report + checkpoint log, pipeline report, `ci-report.md` (E1 slot), `g2-decision.md` (unsigned draft at that commit), P4 quality checklist | `fb2ed91` |
| P5 archive & evolve | this summary, `g3-decision.md` (unsigned draft at that commit), OpenSpec archive, P5 quality checklist | `6a98d30` |
| Gate signing & verification refresh | filled `docs/feedback/verification-commands.md` and `verification-matrix.md`; refreshed local-verify report (Overall Pass); Johnson's named CI confirmation recorded in the pipeline report and `ci-report.md`; G1/G2/G3 signed; P2/P4/P5 re-scored (roll-up Pass) | gate-signing commit |

Commit SHAs above are post-rebase. The remote `main` had been force-updated to a
rewritten baseline (`3f455fd`, deleting `push-test.md`), so the five stage commits
were rebased with `git rebase --onto origin/main 7164949 main` after the user chose
that reconciliation, then pushed (`3f455fd..6a98d30 main -> main`). No force-push
was used; a backup ref `backup/pre-rebase-main` preserves the pre-rebase history.

Specs merged: the `greeting` delta is applied to `openspec/specs/greeting/spec.md`
by the archive step (verified in the P5 checklist report).

KB update: **Skipped (not configured)** — `scripts/README.md` documents
`kb-lint.sh` as a non-blocking no-op that prints `SKIP` and exits 0, and states
that P5 may record this Skipped status but must not report KB lint or index
refresh as Passed. No knowledge-base change is claimed.

## Verify highlights

All six delta-spec scenarios were exercised locally with observed evidence
(`docs/ai4se-plugins/20261113-145614-local-verify-report.md`):

| Scenario | Evidence |
|---|---|
| First start creates and seeds the database | Deleted `backend/data/`, started the jar → `gogo.mv.db` recreated; H2 Shell (`AUTO_SERVER=TRUE`) → `1 \| Hello World`, `ROW_COUNT 1` |
| Later start preserves the seeded greeting | Second start → same row, `ROW_COUNT 1`; Flyway log "Schema PUBLIC is up to date. No migration necessary." |
| Stored greeting is returned | `curl -i` → HTTP 200, `text/plain;charset=UTF-8`, `Content-Length: 11`, body `Hello World`; `GreetingApiTest.returnsHelloWorldFromDatabase` |
| Response reflects stored data, not a constant | `returnsTheStoredMessageWhenItChanges` updates the row then asserts the new value. **Mutation check:** controller temporarily returned a literal → test failed with `expected:<Guten Tag> but was:<Hello World>` → reverted → 3/3 green |
| Home page shows the served greeting | Browser `http://localhost:5173/` → `h1` text `Hello World`; `grep "Hello World" frontend/src` → no match, so the text came from the endpoint |
| Backend unavailable | Backend stopped → `[role='alert']` and `body` both return only `Failed to load the greeting: HTTP 502`; no greeting heading |

Non-goal reverse checks, 5/5: POST/PUT/DELETE → 405 (MockMvc and curl); no
greeting literal in `frontend/src`; no JPA/Hibernate in `backend/pom.xml`; GET
without credentials → 200; backend starts with no external database service.

Build gates: `mvn -o -B test` → 3 tests, 0 failures; `mvn -o -B package` → jar
built; `npm ci` → 19 packages, 0 vulnerabilities; `npm run build` → vite 8.3.8,
15 modules, dist built; workflow YAML parsed with both jobs and triggers intact.

Design D6 verified: the committed lockfile holds 51 `registry.npmjs.org` URLs and
0 corporate hosts, while the `npm ci` debug log shows 20 corporate-mirror entries
and 0 npmjs.org entries — one lockfile serves public CI and the local mirror.

**Status at the P4/P5 commits was not a clean Pass, and is now resolved.** Local
verify Overall was **Partial** and the P4 checklist Overall was **Fail** on check
P4-2, because the required condition "Local Overall is Pass, or Fail with a
complete human-signed Waiver" was not met. Drivers: the repo command whitelist
(`docs/feedback/verification-commands.md`) was placeholder-only; remote CI was
unreadable here (`gh` absent, `api.github.com` → HTTP 403); E3 human review was
pending; V1 task completion was 25/30 at report time. That was an evidence/gate
gap, not an implementation defect — no CRITICAL finding was open.

The gap is closed in the gate-signing commit:

- The whitelist now carries the real three-layer commands. Probe →
  `whitelist_empty:no`; runner → `commands_attempted:4`, `commands_failed:0`.
  One correction was needed: bare `grep` reverse checks exit 1 when they find
  nothing, so they were rewritten as `! grep …` and the workflow check now asserts
  the job list rather than only printing it.
- Runtime and system layers re-run green: `mvn -B test` 3/3, `npm ci` 0
  vulnerabilities, `npm run build` dist built, `curl -i` → 200 `text/plain`
  `Hello World`, POST/PUT/DELETE → 405, browser `h1` → `Hello World`.
- V1 is 30/30. E3 is **Signed by Johnson**.
- Refreshed local verify `docs/ai4se-plugins/20261113-153317-local-verify-report.md`
  → Overall **Pass**. Re-scored checklist
  `docs/ai4se-plugins/20261113-154004-quality-checklist-report.md` → P2/P4/P5 Pass,
  roll-up **Pass**. The earlier reports keep their original verdicts as history.

Remote CI is still **not machine-readable** from this host. Johnson confirmed the
run is green, so the pipeline report is `Partial (Pass-by-human-confirm)` with all
four confirmation fields filled — never an API-verified Pass, and E1 stays
❓ 未验证 as machine evidence.

## Gate outcomes

| Gate | Decision | Approver(s) | Notes |
|---|---|---|---|
| G1 Align | **Pass** (recorded Conditional at 15:35, re-recorded Pass at 15:58) | IO = Johnson, SA = Johnson | Both conditions closed by explicit IO rulings: use Flyway (`TODO.md` non-goal line amended to `- ORM`), database back to SQLite (`TODO.md` already correct). The third ruling — JSON body `{"message":"Hello World"}` — changes the merged requirement and is carried as new scope by `req-002-greeting-json-sqlite` |
| G2 Verify | **Pass** | VL = Johnson | Local-verify Overall Pass and the `Pass-by-human-confirm` pipeline report both cited in Inputs. No waiver |
| G3 Merge & Archive | **Pass** | SA = Johnson | Archive complete, Living Spec valid under `--strict`, `tasks.md` 30/30, KB Skipped (not configured). No AO asks attached |

Johnson authorized the signatures in session: "没问题，ci全绿。都签署我的名字即可
Johnson". One person holds IO, SA and VL in this single-person project; each record
states that explicitly. The agent recorded the decisions and did not self-approve.
Process authorization (the earlier P1–P5 and push instructions) is kept distinct
from gate signature in `g3-decision.md`.

## Residual risks

| # | Risk / gap | Owner | Status |
|---|---|---|---|
| 1 | Remote CI is human-confirmed only; no run SHA, job duration or URL is recorded, so a future regression would not be caught by evidence on this host | Johnson / Dev | mitigated — Johnson confirmed the run is green; pipeline report `Partial (Pass-by-human-confirm)`, E1 ❓ 未验证. Restore remote read access to upgrade |
| 2 | Action majors `checkout@v4` / `setup-java@v4` / `setup-node@v4` not verified against the marketplace from this machine | Dev | mitigated — a green run implies the tags resolved; still unverified by machine evidence |
| 3 | OQ-2: `TODO.md` line 21 requires Flyway while line 33 lists migration tooling as a non-goal | Johnson (IO + SA) | **closed** — IO ruled "use Flyway"; line 33 amended to `- ORM`. Implementation already matched |
| 4 | OQ-3: `text/plain` vs JSON response contract | Johnson (IO) | **ruled: JSON** `{"message":"Hello World"}`. REQ-001 shipped `text/plain` and was verified on that basis; the contract change is req-002 scope with its own delta and gates |
| 5 | OQ-4: `TODO.md` says SQLite while the implementation used H2 | Johnson (IO) | **ruled: back to SQLite.** H2 was a temporary verification aid. The engine switch is req-002 scope |
| 6 | Command whitelist empty, so local verify can never reach Pass | Dev / SA | **closed** — three layers documented, probe `whitelist_empty:no`, runner 0 failed; `verification-matrix.md` filled |
| 7 | E2E acceptance is manual; no committed browser suite | Dev / SA | accepted for this slice (R6); repeatability risk |
| 8 | No secret-scan / SAST job in CI | Dev / SA | accepted for this slice |
| 9 | Cold-cache npm install through the corporate mirror unproven (tarballs were cache hits) | Dev | open — proving it needs `npm cache clean`, which affects every other project on this shared machine; not done unilaterally |
| 10 | Red-green ATDD order not honored (R4): implementation preceded the artifacts | Dev | mitigated — mutation check added, every scenario re-verified |
| 11 | Ports 8080/5173 contested by other local projects; one killed our JVM mid-verification | Dev | mitigated — detached starts, verified by port owner + endpoint response; the dev server was confirmed by command line before being stopped for `npm ci` |
| 12 | G1, G2 and G3 all NOT RECORDED; no named IO / SA / VL has signed | IO / SA / VL | **closed** — all three signed by Johnson (G1 Conditional, G2 Pass, G3 Pass) |
| 13 | One person holds IO, SA and VL, so there is no independent reviewer | Johnson | accepted — recorded explicitly in every gate record rather than implied |
| 14 | The whitelist probe extracts only the first bash fence, so the runner covers the Static layer; Runtime and System are manual | Dev / SA | accepted for this slice — pack-script limitation, out of scope; manual exits recorded in the local-verify report |

Follow-up candidates (non-authoritative): close G1 conditions 1 and 2 and re-record
G1 as Pass; restore remote CI read access and re-run `/sdd:pipeline-report`; add a
committed E2E suite if repeatability becomes a requirement; consider a JSON contract
if a second consumer appears; add secret-scan/SAST when the repo leaves
teaching-baseline status; configure the KB or run `/sdd:evolve` for the remaining
harness gaps.

## Links

Paths below are relative to the archive folder
`openspec/changes/archive/2026-11-13-req-001-hello-world/` unless prefixed with
`docs/` or `openspec/specs/`.

- Proposal: `proposal.md`
- Delta spec: `specs/greeting/spec.md`
- Design: `design.md`
- ATDD design: `atdd-design.md`
- Tasks: `tasks.md` — 30/30 complete
- AC/DoV review: `dov-ac-review.md`
- Gate records (signed by Johnson): `g1-decision.md` (Pass), `g2-decision.md` (Pass),
  `g3-decision.md` (Pass)
- E1 slot: `ci-report.md`
- Local verify: `docs/ai4se-plugins/20261113-153317-local-verify-report.md`
  (Overall Pass), superseding `20261113-145614-local-verify-report.md` (Partial);
  checkpoint `20261113-145614-local-verify-checkpoint.md`; whitelist run logs
  `20261113-152958-local-verify-commands.txt`, `20261113-153000-local-verify-run.log`
- Pipeline: `docs/ai4se-plugins/20261113-145614-pipeline-report.md` — Partial
  (`Pass-by-human-confirm`), confirmed by Johnson
- Verification whitelist: `docs/feedback/verification-commands.md`,
  `docs/feedback/verification-matrix.md`
- Quality checklists: P1 `20261113-143539`, P2 `20261113-144038`,
  P3 `20261113-144819`, P4 `20261113-145614` (Fail, historical),
  P5 `20261113-150728` (roll-up Fail, historical),
  re-score `20261113-154004` (P2/P4/P5 Pass, roll-up Pass)
- Requirement workspace: `requirement-workspace/requirements/REQ-001.md`,
  `requirement-workspace/deep-dive.md`, `requirement-workspace/impact-brief.md`,
  `requirement-workspace/analysis/req-001-dor.md`
- Remote: `https://github.com/lianyue910-a11y/gogo.git`, branch `main`
- Archive location: `openspec/changes/archive/2026-11-13-req-001-hello-world/`
  (12 entries: 10 markdown artifacts, `specs/`, `.openspec.yaml`). Living Spec:
  `openspec/specs/greeting/spec.md` — 3 requirements, 6 scenarios;
  `openspec validate --specs --strict` → 1 passed, 0 failed. The archive CLI warned
  "25/30 tasks, 5 incomplete" and continued under `--yes`; those items were the push
  and the P5 record steps, completed afterwards.
- Successor change: `req-002-greeting-json-sqlite` — carries the IO rulings for a
  JSON response contract and the SQLite engine

This summary is not a G3 decision and not Living Spec authority.