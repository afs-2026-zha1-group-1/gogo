# G1 decision — req-019-save-interests

- Change id: `req-019-save-interests`
- Gate: G1 (Align)
- Status: **RECORDED — Pass** (2026-11-15). IO Emily Pass and SA evelyn.huang Pass
  are both recorded below; the gate is closed.

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
  Impact before this gate, so it is in scope rather than a silent addition.
- **Conflict with the Living Spec:** none. `preferences` does not exist in
  `openspec/specs/`, and nothing in `greeting` is referenced or modified.
- **Conflict with merged capabilities:** none. `greeting` and `trips` keep their
  endpoints, response shapes and tables; `V1`/`V2` migrations are untouched. The new
  `member_preference` table is additive and its `V4` number is reserved after
  REQ-004's `V3`.
- **Conflict between delta requirements:** none. Identity and membership form a shared
  precondition; catalogue, save, read and page requirements touch disjoint paths.
- **Ambiguity:** 0 blocking. D11–D14 were decided this round (batch save, `userId` +
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

## Decision

- Decision: **Pass** — recorded 2026-11-15 once both required roles had decided.
- Conditions + owners: **none**. Neither role supplied a remediation item; the retained
  risks above remain tracked follow-ups and were not converted into gate conditions.
- Approvers: **IO = Emily**, **SA = evelyn.huang**.
- IO sign-off: **Emily — Pass**, recorded 2026-11-15 from the user's selection in
  session (`IO 签署人 = Emily`, `G1 决策 = Pass`). No IO conditions were supplied.
- SA sign-off: **evelyn.huang — Pass**, recorded 2026-11-15 from the user's explicit
  choice to sign as SA under the repository git identity (`SA 署名 = evelyn.huang`,
  `G1 决策 = Pass`). No SA conditions were supplied.
- The agent records these human statements. It does not independently verify the
  identities and does not approve on behalf of either role.

## What recording G1 required (satisfied)

1. IO Emily's Pass and SA evelyn.huang's Pass are both recorded from human statements
   in this session.
2. The overall decision is Pass with no conditions, so no remediation list is required.
3. No ambiguity is left unresolved; every non-blocking item has an owner and lives in
   `dov-ac-review.md` §6 rather than being silently dropped.

## Next

G1 Pass → P3 (`/sdd:atdd-design`, `/sdd:task-plan`), then P4 implementation.

P3 must settle one item before code: the error-advice package scope (own advice for
`com.gogo.preference` versus widening `TripErrorAdvice` to `com.gogo`). The migration
order is settled: `V3` is on `main`, so `V4` lands next and must stay after any later
rebase of `main`.
