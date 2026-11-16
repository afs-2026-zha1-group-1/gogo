# AC / DoV review — us-066-log-in

- Date: 2026-11-16
- Step: review (`/sdd:delta-craft`)
- Delta specs: `openspec/changes/us-066-log-in/specs/{auth,trips,invitations,app-shell}/spec.md`
- Inputs: proposal, REQ-006, deep-dive §REQ-006, impact brief §38–45,
  fixtures §REQ-006
- OpenSpec validation: `openspec validate us-066-log-in` → valid

## Acceptance criteria (AC)

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | auth has 5 requirements / 26 scenarios; trips 1/4; invitations 3/12; app-shell 4/14 | Every requirement includes observable scenarios |
| AC-2 ACs are observable | Pass | e.g. auth §Server session §An expired session is unauthenticated; trips §A valid session supplies the caller identity | Status codes, cookies, account fields, membership rows and routes are observable |
| AC-3 Negative / edge cases called out | Pass | auth: invalid credentials, fixation, expiry, missing header, CSRF, header-only, pending invite; invitations: identity-before-token, closed, unusable; app-shell: no dock, no switcher | Risk areas from REQ-006 are covered |
| AC-4 ACs are not disguised implementation detail / vague | Pass | auth §Account credential login fixes email normalization and one generic failure; bounds are behavioral, not class-level | `BCrypt` is a security contract (R-5), not a UI/class choice |

## Definition of verified (DoV)

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches the proposal (no silent expansion) | Pass | proposal §What Changes vs delta requirements | `main-itinerary` is not added as a new capability; it is covered by the generic protected-endpoint requirement plus the cross-change note |
| DoV-2 Ambiguities listed or resolved | Pass | REQ-006 OQ-1…OQ-10 all `resolved`; P2 fixed `INVALID_CREDENTIALS`, `CSRF_INVALID`, `#/login`, 30-minute timeout, seed emails/password | No blocking ambiguity remains |
| DoV-3 Role concerns noted (IO / SA) | Pass | Residual concerns below | See IO/SA notes |
| DoV-4 No business implementation claimed as done | Pass | Delta specs only; no code/design/tasks written | P3 owns design/tasks |
| DoV-5 Requirements trace to the proposal / approved requirements | Pass | auth requirements ↔ proposal bullets; trips/invitations/app-shell modifications ↔ proposal "MODIFIED" bullets; fixtures §REQ-006 traces to S1–S11 | Main-itinerary cross-change trace is recorded as an ordering condition, not a dropped requirement |

## Residual concerns for G1

| id | Owner | Concern | Handling |
|---|---|---|---|
| R1 | SA/Dev | The in-flight `us-031-037-main-itinerary` delta still names `X-User-Id` in its identity scenarios, while `auth` makes the header non-authenticating | Reconcile at implementation: update that delta or add a MODIFIED living-spec delta after its archive. Recorded as a consistency WARNING and a G1 condition candidate |
| R2 | SA | `INVALID_CREDENTIALS` and `CSRF_INVALID` are new error codes introduced in P2 (the proposal named only generic failures) | Acknowledge at G1; they follow the repository's `code` convention |
| R3 | IO/SA | Demo credentials (`alice@example.com` … / `gogo-demo-2026`) live in the fixture file | Demo-only; never shown in UI; registration remains out of scope |
| R4 | SA | In-memory sessions are lost on restart | Accepted MVP behavior; re-login required |
| R5 | Dev | Historical scenario names are retained in MODIFIED app-shell blocks (e.g. "The identity switcher stays a scaffold in the shell") because OpenSpec requires archive-retained scenario names | Content documents removal; treat the names as identifiers, not current behavior |

## Outcome

Delta Specs are complete and internally testable; **no blocking DoV Fail** and
**no blocking AC Fail**. G1 is ready to be recorded by named IO + SA, with R1–R5
visible as residual concerns. This review is not a Gate decision.

## G1 sign-off status (2026-11-16)

- SA: **Elian Jiang** accepted (user: "sa 可以先选我").
- IO: **pending** — the user stated G1 needs another signer; no IO name supplied.
- Gate record: **not written**. A partial gate is not valid; `g1-decision.md`
  will be created only after the IO signs and the verdict (Pass / Conditional /
  Fail) is given.
