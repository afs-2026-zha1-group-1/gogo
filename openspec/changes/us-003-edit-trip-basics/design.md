# Design — us-003-edit-trip-basics

## Context

行程六字段（name / destination / startDate / endDate / startLocation / endLocation）在 V2 迁移即已落库，但整条更新链路不存在：`TripController` 只有创建/读取/current/主线确认，`TripRepository` 无 update 方法，`TripDetails.tsx` 纯只读。US-003（issue #60，合并 US-004~007）要求组织者在主线确认前编辑五类信息，确认后锁定。既有基线：US-066 会话认证（`AccountPrincipal`）、扁平 `{code,message}` 错误包封套、手写 `api()` + `useEffect` 前端数据流、SQLite 单写者 + 条件更新铁律。

「我的」页名字编辑现为常驻表单，且该布局被 Living `auth` spec 明文锁定；用户 2026-11-17 裁决改按钮触发，方案 B 并入本 change。

## Goals / Non-Goals

**Goals:**

- 组织者可在主线确认前整表单更新行程基本信息；确认后任何修改被拒绝且数据不变。
- 非组织者（含直接 API 请求）无法修改共享信息（US-016）；确认后的锁定对全部成员生效（US-017）。
- 编辑入口与编辑页在 UI 层按角色/状态收敛，后端仍是权威守卫。
- 组织者可在未确认草稿上编辑单个 stop 的地点名与起止时间；可行性由既有确认校验把关，确认后编辑被拒。
- My Account 名字编辑改为按钮触发的原位展开，API 契约与校验不变。

**Non-Goals:**

- 不改 `organizerId`（无转让故事）、不改 `mainPlanConfirmed` 状态机（确认仍走既有主线流程）。
- 不做逐字段 PATCH、不做编辑历史/审计、不做乐观锁版本号（单组织者 + 条件写已够）。
- 不动邀请、分队、主线、偏好、成员名册语义；不引入缓存失效框架或新依赖。
- 不修 Living trips 两处历史措辞漂移（确认操作禁令、列表 read-only 场景），记录于 cross-change-scan，另行收敛。

## Decisions

### D1 整表单 PUT，复用创建校验

`PUT /api/trips/{id}`，body 与 `POST /api/trips` 完全相同（复用 `TripCreateRequest` record），响应复用 `TripResponse`。校验顺序与创建一致：日期解析 → 名称非空 → 目的地非空 → 结束≥开始 → 空白起终点 `blankToNull`。

- 备选：逐字段 PATCH。否决：六字段强相关（日期成对校验），整表单让前后端各只有一条校验路径，MVP 无部分更新诉求。
- 幂等：同值重复 PUT 结果不变，无需额外去重。

### D2 守卫链与错误契约

顺序：404 `TRIP_NOT_FOUND`（行程存在）→ 403 `NOT_A_MEMBER`（成员）→ 403 `NOT_ORGANIZER`（组织者，新码）→ 409 `MAIN_PLAN_CONFIRMED`（未确认，新码）→ 400 字段校验。任何拒绝零写入。

- 403 vs 409 分界：权限不够（身份/角色）用 403，时机已过（状态冲突）用 409，前端可给出「只有组织者可修改」与「主线已确认，信息已锁定」两种准确提示。与 main-plan 既有 409 用法（`ALREADY_CONFIRMED` / `STALE_DRAFT`）同族。
- 错误码 `NOT_ORGANIZER` 为 main-itinerary 既有码（`MainPlanService` 已使用），trips 端点复用；`MAIN_PLAN_CONFIRMED` 与 mainplan 新增的 `STOP_NOT_FOUND` / `INVALID_TIME` / `INVALID_TIME_RANGE` 为新码，需 IO 在 G1 确认（cross-change-scan 轴 4）。
- 备选：锁定也用 403。否决：混淆权限与状态，成员被锁定时会误以为自己权限不足。

### D3 条件写防确认竞态

读守卫通过后，落库用单条条件更新：

```sql
UPDATE trip SET name=?, destination=?, start_date=?, end_date=?, start_location=?, end_location=?
WHERE id=? AND main_plan_confirmed=0
```

影响行数 0 → 409 `MAIN_PLAN_CONFIRMED`。避免「读时未确认、写前刚确认」的 TOCTOU 窗口（SQLite 铁律 2：唯一索引 + 条件更新，无 `SELECT FOR UPDATE`）。单事务、单语句，池=1 下无额外锁需求。

### D4 起终点可清空

空白/缺省起终点归一为 null（与创建同规则），详情页回到「未设置 / 尚未设置，可由后续主线生成补全」展示。补错了能撤，符合创建页「起终点也可稍后再补」的口径。名称与目的地仍必填，不允许清空。

### D5 前端路由与编辑页

- 新 hash 路由 `#/trips/<id>/edit` → `EditTrip.tsx`。`App.tsx parseRoute` 必须在通用 `/trips/<id>` 正则**之前**匹配 edit（US-067 D1 教训：顶层新路由会被详情正则吞掉）；`TAB_FOR_PAGE` 归 `trips` tab。
- 编辑页复用创建页的字段布局与日期校验（结束<开始即 `invalid` + 提示），mount 时 `GET /api/trips/{id}` 预填。
- 编辑页守卫态：非成员 → 既有 denied 态；成员非组织者 → 「只有组织者可以修改行程信息」+ 返回详情；已确认 → 「主线方案已确认，行程信息已锁定」+ 返回详情。UI 守卫只是体验，后端 D2 仍是权威。
- 保存成功 → `window.location.hash = '#/trips/<id>'`；失败 → 展示服务端 `{code,message}`（409/403 时给出对应锁定/权限文案），表单保留已填值。

### D6 刷新面靠 mount 重读，不引缓存机制

详情、`#/my-trips` 列表、邀请预览都是 mount 时 `api()` 重读（手写基线，无 TanStack Query 缓存）。保存后导航回详情即触发重读；列表与预览在下次打开时自然拿到新值。不新增 invalidate 机制。`TripDetails` 的编辑入口按 `isOrganizer && !trip.mainPlanConfirmed` 渲染，位于「行程信息」sec-title 行右侧。

### D7 My Account 名字编辑按钮化

- profile 头部名字行右侧加图标按钮（`Icon name="edit"`，`aria-label="编辑名字"`）。
- 点击 → 名字行原位展开：输入框（预填现值，maxLength 30）+ 「保存」主按钮 + 「取消」次按钮；移除常驻 label/input/「保存名字」表单。
- 保存：沿用 `updateName`（`PATCH /api/auth/me`）与 1–30 字符前端校验、`INVALID_NAME` 文案；成功 → 收起编辑态，头部显示新名字（AuthProvider 已更新 account 并 invalidate queries）。失败 → 编辑态内显示错误，不收起。
- 取消 → 丢弃未保存输入，收起，头部名字不变。
- 备选：弹窗 dialog。否决：移动端单字段编辑用原位展开更轻，不引入新组件层；shadcn/ui 目录无 dialog 组件，避免为单字段新增。
- API、CSRF、错误契约零变化；仅 Living auth 的布局句与 layout scenario 改写（MODIFIED 全文携带）。

### D8 测试策略

- 后端 API 测试（先红后绿）：更新成功与读后一致、六字段校验四码、守卫链四态（404/403 成员/403 组织者/409 锁定）、清空起终点、同值幂等、锁定后条件写零变更、未登录 401、仅 `X-User-Id` 头 401、创建/读取/列表语义回归。
- 前端已有 node:test 纯逻辑 runner（US-071 followups 落地，`npm run test:unit`）：日期校验等可提取的纯函数走 UT；编辑页与 AccountPage 组件交互由浏览器 E2E 覆盖：入口可见性矩阵（组织者×确认态）、预填、日期校验、保存回详情、拒绝态、名字编辑展开/保存/取消、错误文案。
- 夹具沿用 V2 种子（Alice 组织者 trip 1，Ben 成员，Eve 非成员）；锁定态用既有 `main-plan:confirm` 或测试库 setup，与 trips spec 既有口径一致。

### D9 主线 stop 编辑：端点与可编辑面

`PUT /api/trips/{id}/main-plan/stops/{seq}`，请求体 `{name, startTime, endTime}`，响应复用 `PlanResponse`（与草稿读同一投影，客户端保存后可直接替换视图）。

- 可编辑：`name`（地点/活动名）、`startTime`、`endTime`（`HH:MM`，与 `ScheduleValidator` 现有解析口径一致）。
- 不可编辑：`seq`（顺序）、`travelMinutesToNext`（交通时长由提供商给出，可行性属确认校验职责）、`interests_json`（兴趣标签属生成输入）。请求中出现这些字段一律忽略，不落写。
- 原位改当前草稿（`main_plan_stop` 对应行），不 bump `version`、不改 `input_revisions`；版本语义保持「只在生成时递增」。
- 备选：整草稿 PUT（一次提交全部 stops）。否决：单 stop 编辑是自然交互，整草稿 PUT 扩大冲突面且要处理 seq 重排；MVP 不做增删 stop、不做拖拽重排。

### D10 stop 编辑守卫与错误码

顺序：404 `TRIP_NOT_FOUND` → 403 `NOT_A_MEMBER` → 403 `NOT_ORGANIZER`（复用既有码）→ 404 `NO_DRAFT`（复用）→ 409 `ALREADY_CONFIRMED`（复用，确认后冻结）→ 404 `STOP_NOT_FOUND`（新码，seq 不存在）→ 400 校验：空白名 `NAME_REQUIRED`（复用）、时间不可解析 `INVALID_TIME`（新码）、结束≤开始 `INVALID_TIME_RANGE`（新码）。任何拒绝零写入。

- 与 trips 端点的 `MAIN_PLAN_CONFIRMED` 并存：trips 用描述性新码，main-itinerary 复用其族内既有 `ALREADY_CONFIRMED`；两者都是 409，理由在 G1 轴 4 记录（不强行统一，避免改动已归档契约）。
- 备选：编辑也不做字段校验、全部交给确认。否决：`endTime <= startTime` 与坏时间格式是录入错误，应立即反馈；跨 stop 的间隔/重叠才属于确认校验。

### D11 先存后验：编辑与确认校验的接缝

- 编辑只做单 stop 自洽校验；跨 stop 的 `OUT_OF_ORDER` / `OVERLAP` / `MISSING_LEG` / `TRAVEL_EXCEEDS_GAP` / `OUT_OF_DAY` 仍由既有 `ScheduleValidator` 在确认时计算，类型与场景（C3）不变。
- 手动编辑不改 `input_revisions`，`stale` 仍只由成员偏好 revision 驱动；编辑后的草稿即使变「不可行」也只在确认时被 422 拦截，草稿本身可继续修。
- 重生成（G5）整份替换当前草稿，**手动编辑随之丢弃**；前端在重生成入口提示「重新生成将丢弃手动修改」。备选：把编辑合并进新草稿。否决：与 US-036 的「替换」语义冲突，且合并规则需逐 stop 匹配，MVP 不值。

### D12 主线页交互（`MainPlan.tsx`）

- 仅 `organizer && draft && !confirmed` 渲染 per-stop 编辑入口；展开为 name + 开始 + 结束三字段表单 + 保存/取消。
- 保存 → PUT → 用响应替换整份投影；失败按 code 文案（400 字段错、409 已确认），保留输入。
- 成员只读；确认后只读；无草稿时无入口。重生成按钮旁的一行提示：重新生成会丢弃手动修改。

### D13 stop 编辑并发

条件写 `UPDATE main_plan_stop SET name=?, start_local=?, end_local=? WHERE draft_id=? AND seq=? AND EXISTS (SELECT 1 FROM main_plan_draft WHERE id=draft_id AND status='draft')`（实现可等价为先条件更新 draft 行或子查询），影响行数 0 → 409 `ALREADY_CONFIRMED`（草稿已确认）或 404 `STOP_NOT_FOUND`（seq 不存在），二次查询区分。与 D3 同族：确认与编辑竞态不允许半写。

## Risks / Trade-offs

- [确认与编辑竞态] → D3 条件写兜底；E2E 无法稳定复现竞态，由后端测试直接置 `main_plan_confirmed=1` 后断言 409 与数据不变。
- [新错误码被前端误映射] → 编辑页按 code 分支文案，未知 code 回退服务端 message；E2E 断言两种锁定/权限文案。
- [auth MODIFIED 丢细节] → delta 携带整条 requirement 全文（含全部既有 scenario），仅改布局句与 layout scenario、新增编辑交互 scenario；`openspec validate --strict` + G2 对规格逐条审。
- [编辑页 hash 被详情正则吞掉] → D5 匹配顺序 + E2E 直达 `#/trips/1/edit` 验证。
- [旧需求文件口径冲突] → issue #60 为权威；story-detail-iteration-1.md 旧拆分文本留作历史，G1 扫描轴 1 记录。
- [手动编辑被重生成静默丢弃] → 重生成入口常驻提示「重新生成将丢弃手动修改」；E2E 断言提示存在与重生成后值回退。
- [编辑产生的时间冲突被误认为已保存即有效] → 确认校验仍拦 422 `scheduleErrors`；E2E 造重叠场景断言确认被阻止。

## Migration Plan

零迁移、零新依赖。部署即生效；回滚 =  revert PR（端点与页面整体移除，数据无结构变化，已保存的编辑值保留）。

## Open Questions

- 新错误码 `MAIN_PLAN_CONFIRMED`（trips）、`STOP_NOT_FOUND` / `INVALID_TIME` / `INVALID_TIME_RANGE`（mainplan）的 IO 批准（G1 轴 4；`NOT_ORGANIZER` / `ALREADY_CONFIRMED` / `NO_DRAFT` 均为复用，仅 `code` 契约不变）。
- 本 change 的 IO / SA / VL 具名角色分配（角色按 change 轮换，G1 前由用户确认）。