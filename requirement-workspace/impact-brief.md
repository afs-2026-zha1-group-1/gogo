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