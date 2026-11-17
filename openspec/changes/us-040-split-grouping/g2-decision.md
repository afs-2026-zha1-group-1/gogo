# G2 decision — us-040-split-grouping（草稿，待 VL 签核）

- Gate: G2 (Verify)
- Timestamp: 2026-11-17（草稿创建，+08:00）
- Branch: `US-040-split-grouping-p0`，PR #117
- 状态：**DRAFT / Decision = OPEN** —— 本文件不含签核，由具名 VL 复核后填写

## Inputs

- Local verify：`docs/ai4se-plugins/20261117-162107-local-verify-report.md`（Overall **Partial**：Build / Static scan / Code review / Evidence 全 Pass；E1 当时 Missing，现已由下方 CI 补齐；E3 Pending）
- Pipeline（CI）：`docs/ai4se-plugins/20261117-162544-pipeline-report.md` + `openspec/changes/us-040-split-grouping/ci-report.md`
  - **E1 = Pass**（机器读取）：run [44046339433](https://github.com/afs-2026-zha1-group-1/gogo/actions/runs/44046339433)，Backend tests pass 38s、Frontend build pass 20s，head `6b6c2c9`
- E2E：`docs/feedback/e2e-us-040.md`（E1–E13，12 张截图；1 个缺陷 E2E-1 已修并回归）
- G1：`openspec/changes/us-040-split-grouping/g1-decision.md`（Gate = Pass；**Revision Conditional**，C8「IO 复核任意成员改组 + 头像切组」仍 open）
- Delta/Design/Tasks：`specs/splits/spec.md`（39 场景）、`design.md`（DD1–DD17 + TS-1…TS-7）、`tasks.md`
- 基线校验：`openspec validate us-040-split-grouping --strict` = valid（deltas = 4）

## 维度结果

| 维度 | 结果 | 证据 |
|---|---|---|
| 功能实现（delta 39 场景） | **Pass** | 后端 315/315；`SplitAssignmentApiTest` 11 例；G6-N / CF8-N / S9 / S10-N 均绿 |
| 回归（splits 既有 51 场景） | **Pass** | `SplitBoundary/Cancel/Confirm/Detail/RouteGeneration/DocumentStatus/Window/SchemaMigration` 全绿 |
| UI（Screen 13/14/15） | **Pass** | 分组卡原型化（彩色 A/B 头 + 成员胶囊）；空组禁用生成/下一步；终态按钮禁用与只读文案；Screen 14 主按钮改为「前往复核并确认」 |
| 安全 | **Pass** | 仅行程成员可写；目标成员必须属于本行程（403）；仅 `active` 可写；`SecurityConfig` 未改；无新增依赖/凭据 |
| 文档一致性 | **Pass** | delta / proposal / requirements / design / atdd / tasks / fixtures / registry 同步；TS-1…TS-7 已登记 |
| CI（E1） | **Pass** | 上述 run 双 job 全绿（机器读取） |
| 浏览器 E2E | **Pass** | 12 行 Pass；发现并修复 E2E-1（终态按钮可点） |

## 缺陷分级

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 1 | E2E-1（confirmed 终态 CTA 仍可点）——**已修复并回归**（`draftActive`，实测 `disabled=true`） |
| SUGGESTION | 2 | S1 routes 页无终态徽标（未要求，未实施）；S2 `validate --specs --strict` 存量 >500 字符 WARNING（与本变更无关） |

## 偏差与已接受后果

| id | 内容 | 处置 |
|---|---|---|
| TS-1 | 陈旧路线提示为常驻（未记录「路线生成时的分组」，不新增 wire 字段） | accepted；如需精确提示回 `/sdd:delta-craft` 增字段并重开 G1 |
| OQ-10 | 同组重复提交幂等，不递增版本 | accepted（避免无意义版本膨胀；响应恒返回最新版本） |
| 存量单人 active 草稿 | 生成/确认仍 `SPLIT_DRAFT_INCOMPLETE` | accepted；新发起已由 `SPLIT_MEMBERS_INSUFFICIENT` 前置拦截 |
| 分支/PR 形式 | 沿用 `US-040-split-grouping-p0` 与 PR #117（未另切代码分支/PR） | 记录在 `tasks.md` 1.1/1.2 |

## 未闭合项（合并前）

| # | 项 | Owner | 说明 |
|---|---|---|---|
| 1 | G1 Revision C8：IO 对「任意成员改组 + 头像切组 + `memberId` 入参」复核并具名签核 | Emily（IO） | 未关闭前 Revision 为 Conditional |
| 2 | G3（合并与归档） | SA | 本记录不自证 G3 |

## 签核区（VL）

| Role | Name | Decision | Date |
|---|---|---|---|
| VL | （待具名） | | |

## Decision: OPEN

建议 **Pass**：delta 39 场景实现与回归全绿、E1 机器读取双绿、E2E 12 行 Pass 且唯一缺陷已修复回归、无 CRITICAL。请 VL 基于上述输入勾选 Pass / Conditional / Fail；Conditional 须列整改项与 owner。

代理不代签、不改判。
