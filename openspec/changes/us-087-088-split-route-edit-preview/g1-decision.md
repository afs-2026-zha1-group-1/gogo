# G1 decision — us-087-088-split-route-edit-preview

- Gate: G1 (Align)
- Timestamp: 2026-11-18 (+08:00)
- Branch: `US-087-088-p0`
- PR: #135

## Inputs

- Proposal: `openspec/changes/us-087-088-split-route-edit-preview/proposal.md`
- Delta Spec: `openspec/changes/us-087-088-split-route-edit-preview/specs/splits/spec.md`
  - 1 ADDED requirement（`Split route pair edit` / 6 scenarios）
  - 4 MODIFIED requirements（`Group route generation` 8 / `Reunion timing check` 12 /
    `Split draft detail read` 7 / `Split confirmation` 10）
  - 共 43 scenarios；`openspec validate --strict` = valid（deltaCount = 5）
- AC/DoV review: `openspec/changes/us-087-088-split-route-edit-preview/dov-ac-review.md`
  （AC 4/4 Pass、DoV 5/5 Pass；P1 18 场景 → delta 场景映射 0 遗漏）
- Requirement source: `requirement-workspace/requirements/US-087-088.md`
- Pre-spec support: `analysis/us-087-088-dor.md`（BLOCKER 0 / blocking OQ 0）、
  `deep-dive.md` §US-087-088、`impact-brief.md` §US-087-088
- P0 report: `docs/ai4se-plugins/20261117-215840-quality-checklist-report.md`（Overall Partial，仅 Rules 存量缺口）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | Aligned：单 change 覆盖「路线编辑保存 → 下一步保存+校验 → 队伍路线预览」；`splits` 1 ADDED + 4 MODIFIED；零迁移、零新依赖；费用/必做标识/通知/地图移出 |
| Ambiguity | Blocking OQ BQ-1…BQ-6 全部 resolved；D-1…D-4 resolved；D-5 明确另立。无未决 blocking 项 |
| Conflict | 解决三处既有口径冲突：① Screen 13 只读 → 可编辑；② Screen 14 独立校验页 → 第 2 步「下一步」触发 + 只读预览；③ Screen 15 返回目标 `/split/timing` → `/split/preview`。MODIFIED 保留 Living Spec 全部原场景标题（脚本核对 0 missing） |
| Verifiability | 43 条场景均为可观察断言：HTTP 码/`error.code`、`draftVersion`、`plan_node` 与文档写入、弹窗字段、路由 URL、只读态 |
| Contract extension | 新增 `INVALID_ROUTE_INPUT`（400）与 `GroupRoute.locationName`（additive）；IO 已复核接受 |
| Residual | 非阻塞：P3 补 `acceptance-test-fixtures.md` §US-087-088；旧 `/split/timing` 重定向与 Screen 15 返回需 P3/P4 回归；双写事务与版本 CAS 由 P3 设计固化 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-18 |
| IO | Emily | **Pass** | 2026-11-18 |

IO Emily 的 Pass 由用户在本会话明确转达后记录（代记），代理不代签、不独立核验签署人身份；SA Leo 由用户本人签署。

## Decision: Pass

Rationale：Delta 与 proposal / P1 需求 / impact 一致；AC 4/4、DoV 5/5 全部 Pass；无阻塞 OQ 或 DoF 缺口。三处既有契约冲突均以 MODIFIED 收敛并保留原场景；新增错误码与权限面（任意成员编辑、仅发起人生成）已经 IO 复核接受。

## Conditions

无阻塞整改项（Decision = Pass）。

### Non-blocking residuals（carry into P3/P4）

| # | Item | Owner | Target |
|---|---|---|---|
| N1 | `acceptance-test-fixtures.md` 增补 §US-087-088（保存/校验/预览矩阵，沿用 A/B 各 2 人夹具） | Dev | P3 |
| N2 | `design.md` 固化双写事务（`plan_node` + 文档 `routes`）与 `draftVersion` CAS 失败回滚 | SA/Dev | P3 |
| N3 | `screen-timing` 移除、`/split/timing` 重定向、Screen 15 `backTo` 改预览的回归项 | Dev | P3/P4 |
| N4 | 失败弹窗信息项与预览页文案按 D-3/D-4 实现 | Dev | P3/P4 |

## Revision（2026-11-18，合并 origin/main US-089 后）

- Trigger: `origin/main` 已归档 US-089（A 组改为 `RouteStep` 站点序列，生成时 A 合计 = 时间窗），与本变更原「A/B 均改三项分钟」口径冲突。
- Rebaseline: 4 条 MODIFIED 复制 US-089 最新正文并保留全部原场景（含 G7）；新增 A `steps` 编辑、S2b、N3a；`openspec validate --strict` = valid（deltaCount = 5 / 46 场景）。
- Product ruling（SA）: A 组按站点逐项编辑停留/路程，服务端派生合计；合计 SHALL ≤ 时间窗，超窗由下一步弹窗阻断。
- AC/DoV: 仍为 AC 4/4 Pass、DoV 5/5 Pass（Revision review 见 `dov-ac-review.md`）。

| Role | Name | Revision decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-18 |
| IO | Emily | **Pass（代记）** | 2026-11-18 |

IO Emily 的 Revision Pass 由用户在本会话明确转达后记录（代记），代理不代签、不独立核验身份。

Revision Decision: **Pass**。非阻塞承接同 N1–N4，新增：P3 design 需定义 A `steps` 编辑控件与派生合计算法，P4 E2E 补 S2b/N3a。

## Next

G1 Pass（含 Revision Pass）→ 进入 P3：`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist stage=p3`。本记录不是 G2/G3 决定。
