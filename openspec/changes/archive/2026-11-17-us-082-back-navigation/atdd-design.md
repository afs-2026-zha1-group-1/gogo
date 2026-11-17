# ATDD design — us-082-back-navigation

Change: `openspec/changes/us-082-back-navigation/` · Gate: G1 Pass · Author: P3
ATDD design · Timestamp: 2026-11-17

Inputs: `proposal.md`; `specs/app-shell/spec.md` (1 MODIFIED + 2 ADDED, 14
scenarios); `dov-ac-review.md`; `cross-change-scan.md`; `g1-decision.md`;
`design.md`; `tasks.md`.

## 1. ATDD layers in scope

**Layers actually exercised**: **E2E** (browser acceptance) and **API**
(regression for the invite accept response). **UT** is not planned: the
frontend has no unit-test harness, and the backend change is one additive record
field covered by the existing `InvitationApiTest`.

### Scenario → layer inference

| # | Scenario (source) | Layer | Rationale |
|---|---|---|---|
| G-1 | A valid invitation opens full-screen without the dock (Guest join) | E2E regression | Existing US-068-070 behavior; asserts no dock |
| G-2 | An unusable link stays full-screen without the dock (Guest join) | E2E regression | Existing behavior |
| G-3 | Accepting while signed out resumes the preview after login (Guest join) | E2E | `pendingInvite` must win over any `next` value |
| G-4 | The login page has no dock (Guest join) | E2E regression | Existing behavior |
| G-5 | The registration page has no dock (Guest join) | E2E regression | Carried from archived US-068-070 |
| G-6 | Registration during an invitation resumes the preview after login (Guest join) | E2E regression | Carried from archived US-068-070 |
| G-7 | Joined state opens the accepted trip (Guest join) | **E2E + API** | UI button/href plus real `tripId` in the accept response |
| T-1 | Split start back returns to the trip details (Trip-context) | E2E | Navigation target and restored trip context |
| T-2 | Direct split entry back does not fall to home (Trip-context) | E2E | Direct-entry edge case |
| T-3 | Main plan back returns to the trip details (Trip-context) | E2E | Navigation target |
| A-1 | Signed-out split deep link resumes after login (Auth) | E2E | Login → original route |
| A-2 | Pending invitation takes precedence (Auth) | E2E | Priority between invite and `next` |
| A-3 | Unsafe resume value is rejected (Auth) | E2E | Cross-origin / non-single-slash input |
| A-4 | Auth pages link through router routes (Auth) | E2E | Link href and route landing |

**Deferred to a future UT harness**: `resumeTarget()` validation branches. No
UT suite exists; the negative branch is covered by A-3 in the browser.

## 2. Red-first artifacts

- `docs/feedback/e2e-us-082.md` — one row per scenario (plus two US-071
  dependency rows), browser steps, expected observable, status.
- `InvitationApiTest` now asserts the accept response carries `tripId`; this is
  the API regression that prevents the `#/trips/undefined` regression.
- No new API test suite and no new fixture endpoint. The E2E rows use the
  existing demo accounts and trip/invitation seed.

Because this small change was executed continuously, the E2E checklist was
authored before the browser walk rather than before the first code edit; the
API assertion was added with the additive field.

## 3. Local vs CI gates

| Gate | Tool | When | Pass condition |
|---|---|---|---|
| Local backend | `mvn -B test` | P4 | 279/279, including `InvitationApiTest` |
| Local frontend | `npm ci && npm run build` | P4 | Clean install, tsc and vite build green |
| Static | `docs/feedback/verification-commands.md` | P4 | Required checks pass; stale CI-trigger probe recorded N/A |
| OpenSpec | `openspec validate us-082-back-navigation --strict` | P2/P4 | valid |
| Manual E2E | Browser on the branch backend | P4 | Observed rows Pass; residual rows named |
| CI | `.github/workflows/ci.yml` | PR | Backend tests + Frontend build green |

## 4. Data / fixture strategy

- Reuse demo accounts (`alice@example.com` / `gogo-demo-2026`) and the seeded
  `Singapore Friends Day` trip.
- Reuse the trip-2 invitation token for the joined-state row; trip 1's main plan
  is confirmed and joining is closed.
- No new migration, seed row, endpoint or dependency.
- US-071 dependency rows (members back, create back) are recorded as Blocked
  until that change merges; they are not duplicated here.

## 5. NFR scope

No new performance, availability, accessibility or security NFR. The only
security-relevant addition is the same-origin `next` validation; it is covered
by A-3 and the residual risk note.

## 6. Alignment self-check (Spec ↔ Design ↔ ATDD ↔ Tasks)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Every delta scenario has an ATDD layer | Pass | 14 rows above |
| 2 | Every in-scope scenario maps to a task or E2E row | Pass | `tasks.md` groups 3–8 + `e2e-us-082.md` |
| 3 | Design decisions cover the risky branches | Pass | `design.md` D1–D6 (explicit targets, `?next=`, join tripId) |
| 4 | No scope outside the delta | Pass | AC2/AC3 deferred to US-071; no backend endpoint/migration/dependency |

## 7. Residual

- A-2 is not browser-tested on the shared 8080 backend (logout failed there); the
  branch backend 8081 was used for G-7 and the remaining rows. Re-run A-2 in an
  isolated environment before G3 if required.
- US-071 dependency rows stay Blocked until that change lands.
