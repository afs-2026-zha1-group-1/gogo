# Local Verify Report: us-087-088-split-route-edit-preview

**Date:** 2026-11-18 (timezone: +0800)
**Root:** d:\study\gogo
**Scope:** local+evidence
**Change id:** us-087-088-split-route-edit-preview

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** Pass does not block `/sdd:pr-submit`; PR #135 already exists and this report is the local-verify evidence for G2. G2 still requires the pending IO re-sign of G1 Revision 2–4 (human gate).

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| 6 条静态反向/CI 检查 | docs/feedback/verification-commands.md（probe 白名单） | 0 | 全部 PASS（run log `20261118-120124-local-verify-run.log`） |
| `mvn -B test`（backend） | docs/feedback/verification-commands.md Runtime | 0 | 381/381 tests，0 failures / 0 errors |
| `npm run typecheck`（frontend） | docs/feedback/verification-commands.md Runtime（构建前置） | 0 | TypeScript 无错误 |
| `npm run test:unit`（frontend） | docs/feedback/verification-commands.md Runtime（构建前置） | 0 | 47/47 tests pass |
| `npm run build`（frontend） | docs/feedback/verification-commands.md Runtime | 0 | Vite production build 成功 |
| `npm run test:e2e`（Playwright） | docs/feedback/verification-commands.md System | 0 | 85/85 browser tests pass（含 split-route-edit 2 条） |
| `openspec validate ... --strict` | 变更包约定 | 0 | valid，46 场景 |

说明：本机 5173 的 dev server 占用 npm 原生 binding，未重复执行 `npm ci`；使用现有 node_modules 完成 typecheck/unit/build/E2E。E2E 使用本机 Chrome channel。

## Code-review highlights

- 后端保存契约统一为两组站点列表：A legs=站点数、B legs=站点数+1；服务端派生 activity/name/location/buffer=0，`draftVersion` CAS + 单事务双写保持不变。
- 新增 B 多站点用例（含带「主线·」前缀的站名），验证清洗、派生与持久化；既有 API/confirm/generation/detail 用例同步更新。
- 前端站点与路程行默认只读，铅笔进入行级编辑；新增站点为空值 + 「新站点」占位；数字输入隐藏原生 spinner。
- 站名前缀在前后端各清洗一次（展示与保存），预览/确认/只读卡复用同一工具，避免旧文档回显「主线·」。
- 未新增依赖/迁移/路由；无硬编码密钥；错误提示与后端新契约对齐。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | 66/69 完成；剩余 11.1–11.3 为 P5 归档前置，非本阶段阻塞 |
| V2 | Requirement coverage | Pass | [fact] | 1 ADDED `Split route pair edit` + 4 MODIFIED；实现/测试均存在 |
| V3 | Scenario coverage | Pass | [fact] | delta 46 场景；API 用例 + Playwright 覆盖编辑/保存/校验/预览/终态 |
| V4 | Requirement↔impl mapping | Pass | [fact] | Controller/Service/DTO、provider、screen-routes/graph/route-card、E2E 一一对应 |
| V5 | Spec drift | Pass | [fact] | Revision 2–4 已回写 delta/design/tasks；B buffer=0 为已确认变更 |
| V6 | Design follow-through | Pass | [fact] | DD1/DD2/DD6/DD9 与实现一致；行级编辑与清洗已补记 Revision 4 |
| V7 | Code pattern fit | Pass | [fact] | 沿用既有 Card/Button/Icon、分层与命名；无新库 |
| V8 | Upstream basis | Pass | [fact] | 所有改动可追溯到 US-087-088 用户反馈/场景；无未标记 scope creep |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本地 whitelist + backend/frontend/E2E 命令表（无 remote ci-report，本槽使用 local commands） |
| E2 AI | Pass | 本报告 + 证据清单 |
| E3 Human | Pending | G1 Revision 2–4 IO 复签 / G2 评审；agent 不代签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ IO 复签待完成；旧草稿边界已记录 |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | G1 Revision 2–4 仅 SA 已签，IO Emily 尚待具名复签；G2 不应在复签前通过 | [fact] | `openspec/changes/.../g1-decision.md` | G2 前完成 IO 具名复签，转 Pass |
| 2 | 极旧的 A 组草稿若 `steps=[]` 且 legs=2，前端会合成 1 站但保留 2 段，保存会被新校验拒绝 | [inference] | `screen-routes.tsx` / `RoutePairEdit` | 对这类草稿走“重新生成”或后续补兼容归一化；建议观察是否有真实存量 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `FixtureBranchCandidateProvider.Branch.bufferMinutes` 在 B buffer 归零后已不再被读取 | [fact] | `FixtureBranchCandidateProvider.java` | 后续清理死字段，减少误读 |
| 2 | 「主线·」清洗正则前后端各一份 | [fact] | `RoutePairEdit.cleanStationName` / `station-name.ts` | 目前仅两处、语义简单；如再扩散再抽公共契约 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | G1 IO 复签未完成 | 人工签核待办 | tracking；G2 前完成，不代签 |
| 2 | 旧 A 组草稿（无 steps、2 legs）保存可能失败 | 历史数据兼容性 | accepted；提示重新生成，必要时后续补迁移 |
| 3 | E2E 使用本机 Chrome channel | 本机 Playwright 浏览器版本缺失 | mitigated；同一套件在 CI 使用 Playwright 官方浏览器，本地 85/85 已通过 |

## Human review assist

- 风险带：M（涉及行程数据写入与权限内编辑，但无资金/不可逆操作；已有 CAS/事务/回滚）。
- E1 Pass / E2 Pass / E3 Pending。
- WARNING 建议：① IO 复签后再进 G2（accept+remedy）；② 旧草稿兼容作为跟踪项（need-more-info：确认是否存在存量活跃草稿）。
- 红线：未绕过鉴权、无密钥/PII 泄漏、无不可逆迁移；未以“AI 说 Pass”替代人工签核。

## Waiver

N/A — no waiver.
