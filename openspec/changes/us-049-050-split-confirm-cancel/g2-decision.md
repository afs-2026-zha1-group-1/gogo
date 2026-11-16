# G2 decision — us-049-050-split-confirm-cancel

- **Gate:** G2（Verify）
- **Decision:** **Pass**
- **Approvers:** VL = **Elian Jiang**（2026-11-16，经用户转达的口头 Pass；按先例由代理代记，非代理自批）
- **Timestamp:** 2026-11-16（+0800）
- **Change id:** `us-049-050-split-confirm-cancel`
- **Target:** `main` 直开发（用户 2026-11-16 裁决，无 PR）；验收头 `60f44d1`，实现头 `64060f5`

## Inputs

- **local-verify:** `docs/ai4se-plugins/20261116-174102-local-verify-report.md` — **Overall Pass**（Build/Static/Code review/Evidence 四项 Pass；V1–V8 全 Pass；E1 Pass、E2 Pass、E3 Pending→本记录签核）。
- **checkpoints:** `docs/ai4se-plugins/20261116-173657-local-verify-report-checkpoints.md`；命令清单 `20261116-173659-local-verify-commands.txt`；运行日志 `20261116-173712-local-verify-run.log`。
- **pipeline ci:** `openspec/changes/us-049-050-split-confirm-cancel/ci-report.md` — run `43839036207`@`60f44d1` 与 `43833884672`@`64060f5` 双 job success；**E1 = 全绿**（main push 触发，非继承绿）。
- **pipeline cd:** n/a（合并前不部署）。
- **验收脚本与实测:** `docs/feedback/e2e-us-049-050.md` — E1–E11：**10 Pass / 1 N/A**（E11 的"未登录跳转"子项因无 logout 端点、属 US-069，标 N/A 并记录）。
- **Spec/Design/Tasks:** `specs/splits/spec.md`（7 req / 51 场景，`validate --strict` valid）、`design.md`（D1–D16）、`tasks.md`（32/36 完成，余 4 项为 P5 归档范围）、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`（Pass，C7 已 closed）。

## Dimension results

| Dimension | Status | Evidence |
|---|---|---|
| Build | Pass | 本地 `mvn -B test` 214/214、`npm run build`（tsc + vite）绿；CI 双 job 绿 |
| Static scan | Pass | 白名单 6/6（反向 grep ×4 + CI YAML 断言 ×2）；`openspec validate --strict` valid |
| Code review | Pass | 分层/事务/CAS/错误契约/可空模型/前端状态分支均符合 D1–D16；无 CRITICAL 发现 |
| Evidence (OpenSpec) | Pass | V1–V8 Pass；五问 Q1–Q5 全 ✅ |
| E2E（浏览器） | Pass（1 N/A） | `docs/feedback/e2e-us-049-050.md`：确认成功/非组织者 403/超窗明细/取消+替换/终态查看/权限与错误态全部实测；logout 子项 N/A（US-069） |

## Defect grades

- **CRITICAL: 0**
- **WARNING（非阻塞，已承接）:**
  - W1 — 3 处 UX nit：取消后残留上一次确认错误卡；cancelled 草稿仍显示「去生成路线」；detail 报错页仍显示「发起分队草稿」。
  - W2 — E11「未登录跳转」N/A（无 `POST /api/auth/logout`，US-069 范围）。
  - W3 — 本机 `backend/data/gogo.db` V2 校验和不匹配且被 IDE 占用；验收改用 `gogo-us049.db` 临时库（文档已记录 workaround）。
- **SUGGESTION: 2** — PyYAML 不在企业镜像（已用公网 PyPI 安装后 6/6）；残留 change 目录清理（C6）。

## Decision rationale

local-verify **Pass** + pipeline ci **E1 全绿**（非继承）+ 0 CRITICAL + G1 条件 C1/C2/C7 已 closed（C8/C9 由 design closed），满足 G2 Pass 的输入要求。G1 中明确"不得进入 P4/G2"的阻塞项已全部闭合；其余为文档已登记的非阻塞承接项（C10 重试 UX、C11 P5 文档、C6 清理、W1 UX nit），不构成 G2 阻塞。

## Conditions + owners（非阻塞承接，合并/归档前跟踪）

| # | 事项 | owner | 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| F1 | 修复 W1 三处 UX nit（错误卡清理 / cancelled 隐藏生成 CTA / 报错页隐藏发起入口） | Dev | P5 并行或下一轮 | 非阻塞 | pending |
| F2 | C10：409 后重新 GET 判定是否已成功的重试 UX | Dev | 后续迭代 | 非阻塞 | partial |
| F3 | C11：`tech-stack-plan` 补 `:confirm`/`:cancel` 两行 + 3 个错误码 + `error.details`；living-merge 用 delta Purpose 覆盖旧链级约定 | SA / Dev | P5 | 非阻塞（归档必做） | 待 P5 |
| F4 | C6：清理空壳 `req-004-split-draft-start` 与未归档 `req-002` | Dev | 可并行 | 非阻塞 | pending |
| F5 | W2：US-069 落地 logout 后补测 E11 的未登录跳转子项 | Dev（US-069） | US-069 完成时 | 非阻塞 | pending |
| F6 | W3：本机 `gogo.db` 修复（`flyway repair` 或删库重建） | Dev（本机） | 随时 | 非阻塞 | pending |

## Waiver

无（无 Fail，不需要 Waiver）。

## Next

- **G2 = Pass** → 进入 P5 归档车道：`/sdd:living-merge`（delta → Living Spec `splits`）+ `/sdd:change-summary` + F3 知识库对账 → `/sdd:g3-decision-record`（SA 签核）。
- F1–F6 为非阻塞承接，其中 **F3 为归档必做**。
- 本记录不重跑 apply、不取 CI/CD、不改 Living Spec、不代签 G3。
