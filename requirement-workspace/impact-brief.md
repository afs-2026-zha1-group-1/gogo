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
| R8 | Web 前端一次 PUT 提交整表，条目多时响应体放大 | operational | 不阻断；上限评估记入 OQ-11 |

无致命阻塞使 REQ-020 失效，拆分可以继续。

## 8. Suggested split boundaries

一个变更：`req-020-manage-must-do`，修改一个已有能力 `preferences`。
工作量：小——后端 1 个 controller 分支 + 1 个 service 方法 + 1 组 DTO + 1 组接口测试（零迁移）；
前端 1 个页面区块 + 样式。
依赖顺序：REQ-019 的 `V4`/偏好页（前置）→ must-do 端点与校验 → `GET` 回读 → 页面区块 → 验证文档。

合入顺序：REQ-019 → REQ-020，不得颠倒（迁移与页面均由前者提供）。
