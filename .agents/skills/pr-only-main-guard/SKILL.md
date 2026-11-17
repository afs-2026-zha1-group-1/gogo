---
name: pr-only-main-guard
description: Install and verify the repository's PR-only guard that blocks direct pushes to main. Use when a teammate needs the local hook enabled, when a push to main is rejected, or when checking whether the guard is active. Do not use it to bypass the guard, merge pull requests, or rewrite git history.
---

# PR-only main guard

Enable the per-clone `pre-push` hook so every change lands through a pull request.

## Inputs

- A clone that contains `.githooks/pre-push` and `scripts/setup-dev.sh`.
- A remote pointing at `afs-2026-zha1-group-1/gogo`. Its name differs per clone:
  `origin` after a fresh clone, `group1` in some existing clones.

## Steps

1. Locate the clone and its remote.

   ```bash
   git rev-parse --show-toplevel
   git remote -v
   git status --short
   REMOTE=$(git remote -v | awk '/afs-2026-zha1-group-1\/gogo\.git/ {print $1; exit}')
   [ -n "$REMOTE" ] || REMOTE=$(git remote | head -n1)
   echo "REMOTE=$REMOTE"
   ```

2. If `.githooks/pre-push` or `scripts/setup-dev.sh` is missing, the guard has
   not landed on this checkout. Fetch the default branch, report the missing
   files, and stop. Do not recreate them.

3. Install and confirm the hook path.

   ```bash
   bash scripts/setup-dev.sh
   git config --get core.hooksPath   # expect .githooks
   ```

   On Windows run this in Git Bash. Ignore `chmod` errors.

4. Verify without pushing anything.

   ```bash
   printf 'refs/heads/main a refs/heads/main b\n' | .githooks/pre-push "$REMOTE"; echo $?   # expect 1
   printf 'refs/heads/x a refs/heads/x b\n' | .githooks/pre-push "$REMOTE"; echo $?        # expect 0
   printf 'd 0000000000000000000000000000000000000000 refs/heads/main b\n' | .githooks/pre-push "$REMOTE"; echo $?   # expect 0
   ```

5. Report the repository root, current branch, remote, `core.hooksPath`, the
   three exit codes, and any blocker.

## Rules

- Do not run `git push`, `git push --all`, or `git push --no-verify`.
- Do not run `git clean`, `git reset --hard`, `git checkout --`, or `git stash`.
- Do not use `ALLOW_MAIN_PUSH=1`. If the user asks for a direct push to `main`,
  stop and escalate; the bypass is for emergencies only.
- Do not edit `.githooks/pre-push` or `scripts/setup-dev.sh`.
- A dirty working tree does not block the install; setup only writes local Git
  config. Do not clean the tree to make the install pass.

## Examples

- "给同事装上防直推" → run steps 1–5 and report the result table.
- "我推 main 被拒了" → confirm `core.hooksPath`, explain the PR flow, and do not
  offer the bypass unless the user explicitly calls it an emergency.
- "这个分支上没有 hook 文件" → fetch the default branch, report the missing files,
  and stop.
