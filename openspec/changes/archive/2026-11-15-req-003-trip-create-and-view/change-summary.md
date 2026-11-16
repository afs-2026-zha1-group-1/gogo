# Change summary — req-003-trip-create-and-view

## Intent

Let an organizer create one shared trip with a name, destination, valid dates
and optional start/end locations, and let every member view the same saved
details. Covers US-001 and US-002 of Iteration 0.

## What shipped

- **Capability `trips`** with three requirements: caller identity contract,
  trip creation, and trip detail read.
- **Backend:** `V2__create_trip.sql` (`app_user`, `trip`, `trip_member`, seed
  users and the sample trip), `TripController`, `TripRepository`,
  `TripErrorAdvice` with `code`/`message` errors.
- **Endpoints:** `POST /api/trips` and `GET /api/trips/{id}`.
- **Frontend:** hash router shell (`#/`, `#/create`, `#/trips/<id>`), scaffold
  identity switcher over the five seeded users, create form with field-level
  validation and null-location placeholders, detail read with denied/missing/
  failure states.
- **UI follow-up:** the screen-02/03 component language was aligned during
  REQ-004 P4 on the same branch (hero card, icon labels, two-column rows, info
  note, bottom CTA), so the post-G2 follow-up is closed.

## Verify highlights

- `mvn -B test` 16/16 after red-first; `mvn package` and `npm run build` pass.
- curl suite over 12 scenarios plus reverse checks; browser E2E for create,
  read, denied, not-found, validation and failure states.
- CI: PR #30, run 43603964689 on head `da4f08e`, both jobs success.
- Evidence: `docs/feedback/verification-req-003.md`,
  `docs/ai4se-plugins/20261114-220856-local-verify-report.md`,
  `docs/ai4se-plugins/20261114-221900-pipeline-report.md`.

## Residual risks

- `X-User-Id` is trusted without verification; scaffold only, never a security
  control.
- A `403` on read reveals that the trip exists; accepted from the AC wording.
- Null start/end locations stay null until US-031 main-plan generation fills
  them from member preferences.

## Links

- Change: `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/`
- Specs: `specs/trips/spec.md`
- Design/ATDD/tasks: `design.md`, `atdd-design.md`, `tasks.md`
- Gates: `g1-decision.md` (Pass), `g2-decision.md` (Pass, VL Elian Jiang)
- PR: #30 (merged into main)
