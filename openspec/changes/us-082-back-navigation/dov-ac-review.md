# US-082 AC / DoV 复核（P2）

- 复核人：sdd-delta-craft（P2 review），2026-11-17；IO/SA Johnson 按用户指令签核
- change：`us-082-back-navigation`
- delta：`specs/app-shell/spec.md`（1 MODIFIED + 2 ADDED / 12 场景）
- 证据：`requirement-workspace/requirements/US-082.md`、`analysis/us-082-dor.md`、GitHub issue #105
- 校验：`openspec validate us-082-back-navigation --strict` = valid

## 验收条件（AC）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| AC-1 | 每条 requirement 至少有 1 条可测 AC | **Pass** | Guest join 5 场景 + Trip-context 3 场景 + Auth 4 场景；均含 WHEN/THEN | 共 12 条 |
| AC-2 | AC 可观察 | **Pass** | 路由落点 `#/trips/<id>`、`/login`、`/register`；主/次按钮文案；登录后页面 | 无「运行良好」式表述 |
| AC-3 | 负向 / 边界 | **Pass** | 直接打开分队深链；非法 `next`（跨源/非单斜杠）；`pendingInvite` 优先；已登录访问注册页 | 高风险路径有负向场景 |
| AC-4 | AC 不是伪装的实现细节 | **Pass** | 场景不含类名/函数名；只描述路由、按钮与页面 | `?next=` 为实现手段但可观察 |

## Definition of Verified（DoV）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| DoV-1 | 范围与 proposal 一致 | **Pass** | 5 条本 change + 2 条 US-071 依赖，proposal `Acceptance mapping` 明确 | 无静默扩范围 |
| DoV-2 | 歧义已列或已解 | **Pass** | OQ-1 保留 hash 入口（non-blocking）；OQ-2 依赖验收方式已定 | blocking 未解 = 0 |
| DoV-3 | 角色关注已记录 | **Pass** | IO：同源校验、依赖边界；SA：两套路由、lastTripId 恢复 | 见残留 |
| DoV-4 | 未声称实现完成 | **Pass** | 本复核只评审 delta 与契约 | 无代码改动 |
| DoV-5 | 需求可追溯 | **Pass** | issue #105 AC1–AC7 → delta / US-071，见下表 | 无孤立场景 |

## 追溯表（issue AC → delta 场景）

| Issue AC | delta 覆盖 | 状态 |
|---|---|---|
| AC1 入会成功直达行程 | Guest join exclusion「Joined state opens the accepted trip」 | ✅ 本 change |
| AC2 成员页返回行程详情 | US-071 app-shell「Trip-scoped return links keep the trip context」（本 change 回归） | ✅ 依赖 |
| AC3 创建页返回行程列表 | US-071 app-shell「Create is reachable and returns to 行程」 | ✅ 依赖 |
| AC4 分队返回保留行程 | Trip-context「Split start back returns to the trip details」+「Direct split entry back does not fall to home」 | ✅ 本 change |
| AC5 登录后回原深链 | Auth「Signed-out split deep link resumes after login」+「Unsafe resume value is rejected」 | ✅ 本 change |
| AC6 登录/注册路由统一 | Auth「Auth pages link through router routes」 | ✅ 本 change |
| AC7 主线方案返回详情 | Trip-context「Main plan back returns to the trip details」 | ✅ 本 change |

## Fixture 对齐

无新增端点或迁移。E2E 复用既有演示账号与 `Singapore Friends Day` / `Bali Weekend` 行程；P4 在 `docs/feedback/e2e-us-082.md` 记录浏览器步骤与观察结果。US-071 的两条依赖行在其实施后回归。

实现期发现 accept 响应缺 `tripId`：已 additive 补齐并由 `InvitationApiTest` 锁定，delta 未变；J1 的完整端到端需在新后端上用真实响应复跑。

## 残留关注（IO / SA）

- **IO**：`next` 回跳必须同源且单斜杠前缀；非法值静默回默认路由，不打开外部地址。
- **IO**：`pendingInvite` 优先级高于 `next`，不得因本次改动改变邀请登录链路。
- **SA**：登录页同时被 Router `/login` 与 hash `#/login` 复用，实现不得依赖 Router hook；否则 hash 入口会崩。
- **SA**：US-071 未合并时 AC2/AC3 只能记依赖状态，不得冒充 Pass。
- **SA**：仓库级扫描有 4 条 BLOCKER 属未归档 `us-068-070`（身份横切启发式），本 change 无 auth delta，不计入本 change。

## 结论

**AC 4/4 Pass；DoV 5/5 Pass；本 change 5 条 AC 全覆盖，2 条依赖 US-071；无阻塞 Fail / Partial。** G1 按 IO Johnson + SA Johnson 签核。
