# DoV / AC review — us-089-split-window-demo

- Requirement: `requirement-workspace/requirements/US-089.md`
- Delta: `specs/splits/spec.md`（3 MODIFIED）、`specs/trips/spec.md`（1 MODIFIED）
- IO 复核人：**Johnson**（用户 2026-11-17 指令代记）
- 结论：**AC 9/9 Pass、DoV 5/5 Pass**；无阻塞项。

## AC 对照

| AC | 要求 | 实现与证据 | 结论 |
|---|---|---|---|
| AC1 | 出发选首站，窗口从该站开始起算 | `SplitWindow` 用 `departure.startAt()`；API：M+ 09:00 → 天星 10:40 = 100；`SplitBoundaryApiTest` 150 | Pass |
| AC2 | 会合站必须在出发站之后 | 前端按索引禁用非法组合；后端 `NONPOSITIVE_SPLIT_WINDOW`；`SplitBoundaryApiTest` B2-N | Pass |
| AC3 | 改选后“下一步”先保存 | `screen-boundary.next()` 脏检查 + `mutateAsync`；失败留在本页 | Pass |
| AC4 | 保存新边界作废旧路线 | `withBoundaries` routes=null + 事务删除 split 节点；API：改边界后 `routes=0`；B7 | Pass |
| AC5 | 路线合计/窗口与超窗提示 | `RouteCard` 合计/窗口、超窗标红；`screen-routes` 时间窗说明 + 回退提示 | Pass |
| AC6 | 香港/伦敦主线与 B 组活动按目的地 | `FakeMainPlanProvider` 6/7 站；`FixtureBranchCandidateProvider` B 组城市活动；时区/币种按目的地 | Pass |
| AC7 | 空库演示脚本可用 | `scripts/demo-seed.py` 自适应 schema、自动建两条演示行程、双成员就绪 | Pass |
| AC8 | A 组显示主线站点序列、合计=窗口 | `RouteStep`；API：A steps 4 站、activity 280 + legs 95 = 375；单测覆盖 | Pass |
| AC9 | 行程详情按组展开、无合成“沿主线方案” | `derivePersonalRoute` 用 `mainPlanStops` 填充；浏览器截图（Ben A 逐站 / Eve B 活动） | Pass |

## DoV

| # | 维度 | 结论 | 说明 |
|---|---|---|---|
| D1 | Scope | Pass | 仅 splits/trips 读契约与前端展示；零迁移、零新依赖、安全配置未改 |
| D2 | Ambiguity | Pass | OQ-1（自动计算路程）明确 deferred；OQ-2/OQ-3 resolved |
| D3 | Conflict | Pass | 出发口径改变与 US-040“出发点=endAt”测试冲突已同步改写；确认示例数值随窗口更新；US-084 合成活动行为被 AC9 取代并写入 delta |
| D4 | Verifiability | Pass | 全部为可观察结果：窗口分钟数、steps 名称/顺序、routes 清空、超窗分钟、页面元素与组标记 |
| D5 | Residual | Pass | 见下 |

## Residual（非阻塞）

- CI（E1）与 PR 尚未产生：分支未 push（需用户授权）。G3 前需补 push + PR + 双 job 绿。
- 路线页“分组已更新，路线仍为上次生成版本”的提示沿用 US-040 的常驻文案；本次未新增“路线生成时分组快照”字段。
- B 组活动时间仍采用“窗口内居中”的既有派生规则，未按路程起点推算（保留 US-084 口径）。
- `openspec validate --specs --strict` 的既有长 requirement WARNING 属存量，不在本变更范围。

## 签名

| Role | Name | Decision | Date |
|---|---|---|---|
| IO | Johnson | **Pass** | 2026-11-17 |
