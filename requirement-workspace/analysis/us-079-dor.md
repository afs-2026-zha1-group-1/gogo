# DoR self-check — US-079（P1，2026-11-18）

范围：12 项全检（含 deep-dive ⑨–⑫，见 `deep-dive.md §US-079`）。
结论：**BLOCKER = 0；blocking OQ 未 resolved = 0**；WARNING 3 / SUGGESTION 2（均非阻塞，待用户澄清或 deferred）。

| # | 检查项 | 结果 | 说明 |
|---|---|---|---|
| ① | id/statement 清晰唯一 | Pass | US-079（issue #141）；statement 含导航+地址+落库三件事 |
| ② | actors 明确 | Pass | 成员/组织者/非成员/AI 生成方四类，权限沿用既有守卫 |
| ③ | rationale 有据 | Pass | 路线页只认坐标、嵌入三重限制、系统定位 Deny、海外网络墙——均实测 |
| ④ | AC 可测试 | Pass | AC1–AC13 均可观察；后端 8 例 API 测试 + 前端 64 单测 + 浏览器复现佐证 |
| ⑤ | In/Out scope 边界清楚 | Pass | 嵌入/海外全自动/REST/存量回填/US-090 联动/US-055 会合说明 明确 Out |
| ⑥ | 证据链接齐全 | Pass | intent/迁移/后端/前端/测试/脚本/.env.example 全列 |
| ⑦ | 依赖识别 | Pass | US-031-037 生成与确认门、US-083-085 概览读组合、US-089 投影、V10 迁移序 |
| ⑧ | 数据契约定义 | Pass | main_plan_stop +3 可空列、place_cache PK(name,city)、stop-locations 请求/响应/错误码、wire 三字段 null 省略（deep-dive §US-079） |
| ⑨ | 数据契约深检（grain/lifecycle） | Pass | 站点行坐标随草稿版本生灭；place_cache 跨行程长存、source 三态；回写只改 current 草稿 |
| ⑩ | 边界深检（集成/权限） | Pass | 地理编码仅生成后回写（组织者门）；展示/搜索不查坐标；GCJ 纠偏仅拼网址；Key 前端 .env 不入库 |
| ⑪ | 跨 REQ 一致性 | Pass | 确认后冻结不变；splits 契约不变（只读投影坐标）；US-090 联动留 Out；fixtures 19 种子与 place-book 逐字对齐 |
| ⑫ | 通知/显示深检 | Pass | 地址行/复制/失败就地提示/语义图标/薄荷按钮；无通知类副作用 |

## WARNING（非阻塞）

| id | 发现 | 处置 |
|---|---|---|
| W1 | 分队快照（split-draft detail）不携带坐标 → 个人路线按钮只能走地址簿兜底，落库真值在个人路线态不生效 | deferred（2026-11-18 用户确认）；动 splits 契约倾向另立项 |
| W2 | GCJ-02 纠偏用矩形 bbox + 港澳排除框，边界点（如珠海/澳门交界）可能误判 | deferred（2026-11-18 用户确认）；夹具已覆盖关键边界单测，残余风险接受 |
| W3 | place_cache 以 (name,city) 为键，同名异地靠 city 消歧；city 缺失时可能串缓存 | deferred（2026-11-18 用户确认）；生成侧 city 缺省回退 trip.destination，残余风险接受 |

## SUGGESTION

| id | 建议 | 处置 |
|---|---|---|
| S1 | 图标关键词表可配置化/扩充 | deferred（2026-11-18 用户确认）；后续打磨 |
| S2 | stop-locations 加批量上限/频率限制 | deferred（2026-11-18 用户确认）；后续打磨 |

## Open questions 状态

blocking：OQ-1…OQ-4 全 resolved（会话裁决）。非阻塞：OQ-5…OQ-8 deferred（2026-11-18 用户一次性确认维持 deferred）。
