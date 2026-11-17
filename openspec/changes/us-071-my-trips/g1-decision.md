# G1 decision — us-071-my-trips

- Gate: G1 (Align)
- Timestamp: 2026-11-16（记录时间，+08:00）
- Branch: `main`（用户 2026-11-16 裁决：main 直开发、无特性分支/PR）

## Inputs

- Proposal: `openspec/changes/us-071-my-trips/proposal.md`
- Delta Spec: `openspec/changes/us-071-my-trips/specs/trips/spec.md`（1 ADDED requirement / 8 场景）
- Delta Spec: `openspec/changes/us-071-my-trips/specs/app-shell/spec.md`（1 MODIFIED requirement / 11 场景）
- AC/DoV review: `openspec/changes/us-071-my-trips/dov-ac-review.md`（AC 4/4 Pass、DoV 5/5 Pass）
- OpenSpec 校验：`openspec validate us-071-my-trips --strict` = valid（deltaCount = 2）
- Requirement source: `requirement-workspace/requirements/US-071.md`（DoR：`analysis/us-071-dor.md`，BLOCKER = 0）
- Deep-dive: `requirement-workspace/deep-dive.md` §US-071（⑨–⑫ 全 Pass，A0 Pass）
- Impact brief: `requirement-workspace/impact-brief.md` §US-071
- Story: GitHub issue #45（`Iteration 1`、`Priority - Must`、`Type - Trip Setup`）

## Check conclusions

| Dimension | Finding |
|---|---|
| Scope | 对齐：`trips` 新增 1 条只读列表读取（成员范围、包封套、排序契约）；`app-shell` 修改 1 条行程 tab 放置要求（tab 恒落 `#/trips`、空态只留创建入口、详情页承接主线方案入口）。零迁移、零新依赖、不改 `SecurityConfig`、不改既有四个 trip 端点 |
| Ambiguity | blocking 开放问题未 resolved = 0；九项裁决已固化（tab 落点、端点形状、已结束呈现、移除编号入口、主线入口、不做分页/搜索、显示「我创建的」徽标、手写 `api()`、AC7 仅 API 层验收） |
| Conflict | `app-shell` 原 requirement 明文写着「本变更 SHALL NOT 新增列出全部行程的端点或调用」，且空态要求「创建行程 + 按编号打开行程」，与本故事 AC1 直接冲突 → 已以 MODIFIED 收敛（旧禁令删除、编号入口移除）；与其他 Living Spec 无冲突 |
| Verifiability | 19 条场景（trips 8 + app-shell 11），全部为可观察结果（HTTP 状态、字段集、路由、行内徽标、重试动作）；AC/DoV 复核发现的两处覆盖缺口（S8 loading/失败重试、S13 详情页主线入口）已在复核阶段补场景并重新校验通过 |
| Residual | 见下方「Residual notes」，均为非阻塞承接项 |

## Approvers

| Role | Name | Decision | Date |
|---|---|---|---|
| SA | Leo | **Pass** | 2026-11-16 |
| IO | Emily | **待补签** | — |

SA 的 Pass 按用户 2026-11-16 的指令代记（用户本人担任 SA，签核名 Leo）；代理不独立核实签署人身份，也不代 IO 签署。

## Decision: Conditional

Rationale：delta 与 AC/DoV 复核无阻塞缺口，SA 已 Pass；但 G1 要求 IO + SA 双具名签核，IO Emily 尚未具名签核（按本仓约定在代码 push 后补签）。因此本记录记 **Conditional**，唯一整改项为 IO 具名补签，补签后升级 Pass。

## Conditions

| # | Condition | Owner | Deadline | Status |
|---|---|---|---|---|
| C1 | IO Emily 对本期 delta 与 `dov-ac-review.md` 具名签核（push 后补签） | Emily（IO） | P3 开工前 | **open** |

C1 关闭即把 Decision 改为 `Pass`，并在本文件追加签署提交/时间；在此之前的任何实现都属 P3，不得据此声称 G1 Pass。

## Residual notes（非阻塞，承接至 P3/P4）

- 标题撞名：`frontend/src/pages/Home.tsx` 的仪表盘页标题现为「我的行程」，与新列表页标题同名，违反 app-shell「每个 tab 页唯一可见标题」；P3 定文案（建议列表页「我的行程」、Home 改「仪表盘」）。已记入 `proposal.md` 的 Open design item。
- AC7（切换账号）只在 API 层验收（两个独立会话互不可见）；UI 层补测归 US-069（issue #41，看板 Req Analysis，elian-jiang 认领）。
- `acceptance-test-fixtures.md` 尚无 §US-071；P3 ATDD 设计必须补（列表行、排序、双 401、空账号、已结束行程）。
- SA：排序契约（`start_date` 升序 → `id` 升序）须在集成测试中锁定；「已结束」为前端本地日期判定，仅显示层语义，跨时区差异接受。
- 技术栈偏离：列表用手写 `api()` + `useEffect`（用户裁决），与 `tech-stack-plan` 计划的 TanStack Query 不一致，已记录在 proposal，不在本变更迁移。

## Closure path

C1（IO 补签）关闭 → Decision 升级 **Pass** → 进入 `/sdd:atdd-design` + `/sdd:task-plan`（P3）。若 IO 复核提出新的业务级缺口，需回到 `/sdd:delta-craft` 修补 delta 后重开本记录；不得以 Conditional 直接开工 P4。
