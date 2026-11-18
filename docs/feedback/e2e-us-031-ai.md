# E2E — US-031-AI 生成中提示与最小行程降级

- Date: 2026-11-18
- Build: branch `ai-main-plan-generation`（未提交）
- Environment（降级轮）: backend `:8081`（独立库；`LLM_API_KEY=demo`、
  `PLAN_AI_BASE_URL=http://10.255.255.1:9` 不可达，强制连接超时后降级）；
  frontend `:5174`（`GOGO_API_PROXY_TARGET=http://localhost:8081`）
- Environment（真实轮）: 同一端口/独立库；`LLM_API_KEY` 用户环境变量 + 默认内部
  DeepSeek 网关与 `deepseek-v4.1-flash`
- Login: Alice (`alice@example.com` / `gogo-demo-2026`)；trip “Singapore Friends Day”
- 截图：`docs/feedback/e2e-us-031-ai-e1.png`、`-e2.png`、`-e4.png`

| id | 步骤 | 预期 | 结果 | 证据 |
|---|---|---|---|---|
| E1 | 生成输入页点「一键生成主线方案」 | “AI 正在生成中…”可见；页面仍可滚动；按钮禁用；结束后进入方案页 | **Pass** | `e2e-us-031-ai-e1.png`：提示条 + spinner 可见，页面滚动条与底部 dock 正常 |
| E2 | 方案页点「重新生成」 | 提示可见；按钮显示“正在生成…”；成功后版本递增 | **Pass** | `e2e-us-031-ai-e2.png`（提示 + “正在生成…”）；随后快照显示 `草稿 v2` |
| E3 | 请求失败后提示关闭、行内错误出现 | 提示消失；既有错误提示 | **Pass** | 将 Daniel 置为未就绪后生成：页内出现“还有成员未就绪：Daniel…”，无残留提示条 |
| E4 | 点「确认主线方案」 | 不出现“AI 正在生成中…”；完成后进入已确认态 | **Pass** | `e2e-us-031-ai-e4.png`：无提示条，`已确认 v2`，进入智能分队入口 |
| R-E1 | 非组织者/非成员打开生成页 | 无生成入口或提示 | **Pass** | Ben 登录后打开输入页：无生成按钮，仅显示“只有组织者可以生成主线方案” |

## 降级结果（A2 端到端）

不可达 base-url 触发连接超时后，草稿为两站：

| seq | 站点 | 时间 | 车程 |
|---|---|---|---|
| 1 | City Hall MRT | 09:00–09:30 | 30 分钟 |
| 2 | Merlion Park | 17:00–17:30 | — |

人均费用 `S$0`；确认成功（v2），说明降级行程通过排期与预算校验。

## 真实 DeepSeek 生成（2026-11-18 最终）

- 来源：opencode 已配置的 `llm-gateway-alicloud` 内部网关；
  `https://mlop-llm-gateway-dev.home-np.oocl.com/v2/openai/deployments/ali-copilot`，
  `LLM_API_KEY` 环境变量认证（仓库内无密钥）。
- 模型：`deepseek-v4.1-flash`；读取超时 30s、`max_tokens` 8192、提示副文案“通常需要 10–30 秒”。
- **结果：AI 成功产出草稿 v1**，30s 内完成：
  - 09:30–09:55 City Hall MRT（culture，车程 5）
  - 10:00–11:30 National Gallery Singapore（art/culture，车程 10）
  - 11:40–12:40 Maxwell Food Centre lunch（food/culture，车程 20）
  - 13:00–15:00 Gardens by the Bay（nature/culture，车程 20）
  - 15:20–16:00 Merlion Park（culture）
  - 人均费用 **S$65**，版本 v1，草稿待确认。
- 期间历史：曾切智谱 `glm-5.3-flash`（直连 200），但本机对公网端点 TLS 受限；
  最终按用户指令改回 opencode 的 DeepSeek 内部网关。

## 备注

- E1/E2/E4 使用不可达 base-url 验证降级与提示；E3/R-E1 在 DeepSeek 环境验证。
- 生产代码未加人为延迟；提示在无 key 的快速路径下可能一闪而过。
- 本次验证使用独立数据库，结束后已停止 8081/5174 进程并删除临时 DB。
