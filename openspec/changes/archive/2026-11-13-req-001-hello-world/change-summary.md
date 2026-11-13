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
| P1 intent & proposal | `requirement-workspace/` intent capture, REQ-001 six-field entry, deep-dive (⑨–⑫), impact brief, DoR self-check (BLOCKER 0), handoff note; `proposal.md` | `2a24577` |
| P2 delta spec | `specs/greeting/spec.md` — 3 requirements, 6 scenarios; `dov-ac-review.md`; unsigned `g1-decision.md` | `35a13c5` |
| P3 design & decomposition | `atdd-design.md` (API + E2E layers), `design.md` (D1–D8, R1–R6), `tasks.md` (30 tracked tasks) | `8be9c81` |
| P4 implementation | `backend/` — Spring Boot 3.5.14 / Java 21, Flyway `V1__create_greeting.sql`, embedded H2 file at `backend/data/gogo.mv.db`, `JdbcTemplate` repository, read-only `GET /api/greeting` (`text/plain`), 3 acceptance tests. `frontend/` — React 19 + Vite 8, fetch-and-render `App.jsx` with a failure branch, `/api` dev proxy, public-registry lockfile. `.github/workflows/ci.yml` — backend `mvn -B test` (Java 21) + frontend `npm ci && npm run build` (Node 24). `README.md` run instructions and CI description; `.gitignore` for `data/` and `logs/` | `bbc3b5c` |
| P4 verification records | local verify report + checkpoint log, pipeline report, `ci-report.md` (E1 slot), unsigned `g2-decision.md`, P4 quality checklist | `bbc3b5c` |
| P5 archive & evolve | this summary, unsigned `g3-decision.md`, OpenSpec archive, P5 quality checklist | P5 commit |

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

**Status is not a clean Pass.** Local verify Overall is **Partial** and the P4
quality checklist Overall is **Fail** on check P4-2, because the required
condition "Local Overall is Pass, or Fail with a complete human-signed Waiver" is
not met. Drivers: the repo command whitelist
(`docs/feedback/verification-commands.md`) is placeholder-only; remote CI is
unreadable here (`gh` absent, `api.github.com` → HTTP 403); E3 human review is
pending; V1 task completion was 25/30 at report time. This is an evidence/gate
gap, not an implementation defect — no CRITICAL finding is open.

## Residual risks

| # | Risk / gap | Owner | Status |
|---|---|---|---|
| 1 | Remote CI never observed; first run may fail on dependency download, action tag resolution or Node 24 availability | VL / Dev | open — pipeline report Partial, E1 ❓ 未验证, human confirmation unsigned |
| 2 | Action majors `checkout@v4` / `setup-java@v4` / `setup-node@v4` not verified against the marketplace from this machine | Dev | open |
| 3 | OQ-2: `TODO.md` line 21 requires Flyway while line 33 lists migration tooling as a non-goal; implementation follows line 21 | IO / SA | deferred — needs a named G1 decision |
| 4 | OQ-3: `text/plain` vs JSON response contract | IO / SA | deferred — delta spec fixes only the body value, so a switch stays spec-compatible |
| 5 | OQ-4: `TODO.md` still says SQLite while the implementation uses H2 | IO | deferred — README records the deviation and the switch cost |
| 6 | Command whitelist empty, so local verify can never reach Pass | Dev / SA | open — fill the three layers with the commands actually used |
| 7 | E2E acceptance is manual; no committed browser suite | Dev / SA | accepted for this slice (R6); repeatability risk |
| 8 | No secret-scan / SAST job in CI | Dev / SA | accepted for this slice |
| 9 | Cold-cache npm install through the corporate mirror unproven (tarballs were cache hits) | Dev | open |
| 10 | Red-green ATDD order not honored (R4): implementation preceded the artifacts | Dev | mitigated — mutation check added, every scenario re-verified |
| 11 | Ports 8080/5173 contested by other local projects; one killed our JVM mid-verification | Dev | mitigated — detached starts, verified by port owner + endpoint response |
| 12 | G1, G2 and G3 all **NOT RECORDED**; no named IO / SA / VL has signed | IO / SA / VL | open — the agent must not self-approve |

Follow-up candidates (non-authoritative): fill the verification-commands
whitelist; resolve OQ-2/OQ-3/OQ-4 and update `TODO.md`; add a committed E2E suite
if repeatability becomes a requirement; consider a JSON contract if a second
consumer appears; add secret-scan/SAST when the repo leaves teaching-baseline
status.

## Links

- Proposal: `openspec/changes/req-001-hello-world/proposal.md`
- Delta spec: `openspec/changes/req-001-hello-world/specs/greeting/spec.md`
- Design: `openspec/changes/req-001-hello-world/design.md`
- ATDD design: `openspec/changes/req-001-hello-world/atdd-design.md`
- Tasks: `openspec/changes/req-001-hello-world/tasks.md`
- AC/DoV review: `openspec/changes/req-001-hello-world/dov-ac-review.md`
- Gate drafts (all unsigned): `g1-decision.md`, `g2-decision.md`, `g3-decision.md`
- E1 slot: `openspec/changes/req-001-hello-world/ci-report.md`
- Local verify: `docs/ai4se-plugins/20261113-145614-local-verify-report.md`
  (+ `…-local-verify-checkpoint.md`)
- Pipeline: `docs/ai4se-plugins/20261113-145614-pipeline-report.md`
- Quality checklists: P1 `20261113-143539`, P2 `20261113-144038`,
  P3 `20261113-144819`, P4 `20261113-145614`, P5 (this stage's report)
- Requirement workspace: `requirement-workspace/requirements/REQ-001.md`,
  `requirement-workspace/deep-dive.md`, `requirement-workspace/impact-brief.md`,
  `requirement-workspace/analysis/req-001-dor.md`
- Remote: `https://github.com/lianyue910-a11y/gogo.git`, branch `main`
- Archive location: `openspec/changes/archive/2026-11-13-req-001-hello-world/`
  (all 11 artifacts). Living Spec: `openspec/specs/greeting/spec.md` — 3
  requirements, 6 scenarios; `openspec validate --specs --strict` → 1 passed, 0
  failed. The archive CLI warned "25/30 tasks, 5 incomplete" and continued under
  `--yes`; the open items were the push and the P5 record steps.

This summary is not a G3 decision and not Living Spec authority.