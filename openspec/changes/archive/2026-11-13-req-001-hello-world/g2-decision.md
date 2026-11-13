# G2 decision — req-001-hello-world

**STATUS: NOT RECORDED — awaiting named human sign-off.**

This file is an unsigned draft prepared by the implementing agent. Per the G2
contract the approver must be a named **VL**; an agent must never self-approve.
No decision below has been made.

- Gate: G2 (Verify)
- Change id: `req-001-hello-world`
- Inputs:
  - local-verify: `docs/ai4se-plugins/20261113-145614-local-verify-report.md`
    (Overall **Partial**)
  - local-verify checkpoint: `docs/ai4se-plugins/20261113-145614-local-verify-checkpoint.md`
  - pipeline ci: `docs/ai4se-plugins/20261113-145614-pipeline-report.md` and
    `openspec/changes/req-001-hello-world/ci-report.md` (Overall **Partial**,
    E1 ❓ 未验证, human confirmation **unsigned** — therefore not citable as
    `Pass-by-human-confirm`)
  - pipeline cd: n/a — no deployment in scope
  - delta spec: `specs/greeting/spec.md`
  - AC/DoV review: `dov-ac-review.md`
  - G1 record: `g1-decision.md` — **NOT RECORDED**, IO and SA unnamed
- Dimension results:

| Dimension | Result | Source |
|---|---|---|
| build | Pass | `mvn -o -B package` and `npm run build` both exit 0 |
| scan | Skipped | No lint / typecheck / SAST tool configured; manual non-goal greps recorded as evidence |
| review | Pass | Agent code review (E2). Human review (E3) pending |
| evidence | Partial | V1 Partial (25/30 tasks; push + P5 steps remain), V2–V8 Pass |
| ci | Partial | E1 ❓ 未验证 — no remote data, no named human confirmation |
| cd | Skipped | Out of scope |

- Defect grades: CRITICAL 0 open; WARNING 8; SUGGESTION 3 (see the local verify
  report Findings tables).
- Decision: **not recorded** (must be one of Pass | Fail | Conditional, chosen by
  the named VL).
- Waivers / conditions + owners: none recorded. The local-verify Waiver section is
  `N/A — no waiver` because Overall is Partial, not Fail.
- Approvers: VL = **unnamed** (required). No signature.
- Timestamp: draft prepared 2026-11-13 14:56 (UTC+08:00); decision timestamp empty.

## Why a Pass would be rejected right now

The G2 contract rejects `Decision=Pass` with missing local-verify or required
pipeline evidence. Both are present as artifacts but neither is terminal:

1. Local-verify Overall is **Partial**, driven by an empty command whitelist
   (`docs/feedback/verification-commands.md` is placeholder-only), unverified
   remote CI, and pending human review.
2. The pipeline report is **Partial** with an **unsigned** human-confirmation
   section, so it cannot be cited as `Pass-by-human-confirm`.
3. G1 is still **NOT RECORDED** with OQ-2 (Flyway vs `TODO.md` non-goal) and OQ-3
   (`text/plain` vs JSON) deferred. A G2 Pass would not clear those upstream
   ambiguities.

A **Conditional** decision is possible only with named remediation items and
owners. Proposed remediation (for the VL to accept, amend or reject — not yet
agreed):

| # | Condition | Owner | Evidence needed to close |
|---|---|---|---|
| 1 | Push `main` and obtain a named human confirmation of the CI run, or restore remote read access | VL / Dev | Run SHA + URL + signed confirmation in the pipeline report |
| 2 | Fill `docs/feedback/verification-commands.md` with the three-layer commands actually used | Dev / SA | Non-empty whitelist; re-run local-verify |
| 3 | Resolve OQ-2 (Flyway vs migration-tooling non-goal) and OQ-3 (media type) | IO / SA | Named decision in `g1-decision.md` |
| 4 | Resolve OQ-4 (`TODO.md` still says SQLite) | IO | Updated `TODO.md` or written acceptance of H2 |
| 5 | Complete remaining tasks 3.3, 5.3–5.6 | Dev | `tasks.md` 30/30 |

## Traceability appendix

| Requirement | Spec | Code | Test / evidence |
|---|---|---|---|
| Persisted greeting storage | `specs/greeting/spec.md` — "Persisted greeting storage" | `backend/src/main/resources/db/migration/V1__create_greeting.sql`, `backend/src/main/resources/application.yml` | H2 Shell after deleting `backend/data/`: `1 \| Hello World`, ROW_COUNT 1; after restart: same, ROW_COUNT 1, Flyway "No migration necessary" |
| Greeting read endpoint | same — "Greeting read endpoint" | `GreetingController.java`, `GreetingRepository.java` | `GreetingApiTest.returnsHelloWorldFromDatabase`, `returnsTheStoredMessageWhenItChanges` (+ mutation check), `rejectsWriteMethods`; `curl -i` → 200 `text/plain` `Hello World`; POST/PUT/DELETE → 405 |
| Home page renders the served greeting | same — "Home page renders the served greeting" | `frontend/src/App.jsx`, `frontend/vite.config.js` | Browser `h1` → `Hello World`; backend stopped → `[role='alert']` and `body` → `Failed to load the greeting: HTTP 502`, no heading; `grep "Hello World" frontend/src` → no match |

Scenario coverage: 6/6 exercised with observed evidence. Non-goal reverse checks:
5/5 performed (read-only 405, no front-end literal, no ORM, no credentials needed,
no external database service).