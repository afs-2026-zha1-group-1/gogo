# DoV / AC review — req-026-submit-preferences（草稿，待人工复核）

> 本文件为 P2 AC / DoV 复核草稿，由代理按已实现代码与 delta 整理；**不构成 G1/G2 签署**。

## 1. 验收标准映射

| AC | 描述 | 覆盖场景 | 结论 |
|---|---|---|---|
| AC1 | 提交后成员就绪（保存≠提交） | Submit: marks ready with content；Read: saved preference is not a submission | Pass（草稿） |
| AC2 | 无偏好可选且就绪 | Submit: no preference marks ready without content | Pass（草稿） |
| AC3 | 空提交被拒 | Submit: empty submission rejected；Page: empty submit shows error | Pass（草稿） |
| AC4 | 就绪投影只含就绪成员、无偏好不贡献 | Read readiness aggregate；Effective: no-preference contributes nothing / pending omitted | Pass（草稿） |

## 2. DoV 五问

| # | DoV | 结论 | 依据 |
|---|---|---|---|
| DoV-1 | 行为可观察 | Pass | 三个端点响应 + 存储行均可断言 |
| DoV-2 | 边界穷举 | Pass | 空提交、重复提交、pending/ready、noPreference |
| DoV-3 | 与既有一致 | Pass（带关注） | 复用 `member_preference` 第五个 kind、`caller()` 门禁；`effective.defaults` 未实现（见 design 简化） |
| DoV-4 | 非功能 | Pass | 零新迁移之外的 V9 属 REQ-024；本变更零迁移、零新依赖 |
| DoV-5 | 可回滚 | Pass | 单 kind 行；未改其他 kind 契约 |

## 3. 待人工确认

- IO/SA 对 `PREFERENCE_EMPTY` 新码与 `effective.defaults` 缺省的接受。
- `openspec validate --strict` 由人工运行（不得伪造结论）。
