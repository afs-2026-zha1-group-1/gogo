# Local verify report — us-079-map-navigation（2026-11-18）

- Change: `openspec/changes/us-079-map-navigation/`（full set + git diff → V1–V8）
- C1 = local+evidence（用户指令预答：收集 V1–V8 作 PR 前门禁输入）；C2 = build+scan+review+evidence（skipped-preanswered）
- Checkpoint log: `docs/ai4se-plugins/20261118-154614-local-verify-report-checkpoints.md`
- Commands file: `docs/ai4se-plugins/20261118-154615-local-verify-commands.txt`（probe 产出）+ Runtime 两条取自 `docs/feedback/verification-commands.md` 白名单源
- Run log: `docs/ai4se-plugins/20261118-155428-local-verify-run.log`（8/8 exit 0）

## Dimensions

| 维度 | 结果 | 证据 |
|---|---|---|
| Build | Pass | `(cd backend && mvn -B test)` 381/381；`(cd frontend && npm ci && npm run build)` typecheck+vite 绿（run log 155428） |
| Scan | Pass | 白名单静态 6/6 exit 0（4 反向 grep + 2 CI yaml 解析；本机本轮 PyYAML 可用） |
| Review | Pass | 见下方 highlights；无 CRITICAL |
| Evidence | Partial | V1–V8 见下表；E1 远程 CI 待 PR 触发；X1/X2/X5/E11 待真实浏览器复测 |

**Overall: Partial**（无 CRITICAL、无 Waiver；缺口均为环境/门禁时序类，见残余）

## Whitelist command table（run log 20261118-155428）

| 命令 | exit |
|---|---|
| ! grep -rn "Hello World" frontend/src | 0 |
| ! grep -inE "jpa\|hibernate" backend/pom.xml | 0 |
| ! grep -rinE "h2database\|org\.h2\|jdbc:h2" backend/pom.xml backend/src | 0 |
| ! grep -q "artifact.oocl.com" frontend/package-lock.json | 0 |
| python yaml ci jobs 断言 | 0 |
| python yaml ci triggers 断言 | 0 |
| (cd backend && mvn -B test) | 0（381/381） |
| (cd frontend && npm ci && npm run build) | 0 |

前两轮失败均为环境时序：154846 轮 mvn 因 bash -l login profile 重置 PATH 落回 3.5.4（PluginIncompatible）；155109 轮 npm ci 因 dev server 占用 rolldown binding（EPERM）。处置：非登录 shell + 先停 dev 后跑、跑完恢复 dev（5173 已恢复）。

## Evidence V1–V8

| ID | 结果 | 证据/说明 |
|---|---|---|
| V1 任务完成 | Pass [fact] | tasks.md 未勾 7 项全为门禁/归档/deferred（9.1–9.3、10.1–10.3、8.2），实现组 1–8 全勾 |
| V2 requirement 覆盖 | Pass [fact] | 5 requirements 均有实现：生成补全/读字段（MainPlanService/PlanResponse）、回写（MainPlanController/Service）、地图入口（StopMapButton/MyPlanTimeline）、倒计时地址/复制/起点（CountdownCard） |
| V3 scenario 覆盖 | Pass + WARNING [fact] | API 18 → MainPlanApiTest/StopLocationApiTest（含 G8/W6 新增）；trips 20 → E2E 6/6 + E4 DOM Pass；E11/X1/X2/X5 外部渲染待真实浏览器（UT 已覆盖派生逻辑）→ WARNING 非 CRITICAL |
| V4 requirement↔impl | Pass [fact] | 逐条映射无错配；G8 口径=坐标 null 保留 provider 地址（R2 澄清已记 g1-decision） |
| V5 spec drift | Pass [fact] | 仅 R1（首站固定起点）与 R2（G8 措辞）两处修订，均记 g1-decision 待复签；无未登记漂移 |
| V6 design 贯彻 | Pass [fact] | DD1–DD13 逐条对码：V10/V11、缓存补全、回写门序、wire additive、投影抄坐标、stopMapHref 兜底链、R1 起点、复制瞬时反馈、.env 治理 |
| V7 模式契合 | Pass [fact] | lib 纯函数 + node:test、组件沿用既有类名/Icons、后端 record+JdbcTemplate+包内错误契约，与邻近代码一致 |
| V8 必要性 | Pass [fact] | diff 文件均可追溯 proposal/tasks；.gitignore 增 __pycache__ 为卫生项（SUGGESTION 级附带）；clipboard.ts 抽取为范围内重构 |

## E1 / E2 / E3

| Slot | 状态 |
|---|---|
| E1 机器 | 本地命令表 8/8（run log 155428）；**远程 CI 待 PR 触发**（ci.yml：任意分支 push + PR to main） |
| E2 AI | 本报告 + V1–V8 + docs/feedback/e2e-us-079.md |
| E3 人工 | 待 G2（VL）/G3（SA）；C-R1/C-R2 复签待 IO Emily/SA Lumi；不自批 |

## Q1–Q5

| Q | 答案 | 映射 |
|---|---|---|
| Q1 完全实现？ | 是（实现组全勾；门禁组待后续阶段） | V1–V3 |
| Q2 正确实现？ | 是（381/381 + 71/71 + E2E 6/6；G8/W6 缺口已补） | V4–V5 |
| Q3 架构连贯？ | 是（DD1–DD13 对码无偏离） | V6–V7 |
| Q4 只做了需要的？ | 是（diff 全追溯；卫生项附带登记） | V8 |
| Q5 风险可控？ | 是（残余均 WARNING/deferred：海外地理编码、GCJ 边界、Key 前端暴露、外部页真实浏览器复测） | 风险带 |

## Code-review highlights

- 迁移只加可空列 + 新表 + 幂等种子，无破坏性 DDL [fact]
- 新错误码 UNKNOWN_STOP/INVALID_COORDS 走包内扁平契约，门序与既有一致 [fact]
- Key/安全密钥仅 frontend/.env（gitignore 确认），.env.example 占位入库 [fact]
- stopMapHref 纯函数集中链接决策，组件零重复逻辑；UT 先红后绿 [fact]
- clipboard 回退 execCommand 为 deprecated 仅作 fallback（SUGGESTION：后续可换现代方案）
- GCJ-02 矩形 bbox + 港澳排除盒为近似（W2 deferred，夹具覆盖关键边界）[fact]
- E2E 夹具幂等（清依赖再插），worker 重启不冲突 [fact]
- 无 CRITICAL 发现

## 残余与 PR gate

- Overall **Partial**，无 CRITICAL → 不需要 Waiver；可开 PR（`/sdd:pr-submit`），**合并须等 CI 双绿 + G2 署名**（E1 远程补齐）。
- 待真实浏览器复测：X1/X2（外部页起终点自动填充）、X5（跨境公交）、E11（进行中+已分队行程倒计时）。
- C-R1（R1 首站固定起点）/C-R2（G8 措辞澄清）待 IO/SA 复签，随 G2 闭环。

## Waiver

N/A（Overall 非 Fail；无 Waiver 主张）。
