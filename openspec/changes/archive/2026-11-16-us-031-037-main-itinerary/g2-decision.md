# G2 decision — us-031-037-main-itinerary

- **Gate:** G2 (Verify)
- **Decision:** **Pass**
- **Approvers:** VL = **Elian Jiang** (verbal Pass conveyed by the user on
  2026-11-16; recorded here on the VL's behalf — not agent self-approval)
- **Timestamp:** 2026-11-16 (+0800)
- **Change id:** `us-031-037-main-itinerary`
- **Target:** PR #37 (base `main`), head `ed0a487`, mergeState `CLEAN`

## Inputs

- **local-verify:** `docs/ai4se-plugins/20261116-004329-local-verify-report.md`
  (Overall **Partial** — the two Partial drivers were "remote CI not yet run
  for this change" and "E3 human sign-off pending"; both are closed below).
  Checkpoints: `20261116-003126-local-verify-report-checkpoints.md`.
- **pipeline ci:** `docs/ai4se-plugins/20261116-114859-pipeline-report.md`
  — run `43800553019` (and `43799584379`) green: **Backend tests pass**,
  **Frontend build pass**; **E1 = 全绿** on head `ed0a487`. First two attempts
  failed only at `actions/checkout` (transient `Repository not found`), cleared
  by re-run; no source change between attempts.
- **pipeline cd:** n/a — no deploy before merge (apply lane, separate
  authorization).

## Scope note (post-local-verify integration)

After `20261116-004329` was authored, `origin/main` advanced with the US-064
frontend shell (TS `App.tsx`/`api.ts`/`types.ts`). This change was merged onto
that base (`2bc8ed1`) and its two screens converged onto main's shared
`api<T>()`; the temporary shims (`App.jsx`, `api.js`, `api.d.ts`,
`types/apiResult.ts`/`typed()`) were removed and Screen 9/10 wired as
join-style full-page routes. The merged head was re-verified before this gate:
`npm ci` green, `tsc -b && vite build` green, backend `mvn test` **90/90**, and
remote CI green on `ed0a487`. So E1 reflects the merged state, not a stale one.

## Dimension results

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Build | Pass | local `tsc -b && vite build` + CI Frontend build |
| Static scan / tests | Pass | `mvn test` 90/90; CI Backend tests |
| Code review | Pass | local-verify §Code-review highlights |
| Evidence (OpenSpec) | Pass | V1–V8 Pass in local-verify; E1 now closed by CI |
| CI (phase=ci) | Pass | E1 全绿 on head `ed0a487` |
| CD (phase=cd) | n/a | not exercised pre-merge |
| **Overall** | **Pass** | all required inputs present and green |

## Defect grades

- **CRITICAL:** none.
- **WARNING (non-blocking, recorded observations):**
  1. ST-1 loading-skeleton screenshot not capturable locally — code branch +
     observed transition + failure-state proof stand in as evidence.
  2. Fake provider + read-only preference stand-in — declared non-goals until
     REQ-019 merges (G1 C2 ruling; merge order V4 first; F1 write-sync
     alignment is a non-gating follow-up).
  3. Corrupted stored-preference payload fails fast with 500 — REQ-019 owns
     preference-write validation; kept intentionally.
- **SUGGESTION:** Mockito self-attach warning; misnamed `st1-loading.png`;
  three E2E rows without screenshots (tool timeouts) covered by SQL/matrix
  cross-evidence.

None of these are new defects introduced by this change; all were disclosed in
the local-verify report and fall within approved scope or a later change.

## Waivers / conditions

None required — Overall is Pass, not Fail. No agent-approved waiver.

## Residual carried to P5 / G3

- Merge order: REQ-019 V4 first; execute F1 write-sync alignment before/at that
  merge (`g1-decision.md`).
- Living Spec merge + archive + G3 (SA = Lumi) are the next lane, gated on the
  human merge of PR #37.

## Next

- G2 Pass → merge PR #37 (by humans/IO per repo rule; agent does not merge) →
  P5: `/sdd:living-merge` archive → `/sdd:change-summary` → `/sdd:g3-decision-record`
  (SA Lumi) → `/sdd:evolve`.
