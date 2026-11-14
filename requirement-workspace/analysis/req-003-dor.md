# DoR light self-check — REQ-003

- Date: 2026-11-14
- Entry: `requirement-workspace/requirements/REQ-003.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §REQ-003), so items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is recorded here.

## Findings

### Amendment after user review, 2026-11-14

The tables below preserve the original self-check. Destination is now required
and both locations are nullable. OQ-6 is resolved by the user's follow-up:
US-031 fills missing locations at main-plan generation from submitted member
preferences, or random locations if there are no preferences or suitable results;
user-supplied locations are preserved. Follow-up owners: IO Emily / SA Johnson.
Current blocking OQ count: **0**; the earlier reopening is closed for REQ-003.
The user accepts controlled-demo identity and REQ-003-before-REQ-004 ordering.
G1 remains NOT RECORDED because no gate verdict or completed signatures were
provided. Original OQ-1/OQ-2 defaults below are superseded.

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-003 §Intent | Persist and read one shared trip aggregate; two named error cases for create, one denial for read |
| ② | Actors defined | — | Pass | REQ-003 §Actors | Traveller via `X-User-Id`, backend, frontend. The header is explicitly a scaffold stand-in, not a security control |
| ③ | Scope bounded | — | Pass | REQ-003 §In/Out scope | Out of scope names authentication, invitations, member management, edit/delete, lists, dashboard, ORM |
| ④ | Scenarios / AC concrete | — | Pass | REQ-003 §Scenarios | Five primary scenarios plus four reverse cases, each with an HTTP outcome and a stable error `code` |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-003 ⑩ | Unknown id, missing identity, non-member, malformed date, blank name, inverted range all enumerated |
| ⑥ | Results verifiable | — | Pass | REQ-003 §Scenarios | Status code plus `code`, stored row values, membership row, and the empty-body assertion for R2 |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | proposal §Impact | No new backend artifact; `JdbcTemplate`, Flyway and SQLite are already in use. Frontend routing is the only open tooling choice and is deferred to P3 |
| ⑧ | Open-questions gate | — | Pass | REQ-003 §Open questions | Blocking not-resolved = 0. OQ-2/OQ-3/OQ-5 resolved with owners; OQ-1/OQ-4 are non-blocking and deferred |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-003 ⑨ | Three tables with grain, columns, keys and the transaction that creates the membership row; wire shapes for request, success and error |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-003 ⑩ | Every scenario branch has an in/out row; concurrent create and cross-trip access are explicitly out |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-003 ⑪ | New `trips` capability is independent of `greeting`; no shared table, no shared endpoint, no conflict |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-003 ⑫ | Two pages, their trigger, recipient, displayed fields, and the error/loading/denied surfaces |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted.
`/sdd:story-split` is Skipped: both stories already exist as GitHub issues and the
split is fixed at three ADDED requirements (identity, creation, detail read).

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | deferred | `ui-design-reference/` | The screenshots referenced by US-001 and US-002 are not on disk and not tracked by git, so the presentation reference is unavailable | AC text plus the mandatory error/empty/loading/permission states govern. Provide the images before P3 review, otherwise the layout is a design judgement. Owner IO/BA |
| WARNING | resolved-with-tradeoff | REQ-003 OQ-2 | `403` for a non-member confirms that the trip exists | Accepted for a scaffold with no authentication; wording matches the AC. Owner SA, confirm at G1 |
| SUGGESTION | deferred | REQ-003 OQ-1 | Destination and both locations have no stated validation | Stored verbatim; no invented error. Owner IO, confirm at G1 |
| SUGGESTION | deferred | REQ-003 OQ-4 | The React app has no router | Decide new dependency versus minimal client-side routing at P3. Owner Dev |

Deferred items retain their severity. No BLOCKER is deferred.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION carry owners; none blocks drafting.
- Cleared to run `/sdd:delta-craft` for the new `trips` capability.
