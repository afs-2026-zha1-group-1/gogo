# US-071 AC / DoV 复核（delta-craft）

- 复核人：sdd-delta-craft（P2 review），2026-11-16；IO Emily 复核补记 2026-11-17
- change：`us-071-my-trips`
- delta：`specs/trips/spec.md`（1 ADDED / 9 场景）、`specs/app-shell/spec.md`（1 MODIFIED / 12 场景）
- 证据：`requirement-workspace/requirements/US-071.md`、`analysis/us-071-dor.md`、`deep-dive.md` §US-071、`impact-brief.md` §US-071
- 校验：`openspec validate us-071-my-trips --strict` = valid

## 验收条件（AC）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| AC-1 | 每条 requirement 至少有 1 条可测 AC | **Pass** | trips 9 场景 + app-shell 12 场景；每场景均有 WHEN/THEN | 共 21 条 |
| AC-2 | AC 可观察 | **Pass** | 200 + 字段集、401 `USER_REQUIRED`、路由 `#/trips` / `#/trips/<id>` / `#/trips/<id>/main-plan`、行内徽标与文案、重试动作 | 无「运行良好」式表述 |
| AC-3 | 负向 / 边界 | **Pass** | 无会话 401、仅 `X-User-Id` 401、非成员不出现且字段不外泄、空列表、去重（each exactly once）、只读、失败可重试 | 高风险项均有负向场景 |
| AC-4 | AC 不是伪装的实现细节 | **Pass** | 场景不含类名/函数名/库名；`organizer` 与 `mainPlanConfirmed` 为 wire 字段契约 | 手写 fetch / TanStack Query 只出现在 proposal 的偏离说明 |

## Definition of Verified（DoV）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| DoV-1 | 范围与 proposal 一致 | **Pass** | proposal「What Changes」= trips 列表读 + 行程 tab 收敛 + 既有主线入口回归（不重复实现）；delta 无后端写、无迁移、无新依赖 | 无静默扩范围 |
| DoV-2 | 歧义已列或已解 | **Pass** | `requirements/US-071.md` OQ-1…OQ-9 全部 `resolved`；blocking 未解 = 0 | 用户 2026-11-16 九项裁决 |
| DoV-3 | 角色关注已记录 | **Pass** | IO：标题撞名、AC7 归属；SA：排序契约、零迁移、前端本地「已结束」判定（见残留） | 见下 |
| DoV-4 | 未声称实现完成 | **Pass** | 本复核只评审 delta 与契约 | 无代码改动 |
| DoV-5 | 需求可追溯到 proposal / 已批准需求 | **Pass** | S1–S14 / R1–R6 全部映射，见追溯表 | 无孤立场景 |

## 追溯表（需求 → delta 场景）

| 需求场景 | delta 覆盖 | 状态 |
|---|---|---|
| S1 看到自建与加入行程 | trips「A member reads their own trips」+ app-shell「The list shows the caller's trips」 | ✅ |
| S2 名称 / 目的地 / 日期 | app-shell「The list shows the caller's trips」 | ✅ |
| S3 点击进详情、无需编号 | app-shell「A list row opens the details route」 | ✅ |
| S4 非成员行程不可见 | trips「A member reads their own trips」（字段不外泄） | ✅ |
| S5 空态 + 创建入口 | trips「An account without trips reads an empty list」+ app-shell「No trip selected shows the honest empty state」 | ✅ |
| S6 新建/加入后只出现一次 | trips「A member reads their own trips」+「The list is read-only」（each exactly once / 单一来源） | ✅ 组合（accept 落成员行） |
| S7 换账号只见新账号行程 | trips「A member reads their own trips」+ 401 场景组；UI 层见残留 | ✅ API 层 |
| S8 loading / 失败重试 | app-shell「A pending or failed read recovers」 | ✅（本轮补） |
| S9 已结束标记 | app-shell「Created and ended trips are marked」+ trips「A finished end date changes no behaviour」 | ✅（IO 复核补：已结束不改变任何写能力） |
| S10 tab 恒落列表 | app-shell「The 行程 tab always opens the trip list」 | ✅ |
| S11 无编号输入 | app-shell「Open-by-id reuses the details route」+「No trip selected shows the honest empty state」 | ✅ |
| S12 主线已确认仍在列表 | trips「A confirmed main plan stays listed」 | ✅ |
| S13 详情页主线入口 | app-shell「The details screen exposes the main plan entry」（已改为回归口径：入口归 US-072，本变更仅验证可达、不新增第二个入口） | ✅（IO 复核改为回归口径） |
| S14 「我创建的」徽标 | app-shell「Created and ended trips are marked」 | ✅ |
| R1 无会话 401 | trips「An unauthenticated request is rejected」 | ✅ |
| R2 仅 `X-User-Id` 401 | trips「The retired identity header does not authenticate」 | ✅ |
| R3 不含非成员行程 | trips「A member reads their own trips」 | ✅ |
| R4 每行程一条 | trips 描述（each exactly once）+「The list is read-only」 | ✅ |
| R5 空列表不伪造 | trips「An account without trips reads an empty list」+ app-shell 空态场景 | ✅ |
| R6 只读 | trips「The list is read-only」 | ✅ |

本轮复核前存在两处覆盖缺口（S8、S13），已在 `specs/app-shell/spec.md` 补场景并重新 `validate --strict`（valid）。IO 复核（2026-11-17）新增两条场景：「Trip-scoped return links keep the trip context」（成员名册返回链接）与「A finished end date changes no behaviour」（已结束仅展示语义）。

## Fixture 对齐

`requirement-workspace/acceptance-test-fixtures.md` 尚无 §US-071。既有 §Users / §Sample trip（Alice 自建 `Singapore Friends Day`、受邀 `Bali Weekend`）可直接复用；**P3 ATDD 设计必须补 §US-071**（列表行、排序、双 401、空账号、已结束行程）。本项为 P3 承接，不阻塞 G1。

## 残留关注（IO / SA）

- **IO**：`frontend/src/pages/Home.tsx` 的仪表盘标题现为「我的行程」，与新列表页标题同名，违反 app-shell「每个 tab 页唯一标题」；P3 定文案（建议列表页「我的行程」、Home 改「仪表盘」）。改名需同步 `us-067-qr-scanner` delta 中 "Home `我的行程` dashboard" 的表述。
- **IO**：AC7 的 UI 层验收依赖 US-069（issue #41，Req Analysis）；本变更只做 API 层隔离验收，UI 补测登记给 US-069。
- **IO**：已关闭项：详情页主线入口与 US-072 重复（改为回归口径）、REQ-005 TR2–TR5 验收基线被取代（proposal 增 `Supersedes`）、成员名册返回链接保留行程上下文（已入 delta）。
- **SA**：排序契约（`start_date` 升序 → `id` 升序）必须在集成测试中锁定，避免无 ORDER BY 漂移；首屏「已结束行程在前」的可用性后果本期接受。
- **SA**：「已结束」由前端按本地当天判定，仅显示层语义；服务端不引入状态字段，也不改变邀请加入/主线方案/分队的写能力，跨时区差异接受。
- **SA**：`organizer` 与 `mainPlanConfirmed` 的语义已在 trips delta 收紧（前者是调用者自身关系、不是成员名册的逐人行标志；后者是只读投影、不携带过滤/排序/显示语义），实现时不得自行扩展。

## 结论

**AC 4/4 Pass；DoV 5/5 Pass；无阻塞 Fail / Partial。** IO 已于 2026-11-17 具名签核，G1 升 `Pass`；P3 fixture 补充作为 P3 承接项跟踪。
