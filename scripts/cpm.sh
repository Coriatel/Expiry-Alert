#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: scripts/cpm.sh \"commit message\""
  exit 1
fi

repo="$(git rev-parse --show-toplevel)"
cd "$repo"

branch="$(git rev-parse --abbrev-ref HEAD)"
msg="$*"

# If nothing is staged, stage tracked changes but skip dependency lockfiles.
if git diff --cached --quiet; then
  git add -u -- \
    ':!package-lock.json' \
    ':!**/package-lock.json' \
    ':!**/yarn.lock' \
    ':!**/pnpm-lock.yaml' \
    ':!**/bun.lockb' \
    ':!**/npm-shrinkwrap.json'
fi

if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 1
fi

git commit -m "$msg"

git push origin "$branch"

if [ "$branch" = "main" ]; then
  git push origin main
  exit 0
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  git worktree remove "$tmp_dir" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

git fetch origin main

git worktree add -f "$tmp_dir" main
(
  cd "$tmp_dir"
  git merge --ff-only "$branch"
  git push origin main
)
