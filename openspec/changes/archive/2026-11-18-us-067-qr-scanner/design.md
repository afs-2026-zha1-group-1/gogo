# Design

## Context

Motivation and product scope: see `proposal.md - Why`. The current frontend is
a React 19 + TypeScript + Vite SPA using a **custom hash router** in `App.tsx`
`parseRoute` (not React Router). Full-page flows (`#/join/<token>`,
`#/trips/<id>/main-plan`, `#/trips/<id>/main-plan/inputs`) already render
**outside** the shell column and the bottom `TabBar`, and are excluded from the
`InAppPage` union in `frontend/src/types.ts`. That existing precedent is the
shape `#/scan` will follow.

Backend invitation contract (REQ-004, unchanged by US-067):
- `InvitationRepository.java` stores `joinPath = "/join/" + token`
- `InvitationTokens.next()` returns `HexFormat.of().formatHex(new byte[16])`
  = 32-char lowercase hex (the hard rule behind G1 C3)
- The frontend uses hash routing, so the browser URL is
  `<origin>/#/join/<token>`, and any QR printed by `InvitationPanel.jsx` must
  carry the same fragment-form URL.

Baseline conflict: `docs/knowledge/architecture/tech-stack-plan.md §5` lists
React Router 7.x, TanStack Query v5, and Ant Design 5.x, but none are actually
installed in `frontend/package.json` today (only `react`, `react-dom`,
`qrcode`). Existing pages (`Join.jsx`, `MainPlan.tsx`, `InvitationPanel.jsx`)
use custom hash routing and direct `fetch`. **US-067 follows the as-shipped
pattern, not the aspirational stack plan.** Recorded here per the "do not
deviate silently" rule.

## Goals / Non-Goals

**Goals:**
- Ship a `Scanner.tsx` page reachable at `#/scan` implementing the 10
  invitations scenarios I-1..I-10.
- Extend the app-shell full-screen classification to cover `#/scan` per S-1..S-5.
- Extract `parseJoinHash(text, appOrigin)` into a testable module used by both
  camera and image and manual-link paths (single source of truth for C3).
- Preserve all REQ-004 Join-page behavior — the scanner hands off and stops.
- Move `jsqr` from devDependency to dependency.

**Non-Goals:**
- No backend, DB, migration, or API endpoint change.
- No US-066 login or session handling; scanner does not know whether the user
  is signed in.
- No unit-test harness introduction (Vitest/Playwright). The URL matcher is
  exercised through E2E manual runs.
- No QR *generation* — that already exists in `InvitationPanel.jsx`.

## Decisions

### D1 — Scanner lives at `#/scan` as a full-page flow, not a modal

**Choice**: register `#/scan` in `parseRoute` before the generic `/trips/<id>`
regex and render it in a dedicated `if (route.page === 'scan')` branch in
`App.tsx`, alongside the existing `join` / `main-plan` / `main-plan-inputs`
branches, **outside** the shell column and `TabBar`. `ScaffoldBar` remains
visible per S-4 (identity scaffold requirement).

**Why**:
- Matches app-shell spec MODIFIED requirement verbatim: "SHALL render outside
  the shell column without the bottom dock, SHALL keep the identity scaffold
  bar visible".
- Reuses the existing full-page pattern (Join, MainPlan) → same structural
  code shape, no new component tree.
- Deep-linkable (E2E can open it directly). Reachable from the dashboard via a
  `#/scan` entry button in the Home `我的行程` appbar (AC S1–S2, landed in this
  change).

**Alternatives**:
- Modal over Home → contradicts S-4 (no dock tab highlighted) and S-5 (close
  restores originating route). Rejected.
- React Router nested layout → not installed, and migration is out of scope.

### D2 — Route + type changes

- `types.ts`: add `| { page: 'scan'; from: string | null }` to `Route`. Update
  `InAppPage` union to also `Exclude<'scan', ...>` so `TAB_FOR_PAGE` keeps
  compiling (record-typed lookup for shell pages only).
- `App.tsx` `parseRoute` returns `{page:'scan', from: readFromHistory()}` where
  `from` is the previous in-app hash captured before navigation, or `null` if
  none exists (S-5 fallback → `#/`).

**Why**: `from` is a scanner-owned piece of state that must survive the
`pushState` boundary; storing it in `Route` (rather than a module-level variable)
keeps the "close returns to origin" logic in one place and unit-testable later.

**Alternative**: rely on `window.history.back()` — fails if the user landed
directly on `#/scan` (no history), and does not restore a hash change pushed by
an external link. Rejected.

### D3 — Single matcher: `parseJoinHash(text, appOrigin)` in `src/scan.ts`

```
parseJoinHash(text: string, appOrigin: string):
  { ok: true; token: string } | { ok: false; reason: 'no-hash-form' | 'bad-token' | 'cross-origin' }
```

Rules locked by G1 C3:
1. Try `new URL(text, appOrigin)` — invalid URL → `no-hash-form`.
2. If `url.origin !== appOrigin` **and** the input was an absolute URL with a
   different host → `cross-origin` (I-9).
3. Read `url.hash`, require it to start with `#/join/` → else `no-hash-form`.
4. Extract the segment after `#/join/`, require `^[0-9a-f]{32}$` → else
   `bad-token` (I-5, I-8 reject).
5. Return `{ok:true, token}`.

Relative (`/x`) and hash-only (`#/join/abc…`) inputs go through `new URL(text,
appOrigin)` successfully and are treated as same-origin, matching "always
accepted" in C3.

**Why one function**: the same rules must apply to camera-decoded text,
image-decoded text, and manual link input. Duplicating the regex risks drift;
G1 C3 was signed against one matching face.

**Alternative**: separate handlers per input source → three places to keep in
sync; rejected.

### D4 — Camera lifecycle via a `useCamera(active: boolean)` hook

- `active=false` → no `getUserMedia` request (I-1).
- `active=true` → request `video: {facingMode: 'environment'}` and store the
  `MediaStream` in a ref.
- Effect cleanup (`return () => stream.getTracks().forEach(t => t.stop())`)
  fires when `active` flips to false **and** on component unmount, so closing
  the scanner via any path releases the camera (I-2).

**Why a hook, not imperative**: React StrictMode runs effects twice in dev;
the cleanup form is idempotent and survives the double-invoke. Manual stop()
would leak the second stream.

### D5 — Frame decoding loop with `requestAnimationFrame`

- Feed the `<video>` element into `<canvas>` each frame; call
  `jsQR(imageData.data, w, h)`.
- On `code && code.data` non-null → run through `parseJoinHash`; success →
  navigate to `#/join/<token>`, else show a transient "unrecognized" chip and
  continue scanning for a configurable cool-down (e.g. 1s) to avoid log spam.
- On null → next frame.

**Why continue after unrelated QR**: spec I-5 says "rejected" but does not
require exiting the scanner; users often scan a wrong code first.

### D6 — Image-file decode reuses the same matcher

- `<input type="file" accept="image/*">` → `FileReader` → `createImageBitmap`
  → off-screen canvas → `jsQR`. Same matcher path.
- Result handling identical to camera (route on match, error chip otherwise).
- File handle and bitmap are released after decode (no leak).

### D7 — Error recovery + manual-link fallback rendered in the same page

- One state machine: `kind: 'idle' | 'scanning' | 'camera-error' |
  'decode-error'`. The link input + `预览邀请` button is always visible so I-6
  (retry + fallback) does not require a mode switch.
- `camera-error` covers denial, hardware missing, and `getUserMedia`
  exceptions; retry re-invokes the hook (flip `active` off and on).

### D8 — UI tokens (design basis per G1 C5)

- `app.css` classes reused: `.screen`, `.appbar`, `.body`, `.card`, `.btn
  .primary/.secondary`, `.pill.warn`. New classes limited to
  `.scanner-preview`, `.scanner-link`, `.scanner-error` (all in `app.css`).
- Ant Design is not installed → "Ant Design interaction patterns" is honored at
  the level of primary/secondary button placement, full-width form fields, and
  inline error chip. Recorded so G2 reviewer does not expect a real AntD import.

### D9 — jsqr dependency move

`frontend/package.json`: cut `"jsqr": "^1.4.0"` from `devDependencies`, paste
into `dependencies`. No version bump.

**Why**: scanner is a production runtime consumer of jsqr. Leaving it as
devDep breaks `npm ci --production`.

### D10 — Merge order with `US-066-log-in`

Per G1 residual note: `US-066-log-in` archives first; US-067 rebases and
re-runs its E2E (I-3/I-4/S-5 close paths through the Join page) against the
session-based Join page. Until then, scanner relies on the existing scaffold
`X-User-Id` path unchanged. This is a plan-time constraint on PR sequencing,
not a code feature flag.

## Risks / Trade-offs

- **[Camera on desktop CI] headless CI cannot grant `getUserMedia`** → E2E
  camera scenarios are marked Partial with a human Waiver in
  `/sdd:local-verify-report`; manual-link path (I-8) is the automated-equivalent
  happy-flow proof.
- **[jsQR CPU cost in preview loop] continuous full-frame decoding can spike
  CPU on low-end devices** → downscale the video into the canvas (e.g.
  320×240) before decoding; documented as an implementation note, no AC depends
  on frame rate.
- **[Cross-origin matcher over-rejection] a QR produced by a future
  multi-domain deployment** → G1 C3 explicitly locks same-origin for MVP; a
  later ADDED requirement can widen the allow-list without breaking the token
  grammar.
- **[Route `from` capture edge case: hard refresh on `#/scan`] `from` becomes
  `null`** → covered by S-5 fallback clause (return to `#/`).
- **[AntD tokens not actually installed]** D8 acknowledges the naming gap; a
  reviewer expecting an `import { Button } from 'antd'` will find custom CSS
  classes doing the same job. Not a defect, just documented drift.

## Migration Plan

Not applicable — frontend-only, no database or API contract changes. Rollback
= revert the frontend commit; the backend `InvitationApiTest` remains green
either way.

## D11 - Close target and member direct-notice (2026-11-17 user revisions)

Supersedes D2's restore-origin close and extends the scan→join hand-off:

- **Close = home.** The scanner app-bar × always sets `#/` (dashboard). The
  `from` prop, `Route` scan `from` field and App `lastNonScanHash` tracker are
  removed as obsolete. User ruling: closing the scanner returns to the home
  page regardless of origin.
- **Member direct-notice.** `GET /api/invitations/{token}` preview additively
  carries `tripId` and `viewerMember` (computed for the signed-in viewer only;
  guests get `viewerMember=false`). The Join page renders the already-in-team
  notice directly for signed-in members (no preview/accept surface); the
  organizer variant uses creator wording. Re-accepting after a fresh join shows
  the same notice. Non-members/guests keep the existing preview+accept flow.
- **SQLite single-connection pitfall.** The membership probe must run after
  the preview query releases its connection; nesting `trips.isMember` inside
  the RowMapper deadlocks the pool (30s CannotGetJdbcConnection).
- Verification: backend 364/364 (incl. `memberPreviewReportsViewerMember`),
  frontend build green; ×-home browser-verified; member notice user-manual
  verified; organizer wording build-green pending user re-check.

## Open Questions

*(none — remaining unknowns are implementation-level and will be settled in
`/sdd:atdd-apply`: exact canvas downscale dimensions, error-chip cool-down
duration, retry-count cap on camera failure.)*
