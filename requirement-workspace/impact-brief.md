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

# Impact brief — REQ-004~007（B 拆分主链，合并澄清）

- Date: 2026-11-15
- Workdir: `requirement-workspace/`
- Mode: embedded at the end of `/sdd:pre-spec-req`（blocking OQ not-resolved = 0，DoR BLOCKER = 0，见 `analysis/req-004-007-dor.md`）
- Change id（建议）: `req-004-split-planning-chain`（用户裁决 OQ-4：一个 B 链 change 承载四个 delta）
- Solution direction: **add**（新能力 `splits`，现有栈上增量）

## 1. Requirement set

| id | Covers | Path |
|---|---|---|
| REQ-004 | US-038（issue #17）拆分草稿启动 | `requirement-workspace/requirements/REQ-004.md` |
| REQ-005 | US-039（issue #18）拆分边界选择 | `requirement-workspace/requirements/REQ-005.md` |
| REQ-006 | US-042（issue #19）分组路线生成 | `requirement-workspace/requirements/REQ-006.md` |
| REQ-007 | US-043（issue #20）会合时间校验 | `requirement-workspace/requirements/REQ-007.md` |

Supporting: `deep-dive.md` B 链段（⑨–⑫ 权威数据契约）、
`intents/2026-11-15-req-004-007-split-planning.md`、
`analysis/req-004-007-dor.md`、`acceptance-test-fixtures.md` B 链段、
`docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版权威）。

## 2. As-is asset inventory（证据路径）

| Asset | Evidence | State |
|---|---|---|
| 知识库 | `docs/knowledge/_INDEX.md`、`docs/knowledge/architecture/tech-stack-plan.md` | P0 已权威化：4 表（trip/trip_member/member_preference/plan_node）+ Java 21/Spring Boot 3.5.x/JdbcClient 无 ORM/SQLite 三铁律/Flyway 独占；Rules 树已重建（`docs/knowledge/rules/`） |
| Living Spec | `openspec/specs/greeting/spec.md` | 仅 `greeting` 一个能力，且仍是 REQ-001 口径（text/plain `Hello World`）；REQ-002 的 JSON delta 尚未 merge 入 Living |
| Post-archive 资产 | `openspec/changes/archive/2026-11-13-req-001-hello-world/`（11 文件齐全）；`archive/2026-11-13-req-002-greeting-json-sqlite/specs/greeting/`（空目录骨架） | req-001 完整归档；req-002 归档不完整（gap，见 R2） |
| 活跃 change | `openspec/changes/req-002-greeting-json-sqlite/`（全套产物含 g3-decision）；`openspec/changes/req-004-split-draft-start/`（仅 `.openspec.yaml`，untracked） | req-002 G3 已签但未归档/未 merge；req-004-split-draft-start 是前次会话单 story 拆分的残留 stub（用户裁决 OQ-4 后作废，见 R3） |
| 后端代码 | `backend/src/main/java/com/gogo/hello/`（4 类）、`resources/application.yml`、`db/migration/V1__create_greeting.sql` | REQ-002 实现已在树：JSON greeting、SQLite 文件库 `./data/gogo.db`、Flyway V1；无 trips/splits 代码 |
| 前端代码 | `frontend/package.json`、`src/App.jsx` | React 19 + Vite 8 纯 JSX；无 TS/AntD/TanStack Query/Router；仅 greeting 页 |
| CI | `.github/workflows/ci.yml` | backend `mvn -B test` + frontend `npm ci && npm run build`，已提交 |
| REQ-003 遗留 | stash（未恢复，用户 P0 裁决）；`deep-dive.md` §REQ-003；`acceptance-test-fixtures.req003-draft.md`（拆出的草稿文件，untracked 不提交） | 草稿口径（X-User-Id、5+ 表）已被用户裁决作废；B 链不依赖其实现（夹具自包含，OQ-1） |

Baseline classification: brownfield-on-greenfield —— `greeting` 能力已落地，
`splits` 为全新能力；权威树 `openspec/specs/` 存在且唯一，不引入竞争性 spec 根。

## 3. As-is → proposed delta

| Touched asset | As-is（证据） | Proposed delta |
|---|---|---|
| `openspec/specs/` | 仅 `greeting` | 归档时新建能力 `splits`，含 4 条 requirement：Split draft start / Split boundary selection / Group route generation / Reunion timing check |
| 后端服务 | `com.gogo.hello` 4 类，仅 greeting | 新增 splits 模块：4 端点（`POST /api/trips/{tripId}/split-draft`、`PUT …/boundaries`、`POST …/routes:generate`、`POST …/routes:check-timing`）；`{data,error}` 包封套 + `X-Member-Id` 身份契约；候选供给 = 进程内可替换提供者接口 + MVP 固定夹具实现（OQ-3） |
| 数据库 schema | 仅 V1 greeting 表 | V2 迁移：建 4 表（trip/trip_member/member_preference/plan_node）+ `trip.split_draft` 可空 TEXT 列（唯一 schema 扩展，用户裁决 OQ-N2 严格 4 表）+ 自包含种子（行程/5 成员/主线 v1 两 stop，OQ-1）；SQLite 三铁律（池=1、WAL、busy_timeout=5000、foreign_keys=on） |
| 前端应用 | React 19 纯 JSX，仅 greeting 页 | 增量引入 TS + AntD 5 + TanStack Query v5 + React Router 7（OQ-N3）；新增 Screen 11~14 对应页面；greeting 页保持 JSX（vite 混编） |
| `openspec/changes/req-004-split-draft-start/` | 仅 `.openspec.yaml` 残留 stub | proposal 阶段移除 stub，改建 `req-004-split-planning-chain`（OQ-4） |
| Living Spec `greeting` | REQ-001 口径 | Checked, no impact —— B 链不触碰 greeting；req-002 未 merge 的漂移记为 R2，不在本 change 处置 |
| `.github/workflows/ci.yml` | mvn test + npm ci/build | Checked, no impact anticipated —— 命令不变（vite build 原生支持 TS 混编）；新依赖入 lockfile 后 P4 验证 |
| `docs/knowledge/**` | tech-stack-plan 权威 + Rules 已重建 | Checked, no impact at P1 —— 归档时按 living-merge 更新 KB（P5） |
| REQ-003 遗留草稿 | stash + deep-dive §REQ-003 + `acceptance-test-fixtures.req003-draft.md` | 用户裁决保留不提交、维持现状（OQ-N1 deferred）；B 链按 tech-stack-plan 独立成立 |

## 4. Blast radius

- 后端运行时：同一 Spring Boot 进程（8080）新增 splits 端点族；SQLite 单写者
  （池=1），草稿并发用条件更新（影响行数 0 → 409 SPLIT_DRAFT_CONFLICT），
  成对路线单事务原子写入。无外部服务依赖（候选/时长全部夹具供给）。
- 前端运行时：同一 Vite dev server（5173，`/api` 代理 8080）；新增路由与
  AntD/Query 依赖 bundle；greeting 页行为不变。
- 数据运行时：`./data/gogo.db` 由 V2 迁移扩展；既有 greeting 表与种子不受影响。
- 身份边界：MVP 邀请码+昵称、`X-Member-Id` 头不校验签名（用户裁决 OQ-2），
  越权防护 = 成员关系查询（NOT_A_MEMBER 403 / MEMBER_REQUIRED 401）。

## 5. Artifact impact

- Specs: `openspec/changes/req-004-split-planning-chain/specs/splits/spec.md`
  （4 条 ADDED requirement，P2 产物，本期不写）。
- Tests: 后端验收测试四组（S1~S7 / B1~B6-N / G1~G5-N / T1~T5-N，夹具见
  `acceptance-test-fixtures.md` B 链段）；前端 build 检查；US-043 纯计算零读库断言。
- Docs: 本 workdir（四 REQ/deep-dive/DoR/意图/夹具/registry 已就位）、
  `docs/ai4se-plugins/` 检查点与质量报告。
- KB entries: P1 无新增；P5 归档时更新。

## 6. Dual-track notes

OpenSpec track only。四个 story（US-038/039/042/043）已是需求条目粒度且用户
裁决合并为一个 B 链 change（OQ-4），`/sdd:story-split` Skipped，理由：
不重复拆敏捷 backlog，链内依赖以 REQ 顺序表达（004→005→006→007）。

## 7. Risks & blockers

| id | Risk | Severity | Status |
|---|---|---|---|
| R1 | REQ-003 草稿口径（X-User-Id/多表）与 B 链（X-Member-Id/严格 4 表）分叉，未来 US-037 对齐可能返工 | non-blocking | 用户裁决维持现状（OQ-N1 deferred，owner IO/SA）；已用 V2 起编号 + 独立 JSON 文档缓解 |
| R2 | req-002 G3 已签但未归档、Living Spec greeting 仍是旧口径 | harness debt, non-blocking | B 链不依赖 greeting；记录备查，归档处置不在本 change 范围 |
| R3 | `req-004-split-draft-start` 残留 stub 与新 change 命名冲突 | non-blocking | **resolved**：proposal 阶段已删 stub 文件（仅含 `.openspec.yaml`，无产物损失；余空目录壳 untracked 不入 git） |
| R4 | SQLite 单写者下草稿并发/成对原子性实现不当 → 脏草稿或半对路线 | design risk | 契约已定（条件更新 + 单事务整对回滚 + draft_version 递增）；P3 设计、P4 用例验证 |
| R5 | 前端 JSX/TS 混编 + 新依赖 lockfile 在 CI 的安装/构建 | operational | P4 本地 `npm ci && npm run build` + CI 观察验证 |
| R6 | 夹具文件混合（REQ-003 草稿段 + B 链段同文件）与「保留不提交」裁决的提交边界 | process | **resolved**（用户 2026-11-15 裁决拆成两个文件）：B 链段留 `acceptance-test-fixtures.md` 随 P1 提交；草稿段拆至 `acceptance-test-fixtures.req003-draft.md`（untracked 不提交） |

**Critical blockers: 0** —— 无关键未知依赖使需求失效，可进入 proposal-split。

## 8. Suggested split boundaries

一个 change：`req-004-split-planning-chain`，一个新能力 `splits`，四条 ADDED
requirement 一一对应 REQ-004~007（用户裁决 OQ-4，不再按 story 拆多个 change）。
链内实现顺序建议：REQ-004（草稿+V2 迁移+种子）→ REQ-005（边界）→
REQ-006（成对生成）→ REQ-007（纯校验，可与 006 并行）。前端四页面随后端
契约逐环接入。Effort: medium-large —— 1 迁移、4 端点、1 提供者接口+夹具实现、
4 前端页面 + 新栈引入、四组验收测试。无跨 change 依赖（greeting 不受影响）。
