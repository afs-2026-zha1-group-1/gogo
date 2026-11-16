# Design

## Context

REQ-005 (US-064) wraps the existing REQ-001/003/004 surfaces in one mobile
shell with a persistent four-tab dock. The frontend already has the centered
430 px / 100 dvh column (`app.css:51-60`), a shared hash router
(`App.jsx:8-16`, REQ-004 design D7) and App-level scaffold identity
(`App.jsx:20`). No backend, migration, dependency or CI change is allowed.
G1 Pass 2026-11-15 (IO Johnson + SA Elian Jiang). The delta spec is
`specs/app-shell/spec.md`; acceptance approach is `atdd-design.md`.

## Goals / Non-Goals

Goals: one shell frame + dock for every in-app route; honest placeholders for
分队/成员; no-trip empty state; join/unusable excluded from the dock; existing
contracts verifiably unchanged; text-only verification possible.

Non-Goals: see proposal §Non-Goals / Out of scope (split planning, member list,
aggregation, list-all, backend/DB, auth, demo data, new dependencies, i18n, CI
changes).

## Decisions

### D1 — Extend the shared hash router, no new routing dependency

Context: tab switching must update the hash without reload and support
back/forward; REQ-004 D7 already standardized one hash router.
Decision: extend `parseRoute` with three entries — bare `#/trips`
(`trips-empty`), `#/split`, `#/members`; keep the home fallback for unknown
paths and the non-numeric-id fallback as-is.
Rejected: react-router (new dependency, forbidden by the story); a second
router instance (splits navigation state).

### D2 — Shell composition in App.jsx; Join bypasses the dock

Context: the frame, scaffold bar and dock are cross-route chrome; pages must
keep their contracts.
Decision: App renders `Shell` (frame + scaffold bar + dock) around the routed
page for in-app routes; the `join` route renders the page full-screen with the
scaffold bar but without the dock (OQ-6). Pages themselves are not rewritten.
Rejected: duplicating chrome inside each page (drift); moving chrome into
pages (breaks join exclusion).

### D3 — Bare 行程 route `#/trips` + last-trip memory (resolves OQ-4, OQ-5)

Context: the story fixes the empty-state behavior but not the path or the
selection model; both were deferred to P3.
Decision: `#/trips` serves the no-trip empty state. Trip selection is
route-derived (`#/trips/<id>` = selected) plus a session-only `lastTripId` in
App state: the 行程 tab targets the remembered id when present, else `#/trips`.
Memory is not persisted to storage and never overrides an explicit URL.
Rejected: query-param empty state (`#/trips?none`, awkward); pure route-derived
without memory (loses context on tab return, against the story rationale);
localStorage persistence (scope creep).
Effect: OQ-4 and OQ-5 resolved at P3; REQ-005 open-questions updated.

### D4 — One shared Placeholder component for 分队/成员

Context: both tabs need honest text + link back to 行程 + a unique heading.
Decision: a single `Placeholder` page component parameterized by title/heading
and body text; routes `#/split` and `#/members` render it with distinct
headings (分队 / 成员). No data fetching.
Rejected: two bespoke pages (duplication); reusing the empty state (wrong
message and actions).

### D5 — Fixed dock with content clearance and safe-area padding

Context: AC1 fixes the dock below scrolling content; Home owns a bottom
`.actionbar` that must stay reachable (R19).
Decision: the dock is a non-scrolling `flex: none` row pinned to the column
bottom, below the `flex: 1; min-height: 0` content area whose `.body` scrolls
internally; safe-area padding via `calc(6px + env(safe-area-inset-bottom))`.
The home `.actionbar` stays inside the page above the dock and remains
reachable. Tokens come from the existing `app.css` set; active highlight uses
`--brand-ink` / `--brand-soft`. (Amended at P4: original wording said
`position: fixed` + content padding; the flex composition achieves the same
observable contract — dock never scrolls, content never obscured — without
overlap risk; verified in browser, see verification-req-005.md FR1/R19.)
Rejected: sticky dock inside each page (inconsistent); overlay without padding
(obscures content, violates FR1).

### D6 — Create back-target moves to the 行程 tab

Context: story page-function table row 3.
Decision: `CreateTrip.jsx` back link targets the 行程 tab route (D3 target);
submit navigation to `#/trips/<id>` and all validation stay unchanged.
Rejected: keeping `#/` (contradicts the story table).

### D7 — Identity stays App-level; scaffold bar inside the shell

Context: AC7/AC9; join acceptance consumes the switcher identity.
Decision: no change to identity state or `api.js`; the scaffold bar renders
inside the shell frame (and on join as today), labeled 非登录.
Rejected: moving identity into the dock or a context refactor (no need).

### D8 — Dock glyphs added to the local inline SVG set

Context: four tabs need icons; the project bans icon libraries.
Decision: extend `Icons.jsx` with home / list / fork / users glyphs in the
existing 1.75-stroke style, `currentColor`.
Rejected: an icon dependency (forbidden); emoji (off-style).

### D9 — Verification by numbered browser steps, no E2E framework

Context: the story prescribes a text-only switching check; house precedent
(REQ-003/004) uses numbered browser steps executed at P4.
Decision: the ATDD E2E list is executed manually/browser-tooling against the
running apps and recorded in the local-verify report; no Playwright.
Rejected: introducing Playwright (new CI product, forbidden by ATDD non-goals).

### D10 — TypeScript for the US-064-scoped files (user amendment 2026-11-15)

Context: user instruction to convert this story's scope to TS, referencing
`docs/knowledge/architecture/tech-stack-plan.md` (React + TypeScript 5.x +
Vite, `types/` aligned with backend DTOs) and US-065 (issue #35, full JS→TS
migration, assigned to sammingoocl) conventions: strict types, no `any`, no
`@ts-ignore`, `tsc -b && vite build`, zero user-visible behavior change.
Decision: convert the files US-064 owns — `App.tsx`, `TabBar.tsx`,
`Icons.tsx`, `api.ts`, `pages/CreateTrip.tsx`, `pages/TripsEmpty.tsx`,
`pages/Placeholder.tsx` — plus `src/types.ts` (DTO-aligned interfaces) and a
strict `tsconfig.json` (`allowJs: true`, `checkJs: false` so the remaining
US-065-scope JS still compiles). Build script becomes `tsc -b && vite build`.
devDependencies added with user authorization: `typescript ^5.9.3`,
`@types/react`, `@types/react-dom` (runtime dependencies unchanged). Minimal
compile-required import-path edits in `main.jsx` and the four JS pages
(`../api.js`→`../api`, `../Icons.jsx`→`../Icons`, `./App.jsx`→`./App.tsx`);
no logic changes there.
Rejected: converting the whole frontend now (US-065's scope and assignee);
`any`/`@ts-ignore` shortcuts (forbidden by US-065 AC).
Evidence: `tsc -b` exit 0; `npm run build` green with byte-identical bundle
hash (`index-qP5mkQlJ.js`) to the pre-conversion build; browser smoke walk
identical (verification-req-005.md §TypeScript amendment). Remaining JS for
US-065: `main.jsx`, `vite.config.js`, `pages/{Home,TripDetails,Join,InvitationPanel}.jsx`.

## Risks / Trade-offs

- R19: fixed dock vs short viewports — mitigated by D5 padding; verified in
  browser at P4 (FR1), including the home actionbar.
- Last-trip memory (D3) must not break back/forward: history is driven by hash
  only; memory affects the tab-click target, never the parsed route (NV5).
- Placeholder drift toward demo data — guarded by PL3/R-2 reverse checks.
- `100dvh` / safe-area browser support — functional verification at P4; modern
  browsers assumed, no polyfill (no new dependency).