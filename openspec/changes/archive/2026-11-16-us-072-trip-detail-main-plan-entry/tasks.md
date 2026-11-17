# Tasks — US-072 trip-detail-main-plan-entry

## 1. 实现入口 section

- [x] 1.1 在 `frontend/src/pages/TripDetails.tsx` L181（`<InvitationPanel .../>` 闭合标签）之后、L183（“分队规划” `sec-title`）之前，插入主线方案 section（design D1 代码）
- [x] 1.2 确认 `npm run build`（含 tsc）零错误

## 2. E2E 验收

- [x] 2.1 启动后端 + 前端 dev server
- [x] 2.2 按 `atdd-design.md` E1–E7 逐条在浏览器执行并记录结果到 `docs/feedback/e2e-us-072.md`

## 3. 收尾

- [x] 3.1 更新 `requirement-workspace/registry.md` US-072 行为 P4 完成状态
- [x] 3.2 对账 `docs/knowledge/architecture/tech-stack-plan.md`（本故事无新增 API/表且未归档，按 config.yaml「只同步已归档变更」规则为 no-op，无需补注）

---

## 对齐自检 Spec ↔ Design ↔ Tasks ↔ ATDD

| Delta scenario | Design ref | Task ref | ATDD row |
|---|---|---|---|
| S1: 入口可见、位置正确 | D1, D2 | 1.1 | E1 |
| S2: 点击跳转、无 POST | D3 | 1.1, 2.2 | E2 |
| S3: 无方案仍可进入 empty | D2, D3 | 1.1, 2.2 | E3 |
| S4: 非成员/未登录拦截 | D3（复用现有） | 2.2 | E4, E5 |
| S5: 返回到同行程详情 | D3（info 按钮已存在） | 2.2 | E6, E7 |

**5/5 scenarios mapped · self-check Pass.**
