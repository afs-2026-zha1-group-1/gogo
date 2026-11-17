# G1 decision — us-066-log-in

- Change id: `us-066-log-in`
- Gate: G1 (Align)
- Status: **RECORDED — Conditional**（2026-11-16）
- Decision: **Conditional**；C1–C4 关闭前不得进入 P4 实现，闭合后转 Pass
- Approvers: **IO = Johnson**，**SA = Elian Jiang**

本文件记录 2026-11-16 对 `US-066-log-in` 分支 P2 产物的独立评审，以及在该评审
基础上记录的 G1 结论。结论为 Conditional：意图与 AC 成立，但存在 4 个阻塞项
（B1–B4），须按 C1–C4 补齐后才可视为通过。

## Inputs（本次评审的产物）

- Delta specs: `specs/auth/spec.md`（5 ADDED）、`specs/trips/spec.md`（1 MODIFIED）、
  `specs/invitations/spec.md`（3 MODIFIED）、`specs/app-shell/spec.md`（4 MODIFIED）
- `proposal.md`、`dov-ac-review.md`、`consistency-lint.md`
- 需求侧: `requirement-workspace/requirements/REQ-006.md`、
  `analysis/req-006-dor.md`、`deep-dive.md` §REQ-006、
  `impact-brief.md` §38–45、`acceptance-test-fixtures.md` §REQ-006
- 代码基线: `origin/main` = `ebccd84`；本分支 merge-base = `00ea4bc`
- 工具限制: 本机 `openspec` CLI 不可用，本次未重跑 `openspec validate us-066-log-in`

## 事实基线核验（评审时实测）

| 项 | 实测结果 | 与产物说法是否一致 |
|---|---|---|
| 分支基线 | merge-base `00ea4bc`；main 已到 `ebccd84`，落后 25 个提交 | ✗ proposal §Impact「Upstream: current main 00ea4bc」已过期 |
| 迁移头 | main: `V1`…`V3`、`V4__splits.sql`、`V5__create_main_plan.sql` | Δ `V4` 不是「留给 travel_preference」，而是已合并的 splits 迁移；`V6` 仍是下一个空号 |
| Living Spec | `openspec/specs/` 现有 `app-shell`、`greeting`、`invitations`、`main-itinerary`、`splits`、`trips` | ✗ main-itinerary 已归档并有 Living Spec；proposal/lint 仍称「merged, archive pending」 |
| 归档记录 | main `openspec/changes/archive/` 含 `2026-11-16-us-031-037-main-itinerary`、`2026-11-16-req-004-split-planning-chain` | ✗ 同上 |
| splits 身份 | `SplitDraftController` 5 个端点在 `@RequestHeader("X-User-Id")` 取身份；`MemberGuard` 缺失即 401 `MEMBER_REQUIRED` | ✗ 本变更完全未提及 splits |
| splits 前端 | `features/split/api.ts:36` 发送 `X-User-Id`；`features/split/identity.tsx` 渲染 trip/member 输入的身份栏 | ✗ 本变更只提 `App.tsx` 的 `ScaffoldBar` |
| 错误体 | trip/invitation/mainplan = 扁平 `{code,message}`（各自 `*ErrorAdvice`）；splits = `{data,error:{code,message}}`（`ErrorCode` + `GlobalExceptionHandler`） | Δ 两套并存，新代码与 401/403 handler 必须二选一 |
| Spring Security | `pom.xml` 无 `spring-boot-starter-security`（Spring Boot 3.5.14） | ✓ 与产品说法一致 |
| dev 同源 | `vite.config.js` 已有 `server.proxy['/api'] → http://localhost:8080` | ✓ impact R42「cookies 同源」已可满足，无需 CORS |
| 前端骨架 | main `App.tsx` 确认存在 `ScaffoldBar` + `IDENTITY · SCAFFOLD（非登录）` 文案 | ✓ Why 段的现状描述准确 |

## Findings

### 阻塞项（须解决或书面豁免）

**B1 — `splits` 能力整体缺失，身份边界存在漏洞（范围/契约）**

- 证据：`openspec/specs/splits/spec.md`（5 条 requirement）已进入 Living Spec；
  `hello/splits/SplitDraftController` 的
  `GET/POST /api/trips/{tripId}/split-draft`、`PUT …/boundaries`、
  `POST …/routes:generate`、`POST …/routes:check-timing` 全部从 `X-User-Id`
  取身份；前端 `features/split/*` 通过身份栏发送 `X-User-Id`；4 个 splits 测试基类/用例
  也以 header 驱动。
- 影响：本变更声称「`X-User-Id` 不再认证任何请求」「每个非公开端点从 session
  principal 取身份」，但未把 splits 纳入迁移。实现后只有两种结局：
  (a) header 被安全链忽略 → splits 5 个端点恒 401 `MEMBER_REQUIRED`，已合并功能失效；
  (b) 仍读 header → splits 绕过 session 身份，任意人可用别人的 user id 操作分屏，
  与「verified identity」目标直接矛盾。
- 需补：`specs/splits/spec.md` MODIFIED（身份来源）、后端 splits 包身份迁移、
  前端 `features/split/{api,identity,states}` 迁移、splits 测试与夹具登录化。
- 备注：REQ-006 §Out of scope 与 DoR ③ 把「split work」列为范围外，是因为需求撰写时
  splits 尚未合并进 main；该前提已不成立。

**B2 — `main-itinerary` 的对齐对象已变，lint L1 失效（跨变更契约）**

- 证据：main 已归档 `us-031-037-main-itinerary`，并生成
  `openspec/specs/main-itinerary/spec.md`（7 条 requirement，含
  `Authorization and identity for main-plan operations`，正文仍写 `X-User-Id`）。
- 影响：`consistency-lint.md` L1 与 `dov-ac-review.md` R1 的
  「in-flight delta 仍写 header」前提过期；且本变更 delta 中**没有**
  `specs/main-itinerary/spec.md`，归档后 Living Spec 会继续宣称 main-plan 用
  header 认证，与 `auth` 直接冲突。仅靠通用「protected endpoint」条款不足以覆盖。
- 需补：新增 `specs/main-itinerary/spec.md` MODIFIED（identity requirement +
  命名 header 的场景），并把 L1 的处置改为「对 Living Spec 出 delta」。

**B3 — 基线过期，实施口径需重定（基线）**

- 证据：落后 main 25 个提交，期间已合入 splits 能力、`router.tsx`/`TabBar.tsx`/
  `features/split/*`、main-itinerary 与 splits 的 Living Spec、req-004 分链归档。
- 影响：proposal §Impact 的前端文件清单（`CreateTrip`/`TripDetails`/`Join`/
  `InvitationPanel`/`MainPlan`/`MainPlanInputs`/`App.tsx`/`api.ts`）与 `App.tsx:44-58`
  行号、测试清单（仅 trip/invitation/main-plan 三套）均不足以覆盖当前 main；
  直接按此实施会漏改并产生大量合并冲突。
- 需补：P3 前先把本分支 rebase/merge 到 ≥ `ebccd84`，再刷新影响清单与工作量。

**B4 — 错误契约双轨 + 401 码冲突（契约）**

- 证据：splits 侧 401 码为 `MEMBER_REQUIRED`，错误体为 `{data,error:{…}}`；
  trip/invitation/mainplan 侧为扁平 `{code,message}` 且 401 码为 `USER_REQUIRED`。
  新引入的 `INVALID_CREDENTIALS`、`CSRF_INVALID` 只在 delta/fixtures 中定义了 `code`，
  没有定义错误体形状。
- 影响：`auth` 端点与 Spring Security 的
  `AuthenticationEntryPoint` / `AccessDeniedHandler`（在包级 `@RestControllerAdvice`
  之外）必须选一种形状，否则同一应用会出现第三套错误体；同时
  `specs/auth` 「每个受保护端点 401 `USER_REQUIRED`」与 splits Living Spec 的
  `MEMBER_REQUIRED` 互斥，fixtures P1/P2 与 splits 用例会互相打脸。
- 需 G1 明示裁定：
  (a) 认证端点与 Security handler 采用哪种错误体（建议复用扁平 `{code,message}`
  以匹配多数既有端点与 `frontend/src/api.ts` 的解析，或明确改用 splits 的
  `{data,error}` 并同步 `api.ts`）；
  (b) splits 的 401 是否统一为 `USER_REQUIRED`（则需 MODIFIED splits spec +
  `features/split/states.tsx` 文案），还是保留 `MEMBER_REQUIRED` 作为例外
  （则需在 `auth`/`trips` spec 中写明例外，避免「一律 USER_REQUIRED」的绝对表述）。

### 非阻塞项（记录并指派 owner）

| id | 项 | 说明 | Owner |
|---|---|---|---|
| N1 | 迁移编号理由错误 | `V4` 现为 `V4__splits.sql`；`V6` 结论仍成立，但 proposal §What Changes/§Effort、REQ-006 §In scope、deep-dive ⑨、impact R45 的「V4 预留给 travel_preference」须改为「V4=splits，V1–V5 已占用，V6 为下一空号」。若 `feat/travel_preference` 日后仍要用 V4，须重编为 V7 并说明既有库的 Flyway out-of-order 处理 | Dev/SA |
| N2 | 测试迁移范围低估 | 引入 starter 后默认全局保护 + CSRF：`TripApiTest`、`InvitationApiTest`、`MainPlanApiTest` 的每个 POST 都要 session + token，另有 4 个 splits 测试类需一并迁移；`GreetingApiTest` 必须保持公开。proposal 只写了「tests move to session login」，未提 CSRF 与 splits | Dev |
| N3 | 前端影响清单与 main 不符 | 缺 `router.tsx`、`TabBar.tsx`、`features/split/{identity,api,states}.tsx`、`pages/Home.jsx`、`types.ts`；`App.tsx` 行号引用过期 | Dev/SA |
| N4 | 401 口径自相矛盾 | deep-dive ⑩「one generic credential failure (400/401)」与 spec 固定的 401 冲突，以 spec 的 401 为准，回改 deep-dive | SA |
| N5 | app-shell Living Spec 残留漂移 | `openspec/specs/app-shell/spec.md` 的 `Placeholder tabs` 仍称 分队 tab「not implemented yet」，而 main 已有 splits 流程。因本变更已 MODIFY app-shell，建议合并处理或单列同步 | SA |
| N6 | 夹具既有漂移 | `acceptance-test-fixtures.md` §US-031-037 仍写 `member_preference` 属 REQ-019 的 `V4`，与 main 的 `V4=splits` 不符。非本变更责任，但会影响 P4 验收可信度，建议 SA 另案修 | SA |

### 已确认无问题（正向核验）

- `auth` 5 条 requirement / 26 场景的措辞是行为可观测的，`INVALID_CREDENTIALS`、
  `CSRF_INVALID`、30 分钟可配置空闲超时、`#/login` 全屏无 dock 均与 REQ-006 OQ 结论一致。
- trips/invitations/app-shell 的 MODIFIED requirement 名称与 Living Spec 完全对应
  （`Trip caller identity`、`Invitation issuance`、`Invitation acceptance and joining`、
  `Unusable invitation`、`Mobile shell frame`、`Bottom dock navigation`、
  `Dashboard tab placement`、`Guest join exclusion`），归档不会因名称不匹配失败。
- `vite.config.js` 的 `/api` 代理已保证同源 cookie 与 CSRF cookie 可读，impact R42
  的环境风险可在 dev 内闭环（P4 浏览器验证仍需跑）。
- 演示口令仅存在于夹具文件、不进 UI、注册不在范围，符合 R34/R40 的既有裁定。

## Decision

- Decision: **Conditional**，记录于 2026-11-16。
- 理由：按当前产物实施会产生「splits 失效或绕过身份」与「Living Spec 与 auth
  冲突」两类缺陷，且实施基线落后 25 个提交；B1–B4 未解决前不满足 Pass。
- Conditional 附带 remediation（C1–C5）与 owner；无条件的 Conditional 无效，
  本次不适用。
- 转 Pass 的条件：C1–C4 全部关闭（或经 IO+SA 书面豁免），并重跑
  `openspec validate` 与一致性 lint；C5 为 P3 出口约束。
- 转 Fail 的情形：IO/SA 决定不把 `splits` 纳入且不接受豁免影响面，则本变更需
  重新切分后再过 G1。

## Conditions + owners（Conditional 落地清单）

| id | 条件 | 阻塞级别 | Owner | 期限 |
|---|---|---|---|---|
| C1 | 把 `splits` 纳入本变更：新增 `specs/splits/spec.md` MODIFIED；后端 `hello/splits` 身份迁移；前端 `features/split/*` 迁移并移除身份栏；splits 测试与夹具登录化。若决定不做，须 IO+SA 书面豁免并接受「splits 在 US-066 合并后失效」 | 阻塞 G1 Pass | SA/Dev | P3 前 |
| C2 | 新增 `specs/main-itinerary/spec.md` MODIFIED；把 lint L1 / dov R1 的处置改为「对 Living Spec 出 delta」 | 阻塞 G1 Pass | SA | P3 前 |
| C3 | 裁定错误契约：认证端点与 Security 401/403 handler 的错误体形状；splits 的 401 码（`MEMBER_REQUIRED` 保留 vs 统一 `USER_REQUIRED`），并同步 delta/fixtures | 阻塞 G1 Pass | SA/Dev | P3 前 |
| C4 | 把分支 rebase/merge 到 ≥ `ebccd84`；按新基线刷新 proposal §Impact、前端/测试清单、上游提交号与 `V4/V6` 口径 | 阻塞 G1 Pass | Dev | P3 前 |
| C5 | P3 design 必须覆盖 CSRF 在 MockMvc 的落地方式、短超时 profile 的过期验收、以及「安全链默认行为不影响 greeting/preview」的显式配置 | P3 出口约束（不阻塞 G1） | Dev | P3 |

## Approvers

- SA: **Elian Jiang** — 2026-11-16 表态接受（来源 `dov-ac-review.md` §G1 sign-off
  status，用户原话「sa 可以先选我」）。
- IO: **Johnson** — 2026-11-16 由用户指定为 IO 署名人，并选择以
  **Conditional + C1–C5** 记录 G1。Agent 记录该选择，不独立验证身份。
- 双方均无新增条件；remediation 来自本次评审的 B1–B4 与 C1–C5。
- 记录说明：本次 G1 早前因 IO 未署名而保持 open（`dov-ac-review.md` §G1
  sign-off status），评审后由用户补齐 IO 并选定结论，Gate 以此记录闭合为
  Conditional。

## Supersedes

- `consistency-lint.md` L1（「in-flight main-itinerary delta 仍写 header」）由 **B2**
  取代：对齐对象已变为 `openspec/specs/main-itinerary/spec.md`。
- `dov-ac-review.md` DoV-1「scope matches the proposal」按当时产物判定为 Pass，
  在 B1 之后应视为「proposal 本身缺 splits，故 scope 不完整」，待 C1 处理后重判。

## Next

1. 按 C1–C4 补件：把 `splits` 纳入（或取得书面豁免）、补 `main-itinerary`
   delta、裁定错误契约与 401 码、把分支 rebase 到 ≥ `ebccd84` 并刷新影响清单。
2. 补件后重跑 `openspec validate us-066-log-in` 与一致性 lint，并把结果回填本文件。
3. C1–C4 关闭后更新 Decision 段由 Conditional 转 Pass，再进入 P3
   （`/sdd:atdd-design`、`/sdd:task-plan`）；C5 在 P3 design 中落实。
