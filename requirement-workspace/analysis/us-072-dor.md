# US-072 Definition of Ready — self-check

- Date: 2026-11-16
- Requirement: `requirement-workspace/requirements/US-072.md`
- Scope: items ①–⑧（无 deep-dive — 纯前端入口，无新数据模型/契约/API）

| # | DoR item | Result | Evidence / note |
|---|---|---|---|
| ① | User-visible value is stated | **Pass** | 成员在分队前可方便查看主线方案；rationale 字段明确 |
| ② | Acceptance criteria are testable | **Pass** | 6 条 AC + 2 条反向场景，均可通过浏览器操作和 DOM 状态验证 |
| ③ | Actors and permissions are identified | **Pass** | 任何已登录成员可见入口；非成员/未登录按现有规则拦截 |
| ④ | Boundary with other requirements is clear | **Pass** | In/Out scope 明确；不改变邀请、分队规划、MainPlan、后端 |
| ⑤ | Data and API dependencies are available | **Pass** | `GET /api/trips/{id}/main-plan` 已由 US-031-037 实现并归档；路由 `#/trips/{id}/main-plan` 已在 App.tsx 注册 |
| ⑥ | Non-functional constraints are acknowledged | **Pass** | 无新 NFR；页面响应性由现有 React 渲染保证，无额外性能要求 |
| ⑦ | Estimation or sizing is feasible | **Pass** | 单文件、~10 行 JSX 新增；预估 < 0.5h 实施 |
| ⑧ | Risks and unknowns are recorded | **Pass** | 仅 OQ-1（图标选择），non-blocking，deferred to P3；无技术风险 |

## Summary

BLOCKER = **0** · WARNING = **0** · SUGGESTION = **0**

A0 **Pass** — 可进入影响分析与 P2 proposal-split。
