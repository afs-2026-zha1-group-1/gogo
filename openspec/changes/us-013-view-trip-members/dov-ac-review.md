# AC / DoV review — us-013-view-trip-members

- Date: 2026-11-16
- Delta specs:
  - `openspec/changes/us-013-view-trip-members/specs/trips/spec.md`
    (1 ADDED requirement, 8 scenarios)
  - `openspec/changes/us-013-view-trip-members/specs/app-shell/spec.md`
    (1 MODIFIED requirement, 3 scenarios)
  - `openspec validate us-013-view-trip-members` → valid (CLI 1.6.0)
- Proposal: `openspec/changes/us-013-view-trip-members/proposal.md`
- Requirement: `requirement-workspace/requirements/US-013.md` (S1–S10, U1–U3)
- This is a delta-craft review, not a Gate. No G1 decision is recorded here.

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has ≥1 testable AC | Pass | trips spec 8 scenarios; app-shell spec 3 scenarios | Roster read, organizer flag, denial, identity, unknown trip, joined member, no personal data; 成员 list, 分队 placeholder, no demo data |
| AC-2 ACs observable | Pass | scenario steps | Status codes, `code` values, exact four rows, ascending `userId`, single `organizer = true`, absence of fields, active tab and visible roster are all observable |
| AC-3 negative / edge cases | Pass | scenarios + deep-dive ⑩ | Missing/unknown identity, outsider, unknown trip for member and outsider, joined member once, repeated accept, empty roster (fixtures), no-trip UI state |
| AC-4 no disguised implementation / vague words | Pass | both deltas | No "appropriately/correctly/quickly"; presentation wording is explicitly free; the contract is the roster, organizer flag and statuses |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches proposal | Pass | proposal §What Changes ↔ deltas | One ADDED `trips` requirement and one MODIFIED `app-shell` requirement; readiness/preferences, invite/remove, auth, list-all, migrations and dependencies excluded |
| DoV-2 ambiguities listed or resolved | Pass | US-013 §Open questions; intent D1–D7 | Blocking OQs = 0; OQ-1/OQ-2 deferred to P3; OQ-3 resolved (`organizer`) |
| DoV-3 role concerns noted | Pass | residual concerns below | IO: scope guard against Screen 7 readiness/preferences; SA: placeholder supersession, identity vocabulary, stack deviation |
| DoV-4 no implementation claimed done | Pass | this change tree | P2 artifacts only; no business code written |
| DoV-5 traceability to proposal / requirements | Pass | mapping table below | Every delta requirement traces to a proposal bullet and US-013 scenarios; no unmatched item |

## Traceability

| Delta requirement | Proposal bullet | US-013 scenarios |
|---|---|---|
| `trips` — Trip member list read | "ADDED `trips` requirement" | S1, S2, S3, S4-N, S5-N, S6-N, S7-N, S8, S9, S10; fixtures M1–M10 |
| `app-shell` — Placeholder tabs (MODIFIED) | "MODIFIED `app-shell` requirement" | U1, U2, U3; app-shell original dock/placeholder scenarios |

## Residual concerns for IO / SA at G1

| # | Concern | Role | Disposition |
|---|---|---|---|
| 1 | Screen 7 shows readiness ring, readiness pills, preference summaries and a generate action; the issue's design scope excludes them | IO | Delta and U1 assert names + organizer only; confirm the exclusion at G1 |
| 2 | US-064's `Placeholder tabs` requirement is explicitly superseded for 成员; archive must merge the MODIFIED requirement and reconcile the app-shell purpose sentence | SA | MODIFIED requirement recorded; confirm at G1 |
| 3 | Wire field `organizer` (not `isOrganizer`) and ascending `userId` order | IO/SA | Recorded in intent D2 and fixtures §US-013; confirm at G1 |
| 4 | Unmerged split branch uses `MEMBER_REQUIRED` for a missing `X-User-Id`; this change follows merged `USER_REQUIRED` | SA | Non-blocking follow-up at split-merge review; no code change here |
| 5 | Stack plan names AntD 5 + TanStack Query v5 but the merged frontend uses token CSS + plain `api()` | SA | This read screen follows the actual baseline; stack adoption is a separate migration (US-065/US-066) |
| 6 | No durable last-opened-trip memory on `#/members`; a reload shows the no-trip guidance state | Dev/IO | P3 choice; the guidance state is contractual and no list-all endpoint is added |

## Outcome

All AC and DoV items Pass; no blocking gap. **G1-ready for human decision** —
the gate verdict itself is not recorded here (`/sdd:g1-decision-record`).
