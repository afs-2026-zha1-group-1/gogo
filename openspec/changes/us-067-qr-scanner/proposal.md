# Proposal

## Why

Invited travelers currently access a trip invitation only by opening a shared
URL link. The product prototype (US-067) specifies a camera-based QR-code
scanner so a traveler can point their phone at a friend's screen or printed QR
and land on the existing invitation preview-and-accept flow without manually
typing or pasting a link. This lowers the friction of joining a trip and
matches the mobile-first UX direction.

## What Changes

- New frontend **Scanner screen** (`Scanner.tsx`) with:
  - Camera preview area (lazy `getUserMedia` — permission requested only on
    explicit "Start camera" tap).
  - QR frame decoding via `jsqr` (already a devDependency from REQ-004;
    promoted to a production dependency by this change).
  - "Choose image" button for decoding a QR from a local photo file.
  - Invitation-link text input as a fallback when camera is unavailable.
  - URL validation: the decoded text must carry the complete hash form
    `#/join/<token>` with a 32-character lowercase hexadecimal token (the QR
    stores `<base>/#/join/<token>`, so the token lives in the fragment, not the
    path). Relative/hash-only forms are accepted; absolute URLs are accepted
    only when same-origin; any other origin is rejected as unrelated.
  - On valid token extraction → navigate to `#/join/<token>` (existing Join
    page, REQ-004). No new backend endpoints.
  - Camera release on close or navigation away (`MediaStreamTrack.stop()`).
  - Closing the scanner returns to the route it was opened from, falling back
    to `#/` when no in-app history exists.
  - Error recovery panel: retry + manual link input when camera is denied,
    hardware unavailable, or code is unreadable.
  - UI basis: Ant Design interaction patterns + the existing `app.css` tokens;
    no scanner screen exists in the prototype HTML or screenshots.
- New hash route `#/scan` in `App.tsx` parseRoute, classified as a full-screen
  flow: no bottom dock, the identity scaffold bar stays visible, no dock tab is
  associated with it, and closing it restores the originating route.
- New icons: `scan`, `camera` in `Icons.tsx`.
- `jsqr` promoted from devDependency to production dependency.
- **Deferred** (not in this change): scan-icon entry-point placement beside the
  "i" control (AC S1–S2), owned by a follow-up UI integration story; US-066
  login retention (AC S9), owned by the in-flight `US-066-log-in` change
  (scanner hands off to `#/join/<token>` and does not implement login resume).

## Capabilities

### New Capabilities

*(none)*

### Modified Capabilities

- `invitations`: 1 ADDED requirement — "QR-code invitation scanner" (frontend
  scanner surface, camera lifecycle, URL validation, handoff to existing
  preview/accept flow, error recovery with link fallback).
- `app-shell`: 1 MODIFIED requirement — "Mobile shell frame" classifies
  `#/scan` as a full-screen flow (no dock, identity scaffold bar retained, not
  associated with any dock tab, close returns to the originating route).

## Impact

| Area | Effect |
|---|---|
| Frontend | New `Scanner.tsx` page, 1 route entry in `App.tsx`, 2 icons, scanner state types |
| Dependencies | `jsqr` moves from devDependency → dependency |
| Backend | None — existing `GET /api/invitations/{token}` and `POST /api/invitations/{token}/accept` (REQ-004) are called by the unchanged Join page |
| Database | None |
| Browser APIs | `navigator.mediaDevices.getUserMedia` (camera), `FileReader` + Canvas (image decode) |
| Specs | `openspec/specs/invitations/spec.md` gains 1 ADDED requirement and `openspec/specs/app-shell/spec.md` gains 1 MODIFIED requirement after archive |
| Requirement source | `requirement-workspace/requirements/US-067.md` |
| Impact brief | `requirement-workspace/impact-brief.md` §US-067 |
