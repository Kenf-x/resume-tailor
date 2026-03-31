#!/usr/bin/env bash
# Run in Terminal on YOUR machine (Cursor terminal or Terminal.app).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Project: $ROOT"

if [[ ! -d .git ]]; then
  echo "ERROR: No .git here."
  exit 1
fi

# Use main branch
git branch -M main 2>/dev/null || true

[[ -f .env ]] && echo "==> .env exists — it stays local (not committed)."

git add -A
git reset -- .env 2>/dev/null || true

if git diff --cached --quiet; then
  echo "==> Staging area empty after add (nothing new to commit, or only .env changed)."
else
  git commit -m "feat: Resume Tailor — uploads, master merge, job tailoring, exports"
  echo "==> Committed."
fi

if ! command -v gh &>/dev/null; then
  echo ""
  echo "ERROR: GitHub CLI (gh) not found."
  echo "  Install:  brew install gh"
  echo "  Then:     gh auth login"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo ""
  echo "ERROR: Not logged into GitHub. Run:  gh auth login"
  exit 1
fi

REPO_NAME="${GITHUB_REPO_NAME:-resume-tailor}"
USER_LOGIN="$(gh api user -q .login)"
echo "==> GitHub user: $USER_LOGIN"
echo "==> Repo name:   $REPO_NAME"

if git remote get-url origin &>/dev/null; then
  echo "==> Remote origin exists. Pushing..."
  git push -u origin main
  echo "==> Done: $(git remote get-url origin)"
  exit 0
fi

# Remote repo might already exist (e.g. created on github.com) without local origin
if gh repo view "$USER_LOGIN/$REPO_NAME" &>/dev/null; then
  echo "==> Repo $USER_LOGIN/$REPO_NAME already exists on GitHub. Adding origin and pushing..."
  git remote add origin "https://github.com/$USER_LOGIN/$REPO_NAME.git"
  git push -u origin main
  echo "==> Done: https://github.com/$USER_LOGIN/$REPO_NAME"
  exit 0
fi

echo "==> Creating repo and pushing (public)..."
if gh repo create "$REPO_NAME" --public --source=. --remote=origin --push; then
  echo "==> Done: https://github.com/$USER_LOGIN/$REPO_NAME"
  exit 0
fi

echo ""
echo "=== gh repo create failed. Try one of these: ==="
echo ""
echo "A) Use a different name (if 'resume-tailor' is taken):"
echo "     GITHUB_REPO_NAME=resume-tailor-$(whoami) ./scripts/push-to-github.sh"
echo ""
echo "B) Create an empty repo on https://github.com/new (name it, no README), then:"
echo "     git remote add origin https://github.com/$USER_LOGIN/YOUR_REPO_NAME.git"
echo "     git push -u origin main"
echo ""
exit 1
