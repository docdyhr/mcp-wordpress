#!/bin/bash
set -euo pipefail

echo "🏥 CI/CD Pipeline Health Check"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check GitHub CLI availability
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI not found. Please install: brew install gh${NC}"
        return 1
    fi
    
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}⚠️ Not authenticated with GitHub CLI. Run: gh auth login${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ GitHub CLI ready${NC}"
    return 0
}

# Function to get recent workflow runs
get_workflow_status() {
    echo -e "\n${BLUE}📊 Recent Workflow Runs${NC}"
    echo "------------------------"
    
    # Get recent runs
    gh run list --limit 10 --json status,conclusion,name,headBranch,createdAt,databaseId \
        | jq -r '.[] | "\(.name): \(.conclusion // .status) (\(.headBranch)) - \(.createdAt)"' \
        | while read -r line; do
            if [[ $line == *"success"* ]]; then
                echo -e "${GREEN}✅ $line${NC}"
            elif [[ $line == *"failure"* ]]; then
                echo -e "${RED}❌ $line${NC}"
            elif [[ $line == *"in_progress"* ]] || [[ $line == *"queued"* ]]; then
                echo -e "${YELLOW}🔄 $line${NC}"
            else
                echo -e "$line"
            fi
        done
}

# Function to check for failing workflows
check_failing_workflows() {
    echo -e "\n${BLUE}🔍 Checking for Failing Workflows${NC}"
    echo "-----------------------------------"
    
    local failures
    failures=$(gh run list --status failure --limit 5 --json name,conclusion,headBranch,databaseId)
    
    if [[ $(echo "$failures" | jq '. | length') -eq 0 ]]; then
        echo -e "${GREEN}✅ No recent failures found${NC}"
        return 0
    fi
    
    echo -e "${RED}❌ Recent failures detected:${NC}"
    echo "$failures" | jq -r '.[] | "  • \(.name) on \(.headBranch) (ID: \(.databaseId))"'
    
    # Get details of the most recent failure
    local latest_failure_id
    latest_failure_id=$(echo "$failures" | jq -r '.[0].databaseId')
    
    if [[ -n "$latest_failure_id" ]]; then
        echo -e "\n${BLUE}🔍 Latest Failure Details (ID: $latest_failure_id)${NC}"
        gh run view "$latest_failure_id" --log-failed | head -20
    fi
    
    return 1
}

# Function to check workflow performance
check_performance() {
    echo -e "\n${BLUE}⚡ Workflow Performance Analysis${NC}"
    echo "--------------------------------"
    
    # Get timing data for recent successful runs
    local timing_data
    timing_data=$(gh run list --status success --limit 10 --json name,createdAt,updatedAt \
        | jq -r '.[] | "\(.name),\(.createdAt),\(.updatedAt)"')
    
    if [[ -n "$timing_data" ]]; then
        echo "Recent successful run durations:"
        echo "$timing_data" | while IFS=',' read -r name created updated; do
            local duration
            duration=$(node -e "
                const start = new Date('$created');
                const end = new Date('$updated');
                const diff = Math.round((end - start) / 1000 / 60 * 10) / 10;
                console.log(diff);
            ")
            
            if (( $(echo "$duration > 15" | bc -l) )); then
                echo -e "  ${RED}⚠️ $name: ${duration}m (slow)${NC}"
            elif (( $(echo "$duration > 10" | bc -l) )); then
                echo -e "  ${YELLOW}⚠️ $name: ${duration}m${NC}"
            else
                echo -e "  ${GREEN}✅ $name: ${duration}m${NC}"
            fi
        done
    fi
}

# Function to check repository health
check_repo_health() {
    echo -e "\n${BLUE}🔍 Repository Health Check${NC}"
    echo "---------------------------"
    
    # Check for large files
    echo "Checking for large files..."
    large_files=$(find . -type f -size +5M 2>/dev/null | grep -v ".git" | head -5)
    if [[ -n "$large_files" ]]; then
        echo -e "${YELLOW}⚠️ Large files detected:${NC}"
        echo "$large_files" | while read -r file; do
            size=$(du -h "$file" | cut -f1)
            echo "  • $file ($size)"
        done
    else
        echo -e "${GREEN}✅ No large files found${NC}"
    fi
    
    # Check node_modules size
    if [[ -d "node_modules" ]]; then
        local node_modules_size
        node_modules_size=$(du -sh node_modules 2>/dev/null | cut -f1)
        echo "Node modules size: $node_modules_size"
    fi
    
    # Check for untracked files
    local untracked_count
    untracked_count=$(git status --porcelain | wc -l)
    if [[ $untracked_count -gt 0 ]]; then
        echo -e "${YELLOW}⚠️ $untracked_count untracked/modified files${NC}"
    else
        echo -e "${GREEN}✅ Working directory clean${NC}"
    fi
}

# Function to provide recommendations
provide_recommendations() {
    echo -e "\n${BLUE}💡 Optimization Recommendations${NC}"
    echo "--------------------------------"
    
    # Check for optimization opportunities
    if [[ -f ".github/workflows/ci.yml" ]]; then
        if ! grep -q "cache:" ".github/workflows/ci.yml"; then
            echo -e "${YELLOW}📦 Consider adding dependency caching to workflows${NC}"
        fi
        
        if ! grep -q "concurrency:" ".github/workflows/ci.yml"; then
            echo -e "${YELLOW}⚡ Consider adding concurrency controls to cancel outdated runs${NC}"
        fi
    fi
    
    # Check for pre-commit hooks
    if [[ ! -f ".pre-commit-config.yaml" ]]; then
        echo -e "${YELLOW}🪝 Consider adding pre-commit hooks for faster feedback${NC}"
    fi
    
    # Check package.json scripts
    if [[ -f "package.json" ]]; then
        if ! jq -r '.scripts | keys[]' package.json | grep -q "lint:fix"; then
            echo -e "${YELLOW}🔧 Consider adding lint:fix script for automated fixing${NC}"
        fi
    fi
    
    echo -e "\n${GREEN}🚀 Use the optimized workflow for better performance:${NC}"
    echo "   .github/workflows/ci-optimized.yml"
}

# Function to auto-fix common issues
auto_fix_issues() {
    echo -e "\n${BLUE}🔧 Auto-fix Available Issues${NC}"
    echo "-----------------------------"
    
    if [[ -x ".github/scripts/fix-common-issues.sh" ]]; then
        echo -e "${GREEN}🤖 Running automated fix script...${NC}"
        .github/scripts/fix-common-issues.sh
    else
        echo -e "${YELLOW}⚠️ Auto-fix script not found or not executable${NC}"
        echo "   Make it executable: chmod +x .github/scripts/fix-common-issues.sh"
    fi
}

# Main execution
main() {
    local exit_code=0
    
    echo -e "${BLUE}🚀 Starting CI/CD Pipeline Health Check...${NC}"
    echo "Timestamp: $(date)"
    echo "Repository: $(git remote get-url origin 2>/dev/null || echo 'N/A')"
    echo "Branch: $(git branch --show-current)"
    echo ""
    
    # Check prerequisites
    if ! check_gh_cli; then
        exit_code=1
    fi
    
    # Run health checks
    get_workflow_status || exit_code=1
    check_failing_workflows || exit_code=1
    check_performance
    check_repo_health
    provide_recommendations
    
    # Offer auto-fix
    if [[ $exit_code -ne 0 ]]; then
        echo -e "\n${YELLOW}🔧 Issues detected. Would you like to run auto-fix? (y/n)${NC}"
        read -r response
        if [[ "$response" == "y" || "$response" == "Y" ]]; then
            auto_fix_issues
        fi
    fi
    
    # Final status
    echo -e "\n${BLUE}📋 Health Check Summary${NC}"
    echo "========================"
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ Pipeline is healthy!${NC}"
        echo -e "${GREEN}🎉 All systems operational${NC}"
    else
        echo -e "${RED}❌ Issues detected in pipeline${NC}"
        echo -e "${YELLOW}💡 Review the recommendations above${NC}"
    fi
    
    return $exit_code
}

# Handle script arguments
case "${1:-}" in
    --auto-fix)
        auto_fix_issues
        ;;
    --check-only)
        check_gh_cli && get_workflow_status && check_failing_workflows
        ;;
    *)
        main "$@"
        ;;
esac