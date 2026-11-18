# 对齐自检 — ai-main-plan-generation（P3）

- Date: 2026-11-18
- 范围：Spec ↔ Design ↔ Tasks ↔ ATDD
- 结论：**Pass**（无阻塞缺口）

## 1. Spec 场景 → ATDD → Tasks

| Spec 场景 | ATDD | Tasks |
|---|---|---|
| G1 全员就绪 / 无 key 夹具 | A5 | 4.4（既有断言不改） |
| G2 有成员未就绪 | A6 | 4.2 |
| G5 重新生成新版本 | A7 | 4.2 |
| G6 已确认后拒绝生成 | A6 | 4.2（门禁在 AI 调用前） |
| AI 提供者产出草稿 | A1 | 0.2 → 4.1 |
| AI 失败降级两站 | A2 | 0.2 → 4.1 |
| 未填地点降级使用补全值 | A4 | 0.2 → 4.1 |
| AI 输出入库前校验 | A3 | 0.2 → 4.1 |
| 生成期间非阻塞提示 | E1/E2/E3/E4 | 5.1–5.5、6.4 |
| 既有授权/身份 | A6 / R-E1 | 4.2、6.4（不改） |

## 2. Design 决策 → Tasks

| Design | Tasks |
|---|---|
| D1 DeepSeek调用（端点/模型/参数） | 1.1、1.2、2.2 |
| D2 单 Bean 选择 + 最小降级 | 1.3、1.4 |
| D3 `DeepSeekPlanClient` 可替换 | 2.1、2.2、2.4、4.1 |
| D4 提示词数据化 | 2.3、4.3（R-A4） |
| D5 输出先校验 | 3.1、0.3、4.1 |
| D6 降级边界 + 两站构造 | 3.2、3.4 |
| D7 配置与密钥 | 1.1、1.2 |
| D8 非阻塞提示 | 5.1–5.5、6.4 |

## 3. ATDD 反向用例 → Tasks

| 反向项 | Tasks |
|---|---|
| R-A1 单次同步、无异步端点 | 4.3 |
| R-A2 无 key 夹具不变 | 4.4 |
| R-A3 确认校验不变 | 4.2/4.4（既有测试） |
| R-A4 日志/提示词脱敏 | 4.3 |
| R-E1 权限态不变 | 6.4 |

## 4. 文档一致性

| 检查 | 结果 |
|---|---|
| proposal `Non-Goals` ↔ delta 无新增能力 | Pass |
| design 与 tasks 配置名一致（`PLAN_AI_*`、`max-tokens`、20s） | Pass |
| tasks 依据同时引用 `design.md` 与 `atdd-design.md` | Pass |
| NFR 决定已记录（用户 2026-11-18 不纳入） | Pass |
| ATDD UT 编号 U1–U4 与 tasks 0.3/4.1 一致 | Pass |
| `openspec validate --strict` | Pass（valid） |

## 5. 缺口与承接

| # | 缺口 | 处理 |
|---|---|---|
| 1 | AI 路径的价格/耗时无真实数据 | P4 6.2 手工记录一次真实调用（OQ-8） |
| 2 | E2E 在无 key 下提示可能一闪而过 | ATDD §3 已注明可用真实 key/限速/延迟 stub；不改进生产代码 |
| 3 | G1 的 `X-User-Id` 既有漂移 | Residual notes 承接；本变更不修正 |

无阻塞缺口；tasks 可进入 P4。
