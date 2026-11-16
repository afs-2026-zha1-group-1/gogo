# Spec Delta

## Purpose

This capability defines source, entry, build, and runtime-compatibility
contracts for frontend maintainers while preserving existing visitor flows.

## ADDED Requirements

### Requirement: FB-1 Frontend modules use typed TypeScript

All frontend application modules and the Vite configuration SHALL be authored
in TypeScript. API payloads, component props, state, and DOM event handlers
SHALL have explicit types.

#### Scenario: Source inventory is TypeScript

- **GIVEN** the migration is complete
- **WHEN** source files under `frontend/src` and the Vite configuration are inventoried
- **THEN** all nine application modules and the Vite configuration use `.ts` or `.tsx`, with no `.js` or `.jsx` source remaining in those locations

#### Scenario: Application surfaces are type-checked

- **GIVEN** frontend code accesses API payloads, component props, state, or DOM events
- **WHEN** the TypeScript project check runs
- **THEN** those values are checked without an `any` escape hatch or `@ts-ignore`

### Requirement: FB-2 Frontend entry resolves TypeScript modules safely

The HTML entry SHALL load the TypeScript application entry and its imports SHALL
resolve to the renamed modules. The application SHALL check for its root element
before mounting React.

#### Scenario: HTML entry and imports resolve

- **GIVEN** the migration is complete
- **WHEN** the browser loads the frontend entry
- **THEN** `index.html` loads `/src/main.tsx` and its imports resolve to the
  corresponding TypeScript modules

#### Scenario: Root element is checked before mounting

- **GIVEN** the application entry is initializing
- **WHEN** it looks up the root element
- **THEN** the lookup is checked before React is mounted and a nullable element
  is not passed to React

### Requirement: FB-3 Production build checks types before bundling

The production frontend build SHALL run the TypeScript project check before
bundling assets, and SHALL fail when that check reports a type error.

#### Scenario: Type-correct sources produce a bundle

- **GIVEN** all frontend TypeScript sources have no type errors
- **WHEN** the production build runs
- **THEN** the type check succeeds before the frontend bundle is produced

#### Scenario: Type error blocks the bundle

- **GIVEN** a frontend TypeScript type error exists
- **WHEN** the production build runs
- **THEN** it fails at the type check and does not report a successful bundle

### Requirement: FB-4 Existing browser behavior is preserved

The migration SHALL preserve the existing greeting, hash routes, identity-bound
requests, trip and invitation interactions, and their user-visible states.

#### Scenario: Home greeting success and failure

- **GIVEN** the greeting request succeeds or fails
- **WHEN** a visitor opens `#/`
- **THEN** a successful response is rendered as the greeting and the existing
  load-failure state appears when the request is unsuccessful

#### Scenario: Existing routes and identity-bound requests

- **GIVEN** a visitor selects an identity and navigates to `#/`, `#/create`,
  `#/trips/<id>`, or `#/join/<token>`
- **WHEN** the visitor navigates or submits an identity-bound action
- **THEN** the existing route behavior is retained and identity-bound requests
  include the selected `X-User-Id` header

#### Scenario: Trip and invitation interactions

- **GIVEN** an organizer or invited member uses the existing trip and
  invitation flows
- **WHEN** the visitor creates or views a trip, previews or accepts an
  invitation, or uses invitation sharing controls
- **THEN** existing success, loading, error, denied, QR, and link behavior is
  retained

### Requirement: FB-5 Development server preserves its integration contract

The development server SHALL retain the React integration, remain available on
port 5173, and forward `/api` requests to `http://localhost:8080`.

#### Scenario: API request through the development server

- **GIVEN** the frontend development server is running
- **WHEN** a browser sends an `/api` request through port 5173
- **THEN** the request is forwarded to `http://localhost:8080`

### Requirement: FB-6 Type-check tooling does not change runtime dependencies

TypeScript compiler and type packages SHALL remain development-only. The
migration SHALL add no functional runtime dependency, `@` alias, or Tailwind
plugin.

#### Scenario: Type-check tooling is development-only

- **GIVEN** the frontend package and Vite configuration are prepared for the
  migration
- **WHEN** production dependencies and Vite configuration are inspected
- **THEN** TypeScript tooling is not required at runtime, no functional runtime
  dependency is added, and no `@` alias or Tailwind plugin is introduced
