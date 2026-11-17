# Tasks — us-083-085-trip-details

先红后绿：T1/T2 纯函数先写测试跑红再实现；T3–T6 组件/页面随后；T7 验证门。
设计依据 design.md DD-1…DD-7；验收依据 atdd-design.md 矩阵。

## T1 倒计时纯函数（US-085）

- [x] 1.1 写 `frontend/tests/countdown.test.ts`（C1–C11），跑 `node --test` 确认红
- [x] 1.2 新增 `frontend/src/lib/countdown.ts`：`ScheduleItem`、`CountdownState`、
      `resolveCountdown(now, departureMs, schedule, tripEndMs)`、`formatCountdown(ms)`、
      `localMidnight(dateStr)`、`localEndOfDay(dateStr)`（DD-2/DD-4）
- [x] 1.3 跑绿 C1–C11

## T2 个人路线派生纯函数（US-084）

- [x] 2.1 写 `frontend/tests/personal-route.test.ts`（P1–P10），跑红
- [x] 2.2 新增 `frontend/src/lib/personal-route.ts`：`derivePersonalRoute(detail, accountId, plan)`、
      `scheduleFromMainPlan(plan, startDate)`、`selectSchedule(split, accountId, plan, startDate)`
      （R6 优先级；DD-3 算法；复用 split/types 与 types/mainPlan，不新增后端契约）
- [x] 2.3 跑绿 P1–P10
- [x] 2.4 `frontend/package.json` test:unit 改 glob 模式（`node --test "tests/*.test.ts" "tests/*.test.mjs"`，
      目录模式在 Node 24 不生效）

## T3 读组合 hook + 倒计时 hook（US-083/085）

- [x] 3.1 新增 `frontend/src/hooks/useTripOverview.ts`：五读并发（DD-1 表）、
      trip 门控六态、派生 schedule/myGroupLabel/readiness；accountId 字符串匹配
- [x] 3.2 新增 `frontend/src/hooks/useCountdown.ts`：每秒 tick + resolveCountdown（DD-4）

## T4 展示组件（US-083/085）

- [x] 4.1 新增 `frontend/src/components/CountdownCard.tsx`：倒计时卡 + NextStopDetail
      （R8：名称/时间/地址待确认/小组/建议出发；没有更多活动态）
- [x] 4.2 新增 `frontend/src/components/MyPlanTimeline.tsx`：DAY 标签 + tl-* 时间轴 +
      活动卡（图标方块/全员·免费/chips）+ 空态（DD-5）
- [x] 4.3 `frontend/src/app.css` 追加 DD-6 新类（countdown/avstack/act-ic/act-card/next-stop/day-tag）

## T5 TripDetails 重构（US-083，R5 删除清单）

- [x] 5.1 `frontend/src/pages/TripDetails.tsx`：接 useTripOverview；hero 两行；
      区块顺序 hero→CountdownCard→同行成员（avstack+就绪摘要+查看→#/members）→MyPlanTimeline
- [x] 5.2 删除 R5 五区块 + confirmMain/enterSplit 及 InvitationPanel import；
      appbar 右上人形图标 → `#/trips/{id}/invitation`

## T6 邀请全屏页 + 路由 + 确认返回（US-083/084，R4）

- [x] 6.1 `frontend/src/pages/InvitationPanel.tsx`：加可选 `showTitle`/`onReadyChange` prop（默认行为不变）
- [x] 6.2 新增 `frontend/src/pages/InvitationPage.tsx`：全屏 appbar（back/标题/生效中 pill）+ 复用 Panel；
      自行读 trip 判 isOrganizer（denied/missing/failed 态）
- [x] 6.3 `frontend/src/types.ts`：Route 加 invitation；InAppPage Exclude 加 invitation
- [x] 6.4 `frontend/src/App.tsx`：parseRoute invitation 正则（通用 trips 前）+ 全屏提前 return
- [x] 6.5 `frontend/src/features/split/screen-confirm.tsx`：confirm.isSuccess →
      `window.location.href = '/#/trips/' + tripId`（US-084 AC1）

## T7 验证门

- [x] 7.1 `npm run build` + `npm run test:unit` 全绿（31/31，含验收期新增 P11 回归）
- [x] 7.2 后端 `mvn test` 全绿（296/296，BUILD SUCCESS，零改动回归）
- [x] 7.3 浏览器逐 AC 对照两张参考截图（atdd-design §二全矩阵，含反向用例与倒计时边界）
- [x] 7.4 openspec validate --strict 无 ERROR（4 WARNING 非阻塞）；local-verify Overall Pass（docs/ai4se-plugins/20261117-161355-local-verify-report.md）→ PR #127（https://github.com/afs-2026-zha1-group-1/gogo/pull/127，base main，禁直推）

## T8 R9 页面分流修订（2026-11-17 用户裁决：无方案保留旧版，有方案才显新版）

- [x] 8.1 合并 origin/main（42a9239→e37c404，US-086/偏好/req-020 等）；解 6 文件冲突（package.json/types.ts/App.tsx/TripDetails.tsx/fixtures/registry，文档类 main 侧在前本 change 追加在后）
- [x] 8.2 `TripDetails.tsx` 改分流入口（useTripOverview 四态统一渲染；plan==null→TripDetailsLegacy，有 plan→TripOverview）；新增 `pages/TripDetailsLegacy.tsx`（main 旧版逐字保留仅改名）+ `components/TripOverview.tsx`（原新版 ready 渲染体，DD-8）
- [x] 8.3 R9 同步：trips delta spec（概览门控/无方案回退旧版/旧版保留主线入口）、requirements R5/R6 修订+R9 登记、design DD-8、fixtures S0/优先级/分流派生行、registry 状态行、atdd-design 083-4 改写+083-7/083-8 新增
- [x] 8.4 `npm run build` exit 0 + `npm run test:unit` 37/37（含 main 新增 team-route 测试）
- [x] 8.5 浏览器验证两态：S0 旧版区块齐全+入口可用（083-4/083-7）；S1/S2 新版概览（083-1…3/5/6 回归）；生成主线后切换（083-8）——R9 轮 Case A/B/C 全 PASS（见下节）
- [ ] 8.6 openspec validate --strict 无 ERROR；commit+push 更新 PR #127

## R9 浏览器验收记录（2026-11-17，合并 origin/main 后）

后端重打包重启（V9 迁移自动应用）；前端 Vite HMR 生效。Alice 真实 UI 操作，三轮全 PASS：

| Case | 覆盖 | 结果 | 关键证据 |
|---|---|---|---|
| A trip 1（S2 confirmed） | 083-1/2/3/5/6 回归 | PASS | hero 两行+倒计时「17 天 07:16:15」+4 位成员+A 组路线（National Gallery）+共同段；R5 区块 DOM 命中全 0；右上邀请图标在 |
| B trip 12（S0 新建无方案） | 083-4/083-7 | PASS | 旧版四区块齐全（行程信息四项/偏好卡/内嵌 QR+链接/查看主线方案）；倒计时/成员/我的方案/邀请图标命中全 0；「查看主线方案」→空态+去生成、「设置我的兴趣」→偏好页均通 |
| C trip 12 生成后 | 083-8 | PASS | 首次生成被就绪门拦（0/1）→旧版偏好入口提交（1/1）→一键生成草稿 v1→info 按钮回详情→已切新版概览（倒计时 32 天+4 活动内嵌）；旧版区块命中全 0；回 trip 1 仍新版 |

观察（非缺陷）：① trip 1 种子 endDate=2026-12-05（单日行程），页面如实渲染；② 生成门控文案「全员就绪后才能生成」符合 US-031 设计；③ 草稿（未确认）方案即触发新版概览——分流条件是「存在主线方案」而非「已确认」，与 R9/spec 一致。
截图证据（6 张，仅本地留存不入库）：`ui-design-reference/screenshots/us-083-085-acceptance/r9-*.png`。
验收后 DB restore 回初始备份（test trip 12 清除），后端重启补齐 V9。

## T7.3 浏览器验收记录（2026-11-17）

七轮 Browser 验收（真实账号 + fixtures State setup 注入，每轮 restore 初始 S2 备份后单注入）：

| 轮 | 状态 | 覆盖 AC | 结果 |
|---|---|---|---|
| 1a Alice | 初始 S2 + pre-trip | 083-1…5 / MOD-1 / INV-1…3 / SHELL-1…2 / 085-1 / 084-2 / 成员卡 | 12/13 PASS，083-3 chips 缺陷（已修） |
| 1b Ben/Chloe/Eve | 初始 S2 | 084-3 隔离 / 083-6+INV-4…5 非组织者 / N1…2 非成员 | 8/8 PASS，chips 修复复验通过 |
| 2a | s5-main（split cancelled） | 085-2…3 during→边界→between / 084-5 回退 / R8 地址缺失 / tick | 6/6 PASS，边界 15:39 精确切换无负数 |
| 2c | s5-pending | R8 交通缺失→建议出发待确认 / 085-6b 边界 / 085-N2 没有更多活动 | 5/5 PASS |
| 3a Alice/Chloe | s5-split（confirmed ISO） | 085-4a…c 我组时间戳 / 084-4a…b 组隔离 | 5/5 PASS |
| 3b Alice | s3-active→UI 确认 | 084-1a…c 确认面→自动返回详情→固化 / 084-2 | 4/4 PASS |
| 4 Ben/Alice | s4（Ben 未分配） | 084-4r 回退主线不泄他组 + Alice 对照 | 3/3 PASS |
| 5 Alice | s5-done + S0 trip 11 | 085-5 已结束 / 085-N1 今日无安排 / 083 空态不泄他行程 | 8/8 PASS |

缺陷修复（先红后绿）：组活动卡 interests 硬编码 `[]` → `personal-route.ts` 按名从 main plan 补全
（与 sharedItem 同逻辑）；新增 P11 回归测试，31/31 绿 + build 绿，Round 1b 浏览器复验通过。

版式对照：两张参考截图逐区块结构一致；差异均为 AC 强制移除项（微信/有效期/撤销）或真实数据差异。
截图证据：`ui-design-reference/screenshots/us-083-085-acceptance/`（29 张，仅本地留存不入库，目录已 gitignore）。
注入助手：`backend/target/t73-flip.py`（gitignored，test-only）；cancelled 文档 routes 必须为 null
（SplitDraftDocument.cancelled()），写 [] 会致读侧 Jackson 500。

范围外观察（记录不修，focused change）：
1. 成员页/分队 tab 读 current trip（服务端=5），与详情页 trip 1 上下文不一致——shell 既有设计，
   建议后续 change 让成员卡「查看」携带 trip 上下文或同步 current。
2. 仪表盘对已有行程用户仍显创建空态（US-061 范围）。
3. 详情页 div.body 滚动条未套主题色（参考图未规定）。
4. 后台 tab setInterval 节流致倒计时 tick 变慢——浏览器标准行为，前台恢复即正常。
5. 无方案行程 main-plan GET 404 在 console 留一条预期错误日志（前端已正确降级空态）。