#!/bin/bash

# Test Pre-Push Hook Script
# This script simulates the pre-push hook without actually pushing to git
# Use this to test if your changes will pass the pre-push checks

set -e

echo "🧪 Testing pre-push hook locally..."
echo "======================================"

# Change to the project root directory
cd "$(dirname "$0")/.."

# Check if we're in a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   The pre-push hook will run on the current working directory"
    echo "   Consider committing your changes first for accurate testing"
    echo ""
fi

# Source the pre-push hook
HOOK_FILE=".husky/pre-push"

if [ ! -f "$HOOK_FILE" ]; then
    echo "❌ Error: Pre-push hook not found at $HOOK_FILE"
    exit 1
fi

echo "📋 Found pre-push hook, executing checks..."
echo ""

# Execute the pre-push hook
if bash "$HOOK_FILE"; then
    echo ""
    echo "🎉 Pre-push hook test completed successfully!"
    echo "   Your changes should pass the actual pre-push checks"
    echo "   You can now safely push to the repository"
else
    echo ""
    echo "❌ Pre-push hook test failed!"
    echo "   Please fix the issues before attempting to push"
    echo "   Common fixes:"
    echo "   - Run 'npm run lint:fix' to fix linting issues"
    echo "   - Run 'npm run format' to fix formatting issues"
    echo "   - Fix any failing tests"
    echo "   - Address security vulnerabilities with 'npm audit fix'"
    exit 1
fi
