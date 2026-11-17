# G2 decision — us-071-my-trips

- **Gate:** G2（Verify）
- **Decision:** **Pass**
- **Approvers:** VL = **Leo** + **Johnson Sun**（2026-11-17；按用户指令代记，代理不独立核实签署人身份）
- **Timestamp:** 2026-11-17（+0800）
- **Change id:** `us-071-my-trips`
- **Target:** PR #102（`US-071-my-trips` → `main`）；验收头 `8b7b1c7`，实现头 `e3a6819`

## Inputs

- **local-verify:** `docs/ai4se-plugins/20261117-103530-local-verify-report.md` — **Overall Pass**（Build/Static/Code review/Evidence 四项 Pass；V1–V8 全 Pass；含 §Revision 段：296/296、E2E R1–R9 全 Pass）。
- **checkpoints:** `docs/ai4se-plugins/20261117-103120-local-verify-report-checkpoints.md`；命令清单 `20261117-103219-local-verify-commands.txt`；运行日志 `20261117-103134-local-verify-run.log`、`20261117-103232-local-verify-run.log`。
- **pipeline ci:** `openspec/changes/us-071-my-trips/ci-report.md` — run `44020071898`（PR）/`44020065562`（push）@`8b7b1c7` 双 job success；**E1 = 全绿**（机器读取，非继承）。
- **pipeline cd:** n/a（合并前不部署）。
- **E2E 实测:** `docs/feedback/e2e-us-071.md` — 原范围 E1–E12 全 Pass + AC7 四步 Pass；Revision R1–R9 全 Pass；截图 `e2e-us-071-trips-list.png`、`e2e-us-071-empty.png`、`e2e-us-071-account-switch.png`、`e2e-us-071-revision-selected.png`、`e2e-us-071-revision-empty.png`、`e2e-us-071-revision3.png`。
- **Spec/Design/Tasks:** `specs/trips/spec.md`（2 ADDED / 18 场景）、`specs/app-shell/spec.md`（1 REMOVED + 1 ADDED / 11 场景），`validate --strict` valid；`design.md`（DD1–DD21）、`tasks.md`（组 1–9，余 6.3/9.4 为归档/门禁范围）、`dov-ac-review.md`、`g1-decision.md`（Pass，C1–C4 全 closed）。

## Dimension results

| Dimension | Status | Evidence |
|---|---|---|
| Build | Pass | 本地 `mvn -B test` **296/296**、`npm ci && npm run build` 绿；CI 双 job 绿 |
| Static scan | Pass | 白名单 6/6（CI 触发断言已随 PR-only 规则更新后复跑）；`openspec validate --strict` valid |
| Code review | Pass | 分层/成员范围查询/派生 organizer/排序契约/四态/选择交互/原型视觉均符合 DD1–DD21；无 CRITICAL |
| Evidence (OpenSpec) | Pass | V1–V8 Pass；五问 Q1–Q5 全 ✅ |
| E2E（浏览器） | Pass | E1–E12 + AC7 + R1–R9 全 Pass；含「点卡片不跳转」「tag 回显」「换账号隔离」「已结束排最后」 |

## Defect grades

- **CRITICAL: 0**
- **WARNING（非阻塞，已承接）:**
  - W1 — 本机 `backend/data/gogo.db` V2 校验和历史遗留；验收用 `gogo-us049.db`（`SPRING_DATASOURCE_URL`），文档已记 workaround。
  - W2 — 前端无 UT runner（无 vitest/jest），`isEnded`/`todayIso` 由 E2E E5 覆盖（design TS-2）。
  - W3 — dev `StrictMode` 使列表 effect 双调用（组件丢弃首个响应）；生产单次（E12 记录）。
  - W4 — 排序用 SQLite `date('now')`（UTC）而徽标用本地日期；+08:00 凌晨边界日可能不一致（DD21，MVP 接受）。
- **SUGGESTION:** 列表无分页（OQ-5 已裁决不做）；残留 change 空壳目录清理（沿用历史 S2）。

## Decision rationale

local-verify **Pass** + pipeline ci **E1 全绿**（最终 head 独立触发）+ 0 CRITICAL + G1 全范围 Pass（C1–C4 closed，含 Revision 复审），满足 G2 Pass 输入要求。W1–W4 均为文档已登记的非阻塞承接项，不构成 G2 阻塞。

## Conditions + owners（非阻塞承接）

| # | 事项 | owner | 期限 | 性质 | 状态 |
|---|---|---|---|---|---|
| F1 | `tech-stack-plan` 补 `GET /api/trips`、`GET/PUT /api/trips/current`、V8 与排序规则 + `_LOG` 追加（tasks 6.3） | SA / Dev | P5 归档前 | **归档必做** | 待 P5 |
| F2 | 本机 `gogo.db` 修复（`flyway repair` 或备份后删库重建） | Dev（本机） | 随时 | 非阻塞 | pending |
| F3 | 前端 UT runner 引入（独立工具变更，覆盖 `isEnded` 等纯函数） | Dev | 后续迭代 | 非阻塞 | pending |
| F4 | UTC/本地日期边界观察；若出现客诉再立「服务端统一日期」变更 | Dev / IO | 观察 | 非阻塞 | pending |

## Waiver

无（无 Fail，不需要 Waiver）。

## Next

- **G2 = Pass** → 合并 PR #102 → P5 归档车道：`/sdd:living-merge`（delta → Living Spec `trips`/`app-shell`）+ `/sdd:change-summary` + F1 知识库对账 → `/sdd:g3-decision-record`（SA 签核）。
- 本记录不重跑 apply、不取 CI/CD、不改 Living Spec、不代签 G3。
