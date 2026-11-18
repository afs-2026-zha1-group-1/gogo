# US-031-AI Definition of Ready — self-check

- Date: 2026-11-18
- Requirement: `requirement-workspace/requirements/US-031-AI.md`
- Deep-dive: `requirement-workspace/deep-dive.md` §US-031-AI（add/extend 方向，⑨–⑫ 适用）
- Scope: 主线生成 provider 替换 + 最小行程降级 + 两页生成中提示；无新 API、无迁移

| # | DoR item | Result | Evidence / note |
|---|---|---|---|
| ① | User-visible value is stated | **Pass** | 方案从固定城市夹具变为基于全员兴趣/必做项/硬预算的 AI 行程；失败仍有可确认草稿 |
| ② | Acceptance criteria are testable | **Pass** | AC1–AC9 均有可观察返回/站点/提示结果，含降级两站、无 key、非法输出与权限负例 |
| ③ | Actors and permissions are identified | **Pass** | 组织者（生成/重新生成）、成员（查看/提示）、运维（env key）、CI（无 key）；权限语义全部沿用既有 401/403 |
| ④ | Boundary with other requirements is clear | **Pass** | 确认校验归 US-037；草稿过期/版本归 `main-itinerary`；地点补全与 splits 投影不改；无 key 演示内容归 US-089 现状 |
| ⑤ | Data and API dependencies are available | **Pass** | 端点 `POST/GET /api/trips/{id}/main-plan` 与 `main_plan_*` 表已存在；仅新增内部 provider 与配置，无新契约 |
| ⑥ | Non-functional constraints are acknowledged | **Pass** | 同步单次调用、读取超时 20s、无新依赖、密钥只走 env、提示词数据化、日志脱敏 |
| ⑦ | Estimation or sizing is feasible | **Pass** | 1 客户端 + 1 provider + 1 校验器 + 1 降级纯函数 + 配置 + 两页提示；预计 M（后端为主，前端小改） |
| ⑧ | Risks and unknowns are recorded | **Pass** | OQ-7/OQ-8 non-blocking deferred；R1–R5 见 impact brief §7 |
| ⑨ | Data contract decided | **Pass** | deep-dive ⑨：不新增业务实体；provider 输出 `MainPlanResult`（stops + 费用）一次性使用，落库沿用既有草稿/站点表；降级同形 |
| ⑩ | Boundary enumerated | **Pass** | deep-dive ⑩：无 key、未就绪、已确认、超时、非 2xx、空/坏 JSON、字段非法、地点空 → 分支与归属逐条列明 |
| ⑪ | Cross-REQ aligned | **Pass** | deep-dive ⑪：G1/G2/G5/G6、US-037 校验、splits 投影、US-089 夹具、auth 均对齐，无字段分歧 |
| ⑫ | Notification / display contract decided | **Pass** | deep-dive ⑫：两页非阻塞提示文案、受众、触发、结束条件、无新增错误面 |

## Summary

BLOCKER = **0** · WARNING = **0** · SUGGESTION = 1（提示文案可在实现期按截图微调）

A0（deep-dive gate）：**Pass** — 方向为 add/extend，⑨–⑫ 已在
`requirement-workspace/deep-dive.md` §US-031-AI 完成。可进入 impact / proposal。
