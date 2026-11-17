# G1 decision — us-082-back-navigation

- Gate: G1 (Align)
- Timestamp: 2026-11-17（+08:00）
- Branch: `main`（尚未创建 change 分支；P4 从 `group1/main` 创建并按 PR-only 流程提交）

## Inputs

- Proposal: `openspec/changes/us-082-back-navigation/proposal.md`
- Delta Spec: `openspec/changes/us-082-back-navigation/specs/app-shell/spec.md`（1 MODIFIED + 2 ADDED / 14 场景；G1 后随 US-068-070 归档同步 Living 基线）
- Design: `openspec/changes/us-082-back-navigation/design.md`
- Tasks: `openspec/changes/us-082-back-navigation/tasks.md`
- AC/DoV review: `openspec/changes/us-082-back-navigation/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass）
- Cross-change scan: `openspec/changes/us-082-back-navigation/cross-change-scan.md` — BLOCKER 0 / WARNING 3 / waivers 0
- OpenSpec 校验：`openspec validate us-082-back-navigation --strict` = valid
- Backend test: `mvn -B test` = **279/279 Pass**（含 `InvitationApiTest` 对 accept `tripId` 的断言）
- Requirement source: `requirement-workspace/requirements/US-082.md`（DoR：`analysis/us-082-dor.md`，BLOCKER = 0）
- 依赖：`openspec/changes/us-071-my-trips/specs/app-shell/spec.md`（AC2/AC3 的返回口径，US-071 G1 Pass）
- 相邻已归档资产：`us-068-070-account-register`（PR #101/#103 已合入 `main` 并归档；登录/注册页面的既有 delta 允许 `/register` 与 `#/register` 两种入口）
- Story: GitHub issue #105（`Iteration 1`、`Priority - Must`、`Type - Trip Setup`）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：路由修复为主，5 条 AC 由本 change 交付（入会成功直达行程、分队返回、主线方案返回、登录回原深链、登录/注册路由统一）；AC2/AC3 由 US-071 拥有，本 change 只回归。零迁移、零依赖；accept 响应 additive `tripId` |
| Ambiguity | blocking 未解 = 0；OQ-1 保留 `#/login`/`#/register` 既有入口为 non-blocking deferred；OQ-2 US-071 依赖的验收方式已定 |
| Conflict | ① AC2/AC3 与 active US-071 重复 → 已按「US-071 交付、本 change 回归」收敛，不重复实现。② us-068-070 的 design D13 曾把「创建账号」链到 `/#/register`，其 delta 只要求 `#/register` 或 `/register`，本 change 选择 `/register` 不违反 delta，D13 的实现选择被本 change 取代。③ 扫描的 4 条 BLOCKER 属未归档 us-068-070 的身份横切启发式，本 change 无 auth delta，不计入 |
| Verifiability | 12 条场景均为可观察路由/按钮/页面结果；负向覆盖直接打开分队深链、非法 `next`、`pendingInvite` 优先级、已登录访问注册页 |
| Residual | 见下方 Residual notes，均非阻塞 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Johnson | **Pass** | 2026-11-17 |
| IO | Johnson | **Pass** | 2026-11-17 |

按用户 2026-11-17 的明确指令记录：本 story 的 IO 与 VL/SA 均由 Johnson 本人担任。代理不独立核实签署人身份，也不代替签署人判断。

## Decision: Pass

Rationale：delta 只覆盖本 change 的 5 条 AC，AC2/AC3 明确依赖 US-071 且不重复实现；登录回跳带同源校验；跨 change 扫描 BLOCKER 0；`validate --strict` valid；AC/DoV 复核无阻塞项。G1 达成。

## Implementation amendment（2026-11-17）

实现期发现后端 accept 实际只返回 `joined` / `alreadyMember`，前端 `AcceptResult.tripId` 是空承诺，入会成功页会生成 `#/trips/undefined`。已按最小面补齐：`JoinResult` 增加 `tripId`（additive，既有字段与状态码不变），`InvitationApiTest` 断言该字段，前端类型同步收敛。delta 未变，AC 语义不变，G1 结论仍为 Pass；`mvn -B test` 279/279、`npm run build` Green。

Post-G1 sync（2026-11-17）：`main` 前进 4 个提交（US-068-070 P5 archive/finalize）后已合入本分支，`registry.md` 冲突按 main 的 REQ-009 行 + 本 change 的 US-082 行解决；MODIFIED `Guest join exclusion` 已按归档后的 Living 文本整段重同步（保留注册页无 dock、注册后邀请恢复两条场景），再叠加本 change 的 joined 行动；复扫 BLOCKER 0。US-082 的 delta 语义与 AC 不变。

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| — | 无 | — | — | — |

## Residual notes（非阻塞，承接至 P4/归档）

- AC2/AC3 依赖 active `us-071-my-trips`（G1 Pass，未实现）：US-071 合并后回归；未合并时记录依赖状态，不得记 Pass。
- 仓库级扫描的 A1–A4 BLOCKER 属未归档 `us-068-070-account-register`，由该 change 的 G2/G3/归档承接；不改变本 G1 结论。
- `#/login`、`#/register` hash 入口保留，本 change 不删除；另立清理 change。
- G2 的 VL 同为 Johnson（按 2026-11-17 指令）；G2 需在 PR 与 CI 绿后记录。
- 分支/PR 尚未创建：本记录不授权直推 main。

## Closure path

G1 **Pass** → 进入 P3/P4：先补 `docs/feedback/e2e-us-082.md` fail-first 清单，再按 `tasks.md` 第 3–8 组实现与回归。若实现阶段需要改 delta 语义，回到 P2 修补并重开本记录。
