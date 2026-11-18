# ATDD design — us-079-map-navigation（P3，2026-11-18）

输入：G1 Pass（`g1-decision.md`，ce4982f）；delta 5 requirements / 38 scenarios
（main-itinerary 18 = API 层；trips 20 = E2E 层）；P1 AC1–AC13。
**实现先行**：后端 379/379（含 StopLocationApiTest 8）、前端 64/64 + typecheck + build 已绿；
本设计反向对齐已实现行为，apply 阶段补齐缺口测试（先红后绿仅针对新增缺口）。

## 1. API 层（18 scenarios，MockMvc + 真 SQLite，TestAuth 会话）

| id | Scenario | 现有覆盖 | apply 动作 |
|---|---|---|---|
| A1 | G1 生成 201 + 投影 | MainPlanApiTest ✔ | 回归 |
| A2 | G2 MEMBERS_NOT_READY 409 | MainPlanApiTest ✔ | 回归 |
| A3 | G5 再生成新版本 | MainPlanApiTest ✔ | 回归 |
| A4 | G6 ALREADY_CONFIRMED 409 | MainPlanApiTest ✔ | 回归 |
| A5 | G7 生成落库 address/lat/lng（缓存命中） | StopLocationApiTest.generateCompletes… ✔ | 回归 |
| A6 | G8 缓存 miss 三字段 null 不阻塞 | **缺口** | 新增：test-only 删 place_cache 行后生成 → null |
| A7 | read 当前草稿投影 | MainPlanApiTest ✔ | 回归 |
| A8 | read stale 计算 | MainPlanApiTest ✔ | 回归 |
| A9 | read NO_DRAFT 404 | MainPlanApiTest ✔ | 回归 |
| A10 | read confirmed 投影 | MainPlanApiTest ✔ | 回归 |
| A11 | confirmed 冻结 stale=false | MainPlanApiTest ✔ | 回归 |
| A12 | read 携带三字段 / null 省略 | StopLocationApiTest.readPlanCarries… ✔ | 回归 |
| A13 | W1 回写存库 + 缓存沉淀 source=geocode | StopLocationApiTest.writeBack… ✔ | 回归 |
| A14 | W2 UNKNOWN_STOP 422 | StopLocationApiTest ✔ | 回归 |
| A15 | W3 INVALID_COORDS 422 | StopLocationApiTest ✔ | 回归 |
| A16 | W4 NOT_ORGANIZER 403 | StopLocationApiTest ✔ | 回归 |
| A17 | W5 NO_DRAFT 404（含 confirmed-only） | StopLocationApiTest ✔ | 回归 |
| A18 | W6 沉淀缓存跨行程复用 | **缺口** | 新增：第二行程同名站生成命中 geocode 行 |

## 2. E2E 层（20 scenarios；Playwright DOM 断言 + 外部页人工观察行）

DOM 断言（不开外部 tab，断言 href/target/文案/图标）：

| id | Scenario | 断言要点 |
|---|---|---|
| E1 | M1 无主线无入口 | legacy 页无 `.map-btn` |
| E2 | M2 逐站入口 + 坐标直链 | 每站 `.map-btn` href 含 `to[lnglat]`/`from[lnglat]`（第 2 站起） |
| E3 | M3 首站固定起点（R1） | 首站 href 含 from=珠海南方软件园坐标 |
| E4 | M4 个人路线逐站入口 | confirmed split 态各站 `.map-btn` 存在 |
| E5 | M5 不串站 | 相邻站 href 的 to 坐标互异 |
| E6 | M6 无坐标退搜索页 | href = `www.amap.com/search?query=站名+城市` |
| E7 | M7 语义图标 | 船/展馆/山/袋等 icon 按站名/标签出现 |
| E8 | M8 新标签页真链接 | `target=_blank` + `rel=noopener`；无 iframe 节点 |
| E9 | M9 海外留空兜底 | 无坐标站 href 为搜索页；页面无报错态 |
| E10 | 倒计时 pre-trip/during/between/边界/无安排/无后续 | 文案与秒更新（继承既有观察） |
| E11 | confirmed split 倒计时用本人路线 | A 组标记/真实时刻 |
| E12 | 下一站地址行 + 复制 | 地址文本 + 复制按钮；点击后"已复制" |
| E13 | 地址缺失渲染待确认 | "地址待确认"、无伪造地址 |
| E14 | 下一站导航起点=当前/前一站 | href from 参数对应当前活动站坐标 |

外部页人工观察行（记 `docs/feedback/e2e-us-079.md`，不自动化外部站点）：

| id | 观察 | 状态 |
|---|---|---|
| X1 | 新标签页高德路线页起终点自动带出并画路线（国内/港澳坐标） | 待观察 |
| X2 | 首站路线页起点空框可手填 | 待观察 |
| X3 | 搜索页目的地自动带出 | 待观察 |
| X4 | 切回原标签页仍停行程详情 | 待观察 |
| X5 | 跨境（珠海→中环）驾车无路线时切公共交通可规划 | 待观察（已知残余） |

## 3. UT 延后清单（apply 时维护，不在本设计展开）

既有套件已绿：countdown.test（12）、stop-icon.test（6）、amap.test（5）、
coord.test（3）、place-book.test（5）、personal-route.test（13）等 = 64/64。
apply 仅随缺口测试同步夹具（ScheduleItem lat/lon 已加）。

## 4. Fixtures 策略

- V10 种子 place_cache 19 站（name+city → address/lat/lng，source=seed）；
- G8：test-only `DELETE FROM place_cache WHERE name=…` 后生成；
- W6：第二行程（test-only 建 trip+member 就绪）同名站生成；
- 会话身份 TestAuth.asUser；E2E 用 alice/ben 演示账号；
- 外部高德页不纳入自动化（网络/登录墙不可控），仅人工观察行。

## 5. Gates（对齐 Rules/CI）

- 本地：`mvn -B test` 全绿 + `npm run typecheck` + `test:unit` + `build`；
- CI：PR 触发 ci.yml（Backend tests / Frontend build）双绿才可合并（G2 输入）；
- E2E：Playwright DOM 断言进 `frontend/tests/e2e/`（沿用既有 harness）+ 人工观察行入 docs/feedback；
- 门禁：G2（VL 签 + CI 绿）→ G3（SA 签 + 归档）；本 skill 不写 Gate。

## 6. Non-goals 与反向验证

| Non-goal | 反向验证行 |
|---|---|
| 不做 iframe 嵌入 | E8 断言无 iframe 节点；grep StopMapModal 零残留 |
| 不做海外自动地理编码 | A6/E9：海外/miss 留 null 不报错、不造假 |
| 不启用 REST Web-service Key 路径 | 代码 grep restapi 零命中（前端仅 JS API 回写） |
| 不做 Playwright/Excel 生成器 | 仅沿用既有 harness 手写 spec |
| NFR 不纳入（用户 2026-11-18 裁决） | 无 NFR 测试节；超时/降级行为已由 A6/E9 功能面覆盖 |
| 不改 splits 契约/确认冻结 | A4/A11/A17 回归 + splits 既有测试全绿 |

## 7. Next

`/sdd:task-plan`（design.md + tasks.md，补齐 4/4 artifacts）。
