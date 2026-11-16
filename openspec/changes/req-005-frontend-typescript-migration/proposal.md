# Proposal

## Why

The current frontend is entirely JavaScript/JSX and its build runs Vite without
a TypeScript check. Converting the frontend before more UI work accumulates
reduces type-related runtime errors while keeping the existing product behavior
unchanged.

## What Changes

- Convert all nine current `frontend/src` `.js`/`.jsx` modules and
  `frontend/vite.config.js` to `.ts`/`.tsx`.
- Update `frontend/index.html` and imports to reference the renamed modules.
- Add the TypeScript configuration and the development-only compiler/type
  packages needed to type-check the frontend; make the build run the type check
  before Vite bundling.
- Type the existing API payloads, component props, state, and DOM events, and
  guard the root element lookup before React mounts.
- Preserve the current greeting, hash routes, trip/invitation flows, identity
  scaffold, React plugin, dev port, and `/api` proxy to
  `http://localhost:8080`.
- Do not add an `@` alias or Tailwind plugin; neither exists in the current
  checkout.
- Introduce no functional runtime dependency and no user-visible behavior
  change.

## Capabilities

### New Capabilities

None. This is a pure frontend source-language and build-tooling refactor.

### Modified Capabilities

None. No product-level requirement changes. Existing greeting, trip, and
invitation behavior remains unchanged; no delta specs are appropriate.

This change sets `skip_specs: true` in `.openspec.yaml` because it has no
spec-level behavior delta.

## Impact

- **Frontend source:** `App.jsx`, `main.jsx`, `api.js`, `Icons.jsx`,
  `pages/Home.jsx`, `pages/CreateTrip.jsx`, `pages/TripDetails.jsx`,
  `pages/Join.jsx`, and `pages/InvitationPanel.jsx` become `.tsx` modules;
  `vite.config.js` becomes `vite.config.ts`.
- **Entry and imports:** `index.html` loads `/src/main.tsx`; imports use the
  renamed files.
- **Build tooling:** `package.json`, `package-lock.json`, and TypeScript
  configuration add a compile check before the existing Vite build.
- **Runtime behavior:** the home page still consumes the REQ-002 JSON greeting
  and shows the existing error state; `#/`, `#/create`, `#/trips/<id>`, and
  `#/join/<token>` continue to work; identity-bound requests retain
  `X-User-Id`; trip and invitation behavior is unchanged.
- **Vite development server:** port 5173 and the `/api` proxy remain unchanged.
  The current config has no `@` alias or Tailwind plugin.
- **CI:** the existing frontend job continues to run `npm ci` and
  `npm run build`; no workflow topology change is needed.
- **Backend and database:** no changes.
- **Verification:** run the TypeScript project check and production build, then
  exercise the existing routes, greeting failure state, identity-bound flows,
  and development proxy. No frontend test framework is introduced.
- **Known unrelated spec drift:** `openspec/specs/greeting/spec.md` describes a
  plain-text response, while REQ-002 and the current frontend use JSON. The user
  deferred that documentation correction to a separate change; this proposal
  follows REQ-002 and does not modify the Living Spec.
