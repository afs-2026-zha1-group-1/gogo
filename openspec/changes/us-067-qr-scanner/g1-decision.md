# G1 decision — us-067-qr-scanner

- Gate: G1 (Align)
- Timestamp: 2026-11-16
- Branch: US-067-invitation-planning

## Inputs

- Proposal: `openspec/changes/us-067-qr-scanner/proposal.md`
- Delta Spec: `openspec/changes/us-067-qr-scanner/specs/invitations/spec.md`
  (1 ADDED requirement, 10 scenarios)
- Delta Spec: `openspec/changes/us-067-qr-scanner/specs/app-shell/spec.md`
  (1 MODIFIED requirement, 5 scenarios)
- AC/DoV review: `openspec/changes/us-067-qr-scanner/dov-ac-review.md`
  (AC 4/4 Pass, DoV 5/5 Pass)
- Requirement source: `requirement-workspace/requirements/US-067.md`
- Impact brief: `requirement-workspace/impact-brief.md` §US-067

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | Aligned: frontend scanner + 1 app-shell full-screen classification; no backend changes, reuses REQ-004 invitations APIs |
| Ambiguity | Blocking OQ all resolved; 1 non-blocking (jsqr vs BarcodeDetector) plus the image decode path → P3 |
| Conflict | app-shell ownership gap found by IO review: `#/scan` is a new top-level full-screen route that the shell requirement did not cover. Closed by the new `app-shell` MODIFIED delta. Invitations spec and REQ-004 fixtures remain conflict-free. |
| Verifiability | 10 invitations scenarios + 5 app-shell scenarios, all observable behavior |
| Residual | US-066 merge order (US-066 archives first; US-067 rebases and re-runs E2E against the session-based Join page) — non-blocking, tracked below |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Lumi | **Pass** | 2026-11-16 |
| IO | Leo | **Pass (signed)** | 2026-11-16 |

Signed-off by IO Leo on 2026-11-16 after the C2–C5 patches below were applied
to this branch and verified in the delta specs and requirement entry. The agent
records the sign-off on the user's instruction and does not independently
verify the signer's identity.

## Decision: Pass

Rationale: SA full Pass; IO review found four business-level gaps (shell
ownership, QR matching face, US-066 wording/ownership, missing UI basis). All
four are patched in this branch and recorded as C2–C5; no open objection and no
unresolved blocking question remains.

### IO review patches (2026-11-16)

| # | IO review finding | Patch | Evidence |
|---|---|---|---|
| C2 | `#/scan` was not owned by any app-shell requirement, contradicting "every in-app route inside the shell + fixed dock". | Added `specs/app-shell/spec.md` MODIFIED "Mobile shell frame": scanner is a full-screen flow, no dock, identity scaffold bar retained, not associated with any dock tab, close restores the originating route (fallback `#/`). | `specs/app-shell/spec.md` |
| C3 | QR validation was ambiguous about the matching face; the real QR payload is `<base>/#/join/<token>` (token in the fragment, not the path), so a `URL.pathname` check would reject every valid code while a loose substring check would accept cross-origin links. | Spec now requires the complete `#/join/<token>` form, a 32-character lowercase hex token (backend `InvitationTokens` uses `HexFormat` on 16 bytes), same-origin absolute URLs only, relative/hash-only always accepted, other origins rejected; added a cross-origin scenario. | `specs/invitations/spec.md` |
| C4 | US-066 was described as "deferred/unplanned" although it is in flight (`US-066-log-in`, P2 + G1 Conditional), and AC S9 had no named owner. | Requirement actors/OQ-1 updated: US-066 is in flight; S9 is owned by US-066's join-level "signed-out → login → resume preview"; the scanner only hands off to `#/join/<token>` and must not implement login resume. Merge order recorded. | `requirement-workspace/requirements/US-067.md`, `proposal.md` |
| C5 | S11 claimed to match a prototype scanner screen, but neither the prototype HTML nor the screenshots contain one — the acceptance basis did not exist. | S11/constraints now define the design basis (Ant Design interaction patterns + existing `app.css` tokens + the scanner layout in the delta spec); added a "Scanner screen follows the design basis" scenario. | `requirement-workspace/requirements/US-067.md`, `specs/invitations/spec.md` |

### Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | IO Leo formal sign-off after reviewing branch artifacts | Leo (IO) | Before P3 start | **closed** (signed Pass 2026-11-16) |
| C2 | app-shell MODIFIED delta for `#/scan` full-screen flow | Dev + SA | Before P3 | **closed** (delta added) |
| C3 | QR matching face: complete hash form + 32-hex token + same-origin rule | Dev | Before P3 | **closed** (spec updated) |
| C4 | US-066 ownership wording + S9 owner + merge order | IO | Before P3 | **closed** (recorded) |
| C5 | S11 UI basis replaced with an existing design basis | IO | Before P3 | **closed** (recorded) |

### Residual notes (non-blocking, carry into P3/P4)

- Merge order: `US-066-log-in` archives first; US-067 then rebases and re-runs
  its E2E against the session-based Join page (the scaffold identity bar and
  `X-User-Id` acceptance path disappear with US-066).
- Entry point (AC S1–S2) stays deferred: E2E opens `#/scan` directly; the
  follow-up UI integration story must be registered before US-067 archives.
- `jsqr` must move from devDependency to dependency in P3.
- `InAppPage` in `frontend/src/types.ts` must exclude `scan` so `TAB_FOR_PAGE`
  keeps compiling; P3 design must state this.

## Closure path

Gate closed as **Pass** on 2026-11-16: proceed to `/sdd:p3` ATDD/design on this
branch. Any later change to the QR matching rule or the scanner's full-screen
classification reopens C2/C3.
