# US-031-AI AC / DoV 复核（P2）

- 复核人：sdd-delta-craft（P2 review），2026-11-18
- change：`ai-main-plan-generation`
- delta：`specs/main-itinerary/spec.md`（1 MODIFIED；G1/G2/G5/G6 保留 + 4 条新场景 + 1 条校验场景）
- 证据：`requirement-workspace/requirements/US-031-AI.md`、`analysis/us-031-ai-dor.md`、
  `analysis/us-031-ai-impact-brief.md`、`deep-dive.md` §US-031-AI、`proposal.md`
- 校验：`openspec validate ai-main-plan-generation --strict` = **valid**

## 验收条件（AC）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| AC-1 | 每条 requirement 至少有 1 条可测 AC | **Pass** | MODIFIED 生成需求含 G1/G2/G5/G6 + AI 成功、AI 失败降级、地点补全降级、非阻塞提示、输出校验共 9 条场景 | 均含 GIVEN/WHEN/THEN |
| AC-2 | AC 可观察 | **Pass** | 201、草稿站点名称/时刻/车程/费用、两站降级、提示可见/可导航/关闭、错误码沿用 | 无“运行良好”式表述 |
| AC-3 | 负向 / 边界 | **Pass** | 成员未就绪、已确认后生成、AI 超时/非 2xx/非法输出、地点为空、非组织者/非成员/未登录（既有场景） | 高风险路径均有场景；见残留关注 S-3 |
| AC-4 | AC 不是伪装的实现细节 | **Pass** | 场景只描述可观察结果；仅以“外部 AI 模型服务 / 确定性夹具”区分两条可观察路径，未出现类名、库名或函数名 | DeepSeek/GLM 只出现在设计，未进入 delta |

## Definition of Verified（DoV）

| # | 项 | 结果 | 证据 | 备注 |
|---|---|---|---|---|
| DoV-1 | 范围与 proposal 一致 | **Pass** | proposal「What Changes」= DeepSeek 客户端 + AI provider + 输出校验 + 最小两站降级 + 无 key 夹具 + 非阻塞提示 + 配置；delta 全部覆盖 | 无静默扩范围；确认校验/数据库/API 明确不改 |
| DoV-2 | 歧义已列或已解 | **Pass** | US-031-AI OQ-1…OQ-5 blocking 全部 resolved；OQ-6 resolved；OQ-7/OQ-8 non-blocking deferred | blocking 未解 = 0 |
| DoV-3 | 角色关注已记录 | **Pass** | IO：静默降级与两站内容接受（2026-11-18）；SA：密钥/提示词注入/超时/测试不触网；运维：env 注入与回滚 | 见残留关注 |
| DoV-4 | 未声称实现完成 | **Pass** | 本复核只评审 delta/契约；仓库无本变更代码改动 | — |
| DoV-5 | 需求可追溯 | **Pass** | US-031-AI AC1–AC9 → delta 场景，见下表 | 无孤立场景 |

## 追溯表（US-031-AI AC → delta 场景）

| Requirement AC | delta 覆盖 | 状态 |
|---|---|---|
| AC1 AI 返回合法行程 | `AI 提供者产出草稿` | ✅ |
| AC2 AI 失败降级两站 | `AI 失败时降级为最小两站行程` | ✅ |
| AC3 已填地点原样使用 | `AI 失败时降级为最小两站行程`（GIVEN 已给地点） | ✅ |
| AC4 空地点先补全 | `未填写地点时降级使用补全后的地点` | ✅ |
| AC5 无 key 仍走夹具 | `G1 — all members ready, draft generated (US-031 AC1)`（GIVEN 无 key） | ✅ |
| AC6 非法输出拒绝 | `AI 输出在入库前被校验` | ✅ |
| AC7 生成中非阻塞提示 | `生成期间显示非阻塞的 AI 进度提示` | ✅ |
| AC8 失败沿用手行内错误 | 同上场景的第二条 THEN + 既有 G2/G6 错误路径 | ✅ |
| AC9 权限不变 | 既有 `Authorization and identity for main-plan operations` 未修改 | ✅（不改） |

## Fixture 对齐

无新增端点或迁移；`FakeMainPlanProviderTest` / `MainPlanApiTest` 在无 key 环境保持原断言。
AI 路径的测试走 stub 客户端与 `MockRestServiceServer`，不依赖真实网络。P4 需补一次真实
key 手工生成记录（OQ-8）。

## 残留关注（IO / SA）

- **IO**：降级静默且只有两站，用户不知道 AI 失败；用户 2026-11-18 已接受，若后续要
  披露需另立变更。
- **IO**：提示文案始终为“AI 正在生成中…”，即使实际会很快落夹具；接受，不区分路径。
- **SA**：delta 的 G1 场景沿用既有 `X-User-Id: 1` 简写，而当前实现使用 session
  principal（US-066）；属于既有 Living Spec 漂移，本变更不扩大也不修正。
- **SA**：AI 输出校验只有下限（≥2 站），没有上限；超大行程仍会通过结构与确认校验。
  建议在实现期以确认校验兜底，若出现实际风险再补上限（非阻塞）。
- **SA**：读取超时 20s、单次尝试；超时即降级，不重试，避免演示中叠加延迟。
- **SA**：无 key 路径与 AI 路径行为不同（城市夹具 vs 两站降级），G1 场景已用“无 key”
  前提区分，测试与演示不得混用两种预期。

## 结论

**AC 4/4 Pass；DoV 5/5 Pass；无阻塞 Fail / Partial。**
`openspec validate --strict` valid。可进入 G1，但需具名 **IO + SA** 签署；本复核不写
Gate 结论。

> 2026-11-18 追记：provider 由 DeepSeek 改为DeepSeek；同日 P4 再把默认模型由
> `deepseek-v4.1-flash` 换为 `deepseek-v4.1-flash`（用户指令）。delta 只写“外部 AI 模型服务”，
> 不含厂商或模型名，因此两次替换都不影响 AC/DoV 结论；仅 proposal/design/
> requirement 与配置默认值同步更新。
