# Impact brief ΓÇö REQ-001

- Date: 2026-11-13
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `req-001-hello-world`

## 1. Requirement set

| id | Path |
|---|---|
| REQ-001 | `requirement-workspace/requirements/REQ-001.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-001,
`requirement-workspace/intents/2026-11-13-req-001.md`,
`requirement-workspace/analysis/req-001-dor.md`.

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/_INDEX.md`, `docs/knowledge/{architecture,domain,external,interfaces,operations,rules}/README.md` | Slot READMEs only; no populated entries |
| KB harness policy | `scripts/README.md`, `scripts/kb-lint.sh` | `kb-lint.sh` prints `SKIP` and exits 0 by documented baseline policy; `verify-links.sh`, `archive-change.sh`, `init.sh` exit 1 (placeholders, measured) |
| Living Spec tree | `openspec/specs/` | Present but empty ΓÇö `openspec list --specs` ΓåÆ "No specs found" |
| Post-archive SDD assets | `openspec/changes/archive/` | Present but empty (`.gitkeep` only) |
| Spec backend config | `openspec/config.yaml` | `schema: spec-driven`, no project context or rules set |
| Application code | `backend/`, `frontend/` | **Already present in the working tree, uncommitted** (`git status --short` ΓåÆ `?? backend/`, `?? frontend/`). Implemented and verified earlier in this session before artifacts were authored |
| CI configuration | `.github/` | Absent ΓÇö no workflow exists |
| Frontend lockfile | `frontend/package-lock.json` | 51 `resolved` entries originally pointed at `https://artifact.oocl.com/artifactory/api/npm/npm-repository-virtual-external`; rewritten in the working tree to `https://registry.npmjs.org`. **Rewrite not yet re-verified with `npm ci`** |
| Repo docs | `README.md`, `TODO.md`, `AGENTS.md` | `README.md` still states "no application implementation" (modified in working tree); `TODO.md` still specifies SQLite |

Baseline classification: greenfield. The authority tree `openspec/specs/` exists
but holds no capability, and `README.md` documents the baseline as having no
application implementation. No competing spec root is introduced.

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | Empty | New capability `greeting` created at archive time from this change's delta spec |
| Backend service | None in the committed tree; `backend/` exists uncommitted with `GET /api/greeting`, `JdbcTemplate`, H2 file mode, Flyway `V1__create_greeting.sql` | Formalize as the `greeting` capability; keep H2 per OQ-1 |
| Frontend app | None committed; `frontend/` exists uncommitted, fetches `/api/greeting`, renders `h1`, dev proxy to `localhost:8080` | Formalize AC3 and reverse case AC3-N |
| `.github/workflows/` | Absent | Add a CI workflow: backend `mvn` build+test, frontend install+build |
| `frontend/package-lock.json` | Corporate-registry `resolved` URLs (unreachable from GitHub-hosted runners) | Public-registry `resolved` URLs so CI can install; local installs keep using the corporate registry via npm's `replace-registry-host` default |
| `README.md` | "This baseline has no application implementation or CI/CD pipeline" | Run instructions for both apps; record the SQLiteΓåÆH2 substitution |
| `.gitignore` | No entry for generated DB files or service logs | Ignore `data/` and `logs/` |
| `docs/knowledge/**` | Slot READMEs | Checked, no impact ΓÇö KB is not configured; `kb-lint.sh` remains a documented `SKIP` |
| `scripts/*.sh` | 3 placeholders exit 1, `kb-lint.sh` exits 0 | Checked, no impact ΓÇö CI must not invoke the failing placeholders |
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
| R1 | GitHub-hosted runners cannot reach the corporate npm registry; a lockfile with private `resolved` URLs makes `npm ci` fail | blocking for CI, not for requirements | Mitigation designed (public-registry lockfile). **Unverified** ΓÇö `npm ci` must be re-run locally and the CI run observed |
| R2 | No `gh` CLI on this machine (`gh: command not found`) and `api.github.com` returned HTTP 403, so CI run status cannot be read programmatically | blocking for CI evidence | P4 pipeline report must be Partial with named human confirmation, never an API-verified Pass |
| R3 | Port 8080 / 5173 contention with other local projects can kill or block the app during verification | operational | Recorded; verify by port owner plus endpoint response, not by Maven log alone |
| R4 | Implementation preceded P1ΓÇôP3 artifacts (retro-alignment), so red-green ATDD order was not followed | process deviation | Disclosed here and in the intent capture; P4 re-verifies against the Delta Spec |
| R5 | `TODO.md` contradicts itself on Flyway (OQ-2) and still says SQLite (OQ-4) | requirement ambiguity | Non-blocking, deferred to IO/SA at G1 |

No critical blocker invalidates REQ-001, so split may proceed.

## 8. Suggested split boundaries

One change: `req-001-hello-world`, one new capability `greeting`.
The CI workflow is harness scope inside the same change (source 3); it changes no
product behavior and therefore gets no capability of its own.
Effort: small ΓÇö 3 backend classes, 1 migration, 1 test, 5 frontend files,
1 workflow. No dependency ordering beyond backend-before-frontend verification.

---

# Impact brief ΓÇö REQ-003 (2026-11-14)

Sections 1ΓÇô8 above describe the REQ-001 baseline and are not authoritative for
this change. This section is self-contained.

## 9. Requirement set

| id | Path |
|---|---|
| REQ-003 | `requirement-workspace/requirements/REQ-003.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-003,
`requirement-workspace/intents/2026-11-14-req-003.md`,
`requirement-workspace/analysis/req-003-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md`.

## 10. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Backend | `backend/src/main/java/com/gogo/hello/` ΓÇö `GreetingController`, `GreetingRepository`, `GreetingResponse`, `HelloApplication` | One capability, `JdbcTemplate`, no ORM. No trip code exists |
| Migrations | `backend/src/main/resources/db/migration/V1__create_greeting.sql` | One migration; next free version is `V2` |
| Config | `backend/src/main/resources/application.yml` | SQLite at `./data/gogo.db`, Flyway enabled |
| Backend tests | `backend/src/test/java/com/gogo/hello/GreetingApiTest.java` | One MockMvc acceptance test to model the new tests on |
| Frontend | `frontend/src/App.jsx`, `main.jsx` | One screen, no router, no component library, plain CSS absent |
| Frontend deps | `frontend/package.json` | React 19, Vite 8 only |
| CI | `.github/workflows/ci.yml` | Backend `mvn -B test`, frontend `npm ci && npm run build` |
| Living Spec | `openspec/specs/greeting/spec.md` | `trips` does not exist |
| Fixtures | ΓÇö | `acceptance-test-fixtures.md` did not exist; authored in this change |

## 11. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | Only `greeting` | New capability `trips` created at archive time from this change's delta spec |
| Migrations | `V1` only | `V2__create_trip.sql` creating `app_user`, `trip`, `trip_member`, seeding five users and the fixture trip with four members |
| Backend code | `com.gogo.hello` only | New `com.gogo.trip` package: controller, repository, request/response records, error handling for the six `code` values |
| Backend tests | `GreetingApiTest` | New `TripApiTest` covering C1ΓÇôC5-N and R1ΓÇôR3-N |
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
  against the same running backend ΓÇö no extra process required.

## 13. Artifact impact

- Specs: `openspec/changes/req-003-trip-create-and-view/specs/trips/spec.md` (P2).
- Tests: `TripApiTest` (backend); frontend verified by build plus browser checks.
- Docs: this workdir, `docs/ai4se-plugins/` stage reports, `README.md`.
- KB: not configured; `scripts/kb-lint.sh` remains a documented `SKIP`.

## 14. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R6 | `X-User-Id` is trusted without verification, so any caller can impersonate any user | accepted for a scaffold | Recorded in REQ-003 ┬ºActors and must not be presented as a security control. Owner Dev/SA |
| R7 | `403` for a non-member reveals that the trip id exists | accepted | OQ-2 trade-off; wording follows the AC. Owner SA |
| R8 | The UI screenshots are unavailable (`ui-design-reference/` untracked) | advisory | Layout is a design judgement from AC text. Owner IO/BA |
| R9 | The React app has no router | advisory | Decide at P3; a new dependency is the fallback, not the default. Owner Dev |
| R10 | `req-002-greeting-json-sqlite` remains an active change | process | Different capability, no spec conflict; archive order is independent. Owner Dev |
| R11 | Seeding the sample trip in `V2` puts fixture data in every environment | accepted for a scaffold | Required so R1/R2 are reproducible without test-only setup. Owner Dev |

No critical blocker invalidates REQ-003, so split may proceed.

## 15. Suggested split boundaries

One change: `req-003-trip-create-and-view`, one new capability `trips`, two ADDED
requirements (creation, detail read).
Effort: medium ΓÇö 1 migration, 4ΓÇô6 backend classes, 1 test class, 2ΓÇô3 frontend
screens, documentation. Ordering: migration ΓåÆ repository ΓåÆ endpoints ΓåÆ frontend,
with the details screen dependent on the create screen only through the trip id.

---

# Impact brief ΓÇö REQ-004 (2026-11-14)

Sections 1ΓÇô15 above describe REQ-001 and REQ-003 and are not authoritative for
this change. This section is self-contained.

## 16. Requirement set

| id | Path |
|---|---|
| REQ-004 | `requirement-workspace/requirements/REQ-004.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-004,
`requirement-workspace/intents/2026-11-14-req-004.md`,
`requirement-workspace/analysis/req-004-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md` ┬ºREQ-004.

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

## 18. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | `greeting` only | New capability `invitations` (four ADDED requirements) plus one ADDED `trips` requirement (main-plan state), merged at archive time |
| Migrations | `V1` (+ REQ-003 `V2` pending) | `V3__create_invitation.sql`: `trip_invitation` table; `ALTER TABLE trip ADD COLUMN main_plan_confirmed` default 0 |
| Backend code | `com.gogo.hello` (+ REQ-003 `com.gogo.trip` pending) | New `com.gogo.invitation` package: controller, repository, token generator, response records; three new `code` values |
| Backend tests | `GreetingApiTest` (+ REQ-003 `TripApiTest` pending) | New `InvitationApiTest` covering I1ΓÇôI5, J1ΓÇôJ5, U1ΓÇôU2 and reverse cases R-1/R-2 |
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
  this change alters and reads). P0ΓÇôP3 of REQ-004 are independent of that.
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
| R12 | REQ-003 unimplemented and G1 unsigned; REQ-004 P4 blocked until REQ-003 P4 | process, blocking for P4 only | Recorded; P0ΓÇôP3 proceed. Owner Dev/IO |
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
Effort: medium ΓÇö 1 migration, 4ΓÇô6 backend classes, 1 test class, 2 frontend
surfaces plus states, one QR dependency decision. Ordering: migration ΓåÆ
repository ΓåÆ issue endpoint ΓåÆ preview/accept endpoints ΓåÆ frontend panel ΓåÆ join
page ΓåÆ verification. `/sdd:story-split` is Skipped: the three stories already
exist as GitHub issues.

# Impact brief ΓÇö REQ-019

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `req-019-save-interests`

## 1. Requirement set

| id | Path |
|---|---|
| REQ-019 | `requirement-workspace/requirements/REQ-019.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-019,
`requirement-workspace/intents/2026-11-15-req-019.md`,
`requirement-workspace/analysis/req-019-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md`∩╝êτö¿µê╖Σ╕Ä trip σñ╣σà╖∩╝ëπÇé

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Φ║½Σ╗╜ | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` Φ»╖µ▒éσñ┤∩╝êµò┤µò░∩╝ë∩╝¢τ╝║σñ▒µêûΘ¥₧ seed τö¿µê╖ ΓåÆ `401 USER_REQUIRED` |
| trip / user Φí¿ | `backend/src/main/resources/db/migration/V2__create_trip.sql` | `app_user` 1ΓÇô5πÇü`trip` 1∩╝êSingapore Friends Day∩╝ëπÇü`trip_member` 1ΓÇô4 |
| µêÉσæÿσêñσ«Ü | `TripRepository.isMember(long, long)` | σÅ»τ¢┤µÄÑσñìτö¿∩╝îµùáΘ£ÇΘçìσåÖ |
| ΘöÖΦ»»σñäτÉå | `TripErrorAdvice` | `basePackages = "com.gogo.trip"`∩╝î**Σ╕ìΦªåτ¢ûµû░σîà** |
| DB Φ«┐Θù« | `TripRepository` | `JdbcTemplate`∩╝îµùá ORM |
| Φ┐üτº╗σ║Åσêù | `V1__create_greeting.sql`πÇü`V2__create_trip.sql` | Σ╕ïΣ╕ÇΣ╕¬σÅ»τö¿σÅ╖σÅûσå│Σ║Ä REQ-004 τÜä `V3` µÿ»σÉªσ╖▓ΦÉ╜σ║ô |
| µÄÑσÅúµûçµíú | `README.md`πÇü`acceptance-test-fixtures.md` | σ╖▓Φ«░σ╜ò trip µÄÑσÅú∩╝¢µùáσüÅσÑ╜τ¢╕σà│µ¥íτ¢« |
| σëìτ½» | `frontend/src/{App.jsx,api.js,app.css}` | µëïσåÖ hash Φ╖»τö▒πÇü`api()` σ░üΦúàπÇüΘí╢Θâ¿ demo Φ║½Σ╗╜ΘÇëµï⌐σÖ¿∩╝ê1ΓÇô5∩╝ë |
| Living Spec | `openspec/specs/` | Σ╗à `greeting`∩╝¢`trips` τÜä delta σ░Üµ£¬σ╜Æµíú |
| Φ«íσêÆσÑæτ║ª | `docs/knowledge/architecture/tech-stack-plan.md` ┬º6 | `{data,error}` σ░üσÑù / `X-Member-Id` / `JdbcClient`∩╝îΣ╕ÄΣ╗úτáüΣ╕ìΣ╕ÇΦç┤ |

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | Σ╗à `greeting` | σ╜Æµíúµù╢µû░σ╗║Φâ╜σè¢ `preferences` |
| Φ┐üτº╗ | `V1`πÇü`V2` | µû░σó₧ `V4__create_member_preference.sql`∩╝êσìòΦí¿ + UNIQUE∩╝ë |
| σÉÄτ½» | Σ╗à `com.gogo.trip` | µû░σîà `com.gogo.preference`∩╝Ücontroller / service / repository / dto / advice |
| µÄÑσÅúΘ¥ó | `GET/POST /api/trips`πÇü`GET /api/trips/{id}`πÇü`/api/greeting` | µû░σó₧ `GET`/`PUT /api/trips/{tripId}/preferences` |
| σëìτ½» | home / create / details | µû░σó₧σüÅσÑ╜Θí╡Σ╕ÄΣ╕Çµ¥íΦ╖»τö▒∩╝îσñìτö¿ `api.js`πÇü`app.css`πÇüΦ║½Σ╗╜ΘÇëµï⌐σÖ¿ |
| µûçµíú | trip µÄÑσÅúσ╖▓Φ«░σ╜ò | `README.md` σó₧σüÅσÑ╜µ«╡πÇüΘ¬îΦ»üτƒ⌐Θÿ╡σó₧Φíî |

## 4. Blast radius

- `trips` τÜäΦ»╗Φ╖»σ╛äΣ╕ìσÅÿ∩╝¢`TripRepository` Σ╗àσÅ¬Φ»╗Φ░âτö¿ `findUserId` / `isMember`πÇé
- `TripErrorAdvice` Σ╜£τö¿σƒƒΣ╕ìµö╣ΓÇöΓÇöµû░σîàΘ£ÇΦªüΦç¬σ╖▒τÜä advice∩╝êWARNING∩╝ëπÇé
- `App.jsx` σÅ¬σó₧Σ╕Çµ¥íΦ╖»τö▒Σ╕ÄΣ╕ÇΣ╕¬Θí╡Θ¥óµîéΦ╜╜∩╝îµùóµ£ëΦ╖»τö▒Σ╕ìσÅÿπÇé
- σëìσÉÄτ½»σ¥çΣ╕ìµû░σó₧Σ╛¥Φ╡û∩╝¢Φ┐ÉΦíîµù╢µïôµëæΣ╕ìσÅÿ∩╝ê8080 / 5173∩╝ëπÇé

## 5. Artifact impact

- Spec∩╝Ü`openspec/changes/req-019-save-interests/specs/preferences/spec.md`∩╝êP2∩╝ëπÇé
- Tests∩╝ÜσÉÄτ½»µÄÑσÅúµ╡ïΦ»òΦªåτ¢û 12 Σ╕¬σ£║µÖ»∩╝¢σëìτ½»µ₧äσ╗║ + µ╡ÅΦºêσÖ¿Φºéσ»ƒπÇé
- Docs∩╝Ü`README.md`πÇü`docs/feedback/verification-*.md`πÇü`requirement-workspace/{registry,handoff}.md`πÇé
- KB∩╝Üµùáµû░σó₧Θò┐µ£ƒΣ║ïσ«₧πÇé

## 6. Dual-track notes

σìòµ¥íµòàΣ║ï∩╝êUS-019∩╝ëπÇüσìòΦâ╜σè¢πÇü12 Σ╕¬σ£║µÖ» ΓåÆ `/sdd:story-split` Φ╖│Φ┐çσ╣╢Φ«░σ╜òτÉåτö▒πÇéΣ╗à OpenSpec Φ╜¿πÇé

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | `V4` σàêΣ║Ä REQ-004 τÜä `V3` ΦÉ╜σ║ô ΓåÆ σ╖▓µëºΦíîΦ┐ç `V4` τÜäΦèéτé╣Σ╕è Flyway µèÑ out-of-order | blocking for merge order | τ╝ôΦºú∩╝ÜσÉêσàÑσëìτí«Φ«ñ `V3` σ£¿ main∩╝¢σÉªσêÖµö╣µîëΣ╕ïΣ╕ÇσÅ»τö¿τëêµ£¼ |
| R2 | σÄ╗ΘçìΦÉ╜σ£¿ Service σ▒é∩╝îJSON payload µùáσåàΘâ¿σö»Σ╕Çτ║ªµ¥ƒ∩╝îτ╝║ΘÖ╖Σ╝ÜΘ¥ÖΘ╗ÿσåÖσç║ΘçìσñìΘí╣ | product correctness | τ╝ôΦºú∩╝Üµ╡ïΦ»òµû¡Φ¿ÇΦºúµ₧ÉσÉÄτÜäΘ¢åσÉêσàâτ┤áσö»Σ╕Ç∩╝îΣ╕ìσÅ¬τ£ï 200 |
| R3 | `TripErrorAdvice` σÅ¬Φªåτ¢û `com.gogo.trip`∩╝îµû░σîàτÜä `INVALID_REQUEST` Σ╕ìΣ╝ÜΦó½σñäτÉå | integration | τ╝ôΦºú∩╝Üµû░σó₧Σ╕ôσ▒₧ advice µêûµö╛σ«╜σê░ `com.gogo`∩╝êP3 σ«Ü∩╝ë |
| R4 | `application.yml` τ╝║ `maximum-pool-size=1` / WAL / `busy_timeout` / σñûΘö«σ╝Çσà│∩╝îΦÇîµ£¼Θ£Çµ▒éσ╝òσàÑσ╣éτ¡ëΦªåτ¢ûσåÖ | operational | τ╝ôΦºú∩╝ÜP4 σëìΦ»äΣ╝░∩╝îΣ╕ìΘ╗ÿΣ╛¥Φ╡ûΘ╗ÿΦ«ñσÇ╝ |
| R5 | AC Σ╝á `Art`πÇüσ║ôσåàσ¡ÿ `art`∩╝ÜΦïÑµÄÑσÅúσÅ¬Φ«ñσ░ÅσåÖ code∩╝îAC1 τ¢┤µÄÑσñ▒Φ┤Ñ | contract | σ╖▓Φºú∩╝Üτ║┐Σ╕è labelπÇüσ║ôσåà code |
| R6 | σÅéΦÇâσ¢╛Φèéτé╣ 8 Σ╕║ 10 Σ╕¬Σ╕¡µûç chip∩╝îAC σ«ÜΣ╣ë 7 Σ╕¬Φï▒µûç label | UI alignment | ΦíîΣ╕║Σ╗Ñ AC Σ╕║σçå∩╝îσ╖«σ╝éΦ«░σ£¿ deep-dive Γæ¬ |
| R7 | σÉîσ¢óΘÿƒ REQ-004 τÜä `V3` Σ╕Äµ£¼Θ£Çµ▒éτÜä `preferences` delta σàêσÉÄΣ╕ìσ«Ü∩╝îΣ╕ñΦÇàΘâ╜σåÖ `openspec/specs/` | collaboration | Living Spec σÉêσ╣╢Θí║σ║Åµùáσ╜▒σôì∩╝îΣ╗àΦ┐üτº╗σÅ╖ΦÇªσÉê |
| R8 | `AGENTS.md` Φªüµ▒é shadcn/ui∩╝îΣ╗ôσ║ôσ«₧Σ╕║µëïσåÖ CSS | harness | µ£¼Θ£Çµ▒éΦ╖ƒΘÜÅΣ╗úτáü∩╝îσÅªσ╝ÇΣ╕Çµ¥íΣ┐«µîçσ╝ò |

µùáΦç┤σæ╜Θÿ╗σí₧Σ╜┐ REQ-019 σñ▒µòê∩╝îµïåσêåσÅ»Σ╗Ñτ╗ºτ╗¡πÇé

## 8. Suggested split boundaries

Σ╕ÇΣ╕¬σÅÿµ¢┤∩╝Ü`req-019-save-interests`∩╝îΣ╕ÇΣ╕¬µû░Φâ╜σè¢ `preferences`πÇé
σ╖ÑΣ╜£ΘçÅ∩╝Üσ░Åσê░Σ╕¡ΓÇöΓÇöσÉÄτ½»τ║ª 5 Σ╕¬τ▒╗ + 1 Σ╕¬Φ┐üτº╗ + 1 τ╗äµÄÑσÅúµ╡ïΦ»ò∩╝¢σëìτ½» 1 Σ╕¬Θí╡Θ¥ó + 1 µ¥íΦ╖»τö▒ + µá╖σ╝ÅπÇé
Σ╛¥Φ╡ûΘí║σ║Å∩╝Ü`V4`∩╝êτí«Φ«ñ `V3` σ╖▓ΦÉ╜σ║ô∩╝ëΓåÆ Φ║½Σ╗╜/µêÉσæÿσñìτö¿ ΓåÆ µáíΘ¬îΣ╕ÄσåÖ ΓåÆ `GET` σ¢₧Φ»╗ ΓåÆ Θí╡Θ¥ó ΓåÆ Θ¬îΦ»üµûçµíúπÇé

# Impact brief ΓÇö REQ-020

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`∩╝êblocking OQs = 0∩╝îDoR BLOCKERs = 0∩╝ë
- Change id: `req-020-manage-must-do`
- Stacking: σáåσÅáσ£¿ `req-019-save-interests` Σ╣ïσÉÄ∩╝¢σÉÄΦÇàµ£¬σÉê main

## 1. Requirement set

| id | Path |
|---|---|
| REQ-020 | `requirement-workspace/requirements/REQ-020.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-020∩╝î
`requirement-workspace/intents/2026-11-15-req-020.md`∩╝î
`requirement-workspace/analysis/req-020-dor.md`∩╝î
`requirement-workspace/acceptance-test-fixtures.md`∩╝êτö¿µê╖Σ╕Ä trip σñ╣σà╖∩╝ë∩╝î
`openspec/changes/req-019-save-interests/`∩╝êΦí¿Σ╕ÄΘí╡Θ¥óσÑæτ║ªτÜäµ¥Ñµ║É∩╝ëπÇé

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Φ║½Σ╗╜ | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` Φ»╖µ▒éσñ┤∩╝êµò┤µò░∩╝ë∩╝¢τ╝║σñ▒µêûΘ¥₧ seed τö¿µê╖ ΓåÆ `401 USER_REQUIRED` |
| trip / member Φí¿ | `V2__create_trip.sql` | `app_user` 1ΓÇô5πÇü`trip` 1πÇü`trip_member` 1ΓÇô4∩╝¢`trip.start_date` / `end_date` Σ╕║ 2026-12-05 |
| ΘéÇΦ»╖Σ╕ÄΣ╕╗τ║┐τè╢µÇü | `V3__create_invitation.sql` | `trip_invitation` + `trip.main_plan_confirmed`∩╝êΘ╗ÿΦ«ñ 0∩╝îUS-037 Σ╣ïσëìµùáσåÖσàÑΦ╖»σ╛ä∩╝ë |
| σüÅσÑ╜Φí¿ | `openspec/changes/req-019-save-interests/proposal.md` Σ╕Ä `specs/preferences/spec.md` | **Φ«íσêÆΣ╕¡τÜä `V4` + `member_preference`∩╝îσ░Üµ£¬ΦÉ╜σ║ô**∩╝¢UNIQUE(`trip_id`,`user_id`,`kind`) |
| σüÅσÑ╜τ½»τé╣ | σÉîΣ╕è | `GET`/`PUT /api/trips/{tripId}/preferences`∩╝î**σ░Üµ£¬σ«₧τÄ░** |
| σüÅσÑ╜Θí╡ | σÉîΣ╕è | `#/trips/{tripId}/preferences`∩╝î**σ░Üµ£¬σ«₧τÄ░** |
| µêÉσæÿσêñσ«Ü | `TripRepository.isMember(long, long)` | σÅ»τ¢┤µÄÑσñìτö¿ |
| ΘöÖΦ»»σñäτÉå | `TripErrorAdvice`∩╝ê`com.gogo.trip`∩╝ëπÇü`InvitationErrorAdvice`∩╝ê`com.gogo.invitation`∩╝ë | µîëσîàΘÜöτª╗∩╝¢`com.gogo.preference` Θ£ÇΦç¬σ╕ª advice∩╝êREQ-019 Φ┤ƒΦ┤ú∩╝ë |
| DB Φ«┐Θù« | `TripRepository` / `InvitationRepository` | `JdbcTemplate`∩╝îµùá ORM |
| σëìτ½» | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | µëïσåÖ hash Φ╖»τö▒πÇü`api()` σ░üΦúàπÇüΘí╢Θâ¿ demo Φ║½Σ╗╜ΘÇëµï⌐σÖ¿∩╝ê1ΓÇô5∩╝ë |
| σñ╣σà╖ | `acceptance-test-fixtures.md` | τö¿µê╖πÇüµá╖Σ╛ï tripπÇüREQ-004 τè╢µÇüµ«╡∩╝¢µùáσüÅσÑ╜τ¢╕σà│Φíî |
| Living Spec | `openspec/specs/` | Σ╗à `greeting`∩╝¢`trips`/`invitations`/`preferences` τÜä delta σ░Üµ£¬σ╜Æµíú |
| Φ«íσêÆσÑæτ║ª | `docs/knowledge/architecture/tech-stack-plan.md` ┬º5/┬º6 | `tag` Φí¿πÇü`{data,error}` σ░üσÑùπÇü`X-Member-Id`∩╝îΣ╕ÄΣ╗úτáüΣ╕ìΣ╕ÇΦç┤ |

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| Φ┐üτº╗ | `V1`πÇü`V2`πÇü`V3`∩╝¢`V4` σ▒₧ REQ-019 | **µùáµû░σó₧Φ┐üτº╗**∩╝¢σÅ¬σåÖσàÑ `kind='must_do'` τÜäΦíî |
| σÉÄτ½» | `com.gogo.trip`πÇü`com.gogo.invitation`∩╝¢`com.gogo.preference` τö▒ REQ-019 σê¢σ╗║ | σ£¿ `com.gogo.preference` σåàµû░σó₧ must-do τ½»τé╣πÇüitem DTOπÇüµáíΘ¬îΣ╕Ä id τ¡╛σÅæ |
| µÄÑσÅúΘ¥ó | trip / invitation / greeting∩╝¢∩╝êREQ-019 σÉÄµû░σó₧ `/preferences`∩╝ë | µû░σó₧ `GET`/`PUT /api/trips/{tripId}/preferences/must-dos` |
| σëìτ½» | home / create / details / join∩╝¢∩╝êREQ-019 σÉÄµû░σó₧σüÅσÑ╜Θí╡∩╝ë | σüÅσÑ╜Θí╡µû░σó₧σ┐àσüÜΘí╣µ«╡∩╝ÜσêùΦí¿ + σåàΦüöΦí¿σìò + σêáΘÖñ∩╝îΘÇÉσè¿Σ╜£ PUT |
| µûçµíú | trip Σ╕Ä invitation µÄÑσÅúσ╖▓Φ«░σ╜ò | `README.md` σó₧σ┐àσüÜΘí╣µ«╡πÇüΘ¬îΦ»üτƒ⌐Θÿ╡σó₧Φíî |
| Living Spec | Σ╗à `greeting` | σ╜Æµíúµù╢σÉæ `preferences` Φ┐╜σèáσ┐àσüÜΘí╣ requirement∩╝îσ╣╢Σ┐«Φ«óΘí╡Θ¥óΦªüµ▒é |

## 4. Blast radius

- σà┤Φ╢úτ½»τé╣πÇüσà┤Φ╢ú payload Σ╕Äσà┤Φ╢úΣ┐¥σ¡ÿµîëΘÆ«**Σ╕ìσÅÿ**∩╝¢Σ╕ñµ¥íσåÖσàÑΦ╖»σ╛äΣ║ÆΣ╕ìΦ┐₧σ╕ªπÇé
- σÉîΣ╕Çσ╝áΦí¿πÇüσÉîΣ╕ÇΣ╕¬ `kind` τ╗┤σ║ªµû░σó₧σÅûσÇ╝∩╝îΣ╕ìµö╣σêùπÇüΣ╕ìµö╣σö»Σ╕ÇΘö«πÇé
- `App.jsx` Σ╕ìµû░σó₧Φ╖»τö▒∩╝êσüÅσÑ╜Θí╡Φ╖»τö▒τö▒ REQ-019 µÅÉΣ╛¢∩╝ëπÇé
- σëìσÉÄτ½»σ¥çΣ╕ìµû░σó₧Σ╛¥Φ╡û∩╝¢Φ┐ÉΦíîµù╢µïôµëæΣ╕ìσÅÿ∩╝ê8080 / 5173∩╝ëπÇé
- σ»╣ US-031 µÿ»**σÅ¬σó₧Σ╕ìµö╣**τÜäµò░µì«Σ╛¢τ╗Ö∩╝ÜσñÜΣ╕ÇΣ╕¬ `kind` σÅ»Φ»╗∩╝îΣ╕ìσ╜▒σôìµùóµ£ëΦ»╗σÅûπÇé

## 5. Artifact impact

- Spec∩╝Ü`openspec/changes/req-020-manage-must-do/specs/preferences/spec.md`∩╝êP2∩╝ë∩╝ÜΣ╕ÇΣ╕¬ ADDED σ┐àσüÜΘí╣ requirement + Σ╕ÇΣ╕¬ MODIFIED Θí╡Θ¥ó requirementπÇé
- Tests∩╝ÜσÉÄτ½»µÄÑσÅúµ╡ïΦ»òΦªåτ¢û 20 Σ╕¬σ£║µÖ»∩╝¢σëìτ½»µ₧äσ╗║ + µ╡ÅΦºêσÖ¿Φºéσ»ƒ∩╝êµ╖╗σèá / µö╣µù╢Θù┤ / σêáΘÖñ / σê╖µû░∩╝ëπÇé
- Docs∩╝Ü`README.md`πÇü`docs/feedback/verification-*.md`πÇü`requirement-workspace/{registry,handoff}.md`πÇé
- KB∩╝Üµùáµû░σó₧Θò┐µ£ƒΣ║ïσ«₧∩╝êσÉîΦí¿Σ╕ìσÉî kind σ▒₧Σ║ÄΦâ╜σè¢ΦíîΣ╕║∩╝îσåÖ delta spec σì│σÅ»∩╝ëπÇé

## 6. Dual-track notes

σìòµ¥íµòàΣ║ï∩╝êUS-020∩╝ëπÇüσìòΦâ╜σè¢∩╝ê`preferences` τÜäΣ┐«µö╣∩╝ëπÇü20 Σ╕¬σ£║µÖ» ΓåÆ `/sdd:story-split` Φ╖│Φ┐çσ╣╢Φ«░σ╜òτÉåτö▒πÇéΣ╗à OpenSpec Φ╜¿πÇé

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | REQ-019 τÜä `V4` Σ╕ÄσüÅσÑ╜Θí╡σ░Üµ£¬ΦÉ╜σ║ô∩╝îµ£¼σÅÿµ¢┤σìòτï¼σÉêσàÑµùáµ│òΦ┐ÉΦíî | blocking for merge order | τ╝ôΦºú∩╝ÜσáåσÅáΣ║ñΣ╗ÿ∩╝îPR µÅÅΦ┐░σåÖµÿÄσëìτ╜«∩╝¢REQ-019 σàêσÉêσåìσÉêµ£¼µ¥í |
| R2 | µ¥íτ¢« id σ¡ÿσ£¿ JSON µò░τ╗äσåà∩╝îµùáµò░µì«σ║ôτ║ªµ¥ƒ∩╝¢id σêåΘàìτ╝║ΘÖ╖Σ╝ÜΘ¥ÖΘ╗ÿΣ║ºτöƒΘçìσñìµêûΣ╕▓σÅ╖ | product correctness | τ╝ôΦºú∩╝Üµ╡ïΦ»òµû¡Φ¿Çµ¢┤µû░σÉÄµ¥íµò░Σ╕Ä id Θ¢åσÉêΣ╕ìσÅÿ∩╝¢Φ»äσ«íΦüÜτäª id σêåµö» |
| R3 | σÉîΣ╕ÇΦ╖»σ╛äσëìτ╝ÇΣ╕ïµû░σó₧σ¡ÉΦ╡äµ║É∩╝îΦïÑµÿáσ░äσåÖµêÉ `/{tripId}/preferences/**` µêûΣ╜┐τö¿ΘÇÜΘàì∩╝îσÅ»Φâ╜σ╜▒σôìσà┤Φ╢úτ½»τé╣ | integration | τ╝ôΦºú∩╝ÜP3 τí«Φ«ñ Spring τ▓╛τí«σî╣Θàì∩╝¢σà┤Φ╢úτ½»τé╣τÜäσ¢₧σ╜Æµ╡ïΦ»òσ┐àΘí╗σ£¿σÉîΣ╕Çµ¼íΦ╖æ |
| R4 | Θí╡Θ¥óσÑæτ║ªσå▓τ¬ü∩╝Üσà┤Φ╢úµ«╡πÇîµÿ╛σ╝ÅΣ┐¥σ¡ÿπÇìΣ╕Äµ£¼µ«╡πÇîσè¿Σ╜£σì│Σ┐¥σ¡ÿπÇìσÉîΘí╡σà▒σ¡ÿ | contract | σ╖▓Φºú∩╝ÜP2 µèèΘí╡Θ¥ó requirement µáç MODIFIED∩╝îµîëµ«╡σåÖµÿÄσåÖσàÑµù╢µ£║∩╝êD12∩╝ë |
| R5 | σÅéΦÇâσ¢╛Φí¿σìòσåÖπÇîΣ║îΘÇëΣ╕ÇπÇì∩╝îτàºµèäΣ╝ÜΘÿ╗τóì AC1 σÉîµù╢Σ┐¥σ¡ÿσ£░τé╣Σ╕Äµù╢Θù┤ | UI alignment | σ╖▓Φºú∩╝ÜD6 σàüΦ«╕σÉîµù╢Σ┐¥σ¡ÿ∩╝¢µûçµíêΣ┐«µ¡úσêùΣ╕║ WARNING |
| R6 | `com.gogo.preference` τÜä advice Σ╛¥Φ╡û REQ-019 σàêσ╗║∩╝îτ╝║σñ▒µù╢ `INVALID_REQUEST` Σ╕ìΣ║ºτöƒ | integration | τ╝ôΦºú∩╝ÜΦïÑ REQ-019 µ£¬σ╗║∩╝îµ£¼σÅÿµ¢┤Φç¬σ╕ª advice |
| R7 | `time` Σ╕ìσ╕ªµùÑµ£ƒ∩╝îσñÜµùÑΦíîτ¿ïµùáµ│òσ«ÜΣ╜ì | product scope | σ╖▓τƒÑσüÅτª╗∩╝Üσñ╣σà╖Σ╕║σìòµùÑ∩╝îµë⌐σ▒òτòÖτ╗Ö US-031∩╝êOQ-12∩╝ë |
| R8 | Web σëìτ½»Σ╕Çµ¼í PUT µÅÉΣ║ñµò┤Φí¿∩╝îµ¥íτ¢«σñÜµù╢σôìσ║öΣ╜ôµö╛σñº | operational | Σ╕ìΘÿ╗µû¡∩╝¢P2 σ╖▓Φúüσ«ÜΣ╕ìΦ«╛Σ╕èΘÖÉ∩╝êdelta C6∩╝ë∩╝îOQ-11 σà│Θù¡∩╝îΘúÄΘÖ⌐τòÖΣ╜£Φºéσ»ƒΘí╣ |

µùáΦç┤σæ╜Θÿ╗σí₧Σ╜┐ REQ-020 σñ▒µòê∩╝îµïåσêåσÅ»Σ╗Ñτ╗ºτ╗¡πÇé

## 8. Suggested split boundaries

Σ╕ÇΣ╕¬σÅÿµ¢┤∩╝Ü`req-020-manage-must-do`∩╝îΣ┐«µö╣Σ╕ÇΣ╕¬σ╖▓µ£ëΦâ╜σè¢ `preferences`πÇé
σ╖ÑΣ╜£ΘçÅ∩╝Üσ░ÅΓÇöΓÇöσÉÄτ½» 1 Σ╕¬ controller σêåµö» + 1 Σ╕¬ service µû╣µ│ò + 1 τ╗ä DTO + 1 τ╗äµÄÑσÅúµ╡ïΦ»ò∩╝êΘ¢╢Φ┐üτº╗∩╝ë∩╝¢
σëìτ½» 1 Σ╕¬Θí╡Θ¥óσî║σ¥ù + µá╖σ╝ÅπÇé
Σ╛¥Φ╡ûΘí║σ║Å∩╝ÜREQ-019 τÜä `V4`/σüÅσÑ╜Θí╡∩╝êσëìτ╜«∩╝ëΓåÆ must-do τ½»τé╣Σ╕ÄµáíΘ¬î ΓåÆ `GET` σ¢₧Φ»╗ ΓåÆ Θí╡Θ¥óσî║σ¥ù ΓåÆ Θ¬îΦ»üµûçµíúπÇé

σÉêσàÑΘí║σ║Å∩╝ÜREQ-019 ΓåÆ REQ-020∩╝îΣ╕ìσ╛ùΘóáσÇÆ∩╝êΦ┐üτº╗Σ╕ÄΘí╡Θ¥óσ¥çτö▒σëìΦÇàµÅÉΣ╛¢∩╝ëπÇé

# Impact brief ΓÇö REQ-024

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`∩╝êblocking OQs = 0∩╝îDoR BLOCKERs = 0∩╝ë
- Change id: `req-024-set-trip-budget`
- Stacking: σáåσÅáσ£¿ `req-019-save-interests` ΓåÆ `req-020-manage-must-do` Σ╣ïσÉÄ∩╝¢Σ╕ñΦÇàσ¥çµ£¬σÉê main

## 1. Requirement set

| id | Path |
|---|---|
| REQ-024 | `requirement-workspace/requirements/REQ-024.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-024∩╝î
`requirement-workspace/intents/2026-11-15-req-024.md`∩╝î
`requirement-workspace/analysis/req-024-dor.md`∩╝î
`docs/knowledge/architecture/tech-stack-plan.md` ┬º5/┬º6∩╝êΦí¿Σ╕ÄΘçæΘó¥σÅúσ╛äτÜäµ¥âσ¿ü∩╝ë∩╝î
`openspec/changes/req-019-save-interests/`∩╝êΦí¿Σ╕ÄΘí╡Θ¥óσÑæτ║ªτÜäµ¥Ñµ║É∩╝ëπÇü
`openspec/changes/req-020-manage-must-do/`∩╝êσÉîΦí¿Σ╕ìσÉî kind Σ╕ÄΘí╡Θ¥óΣ┐«Φ«óτÜäσàêΣ╛ï∩╝ëπÇé

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Φ║½Σ╗╜ | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` Φ»╖µ▒éσñ┤∩╝êµò┤µò░∩╝ë∩╝¢τ╝║σñ▒µêûΘ¥₧ seed τö¿µê╖ ΓåÆ `401 USER_REQUIRED` |
| trip / member Φí¿ | `V2__create_trip.sql` | `app_user` 1ΓÇô5πÇü`trip` 1πÇü`trip_member` 1ΓÇô4 |
| ΘéÇΦ»╖Σ╕ÄΣ╕╗τ║┐τè╢µÇü | `V3__create_invitation.sql` | `trip_invitation` + `trip.main_plan_confirmed`∩╝êΘ╗ÿΦ«ñ 0∩╝îUS-037 Σ╣ïσëìµùáσåÖσàÑΦ╖»σ╛ä∩╝ë |
| σüÅσÑ╜Φí¿ | `openspec/changes/req-019-save-interests/proposal.md` Σ╕Ä `specs/preferences/spec.md` | **Φ«íσêÆΣ╕¡τÜä `V4` + `member_preference`∩╝îσ░Üµ£¬ΦÉ╜σ║ô**∩╝¢UNIQUE(`trip_id`,`user_id`,`kind`) |
| σüÅσÑ╜τ½»τé╣ | σÉîΣ╕è∩╝¢REQ-020 τÜä proposal | `/preferences` Σ╕Ä `/preferences/must-dos` σ¥ç**σ░Üµ£¬σ«₧τÄ░** |
| σüÅσÑ╜Θí╡ | σÉîΣ╕è | `#/trips/{tripId}/preferences`∩╝î**σ░Üµ£¬σ«₧τÄ░** |
| µêÉσæÿσêñσ«Ü | `TripRepository.isMember(long, long)` | σÅ»τ¢┤µÄÑσñìτö¿ |
| ΘöÖΦ»»σñäτÉå | `TripErrorAdvice`∩╝ê`com.gogo.trip`∩╝ëπÇü`InvitationErrorAdvice`∩╝ê`com.gogo.invitation`∩╝ë | µîëσîàΘÜöτª╗∩╝¢`com.gogo.preference` Θ£ÇΦç¬σ╕ª advice∩╝êREQ-019 Φ┤ƒΦ┤ú∩╝ë |
| DB Φ«┐Θù« | `TripRepository` / `InvitationRepository` | `JdbcTemplate`∩╝îµùá ORM |
| ΘçæΘó¥σÅúσ╛ä | `docs/knowledge/architecture/tech-stack-plan.md` ┬º5 | πÇîΘçæΘó¥τö¿ `INTEGER` σêåπÇì∩╝¢µ£¼Θ£Çµ▒éΘçæΘó¥σ¡ÿµ£Çσ░ÅΦ┤ºσ╕üσìòΣ╜ìµò┤µò░ |
| `kind` σÅûσÇ╝σƒƒ | σÉîΣ╕è ┬º5 | `interest`/`must_do`/`constraint`/`budget`ΓÇöΓÇö`budget` σ╖▓σ£¿Φ«íσêÆµ₧ÜΣ╕╛σåà∩╝îσñìτö¿Φí¿Σ╕ìτ«ùσüÅτª╗ |
| σëìτ½» | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | µëïσåÖ hash Φ╖»τö▒πÇü`api()` σ░üΦúàπÇüΘí╢Θâ¿ demo Φ║½Σ╗╜ΘÇëµï⌐σÖ¿∩╝ê1ΓÇô5∩╝ë∩╝îµùáτ╗äΣ╗╢σ║ô |
| σñ╣σà╖ | `acceptance-test-fixtures.md` | τö¿µê╖πÇüµá╖Σ╛ï tripπÇüREQ-004 τè╢µÇüµ«╡∩╝¢µùáσüÅσÑ╜/Θóäτ«ùΦíî |
| Living Spec | `openspec/specs/` | Σ╗à `greeting` |
| Φ«íσêÆσÑæτ║ª | `tech-stack-plan.md` ┬º6 | πÇî`PUT /preferences` Σ╕Çµ¼íµÅÉΣ║ñσ¢¢τ▒╗σüÅσÑ╜πÇìΣ╕Ä `{data,error}` σ░üσÑùπÇü`X-Member-Id`∩╝îΣ╕ÄΣ╗úτáüΣ╕ìΣ╕ÇΦç┤ |

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| Φ┐üτº╗ | `V1`πÇü`V2`πÇü`V3`∩╝¢`V4` σ▒₧ REQ-019 | **µùáµû░σó₧Φ┐üτº╗**∩╝¢σÅ¬σåÖσàÑ `kind='budget'` τÜäΦíî |
| σÉÄτ½» | `com.gogo.trip`πÇü`com.gogo.invitation`∩╝¢`com.gogo.preference` τö▒ REQ-019 σê¢σ╗║ | σ£¿ `com.gogo.preference` σåàµû░σó₧ budget τ½»τé╣πÇüDTOπÇüΣ╕ëσ¡ùµ«╡Φüöσè¿µáíΘ¬îΣ╕ÄσìòΦíîΦªåτ¢ûσåÖ |
| µÄÑσÅúΘ¥ó | trip / invitation / greeting∩╝¢∩╝êREQ-019 σÉÄ `/preferences`∩╝¢REQ-020 σÉÄ `/preferences/must-dos`∩╝ë | µû░σó₧ `GET`/`PUT /api/trips/{tripId}/preferences/budget` |
| σëìτ½» | home / create / details / join∩╝¢∩╝êREQ-019/020 σÉÄσüÅσÑ╜Θí╡σÉ½σà┤Φ╢úµ«╡Σ╕Äσ┐àσüÜΘí╣µ«╡∩╝ë | σüÅσÑ╜Θí╡µû░σó₧Θóäτ«ùµ«╡∩╝ÜΘçæΘó¥ + σ╕üτºì + Φ╜»/τí¼ + τï¼τ½ïΣ┐¥σ¡ÿµîëΘÆ« + µ╕àΘÖñ |
| µûçµíú | trip Σ╕Ä invitation µÄÑσÅúσ╖▓Φ«░σ╜ò | `README.md` σó₧Θóäτ«ùµ«╡πÇüΘ¬îΦ»üτƒ⌐Θÿ╡σó₧Φíî |
| Living Spec | Σ╗à `greeting` | σ╜Æµíúµù╢σÉæ `preferences` Φ┐╜σèáΘóäτ«ù requirement∩╝îσ╣╢τ¼¼Σ╕ëµ¼íΣ┐«Φ«óΘí╡Θ¥óΦªüµ▒é |

## 4. Blast radius

- σà┤Φ╢úµ«╡Σ╕Äσ┐àσüÜΘí╣µ«╡τÜäτ½»τé╣πÇüpayload Σ╕ÄΣ┐¥σ¡ÿΣ║ñΣ║Æ**Σ╕ìσÅÿ**∩╝¢Σ╕ëµ¥íσåÖσàÑΦ╖»σ╛äΣ║ÆΣ╕ìΦ┐₧σ╕ªπÇé
- σÉîΣ╕Çσ╝áΦí¿πÇüσÉîΣ╕ÇΣ╕¬ `kind` τ╗┤σ║ªµû░σó₧σÅûσÇ╝∩╝îΣ╕ìµö╣σêùπÇüΣ╕ìµö╣σö»Σ╕ÇΘö«πÇé
- `App.jsx` Σ╕ìµû░σó₧Φ╖»τö▒∩╝êσüÅσÑ╜Θí╡Φ╖»τö▒τö▒ REQ-019 µÅÉΣ╛¢∩╝ëπÇé
- σëìσÉÄτ½»σ¥çΣ╕ìµû░σó₧Σ╛¥Φ╡û∩╝¢Φ┐ÉΦíîµù╢µïôµëæΣ╕ìσÅÿ∩╝ê8080 / 5173∩╝ëπÇé
- σ»╣ US-031 µÿ»**σÅ¬σó₧Σ╕ìµö╣**τÜäµò░µì«Σ╛¢τ╗Ö∩╝ÜσñÜΣ╕ÇΣ╕¬ `kind` σÅ»Φ»╗∩╝êσÉ½ `budget:null` τÜäµÿ╛σ╝Åµ£¬Φ«╛τ╜«∩╝ë∩╝îΣ╕ìσ╜▒σôìµùóµ£ëΦ»╗σÅûπÇé

## 5. Artifact impact

- Spec∩╝Ü`openspec/changes/req-024-set-trip-budget/specs/preferences/spec.md`∩╝êP2∩╝ë∩╝ÜΣ╕ÇΣ╕¬ ADDED Θóäτ«ù requirement + τ¼¼Σ╕ëµ¼í MODIFIED Θí╡Θ¥ó requirementπÇé
- Tests∩╝ÜσÉÄτ½»µÄÑσÅúµ╡ïΦ»òΦªåτ¢û 25 Σ╕¬σ£║µÖ»∩╝¢σëìτ½»µ₧äσ╗║ + µ╡ÅΦºêσÖ¿Φºéσ»ƒ∩╝êΣ┐¥σ¡ÿ / µö╣Φ╜»τí¼ / µ╕àΘÖñ / 0 Σ╕Äµ£¬Φ«╛τ╜«τÜäτòîΘ¥óσî║σêå / σê╖µû░∩╝ëπÇé
- Docs∩╝Ü`README.md`πÇü`docs/feedback/verification-*.md`πÇü`requirement-workspace/{registry,handoff}.md`πÇé
- KB∩╝ÜΦïÑ P4 τí«Φ«ñΘçæΘó¥σìòΣ╜ìΣ╕Äσ╕üτºìΦí¿µÿ»Θò┐µ£ƒσÅúσ╛ä∩╝îΘ£Çσ¢₧σåÖ `tech-stack-plan.md` ┬º5∩╝êσ╜ôσëìσ╖▓σåÖµÿÄπÇîΘçæΘó¥τö¿ INTEGER σêåπÇì∩╝îµùáΘ£Çµû░σó₧∩╝ëπÇé

## 6. Dual-track notes

σìòµ¥íµòàΣ║ï∩╝êUS-024∩╝ëπÇüσìòΦâ╜σè¢∩╝ê`preferences` τÜäΣ┐«µö╣∩╝ëπÇü25 Σ╕¬σ£║µÖ» ΓåÆ `/sdd:story-split` Φ╖│Φ┐çσ╣╢Φ«░σ╜òτÉåτö▒πÇéΣ╗à OpenSpec Φ╜¿πÇé

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | REQ-019 τÜä `V4` Σ╕ÄσüÅσÑ╜Θí╡σ░Üµ£¬ΦÉ╜σ║ô∩╝îΣ╕ö REQ-020 σ╖▓σàêΣ╕Çµ¼í MODIFIED Θí╡Θ¥óσÑæτ║ª∩╝¢µ£¼σÅÿµ¢┤µÿ»τ¼¼Σ╕ëσ▒é∩╝îσìòτï¼σÉêσàÑµùáµ│òΦ┐ÉΦíî | blocking for merge order | τ╝ôΦºú∩╝ÜσáåσÅáΣ║ñΣ╗ÿ∩╝îσÉêσàÑΘí║σ║Å 019 ΓåÆ 020 ΓåÆ 024∩╝îPR µÅÅΦ┐░σåÖµÿÄσëìτ╜« |
| R2 | API/payload τö¿µ£Çσ░ÅσìòΣ╜ì∩╝ê`4000`∩╝ëΦÇî AC τö¿Σ╕╗σìòΣ╜ì∩╝ê40 SGD∩╝ë∩╝îµû¡Φ¿ÇσÅ¬σåÖΣ╕ÇσìèΣ╝Üµ╝ÅµÄëτòîΘ¥óΦ»╗µ│ò | product correctness | τ╝ôΦºú∩╝ÜP4 µû¡Φ¿ÇσÅîσåÖ∩╝êµÄÑσÅú `4000` + τòîΘ¥ó `SGD 40.00`∩╝ë |
| R3 | `JPY` Θ¢╢Σ╜ìσ░Åµò░∩╝¢σëìτ½»τí¼τ╝ûτáü ├ù100 Σ╝Üµèè `1200` µÿ╛τñ║µêÉ `12.00` µêûΦó½µö╛σñº 100 σÇì | product correctness | τ╝ôΦºú∩╝Üσ╕üτºìσ░Åµò░Σ╜ìΦí¿∩╝ê2/2/2/2/0∩╝ë∩╝îτªüµ¡óτí¼τ╝ûτáü∩╝¢AC3e τ¢┤µÄÑΦªåτ¢û |
| R4 | πÇî`amount` Θö«τ╝║σñ▒πÇìΣ╕ÄπÇî`amount:null`πÇìΦïÑΘâ╜µÿáσ░äµêÉ null∩╝îAC7-N σñ▒µòêΣ╕öπÇîµ╕àΘÖñπÇìΣ╕ÄπÇîσ¥ÅΦ»╖µ▒éπÇìµ╖╖σÉî | contract | τ╝ôΦºú∩╝ÜP3 τö¿ `JsonNode`/`Map` σüÜ presence µúÇµƒÑ∩╝îσåìµÿáσ░ä DTO |
| R5 | payload µÿ»σìòσ»╣Φ▒í∩╝îµò░µì«σ║ôµùáµ│òτ║ªµ¥ƒπÇîΦíîµò░µüÆ 1πÇì∩╝¢µÅÆσàÑσåÖµ│òΘöÖΦ»»Σ╝ÜΣ║ºτöƒσñÜΦíî | data integrity | τ╝ôΦºú∩╝Ü`INSERT ... ON CONFLICT(trip_id,user_id,kind) DO UPDATE`∩╝¢µ╡ïΦ»òµû¡Φ¿ÇΦíîµò░µüÆ 1 |
| R6 | Σ╕ëΣ╕¬σàäσ╝ƒσ¡ÉΦ╡äµ║É∩╝ê`/preferences`πÇü`/must-dos`πÇü`/budget`∩╝ëσÉîσëìτ╝Ç∩╝¢µÿáσ░äσåÖσ«╜Σ╝ÜΣ║Æτ¢╕Θü«Φö╜ | integration | τ╝ôΦºú∩╝ÜP3 τí«Φ«ñτ▓╛τí«σî╣Θàì∩╝¢σà┤Φ╢úΣ╕Äσ┐àσüÜΘí╣τÜäσ¢₧σ╜Æµ╡ïΦ»òσÉîΣ╕Çµ¼íΦ╖æ |
| R7 | σÉîΘí╡Σ╕ëµ«╡Σ╕ëτºìσåÖσàÑµù╢µ£║∩╝îΘí╡Θ¥óσÑæτ║ªτ¼¼Σ╕ëµ¼íΣ┐«Φ«ó∩╝îµ₧üµÿôΦó½πÇîτ╗ƒΣ╕ÇπÇìµêÉΣ╕Çτºì | contract | σ╖▓Φºú∩╝ÜP2 Σ╗Ñ REQ-020 τÜäτëêµ£¼Σ╕║σƒ║τ║┐σåìΣ┐«Φ«ó∩╝îΘÇÉµ«╡σåÖµÿÄ |
| R8 | σÅéΦÇâσ¢╛Θóäτ«ùσìíσ╕üτºìΣ╕ìσÉ½ SGDπÇüΘçæΘó¥Θ╗ÿΦ«ñ 1200πÇüµÅÉΣ║ñΦ╡░σà¿Θí╡ `submitPref()` | UI alignment | σ╖▓Φºú∩╝ÜτÖ╜σÉìσìòΦíÑ SGDπÇüµùáΘ╗ÿΦ«ñΘçæΘó¥πÇüµ«╡σåàτï¼τ½ïΣ┐¥σ¡ÿ∩╝¢UI µö╣σè¿σêù WARNING |
| R9 | `tech-stack-plan.md` ┬º6 τÜäπÇîσìò PUT µÅÉΣ║ñσ¢¢τ▒╗σüÅσÑ╜πÇìΣ╕Äµ£¼Θ£Çµ▒éτï¼τ½ïτ½»τé╣µ╝éτº╗ | docs | σ╖▓τƒÑσüÅτª╗∩╝ÜΦ╖ƒΘÜÅ AC Σ╕Äµùóµ£ë delta∩╝¢µûçµíúΣ┐«µ¡úσ╣╢σàÑ REQ-019 OQ-16 |

µùáΦç┤σæ╜Θÿ╗σí₧Σ╜┐ REQ-024 σñ▒µòê∩╝îµïåσêåσÅ»Σ╗Ñτ╗ºτ╗¡πÇé

## 8. Suggested split boundaries

Σ╕ÇΣ╕¬σÅÿµ¢┤∩╝Ü`req-024-set-trip-budget`∩╝îΣ┐«µö╣Σ╕ÇΣ╕¬σ╖▓µ£ëΦâ╜σè¢ `preferences`πÇé
σ╖ÑΣ╜£ΘçÅ∩╝Üσ░ÅΓÇöΓÇöσÉÄτ½» 1 Σ╕¬ controller σêåµö» + 1 Σ╕¬ service µû╣µ│ò + 1 τ╗ä DTO + 1 τ╗äµÄÑσÅúµ╡ïΦ»ò∩╝êΘ¢╢Φ┐üτº╗∩╝ë∩╝¢
σëìτ½» 1 Σ╕¬Θí╡Θ¥óσî║σ¥ù + σ╕üτºìσ░Åµò░Σ╜ìµá╝σ╝ÅσîûπÇé
Σ╛¥Φ╡ûΘí║σ║Å∩╝ÜREQ-019 τÜä `V4`/σüÅσÑ╜Θí╡ ΓåÆ REQ-020 τÜäΘí╡Θ¥óΣ┐«Φ«ó ΓåÆ budget τ½»τé╣Σ╕ÄµáíΘ¬î ΓåÆ `GET` σ¢₧Φ»╗ ΓåÆ Θí╡Θ¥óσî║σ¥ù ΓåÆ Θ¬îΦ»üµûçµíúπÇé

σÉêσàÑΘí║σ║Å∩╝ÜREQ-019 ΓåÆ REQ-020 ΓåÆ REQ-024∩╝îΣ╕ìσ╛ùΘóáσÇÆ∩╝êΦ┐üτº╗Σ╕ÄΘí╡Θ¥óσÑæτ║ªΘÇÉσ▒éσÅáσèá∩╝ëπÇé

# Impact brief ΓÇö REQ-026

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`∩╝êblocking OQs = 0∩╝îDoR BLOCKERs = 0∩╝ë
- Change id: `req-026-submit-preferences`
- Stacking: σáåσÅáσ£¿ `req-019-save-interests` ΓåÆ `req-020-manage-must-do` ΓåÆ `req-024-set-trip-budget` Σ╣ïσÉÄ∩╝¢Σ╕ëΦÇàσ¥çµ£¬σÉê main
- Scope: US-026 + US-027 σÉêσ╣╢Σ╕║Σ╕Çµ¥íΘ£Çµ▒é∩╝êτö¿µê╖Φúüσ«Ü∩╝ë

## 1. Requirement set

| id | Path |
|---|---|
| REQ-026∩╝êUS-026 + US-027∩╝ë | `requirement-workspace/requirements/REQ-026.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-026∩╝î
`requirement-workspace/intents/2026-11-15-req-026.md`∩╝î
`requirement-workspace/analysis/req-026-dor.md`∩╝î
`docs/knowledge/architecture/tech-stack-plan.md` ┬º5/┬º6∩╝î
`openspec/changes/req-019-save-interests/`∩╝êΦí¿Σ╕ÄΘí╡Θ¥óσÑæτ║ªµ¥Ñµ║É∩╝ëπÇü
`openspec/changes/req-020-manage-must-do/`πÇü`openspec/changes/req-024-set-trip-budget/`∩╝êσÉîΦí¿Σ╕ìσÉî kind Σ╕ÄΘí╡Θ¥óΣ┐«Φ«óσàêΣ╛ï∩╝ëπÇé

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Φ║½Σ╗╜ | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` Φ»╖µ▒éσñ┤∩╝êµò┤µò░∩╝ë∩╝¢τ╝║σñ▒/Θ¥₧µò┤µò░/Θ¥₧ seed τö¿µê╖ ΓåÆ `401 USER_REQUIRED` |
| trip / member Φí¿ | `V2__create_trip.sql` | `app_user` 1ΓÇô5πÇü`trip` 1πÇü`trip_member` 1ΓÇô4∩╝ê**σÅ¬µ£ëΣ╕ñσêùΣ╕╗Θö«∩╝îµùáσ░▒τ╗¬σêù**∩╝ë |
| ΘéÇΦ»╖Σ╕ÄΣ╕╗τ║┐τè╢µÇü | `V3__create_invitation.sql` | `trip.main_plan_confirmed`∩╝êΘ╗ÿΦ«ñ 0∩╝îUS-037 σëìµùáσåÖσàÑΦ╖»σ╛ä∩╝ë |
| σüÅσÑ╜Φí¿ | `openspec/changes/req-019-save-interests/proposal.md` | Φ«íσêÆΣ╕¡τÜä `V4` + `member_preference`∩╝î**σ░Üµ£¬ΦÉ╜σ║ô**∩╝¢UNIQUE(`trip_id`,`user_id`,`kind`) |
| σüÅσÑ╜τ½»τé╣ | REQ-019/020/024 τÜä proposal | `/preferences`πÇü`/preferences/must-dos`πÇü`/preferences/budget` σ¥ç**σ░Üµ£¬σ«₧τÄ░** |
| σüÅσÑ╜Θí╡ | σÉîΣ╕è | `#/trips/{tripId}/preferences`∩╝î**σ░Üµ£¬σ«₧τÄ░** |
| µêÉσæÿΘí╡ | `requirement-workspace/deep-dive.md`∩╝êUS-013 µ«╡∩╝ë | Φèéτé╣ 7 τÜäσ░▒τ╗¬τÄ»σ£¿Θ£Çµ▒éσ▒éσ╖▓µ£ëτ║ªσ«Ü∩╝î**σ░Üµ£¬σ«₧τÄ░** |
| µêÉσæÿσêñσ«Ü | `TripRepository.isMember(long, long)` | σÅ»τ¢┤µÄÑσñìτö¿ |
| ΘöÖΦ»»σñäτÉå | `TripErrorAdvice`πÇü`InvitationErrorAdvice` | µîëσîàΘÜöτª╗∩╝¢**µùá 500 µÿáσ░ä**∩╝î500 Φ╡░ Spring Θ╗ÿΦ«ñΣ╜ô |
| µùóµ£ëΘöÖΦ»»τáü | `TripController.java` | `USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST`∩╝¢REQ-019/020/024 τÜäµûçµíúΣ╣ƒτö¿Φ┐Öσ¢¢Σ╕¬τáü∩╝îµùáµ╝éτº╗ |
| DB Φ«┐Θù« | `TripRepository` / `InvitationRepository` | `JdbcTemplate`∩╝îµùá ORM |
| `kind` σÅûσÇ╝σƒƒ | `tech-stack-plan.md` ┬º5 | `interest`/`must_do`/`constraint`/`budget`∩╝¢µùáσ░▒τ╗¬τ▒╗ |
| σëìτ½» | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | µëïσåÖ hash Φ╖»τö▒πÇü`api()` σ░üΦúàπÇüΘí╢Θâ¿Φ║½Σ╗╜ΘÇëµï⌐σÖ¿∩╝ê1ΓÇô5∩╝ë∩╝îµùáτ╗äΣ╗╢σ║ô |
| σÅéΦÇâσ¢╛ | `ui-design-reference/gogo-mvp-prototype.html`πÇü`README.md` Φèéτé╣ 7/8 | `submitPref()` Σ╕ÇΘö«Σ┐¥σ¡ÿ+σ░▒τ╗¬∩╝¢`noPrefSw` Σ╗à `hide`∩╝¢Φèéτé╣ 7 Σ╕ëΦë▓ pill |
| σñ╣σà╖ | `acceptance-test-fixtures.md` | τö¿µê╖πÇüµá╖Σ╛ï tripπÇüREQ-004 τè╢µÇüµ«╡∩╝¢µùá US-026/US-027 Φíî |
| Living Spec | `openspec/specs/` | Σ╗à `greeting` |

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| Φ┐üτº╗ | `V1`ΓÇô`V3`∩╝¢`V4` σ▒₧ REQ-019 | **µùáµû░σó₧Φ┐üτº╗**∩╝¢µû░σó₧ `kind='submission'` Φíî |
| σÉÄτ½» | `com.gogo.trip` / `com.gogo.invitation`∩╝¢`com.gogo.preference` τö▒ REQ-019 σê¢σ╗║ | µû░σó₧ submission τ½»τé╣πÇüreadiness Σ╕Ä effective Σ╕ñΣ╕¬σÅ¬Φ»╗τ½»τé╣πÇüτ⌐║µÅÉΣ║ñσêñσ«ÜπÇü500 `INTERNAL_ERROR` µÿáσ░ä |
| µÄÑσÅúΘ¥ó | trip / invitation / greeting∩╝¢∩╝êσëìσ║ÅσÉÄ `/preferences`πÇü`/must-dos`πÇü`/budget`∩╝ë | µû░σó₧ `PUT /preferences/submission`πÇü`GET /preferences/readiness`πÇü`GET /preferences/effective` |
| σëìτ½» | home / create / details / join∩╝¢∩╝êσëìσ║ÅσÉÄσüÅσÑ╜Θí╡σÉ½σà┤Φ╢ú/σ┐àσüÜΘí╣/Θóäτ«ùΣ╕ëµ«╡∩╝ë | σüÅσÑ╜Θí╡µû░σó₧µÅÉΣ║ñµ«╡∩╝êµîëΘÆ« + µùáσüÅσÑ╜σ╝Çσà│ + σ░▒τ╗¬ pill + ΘöÖΦ»»µ¥í + σëìτ╜«µÅÉτñ║∩╝ë∩╝¢µêÉσæÿΘí╡σ░▒τ╗¬τÄ»Σ╕ÄΣ╕ë pill µÄÑ `readiness` |
| µûçµíú | trip / invitation µÄÑσÅú∩╝¢σüÅσÑ╜Σ╕ëµ«╡ | `README.md` σó₧µÅÉΣ║ñΣ╕Äσ░▒τ╗¬µ«╡πÇüΘ¬îΦ»üτƒ⌐Θÿ╡σó₧Φíî |
| Living Spec | Σ╗à `greeting` | σ╜Æµíúµù╢σÉæ `preferences` Φ┐╜σèá 3 Σ╕¬ ADDED requirement∩╝îσ╣╢τ¼¼σ¢¢µ¼íΣ┐«Φ«óΘí╡Θ¥óΦªüµ▒é |

## 4. Blast radius

- σëìΣ╕ëµ«╡τÜäτ½»τé╣πÇüpayload Σ╕ÄΣ┐¥σ¡ÿΣ║ñΣ║Æ**Σ╕ìσÅÿ**∩╝¢µ£¼Θ£Çµ▒éσ»╣σ«âΣ╗¼µÿ»**Φ»╗µ╢êΦ┤╣**∩╝êΣ╕ìσåÖ∩╝ëπÇé
- σÉîΣ╕Çσ╝áΦí¿πÇüσÉîΣ╕Çσö»Σ╕ÇΘö«µû░σó₧Σ╕ÇΣ╕¬ `kind` σÅûσÇ╝∩╝îΣ╕ìµö╣σêùπÇüΣ╕ìµö╣τ┤óσ╝òπÇé
- `App.jsx` Σ╕ìµû░σó₧Φ╖»τö▒∩╝¢`TripDetails.jsx` τÜäµêÉσæÿσî║Θ£ÇµÄÑ `readiness`∩╝êµò░µì«µ║Éµû░σó₧∩╝îσ▒òτñ║τ╗ôµ₧äΣ╕ìσÅÿ∩╝ëπÇé
- σëìσÉÄτ½»σ¥çΣ╕ìµû░σó₧Σ╛¥Φ╡û∩╝¢Φ┐ÉΦíîµù╢µïôµëæΣ╕ìσÅÿ∩╝ê8080 / 5173∩╝ëπÇé
- σ»╣ US-031 µÿ»**µû░σó₧Σ╕Çµ¥íσö»Σ╕ÇΦ»╗Φ╖»σ╛ä**∩╝ê`effective`∩╝ë∩╝ÜΣ╗Ñσ╛ÇτöƒµêÉΦªüΦç¬σ╖▒µï╝σ¢¢τ▒╗ kind∩╝îτÄ░σ£¿σÅ¬Φ»╗Σ╕Çµ¥íµèòσ╜▒∩╝¢Σ╜åΣ╣ƒµäÅσæ│τ¥ÇτöƒµêÉσ«₧τÄ░σ┐àΘí╗Θü╡σ╛¬σ░▒τ╗¬Φ┐çµ╗ñ∩╝îσÉªσêÖπÇîµ▓ëΘ╗ÿΓëáσÉîµäÅπÇìσñ▒µòêπÇé

## 5. Artifact impact

- Spec∩╝Ü`openspec/changes/req-026-submit-preferences/specs/preferences/spec.md`∩╝êP2∩╝ë∩╝Ü3 Σ╕¬ ADDED requirement + τ¼¼σ¢¢µ¼í MODIFIED Θí╡Θ¥ó requirementπÇé
- Tests∩╝ÜσÉÄτ½»µÄÑσÅúµ╡ïΦ»òΦªåτ¢û 40 Σ╕¬σ£║µÖ»∩╝êσÉ½σñ▒Φ┤Ñµ│¿σàÑΣ╕Äµèòσ╜▒µêÉσæÿΘ¢åσÉê∩╝ë∩╝¢σëìτ½»µ₧äσ╗║ + µ╡ÅΦºêσÖ¿Φºéσ»ƒ∩╝êµÅÉΣ║ñ / µùáσüÅσÑ╜ / σñ▒Φ┤Ñ / σñ▒Φ┤ÑσÉÄΣ╗ì pending / Φ║½Σ╗╜σêçµìó / Φèéτé╣ 7 Σ╕ë pill∩╝ëπÇé
- Docs∩╝Ü`README.md`πÇü`docs/feedback/verification-*.md`πÇü`requirement-workspace/{registry,handoff}.md`πÇé
- KB∩╝ÜΦïÑ P4 τí«Φ«ñπÇîσ░▒τ╗¬µÿ»τï¼τ½ïτè╢µÇüΦÇîΘ¥₧σüÅσÑ╜σåàσ«╣πÇìΣ╕║Θò┐µ£ƒσÅúσ╛ä∩╝îΘ£Çσ¢₧σåÖ `tech-stack-plan.md` ┬º5∩╝êσ╜ôσëìσÅ¬µ£ëσ¢¢τ▒╗ kind∩╝ëπÇé

## 6. Dual-track notes

σìòµ¥íΘ£Çµ▒é∩╝êUS-026 + US-027 σÉêσ╣╢∩╝ëπÇüσìòΦâ╜σè¢∩╝ê`preferences` τÜäΣ┐«µö╣∩╝ëπÇü40 Σ╕¬σ£║µÖ» ΓåÆ `/sdd:story-split` Φ╖│Φ┐çσ╣╢Φ«░σ╜òτÉåτö▒πÇéΣ╗à OpenSpec Φ╜¿πÇé

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | σ¢¢Σ╕¬σÅÿµ¢┤Θô╛σ╝ÅσáåσÅá∩╝ê019 τÜä `V4` Σ╕ÄσüÅσÑ╜Θí╡ ΓåÆ 020 ΓåÆ 024 ΓåÆ 026∩╝ë∩╝¢µ£¼Θ£Çµ▒éτÜä `effective` Φ┐ÿΦªüΦ»╗σëìΣ╕ëΦÇà payload∩╝îσìòτï¼σÉêσàÑµùáµ│òΦ»üµÿÄ AC1 | blocking for merge order | τ╝ôΦºú∩╝ÜσáåσÅáΣ║ñΣ╗ÿ∩╝îσÉêσàÑΘí║σ║Å 019 ΓåÆ 020 ΓåÆ 024 ΓåÆ 026∩╝îPR µÅÅΦ┐░σåÖµÿÄσëìτ╜« |
| R2 | `kind='submission'` Φ╢àσç║ `tech-stack-plan.md` ┬º5 τÜäσ¢¢τ▒╗µ₧ÜΣ╕╛∩╝îΣ╕öΦ»¡Σ╣ëΣ╗ÄπÇîσüÅσÑ╜σåàσ«╣πÇìµë⌐σê░πÇîµÅÉΣ║ñτè╢µÇüπÇì | plan drift | σ╖▓τƒÑσüÅτª╗∩╝ÜREQ-019 τÜä DoV σ╖▓Φúüσ«Ü kind σƒƒτö▒σÉÄτ╗¡ story µë⌐σ▒ò∩╝¢µûçµíúΣ┐«µ¡úσ╣╢σàÑ REQ-019 OQ-16 |
| R3 | τ⌐║µÅÉΣ║ñσêñσ«ÜΦªüΦ»╗σ¢¢τ▒╗ kind∩╝îσà╢Σ╕¡ `constraint` σ░Üµ£¬σ«₧τÄ░∩╝¢ΦïÑσ»╣τ╝║σñ▒ kind µè¢σ╝éσ╕╕∩╝îµ¡úσ╕╕µÅÉΣ║ñσà¿ 500 | product correctness | τ╝ôΦºú∩╝ÜµèèπÇîµùáΦíîπÇìσ╜ôπÇîµùáπÇìσ╣╢σ»╣ `constraint` τƒ¡Φ╖»∩╝¢EMPTY1~EMPTY5 Φªåτ¢ûσÉäτ▒╗τ⌐║µÇü |
| R4 | µ▓íµ£ë 500 µÿáσ░ä∩╝îAC2πÇîΣ┐¥σ¡ÿσñ▒Φ┤ÑπÇìσÅ¬Φâ╜µï┐σê░ Spring Θ╗ÿΦ«ñΣ╜ô∩╝êµùá `code`/`message`∩╝ë∩╝îσëìτ½»µùáµ│òσ▒òτñ║ | contract | τ╝ôΦºú∩╝Üµ£¼σÅÿµ¢┤ΦíÑ 500 `INTERNAL_ERROR`∩╝êσ¢║σ«Üµûçµíê∩╝îΣ╕ìµ│äΘ£▓σåàΘâ¿σ╝éσ╕╕∩╝ë∩╝¢µ│¿σàÑµû╣σ╝Å P3 σ«Ü∩╝êOQ-3∩╝ë |
| R5 | `submittedAt`∩╝ê+08:00∩╝ëΣ╕ÄΦí¿σåà `updated_at`∩╝êUTC∩╝ëσÅîµù╢Θù┤µ║É∩╝îP4 µÿôµ╖╖τö¿ | testability | τ╝ôΦºú∩╝Üµû¡Φ¿ÇΣ╕ÄτòîΘ¥óσÅ¬τö¿ `submittedAt`∩╝¢`updated_at` σÅ¬τö¿Σ║ÄΦ┤ƒσÉæµû¡Φ¿Ç |
| R6 | σ¢¢Σ╕¬σàäσ╝ƒσ¡ÉΦ╡äµ║É∩╝ê`/preferences`πÇü`/must-dos`πÇü`/budget`∩╝ë+ Σ╕ëΣ╕¬µû░Φ╖»σ╛ä∩╝ê`/submission` σåÖπÇü`/readiness`πÇü`/effective` Φ»╗∩╝ë∩╝¢ΦïÑτö¿ `/preferences/{kind}` ΘÇÜΘàìΣ╝ÜσÉ₧µÄëσåÖΦ╖»σ╛ä | integration | τ╝ôΦºú∩╝ÜP3 τ▓╛τí«σî╣Θàì∩╝¢Σ╕ëµ«╡σ¢₧σ╜Æµ╡ïΦ»òσÉîΣ╕Çµ¼íΦ╖æ |
| R7 | σÉîΘí╡σ¢¢µ«╡σ¢¢τºìσåÖσàÑµù╢µ£║∩╝êσà┤Φ╢úµÿ╛σ╝ÅπÇüσ┐àσüÜΘí╣σì│µù╢πÇüΘóäτ«ùµ«╡σåàµÿ╛σ╝ÅπÇüσ░▒τ╗¬Θí╡Θ¥óτ║º∩╝ë∩╝îΘí╡Θ¥óσÑæτ║ªτ¼¼σ¢¢µ¼íΣ┐«Φ«ó | contract | τ╝ôΦºú∩╝ÜP2 Σ╗Ñ REQ-024 τëêµ£¼Σ╕║σƒ║τ║┐σåìΣ┐«Φ«ó∩╝îΘÇÉµ«╡σåÖµÿÄ∩╝¢τªüµ¡óµèèσ¢¢µ«╡σ╣╢µêÉΣ╕Çµ¼íσà¿Θí╡Σ┐¥σ¡ÿ |
| R8 | σÅéΦÇâσ¢╛ `submitPref()` Σ╕Çµ¼íτé╣σç╗Σ┐¥σ¡ÿ+σ░▒τ╗¬πÇü`noPrefSw` Σ╗à `hide`∩╝îΣ╕Äµ£¼Θ£Çµ▒éτÜäπÇîΣ┐¥σ¡ÿ/µÅÉΣ║ñΦºúΦÇªπÇìπÇîτªüτö¿ΦÇîΘ¥₧ΘÜÉΦùÅπÇìτ¢┤µÄÑσå▓τ¬ü | UI alignment | σ╖▓Φºú∩╝ÜµÅÉΣ║ñσÅ¬Φ┤ƒΦ┤úσ░▒τ╗¬πÇüσ╝Çσà│τªüτö¿σ¡ùµ«╡σ╣╢σåÖµ£ìσèíτ½»µáçΦ«░∩╝¢UI µö╣σè¿σêù WARNING |
| R9 | µÅÉΣ║ñσÉÄΣ┐¥σ¡ÿσüÅσÑ╜**Σ╕ìµÆñΘöÇ**σ░▒τ╗¬∩╝êD10∩╝ë∩╝îUS-031 ΦïÑτ¢┤µÄÑΦ»╗ `effective` Σ╝Üµï┐σê░πÇîσ░▒τ╗¬Σ╜åσåàσ«╣σ╖▓σÅÿπÇìτÜäΦ╛ôσàÑ | product correctness | σ╖▓τƒÑτòÖτÖ╜∩╝Üσ┐½τàºµû░Θ▓£σ║ªτö▒ US-031/037 σñäτÉå∩╝êOQ-7∩╝ë∩╝¢µ£¼Θ£Çµ▒éσÅ¬Σ┐¥Φ»üτè╢µÇüΣ╕ìΦó½Φ»»µö╣ |
| R10 | µûçµíúµ╝éτº╗∩╝ÜΦ«íσêÆ ┬º5/┬º6 Σ╕Äσ«₧τÄ░Φ╖»τ║┐Σ╕ìτ¼ª∩╝ê`kind` µ₧ÜΣ╕╛πÇüσìò PUT µÅÉΣ║ñσ¢¢τ▒╗σüÅσÑ╜∩╝ë | docs | τ╝ôΦºú∩╝Üµ£¼Θ£Çµ▒éµîëΣ╗úτáüσ«₧σå╡σåÖ∩╝¢Σ┐«µ¡úσ╣╢σàÑ REQ-019 OQ-16πÇéσÄƒΦ«░πÇîREQ-020 σåÖ `UNAUTHENTIC`/`TRIP_FORBIDDEN`πÇìτ╗Å P2 σñìµá╕Σ╕ìµêÉτ½ï∩╝îOQ-10 σ╖▓σà│Θù¡ |

µùáΦç┤σæ╜Θÿ╗σí₧Σ╜┐ REQ-026 σñ▒µòê∩╝îµïåσêåσÅ»Σ╗Ñτ╗ºτ╗¡πÇé

## 8. Suggested split boundaries

Σ╕ÇΣ╕¬σÅÿµ¢┤∩╝Ü`req-026-submit-preferences`∩╝îΣ┐«µö╣Σ╕ÇΣ╕¬σ╖▓µ£ëΦâ╜σè¢ `preferences`∩╝îΦªåτ¢û US-026 + US-027πÇé
σ╖ÑΣ╜£ΘçÅ∩╝ÜΣ╕¡σ░ÅΓÇöΓÇöσÉÄτ½» 1 Σ╕¬σåÖτ½»τé╣ + 2 Σ╕¬σÅ¬Φ»╗τ½»τé╣ + 1 Σ╕¬τ⌐║µÅÉΣ║ñσêñσ«Ü + 1 Σ╕¬ 500 µÿáσ░ä + 1 τ╗äµÄÑσÅúµ╡ïΦ»ò∩╝êΘ¢╢Φ┐üτº╗∩╝ë∩╝¢
σëìτ½» 1 Σ╕¬µÅÉΣ║ñµ«╡ + µêÉσæÿΘí╡σ░▒τ╗¬σ▒òτñ║µÄÑµò░µì«πÇé
Σ╛¥Φ╡ûΘí║σ║Å∩╝ÜREQ-019 τÜä `V4`/σüÅσÑ╜Θí╡ ΓåÆ REQ-020/024 τÜä payload ΓåÆ submission σåÖτ½»τé╣Σ╕Äτ⌐║µÅÉΣ║ñσêñσ«Ü ΓåÆ readiness ΓåÆ effective ΓåÆ µÅÉΣ║ñµ«╡Σ╕ÄΦèéτé╣ 7 ΓåÆ Θ¬îΦ»üµûçµíúπÇé

σÉêσàÑΘí║σ║Å∩╝ÜREQ-019 ΓåÆ REQ-020 ΓåÆ REQ-024 ΓåÆ REQ-026∩╝îΣ╕ìσ╛ùΘóáσÇÆ∩╝êΦ┐üτº╗πÇüΘí╡Θ¥óσÑæτ║ªΣ╕ÄσÅ¬Φ»╗µ╢êΦ┤╣Θô╛ΘÇÉσ▒éσÅáσèá∩╝ëπÇé

Sections 1ΓÇô22 above describe REQ-001, REQ-003 and REQ-004 and are not
authoritative for this change. This section is self-contained.

## 23. Requirement set

| id | Path |
|---|---|
| REQ-005 | `requirement-workspace/requirements/REQ-005.md` |

Supporting: `requirement-workspace/deep-dive.md` ┬ºREQ-005,
`requirement-workspace/intents/2026-11-14-req-005.md` (incl. P1 continuation
2026-11-15), `requirement-workspace/analysis/req-005-dor.md`.

Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR
BLOCKERs = 0). Solution direction: **add** (new frontend-only `app-shell`
capability) ΓåÆ deep-dive Phase 2.5 in scope.

## 24. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Frontend shell frame | `frontend/src/App.jsx:29-48`, `frontend/src/app.css:51-60` | `.app` already centers a Γëñ430 px, 100 dvh column; identity scaffold bar renders on every route; no dock exists |
| Hash router | `frontend/src/App.jsx:8-27` | `parseRoute` handles `/`, `/create`, `/trips/<id>`, `/join/<token>`; unknown paths fall back to home; identity is App-level `useState`, survives hash changes |
| Pages | `frontend/src/pages/{Home,CreateTrip,TripDetails,Join,InvitationPanel}.jsx` | All five surfaces implemented and verified by REQ-001/003/004; Home owns a bottom `.actionbar`; CreateTrip back targets `#/` (`CreateTrip.jsx:52`) |
| Design tokens | `frontend/src/app.css:1-29`, `ui-design-reference/README.md` ┬ºΣ╕Ç | Token values already mirror the reference (brand `#0d9488`/`#06b6d4`, warm neutrals, radii 10/14/20/26, system font); reference present locally incl. `screen-01-dashboard.png` |
| Icons | `frontend/src/Icons.jsx` | Inline SVG set (109 lines); dock needs home/list/fork/users glyphs ΓÇö existing set covers most, additions are local SVG, no dependency |
| Backend / migrations | `backend/src/main/java/com/gogo/{hello,trip,invitation}/`, `V1`ΓÇô`V3` | Untouched by this story (issue #32: Backend no, Database no) |
| Living Spec | `openspec/specs/greeting/spec.md` | `greeting` only; `trips`/`invitations` are pending deltas of in-flight changes |
| Active changes | `openspec list --json` | `req-002-greeting-json-sqlite`, `req-003-trip-create-and-view`, `req-004-trip-invitations` (29/31 tasks); this change becomes the fourth |
| CI | `.github/workflows/ci.yml` | Two jobs (backend `mvn -B test`, frontend `npm ci && npm run build`); unchanged |
| Fixtures | `requirement-workspace/acceptance-test-fixtures.md` | Scoped to REQ-003/REQ-004; US-064 carries its own text-only verification table, so no fixture dependency at P1 |
| Tooling | `openspec` 1.9.0 on PATH (this machine); gh at `%LOCALAPPDATA%\Programs\gh\bin` | Change creation and board reads verified in this session |
| Working tree | `git status` on `sdd-req-005-trip-setup` (created from e904fff) | REQ-004 G2 Pass committed at e904fff; PR #30 and #31 merged during this session; REQ-005 P1 artifacts are added alongside without touching REQ-004 records |

Baseline classification: brownfield, frontend-only. Authority tree
`openspec/specs/` exists (`greeting`); no competing spec root is introduced.

## 25. As-is ΓåÆ proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | `greeting` only | New capability `app-shell` (six ADDED requirements) created at archive time from this change's delta spec |
| `frontend/src/App.jsx` | Flat route switch + scaffold bar, no dock | Shell composition: frame + scaffold bar + routed page + fixed dock for in-app routes; join route bypasses the dock; route table gains the no-trip, `#/split`, `#/members` entries |
| New frontend components | ΓÇö | Shell/dock component(s), no-trip empty-state page, σêåΘÿƒ and µêÉσæÿ placeholder pages (text + link back to Φíîτ¿ï) |
| `frontend/src/pages/CreateTrip.jsx:52` | Back link targets `#/` | Back targets the Φíîτ¿ï tab (story page-function table); form, validation and submit navigation unchanged |
| `frontend/src/app.css` | `.app` column exists; no dock styles | Dock styles (fixed bottom, safe-area inset, active highlight from brand tokens), content bottom padding so the dock never obscures `.actionbar`/content; placeholder/empty-state styles from existing tokens |
| `frontend/src/Icons.jsx` | Existing glyph set | Dock glyphs added locally if missing (inline SVG, no dependency) |
| Backend / migrations / API | `V1`ΓÇô`V3`, three capability packages | **No change** (reverse case R-3) |
| CI | Two jobs | Unchanged; frontend build job covers the change |
| Docs | `README.md`, verification docs | Run/verification notes for the shell and the text-only tab walk |

## 26. Blast radius

- Runtime: frontend only; same Vite dev server and `/api` proxy; no new
  process, port, dependency or environment variable.
- Data: none. No migration, no schema or row change; existing reads reused.
- API: no new or changed path; `X-User-Id` contract unchanged.
- Navigation: hash route table gains three entries (no-trip Φíîτ¿ï, `#/split`,
  `#/members`); existing four routes keep their paths and behavior; join
  exclusion is presentational (dock hidden), not a join-flow change.
- CI: unchanged; verification is browser-based (text-only tab walk) plus the
  existing frontend build job.
- Ordering: REQ-005 P4 needs the REQ-003/REQ-004 frontend code present ΓÇö it is
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
| R21 | `X-User-Id` remains unverified (inherited scaffold) | accepted for a scaffold | Inherited from REQ-003 R6; switcher stays labeled Θ¥₧τÖ╗σ╜ò. Owner Dev/SA |
| R22 | Four active changes coexist; `app-shell` is disjoint from all three delta sets | process | No spec conflict; archive order independent. Owner Dev |

No critical blocker invalidates REQ-005, so split may proceed.

## 29. Suggested split boundaries

One change: `us-064-mobile-app-shell` (renamed from `req-005-mobile-app-shell`
on 2026-11-15), new capability `app-shell` with six
ADDED requirements (shell frame; bottom dock navigation; dashboard placement;
trips placement + no-trip empty state; placeholder tabs; guest join exclusion).
The scenario count (11) would normally suggest considering 2ΓÇô3 changes, but
every scenario shares the one shell frame: splitting frame from dock or
placements would produce halves that cannot render independently, violating
the independently-shippable check. One vertical slice, one gate cycle.
Effort: smallΓÇômedium ΓÇö App.jsx restructure, 1 shell/dock component, 3 new
pages (empty state + 2 placeholders), CSS additions, 1 back-target edit; no
backend, no migration, no new dependency. `/sdd:story-split` is Skipped: the
story already exists as GitHub issue #32.
# Impact brief ΓÇö US-031-037 (appended 2026-11-15)

- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `us-031-037-main-itinerary` (created; renamed 2026-11-15 from `req-005-main-itinerary`, US-based naming by user ruling)
- Branch: `US-031-037-main-itinerary-planning` (renamed 2026-11-15 from `sdd-us-031-037-main-itinerary-planning`; sdd prefix dropped by user ruling)
- Merge note 2026-11-15: origin/main now includes REQ-003/004 (PR #30/#31; local merge 4e6b261). The OQ-9 trigger fired and convergence was ruled at P2: append **V4+** (3 new tables + 2 `trip_member` columns), **no `trip` ALTER**, confirmed version derived from draft status. ┬º2 below is restated against the post-merge baseline; R1/R2 are closed accordingly. G1 C2 amendment (user-selected default A, 2026-11-15): `member_preference` belongs to REQ-019's V4 (kind/payload shape, `feat/travel_preference`); this change renumbers to **V5** with only 2 new tables + the 2 `trip_member` columns and reads kind rows read-only; SA Lumi re-confirmed 2026-11-15.

## 1. Requirement set

| id | Path |
|---|---|
| US-031-037 | `requirement-workspace/requirements/US-031-037.md` |

Supporting: `intents/2026-11-15-us-031-037.md`, `analysis/us-031-037-dor.md`,
`deep-dive.md` ┬ºUS-031-037, `acceptance-test-fixtures.md` ┬ºUS-031-037.

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| Knowledge base | `docs/knowledge/_INDEX.md` + slot READMEs | slots only; rules/ README only ΓÇö P0 rules apply skipped by user ruling 2026-11-15 (disclosed, not re-applied) |
| Living Spec tree | `openspec/specs/greeting/spec.md` | greeting only; REQ-003/004 code is merged but their `trips`/`invitations` deltas are not archived/synced yet; main-itinerary absent |
| Archived SDD assets | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | present |
| Active changes | `openspec/changes/req-002-greeting-json-sqlite/`, `req-003-trip-create-and-view/`, `req-004-trip-invitations/` | REQ-002 P4/P5 authored, gates unrecorded, archive pending; REQ-003/004 G2 Pass and merged (PR #30/#31), P5/G3/archive pending ΓÇö all unrelated to US-031-037 |
| Application code | `backend/` `hello` + `trip` + `invitation` packages, Flyway V1ΓÇôV3; `frontend/` Home / CreateTrip / TripDetails / InvitationPanel / Join | trip, member and invitation schema + code are local; no readiness, preference or main-plan schema/code |
| REQ-003/004 baseline | merged into `origin/main` (PR #30/#31) | V2 seeds users 1ΓÇô5 + the fixture trip and its four members; V3 adds `trip_invitation` and `trip.main_plan_confirmed`; accept endpoint available locally |
| Fixtures | `acceptance-test-fixtures.md` | REQ-001..004 sections plus ┬ºUS-031-037 (P2: paths, statuses and wire field names contractual) |
| CI | `.github/workflows/ci.yml` | present; no structure change proposed |

## 3. As-is ΓåÆ proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `openspec/specs/` | greeting only | new capability `main-itinerary` at archive time |
| Backend | hello + trip + invitation packages, V1ΓÇôV3 (merged baseline) | new main-itinerary package (controller/service/repository + MainPlanProvider port with fake implementation); Flyway V5 (G1 C2 default A, user-selected 2026-11-15: REQ-019's kind/payload `member_preference` takes V4): 2 new tables (main_plan_draft, main_plan_stop) + `trip_member.ready` / `preference_revision`; no `trip` ALTER; `member_preference` kind rows read-only; V5 seeds readiness + interest/must_do kind rows for the fixture trip; SA Lumi re-confirmed 2026-11-15 |
| Frontend | greeting + trip create/detail + invitation/join pages | Screen 9 generate + Screen 10 review/confirm routes with four mandatory states |
| Fixtures | REQ-001..004 sections | ┬ºUS-031-037 state setup + M/V request matrix |
| Registry/handoff | REQ-001/002 rows | US-031-037 row + session handoff note |
| CI / KB / scripts | present | checked, no impact |

## 4. Blast radius

- Same runtimes/ports (8080 backend, 5173 Vite proxy) and same SQLite file; two new tables plus two `trip_member` columns (V5; REQ-019's V4 `member_preference` read-only, G1 C2 amendment); `trip` and `trip_invitation` untouched.
- No external service dependency; fake provider deterministic (fixture stops).
- Cross-capability touchpoint: sets `trip.main_plan_confirmed` consumed by the now-local REQ-004 accept (code unchanged); the confirm flow supersedes REQ-004's test-only confirmed-state setup for trips confirmed here.

## 5. Artifact impact

- Specs: `openspec/changes/us-031-037-main-itinerary/specs/main-itinerary/spec.md` (P2), ADDED requirements per US with independently numbered ACs.
- Tests: backend acceptance matrix M1ΓÇôM14/V1ΓÇôV7 + reverses; frontend E2E Screens 9/10 incl. four states; J4 `JOINING_CLOSED` E2E now runnable locally; test-only DB setup for pending/overrun/stale/null-locations.
- Docs: workdir artifacts, `docs/ai4se-plugins/` reports at P4/P5.

## 6. Dual-track notes

OpenSpec track only; `/sdd:story-split` Skipped ΓÇö two US, one capability, one
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
Effort: medium Γëê REQ-004 baseline ΓÇö 2 new tables + 2 `trip_member` columns (V5,
after the G1 C2 amendment; no `trip` ALTER), 2 write + 2 read endpoints (3 wire projections), 2 screens, ~25+
acceptance tests (M1ΓÇôM14 / V1ΓÇôV7 + reverses). Ordering: backend contract and
seeds first, frontend screens second; G1 to rule data model/API contract as a
named decision item (capability-pack convention).

---

# Impact brief — US-067

- Date: 2026-11-16
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: *(to be created in P2)*

## 1. Requirement set

| id | Path |
|---|---|
| US-067 | `requirement-workspace/requirements/US-067.md` |

## 2. As-is asset inventory (evidence paths)

| Asset | Path | Status |
|---|---|---|
| Living Spec – invitations | `openspec/specs/invitations/spec.md` | 4 requirements (issuance, preview, accept, unusable) |
| Living Spec – trips | `openspec/specs/trips/spec.md` | 4 requirements (identity, create, detail, main-plan state) |
| Living Spec – app-shell | `openspec/specs/app-shell/spec.md` | 6 requirements (shell, tabs) |
| Living Spec – main-itinerary | `openspec/specs/main-itinerary/spec.md` | 7 requirements |
| Living Spec – greeting | `openspec/specs/greeting/spec.md` | 1 requirement |
| Archived REQ-004 change | `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` | invitation API + frontend Join/InvitationPanel |
| Frontend Join page | `frontend/src/pages/Join.jsx` | token-based preview + accept + joined/unusable/closed states |
| Frontend InvitationPanel | `frontend/src/pages/InvitationPanel.jsx` | organizer link + QR display |
| Frontend App router | `frontend/src/App.tsx` | hash router, `/join/<token>` route exists |
| Frontend Icons | `frontend/src/Icons.tsx` | icon registry; no scan/camera icon yet |
| Frontend api | `frontend/src/api.ts` | `api()` helper, `users()` scaffold |
| Backend invitation package | `backend/src/main/java/com/gogo/invitation/` | controller, repository, DTOs |
| Knowledge base | `docs/knowledge/_INDEX.md` | architecture, domain, rules slots |
| UI prototype | `ui-design-reference/gogo-mvp-prototype.html` | Screen 1 dashboard with "i" button; Screen 4 invitation QR; no scanner screen in prototype HTML |
| Acceptance fixtures | `requirement-workspace/acceptance-test-fixtures.md` §REQ-004 | token opaque, joinPath `/join/<token>`, I/J/U matrix |

## 3. As-is → proposed delta

### 3.1 `invitations` capability

**As-is** (`openspec/specs/invitations/spec.md`): 4 backend requirements —
issuance, preview, accept/join, unusable. No scanner surface.

**Proposed delta**: 1 ADDED requirement "QR-code invitation scanner" — frontend
scanner screen with camera lifecycle, URL pattern validation (`/join/<token>`),
handoff to existing Join page, error recovery with link fallback. No backend
requirement changes.

### 3.2 Frontend – new Scanner page

**As-is**: no scanner page exists. `App.tsx` routes `/join/<token>` → `Join.jsx`.
No camera/scan icon in `Icons.tsx`.

**Proposed delta**: new `Scanner.tsx` page component. Hash route (e.g. `#/scan`)
to be wired in `App.tsx` parseRoute. Scanner owns camera lifecycle, QR decode,
URL validation, and link fallback input. On valid token extraction, navigates to
`#/join/<token>` (existing Join page). New icons: scan, camera.

### 3.3 Frontend – existing Join page

**As-is** (`frontend/src/pages/Join.jsx`): receives `token` prop, calls preview
API, renders ready/joined/unusable/closed/failed states.

**Proposed delta**: **none**. The scanner hands off by navigating to the existing
Join route. Join page behavior unchanged.

### 3.4 Frontend – App router

**As-is** (`frontend/src/App.tsx`): parseRoute handles `/join/<token>`,
`/trips/<id>`, `/trips/<id>/main-plan[/inputs]`, `/create`, `/trips`, `/split`,
`/members`, default `home`.

**Proposed delta**: add `/scan` route → `Scanner` page. Placement before generic
trips regex (existing convention).

### 3.5 Backend

**As-is**: `InvitationController`, `InvitationRepository`, 4 endpoints.

**Proposed delta**: **none**. US-067 is frontend-only.

### 3.6 `app-shell` capability

**As-is** (`openspec/specs/app-shell/spec.md`): 6 requirements. The shell frame
applies to every in-app route and the bottom dock maps four tabs; only
`#/join/<token>` is excluded from the dock.

**Proposed delta**: 1 MODIFIED requirement "Mobile shell frame" — `#/scan` is
a full-screen flow: no dock, identity scaffold bar retained, not associated
with any dock tab, close restores the originating route (fallback `#/`).

### 3.7 Other specs – checked, no impact

`greeting`, `trips`, `main-itinerary`: no requirements touched.

## 4. Blast radius

| System / capability | Impact |
|---|---|
| Frontend app | New Scanner page component, 1 new hash route, 2 new icons |
| `invitations` capability | 1 ADDED frontend requirement (spec-level); no backend change |
| Browser APIs | `navigator.mediaDevices.getUserMedia`, `jsqr` (or `BarcodeDetector`) |
| Backend | none |
| Database | none |

## 5. Artifact impact

| Artifact | Change |
|---|---|
| `openspec/specs/invitations/spec.md` | +1 ADDED requirement (scanner) |
| `openspec/specs/app-shell/spec.md` | +1 MODIFIED requirement (scanner full-screen flow) |
| `frontend/src/pages/Scanner.tsx` | new file |
| `frontend/src/App.tsx` | +1 route entry |
| `frontend/src/Icons.tsx` | +2 icon symbols (scan, camera) |
| `frontend/src/types/` | possible scanner state types |
| `frontend/package.json` | possible `jsqr` move from devDependency to dependency |
| `openspec/changes/<us-067-change>/` | new change directory (P2) |
| `requirement-workspace/analysis/us-067-dor.md` | written this session |
| `docs/feedback/e2e-us-067*.md` | new E2E checklist (P4) |

## 6. Dual-track notes

- **OpenSpec track**: single change, 1 ADDED requirement in `invitations`.
  Frontend-only; no backend delta. Spec must describe the scanner surface
  contract (camera lifecycle, URL validation pattern, handoff, error recovery).
- **Agile track**: US-067 is a single user story. AC scenarios 1–2 (entry point)
  and 9 (login) deferred; 8 scenarios remain testable. E2E tests exercise the
  scanner page directly (navigate to `#/scan`).

## 7. Risks & blockers

| id | Risk / blocker | Severity | Disposition |
|---|---|---|---|
| R1 | `BarcodeDetector` browser support is limited (Chrome/Edge only, not Firefox/Safari). `jsqr` is the reliable fallback but is currently a devDependency. | low | Move `jsqr` to production dependency in P3 design. Non-blocking. |
| R2 | Camera API requires HTTPS or localhost. Dev environment on localhost is fine; production deploy must serve HTTPS. | low | Existing constraint; no new risk introduced by this change. |
| R3 | Scan-icon entry point (AC S1–S2) deferred — no user-facing way to reach the scanner except direct URL. | medium | Accepted by user ruling 2026-11-16. E2E tests navigate directly to `#/scan`. Entry point to be added in a follow-up story. |
| R4 | US-066 login flow (AC S9) deferred — signed-out scenario not exercised. | low | Owned by the in-flight `US-066-log-in` change; its join-level "signed-out → login → resume preview" rule covers S9, and the scanner only hands off to `#/join/<token>`. |
| R5 | Merge order against US-066: auth replaces the identity scaffold and the `X-User-Id` Join acceptance path. | medium | US-066 archives first; US-067 rebases and re-runs its E2E against the session-based Join page. Non-blocking, recorded in G1. |

No critical blocker invalidates US-067; split may proceed.

## 8. Suggested split boundaries

One change `us-067-qr-scanner`, one ADDED requirement in the existing
`invitations` capability. Effort: small — frontend-only, 1 new page component,
1 new route, camera lifecycle + QR decode + URL validation + error states.
No backend, no migration. ~8–10 acceptance test scenarios (S3–S8, S10–S11,
R-1–R-3). Ordering: scanner component → route wiring → E2E verification.
G1 focus: URL validation pattern and handoff contract (scanner → Join page).
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

## Post-merge remediation (2026-11-16)

G2 was **Conditional** (VL Leo, C1–C5). The branch merged `group1/main`
`135d3df`, which brings US-066 login/session, V4 splits, V6 credentials and the
shipped `#/split` entry. This section supersedes the earlier X-User-Id wording
for US-013.

| Condition | Closure |
|---|---|
| C1 merge main / conflicts | Merged `135d3df`; kept main's `main-plan:confirm`, `mainPlanConfirmed`, real `#/split` and session auth; added `/members` + `findMembers`; resolved README and five requirement-workspace conflicts without dropping main rows |
| C2 re-run gate | `mvn -B test` **198/198** (new `TripMembersApiTest` 12/12); `npm run build` green; branch CI re-run on the merged head to be recorded |
| C3 app-shell delta | 分队 = shipped split entry; 成员 = roster; Purpose/proposal/US-013 updated; no not-implemented placeholder |
| C4 identity divergence | Trips/members = session auth + `USER_REQUIRED`; split endpoints = session auth but `MEMBER_REQUIRED` for anonymous; accepted divergence with follow-up **F2** |
| C5 evidence integrity | Tasks 7.1/7.2 checked; V1 wording corrected; M8/M9 renamed to direct insert; retired-header + PUT/DELETE cases added; unreachable UI states documented; `openspec validate` cited; all-branch CI trigger recorded as user-approved R37 |

Residual risk: F2 (unify split anonymous error code), R38 (auth arrived after
G1; the delta was amended under these conditions and the VL re-records G2 on
the merged head). No critical blocker remains for the US-013 slice.

# Impact brief — US-071（2026-11-16 追加）

- Date: 2026-11-16
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQ = 0，DoR BLOCKER = 0）
- Change id：待 P2 创建（建议 `us-071-my-trips`）

## 1. Requirement set

| id | Path |
|---|---|
| US-071 | `requirement-workspace/requirements/US-071.md` |

支撑：`intents/2026-11-16-us-071.md`、`analysis/us-071-dor.md`、`deep-dive.md` §US-071。

## 2. As-is asset inventory（证据路径）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec – trips | `openspec/specs/trips/spec.md` | 5 条 requirement（identity / creation / detail read / main-plan confirmation state / member list read），**无列表读取** |
| Living Spec – app-shell | `openspec/specs/app-shell/spec.md` | 6 条 requirement；其中 `Trips tab placement and no-trip empty state` 明确禁止列表端点与调用，且要求空态提供「创建行程 + 按编号打开行程」 |
| Living Spec – 其他 | `openspec/specs/{invitations,main-itinerary,splits,auth}/spec.md` | 仅被消费，不改 |
| 归档资产 | `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/`、`2026-11-16-us-013-view-trip-members/`、`2026-11-16-us-064-mobile-app-shell/` | 建行程/详情读、成员名册、shell + 四 tab 的落地依据 |
| 后端 trip 包 | `backend/src/main/java/com/gogo/trip/TripController.java`、`TripRepository.java` | create / read / members / confirm 四个入口；无按用户列行程的查询 |
| 后端认证 | `backend/src/main/java/com/gogo/auth/SecurityConfig.java` | `/api/**` 已 `authenticated()`；新 GET 自动受保护 |
| 前端路由与 tab | `frontend/src/App.tsx`、`TabBar.tsx`、`types.ts` | `#/trips` → `trips-empty`；`tripsHref = lastTripId ? #/trips/{id}/main-plan : #/trips`（同时驱动 TabBar、分队未选行程、成员页、创建页返回） |
| 前端页面 | `frontend/src/pages/TripsEmpty.tsx`、`TripDetails.tsx` | TripsEmpty = 「按编号打开行程」占位；参考时 TripDetails 尚无主线方案链接，**该入口已由 US-072（2026-11-16 21:22，`22a2d3c`）交付并归档**，本变更不再重复实现 |
| 知识库 | `docs/knowledge/architecture/tech-stack-plan.md`、`docs/knowledge/rules/` | 技术栈与规则载体；本次不新增规则 |
| UI 参考 | issue #45 附件 `us-071-my-trips`；`ui-design-reference/gogo-mvp-prototype.html` | 无本地截图文件；原型为内存态，仅界面参考 |
| 验收夹具 | `requirement-workspace/acceptance-test-fixtures.md` | 尚无 §US-071（P3 ATDD 设计时补） |

## 3. As-is → proposed delta

### 3.1 `trips` 能力（后端 + 前端详情入口）

**As-is**：4 个端点；无列表；详情页主线入口已由 US-072 交付（Living requirement）。

**Proposed delta**：ADDED「Trip list read」——`GET /api/trips` 返回 `{trips:[{id,name,destination,startDate,endDate,organizer,mainPlanConfirmed}]}`，只含当前会话账号为成员的行程，按 `start_date` 升序、同日 `id` 升序；不改既有四个端点。详情页主线入口：**不新增**（US-072 已交付），仅回归验证 tab 收敛后仍可达。

### 3.2 `app-shell` 能力

**As-is**（`Trips tab placement and no-trip empty state`）：tab 落 `#/trips/<id>` 详情，无行程时显示「创建行程 + 按编号打开行程」，并禁止列表端点/调用。

**Proposed delta**：MODIFIED 该条——行程 tab 恒指向 `#/trips` 列表；空态动作改为「创建行程」（移除编号入口）；删除「不得新增列表端点/调用」禁令。`Bottom dock navigation`、`Dashboard tab placement`、`Tab content`、`Mobile shell frame` 不变。

### 3.3 前端路由与导航

**As-is**：`tripsHref` 依赖 `lastTripId` 跳 main-plan；`#/trips` 渲染 `TripsEmpty`。

**Proposed delta**：行程 tab 目标恒为 `#/trips`；`#/trips` 渲染新列表页（替换 TripsEmpty 的编号输入）；`tripsHref` 不再单一复用：TabBar 的行程 tab、分队无行程时的「去行程」与创建页返回指向列表，**成员名册「返回行程」保持指向 `#/trips/{id}`**（行程内页面不丢行程上下文，已写入 app-shell delta）。`lastTripId` 仍用于分队 tab 的进入逻辑，不改。

### 3.4 认证 / 数据 / 迁移

**As-is**：会话认证（US-066）、`trip` + `trip_member`（V2）。

**Proposed delta**：**无**。不改 `SecurityConfig`、不新增迁移、不改 `app_user`/`trip_member` 结构。

### 3.5 已检查、无影响

| 资产 | 结论 |
|---|---|
| `invitations`（预览/接受）与 Join 页 | 无改动；接受后回 `#/`，再进列表自然可见新行程（组合验证） |
| `main-itinerary`（`#/trips/{id}/main-plan`） | 端点与页面不改；入口由 US-072 已交付的详情页卡片提供，本变更不再迁移入口 |
| `splits`（分队屏） | 无改动；「去行程」按钮指向由 `tripsHref` 变化自动指向列表 |
| `auth` 能力 | 无改动（logout 属 US-069 / issue #41） |
| `greeting` | 无影响 |
| CI（`.github/workflows/ci.yml`） | 无改动；沿用 backend `mvn -B test` + frontend typecheck/build |

## 4. Blast radius

- 后端：`trip` 包新增一个只读查询与 DTO；无新包、无迁移、无新依赖。
- 前端：`App.tsx`（路由键与 tab 目标/页内返回链接区分）、`TabBar.tsx`（无代码改动，仅指向变化）、新增列表页组件替换 `TripsEmpty`、`Members.tsx`（返回链接改为 `#/trips/{id}`）、`types.ts` 增类型；`TripDetails.tsx` 不改（US-072 已交付）。
- 运行时：无新服务/端口；仍是 Vite + Spring Boot 单实例 + SQLite。
- 用户可见面：行程 tab 的首屏语义改变（从「空态/上次行程」变为列表），是本次最大的行为变更。

## 5. Artifact impact

| 类别 | 影响 |
|---|---|
| Specs | `trips` +1 ADDED；`app-shell` 1 MODIFIED（P2 delta） |
| 测试 | 后端集成测试：401、空数组、成员范围、排序、去重、已确认主线不影响；前端 `tsc` + build；浏览器 E2E：S1–S14 + R1–R6 |
| 文档 | `registry.md` 登记行；`docs/knowledge/_LOG.md`（落地对账）；`acceptance-test-fixtures.md` §US-071（P3）；README 无需改 |
| 归档 | 无（新 change 结束后归档） |

## 6. Dual-track notes

- OpenSpec：单 change，两条 delta（`trips` ADDED + `app-shell` MODIFIED），vertical slice 完整（列表读 + 列表页 + 详情入口）。
- Agile：issue #45 已存在（Iteration 1 / Priority Must），`/sdd:story-split` 可跳过；看板已由 Backlog 移到 Req Analysis。

## 7. Risks & blockers

| id | 风险 | 严重度 | 状态 |
|---|---|---|---|
| R1 | `app-shell` 明文禁令与 AC1 冲突 | spec 冲突 | 已由 MODIFIED 收敛（本变更核心）；归档时必须合并 |
| R2 | tab 改列表后 main-plan 失去入口 | 回归 | 已由 US-072 交付的详情页入口覆盖（2026-11-16 归档）；本变更仅回归验证，不新增入口 |
| R3 | AC7 UI 层依赖 logout | 验证缺口 | US-069（issue #41）覆盖；本变更 API 层验收 + UI 补测登记 |
| R4 | `tripsHref` 一处改动影响四处导航 | 回归面 | 已拆分：tab/分队/创建返回 → `#/trips`；成员名册返回 → `#/trips/{id}`；E2E 四处均需覆盖 |
| R5 | 「已结束」按客户端时区判定 | 显示差异 | 接受；仅显示层，无数据影响 |
| R6 | 无分页的极端账号 | 性能 | 非阻塞；已定 OQ-5 不做，超预算再立项 |
| R7 | `TripsEmpty` 被删除后是否有其他引用 | 代码完整性 | 实施前 grep 确认；由列表页取代 |
| R8 | 本变更使 REQ-005（US-064）TR2/T3/T4/T5 四条已 Pass 的验收口径失效 | 溯源性 | 2026-11-17 IO 复核已显式 supersede（proposal `Supersedes` 行 + `g1-decision.md` C3）；归档时以 Living Spec 为准，旧记录仅作历史证据 |
| R9 | 排序按 `start_date` 升序会把已结束行程排在首屏 | 可用性 | 按用户裁决接受；已结束仅展示语义（不改变邀请/主线/分队写能力），若后续需「未结束优先」另立变更 |

无 critical blocker 使需求失效，可进入 `/sdd:proposal-split`。

## 8. Suggested split boundaries

单 change（建议 `us-071-my-trips`）：`trips` ADDED 列表读 + `app-shell` MODIFIED 行程 tab 放置 + 前端列表页（详情页主线入口由 US-072 已交付，不重复实现）。工作量：后端一个 repository 查询 + 一个 controller 方法 + 两个 DTO（包封套与行）；前端一个列表页 + 路由/tab 目标与页内返回链接调整 + 类型；零迁移。建议 P3 拆两组：① 后端端点与测试；② 前端列表/路由/返回链接与 E2E——两组在同一 change 内顺序实现，不跨 PR 拆分（列表页依赖端点，端点通过列表页验收）。


---

# Impact brief — US-072

- Date: 2026-11-16
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQs = 0, DoR BLOCKERs = 0）
- Change id: 待 P2 建立（`us-072-trip-detail-main-plan-entry`）

## 1. Requirement set

| id | Path |
|---|---|
| US-072 | `requirement-workspace/requirements/US-072.md` |

Supporting: `requirement-workspace/intents/2026-11-16-us-072.md`，
`requirement-workspace/analysis/us-072-dor.md`.

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| TripDetails 页面 | `frontend/src/pages/TripDetails.tsx` | 已有 InvitationPanel (L178) 和分队规划 section (L183)，两者之间无主线方案入口 |
| MainPlan 页面 | `frontend/src/pages/MainPlan.tsx` | 完整实现六态 (loading/ready/empty/denied/missing/failed)；appbar 右侧 info 按钮 `href="#/trips/${tripId}"` 已支持返回行程详情 |
| MainPlanInputs 页面 | `frontend/src/pages/MainPlanInputs.tsx` | 组织者生成入口，已有返回 MainPlan 的 back 按钮 |
| Hash 路由 | `frontend/src/App.tsx` L28–29 | `#/trips/{id}/main-plan` 和 `#/trips/{id}/main-plan/inputs` 已注册，在 shell 内渲染 |
| 后端 GET main-plan | `backend/src/main/java/com/gogo/mainplan/` | 成员可读，session auth，已由 US-031-037 归档 |
| Living Spec `main-itinerary` | `openspec/specs/main-itinerary/spec.md` | 7 requirements，含方案读取/展示/状态 |
| Living Spec `trips` | `openspec/specs/trips/spec.md` | 含行程详情读 |
| CSS tokens & 组件类 | `frontend/src/app.css` | `sec-title`、`card pad`、`btn btn-primary`、`iconbtn` 均已可用 |
| Icons | `frontend/src/Icons.tsx` | `sparkle`、`cal`、`info`、`nav` 等图标已注册 |

## 3. As-is → proposed delta

| Touched asset | As-is (evidence) | Proposed delta |
|---|---|---|
| `frontend/src/pages/TripDetails.tsx` | InvitationPanel 紧接分队规划 section | 在两者之间插入 `sec-title "主线方案"` + `card pad` + `<a className="btn btn-primary" href="#/trips/{tripId}/main-plan">查看主线方案</a>` (~8 行 JSX) |
| 后端 API / DB | — | 无变更 |
| App.tsx 路由 / parseRoute | — | 无变更（`main-plan` 路由已存在） |
| MainPlan.tsx / MainPlanInputs.tsx | — | 无变更 |
| InvitationPanel.tsx | — | 无变更 |
| types.ts / types/mainPlan.ts | — | 无变更 |
| Living Spec `trips` | 行程详情能力无主线方案入口条款 | P5 archive 时新增 MODIFIED requirement（入口可见性） |
| Living Spec `main-itinerary` | — | 无变更（复用，不扩面） |
| `openspec/specs/` 新 capability | — | 不新增 capability |

## 4. Impact classification

**方向: extend** — 在已有的 trips 能力前端页面添加一条到 main-itinerary 的导航入口。不引入新业务概念、新 API 端点、新数据表、新页面组件。

## 5. Cross-REQ consistency

| Related REQ/US | Relationship | Risk |
|---|---|---|
| US-031-037 (main-itinerary) | 入口指向其 MainPlan 页面和路由，复用其权限和状态展示 | 无——不修改其逻辑 |
| REQ-004 (invitations) | InvitationPanel 在入口上方，两者无交互 | 无 |
| US-049-050 (splits) | 分队规划 section 在入口下方，逻辑不变 | 无 |
| REQ-008 / US-066 (login/session) | 入口在已登录 shell 内渲染，route guard 拦截未登录 | 无——现有机制覆盖 |
| US-013 (members) | 无直接关联 | 无 |

## 6. Risk register

| id | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | 入口文案或位置与未来 UI redesign 冲突 | Low | 当前 AC 明确指定"邀请朋友"与"分队规划"之间；后续 redesign 可重排 |

No critical blocker. 可进入 P2 proposal-split。

---

# US-061 - Dashboard impact brief (2026-11-16)

> Historical impact analysis for the earlier active-only scope. The current
> interim scope is recorded in [US-061](requirements/US-061.md) and the
> [proposal](../openspec/changes/us-061-view-trip-dashboard/proposal.md).
> US-058 integration and archive are deferred; the unsafe details destination
> remains blocked until its separate fix is verified.

## Requirement set

`requirement-workspace/requirements/US-061.md`; base readiness self-check:
`requirement-workspace/analysis/us-061-dor.md`. Decisions are user-confirmed;
this is not gate approval.

## As-is inventory and proposed delta

| Asset | As-is evidence | Proposed dashboard impact |
|---|---|---|
| Knowledge and archive | `docs/knowledge/_INDEX.md`, `docs/knowledge/architecture/tech-stack-plan.md`, `openspec/changes/archive/2026-11-16-us-064-mobile-app-shell/proposal.md` | Continue the existing React/Spring Boot/SQLite architecture and shell; record any API-list deviation rather than silently changing the binding plan. |
| Shell Living Spec | `openspec/specs/app-shell/spec.md` says the dashboard shows home only and no aggregation; parts also describe the superseded identity scaffold. | Modify dashboard placement and navigation requirements for active-trip cards and per-trip overview; reconcile with authenticated behavior, not the historical scaffold. |
| Frontend | `frontend/src/pages/Home.tsx`, `frontend/src/App.tsx`, `frontend/src/router.tsx` | Replace the home-only dashboard content with a member-scoped list and per-trip presentation, preserving shell/navigation and honest unavailable states. |
| Trip and membership | `backend/src/main/java/com/gogo/trip/TripController.java` exposes a member-guarded individual trip read, but no list-all-member-trips read. | Add a read-only authenticated member-scoped active-trip list/projection; use US-058's completion state to exclude completed trips. Do not add a completion writer or separate identity rules. |
| Readiness and main plan | `MainPlanController.java`, `InputsResponse.java`, `openspec/specs/main-itinerary/spec.md` | Reuse authorized inputs/readiness and plan reads, including legitimate absence of a draft; show real count and status. |
| Split | `backend/src/main/java/com/gogo/hello/splits/SplitDraftController.java` and `SplitDraftService.java` | Reuse the member-only read; successful null data denotes no split draft, while actual read failures are not treated as absence. Display actual draft status. |
| Completion and archive | US-058 issue #24; no completion schema or read endpoint was found under `backend/src/main/resources/db/migration/` or the trip controller. | Depend on US-058's completed state, not inferred dates or split state. Archive is separately owned; neither completion nor archive is implemented by this dashboard. |
| Existing details navigation | `frontend/src/pages/TripDetails.tsx`, `frontend/src/pages/InvitationPanel.tsx` | Organizer load currently issues an invitation via POST. The user chose to show the dashboard destination as coming soon until a separate fix removes that load-time write; tabs cannot bypass it. |
| Tests and fixtures | `requirement-workspace/acceptance-test-fixtures.md`, backend and frontend test trees | Add dashboard acceptance coverage for membership isolation, actual state, the progress table, no-write navigation, error/empty states, and completed-trip exclusion after US-058 is available. |
| Tracker | US-061 issue #26 | Original next-action and completed-dashboard criteria conflict with confirmed user decisions; tracker owner must reconcile separately. |

## Blast radius and artifacts

The React shell and dashboard, authenticated trip read boundary and read-only
SQLite-backed queries are affected. Existing main-plan and split business
operations are not modified. Expected artifacts include a dashboard capability
and app-shell delta, acceptance fixtures and frontend/backend tests. The active
list read is new even though the original story assumed existing reads.
US-058 and the separate archive/details changes remain separately owned.

## Risks and dependencies

| Risk | Status and handling |
|---|---|
| Completion read is not delivered | US-058 is an explicit prerequisite. Its actual read contract must be integrated and verified before implementation can deliver the exclusion; never treat an unknown state as active. |
| Archive is not delivered | Separate prerequisite from the supplied draft; do not build it under US-061 or promise availability before delivery. |
| Existing details page writes on load | Separate fix prerequisite; show coming soon from the dashboard until safe. |
| Other pages may not exist | Show coming soon, not broken links or fabricated data; apply the owning destination's access rules. |
| Existing specs and tracker do not fully match current decisions | Owner follow-up deferred by user; the issue and spec must be reconciled before acceptance. |

No unresolved requirement-level blocker prevents deep-dive. These prerequisites
still block any claim of an end-to-end implemented or accepted dashboard.

## Split boundary

One dashboard-focused vertical change is the candidate: list, overview, read-only
projection and safe navigation together. US-058, archive and the trip-details
fix are external dependencies, not additional dashboard work. The existing
US-061 tracker story means a separate story export is not needed by default.
