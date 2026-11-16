# Consistency lint — us-066-log-in

- Date: 2026-11-16
- Phase: p2
- Focus: full change
- Artifact level: 2 (proposal + delta specs; no tasks/design yet)
- Roots: `openspec/changes/us-066-log-in/`, `openspec/specs/`,
  `requirement-workspace/`, in-flight `openspec/changes/us-031-037-main-itinerary/`
- Tooling: OpenSpec CLI 1.9.0 present (`openspec validate us-066-log-in` → valid)

## Verdict

**Partial** — no BLOCKER; one cross-change WARNING and three SUGGESTIONs.
Counts: BLOCKER 0 · WARNING 1 · SUGGESTION 3 · N/A 2 (tasks/design absent at P2).

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Fact/Inference |
|---|---|---|---|---|---|---|---|---|
| L1 | WARNING | p2 | `openspec/changes/us-031-037-main-itinerary/specs/main-itinerary/spec.md` §"Authorization and identity for main-plan operations"; `specs/auth/spec.md` §"Protected request identity and public surfaces" | The in-flight main-itinerary delta still specifies `X-User-Id`, while US-066 makes the header non-authenticating. Its change is merged but not archived, so the two artifacts are incompatible if both are read as current. | Reconcile at implementation: update the main-itinerary identity scenarios, or archive it first and add a MODIFIED living-spec delta in US-066; keep outcomes unchanged. | Issue #38 planning note; proposal §What Changes cross-change bullet; `openspec validate us-031-037-main-itinerary` not run | proposal + spec | [fact] |
| L2 | SUGGESTION | p2 | `specs/app-shell/spec.md` MODIFIED blocks | Historical scenario names are retained by OpenSpec's archive rule although their content now documents removal (`The identity switcher stays a scaffold in the shell`, `Tab switching … keeps identity`). | Treat the names as stable identifiers; P3 design should state that the switcher is removed and the authenticated account is kept. | `openspec validate us-066-log-in` required retaining the names | spec | [fact] |
| L3 | SUGGESTION | p2 | `specs/auth/spec.md` §"Account credential login", §"CSRF protection"; proposal §What Changes | `INVALID_CREDENTIALS` and `CSRF_INVALID` are new error codes introduced at P2; the proposal named only generic failures. | Acknowledge at G1; codes follow the repository's `code` convention and are covered by fixtures A3/A4/A10/A12. | Delta spec scenarios; `requirement-workspace/acceptance-test-fixtures.md` §REQ-006 | spec | [fact] |
| L4 | SUGGESTION | p2 | `requirement-workspace/acceptance-test-fixtures.md` §REQ-006 | OQ-8 named "one documented demo password"; P2 fixed the literal `gogo-demo-2026` and emails in the fixture file. | No change required; the fixture is now the value owner. Keep it demo-only and out of UI. | OQ-8 resolution; fixtures table | proposal + spec | [fact] |

## Check results

| Check | Result | Note |
|---|---|---|
| P1 Why present | Pass | proposal §Why |
| P2 What Changes present | Pass | proposal §What Changes |
| P3 Non-Goals present | Pass | proposal §Non-Goals / Out of scope |
| P4 Impact self/upstream/downstream | Pass | proposal §Impact |
| S1 Spec structure | Pass | OpenSpec validates |
| S3 Requirement traces to proposal | Pass | auth 5; trips/invitations/app-shell MODIFIED; main-plan covered generically (L1) |
| S4 Given/When/Then | Pass | OpenSpec schema uses WHEN/THEN; project precedent |
| C1 proposal → spec coverage | Pass | All proposal bullets have a spec home |
| C2 spec → tasks | N/A | `tasks.md` not present at P2 |
| p2 scope/drop check | Pass | No requirement silently dropped from the proposal |
| Cross-capability consistency | Partial | L1 |
| Design rules D1–D3 | N/A | `design.md` not present at P2 |
| Tasks rules T1–T3 | N/A | `tasks.md` not present at P2 |

## Fix suggestions by priority

1. **L1 (WARNING):** before US-066 implementation/archive, reconcile the
   main-itinerary identity delta (update it or add a MODIFIED living-spec delta
   after its archive). This is the only item that should be a named G1 condition
   if the human wants a clean Pass later.
2. **L2–L4 (SUGGESTION):** no spec edit required; carry them as notes into P3
   design and G1.

## Residual risks

- Main-itinerary archive ordering (L1) remains the primary residual risk.
- In-memory sessions are lost on restart (accepted; re-login).
- Demo credentials live in the fixture file (accepted; demo-only).
- CSRF bootstrap order is fixed at P3; fixtures A10–A12 define the expected
  behavior.

## Reviewer metadata

- Reviewer: coding agent
- Human sign-off: pending (G1 not recorded)
- Date: 2026-11-16

## Next (non-Gate)

`/sdd:g1-decision-record` after the human resolves or accepts L1; otherwise
continue `/sdd:p2`. This report is not a Gate decision and does not edit the
Living or Delta specs.

## G1 review addendum (2026-11-16)

- **L1 superseded.** `us-031-037-main-itinerary` is archived on main and
  `openspec/specs/main-itinerary/spec.md` exists, so the reconciliation target is
  a MODIFIED living-spec delta, not the in-flight delta.
- **New BLOCKER-level findings** from the G1 review (`g1-decision.md` B1–B4):
  the merged `splits` capability is identity-bound to `X-User-Id` and absent from
  this change's scope; `main-itinerary` has no delta here; the branch base is 25
  commits behind main and `V4` is `V4__splits.sql`; two error-envelope/401-code
  conventions coexist.
- Revised counts for a re-run at p2 after the conditions are met: BLOCKER 3
  (scope, baseline, contract), WARNING 0 (L1 closed), SUGGESTION 3 (L2–L4).

## Re-run after G1 C1–C4 (2026-11-16)

- Artifact level: 2 (proposal + 6 delta specs: auth ADDED; trips, invitations,
  app-shell, main-itinerary, splits MODIFIED; no tasks/design yet).
- Tooling: `openspec validate us-066-log-in` → **valid**.
- **L1 closed:** `main-itinerary` is archived/living; a MODIFIED delta now
  targets the Living Spec (`specs/main-itinerary/spec.md`).
- **C1 closed:** `specs/splits/spec.md` MODIFIED added (5 requirements, all
  requirement/scenario names retained; identity phrases now use the session).
- **C3 resolved:** `specs/auth/spec.md` defines flat `{code,message}` for
  auth/trip/invitation/main-plan + Security handlers, and documents splits
  `{data,error}` + `MEMBER_REQUIRED` as the only exception.
- **C4 resolved:** baseline refreshed to `origin/main` `f6419a5` (merge
  `53bdcc6`); frontend/test lists and `V4/V6` wording updated.
- **REQ renumber:** REQ-006 → REQ-008 (main took REQ-006 for US-042; REQ-007 is
  US-043). Signed G1 record unchanged; addendum records it.

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Fact/Inference |
|---|---|---|---|---|---|---|---|---|
| L5 | WARNING | p2 | `openspec/specs/splits/spec.md` Purpose (line 11) | Purpose still says identity = `X-Member-Id` / `trip_member.id`, while code uses `X-User-Id` and the delta now uses the authenticated session. Pre-existing drift, not introduced by US-066. | Correct the Purpose at archive/living-merge; do not silently rewrite the Living Spec here. | splits Purpose vs `SplitDraftController` / `MemberGuard` | spec + code | [fact] |
| L6 | SUGGESTION | p2 | MODIFIED app-shell/splits blocks | Historical scenario/requirement names retained by OpenSpec archive rules although their content changed (e.g. "The identity switcher stays a scaffold", splits "缺失或未知身份拒绝"). | Treat names as identifiers; P3 design explains the removal/exception. | `openspec validate` retention rule | spec | [inference] |

### Verdict after remediation

**Partial** — no BLOCKER, one pre-existing WARNING (L5) plus SUGGESTION L2–L4/L6.
C1–C4 are closed; L5 is a Living Spec prose drift owned by SA for
archive/living-merge and does not change the identity contract in the delta.

### Residual risks after remediation

- L5 splits Purpose drift (SA; living-merge).
- In-memory sessions lost on restart (accepted).
- Demo credentials in fixtures (accepted, demo-only).
- CSRF bootstrap order and the splits `MEMBER_REQUIRED` security-chain exception
  must be designed at P3 (R32/R47).

### Next (non-Gate)

IO + SA confirm the Conditional → Pass conversion using
`g1-addendum-c1-c4.md`; then `/sdd:p3`. This re-run does not edit the Living or
Delta specs and is not a Gate decision.

**Update 2026-11-16:** converted to **Pass** in `g1-decision-pass.md` on SA
Elian Jiang's instruction; C1–C4 closed. L5 remains the only residual warning.
