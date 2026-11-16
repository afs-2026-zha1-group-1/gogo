# Requirement registry

## Current product review update (2026-11-15)

This update supersedes affected preference status/interaction wording in the
snapshot rows below. REQ-019: no Clear All action and English-only labels accepted;
existing SA approval unchanged, IO Emily approved 2026-11-15. REQ-020: location
and time together accepted, but item deletion now requires confirmation. REQ-024:
budget clear also requires confirmation; distinct unset/zero, labelled major-unit
input with currency-specific minor-unit storage, and no cross-currency comparison
here are accepted. Cancel/dismiss sends no request and preserves data/input.
REQ-020/024 historical SA Pass covers the old contract; revised review is pending.
Per the user's separate signing instruction, Emily IO Pass is recorded for the
current REQ-019/020/024 packages (31/42/53 scenarios) on 2026-11-15. All three
remain Conditional for recorded outstanding conditions, not missing IO approval.
REQ-026 stays at P1, unchanged. Strict validation was executed for
019/020/024 and exited 1 with existing length/archive warnings; none is marked passed.

## 推送与 G1 状态更新（2026-11-16）

`feat/travel_preference` 已推送至远端：`origin/feat/travel_preference` = `27b09e6`，领先
`origin/main`（`7d939b0`）13 个提交，三份 `g1-decision.md`、三份 delta spec、`dov-ac-review.md`
与 `registry.md` 本身都在该提交上；IO Emily 与 SA evelyn.huang 的签署记录见三份
`g1-decision.md`。三份门禁记录里「分支待 push、IO 无提交
可评审」的表述已失效，统一改为已推送；IO Emily 的批准仍按 2026-11-15 的明确签署指令记录，本轮
不新增签署主张。三者已于 2026-11-16 随 SA 复审通过而 G1 全部 Pass：SA evelyn.huang 对 020/024 修订后
契约复审 Pass，REQ-019 的批次就绪条件（等兄弟需求）随之解除。仍列开放的是实现前置
（REQ-019 的 `V4` 与偏好页、REQ-020 的第 2 版页面尚未落地）与 019/020/024 的 strict
validation（exit 1，阻塞归档、不阻塞 P4）。上方 2026-11-15 段落中「三者仍为 Conditional」
的表述以本节为准。

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World home page | Archived; G1/G2/G3 signed (Johnson) | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | H2 substituted for SQLite per the 2026-11-13 instruction (OQ-1). OQ-2/OQ-3/OQ-4 were carried as G1 conditions and closed the same day by IO rulings; the JSON and SQLite rulings are delivered by REQ-002, not by editing this archive. DoR BLOCKER = 0, A0 Pass. |
| REQ-002 | JSON greeting contract and SQLite storage | P4 implemented and locally verified; P5 artifacts authored; G1/G2/G3 NOT RECORDED; archive and push pending | `openspec/changes/req-002-greeting-json-sqlite/` | IO ruling 2026-11-13: keep Flyway, JSON body `{"message":"Hello World"}`, engine back to SQLite. One MODIFIED requirement in `greeting`. DoR BLOCKER = 0, A0 Pass. Local-verify Overall Partial (no CI run for this change, E3 unsigned); 6/6 scenarios and 7/7 reverse checks observed; D16 directory fix found by verification. Tasks 30/33 — open 3.5 push, 3.6 fresh CI confirmation, 5.5 merge-ready. REQ-001's signatures and CI confirmation are not inherited. |
| REQ-003 | Create a shared trip and view its saved details (US-001 + US-002) | Archived 2026-11-15; G1/G2/G3 Pass | `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/` | One change, three ADDED requirements in a new `trips` capability (caller identity, creation, detail read). Scaffold identity = seeded users + `X-User-Id` header (session decision 2026-11-14). DoR BLOCKER = 0, A0 Pass. OQ-1 (destination/location requiredness) and OQ-4 (frontend routing) resolved. G2 Pass by VL Elian Jiang 2026-11-15; G3 Pass by SA Johnson 2026-11-15; PR #30 merged; CI run 43603964689 green. The screen-02/03 UI gap was closed during REQ-004 P4. Living Spec gained 3 `trips` requirements; Purpose written during archive review. |
| REQ-004 | Share a trip invitation, join once, recognize unusable links (US-008 + US-010 + US-012) | Archived 2026-11-15; G1/G2/G3 Pass | `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` | One change, four ADDED requirements in a new `invitations` capability plus one ADDED `trips` requirement (main-plan state, no mutation path until US-037). DoR BLOCKER = 0, A0 Pass. P3 resolved OQ-6 (hash router + `qrcode`/`jsqr`; jsqr installed as Apache-2.0). OQ-7 ordering satisfied. `mvn test` 31/31; curl matrix I/J/U/R all match; browser E2E S1/I6/S2/U3 pass. G2 Pass by VL Elian Jiang 2026-11-15; G3 Pass by SA Johnson 2026-11-15; PR #31 merged; CI runs 43608236232 and 43608439854 green. Living Spec gained 4 `invitations` and 1 `trips` requirement. |
| REQ-019 | 成员兴趣保存（US-019，预定义清单 + 服务端去重） | G1 Pass（IO Emily 2026-11-15 + SA evelyn.huang 2026-11-15；020/024 修订契约复审 2026-11-16 通过后本变更条件 1 解除）；已推送 `origin/feat/travel_preference`（2026-11-16 时为 `27b09e6`）；P3 完成（`atdd-design.md` / `design.md` / `tasks.md`，对齐自检 Pass；D15 独立 advice、D16 关闭 OQ-15；NFR 不纳入）；P4 待启动，遗留 strict exit 1 | `openspec/changes/req-019-save-interests/` | 编号沿故事号 US-019（原拟 REQ-003 与已合并的「建行程/查看行程」撞号，已改）。新增能力 `preferences`；端点 `GET`/`PUT /api/trips/{tripId}/preferences`；复用 `V2` 的 `app_user`/`trip`/`trip_member`、`TripRepository.isMember`、`X-User-Id` 身份与裸 DTO 响应风格；新表 `member_preference` 用 `V4`，依赖 REQ-004 的 `V3` 先落库。DoR BLOCKER = 0，A0 Pass（⑨–⑫ 全 Pass）。REQ-004 仍保留 `V3`。 |
| REQ-020 | 成员必做项管理（US-020，增删改 + 地点/固定时间） | G1 Pass（IO Emily 2026-11-15 + SA evelyn.huang 2026-11-16 对修订后契约（删除需确认）复审）；已推送 `origin/feat/travel_preference`（2026-11-16 时为 `27b09e6`）；P4 待启动（前置 REQ-019 的 `V4` 与偏好页），遗留 strict exit 1 | `openspec/changes/req-020-manage-must-do/` | 编号沿故事号 US-020。堆叠在 REQ-019 之后（后者未合 main）。修改已有能力 `preferences`：新增 `GET`/`PUT /api/trips/{tripId}/preferences/must-dos`，复用 `member_preference` 的 `kind='must_do'`，**零迁移**。整表 PUT + 服务端签发条目 `id` 保证 AC2「不产生第二条」；`time` 仅存 `HH:mm`（日期隐含 trip）；activity 必填、地点/时间至少一项且允许同时保存（废除参考图「二选一」）。DoR BLOCKER = 0，A0 Pass（⑨–⑫ 全 Pass）；合入顺序硬前置 REQ-019 的 `V4` 与偏好页。P2 关闭 OQ-11、OQ-13（delta C3/C6）。 |
| REQ-024 | 成员全程预算（US-024，可选金额 + 币种 + 软/硬上限） | G1 Pass（IO Emily 2026-11-15 + SA evelyn.huang 2026-11-16 对修订后契约（清空需确认）复审）；已推送 `origin/feat/travel_preference`（2026-11-16 时为 `27b09e6`）；P4 待启动（前置 REQ-019 的 `V4` 与 REQ-020 的第 2 版页面），遗留 strict exit 1 | `openspec/changes/req-024-set-trip-budget/` | 编号沿故事号 US-024。堆叠在 REQ-019 → REQ-020 之后（链式 MODIFIED 页面契约）。修改已有能力 `preferences`：新增 `GET`/`PUT /api/trips/{tripId}/preferences/budget`，复用 `member_preference` 的 `kind='budget'` **单行单对象**，**零迁移**（依据 `tech-stack-plan.md` §5 的 kind 枚举含 `budget`）。金额按 §5「金额用 INTEGER 分」存**最小货币单位整数**（40 SGD = `4000`；JPY 零位小数）；币种白名单 {SGD,CNY,USD,EUR,JPY} 严格大写；未设置 = 三字段全 null 且 `budget:null`，与 `amount:0` 必须可区分；预算段为**段内显式保存**（兴趣显式、必做项即时，三段三种时机）。DoR BLOCKER = 0，A0 Pass（⑨–⑫ 全 Pass）；合入顺序硬前置 REQ-019 的 `V4` 与偏好页。P2 关闭 OQ-10（delta C4）。 |
| REQ-026 | 成员提交偏好并标记就绪 / 显式无偏好（US-026 + US-027 合并） | P1 完成；P2 按用户裁定暂缓（先做 020 → 024）；G1 未开始；OQ-10 已关闭（前提不成立） | `openspec/changes/req-026-submit-preferences/` | 编号沿故事号 US-026，用户裁定并入 US-027（两者都是「提交」这一动作的两种结果）。堆叠在 REQ-019 → 020 → 024 之后（页面契约第 4 次修订 + 只读消费前三者 payload）。修改已有能力 `preferences`：新增 `PUT …/preferences/submission`（写）、`GET …/preferences/readiness`（全员名册）、`GET …/preferences/effective`（生成侧投影）；复用 `member_preference` 的 `kind='submission'` 单行单对象，**零迁移**（有意超出 `tech-stack-plan.md` §5 的四类 kind 枚举）。就绪不可由「有无偏好行」推导：pending = 无行，保存偏好不产生就绪。空提交（四类全无且 `noPreference=false`）拒绝 `400 PREFERENCE_EMPTY`（沉默≠同意）；显式无偏好 = ready + `defaults`（`walking`/`standard`）+ 个人值在投影中不出现；500 需映射为 `INTERNAL_ERROR`。DoR BLOCKER = 0，A0 Pass（⑨–⑫ 全 Pass，40 场景/34 边界/12 界面态）；合入顺序硬前置 019 → 020 → 024。 |
