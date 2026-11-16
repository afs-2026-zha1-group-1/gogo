# Change summary — us-064-mobile-app-shell

> Final summary. G1 Pass (IO Johnson + SA Elian Jiang), G2 Pass (VL lumi),
> merged to main cb7faa0 (PR #34 MERGED; direct merge per user instruction).
> This summary is not a gate decision and not Living Spec authority.

## Intent

Give the whole product one phone-style frame: every in-app route inside a
centered ≤430 px / 100 dvh shell with a persistent four-tab bottom dock
(仪表盘 / 行程 / 分队 / 成员), existing surfaces placed unchanged, honest
placeholders for future areas, and invited guests joining without in-app
navigation. Covers US-064 (issue #32) of Iteration 0.

## What shipped

- **Capability `app-shell`** (new in Living Spec) with six requirements:
  mobile shell frame; bottom dock navigation; dashboard tab placement; trips
  tab placement + no-trip empty state; placeholder tabs; guest join exclusion.
- **Frontend:** `App.tsx` shell composition + extended hash route table
  (`#/trips`, `#/split`, `#/members`) + session-only last-trip memory (D3);
  `TabBar.tsx` four-tab dock with active highlight and safe-area padding;
  `TripsEmpty.tsx` (创建行程 + 按编号打开行程, numeric validation, unknown id →
  existing missing state); `Placeholder.tsx` (honest text + link back);
  `CreateTrip.tsx` back-target → 行程; dock glyphs in `Icons.tsx`; dock /
  empty-state styles from the existing token set.
- **TypeScript amendment (D10, user instruction):** US-064-scoped files
  converted to strict TS per US-065 conventions and the tech-stack plan
  (`types.ts` DTO-aligned, `tsconfig.json`, `tsc -b && vite build`,
  typescript 5.9.3 + @types devDeps). Remaining JS stays in US-065's scope.
- **Unchanged:** all backend endpoints, migrations (V1–V3), CI workflow,
  runtime dependencies, identity scaffold contract, create validation,
  trip-details permission, invitation panel and join flow behavior.
- **Docs:** verification doc, local-verify report (Overall Pass after G2),
  pipeline report + ci-report, registry/handoff rows, G1/G2 records.

## Verify highlights

- Red-first: structural red evidence before implementation; E2E list authored
  from the 20 delta-spec scenarios.
- Browser E2E 20/20 green incl. text-only forward/reverse tab walk (unique
  headings), back/forward history, identity header propagation (Alice 200 vs
  Eve 403), open-by-id three branches, create validation + back-target,
  join/unusable full-screen without dock; R19 short-column clearance.
- `mvn -B test` 31/31 (twice); whitelist 5/5; `npm run build` green.
- TS: `tsc -b` 0 errors, no any/@ts-ignore; bundle hash byte-identical to the
  pre-conversion build; post-conversion smoke walk identical.
- CI: runs 43697575941 (976620d) and 43698104374 (4897ac4) both jobs success.
  No fresh run on the TS head — user instructed direct merge without CI
  (2026-11-16); bundle-identical + local evidence cited in G2.
- Evidence: `docs/feedback/verification-req-005.md`,
  `docs/ai4se-plugins/20261115-165423-local-verify-report.md`,
  `docs/ai4se-plugins/20261115-170739-pipeline-report.md`.

## Residual risks / followups

- Pre-existing invitation first-issuance race (one 500 under StrictMode
  double-mount, REQ-004 backend): **followup — separate change proposed**
  (idempotent issuance); out of US-064 scope, backend untouched here.
- `X-User-Id` remains an unverified scaffold; never a security control.
- Real-device safe-area insets untestable on desktop; calc padding verified
  structurally + emulated short column.
- Remaining JS files (main.jsx, vite.config.js, Home/TripDetails/Join/
  InvitationPanel.jsx) belong to US-065 (assignee sammingoocl).
- KB update: Skipped (not configured) — teaching-baseline `kb-lint.sh` SKIP,
  documented in scripts/README.md; KB not validated.

## Links

- Archived change: `openspec/changes/archive/2026-11-16-us-064-mobile-app-shell/`
- Living Spec: `openspec/specs/app-shell/spec.md`
- Design/ATDD/tasks: `design.md` (D1–D10), `atdd-design.md`, `tasks.md`
- Gates: `g1-decision.md` (Pass), `g2-decision.md` (Pass), `g3-decision.md`
- Requirements: `requirement-workspace/requirements/REQ-005.md`