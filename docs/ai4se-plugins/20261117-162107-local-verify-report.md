# Local Verify Report: us-040-split-grouping

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\study\gogo
**Scope:** local+evidence
**Change id:** us-040-split-grouping

## Summary

| Dimension | Status |
|-----------|--------|
| Build | **Pass** |
| Static scan | **Pass** |
| Code review | **Pass** |
| Evidence (OpenSpec) | **Pass**（E1 除外） |
| **Overall** | **Partial** |

**PR gate:** Overall = Partial（非 Fail），可推送并开 PR；但 **E1 远端 CI 未执行**（本地尚未 push），G2 前必须补 CI 绿证据。Agents must not self-approve Waiver。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `! grep -rn "Hello World" frontend/src` | `docs/feedback/verification-commands.md` | 0 | 无残留占位文案 |
| `! grep -inE "jpa\|hibernate" backend/pom.xml` | 同上 | 0 | 无 ORM 偏离 |
| `! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src` | 同上 | 0 | 无 H2 残留 |
| `! grep -q "artifact.oocl.com" frontend/package-lock.json` | 同上 | 0 | lockfile 无内网源 |
| `python -c "…ci.yml jobs == ['backend','frontend']…"` | 同上 | 0 | CI 双 job 结构未变 |
| `python -c "…ci triggers…"` | 同上 | 0 | 任意分支 push + PR→main |
| `mvn -B test`（agent 手动） | Rules / CI | 0 | **315/315**，BUILD SUCCESS |
| `npm run typecheck && npm run build`（agent 手动） | Rules / CI | 0 | tsc 零错误；vite build 成功（266–302ms） |
| `openspec validate us-040-split-grouping --strict` | OpenSpec | 0 | valid（deltas = 4） |

运行日志：`docs/ai4se-plugins/20261117-162011-local-verify-run.log`（白名单 6/6，failed 0）。

## Code-review highlights

- **新增端点**：`PUT /api/trips/{tripId}/split-draft/assignment`；`AssignmentRequest(memberId?, groupLabel, draftVersion)`；返回与 GET detail 同形的 `SplitDraftDetailResponse`。
- **守卫顺序**：成员资格 → 活跃草稿 → 版本 → 组别 → 目标成员归属（目标非本行程成员 → `403 NOT_A_MEMBER`），终态优先于 400（A5-N）。
- **幂等**：目标已在目标组时 200、不写库、不递增版本（OQ-10 定稿）。
- **并发**：`updateDraftIfVersion` CAS，失败映射 `STALE_DRAFT_VERSION`。
- **完整性门禁**：`groupProblems` 固定顺序 `groups.A → groups.B → groups.unassigned → groups.duplicate`，`routes:generate` 与 `:confirm` 共用。
- **前端**：CTA 三重禁用条件（未存边界 / 分组不完整 / 非 active）；终态文案改为只读（「草稿已结束，以下为最终确认的路线与分组」）；分组卡按原型 `.route` 呈现，chip 点击移组。
- **无新增迁移、未改 `SecurityConfig`**；splits 维持 `permitAll` + `MemberGuard`（无会话 401 `MEMBER_REQUIRED`，冒烟已验证）。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Delta Spec 与实现一致（1 ADDED + 3 MODIFIED / 39 场景） | Pass | [fact] | 场景 S9/S10-N/G6-N/CF8-N/A9/A9b-N 均有对应实现与测试 |
| V2 | 验收场景被测试覆盖 | Pass | [fact] | 后端 315/315；`SplitAssignmentApiTest` 11 例含 A9/A9b-N |
| V3 | OpenSpec 校验 | Pass | [fact] | `validate --strict` = valid（deltas = 4） |
| V4 | 白名单静态扫描 | Pass | [fact] | 6/6 exit 0 |
| V5 | E2E 证据 | Pass | [fact] | `docs/feedback/e2e-us-040.md`：E1–E13，1 个缺陷（E2E-1）已修并回归 |
| V6 | 设计决策落地（DD1–DD17 + TS-1…TS-7） | Pass | [fact] | `design.md` 与代码逐条对应；TS-7 权限修订已实现 |
| V7 | 反向/非目标验证 | Pass | [fact] | 无 groups 路由、无 `SecurityConfig` diff、无新迁移、`routes:check-timing` 未改 |
| V8 | 必要性（无范围蔓延） | Pass | [fact] | 变更来源为用户 2026-11-17 两条指令（BQ-2 保留路线、BQ-10 任意成员改组）+ IO 复核意见 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | **Missing** | 尚未 push，无 PR/CI run；需 push 后由 `/sdd:pipeline-report` 取 `ci-report.md` |
| E2 AI | **Pass** | 本报告 + 白名单日志 + 后端 315/315 + 前端 build + E2E 台账 |
| E3 Human | **Pending** | 需 VL 复核；G1 Revision 的 C8（IO）亦待补签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ E1 未执行，TS-1 常驻提示为已知代价 |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| W1 | E2E 发现的终态按钮未禁用 | [fact] | `screen-routes.tsx` | **已修复**（`draftActive`），已回归 `disabled=true`；终态文案同步改为只读 |
| W2 | E2E 前置条件与描述不符（存量 active 草稿 v80） | [fact] | 本地库 `gogo-us049.db` | 记录在 `e2e-us-040.md` 前置偏差；新建草稿「全员 A」由 S9 覆盖 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | `routes` 页无终态徽标（需到复核页才见「已确认」） | [inference] | `screen-routes.tsx` | 可后续加 `Badge`（产品未要求，未实施） |
| S2 | `validate --specs --strict` 仍 exit 1（5 个既有 Living Spec >500 字符 WARNING） | [fact] | `openspec/specs/` | 存量问题，与本变更无关；另立清理 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | E1 远端 CI 未执行 | 尚未 push/开 PR | 推送后由 `/sdd:pipeline-report` 补 `ci-report.md`，G2 前必须绿 |
| 2 | TS-1 陈旧路线提示为常驻（未记录路线生成版本） | 不新增 wire 字段 | accepted；如需精确提示回 `/sdd:delta-craft` 增字段并重开 G1 |
| 3 | 存量单人 active 草稿仍不可生成/确认 | 不放宽分组完整性 | accepted；前端已前置拦截单人行程发起 |
| 4 | G1 Revision 的 C8（IO 复核）未关闭 | 待 IO 签核 | 合并 PR 前补签 |

## Waiver

`N/A — no waiver`（Overall = Partial，无阻塞 Fail）。
