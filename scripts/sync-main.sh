#!/usr/bin/env bash
# Cooperative main-sync lock.
#
# Git has no lock primitive, so this uses a throwaway ref as a mutex:
# the first push creates refs/locks/main-sync, and the second writer is
# rejected as non-fast-forward. The push is the atomic gate; the local
# pre-check only produces a friendlier message.
#
# This is advisory. Anyone with push access can force-overwrite the ref or
# ignore it entirely. It serializes "who is syncing main", it does not
# prevent two branches from touching the same files.
#
# Usage:
#   scripts/sync-main.sh status
#   scripts/sync-main.sh acquire [--steal]
#   scripts/sync-main.sh sync [--steal]      # acquire + fetch + merge
#   scripts/sync-main.sh release
#
# Env overrides: REMOTE (default group1), MAIN_BRANCH (default main),
# LOCK_REF (default refs/locks/main-sync), TTL_MINUTES (default 20).

set -euo pipefail

REMOTE=${REMOTE:-group1}
MAIN_BRANCH=${MAIN_BRANCH:-main}
LOCK_REF=${LOCK_REF:-refs/locks/main-sync}
TTL_MINUTES=${TTL_MINUTES:-20}

usage() {
  sed -n '12,20p' "$0" | sed 's/^# \{0,1\}//'
}

die() {
  echo "error: $*" >&2
  exit 1
}

holder() {
  git ls-remote "$REMOTE" "$LOCK_REF" 2>/dev/null | awk '{print $1}' | head -n1
}

show_lock() {
  local sha
  sha=$(holder)
  [ -n "$sha" ] || return 1
  echo "lock: $REMOTE/$LOCK_REF -> $sha"
  if git fetch --quiet "$REMOTE" "$LOCK_REF" 2>/dev/null; then
    git cat-file -p FETCH_HEAD | sed -n '1,10p'
  fi
  return 0
}

make_lock_sha() {
  local name email tree msg
  name=$(git config user.name || true)
  email=$(git config user.email || true)
  [ -n "$name" ] || name=${USER:-unknown}
  [ -n "$email" ] || email="$name@localhost"
  tree=$(git hash-object -t tree /dev/null)
  msg="main-sync lock by $name <$email> at $(date -u +%Y-%m-%dT%H:%M:%SZ) ttl=${TTL_MINUTES}m nonce=${RANDOM}${RANDOM}"
  GIT_AUTHOR_NAME="$name" GIT_AUTHOR_EMAIL="$email" \
  GIT_COMMITTER_NAME="$name" GIT_COMMITTER_EMAIL="$email" \
    git commit-tree "$tree" -m "$msg"
}

cmd_status() {
  if show_lock; then
    echo
    echo "free it with: $0 release"
    return 0
  fi
  echo "lock is free ($REMOTE/$LOCK_REF)"
}

cmd_acquire() {
  local steal=${1:-}
  local existing lock_sha

  existing=$(holder)
  if [ -n "$existing" ] && [ "$steal" != "--steal" ]; then
    echo "lock already held:" >&2
    show_lock >&2 || true
    echo "wait, or take it over with: $0 acquire --steal (only if the holder is gone)" >&2
    return 1
  fi

  lock_sha=$(make_lock_sha)
  if [ "$steal" = "--steal" ]; then
    git push --force "$REMOTE" "$lock_sha:$LOCK_REF"
  elif ! git push "$REMOTE" "$lock_sha:$LOCK_REF"; then
    echo "lost the race: another writer created the lock first" >&2
    show_lock >&2 || true
    return 1
  fi

  echo "lock acquired: $REMOTE/$LOCK_REF -> $lock_sha"
  echo "release after your push: $0 release"
}

cmd_release() {
  if [ -z "$(holder)" ]; then
    echo "lock already free"
    return 0
  fi
  git push "$REMOTE" ":$LOCK_REF"
  echo "lock released"
}

require_clean_tree() {
  git diff --quiet || die "working tree is dirty; commit or stash before syncing main"
  git diff --cached --quiet || die "index has staged changes; commit before syncing main"
}

cmd_sync() {
  local steal=${1:-}

  require_clean_tree
  cmd_acquire "$steal"

  git fetch "$REMOTE" "$MAIN_BRANCH"
  if ! git merge --no-edit FETCH_HEAD; then
    echo >&2
    echo "merge stopped (conflict or hook failure). Lock is still yours." >&2
    echo "resolve, push your branch, then run: $0 release" >&2
    return 1
  fi

  echo
  echo "merged $REMOTE $MAIN_BRANCH into $(git branch --show-current)."
  echo "push your branch first, then run: $0 release"
}

case "${1:-sync}" in
  status)  cmd_status ;;
  acquire) cmd_acquire "${2:-}" ;;
  release) cmd_release ;;
  sync)    cmd_sync "${2:-}" ;;
  -h|--help|help) usage ;;
  *) usage; exit 2 ;;
esac
