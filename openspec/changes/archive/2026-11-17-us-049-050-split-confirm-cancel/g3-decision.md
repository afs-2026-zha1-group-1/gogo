# G3 decision — us-049-050-split-confirm-cancel

- **Gate:** G3（Merge & Archive）
- **Decision:** **Pass**
- **Approvers:** SA = **Leo**（2026-11-17，用户指令「开始下一步p5」覆盖归档车道；按先例代记于 SA 名下，非代理自批）
- **Timestamp:** 2026-11-17（+0800）
- **Change id:** `us-049-050-split-confirm-cancel`
- **Target:** `main` 直开发（无 PR）；实现头 `64060f5` / 查看入口 `60f44d1` / G2 记录 `3f7758f`

## Inputs

- **living-merge:** `openspec archive us-049-050-split-confirm-cancel --yes` 成功 — `splits` **+2 added / ~5 modified / −0**；归档目录 `openspec/changes/archive/2026-11-17-us-049-050-split-confirm-cancel/`。
- **Living Spec 结果:** `openspec/specs/splits/spec.md` = **7 requirement / 51 scenario**；归档工具不替换既有 Purpose，已手工把 Purpose 纠正为会话身份、`split_draft` 表、V4 迁移、三态状态机与 `error.details`。
- **KB update:** `scripts/kb-lint.sh` → `SKIP: KB lint is not configured for this project.`（exit 0；项目基线文档化为非阻塞 SKIP，**不等于 KB 校验通过**）。
- **change-summary:** `change-summary.md`（含 Downstream read contract C9/D13）。
- **Knowledge reconciliation（F3）:** `docs/knowledge/architecture/tech-stack-plan.md` §18 landed reconciliation；`docs/knowledge/_LOG.md` 追加一行。
- **Archive completeness:** `tasks.md` **37/37** 完成（P5 四项已闭合：8.1 §18、8.2 registry/handoff/_LOG、8.3 downstream 契约、8.4 转交 follow-up F4）。
- **验证输入:** G1 Pass（SA Leo + IO Emily）→ G2 Pass（**VL Johnson Sun**，2026-11-17 重签，取代 2026-11-16 Elian Jiang 记录）→ local-verify Pass（`20261116-174102`）→ CI `43839036207` / `43833884672` 双 job 绿。

## Conclusions

- **Merge（归档）:** delta 已完整合入 Living `splits`；2 条 ADDED（confirm / cancel）+ 5 条 MODIFIED（start / boundary / routes / timing / detail）全部落地，无静默扩缩。
- **Conflicts:** 无。归档前 `openspec validate --strict` valid；归档后 `validate --specs --strict` 仅报「Requirement 文本 >500 字符」类 WARNING（`trips` / `app-shell` 等既有 spec 同样如此，属项目存量风格，非本次引入的阻塞）。
- **Archive completeness:** 37/37；`--archived` 语义满足。
- **Harness / Rules evolve:** 不需要新规则；E2E 发现的 3 处 UX nit 与残留 change 清理记为 follow-up，不改变 Rules。
- **产品边界:** 确认后不可再拆/不可编辑为现行契约（US-049 AC1 + US-050 AC2 + US-038），「确认后想改」需新需求（版本化重拆）另走 P1。

## Conditions + owners（非阻塞，归档后跟踪）

| # | 事项 | owner | 性质 | 状态 |
|---|---|---|---|---|
| F1 | 三处 UX nit（取消后残留错误卡 / cancelled 隐藏生成 CTA / 报错页隐藏发起入口） | Dev | 非阻塞 | pending |
| F2 | C10「409 后重新 GET 判定是否已成功」重试 UX | Dev | 非阻塞 | partial |
| F4 | 清理空壳 `req-004-split-draft-start` 等残留 change | Dev | 非阻塞 | pending |
| F5 | US-069 落地 logout 后补测 E11 未登录跳转子项 | Dev（US-069） | 非阻塞 | pending |
| P1 | （产品决策）确认后重新规划：版本化重拆新需求 | SA / IO | 待立项 | pending |

## Waiver

无（G2 无 Fail，归档完整）。

## Next

- 归档完成 → 看板 #21 / #22 转 **Done**；registry / handoff 置「Archived」。
- F1 / F2 / F4 / F5 转入 follow-up；P1 由用户决定是否立项。
- 本记录不执行归档本身、不改 Living Spec、不代签 G1/G2。
