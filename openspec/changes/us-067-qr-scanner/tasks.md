# Tasks

Fail-first slices. Every implementation group carries its own observable
verification per the acceptance scenario it turns green (see `atdd-design.md`
§1 for the I-* / S-* index). Do not reorder before the E2E checklist in group 1
exists.

## 1. Fail-first E2E checklist + fixture prep

- [x] 1.1 Author `docs/feedback/e2e-us-067.md` with 15 rows (I-1..I-10 +
      S-1..S-5), each listing browser steps, expected observable, screenshot
      filename slot, and initial status `FAIL`; verify the file exists and
      enumerates exactly 15 rows (open the file and count).
- [x] 1.2 Add a `## §US-067 scanner payloads` section to
      `requirement-workspace/acceptance-test-fixtures.md` with the six new
      fixture payloads (unrelated plain URL, cross-origin `#/join/<hex>`,
      absolute same-origin `#/join/<hex>`, hash-only `#/join/<hex>`, wrong
      length token, uppercase/non-hex token) alongside the reused REQ-004
      open/revoked/closed/already-joined invitation tokens; verify each of the
      six new payloads appears verbatim.
- [x] 1.3 Confirm `InvitationApiTest` is green on the current `main`-based
      branch as the pre-change baseline, so any regression in group 9 is
      attributable to this change; verify `mvn test` (wrapper 3.9.16 path)
      reports BUILD SUCCESS before touching frontend code.

## 2. Dependency + type/route scaffolding

- [x] 2.1 Move `jsqr` from `devDependencies` to `dependencies` in
      `frontend/package.json` (no version change); verify `npm ci && npm
      run build` (tsc) succeeds on the branch.
- [x] 2.2 Extend the `Route` union in `frontend/src/types.ts` with
      `{ page: 'scan'; from: string | null }` and update the `InAppPage`
      `Exclude<…>` list to also drop `'scan'`; verify `tsc --noEmit` reports
      no error on the `TAB_FOR_PAGE` Record (scan does not need a TabId).
- [x] 2.3 Add `scan` and `camera` icon components to `frontend/src/Icons.tsx`
      following the existing `Icon` switch pattern; verify a temporary render
      (`<Icon name="scan" /> <Icon name="camera" />`) shows two distinct SVGs
      and the file typechecks.

## 3. Matcher module (single source of truth for G1 C3)

- [x] 3.1 Implement `parseJoinHash(text, appOrigin)` in
      `frontend/src/scan.ts` with the 5-step algorithm from design D3,
      returning `{ok:true, token}` or `{ok:false, reason}`; verify the module
      compiles and a small `node --experimental-vm-modules` script executed
      against the 6 fixture payloads from 1.2 yields the expected
      accept/reject outcomes (open-invitation absolute, open-invitation
      hash-only, unrelated, cross-origin, wrong-length, uppercase).
- [x] 3.2 Document the matcher's contract at the top of `scan.ts` (32-char
      lowercase hex, same-origin rule) so future readers know it is the
      C3-signed authority; verify by reading the file header.

## 4. Scanner UI surface (idle state, no camera yet)

- [x] 4.1 Create `frontend/src/pages/Scanner.tsx` skeleton showing the five
      named surfaces from I-10: app bar with 扫码加入行程 title + close
      control, camera preview placeholder, 开始扫描 primary, 从相册选择
      secondary, invitation-link input + 预览邀请 action; render in
      `idle` state without any `getUserMedia` call. Verify opening
      `#/scan` in the browser shows all five surfaces and no permission
      dialog appears (screenshot `s4-1-scanner-idle.png`).
- [x] 4.2 Register `#/scan` in `frontend/src/App.tsx parseRoute` **before**
      the generic `/trips/<id>` regex, returning `{page:'scan', from:
      previousHash}`; add a `route.page === 'scan'` rendering branch outside
      the shell column and TabBar, keeping ScaffoldBar visible. Verify S-4
      (no bottom dock, identity bar present) and S-5 (close restores origin,
      no history falls back to `#/`) with a browser walkthrough and
      screenshots `s4-2-scanner-fullscreen.png`,
      `s4-2-scanner-close-restores.png`.

## 5. Camera lifecycle + rAF decode loop

- [x] 5.1 Implement `useCamera(active: boolean)` hook inside `Scanner.tsx`
      (or a co-located module) that only calls `getUserMedia` when
      `active` flips true and stops all tracks in the effect cleanup; wire
      the 开始扫描 button to flip it. Verify I-1 (permission still not
      requested after opening the page) and I-2 (DevTools "camera in use"
      indicator disappears after closing) with screenshots
      `s5-1-camera-idle.png`, `s5-1-camera-active.png`,
      `s5-1-camera-released.png`.
- [x] 5.2 Add a `requestAnimationFrame` loop that draws the video into a
      downscaled canvas, calls `jsQR`, pipes `code.data` through
      `parseJoinHash`, and on `{ok:true}` navigates to `#/join/<token>`.
      Verify I-3 (valid fixture QR routes to Join page and no `POST
      /api/invitations/…/accept` fires from the scanner alone — confirm via
      DevTools Network) and I-5 (unrelated QR shows the "unrecognized" chip
      and stays on the scanner) with screenshots `s5-2-valid.png`,
      `s5-2-unrecognized.png`.

## 6. Image-file decode path

- [x] 6.1 Add `<input type="file" accept="image/*">` behind the 从相册选择
      action; on change, read via `FileReader` → `createImageBitmap` →
      off-screen canvas → `jsQR` → same `parseJoinHash`. Release the bitmap
      and revoke the object URL after decode. Verify I-7 by loading the
      same valid fixture QR as a JPEG/PNG file and observing the same
      navigation and no extra API call; screenshot `s6-1-image-decode.png`.

## 7. Manual link fallback + camera-error recovery

- [x] 7.1 Wire the 预览邀请 button to call `parseJoinHash(inputValue,
      window.location.origin)` and, on `{ok:true}`, set `location.hash` to
      `#/join/<token>`; on reject, show the "unrecognized" chip. Verify I-8
      accept path (hash-only payload from 1.2) and reject path (both
      malformed-token payloads from 1.2) via three browser inputs, capturing
      screenshots `s7-1-link-accept.png`, `s7-1-link-reject-length.png`,
      `s7-1-link-reject-hex.png`.
- [x] 7.2 Wire the cross-origin fixture payload from 1.2 through the same
      matcher and verify I-9: pasting `https://another-host.example/#/join/
      <valid-hex>` is rejected and no navigation to the foreign origin
      occurs; screenshot `s7-2-cross-origin.png`.
- [x] 7.3 Add a `kind:'camera-error'` state with a retry action shown when
      `getUserMedia` throws (permission denied, NotFoundError, NotReadableError,
      or a decode failure path). Verify I-6 by denying camera in Chrome
      site settings and confirming the error panel + link input are both
      visible and the retry re-prompts; screenshot `s7-3-camera-error.png`.

## 8. Style tokens + design-basis layout (G1 C5)

- [x] 8.1 Add `.scanner-preview`, `.scanner-link`, `.scanner-error` classes
      to `frontend/src/app.css` reusing existing `.screen`, `.appbar`,
      `.card`, `.btn .primary/.secondary`, `.pill.warn`; no new color or
      spacing tokens. Verify by inspecting the rendered `#/scan` at 390×844
      and desktop widths: layout stays inside the mobile-first column, no
      dock, and controls match Ant Design visual conventions per I-10;
      screenshot `s8-1-scanner-styled.png`.
- [x] 8.2 Add the dashboard scan entry (AC S1–S2, brought in from the deferred
      follow-up story): an `.iconbtn` button (`scan` icon, `aria-label`
      "扫码加入行程") to the right of the `我的行程` title in the Home appbar
      (`frontend/src/pages/Home.tsx`), linking to `#/scan`. Verify the button
      renders in the appbar and opens the full-screen scanner, then closing
      returns to `#/`.

## 9. Integration checks (span multiple groups)

- [x] 9.1 Re-run the full E2E checklist from 1.1 across the fifteen rows,
      setting each to Pass / Partial (reason) / Fail; verify no row remains
      FAIL and camera-dependent rows on headless CI are marked Partial with
      the reason recorded in `docs/feedback/e2e-us-067.md`.
- [x] 9.2 Run `mvn test` (Maven 3.9.16 wrapper path per known-good baseline)
      and confirm the full suite (including `InvitationApiTest`) is green,
      proving S-3 "existing contracts unchanged" and the reverse-case
      "no backend change"; verify the run log ends with `BUILD SUCCESS` and
      `Tests run: 90, Failures: 0, Errors: 0`.
- [x] 9.3 Run `cd frontend && npm ci && npm run build` and confirm
      TypeScript compilation + Vite bundle succeed with the jsqr production
      dependency in place; verify `dist/` output is produced and no
      "Cannot find module 'jsqr'" appears.
- [x] 9.4 Regression sweep: manually open `#/`, `#/trips`, `#/trips/<id>`,
      `#/create`, `#/split`, `#/members`, `#/join/<token>` and confirm the
      shell + dock + identity bar look and behave exactly as before the
      scanner change (S-1, S-2, S-3); screenshot at least one representative
      dock-bearing route as `s9-4-shell-unchanged.png`.

## 10. Reconcile architecture baseline (pre-archive)

- [x] 10.1 Update `docs/knowledge/architecture/tech-stack-plan.md` §5/§7 to
      reflect what actually shipped for US-067: hash routing (no React
      Router), custom fetch (no TanStack Query), CSS-token styling (no Ant
      Design import), jsqr promoted to production dependency. Only sync
      facts already archived, not planned work.
- [x] 10.2 Append a one-row entry to `docs/knowledge/_LOG.md` for the
      US-067 stack-plan reconciliation with the date and change id.

## Workflow follow-up

- Push `US-067-invitation-planning` and open a PR into `main`; the PR is the
  G2 input.
- Run `/sdd:local-verify-report`, then `/sdd:g2-decision-record` (VL Elian
  Jiang) after remote CI green.
- After US-066-log-in archives, rebase and re-run group 9 E2E against the
  session-based Join page (G1 residual note).
- AC S1–S2 (dashboard scan entry) landed in this change (Home appbar `#/scan`
  button); no separate follow-up UI-integration story is needed.
- `/sdd:g3-decision-record` (SA Lumi) then `/sdd:living-merge` and
  `/sdd:change-summary`.
