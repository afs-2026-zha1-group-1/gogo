# G1 decision — req-019-save-interests

## Product review update (2026-11-15)

The user accepts both open product choices: no Clear All action (deselect all and
save instead), and seven English-only interest labels without localization. This
resolves those questions. Following the user's separate explicit instruction,
IO Emily approves the current five-requirement / 31-scenario package on 2026-11-15.
The existing SA approval is unchanged. G1 remains Conditional while the recorded
batch-readiness condition and validation remediation remain open; IO approval is
no longer pending.
Strict validation was run in the current environment and exited 1: five existing
ADDED requirement bodies exceed 500 characters. This replaces any earlier claim
that the CLI is unavailable; strict validation has not passed.

- Change id: `req-019-save-interests`
- Gate: G1 (Align)
- Status: **RECORDED — Conditional; gate NOT closed** (2026-11-15). SA evelyn.huang
  has signed Pass; IO Emily approved the current package on 2026-11-15 per explicit
  user instruction. Batch-readiness and validation follow-up remain open.

## Correction notice

This file supersedes the first version recorded earlier on 2026-11-15, which wrongly
stated that IO Emily had already passed. The SA corrected that: only the SA has signed
so far. The IO reviews the pushed feature branch once the SA's four requirements have
all reached G1, and signs afterwards. The earlier "IO Emily — Pass" statement was an
error made by the agent, not a human statement, and it is withdrawn here. This is
historical: the new Emily approval above is recorded from the user's later explicit
instruction and does not retroactively validate the withdrawn statement.

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
  5 `### Requirement:` blocks and 31 `#### Scenario:` blocks. Current strict
  validation exited 1 due to five overlong ADDED requirement bodies; remediation
  and a passing rerun remain open.

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
  and the English-only labels are acceptable (both now accepted by the user,
  2026-11-15; not a G1 signature). Owners: SA / IO / Dev as listed in
  `dov-ac-review.md` §6.
- **Current IO outcome:** Emily approves the current package on 2026-11-15 per
  explicit user instruction. No additional IO product conditions were supplied.

## Decision

- Decision: **Conditional** — recorded 2026-11-15.
- Why not Pass: both role approvals are recorded, but the existing batch-readiness
  condition is not certified complete and strict validation still exits 1.
  Emily's approval does not certify those checks or waive the remaining conditions.
- Why not Fail: the delta itself cleared AC 4/4 and DoV 5/5 with zero blocking
  ambiguity, and no reviewer has asked for rework.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | Finish the SA's four requirements to G1 on `feat/travel_preference`, then push the branch for review | evelyn.huang (SA) | open |
| 2 | IO approval of current five-requirement / 31-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction; approval recorded without certifying condition 1 |
| 3 | Fold IO product decisions into requirements and review records | evelyn.huang / Dev | closed 2026-11-15; no Clear All action and English-only labels accepted, no delta behavior change |
| 4 | Resolve overlong requirement bodies and rerun strict validation | Dev | open; current strict exit 1, five length warnings |

- Approvers: **IO = Emily — Pass (2026-11-15)**, **SA = evelyn.huang — Pass**.
- SA sign-off: **evelyn.huang — Pass**, recorded 2026-11-15 from the SA's statement
  that the SA has already signed and agreed to pass. No SA conditions were supplied.
- IO sign-off: **Emily — Pass**, 2026-11-15; current five-requirement / 31-scenario
  package, recorded from the user's separate explicit signing instruction.
- The agent records human statements only. It does not verify identities, does not sign
  on behalf of either role, and the withdrawn IO statement above is evidence that it
  must not be inferred from a signature request.

## What this record does and does not allow

- Allowed: P3 design work (`/sdd:atdd-design`, `/sdd:task-plan`) on the SA-signed
  delta, because the delta itself is stable and A0/DoV clean.
- Not allowed: claiming G1 is closed; presenting `preferences` as aligned in the
  registry; starting P4 implementation while recorded blocking conditions remain open.
- IO approval is recorded; close the remaining conditions explicitly before
  changing the overall gate to Pass. No automatic gate closure is implied.

## Next

1. Complete the remaining SA-owned requirements to G1.
2. Push the revised documents and Emily approval record on `feat/travel_preference`.
3. Resolve strict validation warnings and explicitly close remaining gate conditions.
4. P3 can start in parallel: settle the error-advice package scope (own advice for
   `com.gogo.preference` versus widening `TripErrorAdvice` to `com.gogo`). The
   migration order is settled: `V3` is on `main`, so `V4` lands next and must stay
   after any later rebase of `main`.
