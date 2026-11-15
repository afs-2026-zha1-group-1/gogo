# Proposal

## Why

US-064 (issue #32, `Iteration 0`, `Priority - Must`, `Type - Trip Setup`) gives
the whole product one phone-style frame: every trip screen lives inside a
mobile-scaled shell with a persistent bottom dock, so a traveler moves between
the main areas without losing context or identity. REQ-001/003/004 delivered
the home, create, details and invitation surfaces as flat routes; without a
shell, each later story (members, split, dashboard aggregation) would re-frame
itself. The story adds only the shell and page placement and explicitly must
not change the existing contracts.

One frontend-only change keeps a single gate cycle and verifies the
"contracts unchanged" boundary once. The 2026-11-14 pick session fixed the
slug `req-005-mobile-app-shell` and branch `sdd-req-005-trip-setup`; the user
re-confirmed the single-change split on 2026-11-15.

## What Changes

- **ADDED** capability `app-shell` with six requirements:
  - "Mobile shell frame" — every in-app route renders inside a centered column
    at most 430 px wide, 100 dvh tall, with the bottom dock fixed below the
    scrolling content and safe-area padding, using the tokens and component
    language of `ui-design-reference` (already mirrored by `app.css`).
  - "Bottom dock navigation" — four tabs in order 仪表盘 / 行程 / 分队 / 成员,
    each icon + text label, visible active highlight, hash-route switching
    without full reload, selected identity preserved; browser back/forward
    follows tab history.
  - "Dashboard tab placement" — the existing home content (greeting status,
    create entry, identity scaffold) renders under the shell; `#/` remains the
    default route.
  - "Trips tab placement and no-trip empty state" — the existing details
    screen (hero, information rows, organizer invitation panel) renders under
    the shell; with no trip selected, a text empty state offers 创建行程 and
    按编号打开行程 without inventing data; `CreateTrip` is reachable from the
    shell with its back action returning to 行程.
  - "Placeholder tabs" — 分队 (`#/split`) and 成员 (`#/members`) show honest
    text placeholders stating the feature is not implemented yet, each linking
    back to 行程; no demo members, routes or statuses are fabricated.
  - "Guest join exclusion" — `#/join/<token>` (preview, accept, joined, closed)
    and the unusable state render full-screen without the dock; today's
    identity scaffold bar and join behavior are retained there.
- Frontend composition only: `App.jsx` gains the shell/dock and three route
  entries (no-trip 行程, `#/split`, `#/members`); new shell/dock component(s),
  empty-state page and two placeholder pages; dock and placeholder styles from
  the existing token set; `CreateTrip.jsx` back target moves from `#/` to 行程
  (story page-function table).
- Text-only verification surface: every tab page carries a unique visible
  heading or state for the story's forward/reverse switching check.

Unchanged: the `greeting`, `trips` and `invitations` capabilities and all their
endpoints; create validation, trip-details permission, invitation panel and
join flow behavior; the `X-User-Id` scaffold contract; the SQLite datasource;
the two-job CI workflow; the dev proxy. No backend, migration, database or new
dependency change of any kind.

No breaking change: existing routes keep their paths and behavior; the three
new route entries are additive; the create back-target change is placement,
not contract.

## Capabilities

### New Capabilities

- `app-shell`: the mobile frame, bottom dock navigation, tab-to-route placement
  of existing surfaces, honest placeholder tabs, and guest join exclusion.

### Modified Capabilities

None. `openspec/specs/` holds only `greeting`; `trips`/`invitations` exist as
pending deltas of the in-flight REQ-003/REQ-004 changes and are composed, not
modified. The create back-target edit is a placement change inside the shell's
own requirement, not a `trips` contract modification.

## Impact

- **Requirement**: REQ-005 (`requirement-workspace/requirements/REQ-005.md`),
  intent `requirement-workspace/intents/2026-11-14-req-005.md` (incl. P1
  continuation 2026-11-15), DoR `requirement-workspace/analysis/req-005-dor.md`,
  impact brief §23–29, deep-dive §REQ-005.
- **Stories**: issue #32 (US-064) in GitHub org repo; `Iteration 0`,
  `Priority - Must`; picked and card moved to Req Analysis on 2026-11-14.
- **Code**: `frontend/src/App.jsx` restructure; new shell/dock component(s);
  three new pages (no-trip empty state, 分队/成员 placeholders);
  `frontend/src/app.css` dock/placeholder styles; `CreateTrip.jsx:52` back
  target; `Icons.jsx` glyphs if missing (local inline SVG).
- **APIs / Data**: none added or changed; existing reads reused; `X-User-Id`
  unchanged.
- **Dependencies**: none new. Requires REQ-001/003/004 frontend code present
  (it is, on this branch). REQ-003 PR #30 and REQ-004 PR #31 are both merged
  (2026-11-15) — the stacking order is satisfied (R18 resolved).
- **CI**: unchanged; the frontend build job covers the change. Verification is
  browser-based (text-only tab walk + re-run of existing acceptance behavior).
- **Docs / harness**: `README.md`, verification documents, stage reports under
  `docs/ai4se-plugins/`. The knowledge base remains unconfigured.

## Effort and ordering

Small–medium. One vertical slice: shell frame + dock → route table extension →
page placement (home/details/create) → empty state + placeholders → join
exclusion check → text-only verification. No backend, no migration, no new
dependency. `/sdd:story-split` is Skipped: the story already exists as GitHub
issue #32.

The scenario count (11) would normally suggest considering 2–3 changes, but
every scenario shares the one shell frame: splitting frame from dock or
placements would produce halves that cannot render independently. One change,
one gate cycle (split-heuristics quality self-check: sub-goal user-perceivable,
E2E-verifiable via the tab walk, independently shippable, capability name new
and real, no dependency cycles).

## A0 deep-dive gate

`requirement-workspace/analysis/req-005-dor.md`: ⑨ data contract (route /
identity / tab-model grain, fields and transitions; no backend data), ⑩
boundary (eighteen branches including fallbacks, join exclusion and reverse
cases), ⑪ cross-REQ (greeting/trips/invitations composed not modified; identity
and hash router reused), ⑫ display contract (nine surfaces with fields,
recipients and channels) — all Pass → **A0 Pass**, split permitted.

## Known deviations carried into later stages

- OQ-1/OQ-2 (open-by-id widget; dock icon/token extraction) deferred to P3 by
  the 2026-11-14 decision; OQ-4/OQ-5 (bare 行程 route naming; trip-selection
  memory) deferred to P3 by the user on 2026-11-15. Behavior is fixed by the
  ACs; concrete proposals recorded (`#/trips`, route-derived selection).
- R18: REQ-004 PR #31 was open when P1 started; merged 2026-11-15T06:23:20Z
  (gh verified). Stacking order satisfied; resolved.
- R19: fixed dock must not obscure Home's `.actionbar` or content on short
  viewports; `100dvh`/safe-area verified in browser at P4, not by build alone.
  Deferred with owner Dev.
- `X-User-Id` is trusted without verification (inherited from REQ-003); the
  switcher stays labeled as a scaffold (非登录), never a security control.
- Join/unusable keep today's scaffold bar; only the dock is excluded (OQ-6,
  fixed by AC6 + AC9).