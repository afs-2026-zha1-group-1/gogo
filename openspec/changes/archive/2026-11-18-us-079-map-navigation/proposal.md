# Proposal

## Why

行程成员目前只能靠"站名搜索链接"跳高德：路线页实测只认坐标不认名字（登录也不认），
起终点空框"点进去什么也没有"；嵌入弹窗又受登录墙、宽度裁剪、手机版纯壳三重限制；
公司网络墙海外地理编码且本机系统定位被拒，"我的位置"不可靠。US-079（issue #141）要求
逐站可导航、地址可复制、地图不可用时行程仍可查看。P1 基线已提交（`f694dab`，
`requirement-workspace/requirements/US-079.md` AC1–AC13），本 change 将其固化为 spec 契约。

## What Changes

- 站点地址/坐标成为行程数据：`main_plan_stop` 加 `address/lat/lng` 可空列（V10）；
  生成落库时从地址簿缓存 `place_cache`（新表，name+city 联合主键，source=seed/geocode/manual）补全。
- 新端点 `POST /api/trips/{id}/main-plan/stop-locations`：组织者回写程序查得的坐标（WGS-84），
  同时 upsert 沉淀进 `place_cache`；只作用于 current 草稿，错误码 `NO_DRAFT` 404 /
  `NOT_ORGANIZER` 403 / `UNKNOWN_STOP`、`INVALID_COORDS` 422。
- 读方案投影每站 additive 携带 `address/lat/lng`（null 省略）；确认投影把坐标抄进 `plan_node` 预留列。
- 前端导航入口改为真链接新标签页：有坐标开高德电脑版路线页（`from/to[lnglat]`，GCJ-02 纠偏；
  起点=上一活动站，首站只带终点、起点手填）；无坐标退高德电脑版搜索页直链（目的地自动带出）。
  **废除 iframe 嵌入形态**（用户 2026-11-18 裁决）。
- 倒计时卡"下一站"地址行显示真地址（保存地址 → 地址簿）+ 复制按钮；站点图标按名称/兴趣标签语义化。
- 生成后前端对"无坐标且有地址"的站调高德 JS API 地理编码（JS Key+安全密钥，`.env` 不入库）回写；
  海外查不到留空走兜底，不造假坐标。

## Capabilities

### New Capabilities

（无——复用既有能力边界。）

### Modified Capabilities

- `main-itinerary`: 生成落库补地址/坐标（Readiness-gated main plan generation）、
  读投影携带三字段（Draft review with computed staleness）、
  新增 stop-locations 回写与地址簿沉淀 requirement。
- `trips`: 倒计时/下一站 requirement 扩展地址行+复制+导航起点口径；
  新增站点地图导航入口 requirement（按钮/图标/兜底/新标签页/首站手填）。

## Impact

- DB：V10 迁移（只加可空列 + 新表 + 19 站种子）；`plan_node` 预留 lat/lng 开始被写入。
- API：main-plan 读/生成投影 additive 三字段；新增 stop-locations 端点（mainplan 包扁平错误契约）。
- 前端：`StopMapButton`/`MyPlanTimeline`/`CountdownCard`/`TripOverview`/`MainPlanInputs` +
  `lib/{amap,amap-geocode,coord,place-book,stop-icon}`；无新 UI 库、无 iframe。
- 外部：高德 JS API（浏览器查坐标回写）+ 高德电脑版网页（新标签页 dir/search）；
  REST 地理编码需 Web-service Key，本轮不启用（实测 JS Key 报 USERKEY_PLAT_NOMATCH）。
- 脚本：`scripts/demo-seed.py` 三列回填能力（只改未跑，保护已确认方案）。
- 安全：JS Key+安全密钥仅 `frontend/.env`（gitignore）；建议控制台域名白名单。
- 残余（deferred）：海外全自动地理编码、存量已确认草稿坐标回填、US-090 编辑联动、demo-seed 护栏。
