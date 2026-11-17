# G2 decision — req-020-manage-must-do（G2 草稿，待具名 VL 签署）

> **状态：草稿（DRAFT）。** 本记录由实现方（代理）整理输入、维度结果、缺陷分级与未闭合项，
> **代理不代签、不判定**。`Decision` 留空待具名 VL 在 §签核区填写；在 VL 签署前，G2 闸门
> **保持开放（NOT closed）**，本变更不得据此合并或进入归档。
> 供 VL 核对：本记录已随分支 `feat/travel_preference`（tip `c739dfa`）推送到远端，VL 可
> `git fetch` 后从远端拉取本文件与全部证据复核，再在 §签核区落笔并签署。

- **Change id:** `req-020-manage-must-do`（REQ-020 / US-020 成员必做项管理）
- **Gate:** G2 (Verify)
- **Decision:** **待 VL 裁决（草稿未定）** — Pass / Fail / Conditional 三选一由 VL 给出
- **Approvers:** VL = **待填（具名）**；G3 的 SA 属另一道门禁，不在本记录内
- **Timestamp:** 待填（建议取 VL 签署提交的时间）
- **Target:** 分支 `feat/travel_preference`，本记录定稿时 tip = `c739dfa`
  （`c739dfa45c124f452b0ba665cc1c5285b1e3a08b`），**尚无 Pull Request**（本地已 commit+push 到
  feat 分支，未开 PR）。签署前请以 `gh`/远端实时状态复核 head 与 check 结果。

## Inputs

| 输入 | 位置 | 状态 |
|---|---|---|
| local-verify（P4 证据包） | `docs/ai4se-plugins/20261117-111526-local-verify-report.md` | 快照 Overall **Partial**（当时浏览器行 pending、无当前 commit 的 CI）。其两条主要缺口已在快照之后闭合，见下两行；本报告为时点记录，未回写 |
| 浏览器 E2E（local-verify 之后补证） | `docs/feedback/verification-req-020.md` §2 | PAGE 行由 **owner 在真实 Edge（登录 Alice）走查、转达由代理记录**（代理自身 ComputerUse 被主机 URL 置信护栏硬停，未能自观测），附截图 |
| 实时 8080 安全探测 | `docs/ai4se-plugins/20261117-120157-req020-live-e2e-safe.{ps1,log}` | owner 重启 8080 到 P4 构建后，非破坏性只读探测 **13/0**（路由已挂载、时间格式矩阵全 `MUST_DO_TIME_INVALID` 且零写入、门禁 401/403/404） |
| pipeline ci（phase=ci） | 见下 §引用的 CI run（`gh` 机器读取） | **E1 全绿，机器读取**（非人工确认）；本变更包内未单独落 `ci-report.md`，证据以 run 链接为准 |
| pipeline cd（phase=cd） | n/a | 合并前无部署（design Non-Goals） |
| 验证矩阵 | `docs/feedback/verification-matrix.md` §REQ-020 | 逐行证据，含 remote-CI 机器证据行 |
| 运行期 API 复跑 | `docs/ai4se-plugins/20261117-105552-req020-runtime-api-{commands.ps1,run.log,db-dump.py}`；`verification-req-020.md` §3 | 隔离实例（8081，自带 SQLite）**45 检查 / 0 失败** |
| G1 | `openspec/changes/req-020-manage-must-do/g1-decision.md` | **Pass，闸门已关闭**（IO Emily + SA evelyn.huang 均签，条件 6 strict exit 0、条件 9 已签，2026-11-16/17） |
| Delta Spec | `openspec/changes/req-020-manage-must-do/specs/preferences/spec.md` | 3 requirements / 44 scenarios（2 ADDED + 1 MODIFIED rev2） |
| ATDD / 设计 / 任务 | `atdd-design.md`、`design.md`、`tasks.md` | 对齐自检 Pass；§5 运行期与 E2E 任务 5.1/5.2/5.4 已于 2026-11-17 勾选 |

### 引用的 CI run（`gh` 机器读取）

| run | head | 结论 | 说明 |
|---|---|---|---|
| [44024720514](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44024720514) | `c739dfa` | **success** | 本记录定稿 head（`feat(req-020): manage member must-do items (P4 complete)`）：两 job **Backend tests** 与 **Frontend build** 均 success（2026-11-17T05:31:36Z，37 s） |

## 本次交付内容（供 VL 对齐范围）

在 `main` 已落地的会话身份 + preferences 基线上，新增成员必做项管理能力：
`PUT /api/trips/{tripId}/preferences/must-dos` 按请求顺序整体替换某成员 `kind='must_do'` 的条目列表
（缺 `id` 即新增、服务端按 `maxId+1` 签发、省略即删除、`[]` 清空但保留行、清空后 id 从 1 复用），
`GET` 返回全部成员的 `{userId, mustDos}`；校验为签名七步序（activity 必填、地点或时间至少一项、
`HH:MM` 严格格式、重复 id、未知 id 等），拒绝时整体不落库并回 `400 MUST_DO_*` / `INVALID_REQUEST`；
存储复用 `member_preference(kind,payload)`，**零迁移、零新依赖、零新路由**；页面
`#/trips/<id>/preferences` 在兴趣分区之下新增必做项分区（增/改/删 + 删除确认）。身份→行程→成员门禁
复用 REQ-019 的 `caller()`，未登录 `401 USER_REQUIRED`、非成员 `403 NOT_A_MEMBER`、未知行程
`404 TRIP_NOT_FOUND`。

## Dimension results

| 维度 | 状态 | 证据 |
|---|---|---|
| Build | **Pass** | 本地 `mvn -B test` **295/295**（分支基线 255 + `MustDoApiTest` 33 + `MustDoCodecAndServiceTest` 4 + `MustDoValidatorTest` 3）；`npm run typecheck`（`tsc --noEmit`）干净；`npm run build` 650.91 kB JS / 44.49 kB CSS / 142 modules |
| Tests | **Pass** | 红先绿：`MustDoApiTest` 实现前 404「无 handler」失败、基线 255 绿；实现后 295/295。邻居 `PreferenceApiTest` 29、`MainPlanApiTest` 34 未编辑仍绿 |
| Static scan / SAST | Partial | 本仓库基线无 lint/SAST；4 条 grep 静态核对通过；2 条白名单 Python 静态命令因本机 `C:\Python315` 无 PyYAML 失败（环境项，与本变更无关，CI 上两 job 仍绿） |
| Code review | **Pass（代理整理，待 VL 复核）** | 端点复用类级映射与私有 `caller()`（MD2），`PreferenceErrorAdvice` 仅增一个 `MustDoApiException` 分支；`PreferenceRepository` 去硬编码 `INTEREST` 改 `kind` 参数；`MustDoValidator` 五段可观测序、先校验后落库；`MustDoService` 整表 upsert、`name` 镜像只落库不上线；前端第二 query key + 独立 `useMutation`、每动作一次整表 `PUT`、失败回滚、无 `localStorage` |
| Evidence (OpenSpec) | **Pass** | `openspec validate req-020-manage-must-do --strict` exit 0；V2–V8 见 local-verify；V3 页面侧 20 行已由 owner 走查补证 |
| CI (phase=ci) | **Pass** | E1 全绿：run `44024720514` 在 `c739dfa` 两 job success（机器读取） |
| CD (phase=cd) | n/a | 合并前无部署 |
| **代理的汇总建议** | **可支持 Pass（须 VL 亲签）** | 0 CRITICAL；API 与 UI 证据齐备；开放项见 §未闭合项，均不阻塞合并、只阻塞归档或属 VL 裁决 |

## Defect grades

- **CRITICAL：** 无（0 项）。
- **WARNING（逐条现状）：**
  1. PAGE-1…PAGE-20 与 screen-08 布局对比未在浏览器观测 —— **已闭合（转达式）**：owner 重启 8080 到 P4 后在 Edge 以 Alice 走查并附截图（垃圾桶图标已绘制、原生 `type=time`、布局与 screen-08 一致且越界块缺失）；换身份/限速类行由 HTTP E2E 取证，见下条与偏差表。
  2. 无当前 commit 的远端 CI —— **已闭合**：run `44024720514` 在 `c739dfa` 两 job 全绿。
  3. Delta 文本仍写 `X-User-Id`、PAGE-10 写「顶栏身份选择器」，实现按 US-066 会话身份（TS-14）—— **仍开放，属 VL/IO 裁决项**：不改已签署文本，请 VL 在 §签核区对本条明确裁定。
  4. 两条白名单静态命令因本机 Python 缺 PyYAML 失败、且 `BaseLoader` 断言与工作流形态不符 —— **仍开放（环境项）**：建议在独立变更修命令清单；CI 上两 job 仍绿，不阻塞本变更。
  5. `.metals/`（IDE 产物）未纳入 `.gitignore` —— **仍开放（卫生项）**：本次 commit 已按文件名选择性暂存排除之；建议单独变更补 `.gitignore`。
- **SUGGESTION：** `MustDoService.currentItems` 读全员行找调用者（可改单行读，MVP 规模无害）；`PreferenceRepository` 现有两支近似 upsert（`save`/`savePayload`，属后续清理，不在本验收切片）。

## 偏差与已接受后果（VL 需知情）

| 项 | 内容 | 依据 |
|---|---|---|
| TS-14 | 身份取会话（`Authentication`→`AccountPrincipal`、`useAuth()`），`X-User-Id` 头不再是身份来源；已签署 delta 文本仍写 `X-User-Id`/顶栏选择器，未改 | design TS-14；G1 条件表；**待 VL 裁定** |
| MD13 修订 | 首版仅一个新类 `.mustdo-row`；2026-11-17 owner 要求对齐 screen-08，** lifted 单类限制**，新增 `.mustdo-row .grow`/`.mustdo-lead`/`.row-actions`/`.btnrow`(+`.btnrow .btn`)，全部复用既有 token、无第二调色板、无逐项内联样式。行为契约不变 | design MD13 修订段；tasks 4.9；matrix MD11–MD13 行 |
| 运行期证据来自隔离实例 | API 45/0 与实时 13/0 用隔离 SQLite（`%TEMP%`），开发库未被 P4 改动 | tasks 5.6；local-verify §residual |
| 浏览器行的取证边界 | PAGE-10（切 Chloe）、PAGE-17(a 匿名/b 非成员 Eve)、PAGE-11/13/15/18（限速/console/停后端）未在浏览器重走，由 HTTP E2E（MDR-3 隔离、门禁 401/403/404、整表幂等 MDS-17）取证；代理 ComputerUse 被主机护栏硬停，浏览器行为 owner 转达记录 | verification-req-020 §2 说明段 |

## 未闭合项（截至本草稿；不阻塞合并，阻塞归档或属 VL 裁决）

| # | 项 | 影响 | Owner |
|---|---|---|---|
| 1 | **G2 尚无具名 VL 签署**（本文件为草稿） | 阻塞：闸门未关闭 | 具名 VL |
| 2 | TS-14 已签署文本与实现的身份模型措辞漂移 | 需 VL/IO 在 G2 裁定（不改已签文本） | Emily (IO) / 具名 VL |
| 3 | 尚无 Pull Request | 阻塞合并通道 | Dev |
| 4 | 分支落后 `origin/main` **33 个提交**（领先 7） | 合并前需按基线约定复核；PR diff 会显示 main 侧提交 | Dev |
| 5 | G3（Merge & Archive）未记录 | 阻塞归档 | 具名 SA |
| 6 | 两条白名单静态命令环境失败（缺 PyYAML） | 无（环境项，CI 绿） | Dev（单独变更） |
| 7 | `.metals/` 未入 `.gitignore` | 无（本次已选择性暂存排除） | Dev（单独变更） |

## Baseline note（签署前请复核一次）

本记录定稿时 `HEAD = c739dfa`，`git rev-list --count HEAD..origin/main` = **33**、
`origin/main..HEAD` = **7**。REQ-020 叠在 `feat/travel_preference` 上，其 REQ-019 前置已在
`origin/main` 归档（G1/G2/G3 Pass、PR #44 合入）。合入顺序仍为 019 → 020 → 024。
**签署前请自行再确认一次**：`gh run view 44024720514` 全绿、远端 tip 是否又前进；若 main 又前移，
按 `docs/knowledge/` 的基线校验约定重跑 `git fetch origin main` 并复核 head check。

## §签核区（待 VL 填写；代理不代签）

```
Decision:      [ ] Pass        [ ] Fail        [ ] Conditional
VL name:       ______________________
Timestamp:     ______________________
TS-14 裁定:    ______________________   （接受现状 / 要求改已签文本 / 其他）
Conditional 整改项 + owner（若判 Conditional，必须逐条写明，否则无效、不算 Verified）:
______________________________________________________________
```

- Conditional 必须逐条写出待整改项 + owner（无整改项的 Conditional 无效）。
- Pass 的前提是签署人已实际打开并复核：local-verify 报告、`verification-req-020.md` §2/§3、
  `verification-matrix.md` §REQ-020、CI run `44024720514`，以及 §偏差与未闭合项。
- 若判 Fail：请写明回到 apply 泳道要修的具体项。
- **签署留痕**：VL 的签署应落在本分支的一次提交上；代理只把 VL 亲笔的裁决转写进上方门禁字段与
  维度表，不代填 `Decision`/`VL name`，也不补写 VL 未写的整改项。

## Next

- VL 从远端拉取本记录与证据复核 → 在 §签核区填 `Decision` 并签署 → 提交到 `feat/travel_preference`。
- **G2 Pass（VL 亲签）后** → 开 PR 合入 `main` → P5：`/sdd:living-merge` → `/sdd:change-summary` →
  `/sdd:g3-decision-record`（具名 SA）→ `/sdd:evolve`。
- Conditional → 按整改项回到 apply/verify 泳道；整改后重新验证并请 VL 复核。
- Fail → 记录具体缺陷，回到 `/sdd:atdd-apply`。
