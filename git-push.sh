#!/bin/bash
# Quick script to commit and push changes to GitHub

echo "📋 Checking for changes..."
git status

echo ""
echo "➕ Adding all changes..."
git add -A

echo ""
read -p "💬 Enter commit message: " commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update code"
fi

echo ""
echo "✍️  Creating commit..."
git commit -m "$commit_message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Done! Check your repo at: https://github.com/GiacomoRicciuto/google-calendar-mcp"
