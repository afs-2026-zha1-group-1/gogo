# Change summary — us-079-map-navigation（P5，2026-11-18）

## Intent

US-079（issue #141）：行程每站给一个"高德"入口，新标签页打开完整高德页做导航，
返回即回行程详情；站点地址/坐标落库、生成时程序补全、查坐标回写沉淀地址簿；
倒计时"下一站"展示地址与复制；首站出发点统一固定珠海南方软件园（R1）。

## What shipped

- 后端：V12/V13 迁移（站点三可空列 + place_cache 种子 + 固定起点种子）；生成落库查缓存补全；
  `POST /api/trips/{id}/main-plan/stop-locations` 回写（UNKNOWN_STOP/INVALID_COORDS 门序同生成）；
  确认投影抄坐标进 plan_node；与并行 US-003/US-045/US-031-AI 合并取并集（站点含人均成本）。
- 前端：stopMapHref 纯函数（落库坐标→地址簿→搜索页兜底；起点=上一站/首站固定）；
  place-book/coord(GCJ 纠偏)/stop-icon/clipboard；StopMapButton（高德+复制地址列布局、
  复制瞬时反馈尺寸恒定）；CountdownCard 下一站地址行；MyPlanTimeline 语义图标。
- 测试：StopLocationApiTest 10 例（含 G8/W6 缺口）、stopMapHref UT 先红后绿、
  Playwright map-navigation.spec 6 用例（CI Browser acceptance 同跑绿）。
- 演示：demo-seed 八元组回填能力（只改未跑，护栏待 OQ-8）。

## Verify highlights

- 本地：后端 509/509、前端 73/73 + typecheck + build；local-verify 20261118-155859
  Overall Partial 无 CRITICAL（缺口仅 E1 远程与外部页观察，后者已列跟进）。
- CI：PR #157 runs 44266428333/44266452762 三作业（Backend tests/Frontend build/
  Browser acceptance）全 success；pipeline-report 20261118-162921 E1 Pass。
- 门禁：G1 Pass（IO Emily/SA Lumi，ce4982f）；G2 Pass（VL Elian，用户转达代记）；
  PR #157 merged 5305172；archive = 2026-11-18-us-079-map-navigation；
  KB update = Skipped（scripts/kb-lint.sh 基线 documented no-op）。
- 浏览器观察：E4/X4 Pass；X1/X2/X5/E11 待真实浏览器（自动化环境高德反爬限制）。

## Residual risks / follow-ups

- C-R1（首站固定起点）/C-R2（G8 措辞澄清）复签待 IO Emily/SA Lumi，G3 前闭环。
- X1/X2/X5/E11 真实浏览器复测（用户侧）。
- deferred：OQ-5 海外全自动地理编码、OQ-6 存量行程回填、OQ-7 US-090 联动、OQ-8 demo-seed 护栏；
  W2 GCJ 矩形 bbox 近似、R2 JS Key 前端暴露（已接受）。

## Links

- archive: openspec/changes/archive/2026-11-18-us-079-map-navigation/
- Living: openspec/specs/main-itinerary/spec.md、openspec/specs/trips/spec.md
- 证据: docs/ai4se-plugins/20261118-155859-local-verify-report.md、
  docs/ai4se-plugins/20261118-162921-pipeline-report.md、docs/feedback/e2e-us-079.md
- PR: https://github.com/afs-2026-zha1-group-1/gogo/pull/157
