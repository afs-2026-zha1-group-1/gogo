# Cross-change scan — <change-id>

- change-id：
- 执行人（SA）：
- 时间（+08:00）：
- 基线：merge-base `<sha>`；落后 main `<n>` 个提交
- 输入：proposal / delta specs / consistency-lint / `requirement-workspace/registry.md` / `openspec/specs/`
- 性质：**G1 输入，不是 Gate 决议**；不重写 delta，不替代 DoV 与 consistency-lint

## Verdict

**BLOCKER _ / WARNING _ / WAIVER _**

## 1. 自动扫描

命令：

```bash
scripts/cross-change-scan.sh <change-id>
```

粘贴输出（或摘要）：

```text
（脚本 stdout）
```

## 2. 九轴复核

自动项由脚本给出信号，仍由 SA 确认；判断项必须写证据。

| # | 轴 | 结论 | 证据 / 说明 |
|---|---|---|---|
| 1 | 需求号唯一（registry、active change 目录） | Pass / Fail / N/A | |
| 2 | 迁移号唯一，且等于下一个空号 | Pass / Fail / N/A | |
| 3 | 认证或身份横切：delta 覆盖全部含身份头的 capability | Pass / Fail / N/A | capability 清单： |
| 4 | 错误契约：新增错误码、envelope 形状与 Living 一致；新枚举是否需 IO 批准 | Pass / Fail / N/A | |
| 5 | 基线：落后 main 数、merge-base、proposal 提到的文件仍存在 | Pass / Fail / N/A | |
| 6 | Living 与代码漂移：本 change 声称修正的 drift 已在 delta 中落地 | Pass / Fail / N/A | |
| 7 | 共享面：与其它 active change 的文件交集、串行 owner | Pass / Fail / N/A | 交集： |
| 8 | 依赖队列：依赖的 capability 已在 `openspec/specs/` | Pass / Fail / N/A | |
| 9 | 夹具 / seed：迁移号、身份头、状态码口径一致 | Pass / Fail / N/A | |

## 3. BLOCKER 整改

| # | 缺口 | owner | 截止点 | 状态 |
|---|---|---|---|---|
| | | | | |

## 4. Waiver

没有 waiver 时写 `none`。每条必须具名。

| id | 范围 | 批准人（IO / SA） | 失效条件 |
|---|---|---|---|
| | | | |

## 5. G1 引用行

复制到 `g1-decision.md` 的 Inputs：

```text
- Cross-change scan: openspec/changes/<change-id>/cross-change-scan.md — BLOCKER n / WARNING n / waivers n
- Waiver: <id> by <IO/SA name>, scope, expiry
```
