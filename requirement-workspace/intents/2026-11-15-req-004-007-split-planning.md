# 意图捕获 — B 拆分主链四 story 合并澄清（REQ-004~007）

- 日期: 2026-11-15
- 来源: GitHub 仓库 `afs-2026-zha1-group-1/gogo` issues #17/#18/#19/#20（Project 看板，均 Open / Priority Must / Category Split Planning，用户已 pick 到 Req Analysis 列）
- 捕获方式: 编码代理通过 `gh issue view`（绝对路径调用）逐字读取 issue 正文（2026-11-15 本会话，JSON 快照核对后删除）
- REQ 映射: REQ-004 = US-038（#17）、REQ-005 = US-039（#18）、REQ-006 = US-042（#19）、REQ-007 = US-043（#20）
- 本轮范围: **四个 story 合并澄清**（用户 2026-11-15 裁决，取代上一轮「先做 US-038」口径）
- 上游: P0 brief（`docs/ai4se-plugins/20261115-104016-repo-understand-brief.md`）；技术基准 = 4 表精简版 `docs/knowledge/architecture/tech-stack-plan.md`；story 权威清单 = `docs/knowledge/domain/shared/story-list-mvp.md`
- 分支: `sdd-req-004-split-planning`（P0 已提交并推送：e0930b4 / d9ba8d1 / f0c7a5c）

## 共同测试上下文（四个 issue 正文一致声明）

> Synthetic Singapore Friends Day trip on 2026-12-05, Asia/Singapore (+08:00).
> Alice is organizer; Ben, Chloe, and Daniel are members. Split scenarios use
> version 1 of the confirmed main plan; group assignments may be supplied test
> fixtures.

- 行程: 新加坡朋友日游，2026-12-05，时区 Asia/Singapore（+08:00）
- 成员: Alice（organizer）、Ben、Chloe、Daniel（members）
- 拆分场景一律用**已确认主线 v1**；分组可由测试夹具供给
- US-043 额外声明: A 组 = Alice+Ben，B 组 = Chloe+Daniel；出发 City Hall MRT 09:30、会合 Merlion Park 11:30；每条路线 60 分钟活动 + 10 分钟 buffer；分组与会合解析可由夹具供给

## 逐字 story 意图（节译，关键句保留原文）

### US-038 — Start a Split Draft（issue #17 → REQ-004）

- 层: Frontend Yes | Backend Yes | Database Yes (Read/Write)
- 意图: As a trip member, I would like to start the trip's single split draft
  from a confirmed main plan before or during travel, so that different
  interests can be accommodated without creating competing splits.
- AC1: 主线已确认且未用过拆分，Ben 于 09:00 发起 → 创建一个关联已确认主线的草稿，发起人为 Ben。
- AC2: Alice 与 Ben 并发发起 → 最多一个活跃草稿，另一请求收到冲突响应（conflict response）。
- Design scope: 已确认主线前置条件 + 发起动作；强制一个活跃草稿与冲突处理；
  **取消后的替换遵循 US-050，不得从演示措辞推断不可逆限制**。
- UI 参考: Screen 11 - Start split draft（截图为呈现参考，非额外 AC）。

### US-039 — Select Split Boundaries（issue #18 → REQ-005）

- 层: Frontend Yes | Backend Yes | Database Yes (Read/Write)
- 意图: As a split initiator, I would like to select departure and reunion nodes
  with a positive usable time window, so that both routes have fixed locations
  and a clear reunion deadline.
- AC1: Ben 09:00 发起草稿后选 City Hall MRT 为出发、Merlion Park 为会合 →
  出发 = City Hall MRT 的 scheduled end 09:30，会合 = Merlion Park 的 scheduled start 11:30，窗口 120 分钟。
- AC2: 草稿状态下选 Merlion Park 出发（scheduled end 12:00）、City Hall MRT 会合
  （scheduled start 09:00）→ 非正窗口被拒绝，已保存边界不变。
- AC3: Singapore Zoo 不在已确认主线的 stop 中 → 选择被拒绝，不得创建无关会合点。
- Design scope: 出发/会合选择器 + 正窗口反馈；**选项只能来自已确认主线的 stop**，
  使用其 scheduled end/start 时间；非法选择不得持久化。
- UI 参考: Screen 12 - Split boundaries。

### US-042 — Generate Group-Specific Routes（issue #19 → REQ-006）

- 层: Frontend Yes | Backend Yes | Database Yes (Read/Write)
- 意图: As a split initiator, I would like to generate one route per group using
  its members' preferences and fixed split boundaries, so that both groups
  receive suitable separate activities.
- AC1: 草稿含 A 组（Alice+Ben）、B 组（Chloe+Daniel），出发 City Hall MRT 09:30、
  会合 Merlion Park 11:30，用 **fake branch candidates** 生成 → 恰好两条路线**成对一起保存**：
  A 去 National Gallery Singapore，B 去 Gardens by the Bay；两条均起于 City Hall MRT、终于 Merlion Park。
- AC2: A 生成成功但 B 失败 → 显示错误，**不得保存可确认的半成品对**。
- AC3: 为草稿 v1 启动生成，期间 Ben 移动分组使草稿变 v2，v1 结果返回 →
  **按过期（stale）拒绝，不得覆盖 v2**。
- Design scope: supplied 分组成员、生成动作、成对路线结果；截图中的分组编辑/移动控件为**可选**；
  必须保留原子成对生成与过期结果拒绝。
- UI 参考: Screen 13 - Group routes。

### US-043 — Check the Reunion Travel Window（issue #20 → REQ-007）

- 层: Frontend Yes | Backend Yes | **Database: No (Validate supplied snapshot)**
- 意图: As a trip member, I would like to have both routes checked for activity
  time, all travel legs, and a buffer within the split window, so that we can
  reach the reunion point by the deadline.
- AC1: 窗口 120 分钟、每条路线含 10 分钟 buffer → A = 15+60+20+10 = 105，
  B = 20+60+20+10 = 110，双双通过。
- AC2: A 的最后一段交通改为 40 分钟 → A = 125，**超窗 5 分钟，拦住整对确认**。
- AC3: A 的时长或末段交通估算缺失 → 指出缺失输入，**不得宣布整对时间可行**。
- Design scope: 两条路线的活动/交通/buffer 分解 + 通过/超窗/缺输入反馈；
  **用 120 分钟夹具窗口，不得写死演示时长**；缺失估算不得呈现为通过。
- UI 参考: Screen 14 - Route timing check。

## 共同约束（四个 issue 正文一致声明）

- "Acceptance criteria and `acceptance-test-fixtures.md` govern behavior and
  sample values."（夹具文件现为 REQ-003 口径未提交稿，B 链值需扩展）
- "Required error, empty, loading, and permission states must be implemented
  even when not pictured."
- 截图仅为呈现参考，不是额外 AC。

## 会话内已确认事实（本会话 P0 实测）

| # | 事实 | 证据 |
|---|---|---|
| 1 | 技术基准 = 4 表精简版 tech-stack-plan（trip/trip_member/member_preference/plan_node，`X-Member-Id`，`{data,error}` 包封套，SQLite 三铁律，DR-01~11） | 用户 2026-11-15 提供并裁决覆盖旧 7 表版；`docs/knowledge/architecture/tech-stack-plan.md` |
| 2 | main 后端仅 `com.gogo.hello` + V1 迁移；`application.yml` 无 WAL/busy_timeout/池=1 | P0 brief R1；backend 实测 |
| 3 | REQ-003（trips）与主线确认（US-037）均未在 main 实现；B 链上游需夹具自包含 | P0 brief §2；git 实测 |
| 4 | 前端现状纯 JSX + fetch；tech-stack-plan 目标 TS + AntD + TanStack Query + Router | P0 brief R4 |
| 5 | Rules 权威树已重建（java+react），P0 DoV Overall Partial（缺 branch/pipeline/env/IaC/NFR 专项） | `20261115-105236-quality-checklist-report.md` |
| 6 | UI 参考节点 11~14 在仓内可用（截图 + 原型） | `ui-design-reference/` |

## 待裁决问题（已全部裁决，2026-11-15）

- OQ-1 上游依赖边界 → **resolved**：夹具自包含（迁移种子供给行程/成员/已确认主线 v1，不等 REQ-003/US-037）。
- OQ-2 身份与发起权限 → **resolved**：按 tech-stack-plan 邀请码+昵称、`X-Member-Id` 头；任意 trip 成员可发起；REQ-003 草稿 X-User-Id 口径作废待对齐。
- OQ-3 候选供给机制 → **resolved**：可替换提供者接口（BranchCandidateProvider）+ MVP 固定夹具实现。
- OQ-4 打包粒度 → **resolved**：每 story 一个 REQ（REQ-004~007）；一个 B 链 change 承载四个 delta。
- OQ-5 草稿版本语义 → **resolved**：任何草稿变更（分组移动/边界重选/路线重生成）draft_version+1；生成结果携带发起时版本，落库前条件校验，不符即 stale 拒绝。
- OQ-6 夹具扩展 → **完成**：`acceptance-test-fixtures.md` 已补 B 链段（行程/成员/stop 时刻表/分组/候选/时长算式/四组请求用例）。
- OQ-7 REQ-003 遗留处置 → **resolved**：保留不提交，B 链另写夹具段；REQ-003 正式立项时再处置。

### 非阻塞项逐项澄清裁决（用户选择「全部现在澄清」，2026-11-15）

- OQ-N1 口径对齐 → **维持现状**（用户明确），仅留 OQ-N1 待未来处理，owner IO/SA。
- OQ-N2 基准扩展 → **严格按照 tech-stack-plan**：不建第 5 表、不加 plan_node 列；草稿 = `trip.split_draft` JSON 文档（唯一 schema 扩展 = trip 加一个可空 TEXT 列）；路线用 branch_id 编码关联。
- OQ-N3 前端共存 → **增量引入新栈**：B 链新页面 TS+AntD+TanStack Query+Router，greeting 页保持 JSX 不动。
- OQ-N4 半边界 → **确认成对保存**，不开放半边界。
- OQ-N5 分组载体 → **草稿内 JSON**，不建独立表；成员不跨组/两组齐全由服务层校验。
- OQ-N6 校验入参 → **显式快照 body**，纯计算零读库；前端从草稿详情组装快照。
- OQ-N7 + NFR → **确认记录备查、不发明**；US-049 消费方式留其实现者，保留期/SLA 留 Dev。

## 非阻塞遗留（记录备查）

- 与 REQ-003 的口径对齐（身份 / trip 表结构）→ owner IO/SA，B 链按 tech-stack-plan 先行
- 前端新栈与现有 JSX 共存策略 → P3 设计，owner Dev
- 与 US-037 未来实现者的「主线确认状态」读取契约对齐 → owner 未来 US-037 实现者
- US-049（确认拆分）/ US-050（取消草稿）为同链后续 story，本轮不澄清，但 US-038 的「取消后可替换」语义需为其留口