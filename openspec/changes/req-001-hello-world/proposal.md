# Proposal

## Why

REQ-001 validates the project scaffold: prove that a React page, a Spring Boot
endpoint and an embedded database actually work together before any feature is
built on top of them. The greeting text must come from persisted data, otherwise
the database link is never exercised and the scaffold proves nothing.

## What Changes

- Add a `greeting` table seeded with one `Hello World` row by a Flyway migration
  (`V1__create_greeting.sql`), in an embedded **H2 file-mode** database. H2
  replaces the SQLite named in `TODO.md` per the user's instruction of 2026-11-13
  (OQ-1, resolved); the observable criterion "a database file is created and
  seeded" is unchanged.
- Add `GET /api/greeting`, returning the stored message as `text/plain`
  (OQ-3, deferred to IO). Data access uses `JdbcTemplate`; no ORM, per the
  `TODO.md` non-goal.
- Add a React home page that fetches the endpoint and renders the result, with a
  load-failure message when the backend is unreachable (reverse case AC3-N). The
  frontend contains no literal greeting.
- Add a GitHub Actions workflow that builds and tests the backend and installs
  and builds the frontend (harness scope, user instruction of 2026-11-13). It
  changes no product behavior, so it introduces no capability.
- Make the committed frontend lockfile resolvable from GitHub-hosted runners:
  `resolved` URLs point at the public npm registry while local installs keep
  using the corporate registry through npm's `replace-registry-host` default.
- Update `README.md` with run instructions and the H2 substitution; ignore
  generated `data/` and `logs/`.

No breaking changes: the repository has no prior application implementation.

## Capabilities

### New Capabilities

- `greeting`: serving a persisted greeting message to the home page — storage and
  seeding, the read endpoint, and the rendering contract including the
  backend-unreachable case.

### Modified Capabilities

None. `openspec list --specs` reports "No specs found"; `openspec/specs/` holds
only `.gitkeep`, so there is no existing capability whose requirements change.

## Impact

- **Requirement**: REQ-001 (`requirement-workspace/requirements/REQ-001.md`),
  deep-dive ⑨–⑫ in `requirement-workspace/deep-dive.md`.
- **Code**: new `backend/` (Spring Boot 3.5.14, Java 21) and `frontend/`
  (React 19, Vite 8). Both already exist uncommitted in the working tree; see
  risk R4 below.
- **APIs**: one new read-only endpoint, `GET /api/greeting`. No existing contract
  is modified.
- **Dependencies**: `spring-boot-starter-web`, `spring-boot-starter-jdbc`,
  `flyway-core`, `h2` (runtime), `spring-boot-starter-test`; `react`,
  `react-dom`, `vite`, `@vitejs/plugin-react`. All resolve from the local Maven
  cache and the configured npm registry.
- **Runtime**: backend port 8080, frontend dev port 5173 proxying `/api`, H2 file
  at `backend/data/gogo.mv.db`. Local port contention with other projects was
  observed (impact brief §4, R3).
- **CI**: `.github/workflows/` is new. Runner network reachability is the main
  risk (R1); CI run status cannot be read from this machine because `gh` is
  absent and `api.github.com` returned HTTP 403 (R2).
- **Docs / harness**: `README.md`, `.gitignore`, this workdir, stage reports under
  `docs/ai4se-plugins/`. The knowledge base is untouched — `scripts/kb-lint.sh`
  remains a documented `SKIP`. `scripts/{init,verify-links,archive-change}.sh`
  exit 1 by design and must not be invoked by CI.

## Effort and ordering

Small. One vertical slice, no parallel tracks: 3 backend classes, 1 migration,
1 acceptance test, 5 frontend files, 1 workflow. Dependency sketch:
`migration → repository → endpoint → frontend render`, with CI independent of the
product code but dependent on the lockfile decision. `/sdd:story-split` is
Skipped: a single requirement with four scenarios does not warrant a story
backlog (impact brief §6).

## A0 deep-dive gate

REQ-001 is new and deep-dive is in scope. `requirement-workspace/deep-dive.md`
covers ⑨ data contract, ⑩ boundary, ⑪ cross-REQ (N/A, single requirement),
⑫ display contract. All four Pass → **A0 Pass**, split permitted.

## Known deviations carried into later stages

- R4: implementation and verification happened before P1–P3 were authored, at the
  user's request. P4 re-verifies against the Delta Spec rather than assuming
  red-green order.
- OQ-2: `TODO.md` requires Flyway in its stack constraint yet lists migration
  tooling as a non-goal. Working interpretation keeps Flyway; IO/SA to confirm
  at G1.
