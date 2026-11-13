# DoR light self-check — REQ-002

- Date: 2026-11-13
- Entry: `requirement-workspace/requirements/REQ-002.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §REQ-002), so items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is recorded here.

## Findings

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-002 §Intent | Apply three named IO rulings without changing what the visitor sees |
| ② | Actors defined | — | Pass | REQ-002 §Actors | Unchanged from REQ-001: visitor, backend, CI; no auth in scope |
| ③ | Scope bounded | — | Pass | REQ-002 §In/Out scope | Out-of-scope keeps all REQ-001 non-goals and adds H2 row migration, CI restructuring, extra JSON fields |
| ④ | Scenarios / AC concrete | — | Pass | REQ-002 §Scenarios | AC1–AC6 plus reverse cases AC3-N and AC6-N, each with an observable outcome |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-002 ⑩ | Backend-unreachable and non-JSON-200 branches both covered; out-of-scope rows carry reasons |
| ⑥ | Results verifiable | — | Pass | REQ-002 §Scenarios | Media type + exact JSON body, file presence + row query, rendered `h1` text, 405 on write methods |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | proposal §Impact | sqlite-jdbc 3.46.1.0 now cached via the corporate mirror; Flyway 11.7.2 SQLite support verified in the jar and to be confirmed by a real migration run; ports and file path unchanged |
| ⑧ | Open-questions gate | — | Pass | REQ-002 §Open questions | Blocking not-resolved = 0. All three inherited OQs resolved by the IO ruling; OQ-5/OQ-6 resolved with owners |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-002 ⑨ | Storage grain and both SQLite column types; wire grain and the single required `message` string field fixed by the ruling; no `{TBD}` |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-002 ⑩ | Every scenario branch has an in/out row, including the new non-JSON-200 case |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-002 ⑪ | The REQ-001 body conflict is converged by a MODIFIED delta; the archive is not edited; no ✗ remains |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-002 ⑫ | Two surfaces, trigger/recipient/content/channel stated; rendered text and failure behavior unchanged |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted.
`/sdd:story-split` is Skipped: one modified requirement with two restated
scenarios does not warrant a story backlog.

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | open | proposal §Impact / CI | The REQ-001 CI confirmation predates the sqlite-jdbc dependency, so remote reachability of the new artifact from Maven Central is unproven | P4 pipeline report must be Partial with a **fresh** named human confirmation for this change's commit; owner VL/Johnson |
| WARNING | open | `~/.m2/settings.xml` | A user-level Maven config outside the repo was created to unblock the driver download; it holds credentials and its `localRepository` was overridden from the supplied value | Never commit or print it; record the deviation in the intent capture and the change summary; owner Dev |
| SUGGESTION | deferred | design D12 | SQLite test-datasource strategy (shared-cache in-memory vs temporary file) is not yet empirically settled | P4 runs the tests and records which strategy actually worked; owner Dev |

Deferred items retain their severity. No BLOCKER is deferred.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION: clarify-now was not requested; the user asked for
  continuous execution after giving the rulings. All three carry owners.
- Cleared to run `/sdd:delta-craft` for the MODIFIED `greeting` requirement.