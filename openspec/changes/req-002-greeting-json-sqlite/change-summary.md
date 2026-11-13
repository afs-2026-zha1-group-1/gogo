# Change summary — req-002-greeting-json-sqlite

**Status: implementation complete and locally verified; archive, gate signatures
and push are PENDING.** This summary is written before the living-merge so a human
SA can decide from it. It is not a G3 decision and not Living Spec authority.

## Intent

REQ-001 shipped a Hello World slice on H2 serving `text/plain`, and carried three
open questions into its G1 record. On 2026-11-13 the IO ruled on all three:
"open question使用flyway json，数据库改为sqllite" — **keep Flyway**, **use JSON**,
**database back to SQLite**. The JSON body shape was clarified in session as
`{"message":"Hello World"}`.

Those rulings close REQ-001's OQ-2/OQ-3/OQ-4, but two of them change what REQ-001
already shipped and verified. REQ-001's archive is therefore **not edited**: the
JSON contract and the SQLite engine are new scope, carried by this change with its
own delta, its own verification run and its own gates.

Scope: one MODIFIED requirement in the existing `greeting` capability. The engine
switch carries no spec text because the storage requirement is engine-agnostic —
it is design decision D9, not a spec change.

Non-goals honored (all seven reverse-checked): no greeting management UI or write
API, no hard-coded front-end greeting, no ORM, no user system or permissions, no
separate database service, no extra JSON fields, no H2 residue. Also out of scope:
no H2→SQLite data migration, no CI job restructuring, no deployment or CD trigger,
no committed browser automation suite, no NFR tests, no i18n, no content
negotiation or envelope versioning.

## What shipped

| Area | Delivered | Commit |
|---|---|---|
| P1 intent & proposal | `requirement-workspace/intents/2026-11-13-req-002.md` (4 verbatim raw sources), `requirements/REQ-002.md` (six-field entry, AC1–AC6-N, OQ-2/3/4 inherited resolved, OQ-5/OQ-6 resolved, blocking not-resolved = 0), `analysis/req-002-dor.md` (12 items Pass, A0 Pass, BLOCKER 0), `deep-dive.md` §REQ-002 (⑨–⑫), registry row, `proposal.md` | `7d1132e` |
| P2 delta spec | `specs/greeting/spec.md` — 1 MODIFIED requirement, 2 scenarios; `dov-ac-review.md` (AC-1…AC-4 Pass, DoV-1…DoV-5 all Pass); `g1-decision.md` (NOT RECORDED) | `0239566` |
| P3 design & decomposition | `design.md` (D9–D15, inherited D1–D8 disposition, R7–R13), `atdd-design.md` (API + E2E layers, real red-green-mutation order, 7 non-goal reverse checks), `tasks.md` (32 tasks, 0 pre-checked), P3 quality checklist (Pass) | `2558d25` |
| P4 implementation | `backend/pom.xml` — H2 removed, `org.xerial:sqlite-jdbc` added (runtime, BOM-managed 3.49.1.0, no pin). `application.yml` — `jdbc:sqlite:./data/gogo.db`, `org.sqlite.JDBC`, H2 credentials dropped. `V1__create_greeting.sql` — SQLite dialect, edited in place, still seeds one `Hello World` row. `GreetingResponse.java` — new one-component record. `GreetingController.java` — `produces = APPLICATION_JSON_VALUE`, returns the record. `HelloApplication.java` — `Files.createDirectories(Path.of("data"))` (D16). `GreetingApiTest.java` — JSON assertions, SQLite shared-cache in-memory datasource with Hikari pool size 1. `GreetingRepository.java` — **unchanged**. `frontend/src/App.jsx` — `response.json()` → `data.message`. `README.md`, `.gitignore` comment | `0d1c1a8` |
| P4 verification records | local-verify report (Overall **Partial**) + checkpoint log C1–C12, whitelist extraction and runner log (5 attempted / 0 failed), pipeline report + `ci-report.md` (Overall **Partial**, human confirmation **NOT SIGNED**), `g2-decision.md` (NOT RECORDED), P4 quality checklist (Stage Overall **Partial**), rewritten `verification-commands.md` and `verification-matrix.md`. D16 and task 1.10 added; task count 32 → 33 | `0d1c1a8` |
| P5 artifacts (pre-archive) | this summary, `g3-decision.md` (NOT RECORDED), P5 quality checklist `20261113-164151` (Pass **pre-archive**, roll-up Partial), KB Skipped record, registry row refreshed. **The archive itself has not run** | P5 commit |
| Archive, gate signing, push | **PENDING** — requires explicit user authorization (tasks 3.5, 3.6, 5.5) and named IO/SA/VL signatures | not yet |

Predecessor commit `0787b89` recorded the IO rulings and re-signed REQ-001's G1 as
Pass; it belongs to REQ-001's trail, not this one.

Specs merged: **not yet.** The MODIFIED delta is still in
`openspec/changes/req-002-greeting-json-sqlite/specs/greeting/spec.md`. The Living
Spec `openspec/specs/greeting/spec.md` still says "the response body is exactly
`Hello World`" — that is the pre-change contract and is correct until the archive
step applies the delta. `openspec validate req-002-greeting-json-sqlite --strict`
→ "is valid" (CLI 1.16.1).

Superseded REQ-001 decisions (recorded in `design.md`, not silently dropped):

| REQ-001 decision | Disposition | Replacement |
|---|---|---|
| D1 — embedded H2 in file mode with `AUTO_SERVER=TRUE` | **Superseded** | D9 — SQLite via `org.xerial:sqlite-jdbc`, `jdbc:sqlite:./data/gogo.db` |
| D4 — `text/plain` response body | **Superseded** | D11 — `GreetingResponse` record served as `application/json` |
| D2 — Flyway migration | **Confirmed** by the OQ-2 ruling; now proven on SQLite by execution | unchanged |
| D3 (`JdbcTemplate`, no ORM), D5 (dev proxy), D6 (public lockfile + local mirror), D7 (two CI jobs), D8 (Boot 3.5.14 / Java 21 / React 19 / Vite 8) | **Inherited unchanged** and re-confirmed | unchanged |

KB update: **Skipped (not configured)** — `scripts/README.md` documents
`kb-lint.sh` as a non-blocking no-op that prints `SKIP` and exits 0, and states
that P5 may record this Skipped status but must not report KB lint or index refresh
as Passed. No knowledge-base change is claimed.

## Verify highlights

All six scenarios were exercised with observed evidence
(`docs/ai4se-plugins/20261113-162526-local-verify-report.md`): 2 MODIFIED delta
scenarios plus 4 Living Spec scenarios re-verified because the engine and the media
type changed.

| Scenario | Evidence |
|---|---|
| Stored greeting is returned (MODIFIED) | `curl -s -i` → `HTTP/1.1 200`, `Content-Type: application/json`, body exactly `{"message":"Hello World"}` — one key, no envelope. `GreetingApiTest` asserts `contentTypeCompatibleWith(APPLICATION_JSON)` + `jsonPath("$.message")` |
| Response reflects stored data, not a constant (MODIFIED) | **Mutation check:** controller returned a literal record → `JSON path "$.message" expected:<Guten Tag> but was:<Hello World>` → reverted → 3/0 green (`logs/req002-mutation.log`) |
| First start creates and seeds the database | `rm -rf backend/data` then start the jar → `data/gogo.db` created (20480 bytes), `Successfully applied 1 migration to schema "main", now at version v1`; Python `sqlite3` → `rows: [(1, 'Hello World')]`, `count: 1`. **Passes only after the D16 fix** |
| Later start preserves the seeded greeting | Restart against the existing file → `Schema "main" is up to date. No migration necessary.`; `count: 1`; `flyway_schema_history` = `[('1', 'create greeting', 1)]` |
| Home page shows the served greeting | Browser DOM `{"h1":"Hello World","alert":null,"bodyText":"Hello World"}`, title `GOGO`; screenshot `logs/req002-home.png` |
| Backend unavailable | Backend stopped → proxy 502 → DOM `{"h1":null,"alert":"Failed to load the greeting: HTTP 502"}`, no heading; screenshot `logs/req002-backend-down.png`; restart → heading returns |

Non-goal reverse checks, **7/7**: POST/PUT/DELETE → 405 with the row unchanged; no
greeting literal in `frontend/src`; no JPA/Hibernate in `backend/pom.xml`; GET
without credentials → 200 JSON; backend starts with no external database service;
the body has exactly one key `message`; no H2 dependency, driver class or URL left
in `backend/`.

Build gates: `mvn -B test` → 3 tests, 0 failures; `mvn -B package` → jar built;
`npm ci` → 0 vulnerabilities; `npm run build` → vite 8.3.8, 15 modules, dist built;
CI YAML parses and declares exactly `['backend', 'frontend']`. D6 re-confirmed: 0
corporate hosts in the committed lockfile, which this change did not modify.

**Red-green order was honored**, unlike REQ-001's R4 deviation. The JSON assertions
were written against the still-`text/plain` controller and failed 3/3 with
assertion-level messages (`Content type [text/plain;charset=UTF-8] is not
compatible with [application/json]`, `No value at JSON path "$.message"`), then the
implementation made them pass 3/0 (`logs/req002-red.log`, `logs/req002-green.log`).

**Flyway on SQLite is now proven by execution**, closing G1 obligation 1 and risk
R10. Jar inspection had shown `SQLiteDatabaseType` in `flyway-core` 11.7.2; the
migration log and `flyway_schema_history` now show it actually ran, once, and was
idempotent on restart. No extra Flyway vendor module was needed (OQ-6).

### The defect verification caught

**The engine swap alone did not satisfy the storage requirement.** With
`backend/data/` deleted the packaged jar failed to start:

```
java.sql.SQLException: path to './data/gogo.db':
'D:\Documents\AI_training\Day15\GOGO\gogo\backend\.\data' does not exist
```

H2 created the parent directory implicitly; the SQLite driver creates the database
*file* but not its parent *directory*. The Living Spec scenario "First start
creates and seeds the database" requires this to happen automatically, so this was
a real spec failure, not a documentation nit.

Fix (D16, task 1.10): one line in `HelloApplication.main`. It was mutation-checked
in both directions — removed, the failure reproduced and 8080 never listened
(`logs/req002-dir-defect.log`); restored, first start succeeded (`logs/backend.log`).

Two honesty notes recorded in the checkpoint log:

- The unit tests passed before *and* after the fix, because they use an in-memory
  URL and never exercise the file path. Only the E2E first-start check catches it.
  This is residual risk 8.
- The original failure log had been overwritten by a restart before it could be
  cited. Rather than assert unbacked evidence, the defect was **deliberately
  reproduced** to regenerate the log (checkpoint C8).

## Gate outcomes

| Gate | Decision | Approver(s) | Notes |
|---|---|---|---|
| G1 Align | **NOT RECORDED** | IO = pending, SA = pending | The IO content ruling is given verbatim, but no human has signed this change's record. No ambiguity is open (blocking not-resolved = 0). Obligation 1 (Flyway on SQLite) is closed by execution; obligation 2 (fresh CI confirmation) is open |
| G2 Verify | **NOT RECORDED** | VL = pending | Local-verify Overall is **Partial** and the pipeline report is **Partial without** `Pass-by-human-confirm`, so neither input is terminal. The draft cites both and lists what must close |
| G3 Merge & Archive | **NOT RECORDED** | SA = pending | Archive has not run; task 5.5 merge-ready confirmation has not been given |

**REQ-001's authorization is not inherited.** "没问题，ci全绿。都签署我的名字即可
Johnson" was scoped to REQ-001's three gates and to a CI run that predates the
`sqlite-jdbc` dependency. Reusing it here would claim evidence for a build that
never contained this change. The agent recorded the drafts and did not
self-approve.

Process authorization is kept distinct from gate signature: the standing
instruction "帮我按照Openspec 的方式从P1-P5进行编写和commit。每个P都commit一次。"
authorizes authoring artifacts and committing each stage. It does **not** authorize
the push of this change, the living-merge, or any gate signature.

## Residual risks

| # | Risk / gap | Owner | Status |
|---|---|---|---|
| 1 | Remote CI may fail to resolve `sqlite-jdbc` from Maven Central on a GitHub-hosted runner; locally it resolved only through the corporate mirror | Johnson (VL) / Dev | **open** — no run exists for this change. Task 3.5 push, then task 3.6 fresh confirmation. Pipeline report must stay Partial until then |
| 2 | G1/G2/G3 all NOT RECORDED; E3 Human Pending | Johnson (IO/SA/VL) | **open** — human-only decision; the agent must not self-approve |
| 3 | Remote CI is not machine-readable from this host (`gh` absent, `api.github.com` → 403) | Dev / Johnson | inherited from REQ-001 — even after a push, the best available label is `Partial (Pass-by-human-confirm)`, never an API-verified Pass |
| 4 | The D16 directory fix lives in `main`, so `@SpringBootTest` never exercises it | Dev | mitigated — the E2E first-start check covers the real path and is in the whitelist; residual risk 8 in the local-verify report |
| 5 | SQLite locking under concurrent access | Dev / SA | accepted — read-only endpoint, one seeded row, tests pin the pool to 1 (D12/R9). No concurrency is in scope |
| 6 | E2E acceptance is manual; no committed browser suite | Dev / SA | accepted — declared non-goal; evidence and screenshots recorded per scenario |
| 7 | Cold-cache npm install through the corporate mirror unproven | Dev | tracking, inherited — clearing the shared cache affects every other project on this machine and was not authorized |
| 8 | The whitelist probe extracts only the first bash fence, so the runner covers the Static layer; Runtime and System are manual | Dev / SA | accepted for this slice — pack-script limitation, out of scope; manual exits tabulated in the local-verify report |
| 9 | A user-level `~/.m2/settings.xml` outside the repo was required to resolve the driver | Dev | disclosed (R7) — created from the user-supplied corporate file with `localRepository` overridden to the warm cache. Holds credentials, never committed, never printed. A fresh clone elsewhere needs its own mirror config |
| 10 | The "non-JSON body with a 200 status" branch was reasoned about, not separately exercised | Dev | accepted — it shares the verified `.catch` branch (the 502 case rendered the alert); exercising it needs route interception, which is not a committed capability |
| 11 | Ports 8080/5173 contested by other local projects; a stale REQ-001 process could masquerade as a pass | Dev | mitigated (R12) — every process was confirmed by command line before being stopped, and each verification re-checked the port owner **plus** the response content type |
| 12 | One person holds IO, SA and VL, so there is no independent reviewer | Johnson | accepted — will be recorded explicitly in each gate record when signed, as for REQ-001 |
| 13 | No secret-scan / SAST job in CI; no lint or typecheck tool in the repo | Dev / SA | accepted for this slice — the static-scan dimension is Skipped with a reason, never claimed as Pass |
| 14 | REQ-001's signed G2/G3 evidence no longer describes the shipped behavior | Dev | mitigated (R11) — the archive stays immutable and carries a post-decision note pointing here; nothing is inherited |

Follow-up candidates (non-authoritative): restore remote CI read access and re-run
`/sdd:pipeline-report` for machine evidence; add a committed E2E suite if
repeatability becomes a requirement; make the whitelist probe extract every bash
fence so the runner covers all three layers; add secret-scan/SAST when the repo
leaves teaching-baseline status; configure the KB or run `/sdd:evolve` for the
remaining harness gaps; consider a cold-cache install proof in an isolated cache.

## Links

Paths are relative to the change folder
`openspec/changes/req-002-greeting-json-sqlite/` unless prefixed with `docs/`,
`openspec/specs/` or `requirement-workspace/`.

- Proposal: `proposal.md`
- Delta spec: `specs/greeting/spec.md` — 1 MODIFIED requirement, 2 scenarios
- Design: `design.md` — D9–D16, inherited D1–D8 disposition, R7–R13
- ATDD design: `atdd-design.md`
- Tasks: `tasks.md` — **30/33** complete; open: 3.5 (push), 3.6 (fresh CI
  confirmation), 5.5 (merge-ready confirmation). All three require the user
- AC/DoV review: `dov-ac-review.md`
- Gate records (all NOT RECORDED): `g1-decision.md`, `g2-decision.md`,
  `g3-decision.md`
- E1 slot: `ci-report.md` — Partial, human confirmation NOT SIGNED
- Local verify: `docs/ai4se-plugins/20261113-162526-local-verify-report.md`
  (Overall **Partial**); checkpoint
  `20261113-163312-local-verify-report-checkpoints.md`; whitelist run logs
  `20261113-162020-local-verify-commands.txt`,
  `20261113-162029-local-verify-run.log`
- Pipeline: `docs/ai4se-plugins/20261113-162653-pipeline-report.md` — Partial,
  Data source `none`, **not** `Pass-by-human-confirm`
- Verification whitelist: `docs/feedback/verification-commands.md`,
  `docs/feedback/verification-matrix.md`
- Quality checklists: P3 `20261113-160916` (Pass), P4 `20261113-163448`
  (**Partial**, roll-up Partial), P5 `20261113-164151` (Pass **pre-archive**,
  roll-up Partial)
- Requirement workspace: `requirement-workspace/requirements/REQ-002.md`,
  `requirement-workspace/intents/2026-11-13-req-002.md`,
  `requirement-workspace/deep-dive.md` §REQ-002,
  `requirement-workspace/analysis/req-002-dor.md`,
  `requirement-workspace/registry.md`
- Predecessor: `openspec/changes/archive/2026-11-13-req-001-hello-world/` — shipped
  `text/plain` on H2; its G2/G3 records carry a post-decision note pointing here
- Living Spec: `openspec/specs/greeting/spec.md` — still the REQ-001 contract until
  the archive applies the MODIFIED delta
- Remote: `https://github.com/lianyue910-a11y/gogo.git`, branch `main`. At the P4
  commit `0d1c1a8` local `main` was **5 commits ahead** of `origin/main`
  (`0787b89`, `7d1132e`, `0239566`, `2558d25`, `0d1c1a8`); nothing from this change
  is pushed. The P5 commit adds one more
- Evidence logs and screenshots: gitignored `logs/` — `req002-red.log`,
  `req002-green.log`, `req002-mutation.log`, `req002-package.log`,
  `req002-dir-defect.log`, `backend.log`, `backend-restart.log`,
  `req002-npm-ci.log`, `req002-npm-build.log`, `frontend.log`, `req002-home.png`,
  `req002-backend-down.png`

This summary is not a G3 decision and not Living Spec authority.