# US-082 Definition of Ready — self-check

- Date: 2026-11-17
- Requirement: `requirement-workspace/requirements/US-082.md`
- Scope: 纯前端路由修复；无 deep-dive（无新数据模型、无新 API、无后端契约）

| # | DoR item | Result | Evidence / note |
|---|---|---|---|
| ① | User-visible value is stated | **Pass** | 入会成功可进入行程；分队/主线方案返回保留行程；登录后回原深链 |
| ② | Acceptance criteria are testable | **Pass** | 7 条 AC 均有可观察路由或按钮结果；本 change 覆盖 AC1/4/5/6/7，AC2/3 由 US-071 交付 |
| ③ | Actors and permissions are identified | **Pass** | 成员、组织者、未登录访客；深链回跳仅同源站内路径 |
| ④ | Boundary with other requirements is clear | **Pass** | AC2/3 归 US-071；扫描路由归 US-067；本 change 不碰 `App.tsx`、`Members.tsx`、`CreateTrip.tsx` |
| ⑤ | Data and API dependencies are available | **Pass** | `AcceptResult.tripId` 已由 invitations 契约返回；`#/trips/<id>`、`/login`、`/register`、`/trips/:id/split` 路由已存在 |
| ⑥ | Non-functional constraints are acknowledged | **Pass** | 无新 NFR；不新增依赖或请求 |
| ⑦ | Estimation or sizing is feasible | **Pass** | 6 个前端文件，预计 S；无迁移、无后端 |
| ⑧ | Risks and unknowns are recorded | **Pass** | OQ-1 保留 hash 入口（non-blocking）；OQ-2 US-071 依赖（已定验收方式）；开放重定向有同源校验 |

## Summary

BLOCKER = **0** · WARNING = **0** · SUGGESTION = **0**

A0 **Pass** — 可进入 P2 提案与 delta 评审。
