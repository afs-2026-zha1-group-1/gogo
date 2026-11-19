# CI report — us-003-edit-trip-basics

- PR: [#120](https://github.com/afs-2026-zha1-group-1/gogo/pull/120)
- Head: `8738ab8`
- Merge commit: `136265a`（2026-11-18）

| Run | Workflow | Backend tests | Frontend build | Browser acceptance |
|---|---|---|---|---|
| 44256102496 | push | Pass | Pass | Pass |
| 44256110120 | PR | Pass | Pass | Pass |
| 44256708568 | push | Pass | Pass | Pass |
| 44256718535 | PR | Pass | Pass | Pass |

补充：

- 44253873906 / 44253884922 的 Browser acceptance 曾失败，原因是 main 新增用例仍假设名字输入常驻；已在 `019e0a2` 改为先点「编辑名字」，本地复跑 85/85 后 CI 转绿。
- 后端基线与 main `b173c6a` 对账后为 471 例；前端单测 47 例。
