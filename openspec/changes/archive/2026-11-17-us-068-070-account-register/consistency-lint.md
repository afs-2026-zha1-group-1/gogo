# Consistency lint — us-068-070-account-register

- change-id: `us-068-070-account-register`
- phase: p2（未归档 change + Delta 待 G1）
- focus: 默认（proposal + delta specs + 工作区需求产物）
- timestamp: 2026-11-16T17:37+0800
- artifact level: **2**（proposal + specs；无 tasks.md / design.md → T/D 规则 N/A）
- tooling: `openspec validate us-068-070-account-register --strict` = **valid**

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 6 / N/A 5

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority | 判定 |
|---|---|---|---|---|---|---|---|---|
| F1 | SUGGESTION | p2 | `specs/app-shell/spec.md`「The dock shows four ordered tabs…」「The identity switcher stays a scaffold…」 | MODIFIED 块必须逐字保留既有场景名，否则归档拒绝；旧标题与本 change 的「五 tab / 移除身份条」表述不一致 | 已在场景体注明标题为归档兼容保留，并以五 tab / 无快捷入口为契约；归档后由 Living Spec 卫生 change 统一改名 | `openspec validate --strict` 首轮两条 ERROR 文本；delta 场景体 | spec | [fact] |
| F2 | SUGGESTION | p2 | `proposal.md` §Capabilities | 初版只写 auth ADDED 3，未列 3 条 MODIFIED auth 措辞（Living Spec 中“本变更不提供注册/退出”的历史语句） | 已在本次 lint 中补齐 `MODIFIED — auth 历史契约措辞` 与 Capabilities 的 ADDED 3 + MODIFIED 3 | proposal §What Changes / §Capabilities；delta auth 3 MODIFIED | proposal | [fact] |
| F3 | SUGGESTION | p2 | delta `Purpose`（auth / app-shell） | Living Purpose 仍是“仅登录”“四个 tab”；归档时若不以 delta Purpose 覆盖，新旧口径会并存 | `/sdd:living-merge` 以 delta Purpose 覆盖 Living Purpose；P5 lint 复核 | `openspec/specs/auth/spec.md` Purpose；`openspec/specs/app-shell/spec.md` Purpose | spec | [fact] |
| F4 | SUGGESTION | p2 | `proposal.md` §APIs；delta auth | 注册 wire 契约 `200 {"next":"login"}` 与 4 个新校验码尚未进入 `tech-stack-plan` API/错误清单 | P5 归档时补 API 行与错误码；不改本 delta | proposal §APIs；`docs/knowledge/architecture/tech-stack-plan.md` §14 | proposal | [fact] |
| F5 | SUGGESTION | p2 | `specs/auth/spec.md` Account profile | 改名失败展示“可恢复错误”，未规定 UI 文案/重试交互 | P3 design 定义错误态与重试；AC 已可测（旧值不变 + 错误可见） | delta Account profile「A failed update…」 | spec | [inference] |
| F6 | SUGGESTION | p2 | proposal §Stories；REQ-009 OQ-2 | issue #40（US-068）仍指派 `DENGLU-OOCL`，卡片交接未完成 | P4 前由用户/团队确认交接；不阻塞 G1 | Project #2 item #40；REQ-009 OQ-2 | code | [fact] |

## Rule table

| 规则 | 结果 | 说明 |
|---|---|---|
| P1 Why 非空 | Pass | proposal §Why 说明登录后账号生命周期只完成“进来”一半、三卡共享表面 |
| P2 What Changes 非空 | Pass | 3 ADDED（注册/资料/退出）+ 3 MODIFIED auth + 4 MODIFIED app-shell + 测试夹具 |
| P3 Non-Goals 命名段 | Pass | 6 条精确否定（邮箱验证、改密、账号删除、头像上传、US-067/061、限流） |
| P4 Impact 覆盖 self/upstream/downstream | Pass | Code/API/DB = self；Upstream = REQ-008/V6；Downstream = US-067/061/058/063 + tech-stack |
| S1 Spec 结构 | Pass | Purpose + ADDED/MODIFIED + `#### Scenario:`；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | N/A | delta 未使用 `@knowledge:` / `@rule:` 前缀 |
| S3 每条 Requirement 可溯源 proposal | Pass | 注册/资料/退出 → proposal What Changes；auth MODIFIED → 历史措辞收敛；app-shell 4 条 → 五 tab/身份条/问候/全屏 |
| S4 Given/When/Then | Pass（附例外说明） | 新增场景使用 GIVEN/WHEN/THEN；MODIFIED 块中继承场景按归档要求逐字保留（部分仅有 WHEN/THEN） |
| S5 Scenario 归属 | Pass | 57 个场景全部挂在 10 个 requirement 块下 |
| T1–T3 Tasks | N/A | 无 tasks.md（P3 产出） |
| D1–D3 Design | N/A | 无 design.md（P3 产出） |
| C1 proposal → spec 覆盖 | Pass | 3 ADDED + 3 MODIFIED auth、4 MODIFIED app-shell 与 proposal 一一对应（F2 已修） |
| C2 spec → tasks | N/A | 无 tasks.md |
| C6 引用可达 | N/A | 无 `@knowledge:` / `@rule:` |

## phase=p2 专项检查

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| 1 | proposal 范围 vs delta 范围（无静默扩张/遗漏） | Pass | auth 3 ADDED + 3 MODIFIED、app-shell 4 MODIFIED；3 条 auth MODIFIED 为 Living 措辞收敛，proposal 已补说明（F2） |
| 2 | delta 内部一致（actors / constraints / scenarios） | Pass | 邮箱 trim+小写、名 1–30、密码 6–72、统一注册响应、四类 400 码、退出 204、五 tab 在 requirement 与场景中一致 |
| 3 | proposal 关键场景/约束均有归属 | Pass | 重复/并发/隐私、不自动登录、邀请恢复、无迁移、退出失败、注册页无 dock、账号名问候全部落场景；限流显式 deferred |
| 4 | tasks 方向性冲突 | N/A | 无 tasks.md |
| 5 | 无法溯源的 requirement | Pass | 无孤儿 requirement |

## 残余风险

- **R-a（中，IO）**：注册的隐私保证依赖“重复路径执行同样哈希工作”的实现；若 P4 提前短路，耗时差可能枚举邮箱。G1 需确认该契约，P4 需断言响应逐字节一致。
- **R-b（中，SA/Dev）**：并发注册依赖 V6 唯一索引 + 单事务；冲突映射必须仍返回通用 200，不能泄漏 500/409。
- **R-c（中，Dev）**：BCrypt 72 字节截断；P3/P4 按字节校验并覆盖 72/73 边界。
- **R-d（中，Dev）**：`AuthErrorAdvice` 现有不可读 JSON → 401 `INVALID_CREDENTIALS` 的映射会破坏注册/改名的 400 契约；P3 需作用域化。
- **R-e（中，流程）**：US-068 卡片仍指派队友 `DENGLU-OOCL`；P4 前确认交接（F6）。
- **R-f（低，SA）**：绑定计划“无注册登录”偏差；P5 归档收敛（proposal §Known deviations）。
- **R-g（低，Dev）**：旧场景标题（四 tab / identity switcher）与五 tab 现状不一致；归档后做 Living Spec 卫生改名（F1/F3）。

## Reviewer metadata

- 执行者：编码代理（Qoder），2026-11-16
- 人工签核：pending（G1 由 IO / SA 具名签核，本报告不是 Gate 结论）

## Next（非 Gate）

- `/sdd:g1-decision-record`（建议路径）；或继续 `/sdd:p2` 处理 SUGGESTION。
