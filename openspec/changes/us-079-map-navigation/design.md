# Design — us-079-map-navigation（P3，2026-11-18，反向对齐已实现代码）

链接：Delta `specs/main-itinerary/spec.md` / `specs/trips/spec.md`；ATDD `atdd-design.md`；
G1 `g1-decision.md`（Pass，ce4982f）。实现先行：后端 379/379、前端 64/64 已绿；
本 design 记录已落地决策，apply 仅补缺口测试与验收证据。

## DD1 存储形状（V10）

`main_plan_stop` + `address TEXT / lat REAL / lng REAL`（均可空，只加不改）；
新表 `place_cache(name, city, address, lat, lng, source)`，PK(name, city)，
source ∈ seed/geocode/manual；V10 带 19 站种子（与前端 place-book 逐字对齐）。
坐标存 WGS-84；纠偏只发生在拼网址时（DD6）。

## DD2 生成时补全

`MainPlanService.generate` 逐站查 `place_cache`（city = stop.city() 缺省回退
trip.destination()）；命中写三字段，miss 留 null（不造假、不阻塞生成）。
provider/AI 契约只给 name/address/city/时间，**不给坐标**。

## DD3 回写端点 stop-locations

`POST /api/trips/{id}/main-plan/stop-locations`，body `{stops:[{seq,lat,lng}]}`；
门序 trip→member→organizer→current draft；只改 current 草稿匹配站；
upsert place_cache（source=geocode）；响应 200 = 读投影。
错误：NO_DRAFT 404（含 confirmed-only）、NOT_ORGANIZER 403、
UNKNOWN_STOP 422、INVALID_COORDS 422（|lat|>90 / |lng|>180）。

## DD4 wire additive

`PlanResponse.Stop` + address/lat/lng；后端非空序列化省略 null → 老客户端不受影响；
生成 201 与读 200 同投影。

## DD5 确认投影抄坐标

`MainPlanProjection.projectConfirmed` 把 stop.lat/lng 写进 `plan_node` 预留列；
splits 契约与读路径不变（只读消费）。

## DD6 链接构造与纠偏

`lib/amap.ts`：search 直链 `www.amap.com/search?query=站名+城市`（单一构造器）；
dir 直链 `from[name]/from[lnglat]/to[name]/to[lnglat]`（lng,lat 序）。
`lib/coord.ts` toGcj02：大陆纬度下限 18°（排除东南亚误圈）+ 港澳排除盒
（HK 22.15–22.60/113.80–114.50；Macau 22.10–22.22/113.53–113.60）不纠偏。
**不经 uri.amap.com**（UA 分流到手机版纯壳，实测不认搜索词）。

## DD7 兜底链与无嵌入

坐标优先级：站点落库 → `lib/place-book.ts`（19 站兜底）→ search 直链。
**无 iframe**：StopMapModal 及其样式已删（grep 零残留）；入口为真 `<a target=_blank rel=noopener>`。

## DD8 起点口径

时间轴：index>0 取 schedule[index-1]；首站 from=null → 只带终点。
倒计时：during 取 state.item；between 取 timed[index-1]；next 为首个 timed 站时 from=null。

## DD9 地址展示/复制

CountdownCard 下一站地址行：stop.address → place-book；复制 navigator.clipboard
失败回退 textarea+execCommand；失败就地提示不阻塞卡片；无地址渲染"地址待确认"。

## DD10 语义图标

`lib/stop-icon.ts`：名称关键词（渡轮/展馆/山峰/市集）→ 兴趣标签
（food/coffee/nature/heritage/craft/photo/slow）→ 公园花园 → pin/route 兜底；
Icons.tsx 新增 ship/landmark/mountain/bag/utensils/coffee/leaf 七图标。

## DD11 查坐标回写客户端

`lib/amap-geocode.ts`：单例加载 JS API（key+securityJsCode 自 .env），
AMap.Geocoder plugin，8s 超时、多结果取第一个；仅对"无坐标且有地址"的站；
generate 成功后 fire-and-forget（hash 跳转不卸载文档），失败静默留空。

## DD12 Key 治理

JS Key+安全密钥仅 `frontend/.env`（gitignore 已加 .env/.env.local）；
`.env.example` 入库占位；REST Web-service 路径**不启用**（deferred，需另 Key）。

## DD13 演示回填

`scripts/demo-seed.py` 元组扩为 8 元（+address/lat/lng），INSERT 带三列、
plan_node 抄坐标；**本轮只改未跑**（跑会清已确认草稿）；护栏 deferred（OQ-8）。

## TS/测试注记

node --test 类型剥离下值导入须带 `.ts` 后缀（tsconfig 已开 allowImportingTsExtensions）；
ScheduleItem +lat/lon 已同步 countdown/stop-icon 测试夹具。

## 残余风险（deferred，G1 已接受）

W1 个人路线快照无坐标→地址簿兜底；W2 GCJ 矩形边界误判；W3 (name,city) 消歧；
R2 JS Key 前端暴露（建议域名白名单）；X5 跨境驾车可能无路线（切公共交通）。
