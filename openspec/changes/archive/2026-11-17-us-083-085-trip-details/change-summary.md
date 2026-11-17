# Change summary — us-083-085-trip-details

## Intent

US-083/084/085 三合一垂直切片：行程详情页重构为紧凑概览（摘要/倒计时/同行成员/我的方案），分队确认后展示个人路线，活动级每秒倒计时与下一站详情。版式权威 = 看板 US-083 两张参考截图（R1）。R9（2026-11-17 用户裁决）：无主线方案保留旧版详情页，有主线方案才展示新版概览。

## What shipped

- **详情页三分结构（R9）**：`TripDetails.tsx` 分流入口（useTripOverview 五读并发，loading/denied/missing/failed 统一渲染）；`TripDetailsLegacy.tsx`（main 旧版逐字保留：行程信息/偏好/内嵌邀请/主线入口）；`components/TripOverview.tsx`（新版概览 + 右上邀请图标）。
- **US-084 个人路线**：`lib/personal-route.ts` selectSchedule/derivePersonalRoute——confirmed split 我组路线+共同段（组隔离），未分配/取消回退主线；组活动 interests 按名从主线补全（P11 缺陷修复）。screen-confirm 确认成功整页返回详情。
- **US-085 倒计时**：`lib/countdown.ts` 状态机（pre-trip/during/between/finished/no-schedule，半开区间、clamp≥0）+ `useCountdown` 每秒 tick；CountdownCard/NextStopDetail（R8 缺失=待确认不伪造，末站=没有更多活动）。
- **US-083 邀请全屏页**：`InvitationPage.tsx`（`#/trips/{id}/invitation`，无 tabbar）；InvitationPanel 加可选 prop 复用；非组织者权限态不泄链。
- **Living Spec**：`trips` +3 ADDED / 1 MODIFIED（US-072 入口 req 按 R9 改写）、`invitations` +1 ADDED、`app-shell` 1 MODIFIED。
- **后端**：本 change 零改动；合并 main 带入队友 V9/偏好 API 等（非本 change 产物）。
- **归档**：change 移入 `openspec/changes/archive/2026-11-17-us-083-085-trip-details/`。

## Verify highlights

| 门 | 结果 | 证据 |
|---|---|---|
| G1 Align | Pass（追记；IO Emily + SA Lumi） | g1-decision.md |
| 前端 build + 单测 | exit 0；37/37（C1–C11/P1–P11/日期 helper/team-route） | tasks T7.1/T8.4 |
| 后端回归 | 337/337 BUILD SUCCESS | frontend/logs/merge-mvn-test.log（gitignored）；CI 复核 |
| openspec validate | change --strict 0 ERROR（4 长度 WARNING）；--specs 8/8 valid | tasks T7.4/T8.6 |
| 浏览器验收 | 七轮全 PASS + R9 分流轮 Case A/B/C 全 PASS | tasks §T7.3/§R9 记录；35 张截图本地留存 |
| local-verify | Overall Pass | docs/ai4se-plugins/20261117-161355-local-verify-report.md |
| CI（E1） | ✅ 全绿 run 44051875289 @ d2708f3 | docs/ai4se-plugins/20261117-170809-pipeline-report.md + ci-report.md |
| G2 Verify | Pass（VL lumi） | g2-decision.md |
| 合并 | PR #127 merged d2708f3（用户选 PR 通道，CI 绿后合并） | GitHub |

## 知识库对账

- `tech-stack-plan` §23 landed reconciliation；`_LOG.md` 追加一行。
- KB update：`scripts/kb-lint.sh` → `SKIP: KB lint is not configured for this project.`（项目基线政策允许的非阻塞 SKIP；**不代表 KB lint 通过**）。

## Residual risks / 承接

- D-2 时区=设备本地（MVP 假设，用户确认）；跨时区成员见各自本地时间。accepted。
- 组活动段居中放置为前端派生（后端无显式组时间戳，DD-3）。accepted。
- 「免费」固定文案（读契约无 stop 级费用字段）。accepted。
- current trip 上下文不一致（成员页/分队 tab 读服务端 current trip）——shell 既有设计，范围外 tracking，建议后续 change 携带 trip 上下文。
- 4 个 spec requirement >500 字符 WARNING——后续拆分候选（/sdd:followups）。
- 后台 tab setInterval 节流——浏览器标准行为，前台恢复即正常。mitigated。
- 无方案态 trip 读两次 + 旧版 loading 微闪屏（DD-8 代价）。accepted。

## Links

- 需求：requirement-workspace/requirements/US-083-085.md（R1–R9）；analysis/us-083-085-dor.md
- 夹具：requirement-workspace/acceptance-test-fixtures.md §US-083-085
- 过程报告：docs/ai4se-plugins/20261117-161355-local-verify-report.md、20261117-170809-pipeline-report.md
- PR：https://github.com/afs-2026-zha1-group-1/gogo/pull/127