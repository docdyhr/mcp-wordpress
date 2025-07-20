#!/bin/bash

# Bulk Docker Publishing Recovery Script
# Fixes multiple missing Docker Hub versions discovered during investigation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() { echo -e "${CYAN}==== $1 ====${NC}"; }
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Missing versions identified during investigation
MISSING_VERSIONS=("2.0.4" "2.1.0" "2.2.0" "2.3.0")

print_header "Bulk Docker Hub Recovery for MCP WordPress"
echo ""
print_status "This script will recover multiple missing Docker Hub versions"
print_status "Missing versions: ${MISSING_VERSIONS[*]}"
echo ""

# Check prerequisites
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is required but not installed"
    print_error "Install from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub CLI"
    print_error "Run: gh auth login"
    exit 1
fi

# Function to check version status
check_version_status() {
    local version="$1"
    local response=$(curl -s "https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags" 2>/dev/null || echo '{"results":[]}')
    
    if echo "$response" | jq -e ".results[]? | select(.name == \"$version\" or .name == \"v$version\")" > /dev/null 2>&1; then
        return 0  # Found
    else
        return 1  # Not found
    fi
}

# Function to trigger republish
trigger_republish() {
    local version="$1"
    print_status "Triggering republish for v$version..."
    
    if gh workflow run manual-docker-republish.yml -f version="$version" -f platforms="linux/amd64,linux/arm64"; then
        print_success "Workflow triggered for v$version"
        return 0
    else
        print_error "Failed to trigger workflow for v$version"
        return 1
    fi
}

# Function to wait for workflow completion
wait_for_workflow() {
    local timeout=300  # 5 minutes
    local elapsed=0
    
    print_status "Waiting for workflow completion (timeout: ${timeout}s)..."
    
    while [ $elapsed -lt $timeout ]; do
        # Check latest workflow run
        local status=$(gh run list --workflow=manual-docker-republish.yml --limit=1 --json status --jq '.[0].status' 2>/dev/null || echo "unknown")
        
        case "$status" in
            "completed")
                print_success "Workflow completed"
                return 0
                ;;
            "in_progress"|"queued")
                printf "."
                sleep 10
                elapsed=$((elapsed + 10))
                ;;
            "failed")
                print_error "Workflow failed"
                return 1
                ;;
            *)
                printf "?"
                sleep 5
                elapsed=$((elapsed + 5))
                ;;
        esac
    done
    
    echo ""
    print_warning "Workflow timeout - check status manually"
    return 1
}

# Main recovery process
print_header "Phase 1: Current Status Check"
echo ""

declare -a missing_list=()
declare -a present_list=()

for version in "${MISSING_VERSIONS[@]}"; do
    printf "Checking v%-6s: " "$version"
    if check_version_status "$version"; then
        echo -e "${GREEN}✅ Present${NC}"
        present_list+=("$version")
    else
        echo -e "${RED}❌ Missing${NC}"
        missing_list+=("$version")
    fi
done

echo ""
if [ ${#missing_list[@]} -eq 0 ]; then
    print_success "🎉 All versions are already present on Docker Hub!"
    print_status "No recovery needed"
    exit 0
fi

print_status "Summary:"
print_status "- Present: ${#present_list[@]} versions"
print_error "- Missing: ${#missing_list[@]} versions"
echo ""

# Confirmation
read -p "Proceed with recovery for ${#missing_list[@]} missing versions? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Recovery cancelled by user"
    exit 0
fi

print_header "Phase 2: Bulk Recovery Process"
echo ""

success_count=0
failure_count=0
declare -a failed_versions=()

for version in "${missing_list[@]}"; do
    print_header "Processing v$version"
    
    if trigger_republish "$version"; then
        print_status "Waiting 30 seconds before next workflow..."
        sleep 30
        
        # Quick check if it appeared
        if check_version_status "$version"; then
            print_success "v$version confirmed on Docker Hub"
            ((success_count++))
        else
            print_warning "v$version workflow triggered but not yet visible"
            # Don't count as failure yet - might be propagating
        fi
    else
        print_error "Failed to trigger workflow for v$version"
        failed_versions+=("$version")
        ((failure_count++))
    fi
    
    echo ""
done

print_header "Phase 3: Final Verification"
echo ""

print_status "Waiting 60 seconds for final propagation..."
sleep 60

final_missing=()
final_present=()

for version in "${missing_list[@]}"; do
    printf "Final check v%-6s: " "$version"
    if check_version_status "$version"; then
        echo -e "${GREEN}✅ Success${NC}"
        final_present+=("$version")
    else
        echo -e "${RED}❌ Still missing${NC}"
        final_missing+=("$version")
    fi
done

echo ""
print_header "Recovery Results"
echo ""

print_success "✅ Successfully recovered: ${#final_present[@]} versions"
if [ ${#final_present[@]} -gt 0 ]; then
    print_status "Recovered versions: ${final_present[*]}"
fi

if [ ${#final_missing[@]} -gt 0 ]; then
    print_error "❌ Still missing: ${#final_missing[@]} versions"
    print_error "Missing versions: ${final_missing[*]}"
    echo ""
    print_status "For remaining failures, try:"
    for version in "${final_missing[@]}"; do
        echo "  gh workflow run manual-docker-republish.yml -f version=$version"
    done
    echo ""
    print_status "Or check workflow logs: https://github.com/docdyhr/mcp-wordpress/actions"
else
    print_success "🎉 All versions successfully recovered!"
fi

echo ""
print_status "View results: https://hub.docker.com/r/docdyhr/mcp-wordpress/tags"
print_status "Monitor workflows: https://github.com/docdyhr/mcp-wordpress/actions"

# Exit with appropriate code
if [ ${#final_missing[@]} -eq 0 ]; then
    exit 0
else
    exit 1
fi