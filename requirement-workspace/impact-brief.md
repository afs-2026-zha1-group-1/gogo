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

# Impact brief - US-049-050 (appended 2026-11-16)

## 1. Requirement set

| Item | Path |
|---|---|
| Requirement entry | `requirement-workspace/requirements/US-049-050.md`（BQ-1..BQ-9，blocking 全 resolved） |
| Intent capture | `intents/2026-11-16-us-049-050-split-confirm-cancel.md`（#21/#22 逐字 AC） |
| DoR | `analysis/us-049-050-dor.md`（BLOCKER = 0；⑨–⑫ 全 Pass） |
| Deep-dive | `deep-dive.md` §US-049-050 |
| Fixtures | `acceptance-test-fixtures.md` §US-049-050（CF1–CF6 / CN1–CN4 / R1–R2） |

## 2. As-is asset inventory (evidence paths)

| Asset | State | Evidence |
|---|---|---|
| Living Spec `splits` | 5 requirement，显式声明不实现确认/取消 | `openspec/specs/splits/spec.md` |
| 后端 splits 包 | 5 端点、`MemberGuard`、`SplitDraftService`、`SplitDraftRepository`、`SplitDraftDocument`、`ReunionTimingCalculator`、夹具 provider | `backend/src/main/java/com/gogo/hello/splits/**` |
| 数据库 | V4 已建 `split_draft`（`trip_id UNIQUE`）与 `plan_node` | `db/migration/V4__splits.sql` |
| 错误码 | 13 码共用枚举（含 `NOT_SPLIT_INITIATOR`、`SPLIT_DRAFT_NOT_ACTIVE`、`STALE_DRAFT_VERSION`） | `common/ErrorCode.java` |
| 后端测试 | `AbstractSplitApiTest` + 4 个 API 测试 + 域/仓储/provider 测试 | `backend/src/test/java/com/gogo/hello/splits/**` |
| 前端 | Screen 11–14（`features/split/*`），`router.tsx` 注释声明「flow ends at timing」 | `frontend/src/features/split/**`、`router.tsx` |
| 设计参考 | Screen 15 截图存在 | `ui-design-reference/screenshots/screen-15-confirm.png` |
| 技术基准 | tech-stack-plan 绑定实现口径 | `docs/knowledge/architecture/tech-stack-plan.md` |

## 3. As-is → proposed delta

| # | Delta | Kind |
|---|---|---|
| 1 | 新增确认要求（组织者、服务端从草稿复算、成对提交、锁定） | ADDED requirement |
| 2 | 新增取消要求（发起人、`status=cancelled`、清除 split 路线节点、允许替换） | ADDED requirement |
| 3 | `startDraft` 扩展：行存在且 `cancelled` → 同行重建（`draftVersion = 1`） | MODIFIED requirement（G requirement） |
| 4 | 修正链级约定漂移：`X-Member-Id`→`X-User-Id`、`trip.split_draft` 列→`split_draft` 表、V2→V4 | MODIFIED requirement（Chain 约定） |
| 5 | 错误枚举 +2：`NOT_SPLIT_ORGANIZER` 403、`SPLIT_TIMING_INFEASIBLE` 409（附明细） | 契约扩展 |
| 6 | 新端点 `POST .../split-draft:confirm`、`POST .../split-draft:cancel`（无 schema 变更） | 契约扩展 |
| 7 | Screen 15 路由 `/trips/:tripId/split/confirm` + 四态 + 两终态展示 | 前端新增 |

## 4. Blast radius

- **修改**：`SplitDraftController`、`SplitDraftService`、`SplitDraftRepository`、`domain/SplitDraftDocument`、`common/ErrorCode`、新增两个 DTO；`SplitDraftStartApiTest`（重建语义）；前端 `features/split/*`、`router.tsx`。
- **新增**：`SplitConfirmApiTest`、`SplitCancelApiTest`、`screen-confirm.tsx`（+ 可能的共享状态条组件）。
- **不动**：greeting / trip / invitation / mainplan 包；`V1–V5` 迁移（无新迁移）；`.github/workflows/ci.yml`；app-shell 导航（不新增 tab）。
- **文档**：Living Spec `splits`（P2 delta）、tech-stack-plan API 清单（P5 对账）、`registry.md`、`handoff.md`。

## 5. Artifact impact

| Artifact | Impact |
|---|---|
| `openspec/specs/splits/spec.md` | P2 delta：MODIFIED（Chain 约定 + Split draft start）+ ADDED（confirm、cancel） |
| `openspec/changes/us-049-050-split-confirm-cancel/` | proposal（P1）→ delta/design/tasks（P2–P3）→ ATDD 矩阵 |
| `acceptance-test-fixtures.md` | 已追加 §US-049-050（P1） |
| `api.ts` / `types.ts`（frontend） | 新增两个请求方法与状态枚举 |
| `docs/knowledge/architecture/tech-stack-plan.md` | P5 归档时补 API 清单两行 |

## 6. Dual-track notes

OpenSpec track only；`/sdd:story-split` Skipped（两条 US、同一 capability、一个垂直切片，issue 已在看板）。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | Living Spec 漂移导致新契约基于幻影身份/表结构 | high | closed by BQ-4：本 delta 以 MODIFIED 收敛（P2 必须落地） |
| R2 | 取消删除 split 路线节点可能与「主线不变」验证口径混淆 | med | closed by BQ-7 + 夹具 CN1 逐行比对（`branch_id='main'`） |
| R3 | 确认后锁定依赖既有写端点的 `SPLIT_DRAFT_NOT_ACTIVE` 语义，若缺失会漏锁 | med | 现有实现已在 `saveBoundaries`/`generateRoutes` 检查活跃态；P3 设计追加「已 confirmed 时同样 409」的反向用例 |
| R4 | `main` 直开发无 PR 审查环节 | med | 用户 2026-11-16 裁决；以 G1（设计冻结）+ G2（本地验证 + main CI）+ G3 签核补偿 |
| R5 | 新增两个错误码扩展契约枚举 | low | 已列入 delta；G1 由 IO 复核 |
| R6 | 旧 change 残留（`req-002-greeting-json-sqlite`、空壳 `req-004-split-draft-start`）干扰 active-change 探测 | low | 不影响本变更构建；记作 follow-up |

No critical blocker invalidates US-049-050; split may proceed.

## 8. Suggested split boundaries

One change `us-049-050-split-confirm-cancel`（用户 BQ-1 裁决）。Effort: **small-medium** — 2 个写端点、2 个新错误码、无迁移、1 个新屏幕、~12 条验收 case（CF/CN + 反向）。Ordering: 后端契约（守卫/状态机/复算/锁）→ 前端 Screen 15 → ATDD 矩阵；无并行轨道。

# Impact brief — REQ-008 (US-066, 2026-11-16)

Sections 1–45 above describe REQ-001 through the discarded US-013 draft and are
not authoritative for this change. This section is self-contained.

## 38. Requirement set

| id | Path |
|---|---|
| REQ-008 | `requirement-workspace/requirements/REQ-008.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-008,
`requirement-workspace/intents/2026-11-16-req-008.md`,
`requirement-workspace/analysis/req-008-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md`.

Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR
BLOCKERs = 0), refreshed after G1 C1–C4. Solution direction: **add** new `auth`
capability, **modify** `trips`/`invitations` identity and `app-shell`
login/identity surface, and migrate the living `main-itinerary` and `splits`
identity boundaries to the session → deep-dive Phase 2.5 in scope.

## 39. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Living Spec — trips | `openspec/specs/trips/spec.md` | Caller identity is the `X-User-Id` header; creation/detail/permission requirements built on it |
| Living Spec — invitations | `openspec/specs/invitations/spec.md` | Preview is identity-free; issuance/acceptance use the header; `USER_REQUIRED` precedence is specified |
| Living Spec — app-shell | `openspec/specs/app-shell/spec.md` | Every in-app route renders the shell; identity switcher labeled 非登录 sets the header; join is full-screen; `#/` is the dashboard/home |
| Living Spec — greeting | `openspec/specs/greeting/spec.md` | Public read endpoint; unchanged |
| Living Spec — main-itinerary | `openspec/specs/main-itinerary/spec.md` §"Authorization and identity for main-plan operations" | Four main-plan endpoints still name `X-User-Id`; frontend `MainPlan.tsx`/`MainPlanInputs.tsx` receive `userId` |
| Living Spec — splits | `openspec/specs/splits/spec.md` (5 requirements; Purpose still says `X-Member-Id` while code uses `X-User-Id`) | Five split-draft endpoints use `X-User-Id`; frontend `features/split/*` sends the header and renders an identity bar; `MemberGuard` returns `MEMBER_REQUIRED` with the `{data,error}` envelope |
| Backend identity — trips/invitations | `backend/src/main/java/com/gogo/trip/TripController.java:30,52,65-68`; `backend/src/main/java/com/gogo/invitation/InvitationController.java:24,37,45-49` | No session, principal or credential; header parsed per controller |
| Backend security stack | `backend/pom.xml` | No `spring-boot-starter-security`; no password encoder, session store or auth filter |
| Database | `V1`–`V5` (`V4__splits.sql`, `V5__create_main_plan.sql`) | `app_user(id, display_name)` only; no email, password, credential or session table; `V6` is the next free migration |
| Frontend identity | `frontend/src/api.ts:16-27`; `frontend/src/App.tsx`; `frontend/src/router.tsx`; `frontend/src/features/split/api.ts:36`, `identity.tsx` | Every request sends `X-User-Id`; the scaffold switcher renders in the shell and the split feature has its own identity bar |
| Frontend routes/pages | `frontend/src/App.tsx`; `frontend/src/router.tsx`; `frontend/src/pages/{CreateTrip,TripDetails,Join,InvitationPanel,MainPlan,MainPlanInputs}.*`; `frontend/src/features/split/*` | Pages receive `userId` props; no login route or guard; join preview is public; main-plan and split routes are in-app pages |
| Backend tests | `backend/src/test/java/com/gogo/{trip,invitation,mainplan}/*.java`; `backend/src/test/java/com/gogo/hello/splits/**` | MockMvc tests drive identity with `.header("X-User-Id", …)`; greeting test is public; 4 splits test classes use the header |
| Fixtures | `requirement-workspace/acceptance-test-fixtures.md` (users, sample trip, main-plan and splits matrices, REQ-008 section) | Alice 1 … Eve 5, sample trip; credentials added in REQ-008 |
| UI reference | issue #38 attachment; `ui-design-reference/screenshots/` (no login screen); `AGENTS.md` | Login screenshot exists only on the issue; local prototype HTML has no login markup; Ant Design is the UI reference; current app uses custom tokens/CSS |
| Binding plan | `docs/knowledge/architecture/tech-stack-plan.md` §2, §6 | States "MVP 不做账号体系 / 权限 / 注册登录", identity = invite code + nickname, `X-Member-Id`; no auth/session design |
| CI | `.github/workflows/ci.yml` | Backend `mvn -B test`, frontend `npm ci && npm run build`; unchanged structure |
| Board | issue #38; Project #2 card | Backlog → assigned `elian-jiang`, moved to `Req Analysis` 2026-11-16 (pick evidence) |
| Downstream | issues #39 (US-067), #40 (US-068), #41 (US-069) | Backlog, unassigned; all consume this story's login/session |

Baseline classification: brownfield identity-boundary replacement on top of the
newly merged main-plan work. No new authority root; the deviation from the
binding plan is explicit.

## 40. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/auth` | Does not exist | New capability with ADDED requirements: credential login; server session and protected access; CSRF; public surfaces; login page + post-login resume |
| `openspec/specs/trips/spec.md` | Caller identity = `X-User-Id` header | MODIFY "Trip caller identity": session principal; header no longer authenticates; 401 `USER_REQUIRED`/403 codes preserved; creation/detail behavior unchanged |
| `openspec/specs/invitations/spec.md` | Issuance/accept use the header; preview public | MODIFY issuance/accept identity to the session principal; keep preview public, identity-error precedence and all join outcomes |
| `openspec/specs/app-shell/spec.md` | Switcher labeled scaffold sets the header; every route in shell | MODIFY: switcher removed; signed-in name read-only; `#/login` full-screen without dock; shell pages require sign-in; frame/dock/join exclusion unchanged |
| `openspec/specs/main-itinerary/spec.md` | Identity requirement names `X-User-Id` | MODIFY "Authorization and identity for main-plan operations": session principal; organizer/member outcomes and `USER_REQUIRED` code stay |
| `openspec/specs/splits/spec.md` | Five split-draft requirements name a member/header identity; `MEMBER_REQUIRED` + `{data,error}` | MODIFY all five identity phrases to the session principal; keep `MEMBER_REQUIRED` and the envelope as documented exceptions; no split behavior change |
| Database | `V1`–`V5`; `V6` free | ADD `V6__create_account_credential.sql`: credential table (user_id PK/FK, unique email, BCrypt hash) and seed rows for users 1–5; no other schema change |
| Backend dependencies | No security starter | ADD `spring-boot-starter-security` (BCrypt, session/CSRF support); no ORM/JWT/Spring Session |
| Backend auth surface | None | ADD `AuthController` (`POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/csrf`), credential repository and `UserDetailsService`; JSON 401/403 handling |
| Backend controllers | Trip/invitation/main-plan/splits parse `X-User-Id` per method | Read the authenticated principal instead; same statuses/codes and permission rules; splits keeps `MEMBER_REQUIRED`/envelope |
| Error contract | Trip/invitation/main-plan flat `{code,message}`; splits `{data,error}` | ADD flat `{code,message}` for auth + Security handlers; document splits as the only envelope exception; no third shape |
| Security configuration | None | ADD `SecurityFilterChain`: public login/CSRF/greeting/invitation-preview/static; authenticated everything else; CSRF cookie token; session fixation protection; configurable timeout; no form-login or logout surface (US-069 owns logout) |
| Frontend API client | Sends `X-User-Id` | Remove header; same-origin cookies; attach CSRF header on state-changing requests; surface 401 to the auth layer |
| Frontend app shell | Hard-coded users + switcher on every route | Auth bootstrap (`me`), signed-in/out state; remove switcher/list; read-only signed-in name; route guard; `#/login` full-screen; join preview stays public |
| Frontend pages | Receive `userId` props and pass it to `api()` | Remove identity props across create/details/join/invitation/main-plan/split pages; authorization display derives from the authenticated account and server data |
| Login page | None | ADD dedicated full-screen login page (email/password, busy, generic error), Ant Design language + existing tokens; no dock |
| Pending invitation resume | None | Store the invitation token while signed out; after login return to the same `#/join/<token>` preview; never auto-accept |
| Fixtures | Users/trip/main-plan values only | ADD credential emails + documented demo password and auth request cases (valid, invalid, no session, expired, header-only, CSRF, pending invitation) |
| Tests | Header-driven MockMvc across trip/invitation/main-plan/splits | Rewrite identity setup to login/session; ADD auth tests (login, `me`, 401, CSRF, fixation, expiry); business assertions unchanged |
| Docs | README, workdir, stage reports | Document demo credentials, login flow, public/protected surfaces; archive-time tech-stack reconciliation |
| CI | Two jobs | Unchanged structure; backend adds the security dependency, frontend build covers the login page |

## 41. Blast radius

- Backend runtime: Spring Security filter chain wraps every request; session
  state is held in the single Spring Boot instance (no external store).
- Identity boundary: every protected endpoint and all five backend test suites
  (trip, invitation, main-plan, splits, auth) change their caller source; trip,
  invitation, main-plan and split permission outcomes must remain identical.
- Database: one new credential table + five seeded rows (V6, after V5); `app_user`
  ids and all memberships/plans stay unchanged, so existing trip data remains
  valid.
- Frontend: every API call loses the header and relies on cookies; all pages
  that received identity props (including the two main-plan screens and the
  split feature) must be adjusted; a new login route and guard affect every
  protected page.
- Public surface shrinks to login/CSRF, greeting and invitation preview; the
  rest of the product now requires a session.
- CI: no new service; backend dependency download grows; frontend bundle gains
  the login page only.
- Deployment: HTTPS and secure cookies are deployment concerns; the single
  instance means in-memory sessions are acceptable but are lost on restart.

## 42. Artifact impact

- Specs: new `openspec/changes/us-066-log-in/specs/auth/spec.md` (ADDED) at P2;
  MODIFIED `trips`, `invitations`, `app-shell`, `main-itinerary`, `splits`
  deltas.
- Tests: new `AuthApiTest`; rewritten trip/invitation/main-plan/splits identity
  setup; browser checks for login, redirect, invitation resume, header-ignored
  behavior.
- Fixtures: credential values and auth request matrix in
  `acceptance-test-fixtures.md`.
- Docs: `README.md` run/login notes; workdir and `docs/ai4se-plugins/` reports;
  tech-stack-plan reconciliation at archive.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 43. Dual-track notes

One story (issue #38) → one change, one vertical slice (credentials + login +
session + protected access + login page + invitation resume + identity migration
for all existing protected surfaces). The story list already fixes US-066;
`/sdd:story-split` is Skipped. US-067/068/069 remain separate downstream stories
and are not implemented here.

## 44. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R30 | Binding tech-stack plan says no accounts and documents `X-Member-Id`; this change adds Spring Security and a credential table | doc/stack deviation | Explicit deviation recorded in the proposal; reconcile at archive per `openspec/config.yaml`. Owner SA |
| R31 | Every existing backend test (trip, invitation, main-plan, splits) drives `X-User-Id`; migration is broad and could accidentally change business outcomes | process, high touch | Rewrite identity setup only; keep existing assertions for codes and values. Owner Dev |
| R32 | CSRF bootstrap and header plumbing are easy to get wrong, especially for the first login POST | implementation risk | P3 defines bootstrap order; S8 covers missing/valid token; tests exercise both. Owner Dev |
| R33 | In-memory sessions are lost on backend restart; all users re-login | accepted for single instance | Document; no Spring Session/JWT dependency. AC5 expiry semantics still hold. Owner SA |
| R34 | Seeded demo passwords/emails live in the repository | accepted for demo | Document as demo-only, never show in UI/logs; no production claim. Owner SA |
| R35 | Login errors could reveal whether an email exists or leak account data | security risk | One generic failure for unknown email and wrong password; no account fields in the error. S3 asserts it. Owner Dev/SA |
| R36 | Pending-invitation resume could auto-join or leak private trip data before login | contract risk | Preview stays identity-free; login only resumes the preview; explicit accept remains; S2 asserts no membership. Owner Dev/IO |
| R37 | Spring Security defaults could expose form login/logout or redirect HTML for APIs | integration risk | Explicit JSON entry point, no form-login/logout surface; P3 verifies the filter chain. Owner Dev/SA |
| R38 | `#/` is both the current public home and the post-login dashboard; making it protected changes existing public access | contract change | Story AC1 makes dashboard the post-login landing; greeting/preview remain public; note in the proposal. Owner IO |
| R39 | Concurrent sessions for one account are allowed; no single-session policy | low, unspecified | Accepted for MVP; US-069 only needs the current session invalidated. Owner SA |
| R40 | Only the five seeded accounts can log in (no registration) | accepted MVP limit | Recorded; registration is a separate future story. Owner IO |
| R41 | Removal of the switcher contradicts the archived US-064 verification docs | historical records | Do not rewrite history; live specs/docs reflect the new contract. Owner Dev |
| R42 | Dev proxy must keep cookies same-origin; no CORS is configured | environment risk | Vite proxy already forwards `/api`; verify cookies in the P4 browser run. Owner Dev |
| R43 | Session TTL makes expiry hard to test if fixed at 30 minutes | testability | Test profile uses a short timeout; S5 acceptance uses it. Owner Dev |
| R44 | `main-itinerary` and `splits` Living Specs still name header identity (splits Purpose still says `X-Member-Id` while code uses `X-User-Id`) | cross-capability contract | US-066 adds MODIFIED deltas for both; splits Purpose drift remains a residual for SA to fix at archive. Owner SA/Dev |
| R45 | Main advanced repeatedly during P1/P2; `V4` = splits and `V5` = main plan | migration ordering | `V6` remains the next free migration; the branch is merged to `f6419a5` (merge `53bdcc6`); re-check the head before implementation. Owner Dev |
| R47 | Spring Security would normally reject a split request before `MemberGuard`, changing its 401 to `USER_REQUIRED` | contract exception | P3 must route unauthenticated split requests to the documented `MEMBER_REQUIRED`/`{data,error}` exception (permit + guard or path-specific entry point). Owner Dev/SA |
| R46 | The 仪表盘/dashboard named by the story is still home content; US-061 is not implemented | scope ambiguity | AC1 only requires the dashboard route to open after login; no aggregation added. Owner IO |

No critical blocker invalidates REQ-008, so split may proceed.

## 45. Suggested split boundaries

One change: `us-066-log-in`. New capability `auth` (six ADDED requirements) plus
MODIFIED `trips`, `invitations`, `app-shell`, `main-itinerary` and `splits`.
Splitting backend auth from the login UI would produce an API with no way to
obtain a session and a page with no backend, violating independently-shippable
and E2E-verifiable. The change is a single identity-boundary replacement; one
gate cycle is the only way to verify "existing outcomes unchanged" once.

Effort: medium–large — `V6` credential migration; Spring Security configuration
and auth endpoints; controller identity migration across trip, invitation,
main-plan and splits packages; frontend auth bootstrap, login page, route guard,
switcher removal and invitation resume; fixture/test migration; six spec deltas
(auth + five modified). Phase order: credential migration + auth endpoints →
security chain + controller migration (including the splits exception) →
frontend bootstrap/login/guard → invitation resume + header-ignored verification
→ full existing-acceptance re-run. Baseline: `origin/main` `f6419a5`, merged as
`53bdcc6`. The story already exists as GitHub issue #38, so
`/sdd:story-split` is Skipped.

## 46. Requirement set

REQ-009 — My Account、退出登录与注册（US-068 + US-069 + US-070，2026-11-16）

| id | Path |
|---|---|
| REQ-009 | `requirement-workspace/requirements/REQ-009.md` |

Supporting：`requirement-workspace/deep-dive.md` §REQ-009、
`intents/2026-11-16-req-009.md`、`analysis/req-009-dor.md`、
`acceptance-test-fixtures.md` §REQ-009。

Mode：embedded at the end of `/sdd:pre-spec-req`（blocking OQs = 0，DoR
BLOCKERs = 0）。Solution direction：在既有 `auth` 能力上 **add** 注册/资料
读写/退出三类能力，**modify** `app-shell` 导航与身份展示；无新表、无新迁移。
Deep-dive Phase 2.5 在范围内。

## 47. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Living Spec — auth | `openspec/specs/auth/spec.md`（REQ-008 归档） | 仅凭据登录、会话、CSRF、受保护面；明确写"Registration, password change, reset and account creation SHALL NOT be exposed"与"Logout … belongs to US-069" |
| Living Spec — app-shell | `openspec/specs/app-shell/spec.md` | 已登录姓名只读；无"我的"tab；右上角身份条/问候不在契约内 |
| Backend auth | `backend/src/main/java/com/gogo/auth/{AuthController,SecurityConfig,AccountCredentialRepository,AccountPrincipal,AccountResponse,AuthErrorAdvice}.java` | login/me/csrf 三端点；logout 显式禁用；凭据仓库只读；无注册/改名 |
| Database | `V2__create_trip.sql`、`V6__create_account_credential.sql` | `app_user(id,display_name)`；`account_credential(user_id,email UNIQUE,password_hash)`；迁移到 V6，V7 未占用 |
| Frontend shell | `frontend/src/{App.tsx,TabBar.tsx,router.tsx}` | 4 个 tab；`AccountBar` 在 app-shell/main-plan 渲染；hash + React Router 双路由 |
| Frontend auth | `frontend/src/features/auth/{AuthProvider,LoginPage,RequireAuth}.tsx` | login/refresh；无 register/logout/updateName；登录页无 Create account |
| Name consumers | `frontend/src/pages/*`、`frontend/src/features/split/*` | 成员/邀请/偏好/路线标签显示姓名；split 有自己的"已登录 · 姓名"条 |
| Tests | `backend/src/test/java/com/gogo/auth/*`、`.../{trip,invitation,mainplan}/**`、`.../hello/splits/**` | `TestAuth.asUser` 会话登录；auth 测试覆盖 login/me/csrf；无 register/logout/patch |
| Fixtures | `acceptance-test-fixtures.md` §REQ-008 | 五个账号 + demo 密码 + 登录矩阵；无注册/退出/改名用例 |
| Binding plan | `docs/knowledge/architecture/tech-stack-plan.md` §2、§14 | "MVP 不做账号体系/注册登录"；§14 记录 US-066 偏差 |
| CI | `.github/workflows/ci.yml` | backend `mvn -B test`；frontend `npm ci && npm run build`；结构不变 |
| Board | issues #40/#41/#43，Project #2 | 均 `Req Analysis`；#41/#43 → elian-jiang；#40 → DENGLU-OOCL |
| Downstream | US-067（#39）、US-061、US-058/US-063 | 扫码、仪表盘聚合、行程完成/倒计时；本 change 不实现 |

Baseline classification：brownfield account-lifecycle extension on top of the
archived REQ-008 auth boundary；无第二 spec root。

## 48. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/auth` | 登录/会话/CSRF；注册与退出被明确排除 | ADDED：注册账号（公开、统一隐私响应、事务写入）；账号资料读取/显示名更新；退出登录与会话失效 |
| `openspec/specs/app-shell` | 4 tab；右上角只读姓名 | MODIFIED：新增"我的"tab；移除右上角身份条；仪表盘问候使用账号名且不追加"组织者"；注册页全屏；壳/dock/join 例外不变 |
| Database | V6 凭据表；`app_user.display_name` | **无 schema 变更、无新迁移**；注册写两表同事务；改名写 `display_name` |
| Backend auth | login/me/csrf；logout disabled；仓库只读 | ADD `POST /api/auth/register`、`POST /api/auth/logout`、`PATCH /api/auth/me`；仓库新增插入/改名；`SecurityConfig` permitAll 加 register、启用显式 logout |
| Error contract | 扁平 `{code,message}`；auth advice 把不可读 JSON 统一映射 401 | 注册/改名校验 → 400 `INVALID_EMAIL`/`INVALID_NAME`/`INVALID_PASSWORD`；仍为扁平两字段；P3 调整 advice 作用域 |
| Frontend API/auth | AuthProvider login/refresh | ADD register/logout/updateName；退出清状态；改名刷新账号；401 统一回登录 |
| Frontend pages | 无注册页/My Account；登录页无注册入口 | ADD 全屏注册页（`#/register` + `/register`）、My Account（`#/account` + `/account`）；登录页 Create account |
| Navigation | 4 tab；`AccountBar` 三处渲染 | ADD 第 5 个"我的"tab；REMOVE `AccountBar`；仪表盘问候读 `me`；split 身份条核对 |
| Fixtures | REQ-008 账号/登录矩阵 | ADD §REQ-009：注册新账号、重复/并发、校验边界、改名、退出、邀请恢复 |
| Tests | 无注册/退出/改名 | ADD auth 端点测试（注册成功/重复/并发/校验/改名/退出/CSRF/401）+ 名称联动断言；既有套件回归 |
| Docs | README/workdir/stage reports | 补注册/退出/My Account 说明；归档时 tech-stack-plan 收敛注册偏差 |
| CI | 两 job | 结构不变；后端测试数增加；前端 build 覆盖新页面 |

## 49. Blast radius

- 后端安全链：register 必须公开但受 CSRF；logout 需显式端点（当前被禁用）；
  `PATCH /api/auth/me` 需会话 + CSRF。任何匹配器遗漏会表现为 401/403 而非业务错误。
- 账号数据：注册在**同一事务**写 `app_user` + `account_credential`；唯一索引兜底
  并发；改名只写 `display_name`；退出不写业务表。
- 名称展示：所有既有姓名读取面自动生效（服务端读库）；前端需在改名后刷新
  `me` 与相关查询，避免 React Query 缓存残留旧名。
- 导航/壳：新增 tab 影响 430px 底部布局；移除 `AccountBar` 影响 app-shell、
  main-plan、split 三处；仪表盘问候需账号名而非硬编码。
- 数据库：零 schema 变更；V6 唯一索引与 BCrypt 种子不变；`app_user.id` 自增
  rowid 依赖 SQLite 行为，测试需断言生成 id。
- 测试：新增注册并发用例与退出会话断言；既有行程套件应不受影响（都通过会话登录）。
- 协作：US-068 卡片当前在队友名下；页面/导航改动与其工作重叠，需在 P4 前对齐。

## 50. Artifact impact

- Specs：P2 在 `openspec/changes/us-068-070-account-register/specs/` 下新增
  `auth` delta（ADDED 3 requirement）与 `app-shell` delta（MODIFIED 导航/身份；
  可能按 P2 复核拆成两条 MODIFIED）。
- Tests：新增注册/改名/退出端点测试与浏览器走查；既有 auth 测试扩展。
- Fixtures：§REQ-009 账号、请求矩阵、边界值（1/30 名、5/6/72/73 字节密码、
  重复/并发）。
- Docs：README 运行说明（注册/退出/My Account）；workdir registry/handoff；
  `docs/ai4se-plugins/` P1 报告。
- KB：未配置；`scripts/kb-lint.sh` 保持文档化 SKIP。

## 51. Dual-track notes

三张 issue → 一个 change、一个垂直切片：账号记录 + My Account 表面 + 注册 +
退出 + 名称联动。US-068 的页面是 US-069 退出动作与 US-070 新账号资料的共同
载体；拆开会出现"有退出 API 无入口 / 有注册无资料页 / 有改名无页面"的半成品。
`/sdd:story-split` Skipped：issue #40/#41/#43 已存在并在看板。
US-068 卡片当前指派 `DENGLU-OOCL`；用户 2026-11-16 裁决并入本 change，
P4 前确认卡片交接（流程事项，不改变需求）。

## 52. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R48 | US-068 页面由队友卡片承载，本 change 实现会与其前端工作重叠 | collaboration, medium | 用户裁决并入；P4 前完成交接/协作确认。Owner IO/团队 |
| R49 | 注册响应差异可能枚举邮箱 | security, accepted | 用户 2026-11-17 明确要求重复邮箱直接提示：新邮箱 `200 {"next":"login"}`、重复 `409 EMAIL_TAKEN`；接受邮箱枚举风险，记录为 G1 addendum 偏差，IO 复核待补。Owner IO/SA |
| R50 | 并发注册产生重复账号 | data integrity, high | 单事务 + 唯一索引；冲突捕获映射为通用成功；夹具覆盖并发。Owner Dev |
| R51 | BCrypt 只取前 72 字节，长密码被静默截断 | security, medium | 服务端按 72 字节拒绝；夹具覆盖 72/73 边界。Owner Dev |
| R52 | 退出只清前端而未真正失效服务端会话 | security, high | 显式 `POST /api/auth/logout` 失效 session + 清 context/cookie；断言 `me` 401。Owner Dev |
| R53 | `SecurityConfig` 当前禁用 logout，误启用 Spring 默认表单 logout 会改变错误面/重定向 | integration, medium | 自定义 JSON 端点，保持扁平错误；不启用 `formLogin`。Owner Dev/SA |
| R54 | 注册/改名的不可读 JSON 被现有 advice 映射为 401 `INVALID_CREDENTIALS` | contract, medium | P3 调整 advice 作用域或新增处理，注册/改名返回 400 校验错误。Owner Dev |
| R55 | 名称联动依赖前端缓存刷新，可能出现旧名残留 | UX, medium | 改名成功后以响应更新 auth 状态并失效相关查询；服务端姓名始终从库读取。Owner Dev |
| R56 | 移除 `AccountBar` 影响 main-plan/split 页的头条与布局 | UI regression, medium | 统一替换；split 的"已登录 · 姓名"条一并核对；浏览器回归覆盖三处。Owner Dev |
| R57 | issue 提到的 scan 控件当前不存在（US-067 未实现） | scope ambiguity, low | 本 change 只保留既有控件；不新增扫码；US-067 负责。Owner IO |
| R58 | 新账号无成员关系，但行程页可能假设至少一个行程 | UX, low | 复用既有空态；US-070 AC8 明确无成员关系。Owner Dev |
| R59 | 绑定计划写"MVP 不做注册登录" | doc/stack deviation | proposal 记录偏差；归档时按 `openspec/config.yaml` 收敛。Owner SA |
| R60 | `app_user.id` 依赖 SQLite rowid 自增，测试/生产行为需一致 | implementation, low | 使用生成键读取；夹具断言唯一 id；不显式指定 id。Owner Dev |
| R61 | 注册页在 CSRF 未 bootstrap 前提交会 403 | usability, medium | 沿用登录页的 `ensureCsrf`；表单提交前确保 token。Owner Dev |
| R62 | 无注册限流/锁定，公开端点可被滥用 | security, deferred | 部署例外（OQ-13）；文档记录，不本 change 实现。Owner Dev/SA |
| R63 | 改名后其他在线页面的姓名由下次渲染/刷新更新，非实时推送 | UX, low | 无实时通知需求；刷新即最新；AC 只要求展示使用最新名。Owner Dev |

无 critical blocker 使 REQ-009 失效；split 可继续。

## 53. Suggested split boundaries

一个 change：`us-068-070-account-register`。`auth` ADDED 注册/资料读写/退出，
`app-shell` MODIFIED 导航与身份展示。三张卡共享同一账号记录与 My Account
表面，拆分会破坏独立可交付与端到端可验证；一个 change、一轮 G1/G2/G3 即可
验证"改名/退出/注册"在既有行程域上的回归。
