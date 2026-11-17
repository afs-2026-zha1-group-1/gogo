# G1 decision — req-001-hello-world

- Change id: `req-001-hello-world` (archived at
  `openspec/changes/archive/2026-11-13-req-001-hello-world/`)
- Gate: G1 (Align)
- Inputs:
  - Delta Spec: `specs/greeting/spec.md` (3 requirements, 6 scenarios) — now
    merged into the Living Spec at `openspec/specs/greeting/spec.md`
  - AC/DoV review: `dov-ac-review.md` (AC-1…AC-4 Pass; DoV-1/3/4/5 Pass;
    **DoV-2 Partial** at review time — the non-constant scenario had no test yet;
    closed in P4 by `GreetingApiTest#returnsTheStoredMessageWhenItChanges` plus a
    mutation check)
  - Validation: `openspec validate req-001-hello-world --strict` → valid (CLI
    1.16.1); post-archive `openspec validate --specs --strict` → `✓ spec/greeting`,
    1 passed, 0 failed
  - Requirements: `requirement-workspace/requirements/REQ-001.md`,
    `requirement-workspace/impact-brief.md`, `TODO.md`
  - Proposal: `proposal.md`
- Findings (scope / ambiguity / conflict):
  - **Scope:** one new capability `greeting`, matching the proposal. The CI
    harness and the lockfile registry design carry no spec because they change no
    product behavior; both are user-instructed and declared in `proposal.md`.
  - **Conflict between delta requirements:** none.
  - **Ambiguity OQ-2 — CLOSED by IO ruling.** `TODO.md` line 21 listed "Flyway 迁移"
    as a stack constraint while line 33 listed "数据库迁移工具、ORM" as a non-goal.
    Johnson ruled on 2026-11-13: **use Flyway**. Line 21 governs; line 33 has been
    amended to `- ORM`, removing the contradiction. The implementation already
    followed line 21, so no code change results from this ruling.
  - **Ambiguity OQ-3 — CLOSED by IO ruling, superseded by a new change.** Johnson
    ruled on 2026-11-13: **use JSON**, with the body `{"message":"Hello World"}`.
    At G1 review time this was settled as `text/plain` by the Delta Spec scenario
    "the response body is exactly `Hello World`" plus `design.md` D4, and REQ-001
    shipped and was verified on that basis. The new ruling **changes the contract**,
    so it is carried by a new OpenSpec change (`req-002-greeting-json-sqlite`) with a
    MODIFIED delta against the merged Living Spec. It is not retroactively applied
    to the REQ-001 delta or to its G2/G3 evidence.
  - **OQ-4 — CLOSED by IO ruling.** Johnson ruled on 2026-11-13: **database back to
    SQLite**. The earlier H2 substitution ("数据库先换成H2方便快速验证") was a
    temporary verification aid; `TODO.md`'s SQLite requirement stands and needs no
    amendment. The engine switch is implemented in `req-002-greeting-json-sqlite`.
- Decision: **Pass**
- Why Pass is valid now: the G1 contract rejects `Decision=Pass` while an ambiguity
  is unresolved. All three open questions now have an explicit IO ruling from
  Johnson (2026-11-13, in session: "open question使用flyway json，数据库改为sqllite"),
  and the one documentation contradiction it required has been amended in `TODO.md`.
  No ambiguity remains open against the REQ-001 delta.
- Conditions + owners: **none outstanding.** The two conditions recorded when this
  decision was Conditional are closed:

  | # | Condition | Owner | Closed by |
  |---|---|---|---|
  | 1 | Rule on OQ-2 (Flyway vs the migration-tooling non-goal) and amend the losing line | Johnson (IO + SA) | IO ruling "use Flyway"; `TODO.md` line 33 amended to `- ORM`. Closed 2026-11-13, ahead of the 2026-11-20 deadline |
  | 2 | Align `TODO.md` with the database decision | Johnson (IO) | IO ruling "database back to SQLite" — `TODO.md` already specifies SQLite, so no amendment is needed. The H2→SQLite switch itself is req-002 scope. Closed 2026-11-13 |

  Carried forward, not a G1 condition: the JSON ruling changes the merged
  requirement, so `req-002-greeting-json-sqlite` must carry its own delta, G1, G2
  and G3. REQ-001's archive and Living Spec are left intact as history.
- Approvers: **IO = Johnson**; **SA = Johnson, Leo**. Johnson's signature was
  authorized in session: "都签署我的名字即可Johnson"; at that time one person held
  both roles in this single-person project, and the concentration was recorded
  explicitly rather than implied. **Leo co-signed as the second SA approver on
  2026-11-14** under the user instruction "补一下另外一个签名，签Leo". The agent
  recorded the decision; it did not self-approve.
- Timestamp: decision recorded 2026-11-13 15:35 (UTC+08:00) as **Conditional**;
  re-recorded as **Pass** at 2026-11-13 15:58 (UTC+08:00) after the IO rulings closed
  both conditions. Draft prepared 2026-11-13 14:40:38.

## Effect on the checklist

P2-3 asks whether a G1 decision record exists when G1 is claimed complete. It
exists, is signed by named IO and SA, and now records **Pass** with no outstanding
conditions. The 15:40 re-score
(`docs/ai4se-plugins/20261113-154004-quality-checklist-report.md`) scored P2-3 Pass
on the existence of a valid Conditional record; that score still holds, and the
Decision value is now stronger. The re-score report is left as written — it is a
point-in-time record, and this file is the authority for the current Decision.

## Next

REQ-001 is closed. The JSON and SQLite rulings are **new scope**, carried by
`req-002-greeting-json-sqlite` with its own delta against the merged Living Spec and
its own G1/G2/G3. Do not edit the REQ-001 archive or its G2/G3 evidence to reflect
the new contract; that evidence describes what REQ-001 actually shipped.