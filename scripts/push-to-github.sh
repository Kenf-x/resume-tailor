#!/usr/bin/env bash
# Run on your Mac in Terminal (full filesystem + GitHub auth).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .git ]]; then
  echo "No .git directory here."
  exit 1
fi

[[ -f .env ]] && echo "Note: .env is gitignored and will not be pushed."

git add -A
git reset -- .env 2>/dev/null || true

if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "feat: Resume Tailor — uploads, master merge, job tailoring, exports"
fi

if ! command -v gh &>/dev/null; then
  echo "Install GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

REPO_NAME="${GITHUB_REPO_NAME:-resume-tailor}"

if git remote get-url origin &>/dev/null; then
  echo "Pushing to existing origin..."
  git push -u origin main
  exit 0
fi

echo "Creating https://github.com/$(gh api user -q .login)/$REPO_NAME ..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
