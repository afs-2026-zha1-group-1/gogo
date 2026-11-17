# Design — US-072 trip-detail-main-plan-entry

## Scope

单文件前端修改，无后端/架构/数据变更。

## D1 — 入口 section 结构

在 `TripDetails.tsx` 的 ready-state JSX 中，`<InvitationPanel>` 闭合标签之后、"分队规划" `<div className="sec-title">` 之前插入：

```tsx
<div className="sec-title" style={{ marginTop: 18 }}>
  <Icon name="sparkle" className="sm" /> 主线方案
</div>
<section className="card pad">
  <p className="hint" style={{ marginBottom: 12 }}>
    查看大家共享的主线行程和方案状态。
  </p>
  <a className="btn btn-primary" href={`#/trips/${trip.id}/main-plan`}>
    查看主线方案
  </a>
</section>
```

## D2 — 可见性规则

入口对所有已成功加载行程详情的成员可见（即 `state.kind === 'ready'` 渲染路径中）。不依赖 `mainPlanConfirmed`、方案是否存在、或组织者身份。

## D3 — 导航语义

- 使用 `<a href>` SPA 锚点（与"设置我的兴趣"入口同型），触发 hashchange → parseRoute 匹配 `mainPlanMatch` → 渲染 `<MainPlan>`。
- 无 `onClick`、无 `window.location` 赋值、无 fetch/POST。
- 返回路径由 MainPlan.tsx 已有的 info 按钮 (`href="#/trips/${tripId}"`) 与浏览器返回覆盖。

## D4 — 样式复用

| 类名 | 来源 | 用途 |
|---|---|---|
| `sec-title` | app.css L107 | section 标题行 |
| `card pad` | app.css L33 | 白色圆角容器 |
| `btn btn-primary` | app.css L55 | 主操作按钮样式 |
| `hint` | app.css L118 | 辅助说明文字 |
| `Icon name="sparkle" className="sm"` | Icons.tsx | 标题图标 |

不新增 CSS 类，不引入新组件。

## D5 — 类型与依赖

- 无新增 TypeScript 类型或接口。
- 无新增 npm 依赖。
- `trip.id` 已在 `Trip` type 中存在；`trip` 变量在渲染作用域可用。
