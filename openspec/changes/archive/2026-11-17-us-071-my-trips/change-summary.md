# Change summary — us-071-my-trips

- **Story:** US-071 查看我的行程（GitHub issue #45，Iteration 1 / Priority Must）
- **归档:** `openspec/changes/archive/2026-11-17-us-071-my-trips/`（2026-11-17）
- **合并:** PR #102 → main `b07f4c1`；P5 归档分支 `US-071-p5-archive`
- **门禁:** G1 Pass（SA Leo 2026-11-16 + IO Emily 2026-11-17；C1–C3 closed；Revision C4 IO/SA 2026-11-17 closed）；G2 Pass（VL Leo + Johnson Sun 2026-11-17）；G3 见 `g3-decision.md`

## 交付内容

- **后端:** `GET /api/trips`（成员范围列表，包封套，已结束最后排序）；`GET/PUT /api/trips/current`（每用户当前行程，成员资格校验）；迁移 `V8__add_current_trip.sql`（`app_user.current_trip_id` 可空外键）。
- **前端:** `#/my-trips` 选择页（`.qcard` 卡片对齐原型；点选不跳转、右缘「已选择」tag、选中高亮、无右箭头）；`#/trips` = 当前行程详情（无 current 空态引导）；「我的」页入口；`Members` 返回保留行程上下文；删除 `TripsEmpty`。
- **Living Spec:** `trips` +2 ADDED（Trip list read / Current trip selection）；`app-shell` REMOVED「Trips tab placement and no-trip empty state」+ ADDED「Current trip tab and my-trips list」。

## 验证

- `mvn -B test` **296/296**（TripListApiTest 9 + CurrentTripApiTest 8 + 既有回归）
- `npm ci && npm run build` 绿；`openspec validate --strict` valid
- E2E：E1–E12 + AC7 四步 + Revision R1–R9 全 Pass（`docs/feedback/e2e-us-071.md`，6 张截图）
- CI：runs `44020071898` / `44020065562` @`8b7b1c7` 双 job success（E1 全绿）
- local-verify：`docs/ai4se-plugins/20261117-103530-local-verify-report.md` Overall Pass

## 知识库对账

- `tech-stack-plan` §21 landed reconciliation（API/迁移/路由/排序/验证）；`_LOG.md` 追加一行。
- KB update：`scripts/kb-lint.sh` → `SKIP: KB lint is not configured for this project.`（项目基线政策允许的非阻塞 SKIP；**不代表 KB lint 通过**）。

## 残余与承接

- W1 本机 `gogo.db` V2 校验和遗留（验收用 `gogo-us049.db`）；F2 待修复。
- W2 前端无 UT runner（`isEnded` 由 E2E 覆盖）；F3 独立工具变更。
- W3 dev StrictMode 双调用（生产单次）。
- W4 排序 UTC vs 徽标本地日期的凌晨边界（DD21 接受）；F4 观察。
- 跨 change 一致性：US-082 的「Trip-context return links」与本变更「Trip-scoped return links」场景语义重叠，口径一致（成员名册返回 `#/trips/<id>`），无冲突。
