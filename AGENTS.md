# Agent engineering guide

This guide applies to coding agents working in this repository. Read the relevant spec, implementation, and tests before editing. Write repository documentation in Chinese.

## Four development principles

1. **Think before coding.** State assumptions that affect the implementation. If two interpretations would produce different behavior, illustrate the difference and clarify the intended outcome. If a simpler approach would work, explain its tradeoffs.
2. **Choose the simplest implementation.** Build what the current acceptance criteria require. Introduce a shared interface, configuration option, or dependency when a concrete use case justifies it. Before submitting, simplify branches that existing logic already covers.
3. **Make focused changes.** Each edit should serve the task and follow local naming, structure, and formatting. Remove imports, variables, and functions your change makes obsolete. Record unrelated issues for a separate change.
4. **Work toward verifiable outcomes.** Express the goal as observable behavior, such as “a quote request with zero weight returns a validation error.” Reproduce a bug before fixing it. For a refactor, run the same tests before and after. Pair each step of a multi-step task with a check, act on the results, and report what you verified and what remains open.

## Knowledge
Please refer to the [knowledge base](docs/knowledge/_INDEX.md) for additional information.

## Reference
UI design please refer to [shadcn/ui](https://ui.shadcn.com/docs): components live in
`frontend/src/components/ui/` and tokens in `frontend/src/index.css` (`@theme`). Do not add a
second UI library.
UI 设计参考（Release 2 原型）：`ui-design-reference/screenshots/`。对齐任何页面前先逐屏查看
目标截图；原型中的演示数据、按钮和模拟结果不替代故事验收标准。

## Git workflow

- Land every change through a pull request; direct pushes to `main` are blocked by `.githooks/pre-push`.
- Do not merge `main` into a change branch just to stay current. Merge the pull request instead; GitHub resolves the base at merge time.
- Each clone runs `bash scripts/setup-dev.sh` once to enable the hooks.

## Rules pointers

- Authority: `docs/knowledge/rules/` (MECE categories)
- Prefer `@rule:<id>` references; do not paste rule bodies here.
- Host projections are derived copies — authority wins on conflict.
- G1 前跨 change 契约扫描：`@rule:g1-cross-change-scan`；模板 `openspec/templates/cross-change-scan.md`，脚本 `scripts/cross-change-scan.sh`。

