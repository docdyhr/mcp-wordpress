#!/bin/bash

# Branch Protection Setup Script for mcp-wordpress
# This script provides the GitHub CLI commands to set up branch protection

echo "🔒 Setting up branch protection for mcp-wordpress main branch..."

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Please authenticate with GitHub CLI first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Set up branch protection rule
echo "🛡️ Creating branch protection rule for main branch..."

gh api repos/docdyhr/mcp-wordpress/branches/main/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "contexts": [
      "🧪 Test Matrix (typescript)",
      "🧪 Test Matrix (security)", 
      "🧪 Test Matrix (config)",
      "🧹 Code Quality",
      "🔍 Secret Scanning",
      "🛡️ Security Audit",
      "📊 CodeQL Analysis",
      "🔍 Dependency Review"
    ]
  }' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": false
  }' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field block_creations=false \
  --field required_conversation_resolution=true

if [ $? -eq 0 ]; then
    echo "✅ Branch protection rule created successfully!"
else
    echo "❌ Failed to create branch protection rule"
    echo "📝 You can also set this up manually in GitHub:"
    echo "   1. Go to: https://github.com/docdyhr/mcp-wordpress/settings/branches"
    echo "   2. Click 'Add rule'"
    echo "   3. Use the settings described in the README"
    exit 1
fi

echo ""
echo "🔧 Additional manual steps required:"
echo "1. Go to Settings → Branches in your GitHub repo"
echo "2. Edit the main branch rule"
echo "3. Add path-based restrictions:"
echo "   - Restrict creation of files matching: *.env*, **/secrets/**, **/*key*"
echo "4. Consider enabling 'Require signed commits' for additional security"
echo ""
echo "✅ Branch protection setup complete!"
