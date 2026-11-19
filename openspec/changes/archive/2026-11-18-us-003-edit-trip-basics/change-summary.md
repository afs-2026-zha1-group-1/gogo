# Change summary — us-003-edit-trip-basics

- Story: GitHub issue #60（US-003；合并 US-003~007 / US-016 / US-017 / US-018 / US-051）
- PR: [#120](https://github.com/afs-2026-zha1-group-1/gogo/pull/120) → merge `136265a`（2026-11-18）
- 分支：`US-003-edit-trip-basics`（对账到 `group1/main` `b173c6a`），关键提交 `5babdc7` / `f6cfd1b` / `8e78238` / `dcf8c0c` / `019e0a2` / `8738ab8`

## 交付内容

1. **行程基本信息编辑**：`#/trips/{id}/edit` 全量表单；规划字段所有成员可改，名称仅组织者；日期校验；保存前应用内弹窗；分队锁态 409 引导。
2. **主计划失效与确认**：规划变更重置 `main_plan_confirmed`、supersede 确认草稿，`joining_closed` 保持关闭；主线确认快捷入口仅组织者并委托校验，确认后投影主线站点供分队读取。
3. **主线 stop 编辑**：组织者可在未确认草稿上改站点名称与 `HH:MM` 时间；校验失败/确认后/不存在分别返回 400/409/404；重生成整份替换并丢弃手动修改。
4. **US-051 取消已确认分队**：组织者出发前可取消，恢复主线；出发后 409；非组织者 403。
5. **邀请关闭语义**：`joiningClosed` 与 `mainPlanConfirmed` 解耦，确认后即使规划变更重置也保持关闭。
6. **我的页名字编辑原位化**：点击名字旁铅笔后，名字本身变为输入框；对勾保存、叉号或 Esc 取消；保存后恢复文本，已保存/错误提示显示在邮箱下方。

## Spec / 影响

- Living `trips`：+2 ADDED。
- Living `main-itinerary`：3 MODIFIED + 2 ADDED。
- Living `invitations`：2 MODIFIED。
- Living `splits`：+1 ADDED。
- Living `auth`：1 MODIFIED。
- API：`PUT /api/trips/{id}`、`POST /api/trips/{id}/main-plan:confirm`（组织者委托）、`PUT /api/trips/{id}/main-plan/stops/{seq}`、`POST /api/trips/{id}/split:cancel`；`joiningClosed` additive。
- 数据：`V10__add_joining_closed_and_trip_snapshot.sql`（`trip.joining_closed` 回填、`main_plan_draft.trip_basics_json`）。
- 依赖/安全：无新增依赖；会话鉴权与 `MemberGuard` 沿用。

## 验证

- 后端 `mvn -B test`：471/471。
- 前端 typecheck + build + 单测 47/47；浏览器验收 85/85。
- local-verify：`docs/ai4se-plugins/20261118-143428-local-verify-report.md`（Pass）。
- CI：run 44256708568 / 44256718535，Backend tests / Frontend build / Browser acceptance 全绿。
- `openspec validate us-003-edit-trip-basics --strict` = valid；`openspec validate --specs --strict` 9/9。

## 残留

- 名字保存成功提示为行内文本，后续可并入统一 toast。
- Living `trips` 中「不暴露确认操作」与列表 read-only 措辞属于其他 change，本次未改。
- 主线 stale 弹窗只在存在过期草稿时出现，浏览器复验使用 API 覆盖。
