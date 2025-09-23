#!/bin/bash

# Script to close resolved Docker publishing verification issues
# Run this after Docker images have been successfully published

set -e

echo "🔧 Docker Verification Issue Resolver"
echo "===================================="

# Issue numbers from our search
ISSUE_NUMBERS=(11 10 9 8)

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    echo "   Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Please run: gh auth login"
    exit 1
fi

echo ""
echo "📋 This script will close the following publishing verification issues:"
for issue in "${ISSUE_NUMBERS[@]}"; do
    echo "   - Issue #$issue"
done

echo ""
echo "⚠️  Only run this after verifying that Docker images have been published!"
echo ""
read -p "Have all Docker images been successfully published? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please ensure Docker images are published first"
    exit 1
fi

# Close each issue with a resolution comment
for issue in "${ISSUE_NUMBERS[@]}"; do
    echo ""
    echo "📝 Closing issue #$issue..."

    # Add a comment explaining the resolution
    COMMENT="🎉 **Issue Resolved**

The Docker images have been manually published and are now available on Docker Hub.

**Resolution:**
- Fixed the husky pre-push hook interference in the semantic-release workflow by adding \`HUSKY: 0\` environment variable
- Removed invalid \`record: true\` parameter from Docker build action
- Manually triggered Docker builds for all affected versions

**Verification:**
- Docker images are now available at: https://hub.docker.com/r/docdyhr/mcp-wordpress/tags
- Future releases should publish automatically without this issue

This issue is now closed."

    # Add comment and close the issue
    if gh issue comment "$issue" \
        -R docdyhr/mcp-wordpress \
        --body "$COMMENT"; then

        # Close the issue
        if gh issue close "$issue" \
            -R docdyhr/mcp-wordpress \
            -r completed; then
            echo "   ✅ Successfully closed issue #$issue"
        else
            echo "   ❌ Failed to close issue #$issue"
        fi
    else
        echo "   ❌ Failed to comment on issue #$issue"
    fi

    # Small delay to avoid rate limiting
    sleep 1
done

echo ""
echo "✅ All verification issues have been processed!"
echo ""
echo "📊 Summary:"
echo "- Fixed the root cause in .github/workflows/release.yml"
echo "- Docker images should now publish automatically for future releases"
echo "- Monitor future releases at: https://github.com/docdyhr/mcp-wordpress/actions"
