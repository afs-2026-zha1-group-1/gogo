# G1 decision — req-002-greeting-json-sqlite

- Change id: `req-002-greeting-json-sqlite`
- Gate: G1 (Align)
- Status: **NOT RECORDED** — draft prepared by the agent, awaiting named human
  IO and SA signatures. The agent must not self-approve.
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
    `REQ-002.md` with owners. Blocking not-resolved = **0**.
- Decision: **not recorded yet.**
- Why the record is being held: the G1 contract requires named IO **and** SA
  approvers. The IO content decision is already given verbatim, but the gate
  signature covers the delta and the technical design as a whole, and no human
  has signed this change's record. REQ-001's authorization ("都签署我的名字即可
  Johnson") was scoped to REQ-001's three gates and is **not** inherited here.
- Conditions + owners: none outstanding. Two items are carried as P4 verification
  obligations, not as G1 ambiguities:

  | # | Item | Owner | Where it must be closed |
  |---|---|---|---|
  | 1 | Prove Flyway 11.7.2 actually migrates SQLite (jar inspection is not execution) | Dev / SA | P4 local-verify report, scenarios AC4 and AC5 |
  | 2 | Obtain a **fresh** named human CI confirmation for this change's commit — REQ-001's confirmation predates the sqlite-jdbc dependency | VL / Johnson | P4 pipeline report, four-field human-confirm table |

- Approvers: **IO = pending**, **SA = pending**. One person holds both roles in
  this single-person project; the concentration will be recorded explicitly when
  signed, as it was for REQ-001.
- Timestamp: draft prepared 2026-11-13 (UTC+08:00), P2.

## Next

P3 authors `design.md`, `atdd-design.md` and `tasks.md`. G1 is signed only after a
named human confirms the delta and the design; until then this file stays
NOT RECORDED and no downstream gate may cite it as approved.