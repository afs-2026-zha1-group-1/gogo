# Change summary — req-020-manage-must-do（US-020 成员必做项）

## 交付

- **后端**：`GET/PUT /api/trips/{id}/preferences/must-dos`——整表替换、服务端按 `max+1` 签发 id、七步校验（activity 必填、地点或时间至少一项、`HH:MM`、重复/未知 id 等）、存储 `name` 镜像；`PreferenceRepository` 按 `kind` 参数化。**零迁移、零新依赖、零新路由**。
- **前端**：偏好页「必做项（US-020）」分区——增/改/删、删除确认、原生 `type=time` 时间控件、行内编辑/删除图标。

## 验证

- `mvn -B test` 295/295（P4 快照）；P4 隔离运行期 API **45/0**；实时 8080 安全探测 **13/0**（`docs/ai4se-plugins/20261117-120157-*`）。
- 浏览器 PAGE 行由 owner 在 Edge 走查（**转达式记录**，附截图；代理 ComputerUse 被主机护栏硬停未自观测），记录于 `docs/feedback/verification-req-020.md` §2。
- CI：run `44024720514` 在 `c739dfa` 双 job（Backend tests + Frontend build）success。

## 关键决策

`kind='must_do'` 复用 `member_preference`；整表 `PUT` 且省略即删除；`name` 存储镜像（R4，仅落库不上线）；身份走会话。**MD13「最多一个新类」限制于 2026-11-17 因对齐 screen-08 被 owner 放开**，新增 `.mustdo-lead/.row-actions/.btnrow/.mustdo-row.grow`（行为契约不变）。

## 状态

G1 **Pass**（IO Emily + SA evelyn.huang）；G2 **草稿**（`g2-decision.md`，待具名 VL 签署，闸门未关闭）；G3 未记录。

## Links

`proposal.md` · `specs/preferences/spec.md` · `dov-ac-review.md` · `atdd-design.md` · `design.md` · `tasks.md` · `docs/feedback/verification-req-020.md` · `docs/feedback/verification-matrix.md` §REQ-020 · `g2-decision.md` · `docs/ai4se-plugins/20261117-*`
