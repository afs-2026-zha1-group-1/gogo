# G2 decision — req-024-set-trip-budget（G2 草稿，待具名 VL 签署）

> **状态：草稿（DRAFT）。** 代理整理输入/维度/缺陷/开放项，**不代签、不判定**。`Decision` 留空待 VL 在 §签核区填写；签署前 G2 闸门**保持开放**。本记录随分支推送到远端供 VL 拉取复核。

- **Change id:** `req-024-set-trip-budget`（US-024 预算 + 并入 US-019 个人默认偏好）
- **Gate:** G2 (Verify)
- **Decision:** 待 VL 裁决（Pass / Fail / Conditional）
- **Approvers:** VL = 待填（具名）
- **Timestamp:** 待填
- **Target:** 当前工作区**未提交**变更（HEAD 之上，未 commit、未 push）；**无 PR，且本变更集无 CI run**。签署前请以实时 `git`/构建结果为准。

## Inputs

| 输入 | 位置 | 状态 |
|---|---|---|
| 设计 / 任务 | `design.md` / `atdd-design.md` / `tasks.md` | P3 回填（按已实现代码） |
| 验证证据 | `docs/feedback/verification-req-024.md` | 本地 336/336 + 8082 隔离冒烟 |
| Delta（含修订） | `specs/preferences/spec.md`（顶部「修订说明」） | 预算口径改为主单位 + `hard/soft`（soft≈±20%） |
| G1 | `g1-decision.md`（+ 2026-11-18 预算复审段） | 旧口径 Pass；**修订待复审，未签** |
| CI / PR | — | 无当前 commit 的 CI；无 PR |

## Dimension results

| 维度 | 状态 | 证据 |
|---|---|---|
| Build | Pass | `mvn -B test` 336/336（V9 应用）；前端 build 147 modules |
| Tests | Pass | 预算 save/read、默认偏好 GET/PUT、清除，经 8082 冒烟 |
| Static scan | Partial | 本机 PyYAML 缺失致 2 条白名单命令失败（环境项） |
| Code review | Pass（代理整理，待 VL 复核） | `BudgetService`、`UserDefaultInterest*`、`PreferenceController` |
| Evidence (OpenSpec) | Partial | 无 local-verify 报告；无 CI；无 PR |
| CI (phase=ci) | **缺** | 本变更集未提交/未推送，无 run |
| CD (phase=cd) | n/a | — |
| **代理汇总建议** | **须先完成 G1 预算复审，再提请 VL** | 0 CRITICAL |

## Defect grades

- **CRITICAL：** 无。
- **WARNING：** 预算口径修订与已签 delta 冲突（待 IO/SA 复审）；`soft` ±20% 未接入主计划成本校验；无 PR / 无 CI；`V9` 迁移号合并前需确认。

## 未闭合项

| # | 项 | Owner |
|---|---|---|
| 1 | G1 预算修订复审（IO + SA） | Emily / evelyn.huang |
| 2 | 本 G2 具名 VL 签署 | 具名 VL |
| 3 | 提交 + 推送 + L3 + CI + PR | Dev |
| 4 | `soft` ±20% 接入 `BudgetOverruns` | Dev |

## §签核区（待 VL 填写；代理不代签）

```
Decision:      [ ] Pass        [ ] Fail        [ ] Conditional
VL name:       ______________________
Timestamp:     ______________________
Conditional 整改项 + owner（若判 Conditional 必须逐条写明）:
______________________________________________________
```

## Next

- VL 复核 → §签核区签署；Pass 后 → 提交/推送/L3/开 PR；随后 P5 归档（G3 具名 SA）。
