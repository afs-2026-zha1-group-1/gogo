# ATDD Design — us-083-085-trip-details

两层验收：UT（纯函数，node:test，先红后绿）+ AT（浏览器逐 AC 对照参考截图）。
夹具权威：`requirement-workspace/acceptance-test-fixtures.md §US-083-085`（S0–S5 / T1–T6）。
版式权威：看板 US-083 两张附件截图（R1）。

## 一、UT 测试矩阵（tests/，node --test）

### countdown.test.ts（DD-4，映射 trips delta「Activity countdown and next stop」）

| # | 用例 | 输入 | 期望 | 正/反 |
|---|---|---|---|---|
| C1 | pre-trip | now < startDate 00:00 | kind=pre-trip，target=本地午夜 | 正 |
| C2 | during | start ≤ now < end | kind=during，remaining=end−now>0 | 正 |
| C3 | between | 上一活动 end ≤ now < 下一 start | kind=between，next=下一项 | 正 |
| C4 | 边界：恰在 end | now == end | 切 between/during，绝不 during 负数 | 反 |
| C5 | 边界：恰在 start | now == start | kind=during（半开区间） | 反 |
| C6 | 最后一项结束 | now ≥ 最后 end | kind=finished | 正 |
| C7 | 无时间已知活动+行程内 | schedule 全 null 时间 | kind=no-schedule | 反 |
| C8 | 无活动+行程已结束 | now > endDate 23:59:59.999 | kind=finished | 反 |
| C9 | clamp | 构造 remaining<0 的渲染输入 | formatCountdown 输出 ≥0 | 反 |
| C10 | format | 90061000ms | 1 天 01:01:01（padStart） | 正 |
| C11 | 时间未知项跳过 | 混合 null/已知时间 | 只对已知项判定，null 项不产生 during | 反 |

### personal-route.test.ts（DD-3，映射「Personal route after split confirmation」）

| # | 用例 | 夹具 | 期望 | 正/反 |
|---|---|---|---|---|
| P1 | 我组路线+共同段 | S2 Alice∈A | before+组A活动+after；无 B 组项 | 正 |
| P2 | 成员隔离 | S2 Chloe∈B | 只含 B 组活动，与 P1 输出不同 | 正 |
| P3 | 未分配 | S4 Ben∉任何组 | 返回 null（不显他组） | 反 |
| P4 | 未确认/取消 | S3 active/cancelled | derive 入口不产出个人路线（hook 层回退主线） | 反 |
| P5 | 时长缺失 | activityMinutes=null | 组活动段 start/end=null（待确认，不伪造） | 反 |
| P6 | 越窗时长 | activity>window | start/end=null | 反 |
| P7 | 边界 stop 定位 | departure/reunion id 命中 | 边界 stop 保留在共同段（before 含 departure、after 含 reunion），组段不重复 | 正 |
| P8 | stop id 缺失退化 | id 不在 mainPlanStops | 全共同段+组段按时间插入排序 | 反 |
| P9 | 主线 HH:mm 拼接 | S1 plan+startDate | 本地日期拼接正确、interests/travel 保留 | 正 |
| P10 | R6 优先级 | confirmed+在组 vs 仅 plan | selectSchedule：个人路线 > 主线 > [] | 正 |
| P11 | 组活动 interests 补全 | activityName 命中 main plan stop | 按名补全 interests；无匹配保持 []（T7.3 验收缺陷回归） | 正+反 |

## 二、AT 浏览器验收矩阵（逐 AC + 反向用例）

前置：`npm run dev` + 后端运行；用真实账号走 T1–T6 请求造状态（不种子）。

### US-083（trips delta「Trip detail overview layout」+ MODIFIED 导航条目）

| AC | 步骤 | 期望（对照参考图1） | 反例 |
|---|---|---|---|
| 083-1 | 成员打开 #/trips/{id} | hero 两行：名字 / cal+日期+pin+目的地；无「行程信息」重复列表 | 旧版三行 hero+hmeta 不得出现 |
| 083-2 | 同上 | 区块顺序 hero→倒计时→同行成员→我的方案；无偏好卡/内嵌邀请/分队规划区/确认主线按钮/查看主线方案链接 | 任一 R5 区块残留即 FAIL |
| 083-3 | S1 有主线 | 我的方案直显活动卡+时间（DAY 1 标签、图标方块、全员·免费、chips） | 无需点击导航；渲染不发 POST/PUT/DELETE（DevTools Network 核） |
| 083-4 | S0 无方案 | 空态「还没有方案」 | 不显示其他行程路线 |
| 083-5 | 成员卡 | avstack 头像+N 位朋友已加入+就绪摘要+「查看」→#/members | 查看只读，无写请求 |
| 083-6 | 组织者点右上人形图标 | hash 变 #/trips/{id}/invitation，无整页刷新 | 非组织者进入见权限态（见 INV-4） |
| MOD-1 | MainPlan 页 info 按钮返回 | 回 #/trips/{id} ready 态、内嵌方案仍可见；MainPlan 六态不变 | 非成员直连 main-plan 仍 denied；未登录仍跳 login |

### US-084（「Personal route after split confirmation」）

| AC | 步骤 | 期望 | 反例 |
|---|---|---|---|
| 084-1 | 组织者走完 split confirm（T4） | 成功后自动回同一行程详情 | 失败/取消不跳转 |
| 084-2 | S2 Alice 打开详情 | 我的方案=A 组活动+时间+会合前后共同活动 | 时间来自 confirmed ISO 快照 |
| 084-3 | Chloe 登录同行程 | 见 B 组路线 | Alice 不见 B 组、Chloe 不见 A 组 |
| 084-4 | S4 未分配成员 | 不显任何组路线（回退主线或空态） | 不得把他人组当自己方案 |
| 084-5 | S3 active/cancelled | 回退主线/空态 | 无「已确认」标签的未确认路线 |

### US-085（「Activity countdown and next stop」）

| AC | 步骤 | 期望（对照参考图1倒计时卡） | 反例 |
|---|---|---|---|
| 085-1 | S5 未出发 | 「距离出发」+ N 天 HH:MM:SS 每秒跳动 | 改系统时间/等待跨秒验证 tick |
| 085-2 | S5 活动中 | 剩余时间+下一站详情持续更新 | 下一站=我组下一项，非他组 |
| 085-3 | S5 活动间 | 距下一活动开始倒计时 | — |
| 085-4 | S2 confirmed | 倒计时/下一站用我组 ISO+共同活动 | 不用他组时间 |
| 085-5 | 跨边界（调系统时间到 end/start） | 按当前时间切换状态 | 任何时刻不显负数 |
| 085-6 | 无安排/最后一项 | 「今日无安排」/「没有更多活动」 | 不显其他日期/行程活动 |
| 085-N1 | 下一站地址/交通缺失 | 「待确认」 | 不伪造建议出发时间 |
| 085-N2 | 交通已知 | 建议出发=下一 start−travelMinutes | — |

### INV（invitations delta「Invitation page entry」，对照参考图2）

| AC | 步骤 | 期望 | 反例 |
|---|---|---|---|
| INV-1 | 组织者进入邀请页 | 全屏无底部 dock；appbar back+邀请朋友+US-008 sub+生效中 pill；QR 卡+linkbox+复制 | 无微信/有效期/撤销（D-1） |
| INV-2 | 离开再进入 | 同 token 同链接 | 不新增邀请记录 |
| INV-3 | back | 回同一行程详情 ready 态 | — |
| INV-4 | 非组织者直连 #/trips/{id}/invitation | 权限卡「只有组织者可以分享邀请链接」 | 无链接/token/QR 泄露 |
| INV-5 | 复制按钮 | 剪贴板=join 链接，按钮变「已复制」 | 无额外服务端写 |

### app-shell delta

| AC | 步骤 | 期望 |
|---|---|---|
| SHELL-1 | 邀请页 | 无 TabBar；其余 in-app 页 5-tab 不变 |
| SHELL-2 | 详情页 | trips tab active 不变 |

## 三、门与回归

- UT 先红后绿：P4 每个纯函数先写测试跑红，再实现跑绿。
- `npm run build`（typecheck+vite）、`npm run test:unit`、后端 `mvn test` 全绿。
- T1–T6 回归请求确认既有端点契约未破坏（尤其 main-plan 六态、split 确认/取消）。
- 视觉：逐区块对照两张参考截图（hero 两行/倒计时卡/成员卡/活动卡/邀请全屏页）。