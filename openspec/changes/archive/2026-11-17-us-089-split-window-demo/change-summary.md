# Change summary — us-089-split-window-demo

- Story: GitHub issue #144；`requirement-workspace/requirements/US-089.md`
- PR: [#138](https://github.com/afs-2026-zha1-group-1/gogo/pull/138) → merge `3fcfbfc`（2026-11-17）
- 分支：`US-089-split-window-demo`（基线 `group1/main` `0bf699c`），提交 `41e2dba` / `05d8e09` / `d9aa8b1` / `0554d09`

## 交付内容

1. **窗口口径**：`SplitWindow` = 会合开始 − 出发开始；保存边界、路线节点、详情与确认复算一致。
2. **边界交互**：出发/会合均显示开始时间；非法组合置灰、可取消；“下一步”先保存；保存新边界在单事务内清空旧路线与 split 节点。
3. **A 组沿主线**：`RouteStep`（站名 + 停留分钟）；A 组合计 = 窗口；B 组保留按目的地夹具。
4. **行程详情**：已确认分队后按组展开——A 组逐站显示主线站点（真实时刻 + 组标记），B 组显示活动；移除合成“沿主线方案”卡片。
5. **演示数据**：香港/伦敦主线与 B 组活动、目的地时区与币种、`scripts/demo-seed.py` 自适应 schema 并可建两条演示行程。

## Spec / 影响

- Living `splits`：4 MODIFIED（boundary / route generation / detail read / confirmation 示例）。
- Living `trips`：1 MODIFIED（personal route）。
- API：无新增端点；`GroupRoute`/详情新增 `steps`、`destination`（additive）。
- 数据：零迁移；草稿 JSON 新增可选 `steps`（旧文档 null）。
- 依赖/安全：无新增；`SecurityConfig` 未改。

## 验证

- 后端 371/371；前端 typecheck + 45 单测 + build。
- API 全链路（香港演示行程）与浏览器双侧（A 逐站 / B 小组活动）。
- CI：run 44112482366 与 44112533101 三个 job 全绿。
- `openspec validate us-089-split-window-demo --strict` = valid。

## 残留

- B 组活动时间沿用 US-084 的“窗口内居中”派生。
- 路线页“上次生成版本”提示未细分生成时的分组快照。
- 自动按坐标计算路程/活动时长（OQ-1）另立后续故事。
