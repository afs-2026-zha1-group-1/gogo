# G1 补充记录 — us-066-log-in（C1–C4 闭合与需求重编号）

- Change id：`us-066-log-in`
- Gate：G1（Align）
- 原始记录：`g1-decision.md`（2026-11-16，**Conditional**，IO Johnson / SA Elian Jiang）
- 本文件性质：**补充记录，不是新的 Gate 决议**。Gate 仍为 Conditional；是否转 Pass
  由 IO + SA 基于本记录确认。
- 记录时间：2026-11-16

## 1. 需求重编号

`origin/main` 已使用 REQ-006（US-042，splits 链）与 REQ-007（US-043）。本变更的
需求条目从 **REQ-006 → REQ-008**，内容不变；已同步：

- `requirement-workspace/requirements/REQ-008.md`
- `requirement-workspace/intents/2026-11-16-req-008.md`
- `requirement-workspace/analysis/req-008-dor.md`
- `requirement-workspace/deep-dive.md` §REQ-008
- `requirement-workspace/impact-brief.md` §38–45
- `registry.md` / `handoff.md` 行

`g1-decision.md` 中 REQ-006 的引用作为历史输入保留，不修改已签记录。

## 2. C1–C4 闭合

| 条件 | 处置 | 证据 |
|---|---|---|
| C1 splits 纳入 | `specs/splits/spec.md` MODIFIED（5 条 requirement 的身份短语改为 authenticated session，名称/场景名全部保留）；范围写入 REQ-008、proposal、impact；`MEMBER_REQUIRED` 与 `{data,error}` 作为例外 | `openspec/changes/us-066-log-in/specs/splits/spec.md`；`openspec validate us-066-log-in` valid |
| C2 main-itinerary 对齐 | `specs/main-itinerary/spec.md` MODIFIED（identity requirement 改为 session，保留 organizer/member 结果与 `USER_REQUIRED`）；L1/R1 的“in-flight delta”前提已删除 | `openspec/changes/us-066-log-in/specs/main-itinerary/spec.md`；`consistency-lint.md` §Re-run |
| C3 错误契约 | 认证/安全 handler 用扁平 `{code,message}`；splits 保留 `{data,error}` + `MEMBER_REQUIRED`（按用户 2026-11-16 选择，写作 doc exception）；auth delta 新增 “Error response shape and split identity exception” | `specs/auth/spec.md`；REQ-008 OQ-11/OQ-12 |
| C4 基线 | 分支已合并 `origin/main` `f6419a5`（merge `53bdcc6`）；proposal/impact 的 baseline、前端/测试清单、V4/V6 口径已刷新 | `git log`；`proposal.md` §Impact；`impact-brief.md` §39–45 |

非阻塞项：N1/N4 已修（V4=splits、凭据失败仅 401）；N2/N3 已在新清单覆盖；
N5（app-shell 分队占位文案漂移）与 N6（fixtures US-031-037 的 V4 旧口径）作为
SA 另案残余，不改写历史。

## 3. 重跑证据

- `openspec validate us-066-log-in` → **valid**
- `consistency-lint.md` §Re-run after G1 C1–C4 → 无 BLOCKER；保留 1 个既有 splits
  Purpose 漂移 WARNING（`X-Member-Id` 文案，代码为 `X-User-Id`）与历史场景名
  SUGGESTION
- P2 quality report 重评：P2-3 由 Skipped 改为 **Partial**（G1 已记录为
  Conditional，未转 Pass）

## 4. 待 IO + SA 确认

建议将 G1 从 **Conditional 转 Pass**，残余风险如下：

1. splits Living Spec 的 Purpose 仍写 `X-Member-Id`（代码与 delta 已用 session /
   `X-User-Id`），由 SA 在 archive/living-merge 时修正。
2. 历史场景名（如 “The identity switcher stays a scaffold”）为 OpenSpec 归档保留
   要求，内容已改为移除后的行为。
3. `MEMBER_REQUIRED` 与 splits envelope 为永久例外，已在 auth/splits delta 写明。

如 IO/SA 同意，请在 `g1-decision.md` 追加“转为 Pass”的签署行（或另写
`g1-decision-pass.md`）；在收到明确签署前，Gate 仍按 **Conditional** 记录。
