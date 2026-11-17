# US-071 ATDD 设计

- change：`us-071-my-trips`
- 输入：`specs/trips/spec.md`（1 ADDED / 9 场景）、`specs/app-shell/spec.md`（1 MODIFIED / 12 场景）、`g1-decision.md`（G1 Pass）
- 需求源：`requirement-workspace/requirements/US-071.md`（S1–S15 / R1–R6）
- 相邻既有能力：US-072 已交付详情页主线方案入口（Living `trips`「Trip detail main-plan navigation entry」），本变更只回归

## 1. ATDD 分层

| # | 场景（delta 名） | 层 | 推荐附加层 | 判定理由 |
|---|---|---|---|---|
| A1 | A member reads their own trips | **API** | Security（advisory） | 单端点 → 状态码 + 字段集，无 UI |
| A2 | Ordering is deterministic | **API** | — | 顺序可由一次响应断言；同日用例须造 fixture |
| A3 | The organizer flag identifies the creator | **API** | — | `organizer` 派生字段 + 名册不受影响 |
| A4 | An account without trips reads an empty list | **API** | — | 200 + `{"trips":[]}` |
| A5 | A confirmed main plan stays listed | **API** | — | `mainPlanConfirmed` 只读投影 |
| A6 | A finished end date changes no behaviour | **API** + 回归套件 | — | API 断言「仍返回、无状态字段」；邀请/主线/分队「行为不变」由既有测试与 E2E 回归承载，不新增后端分支 |
| A7 | An unauthenticated request is rejected | **API** | Security | 401 `USER_REQUIRED` |
| A8 | The retired identity header does not authenticate | **API** | Security | 仅 `X-User-Id` → 401 |
| A9 | The list is read-only | **API** | — | 断言 `POST /api/trips` 语义不变、无新增写动词 |
| E1 | Details render under the shell with 行程 active | **E2E** | 回归 | 跨屏可见状态 |
| E2 | The 行程 tab always opens the trip list | **E2E** | — | 导航行为（点击 tab） |
| E3 | The list shows the caller's trips | **E2E** | — | 行内字段与唯一标题 |
| E4 | A list row opens the details route | **E2E** | — | 跨页跳转 |
| E5 | Created and ended trips are marked | **E2E** | — | 行内徽标可见性 |
| E6 | A pending or failed read recovers | **E2E** | — | loading / 失败 / 重试三态 |
| E7 | The details screen exposes the main plan entry | **E2E** | 回归（US-072） | 既有入口仍可达，且不新增第二个 |
| E8 | Trip-scoped return links keep the trip context | **E2E** | 回归 | 成员名册返回 `#/trips/<id>`；分队/创建返回 `#/trips` |
| E9 | No trip selected shows the honest empty state | **E2E** | — | 空态文案 + 仅创建入口 |
| E10 | Open-by-id reuses the details route | **E2E** | 回归 | 深链仍打开详情；列表页无编号输入 |
| E11 | Create is reachable and returns to 行程 | **E2E** | 回归 | 返回落点 |
| E12 | No trip listing is introduced | **E2E** | 反向 | 网络面板：仅一次 `GET /api/trips`，无第二个列表来源 |

**Deferred to `/sdd:atdd-apply`（unit-level TDD）**

- `isEnded(endDate, today)` 纯函数（本地日期与 `YYYY-MM-DD` 比较）。
- 列表行 href 与 `tripsHref` 计算的纯函数（若抽出）。
- 不在此文档展开 UT 套件设计。

## 2. 生产代码之前先写什么

| 顺序 | 先写的验收物 | 形态 |
|---|---|---|
| 1 | `TripListApiTest`（A1–A9，红） | Spring Boot 集成测试，`TestAuth.asUser`，直连真实 SQLite 测试库 |
| 2 | `acceptance-test-fixtures.md` §US-071（数据前置） | 文档化 fixture：Alice 自建/受邀/已结束/同日两条、Eve 空账号、Eve 非成员 |
| 3 | `docs/feedback/e2e-us-071.md` 清单（E1–E12 行，全 pending） | 浏览器手工清单（仓库无 Playwright），逐行 Pass/Partial/N/A |

先红后绿：A1–A9 在端点不存在时应失败（404/无路由），实现后转绿；E1–E12 在实现前记录为 pending。

## 3. Local vs CI gate

| Gate | 命令 | 触发 | 来源 |
|---|---|---|---|
| Backend | `cd backend && mvn -B test` | 本地每次改动；CI `Backend tests` | `.github/workflows/ci.yml` |
| Frontend | `cd frontend && npm run typecheck && npm run build` | 本地；CI `Frontend build` | 同上 |
| Spec | `openspec validate us-071-my-trips --strict` | 本地（P3/P4 收尾） | `openspec/config.yaml` |
| E2E | `docs/feedback/e2e-us-071.md` 手工清单 | 本地（P4 提交前） | 仓库既有 E2E 惯例 |
| PR | 分支 + PR，禁止直推 main | P4 第一条任务 | `.githooks/pre-push` / `AGENTS.md` §Git workflow |

不新增第二种 CI 语义；E2E 不引入 Playwright/POM。

## 4. Fixtures 策略

复用 `acceptance-test-fixtures.md` 的 §Users（Alice 1 / Ben 2 / Chloe 3 / Daniel 4 / Eve 5）与 §Sample trip 约定，新增 §US-071：

| 行程 | organizer | 成员 | start | end | 用途 |
|---|---|---|---|---|---|
| `Singapore Friends Day`（V2 种子，id=1） | Alice | Alice, Ben, Chloe, Daniel | 2026-12-05 | 2026-12-05 | 自建行 + organizer=true + 基准行 |
| `Bali Weekend`（测试创建） | Ben | Ben, Alice | 2026-12-08 | 2026-12-10 | 受邀行 + organizer=false |
| `Kyoto Autumn`（测试创建） | Alice | Alice | 2026-11-01 | 2026-11-05 | 已结束（相对 2026-11-16）+ 排序首屏 |
| `Same-Day Start`（测试创建） | Alice | Alice | 2026-12-05 | 2026-12-06 | 与种子行同日 → 按 id 升序 |

断言基线（以 2026-11-16 为“今天”）：Alice 列表 4 条，顺序 `Kyoto Autumn`(11-01) → `Singapore Friends Day`(12-05, id=1) → `Same-Day Start`(12-05, id 更大) → `Bali Weekend`(12-08)；Eve 列表为空；Eve 直接 `GET /api/trips/1` 仍为 403（既有行为，不进本变更断言集）。

数据归属与清理：测试类用 `@Transactional` 或每例重建上述夹具（与 `TripMembersApiTest` 既有做法一致）；不写产品迁移、不改种子数据。

## 5. 非目标与反向验证

| Non-goal / Out-of-scope | 反向用例 | 层 |
|---|---|---|
| 分页 / 搜索 / 筛选 | 列表页无搜索框；`GET /api/trips` 不接受并忽略分页参数（不返回分页元信息） | E2E + API |
| 新增写端点 | `PUT`/`DELETE /api/trips` 不改变数据；`POST /api/trips` 仍只创建 | API |
| logout / 切换账号 UI | 页面无退出入口（归 US-069）；只在 API 层验证两会话互不可见 | E2E 记录 + API |
| 第二个主线方案入口 | 详情页主线入口计数 = 1 | E2E |
| 改动邀请 / 主线 / 分队行为 | 已有 invitations / main-itinerary / splits 测试全绿（回归） | 回归套件 |
| 「已结束」进入业务状态机 | 后端响应无 finished 字段；`mainPlanConfirmed` 不受 `endDate` 影响 | API |

## 6. NFR 测试

**范围外**。理由：本次为只读投影 + 前端列表，AC 未声明性能/可用性/保留期指标；仓库历史 change（含 US-019、US-067）同样未纳入 NFR 测试。若后续列表规模增长，单独立「列表分页/性能」变更（对应 OQ-5 的解除条件）。若你要求纳入，我在此补观测/性能小节后再进 task-plan。
