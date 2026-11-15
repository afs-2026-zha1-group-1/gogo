# G1 decision — req-002-greeting-json-sqlite

- Change id: `req-002-greeting-json-sqlite`
- Gate: G1 (Align)
- Status: **RECORDED** — signed by named human IO and SA.
- Inputs:
  - Delta Spec: `specs/greeting/spec.md` (1 MODIFIED requirement, 2 scenarios)
    against the Living Spec `openspec/specs/greeting/spec.md`
  - AC/DoV review: `dov-ac-review.md` (AC-1…AC-4 Pass; DoV-1…DoV-5 **all Pass**)
  - Validation: `/d/nvm4w/nodejs/openspec validate req-002-greeting-json-sqlite`
    → "is valid"; with `--strict` → "is valid" (CLI 1.16.1)
  - Requirements: `requirement-workspace/requirements/REQ-002.md`,
    `requirement-workspace/analysis/req-002-dor.md` (BLOCKER = 0, A0 Pass),
    `requirement-workspace/deep-dive.md` §REQ-002, `TODO.md`
  - Proposal: `proposal.md`
  - Design: `design.md` (D9–D16, inherited D1–D8 disposition)
  - Verification to date: `docs/ai4se-plugins/20261113-162526-local-verify-report.md`
    (Overall Partial — implementation green, human/CI inputs pending)
  - IO ruling (verbatim, in session 2026-11-13): "open question使用flyway json，
    数据库改为sqllite"; JSON shape clarified as `{"message":"Hello World"}`
- Findings (scope / ambiguity / conflict):
  - **Scope:** one modified requirement in the existing `greeting` capability,
    matching the proposal. The SQLite engine switch, the driver dependency, the
    test datasource and the verification tooling carry no spec text because they
    are not wire- or display-observable; they are recorded in `design.md`. No
    silent expansion: the CI job structure, the lockfile design and every REQ-001
    non-goal are untouched.
  - **Conflict with the merged Living Spec:** explicit and intended. The current
    scenario "Stored greeting is returned" requires "the response body is exactly
    `Hello World`". The MODIFIED delta replaces that requirement with the JSON
    contract. The archive of REQ-001 is not edited.
  - **Conflict between delta requirements:** none — the delta touches one
    requirement, and the two unchanged requirements remain satisfiable
    simultaneously (the heading text the visitor sees is identical).
  - **Ambiguity:** none open. OQ-2 (Flyway), OQ-3 (media type) and OQ-4 (engine
    vs documentation) are all **resolved** by the IO ruling above. OQ-5 (migrate
    existing H2 rows?) and OQ-6 (extra Flyway module for SQLite?) are resolved in
    `REQ-002.md`. Blocking not-resolved = **0**.
- Decision: **Pass**
- Conditions + owners: **none.** Two items were carried from the earlier draft as
  P4 verification obligations rather than G1 ambiguities; their disposition:

  | # | Item | Owner | Outcome |
  |---|---|---|---|
  | 1 | Prove Flyway 11.7.2 actually migrates SQLite (jar inspection is not execution) | Dev / SA | **Closed by execution** — first start applied `V1` to `schema "main"`; `flyway_schema_history` holds exactly one row `('1', 'create greeting', 1)`; a restart reported "No migration necessary". Evidence in the local-verify report, scenarios AC4/AC5 |
  | 2 | Obtain a **fresh** named human CI confirmation for this change's commit — REQ-001's confirmation predates the sqlite-jdbc dependency | VL / Johnson | **Open — carried to G2.** This change's commit was pushed to both remotes at 17:19 (+08:00); the confirmation itself is a G2 input, not a G1 ambiguity. Until it lands, G2 stays NOT RECORDED and the pipeline report stays Partial without the `Pass-by-human-confirm` label |

- Approvers: **IO = Johnson**, **SA = Johnson**. Signature authorized in session:
  "没问题，授权推送。签署Johnson。" Johnson holds both roles in this single-person
  project; the concentration is recorded explicitly rather than implied. The agent
  recorded the decision and did not self-approve.
- Timestamp: decision recorded 2026-11-13 17:20 (UTC+08:00). Unsigned draft
  prepared 2026-11-13 during P2; superseded by this record.

## Why Pass is valid

The G1 contract rejects `Decision=Pass` when an ambiguity is unresolved, and
requires Conditional to carry remediation items with owners.

1. **No ambiguity is open.** The three open questions that REQ-001 carried are
   closed by explicit IO rulings, and the two technical questions (OQ-5, OQ-6) are
   resolved in the requirement entry. Blocking not-resolved = 0.
2. **The one conflict is intended and recorded** — the delta deliberately replaces
   the `text/plain` contract, and REQ-001's archive stays immutable.
3. **Scope matches the proposal** — one MODIFIED requirement; the engine change is
   a design decision because the storage requirement is engine-agnostic.
4. **The carried obligation that could have changed the approach is closed** —
   Flyway really runs on SQLite, proven by execution, so the design verified at G2
   will be the design in `design.md`.

The remaining carried item (a fresh CI confirmation) does not create ambiguity in
the requirement or the design. It is evidence for G2, and G2's own contract
already gates on it. Recording G1 as Conditional for a missing CI run would
misdescribe the gate: nothing about the alignment is uncertain.

## Traceability to the decision

| Ruling | Where it landed | Verified |
|---|---|---|
| Keep Flyway (OQ-2) | `design.md` D2 confirmed; `V1__create_greeting.sql` in SQLite dialect (D10) | Migration applied, idempotent on restart |
| Use JSON (OQ-3) | Delta spec MODIFIED requirement + scenario; `design.md` D11 | `curl` → 200 `application/json` `{"message":"Hello World"}`; test asserts `jsonPath("$.message")` |
| Database back to SQLite (OQ-4) | `design.md` D9; `pom.xml`, `application.yml`; `TODO.md` already agreed | Python `sqlite3` → one row `Hello World`; no H2 residue (reverse check) |
| No H2 data migration (OQ-5) | `design.md` D14 | `backend/data/` deleted and rebuilt fresh |
| No extra Flyway module (OQ-6) | No dependency change beyond the driver | Migration log shows `SQLite 3.49` |

## Next

G2 (`g2-decision.md`) stays **NOT RECORDED** until two inputs are terminal: a
re-recorded local-verify report with E3 Signed, and a pipeline report carrying a
fresh four-field human confirmation cited in Inputs. On G2 Pass → archive lane.
The agent does not sign G2 or G3.