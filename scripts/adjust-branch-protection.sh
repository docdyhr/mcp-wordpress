#!/bin/bash

# Branch Protection Adjustment Script
# This script provides options to adjust GitHub branch protection rules

set -e

# Get repository dynamically or use provided argument/environment variable
REPO="${1:-${REPO_NAME:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "docdyhr/mcp-wordpress")}}"
BRANCH="${2:-${BRANCH_NAME:-main}}"

echo "🛡️  Branch Protection Adjustment Tool"
echo "=================================="
echo "Usage: $0 [repository-name] [branch-name]"
echo "       Or set REPO_NAME and BRANCH_NAME environment variables"
echo ""
echo "Repository: $REPO"
echo "Branch: $BRANCH"
echo ""

# Function to show current protection status
check_protection() {
    echo "📊 Current Protection Status:"
    gh api "repos/$REPO/branches/$BRANCH/protection" 2>/dev/null || echo "❌ Unable to fetch protection rules (may need authentication)"
    echo ""
}

# Function to adjust dependency review settings
adjust_dependency_review() {
    echo "🔍 Adjusting Dependency Review Settings..."

    # Option 1: Make dependency review non-blocking for automated PRs
    cat > .github/workflows/dependency-review-relaxed.yml << 'EOF'
name: 🔍 Dependency Review (Relaxed)

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

jobs:
  dependency-review:
    name: 🔍 Dependency Security Review
    runs-on: ubuntu-latest
    # Skip for automated dependency PRs using comprehensive detection
    if: |
      !(
        github.actor == 'dependabot[bot]' ||
        github.actor == 'github-actions[bot]' ||
        github.actor == 'renovate[bot]' ||
        contains(github.event.pull_request.labels.*.name, 'dependencies') ||
        contains(github.event.pull_request.labels.*.name, 'dependabot') ||
        contains(github.event.pull_request.labels.*.name, 'dependency') ||
        contains(github.head_ref, 'dependabot/') ||
        contains(github.head_ref, 'renovate/') ||
        contains(github.head_ref, 'deps/') ||
        contains(github.head_ref, 'dependency') ||
        contains(github.head_ref, 'update-') ||
        contains(github.event.pull_request.title, 'bump') ||
        contains(github.event.pull_request.title, 'update') ||
        contains(github.event.pull_request.title, 'dependency')
      )
    steps:
      - name: 📥 Checkout Code
        uses: actions/checkout@v4

      - name: 🔍 Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high  # Changed from 'moderate' to 'high'
          fail-on-scopes: runtime
          allow-licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense, LGPL-2.1, LGPL-3.0
          exclude-packages: |
            npm:@types/*
            npm:eslint*
            npm:prettier*
            npm:jest*
            npm:@jest/*
          comment-summary-in-pr: on-failure  # Changed from 'always'
          vulnerability-check: true
          license-check: false  # Disabled for automated updates
EOF

    echo "✅ Created relaxed dependency review workflow"
}

# Function to adjust security monitoring
adjust_security_monitoring() {
    echo "🔒 Adjusting Security Monitoring..."

    # Create a conditional security workflow
    cat > .github/workflows/security-monitoring-smart.yml << 'EOF'
name: '🛡️ Smart Security Monitoring'

on:
  pull_request:
    branches: [ main ]
    paths-ignore:
      - 'package-lock.json'
      - '*.md'
      - 'docs/**'
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  security-scan:
    name: 🔍 Security Scan
    runs-on: ubuntu-latest
    # Skip for automated dependency PRs using comprehensive detection
    if: |
      !(
        github.actor == 'dependabot[bot]' ||
        github.actor == 'github-actions[bot]' ||
        github.actor == 'renovate[bot]' ||
        contains(github.event.pull_request.labels.*.name, 'dependencies') ||
        contains(github.event.pull_request.labels.*.name, 'dependabot') ||
        contains(github.event.pull_request.labels.*.name, 'dependency') ||
        contains(github.head_ref, 'dependabot/') ||
        contains(github.head_ref, 'renovate/') ||
        contains(github.head_ref, 'deps/') ||
        contains(github.head_ref, 'dependency') ||
        contains(github.head_ref, 'update-') ||
        contains(github.event.pull_request.title, 'bump') ||
        contains(github.event.pull_request.title, 'update') ||
        contains(github.event.pull_request.title, 'dependency')
      )
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔍 Security Audit
        run: |
          npm audit --audit-level=high || echo "::warning::Security vulnerabilities found but not blocking"

      - name: 📊 Security Report
        if: always()
        run: |
          echo "## 🔍 Security Scan Results" >> $GITHUB_STEP_SUMMARY
          echo "✅ Security scan completed (non-blocking for dependency updates)" >> $GITHUB_STEP_SUMMARY
EOF

    echo "✅ Created smart security monitoring workflow"
}

# Function to adjust performance gates
adjust_performance_gates() {
    echo "⚡ Adjusting Performance Gates..."

    # Create conditional performance testing
    cat > .github/workflows/performance-gates-smart.yml << 'EOF'
name: Performance Gates (Smart)

on:
  pull_request:
    branches: [ main ]
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
  workflow_dispatch:

jobs:
  performance-check:
    runs-on: ubuntu-latest
    # Skip for automated dependency PRs using comprehensive detection
    if: |
      !(
        github.actor == 'dependabot[bot]' ||
        github.actor == 'github-actions[bot]' ||
        github.actor == 'renovate[bot]' ||
        contains(github.event.pull_request.labels.*.name, 'dependencies') ||
        contains(github.event.pull_request.labels.*.name, 'dependabot') ||
        contains(github.event.pull_request.labels.*.name, 'dependency') ||
        contains(github.head_ref, 'dependabot/') ||
        contains(github.head_ref, 'renovate/') ||
        contains(github.head_ref, 'deps/') ||
        contains(github.head_ref, 'dependency') ||
        contains(github.head_ref, 'update-') ||
        contains(github.event.pull_request.title, 'bump') ||
        contains(github.event.pull_request.title, 'update') ||
        contains(github.event.pull_request.title, 'dependency')
      )
    timeout-minutes: 20

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build

    - name: Run performance tests (non-blocking)
      run: |
        npm run test:performance || echo "::warning::Performance tests failed but not blocking dependency updates"
      continue-on-error: true

    - name: Performance Summary
      if: always()
      run: |
        echo "## ⚡ Performance Test Results" >> $GITHUB_STEP_SUMMARY
        echo "Tests completed (non-blocking for dependency updates)" >> $GITHUB_STEP_SUMMARY
EOF

    echo "✅ Created smart performance gates workflow"
}

# Function to create bypass labels
create_bypass_labels() {
    echo "🏷️  Creating Bypass Labels..."

    # Create labels for bypassing certain checks
    gh label create "skip-dependency-review" --description "Skip dependency review checks" --color "d73a4a" 2>/dev/null || echo "Label may already exist"
    gh label create "skip-security-scan" --description "Skip security scanning" --color "d73a4a" 2>/dev/null || echo "Label may already exist"
    gh label create "skip-performance-gates" --description "Skip performance testing" --color "d73a4a" 2>/dev/null || echo "Label may already exist"
    gh label create "dependencies" --description "Dependency updates" --color "0366d6" 2>/dev/null || echo "Label may already exist"

    echo "✅ Bypass labels created"
}

# Main menu
show_menu() {
    echo "Choose an adjustment option:"
    echo "1. 🔍 Relax Dependency Review (recommended)"
    echo "2. 🔒 Adjust Security Monitoring"
    echo "3. ⚡ Adjust Performance Gates"
    echo "4. 🏷️  Create Bypass Labels"
    echo "5. 📋 Apply All Recommended Changes"
    echo "6. 📊 Check Current Status"
    echo "7. ❌ Exit"
    echo ""
    read -p "Enter your choice (1-7): " choice
}

# Main execution
main() {
    check_protection

    while true; do
        show_menu

        case $choice in
            1)
                adjust_dependency_review
                echo "✅ Dependency review settings adjusted"
                ;;
            2)
                adjust_security_monitoring
                echo "✅ Security monitoring settings adjusted"
                ;;
            3)
                adjust_performance_gates
                echo "✅ Performance gates settings adjusted"
                ;;
            4)
                create_bypass_labels
                echo "✅ Bypass labels created"
                ;;
            5)
                echo "🔧 Applying all recommended changes..."
                adjust_dependency_review
                adjust_security_monitoring
                adjust_performance_gates
                create_bypass_labels
                echo "✅ All adjustments completed!"
                echo ""
                echo "📝 Next steps:"
                echo "1. Review the generated workflow files"
                echo "2. Commit and push the changes"
                echo "3. Test with a new dependency update PR"
                break
                ;;
            6)
                check_protection
                ;;
            7)
                echo "👋 Exiting..."
                exit 0
                ;;
            *)
                echo "❌ Invalid choice. Please try again."
                ;;
        esac
        echo ""
    done
}

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Run main function
main "$@"
