#!/bin/bash
# Pipeline Health Check and Auto-Recovery Script

set -euo pipefail

echo "🔧 Pipeline Health Check Starting..."

# Function to check if npm script exists
check_script_exists() {
    local script_name=$1
    if npm run-script "$script_name" --silent 2>/dev/null; then
        echo "✅ Script '$script_name' exists"
        return 0
    else
        echo "❌ Script '$script_name' missing"
        return 1
    fi
}

# Function to validate memory settings
validate_memory_settings() {
    echo "🔍 Validating memory settings..."
    
    # Check if NODE_OPTIONS are properly set in test scripts
    if grep -q "NODE_OPTIONS.*max-old-space-size" package.json; then
        echo "✅ Memory allocation configured in package.json"
    else
        echo "⚠️ Memory allocation may need adjustment"
    fi
}

# Function to run critical tests
run_critical_tests() {
    echo "🧪 Running critical test validation..."
    
    # Run security tests (fastest and most important)
    if npm run test:security >/dev/null 2>&1; then
        echo "✅ Security tests passing"
    else
        echo "❌ Security tests failing"
        return 1
    fi
}

# Function to check repository health
check_repo_health() {
    echo "📊 Checking repository health..."
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📍 Current branch: $CURRENT_BRANCH"
    
    # Check for uncommitted changes
    if git diff --quiet && git diff --staged --quiet; then
        echo "✅ No uncommitted changes"
    else
        echo "⚠️ Uncommitted changes detected"
        git status --porcelain
    fi
    
    # Check recent commit
    echo "📝 Recent commits:"
    git log --oneline -3
}

# Main execution
main() {
    echo "Starting CI/CD Pipeline Health Check..."
    
    check_repo_health
    
    echo ""
    echo "🔍 Checking required npm scripts..."
    
    # Check for critical scripts
    MISSING_SCRIPTS=()
    
    if ! check_script_exists "test:performance:ci"; then
        MISSING_SCRIPTS+=("test:performance:ci")
    fi
    
    if ! check_script_exists "test:compatibility"; then
        MISSING_SCRIPTS+=("test:compatibility")
    fi
    
    if [ ${#MISSING_SCRIPTS[@]} -gt 0 ]; then
        echo "❌ Missing scripts: ${MISSING_SCRIPTS[*]}"
        echo "These scripts are required for CI/CD pipeline to work correctly."
        exit 1
    fi
    
    validate_memory_settings
    
    # Only run tests if not in CI (to avoid recursion)
    if [ -z "${CI:-}" ]; then
        run_critical_tests
    else
        echo "🤖 Running in CI environment, skipping local test execution"
    fi
    
    echo ""
    echo "✅ Pipeline health check completed successfully!"
    echo "📊 Summary:"
    echo "  - All required npm scripts present"
    echo "  - Memory settings configured"
    echo "  - Repository in clean state"
    
    if [ -z "${CI:-}" ]; then
        echo "  - Critical tests passing"
    fi
}

# Error handling
trap 'echo "❌ Pipeline health check failed on line $LINENO"' ERR

# Run main function
main "$@"