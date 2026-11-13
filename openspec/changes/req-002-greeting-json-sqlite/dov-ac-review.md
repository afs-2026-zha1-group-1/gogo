# AC / DoV review — req-002-greeting-json-sqlite

- Date: 2026-11-13
- Stage: P2, `/sdd:delta-craft step=all`
- Delta Spec: `openspec/changes/req-002-greeting-json-sqlite/specs/greeting/spec.md`
- Checklist source: `vendor/ai4se-plugins/skills/spec/delta-craft/references/dov-ac-checklist.md`
- Validation evidence: `/d/nvm4w/nodejs/openspec validate req-002-greeting-json-sqlite`
  → "is valid"; same command with `--strict` → "is valid" (CLI 1.16.1; the PATH
  `openspec` is 1.6.0 and was not used)

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has ≥1 testable AC | Pass | Delta: 1 MODIFIED requirement, 2 scenarios | Both scenarios are restated, not merely inherited — the body assertion changed |
| AC-2 ACs are observable | Pass | Same file | HTTP status, `Content-Type` header and the exact JSON body are all observable on the wire; the second scenario is observable by changing the stored row and re-reading |
| AC-3 negative / edge cases where risk is high | Pass | "Response reflects stored data, not a constant"; unchanged Living Spec scenarios "Backend unavailable" and "Later start preserves the seeded greeting" | The no-hard-code constraint, the idempotent restart and the backend-down reverse case all still apply and are re-verified in P4 because both the transport and the engine changed |
| AC-4 no disguised implementation detail, no vague wording | Pass | Same file | No engine, driver, framework, class or library name. `application/json` and the JSON field name are wire-observable contract, not implementation. SQLite, `sqlite-jdbc`, Flyway and the record type stay in `design.md` |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal | Pass | `proposal.md` §What Changes / §Capabilities vs the delta | Exactly one modified requirement. The SQLite switch is deliberately **not** a spec change: the storage requirement is engine-agnostic, so naming SQLite in the spec would violate AC-4. It is traceable through `design.md` D9, `README.md` and `TODO.md` line 13 |
| DoV-2 ambiguities listed or resolved | Pass | `requirements/REQ-002.md` §Open questions | OQ-2, OQ-3, OQ-4 all **resolved** by the verbatim IO ruling of 2026-11-13; OQ-5 (H2 row migration) and OQ-6 (extra Flyway module) resolved with owners. Blocking not-resolved = 0. This is the item that was Partial in REQ-001 |
| DoV-3 role concerns noted for residual risk | Pass | This file §Residual concerns; `analysis/req-002-dor.md` §Advisory findings | VL: the inherited CI confirmation does not cover sqlite-jdbc. SA: Flyway SQLite support must be proven by a real migration run. Dev: test-datasource strategy unsettled |
| DoV-4 no business implementation claimed done here | Pass | P2 authored the delta and this review only | No production code was edited in this stage. Unlike REQ-001 there is no R4-style deviation: the artifacts precede the implementation |
| DoV-5 requirements trace to proposal / approved requirements | Pass | REQ-002 AC1/AC2 → the MODIFIED endpoint requirement; AC3/AC3-N → the unchanged rendering requirement; AC4/AC5 → the unchanged storage requirement; AC6-N → the read-only clause | No unmatched scenario. Every REQ-002 AC maps to a Living Spec requirement, modified or re-verified |

## Residual concerns for IO / SA / VL

1. **Stale CI evidence (VL, P4)** — REQ-001's `Pass-by-human-confirm` was recorded
   for a commit whose backend had no SQLite dependency. GitHub-hosted runners must
   now resolve `org.xerial:sqlite-jdbc:3.49.1.0` from Maven Central. A **fresh**
   four-field human confirmation for this change's commit is required; the old one
   must not be reused.
2. **Flyway SQLite support (SA, P4)** — `flyway-core-11.7.2.jar` contains
   `SQLiteDatabaseType`, but jar inspection is not execution. P4 must show a real
   migration creating and seeding `backend/data/gogo.db`, and a second start
   proving idempotency.
3. **SQLite locking in tests (Dev, P4)** — a pooled datasource against SQLite can
   raise `SQLITE_BUSY`. The strategy is a design decision (D12) and must be
   settled by running the tests, not by assertion.
4. **Signed REQ-001 evidence no longer describes the shipped behavior (SA/IO)** —
   the archive stays immutable and carries a post-decision note pointing here.
   G2/G3 for REQ-002 are separate signatures, not inheritances.
5. **Local toolchain config outside the repo (Dev)** — `~/.m2/settings.xml` was
   created from the user-supplied corporate file with `localRepository` overridden
   to the warm cache. It holds credentials, is not committed, and a fresh clone on
   another machine needs its own Maven mirror configuration.

## Outcome

Blocking Fail: none. **No Partial item** — DoV-2 is Pass because the IO rulings
resolved every carried ambiguity before this review was written.

G1 is still **not claimed** by this skill: the gate needs named IO and SA
signatures on the delta and the design, and `g1-decision.md` remains
NOT RECORDED until a human signs.