# Repo understand brief

- skill: skill.common.repo-understand
- command: /sdd:repo-understand
- root: d:\study\gogo
- focus: B 拆分链（US-038/039/042/043 → REQ-004~007），本轮 US-038（REQ-004）先行；分支 sdd-req-004-split-planning
- depth: standard
- greenfield: no
- generated_at: 2026-11-15T10:40:00+0800
- checkpoint_log: docs/ai4se-plugins/20261115-103654-repo-understand-checkpoints.md

## 1. Repo shape

| Item | Finding | Evidence |
|------|---------|----------|
| Languages | Java 21（后端）；JavaScript/JSX（前端，现状无 TypeScript） | `backend/pom.xml` `<java.version>21`；`frontend/src/App.jsx` |
| Package managers | Maven（backend，无 wrapper 实测待确认）+ npm（frontend，有 lockfile） | `backend/pom.xml`；`frontend/package.json`、`frontend/package-lock.json` |
| Top layout | monorepo：`backend/`（Spring Boot 3.5.14 单体）+ `frontend/`（React 19 + Vite 8 SPA）+ harness 目录（openspec/docs/requirement-workspace/scripts/ui-design-reference） | 根目录实测；`pom.xml` parent 3.5.14；`package.json` react ^19.3.1 / vite ^8.3.8 |
| Monorepo? | 是（双应用，无根级构建清单；CI 分 job 各自 working-directory） | probe：根级 pom.xml/package.json MISSING；`.github/workflows/ci.yml` |

## 2. Spec backend

| Item | Finding | Evidence |
|------|---------|----------|
| Backend | openspec（`schema: spec-driven`） | `openspec/config.yaml`、`.openspec.yaml` |
| Living specs | 仅 `greeting` 一个能力（REQ-001 归档产物） | `openspec/specs/greeting/spec.md` |
| Active changes | ① `req-002-greeting-json-sqlite`：P4 已实现并本地验证、P5 产物已撰写，但 G1/G2/G3 未记录、归档与 push 挂起；② `req-004-split-draft-start`：仅 `.openspec.yaml`（未跟踪，2026-11-15 创建），无 proposal/specs | probe NOTE active-change ×2；`requirement-workspace/registry.md`；目录实测 |
| Notes | REQ-003（trips 创建/查看）与 REQ-004 邀请功能的实现提交存在于游离提交与 stash 父链（a8c050b 等），不在 main 也不在任何现存分支；main 的 backend 仅 `com.gogo.hello` + V1 迁移 | `git branch --contains d4f67f0` 为空；`git stash list`；backend 目录实测 |

## 3. Harness / Rules / KB

| Item | Status | Evidence |
|------|--------|----------|
| AGENTS.md | FOUND | 根目录；四原则 + 知识库引用 + shadcn/ui 参考 |
| docs/knowledge/ | FOUND | 各域 slot README；`architecture/tech-stack-plan.md` 已在 main（B 链技术基准，含 DR-01~13、SQLite 三铁律、7 表模型、`X-Member-Id` 契约） |
| docs/knowledge/rules/ | FOUND（仅占位） | main 上只有 `rules/README.md`；完整 Rules 树（architecture/quality/security/testing/process）仅存在于 stash@{0}，用户已裁决不恢复 → P0-3 需重建 |
| docs/ai4se-plugins/ | FOUND | REQ-001/002 的质量清单/local-verify/pipeline 报告在 main；上一轮 P0 检查点与 brief 仅在 stash |
| requirement-workspace/ | FOUND | main 上仅 REQ-001/002 条目与 registry；REQ-004~007、intent、DoR、proposal 评审稿仅在 stash；工作区另有未提交的 REQ-003 相关改动（deep-dive §REQ-003、acceptance-test-fixtures.md） |

补充：`.qoder/rules/ai4se/` 投影在磁盘上不存在（仅 stash 内有）；CI 已存在（`.github/workflows/ci.yml`：backend `mvn -B test` + frontend `npm ci && npm run build`，PR→main 触发）。

## 4. Entry points & risks

**Entry points (sample, not exhaustive):**

- 后端：`backend/src/main/java/com/gogo/hello/`（HelloApplication / GreetingController / GreetingRepository / GreetingResponse）；`application.yml`（`jdbc:sqlite:./data/gogo.db`，8080 端口）；迁移仅 `V1__create_greeting.sql`
- 前端：`frontend/src/App.jsx`（fetch `/api/greeting`）、`vite.config.js`（代理到 8080）
- 技术基准：`docs/knowledge/architecture/tech-stack-plan.md`（§5 数据模型、§6 API 契约 `{data,error}`、§7 SQLite 三铁律与 Flyway 约定）
- UI 参考：`ui-design-reference/`（18 屏原型 + 截图；节点 11~14 对应 US-038/039/042/043）
- 流程入口：`vendor/ai4se-plugins/recipes/p0.md`（P0 序列）、`requirement-workspace/`（P1 工作区）

**Risks / uncertainties:**

| Risk | Severity | Evidence / why uncertain |
|------|----------|--------------------------|
| R1 SQLite 三铁律未落地：`application.yml` 无 WAL/busy_timeout/池=1；US-038 AC2 并发发起会踩 `SQLITE_BUSY` | high | `application.yml` 实测 vs tech-stack-plan §7；REQ-004 链头必须交付该基础 |
| R2 Rules 载体在 main 为空壳（仅 README），P0 DoV P0-2 会判 Partial/缺口；完整 Rules 只在 stash | high | `docs/knowledge/rules/` 实测；用户裁决不恢复 stash，rules-govern 需重建（可否参考 stash 内容待确认） |
| R3 REQ-002 挂起未归档（G1/G2/G3 未记录），Living Spec `greeting` 仍是 REQ-001 口径；B 链新 change 与在途 change 的叠加关系需在 P1/P2 说明 | med | registry.md REQ-002 行；`openspec/changes/req-002-greeting-json-sqlite/` 实测 |
| R4 前端栈冲突：现状纯 JSX + fetch，tech-stack-plan 要求 TS + AntD + TanStack Query + React Router；共存/迁移策略未定 | med | `frontend/package.json` vs tech-stack-plan §3；归 P3 设计决策 |
| R5 身份契约冲突：游离 REQ-003 用种子用户 + `X-User-Id`；tech-stack-plan 用邀请码 + 昵称 + `X-Member-Id`。B 链按后者（上一轮裁决，存于 stash，本轮需重新确认） | med | stash intent 裁决 2；tech-stack-plan §6；REQ-003 实现不在 main |
| R6 上游依赖：B 链需要「已确认主线 v1」，US-037/主线确认能力未实现；上一轮裁决为夹具自包含（不等 REQ-003/US-037），本轮 P1 需重新确认 | med | stash intent 裁决 1；ui-design-reference 节点 11 前提卡 |
| R7 工作区携带未提交的 REQ-003 相关改动（deep-dive §REQ-003、fixtures、req-004 `.openspec.yaml`）进入新分支，归属与去留未定 | low | `git status --porcelain` 实测 |
| R8 Flyway SQLite 支持机制待核实：pom 仅 `flyway-core` 无社区模块，但 REQ-002 已本地验证通过；与 tech-stack-plan §7「core+社区模块同版本」表述不一致 | low | `backend/pom.xml` vs tech-stack-plan §7；具体版本机制留 P3 核实 |

## 5. Suggested next /sdd

- Primary: `/sdd:bootstrap`（P0-2，复用同一 root）→ `/sdd:rules-govern`（P0-3，重建 Rules 载体）→ `/sdd:quality-checklist`（P0 DoV）；pipeline-iac 可选（CI 已存在，预计 skip）
- Alternatives: P0 完成后进入 P1 `/sdd:pre-spec-req`，对 REQ-004（US-038）做完整澄清，REQ-005~007 占位（用户 2026-11-15 裁决）

## Open questions

- OQ-A：Rules 重建时是否允许把 stash@{0} 内的 Rules 树作为参考输入（不恢复、只读借鉴）？还是完全从零起草？
- OQ-B：随分支携带的未提交 REQ-003 改动（deep-dive §REQ-003、acceptance-test-fixtures.md）如何处置——保留、单独提交、还是另行 stash？
- OQ-C：REQ-002 归档挂起是否阻塞 B 链启动？（当前判断：不阻塞，B 链新增 `splits` 能力，与 greeting 无交集；需在 P1 impact 中记录）
- OQ-D：REQ 编号权威：main registry 仅 REQ-001/002；REQ-003 被 trips 链占用（游离）、B 链沿用 REQ-004~007 映射（US-038→004、US-039→005、US-042→006、US-043→007）——该映射来自 stash 内上一轮裁决，本轮 P1 需正式重新确认