# Change summary — us-040-split-grouping

- Change: `us-040-split-grouping`（US-040「发起分队并查看成员分组」，issue #84）
- 分支：`US-040-split-grouping-p0`；PR [#117](https://github.com/afs-2026-zha1-group-1/gogo/pull/117)
- 合并：`3bcf7b9`（2026-11-17，merge commit；合并前 head `34a88c6`）
- 归档：`openspec/changes/archive/2026-11-17-us-040-split-grouping/`
- 门禁：**G1 Pass + Revision Pass（SA Leo / IO Emily）**、**G2 Pass（VL Leo）**、**G3 Pass（SA Leo）**

## 交付内容

### 后端（`splits`）

- 新增 `PUT /api/trips/{tripId}/split-draft/assignment`（body `{memberId?, groupLabel, draftVersion}`）：
  - **任意行程成员可移动任意成员**（2026-11-17 用户修订，对齐原型头像切组）；`memberId` 缺省为调用者；
  - 目标非本行程 → `403 NOT_A_MEMBER`；非法组别 → `400 INVALID_GROUP_LABEL`；
  - 仅 `active` 可写；同组提交幂等（200、不写库、不递增版本）；变更后 `draftVersion + 1` 且 **保留 boundaries/routes**。
- `SplitDraftDocument`：`partitionGroups` 删除 → `initialGroups`（全员 A、B 空）+ `withAssignment`（双组移除再加入）。
- `SplitDraftService.groupProblems`：固定顺序 `groups.A → groups.B → groups.unassigned → groups.duplicate`，`routes:generate` 与 `:confirm` 共用；`details.missing` 新增 `groups.*`。
- 发起/重建新增成员数 ≥ 2 前置：`409 SPLIT_MEMBERS_INSUFFICIENT`。

### 前端

- Screen 13 分组卡按原型 `.route` 结构重绘：彩色 A/B 头（代码徽章 + 人数）+ 实心成员胶囊（首字头像 + 名字 + 「我」）；**点击胶囊即切组**。
- 分组不完整（任一组为空）时禁用「生成路线 / 下一步」，并提示具体空组名；`confirmed/cancelled` 终态下两类 CTA 均禁用、文案改只读。
- Screen 15 显示成员名而非 id；路线卡新增「待重新生成」柔和标记（`stale`）。
- `states.tsx` 的 `SPLIT_DRAFT_INCOMPLETE` 文案覆盖「分组不完整」，`details.missing` 中文化；`ENDPOINT_NOT_FOUND` 诊断提示后端需重启。

## Delta 影响

| 能力 | 变更 | 场景数 |
|---|---|---|
| `splits` | 1 ADDED（Member group assignment）+ 3 MODIFIED（Split draft start / Group route generation / Split confirmation） | **41**（10 + 15 + 7 + 9） |

- 合并 main 时 US-086 已把 `Split draft start` 扩到 13 场景，delta 逐字补入 3 条后才归档（否则归档会丢场景）。
- Living Spec 归档后：`splits` 8 requirements（`list --specs` 校验通过）；**Purpose 段 CLI 不会自动更新，已手动补「成员分组」**。
- 零迁移、零新依赖、不新增路由，`SecurityConfig` 未改（splits 维持 `permitAll` + `MemberGuard`）。

## 验证证据

| 项 | 结果 |
|---|---|
| 后端测试 | **356/356**（合并 main 后；含 `SplitAssignmentApiTest` 11 例） |
| 前端 | `typecheck` + `vite build` 绿 |
| 浏览器 E2E | `docs/feedback/e2e-us-040.md` 12 行 Pass（E2E-1 终态按钮缺陷已修并回归） |
| E1（CI） | run 44062093032 / 44062087362（head `3d4cf28`）双 job 绿；`ci-report.md` |
| local-verify | `docs/ai4se-plugins/20261117-162107-local-verify-report.md`（Partial → E1 补齐） |
| Delta 校验 | `openspec validate us-040-split-grouping --strict` = valid；归档后 `validate --specs --strict` 仅存量 >500 字符 WARNING |

## 偏差与残留

| id | 内容 | 处置 |
|---|---|---|
| TS-1 | 陈旧路线提示为常驻（未记录「路线生成时的分组」） | 接受；精确化需回 `/sdd:delta-craft` 增字段并重开 G1 |
| TS-2 / OQ-10 | 同组重复提交幂等，不递增版本 | 接受（响应恒返回最新版本） |
| TS-3 | 存量单人 `active` 草稿仍不可生成/确认 | 接受；新发起已由 `SPLIT_MEMBERS_INSUFFICIENT` 前置拦截 |
| 分支/PR 形式 | 沿用 `US-040-split-grouping-p0` 与 PR #117 | 记录于 `tasks.md` 1.1/1.2 |
| 归档任务计数 | `archive` 报 44/46（9.3、10.4 当次未勾） | 已在归档目录补齐勾选 |

## 后续

- G3 Pass（SA Leo，2026-11-17，代记）：见 `g3-decision.md`（`Decision = Pass`），随归档 PR #129 合并。
- 知识库：`docs/knowledge/architecture/tech-stack-plan.md` **§24** + `docs/knowledge/_LOG.md` **A24** 已对账（归档前完成，路径引用待 G3 时复核）。
- 看板：issue #84 可置 Done（G3 后）。
