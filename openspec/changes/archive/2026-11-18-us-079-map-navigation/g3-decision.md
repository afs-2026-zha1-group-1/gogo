# G3 decision record — us-079-map-navigation

- change-id: us-079-map-navigation
- gate: G3（Merge & Archive）
- timestamp: 2026-11-18（用户转达署名同日入档）
- sign-off: **SA Lumi — Pass**（用户对列明署名请求回复 "pass"：G3=SA Lumi、
  C-R1/C-R2 复签=IO Emily + SA Lumi；代记入档，非 agent 自批）

## Inputs

| 证据 | 路径/引用 | 结果 |
|---|---|---|
| living-merge | openspec archive us-079-map-navigation -y | 成功：Living main-itinerary +1/~2、trips +1/~1；archive = 2026-11-18-us-079-map-navigation |
| KB update | scripts/kb-lint.sh | SKIP（基线 documented no-op，先例 20261115-153135 登记许可） |
| change-summary | archive/2026-11-18-us-079-map-navigation/change-summary.md | 已落 |
| 归档完整性 | archive 目录 proposal/specs/design/tasks/atdd/dov/g1/g2/ci-report/summary 齐 | 完整 |
| G1 | g1-decision.md | Pass（ce4982f）；R1/R2 复签本次闭环（见下） |
| G2 | g2-decision.md | Pass（VL Elian） |
| 合并 | PR #157 merged 5305172；归档 PR #159 CI 三作业绿 | 功能已入 main；归档待本签后合并 |
| verify | local-verify 20261118-155859（Partial 无 CRITICAL）+ pipeline 20261118-162921（E1 Pass） | 齐 |

## Conclusions

- 合并：功能 PR #157 已 merged；归档 PR #159 于本签后合并，无冲突（重基线后 strict 0 ERROR）。
- 归档完整性：完整（含 change-summary、g1/g2/ci-report、delta 重基线副本）。
- C-R1（首站固定出发点珠海南方软件园）复签：**Pass（IO Emily + SA Lumi，用户转达）**，closed。
- C-R2（G8 措辞澄清：缓存 miss 坐标 null、保留 provider 地址）复签：**Pass（IO Emily + SA Lumi，用户转达）**，closed。
- Harness/Rules evolve：无必须项；可选跟进（非本门）：clipboard execCommand 回退现代化、
  GCJ bbox 精确化（W2）、demo-seed 护栏（OQ-8）——留 followups，不在本记录实施。

## Decision

**Pass**（SA Lumi）。

## Residual（非阻塞，登记跟进）

- X1/X2/X5/E11 真实浏览器复测（用户侧）；
- OQ-5 海外全自动地理编码 / OQ-6 存量回填 / OQ-7 US-090 联动 / OQ-8 demo-seed 护栏（deferred）；
- 开发库 flyway 历史修补（V10/V11→V12/V13 改号）于下次重启时执行并先说明。

## Next

合并 PR #159 → 同步 lumi_dev → US-079 全周期闭环。
