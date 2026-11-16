# ATDD design — us-067-qr-scanner

Change: `openspec/changes/us-067-qr-scanner/` · Gate: post-G1 Pass ·
Author: `/sdd:atdd-design` (P3) · Timestamp: 2026-11-16

Inputs: `proposal.md`; `specs/invitations/spec.md` (1 ADDED, 10 scenarios);
`specs/app-shell/spec.md` (1 MODIFIED, 5 scenarios); `dov-ac-review.md`;
`g1-decision.md` (Pass with C2–C5 closed).

## 1. ATDD layers in scope

**Layers actually exercised**: **E2E** (browser acceptance). **API** layer is
**regression-only** (existing `InvitationApiTest` covers REQ-004 preview/accept
endpoints that US-067 reuses without change). **UT** is not planned here —
`/sdd:atdd-apply` owns unit-level TDD if the frontend team later adopts a UT
harness. Current frontend has no test framework installed.

### Scenario → layer inference

| # | Scenario (source) | Layer | Rationale |
|---|---|---|---|
| I-1 | Camera deferred until start (invitations) | **E2E** | UI interaction; observable absence of permission dialog |
| I-2 | Camera released on close/nav (invitations) | **E2E** | Browser camera indicator; multi-surface (scanner → back) |
| I-3 | Valid QR routes to preview/accept (invitations) | **E2E** | Cross-screen user path (scan → Join) |
| I-4 | Invalid/revoked/closed follows existing (invitations) | **E2E** | Reuses Join page outcomes; observable text + no trip data |
| I-5 | Unrelated QR rejected without nav (invitations) | **E2E** | Asserts **no nav + no API call**; requires network-trace evidence |
| I-6 | Camera unavailable retry + fallback (invitations) | **E2E** | Browser permission denial; recoverable UI state |
| I-7 | Image-file QR same validation (invitations) | **E2E** | File-picker interaction; decoded result |
| I-8 | Manual link routes after validation (invitations) | **E2E** | Form input + navigation outcome |
| I-9 | Cross-origin link rejected (invitations) | **E2E** | URL parsing edge case; asserts no external navigation |
| I-10 | Scanner follows design basis (invitations) | **E2E** | Layout/visual assertion via screenshot |
| S-1 | In-app route renders inside frame (app-shell) | **E2E** | Existing behavior; regression only |
| S-2 | Identity switcher scaffold (app-shell) | **E2E** | Existing behavior; regression only |
| S-3 | Existing contracts unchanged (app-shell) | **E2E + API regression** | `InvitationApiTest` re-run proves backend untouched |
| S-4 | Scanner renders full-screen without dock (app-shell) | **E2E** | Visual assertion |
| S-5 | Closing scanner restores origin (app-shell) | **E2E** | Navigation-state assertion |

**Deferred to `/sdd:atdd-apply` (unit-level TDD, if UT harness is added)**:
`matchesInvitationJoinHash(text, appOrigin) → {ok: true, token} | {ok: false,
reason}` — pure function covering scenarios I-3, I-5, I-8, I-9 matching rules.
No UT suite is planned in this doc.

**Recommended extras** (advisory, non-gate):
- **Compatibility**: iOS Safari / Android Chrome / desktop browser camera
  support varies. Add cross-browser smoke note to the E2E checklist (not a Gate).

## 2. What is written before production code (red-first)

E2E acceptance is manually executed and recorded as a checklist before feature
code — same pattern as US-031-037:

- `docs/feedback/e2e-us-067.md` — 15-row checklist (10 invitations + 5
  app-shell), each row: scenario id, browser steps, expected observable,
  placeholder for screenshot path, initial status **FAIL** (scanner does not
  exist yet).
- Fixture QR images (or pre-burned link strings) for the four matching-face
  cases in I-3 / I-5 / I-8 / I-9, listed in §4.
- Regression checklist rows for the untouched flows (Join page under each
  existing invitation state) so a passing run proves the change did not
  perturb REQ-004.

No API test code is written first — `InvitationApiTest` already exists and must
remain green.

## 3. Local vs CI gate expectations

| Gate | Tool | When | Pass condition |
|---|---|---|---|
| **Local build** | `npm ci && npm run build` (frontend) | Every commit | tsc build success; no type errors |
| **Local backend regression** | `mvn test` (Maven 3.9.16 wrapper path) | Every PR | `InvitationApiTest` (and full suite) green — proves no backend impact |
| **Manual E2E run** | Chrome (desktop) + a camera-capable device OR emulated `getUserMedia` | Before PR | All 15 E2E rows observed; screenshots captured into `frontend/logs/` (gitignored, referenced by filename in checklist) |
| **CI** | Existing GitHub Actions `ci.yml` | On PR | Existing checks remain green (no new CI product introduced) |

No new pipeline gate is defined here. Any Waiver for camera-dependent E2E rows
on headless CI is a human sign-off at `/sdd:local-verify-report`.

## 4. Data / fixtures strategy

**Reuse REQ-004 fixtures** from
`requirement-workspace/acceptance-test-fixtures.md`:

| Purpose | Fixture | Coverage |
|---|---|---|
| Valid invitation token (open, joins) | REQ-004 seed trip + open invitation | I-3 (camera), I-7 (image), I-8 (manual link) |
| Revoked / closed invitation | REQ-004 J2 / J4 fixtures | I-4 |
| Already-joined member | REQ-004 J3 / J6 fixtures | Regression on Join page after scanner hand-off |
| Unrelated QR payload | **new minor fixture**: text = `https://example.com/foo`, arbitrary string, plain URL without hash form | I-5 |
| Cross-origin payload | **new minor fixture**: text = `https://another-host.example/#/join/<valid-hex-token>` | I-9 |
| Absolute same-origin payload | **new minor fixture**: text = `<current-app-origin>/#/join/<valid-hex-token>` (accepted) | I-3 variant |
| Relative / hash-only payload | **new minor fixture**: text = `#/join/<valid-hex-token>` (accepted) | I-3 variant |
| Malformed token (wrong length, uppercase hex, non-hex) | **new minor fixture set** | I-5, I-8 rejection |

**Token format reminder (locked by C3):** 32-character lowercase hexadecimal,
matching backend `InvitationTokens.next()` = `HexFormat.of().formatHex(new
byte[16])`. Fixtures must use exactly this shape to prove the matcher is
strict.

**Camera / file-picker mocking**: E2E runs are performed on a real device or a
desktop browser with a pre-recorded video / virtual camera (e.g. OBS
Virtual Camera) showing the fixture QR. If not available, fall back to
**manual link input path** (I-8) for the primary happy-flow evidence and record
camera scenarios as **Partial** with reason — do not fake a Pass.

**Cleanup**: no database state changes; scanner is stateless. Fixtures are
read-only against the seed DB.

## 5. Non-goals (with reverse verification)

| Non-goal | Reverse E2E assertion |
|---|---|
| US-067 does **not** implement US-066 login retention | Sign in with a scaffold user before scanning, verify no session-persistence change; AC S9 is explicitly out of scope in `proposal.md`. |
| US-067 does **not** add a scan icon to the "i" control or Home dock | Inspect `#/` and `#/trips` DOM: no new scan button rendered; AC S1–S2 are explicitly out of scope. |
| US-067 does **not** modify any backend endpoint | `git diff` on `backend/` = empty; `InvitationApiTest` remains green (S-3). |
| US-067 does **not** auto-create membership from scanning alone | Scan a valid open-invitation QR, then check `trip_member` table via backend response: no new row until accept POST completes (I-3 second clause). |
| US-067 does **not** navigate to arbitrary URLs on unrelated QR | Attempt to scan an `https://evil.example/` QR; assert address bar remains on the app and no network request to `evil.example` in DevTools (I-5). |
| US-067 does **not** require a new backend migration or DB change | Flyway migrations unchanged; no `V*.sql` diff. |

## 6. Explicit skill non-goals

- No Playwright / POM / Excel generator authored here.
- No unit-test suite designed (URL matcher pure function listed as Defer UT only).
- No new CI product; existing `ci.yml` reused.
- No gate decision (G2/G3) recorded here.

## 7. NFR tests

**Asked**: user has not requested NFR (performance, observability, resilience)
tests for this change.

**Decision**: **Deferred / out of scope**. Rationale: scanner is a frontend-only
feature with no new backend endpoint, no durable state, and no SLA defined in
the requirement entry. Camera latency and memory footprint are non-functional
concerns but not covered by AC.

## Next

`/sdd:task-plan` — render `design.md` (D1–Dn decisions) and `tasks.md`
(failing-evidence-first slices mapped to I-1…I-10 and S-1…S-5).
