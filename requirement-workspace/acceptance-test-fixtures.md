# Acceptance-test fixtures — B 拆分主链（REQ-004~007）

- Scope: US-038 / US-039 / US-042 / US-043（issue #17–#20）权威样本值。
- 新增: 2026-11-15；来源 = issue #17–#20 正文 + 用户裁决（见
  `intents/2026-11-15-req-004-007-split-planning.md`）与 `deep-dive.md` B 链段。
- REQ-003（US-001/002）遗留草稿段已按用户 2026-11-15 裁决拆至
  `acceptance-test-fixtures.req003-draft.md`（保留不提交，未生效）；
  本文件为 B 链权威夹具，随 P1 产物提交。
- **身份口径**: B 链按 `docs/knowledge/architecture/tech-stack-plan.md`：邀请码 + 昵称，
  请求头 `X-Member-Id`（成员 id）。REQ-003 草稿的 `X-User-Id` 口径已作废，
  对齐移交 IO/SA（OQ-N1 deferred）；本文件仅适用于 B 链 REQ-004~007。

## 行程与成员（种子，V2 迁移）

| 项 | 值 |
|---|---|
| 行程 | Singapore Friends Day，Singapore，2026-12-05 → 2026-12-05；id = 种子固定 UUID；invite_code = `SGF26A`；plan_version = 1 |
| Alice | owner，plan_ack_version = 1 |
| Ben / Chloe / Daniel | member，plan_ack_version = 1 |
| Eve | **另一行程**的种子成员（全局身份有效，非本行程成员） |
| 已确认态 | 全员 plan_ack_version = trip.plan_version（用户裁决谓词） |
| 未确认态构造 | 测试内将任一成员 plan_ack_version 置 0，验后还原 |

## 主线 v1 stop（plan_node，branch_id = main）

| stop | 本地时刻（Asia/Singapore +08:00） | UTC（存储值） |
|---|---|---|
| City Hall MRT | 09:00–09:30（scheduled end 09:30） | start_at 2026-12-05T01:00:00Z / end_at 2026-12-05T01:30:00Z |
| Merlion Park | 11:30–12:00（scheduled start 11:30，scheduled end 12:00） | start_at 2026-12-05T03:30:00Z / end_at 2026-12-05T04:00:00Z |

Singapore Zoo **不在**主线 stop 中（REQ-005 AC3 的越界选择用）。

## 拆分窗口与路线数字（issue 正文，REQ-005~007 用）

| 项 | 值 |
|---|---|
| 窗口 | City Hall MRT end 09:30 → Merlion Park start 11:30 = **120 分钟** |
| 分组 | A = Alice + Ben；B = Chloe + Daniel（夹具供给） |
| 路线 | A → National Gallery Singapore；B → Gardens by the Bay；均起 City Hall MRT、终 Merlion Park |
| 时长算式 | A = 15+60+20+10 = **105 通过**；B = 20+60+20+10 = **110 通过**；A 末段交通改 40 → **125，超 5 分钟，拦确认** |
| buffer | 每条路线 10 分钟；活动 60 分钟 |
| 并发 | Alice 与 Ben 同时发起 → 最多一个活跃草稿，另一收 409 SPLIT_DRAFT_CONFLICT |
| 版本 | 任何草稿变更 draft_version+1；v1 生成期间草稿变 v2 → v1 结果作废，不得覆盖 v2 |
| 原子性 | 一条路线生成失败 → 不得保存可确认的半成品对 |

## B 链请求（REQ-004 部分）

| Case | Call | Expected |
|---|---|---|
| S1 发起 | `POST /api/trips/{tripId}/split-draft`，`X-Member-Id: <Ben>` | `201`，data 含 initiatorMemberId=Ben、mainPlanVersion=1、draftVersion=1、status=active |
| S2 并发 | Alice 与 Ben 同时发起 | 一 `201` 一 `409` `SPLIT_DRAFT_CONFLICT`；活跃草稿数=1 |
| S3-N 未确认 | 构造未确认态后成员发起 | `409` `MAIN_PLAN_NOT_CONFIRMED` |
| S4-N 非成员 | `X-Member-Id: <Eve>` | `403` `NOT_A_MEMBER` |
| S5-N 无身份 | 缺失头或未知 id | `401` `MEMBER_REQUIRED` |
| S6-N 未知行程 | 不存在的 tripId | `404` `TRIP_NOT_FOUND` |
| S7 重复 | 已有活跃草稿再发起 | `409` `SPLIT_DRAFT_CONFLICT`，原草稿不变 |

## B 链请求（REQ-005 部分）

| Case | Call | Expected |
|---|---|---|
| B1 正窗口 | `PUT /api/trips/{tripId}/split-draft/boundaries`，`X-Member-Id: <Ben>`，body `{departureStopId:<City Hall>, reunionStopId:<Merlion>, draftVersion:1}` | `200`，出发 09:30、会合 11:30、窗口 120；draftVersion=2 |
| B2-N 非正窗口 | 反向选择（Merlion 出发 / City Hall 会合） | `400` `NONPOSITIVE_SPLIT_WINDOW`；已存边界与版本不变 |
| B3-N 主线外 | 任一边界选 Singapore Zoo | `400` `BOUNDARY_NOT_IN_MAIN_PLAN`；不创建无关会合点 |
| B4-N 非发起人 | `X-Member-Id: <Chloe>` | `403` `NOT_SPLIT_INITIATOR` |
| B5-N 无草稿 | 无活跃草稿时保存 | `409` `SPLIT_DRAFT_NOT_ACTIVE` |
| B6-N 过期版本 | 携带旧 draftVersion | `409` `STALE_DRAFT_VERSION` |

## B 链请求（REQ-006 部分）

| Case | Call | Expected |
|---|---|---|
| G1 成对生成 | `POST /api/trips/{tripId}/split-draft/routes:generate`，`X-Member-Id: <Ben>`，body `{draftVersion:<当前>}` | `200`，恰两条路线：A→National Gallery、B→Gardens by the Bay，同起终点；draftVersion+1 |
| G2-N 半对失败 | 夹具构造提供者对 B 抛错 | `ROUTE_GENERATION_FAILED`；无新路线落库；版本不变 |
| G3-N 过期 | v1 启动生成，期间分组移动变 v2，v1 结果返回 | `409` `STALE_DRAFT_VERSION`；v2 不被覆盖 |
| G4-N 无边界 | 边界未保存时生成 | `409` `SPLIT_BOUNDARIES_REQUIRED` |
| G5-N 非发起人 | `X-Member-Id: <Chloe>` | `403` `NOT_SPLIT_INITIATOR` |

## B 链请求（REQ-007 部分）

| Case | Call | Expected |
|---|---|---|
| T1 通过 | `POST /api/trips/{tripId}/split-draft/routes:check-timing`，`X-Member-Id: <Ben>`，快照 = 夹具路线对 | `200`，A total=105、B total=110，feasible=true |
| T2-N 超窗 | A 末段交通改 40 | `200`，A total=125、overrunMinutes=5，feasible=false |
| T3-N 缺输入 | A 活动时长或末段估算缺失 | `200`，missingInputs 列出缺失项，feasible=false |
| T4-N 非成员 | `X-Member-Id: <Eve>` | `403` `NOT_A_MEMBER` |
| T5-N 非法快照 | 空/路线数≠2 | `400` `INVALID_ROUTE_PAIR` |

错误包封套：`{"data":null,"error":{"code":"...","message":"..."}}`；message 非契约。

## B 链不固定值

| 项 | 原因 |
|---|---|
| 草稿 id / 路线节点 id | 数据库分配，测试从响应读取 |
| 错误 message 文本 | 仅 code 为契约 |
| 候选提供者的 R2 真实输出 | MVP 固定夹具；接口留缝，不固定未来实现 |