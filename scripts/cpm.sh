#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: scripts/cpm.sh \"commit message\""
  exit 1
fi

repo="$(git rev-parse --show-toplevel)"
cd "$repo"

branch="$(git rev-parse --abbrev-ref HEAD)"
default_branch="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
if [ -z "$default_branch" ]; then
  default_branch="main"
fi
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

if [ "$branch" = "$default_branch" ]; then
  git push origin "$default_branch"
  exit 0
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  git worktree remove "$tmp_dir" >/dev/null 2>&1 || true
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

git fetch origin "$default_branch"

if git show-ref --verify --quiet "refs/heads/$default_branch"; then
  git worktree add "$tmp_dir" "$default_branch"
else
  git worktree add -b "$default_branch" "$tmp_dir" "origin/$default_branch"
fi
(
  cd "$tmp_dir"
  git merge --ff-only "$branch"
  git push origin "$default_branch"
)
