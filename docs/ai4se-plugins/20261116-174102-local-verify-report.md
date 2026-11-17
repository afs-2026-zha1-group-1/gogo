# Local Verify Report: us-049-050-split-confirm-cancel

**Date:** 2026-11-16 (timezone: +08:00)
**Root:** d:\study\gogo
**Scope:** local+evidence
**Change id:** us-049-050-split-confirm-cancel

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** N/A — 本变更按用户裁决在 `main` 直开发，不提交 PR；Overall=Pass，E3 由 G2（VL）签核。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd backend && mvn -B test` | CI workflow（`.github/workflows/ci.yml` backend job）/ AGENTS.md | 0 | **214/214 tests**，含新增 50 条（confirm 12 / cancel 6 / start+3 / detail+2 / domain 6） |
| `cd frontend && npm run build` | CI workflow（frontend job） | 0 | `tsc --noEmit` 零错误 + `vite build` 成功 |
| `openspec validate us-049-050-split-confirm-cancel --strict` | `openspec/config.yaml` 约定 | 0 | valid（7 requirement / 51 scenario） |
| 白名单 6 条（反向 grep ×4 + CI YAML 断言 ×2） | `docs/feedback/verification-commands.md`（probe 生成） | 0 ×6 | 首轮 2 条因缺 PyYAML 失败，安装后 **6/6 Pass** |

## Code-review highlights

- 分层保持：Controller 薄（`Authentication`→`caller()`）→ Service 编排/事务 → Repository JdbcTemplate → domain 纯状态迁移；无反向依赖。
- 状态机单源：`document.status` 为真源，列 `draft_version` 仅作 CAS；确认/取消不改列版本，重建重置为 1。
- 取消原子性：单事务内「status=cancelled + routes=null + 删除 split-a/b 节点」，主线行逐行不变（`SplitCancelApiTest` 全列快照断言）。
- 错误契约：`error.details` 为包封套向后兼容扩展；`SPLIT_TIMING_INFEASIBLE.routes[]` / `SPLIT_DRAFT_INCOMPLETE.missing[]` 形状有正负断言。
- 可空时长模型（`Integer`）让「缺输入」可达，`ReunionTimingCalculator` 复用未改语义。
- 前端：Screen 15 新增；Screen 11/14 按 `status` 分支；确认后提供「查看已确认分队」入口；`error.details` 渲染逐路线明细。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 32/36 已完成；开项仅 8.1–8.4（P5 归档范围，按阶段设计保留） |
| V2 | Requirement coverage | Pass | [fact] | 7 requirement（confirm/cancel/start/boundary/routes/timing/detail）均有实现证据：`SplitDraftController` + `SplitDraftService` + `SplitDraftRepository` + `SplitDraftDocument` + `screen-confirm.tsx` |
| V3 | Scenario coverage | Pass | [fact] | 51 场景：API 测试覆盖 CF1–CF7-N、CN1–CN6-N、S7′/S8/S9-N、D1b、R-N；E2E 覆盖 E1–E11（10 Pass / 1 Partial，未登录跳转子项 N/A） |
| V4 | Requirement↔impl mapping | Pass | [fact] | 端点/错误码/状态迁移/投影逐项对齐 delta（见上表 V2；错误码 16 个全集） |
| V5 | Spec drift | Pass | [fact] | 无未记录漂移；两处 P4 内澄清已回写 delta：Screen 11 confirmed 提供查看入口（a11y 修正）、`SecurityConfig` split-draft 匹配器补 `:confirm/:cancel`（US-066 会话认证整合） |
| V6 | Design follow-through | Pass | [fact] | D1–D16：D1–D12/D14/D15 已实现；D13（下游只读 `status`）为文档约束按设计不改下游代码；D16 反向由测试负向用例覆盖 |
| V7 | Code pattern fit | Pass | [fact] | record DTO、JdbcTemplate、`ApiException`+`ErrorCode`、shadcn 组件与既有 splits 屏风格一致 |
| V8 | Upstream basis | Pass | [fact] | 变更文件均可溯源 tasks/proposal；额外两项（`SecurityConfig` 匹配器、Screen 11/14 查看入口）分别溯源 US-066 整合与 delta Screen 11 澄清 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | main CI `43833884672`（64060f5，实现）与 `43839036207`（60f44d1，查看入口修复），backend+frontend 双 job success |
| E2 AI | Pass | 本报告 + `docs/feedback/e2e-us-049-050.md`（E1–E11 实测：10 Pass / 1 Partial，未登录跳转子项 N/A） |
| E3 Human | Pending | G2 由 VL 签核（本报告不代签） |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ✅（残余风险已登记，见下） |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| W1 | E2E 发现 3 处非阻塞 UX nit：① 取消成功后残留上一次确认错误卡；② cancelled 草稿仍显示「去生成路线」CTA；③ detail 报错页仍显示「发起分队草稿」 | [fact] | `screen-confirm.tsx` / `screen-start.tsx` | 后续小修（见 e2e 文档 N1–N3） |
| W2 | E11 的「未登录跳转」子项 N/A：当前无 logout 端点（`POST /api/auth/logout` → 404），属 US-069 范围 | [fact] | `AuthController` | US-069 实现后补测；请求层已由 `RequireAuth` 保护 |
| W3 | 本机 dev 库 `backend/data/gogo.db` 存在 V2 校验和不匹配且被 IDEA Database 工具锁定；本次用 `gogo-us049.db` 临时库验收 | [fact] | `backend/data/gogo.db` | 关闭 IDE 连接后 `flyway repair` 或删库重建 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | PyYAML 不在企业 PyPI 镜像中，需从公网 PyPI 安装后才能跑 CI YAML 断言 | [fact] | 本机 Python 环境 | 纳入环境脚本或改用 node 解析 |
| S2 | 残留 change 目录（空壳 `req-004-split-draft-start`、`req-002`）仍会污染 active-change 探测 | [fact] | `openspec/changes/` | C6 清理 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| R1 | 确认后不可再拆/不可编辑 | 产品契约（US-049 AC1 + US-050 AC2 + US-038 一次限制）；用户已提出需求 | 需新需求（版本化重拆）走 P1；本变更不做 |
| R2 | C10 的「409 后重新 GET 判定是否已成功」重试 UX 未打磨 | 非阻塞承接项 | tracking（错误卡已可重试） |
| R3 | `main` 直开发无 PR 审查 | 用户 2026-11-16 裁决 | 以 G1 设计冻结 + G2 本地/CI 证据 + G3 签核补偿 |
| R4 | 开发库漂移（W3）可能让后来者启动失败 | 本机 IDE 占用 | 文档已记录 workaround |

## Waiver

N/A — no waiver（Overall=Pass）。
