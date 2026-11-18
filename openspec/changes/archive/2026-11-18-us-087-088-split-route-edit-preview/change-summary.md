# Change summary — us-087-088-split-route-edit-preview

## Intent

让「分组与路线」第 2 步真正可编辑：A/B 路线以站点列表维护（站名、停留、逐段路程，可增删站点），点击「下一步」先保存再由服务端校验会合时间窗；通过后进入只读「队伍路线预览」，不通过用弹窗说明原因。目标是把编辑、校验、预览、确认收敛到同一份草稿事实，避免「校验通过但确认失败」。

## What shipped

- 后端新增 `PUT /api/trips/{tripId}/split-draft/routes`：整对保存两组站点列表；A 组 legs=站点数，B 组 legs=站点数+1；服务端派生 activity/name/location、buffer=0，清洗「主线·」前缀；单事务双写 `plan_node` + `draft.routes`，`draftVersion` CAS 回滚。
- Screen 13：A/B 均为站点列表，可添加/删除站点；行默认只读，右侧铅笔进入行级编辑；新增站点空值 + 「新站点」占位；路程统一标注「路程」；数字输入隐藏原生 spinner。
- 新只读预览 `/split/preview`，旧 `/split/timing` 重定向；预览按地点/路程交替展示；只读卡、预览、确认页统一清洁站名。
- Living Spec：`splits` 1 ADDED + 4 MODIFIED，46 场景；已通过 OpenSpec archive 合并到 `openspec/specs/splits/spec.md`。
- KB：`tech-stack-plan.md` §27 + `_LOG.md` 已追加；`scripts/kb-lint.sh` 按基线政策输出 `SKIP`（未配置，不声称 KB lint 通过）。

## Verify highlights

- 后端 `mvn -B test`：381/381
- 前端 `typecheck` / `test:unit` 47/47 / `build`：通过
- Playwright：85/85
- local-verify：Overall Pass（`docs/ai4se-plugins/20261118-120312-local-verify-report.md`）
- CI：GitHub Actions runs 44234803228 / 44234811292 全绿（同一 commit `4df79e1`）
- G2：Pass，VL Leo（`g2-decision.md`）

## Residual risks

- G1 Revision 2–4 的 IO Emily 具名复签仍未完成；G2 记录中作为合并前跟踪项，未伪造签名。
- 极旧 A 组草稿（`steps=[]` 且 legs=2）保存会被新校验拒绝，建议重新生成或后续补兼容。
- `FixtureBranchCandidateProvider.Branch.bufferMinutes` 已不再读取，可后续清理。
- 前后端各一份「主线·」清洗正则，若继续扩散可抽公共契约。

## Links

- Spec / design / tasks：`openspec/changes/archive/2026-11-18-us-087-088-split-route-edit-preview/`
- Living Spec：`openspec/specs/splits/spec.md`
- PR：#135（merge `5c6840e`）
- local-verify：`docs/ai4se-plugins/20261118-120312-local-verify-report.md`
- pipeline ci：`docs/ai4se-plugins/20261118-125324-pipeline-report.md`；`ci-report.md`
- G1：`g1-decision.md`；G2：`g2-decision.md`
- KB：`docs/knowledge/architecture/tech-stack-plan.md` §27；`docs/knowledge/_LOG.md`
