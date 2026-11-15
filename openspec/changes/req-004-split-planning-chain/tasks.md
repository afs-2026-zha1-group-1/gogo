# Tasks — req-004-split-planning-chain

- phase: **P3（设计分解，非实现）**｜G1: **Pass**｜owner: **Dev**（P4 `/sdd:atdd-apply` 执行红绿 TDD，含 UT）
- 链接: 设计决策见 [`design.md`](design.md)（D1-D17）；验收分层见 [`atdd-design.md`](atdd-design.md)（30 API + 4 E2E）；契约见 [`specs/splits/spec.md`](specs/splits/spec.md)（5 req / 34 场景）
- 约定: 每任务**红先绿后**（先写验收测试为红→实现转绿）；验证写在每个 checkbox 内；`[ ]` = 待 P4，本阶段不实现、不写生产代码
- 门: Static 反向 grep + Runtime `mvn -B test` / `npm ci && npm run build`（本地+CI）+ System 浏览器走查（仅本地）；CI 恰 2 job 不变（D17）
- 人工 Gate: G2/G3 须具名签核，**不自动批准**；IO/SA/VL 决策项仅草稿

## 1. 基座：共享内核 + V2 迁移 + 守卫（D1-D4, D8, D9）

- [ ] 1.1 建 `com.gogo.hello.common` 叶子：`ApiResponse<T>` record `{data,error}`、`ErrorCode` enum（13 码 + HTTP 映射）、`ApiException`、`GlobalExceptionHandler`（D3）— 验证 `mvn -B compile` 绿；handler 单测：ApiException→对应 status + `{data:null,error:{code,message}}`；common 不依赖 splits（no-circular）。
- [ ] 1.2 **红**：V2 schema/种子验收测试（V2 场景，repository 层，内存 SQLite）— 断言恰 4 表 + `trip.split_draft` 列 + 种子（SGF26A/plan_version=1/4 成员 ack=1/Eve 另一行程/主线两 stop）+ greeting 表与 V1 种子 intact；此时迁移未建 → 红。
- [ ] 1.3 **绿**：写 `V2__splits.sql`（4 表 + split_draft TEXT NULL + 自包含种子，D4/D5）— 验证 1.2 转绿；`mvn -B test` 绿；反向 grep 无第 5 表/无 plan_node 新列。
- [ ] 1.4 `application.yml` 落地三铁律（URL `?journal_mode=WAL&busy_timeout=5000&foreign_keys=on` + hikari `maximum-pool-size=1`，D4）— 验证空库启动 Flyway 应用 V1+V2；`GET /api/greeting` 仍 200 裸 `{"message":"Hello World"}`（R5 回归）。
- [ ] 1.5 **红→绿**：`MemberGuard` identity→trip→membership（D8）+ `SplitDraftRepository`（JdbcTemplate，条件更新助手，D2/D9）— 验证守卫顺序测试：缺失/全局未知 id→401、已知 id+未知 trip→404、outsider→403，拒绝 data=null 无私有值（S4-N/S5-N/S6-N 共享守卫）。

## 2. REQ-004 草稿发起 slice（V2, S1-S7；SplitDraftStartApiTest）

- [ ] 2.1 **红**：`SplitDraftStartApiTest` 写 S1/S2/S3-N/S7（MockMvc + JdbcTemplate，内存 SQLite pool=1，每测试 reset split_draft=NULL）— S1 POST 201 + 活跃草稿数=1；S2 `CountDownLatch` 双线程并发→一 201 一 409 CONFLICT + 计数=1；S3-N 置某成员 ack=0→409 MAIN_PLAN_NOT_CONFIRMED 不创建（验后还原）；S7 重复→409 CONFLICT 原草稿不变；端点未实现 → 红。
- [ ] 2.2 **绿**：`SplitDraftController` POST + `SplitDraftService` 发起编排（守卫→主线确认谓词→活跃唯一条件更新 `split_draft IS NULL`→draftVersion=1，D8/D9）+ 草稿文档初始化（groups 夹具齐全分区 A=Alice+Ben/B=Chloe+Daniel，D5/D16）— 验证 2.1 转绿；`mvn -B test` 绿。
- [ ] 2.3 主线确认谓词域判定（全员 `plan_ack_version`=`trip.plan_version`，D16/orchestration-execution）— 验证谓词单测（P4 UT）：全 ack→true、任一落后→false；S3-N 集成已覆盖。
- [ ] 2.4 反向：US-049/050 端点不实现 — 验证 `POST .../split-draft:confirm`、`:cancel` 无路由→404/405，草稿不被锁定/取消（atdd §5）。

## 3. REQ-005 边界 slice（B1-B6-N；SplitBoundaryApiTest）

- [ ] 3.1 **红**：`SplitBoundaryApiTest` 写 B1/B2-N/B3-N/B4-N/B5-N/B6-N — B1 PUT 200 窗口 120 + draftVersion 2；B2-N 反向→400 NONPOSITIVE_SPLIT_WINDOW 边界/版本不变；B3-N Singapore Zoo→400 BOUNDARY_NOT_IN_MAIN_PLAN；B4-N Chloe→403 NOT_SPLIT_INITIATOR；B5-N 无草稿→409 SPLIT_DRAFT_NOT_ACTIVE；B6-N 旧版本→409 STALE_DRAFT_VERSION；红。
- [ ] 3.2 **绿**：PUT boundaries 端点 + Service（发起人/活跃/版本校验→成对主线内→`SplitWindow` 正窗口域判定→条件更新 `json_extract draftVersion`→+1，D7/D9）— 验证 3.1 转绿；窗口= reunion.start − departure.end（分钟）派生自主线 stop（D7）。
- [ ] 3.3 `SplitWindow` 纯域窗口计算（D7/orchestration-execution）— 验证 UT（P4）：正窗口/零/负窗口分钟；半边界（仅一 stop）→400 成对必填（atdd §5 反向）。

## 4. REQ-006 路线生成 slice（G1-G5-N；SplitRouteGenerationApiTest + provider）

- [ ] 4.1 **红**：`SplitRouteGenerationApiTest` 写 G1/G2-N/G3-N/G4-N/G5-N — G1 POST 200 恰两路线（A→National Gallery、B→Gardens by the Bay，同起终点）+ 时长分解（60/[15,20]/10、60/[20,20]/10）+ 版本+1；G2-N failing provider 替身对 B 抛错→ROUTE_GENERATION_FAILED 无新路线、旧对/主线不变；G3-N N 启动+并发重选 N+1→409 STALE、N+1 保留；G4-N 无边界→409 SPLIT_BOUNDARIES_REQUIRED；G5-N Chloe→403；红。
- [ ] 4.2 **绿**：`BranchCandidateProvider` 接口 + `FixtureBranchCandidateProvider`（进程内固定值，无外网，D12）— 验证 G1 候选来自夹具；反向 grep 无 HTTP client 依赖/无外网调用。
- [ ] 4.3 **绿**：POST routes:generate 端点 + Service 成对原子（`@Transactional` 删旧对→插新对→版本条件更新；提供者抛错整对回滚，D10/D11）+ plan_node split-a/b 行（plan_version=mainPlanVersion）+ 草稿 routes 时长 JSON（D6）— 验证 4.1 转绿；G2-N 回滚无半对；G3-N 确定性 latch 构造 N→N+1。
- [ ] 4.4 反向：分组移动控件/端点不实现 — 验证无 group-move 端点；后端分组变更→版本递增语义仍成立（atdd §5，D16）。

## 5. REQ-007 timing slice（T1-T6-N；ReunionTimingApiTest + calculator）

- [ ] 5.1 **红**：`ReunionTimingApiTest` 写 T1/T2-N/T3-N/T4-N/T5-N/T6-N — T1 200 A105/B110 feasible=true + 算子零 DB（spy verify 无 Repository 调用）；T2-N A 末段 40→A125/overrun5 feasible=false、B110 单独通过；T3-N 缺输入→missingInputs feasible=false；T4-N Eve→403；T5-N 空/路线数≠2→400 INVALID_ROUTE_PAIR；T6-N 守卫 401/404/403 算子不被调用；红。
- [ ] 5.2 **绿**：`ReunionTimingCalculator` 纯域（totalMinutes=activity+ΣtravelLegs+buffer、overrun=max(0,total−window)、missingInputs 探测、整对 feasible 聚合，零 DB，D13）— 验证 UT（P4）纯算术红绿；T1 spy 断言算子无 Repository 依赖/零 DB 调用。
- [ ] 5.3 **绿**：POST routes:check-timing 端点 + Service（entry guard 读 identity/trip/membership→算子消费显式快照 body，不读库不写库，D13/D8）— 验证 5.1 转绿；T6-N 守卫先于算子（拒绝时算子不被调用）；超窗/缺输入=200 feasible=false（非 4xx）。

## 6. 草稿详情读取 slice（D1-D5-N；SplitDraftDetailApiTest）

- [ ] 6.1 **红**：`SplitDraftDetailApiTest` 写 D1/D2/D3-N/D4-N/D5-N — D1 Chloe GET 200 一致快照（initiator/versions/status/groups/timestamps/mainPlanStops/边界 ids·时刻/窗口 120/两路线含时长）+ 无变更/无版本递增；D1 部分态（边界前 ids/时刻/窗口 null、生成前 routes=[]）；D2 无草稿→200 `{data:null,error:null}` 不隐式创建；D3-N Eve→403 data=null；D4-N 缺失/未知 id→401；D5-N 未知 trip→404；红。
- [ ] 6.2 **绿**：GET split-draft 端点 + Service 快照组装（草稿文档 + mainPlanStops branch=main/version=mainPlanVersion + 派生边界时刻/窗口 + plan_node split 行 joined 草稿 routes 时长，D14/D6/D7）— 验证 6.1 转绿；member-only 不要求发起人；只读不增版本；空态 200 data=null。

## 7. 前端 shadcn 栈 + Screen 11-14（D15；E2E 仅本地）

- [ ] 7.1 引入 TS + Tailwind + shadcn/ui + TanStack Query v5 + React Router 7（入 lockfile，公共 registry resolved URL，D15/R3）；`tsconfig` 覆盖新 TS；build=`tsc -b && vite build` — 验证 `npm ci && npm run build` 绿；greeting `App.jsx` 保持 JSX 行为不变；反向 grep lockfile 无内网 host。
- [ ] 7.2 `main.jsx` 包 QueryClientProvider + RouterProvider；Tailwind theme 映射 ui-design-reference 色彩令牌（品牌青绿/A 蓝/B 橙/ok/warn/err）；shadcn 组件基座 — 验证 dev server 5173 起、greeting 页仍渲染 Hello World（回归）。
- [ ] 7.3 **E2E 红→绿** Screen 11 发起页（`.tsx`，路由 `/trips/:tripId/split/*`）：草稿状态（initiator/mainPlanVersion/draftVersion）+ 冲突/未确认/无权限错误态 + loading/empty；前端不自行判唯一性/确认 — 验证本地浏览器走查（B 链种子 SGF26A，非原型青岛/210）；对接 POST start + GET 详情。
- [ ] 7.4 **E2E** Screen 12 边界页：出发/会合选择器仅主线 stop + stop 名/时刻/窗口分钟 + 非正窗口/主线外错误态 + loading/empty/permission；前端不自行算合法性落库 — 验证浏览器走查；对接 PUT boundaries + GET。
- [ ] 7.5 **E2E** Screen 13 分组路线页：成对路线卡（组标签/活动名/起终点/时长分解）+ 失败/过期态 + loading/empty/permission；**分组移动控件不实现**（反向）— 验证浏览器走查；对接 POST generate + GET。
- [ ] 7.6 **E2E** Screen 14 窗口校验页：两路线活动/交通/buffer 分解 + totalMinutes + 通过/超窗（overrun）/缺输入（missingInputs）三态 + loading/empty/permission；前端不自行宣布可行 — 验证浏览器走查；对接 POST check-timing + GET 快照。

## 8. 门 / 回归 / 反向验证（D17；本地 + CI）

- [ ] 8.1 Static 反向 grep 全过 — 验证 pom 无 jpa/hibernate、backend 无 h2、源码无硬编码密钥、无第 5 表/plan_node 新列、无外网提供者依赖、lockfile 无内网 host；workflow 恰 2 job（`python -c` yaml 校验）。
- [ ] 8.2 Runtime 本地 — 验证 `cd backend && mvn -B test` 全绿（30 API 场景 + 回归）；`cd frontend && npm ci && npm run build` 绿。
- [ ] 8.3 greeting 回归 — 验证 `GET /api/greeting` 200 裸 `{"message":"Hello World"}`、V1 种子 intact、POST/PUT/DELETE→405（既有能力不受影响）。
- [ ] 8.4 System 本地 E2E — 验证起 backend jar(8080)+frontend dev(5173)，删 `backend/data/` 重建干净种子，浏览器逐屏走查 Screen 11-14 + curl API smoke；E2E 仅本地（CI 无 runner，不新造）。
- [ ] 8.5 CI 观察 — 验证 push 后 CI 恰 2 job（backend `mvn -B test` / frontend `npm ci && npm run build`）；新依赖 runner 可达性（R3）；CI 命令不变；pipeline report 据实（无 API 证据则 Partial + 具名人工确认）。

## 9. 阶段产物与人工 Gate（Dev 草稿；IO/SA/VL 决策，不自动批准）

- [ ] 9.1 P4 `/sdd:atdd-apply` 红绿 TDD（含 Defer-UT 单元：窗口/timing 算术/版本谓词/草稿序列化）— 验证每场景红→绿证据；UT 套件 P4 展开（本 P3 不写）。
- [ ] 9.2 P4 `/sdd:local-verify-report`（V1-V8 + 五问 + 人工评审辅助）— 验证每场景/反向有命令输出或浏览器观察；未验项 Partial 非 Pass。
- [ ] 9.3 P4 quality-checklist + `g2-decision.md` — 验证 G2 保持 **NOT RECORDED** 直至具名 VL 签核；agent 不自批。
- [ ] 9.4 P5 `/sdd:living-merge` + change-summary + `g3-decision.md` — 验证 merge-ready 人工确认前置；G3 具名 SA 签核；**proposal/KB AntD5→shadcn 口径 P5 同步**（C4/R7）；KB 更新据实。

## Spec ↔ Design ↔ Tasks ↔ ATDD 对齐自检（P3 必需）

**场景计数**（spec 34 = atdd 34 = tasks 覆盖 34；30 API + 4 E2E）：

| Requirement | 场景（spec） | Design D | Tasks T | ATDD 层 |
|---|---|---|---|---|
| Split draft start（9） | V2 | D4/D5 | 1.2/1.3 | API |
| | S1/S2/S3-N/S7 | D5/D9/D16 | 2.1/2.2/2.3 | API |
| | S4-N/S5-N/S6-N | D8 | 1.5 | API |
| | Screen 11 | D15 | 7.3 | E2E |
| Split boundary selection（7） | B1/B2-N/B3-N | D7/D9 | 3.1/3.2/3.3 | API |
| | B4-N/B5-N/B6-N | D8/D9 | 3.1/3.2 | API |
| | Screen 12 | D15 | 7.4 | E2E |
| Group route generation（6） | G1/G2-N/G3-N | D6/D10/D11/D12 | 4.1/4.2/4.3 | API |
| | G4-N/G5-N | D8/D10 | 4.1/4.3 | API |
| | Screen 13 | D15/D16 | 7.5 | E2E |
| Reunion timing check（7） | T1/T2-N/T3-N | D13 | 5.1/5.2/5.3 | API |
| | T4-N/T5-N/T6-N | D8/D13 | 5.1/5.3 | API |
| | Screen 14 | D15 | 7.6 | E2E |
| Split draft detail read（5） | D1/D2 | D14/D6/D7 | 6.1/6.2 | API |
| | D3-N/D4-N/D5-N | D8/D14 | 6.1/6.2 | API |

**计数核对**：start 9 + boundary 7 + generation 6 + timing 7 + detail 5 = **34**；E2E = Screen 11/12/13/14 = **4**；API = 34 − 4 = **30**。与 spec、atdd-design §1 一致，无静默扩/缩。

**契约核对**：

- 5 端点（GET/POST start、PUT boundaries、POST generate、POST check-timing）↔ design 端点表 ↔ tasks 2/3/4/5/6 ↔ atdd 30 API：一致。
- 13 错误码 ↔ design ErrorCode→HTTP ↔ 各 slice 拒绝场景 ↔ atdd：全覆盖（GET 复用守卫码，不新增）。
- 守卫 identity→trip→membership（401/404/403）↔ D8 ↔ 1.5/各 slice ↔ atdd S4-S6/T6/D3-D5：一致。
- 严格 4 表 + split_draft（无第 5 表/无 plan_node 新列）↔ D4/D5/D6 ↔ 1.3/8.1 反向 ↔ atdd §5：一致。
- timing 算子零 DB ↔ D13 ↔ 5.2/5.3 ↔ atdd T1/T6-N：一致。
- 成对原子 + stale N→N+1 ↔ D10/D11 ↔ 4.3 ↔ atdd G2-N/G3-N：一致（F5）。
- 分组齐全防御性前置 ↔ D16 ↔ 2.2/4.4 ↔ atdd §5（C3/F1）：一致。
- 前端 shadcn/ui+Tailwind（取代 AntD5）↔ D15 ↔ 7.x ↔ atdd Screen 11-14（C4）：一致；proposal/KB P5 同步（R7）。
- non-goals 反向（US-049/050、分组移动、第 5 表、外网、半边界、零 DB、greeting 回归、无 ORM/H2/密钥）↔ design Non-Goals ↔ 2.4/3.3/4.4/8.1/8.3 ↔ atdd §5：每项 ≥1 反向 case。
- NFR defer（OQ-N7）↔ design Non-Goals ↔ atdd §6：无 NFR 测试段，一致。

**自检结论：Pass** — Spec↔Design↔Tasks↔ATDD 四向对齐，34 场景计数一致、5 端点/13 错误码/守卫/4 表/零 DB/成对原子/stale/分组前置/前端栈/non-goals 反向全覆盖，无静默扩缩、无未承接 G1 条件（C3→D16、C4→D15/D11）。Defer-UT 清单（窗口/timing 算术/版本谓词/草稿序列化）留 P4 单元 TDD，本 P3 不展开套件。

## Next（non-Gate）

- `/sdd:quality-checklist`（phase=p3，基于真实产物 design.md/tasks.md/atdd-design.md）。
- 随后 P4 `/sdd:atdd-apply`（红绿 TDD 含 UT）→ local-verify → G2（VL 签核）；P5 living-merge → G3（SA 签核）。
- 提交 G1 Pass + P3 产物用单提交；push 须经用户确认 + 安全扫描门；不自动批准任何 Gate。