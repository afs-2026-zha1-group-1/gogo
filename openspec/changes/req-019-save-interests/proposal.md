# Proposal

## Why

成员需要用受控的兴趣清单表达偏好，方案生成才有稳定输入可以打分。当前仓库只有
`greeting` 与 `trips` 两条能力：REQ-003 已把 `app_user` / `trip` / `trip_member`
建好并 seed 了 fixture 数据，但没有任何偏好能力。

US-019 的两条验收标准把可验证边界钉死了：客户端会重复提交（`Art, Nature, Art`），
所以去重必须由服务端收口；非法值（`teleportation`）必须整体拒绝且不破坏已保存数据；
已保存的兴趣在页面重新加载后仍可见。三条合起来要求"真落库 + 写事务内的全量校验 +
可回读"，不能靠前端状态或内存集合糊过去。

P1 已把 D1–D10 全部裁定（见 `requirement-workspace/intents/2026-11-15-req-019.md`），
blocking 开放问题为 0、DoR BLOCKER 为 0、A0 深潜四项 Pass，因此可以形成变更包。

本变更不修改 `greeting` 与 `trips` 的行为契约，只新增 `member_preference` 表与
`/preferences` 端点。

## What Changes

- **ADDED** 能力 `preferences`：成员兴趣的读写契约。
  - `PUT /api/trips/{tripId}/preferences`：`X-User-Id` 定位当前成员，幂等覆盖
    `interests`；请求体 `{"interests":["Art","Nature","Art"]}`，响应
    `{"interests":["Art","Nature"]}`。
  - `GET /api/trips/{tripId}/preferences`：返回全员明细
    `{"members":[{"userId":2,"interests":["Art","Nature"]}]}`，前端取自己那条。
- 新增 7 项兴趣常量（`code` / `label` 一一对应，顺序即 AC 顺序）：
  `art/Art`、`nature/Nature`、`culture/Culture`、`history/History`、`food/Food`、
  `shopping/Shopping`、`adventure/Adventure`。接口收发用 `label`，落库写 `code`，
  **不做大小写与空白归一化**。
- 校验语义：任一值不匹配 label 即 `400 INTEREST_NOT_ALLOWED`，在写事务之前判定，
  合法值也不落地；空数组表示清空，写 `{"codes":[]}` 但保留行。
- 新增迁移 `V4__create_member_preference.sql`：只有一张表
  `member_preference(id, trip_id, user_id, kind, payload, updated_at)`，
  UNIQUE(`trip_id`,`user_id`,`kind`)，外键指向已有的 `trip` / `app_user`。
  `V2` 的三张表与 fixture 数据**不改**。
- 后端新增 `preference` 包（Controller/Service/Repository/dto）与错误 advice；
  身份与成员判定复用 `TripRepository.findUserId` / `isMember`。
- 前端在现有 app 内新增偏好页：`parseRoute` 增一条 `#/trips/{id}/preferences`，
  新页面用 `api.js` 与 `app.css`，7 个 chip + 显式「保存」批量提交 + 四态；
  行程详情页增一个进入该页的链接；**不新增任何依赖**。
- 测试与证据：后端接口测试覆盖去重、非法值、混合值、空数组、缺身份、非成员、
  未知 trip、幂等；`docs/feedback/verification-*.md` 与 `README.md` 增行。

Unchanged：`greeting` 与 `trips` 的端点与响应形状、`V1`/`V2` 迁移、CI 两个 job 的结构、
`tag` 表与 `/api/tags`、其它三类偏好（必做项/约束/预算）、就绪门控与方案生成。

No breaking change：唯一消费者是本仓库前端，在同一变更内同步；`preferences` 是新能力。

## Capabilities

### New Capabilities

- `preferences`：一个新增需求（US-019 成员兴趣保存），承载 AC1/AC2 与 10 个派生场景。
  Delta Spec 在 `/sdd:delta-craft` 阶段产出，本提案只声明边界。

### Modified Capabilities

None。`greeting` 与 `trips` 的契约都不变；`trips` 只被复用表与成员判定，不被改写。

## Impact

- **Requirement**：REQ-019（`requirement-workspace/requirements/REQ-019.md`），意图
  `intents/2026-11-15-req-019.md`，DoR `analysis/req-019-dor.md`，深潜
  `deep-dive.md` §REQ-019，夹具 `acceptance-test-fixtures.md`。
- **Code**：新增 `backend/src/main/java/com/gogo/preference/**`；只读复用
  `com.gogo.trip.TripRepository` 的 `findUserId` / `isMember`（不修改其行为）；
  前端新增 `frontend/src/pages/Preferences.jsx`，修改 `App.jsx` 的路由与页面挂载，
  并在 `TripDetails.jsx` 增一个入口链接。
- **Database**：新增 `V4__create_member_preference.sql`；不改 `V1` / `V2`；
  库文件仍是 `backend/data/gogo.db`。
- **APIs**：新增 2 个端点，`X-User-Id` 身份，裸 DTO 成功 + `{"code","message"}` 失败；
  新增错误码 `INTEREST_NOT_ALLOWED`，复用 `USER_REQUIRED` / `NOT_A_MEMBER` /
  `TRIP_NOT_FOUND` / `INVALID_REQUEST`。
- **Dependencies**：无新增（前端不引组件库/路由库，后端不引新库）。
- **Runtime**：端口不变（8080 / 5173）；SQLite 新增一段幂等覆盖写。
- **CI**：两个 job 结构不变；测试数与前端构建产物变化，需要一次本变更的 pipeline 证据，
  不得复用 REQ-003 的结论。
- **Docs / harness**：`README.md`、`docs/feedback/verification-*.md`、
  `requirement-workspace/{registry,handoff}.md`。知识库无需新增长期事实。
- **Collaboration**：`V3` 归 REQ-004（邀请）。本变更的 `V4` 必须在其后落库，
  否则 Flyway 会因 out-of-order 失败；合入前确认，必要时按下一可用版本调整。

## Effort and ordering

小到中：后端约 5 个类 + 1 个迁移 + 1 组接口测试；前端 1 个页面 + 1 条路由 + 少量样式。
依赖顺序：

```
V4 迁移（确认 V3 已在 main）→ 身份/成员判定复用 → interests 校验与写入 → GET 回读 → 前端页面 → 验证矩阵/README
```

`GET` 回读是 AC1「reload 后仍可见」的唯一证据链，必须早于页面完成。

`/sdd:story-split` 跳过：单条故事、单能力、12 个场景，不需要故事 backlog。

## A0 deep-dive gate

REQ-019 是新增能力，深潜在范围内。`analysis/req-019-dor.md` 已复评
⑨ 数据契约（`member_preference` 粒度、payload 形状、状态迁移）、
⑩ 边界（16 条分支归属）、⑪ 跨 REQ（与 REQ-003 共用表、与 REQ-004 的迁移顺序、
计划文档漂移、UI 清单差异全部收敛）、⑫ 展示契约（6 个界面态），四项均 Pass →
**A0 Pass**，允许拆分。

## Known deviations carried into later stages

- **传输值与存储值分离**：AC 以 `Art` 传值；若接口只认小写 code，AC1 直接失败。
  线上用 label、库里用 code，严格性按 label 判定（`art`、` Art ` 均 400）。
- **JSON payload 无内部唯一约束**：去重不变量在 Service 层，验证必须断言
  "payload 解析后集合元素唯一"，而不是仅看 HTTP 200。
- **索引类型偏离计划**：`member_preference` 由技术栈计划 §5 的普通索引改为 UNIQUE；
  合并口径登记在 deep-dive ⑪。
- **身份与响应风格跟随代码而非计划**：`X-User-Id` + 裸 DTO + `{code,message}`；
  `tech-stack-plan.md` §6 的 `{data,error}` / `X-Member-Id` / `JdbcClient` 是文档漂移，
  作为团队任务单独修正（OQ-16）。
- **错误 advice 作用域**：`TripErrorAdvice` 只覆盖 `com.gogo.trip`，本变更需要自己的
  advice 或放宽作用域，否则 `INVALID_REQUEST` 不会产生（DoR WARNING）。
- **迁移顺序耦合**：`V4` 依赖 `V3` 先落库（REQ-004 邀请）。
- **夹具来源**：用户与 trip 来自 `acceptance-test-fixtures.md`；
  US-019 的行为样例写在本需求场景表，是否回填该文件见 OQ-15。
- **编号体系**：需求号沿故事号取 `REQ-019`，与 REQ-00x 序列并行，需在 registry 注明。
- **文档语言**：本变更 P1/P2 产物用中文，标识符与命令保留原文。
