# G1 decision — req-019-save-interests

- Change id: `req-019-save-interests`
- Gate: G1 (Align)
- Status: **RECORDED — Conditional; gate NOT closed** (2026-11-15). SA evelyn.huang has
  signed Pass. IO Emily has not reviewed or signed; that signature is the only open
  condition.

## Correction notice

This file supersedes the first version recorded earlier on 2026-11-15, which wrongly
stated that IO Emily had already passed. The SA corrected that: only the SA has signed
so far. The IO reviews the pushed feature branch once the SA's four requirements have
all reached G1, and signs afterwards. The earlier "IO Emily — Pass" statement was an
error made by the agent, not a human statement, and it is withdrawn here.

## Inputs

- Delta Spec: `specs/preferences/spec.md` — 5 ADDED requirements, 31 scenarios, new
  capability `preferences` against the Living Spec tree that currently holds only
  `greeting`
- AC/DoV review: `dov-ac-review.md` — AC 4/4 Pass, DoV 5/5 Pass (DoV-3 carries
  non-blocking IO/SA concerns), blocking ambiguities 0
- Proposal: `proposal.md`; change metadata `.openspec.yaml`
- Requirements: `requirement-workspace/requirements/REQ-019.md`,
  `requirement-workspace/analysis/req-019-dor.md` (12 items Pass, A0 Pass),
  `requirement-workspace/deep-dive.md` §REQ-019 (⑨–⑫ Pass),
  `requirement-workspace/intents/2026-11-15-req-019.md` (D1–D14)
- Fixtures: `requirement-workspace/acceptance-test-fixtures.md` (users 1–5, trip 1).
  US-019 request/response samples are deliberately not added there (D14, OQ-15
  deferred to P3/ATDD)
- Story: US-019, category Preferences, priority Must, layers Frontend + Backend +
  Database read/write
- Baseline at recording time: branch `feat/travel_preference` at `51db650`, which
  merges `main` `7d939b0` (PR #31, REQ-004 planning) carrying
  `V3__create_invitation.sql` and the new `trip.main_plan_confirmed` column. Neither
  object collides with `member_preference`, and D4 keeps "main plan unconfirmed" as
  test context only, with no locking branch in this capability.
- Structural check: `spec.md` follows `# Spec Delta` → `## ADDED Requirements` with
  5 `### Requirement:` blocks and 31 `#### Scenario:` blocks. The OpenSpec CLI is not
  on `PATH` in this environment, so **no `openspec validate` result is claimed** —
  validation of the change package remains open if the team runs it elsewhere.

## Findings (scope / ambiguity / conflict)

- **Scope:** one new capability, five ADDED requirements, matching the proposal. The
  details-page entry link (D13) was written back into the proposal's What Changes and
  Impact before this record, so it is in scope rather than a silent addition.
- **Conflict with the Living Spec:** none. `preferences` does not exist in
  `openspec/specs/`, and nothing in `greeting` is referenced or modified.
- **Conflict with merged capabilities:** none. `greeting` and `trips` keep their
  endpoints, response shapes and tables; `V1`–`V3` migrations are untouched. The new
  `member_preference` table is additive.
- **Conflict between delta requirements:** none. Identity and membership form a shared
  precondition; catalogue, save, read and page requirements touch disjoint paths.
- **Ambiguity:** 0 blocking. D11–D14 were decided in P2 (batch save, `userId` +
  `interests` payload, details-page entry, fixtures deferred). Six further contract
  details are fixed in `dov-ac-review.md` §3 (C1–C6): replace-not-merge, `userId`
  ordering, identity-header whitespace tolerance against literal interest matching,
  zero write on rejection, caller-only echo, and no extra size validation.
- **Migration order verified, not assumed:** `V3__create_invitation.sql` is already on
  `main` (merged 2026-11-15), so `V4__create_member_preference.sql` is the next free
  number and applies in order. The out-of-order risk is closed as of this record; it
  reopens only if another change lands a number above four before REQ-019 merges.
- **Retained risks (recorded, not conditions):** `TripErrorAdvice` covers `com.gogo.trip` only, so the
  new package needs its own advice or a widened scope; `docs/knowledge/architecture/tech-stack-plan.md`
  §6 still describes `{data,error}`, `X-Member-Id`, `JdbcClient` and Ant Design 5 while
  the merged code uses bare DTOs, `X-User-Id`, `JdbcTemplate` and hand-written CSS;
  `AGENTS.md` still mandates shadcn/ui; IO asked whether the missing "clear all" action
  and the English-only labels are acceptable. Owners: SA / IO / Dev as listed in
  `dov-ac-review.md` §6.
- **Not known at recording time:** the IO review outcome and any IO conditions. They
  cannot be inferred from the SA signature and are therefore left open.

## Decision

- Decision: **Conditional** — recorded 2026-11-15.
- Why not Pass: G1 requires a named IO signature as well as the SA signature. Only the
  SA has signed, so a Pass record would misstate the gate.
- Why not Fail: the delta itself cleared AC 4/4 and DoV 5/5 with zero blocking
  ambiguity, and no reviewer has asked for rework.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | Finish the SA's four requirements to G1 on `feat/travel_preference`, then push the branch for review | evelyn.huang (SA) | open |
| 2 | Review the pushed delta and sign G1 Pass for this change | Emily (IO) | open; entry is condition 1 |
| 3 | Fold any IO finding into `specs/preferences/spec.md` (and `dov-ac-review.md`) before P4 implementation | evelyn.huang | open; triggered by condition 2 |

- Approvers: **IO = Emily — pending**, **SA = evelyn.huang — Pass**.
- SA sign-off: **evelyn.huang — Pass**, recorded 2026-11-15 from the SA's statement
  that the SA has already signed and agreed to pass. No SA conditions were supplied.
- IO sign-off: **not recorded**. No IO review or signature exists at this time.
- The agent records human statements only. It does not verify identities, does not sign
  on behalf of either role, and the withdrawn IO statement above is evidence that it
  must not be inferred from a signature request.

## What this record does and does not allow

- Allowed: P3 design work (`/sdd:atdd-design`, `/sdd:task-plan`) on the SA-signed
  delta, because the delta itself is stable and A0/DoV clean.
- Not allowed: claiming G1 is closed; presenting `preferences` as aligned in the
  registry; starting P4 implementation on the assumption that no IO condition will
  arrive.
- If the IO signs without findings, this file is amended to Pass with the IO signature
  row filled in. If the IO raises findings, they are added as conditions here and the
  delta is revised before P4.

## Next

1. Complete the remaining SA-owned requirements to G1.
2. Push `feat/travel_preference` for IO review.
3. IO Emily reviews and signs; this record flips to Pass or gains new conditions.
4. P3 can start in parallel: settle the error-advice package scope (own advice for
   `com.gogo.preference` versus widening `TripErrorAdvice` to `com.gogo`). The
   migration order is settled: `V3` is on `main`, so `V4` lands next and must stay
   after any later rebase of `main`.
