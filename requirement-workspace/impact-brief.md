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

# Impact brief — REQ-019

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req` (blocking OQs = 0, DoR BLOCKERs = 0)
- Change id: `req-019-save-interests`

## 1. Requirement set

| id | Path |
|---|---|
| REQ-019 | `requirement-workspace/requirements/REQ-019.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-019,
`requirement-workspace/intents/2026-11-15-req-019.md`,
`requirement-workspace/analysis/req-019-dor.md`,
`requirement-workspace/acceptance-test-fixtures.md`（用户与 trip 夹具）。

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| 身份 | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` 请求头（整数）；缺失或非 seed 用户 → `401 USER_REQUIRED` |
| trip / user 表 | `backend/src/main/resources/db/migration/V2__create_trip.sql` | `app_user` 1–5、`trip` 1（Singapore Friends Day）、`trip_member` 1–4 |
| 成员判定 | `TripRepository.isMember(long, long)` | 可直接复用，无需重写 |
| 错误处理 | `TripErrorAdvice` | `basePackages = "com.gogo.trip"`，**不覆盖新包** |
| DB 访问 | `TripRepository` | `JdbcTemplate`，无 ORM |
| 迁移序列 | `V1__create_greeting.sql`、`V2__create_trip.sql` | 下一个可用号取决于 REQ-004 的 `V3` 是否已落库 |
| 接口文档 | `README.md`、`acceptance-test-fixtures.md` | 已记录 trip 接口；无偏好相关条目 |
| 前端 | `frontend/src/{App.jsx,api.js,app.css}` | 手写 hash 路由、`api()` 封装、顶部 demo 身份选择器（1–5） |
| Living Spec | `openspec/specs/` | 仅 `greeting`；`trips` 的 delta 尚未归档 |
| 计划契约 | `docs/knowledge/architecture/tech-stack-plan.md` §6 | `{data,error}` 封套 / `X-Member-Id` / `JdbcClient`，与代码不一致 |

## 3. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/` | 仅 `greeting` | 归档时新建能力 `preferences` |
| 迁移 | `V1`、`V2` | 新增 `V4__create_member_preference.sql`（单表 + UNIQUE） |
| 后端 | 仅 `com.gogo.trip` | 新包 `com.gogo.preference`：controller / service / repository / dto / advice |
| 接口面 | `GET/POST /api/trips`、`GET /api/trips/{id}`、`/api/greeting` | 新增 `GET`/`PUT /api/trips/{tripId}/preferences` |
| 前端 | home / create / details | 新增偏好页与一条路由，复用 `api.js`、`app.css`、身份选择器 |
| 文档 | trip 接口已记录 | `README.md` 增偏好段、验证矩阵增行 |

## 4. Blast radius

- `trips` 的读路径不变；`TripRepository` 仅只读调用 `findUserId` / `isMember`。
- `TripErrorAdvice` 作用域不改——新包需要自己的 advice（WARNING）。
- `App.jsx` 只增一条路由与一个页面挂载，既有路由不变。
- 前后端均不新增依赖；运行时拓扑不变（8080 / 5173）。

## 5. Artifact impact

- Spec：`openspec/changes/req-019-save-interests/specs/preferences/spec.md`（P2）。
- Tests：后端接口测试覆盖 12 个场景；前端构建 + 浏览器观察。
- Docs：`README.md`、`docs/feedback/verification-*.md`、`requirement-workspace/{registry,handoff}.md`。
- KB：无新增长期事实。

## 6. Dual-track notes

单条故事（US-019）、单能力、12 个场景 → `/sdd:story-split` 跳过并记录理由。仅 OpenSpec 轨。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | `V4` 先于 REQ-004 的 `V3` 落库 → 已执行过 `V4` 的节点上 Flyway 报 out-of-order | blocking for merge order | 缓解：合入前确认 `V3` 在 main；否则改按下一可用版本 |
| R2 | 去重落在 Service 层，JSON payload 无内部唯一约束，缺陷会静默写出重复项 | product correctness | 缓解：测试断言解析后的集合元素唯一，不只看 200 |
| R3 | `TripErrorAdvice` 只覆盖 `com.gogo.trip`，新包的 `INVALID_REQUEST` 不会被处理 | integration | 缓解：新增专属 advice 或放宽到 `com.gogo`（P3 定） |
| R4 | `application.yml` 缺 `maximum-pool-size=1` / WAL / `busy_timeout` / 外键开关，而本需求引入幂等覆盖写 | operational | 缓解：P4 前评估，不默依赖默认值 |
| R5 | AC 传 `Art`、库内存 `art`：若接口只认小写 code，AC1 直接失败 | contract | 已解：线上 label、库内 code |
| R6 | 参考图节点 8 为 10 个中文 chip，AC 定义 7 个英文 label | UI alignment | 行为以 AC 为准，差异记在 deep-dive ⑪ |
| R7 | 同团队 REQ-004 的 `V3` 与本需求的 `preferences` delta 先后不定，两者都写 `openspec/specs/` | collaboration | Living Spec 合并顺序无影响，仅迁移号耦合 |
| R8 | `AGENTS.md` 要求 shadcn/ui，仓库实为手写 CSS | harness | 本需求跟随代码，另开一条修指引 |

无致命阻塞使 REQ-019 失效，拆分可以继续。

## 8. Suggested split boundaries

一个变更：`req-019-save-interests`，一个新能力 `preferences`。
工作量：小到中——后端约 5 个类 + 1 个迁移 + 1 组接口测试；前端 1 个页面 + 1 条路由 + 样式。
依赖顺序：`V4`（确认 `V3` 已落库）→ 身份/成员复用 → 校验与写 → `GET` 回读 → 页面 → 验证文档。

# Impact brief — REQ-020

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQs = 0，DoR BLOCKERs = 0）
- Change id: `req-020-manage-must-do`
- Stacking: 堆叠在 `req-019-save-interests` 之后；后者未合 main

## 1. Requirement set

| id | Path |
|---|---|
| REQ-020 | `requirement-workspace/requirements/REQ-020.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-020，
`requirement-workspace/intents/2026-11-15-req-020.md`，
`requirement-workspace/analysis/req-020-dor.md`，
`requirement-workspace/acceptance-test-fixtures.md`（用户与 trip 夹具），
`openspec/changes/req-019-save-interests/`（表与页面契约的来源）。

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| 身份 | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` 请求头（整数）；缺失或非 seed 用户 → `401 USER_REQUIRED` |
| trip / member 表 | `V2__create_trip.sql` | `app_user` 1–5、`trip` 1、`trip_member` 1–4；`trip.start_date` / `end_date` 为 2026-12-05 |
| 邀请与主线状态 | `V3__create_invitation.sql` | `trip_invitation` + `trip.main_plan_confirmed`（默认 0，US-037 之前无写入路径） |
| 偏好表 | `openspec/changes/req-019-save-interests/proposal.md` 与 `specs/preferences/spec.md` | **计划中的 `V4` + `member_preference`，尚未落库**；UNIQUE(`trip_id`,`user_id`,`kind`) |
| 偏好端点 | 同上 | `GET`/`PUT /api/trips/{tripId}/preferences`，**尚未实现** |
| 偏好页 | 同上 | `#/trips/{tripId}/preferences`，**尚未实现** |
| 成员判定 | `TripRepository.isMember(long, long)` | 可直接复用 |
| 错误处理 | `TripErrorAdvice`（`com.gogo.trip`）、`InvitationErrorAdvice`（`com.gogo.invitation`） | 按包隔离；`com.gogo.preference` 需自带 advice（REQ-019 负责） |
| DB 访问 | `TripRepository` / `InvitationRepository` | `JdbcTemplate`，无 ORM |
| 前端 | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | 手写 hash 路由、`api()` 封装、顶部 demo 身份选择器（1–5） |
| 夹具 | `acceptance-test-fixtures.md` | 用户、样例 trip、REQ-004 状态段；无偏好相关行 |
| Living Spec | `openspec/specs/` | 仅 `greeting`；`trips`/`invitations`/`preferences` 的 delta 尚未归档 |
| 计划契约 | `docs/knowledge/architecture/tech-stack-plan.md` §5/§6 | `tag` 表、`{data,error}` 封套、`X-Member-Id`，与代码不一致 |

## 3. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| 迁移 | `V1`、`V2`、`V3`；`V4` 属 REQ-019 | **无新增迁移**；只写入 `kind='must_do'` 的行 |
| 后端 | `com.gogo.trip`、`com.gogo.invitation`；`com.gogo.preference` 由 REQ-019 创建 | 在 `com.gogo.preference` 内新增 must-do 端点、item DTO、校验与 id 签发 |
| 接口面 | trip / invitation / greeting；（REQ-019 后新增 `/preferences`） | 新增 `GET`/`PUT /api/trips/{tripId}/preferences/must-dos` |
| 前端 | home / create / details / join；（REQ-019 后新增偏好页） | 偏好页新增必做项段：列表 + 内联表单 + 删除，逐动作 PUT |
| 文档 | trip 与 invitation 接口已记录 | `README.md` 增必做项段、验证矩阵增行 |
| Living Spec | 仅 `greeting` | 归档时向 `preferences` 追加必做项 requirement，并修订页面要求 |

## 4. Blast radius

- 兴趣端点、兴趣 payload 与兴趣保存按钮**不变**；两条写入路径互不连带。
- 同一张表、同一个 `kind` 维度新增取值，不改列、不改唯一键。
- `App.jsx` 不新增路由（偏好页路由由 REQ-019 提供）。
- 前后端均不新增依赖；运行时拓扑不变（8080 / 5173）。
- 对 US-031 是**只增不改**的数据供给：多一个 `kind` 可读，不影响既有读取。

## 5. Artifact impact

- Spec：`openspec/changes/req-020-manage-must-do/specs/preferences/spec.md`（P2）：一个 ADDED 必做项 requirement + 一个 MODIFIED 页面 requirement。
- Tests：后端接口测试覆盖 20 个场景；前端构建 + 浏览器观察（添加 / 改时间 / 删除 / 刷新）。
- Docs：`README.md`、`docs/feedback/verification-*.md`、`requirement-workspace/{registry,handoff}.md`。
- KB：无新增长期事实（同表不同 kind 属于能力行为，写 delta spec 即可）。

## 6. Dual-track notes

单条故事（US-020）、单能力（`preferences` 的修改）、20 个场景 → `/sdd:story-split` 跳过并记录理由。仅 OpenSpec 轨。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | REQ-019 的 `V4` 与偏好页尚未落库，本变更单独合入无法运行 | blocking for merge order | 缓解：堆叠交付，PR 描述写明前置；REQ-019 先合再合本条 |
| R2 | 条目 id 存在 JSON 数组内，无数据库约束；id 分配缺陷会静默产生重复或串号 | product correctness | 缓解：测试断言更新后条数与 id 集合不变；评审聚焦 id 分支 |
| R3 | 同一路径前缀下新增子资源，若映射写成 `/{tripId}/preferences/**` 或使用通配，可能影响兴趣端点 | integration | 缓解：P3 确认 Spring 精确匹配；兴趣端点的回归测试必须在同一次跑 |
| R4 | 页面契约冲突：兴趣段「显式保存」与本段「动作即保存」同页共存 | contract | 已解：P2 把页面 requirement 标 MODIFIED，按段写明写入时机（D12） |
| R5 | 参考图表单写「二选一」，照抄会阻碍 AC1 同时保存地点与时间 | UI alignment | 已解：D6 允许同时保存；文案修正列为 WARNING |
| R6 | `com.gogo.preference` 的 advice 依赖 REQ-019 先建，缺失时 `INVALID_REQUEST` 不产生 | integration | 缓解：若 REQ-019 未建，本变更自带 advice |
| R7 | `time` 不带日期，多日行程无法定位 | product scope | 已知偏离：夹具为单日，扩展留给 US-031（OQ-12） |
| R8 | Web 前端一次 PUT 提交整表，条目多时响应体放大 | operational | 不阻断；P2 已裁定不设上限（delta C6），OQ-11 关闭，风险留作观察项 |

无致命阻塞使 REQ-020 失效，拆分可以继续。

## 8. Suggested split boundaries

一个变更：`req-020-manage-must-do`，修改一个已有能力 `preferences`。
工作量：小——后端 1 个 controller 分支 + 1 个 service 方法 + 1 组 DTO + 1 组接口测试（零迁移）；
前端 1 个页面区块 + 样式。
依赖顺序：REQ-019 的 `V4`/偏好页（前置）→ must-do 端点与校验 → `GET` 回读 → 页面区块 → 验证文档。

合入顺序：REQ-019 → REQ-020，不得颠倒（迁移与页面均由前者提供）。

# Impact brief — REQ-024

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQs = 0，DoR BLOCKERs = 0）
- Change id: `req-024-set-trip-budget`
- Stacking: 堆叠在 `req-019-save-interests` → `req-020-manage-must-do` 之后；两者均未合 main

## 1. Requirement set

| id | Path |
|---|---|
| REQ-024 | `requirement-workspace/requirements/REQ-024.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-024，
`requirement-workspace/intents/2026-11-15-req-024.md`，
`requirement-workspace/analysis/req-024-dor.md`，
`docs/knowledge/architecture/tech-stack-plan.md` §5/§6（表与金额口径的权威），
`openspec/changes/req-019-save-interests/`（表与页面契约的来源）、
`openspec/changes/req-020-manage-must-do/`（同表不同 kind 与页面修订的先例）。

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| 身份 | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` 请求头（整数）；缺失或非 seed 用户 → `401 USER_REQUIRED` |
| trip / member 表 | `V2__create_trip.sql` | `app_user` 1–5、`trip` 1、`trip_member` 1–4 |
| 邀请与主线状态 | `V3__create_invitation.sql` | `trip_invitation` + `trip.main_plan_confirmed`（默认 0，US-037 之前无写入路径） |
| 偏好表 | `openspec/changes/req-019-save-interests/proposal.md` 与 `specs/preferences/spec.md` | **计划中的 `V4` + `member_preference`，尚未落库**；UNIQUE(`trip_id`,`user_id`,`kind`) |
| 偏好端点 | 同上；REQ-020 的 proposal | `/preferences` 与 `/preferences/must-dos` 均**尚未实现** |
| 偏好页 | 同上 | `#/trips/{tripId}/preferences`，**尚未实现** |
| 成员判定 | `TripRepository.isMember(long, long)` | 可直接复用 |
| 错误处理 | `TripErrorAdvice`（`com.gogo.trip`）、`InvitationErrorAdvice`（`com.gogo.invitation`） | 按包隔离；`com.gogo.preference` 需自带 advice（REQ-019 负责） |
| DB 访问 | `TripRepository` / `InvitationRepository` | `JdbcTemplate`，无 ORM |
| 金额口径 | `docs/knowledge/architecture/tech-stack-plan.md` §5 | 「金额用 `INTEGER` 分」；本需求金额存最小货币单位整数 |
| `kind` 取值域 | 同上 §5 | `interest`/`must_do`/`constraint`/`budget`——`budget` 已在计划枚举内，复用表不算偏离 |
| 前端 | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | 手写 hash 路由、`api()` 封装、顶部 demo 身份选择器（1–5），无组件库 |
| 夹具 | `acceptance-test-fixtures.md` | 用户、样例 trip、REQ-004 状态段；无偏好/预算行 |
| Living Spec | `openspec/specs/` | 仅 `greeting` |
| 计划契约 | `tech-stack-plan.md` §6 | 「`PUT /preferences` 一次提交四类偏好」与 `{data,error}` 封套、`X-Member-Id`，与代码不一致 |

## 3. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| 迁移 | `V1`、`V2`、`V3`；`V4` 属 REQ-019 | **无新增迁移**；只写入 `kind='budget'` 的行 |
| 后端 | `com.gogo.trip`、`com.gogo.invitation`；`com.gogo.preference` 由 REQ-019 创建 | 在 `com.gogo.preference` 内新增 budget 端点、DTO、三字段联动校验与单行覆盖写 |
| 接口面 | trip / invitation / greeting；（REQ-019 后 `/preferences`；REQ-020 后 `/preferences/must-dos`） | 新增 `GET`/`PUT /api/trips/{tripId}/preferences/budget` |
| 前端 | home / create / details / join；（REQ-019/020 后偏好页含兴趣段与必做项段） | 偏好页新增预算段：金额 + 币种 + 软/硬 + 独立保存按钮 + 清除 |
| 文档 | trip 与 invitation 接口已记录 | `README.md` 增预算段、验证矩阵增行 |
| Living Spec | 仅 `greeting` | 归档时向 `preferences` 追加预算 requirement，并第三次修订页面要求 |

## 4. Blast radius

- 兴趣段与必做项段的端点、payload 与保存交互**不变**；三条写入路径互不连带。
- 同一张表、同一个 `kind` 维度新增取值，不改列、不改唯一键。
- `App.jsx` 不新增路由（偏好页路由由 REQ-019 提供）。
- 前后端均不新增依赖；运行时拓扑不变（8080 / 5173）。
- 对 US-031 是**只增不改**的数据供给：多一个 `kind` 可读（含 `budget:null` 的显式未设置），不影响既有读取。

## 5. Artifact impact

- Spec：`openspec/changes/req-024-set-trip-budget/specs/preferences/spec.md`（P2）：一个 ADDED 预算 requirement + 第三次 MODIFIED 页面 requirement。
- Tests：后端接口测试覆盖 25 个场景；前端构建 + 浏览器观察（保存 / 改软硬 / 清除 / 0 与未设置的界面区分 / 刷新）。
- Docs：`README.md`、`docs/feedback/verification-*.md`、`requirement-workspace/{registry,handoff}.md`。
- KB：若 P4 确认金额单位与币种表是长期口径，需回写 `tech-stack-plan.md` §5（当前已写明「金额用 INTEGER 分」，无需新增）。

## 6. Dual-track notes

单条故事（US-024）、单能力（`preferences` 的修改）、25 个场景 → `/sdd:story-split` 跳过并记录理由。仅 OpenSpec 轨。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | REQ-019 的 `V4` 与偏好页尚未落库，且 REQ-020 已先一次 MODIFIED 页面契约；本变更是第三层，单独合入无法运行 | blocking for merge order | 缓解：堆叠交付，合入顺序 019 → 020 → 024，PR 描述写明前置 |
| R2 | API/payload 用最小单位（`4000`）而 AC 用主单位（40 SGD），断言只写一半会漏掉界面读法 | product correctness | 缓解：P4 断言双写（接口 `4000` + 界面 `SGD 40.00`） |
| R3 | `JPY` 零位小数；前端硬编码 ×100 会把 `1200` 显示成 `12.00` 或被放大 100 倍 | product correctness | 缓解：币种小数位表（2/2/2/2/0），禁止硬编码；AC3e 直接覆盖 |
| R4 | 「`amount` 键缺失」与「`amount:null`」若都映射成 null，AC7-N 失效且「清除」与「坏请求」混同 | contract | 缓解：P3 用 `JsonNode`/`Map` 做 presence 检查，再映射 DTO |
| R5 | payload 是单对象，数据库无法约束「行数恒 1」；插入写法错误会产生多行 | data integrity | 缓解：`INSERT ... ON CONFLICT(trip_id,user_id,kind) DO UPDATE`；测试断言行数恒 1 |
| R6 | 三个兄弟子资源（`/preferences`、`/must-dos`、`/budget`）同前缀；映射写宽会互相遮蔽 | integration | 缓解：P3 确认精确匹配；兴趣与必做项的回归测试同一次跑 |
| R7 | 同页三段三种写入时机，页面契约第三次修订，极易被「统一」成一种 | contract | 已解：P2 以 REQ-020 的版本为基线再修订，逐段写明 |
| R8 | 参考图预算卡币种不含 SGD、金额默认 1200、提交走全页 `submitPref()` | UI alignment | 已解：白名单补 SGD、无默认金额、段内独立保存；UI 改动列 WARNING |
| R9 | `tech-stack-plan.md` §6 的「单 PUT 提交四类偏好」与本需求独立端点漂移 | docs | 已知偏离：跟随 AC 与既有 delta；文档修正并入 REQ-019 OQ-16 |

无致命阻塞使 REQ-024 失效，拆分可以继续。

## 8. Suggested split boundaries

一个变更：`req-024-set-trip-budget`，修改一个已有能力 `preferences`。
工作量：小——后端 1 个 controller 分支 + 1 个 service 方法 + 1 组 DTO + 1 组接口测试（零迁移）；
前端 1 个页面区块 + 币种小数位格式化。
依赖顺序：REQ-019 的 `V4`/偏好页 → REQ-020 的页面修订 → budget 端点与校验 → `GET` 回读 → 页面区块 → 验证文档。

合入顺序：REQ-019 → REQ-020 → REQ-024，不得颠倒（迁移与页面契约逐层叠加）。

# Impact brief — REQ-026

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQs = 0，DoR BLOCKERs = 0）
- Change id: `req-026-submit-preferences`
- Stacking: 堆叠在 `req-019-save-interests` → `req-020-manage-must-do` → `req-024-set-trip-budget` 之后；三者均未合 main
- Scope: US-026 + US-027 合并为一条需求（用户裁定）

## 1. Requirement set

| id | Path |
|---|---|
| REQ-026（US-026 + US-027） | `requirement-workspace/requirements/REQ-026.md` |

Supporting: `requirement-workspace/deep-dive.md` §REQ-026，
`requirement-workspace/intents/2026-11-15-req-026.md`，
`requirement-workspace/analysis/req-026-dor.md`，
`docs/knowledge/architecture/tech-stack-plan.md` §5/§6，
`openspec/changes/req-019-save-interests/`（表与页面契约来源）、
`openspec/changes/req-020-manage-must-do/`、`openspec/changes/req-024-set-trip-budget/`（同表不同 kind 与页面修订先例）。

## 2. As-is asset inventory (evidence paths)

| Asset | Evidence | State |
|---|---|---|
| 身份 | `backend/src/main/java/com/gogo/trip/TripController.java` | `X-User-Id` 请求头（整数）；缺失/非整数/非 seed 用户 → `401 USER_REQUIRED` |
| trip / member 表 | `V2__create_trip.sql` | `app_user` 1–5、`trip` 1、`trip_member` 1–4（**只有两列主键，无就绪列**） |
| 邀请与主线状态 | `V3__create_invitation.sql` | `trip.main_plan_confirmed`（默认 0，US-037 前无写入路径） |
| 偏好表 | `openspec/changes/req-019-save-interests/proposal.md` | 计划中的 `V4` + `member_preference`，**尚未落库**；UNIQUE(`trip_id`,`user_id`,`kind`) |
| 偏好端点 | REQ-019/020/024 的 proposal | `/preferences`、`/preferences/must-dos`、`/preferences/budget` 均**尚未实现** |
| 偏好页 | 同上 | `#/trips/{tripId}/preferences`，**尚未实现** |
| 成员页 | `requirement-workspace/deep-dive.md`（US-013 段） | 节点 7 的就绪环在需求层已有约定，**尚未实现** |
| 成员判定 | `TripRepository.isMember(long, long)` | 可直接复用 |
| 错误处理 | `TripErrorAdvice`、`InvitationErrorAdvice` | 按包隔离；**无 500 映射**，500 走 Spring 默认体 |
| 既有错误码 | `TripController.java` | `USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST`；REQ-019/020/024 的文档也用这四个码，无漂移 |
| DB 访问 | `TripRepository` / `InvitationRepository` | `JdbcTemplate`，无 ORM |
| `kind` 取值域 | `tech-stack-plan.md` §5 | `interest`/`must_do`/`constraint`/`budget`；无就绪类 |
| 前端 | `frontend/src/{App.jsx,api.js,app.css,Icons.jsx}` | 手写 hash 路由、`api()` 封装、顶部身份选择器（1–5），无组件库 |
| 参考图 | `ui-design-reference/gogo-mvp-prototype.html`、`README.md` 节点 7/8 | `submitPref()` 一键保存+就绪；`noPrefSw` 仅 `hide`；节点 7 三色 pill |
| 夹具 | `acceptance-test-fixtures.md` | 用户、样例 trip、REQ-004 状态段；无 US-026/US-027 行 |
| Living Spec | `openspec/specs/` | 仅 `greeting` |

## 3. As-is → proposed delta

| Touched asset | As-is | Proposed delta |
|---|---|---|
| 迁移 | `V1`–`V3`；`V4` 属 REQ-019 | **无新增迁移**；新增 `kind='submission'` 行 |
| 后端 | `com.gogo.trip` / `com.gogo.invitation`；`com.gogo.preference` 由 REQ-019 创建 | 新增 submission 端点、readiness 与 effective 两个只读端点、空提交判定、500 `INTERNAL_ERROR` 映射 |
| 接口面 | trip / invitation / greeting；（前序后 `/preferences`、`/must-dos`、`/budget`） | 新增 `PUT /preferences/submission`、`GET /preferences/readiness`、`GET /preferences/effective` |
| 前端 | home / create / details / join；（前序后偏好页含兴趣/必做项/预算三段） | 偏好页新增提交段（按钮 + 无偏好开关 + 就绪 pill + 错误条 + 前置提示）；成员页就绪环与三 pill 接 `readiness` |
| 文档 | trip / invitation 接口；偏好三段 | `README.md` 增提交与就绪段、验证矩阵增行 |
| Living Spec | 仅 `greeting` | 归档时向 `preferences` 追加 3 个 ADDED requirement，并第四次修订页面要求 |

## 4. Blast radius

- 前三段的端点、payload 与保存交互**不变**；本需求对它们是**读消费**（不写）。
- 同一张表、同一唯一键新增一个 `kind` 取值，不改列、不改索引。
- `App.jsx` 不新增路由；`TripDetails.jsx` 的成员区需接 `readiness`（数据源新增，展示结构不变）。
- 前后端均不新增依赖；运行时拓扑不变（8080 / 5173）。
- 对 US-031 是**新增一条唯一读路径**（`effective`）：以往生成要自己拼四类 kind，现在只读一条投影；但也意味着生成实现必须遵循就绪过滤，否则「沉默≠同意」失效。

## 5. Artifact impact

- Spec：`openspec/changes/req-026-submit-preferences/specs/preferences/spec.md`（P2）：3 个 ADDED requirement + 第四次 MODIFIED 页面 requirement。
- Tests：后端接口测试覆盖 40 个场景（含失败注入与投影成员集合）；前端构建 + 浏览器观察（提交 / 无偏好 / 失败 / 失败后仍 pending / 身份切换 / 节点 7 三 pill）。
- Docs：`README.md`、`docs/feedback/verification-*.md`、`requirement-workspace/{registry,handoff}.md`。
- KB：若 P4 确认「就绪是独立状态而非偏好内容」为长期口径，需回写 `tech-stack-plan.md` §5（当前只有四类 kind）。

## 6. Dual-track notes

单条需求（US-026 + US-027 合并）、单能力（`preferences` 的修改）、40 个场景 → `/sdd:story-split` 跳过并记录理由。仅 OpenSpec 轨。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | 四个变更链式堆叠（019 的 `V4` 与偏好页 → 020 → 024 → 026）；本需求的 `effective` 还要读前三者 payload，单独合入无法证明 AC1 | blocking for merge order | 缓解：堆叠交付，合入顺序 019 → 020 → 024 → 026，PR 描述写明前置 |
| R2 | `kind='submission'` 超出 `tech-stack-plan.md` §5 的四类枚举，且语义从「偏好内容」扩到「提交状态」 | plan drift | 已知偏离：REQ-019 的 DoV 已裁定 kind 域由后续 story 扩展；文档修正并入 REQ-019 OQ-16 |
| R3 | 空提交判定要读四类 kind，其中 `constraint` 尚未实现；若对缺失 kind 抛异常，正常提交全 500 | product correctness | 缓解：把「无行」当「无」并对 `constraint` 短路；EMPTY1~EMPTY5 覆盖各类空态 |
| R4 | 没有 500 映射，AC2「保存失败」只能拿到 Spring 默认体（无 `code`/`message`），前端无法展示 | contract | 缓解：本变更补 500 `INTERNAL_ERROR`（固定文案，不泄露内部异常）；注入方式 P3 定（OQ-3） |
| R5 | `submittedAt`（+08:00）与表内 `updated_at`（UTC）双时间源，P4 易混用 | testability | 缓解：断言与界面只用 `submittedAt`；`updated_at` 只用于负向断言 |
| R6 | 四个兄弟子资源（`/preferences`、`/must-dos`、`/budget`）+ 三个新路径（`/submission` 写、`/readiness`、`/effective` 读）；若用 `/preferences/{kind}` 通配会吞掉写路径 | integration | 缓解：P3 精确匹配；三段回归测试同一次跑 |
| R7 | 同页四段四种写入时机（兴趣显式、必做项即时、预算段内显式、就绪页面级），页面契约第四次修订 | contract | 缓解：P2 以 REQ-024 版本为基线再修订，逐段写明；禁止把四段并成一次全页保存 |
| R8 | 参考图 `submitPref()` 一次点击保存+就绪、`noPrefSw` 仅 `hide`，与本需求的「保存/提交解耦」「禁用而非隐藏」直接冲突 | UI alignment | 已解：提交只负责就绪、开关禁用字段并写服务端标记；UI 改动列 WARNING |
| R9 | 提交后保存偏好**不撤销**就绪（D10），US-031 若直接读 `effective` 会拿到「就绪但内容已变」的输入 | product correctness | 已知留白：快照新鲜度由 US-031/037 处理（OQ-7）；本需求只保证状态不被误改 |
| R10 | 文档漂移：计划 §5/§6 与实现路线不符（`kind` 枚举、单 PUT 提交四类偏好） | docs | 缓解：本需求按代码实况写；修正并入 REQ-019 OQ-16。原记「REQ-020 写 `UNAUTHENTIC`/`TRIP_FORBIDDEN`」经 P2 复核不成立，OQ-10 已关闭 |

无致命阻塞使 REQ-026 失效，拆分可以继续。

## 8. Suggested split boundaries

一个变更：`req-026-submit-preferences`，修改一个已有能力 `preferences`，覆盖 US-026 + US-027。
工作量：中小——后端 1 个写端点 + 2 个只读端点 + 1 个空提交判定 + 1 个 500 映射 + 1 组接口测试（零迁移）；
前端 1 个提交段 + 成员页就绪展示接数据。
依赖顺序：REQ-019 的 `V4`/偏好页 → REQ-020/024 的 payload → submission 写端点与空提交判定 → readiness → effective → 提交段与节点 7 → 验证文档。

合入顺序：REQ-019 → REQ-020 → REQ-024 → REQ-026，不得颠倒（迁移、页面契约与只读消费链逐层叠加）。
