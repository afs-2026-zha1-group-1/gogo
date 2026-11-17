# DoR light self-check — US-013

- Date: 2026-11-16
- Entry: `requirement-workspace/requirements/US-013.md`
- Intent: `requirement-workspace/intents/2026-11-16-us-013.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §US-013), so
  items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is
  recorded here.

## Findings

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | US-013 §Intent | One read-only roster: who joined and which row is the organizer; outsiders denied |
| ② | Actors defined | — | Pass | US-013 §Actors and boundaries | Members allowed; organizer identified not privileged; Eve denied; backend owns access/projection; frontend owns Screen 7 states |
| ③ | Scope bounded | — | Pass | US-013 §In/Out scope | Out of scope names readiness/preferences, generation, invite/remove/role change, auth, list-all, new schema, split/main-plan changes |
| ④ | Scenarios / AC concrete | — | Pass | US-013 §Scenarios S1–S10, U1–U3 | Each scenario has an observable status, code, row count, organizer flag or visible state |
| ⑤ | Exception / boundary | — | Pass | deep-dive §US-013 ⑩ | Missing/unknown identity, unknown trip with member and outsider, outsider denial, empty roster, duplicate accept, write verbs all enumerated |
| ⑥ | Results verifiable | — | Pass | US-013 §Scenarios; fixtures §US-013 | Status codes, `code` values, exact four rows, unique organizer and absence of identity fields are observable without screenshots |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | impact brief §US-013; deep-dive ⑪ | `trips` ADDED read, `app-shell` MODIFIED placeholder, `invitations` composed, `main-itinerary` untouched; no migration; frontend shell reused |
| ⑧ | Open-questions gate | — | Pass | US-013 §Open questions | Blocking not-resolved = 0. OQ-1/OQ-2 deferred to P3; OQ-3 resolved (`organizer`) |
| ⑨ | Data contract decided | — | Pass | deep-dive §US-013 ⑨ | Roster grain, wire fields, ordering, organizer derivation and source tables are concrete; no `{TBD}` |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §US-013 ⑩ | Every branch referenced by S1–S10 / U1–U3 has an in/out row |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §US-013 ⑪ | `trips`/`invitations`/`app-shell`/`main-itinerary` convergence rows; split-branch vocabulary divergence recorded as non-blocking follow-up |
| ⑫ | Notification / display contract | — | Pass | deep-dive §US-013 ⑫ | Eight display surfaces with trigger, recipient, content, channel and cardinality; no notification scope |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted.
`/sdd:story-split` is Skipped: the story already exists as GitHub issue #9 and
the split is fixed at one ADDED `trips` requirement plus one MODIFIED
`app-shell` requirement.

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| SUGGESTION | deferred | US-013 OQ-1 | Avatar colour/initial and row spacing unspecified | P3 visual decision from `ui-design-reference` tokens; no contract impact. Owner Dev |
| SUGGESTION | deferred | US-013 OQ-2 | Durable last-opened-trip memory across reloads | The shell contract keeps `#/members`; P3 may add session storage without changing the API. Owner Dev/IO |
| SUGGESTION | resolved | US-013 OQ-3 | `organizer` vs `isOrganizer` wire field | `organizer` selected; recorded in fixtures §US-013; IO/SA confirm at G1. Owner IO/SA |
| SUGGESTION | open | deep-dive ⑪ | Unmerged split branch uses `MEMBER_REQUIRED` for a missing `X-User-Id`, while merged `trips`/`main-itinerary` use `USER_REQUIRED` | US-013 follows `USER_REQUIRED`; flag at split-merge review. No code change here. Owner Dev/SA |
| SUGGESTION | open | requirement §Constraints | `tech-stack-plan` names AntD 5 + TanStack Query v5, but the merged frontend uses token CSS + plain `api()` | Follow the actual baseline for this read screen; adopting the planned stack is a separate migration (US-065/US-066). Recorded in the proposal as a known deviation. Owner Dev/SA |

No BLOCKER is deferred. Blocking open questions not `resolved`: **0**.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION carry owners; none blocks drafting.
- Cleared to run `/sdd:proposal-split` for the `trips` member-list read and the
  `app-shell` placeholder modification.
