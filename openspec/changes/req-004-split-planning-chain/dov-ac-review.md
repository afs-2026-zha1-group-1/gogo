# Delta Spec AC/DoV 评审 — req-004-split-planning-chain

- 日期: 2026-11-15
- 评审对象: `specs/splits/spec.md`（4 条 ADDED requirement，27 个 scenario）
- 依据: `dov-ac-checklist.md`（AC-1~4 / DoV-1~5）；上游 = proposal.md（G1 评审稿）、
  REQ-004~007、deep-dive B 链段、acceptance-test-fixtures.md B 链段
- 性质: 条目评审，非 Gate；本文件不写 G1 决策

## 评审表

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 requirement ≥1 可测 AC | Pass | specs/splits/spec.md | Split draft start 8 场景 / Boundary selection 7 / Route generation 6 / Timing check 6，均含状态码+错误码/字段/库态断言 |
| AC-2 AC 可观察 | Pass | 同上 | 全部落到 HTTP 状态、error.code、data 字段、库中草稿/路线计数、数值算式（105/110/125/超5）、UI 三态；无「works well」类措辞 |
| AC-3 高风险负向/边界 | Pass | 同上 | 并发（S2）、未确认（S3-N）、越权（S4-N/B4-N/G5-N/T4-N）、身份缺失（S5-N）、未知行程（S6-N）、重复（S7）、非正窗口（B2-N）、主线外（B3-N）、无草稿（B5-N）、stale（B6-N/G3-N）、半对回滚（G2-N）、无边界（G4-N）、超窗（T2-N）、缺输入（T3-N）、非法快照（T5-N） |
| AC-4 非伪装实现细节/无模糊词 | Pass | 同上 + 用户裁决记录 | 存储载体（trip.split_draft JSON、branch_id、单事务、条件更新）为**用户裁决的数据契约**（OQ-N2/N5、OQ-5），非 Dev 自由选择；行为级断言均可观察。无 appropriately/quickly/correctly 类模糊词 |
| DoV-1 范围与 proposal 一致 | Pass | proposal.md §What Changes/Capabilities | 恰 4 条 requirement 一一对应；无第 5 条；UI 场景溯源四 REQ In scope 前端条目 + deep-dive ⑫；确认/取消端点、分组移动控件、真实候选供给均显式排除。**评审中修正上游漂移**：REQ-004 与 deep-dive 原写「三表」，按权威（tech-stack-plan 4 表 + proposal + 用户裁决）同步为四表（member_preference 建表无种子）——属对齐非扩围 |
| DoV-2 歧义已列明或解决 | Pass | 四 REQ OQ 表 + proposal 裁决记录 | blocking OQ-1/2/3/4/5/7 全 resolved；非阻塞 5 resolved + 2 用户明确 deferred（OQ-N1、OQ-N7+NFR），owner 已指；无未列明歧义 |
| DoV-3 角色关注（IO/SA） | Pass | 见下「残余关注」 | IO/SA 残余事项均非阻塞且 owner 明确 |
| DoV-4 未声称业务实现完成 | Pass | 本 change 目录 | 仅 spec/proposal/评审文档，无业务代码；实现属 P3/P4 |
| DoV-5 需求溯源 | Pass | 见下「溯源矩阵」 | 27 场景全部映射 REQ 场景/夹具用例/In scope 条目；无未匹配项 |

**结论：无 blocking Fail/Partial → 可提交 G1 评审**（G1 决策由人工显式记录，
本评审不批准 Gate）。

## 溯源矩阵（delta scenario → 上游）

| Requirement | Delta 场景 | 上游 |
|---|---|---|
| Split draft start | V2 迁移与自包含种子 | REQ-004 In scope（迁移/种子）+ 夹具「行程与成员」「主线 v1 stop」+ OQ-1 |
| Split draft start | S1/S2/S3-N/S4-N/S5-N/S6-N/S7 | REQ-004 Scenarios 同名 + 夹具「B 链请求（REQ-004 部分）」 |
| Split draft start | Screen 11 展示契约 | REQ-004 In scope 前端条目 + deep-dive ⑫ 行 1 |
| Split boundary selection | B1/B2-N/B3-N/B4-N/B5-N/B6-N | REQ-005 Scenarios S1~S6-N + 夹具「REQ-005 部分」 |
| Split boundary selection | Screen 12 展示契约 | REQ-005 In scope 前端条目 + deep-dive ⑫ 行 2 |
| Group route generation | G1/G2-N/G3-N/G4-N/G5-N | REQ-006 Scenarios S1~S5-N + 夹具「REQ-006 部分」 |
| Group route generation | Screen 13 展示契约 | REQ-006 In scope 前端条目 + deep-dive ⑫ 行 3 |
| Reunion timing check | T1/T2-N/T3-N/T4-N/T5-N | REQ-007 Scenarios S1~S5-N + 夹具「REQ-007 部分」 |
| Reunion timing check | Screen 14 展示契约 | REQ-007 In scope 前端条目 + deep-dive ⑫ 行 4 |

链级约定（Purpose 段）溯源：proposal §What Changes + deep-dive B 链段触发注记 +
tech-stack-plan §5/§6/§7（DR-02/03/05/09）。

## 残余关注（IO/SA，非阻塞）

| 角色 | 事项 | 处置 |
|---|---|---|
| IO | OQ-N1：REQ-003 草稿口径（X-User-Id/多表/V2 编号）与 B 链对齐；未来 US-037 确认谓词复用 | deferred，owner IO/SA；B 链按 tech-stack-plan 先行，冲突已显式记录 |
| IO | OQ-N7：US-049 确认端点如何消费校验结论（重算 vs 引用） | deferred，owner 未来 US-049 实现者；本期只输出结论契约 |
| SA | SQLite 单写者下条件更新/单事务成对原子的实现细节（R4） | P3 design 细化，P4 用例验证（S2/G2-N/G3-N） |
| SA | 前端 JSX/TS 混编 + 新依赖 lockfile CI 可达性（R5）；轮询刷新（DR-06）与时区展示换算 | P3 细化，P4 本地 build + CI 观察 |
| SA | BranchCandidateProvider 接口签名与 R2 替换缝 | P3 design；MVP 夹具实现不改用例层 |
| Dev | NFR 保留期/SLA 不发明 | 记录备查（用户裁决 OQ-N7+NFR） |

## 过程备注

- openspec CLI 不在 PATH：delta 按本仓既有实践（req-001/002 同例）手工建于唯一
  权威树 `openspec/changes/req-004-split-planning-chain/specs/splits/`，
  documented gap；未引入第二 specs 根。
- 评审中应用的一致性修正（2 文件）：`requirements/REQ-004.md`（三表→四表、
  Eve 归属措辞）、`deep-dive.md` 所有权行（三表→四表）；与 proposal/夹具对齐，
  无行为变更。
- 下一步：`/sdd:consistency-lint`（可选 phase=p2）→ 人工评审 →
  `/sdd:g1-decision-record`（显式签核）。