# Proposal

## Why

`preferences` 能力由 REQ-019 引入，但只覆盖「兴趣」一种偏好。US-020 要求成员能
添加、修改、删除**必做项**（活动 + 地点/固定时间），并把这份清单作为后续方案生成的
硬输入（参考图节点 9 的「必做项汇总」）。

三条验收标准把可验证边界钉死了：保存必须真落库（reload 后仍在）、修改必须**原地生效**
（10:00 → 10:30 且不产生第二条）、删除必须只影响自己（其他成员条目不变）。这三点合起来
要求「稳定条目标识 + 逐成员隔离 + 整表单次覆盖写」，不能靠前端数组或整段重填糊过去。

REQ-019 已把 `member_preference(trip_id, user_id, kind, payload)` 建模为按 `kind` 区分的
单行 JSON，本变更只需新增 `kind = 'must_do'` 的读写，**不新增表、不新增迁移**，因此
不需要再排一次 schema 变更，也不会与 `V3` / `V4` 争夺迁移编号。

P1 已把 D1–D14 全部裁定（见 `requirement-workspace/intents/2026-11-15-req-020.md`），
blocking 开放问题为 0、DoR BLOCKER 为 0、A0 深潜四项 Pass，因此可以形成变更包。

## What Changes

- **ADDED** 能力 `preferences` 的必做项读写契约（同一能力内的新增 requirement）：
  - `GET /api/trips/{tripId}/preferences/must-dos`：返回全员明细
    `{"members":[{"userId":2,"mustDos":[{"id":1,"activity":"National Gallery Singapore visit","location":"National Gallery Singapore","time":"10:00"}]}]}`，
    按 `userId` 升序；无记录者 `mustDos` 为 `[]`。
  - `PUT /api/trips/{tripId}/preferences/must-dos`：**整表覆盖**。请求体
    `{"items":[{"activity":"…","location":"…","time":"10:00"}]}`；无 `id` 的条目新增、
    带 `id` 的条目原地更新、请求中缺失的既有条目即删除。响应
    `{"items":[{...带 id...}]}`。
- 条目字段与规则：
  - `id`：服务端签发（当前最大 id + 1），**删除后不复用**；仅在该成员列表内唯一。
  - `activity`：必填，去首尾空白后非空。
  - `location` / `time`：可空，但**至少填一个**；两者可同时保存（废除参考图「二选一」措辞）。
  - `time`：严格 `HH:mm`（`^([01][0-9]|2[0-3]):[0-5][0-9]$`），日期隐含为该 trip 的行程日期。
- 校验语义：写前整体校验，任一非法即 `400` 且**零写入**；条目 `id` 不属于当前成员按
  「不存在」处理。空数组 `{"items":[]}` 合法，表示清空但保留行。
- 错误码：新增 `MUST_DO_ACTIVITY_REQUIRED`、`MUST_DO_PLACE_OR_TIME_REQUIRED`、
  `MUST_DO_TIME_INVALID`、`MUST_DO_ITEM_UNKNOWN`、`MUST_DO_ITEM_DUPLICATE_ID`；
  复用 `USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST`。
- **MODIFIED** 能力 `preferences` 的页面契约：`#/trips/{tripId}/preferences` 在同一页新增
  「必做项」段（列表 + 内联添加/编辑表单 + 删除），且**每个动作即时 PUT 落库**；
  兴趣段仍保持「显式保存一次性提交」。两段写入时机不同必须写进契约。
- 后端在 REQ-019 建立的 `com.gogo.preference` 包内新增 must-do 端点与校验，复用
  `TripRepository.findUserId` / `isMember` 与同一份错误 advice。
- 前端在该页新增一个区块，复用 `api.js`、`app.css`、`Icons.jsx`；**不新增路由、不新增依赖**。
- 测试与证据：后端接口测试覆盖 20 个场景（含条数、`id` 稳定、跨成员隔离的写前后断言）；
  `docs/feedback/verification-*.md` 与 `README.md` 增行。

Unchanged：`greeting`、`trips`、`invitations` 的端点与响应形状；`V1`/`V2`/`V3` 迁移；
`member_preference` 表结构与唯一键；兴趣端点、payload 与保存按钮；CI 两个 job 的结构；
约束与预算两类偏好、就绪门控、主线生成。

No breaking change：唯一消费者是本仓库前端，在同一变更内同步；`kind='must_do'` 是同一张表的
新取值，既有 `kind='interest'` 读取路径不受影响。

## Capabilities

### New Capabilities

None。本变更不新建能力，`preferences` 由 REQ-019 的 delta 建立。

### Modified Capabilities

- `preferences`（依赖 `req-019-save-interests` 先合入）：
  1 个 ADDED requirement（必做项读写：身份/成员、校验、整表覆盖、全员读取）
  + 1 个 MODIFIED requirement（页面：新增必做项段与按段区分的写入时机）。
  Delta Spec 在 `/sdd:delta-craft` 阶段产出，本提案只声明边界。

## Impact

- **Requirement**：REQ-020（`requirement-workspace/requirements/REQ-020.md`），意图
  `intents/2026-11-15-req-020.md`，DoR `analysis/req-020-dor.md`，深潜
  `deep-dive.md` §REQ-020，影响评估 `impact-brief.md` §REQ-020，夹具
  `acceptance-test-fixtures.md`。
- **Code**：`backend/src/main/java/com/gogo/preference/**` 内新增 must-do 端点/DTO/校验；
  只读复用 `com.gogo.trip.TripRepository`（`findUserId` / `isMember`），不修改其行为；
  前端在 REQ-019 新建的偏好页文件内新增一个区块，`App.jsx` 与路由**不改**。
- **Database**：**无新增迁移**。只写 `member_preference` 中 `kind = 'must_do'` 的行，
  `payload` 形状 `{"items":[...]}`；库文件仍是 `backend/data/gogo.db`。
- **APIs**：新增 2 个端点（`GET`/`PUT .../preferences/must-dos`），`X-User-Id` 身份，
  裸 DTO 成功 + `{"code","message"}` 失败；新增 5 个 `MUST_DO_*` 错误码。
- **Dependencies**：无新增（不引组件库、路由库、JSON 库）。
- **Runtime**：端口不变（8080 / 5173）；每次条目动作是一次整行 JSON 覆盖写。
- **CI**：两个 job 结构不变；测试数与前端构建产物变化，需要一次本变更的 pipeline 证据，
  不得复用 REQ-019 的结论。
- **Docs / harness**：`README.md`、`docs/feedback/verification-*.md`、
  `requirement-workspace/{registry,handoff}.md`。知识库无需新增长期事实。
- **Collaboration（合入顺序硬前置）**：本变更零迁移，但依赖 REQ-019 的
  `V4__create_member_preference.sql` 与偏好页先落 main。**合入顺序 REQ-019 → REQ-020，不得颠倒**；
  若 REQ-019 的 V4 未合入，本变更的接口与页面都无处可落。

## Effort and ordering

小：后端 1 个 controller 分支 + 1 个 service 方法 + 1 组 DTO + 1 组接口测试（零迁移）；
前端 1 个页面区块 + 少量样式。依赖顺序：

```
REQ-019 的 V4 与偏好页落库 → must-do 端点与校验（写前整体校验、id 签发）→ GET 回读 → 页面区块 → 验证矩阵/README
```

`GET` 回读是 AC1「reload 后仍可见」与 AC2「条数与 id 不变」的唯一证据链，必须早于页面完成。

`/sdd:story-split` 跳过：单条故事、单能力（修改）、20 个场景，不需要故事 backlog。

## A0 deep-dive gate

REQ-020 是对已有能力的修改，深潜在范围内。`analysis/req-020-dor.md` 已复评
⑨ 数据契约（`kind='must_do'` 的行粒度、`{"items":[...]}` 形状、`id` 签发与不复用、状态迁移）、
⑩ 边界（24 条分支归属）、⑪ 跨 REQ（与 REQ-019 的同表/同包/同页、与 REQ-003 的行程日期、
与 REQ-004 的主线确认、与 US-031 的消费关系全部收敛）、⑫ 展示契约（9 个界面态），
四项均 Pass → **A0 Pass**，允许拆分。

## Known deviations carried into later stages

- **`time` 不带日期**：AC 的「10:00 on 2026-12-05」由行程日期隐含；多日行程无法定位具体哪天，
  扩展 `date` 留给 US-031（OQ-12）。不得在实现里私自加日期字段。
- **条目 `id` 存在 JSON 数组内**：数据库无法对数组元素加唯一约束，「id 不复用」只在 Service 层；
  验证必须断言「更新后条数不变、id 集合不变」，而不是只看 HTTP 200。
- **参考图与 Design scope 冲突**：节点 8 表单写「地点 二选一 / 固定时间」，本变更按 Design scope
  允许两者同时保存（D6）。UI 文案必须同步修改，否则会误导实现。
- **同页两段写入时机不同**：兴趣段是显式「保存」，必做项段是动作即保存（D7/D12）。
  这是有意的交互差异，需在页面 requirement 里写明，不能在实现时「统一」掉。
- **零迁移但硬依赖 `V4`**：本变更不提交任何 Flyway 文件；若 REQ-019 的 `V4` 未合入，
  本变更不可合入（R1）。
- **错误 advice 归属**：`com.gogo.trip.TripErrorAdvice` 只覆盖 `com.gogo.trip`；本变更复用
  REQ-019 在 `com.gogo.preference` 建立的 advice。若该 advice 不存在，`INVALID_REQUEST` 与
  `MUST_DO_*` 都不会产生，需在本变更内补齐（DoR WARNING）。
- **夹具未回填**：用户与 trip 来自 `acceptance-test-fixtures.md`；US-020 的行为样例写在本需求
  场景表，是否回填该文件见 OQ-10。
- **计划文档漂移**：`tech-stack-plan.md` §5/§6 的 `tag` 表、`{data,error}` 封套、`X-Member-Id`
  与已合并代码不一致；本变更跟随代码，文档修正并入 REQ-019 OQ-16 的团队任务。
- **编号体系**：需求号沿故事号取 `REQ-020`，变更包 `req-020-manage-must-do`；
  与既有 `REQ-00x` 顺位号并行，已在 registry 注明。
- **文档语言**：本变更 P1 产物用中文，标识符与命令保留原文。
