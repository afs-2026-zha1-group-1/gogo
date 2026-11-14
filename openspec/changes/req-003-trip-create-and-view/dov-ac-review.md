# AC / DoV review — req-003-trip-create-and-view

- Date: 2026-11-14
- Stage: P2, `/sdd:delta-craft step=all`
- Delta Spec: `openspec/changes/req-003-trip-create-and-view/specs/trips/spec.md`
- Checklist source: `vendor/ai4se-plugins/skills/spec/delta-craft/references/dov-ac-checklist.md`
- Validation evidence: `/d/nvm4w/nodejs/openspec validate req-003-trip-create-and-view`
  → "is valid"; the same command with `--strict` → "is valid" (CLI 1.16.1). The
  PATH `openspec` is 1.6.0 and was not used.

## Delta summary

Three ADDED requirements, ten scenarios:

| Requirement | Scenarios |
|---|---|
| Trip caller identity | identity missing; identity unknown |
| Trip creation | created; same-day boundary; inverted range; blank name; malformed date |
| Trip detail read | member reads; non-member denied; unknown id |

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has at least one testable AC | Pass | Delta: 3 ADDED requirements, 10 scenarios | Every requirement has at least two scenarios; the identity requirement is not decorative — its two cases are asserted by C5-N and R2-N |
| AC-2 ACs are observable | Pass | Same file | HTTP status, the stable `code`, the six field values, and the absence of field values in the denial body. Storage and membership are observed through the API (a read by the recorded member) rather than by internal state |
| AC-3 negative / edge cases where risk is high | Pass | "Start date may equal the end date", "End date before start date is rejected", "Blank name is rejected", "Malformed date is rejected", "A non-member is denied", "An unknown trip id is reported separately", "Caller identity is missing/unknown" | The riskiest behaviour is access control, covered by the denial and the two identity cases. The date boundary (equal dates) is covered explicitly because the fixture trip uses the same day for both dates |
| AC-4 no disguised implementation detail, no vague wording | Pass | Same file | No table, column, class, framework or library name. `X-User-Id`, the JSON field names and the error `code` values are wire contract. Seed users, the `app_user` table, `JdbcTemplate` and Flyway stay in `design.md` |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal | Pass | `proposal.md` §What Changes / §Capabilities vs the delta | Three ADDED requirements, exactly as proposed. No capability beyond `trips`; `greeting` untouched |
| DoV-2 ambiguities listed or resolved | Pass | `requirements/REQ-003.md` §Open questions | Blocking not-resolved = **0**. OQ-2 (403 vs 404), OQ-3 ("first member" ordering) and OQ-5 (seed placement) resolved with owners; OQ-1 and OQ-4 are non-blocking and deferred with owners |
| DoV-3 role concerns noted for residual risk | Pass | This file §Residual concerns | SA: unverified identity and existence leak. VL: CI evidence must be fresh. Dev: routing choice, SQLite DDL |
| DoV-4 no business implementation claimed done here | Pass | P2 authored the delta and this review only | No production code was edited in P2 |
| DoV-5 requirements trace to proposal / approved requirements | Pass | US-001 C1/C2/C3 → creation scenarios; US-002 R1/R2 → detail-read scenarios; US-002's "Eve is an outsider" → identity and denial scenarios; the story-level "required error, empty, loading, permission states" → the error `code` set plus the display contract in `deep-dive.md` ⑫ | Every story AC maps to at least one scenario; the four added reverse cases (C4-N, C5-N, R2-N, R3-N) are consequences of the named error handling, not new scope |

## Residual concerns for IO / SA / VL

1. **`X-User-Id` is unverified (SA, G1)** — any caller can act as any user. This is
   the accepted cost of testing membership without an authentication feature. It
   must be stated in `README.md` and must never be described as a security control.
2. **`403` for a non-member confirms the trip exists (SA, G1)** — chosen to match
   the AC wording "access is denied". Switching to `404` later is a spec change.
3. **UI screenshots absent (IO/BA, P3)** — `ui-design-reference/` is untracked, so
   layout is a design judgement from the AC text and the mandated state list.
4. **`destination` / `startLocation` / `endLocation` requiredness (IO, G1)** — no AC
   states an error for these fields; default is to store them verbatim (OQ-1).
5. **Two `openspec` CLIs (Dev, P2–P5)** — PATH resolves 1.6.0, the archive used
   1.16.1. Always call `/d/nvm4w/nodejs/openspec`.
6. **`req-002-greeting-json-sqlite` still active (Dev/P5)** — independent
   capability, no spec conflict; archive order is a separate decision.

## Outcome

Blocking Fail: none. No Partial item.

G1 is **not** claimed by this skill. `g1-decision.md` is a draft marked
`NOT RECORDED` until a named IO and SA sign the delta and this review.
