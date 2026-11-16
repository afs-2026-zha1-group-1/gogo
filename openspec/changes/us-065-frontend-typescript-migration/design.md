# Design

## Context

The frontend is a React 19 / Vite 8 application with nine JavaScript/JSX
application modules and a JavaScript Vite config. `index.html` loads
`/src/main.jsx`, and `npm run build` currently runs only `vite build`. The
existing GitHub Actions frontend job already runs `npm ci` and `npm run build`
on Node 24.

US-065 and the Delta Spec require a TypeScript migration without changing
visitor behavior, the API boundary, or the development-server contract. The
binding technology-stack plan already lists React + TypeScript + Vite. Its
reconciliation is deferred until the change has shipped and is ready to
archive, per `openspec/config.yaml`.

The G1 record says `Decision: Pass` but also says `Sign-off status: Pending`.
This P3 design does not approve or change that gate; IO/SA must resolve the
record before implementation begins.

## Goals / Non-Goals

**Goals**

- Convert the nine current `frontend/src` application modules and
  `frontend/vite.config.js` to `.ts` / `.tsx`.
- Type API payloads, props, state, events, and the React entry without `any` or
  `@ts-ignore` escape hatches.
- Guard the `#root` lookup before mounting React.
- Make the production build fail on type errors before Vite bundles assets.
- Preserve existing greeting, routes, identity headers, trip/invitation flows,
  React plugin, port 5173, and `/api` proxy to `http://localhost:8080`.

**Non-Goals**

- Backend, database, API-contract, persistence, feature, route, or visual
  redesign changes.
- A new frontend test framework, linter, browser automation suite, `@` alias,
  Tailwind plugin, B-chain split flow, or `router.tsx`.
- Any new functional runtime dependency or user-visible behavior change.
- NFR testing; the user chose to skip it for this P3 design.

## Constraints

- Preserve the current React 19, Vite 8, and React Vite plugin integration.
- Keep TypeScript and type declarations in `devDependencies`.
- Include the application sources and `vite.config.ts` in the compiler check.
- Do not change the existing CI workflow topology; CI already invokes
  `npm run build`.
- Keep API paths, request bodies, response handling states, and
  `X-User-Id` behavior unchanged.
- Keep the working tree limited to this OpenSpec change during P3; this phase
  creates planning artifacts, not application code.

## Approaches

| Approach | Trade-off | Decision |
|---|---|---|
| Run `tsc --noEmit` from the existing build script before `vite build`, then use the existing manual browser-flow checks | Reuses the current build/CI contract and adds no test framework; browser checks remain manual | **Selected.** It satisfies FB-1–FB-5 while respecting the explicit tooling non-goal. |
| Add a Vite type-check plugin or a separate CI type-check job | Adds build/CI machinery and duplicates the check already required in the production build | Not selected; unnecessary for the current single frontend build. |
| Rely on Vite transpilation and check only the bundle | Keeps the build simple but does not type-check and does not establish FB-3 | Rejected; it fails the stated acceptance criteria. |

## Decisions

| id | Decision | Rationale |
|---|---|---|
| D1 | Add a `typecheck` script using `tsc --noEmit`; make `build` run `tsc --noEmit && vite build`. | This makes type errors fail the same local and CI production build before bundling, with no workflow change. |
| D2 | Use one strict TypeScript project configuration for `frontend/src` and `frontend/vite.config.ts`, with bundler module resolution and the React automatic JSX runtime. | Covers both app code and Vite configuration with the smallest project setup; strict checking prevents implicit `any`. |
| D3 | Add only development-time compiler/declaration packages: TypeScript, React/React DOM types, QRCode types, and Node types needed for Vite's config types. | The installed `qrcode` package has no bundled declarations; Vite exposes optional Node type support. Keeping these in `devDependencies` preserves runtime dependencies. |
| D4 | Model existing API response shapes, route variants, form data, icon names, component props, and async UI states explicitly. Type DOM events and handle caught errors as `unknown`. | Gives the compiler useful checks without changing the existing API or user-visible state transitions. Keep any JSON boundary typing localized to the shared API helper; do not add runtime schema validation in this migration. |
| D5 | Rename JSX modules to `.tsx`, non-JSX modules and Vite config to `.ts`, update imports and the HTML entry, and add an explicit missing-root error before `createRoot`. | Satisfies the source inventory and safe-mount requirements while preserving existing component structure and browser behavior. |
| D6 | Use `npm run typecheck`, `npm run build`, static reverse checks, and manual browser acceptance; do not add frontend test automation. | The change explicitly excludes a test framework, and the existing CI runs only the production frontend build. Manual E2E checks cover behavior that static compilation cannot establish. |

The type package list is deliberately limited to the currently used TypeScript
surfaces. Keep existing application dependencies and the `jsqr` development
dependency otherwise unchanged; removing unrelated packages is out of scope.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Strict nullability and caught errors surface implicit assumptions in existing components. | Use explicit state unions, props, payload types, event types, and `unknown` error narrowing; preserve the current rendered branches. |
| Vite config or the QRCode import lacks declarations. | Include the required development-only type packages and compile the Vite config as part of the project check. |
| File renames leave a stale `.jsx`/`.js` import or HTML entry. | Check the complete frontend source inventory and run both the type check and production build. |
| Type checking passes while browser behavior changes. | Run the manual greeting, route, identity, trip, invitation, and proxy acceptance checks after the migration. |
| G1 sign-off remains unresolved. | Treat the recorded Pending status as open; do not infer approval from this design or P3 checklist. Resolve with IO/SA before implementation. |

## Alignment

The design is limited to the source, entry/import, type-check/build, browser
behavior, dev-server, and dependency/config contracts in FB-1–FB-6. No
backend/API implementation or test framework is added. Detailed scenario-to-task
mapping is recorded in `tasks.md` under “Alignment self-check”.
