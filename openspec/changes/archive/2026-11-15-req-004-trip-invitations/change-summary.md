# Change summary — req-004-trip-invitations

> Final summary. G2 is recorded Pass (VL Elian Jiang) and PR #31 is merged.
> This summary is not a gate decision and not Living Spec authority.

## Intent

Grow a trip beyond its creator with one shareable invitation link (and a QR
encoding the same URL), let an invited traveler preview the public basics and
join once, close joining once the main plan is confirmed, and fail closed with a
generic message for unknown links. Covers US-008, US-010 and US-012 of
Iteration 0.

## What shipped

- **Capability `invitations`** with four requirements: issuance (organizer-only
  get-or-create), preview (five-field public whitelist), acceptance/joining
  (identity-bound, idempotent, closed after confirmation), unusable invitation
  (generic 404, no trip values, no membership).
- **Capability `trips`** gains one requirement: a per-trip
  `main_plan_confirmed` boolean, default unconfirmed, with no product mutation
  path until US-037.
- **Backend:** `V3__create_invitation.sql` (`trip_invitation`, unique trip and
  token; main-plan column), `com.gogo.invitation` package with
  `InvitationController`, `InvitationRepository`, `InvitationTokens` and record
  DTOs, error advice reusing `code`/`message`.
- **Endpoints:** `POST /api/trips/{id}/invitation`,
  `GET /api/invitations/{token}`, `POST /api/invitations/{token}/accept`.
- **Frontend:** hash route `#/join/<token>`, invitation panel with link, copy
  (clipboard + selection fallback) and a real `qrcode` canvas; join page with
  preview, accept, joined, closed, unusable, loading and failure states;
  scaffold identity switcher is the only identity surface.
- **UI alignment:** create, detail and landing screens rebuilt on the
  `ui-design-reference` tokens and component language (appbar, icon labels,
  two-column rows, hero card, info note, bottom CTA), closing the screen-02/03
  gap noted in the REQ-003 G2 draft. The reference's out-of-scope elements
  (member list, edit action, reminder workflow) stay excluded.
- **Docs:** verification doc, local-verify report, README run instructions,
  registry/handoff rows, G1 record, G2 draft.

## Verify highlights

- `mvn -B test` 31/31 after observing 15 red failures first; `mvn package` and
  `npm run build` pass.
- `openspec validate req-004-trip-invitations --strict` → valid.
- curl matrix I1–I5, J1–J7, U1–U2, R-1 and R-2 match the fixtures against the
  running backend, including the test-only confirmed-state flip.
- Browser E2E: panel/link/QR rendered; local `jsqr` decode equals the copied
  absolute URL; preview → accept → joined; closed state; generic unusable page;
  organizer-only denial.
- Evidence: `docs/feedback/verification-req-004.md`,
  `docs/ai4se-plugins/20261114-225027-local-verify-report.md`.
- CI: PR #31, runs 43608236232 on `91dca19` and 43608439854 on `d4f67f0`, both
  jobs success (`docs/ai4se-plugins/20261114-230558-pipeline-report.md`).

## Residual risks

- `X-User-Id` remains an unverified scaffold, accepted only for the controlled
  demo; never a security control.
- Preview exposes destination and dates before acceptance per the OQ-2 ruling;
  members, itinerary and preferences are structurally excluded.
- `main_plan_confirmed` has no user-facing flow until US-037; only the
  documented test-only update changes it.
- Invitation URLs use the `#` hash route; QR equality is proven against that
  composed URL.
- G2 is recorded Pass; the G3 SA decision remains open. Archive follows REQ-003
  for the shared `trips` capability.

## Links

- Change: `openspec/changes/req-004-trip-invitations/`
- Specs: `specs/invitations/spec.md`, `specs/trips/spec.md`
- Design/ATDD/tasks: `design.md`, `atdd-design.md`, `tasks.md`
- Gates: `g1-decision.md` (Pass), `g2-decision.md` (pending)
- Verify: `docs/feedback/verification-req-004.md`,
  `docs/ai4se-plugins/20261114-225027-local-verify-report.md`
- Requirements: `requirement-workspace/requirements/REQ-004.md`
