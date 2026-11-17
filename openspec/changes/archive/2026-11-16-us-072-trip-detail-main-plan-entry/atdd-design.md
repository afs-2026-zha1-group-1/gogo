# ATDD design — US-072 trip-detail-main-plan-entry

## 1. ATDD layers in scope

| Layer | Applicable | Scenarios |
|---|---|---|
| **API** | No | 本故事无新增/修改后端端点，无需 API 测试 |
| **E2E** | **Yes** | S1–S5 全部为浏览器端可观察行为（DOM 位置、路由跳转、无 POST、返回） |
| UT (deferred) | No | 无纯逻辑新增；apply 阶段如需可补 TripDetails 渲染单测，但非验收前提 |

**Deferred to `/sdd:atdd-apply` (unit-level TDD):** 无。

## 2. What is written before production code

E2E 验收清单（先写 checklist，后编码）：

| id | Action | Expected observation |
|---|---|---|
| E1 | 以 Ben (user 2) 登录，打开 `#/trips/1` | "主线方案"section 标题可见，位于"邀请朋友"之后、"分队规划"之前 |
| E2 | 点击"查看主线方案"按钮 | 地址栏变为 `#/trips/1/main-plan`；MainPlan 页面渲染（ready 或 empty 状态）；DevTools Network 无 POST/PUT/DELETE 到 `/main-plan`（仅 GET） |
| E3 | 以 Alice (user 1) 打开无方案行程详情并点击入口 | MainPlan 显示"还没有主线方案"empty 状态 + 组织者可见生成按钮 |
| E4 | 以 Eve (user 5，非成员) 直接访问 `#/trips/1/main-plan` | MainPlan 显示"没有访问权限" denied 状态 |
| E5 | 未登录直接访问 `#/trips/1/main-plan` | 显示 LoginPage |
| E6 | 在 MainPlan 页面点击 appbar 右侧 info 按钮 | 返回 `#/trips/1`（行程详情页），"查看主线方案"入口仍可见 |
| E7 | 在 MainPlan 页面使用浏览器返回 | 返回 `#/trips/1` |

## 3. Local vs CI gate expectations

| Gate | Command | Criteria |
|---|---|---|
| Typecheck + Build | `npm run build`（含 `tsc --noEmit`） | 零错误 |
| E2E checklist | 人工按 E1–E7 逐条在浏览器执行 | 全部符合预期 |
| CI (`.github/workflows/ci.yml`) | Frontend build job | `npm ci && npm run build` 绿 |

无后端测试改动（`mvn test` 不受影响，无需重跑）。

## 4. Data / fixtures strategy

复用现有 `acceptance-test-fixtures.md` 的 fixture：

- Trip 1 "Singapore Friends Day"（有方案/ready 状态）— 验证 E1/E2/E6/E7
- Trip 2 "嗷嗷嗷"（无方案/empty 状态）— 验证 E3
- Eve user 5 非成员 — 验证 E4
- 未登录态 — 验证 E5

无需新增 fixture 数据或测试种子。

## 5. Non-goals

- 不写后端/生产 API 测试。
- 不设计 Playwright / POM / Excel generator。
- 不新增 CI job 或流水线步骤。
- 不修改 MainPlan / MainPlanInputs / InvitationPanel 的测试。
- 不在本阶段编写生产代码。

## 6. NFR tests

**Out of scope** — 单条 `<a>` 标签无性能/可观测性/弹性风险，无需 NFR 测试。
