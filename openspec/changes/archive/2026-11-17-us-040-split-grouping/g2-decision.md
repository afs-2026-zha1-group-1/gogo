# G2 decision — us-040-split-grouping（VL Pass）

- Gate: G2 (Verify)
- Timestamp: 2026-11-17（+08:00，VL 复核签核）
- Branch: `US-040-split-grouping-p0`，PR #117，复核 head `8446714`（代码 head `6b6c2c9`，其后仅文档提交）
- 状态：**RECORDED / Decision = Pass**

## Inputs

- Local verify：`docs/ai4se-plugins/20261117-162107-local-verify-report.md`（Overall **Partial**：Build / Static scan / Code review / Evidence 全 Pass；E1 当时 Missing，已由下方 CI 补齐；E3 由本记录关闭）
- Pipeline（CI，E1）：
  - `docs/ai4se-plugins/20261117-162544-pipeline-report.md` + `openspec/changes/us-040-split-grouping/ci-report.md`
  - run [44046339433](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433)（head `6b6c2c9`）：Backend tests 38s Pass、Frontend build 20s Pass
  - run [44046867411](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046867411)（head `8446714`，本次复核时用 `gh` 机读确认）：Backend tests Pass、Frontend build Pass
  - 两次均为**机器读取**（`gh` API），无人工代为确认
- E2E：`docs/feedback/e2e-us-040.md`（E1–E13，12 行 Pass + 回归记录 + 12 张截图）
- G1：`openspec/changes/us-040-split-grouping/g1-decision.md`（Gate = Pass；Revision **Conditional**，C8 仍 open）
- Delta/Design/Tasks/ATDD/Fixtures：`specs/splits/spec.md`（39 场景）、`design.md`（DD1–DD17 + TS-1…TS-7）、`tasks.md`、`atdd-design.md`、`requirement-workspace/acceptance-test-fixtures.md` §US-040
- Delta 校验：`openspec validate us-040-split-grouping --strict` = valid（本次复核重跑）
- PR 状态：`gh pr view 117` → OPEN、非 draft、head `8446714`、**mergeable = CONFLICTING**

## 复核方式

逐条比对 delta 39 场景与实现（`SplitDraftController`/`SplitDraftService.assign`/`groupProblems`/`withAssignment`/`initialGroups`/前端 Screen 13·14·15），核对 11 例 `SplitAssignmentApiTest` 与改写的既有测试，`gh` 机读两次 CI run 与 PR 状态，重跑 `openspec validate --strict`。

**证据边界（如实记录）**：本轮未重跑本地 `mvn -B test` 与 `npm run typecheck/build`——环境无 `mvn` 在 PATH（`D:\Dev\apache-maven-3.8.8` 直调时 Maven Central 证书不受信）、`frontend/node_modules` 未安装。因此构建/测试结论以 E1 机器证据（两个 head 均双 job 绿）为准，未用本机重跑替代。

## 维度结果

| 维度 | 结果 | 证据 |
|---|---|---|
| 功能实现（delta 39 场景） | **Pass** | A1–A4、A5-N、A6-N、A7-N、A8-N、A9、A9b-N、Screen 13 均有对应实现；`assign` 守卫顺序（资格→活跃→版本→组别→目标归属）与 A5-N「终态优先 400」一致；`withAssignment` 先双组移除再加目标组（不可重复），保留 boundaries/routes；S9 全员 A、S10-N 发起门禁、G6-N/CF8-N 共用 `groupProblems`（固定顺序 `groups.A→B→unassigned→duplicate`） |
| 回归 | **Pass** | CI `Backend tests` 在 `6b6c2c9` 与 `8446714` 全绿；`prepareConfirmableDraftAs` 已插入分组步（v1→v2→v3→v4），`groups:move` 负向断言已改写 |
| UI（Screen 13/14/15 + 行程详情入口） | **Pass** | 头像 chip 切组、空组禁用生成/下一步、终态只读（E2E-1 已修复回归）、复核屏成员名与陈旧路线提示、成员不足前置拦截 |
| 安全 | **Pass** | `SecurityConfig` 未改（splits 维持 `permitAll` + `MemberGuard`）；无会话 401 `MEMBER_REQUIRED`；目标成员非本行程 403 `NOT_A_MEMBER`；仅 `active` 可写；无新增依赖/凭据/迁移 |
| 文档一致性 | **Pass（复核中修正漂移）** | delta/proposal/requirements/design/atdd/tasks/fixtures/registry/handoff 主链路一致；复核发现 design/tasks/atdd/registry 仍写 38 场景、9/10 例、旧 DTO 签名等 Revision 前口径，已就地修正；`dov-ac-review.md` 以 Revision 补记保留历史口径（见 F3） |
| CI（E1） | **Pass** | 上述两个 run 双 job 全绿（机读） |
| 浏览器 E2E | **Pass（含前置偏差说明）** | 12 行 Pass；唯一缺陷 E2E-1 已修复并回归；初始分组为存量草稿导致的A=0/B=4 镜像，S9「全员 A」由 API 测试覆盖（见 F6） |

## 缺陷分级

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 3 | F1 G1 Revision C8 未关闭；F2 PR #117 与 base 冲突；F3 P3 文档计数/DTO 描述漂移（已修正） |
| SUGGESTION | 3 | F4 注释与实现不符；F5 无路线时改组成功提示文案越界；F6 E2E 初始分组证据缺口 |

## 复核发现与处置

| id | 级别 | 发现 | 处置 |
|---|---|---|---|
| F1 | WARNING | G1 Revision（BQ-10 任意成员可改组）只记录 SA Leo Pass，IO Emily 的 C8 仍 open；本次实现与测试已按修订后 delta 落地 | **已关闭（2026-11-17）**：IO Emily 复核 Pass，C8 closed，G1 Revision 升为 Pass（见 `g1-decision.md`） |
| F2 | WARNING | PR #117 与 base 冲突（main 已前进至 US-083-085 / US-086 归档） | **已关闭（2026-11-17）**：本地 merge origin/main `b0fbd79` → `ec810d7`，逐一解决 6 个冲突文件；delta 补入 main 新增的 3 个 Screen 11 场景（39 → **41**）；后端 356/356、前端 build 绿、validate --strict valid；待 push 后确认新 head CI |
| F3 | WARNING | `design.md` 写 38 场景、DD16 `AssignmentRequest` 缺 `memberId`、DD17「9 例」与 detail 期望 4/0；`tasks.md` 2.3「10 例（含请求体不可移动他人）」、4.2 旧 DTO 签名、4.9「314/314」、对齐自检「38 场景」；`atdd-design.md` 38 场景/10 例；`registry.md`、`handoff.md` 10 例/38 场景/314 | 复核中已按当前代码（39 场景、11 例、`memberId?`、315/315、A=3/B=1）就地修正 design/tasks/atdd/registry/handoff；`dov-ac-review.md` 保留 G1 时口径并补 Revision 段落（不改已签署结论）；属口径同步，不改语义、不重开 G1 |
| F4 | SUGGESTION | `SplitAssignmentApiTest` 类注释仍称「no request shape can move another member」；`useAssignGroup` 注释写「Moves the caller」 | **已处理（2026-11-17）**：两处注释改为「任意成员可移动任意成员（memberId 缺省为调用者；目标非成员 403）」 |
| F5 | SUGGESTION | Screen 13 改组成功提示恒为「分组已更新，路线仍为上次生成的版本…」，在尚未生成路线时同样显示 | **已处理（2026-11-17）**：有路线时保留该提示，尚未生成路线时只提示「分组已更新。」 |
| F6 | SUGGESTION | E2E 初始分组为存量 active 草稿（v80）导致的 A=0/B=4 镜像，S9「发起即全员 A」只在 API 层验证 | 接受：S9 由 `SplitDraftStartApiTest` 覆盖，E2E 台账已显式记录前置偏差 |

## 偏差与已接受后果

| id | 内容 | 处置 |
|---|---|---|
| TS-1 | 陈旧路线提示为常驻（草稿不记录「路线生成时的分组」，未新增 wire 字段） | accepted；精确提示需回 `/sdd:delta-craft` 增字段并重开 G1 |
| TS-2 / OQ-10 | 同组重复提交幂等：200、不写库、不递增版本 | accepted；响应恒返回最新 `draftVersion`，前端以响应为准 |
| TS-3 | 存量单人 `active` 草稿仍 `SPLIT_DRAFT_INCOMPLETE`（不放宽分组完整性） | accepted；新发起由 `SPLIT_MEMBERS_INSUFFICIENT` 前置拦截 |
| TS-4 | 分组写入不重算路线、不删 `plan_node` | accepted；与 BQ-2 / A4 一致 |
| 分支/PR 形式 | 沿用 `US-040-split-grouping-p0` 与 PR #117（未另切代码分支/PR） | 记录在 `tasks.md` 1.1/1.2 |
| 404 诊断 | 无 envelope 的 404 映射为 `ENDPOINT_NOT_FOUND`（前端错误卡提示后端需更新） | 纯前端诊断增强，不改契约 |

## 合并前必须关闭

| # | 项 | Owner | 说明 |
|---|---|---|---|
| 1 | G1 Revision C8：IO 对「任意成员改组 + 头像切组 + `memberId` 入参」复核并具名签核 | Emily（IO） | **已关闭 2026-11-17**：IO Emily 复核 Pass，Revision Decision = Pass |
| 2 | PR #117 冲突解决 | Leo（SA） | **已关闭 2026-11-17**：merge `b0fbd79` → `ec810d7`；待 push 后确认新 head CI 双绿 |
| 3 | 知识库对账（`tasks.md` 9.3） | SA / P5 | **已关闭 2026-11-17**：`tech-stack-plan.md` 新增 §24、`_LOG.md` 新增 A24 行 |

## 签核区（VL）

| Role | Name | Decision | Date |
|---|---|---|---|
| VL | **Leo** | **Pass** | 2026-11-17 |

按用户 2026-11-17 指令代为记录（用户本人担任 VL，签核名 Leo）；代理不独立核实签署人身份，也不代替签署人判断。上述 F1/F2/F3 已并入本记录，未以已关闭项覆盖新增问题。

## Decision: Pass

delta 39 场景实现与回归全绿、E1 在两个 head 均机读双绿、E2E 12 行 Pass 且唯一缺陷已修复回归、无 CRITICAL、无 Waiver 需求。F1（IO 补签）与 F2（PR 冲突）为**合并（G3）前置**，不属于实现验证失败；F3 已在复核中修正。

## Closure path

- 当前 **Pass** → 关闭 C8（IO 补签）→ 解决 PR #117 冲突并复核 CI → G3（合并）→ P5（`/sdd:living-merge` + 归档 + 知识库对账 + F4 注释订正）。

## Merge reconciliation（2026-11-17，合并 origin/main 后复核）

- 基线：main 前进至 `b0fbd79`（含 US-083-085、US-086 归档）；本地 merge origin/main 得到 `ec810d7`。
- 冲突（6 文件）逐一解决：
  - `hooks.ts`：保留 main 的 `useMainPlan` + 本次的 `useTripMembers` / `assignGroup`。
  - `screen-start.tsx`：采用 US-086 的「队伍路线」结构（`useMainPlan` + `actionForStatus` + 路线图），把成员门禁移植为「`tooFewMembers` 时覆盖为 `blocked`」+ 顶部提示卡；保留 US-086 的三个新场景。
  - `TripDetails.tsx`：采用 `useTripOverview` 分流（无主线 → `TripDetailsLegacy`，有主线 → `TripOverview`）；分队入口已由 US-086 移至分队 tab，原「进入分队规划」按钮不再存在，成员门禁由 Screen 11/13 覆盖。
  - `impact-brief.md` / `registry.md` / `acceptance-test-fixtures.md`：US-040 段与 main 的 US-086 / US-083-085 段并存（各自保留完整段落）。
- Delta 场景：main 的 US-086 把 `Split draft start` 扩到 13 场景；delta 已逐字补入 3 条（「无草稿或已取消只显示主线」「活跃草稿的边界与路线状态」「状态分支的右上动作」），总数 **39 → 41**；`openspec validate --strict` = valid。
- 验证：后端 **356/356**、前端 `typecheck + build` 绿。
- 已关闭：F2（冲突）、F4（注释）、F5（提示文案）、知识库对账（§24 + A24）。
- 仍开放：**G1 Revision C8（IO Emily 补签）**。push 后新 head `3d4cf28` CI 双绿（run 44062093032 / 44062087362）、PR `MERGEABLE / CLEAN`，`ci-report.md` 已更新。
