# Harness scripts

Bootstrap creates **placeholder** shells below. In this teaching baseline,
`kb-lint.sh` is an explicit, non-blocking no-op: it prints `SKIP` and exits 0.
It does **not** validate the knowledge base or regenerate `docs/knowledge/_INDEX.md`.
P5 may record `KB update: Skipped (not configured)` under this documented
baseline policy, but must not report KB lint or index refresh as Passed.
The other placeholders still ask for customization and exit nonzero.

| Script | Role |
|---|---|
| `init.sh` | Environment / “start of day” setup |
| `kb-lint.sh` | KB consistency + compile `docs/knowledge/_INDEX.md` |
| `verify-links.sh` | Bidirectional link checks |
| `archive-change.sh` | Archive helper (e.g. wrap OpenSpec archive + KB checks) |
| `setup-dev.sh` | One-time per clone: enable `.githooks/pre-push` |
| `sync-main.sh` | Optional main-sync lock + merge (see below) |

## setup-dev.sh

`bash scripts/setup-dev.sh` sets `core.hooksPath=.githooks`. The hook rejects
direct pushes to `main`, so every change lands through a pull request. It is a
local guard: `--no-verify` skips it, and it does not replace server-side
protection (unavailable on the current private free plan).

## sync-main.sh

Advisory lock built on a throwaway ref. The first `acquire` pushes
`refs/locks/main-sync`; concurrent writers are rejected by the server as
non-fast-forward, so the push itself is the mutex. It serializes who syncs
`main`, it does not prevent conflicts between branches.

```bash
scripts/sync-main.sh status
scripts/sync-main.sh sync      # acquire + fetch + merge origin/main
# push your branch, then:
scripts/sync-main.sh release
```

`sync` keeps the lock when the merge conflicts, so resolve and release
manually. Use `acquire --steal` only when the previous holder is gone.
Overrides: `REMOTE` (default `group1`), `MAIN_BRANCH`, `LOCK_REF`, `TTL_MINUTES`.
Set `LOCK_REF=refs/heads/merge-lock` if the server rejects custom refs; the
lock then shows up as a branch.

Do not invent a second Spec authority tree from these scripts. Re-running
`/sdd:bootstrap` will not overwrite non-empty shells (including customized
implementations).
