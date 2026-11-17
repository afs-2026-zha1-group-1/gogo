# Proposal

## Product review amendment (2026-11-15)

The user accepts saving location and time together. Delete now requires a
confirmation dialog identifying the item; Cancel/dismiss sends no request and
preserves the list, while Confirm sends one existing must-do PUT. This supersedes
any earlier immediate-delete/no-dialog ruling; add/edit timings and API payloads
are unchanged. Emily IO approval of the revised 42-scenario package is recorded
2026-11-15 per the user's separate explicit signing instruction. The prior SA Pass
covers the previous contract. SA evelyn.huang re-reviewed the revised contract and
passed it on 2026-11-16, relayed by the change author; G1 closed 2026-11-16.

## G1 re-review of the two P3 amendments (2026-11-16)

Two amendments were made while starting P3: the MODIFIED page requirement was re-based on
REQ-019's revised revision 1 (ten Chinese labels, the `screen-08` layout paragraph, R1–R3), and the
R4 storage mirror was added. Both were re-reviewed and passed on 2026-11-16 by IO Emily and SA
evelyn.huang, relayed by the change author under the user's explicit instruction, with no finding.
Condition 8 of `g1-decision.md` is closed and the signed package is now 3 requirements / 44
scenarios, so P4 is unblocked. Recorded as limitations, not as passes: the signature is relayed
rather than documented, and it was given on the working-tree text (the user instructed that this
round not be committed or pushed while REQ-019's G2 was open); part of it has since been committed
and pushed — the header amendments, the R4 mirror and the shortened ADDED bodies — while the re-based
page requirement and R1–R4 are still uncommitted, so the commit carrying them must not alter the
signed wording. `openspec validate req-020-manage-must-do --strict` has since been run on the real
CLI and exits 0 (condition 6 closed 2026-11-17); the amendments that closure required are this
document's "Strict remediation and delta-spec relocation" section and were carried as G1 condition 9,
which IO Emily and SA evelyn.huang signed Pass on 2026-11-17.

## Condition 6 formatting fix: the two ADDED bodies shortened (2026-11-16)

The last strict run reported two overlong ADDED requirement bodies. Both were shortened to the
500-character limit — `Save member must-do items` from 3,267 to 493 characters, `Read member must-do
items` from 740 to 432 — measured locally by joining the lines between `### Requirement:` and the
first `#### Scenario:`. This is a formatting change, not a third amendment: every statement the
compression dropped is asserted by a scenario of the same requirement (200 and the four response
keys, trim and blank→`null`, the empty-list row, single-row upsert, idempotence, zero write on
rejection with the six `MUST_DO_*` / `INVALID_REQUEST` codes, body shape, list-local ids, the
two-key ascending read response), so no contract, no scenario and no count changed — still 44 — and
condition 8 is not reopened. Two things stayed open at the time and are now settled by the real CLI
run recorded in the next section: the archive/preamble/Clarifications warnings and the strict rerun.
The MODIFIED page body is still 3,247 characters; strict did not report it, and it is signed text, so
shortening it would need a ruling first. That ruling was given on 2026-11-17 and the body was
compressed — see amendment (5) below.

## Strict remediation and delta-spec relocation (2026-11-17)

`openspec validate req-020-manage-must-do --strict` was run with the CLI available
(`%APPDATA%\npm\openspec.cmd`) after REQ-019 had merged and been archived onto this branch. The two
overlong ADDED bodies from the 2026-11-16 compression are **no longer reported** — they measure 493
and 432 characters. Three findings remained, and all three are remedied in this section:

| Finding | Kind | Remedy |
|---|---|---|
| MODIFIED `Preferences page` omits five scenarios the current Living Spec still has: `Empty state`, `Switching identity reloads for the new identity`, `Saving disables duplicate submissions`, `A successful save follows the response`, `A rejected save shows an inline error and rolls back` | ERROR | The five interest-path scenarios take back their Living Spec titles. Only the titles change — the section-scoping wording stays in the bodies (`the interest save request returns 200`, `the interest controls and that action are disabled`), so no assertion changes and the delta still holds 44 scenarios. The five titles are part of the text the two roles signed under condition 8, so this rename is recorded here for re-confirmation rather than claimed as already covered |
| Text above the first `## ` section is not carried into the Living Spec by archive | WARNING | The delta preamble moved out of `specs/preferences/spec.md` into the subsection below |
| Section `## Clarifications` is not carried into the Living Spec by archive | WARNING | The C1–C6 / R1–R4 table moved out verbatim into the subsection below |

The house standard was checked before restructuring: all 18 archived delta files under
`openspec/changes/archive/` carry no preamble and no `Clarifications` section, and
`req-019-save-interests` was restructured the same way to reach exit 0.

After these three fixes the rerun passes: `openspec validate req-020-manage-must-do --strict` →
`Change 'req-020-manage-must-do' is valid` (**exit 0**), `openspec validate preferences --type spec
--strict` → `Specification 'preferences' is valid` (**exit 0**), and repository-wide
`openspec validate --all --strict` improves from 7 passed / 8 failed to 8 passed / 7 failed. The
delta is now 385 lines, 3 requirements / 44 scenarios, with only the `ADDED` and `MODIFIED` sections.

A fourth fix followed the same day. The user ruled that the MODIFIED page body should be compressed
to the house style before it can inflate the Living Spec again, so amendment (5) shortened it from
3,247 to **478 characters** in the shape REQ-019 used for the same requirement. Every clause the
compression dropped is asserted by a scenario of that requirement — the reload, rollback, immediate
persistence, confirmation, retry and no-local-storage behaviors — so the 44-scenario contract is
unchanged and the re-run still reports **exit 0**. The delta is now 345 lines and all three
requirement bodies sit under the 500-character limit (493 / 432 / 478).

The baseline error this exposed is now corrected: REQ-019 is archived, so the MODIFIED page
requirement must be re-based on the **Living Spec** `openspec/specs/preferences/spec.md`
(5 requirements / 31 scenarios, `Preferences page` body 488 characters), not on REQ-019's delta
revision 1. Two consequences are deliberately left for a ruling rather than folded in silently: the
Living Spec's page body is compressed and no longer carries the screen-08 layout strings, R1 or R3,
and this delta's MODIFIED body was 3,247 characters — archiving it as written would have re-inflated
the Living Spec page requirement and made `openspec validate preferences --strict` report an overlong
body. That risk is closed by amendment (5) above, which compressed the body to 478 characters; because
it edited signed wording it went to condition 9 rather than being reported as covered, and both roles
signed that re-confirmation Pass on 2026-11-17.

### Delta Spec baseline and revision record (moved out of `specs/preferences/spec.md`)

- Change: `req-020-manage-must-do`, capability `preferences`.
- Baseline (corrected 2026-11-17): the **archived** Living Spec `openspec/specs/preferences/spec.md`
  established by `req-019-save-interests` on 2026-11-16 (5 requirements / 31 scenarios), not
  REQ-019's unarchived delta. The caller identity, trip existence and membership precondition is
  defined once in its `Preference caller identity and membership` and applies unchanged to the
  endpoints below; it is not restated here as a new ADDED requirement.
- Revision (2026-11-16, P3): three amendments. (1) The MODIFIED `Preferences page` requirement was
  re-based on that revised revision 1, because it had been written against the pre-revision text
  (seven English labels, no layout paragraph). (2) A storage-only `name` mirror was added (R4),
  because the merged main-plan reader reads `name`; it costs two scenarios, so this delta is now
  3 requirements / 44 scenarios instead of the earlier 42. (3) The two ADDED requirement bodies were
  shortened to the 500-character strict limit (G1 condition 6); every statement they dropped is
  asserted by a scenario of the same requirement, so no contract, no scenario and no count changed.
  Amendments (1) and (2) were re-reviewed and signed Pass on 2026-11-16 by IO Emily and SA
  evelyn.huang (`g1-decision.md`, "Revision re-review (2026-11-16) — Pass", condition 8 closed).
  Amendment (3) is a formatting change made afterwards under condition 6 and does not reopen that
  signature.
- Revision (2026-11-17, condition 6): amendment (4), from the first real strict run. Amendment (1)
  had re-based the page requirement on REQ-019's **delta** while REQ-019 had meanwhile been
  archived, so five scenario titles that the Living Spec still asserts had been renamed and were
  reported as omitted; they are restored, with no change to any assertion. The preamble and the
  Clarifications table moved here, because archive does not carry either into the Living Spec.
  Together with (1)–(3) this is still 3 requirements / 44 scenarios.
- Revision (2026-11-17, condition 9): amendment (5), the MODIFIED `Preferences page` body compressed
  from 3,247 to 478 characters at the user's instruction, in REQ-019's compressed style. No scenario
  title, body or assertion changed; the requirement still holds its 19 scenarios.
- Storage: `member_preference` with `kind = 'must_do'`, one row per member, payload
  `{"items": [{id, activity, name, location, time}]}`, `null` where a field is absent. `name` mirrors
  `activity` and is never returned. No migration.

### Clarifications (moved out of `specs/preferences/spec.md`)

C1–C6 were frozen at G1 and are unchanged by the 2026-11-16 re-basing. R1–R3 were added by that
re-basing of the page requirement; R4 was added the same day. All four were re-reviewed and signed
Pass on 2026-11-16 (IO Emily, SA evelyn.huang) — `g1-decision.md`, condition 8 closed.

| id | Decision | Rationale |
|---|---|---|
| C1 | Item ids are unique within the caller's list only and may be reassigned after the list is emptied (`max + 1`) | Ids are never referenced outside the list, and a durable counter would require a payload field or a second table; REQ-020's proposal wording "not reused after deletion" is narrowed accordingly |
| C2 | The stored and returned order is the request order | Makes assertions repeatable and matches the interest set's ordering rule; no server-side sorting rule is added |
| C3 | No item-count limit, field-length limit or name-based deduplication | The ACs define none, and a fabricated limit would be a new product rule |
| C4 | An absent `location`/`time` is stored as `null`, not omitted | Keeps the stored and returned item shape fixed, so assertions do not depend on key presence |
| C5 | Both `location` and `time` may be saved together | Overrides the reference screen's "choose one of location or time" wording, as decided in REQ-020's P1 |
| C6 | Delete requires a confirmation dialog; cancelling or dismissing sends no request | User ruling 2026-11-15 supersedes the earlier immediate-delete decision, and supersedes the reference screen, whose `rmMustdo` removes a row at once — the same kind of override C5 makes. Item-count/field-length limits, name-based deduplication and per-item date remain out of scope |
| R1 | The app bar subtitle reads `<display name> · US-019~020` | The reference screen carries the whole range `US-019~027`, while revision 1 shipped `· US-019` because that was all the page rendered; the range now covers both rendered sections. Changes a shipped string, so it was submitted for the 2026-11-16 re-review and is signed |
| R2 | The must-do strings come from `screen-08-preferences.png` | Fixes what the E2E rows assert: heading `必做项（US-020 · 可增删改）`, action `添加必做项`, fields `活动名称` / `地点` / `固定时间`, buttons `取消` / `保存`, pin and clock markers. The screen's `二选一` marker on `地点` is dropped, because C5 allows both fields |
| R3 | The save-state badge describes the interests section only | Revision 1 shipped one page-level badge for its single save; must-do persists per action and reports inside its own section, so the badge must not claim to cover it |
| R4 | The stored payload mirrors `activity` as `name`; the response never carries it | User ruling 2026-11-16. `MainPlanService.mustDoItems`, already merged to `main`, reads `item.path("name")`, and `V5__create_main_plan.sql` seeds `must_do` rows in that shape; without the mirror, every item saved through this change would reach main-plan generation as an empty string while `MainPlanApiTest` stayed green. The alternatives were changing that reader (`activity` first, `name` fallback) or a `V7` rewrite of the seeds; the mirror was chosen because it keeps this change inside its own package and leaves the merged reader and the seeds untouched |

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
  - `id`：服务端签发（当前最大 id + 1），**仅在该成员列表内唯一，列表清空后可复用**。
  - `activity`：必填，去首尾空白后非空。
  - `location` / `time`：可空，但**至少填一个**；两者可同时保存（废除参考图「二选一」措辞）。
  - `time`：严格 `HH:mm`（`^([01][0-9]|2[0-3]):[0-5][0-9]$`），日期隐含为该 trip 的行程日期。
- 校验语义：写前整体校验，任一非法即 `400` 且**零写入**；条目 `id` 不属于当前成员按
  「不存在」处理。空数组 `{"items":[]}` 合法，表示清空但保留行。
- 错误码：新增 `MUST_DO_ACTIVITY_REQUIRED`、`MUST_DO_PLACE_OR_TIME_REQUIRED`、
  `MUST_DO_TIME_INVALID`、`MUST_DO_ITEM_UNKNOWN`、`MUST_DO_ITEM_DUPLICATE_ID`；
  复用 `USER_REQUIRED` / `NOT_A_MEMBER` / `TRIP_NOT_FOUND` / `INVALID_REQUEST`。
- **存储镜像 `name`（2026-11-16 用户裁定，delta R4）**：写入 `payload` 的每个条目除 `activity`
  外再存一份同值的 `name`，新增时写入、编辑时同步、随条目删除。原因是已合入 `main` 的
  `MainPlanService.mustDoItems()` 读的是 `item.path("name")`，且 `V5__create_main_plan.sql`
  已按该形状为 fixture 行程种子了 `must_do` 行；不双写则本变更存进去的条目在主线生成时
  会变成空字符串，而 `MainPlanApiTest` 只断言条数、不会变红。**HTTP 响应仍只出
  `id`/`activity`/`location`/`time` 四键，`name` 永不上线**；不改动 `com.gogo.mainplan`，
  不改种子，不新增迁移。
- **MODIFIED** 能力 `preferences` 的页面契约：`#/trips/{tripId}/preferences` 在同一页新增
  「必做项」段（列表 + 内联添加/编辑表单 + 删除），且**每个动作即时 PUT 落库**；
  兴趣段仍保持「显式保存一次性提交」。两段写入时机不同必须写进契约。
- 后端在 REQ-019 建立的 `com.gogo.preference` 包内新增 must-do 端点与校验，复用
  `TripRepository.findUserId` / `isMember` 与同一份错误 advice。
- 前端在该页新增一个区块，复用 `api.js`、`app.css`、`Icons.jsx`；**不新增路由、不新增依赖**。
- 测试与证据：后端接口测试覆盖 25 个场景（19 保存 + 6 读取，含条数、`id` 稳定、跨成员隔离、
  `name` 镜像的写前后断言）；`docs/feedback/verification-*.md` 与 `README.md` 增行。

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
  `payload` 形状 `{"items":[{id,activity,name,location,time}]}`（`name` 是 `activity` 的存储镜像，
  不进响应）；库文件仍是 `backend/data/gogo.db`。`V5__create_main_plan.sql` 为 fixture 行程种子的
  `must_do` 行（只有 `name`、无 `id`）按 REQ-019 DD1 的既有裁定处理：**种子不动**，本变更的接口
  测试每例清表，开发库在 P4 手工重置；不为遗留形状增加容错分支。
- **APIs**：新增 2 个端点（`GET`/`PUT .../preferences/must-dos`），`X-User-Id` 身份，
  裸 DTO 成功 + `{"code","message"}` 失败；新增 5 个 `MUST_DO_*` 错误码。
- **Dependencies**：无新增（不引组件库、路由库、JSON 库）。
- **Runtime**：端口不变（8080 / 5173）；每次条目动作是一次整行 JSON 覆盖写。
- **CI**：两个 job 结构不变；测试数与前端构建产物变化，需要一次本变更的 pipeline 证据，
  不得复用 REQ-019 的结论。
- **Docs / harness**：`README.md`、`docs/feedback/verification-*.md`、
  `requirement-workspace/{registry,handoff}.md`。知识库无需新增长期事实。
- **Collaboration（合入顺序硬前置）**：本变更零迁移，但依赖 REQ-019 的
  `V6__create_member_preference.sql`（原 `V4`；2026-11-16 已随 REQ-019 的 P4 落地于
  `feat/travel_preference`）与偏好页先落 main。**合入顺序 REQ-019 → REQ-020，不得颠倒**；
  若 REQ-019 未合入 `main`，本变更仍无处可落。

## Effort and ordering

小：后端 1 个 controller 分支 + 1 个 service 方法 + 1 组 DTO + 1 组接口测试（零迁移）；
前端 1 个页面区块 + 少量样式。依赖顺序：

```
REQ-019 的 `V6`（原 `V4`）与偏好页落库 → must-do 端点与校验（写前整体校验、id 签发）→ GET 回读 → 页面区块 → 验证矩阵/README
```

`GET` 回读是 AC1「reload 后仍可见」与 AC2「条数与 id 不变」的唯一证据链，必须早于页面完成。

`/sdd:story-split` 跳过：单条故事、单能力（修改）、20 个场景，不需要故事 backlog。

## A0 deep-dive gate

REQ-020 是对已有能力的修改，深潜在范围内。`analysis/req-020-dor.md` 已复评
⑨ 数据契约（`kind='must_do'` 的行粒度、`{"items":[...]}` 形状、`id` 签发与列表内唯一（清空后可复用）、状态迁移）、
⑩ 边界（24 条分支归属）、⑪ 跨 REQ（与 REQ-019 的同表/同包/同页、与 REQ-003 的行程日期、
与 REQ-004 的主线确认、与 US-031 的消费关系全部收敛）、⑫ 展示契约（9 个界面态），
四项均 Pass → **A0 Pass**，允许拆分。

## Known deviations carried into later stages

- **`time` 不带日期**：AC 的「10:00 on 2026-12-05」由行程日期隐含；多日行程无法定位具体哪天，
  扩展 `date` 留给 US-031（OQ-12）。不得在实现里私自加日期字段。
- **条目 `id` 存在 JSON 数组内**：数据库无法对数组元素加唯一约束，「id 列表内唯一、清空后可复用」只在 Service 层；
  验证必须断言「更新后条数不变、id 集合不变」，而不是只看 HTTP 200。
- **参考图与 Design scope 冲突**：节点 8 表单写「地点 二选一 / 固定时间」，本变更按 Design scope
  允许两者同时保存（D6）。UI 文案必须同步修改，否则会误导实现。
- **同页两段写入时机不同**：兴趣段是显式「保存」，必做项段是动作即保存（D7/D12）。
  这是有意的交互差异，需在页面 requirement 里写明，不能在实现时「统一」掉。
- **零迁移但硬依赖 `V6`（原 `V4`）**：本变更不提交任何 Flyway 文件；表与偏好页已随 REQ-019 的 P4
  落地于分支，但需等 REQ-019 合入 `main` 后本变更才可合入（R1）。
- **错误 advice 归属**：`com.gogo.trip.TripErrorAdvice` 只覆盖 `com.gogo.trip`；本变更复用
  REQ-019 在 `com.gogo.preference` 建立的 advice（已落地：`PreferenceErrorAdvice`，
  `basePackages = "com.gogo.preference"`，含 `PreferenceApiException` / `INVALID_REQUEST` 两个处理分支），
  `MUST_DO_*` 只需新增异常类型而无需改 advice 作用域。
- **与已合入的 main-plan 读取端存在键名冲突**：`MainPlanService.mustDoItems()` 读 `name`，本变更契约用
  `activity`。2026-11-16 用户裁定采用**存储层双写**（R4）而非改读取端或加 `V7` 重写种子；代价是
  `payload` 内出现两个真值源，增/改/删都必须同步两键，且 delta 因此从 42 条场景变为 44 条。
  该裁定与页面重基线一起经 G1 condition 8 由 IO Emily / SA evelyn.huang 于 2026-11-16 复审签署（转达），
  condition 8 已关闭，P4 解锁；签署对象为**未提交的工作区文本**，提交时不得改动已签署措辞。
- **夹具未回填**：用户与 trip 来自 `acceptance-test-fixtures.md`；US-020 的行为样例写在本需求
  场景表。OQ-10 已于 P3 关闭（`atdd-design.md` P3-1）：**不**向该共享文件新增 REQ-020 段，
  因为它在 PR #44 的改动面内、REQ-019 的 G2 未关闭，只增加冲突面；所需取值全部固定在 delta 场景里。
- **计划文档漂移**：`tech-stack-plan.md` §5/§6 的 `tag` 表、`{data,error}` 封套、`X-Member-Id`
  与已合并代码不一致；本变更跟随代码，文档修正并入 REQ-019 OQ-16 的团队任务。
- **编号体系**：需求号沿故事号取 `REQ-020`，变更包 `req-020-manage-must-do`；
  与既有 `REQ-00x` 顺位号并行，已在 registry 注明。
- **文档语言**：本变更 P1 产物用中文，标识符与命令保留原文。
