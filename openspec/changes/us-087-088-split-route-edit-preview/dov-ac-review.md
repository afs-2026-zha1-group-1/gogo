# US-087-088 AC / DoV review (delta-craft)

Reviewer: sdd-delta-craft (P2), 2026-11-17 · change: `us-087-088-split-route-edit-preview` ·
delta: `specs/splits/spec.md`（1 ADDED + 4 MODIFIED / 46 场景）· evidence:
`requirement-workspace/requirements/US-087-088.md`、`analysis/us-087-088-dor.md`、
`deep-dive.md` §US-087-088、`impact-brief.md` §US-087-088、`proposal.md`。

## Acceptance criteria (AC)

| # | Item | Result | Evidence | Notes |
|---|------|--------|----------|-------|
| AC-1 | Each requirement has ≥1 testable AC | **Pass** | 5 条 requirement 共 46 场景：ADDED `Split route pair edit` 7；MODIFIED `Group route generation` 9、`Reunion timing check` 13、`Split draft detail read` 7、`Split confirmation` 10 | 每条 requirement 至少 7 条场景 |
| AC-2 | ACs are observable | **Pass** | 断言落在 HTTP 码/`error.code`、`draftVersion`、`plan_node`/文档写入、弹窗字段、路由 URL、页面只读态 | 无「工作正常」类表述 |
| AC-3 | Negative / edge cases | **Pass** | S3 过期版本、S4 无路线、S5 非法输入、S6 终态、S8 权限；S2b 站点派生、N3a A 超窗、N3 不可行弹窗、N4 请求失败；T2/T3 超窗/缺输入；CF2/CF3/CF7/CF8 复核拒绝；D3–D5 权限；S7 旧地点回填 | 覆盖写/读/校验/确认四层失败面 |
| AC-4 | ACs not disguised impl detail | **Pass** | 场景描述「保存后返回新值」「弹窗列出合计与超窗」等可观察行为；未绑定组件库内部实现或方法名 | Dialog 以「仅关闭 + 完整明细」行为描述 |

## Definition of Verified (DoV)

| # | Item | Result | Evidence | Notes |
|---|------|--------|----------|-------|
| DoV-1 | Scope matches proposal | **Pass** | proposal：单 change、1 ADDED + 4 MODIFIED、零迁移；delta 未引入费用/必做标识/通知/地图 | 无静默扩容 |
| DoV-2 | Ambiguities listed or resolved | **Pass** | BQ-1…BQ-8 全 resolved；D-1/D-2/D-3/D-4 resolved；D-5（费用/必做标识）明确移出并另立；US-089 合并后的 A `steps` 编辑已由 BQ-7/BQ-8 收敛 | 无 blocking OQ 遗留 |
| DoV-3 | Role concerns noted | **Pass** | IO：`INVALID_ROUTE_INPUT` 契约扩展、任意成员编辑 vs 仅发起人生成、弹窗信息项；SA：双写原子性、版本 CAS、5s 轮询 stale、旧地址重定向 | 见下「Residual concerns」 |
| DoV-4 | No code claimed as done | **Pass** | 本次仅 P2 提案与 delta 复核 | 未修改业务代码 |
| DoV-5 | Requirements trace to proposal / approved requirements | **Pass** | 46 场景可回溯到 P1 的 20 条场景与 proposal 的 5 条能力声明；映射见下表 | 无未匹配项 |

## Traceability（P1 场景 → Delta 场景）

| P1 场景 | Delta 覆盖 | 状态 |
|---|---|---|
| S1 编辑态与终态只读 | `Group route generation` · «路线卡内联编辑与终态只读（S1）» + Screen 13 场景扩展（A 逐站） | ✅ |
| S2 任意成员保存成功 | ADDED · «任意成员保存整对路线（S2）»（含 A steps/B 分解） | ✅ |
| S2b A 站点派生合计 | ADDED · «A 组站点编辑派生合计（S2b）» | ✅ |
| S3 过期版本 | ADDED · «过期版本拒绝且不部分写入（S3）» | ✅ |
| S4 无路线 | ADDED · «尚未生成路线时拒绝保存（S4）» | ✅ |
| S5 非法输入 | ADDED · «非法输入拒绝（S5）» | ✅ |
| S6 终态拒绝 | ADDED · «终态草稿拒绝保存（S6）» | ✅ |
| S7 地点回填展示 | `Split draft detail read` · «旧草稿地点回填活动名（S7）» + D1 增 `locationName` | ✅ |
| S8 权限 | ADDED · «非成员或未登录拒绝保存（S8）» | ✅ |
| N1 先保存后校验通过 | `Reunion timing check` · «下一步先保存后校验并通过（N1）» | ✅ |
| N2 无改动跳过保存 | «无改动继续跳过保存（N2）» | ✅ |
| N3 不可行弹窗 | «校验不可行弹窗阻断（N3）» | ✅ |
| N3a A 超窗 | «A 组编辑超过时间窗被拦（N3a）» | ✅ |
| N4/N5 请求失败 | «保存或校验请求失败不跳转（N4-N）» | ✅ |
| N6 预览展示 | «队伍路线预览展示契约（Screen 13b）» | ✅ |
| N7 复核入口 | `Split confirmation` · «编辑后确认按新路线复算（CF9）» + Screen 15 返回目标 | ✅ |
| N8 旧地址重定向 | `Reunion timing check` · Screen 14 场景改写（重定向） | ✅ |
| N9 终态只读 | S1/S6 + Screen 13b 终态只读 | ✅ |
| N10 清空分钟 | S5 + N4-N（保存拒绝，不进入校验） | ✅ |

## Fixture alignment check

- `requirement-workspace/acceptance-test-fixtures.md` 目前**尚无 §US-087-088**；P3 ATDD 需补编辑/保存/校验/预览矩阵。
- 既有 splits 夹具假设 A/B 各 2 人（US-040 已登记）；本变更不改变分组夹具，但保存/校验用例需沿用同一成员集，P3 补齐。
- 未发现与既有 splits 场景的冲突；MODIFIED 的 4 条 requirement 保留 Living Spec 全部原场景标题（脚本核对 0 missing）。

## Residual concerns（IO / SA）

- **IO**：
  - 新增错误码 `INVALID_ROUTE_INPUT`（400）属契约扩展，请在 G1 明确接受或提出替代；
  - 任意成员可编辑路线、重新生成仍仅发起人（BQ-6）——请确认这是期望的权限面；
  - A 组逐站编辑后合计 SHALL ≤ 时间窗，超窗由下一步弹窗阻断（BQ-7）——请确认交互可接受；
  - 失败弹窗仅「关闭」+ 完整明细（D-3）与预览页文案（D-4）已按 2026-11-17 裁决写入，请复核。
- **SA**：
  - `plan_node` + 文档 `routes`（含 `steps`）双写与 `draftVersion+1` 必须同事务，失败整体回滚；
  - A 组合计由服务端派生，客户端声明不参与；
  - 5s 轮询/多人并发下以 `STALE_DRAFT_VERSION` 收敛，前端提示重新拉取；
  - 旧 `/split/timing` 重定向与 Screen 15 返回目标需在 P3/P4 回归。

## Revision review（2026-11-18，合并 origin/main US-089 后）

- 触发：合并 `origin/main`（含 US-089）后，A 组改为 `RouteStep` 站点序列且「生成时 A 合计 = 时间窗」；原「A/B 均改三项分钟」口径不再成立。
- 重基线：4 条 MODIFIED 复制 US-089 最新正文并保留全部原场景（含 G7）；新增 A `steps` 编辑、S2b、N3a；`openspec validate --strict` 仍 valid（46 场景）。
- 用户裁决（SA）：A 按站点逐项编辑停留/路程，服务端派生合计，合计 SHALL ≤ 时间窗。
- 状态：本修订已提交 PR #135，待 IO 复审确认；本轮 G1 Revision 见 `g1-decision.md`。

## Revision review 2（2026-11-18，P4 产品反馈）

| Item | Review | Result |
|---|---|---|
| A 组真实名称/地点 | A 活动名 = 首末站拼接，地点 = 首站真实 `location_name`；B 地点 = 行程目的地 | Pass（provider/API 断言 + E2E 预填值） |
| 去程/回程标注 | 编辑卡与只读卡按去程/段间 N/回程逐段显示；预览图逐段成节点，不合并求和 | Pass（`team-route.test.ts` + 浏览器 E2E） |
| 契约/场景保留 | `Group route generation`、`Reunion timing check` 文本更新但全部原场景标题保留；`validate --strict` valid（46 场景） | Pass |
| 回归 | 后端 380/380、前端 46/46 + build、浏览器 85/85 | Pass |

SA Leo 对 Revision 2 签 Pass；IO Emily 待复签（G1 Revision 2 记 Conditional，IO 复签后升 Pass）。

## Revision review 3（2026-11-18，P4 第二轮反馈）

| Item | Review | Result |
|---|---|---|
| A/B 站点列表 | 两组均以站点（站名 + 停留）编辑；A 去掉活动名/地点输入，站名可改；B 可添加/删除站点 | Pass（`SplitRouteEditApiTest` + E2E 增删站点） |
| 路程规则 | A legs=站点数；B legs=站点数+1；统一标注「路程」 | Pass（API 非法输入 + 浏览器） |
| 派生值 | 活动名=首末站拼接、地点=首站名、buffer=0；B 初始单站点 | Pass（provider/API 断言） |
| 预览交替 | 地点与路程按顺序交替，A 首站无前置路程、B 首站前去程 | Pass（`team-route.test.ts` + E2E） |
| 回归 | 后端 380/380、前端 46/46 + build、浏览器 85/85 | Pass |

SA Leo 对 Revision 3 签 Pass；IO Emily 待复签（G1 Revision 3 记 Conditional）。

## Verdict

**AC 4/4 Pass · DoV 5/5 Pass**（含 US-089 重基线、P4 Revision 2/3）。G1 Revision 2/3 待 IO 具名复签。本文件不是 Gate 决定。
