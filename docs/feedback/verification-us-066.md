# US-066 浏览器验收记录（2026-11-16）

- Change：`us-066-log-in` / REQ-008
- 环境：Vite `http://localhost:5173` + Spring Boot `http://localhost:8080`
- 账号：Alice / Eve，密码 `gogo-demo-2026`（演示夹具）
- 方式：in-app browser 文本快照；截图不是验收依据

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| E1 | 未登录打开 `/` | 登录页（邮箱/密码/登录） | snapshot `url=.../#/login` |
| E2 | Alice 有效登录 | 进入 `#/`，显示“已登录 · Alice”、dock、greeting、创建入口 | snapshot `url=.../` |
| E3 | 错误密码 | 停留登录页，显示“邮箱或密码不正确。” | snapshot `url=.../#/login` |
| E4 | 未登录访问 `#/trips/1` | 登录页，无行程数据 | snapshot `url=.../#/trips/1` |
| E5 | 未登录访问 `/trips/1/split` | React Router 守卫跳 `/login` | snapshot `url=.../login` |
| E6 | 公开邀请预览 `#/join/<token>`（未登录） | 仅公开字段；提示“登录后加入” | snapshot `url=.../#/join/<token>` |
| E7 | 点击“登录后加入”→ Eve 登录 | 回到同一 `#/join/<token>` 预览；未自动加入 | snapshot 同 token |
| E8 | 预览中显式“接受邀请并加入” | 加入成功/已加入状态；无重复 membership | snapshot “已加入「Singapore Friends Day」” |
| E9 | Alice 访问 `#/create` | 创建表单在 shell 内，header 显示已登录账号 | snapshot `url=.../#/create` |
| E10 | Alice 访问 `#/trips/1` | 行程详情、邀请面板（QR/链接）正常 | snapshot 含 `Singapore Friends Day`、邀请 URL |
| E11 | Alice 访问 `#/trips/1/main-plan` | 主线路由在受保护 shell 内加载 | snapshot “还没有主线方案” |
| E12 | Alice 访问 `/trips/1/split` | split 页面加载，只读“已登录 · Alice”，无身份栏 | snapshot `url=.../trips/1/split` |
| E13 | split 发起草稿 | 返回业务错误 `MAIN_PLAN_NOT_CONFIRMED`（非 CSRF 403），证明 session+CSRF 生效 | snapshot “操作被拒绝 / MAIN_PLAN_NOT_CONFIRMED” |
| E14 | 后端重启后访问受保护路由 | session 失效 → 登录页；重新登录可用 | 重启后 snapshot `#/login` |
| E15 | 未登录登录页布局 | 与仪表盘同款移动壳：`.app` 430px 居中、appbar + “一起出发” hero + 卡片表单；非全宽大屏 | `getBoundingClientRect().width = 430`（viewport 876） |

说明：Tomcat 的 session 超时粒度为分钟，短超时 profile 在 API 层以“失效 session
→ 401”等价验证；浏览器用后端重启模拟过期。G1 C5 的 CSRF/公开面/短超时设计见
`design.md` D11 与 `AuthApiTest`/`SessionExpiryApiTest`。
