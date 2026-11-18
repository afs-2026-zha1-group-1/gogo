# G1 decision — us-089-split-window-demo（SA + IO Pass）

- Gate: G1 (Align)
- Timestamp: 2026-11-17（+08:00）
- Branch: `US-089-split-window-demo`（基线 `group1/main` `0bf699c`）
- 状态：**SA Pass（Johnson）+ IO Pass（Johnson）**；Decision = **Pass**

## Inputs

- Proposal：`proposal.md`
- Delta：`specs/splits/spec.md`（3 MODIFIED）、`specs/trips/spec.md`（1 MODIFIED）
- Requirement source：`requirement-workspace/requirements/US-089.md`（OQ-1 deferred，OQ-2/3 resolved）
- AC/DoV：`dov-ac-review.md`（AC 9/9、DoV 5/5）
- 实现基线：`design.md`（DD1–DD10）、`tasks.md`
- 依赖的已归档资产：US-040（成员分组 + `MainPlanProjection`）、US-084（个人路线）、US-031-037（主线）
- 分支既有提交：`41e2dba`、`05d8e09`、`d9aa8b1`

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：只改 splits/trips 的读契约与前端展示；A 组路线改为主线派生、B 组保留夹具；窗口口径改为开始-开始；保存边界即作废旧路线。零迁移、零新依赖，安全配置不变 |
| Ambiguity | 无 blocking 开放问题：OQ-1（坐标自动计算）deferred；OQ-2（清空 vs stale）resolved = 清空；OQ-3（chip 显示开始）resolved |
| Conflict | ① 与 US-040 既有测试“出发点=endAt / 窗口 120”冲突 → 测试改为 startAt / 150 并保留 B1 等场景；② 与 US-084“合成小组活动居中”冲突 → A 组改为按站点展开，B 组保留原规则，写入 trips MODIFIED；③ 确认示例（CF1/CF2-N）数值随窗口更新，规则不变 |
| Verifiability | 场景均为可观察结果：窗口分钟、steps 名称/顺序、routes 清空、超窗分钟、页面组标记与时刻 |
| Residual | CI/PR 未产生（未 push）；B 组居中规则保留；分组快照字段未新增。均非阻塞 G1 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Johnson | **Pass** | 2026-11-17 |
| IO | Johnson | **Pass** | 2026-11-17 |

按用户 2026-11-17 明确指令（“IO 和 SA 填我 Johnson”）记录；代理不独立核实签署人身份，也不代替签署人判断。

## Conditions

| # | Condition | Owner | Status |
|---|---|---|---|
| C1 | IO 对 delta、`dov-ac-review.md` 与 AC 对照具名复核 | Johnson（IO） | **closed 2026-11-17** |
| C2 | SA 复核窗口口径、A 组沿主线与作废策略 | Johnson（SA） | **closed 2026-11-17** |
| C3 | P5 时同步 `trips`/`splits` Living Spec | SA / P5 | carried（归档时执行） |

## Decision: Pass

G1 达成，进入实现收尾（已完成）与 G2；CI/PR 属 G3 前置，需 push 授权。
