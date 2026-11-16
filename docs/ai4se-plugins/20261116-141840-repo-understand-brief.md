# Repo understand brief

- skill: skill.common.repo-understand
- command: /sdd:repo-understand
- root: d:\study\gogo
- focus: US-049 确认拆分（#21）/ US-050 取消草稿（#22）；backend, frontend, openspec, requirement-workspace, ui-design-reference
- depth: standard
- greenfield: no
- generated_at: 2026-11-16T14:20:00+0800
- checkpoint_log: docs/ai4se-plugins/20261116-141634-repo-understand-checkpoints.md

## 1. Repo shape

| Item | Finding | Evidence |
|------|---------|----------|
| Languages | Java 21（Spring Boot 3 + JDBC/JdbcTemplate）；TypeScript/TSX + JSX（React + Vite）；Bash（scripts/、vendor 技能包） | `backend/pom.xml`、`frontend/package.json`、`frontend/src/**` |
| Package managers | Maven（backend）、npm（frontend；根级 `package-lock.json` 仅脚本依赖） | `backend/pom.xml`、`frontend/package-lock.json` |
| Top layout | `backend/`（`com.gogo.hello` 下 hello/trip/invitation/mainplan/splits + common 共享内核）、`frontend/`、`openspec/`（Living Spec + changes）、`requirement-workspace/`（intents/requirements/analysis）、`docs/ai4se-plugins`（过程产物）、`vendor/ai4se-plugins` + `.agents/skills`（SDD 技能投影）、`ui-design-reference/` | 目录树 + 本文件证据列 |
| Monorepo? | 是：后端 + 前端 + 规格/技能资产同仓；根级无聚合构建（各自独立 `mvn` / `npm`） | probe-layout 报根级 pom.xml/package.json MISSING |

## 2. Spec backend

| Item | Finding | Evidence |
|------|---------|----------|
| Backend | openspec（Living Spec + changes，CLI 全局安装但不在 PATH） | `openspec/specs/`、`openspec/changes/` |
| Living specs | 6 个能力：`app-shell`、`greeting`、`invitations`、`main-itinerary`、`splits`、`trips` | `openspec/specs/*` |
| Active changes | `req-002-greeting-json-sqlite`（REQ-002 历史遗留，G1/G2/G3 未记录）；`req-004-split-draft-start`（目录内 0 文件，归档后空壳） | `Get-ChildItem openspec/changes` |
| Notes | `splits` Living Spec（327 行）当前止步于「校验结论」，显式写明「本期不实现确认（US-049）/取消（US-050）端点；`status` 预留 `cancelled`」；本变更正是其增量承接 | `openspec/specs/splits/spec.md` L27 |

## 3. Harness / Rules / KB

| Item | Status | Evidence |
|------|--------|----------|
| AGENTS.md | FOUND | 四条开发原则 + 知识库索引 + UI 参考 Ant Design 口径 |
| docs/knowledge/ | FOUND | `architecture/ domain/ external/ interfaces/ operations/ rules/` + `_INDEX.md` |
| docs/knowledge/rules/ | FOUND | architecture(5) / documentation / process(3) / quality(4) / security(6) / testing(3)；**无分支/流水线/环境/IaC 专项规则文件** |
| docs/ai4se-plugins/ | FOUND | 大量 P0–P5 报告与 checkpoint 记录（本项目过程产物惯例） |
| requirement-workspace/ | FOUND | `intents/ analysis/ requirements/ ready/ archive/`；REQ-001~007 + US-031-037 条目；`acceptance-test-fixtures.md` |

## 4. Entry points & risks

**Entry points（样例，非穷举）：**

- 后端拆分链：`backend/src/main/java/com/gogo/hello/splits/` — `SplitDraftController`（5 端点：GET 草稿、POST 发起、PUT boundaries、POST `routes:generate`、POST `routes:check-timing`）、`SplitDraftService`、`SplitDraftRepository`、`MemberGuard`、`domain/SplitDraftDocument`、`domain/ReunionTimingCalculator`、`provider/FixtureBranchCandidateProvider`。
- 共享内核：`common/ErrorCode`（13 码，含 `SPLIT_DRAFT_NOT_ACTIVE`、`STALE_DRAFT_VERSION`、`NOT_SPLIT_INITIATOR`）、`common/ApiResponse`、`common/GlobalExceptionHandler`。
- 数据：Flyway `V1__create_greeting.sql`、`V2__create_trip.sql`、`V3__create_invitation.sql`、`V4__splits.sql`（`split_draft` 表 + `plan_node`）、`V5__create_main_plan.sql`。
- 测试：`backend/src/test/java/com/gogo/hello/splits/**`（`AbstractSplitApiTest` 基类 + 4 个 API 测试 + domain/provider/repository 测试）、`mainplan/MainPlanApiTest`。
- 前端：`frontend/src/features/split/`（Screen 11 start / 12 boundary / 13 routes / 14 timing）、`router.tsx` 注释明确「Confirm/cancel (US-049/050) are out of scope, so the flow ends at timing」。
- 看板：GitHub Project #2 `gogo`；本会话已把 #21/#22 由 `Backlog` 迁至 `Req Analysis`。

**Risks / uncertainties：**

| Risk | Severity | Evidence / why uncertain |
|------|----------|--------------------------|
| **D1 Living Spec `splits` 与 main 实际代码漂移**：spec 写「请求头 `X-Member-Id`、`trip_member.id`、严格 4 表、草稿存 `trip.split_draft` 列、V2 迁移」；代码实际为 `X-User-Id`、`app_user.id`、独立 `split_draft` 表、V4 迁移 | high | `MemberGuard` 读 `X-User-Id`；`V4__splits.sql` 建 `split_draft` 表；`trips`/`main-itinerary`/`invitations` Living Spec 均为 `X-User-Id`。US-049/050 若按旧 spec 设计身份/表结构将直接跑偏，须在 P1 显式裁决并记入 delta |
| **D2 OQ-N7 未裁决**：确认端点如何消费 US-043 校验结论（服务端重算 vs 引用前端结论） | high | `req-004-007-dor.md` OQ-N7 deferred，owner = 未来 US-049 实现者（即本变更）；issue #21 AC2 要求「服务器拒绝不可行路线对」→ 倾向服务端重算 |
| **D3 草稿状态机缺口**：`SplitDraftDocument.status` 现值仅 `active`；确认需 `confirmed`、取消需 `cancelled`，且「取消后允许替换草稿」与 `split_draft.trip_id UNIQUE` 冲突需定策略（删除行 / 保留 cancelled 行如何释放唯一约束） | high | `V4__splits.sql`：`trip_id INTEGER NOT NULL UNIQUE`；`SplitDraftDocument` 仅 `status` 字段、`withBoundaries/withRoutes` 不迁移状态 |
| **D4 权限语义**：US-049 = organizer-only 确认（`trip.organizer_id`）；US-050 = initiator-only 取消（`initiatorMemberId`）。现有 `NOT_SPLIT_INITIATOR` 已存在，但 organizer 校验无现成错误码 | med | `ErrorCode` 13 码；`V2__create_trip.sql` 有 `organizer_id` |
| **D5 main 分支直开发 vs 既有惯例**：历史 change 走特性分支 + PR（G3 记录合并 commit）；本次用户裁决 main 直开发，CI 仅在 main push / PR 触发，故 push 即跑 CI | med | 用户 2026-11-16 指令；`.github/workflows/ci.yml` `on.push.branches:[main]` |
| **D6 残留 change 干扰**：`req-004-split-draft-start` 空壳与 `req-002-greeting-json-sqlite` 遗留会使 `openspec` 的 active-change 探测/校验噪声，且 probe 已报告 | low | 目录内 0 文件 / 未归档 |
| **D7 工作区未提交文件**：`requirement-workspace/acceptance-test-fixtures.req003-draft.md`、根 `package-lock.json` 处于 untracked | low | `git status --short` |

## 5. Suggested next /sdd

- Primary: `/sdd:bootstrap`（P0 第 2 步；增量对齐骨架，不覆盖既有内容）→ `/sdd:rules-govern`（check-merge，补分支/流水线缺口或明确记 gap）→ `/sdd:quality-checklist stage=p0`。
- Alternatives: 若用户希望压缩 P0，可在 rules-govern 记 `documented gap` 后直接进 P1 `/sdd:pre-spec-req`（US-049/050 → REQ 条目 + proposal）。

## Open questions

- OQ-1（承 D2）：确认时服务端重算 —— 复用 `ReunionTimingCalculator` 从草稿文档重算，还是要求客户端提交快照？（倾向复算，避免信任客户端 `confirmable=true`，issue AC2 隐式要求）
- OQ-2（承 D3）：「取消后可用未使用额度建替换草稿」—— 取消是把 `split_draft` 行置 `cancelled` 并需放开 `trip_id UNIQUE`，还是删除行留审计？直接决定是否需要新迁移 V6。
- OQ-3（承 D4）：非 organizer 确认的返回码 —— 复用 `NOT_A_MEMBER`/新增 `NOT_SPLIT_ORGANIZER`，或沿用 `NOT_SPLIT_INITIATOR`；契约需在 delta 定死。
- OQ-4（承 D1）：Living Spec `splits` 身份/表结构漂移是在本变更 delta 内以 MODIFIED requirement 修正，还是先跑一次独立 spec 修正 change？
- OQ-5：US-049/050 是否合并为一个 change（同一 Screen 15、同一草稿状态机）—— 参照 history 的「四 story 合并澄清」先例，倾向单 change / 双 REQ。
