# Change summary — us-031-037-main-itinerary

## Intent

Ship the Release-1 main-itinerary slice as two bundled stories: **US-031** let the
trip organizer generate a timed main-plan draft from ready members' preferences,
and **US-037** let the organizer confirm a validated draft into one shared plan
version, closing joining so the group converges on a single feasible itinerary.
Bundled into a single change under a US-based id (formerly REQ-005) per the
2026-11-15 user ruling.

## What shipped

- **Living Spec**: new `main-itinerary` capability with **7 ADDED requirements /
  24 scenarios** (readiness-gated generation, location completion, draft review
  with computed staleness, generation-inputs read, validation-gated confirmation,
  confirmation boundaries, authorization/identity).
- **Backend**: Flyway `V5__create_main_plan.sql` (`main_plan_draft` +
  `main_plan_stop`, `trip_member.ready` / `preference_revision`, read-only
  `member_preference` stand-in); `MainPlanProvider` port + deterministic
  `FakeMainPlanProvider`; repository/service/error-advice; four endpoints
  (`POST/GET /main-plan`, `GET /main-plan/inputs`, `POST /main-plan/confirm`) with
  the contractual statuses and error codes; schedule validator (five error types
  incl. `TRAVEL_EXCEEDS_GAP`) and hard-budget overrun computation.
- **Frontend**: Screen 9 (`MainPlanInputs.tsx`) and Screen 10 (`MainPlan.tsx`),
  migrated to TypeScript and converged onto `main`'s shared `api<T>()` client,
  wired as join-style full-page routes; four mandatory UI states each.
- **Integration**: merged `origin/main`'s US-064 app shell (merge `2bc8ed1`),
  removing this branch's temporary API/type shims.
- **PR / merge**: PR #37 → merged to `main` as `00ea4bc`.
- **KB**: `tech-stack-plan.md` §13 landed-reconciliation addendum + `_LOG.md` row
  (additive, main-plan scope only). `kb-lint.sh` reported the documented
  **SKIP (not configured)** — KB lint was not run/validated.

## Verify highlights

- Backend `mvn test` **90/90** green (MainPlanApiTest 34, Trip 13, Invitation 15,
  Greeting 3, unit suites 25).
- Runtime curl matrix **65/65** PASS incl. the C1→J4 `JOINING_CLOSED` closure.
- Browser E2E: all checklist rows observed; **ST-1** loading skeleton not
  capturable locally (recorded Partial, not a defect).
- `npm ci` + `tsc -b && vite build` green; `tsc --noEmit` zero errors.
- Remote CI **E1 全绿** on merged head `ed0a487` / `ac82d55` (Backend tests +
  Frontend build; first two attempts failed only at a transient `actions/checkout`
  and cleared on re-run).
- local-verify `20261116-004329` (Overall Partial — the two Partial drivers, no
  remote CI + E3 human pending, both later closed); pipeline `20261116-114859`.
- **G1 Pass** (IO Emily + SA Lumi, 2026-11-15, C1/C2 ratified). **G2 Pass**
  (VL Elian Jiang, 2026-11-16, `g2-decision.md`), no CRITICAL, no Waiver.

## Residual risks

- **Merge order**: REQ-019's kind/payload `member_preference` must take `V4`
  first; execute the **F1** write-sync alignment (preference write → revision
  bump → readiness set) before/at that merge. Non-gating follow-up from G1 C2.
- **Fake provider + read-only preference stand-in** are declared MVP non-goals
  until REQ-019 merges; the real provider/replanning path is deferred to R2.
- **Corrupted stored-preference payload** fails fast with 500 — REQ-019 owns
  preference-write validation; kept intentionally.
- Frontend `Home/TripDetails/Join/InvitationPanel` remain `.jsx`; their
  TypeScript migration belongs to **US-065** itself, not this change.
- `openspec validate --specs` flags **pre-existing** "requirement text too long"
  warnings on the unrelated `app-shell` spec (landed with US-064); out of this
  change's scope, recorded only.

## Links

- Delta / Living spec: `openspec/specs/main-itinerary/spec.md`
- Proposal / design / ATDD / tasks: this folder (`proposal.md`, `design.md`,
  `atdd-design.md`, `tasks.md`)
- Gates: `g1-decision.md`, `g2-decision.md`
- Evidence: `docs/ai4se-plugins/20261116-004329-local-verify-report.md`,
  `docs/ai4se-plugins/20261116-114859-pipeline-report.md`,
  `docs/feedback/verification-us-031-037.md`,
  `docs/feedback/us-031-037-matrix-run.log`
- PR / merge: PR #37 → `main` `00ea4bc`
- KB: `docs/knowledge/architecture/tech-stack-plan.md` §13, `docs/knowledge/_LOG.md`
