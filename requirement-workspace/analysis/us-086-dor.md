# US-086 Definition of Ready — self-check

- Date: 2026-11-17
- Requirement: `requirement-workspace/requirements/US-086.md`
- Scope: 纯前端展示重构（分队入口页 → 队伍路线总览）；无新数据模型、无新 API、无后端/数据库改动；deep-dive 不适用

| # | DoR item | Result | Evidence / note |
|---|---|---|---|
| ① | User-visible value is stated | **Pass** | 成员在一张时间线图里看到全队主线、分头、A/B 并行与会合，减少来回跳转 |
| ② | Acceptance criteria are testable | **Pass** | AC1–AC8 均有可观察的标题/动作/节点/状态结果；AC4-N 覆盖空时长 |
| ③ | Actors and permissions are identified | **Pass** | 行程成员、组织者/发起人、非成员与未登录访客；读取走既有成员范围与路由守卫 |
| ④ | Boundary with other requirements is clear | **Pass** | 边界/路线/确认页面归 US-039/042/043/049/050；个人路线归 US-052；倒计时归 US-063；本故事只改 Screen 11 展示 |
| ⑤ | Data and API dependencies are available | **Pass** | `GET /split-draft`（含 `mainPlanStops`、`groups`、`routes`）与 `GET /main-plan`（含 `confirmed`、`stops`）均已存在；无新契约 |
| ⑥ | Non-functional constraints are acknowledged | **Pass** | 无新 NFR；430px shell 内不横向滚动；无新依赖；轮询行为不变 |
| ⑦ | Estimation or sizing is feasible | **Pass** | 1 个页面重写 + 1 个只读图组件 + 数据装配/状态分支；预计 M；零迁移、零后端 |
| ⑧ | Risks and unknowns are recorded | **Pass** | OQ-2 多日分段 deferred；OQ-3 双数据源/时间格式已定展示规则；空时长与路线名缺失已定展示 |
| ⑨ | Data contract decided | **N/A** | 无新数据概念、无字段变更；只消费既有 DTO（`SplitDraftDetail` / `GroupRoute` / `PlanResponse`） |
| ⑩ | Boundary enumerated | **N/A** | deep-dive 未启用；业务分支在 Requirement §Scenarios 与 §Open questions 中列明 |
| ⑪ | Cross-REQ aligned | **N/A** | deep-dive 未启用；跨故事边界见 §Dependencies 与 impact brief §5 |
| ⑫ | Notification / display contract decided | **N/A** | deep-dive 未启用；展示字段在本条 Requirement 的 AC/Constraints 中固定（标题、动作、节点字段、空态） |

## Summary

BLOCKER = **0** · WARNING = **0** · SUGGESTION = **0**

A0（deep-dive gate）：**N/A** — 无 deep-dive（无新数据模型/API/DB 契约）；按 US-082 同类纯前端先例，以本条显式记录替代。可进入 P1 的 impact / proposal。
