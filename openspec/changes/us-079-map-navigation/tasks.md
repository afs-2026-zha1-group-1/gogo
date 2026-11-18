# Tasks — us-079-map-navigation（P3，2026-11-18）

链接：Delta specs（main-itinerary / trips）、`atdd-design.md`、`design.md`、`g1-decision.md`。
实现先行：组 1–5、8 已落地并验证（后端 379/379、前端 64/64 + typecheck + build）；
apply 阶段执行组 6–7、9–10（缺口测试先红后绿 + 验收证据 + 门禁）。

## 组 1 存储与生成补全（DD1/DD2）— done

- [x] 1.1 V10__stop_location.sql：三可空列 + place_cache + 19 种子
- [x] 1.2 MainPlanRepository：StopRow/insertStop/stopsForDraft 带三字段 + cacheLookup/cacheUpsert
- [x] 1.3 MainPlanService.generate 逐站查缓存补全（miss 留 null）
- [x] 1.4 FakeMainPlanProvider 夹具补 address/city（17 站）

## 组 2 回写端点与沉淀（DD3）— done

- [x] 2.1 MainPlanService.completeStopLocations（门序 + 校验 + upsert）
- [x] 2.2 MainPlanController POST stop-locations + StopLocationsRequest
- [x] 2.3 StopLocationApiTest 8 例（W1–W5 + G7 + read 携带）

## 组 3 投影与 wire（DD4/DD5）— done

- [x] 3.1 PlanResponse.Stop + address/lat/lng（null 省略）
- [x] 3.2 MainPlanProjection 抄 lat/lng 进 plan_node
- [x] 3.3 ScheduleValidatorTest 夹具同步（StopRow 9 参）

## 组 4 前端入口/兜底/起点/图标/地址（DD6–DD10）— done

- [x] 4.1 lib/amap.ts search/dir 构造器 + lib/coord.ts 纠偏
- [x] 4.2 StopMapButton 真链接 + 坐标优先级 + from 口径
- [x] 4.3 MyPlanTimeline/CountdownCard/TripOverview 接 from/destination/地址行/复制
- [x] 4.4 lib/stop-icon.ts + Icons 七图标 + lib/place-book.ts 兜底
- [x] 4.5 删 StopMapModal 与 iframe 样式（grep 零残留）
- [x] 4.6 前端单测 amap/coord/place-book/stop-icon + 夹具同步（64/64）

## 组 5 查坐标回写客户端与 Key 治理（DD11/DD12）— done

- [x] 5.1 lib/amap-geocode.ts（单例加载 + 8s 超时 + 取第一个）
- [x] 5.2 MainPlanInputs generate 后 fire-and-forget 回写
- [x] 5.3 frontend/.env（gitignore）+ .env.example + vite-env 类型

## 组 6 缺口 API 测试（先红后绿）— open

- [ ] 6.1 A6/G8：test-only 删 place_cache 行后生成 → 三字段 null 且不阻塞（StopLocationApiTest 新增）
- [ ] 6.2 A18/W6：第二行程同名站生成命中 geocode 沉淀行（StopLocationApiTest 新增）
- [ ] 6.3 mvn -B test 全绿复跑（381/381 预期）

## 组 7 E2E 与观察行 — open

- [ ] 7.1 Playwright DOM spec：E1–E14（href/target/图标/地址行/复制/无 iframe），进 frontend/tests/e2e/
- [ ] 7.2 人工观察行 X1–X5 记 docs/feedback/e2e-us-079.md（外部高德页不自动化）
- [ ] 7.3 npm run typecheck + test:unit + build 复跑绿

## 组 8 演示回填能力（DD13）— done（只改未跑）

- [x] 8.1 demo-seed.py 八元组 + INSERT 三列 + plan_node 抄坐标
- [ ] 8.2 护栏（确认交互/--force）deferred OQ-8，不在本 change 实施

## 组 9 验证与门禁 — open

- [ ] 9.1 /sdd:local-verify-report（V1–V8 + 证据路径）
- [ ] 9.2 建分支/PR（禁直推 main）→ CI 双绿（G2 输入）
- [ ] 9.3 /sdd:g2-decision-record（VL 签）→ 合并 → /sdd:living-merge → /sdd:g3-decision-record（SA 签）

## 组 10 归档对账 — open

- [ ] 10.1 registry/handoff 状态同步（P3/P4/G2/G3）
- [ ] 10.2 tech-stack-plan + _LOG 对账（地图能力节）
- [ ] 10.3 change-summary + 归档（openspec archive）

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结果 | 证据 |
|---|---|---|
| Spec 38 scenarios 全映射 | Pass | API 18 → A1–A18（atdd §1）；trips 20 → E1–E14（E10 覆盖 6 条倒计时、E13 共享覆盖 missing-info 与 address-pending）+ X1–X5 外部观察 |
| Design DD1–DD13 ↔ Spec requirements | Pass | DD1/2↔G7/G8；DD3↔W1–W6；DD4↔read 携带；DD5↔投影（splits 不变）；DD6–DD10↔M1–M9/地址行/起点；DD11/12↔AI 不给坐标+Key 治理；DD13↔夹具 |
| Tasks ↔ ATDD 层 | Pass | 组 6=A6/A18 缺口；组 7=E1–E14+X1–X5；组 1–5/8=已实现回归面；UT 延后清单一致 |
| Non-goals 反向行 | Pass | 无 iframe（E8+grep）、海外留空（A6/E9）、无 REST 路径（grep restapi）、NFR 不纳入（用户裁决） |
| 门禁链 | Pass | 组 9 本地→CI→G2→G3；本 plan 不写 Gate |

自检 **Pass**；下一步 `/sdd:quality-checklist`（stage=p3）。
