# US-067 AC / DoV review (delta-craft)

Reviewer: sdd-delta-craft (P2), 2026-11-16 · change: us-067-qr-scanner ·
delta: specs/invitations/spec.md · evidence: US-067.md, impact-brief.md §US-067,
acceptance-test-fixtures.md REQ-004

## Acceptance criteria (AC)

| # | Item | Result | Evidence | Notes |
|---|------|--------|----------|-------|
| AC-1 | Each requirement has ≥1 testable AC | **Pass** | spec.md: 1 requirement, 8 scenarios covering S3–S8 + image/manual-link paths | |
| AC-2 | ACs are observable | **Pass** | "camera permission not requested" (browser dialog), "tracks stopped" (camera indicator off), "navigation to #/join/<token>" (URL bar), "no API call" (network tab) | No vague words |
| AC-3 | Negative/edge cases | **Pass** | Unrelated QR rejected, invalid/revoked invitation, camera denied, unreadable code, manual link non-matching | |
| AC-4 | ACs not disguised impl detail | **Pass** | "jsqr" in proposal What Changes is capability description; spec says "decodes QR codes" (observable), not library name | |

## Definition of Verified (DoV)

| # | Item | Result | Evidence | Notes |
|---|------|--------|----------|-------|
| DoV-1 | Scope matches proposal | **Pass** | proposal: frontend-only scanner; spec: 8 frontend behavior scenarios. No backend/DB/API scope leaked | |
| DoV-2 | Ambiguities listed or resolved | **Pass** | OQ-4 (jsqr vs BarcodeDetector) non-blocking → P3 design; OQ-5 (image path) resolved by S11 user confirmation + scenario 7 | |
| DoV-3 | Role concerns noted | **Pass** | IO: `/join/<token>` regex is the security boundary for QR rejection (business-critical); SA: camera lifecycle is standard browser API, low risk | |
| DoV-4 | No code claimed as done | **Pass** | Review only | |
| DoV-5 | Requirements trace to proposal/req | **Pass** | 8 scenarios trace to: S3 (AC-1 deferred camera), S4 (released), S5 (valid QR→preview), S6 (invalid→existing rules), S7 (unrelated→rejected), S8 (unavailable→recovery+fallback), S11 (image), and AC-11/R-1 (manual link) | |

## Fixture alignment check

REQ-004 acceptance-test-fixtures.md defines: token opaque, joinPath
`/join/<token>`, preview/accept API behavior matrix. US-067 spec uses the same
`/join/<token>` pattern and explicitly routes to the existing Join page.
**No conflicts** — scanner introduces no new fixture data; existing invitation
fixtures (valid/revoked/closed/open tokens) serve as scanner test inputs directly.

## Traceability to source AC (US-067.md 11 scenarios)

| US-067 AC scenario | Spec coverage | Status |
|---|---|---|
| S1–S2 (icon placement) | Deferred OQ-3 | ✅ deferred, noted in proposal |
| S3 (camera not requested until start) | Scenario 1: Camera deferred | ✅ |
| S4 (camera released on close) | Scenario 2: Camera released | ✅ |
| S5 (valid QR → preview + accept) | Scenario 3: Valid QR routes | ✅ |
| S6 (invalid → existing rules) | Scenario 4: Invalid follows rules | ✅ |
| S7 (unrelated → rejected) | Scenario 5: Unrelated rejected | ✅ |
| S8 (recoverable + fallback) | Scenario 6: Camera unavailable | ✅ |
| S9 (login retention) | Deferred OQ-1 | ✅ deferred, noted |
| S10 (duplicate member) | Inherited: Join page's existing behavior (REQ-004 J3/J6) | ✅ no new spec needed |
| S11 (image QR same validation) | Scenario 7: Image-file decoding | ✅ |
| Manual link input fallback (new in craft) | Scenario 8: Manual link routes | ✅ |

## Residual concerns (IO/SA)

- **IO**: the `/join/<token>` pattern is the security boundary — P3 design
  should specify whether an absolute URL (e.g. `https://host/join/abc`) and a
  relative path (`/join/abc`) both match, or only one form.
- **SA**: OQ-4 (library choice) should be settled in P3 design; does not affect
  AC.

## Verdict

**All AC items: Pass. All DoV items: Pass.**
No blocking Fail/Partial. Change is **G1-ready**.
