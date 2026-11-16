# Impact brief — REQ-001

- Date: 2026-11-13
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `req-001-hello-world`

## 1. Requirement set

| id | Path |
|---|---|
| REQ-001 | `requirement-workspace/requirements/REQ-001.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-001,
`requirement-workspace/intents/2026-11-13-req-001.md`,
`requirement-workspace/analysis/req-001-dor.md`.

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/_INDEX.md`, `docs/knowledge/{architecture,domain,external,interfaces,operations,rules}/README.md` | Slot READMEs only; no populated entries |
| KB harness policy | `scripts/README.md`, `scripts/kb-lint.sh` | `kb-lint.sh` prints `SKIP` and exits 0 by documented baseline policy; `verify-links.sh`, `archive-change.sh`, `init.sh` exit 1 (placeholders, measured) |
| Living Spec tree | `openspec/specs/` | Present but empty — `openspec list --specs` → "No specs found" |
| Post-archive SDD assets | `openspec/changes/archive/` | Present but empty (`.gitkeep` only) |
| Spec backend config | `openspec/config.yaml` | `schema: spec-driven`, no project context or rules set |
| Application code | `backend/`, `frontend/` | **Already present in the working tree, uncommitted** (`git status --short` → `?? backend/`, `?? frontend/`). Implemented and verified earlier in this session before artifacts were authored |
| CI configuration | `.github/` | Absent — no workflow exists |
| Frontend lockfile | `frontend/package-lock.json` | 51 `resolved` entries originally pointed at `https://artifact.oocl.com/artifactory/api/npm/npm-repository-virtual-external`; rewritten in the working tree to `https://registry.npmjs.org`. **Rewrite not yet re-verified with `npm ci`** |
| Repo docs | `README.md`, `TODO.md`, `AGENTS.md` | `README.md` still states "no application implementation" (modified in working tree); `TODO.md` still specifies SQLite |

Baseline classification: greenfield. The authority tree `openspec/specs/` exists
but holds no capability, and `README.md` documents the baseline as having no
application implementation. No competing spec root is introduced.

## 3. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | Empty | New capability `greeting` created at archive time from this change's delta spec |
| Backend service | None in the committed tree; `backend/` exists uncommitted with `GET /api/greeting`, `JdbcTemplate`, H2 file mode, Flyway `V1__create_greeting.sql` | Formalize as the `greeting` capability; keep H2 per OQ-1 |
| Frontend app | None committed; `frontend/` exists uncommitted, fetches `/api/greeting`, renders `h1`, dev proxy to `localhost:8080` | Formalize AC3 and reverse case AC3-N |
| `.github/workflows/` | Absent | Add a CI workflow: backend `mvn` build+test, frontend install+build |
| `frontend/package-lock.json` | Corporate-registry `resolved` URLs (unreachable from GitHub-hosted runners) | Public-registry `resolved` URLs so CI can install; local installs keep using the corporate registry via npm's `replace-registry-host` default |
| `README.md` | "This baseline has no application implementation or CI/CD pipeline" | Run instructions for both apps; record the SQLite→H2 substitution |
| `.gitignore` | No entry for generated DB files or service logs | Ignore `data/` and `logs/` |
| `docs/knowledge/**` | Slot READMEs | Checked, no impact — KB is not configured; `kb-lint.sh` remains a documented `SKIP` |
| `scripts/*.sh` | 3 placeholders exit 1, `kb-lint.sh` exits 0 | Checked, no impact — CI must not invoke the failing placeholders |
| `openspec/changes/archive/` | Empty | Checked, no impact until P5 |
| `TODO.md` | Specifies SQLite, contains the OQ-2 contradiction | Checked, left unchanged as the original requirement record; drift tracked as OQ-4 |

## 4. Blast radius

- New backend runtime: Spring Boot on port 8080, embedded H2 file at
  `backend/data/gogo.mv.db`. No external service dependency.
- New frontend runtime: Vite dev server on port 5173 proxying `/api` to 8080.
- New CI runtime: GitHub-hosted runners, public npm and Maven Central.
- Local port contention observed in this session: another project's
  `com.ai4se.staffing.StaffingApplication` held 8080 and its Vite servers held
  5173/5174. This is a developer-machine concern, not a product dependency.

## 5. Artifact impact

- Specs: new `openspec/changes/req-001-hello-world/specs/greeting/spec.md` (P2).
- Tests: backend acceptance test for AC2; frontend build check; AC1 and AC3
  verified by runtime evidence.
- Docs: `README.md`, `.gitignore`, this workdir, `docs/ai4se-plugins/` reports.
- KB entries: none (not configured).

## 6. Dual-track notes

Single vertical slice, one requirement, four scenarios. No story backlog is
needed: `/sdd:story-split` is Skipped with this rationale. OpenSpec track only.

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | GitHub-hosted runners cannot reach the corporate npm registry; a lockfile with private `resolved` URLs makes `npm ci` fail | blocking for CI, not for requirements | Mitigation designed (public-registry lockfile). **Unverified** — `npm ci` must be re-run locally and the CI run observed |
| R2 | No `gh` CLI on this machine (`gh: command not found`) and `api.github.com` returned HTTP 403, so CI run status cannot be read programmatically | blocking for CI evidence | P4 pipeline report must be Partial with named human confirmation, never an API-verified Pass |
| R3 | Port 8080 / 5173 contention with other local projects can kill or block the app during verification | operational | Recorded; verify by port owner plus endpoint response, not by Maven log alone |
| R4 | Implementation preceded P1–P3 artifacts (retro-alignment), so red-green ATDD order was not followed | process deviation | Disclosed here and in the intent capture; P4 re-verifies against the Delta Spec |
| R5 | `TODO.md` contradicts itself on Flyway (OQ-2) and still says SQLite (OQ-4) | requirement ambiguity | Non-blocking, deferred to IO/SA at G1 |

No critical blocker invalidates REQ-001, so split may proceed.

## 8. Suggested split boundaries

One change: `req-001-hello-world`, one new capability `greeting`.
The CI workflow is harness scope inside the same change (source 3); it changes no
product behavior and therefore gets no capability of its own.
Effort: small — 3 backend classes, 1 migration, 1 test, 5 frontend files,
1 workflow. No dependency ordering beyond backend-before-frontend verification.

---

# Impact brief — REQ-003 (2026-11-14)

Sections 1–8 above describe the REQ-001 baseline and are not authoritative for
this change. This section is self-contained.

## 9. Requirement set

| id | Path |
|---|---|
| REQ-003 | `requirement-workspace/requirements/REQ-003.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-003,
`requirement-workspace/intents/2026-11-14-req-003.md`,
`requirement-workspace/analysis/req-003-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md`.

## 10. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Backend | `backend/src/main/java/com/gogo/hello/` — `GreetingController`, `GreetingRepository`, `GreetingResponse`, `HelloApplication` | One capability, `JdbcTemplate`, no ORM. No trip code exists |
| Migrations | `backend/src/main/resources/db/migration/V1__create_greeting.sql` | One migration; next free version is `V2` |
| Config | `backend/src/main/resources/application.yml` | SQLite at `./data/gogo.db`, Flyway enabled |
| Backend tests | `backend/src/test/java/com/gogo/hello/GreetingApiTest.java` | One MockMvc acceptance test to model the new tests on |
| Frontend | `frontend/src/App.jsx`, `main.jsx` | One screen, no router, no component library, plain CSS absent |
| Frontend deps | `frontend/package.json` | React 19, Vite 8 only |
| CI | `.github/workflows/ci.yml` | Backend `mvn -B test`, frontend `npm ci && npm run build` |
| Living Spec | `openspec/specs/greeting/spec.md` | `trips` does not exist |
| Fixtures | — | `acceptance-test-fixtures.md` did not exist; authored in this change |

## 11. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | Only `greeting` | New capability `trips` created at archive time from this change's delta spec |
| Migrations | `V1` only | `V2__create_trip.sql` creating `app_user`, `trip`, `trip_member`, seeding five users and the fixture trip with four members |
| Backend code | `com.gogo.hello` only | New `com.gogo.trip` package: controller, repository, request/response records, error handling for the six `code` values |
| Backend tests | `GreetingApiTest` | New `TripApiTest` covering C1–C5-N and R1–R3-N |
| Frontend | Single greeting screen | Create screen and details screen, a shell that reaches both, and the required loading/error/denied states |
| Frontend deps | React, Vite | Possibly one routing dependency, decided at P3 (OQ-4); otherwise no new dependency |
| CI | Two jobs | Unchanged |
| Config | SQLite, Flyway | Unchanged |
| Docs | `README.md`, `docs/feedback/verification-*.md` | Run instructions and verification entries for the two endpoints |

## 12. Blast radius

- Runtime: same backend port 8080, same SQLite file, one new migration at startup.
- Data: three new tables and five seeded users. No existing table is altered, so
  the `greeting` capability is unaffected.
- API: two new paths. No existing path changes.
- CI: unchanged, but a new test class runs in the existing `mvn -B test` job.
- Local verification needs two concurrent identities (`X-User-Id: 2` and `: 5`)
  against the same running backend — no extra process required.

## 13. Artifact impact

- Specs: `openspec/changes/req-003-trip-create-and-view/specs/trips/spec.md` (P2).
- Tests: `TripApiTest` (backend); frontend verified by build plus browser checks.
- Docs: this workdir, `docs/ai4se-plugins/` stage reports, `README.md`.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 14. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R6 | `X-User-Id` is trusted without verification, so any caller can impersonate any user | accepted for a scaffold | Recorded in REQ-003 §Actors and must not be presented as a security control. Owner Dev/SA |
| R7 | `403` for a non-member reveals that the trip id exists | accepted | OQ-2 trade-off; wording follows the AC. Owner SA |
| R8 | The UI screenshots are unavailable (`ui-design-reference/` untracked) | advisory | Layout is a design judgement from AC text. Owner IO/BA |
| R9 | The React app has no router | advisory | Decide at P3; a new dependency is the fallback, not the default. Owner Dev |
| R10 | `req-002-greeting-json-sqlite` remains an active change | process | Different capability, no spec conflict; archive order is independent. Owner Dev |
| R11 | Seeding the sample trip in `V2` puts fixture data in every environment | accepted for a scaffold | Required so R1/R2 are reproducible without test-only setup. Owner Dev |

No critical blocker invalidates REQ-003, so split may proceed.

## 15. Suggested split boundaries

One change: `req-003-trip-create-and-view`, one new capability `trips`, two ADDED
requirements (creation, detail read).
Effort: medium — 1 migration, 4–6 backend classes, 1 test class, 2–3 frontend
screens, documentation. Ordering: migration → repository → endpoints → frontend,
with the details screen dependent on the create screen only through the trip id.

---

# Impact brief — REQ-004 (2026-11-14)

Sections 1–15 above describe REQ-001 and REQ-003 and are not authoritative for
this change. This section is self-contained.

## 16. Requirement set

| id | Path |
|---|---|
| REQ-004 | `requirement-workspace/requirements/REQ-004.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-004,
`requirement-workspace/intents/2026-11-14-req-004.md`,
`requirement-workspace/analysis/req-004-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md` §REQ-004.

## 17. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Backend | `backend/src/main/java/com/gogo/hello/` only | `com.gogo.trip` does not exist yet; REQ-003 is P2-complete, unimplemented |
| Migrations | `V1__create_greeting.sql` on disk; `V2__create_trip.sql` planned by REQ-003 | Next free version for this change is `V3`, after REQ-003's `V2` lands |
| Living Spec | `openspec/specs/greeting/spec.md` | `trips` exists only as REQ-003's pending delta; `invitations` does not exist |
| Active changes | `openspec list --json` | `req-002-greeting-json-sqlite`, `req-003-trip-create-and-view`; this change becomes the third |
| Frontend | `frontend/src/App.jsx`, `main.jsx`; `package.json` React 19 + Vite 8 | One screen, no router, no QR capability |
| UI reference | `git ls-tree group1/main ui-design-reference/` | Screens 04/05/06 present on `group1/main`, absent locally; extracted read-only for design |
| Fixtures | `requirement-workspace/acceptance-test-fixtures.md` | Extended with a REQ-004 section in this change |
| CI | `.github/workflows/ci.yml` | Two jobs, unchanged |
| Tooling | `gh` at `C:\Users\SUNJO\AppData\Local\Programs\gh\gh.exe`; `/d/nvm4w/nodejs/openspec` 1.16.1 | Board and issues readable; PATH openspec 1.6.0 must not be used |

## 18. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | `greeting` only | New capability `invitations` (four ADDED requirements) plus one ADDED `trips` requirement (main-plan state), merged at archive time |
| Migrations | `V1` (+ REQ-003 `V2` pending) | `V3__create_invitation.sql`: `trip_invitation` table; `ALTER TABLE trip ADD COLUMN main_plan_confirmed` default 0 |
| Backend code | `com.gogo.hello` (+ REQ-003 `com.gogo.trip` pending) | New `com.gogo.invitation` package: controller, repository, token generator, response records; three new `code` values |
| Backend tests | `GreetingApiTest` (+ REQ-003 `TripApiTest` pending) | New `InvitationApiTest` covering I1–I5, J1–J5, U1–U2 and reverse cases R-1/R-2 |
| Frontend | Greeting screen (+ REQ-003 create/details pending) | Invitation panel (link, copy, QR), join page (preview/accept/joined/closed/unusable), token route; one QR encoding dependency and the routing decision shared with REQ-003 OQ-4 |
| CI | Two jobs | Unchanged |
| Config | SQLite, Flyway | Unchanged |
| Docs | `README.md`, verification docs | Run instructions and verification entries for the invitation flow |

## 19. Blast radius

- Runtime: same backend port 8080, same SQLite file, one additive migration.
- Data: one new table; one new column on `trip` with a default, so REQ-003 rows
  and reads are unaffected. No existing column changes.
- API: three new paths (`POST /api/trips/{id}/invitation`,
  `GET /api/invitations/{token}`, `POST /api/invitations/{token}/accept`).
  No existing path changes.
- CI: unchanged; the new test class runs in the existing backend job.
- Ordering constraint: REQ-003 P4 must land first (its `V2` creates the tables
  this change alters and reads). P0–P3 of REQ-004 are independent of that.
- Local verification needs three identities (1 organizer, 2 member, 5 outsider)
  against one running backend, plus a test-only state flip for J4.

## 20. Artifact impact

- Specs: `openspec/changes/req-004-trip-invitations/specs/invitations/spec.md`
  and `specs/trips/spec.md` (P2).
- Tests: `InvitationApiTest` (backend); frontend verified by build plus browser
  checks including QR decode equality (I6).
- Docs: this workdir, `docs/ai4se-plugins/` stage reports, `README.md`.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 21. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R12 | REQ-003 unimplemented and G1 unsigned; REQ-004 P4 blocked until REQ-003 P4 | process, blocking for P4 only | Recorded; P0–P3 proceed. Owner Dev/IO |
| R13 | Main-plan state without a product mutation path may look like dead data | accepted | OQ-1; US-037 owns the flow; R-1 reverse case documents the absence. Owner SA |
| R14 | Preview exposes destination/dates before acceptance | accepted with tradeoff | OQ-2, from screen 05; IO confirms at G1 |
| R15 | QR encoding needs a new frontend dependency | advisory | OQ-6; MIT-licensed encoder preferred; corporate npm mirror applies. Owner Dev |
| R16 | `X-User-Id` remains unverified; invitation acceptance can be impersonated | accepted for a scaffold | Inherited from REQ-003 R6; never a security control. Owner Dev/SA |
| R17 | Three active changes coexist | process | Disjoint requirement sets; archive order independent except `trips` merge order. Owner Dev |

No critical blocker invalidates REQ-004, so split may proceed.

## 22. Suggested split boundaries

One change: `req-004-trip-invitations`, new capability `invitations` with four
ADDED requirements (issuance, preview, acceptance/joining, unusable) plus one
ADDED `trips` requirement (main-plan confirmation state).
Effort: medium — 1 migration, 4–6 backend classes, 1 test class, 2 frontend
surfaces plus states, one QR dependency decision. Ordering: migration →
repository → issue endpoint → preview/accept endpoints → frontend panel → join
page → verification. `/sdd:story-split` is Skipped: the three stories already
exist as GitHub issues.

---

# Impact brief — REQ-005 (2026-11-15)

Sections 1–22 above describe REQ-001, REQ-003 and REQ-004 and are not
authoritative for this change. This section is self-contained.

## 23. Requirement set

| id | Path |
|---|---|
| REQ-005 | `requirement-workspace/requirements/REQ-005.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-005,
`requirement-workspace/intents/2026-11-14-req-005.md` (incl. P1 continuation
2026-11-15), `requirement-workspace/analysis/req-005-dor.md`.

Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR
BLOCKERs = 0). Solution direction: **add** (new frontend-only `app-shell`
capability) → deep-dive Phase 2.5 in scope.

## 24. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Frontend shell frame | `frontend/src/App.jsx:29-48`, `frontend/src/app.css:51-60` | `.app` already centers a ≤430 px, 100 dvh column; identity scaffold bar renders on every route; no dock exists |
| Hash router | `frontend/src/App.jsx:8-27` | `parseRoute` handles `/`, `/create`, `/trips/<id>`, `/join/<token>`; unknown paths fall back to home; identity is App-level `useState`, survives hash changes |
| Pages | `frontend/src/pages/{Home,CreateTrip,TripDetails,Join,InvitationPanel}.jsx` | All five surfaces implemented and verified by REQ-001/003/004; Home owns a bottom `.actionbar`; CreateTrip back targets `#/` (`CreateTrip.jsx:52`) |
| Design tokens | `frontend/src/app.css:1-29`, `ui-design-reference/README.md` §一 | Token values already mirror the reference (brand `#0d9488`/`#06b6d4`, warm neutrals, radii 10/14/20/26, system font); reference present locally incl. `screen-01-dashboard.png` |
| Icons | `frontend/src/Icons.jsx` | Inline SVG set (109 lines); dock needs home/list/fork/users glyphs — existing set covers most, additions are local SVG, no dependency |
| Backend / migrations | `backend/src/main/java/com/gogo/{hello,trip,invitation}/`, `V1`–`V3` | Untouched by this story (issue #32: Backend no, Database no) |
| Living Spec | `openspec/specs/greeting/spec.md` | `greeting` only; `trips`/`invitations` are pending deltas of in-flight changes |
| Active changes | `openspec list --json` | `req-002-greeting-json-sqlite`, `req-003-trip-create-and-view`, `req-004-trip-invitations` (29/31 tasks); this change becomes the fourth |
| CI | `.github/workflows/ci.yml` | Two jobs (backend `mvn -B test`, frontend `npm ci && npm run build`); unchanged |
| Fixtures | `requirement-workspace/acceptance-test-fixtures.md` | Scoped to REQ-003/REQ-004; US-064 carries its own text-only verification table, so no fixture dependency at P1 |
| Tooling | `openspec` 1.9.0 on PATH (this machine); gh at `%LOCALAPPDATA%\Programs\gh\bin` | Change creation and board reads verified in this session |
| Working tree | `git status` on `sdd-req-005-trip-setup` (created from e904fff) | REQ-004 G2 Pass committed at e904fff; PR #30 and #31 merged during this session; REQ-005 P1 artifacts are added alongside without touching REQ-004 records |

Baseline classification: brownfield, frontend-only. Authority tree
`openspec/specs/` exists (`greeting`); no competing spec root is introduced.

## 25. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | `greeting` only | New capability `app-shell` (six ADDED requirements) created at archive time from this change's delta spec |
| `frontend/src/App.jsx` | Flat route switch + scaffold bar, no dock | Shell composition: frame + scaffold bar + routed page + fixed dock for in-app routes; join route bypasses the dock; route table gains the no-trip, `#/split`, `#/members` entries |
| New frontend components | — | Shell/dock component(s), no-trip empty-state page, 分队 and 成员 placeholder pages (text + link back to 行程) |
| `frontend/src/pages/CreateTrip.jsx:52` | Back link targets `#/` | Back targets the 行程 tab (story page-function table); form, validation and submit navigation unchanged |
| `frontend/src/app.css` | `.app` column exists; no dock styles | Dock styles (fixed bottom, safe-area inset, active highlight from brand tokens), content bottom padding so the dock never obscures `.actionbar`/content; placeholder/empty-state styles from existing tokens |
| `frontend/src/Icons.jsx` | Existing glyph set | Dock glyphs added locally if missing (inline SVG, no dependency) |
| Backend / migrations / API | `V1`–`V3`, three capability packages | **No change** (reverse case R-3) |
| CI | Two jobs | Unchanged; frontend build job covers the change |
| Docs | `README.md`, verification docs | Run/verification notes for the shell and the text-only tab walk |

## 26. Blast radius

- Runtime: frontend only; same Vite dev server and `/api` proxy; no new
  process, port, dependency or environment variable.
- Data: none. No migration, no schema or row change; existing reads reused.
- API: no new or changed path; `X-User-Id` contract unchanged.
- Navigation: hash route table gains three entries (no-trip 行程, `#/split`,
  `#/members`); existing four routes keep their paths and behavior; join
  exclusion is presentational (dock hidden), not a join-flow change.
- CI: unchanged; verification is browser-based (text-only tab walk) plus the
  existing frontend build job.
- Ordering: REQ-005 P4 needs the REQ-003/REQ-004 frontend code present — it is
  on the current branch; REQ-003 PR #30 and REQ-004 PR #31 are both merged
  (2026-11-15), so the stacking order is satisfied (R18 resolved).

## 27. Artifact impact

- Specs: `openspec/changes/us-064-mobile-app-shell/specs/app-shell/spec.md`
  (P2).
- Tests: no backend test change; frontend verified by build plus the story's
  text-only forward/reverse tab walk and re-run of existing acceptance
  behavior (S11).
- Docs: this workdir, `docs/ai4se-plugins/` stage reports, `README.md`.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 28. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R18 | REQ-004 PR #31 was open when P1 started; REQ-005 branches stack on that code | process, resolved | PR #31 merged 2026-11-15T06:23:20Z (gh verified); stacking order satisfied. Owner Dev/IO |
| R19 | Fixed dock can obscure Home's `.actionbar` or scroll content on short viewports; `100dvh`/safe-area need browser verification | advisory | Layout care at P3 (content bottom padding); verified in browser at P4, not by build alone. Owner Dev |
| R20 | Placeholder tabs could drift into fabricated demo data (the screenshot shows real-looking members/routes) | accepted risk, guarded | AC5 + reverse case R-2 assert honest text only; design scope in the story excludes the demo content. Owner IO |
| R21 | `X-User-Id` remains unverified (inherited scaffold) | accepted for a scaffold | Inherited from REQ-003 R6; switcher stays labeled 非登录. Owner Dev/SA |
| R22 | Four active changes coexist; `app-shell` is disjoint from all three delta sets | process | No spec conflict; archive order independent. Owner Dev |

No critical blocker invalidates REQ-005, so split may proceed.

## 29. Suggested split boundaries

One change: `us-064-mobile-app-shell` (renamed from `req-005-mobile-app-shell`
on 2026-11-15), new capability `app-shell` with six
ADDED requirements (shell frame; bottom dock navigation; dashboard placement;
trips placement + no-trip empty state; placeholder tabs; guest join exclusion).
The scenario count (11) would normally suggest considering 2–3 changes, but
every scenario shares the one shell frame: splitting frame from dock or
placements would produce halves that cannot render independently, violating
the independently-shippable check. One vertical slice, one gate cycle.
Effort: small–medium — App.jsx restructure, 1 shell/dock component, 3 new
pages (empty state + 2 placeholders), CSS additions, 1 back-target edit; no
backend, no migration, no new dependency. `/sdd:story-split` is Skipped: the
story already exists as GitHub issue #32.
# Impact brief — US-031-037 (appended 2026-11-15)

- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `us-031-037-main-itinerary` (created; renamed 2026-11-15 from `req-005-main-itinerary`, US-based naming by user ruling)
- Branch: `US-031-037-main-itinerary-planning` (renamed 2026-11-15 from `sdd-us-031-037-main-itinerary-planning`; sdd prefix dropped by user ruling)
- Merge note 2026-11-15: origin/main now includes REQ-003/004 (PR #30/#31; local merge 4e6b261). The OQ-9 trigger fired and convergence was ruled at P2: append **V4+** (3 new tables + 2 `trip_member` columns), **no `trip` ALTER**, confirmed version derived from draft status. §2 below is restated against the post-merge baseline; R1/R2 are closed accordingly. G1 C2 amendment (user-selected default A, 2026-11-15): `member_preference` belongs to REQ-019's V4 (kind/payload shape, `feat/travel_preference`); this change renumbers to **V5** with only 2 new tables + the 2 `trip_member` columns and reads kind rows read-only; SA Lumi re-confirmed 2026-11-15.

## 1. Requirement set

| id | Path |
|---|---|
| US-031-037 | `requirement-workspace/requirements/US-031-037.md` |

Supporting: `intents/2026-11-15-us-031-037.md`, `analysis/us-031-037-dor.md`,
`deep-dive.md` §US-031-037, `acceptance-test-fixtures.md` §US-031-037.

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/_INDEX.md` + slot READMEs | slots only; rules/ README only — P0 rules apply skipped by user ruling 2026-11-15 (disclosed, not re-applied) |
| Living Spec tree | `openspec/specs/greeting/spec.md` | greeting only; REQ-003/004 code is merged but their `trips`/`invitations` deltas are not archived/synced yet; main-itinerary absent |
| Archived SDD assets | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | present |
| Active changes | `openspec/changes/req-002-greeting-json-sqlite/`, `req-003-trip-create-and-view/`, `req-004-trip-invitations/` | REQ-002 P4/P5 authored, gates unrecorded, archive pending; REQ-003/004 G2 Pass and merged (PR #30/#31), P5/G3/archive pending — all unrelated to US-031-037 |
| Application code | `backend/` `hello` + `trip` + `invitation` packages, Flyway V1–V3; `frontend/` Home / CreateTrip / TripDetails / InvitationPanel / Join | trip, member and invitation schema + code are local; no readiness, preference or main-plan schema/code |
| REQ-003/004 baseline | merged into `origin/main` (PR #30/#31) | V2 seeds users 1–5 + the fixture trip and its four members; V3 adds `trip_invitation` and `trip.main_plan_confirmed`; accept endpoint available locally |
| Fixtures | `acceptance-test-fixtures.md` | REQ-001..004 sections plus §US-031-037 (P2: paths, statuses and wire field names contractual) |
| CI | `.github/workflows/ci.yml` | present; no structure change proposed |

## 3. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | greeting only | new capability `main-itinerary` at archive time |
| Backend | hello + trip + invitation packages, V1–V3 (merged baseline) | new main-itinerary package (controller/service/repository + MainPlanProvider port with fake implementation); Flyway V5 (G1 C2 default A, user-selected 2026-11-15: REQ-019's kind/payload `member_preference` takes V4): 2 new tables (main_plan_draft, main_plan_stop) + `trip_member.ready` / `preference_revision`; no `trip` ALTER; `member_preference` kind rows read-only; V5 seeds readiness + interest/must_do kind rows for the fixture trip; SA Lumi re-confirmed 2026-11-15 |
| Frontend | greeting + trip create/detail + invitation/join pages | Screen 9 generate + Screen 10 review/confirm routes with four mandatory states |
| Fixtures | REQ-001..004 sections | §US-031-037 state setup + M/V request matrix |
| Registry/handoff | REQ-001/002 rows | US-031-037 row + session handoff note |
| CI / KB / scripts | present | checked, no impact |

## 4. Blast radius

- Same runtimes/ports (8080 backend, 5173 Vite proxy) and same SQLite file; two new tables plus two `trip_member` columns (V5; REQ-019's V4 `member_preference` read-only, G1 C2 amendment); `trip` and `trip_invitation` untouched.
- No external service dependency; fake provider deterministic (fixture stops).
- Cross-capability touchpoint: sets `trip.main_plan_confirmed` consumed by the now-local REQ-004 accept (code unchanged); the confirm flow supersedes REQ-004's test-only confirmed-state setup for trips confirmed here.

## 5. Artifact impact

- Specs: `openspec/changes/us-031-037-main-itinerary/specs/main-itinerary/spec.md` (P2), ADDED requirements per US with independently numbered ACs.
- Tests: backend acceptance matrix M1–M14/V1–V7 + reverses; frontend E2E Screens 9/10 incl. four states; J4 `JOINING_CLOSED` E2E now runnable locally; test-only DB setup for pending/overrun/stale/null-locations.
- Docs: workdir artifacts, `docs/ai4se-plugins/` reports at P4/P5.

## 6. Dual-track notes

OpenSpec track only; `/sdd:story-split` Skipped — two US, one capability, one
vertical slice within the REQ-004 size baseline.

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | Flyway/schema collision when remote REQ-003/004 PRs merge | closed at P2 (OQ-9); amended at G1 C2 | Trigger fired 2026-11-15 (PR #30/#31 merged). Convergence ruled: append V4+ (3 tables + 2 `trip_member` columns), no `trip` ALTER, confirmed version from draft status; SA Lumi confirmed at G1 (Pass, 2026-11-15; SA designation updated from Johnson by user statement 2026-11-15). G1 C2 default A (user-selected 2026-11-15) amends the shape: REQ-019 kind/payload `member_preference` takes V4, this change at V5 with 2 new tables; SA Lumi re-confirmed 2026-11-15; write-sync alignment with `feat/travel_preference` (SA evelyn.huang) = non-gating follow-up F1 |
| R2 | JOINING_CLOSED E2E unverifiable locally (accept endpoint remote-only) | closed at P2 (DoR W1) | REQ-004 accept is merged locally, so the full J4 E2E runs in this change's ATDD (P3); no staged-verification residue |
| R3 | Rules carrier not applied (user skipped P0) | process deviation, disclosed | P2/P4 rely on AGENTS.md + REQ-002/004 conventions; user ruling 2026-11-15 |
| R4 | REQ-002 archive/push pending on main | unrelated | no action in this change |

No critical blocker invalidates US-031-037; split may proceed.

## 8. Suggested split boundaries

One change `us-031-037-main-itinerary`, one ADDED capability `main-itinerary`.
Effort: medium ≈ REQ-004 baseline — 2 new tables + 2 `trip_member` columns (V5,
after the G1 C2 amendment; no `trip` ALTER), 2 write + 2 read endpoints (3 wire projections), 2 screens, ~25+
acceptance tests (M1–M14 / V1–V7 + reverses). Ordering: backend contract and
seeds first, frontend screens second; G1 to rule data model/API contract as a
named decision item (capability-pack convention).

# Impact brief — US-013 (appended 2026-11-16)

- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR
  BLOCKERs = 0)
- Change id: `us-013-view-trip-members`
- Branch: `US-013-view-trip-members-planning` (from `group1/main` `729a889`)

## 1. Requirement set

| id | Path |
|---|---|
| US-013 | `requirement-workspace/requirements/US-013.md` |

Supporting: `requirement-workspace/intents/2026-11-16-us-013.md`,
`requirement-workspace/deep-dive.md` §US-013,
`requirement-workspace/analysis/us-013-dor.md`.

Solution direction: **add** (member-only read in the existing `trips`
capability, plus a MODIFIED `app-shell` placeholder requirement).

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| `trips` Living Spec | `openspec/specs/trips/spec.md` | Identity, creation, detail read and main-plan state; no member-list requirement |
| `app-shell` Living Spec | `openspec/specs/app-shell/spec.md` | `#/members` is the 成员 tab target; `Placeholder tabs` currently requires a not-implemented placeholder for 成员 |
| Trip backend | `backend/src/main/java/com/gogo/trip/TripController.java`, `TripRepository.java`, `TripResponse.java`, `TripApiException.java`, `TripErrorAdvice.java` | `GET /api/trips/{id}` uses `X-User-Id`, checks trip existence then membership, and returns raw DTOs; no member-list method |
| Schema | `backend/src/main/resources/db/migration/V1..V3, V5` | `V2__create_trip.sql` creates `app_user`, `trip`, `trip_member(trip_id, user_id)` and seeds users 1–5 plus the fixture trip/members; no new table needed |
| Invitation membership | `backend/src/main/java/com/gogo/invitation/`, `openspec/specs/invitations/spec.md` | Accept inserts one `trip_member` row per (trip, user); composed, not modified |
| Main-plan read | `backend/src/main/java/com/gogo/mainplan/`, `openspec/specs/main-itinerary/spec.md` | Owns readiness/preference inputs; US-013 does not read or expose them |
| Frontend routing | `frontend/src/App.tsx:14-38`, `frontend/src/TabBar.tsx` | `#/members` parses to `members`; 成员 tab is active; members page is a `Placeholder` |
| Frontend pages | `frontend/src/pages/Placeholder.tsx`, `frontend/src/pages/TripDetails.jsx`, `frontend/src/pages/MainPlanInputs.tsx` | Existing `Placeholder`, trip details and state-driven fetch patterns; no members page |
| API client | `frontend/src/api.ts` | Sends `X-User-Id`; returns status/ok/data; reused unchanged |
| Design reference | `ui-design-reference/README.md` node 7, `ui-design-reference/screenshots/screen-07-members.png` | Member row, avatar stack, organizer badge, readiness ring (ring and preferences excluded by the issue) |
| Fixtures | `requirement-workspace/acceptance-test-fixtures.md` §Users / §Sample trip | Users and trip fixed; no §US-013 section yet |
| CI | `.github/workflows/ci.yml` | Backend `mvn -B test`, frontend `tsc -b && vite build`; job contents unchanged. Trigger broadened to all branch pushes by user instruction 2026-11-16, so the feature branch produces its own run. |
| Split branch | `sdd-req-004-split-planning` (unmerged) | Not part of this baseline; `V4__splits.sql` and split UI are absent on `group1/main`; no conflict in this change |
| Active changes | `openspec/changes/` | `req-002-greeting-json-sqlite` only; this change becomes the second |

Baseline classification: brownfield. Authority tree `openspec/specs/` exists and
holds `trips`/`app-shell`; no competing spec root is introduced.

## 3. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/trips/spec.md` | No member-list requirement | **ADDED** "Trip member list read": `GET /api/trips/{id}/members`, member-only, roster projection, organizer flag, denial without identities |
| `openspec/specs/app-shell/spec.md` | 成员 tab renders a not-implemented placeholder | **MODIFIED** "Placeholder tabs": 成员 renders the real roster; 分队 stays a placeholder; frame/dock/active-tab/scaffold unchanged |
| `TripController` | `GET /{id}` + `POST /{id}/main-plan:confirm` | Add `GET /{id}/members`; reuse `caller()`, trip-existence and membership checks |
| `TripRepository` | `findUserId`, `create`, `findById`, `isMember`, `confirmMainPlan` | Add `findMembers(tripId)` read query over `trip_member` + `app_user` + `trip.organizer_id`, ordered by `user_id` |
| New DTO | — | `TripMemberResponse` / list envelope `{tripId, members[]}` with `userId`, `displayName`, `organizer` |
| Frontend `App.tsx` | `members` route renders `Placeholder` | Render `Members` page for `route.page === 'members'`; keep `#/members` and active-tab mapping; resolve last-opened trip |
| New frontend page | — | `frontend/src/pages/Members.tsx` (TS): fetch roster, member rows, organizer badge, count, loading/empty/error/permission/no-trip states |
| `frontend/src/app.css` | Existing token components (`card`, `av`, `pill`, `hint`, `empty-state`) | Reuse existing classes; add only what the member row needs, using current tokens |
| Fixtures | Users/trip common section | Add §US-013 requests, wire projection, error contract and deliberately unfixed values |
| Database / migrations | `V1..V3, V5` | **No change** |
| Invitations / main-plan / split | Existing code/specs | **No change** |

## 4. Blast radius

- Runtime: one new backend read endpoint in the Spring Boot monolith; one new
  frontend page inside the existing shell. Same process, port, database file
  and `/api` proxy.
- Data: read-only. No migration, no schema/seed change, no write path.
- API: additive `GET /api/trips/{id}/members`; existing `trips` endpoints keep
  their paths, bodies and behavior. Error vocabulary reused.
- Navigation: `#/members` keeps its path and 成员 active-tab rule; only the page
  content changes. No list-all endpoint is introduced.
- Access control: inherits the scaffold contract; outsiders receive 403 with no
  identities.
- CI: job contents unchanged; the trigger now covers all branch pushes (user
  instruction 2026-11-16), so the feature branch produces its own run. Backend
  tests cover the new endpoint, frontend build covers the
  new page.
- Ordering: no dependency on the unmerged split branch; US-013 starts from
  `group1/main`, which already has REQ-003/004, US-031-037 and US-064.

## 5. Artifact impact

- Specs: `openspec/changes/us-013-view-trip-members/specs/trips/spec.md`
  (ADDED) and `.../specs/app-shell/spec.md` (MODIFIED).
- Tests: backend API tests for S1–S10 (status, rows, organizer flag, denial
  bodies); frontend browser verification for U1–U3 and the existing shell walk.
- Docs: this workdir, `requirement-workspace/registry.md`, `handoff.md`,
  `docs/ai4se-plugins/` stage reports, `README.md` run notes at P4.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 6. Dual-track notes

- OpenSpec track: one change, two delta files (one ADDED `trips` requirement,
  one MODIFIED `app-shell` requirement), one G1 cycle.
- Agile track: issue #9 already exists as the story; no new story file. The
  board card is already in `Req Analysis`.
- `/sdd:story-split` is Skipped (one existing story). `/sdd:proposal-split`
  produces one change.

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R30 | Exposing preference/readiness data by copying Screen 7 too literally | scope, guarded | Delta excludes those fields; S10 asserts absence. Owner IO/Dev |
| R31 | `app-shell` placeholder requirement contradicts the shipped member list if not modified | spec conflict, blocked by design | MODIFIED requirement at P2; archive must merge it. Owner SA/Dev |
| R32 | The unmerged split branch uses `MEMBER_REQUIRED` for a missing identity while this change uses `USER_REQUIRED` | cross-branch vocabulary, advisory | Follow merged `trips`/`main-itinerary` precedent; flag at split-merge review. Owner SA |
| R33 | No durable trip selection on `#/members`; reload loses the last trip | UX, advisory | P3 choice; the no-trip guidance state is contractual. Owner Dev/IO |
| R34 | Ordering drift if the query is unordered | testability, guarded | Ascending `userId` fixed in D2/fixtures. Owner Dev |
| R35 | Stack-plan names AntD 5 + TanStack Query v5 but the merged frontend uses token CSS + plain fetch | stack deviation, accepted for this slice | Follow the actual baseline; adopting the planned stack is a separate migration (US-065/US-066). Recorded in the proposal. Owner Dev/SA |
| R36 | Outsider denial body leaking names through messages | security, guarded | Generic message; S3 asserts no identity fields. Owner Dev/SA |
| R37 | CI trigger broadened to all branch pushes by user instruction 2026-11-16 | process, accepted | Job contents unchanged; the branch produces its own run so G2 can cite fresh CI without a main PR. Owner Dev/IO |

No critical blocker invalidates US-013, so split may proceed.

## 8. Suggested split boundaries

One change: `us-013-view-trip-members`, one vertical slice from migration-free
read to Screen 7. The scenario count (13) is small; the backend and frontend
halves are not independently shippable (the screen needs the read, the read is
verified through the screen's states), so splitting would create two
unverifiable halves. Effort: small — one controller method, one repository
query, one DTO, one TS page, one placeholder requirement modification, fixtures
and tests. No backend package, migration or dependency change; the CI job
contents are unchanged, only the trigger was broadened to all branch pushes.
