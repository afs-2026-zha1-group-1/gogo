# Tasks

Owners: `Dev` = implementing engineer; `IO/SA` = human gate owners.
Verification belongs to each checkbox. Tasks are planned only; no application
code is changed in P3.

## 0. Human gate precondition (owners: IO/SA)

- [x] 0.1 Resolve the G1 record's `Decision: Pass` / `Sign-off status: Pending`
  discrepancy before implementation; verify the authoritative sign-off with
  both gate owners. This task does not approve or edit the gate record on their
  behalf. User confirmed both approvers signed off after the record timestamp;
  the G1 decision file remains unchanged.

## 1. TypeScript build gate (owner: Dev)

- [x] 1.1 Capture the existing frontend build and browser-flow behavior before
  source changes; verify `cd frontend; npm ci; npm run build` succeeds and
  record the baseline for the same greeting, routes, identity, trip, invitation,
  and proxy checks planned in §4.
  - Baseline evidence: `npm ci` and `npm run build` passed in a clean temporary
    copy. Read-only browser checks covered greeting success/failure, all four
    routes, identity-denied and trip-details states, invitation preview and
    unusable states, and the `/api` proxy. In-place `npm ci` was blocked by the
    already-running Vite process holding a native binding.
  - Verification exception (approved 2026-11-16): trip creation and invitation
    acceptance were not run against the live database and remain unverified;
    do not report those checks as passed.
- [x] 1.2 Add the TypeScript compiler and only the required type packages as
  `devDependencies`; add a strict project configuration covering `src` and
  `vite.config.ts`; update the lockfile. Verify the compiler and all type
  packages are absent from production `dependencies`.
- [x] 1.3 Add `typecheck` (`tsc --noEmit`) and make `build` run the type check
  before `vite build`. Temporarily introduce a known type error and verify
  `npm run build` exits at the type check without reporting a successful Vite
  bundle; remove the temporary error and confirm the source tree is clean.
  - Verification: a temporary TS2322 assignment error failed the build before
    Vite ran; the probe was removed and the clean build passed.

## 2. Entry and shared modules (owner: Dev)

- [x] 2.1 Rename `main.jsx`, `App.jsx`, `api.js`, `Icons.jsx`, and
  `vite.config.js` to their TypeScript targets; update `index.html` to load
  `/src/main.tsx` and update all affected imports. Verify no migrated import
  still targets a `.js` or `.jsx` module.
- [x] 2.2 Define the existing user, API result/payload, route, and icon-name
  types; type component props, state, API options, DOM events, and caught errors.
  Add the checked `#root` lookup before `createRoot`. Verify the TypeScript
  project check reports no errors and no `any` or `@ts-ignore` is used.
- [x] 2.3 Preserve the React plugin, port 5173, and `/api` proxy target in
  `vite.config.ts`. Verify the config is included in the TypeScript project
  check and contains no `@` alias or Tailwind plugin.

## 3. Page modules (owner: Dev)

- [x] 3.1 Rename and type `Home.jsx` and `CreateTrip.jsx`, including their API
  payloads, form state, change/submit events, loading and error states. Verify
  the greeting success/failure branches and trip form behavior remain
  unchanged.
- [x] 3.2 Rename and type `TripDetails.jsx` and `Join.jsx`, including their
  discriminated async states and component props. Verify ready, denied, missing,
  failed, unusable, closed, and joined branches preserve their existing
  messages and navigation.
- [x] 3.3 Rename and type `InvitationPanel.jsx`, including QR canvas refs,
  invitation state, copy/focus events, and organizer-only controls. Verify QR,
  link-copy, retry, and denied behavior remain unchanged.
  - Browser verification used intercepted API responses for trip and
    invitation writes; QR rendering, retry, denied controls, and copy feedback
    were checked without mutating the live database.

## 4. Acceptance verification (owner: Dev)

- [x] 4.1 Run `npm run typecheck`; inventory the nine application modules and
  Vite config; verify no `.js`/`.jsx` source remains in the specified locations
  and no `any`/`@ts-ignore` escape hatch is present.
- [x] 4.2 Run `npm ci` and `npm run build`; verify the type check completes
  before Vite bundling and the production bundle is emitted only after both
  steps succeed.
- [x] 4.3 Start the frontend on port 5173 with the backend on 8080; verify
  `/api` proxying, greeting success/failure, the four existing routes,
  identity-bound `X-User-Id` requests, trip creation/details, invitation
  preview/acceptance, denied/closed/error states, and organizer QR/link
  controls. Use only a disposable local database for mutating flows.
  - Verification exception (approved 2026-11-16): live trip creation,
    invitation issuance, and invitation acceptance were not run against a
    database. Their UI branches were exercised with intercepted responses;
    no post-migration mutating request reached the live backend.
- [x] 4.4 Perform the non-goal reverse checks in `atdd-design.md` §5; verify no
  backend/API contract change, test framework/linter, functional runtime
  dependency, alias, Tailwind plugin, new route, or B-chain split flow was
  introduced.

## 5. Pre-archive knowledge reconciliation (owner: Dev)

- [ ] 5.1 After implementation is complete and before archive, reconcile
  `docs/knowledge/architecture/tech-stack-plan.md` with what this change
  actually shipped. Do not update the plan for this unarchived proposal; if the
  shipped change requires a plan update, append a row to
  `docs/knowledge/_LOG.md`.
  - Deferred until archive: `openspec/config.yaml` limits plan reconciliation to
    archived changes. The existing Vite 8 versus plan Vite 7 discrepancy is
    intentionally left for that step.

## Alignment self-check

| Delta requirement | Design decision(s) | ATDD evidence | Task(s) | Result |
|---|---|---|---|---|
| FB-1: typed TypeScript modules and explicit types | D2–D4 | Build/static gates: source inventory, type check, no escape-hatch search | 1.2, 2.1–2.2, 3.1–3.3, 4.1 | Pass |
| FB-2: TypeScript entry/import resolution and guarded root mount | D5 | E2E + static entry/root check | 2.1–2.2, 4.1, 4.3 | Pass |
| FB-3: type-check before production bundling | D1 | Positive build and temporary-type-error negative check | 1.2–1.3, 4.2 | Pass |
| FB-4: preserve greeting, routes, identity, trips, and invitations | D4–D6 | Manual browser E2E scenarios in `atdd-design.md` §1 | 1.1, 3.1–3.3, 4.3 | Pass |
| FB-5: preserve React dev integration, port, and API proxy | D5–D6 | Browser request through port 5173 to backend 8080 | 2.3, 4.3 | Pass |
| FB-6: development-only type tooling; no runtime dependency, alias, or Tailwind plugin | D1, D3, D6 | Static package/config reverse checks in `atdd-design.md` §5 | 1.2, 2.3, 4.4 | Pass |

All proposal non-goals have a reverse-verification row in
`atdd-design.md` §5. No backend, API, database, UI, CI-topology, or testing
framework scope has been added. P3 creates no production code and makes no Gate
decision.

**Self-check result: Pass.** Every Delta Spec requirement maps to a design
decision, ATDD evidence, and actionable task; no silent scope expansion was
found.
