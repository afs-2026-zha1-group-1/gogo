# AC / DoV review — req-004-trip-invitations

- Date: 2026-11-14
- Stage: P2, `/sdd:delta-craft step=all`
- Delta Specs: `openspec/changes/req-004-trip-invitations/specs/invitations/spec.md`
  and `specs/trips/spec.md`
- Checklist source: `vendor/ai4se-plugins/skills/spec/delta-craft/references/dov-ac-checklist.md`
- Validation evidence: `/d/nvm4w/nodejs/openspec validate req-004-trip-invitations`
  → "is valid"; with `--strict` → "is valid", exit 0 (CLI 1.16.1). The first
  `--strict` run flagged two >500-character requirement texts; both were shortened
  with the detail kept in scenarios, then re-validated. The PATH `openspec` is
  1.6.0 and was not used.

## Delta summary

Five ADDED requirements, seventeen scenarios:

| Capability | Requirement | Scenarios |
|---|---|---|
| invitations | Invitation issuance | organizer obtains; repeated issuance same token; non-organizer denied; identity missing/unknown; unknown trip |
| invitations | Invitation preview | public basics before acceptance; confirmed state readable |
| invitations | Invitation acceptance and joining | outsider joins once; double acceptance one membership; existing member re-accepts; closed after confirmation; identity missing/unknown |
| invitations | Unusable invitation | invalid preview exposes nothing; invalid accept creates nothing |
| trips | Trip main-plan confirmation state | created unconfirmed; confirmed state readable and closes joining; no confirmation operation exposed |

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 each requirement has at least one testable AC | Pass | Delta: 5 ADDED requirements, 17 scenarios | Every requirement has at least two scenarios; the trips state requirement is not decorative — its closure effect is asserted through `JOINING_CLOSED` and its absence of a mutation path is a reverse scenario |
| AC-2 ACs are observable | Pass | Same files | HTTP status, stable `code`, token equality across calls, invitation/membership row counts, the preview field set, and absence assertions for invalid tokens. Storage effects are observed through the API (Eve's member read flips 403→200) plus row-count assertions in the fixtures |
| AC-3 negative / edge cases where risk is high | Pass | "A member who is not the organizer is denied", "Acceptance after main-plan confirmation is rejected", "Double acceptance yields exactly one membership", "Caller identity is missing or unknown" (×2), "Previewing/Accepting an invalid invitation exposes nothing/creates nothing", "No confirmation operation is exposed" | The riskiest behaviors are authorization (organizer-only issue), the closure gate, duplicate membership and privacy on invalid tokens; each has a dedicated scenario |
| AC-4 no disguised implementation detail, no vague wording | Pass | Same files | No table, column, class, framework or library name. `X-User-Id`, JSON field names, the join path shape and the error `code` values are wire contract. `trip_invitation`, the state column, `JdbcTemplate`, Flyway and the QR dependency stay in `design.md` / deep-dive |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 scope matches the proposal | Pass | `proposal.md` §What Changes / §Capabilities vs the deltas | Four `invitations` requirements plus one `trips` state requirement, exactly as proposed. The proposal's note explains why `trips` is an ADDED delta (capability introduced by in-flight REQ-003, absent from the Living Spec) rather than a Modified capability |
| DoV-2 ambiguities listed or resolved | Pass | `requirements/REQ-004.md` §Open questions | Blocking not-resolved = **0**. OQ-1…OQ-5 resolved with owners; OQ-6 (router/QR) and OQ-7 (REQ-003 sequencing) non-blocking and deferred |
| DoV-3 role concerns noted for residual risk | Pass | This file §Residual concerns | IO: preview field set, pick signal. SA: unverified identity, state without mutation path, preview privacy. Dev: QR dependency, ordering |
| DoV-4 no business implementation claimed done here | Pass | P2 authored the deltas and this review only | No production code was edited in P2 |
| DoV-5 requirements trace to proposal / approved requirements | Pass | US-008 AC1/AC2 → issuance scenarios; US-008 AC3 (QR same rules) → issuance + acceptance scenarios plus the E2E QR row in the ATDD design; US-010 AC1 → preview; AC2 → double acceptance; AC3 → closure; US-012 AC1 → unusable scenarios; story-level mandatory states → deep-dive ⑫ display contract | Every story AC maps to at least one scenario; reverse cases R-1/R-2 (no confirmation API, no revocation/expiry API) are consequences of the declared non-goals, not new scope |

## Residual concerns for IO / SA / VL

1. **Preview exposes destination and dates before acceptance (IO, G1)** — default
   taken from screen 05; the AC minimum is the trip name. Members, itinerary and
   preferences stay excluded. REQ-004 OQ-2.
2. **Main-plan state without a product mutation path (SA, G1)** — required to make
   the closure AC testable while US-037 is backlog; test-only setup is documented
   in the fixtures and reverse scenario R-1 asserts no API sets it. REQ-004 OQ-1.
3. **`X-User-Id` is unverified (SA, G1)** — inherited from REQ-003; invitation
   acceptance can be impersonated in the scaffold. Never a security control.
4. **REQ-003 unimplemented and G1 unsigned (Dev/IO, P4)** — REQ-004 P4 must wait
   for REQ-003 P4; `V3` alters tables created by `V2`. REQ-004 OQ-7.
5. **QR encoding and routing dependency (Dev, P3)** — one MIT-licensed QR encoder
   plus the routing decision shared with REQ-003 OQ-4; corporate npm mirror
   applies. REQ-004 OQ-6.
6. **Board pick signal (IO)** — issues #6/#7/#8 carry no assignee; the user's
   session statement is the recorded pick evidence.
7. **Two `openspec` CLIs (Dev, P2–P5)** — PATH resolves 1.6.0; always call
   `/d/nvm4w/nodejs/openspec` (1.16.1).

## Outcome

Blocking Fail: none. No Partial item.

G1 is **not** claimed by this skill. `g1-decision.md` is a draft marked
`NOT RECORDED` until a named IO and SA sign the deltas and this review.