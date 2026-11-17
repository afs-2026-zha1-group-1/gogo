#!/usr/bin/env bash
# One-time per clone: point Git at the repository hooks.
# Run: bash scripts/setup-dev.sh
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

git config core.hooksPath .githooks
chmod +x .githooks/pre-push 2>/dev/null || true

echo "core.hooksPath = $(git config --get core.hooksPath)"
echo "hooks enabled: .githooks/pre-push blocks direct pushes to main"
echo "workflow: push a branch, open a pull request, merge there"
