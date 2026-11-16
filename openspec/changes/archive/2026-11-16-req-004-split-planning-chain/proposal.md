# Proposal — req-004-split-planning-chain

- 状态: **G1 评审稿**（P2 review correction; delta is present, design/tasks remain out of scope; IO Emily approved 2026-11-15; SA re-review pending）
- 日期: 2026-11-15
- 需求来源: REQ-004~007（US-038/039/042/043，GitHub issue #17~20 权威正文）
- 打包裁决: 用户 2026-11-15 OQ-4 —— 一个 B 链 change 承载四个 delta，不再按 story 拆多个 change
- 技术基准: `docs/knowledge/architecture/tech-stack-plan.md`（4 表精简版，P0 权威化）

## Why

主线行程确认后，成员希望「分两组各自自由活动半天、再按时会合」。B 拆分主链
把这条用户旅程拆成四个首尾相接的可观察能力：发起唯一拆分草稿（REQ-004）→
选择拆分边界并强制正时间窗口（REQ-005）→ 按分组偏好成对生成路线（REQ-006）→
校验会合时间窗口（REQ-007）。拆分的硬约束是「两组都能按时会合」：草稿必须
唯一且版本可控，路线必须成对原子，校验必须覆盖每条路线的全部交通段与 buffer，
超窗或缺输入都拦住整对确认。四环共享同一身份/版本/错误码契约，合并澄清可
避免链内口径漂移（deep-dive ⑪ 无未收敛 ✗）。

## What Changes

- **V2 迁移（Flyway 独占，V2 起编号）**：建 4 表 `trip` / `trip_member` /
  `member_preference` / `plan_node`；`trip.split_draft` 可空 TEXT 列为**唯一
  schema 扩展**（用户裁决 OQ-N2「按照 tech-stack-plan 来」：不建第 5 表、
  不加 plan_node 列）；自包含种子 = 1 行程（invite_code `SGF26A`、plan_version 1）
  + 5 成员（Alice owner，Ben/Chloe/Daniel 均 ack v1，Eve 属另一行程）+ 主线
  两 stop（City Hall MRT / Merlion Park）（OQ-1 夹具自包含，不阻塞 REQ-003/US-037）。
- **后端 splits 模块（5 端点，`{data,error}` 包封套，`X-Member-Id` 头）**：
  - `GET /api/trips/{tripId}/split-draft`: member-only consistent saved snapshot
    including versions, groups, stops, nullable boundaries/window and routes;
    no active draft -> `200 {data:null,error:null}`; no mutation or version increment.
  - `POST /api/trips/{tripId}/split-draft`（201，草稿启动；主线未确认拒绝）
  - `PUT /api/trips/{tripId}/split-draft/boundaries`（成对保存出发/会合边界，
    仅发起人；正窗口校验；边界必须在主线 stop 内）
  - `POST /api/trips/{tripId}/split-draft/routes:generate`（成对生成；
    单事务先删旧对再写新对；stale draft_version 拒绝）
  - `POST /api/trips/{tripId}/split-draft/routes:check-timing`（纯校验，
    显式快照 body；entry guard may read identity/trip/membership; calculator has
    no repository access or persistence; 整对 feasible 结论）
- Shared guards: missing/globally unknown member id -> `401 MEMBER_REQUIRED`,
  then unknown trip with known member -> `404 TRIP_NOT_FOUND`, then known outsider
  -> `403 NOT_A_MEMBER`. Rejections return `data=null` without private values.
- **草稿存储与并发**：草稿 = `trip.split_draft` JSON 文档（initiatorMemberId /
  mainPlanVersion / draftVersion / status / departureStopId / reunionStopId /
  groups / createdAt / updatedAt）；活跃唯一 = 每 trip 至多一份文档 + 条件更新
  （影响行数 0 → 409 `SPLIT_DRAFT_CONFLICT`）；任何草稿变更 draft_version+1
  （用户裁决 OQ-5），过期结果条件校验拒绝（`STALE_DRAFT_VERSION`）。
- **成对路线**：plan_node 行 `branch_id='split-a'/'split-b'` 按 trip_id 归属
  活跃草稿，不加列；时长存结构化 JSON（activityMinutes / travelLegsMinutes[] /
  bufferMinutes）；失败整对回滚，不留半对。
- **候选供给**：进程内可替换提供者接口 + MVP 固定夹具实现（用户裁决 OQ-3）；
  真实地图/路径服务属 R2 未来项，不在本期。
- **前端增量新栈**（用户裁决 OQ-N3）：TS + AntD 5 + TanStack Query v5 +
  React Router 7；新增 Screen 11~14 对应四页面（拆分启动 / 边界选择 /
  分组路线 / 时间校验）；greeting 页保持 JSX（vite 混编），行为不变。
- **移除残留 stub**：`openspec/changes/req-004-split-draft-start/`（仅
  `.openspec.yaml`，前次会话单 story 拆分残留，OQ-4 裁决后作废）已删除。

No breaking changes：greeting 能力与既有 V1 迁移不受影响；无既有 splits 契约。

## Capabilities

### New Capabilities

- `splits`：拆分规划链，含 5 条 requirement（four business REQs plus shared read）：
  - **Split draft detail read**（REQ-004 shared with REQ-005/006/007）: refresh,
    polling and timing snapshot assembly, with member-only and empty-state AC.
  - **Split draft start**（REQ-004）——从已确认主线发起唯一拆分草稿
  - **Split boundary selection**（REQ-005）——成对选择拆分边界并强制正时间窗口
  - **Group route generation**（REQ-006）——按分组偏好成对生成分组路线
  - **Reunion timing check**（REQ-007）——成对路线活动/交通/buffer 合计与窗口
    比较，超窗与缺输入拒绝，纯校验无写库

### Modified Capabilities

None。Living Spec 现有 `greeting`（`openspec/specs/greeting/spec.md`）不被
本 change 触碰；req-002 未 merge 的 greeting 漂移是独立 harness debt
（impact brief R2），不在本 change 处置。

## Impact

详见 `requirement-workspace/impact-brief.md` B 链段（as-is 盘点 + delta 对照）。

- **Requirement**: REQ-004~007（`requirement-workspace/requirements/`），
  deep-dive ⑨–⑫ B 链段，DoR `analysis/req-004-007-dor.md`（BLOCKER = 0），
  夹具 `acceptance-test-fixtures.md` B 链段。
- **Code**: 后端新增 splits 模块（controller/service/repository + 提供者接口
  与夹具实现）；前端新增四页面与新栈依赖；greeting 代码不动。
- **APIs**: 5 个新端点（见上）；错误码全集 = SPLIT_DRAFT_CONFLICT /
  MAIN_PLAN_NOT_CONFIRMED / NOT_A_MEMBER / MEMBER_REQUIRED / TRIP_NOT_FOUND /
  NONPOSITIVE_SPLIT_WINDOW / BOUNDARY_NOT_IN_MAIN_PLAN / NOT_SPLIT_INITIATOR /
  SPLIT_DRAFT_NOT_ACTIVE / STALE_DRAFT_VERSION / ROUTE_GENERATION_FAILED /
  SPLIT_BOUNDARIES_REQUIRED / INVALID_ROUTE_PAIR；超窗/缺输入 = 200 + feasible=false。
- **Dependencies**: 后端沿用现有栈（JdbcClient 无 ORM、SQLite 三铁律：池=1、
  WAL、busy_timeout=5000、foreign_keys=on）；前端新增 typescript / antd /
  @tanstack/react-query / react-router（入 lockfile，P4 验证 CI 安装）。
- **Runtime**: 同一后端进程 8080 + 同一 Vite dev server 5173；`./data/gogo.db`
  由 V2 扩展；无外部服务依赖。
- **CI**: `.github/workflows/ci.yml` 命令不变（mvn test / npm ci + build）；
  新依赖 lockfile 的 runner 可达性 P4 观察（impact brief R5）。
- **Docs / harness**: 本 workdir 产物已就位；`docs/ai4se-plugins/` 检查点与
  质量报告随阶段追加；KB 更新留 P5 living-merge。

## Effort and ordering

**Medium-large**。一个 change、一个能力、五条 requirement（四个业务 REQ + shared read）；链内依赖 DAG：

```text
REQ-004（草稿 + V2 迁移 + 种子）
   └→ REQ-005（边界成对保存）
         └→ REQ-006（成对路线生成）
               └→ REQ-007（纯校验；契约仅依赖快照结构，可与 006 并行）
前端四页面随后端契约逐环接入（Screen 11→12→13→14）
```

规模估算：1 迁移、5 端点、1 提供者接口 + 夹具实现、4 前端页面 + 新栈引入、
五组验收测试（S1~S7 / B1~B6-N / G1~G5-N / T1~T6-N / D1~D5-N）。无跨 change 依赖。
`/sdd:story-split` **Skipped**：四 story 已是需求条目粒度且用户裁决合并
（OQ-4），不重复拆敏捷 backlog（impact brief §6）。

## A0 deep-dive gate

REQ-004~007 均为 new 且 deep-dive 在范围内。`deep-dive.md` B 链段：
⑨ 数据契约（7 概念，严格 4 表 + JSON 文档，无 {TBD}）Pass；⑩ 边界枚举
（21 分支行覆盖全部场景引用）Pass；⑪ 跨 REQ 对齐（身份/版本/数据流/错误码
统一，与 REQ-003 草稿的 ✗ 由用户裁决收敛，无未收敛 ✗）Pass；⑫ 展示契约
（Screen 11~14 四表面齐全，无通知）Pass。→ **A0 Pass**，split permitted。

## 用户裁决记录（G1 评审依据，2026-11-15）

| 类别 | 裁决 |
|---|---|
| blocking OQ-1 | 夹具自包含（V2 种子），不阻塞 REQ-003/US-037 |
| blocking OQ-2 | 身份 = 邀请码+昵称，`X-Member-Id` 头（REQ-003 草稿 X-User-Id 口径作废） |
| blocking OQ-3 | 可替换提供者接口 + MVP 固定夹具实现 |
| blocking OQ-4 | 一个 B 链 change 承载四个 delta |
| blocking OQ-5 | 任何草稿变更 draft_version+1；过期结果条件校验拒绝 |
| blocking OQ-7 | REQ-003 遗留保留不提交 |
| OQ-N1 | 维持现状（与 REQ-003/US-037 对齐 deferred，owner IO/SA） |
| OQ-N2 | **按照 tech-stack-plan 来**：严格 4 表，草稿 = trip.split_draft JSON 文档 |
| OQ-N3 | 前端增量引入新栈，greeting 页保持 JSX |
| OQ-N4 | 边界确认成对保存，不开放半边界 |
| OQ-N5 | 分组存草稿内 JSON（groups:{A:[ids],B:[ids]}），不建独立表 |
| OQ-N6 | Explicit snapshot; calculator has zero database I/O. Review correction permits identity/trip/membership entry-guard reads only |
| OQ-N7 + NFR | 确认记录备查、不发明（US-049 消费方式 / 保留期 / SLA deferred） |

## Known deviations carried into later stages

- Original authoring lacked the OpenSpec CLI; the current environment has it.
  `openspec validate req-004-split-planning-chain --strict` now passes; the former
  schema-validation tool gap is closed. Human sign-offs remain separate.
- impact brief R1：REQ-003 草稿口径分叉（用户裁决维持现状，未来 US-037 对齐）。
- impact brief R2：req-002 G3 已签但未归档、Living greeting 旧口径（独立处置）。
- impact brief R4：SQLite 单写者并发/成对原子性 → P3 设计、P4 用例验证。
- impact brief R6：夹具文件混合提交边界 —— **resolved**（用户 2026-11-15 裁决
  拆成两个文件）：B 链权威夹具随 P1 提交；REQ-003 草稿拆至
  `acceptance-test-fixtures.req003-draft.md`（untracked 保留不提交）。

## 下一步（仅 /sdd:*）

1. P2 delta spec and review corrections are present: five requirements, 34 scenarios.
2. Review proposal + delta + AC/DoV + consistency lint together, then record G1
  explicitly. IO Emily approved the revised package on 2026-11-15; Leo's re-review
  of revised contracts remains pending.
3. Only after both approvals may G1 become Pass and P3 design/tasks begin.
4. No implementation or Living Spec merge is authorized by this document update.