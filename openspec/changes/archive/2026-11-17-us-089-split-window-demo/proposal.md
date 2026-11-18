# Proposal — US-089 分队窗口按出发站开始时间 + 香港/伦敦演示数据

## Why

分队两条核心口径在演示中不可用：

1. **窗口口径**：旧规则“出发时刻 = 出发 stop 的结束时间”，使最早只能在首站游览结束（10:20）后分头，无法表达“09:00 从西九文化区分开”。同时边界页允许选出会合早于出发的组合，只能等后端 400；改选边界后不保存会沿用旧边界，改完边界旧路线仍残留，表现为“无论选哪个会合站都显示旧结果”。
2. **分队内容**：A/B 两组都使用合成夹具，分队后“原有主线方案”消失；而行程详情的“我的方案”又插入一条合成“小组活动”，A 组显示成“沿主线方案”卡片，且窗口内的主线站点被丢弃或错位。

目标：分队窗口改成“会合开始 − 出发开始”；保存边界即作废旧路线；A 组沿已确认主线站点、B 组走新路线；演示库可按目的地（香港/伦敦）生成可用的主线与分队数据。

## What Changes

- **窗口**：`SplitWindow` 使用 `reunion.start − departure.start`；`saveBoundaries`、路线节点写入、详情窗口、确认前复算一致；`departureAt` 语义 = 出发站开始时刻。
- **边界页**：出发/会合 chip 显示开始时间；不合法组合置灰、已选项可取消；“下一步”先保存当前选择并提示未保存状态。
- **作废旧路线**：保存新边界的同一事务内清空草稿 `routes` 与 `split-a/split-b` 节点；旧路线必须重新生成。
- **A 组沿主线**：`RouteCandidate`/`RouteDurations`/`GroupRoute` 新增 `RouteStep`；A 组由边界之间的主线站点派生（活动=站内停留、路程=站间空档、合计=窗口）；B 组保留按目的地的新路线。
- **行程详情**：已确认分队后，“我的方案”按我的组展开——A 组逐个显示主线站点（真实时刻 + 组标记），B 组显示其活动；移除合成“沿主线方案”卡片。
- **演示数据**：主线与 B 组夹具按目的地（香港/伦敦/默认新加坡）出数据；投影与显示按目的地时区（`TripZones`）；人均费用按目的地币种（HK$/£/S$）；`scripts/demo-seed.py` 自适应库结构，空库可建两条演示行程。
- **不做**：按经纬度/路网自动计算路程与活动时长（OQ-1 deferred）；多日分段；US-003 的 `jointing_closed`/`trip_basics_json` 字段与迁移。

## Capabilities

### New Capabilities

*（none）*

### Modified Capabilities

- `splits`：3 MODIFIED — Split boundary selection（口径 + 保存即作废）、Group route generation（A=主线站点、RouteStep）、Split draft detail read（`destination` + `steps`）；Split confirmation 同步更新示例数值（规则不变）。
- `trips`：1 MODIFIED — Personal route after split confirmation（A 组按站点展开，移除合成块）。

## Impact

| Area | Effect |
|---|---|
| Backend | `SplitDraftService`/`SplitDraftDocument`/`GroupRoute`/`RouteCandidate` + 新增 `RouteStep`；`FixtureBranchCandidateProvider` 派生 A 组；`MainPlanProjection` 按目的地时区；`TripZones` 新增；`SplitDraftRepository.findDestination` |
| Frontend | 边界页（开始时间、置灰、保存并下一步）、路线卡/队伍路线图（RouteStep）、行程详情个人路线（A 组展开）、时区/币种显示 |
| Database | 零迁移；草稿 JSON 新增可选 `steps`（旧文档缺省 = null，向后兼容） |
| Dependencies | 无新增 |
| Auth | 无变更（splits 维持 `permitAll` + `MemberGuard`） |
| Demo data | `scripts/demo-seed.py` 重写（自适应 V1–V10 结构，自动建两条演示行程，Ben+Eve 均就绪） |
| Specs | `openspec/specs/splits/spec.md`（3 MODIFIED + 示例同步）、`openspec/specs/trips/spec.md`（1 MODIFIED） |
| Requirement source | GitHub issue #144；`requirement-workspace/requirements/US-089.md` |
| Cross-change | 复用 US-040 的成员分组与 `MainPlanProjection`；不改变分组、确认、取消状态机 |

## Gates

- G1：IO **Johnson**、SA **Johnson** —— Pass（用户 2026-11-17 指令代记）。
- G2：VL **Leo** —— 用户告知已确认，按其指令记录。
- 分支 `US-089-split-window-demo`（基线 `group1/main` `0bf699c`）；push/PR/合并需另行授权。
