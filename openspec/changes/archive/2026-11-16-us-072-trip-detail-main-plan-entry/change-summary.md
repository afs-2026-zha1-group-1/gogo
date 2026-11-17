# Change summary — us-072-trip-detail-main-plan-entry

## Intent

行程成员此前需在行程详情页之外的路径进入主线方案；US-072 在 `TripDetails.tsx` 的"邀请朋友"与"分队规划"之间新增一条"查看主线方案"入口，让成员在规划分队前能直接打开本行程已有的主线方案页面查看方案与状态。范围限定为纯前端入口，复用 US-031-037 已归档的 main-itinerary 查看能力与现有权限/登录流程，不改变邀请或分队规划规则。

## What shipped

- **Living Spec**：`openspec/specs/trips/spec.md` 合并 **+1 ADDED requirement**「Trip detail main-plan navigation entry」/ 5 scenarios（S1–S5）。
- **代码**：`frontend/src/pages/TripDetails.tsx` +10 行——在 `<InvitationPanel/>` 之后、"分队规划" `sec-title` 之前插入 `sec-title`（`Icon name="sparkle"` + "主线方案"）与 `card pad` 卡片，内含提示文字与 `<a className="btn btn-primary" href="#/trips/${trip.id}/main-plan">查看主线方案</a>`。
- **无**后端 / API / 新页面 / 新路由 / 新组件 / 新依赖 / 数据迁移。
- **归档**：change 移入 `openspec/changes/archive/2026-11-16-us-072-trip-detail-main-plan-entry/`。
- **KB 更新**：`kb-lint.sh` → SKIP（教学基线未配置，非阻塞）；tech-stack-plan 对账为 no-op（无新增 API/表/栈）。

## Verify highlights

| 门禁 | 结果 | 证据 |
|---|---|---|
| 构建 | Pass（tsc + vite 零错误） | P4 `npm run build` |
| E2E | 7/7 Pass（E1–E7，覆盖 S1–S5 + 返回路径 + 非成员拦截） | `docs/feedback/e2e-us-072.md` |
| local-verify | Overall Pass（V1–V8 全 Pass，白名单 5/6，1 失败为环境类） | `docs/ai4se-plugins/20261116-210810-local-verify-report.md` |
| openspec validate | valid（1 非阻塞 spec-length WARNING） | P2/P3 |
| G1 Align | Pass（IO Leo + SA Lumi） | `archive/.../g1-decision.md` |
| G2 Verify | Pass（VL ELIAN） | `archive/.../g2-decision.md` |

## Residual risks

- 纯前端极小改动未触发远程 CI/CD，以本机 build + E2E + 证据 checklist 作验证；已作为可接受残余风险在 G2 记录。
- 两项非阻塞 WARNING（`yaml.load(BaseLoader)` 白名单命令在本机 PyYAML 下的解析 quirk、ADDED requirement 文本 >500 字符风格提示）——均与验收无关，跟进项候选（非权威）。

## Links

- Requirement：`requirement-workspace/requirements/US-072.md`
- DoR：`requirement-workspace/analysis/us-072-dor.md`
- Impact：`requirement-workspace/impact-brief.md` §US-072
- Change（归档）：`openspec/changes/archive/2026-11-16-us-072-trip-detail-main-plan-entry/`（proposal / design / tasks / atdd-design / dov-ac-review / g1-decision / g2-decision）
- Living Spec：`openspec/specs/trips/spec.md`
- 代码：`frontend/src/pages/TripDetails.tsx`
- E2E：`docs/feedback/e2e-us-072.md`
- local-verify：`docs/ai4se-plugins/20261116-210810-local-verify-report.md`
- Registry：`requirement-workspace/registry.md` US-072 行
