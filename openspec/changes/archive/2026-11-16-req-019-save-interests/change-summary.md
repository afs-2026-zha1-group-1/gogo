# Change summary — req-019-save-interests

## Intent

行程成员需要一个共同的兴趣基线：每人在预定义清单里勾选自己的兴趣并保存，其他成员可读取。
US-019 只做兴趣这一类 `kind`——必做项（US-020）、预算（US-024）与"提交/就绪"（US-026/US-027）
各有自己的 change，共用 `preferences` 能力与 `member_preference` 表。P4 之后 owner 追加了一次
契约修订：清单从 7 个英文标签改为 10 项中文标签，页面按已批准的
`screen-08-preferences.png` 重构，因此另做了一次 G1 复审。

## What shipped

- **Living Spec**：新建能力 `openspec/specs/preferences/spec.md`，**5 requirements / 31
  scenarios**（ADDED）：调用者身份与成员校验、十个兴趣的封闭清单、保存（整集替换 + 去重 +
  写前校验）、读取（按 `userId` 升序、只出两个字段）、偏好页交互。
- **后端**：`com.gogo.preference` 12 个文件（controller / service / repository /
  `InterestCatalogue` / 错误 advice / 请求响应 DTO）；`GET` 与 `PUT
  /api/trips/{tripId}/preferences`。身份取 session principal（`AccountPrincipal`），
  匿名 401 `USER_REQUIRED`、非成员 403 `NOT_A_MEMBER`、未知行程 404 `TRIP_NOT_FOUND`，
  清单外元素 400 `INTEREST_NOT_ALLOWED`，畸形 body 400 `INVALID_REQUEST`。
- **数据**：`V7__create_member_preference.sql`（两次改号：`main` 先取 `V4` 给 splits、再取
  `V6` 给账号凭证）建 `member_preference` + `UNIQUE(trip_id,user_id,kind)`；
  `V5__create_main_plan.sql` 已 `IF NOT EXISTS` 预声明该表，故在原基线上是 no-op。
- **前端**：`frontend/src/pages/PreferencesPage.tsx`（`#/trips/{tripId}/preferences`，行程
  详情页「旅行偏好」卡片给入口），十个中文胶囊、加载/保存/失败回滚/空态；沿用 main 的
  `api()` + `useAuth()` + `lib/csrf`，无新依赖。
- **CI**：`.github/workflows/ci.yml` 的前端 job 在 `npm ci` 与 `npm run build` 之间增加
  `npm run typecheck`。
- **归档**：change 移入 `openspec/changes/archive/2026-11-16-req-019-save-interests/`。
- **KB 更新**：`tech-stack-plan.md` §17 归档对齐 + `_LOG.md` 一行；`kb-lint.sh` 仍为
  documented SKIP，未新建知识文件故 `_INDEX.md` 无需改动。

## Verify highlights

| 门禁 | 结果 | 证据 |
|---|---|---|
| 构建与测试 | `mvn -B clean test` **255/255**（28 套件）、`typecheck` 干净、lockfile 2/2、`build` 645.74 kB JS / 44.41 kB CSS / 142 modules | 合并后本地复验（tasks 8.13） |
| openspec validate | `--strict` → `is valid`，exit 0（5 段 requirement 压至 500 字符内，scenario 计数仍 31） | `tasks.md` 6.5 |
| G1 Align | Pass（IO Emily + SA evelyn.huang，含修订复审） | `g1-decision.md` |
| G2 Verify | Pass（VL Sammi Ng，2026-11-16 17:19 +0800） | `g2-decision.md` |
| G3 Merge & Archive | Pass（SA evelyn.huang，2026-11-16） | `g3-decision.md` |
| 合并 | 功能经 **PR #44**（`6c0ccb1`）；记录与压字数经 **PR #50**（`5183291`） | `ci-report.md` |
| 远端 CI | PR #44 head `9f24fa9`：run `43842757828` / `43842769894` success；PR #50 head `b3c5b92`：run `43874225529` / `43876766780` success；合并后 main push run `43877290310` success | `ci-report.md` |

## Residual risks

- **TS-2 身份口径**：delta spec 的 requirement 文本沿用 G1 原文的 `X-User-Id` 表述，实现在
  归属 PR #44 的合并后改取登录会话；两条反向用例钉住"匿名 401"与"头与会话不一致时不改存储
  成员"。若要让 Living Spec 直接写会话身份，需单开一次契约修订。
- **TS-11 Flyway 模块**：`flyway-database-nc-sqlite` 在受管 Flyway 版本下无发布物，classpath
  仅 `flyway-core`；作为已登记偏差随归档保留。
- **local-verify 报告仍写 Partial**：`docs/ai4se-plugins/20261116-1333-local-verify-report.md`
  的驱动项（远端 CI、strict）已闭合，但报告本身没有回写为 Pass；以本文件与 `ci-report.md`
  的证据为准。
- **并行叠加**：REQ-020/024/026 的 delta 以本变更的页面与 payload 为基线，本变更已归档，
  下游条目中"硬前置 REQ-019 的 `V4`/`V6`"应读作 `V7`。

## Links

- Requirement：`requirement-workspace/requirements/REQ-019.md`
- Impact / deep-dive：`requirement-workspace/impact-brief.md`、`deep-dive.md` §REQ-019
- Change（归档）：`openspec/changes/archive/2026-11-16-req-019-save-interests/`
- Living Spec：`openspec/specs/preferences/spec.md`
- 代码：`backend/src/main/java/com/gogo/preference/`、
  `backend/src/main/resources/db/migration/V7__create_member_preference.sql`、
  `frontend/src/pages/PreferencesPage.tsx`
- CI：`ci-report.md`；KB：`docs/knowledge/architecture/tech-stack-plan.md` §17
- Registry / handoff：`requirement-workspace/registry.md`、`handoff.md` 的 REQ-019 行
