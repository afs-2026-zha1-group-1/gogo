# Change summary — us-049-050-split-confirm-cancel

- **Change id:** `us-049-050-split-confirm-cancel`
- **Stories:** issue #21 US-049（Confirm the Split）+ issue #22 US-050（Cancel an Unconfirmed Split）
- **Archived:** `openspec/changes/archive/2026-11-17-us-049-050-split-confirm-cancel/`（2026-11-17，`openspec archive` 合并 delta：+2 added / ~5 modified）
- **Delivery:** `main` 直开发（用户裁决，无 PR）；实现 `64060f5`、查看入口修复 `60f44d1`、G2 记录 `3f7758f`
- **Gates:** G1 **Pass**（SA Leo + IO Emily，C7 已 closed）→ G2 **Pass**（VL Elian Jiang）→ G3（本摘要后由 SA 签核）

## Intent

补齐 B 拆分链的最后一段：在既有「发起 → 边界 → 生成 → 校验」之外，提供组织者确认（服务端重校验后把路线对/分组/边界冻结为唯一方案）与发起人取消（放弃未确认草稿并允许替换）。同时修正 Living Spec 与 main 代码的三处漂移（身份、草稿载体、迁移编号）。

## What shipped

- **两个新端点**：`POST /api/trips/{tripId}/split-draft:confirm`、`POST /api/trips/{tripId}/split-draft:cancel`（body `{draftVersion}`，200 返回草稿详情投影）。
- **确认**：守卫 → 组织者（`NOT_SPLIT_ORGANIZER`）→ 活跃草稿 → 版本 → 完整性（`SPLIT_DRAFT_INCOMPLETE` + `details.missing`）→ **服务端从草稿复算**（复用 `ReunionTimingCalculator`；超窗/缺输入 → `SPLIT_TIMING_INFEASIBLE` + `details.routes[]`）→ CAS 置 `confirmed`（列版本不变）→ 写端点自此 409。
- **取消**：单事务「`status=cancelled` + 清空 `document.routes` + 删除 split-a/b `plan_node`」，主线逐行不变；`startDraft` 在 cancelled 行上同行重建（列版本重置 1，并发只一人成功）。
- **错误契约**：`ApiResponse.ApiError`/`ApiException` 增可选 `details`（包封套向后兼容）；`ErrorCode` +3。
- **可空时长模型**：`RouteDurations`/`GroupRoute` 时长改 `Integer`，使「缺输入」可表达。
- **前端**：新增 Screen 15（复核/确认/取消 + 四态 + `error.details` 渲染）；Screen 11/14 按 `status` 分支；确认后提供「查看已确认分队」入口。
- **身份**：随 US-066 会话认证整合，端点改用 `Authentication` + `caller()`，`SecurityConfig` split-draft permitAll 匹配器补 `:confirm`/`:cancel`；Living Spec Purpose 已同步为会话身份、`split_draft` 表、V4 迁移、状态机与 `error.details`。

## Verify highlights

- 后端 `mvn -B test` **214/214**（新增 50：confirm 12 / cancel 6 / start +3 / detail +2 / domain 6）；前端 `tsc --noEmit` + `vite build` 绿。
- 浏览器 E2E E1–E11：**10 Pass / 1 N/A**（N/A = 未登录跳转，缺 logout 端点属 US-069）；超窗错误卡实测渲染「A 合计 125 · 超窗 5 / B 110」。
- local-verify **Overall Pass**（`docs/ai4se-plugins/20261116-174102-local-verify-report.md`；V1–V8 全 Pass，白名单 6/6）。
- CI（`ci-report.md`）：`43839036207`@`60f44d1`、`43833884672`@`64060f5` 双 job success（E1 全绿）。
- `openspec validate --strict` valid（7 requirement / 51 scenario）；归档后 Living `splits` = 7 requirement / 51 scenario。

## Residual risks / follow-ups

| # | 事项 | 性质 |
|---|---|---|
| F1 | E2E 发现 3 处 UX nit（取消后残留旧错误卡、cancelled 仍显示生成 CTA、报错页仍显示发起入口） | 非阻塞，待小修 |
| F2 | C10「409 后重新 GET 判定是否已成功」重试 UX 仅部分落地 | 非阻塞 |
| F3 | `tech-stack-plan` §18 对账 + Living Purpose 覆盖（本摘要同批完成） | 归档必做（已完成） |
| F4 | 残留 change 清理（空壳 `req-004-split-draft-start` 等） | 非阻塞 |
| F5 | US-069 落地 logout 后补测 E11 未登录跳转子项 | 非阻塞 |
| R1 | **确认后不可再拆/不可编辑**：US-049 AC1 + US-050 AC2 + US-038「每行程一次」共同冻结；用户已提出「确认后想改」诉求，需新需求（版本化重拆）走 P1 | 产品契约，本 change 不做 |

## Downstream read contract（C9/D13）

后续 story（US-052 查看自己路线 / US-058 完成共享行程 / US-063 重聚倒计时）判断「是否已拆分/已确认」时，**只读** `GET /api/trips/{tripId}/split-draft` 的 `status`：`confirmed` = 已确认拆分；`active` = 拆分进行中；`cancelled` 或 `data=null` = 未拆分。**禁止**按 `split_draft` 行是否存在判定（取消后行仍保留），也不得直接读 `plan_node` 推断状态。

## Links

- Delta：`specs/splits/spec.md`（archive 内）→ Living：`openspec/specs/splits/spec.md`
- G1：`g1-decision.md`；G2：`g2-decision.md`；CI：`ci-report.md`；AC/DoV：`dov-ac-review.md`；lint：`consistency-lint.md`
- Design/tasks：`design.md`（D1–D16）、`tasks.md`（33/37，余 4 项为 P5 文档）、`atdd-design.md`
- 需求侧：`requirement-workspace/requirements/US-049-050.md`、`analysis/us-049-050-dor.md`、`acceptance-test-fixtures.md` §US-049-050
- 验证：`docs/ai4se-plugins/20261116-174102-local-verify-report.md`、`docs/feedback/e2e-us-049-050.md`
