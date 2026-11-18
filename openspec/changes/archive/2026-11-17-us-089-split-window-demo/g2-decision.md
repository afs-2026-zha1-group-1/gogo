# G2 decision — us-089-split-window-demo（VL Pass）

- Gate: G2 (Verify)
- Timestamp: 2026-11-17（+08:00）
- Branch: `US-089-split-window-demo`，head `d9aa8b1`
- 状态：**RECORDED / Decision = Pass**（VL Leo，按用户告知的确认记录）

## Inputs

- 本地验证（本次实现）：
  - 后端 `mvn -o test`：**371/371 Pass**（含 `SplitBoundaryApiTest` 150 窗口、`SplitRouteGenerationApiTest` A=沿主线、`SplitConfirmApiTest` 215/65、`MainPlanProjectionTest` 伦敦时区）
  - 前端 `npm run typecheck`、`npm run test:unit`（**45/45**）、`npm run build`：Pass
  - API 全链路（HK 演示行程）：确认主线 → 发起分队 → 分组 → 边界 09:00→15:15（375）→ 生成（A steps 4 站、合计 375；B 90）→ 改边界清空旧路线 → 重生成 → 确认成功
  - 浏览器：A 组成员行程详情逐站显示主线站点；B 组成员显示其生成活动（截图留档）
- G1：`g1-decision.md`（SA Johnson + IO Johnson Pass）
- Delta/Design/Tasks/DoV：`specs/splits/spec.md`、`specs/trips/spec.md`、`design.md`、`tasks.md`、`dov-ac-review.md`
- OpenSpec：`openspec validate us-089-split-window-demo --strict` = valid
- 未包含：CI（E1）/PR —— 分支未 push，需用户授权后补；不作为本次 Pass 的证据，列为 G3 前置

## 维度结果

| 维度 | 结果 | 证据 |
|---|---|---|
| 功能实现 | **Pass** | 窗口 开始-开始；保存边界清空旧路线；A 组 steps=边界间主线站点且合计=窗口；B 组夹具；个人时间线无合成块 |
| 回归 | **Pass** | 后端 371/371；前端 45/45；US-040 分组与确认链路未回退 |
| UI | **Pass** | 边界页置灰/保存并下一步、路线卡合计/超窗、行程详情按组展开、时区/币种 |
| 安全 | **Pass** | 无安全配置变更；无新依赖/凭据/迁移；成员与活动资格校验沿用 |
| 文档一致性 | **Pass** | proposal/design/tasks/delta/AC/registry 与实现一致；Living Spec 待 P5 合并 |
| CI（E1） | **N/A** | 未 push，无 run；G3 前必须补齐 |

## 缺陷分级

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 1 | W1：CI/PR 未产生（未授权 push），属 G3 前置 |
| SUGGESTION | 2 | S1：B 组活动仍按窗口居中（保留 US-084 口径）；S2：路线页常驻“上次生成版本”提示未细分 |

## 偏差与已接受后果

| id | 内容 | 处置 |
|---|---|---|
| TS-1 | 出发口径改为开始时间，推翻 US-040 测试的 endAt/120 期望 | accepted；测试与示例已改，规则仅在本次 delta 中生效 |
| TS-2 | A 组“活动”是一组站点而非单一活动 | accepted；以 `steps` 表达，旧客户端忽略新字段 |
| TS-3 | B 组活动时间保持居中派生 | accepted；US-084 原口径未变 |

## 合并前必须关闭

| # | 项 | Owner | 状态 |
|---|---|---|---|
| 1 | push 分支并开 PR（不得直推 main） | Johnson（SA） | open（需用户授权） |
| 2 | PR CI 双 job 绿 + G3 合并 | Johnson（SA） | open |

## 签核区（VL）

| Role | Name | Decision | Date |
|---|---|---|---|
| VL | **Leo** | **Pass** | 2026-11-17 |

按用户 2026-11-17 告知“leo 已经确认了”记录；代理不独立核实签署人身份。

## Decision: Pass

实现与本地验证全绿、无 CRITICAL；CI/PR 为 G3 前置，不影响本次实现验证结论。
