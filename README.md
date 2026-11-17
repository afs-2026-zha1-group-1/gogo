# AI4SE Baseline

A starting repository for AI-assisted, specification-driven development. It
includes the project skeleton, OpenSpec prompts, AI4SE skills and agents, and
Superpowers skills as ordinary repository files.
Cloning does not require access to the author's machine or another private repository.

## Start

1. Clone your class's `ai4se-baseline` repository and open its root in your
   coding agent.
2. Install Node.js 20.19 or later and Git. For OpenSpec commands, install the
   matching CLI: `npm install -g @fission-ai/openspec@1.16.1`.
3. Run `bash scripts/setup-dev.sh` once per clone. It points Git at
   `.githooks/pre-push`, which blocks direct pushes to `main`; land changes
   through pull requests.
4. Run `node --test scripts/portability.test.mjs` to check the bundled files.
   Run `openspec --version` to check the separately installed CLI.
5. Read [AGENTS.md](AGENTS.md) and the
   [SDD command catalog](vendor/ai4se-plugins/commands/catalog.md).
   Project skills and custom agents are under `.agents/`. In an existing Qoder
   session, use `/skills reload` and `/agents reload`.

The bundled skills are already available after cloning. Do not run the original
plugin installer merely to use this baseline. Shell-based skill helpers require
Bash (for example Git Bash on Windows); their use depends on the selected skill.

## Project content

- [Knowledge base](docs/knowledge/_INDEX.md)
- [Requirement workspace](requirement-workspace/README.md)
- [OpenSpec workspace](openspec/README.md)
- [Harness scripts](scripts/README.md)
- [Bundled dependency versions and licenses](vendor/README.md)
- Application: `backend/` (Spring Boot API) and `frontend/` (React app)

CI runs on GitHub Actions (`.github/workflows/ci.yml`) for pushes and pull
requests to `main`: a backend job runs `mvn -B test` on Java 21, and a frontend
job runs `npm ci && npm run typecheck && npm run build` on Node 24. A browser
acceptance job installs Playwright Chromium and runs `npm run test:e2e`. The four
original harness scripts are intentional placeholders and exit with a message
until the project supplies an implementation, so CI does not invoke them.

## Run the application

REQ-001 serves a greeting that is stored in the database, not in the frontend.
REQ-002 makes `GET /api/greeting` return it as JSON and moves the embedded engine
from H2 to SQLite. The React home page parses the response and renders the
`message` field.

REQ-003 adds shared trips: `POST /api/trips` creates a trip and atomically
records the caller as organizer and member; `GET /api/trips/{id}` returns the
saved trip to members only (403 without values for non-members, 404 for unknown
ids). The frontend adds three screens on a hash router: `#/create` (US-001),
`#/trips/<id>` (US-002), and `#/` for the landing page. The original REQ-003
identity was the header-select scaffold (`X-User-Id`, seeded users 1–5, sample
trip readable by users 1–4); US-066 replaces it with verified login (see below).
Trip creation requires a name, destination and an end date not before the start
date; both locations are optional.

US-061 adds `GET /api/trips`, returning an array of the signed-in member's
trips with `id`, `name`, `destination`, `startDate` and `endDate`. An empty
array means the member has no trips; a signed-out request returns 401
`USER_REQUIRED`. The list does not filter or infer completion.

REQ-004 adds the invitation flow. On `#/trips/<id>` the organizer sees a panel
with the invitation link, a copy action and a QR encoding the same absolute URL
(`/api/trips/{id}/invitation`). Guests open `#/join/<token>` to preview the five
public fields and accept once (`/api/invitations/{token}` and
`/api/invitations/{token}/accept`); joining closes once the trip's main plan is
confirmed, and unknown links render a generic unusable page. The only product
path that sets `main_plan_confirmed` is the US-037
`/api/trips/{id}/main-plan/confirm` endpoint, so the invitation tests still write
the flag directly in SQLite.

REQ-019 adds member interests (US-019): `GET` and `PUT
/api/trips/{tripId}/preferences`. The `PUT` body is `{"interests":[<label>...]}`
over exactly ten Chinese labels (`水上运动`, `潜水`, `摄影`, `美食`, `咖啡`,
`历史人文`, `手作`, `自然风景`, `冒险`, `慢游`); matching is literal, duplicates
collapse keeping the first occurrence, and the array replaces the stored set as a whole (`[]`
clears it and keeps the row). One row per `(trip_id, user_id, kind)` stores
`{"codes":[...]}`, so labels are presentation and codes are storage. The `GET`
answers `{"members":[{"userId":n,"interests":[...]}]}` for every member of the
trip, ordered by `userId`, with `[]` for anyone who has not saved yet. The page
lives at `#/trips/<id>/preferences`, is linked from `#/trips/<id>`, follows
`ui-design-reference/screenshots/screen-08-preferences.png`, and is the
first TypeScript/Ant Design page: Save is explicit, a failed save rolls back to
the acknowledged set, and a failed load offers Retry instead of an empty state.

US-031-037 adds main itinerary planning. `GET /api/trips/{id}/main-plan/inputs`
aggregates ready members, common interests, the deduplicated must-do union, hard
budgets and the six fixed generation rules for any member. The organizer
generates a timed draft with `POST /api/trips/{id}/main-plan` (201; 409
`MEMBERS_NOT_READY` while members are pending, 409 `ALREADY_CONFIRMED` after
confirmation); any member reads it with `GET /api/trips/{id}/main-plan` (404
`NO_DRAFT` before the first generation, computed `stale` against preference
revisions). `POST /api/trips/{id}/main-plan/confirm` (200) validates the schedule
and hard budgets first (422 `VALIDATION_FAILED` with both error lists, 409
`STALE_DRAFT`), then freezes the draft and closes joining. The frontend adds
`#/trips/<id>/main-plan/inputs` (Screen 9) and `#/trips/<id>/main-plan`
(Screen 10), each with loading, empty, failure and permission states. The plan
provider is a fixture-backed fake (`FakeMainPlanProvider`); it reads the
`member_preference` rows that REQ-019 writes.

US-066 replaces the scaffold identity with verified login. `POST /api/auth/login`
accepts an email and password, establishes a server-side session cookie and
returns the account; `GET /api/auth/me` reports the current account and
`GET /api/auth/csrf` bootstraps the CSRF token used by state-changing requests.
Protected trip, invitation, main-plan, split and preference endpoints derive the
caller from the session; `X-User-Id` no longer authenticates anything. The
frontend serves a full-screen `#/login` (and `/login` for the split router) and
sends signed-out visitors there, except the public invitation preview, which
resumes after login without joining automatically. Demo-only seeded accounts
(shown on the login page in this demo build) share the password `gogo-demo-2026`:
`alice@example.com`, `ben@example.com`, `chloe@example.com`,
`daniel@example.com`, `eve@example.com`. There is no registration, password
reset or logout yet (US-067/068/069 own those).

US-038–043 add the split flow under `/trips/:tripId/split`: members start one
draft, select boundaries, generate paired routes and check the reunion window.
The split API keeps its `{data,error}` envelope and `401 MEMBER_REQUIRED`
contract, now with the caller taken from the session.

US-013 adds the member roster. `GET /api/trips/{id}/members` returns each
member once with `userId`, `displayName` and an `organizer` flag to an
authenticated member (401 `USER_REQUIRED` when signed out, 403 `NOT_A_MEMBER`
for an outsider, 404 `TRIP_NOT_FOUND`; denial bodies carry no member identity).
The 成员 tab (`#/members`) renders the roster with an organizer badge and
loading, empty, error, permission-denied and no-trip states; it deliberately
omits readiness, preference summaries and generation actions.

The database is SQLite at `backend/data/gogo.db`, opened with
`journal_mode=WAL`, `busy_timeout=5000` and `foreign_keys=on`, and the pool is
pinned to one connection because SQLite has a single writer. The Flyway
migrations create the schema and seed data on first start (`V1` greeting, `V2`
users/trips/members, `V3` invitations and the main-plan column, `V4` splits, `V5`
main-plan drafts/stops plus readiness and preference seeds, `V6` account
credentials, `V7` the `member_preference` table the preferences page writes with
`IF NOT EXISTS`); the application creates the `data/` directory itself, because
the SQLite driver creates the file but not its parent. `flyway-core` alone is on
the classpath: `flyway-database-nc-sqlite` has no published artifact for the
managed Flyway version, a gap recorded as TS-11 in the REQ-019 design. Delete
`backend/data/` to rebuild it.

Backend on port 8080:

```sh
cd backend
mvn spring-boot:run
```

Frontend on port 5173, proxying `/api` to the backend:

```sh
cd frontend
npm install
npm run dev
```

Typecheck the TypeScript sources with `cd frontend && npm run typecheck`
(`tsc --noEmit`). `checkJs` is off, so the four un-migrated `.jsx` pages are not
typechecked yet; the preferences page is TypeScript and is. The CI job runs the
same command after `npm ci` and before the build.

If Vite reports a missing native binding after updating the lockfile, run
`npm install --include=optional` in `frontend/` and start it again. Native
bindings are platform-specific optional dependencies.

Open http://localhost:5173/. Log in with a seeded demo account; the dashboard is
the landing page. Check the public API directly with
`curl -i http://localhost:8080/api/greeting`, which returns
`Content-Type: application/json` and the body `{"message":"Hello World"}`.
Protected calls require a session; the old `X-User-Id` curl is no longer
authenticated. For a cookie-based smoke call:

```sh
curl -s -c /tmp/gogo-cookies http://localhost:8080/api/auth/csrf
TOKEN=$(awk '$6=="XSRF-TOKEN" {print $7}' /tmp/gogo-cookies)
curl -s -b /tmp/gogo-cookies -c /tmp/gogo-cookies \
  -H "Content-Type: application/json" -H "X-XSRF-TOKEN: $TOKEN" \
  -d '{"email":"alice@example.com","password":"gogo-demo-2026"}' \
  http://localhost:8080/api/auth/login
curl -s -b /tmp/gogo-cookies -c /tmp/gogo-cookies \
  -H "Content-Type: application/json" -H "X-XSRF-TOKEN: $(awk '$6=="XSRF-TOKEN" {print $7}' /tmp/gogo-cookies)" \
  -d '{"name":"Day out","destination":"Singapore","startDate":"2026-12-05","endDate":"2026-12-05"}' \
  http://localhost:8080/api/trips
```

Get or set the signed-in caller's interests with:

```sh
curl -s -b /tmp/gogo-cookies http://localhost:8080/api/trips/1/preferences
curl -s -b /tmp/gogo-cookies \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $(awk '$6=="XSRF-TOKEN" {print $7}' /tmp/gogo-cookies)" \
  -X PUT -d '{"interests":["摄影","自然风景"]}' \
  http://localhost:8080/api/trips/1/preferences
```

Run the backend tests with `cd backend && mvn test` (`AuthApiTest`,
`SessionExpiryApiTest`, `GreetingApiTest`, `TripApiTest`, `InvitationApiTest`,
`PreferenceApiTest`, `MainPlanApiTest`, the split API suites and the unit
suites); they use the same SQLite engine and migrations as production.

For browser acceptance, install frontend dependencies and Chromium with
`npm ci` and `npx playwright install chromium` from `frontend`, then run
`npm run test:e2e`. Java 21 and Maven must be available. The runner starts
separate servers on ports 18080 and 15173 and uses a temporary file-backed
SQLite database with migrated synthetic accounts and dashboard fixtures; it
does not use the development database. The test wrapper removes the isolated
database after the servers stop. File backing lets acceptance tests compare
persisted state before and after navigation.
If Chromium cannot be downloaded, an already installed Microsoft Edge can be
selected explicitly with `GOGO_E2E_BROWSER_CHANNEL=msedge` (PowerShell:
`$env:GOGO_E2E_BROWSER_CHANNEL = 'msedge'; npm run test:e2e`).

Inspect the stored row without stopping the app (Python 3 ships `sqlite3`; no
separate CLI is needed):

```sh
cd backend
python -c "import sqlite3; c=sqlite3.connect('data/gogo.db'); print(c.execute('SELECT id, message FROM greeting').fetchall()); c.close()"
```

The engine and the media type follow the IO rulings of 2026-11-13: SQLite as
`TODO.md` line 13 requires, Flyway kept, and a JSON body. Maven must be able to
resolve `org.xerial:sqlite-jdbc` — through a corporate mirror locally, or Maven
Central on a CI runner.

## Create your own skill

Ask your agent: "Use skills-creator to turn my test-result reporting workflow
into a reusable skill." The [skills-creator](skills/skills-creator/SKILL.md)
helps define the trigger, inputs, output, instructions, and a practical trial.

Author project skills in `skills/<name>/SKILL.md`, then run:

```sh
node scripts/refresh-agent-assets.mjs
node --test scripts/portability.test.mjs
```

The refresh copies project skills into `.agents/skills/` and keeps their resource
links portable. Commit the source and generated copies together. The refresh
preserves skills with different names that already exist in `.agents/skills/`.

## Maintain the bundled assets

The AI4SE runtime sources and shared resources are under `vendor/ai4se-plugins/`.
Superpowers sources are under `vendor/superpowers/`. After updating these sources,
run `node scripts/refresh-agent-assets.mjs`, then the portability tests above.
The refresh reuses the AI4SE pack's copy projection and keeps resource links
relative. Commit the bundled sources and their copies under `.agents/` together.
