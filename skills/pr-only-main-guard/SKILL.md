---
name: pr-only-main-guard
description: Guard any push that targets main. Use before a user or agent runs git push to main, pushes with --all, or asks to commit directly to main; route the change through a branch and pull request instead. Also installs and verifies the local pre-push hook. Do not use it to bypass the guard, force-push, or rewrite history.
---

# PR-only main guard

Keep `main` reachable only through pull requests, at two levels:

- This skill: when the agent is asked to push or commit to `main`, stop and
  redirect the work to a branch plus a pull request.
- The repository hook: `.githooks/pre-push` rejects a direct push to `main`
  on every clone that ran `scripts/setup-dev.sh`.

## Push to main

Trigger this branch of the skill when the request contains `git push` and the
destination is `main`, `git push --all`, or wording such as "push to main",
"直接提交到 main", "推 main".

1. Do not run the push.
2. Inspect the repository:

   ```bash
   git branch --show-current
   git status --short
   git log --oneline group1/main..HEAD 2>/dev/null || git log --oneline origin/main..HEAD
   ```

3. If there are commits to land, move them to a branch and push that:

   ```bash
   git switch -c <change-id>-<short-slug>
   git push -u <remote> <change-id>-<short-slug>
   ```

   Then open a pull request into `main`. Opening or merging the PR is a separate
   action: do it only when the user asked for it.

4. If the user calls it an emergency and explicitly asks for a direct push, use
   `ALLOW_MAIN_PUSH=1 git push ...` only in that turn. Never add the variable on
   your own initiative.

5. If the hook rejects the push, report that the guard is working. Do not retry
   with `--no-verify`, `--force`, or a different ref.

## Install and verify

Use this when a teammate needs the hook enabled or asks whether the guard is active.

### Inputs

- A clone that contains `.githooks/pre-push` and `scripts/setup-dev.sh`.
- A remote pointing at `afs-2026-zha1-group-1/gogo`. Its name differs per clone:
  `origin` after a fresh clone, `group1` in some existing clones.

### Steps

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
