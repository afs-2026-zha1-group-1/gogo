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
