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
- Status: **RECORDED — Pass; gate closed 2026-11-16**, and **Pass again on the revised
  delta, 2026-11-16** (see "Revision re-review" below). SA evelyn.huang and IO Emily
  have both signed. The SA's 2026-11-16 re-review of the REQ-020/024 revised
  contracts released condition 1, and no findings came with it. `openspec validate
  --strict` still exits 1 and is carried as a follow-up, not as a passed check.

## Push verification update (2026-11-16)

`origin/feat/travel_preference` is at `27b09e6`, thirteen commits ahead of
`origin/main` `7d939b0`, so the revision that carries this record and Emily's
approval is published and reviewable. Statements below that describe the push as
outstanding are superseded: `eca9abe` was the tip quoted before the three
follow-up commits `658ba42`, `3c120ac` and `27b09e6`. The IO approval recorded in
this file stands as written; no new claim is made here.

## G1 closure (2026-11-16)

Both required roles have signed, so this file now records the gate as closed and
supersedes the Conditional statements above; the 2026-11-15 sections are kept as
history. SA evelyn.huang re-reviewed the revised contracts of
`req-020-manage-must-do` and `req-024-set-trip-budget` and passed them on
2026-11-16, relayed by the change author. That released condition 1 below, whose
only blocker was the sibling changes; no new findings came with the re-review.

Recorded limitation, deliberately not presented as a pass: `openspec validate
--strict` still exits 1 because five ADDED requirement bodies exceed 500
characters. The gate owners closed G1 with this item outstanding, so it is carried
as a follow-up that blocks archive, not P4 start.

## Revision re-review (2026-11-16) — Pass

The delta changed after this gate closed: the catalogue became ten Chinese labels and
the page requirement gained the `screen-08-preferences.png` visual baseline (details in
`design.md` Revision, `dov-ac-review.md` §8, `tasks.md` §8). This section records the
re-review of that text; it does not replace the record of the original review above.

- Revision re-review: **Pass**, recorded 2026-11-16 from the requirement owner's explicit
  instruction that both **IO Emily** and **SA evelyn.huang** signed the revised delta as
  Pass. No conditions and no findings were attached to either signature.
- Text re-read: the catalogue table (ten Chinese labels, codes `water`/`diving`/`photo`/
  `food`/`coffee`/`heritage`/`craft`/`nature`/`adventure`/`slow`), the CAT-2 scenario that
  rejects the retired English labels, the re-worded save and read scenarios, the "at most
  ten" reading that replaces contract detail C6, and the page requirement with its visual
  baseline.
- Unchanged: five ADDED requirements, 31 scenarios, the two endpoints, the
  `member_preference` payload shape `{"codes":[...]}`, `V4`, and the identity/membership
  preconditions. No data migration follows, because nothing is released.
- Two product choices were accepted by the same instruction rather than re-opened: chip
  order follows the prototype (`历史人文` before `手作`, `慢游` last), and the page renders
  only the US-019 block of screen-08 (the US-020/024/027 blocks and `提交并标记就绪` belong
  to their own changes).
- Carried, unchanged: `openspec validate --strict` still exits 1 on five overlong ADDED
  requirement bodies. It remains an archive blocker, not a P4 blocker, and is not reported
  as a passed check.
- The `dov-ac-review.md` §8 row that says "not re-signed" is superseded by this section.
- G2 may now cite this G1 for the revised text. The agent records the human statements
  above; it does not sign on behalf of either role.

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
  Current pushed tip: `27b09e6` (2026-11-16 update above).
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

- Decision: **Pass** — G1 closed 2026-11-16, and **Pass again on the revised delta**
  (2026-11-16 revision re-review above).
- Why Pass: both required roles have signed with no findings relayed (IO Emily
  2026-11-15; SA evelyn.huang 2026-11-15 plus the 2026-11-16 sibling re-review), both
  re-signed the revised ten-label / screen-08 text on 2026-11-16, AC 4/4 and DoV 5/5
  still stand, blocking ambiguities are 0, and the package is published at `27b09e6`.
- Why no longer Conditional: the batch-readiness condition waited only on the
  sibling changes; both hold their signatures now, so it is closed rather than
  waived.
- Conditions + owners:

| # | Condition | Owner | State |
|---|---|---|---|
| 1 | Finish the SA's four requirements to G1 on `feat/travel_preference`, then push the branch for review | evelyn.huang (SA) | closed 2026-11-16 — pushed at `27b09e6`; REQ-020/024 hold both signatures after the SA re-review; REQ-026 stays P1 by the user's earlier ruling and is out of scope here |
| 2 | IO approval of current five-requirement / 31-scenario package | Emily (IO) | closed 2026-11-15; explicit user instruction; approval recorded without certifying condition 1 |
| 3 | Fold IO product decisions into requirements and review records | evelyn.huang / Dev | closed 2026-11-15; no Clear All action and English-only labels accepted, no delta behavior change |
| 4 | Resolve overlong requirement bodies and rerun strict validation | Dev | carried open past G1 closure: strict exit 1 at closure time; blocks archive, not P4 start |
| 5 | Re-review the revised delta (ten Chinese labels, `screen-08-preferences.png` page baseline) | Emily (IO) / evelyn.huang (SA) | closed 2026-11-16; both roles signed Pass on the revised text per the owner's explicit instruction; no findings attached |

- Approvers: **IO = Emily — Pass (2026-11-15)**, **SA = evelyn.huang — Pass**; both
  re-signed the revised delta on 2026-11-16 (revision re-review above).
- SA sign-off: **evelyn.huang — Pass**, recorded 2026-11-15 from the SA's statement
  that the SA has already signed and agreed to pass. No SA conditions were supplied.
- SA re-review of the sibling revised contracts: **evelyn.huang — Pass**, 2026-11-16,
  relayed by the change author. Recorded only because it released condition 1; it is
  not a second signature on this delta.
- IO sign-off: **Emily — Pass**, 2026-11-15; current five-requirement / 31-scenario
  package, recorded from the user's separate explicit signing instruction.
- The agent records human statements only. It does not verify identities, does not sign
  on behalf of either role, and the withdrawn IO statement above is evidence that it
  must not be inferred from a signature request.

## What this record does and does not allow

- Allowed: P4 implementation of this change, provided `V4` lands in order after `V3`;
  P3 design; and presenting `preferences` as G1-aligned in the registry.
- Allowed after the 2026-11-16 revision re-review: G2 may cite this G1 for the revised
  ten-label / screen-08 text as well as for the original text.
- Not allowed: reporting strict validation as passed, or archiving the change before
  the five overlong requirement bodies are fixed and the CLI rerun succeeds.

## Next

1. Run P3 (`/sdd:atdd-design`, `/sdd:task-plan`), then P4:
   `V4__create_member_preference.sql`, the `com.gogo.preference` package and the
   preferences page.
2. The revised documents and Emily approval record are pushed at `27b09e6`; no
   further push is outstanding for review. The 2026-11-16 revision re-review is recorded
   in the working tree first; publishing it needs the owner's authorization.
3. Before archive, fix the five overlong requirement bodies and rerun
   `openspec validate req-019-save-interests --strict`.
4. P3 detail still open: settle the error-advice package scope (own advice for
   `com.gogo.preference` versus widening `TripErrorAdvice` to `com.gogo`). The
   migration order is settled: `V3` is on `main`, so `V4` lands next and must stay
   after any later rebase of `main`.
