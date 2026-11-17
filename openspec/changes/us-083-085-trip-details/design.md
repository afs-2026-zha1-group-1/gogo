# Design — us-083-085-trip-details

权威输入：`requirements/US-083-085.md`（R1–R8）、三份 delta spec、看板 US-083 两张参考截图（R1）。
后端零改动（前提成立：五读端点均已存在）；splits spec 不动。

## DD-1 读组合：useTripOverview（五读并发 + 纯派生）

hash shell 页沿用手写 `api()` + `useEffect` 先例（US-071 裁决），split 读复用
`features/split/api.ts` 的 `fetchDraftDetail`（{data,error} 封套已解包，无草稿返回 null）。

并发五读（`Promise.allSettled`，tripId 变化时重取、卸载置 active=false）：

| 读 | 端点 | 失败降级 |
|---|---|---|
| trip | `GET /api/trips/{id}` | 403→denied、404→missing、其他→failed（沿用 TripDetails 现有六态） |
| main-plan | `GET /api/trips/{id}/main-plan` | 404/失败→plan=null（我的方案走空态或分队路线） |
| inputs | `GET /api/trips/{id}/main-plan/inputs` | 失败→readiness=null（就绪摘要降级为「N 位朋友已加入」） |
| members | `GET /api/trips/{id}/members` | 失败→members=[]（头像堆隐藏，不阻塞整页） |
| split-draft | `fetchDraftDetail(String(id))` | throw/null→split=null（回退主线） |

trip 是门控读：非 ready 时整页渲染现有 denied/missing/failed 态，不发其余渲染依赖。
派生全部走纯函数（DD-3/DD-4），hook 只做组装：
`myGroup` / `personalRoute` / `schedule` / `countdownState(now)`。

身份对齐：split `groups` 成员 id 为字符串化 userId，用 `useAuth().accountId`
（= `String(account.id)`，AuthProvider L130）匹配，不用 `account.id` 数字比较。

## DD-2 统一时间轴模型 ScheduleItem

倒计时与「我的方案」共用一个派生时间轴（设备本地时区，D-2）：

```ts
interface ScheduleItem {
  key: string
  name: string
  start: number | null   // epoch ms；null = 时间待确认
  end: number | null
  groupLabel: string | null  // null = 全员共同活动
  interests: string[]
  address: string | null     // 现有读契约无地址字段 → 恒 null → 渲染「待确认」（R8 不伪造）
  travelMinutesToNext: number | null
}
```

- 主线态：`mainPlanStopsFromPlan(plan, trip.startDate)` —— 每 stop 的 `HH:mm`
  用 `new Date(`${startDate}T${HH:mm}:00`)` 拼本地日期（MVP 单日假设，与 MainPlan
  页「Day 1 · startDate」一致）；保留 interests / travelMinutesToNext。
- 个人路线态：`derivePersonalRoute(detail, accountId, plan)`（DD-3）。
- 优先级（R6）：split.status==='confirmed' 且我在某组 且 该组路线存在 → 个人路线；
  否则 plan?.stops → 主线；皆无 → schedule=[]（空态）。

## DD-3 个人路线派生算法（lib/personal-route.ts，纯函数）

输入 `SplitDraftDetail`（confirmed）、`accountId`、`MainPlan | null`：

1. `myGroupLabel` = `Object.entries(detail.groups)` 中成员数组含 accountId 的 label；
   找不到 → 返回 null（未分配成员不渲染任何组路线，R6/反例 S4）。
2. `myRoute` = `detail.routes.find(r => r.groupLabel === myGroupLabel)`；无 → null。
3. 共同段切分（后端核实：departureAt=departure stop 的 endAt，reunionAt=reunion stop
   的 startAt，BoundaryResponse javadoc）：`mainPlanStops` 按 id 定位两边界 stop：
   - before = 序号 ≤ departure 序号的 stops（含 departure stop，全员做完才分开）；
   - after = 序号 ≥ reunion 序号的 stops（含 reunion stop，会合后全员同行）；
   - 组活动段插在 before/after 之间，不与边界 stop 重复；
   - stop id 找不到时退化为「全部共同 stops + 组活动段按 departureAt/reunionAt 插入排序」。
4. 组活动段时间（仅用已确认快照的 ISO 时间戳 + 时长，不伪造）：
   - `window = reunionAt - departureAt`；`activityMinutes` 已知且 `0 < activity ≤ window` 时：
     `center = departureAt + window/2`，`start = center - activity/2`，`end = center + activity/2`
     （居中放置，去程/返程交通落在两侧空隙；与 screen-confirm 的合计口径一致）。
   - `activityMinutes` 缺失或越窗 → start/end = null（卡显「时间待确认」，不参与倒计时）。
   - `travelMinutesToNext`（组活动 → 会合后第一站）= `travelLegsMinutes` 最后一项；
     去程参考 = 第一项；legs 为空 → null。
5. 输出 `ScheduleItem[]`：before 共同段（ISO startAt/endAt）+ 组活动段
   （groupLabel=myGroupLabel，name=activityName ?? '小组活动'）+ after 共同段，按 start 排序
   （null 时间排最后）。只含我组，绝不混入他组路线。

## DD-4 倒计时状态机（lib/countdown.ts，纯函数 + node:test）

```ts
type CountdownState =
  | { kind: 'pre-trip'; target: number }
  | { kind: 'during'; item: ScheduleItem; remainingMs: number }
  | { kind: 'between'; next: ScheduleItem; remainingMs: number }
  | { kind: 'finished' }
  | { kind: 'no-schedule' }
```

`resolveCountdown(now, departureMs, schedule, tripEndMs)` 判定序（R7）：

1. `now < departureMs`（startDate 本地 00:00）→ pre-trip。
2. 取时间已知（start/end 非 null）且按 start 排序的活动：
   - 存在 `start ≤ now < end` → during（remaining = end − now）；
   - 否则第一个 `start > now` → between（remaining = start − now）；
   - 否则 now ≥ 最后一项 end → finished。
3. 无时间已知活动：`now > tripEndMs`（endDate 本地 23:59:59.999）→ finished；
   否则 no-schedule（今日无安排）。

边界不变量：半开区间 `[start, end)`，到 end 瞬间切 between/下一 during；
所有 remaining 在渲染层 `Math.max(0, …)` clamp，任何时刻不显负数。
`formatCountdown(ms)` → `{ days, hh, mm, ss }`（padStart(2)），pre-trip 渲染
`N 天 HH:MM:SS`，during/between 渲染 `HH:MM:SS`（days>0 时同样带 N 天）。

`useCountdown(departureMs, schedule, tripEndMs)`：`useState(() => Date.now())` +
`setInterval` 1000ms tick（卸载清理），每次 tick 调 resolveCountdown —— 边界切换
由纯函数按当前时间重算，天然无负数、无 stale 状态。

## DD-5 组件与页面

### CountdownCard（components/CountdownCard.tsx）
白卡：左标签（pre-trip「距离出发」/ during「活动剩余」/ between「距下一站」），
右大号 teal 等宽数字（`font-variant-numeric: tabular-nums`）。
finished → 「行程已结束」；no-schedule → 「今日无安排」。
during/between 时卡下渲染 NextStopDetail（US-085 R8）：
名称 / 时间段 / 地址（null→「地址待确认」）/ 小组（共同→「全员」）/
建议出发 = next.start − travelMinutesToNext（仅两者皆已知才显示，否则「待确认」）。
无下一站（during 且为最后一项）→ 「没有更多活动」。

### MyPlanTimeline（components/MyPlanTimeline.tsx）
复用 MainPlan.tsx L269-293 的 `.timeline/.tl-item/.tl-rail/.tl-node/.tl-line/.tl-card`
标记模式。sec-title「我的方案」（list 图标）→「DAY 1 · M月D日（周X）」（clock 图标，
由 trip.startDate 本地格式化）→ 时间标签在卡上方（`HH:mm – HH:mm`，null→「时间待确认」）
→ 卡内：左图标方块（`.act-ic`，共同=pin、组活动=route）+ 粗体名 + sub
「全员 · 免费」/「A 组 · 免费」（现有读契约无费用字段 → 固定「免费」文案对齐参考图，
不伪造金额）+ interests chips。schedule=[] → `.empty` 空态「还没有方案」
（组织者提示去仪表盘生成，成员提示等待组织者；不显示其他行程路线）。

### 同行成员 sec（TripDetails 内联）
`.avstack` 重叠头像（≤4，复用 `.member-avatar tone-N` 与 Members.tsx 的 initial()
口径）+「N 位朋友已加入」+ 就绪摘要（inputs.readyCount===memberCount→「偏好全部就绪」，
否则「x/N 位成员已就绪」；inputs 缺失→省略该行）+ 右「查看」按钮 → `#/members`
（只读导航，不发写请求）。

### TripDetails 重构（pages/TripDetails.tsx）
- appbar：back→`#/`、标题「行程详情」/sub「US-002 · 全员可见」不变；右上新增
  人形邀请 `.iconbtn`（Icon `user`）→ `#/trips/{id}/invitation`（全员可见入口，
  权限态在邀请页内裁决，R4）。
- hero 压缩两行：h1 名字一行；第二行 cal+`startDate – endDate`+pin+destination；
  删除 htop/hmeta（出发地/返程地/组织者不再重复展示）。
- 区块顺序：hero → CountdownCard → 同行成员 → MyPlanTimeline。
- 删除（R5）：行程信息列表、旅行偏好卡、内嵌 InvitationPanel、主线方案链接卡、
  分队规划区（含 confirmMain 的 `/main-plan:confirm` 冒号调用与 enterSplit）。
  旧冒号端点调用随删除消失，MainPlan 页斜杠 `/main-plan/confirm` 为唯一确认路径。
- 数据改由 useTripOverview 提供；六态（loading/ready/denied/missing/failed）保留。

### InvitationPage（pages/InvitationPage.tsx，全屏）
- appbar：back→`#/trips/{id}` + 标题「邀请朋友」/sub「US-008 · 分享邀请链接」+
  右 pill「生效中」（仅邀请 ready 时显示）。
- body 复用 `<InvitationPanel tripId isOrganizer showTitle={false} onReadyChange={…}/>`：
  QR 卡 + 邀请链接 linkbox + 复制按钮原样；denied 卡（非组织者）原样，不泄链。
- InvitationPanel 最小扩展两个可选 prop：`showTitle?: boolean`（默认 true，
  详情页旧用法不受影响——实际上详情页已不再内嵌，保留默认兼容 Join 等潜在调用）、
  `onReadyChange?: (ready: boolean) => void`（state effect 中回调，驱动 pill）。
  签发/重复同 token/复制契约零改动（POST /invitation 幂等由后端保证）。
- D-1 不做：微信分享按钮、有效期卡、撤销按钮一律不渲染。

### 路由接入（三处 + 一处导航）
1. `types.ts`：Route union 加 `{ page: 'invitation'; tripId: number }`；
   InAppPage Exclude 列表加 `'invitation'`（全屏无 tabbar，app-shell delta）。
2. `App.tsx` parseRoute：`/^\/trips\/(\d+)\/invitation$/` 置于通用 `/trips/(\d+)` 之前；
   signedIn 检查后加全屏提前 return（与 preferences 同模式，`<div className="app">` 包裹）。
3. `screen-confirm.tsx`：`useEffect(() => { if (confirm.isSuccess) window.location.href = '/#/trips/' + tripId }, [confirm.isSuccess, tripId])`
   —— 跨路由空间返回用整页导航（先例：router.tsx `/account → /#/account`）；
   确认成功后回同一行程详情（US-084 AC1），详情重取 split-draft 即见个人路线。
   失败/取消路径不受影响（isSuccess 仅成功时 true）。

## DD-6 样式（app.css 追加 scoped 段，不引新 UI 库）

新增类：`.countdown`（flex 白卡布局）、`.countdown-label`、`.countdown-value`
（22px/780/teal/tabular-nums）、`.avstack`（flex，头像负 margin 重叠 + 白描边）、
`.act-ic`（34px 圆角方块，brand-soft 底）、`.act-card`（tl-card 内 flex 行）、
`.act-sub`、`.next-stop`（详情行列表）、`.day-tag`。全部沿用现有 token
（--brand/--brand-soft/--ink-*/--line/--r*），与参考图1/2 逐块对齐。

## DD-7 测试基建

- 纯函数单测沿 node:test 先例（tests/trip-date.test.ts）：新增
  `tests/countdown.test.ts`、`tests/personal-route.test.ts`；
  `package.json` test:unit 改 `node --test tests/`（目录模式，lockfile.test.mjs 一并纳入）。
- 组件/页面层走浏览器手工验收（逐 AC 对照参考截图 + 反向用例），见 atdd-design.md。
- 后端 `mvn test` 回归（零改动前提下必须全绿）。

## 残留风险

- D-2 时区=设备本地（MVP 假设，G1 确认）；跨时区成员见各自本地时间。
- 组活动段居中放置是前端展示派生（快照只给窗口+时长），非后端契约；
  若 G1 要求其他锚定口径，仅改 DD-3 第 4 步。
- 「免费」文案为参考图对齐的固定展示（读契约无费用字段），不渲染真实金额。