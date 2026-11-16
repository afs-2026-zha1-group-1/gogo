# Impact brief - REQ-005 (2026-11-16)

## 1. Requirement set

| id | Path |
|---|---|
| REQ-005 | `requirement-workspace/requirements/REQ-005.md` |

Supporting intent: `requirement-workspace/intents/2026-11-16-req-005.md`.
DoR self-check: `requirement-workspace/analysis/req-005-dor.md`.

## 2. As-is asset inventory

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/_INDEX.md` and `docs/knowledge/` | The index is a placeholder and points to topic READMEs; no frontend TypeScript guidance is referenced by this change. |
| Living Spec | `openspec/specs/greeting/spec.md` | Contains the existing greeting capability. Its endpoint response description is plain text, unlike REQ-002 and the current JSON consumer; this is pre-existing drift and is not changed here. |
| Existing requirement set | `requirement-workspace/requirements/REQ-001.md` through `REQ-004.md` | Defines greeting, trips, and invitations. REQ-002 specifies the JSON greeting contract. No TypeScript migration requirement exists yet. |
| Post-archive assets | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | REQ-001 is archived; no frontend migration artifact exists. |
| Active OpenSpec changes | `openspec/changes/req-002-greeting-json-sqlite/`, `req-003-trip-create-and-view/`, `req-004-trip-invitations/` | Existing greeting, trip, and invitation work; no change directory for REQ-005. |
| Frontend source | `frontend/src/` | Nine `.js`/`.jsx` files: `App.jsx`, `main.jsx`, `api.js`, `Icons.jsx`, and five page components (`Home`, `CreateTrip`, `TripDetails`, `Join`, `InvitationPanel`). No `.ts` or `.tsx` source is present. |
| Frontend entry | `frontend/index.html` | Loads `/src/main.jsx`. |
| Vite config | `frontend/vite.config.js` | React plugin; port 5173; `/api` proxy to `http://localhost:8080`; no `@` alias or Tailwind plugin. |
| Frontend package/build | `frontend/package.json`, `frontend/package-lock.json` | React 19, Vite 8, and current QR dependencies. No TypeScript compiler, React type packages, or TypeScript config; `build` runs `vite build`. |
| Frontend behavior | `frontend/src/App.jsx`, `api.js`, and `src/pages/*.jsx` | Hash routes are home, create, trip details, and join; the app has a seeded-identity selector and existing trip/invitation flows. `Home.jsx` consumes `data.message` and renders a request-failure state. |
| CI | `.github/workflows/ci.yml` | Frontend job installs with `npm ci` and runs `npm run build`; workflow topology is unchanged. |
| Product documentation | `README.md` | Documents the actual greeting JSON, trip, invitation, identity scaffold, and local frontend/backend run commands. |
| Frontend tests | `frontend/` | No frontend test framework or frontend test files are present. Backend acceptance tests are separate and do not change. |

## 3. As-is -> proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `frontend/src/App.jsx`, `main.jsx`, `api.js`, `Icons.jsx`, `src/pages/*.jsx` | All nine source files are JavaScript/JSX; imports use `.js`/`.jsx` extensions. `App.jsx` owns hash routing and identity selection. | Rename/convert each file to `.ts`/`.tsx`, update imports, and add explicit types while preserving all current runtime logic and UI states. |
| `frontend/index.html` | Loads `/src/main.jsx`. | Load `/src/main.tsx`. |
| `frontend/vite.config.js` | JavaScript config with React plugin, port 5173, and `/api` proxy. No alias or Tailwind plugin. | Convert to `vite.config.ts`; retain the React plugin, server port, and existing proxy. Do not add the nonexistent alias or Tailwind plugin. |
| `frontend/package.json` and lockfile | Build runs Vite only; no TypeScript compiler or type declarations. | Add the minimal development-only TypeScript/compiler typings needed and run the TypeScript project check before Vite build. Keep functional runtime dependencies unchanged. |
| Existing routes and API use | Hash routes are `#/`, `#/create`, `#/trips/<id>`, `#/join/<token>`; greeting uses JSON `data.message`; identity-bound requests use `X-User-Id`. | Preserve routes, response handling, identity headers, trip/invitation behavior, and existing error/denied states. |
| `.github/workflows/ci.yml` | Frontend CI invokes `npm ci` and `npm run build`. | No workflow-structure change; the existing build command becomes the TypeScript-plus-Vite check. |
| `openspec/specs/greeting/spec.md` | Describes a plain-text greeting response, conflicting with REQ-002/current JSON behavior. | Checked; no change in REQ-005. Handle the pre-existing spec discrepancy separately. |
| Backend and database | Own existing API and SQLite data. | Checked; no impact. No backend, database, API, or migration changes. |
| Frontend test tooling | No frontend test runner exists. | Do not introduce a new test framework. Verify type-check/build and exercise existing flows with the available runtime checks. |

## 4. Blast radius

Frontend source, frontend build configuration, package development tooling, and
the existing frontend build job's command semantics. No backend service,
database, API contract, deployment topology, or runtime service boundary is
affected.

## 5. Artifact impact

- Add REQ-005 intent, structured requirement, DoR self-check, impact brief, and
  one OpenSpec proposal.
- At implementation time, change the ten listed source/config files, HTML entry,
  TypeScript configuration, package metadata, and lockfile.
- Keep current business capability specs and backend tests unchanged.
- No new frontend test or lint tooling is proposed.
- The existing greeting Living Spec discrepancy is recorded as unrelated and
  left untouched.

## 6. Dual-track notes

OpenSpec remains the delivery-spec authority. One OpenSpec change is sufficient
for this coordinated frontend refactor. No external tracker story was supplied;
this P1 proposes one Change rather than creating an unlinked agile-story list.

## 7. Risks and blockers

| id | Risk | Severity | Status | Mitigation / owner |
|---|---|---|---|---|
| R1 | The supplied attachment's source inventory and configuration claims do not match the checkout. | Requirement ambiguity | Resolved | User confirmed actual-checkout scope and that alias/Tailwind claims are stale. Requirements use the observed ten-file inventory. Owner: Dev. |
| R2 | Type checking may reveal implicit assumptions in API payloads, DOM events, null handling, or third-party declarations. | Implementation | Open, non-blocking | Resolve during P3/P4; use explicit types and the build check. No app-boundary decision is required. Owner: Dev. |
| R3 | No frontend test runner exists to automate every screen regression. | Verification | Known, non-blocking | Do not add a framework; pair `tsc -b` and build evidence with runtime checks of the existing routes and requests. Owner: Dev. |
| R4 | The Living Spec greeting response shape conflicts with REQ-002/current JSON behavior. | Documentation consistency | Deferred by user | Preserve the current JSON consumer per REQ-002; the user deferred correcting the unrelated Living Spec to a separate change on 2026-11-16. Owner: Spec maintainer. |

No critical blocker invalidates REQ-005.

## 8. Suggested split boundaries

Propose one Change: `req-005-frontend-typescript-migration`, covering the
TypeScript conversion, compiler/build setup, entry/import updates, and behavior
preservation checks. There are no dependencies on backend or database changes.
Do not split by source/config layer: an intermediate change that leaves
JavaScript in the frontend fails the requirement and cannot provide an
independently complete migration.
