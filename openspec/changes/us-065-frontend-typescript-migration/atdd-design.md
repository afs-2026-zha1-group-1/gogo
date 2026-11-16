# ATDD design — us-065-frontend-typescript-migration

- Date: 2026-11-16
- Stage: P3, `/sdd:atdd-design`
- Delta Spec: `specs/frontend-build/spec.md` (FB-1–FB-6)
- Scope: build/static acceptance gates and API + E2E acceptance layers only.
  No frontend test framework or unit-test suite is introduced.

## 1. ATDD layers in scope

### API

No API acceptance tests are added. This change does not modify backend
endpoints, request or response contracts, persistence, or authorization. The
existing API is exercised only through the browser-facing E2E checks below.

### E2E

| Scenario | Source | Layer | Acceptance evidence |
|---|---|---|---|
| TypeScript entry loads and mounts only after the `#root` lookup succeeds | FB-2 | E2E + static | Inspect `index.html` and the root guard; load the page and confirm the app mounts. |
| Greeting renders on success and retains the load-failure state on failure | FB-4 / AC5 | E2E | With the backend available, verify the greeting; stop or make the backend unavailable and verify the existing alert state. |
| Existing hash routes and identity-bound requests remain unchanged | FB-4 / AC6 | E2E | Visit `#/`, `#/create`, `#/trips/<id>`, and `#/join/<token>`; switch identities and inspect the `X-User-Id` header on protected requests. |
| Trip and invitation interactions retain their existing states and controls | FB-4 / AC7 | E2E | Exercise trip creation/details, invitation preview/acceptance, denied/closed/error states, and organizer QR/link controls. |
| Development-server API proxy remains available | FB-5 | E2E | Run Vite on port 5173 and verify a browser request to `/api/greeting` reaches the backend on port 8080. |

These are manual browser acceptance checks. No Playwright/POM generator or
other browser automation framework is added.

### Build and static acceptance gates

These are the direct oracles for the developer-facing source/build requirements;
they are not backend API tests.

| Scenario | Source | Check |
|---|---|---|
| All nine application modules and Vite config are TypeScript; no `any` or `@ts-ignore` escape hatch remains | FB-1 | Inventory `frontend/src` and `frontend/vite.config.ts`; run the TypeScript project check; search migrated TypeScript sources for prohibited escapes. |
| HTML entry and imports resolve to renamed TypeScript modules | FB-2 | Inspect the entry and imports, then run the production build. |
| Type errors block a successful bundle | FB-3 | Temporarily introduce a known type error and run `npm run build`; require a non-zero type-check result before Vite runs, then remove the temporary error. |
| Compiler/type packages remain development-only; no functional runtime dependency, alias, or Tailwind plugin is added | FB-6 | Inspect `package.json`, the lockfile diff, and `vite.config.ts`. |

Pure helper logic is not given a separate unit-test design in P3. If unit-level
TDD becomes necessary during implementation, it remains apply-time work and
must respect the explicit non-goal against adding a frontend test framework.

## 2. What is written before production code

This document defines the acceptance checks before implementation. The
implementation sequence will:

1. Capture the current build and browser behavior as the comparison baseline.
2. Add the TypeScript project check and wire it before Vite bundling.
3. Prove the gate rejects a temporary type error before considering the
   migration complete; remove the temporary error immediately afterward.
4. Migrate the source and verify the static/build checks, followed by the E2E
   browser checks. No new test-as-code framework is part of this change.

## 3. Local vs CI gate expectations

The existing GitHub Actions frontend job uses Node 24, `npm ci`, and
`npm run build`. Keep the workflow topology unchanged; make the existing build
script run the TypeScript project check before `vite build`.

| Gate | Local | CI |
|---|---|---|
| TypeScript project check | `cd frontend; npm run typecheck` | Included first in `npm run build` |
| Production bundle | `cd frontend; npm ci; npm run build` | Existing frontend job: `npm ci`, then `npm run build` |
| Browser acceptance | Run the frontend and backend locally; execute the E2E scenarios above | Not run in CI; this change adds no browser automation or service orchestration |

No second CI product or CI workflow change is introduced.

## 4. Data / fixtures strategy

- Use the repository's seeded development identities and trip/invitation
  fixtures where applicable. Read generated trip IDs and invitation tokens
  from responses; do not hard-code database-assigned IDs or opaque tokens.
- Use a disposable local backend database for flows that create or accept
  records. Do not exercise these checks against production or shared
  non-production data.
- Do not alter API fixtures, backend tests, or database migrations. The
  frontend migration must not change the existing request payloads or
  `X-User-Id` behavior.
- No browser mock layer or new test-data generator is introduced.

## 5. Non-goals and reverse verification

| Non-goal / out-of-scope item | Reverse check | Expected | Layer |
|---|---|---|---|
| No backend, database, persistence, or API-contract change | Inspect the change file list and frontend network requests | No backend or database files changed; existing API paths and payloads remain in use | Static / E2E |
| No new product feature, route, or visual redesign | Visit the four specified hash routes and compare existing screens/states | Existing routes and user-visible flows remain; no new route or UI is introduced | E2E |
| No frontend test framework or lint tool | Inspect package manifest, lockfile diff, and CI workflow | No test runner/linter or new test workflow is added | Static |
| No `@` alias or Tailwind plugin | Inspect `vite.config.ts` and imports | Neither alias nor plugin is configured | Static |
| No functional runtime dependency | Compare `dependencies` before/after; inspect added packages | TypeScript compiler and type packages are development-only | Static |
| No B-chain split flow or `router.tsx` | Inventory migrated source and route handling | No split flow or router module is introduced | Static |

## 6. NFR tests (optional)

**Not in scope.** The user chose to skip NFR testing for this P3 design. The
Delta Spec contains no NFR targets, and no performance, observability, or
resilience test gate is added.
