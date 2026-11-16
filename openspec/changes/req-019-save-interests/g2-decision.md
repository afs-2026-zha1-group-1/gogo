# G2 decision — req-019-save-interests（草稿，待 VL 签署）

> **状态：草稿（DRAFT）— 不是已记录的决定。**
> 本文件由实现方（代理）整理成待签核骨架，供具名 VL 复核证据后自行记录
> **Pass | Fail | Conditional**。`Decision` 字段刻意留空、`Approvers` 未署名、
> `Timestamp` 空白：按仓库规则，实现方不得代签，也不得用自评代替人工复核。
> 签署步骤见文末 §签核区。

- **Change id:** `req-019-save-interests`（REQ-019 / US-019 成员兴趣保存）
- **Gate:** G2 (Verify)
- **Decision:** `OPEN` — 由 VL 在 **Pass | Fail | Conditional** 中择一（见 §签核区）
- **Approvers:** VL = *待具名签署*；G3 的 SA 属另一道门禁，不在本记录内
- **Timestamp:** *签署时填写*
- **Target:** PR #44 `REQ-019: save member interests on main's shadcn baseline`，base `main`，
  head `6828754`，`mergeStateStatus` = `CLEAN`（整理时点）

## Inputs

| 输入 | 位置 | 状态 |
|---|---|---|
| local-verify（P4 证据包） | `docs/ai4se-plugins/20261116-1333-local-verify-report.md` | Overall **Partial** — 剩余驱动项为 G2/G3 与 strict validate（该报告已追加更新节，说明 E1 已闭合） |
| pipeline ci | `docs/ai4se-plugins/20261116-153521-pipeline-report.md`；E1 slot：`openspec/changes/req-019-save-interests/ci-report.md` | **E1 全绿，机器读取**（非人工确认） |
| pipeline cd | n/a | 合并前无部署（design Non-Goals） |
| 验证矩阵 | `docs/feedback/verification-matrix.md` §REQ-019 | 逐行证据，含 remote-CI 机器证据行 |
| G1 | `openspec/changes/req-019-save-interests/g1-decision.md`（含 "Revision re-review" 段） | IO Emily + SA evelyn.huang 均 Pass（2026-11-16） |
| Delta Spec | `openspec/changes/req-019-save-interests/specs/preferences/spec.md` | 5 requirements / 31 scenarios |
| ATDD / 设计 / 任务 | `atdd-design.md`、`design.md`、`tasks.md` | 对齐自检 Pass；任务 39 `[x]` / 4 `[ ]`（43） |

### 引用的 CI run（均为机器读取）

| run | head | 结论 | 说明 |
|---|---|---|---|
| [43824457379](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43824457379) | `e7333f0` | success | `Backend tests` 43 s（`Tests run: 203, Failures: 0, Errors: 0` + `BUILD SUCCESS`）、`Frontend build` 17 s（`npm ci` → `typecheck` → `build`） |
| [43825093537](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43825093537) | `6828754` | success | 上者之后仅文档提交，双 job 仍全绿，即当前 PR head |
| [43822010878](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/43822010878) | `ec299b7` | success | 更早 head，同一份代码 |

## 本次交付内容（供 VL 对齐范围）

在 `main` 已落地的 shadcn/ui 基线上，新增成员兴趣保存能力：`PUT /api/trips/{tripId}/preferences`
整体替换某成员的 `interest` 集合（去重保留首个、`[]` 清空但保留行、未知标签整体拒绝 400
`INTEREST_NOT_ALLOWED`），`GET` 返回全部成员的 `{userId, interests}`；目录为 10 项中文标签
（`水上运动`/`潜水`/`摄影`/`美食`/`咖啡`/`历史人文`/`手作`/`自然风景`/`冒险`/`慢游`，英文 code 落库）；
页面 `#/trips/<id>/preferences` 按 `screen-08-preferences.png` 重构。存储为 `V6` 的
`member_preference(kind, payload)`。

## Dimension results

| 维度 | 状态 | 证据 |
|---|---|---|
| Build | **Pass** | 本地 `mvn -B clean test` 203/203；`npm run typecheck` 干净；`npm run build` 136 modules / 487.83 kB JS |
| Tests | **Pass** | `PreferenceApiTest` 29/29（红先绿：改中文目录时先 15 失败 + 1 错误）、`MainPlanApiTest` 34/34、其余既有套件同样通过 |
| Static scan / SAST | Skipped | 本仓库基线无 lint/SAST 任务，改用反向核对与 matrix 行 |
| Code review | **待 VL** | 本地-验证报告为自评 Pass；人工复核正是本门禁 |
| Evidence (OpenSpec) | **Pass** | V2–V8 Pass；V1 由 30/35 提升为 39/43（6.2 已闭合），余项均属归档泳道 |
| CI (phase=ci) | **Pass** | E1 全绿，见上表三个 run |
| CD (phase=cd) | n/a | 合并前无部署 |
| **代理的汇总建议** | **可支持 Pass** | 0 CRITICAL；未闭合项均不阻塞合并、只阻塞归档（见 §未闭合项） |

## Defect grades

- **CRITICAL:** 无（0 项）。
- **WARNING（8 项，逐条现状）：**
  1. `flyway-database-nc-sqlite` 无已发布版本，plan §7 的两模块方案未达成（design TS-11）— **仍开放**，由归档前计划对齐（6.6）或上游发布闭合。
  2. 远端 CI 未跑 — **已闭合**：run 43824457379 / 43825093537 双 job 全绿。
  3. G2/G3 未记录 — **本记录即 G2 待签；G3 另起**。
  4. 身份选择器不持久，刷新回落 Alice — **接受（继承行为）**，属 REQ-003/004 脚手架。
  5. 保存成功无 toast — **接受**，delta 只要求选区跟随响应、错误清除。
  6. dev 模式 StrictMode 双请求 — **接受**，服务端幂等（SAVE-2）。
  7. 打包体积与 chunk 警告 — **接受**；并入 main 后已从 660 kB 降至 487.83 kB。
  8. 占用 8080 的旧后端进程 — **已闭合**（owner 授权停止，新构建接管）。
- **SUGGESTION（3 项）：** 浏览器回归误建的 trip 已删除；PAGE-4/6 的加载态本地不可观测（~20 ms 往返）已记 Partial；Mockito self-attach 警告待 JDK 禁止动态 attach 时处理。

## 偏差与已接受后果（VL 需知情）

| 项 | 内容 | 依据 |
|---|---|---|
| TS-11 | Flyway SQLite 官方模块未采用，靠自动探测迁移（`V1`–`V6` 正常应用） | design TS-11；`pom.xml` |
| TS-12 | 路由沿用 main 的 app shell（`parseRoute` + `router.tsx`），不新引路由库 | design TS-12 |
| TS-13 | UI 用主线的 `shadcn/ui` + Tailwind，未引入 Ant Design；两处失败态用 `.notice`（`role="alert"`） | design TS-13；`AGENTS.md` §Reference |
| 迁移改号 | `V4` → `V6`：`main` 的 splits 占 `V4`，且 `V5__create_main_plan.sql` 已以 `IF NOT EXISTS` 声明同一张表，故 `V6` 亦为 `IF NOT EXISTS` | design DD1 Merge note；tasks 8.8 |
| REFERENCES 缺失 | `member_preference` 实际由 `V5` 的替身先建，生效表上无 `REFERENCES` 子句（`V6` 变空操作） | 同上，已接受 |
| 旧英文码种子 | `V5` 以 food/culture/art/nature/shopping 播种 fixture 的 interest/must_do，`MainPlanApiTest` 断言原始 code，故不改种子、不重映射；读取端对未知 code 静默跳过，不会 500 | 同上，已接受 |
| PAGE-4/6/7 | 页面场景 Partial：~20 ms 往返使 pending 态不可观测、页面无法提交非法标签 | local-verify §E2E |

## 未闭合项（不阻塞合并，阻塞归档）

| # | 项 | 影响 | Owner |
|---|---|---|---|
| 1 | `openspec validate --strict` 仍 exit 1（五个 ADDED requirement 正文超 500 字符；本机无 CLI） | 阻塞 `/opsx:archive` | Dev / SA |
| 2 | 计划对齐（tasks 6.6）：tech-stack-plan 与实际交付对齐 | 阻塞归档 | Dev |
| 3 | G3（Merge & Archive）未记录 | 阻塞归档 | 具名 SA |
| 4 | `cd` 从未执行 | 无（合并前无部署） | — |
| 5 | 任务 7.3 可选 checklist 未跑 | 无（显式跳过） | — |

## Baseline note（签署前请复核一次）

整理时点：本地 `HEAD` = `origin/feat/travel_preference` = `6828754`；`origin/main` = `c4f9e32`
（US-049/050 的 G1 记录，纯文档）。`bac8095..c4f9e32` 未触碰 `db/migration`、`frontend/`、
`pom.xml`、`ci.yml`，不存在新的迁移号或前端文件冲突；PR #44 为 `MERGEABLE` / `CLEAN`。
若签署时 `main` 又前进，请按同一方法复核（见 `docs/knowledge/` 的基线校验约定）。

## §签核区（由 VL 手工填写后提交）

```
Decision:      [ ] Pass        [ ] Fail        [ ] Conditional
VL name:       
Timestamp:     ____-__-__ __:__ (+0800)
```

- Conditional 必须逐条写出待整改项 + owner（无整改项的 Conditional 无效，不算 Verified）。
- Pass 的前提是我已实际打开并复核：local-verify 报告、pipeline ci 报告（含 E1 slot）、
  `verification-matrix.md` §REQ-019，以及 PR #44 的 check 结果。
- 若判 Fail：请写明回到 apply 泳道要修的具体项。

**签署并提交的方式**（VL 本人执行；代理不会代签，也不会代推送签名）：

```bash
git pull origin feat/travel_preference
# 编辑本文件：填 Decision / VL name / Timestamp，并按需勾选
git add openspec/changes/req-019-save-interests/g2-decision.md
git commit -m "g2(req-019): VL <name> records <Pass|Fail|Conditional>"
git push origin feat/travel_preference
```

## Next

- Pass → 由人/IO 合并 PR #44（代理不合并）→ P5：`/sdd:living-merge` → `/sdd:change-summary`
  → `/sdd:g3-decision-record`（具名 SA）→ `/sdd:evolve`
- Conditional → 按整改项回到 apply 泳道；整改后重新验证并请 VL 复核
- Fail → 记录具体缺陷，回到 `/sdd:atdd-apply`
