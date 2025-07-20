#!/bin/bash

# Quick fix script for Docker Hub publishing failures
# This script helps resolve specific publishing issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🔧 Docker Hub Publishing Fix Utility"
echo "====================================="
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed or not in PATH"
    print_error "Please install it: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub CLI"
    print_error "Please run: gh auth login"
    exit 1
fi

# Function to check Docker Hub status
check_docker_status() {
    local version="$1"
    print_status "Checking Docker Hub status for version $version..."
    
    local response=$(curl -s "https://hub.docker.com/v2/repositories/docdyhr/mcp-wordpress/tags" 2>/dev/null || echo '{"results":[]}')
    
    if echo "$response" | jq -e ".results[]? | select(.name == \"$version\" or .name == \"v$version\")" > /dev/null 2>&1; then
        local found_tag=$(echo "$response" | jq -r ".results[]? | select(.name == \"$version\" or .name == \"v$version\") | .name" | head -1)
        local last_updated=$(echo "$response" | jq -r ".results[]? | select(.name == \"$version\" or .name == \"v$version\") | .last_updated" | head -1)
        print_success "Version $version exists on Docker Hub as: $found_tag"
        echo "Last updated: $last_updated"
        return 0
    else
        print_warning "Version $version NOT found on Docker Hub"
        return 1
    fi
}

# Function to trigger manual republish
trigger_republish() {
    local version="$1"
    print_status "Triggering manual republish for version $version..."
    
    if gh workflow run manual-docker-republish.yml -f version="$version" -f platforms="linux/amd64,linux/arm64"; then
        print_success "Manual republish workflow triggered successfully"
        print_status "Monitor progress at: https://github.com/docdyhr/mcp-wordpress/actions/workflows/manual-docker-republish.yml"
        
        # Wait a moment and show the latest run
        sleep 2
        print_status "Latest workflow runs:"
        gh run list --workflow=manual-docker-republish.yml --limit=3
    else
        print_error "Failed to trigger manual republish workflow"
        return 1
    fi
}

# Function to verify publishing after fix
verify_fix() {
    local version="$1"
    print_status "Verifying fix for version $version..."
    
    if gh workflow run verify-release.yml -f version="$version"; then
        print_success "Verification workflow triggered"
        print_status "Monitor verification at: https://github.com/docdyhr/mcp-wordpress/actions/workflows/verify-release.yml"
    else
        print_warning "Failed to trigger verification workflow, but you can check manually"
    fi
}

# Main logic
case "${1:-help}" in
    "fix-2.0.4")
        print_status "🚨 Fixing specific issue: v2.0.4 Docker Hub publishing failure"
        echo ""
        
        if check_docker_status "2.0.4"; then
            print_warning "Version 2.0.4 already exists on Docker Hub"
            print_status "The issue may have been resolved already"
        else
            print_status "Confirmed: v2.0.4 is missing from Docker Hub"
            print_status "Triggering manual republish..."
            echo ""
            
            if trigger_republish "2.0.4"; then
                echo ""
                print_status "Waiting 60 seconds for workflow to start..."
                sleep 60
                
                echo ""
                print_status "Re-checking Docker Hub status..."
                if check_docker_status "2.0.4"; then
                    print_success "🎉 Issue resolved! v2.0.4 is now available on Docker Hub"
                else
                    print_warning "Docker Hub not updated yet - workflow may still be running"
                    print_status "Check workflow progress and try again in a few minutes"
                fi
            fi
        fi
        ;;
        
    "check")
        version="${2:-2.0.4}"
        check_docker_status "$version"
        ;;
        
    "republish")
        version="${2}"
        if [ -z "$version" ]; then
            print_error "Usage: $0 republish <version>"
            exit 1
        fi
        trigger_republish "$version"
        ;;
        
    "verify")
        version="${2:-2.0.4}"
        verify_fix "$version"
        ;;
        
    "status")
        print_status "Checking status of recent versions..."
        echo ""
        
        versions=("2.0.4" "2.1.0" "2.2.0" "2.3.0")
        for version in "${versions[@]}"; do
            printf "%-8s: " "v$version"
            if check_docker_status "$version" 2>/dev/null; then
                echo ""
            else
                echo ""
            fi
        done
        ;;
        
    "help"|*)
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  fix-2.0.4     Fix the specific v2.0.4 Docker Hub issue"
        echo "  check [ver]   Check if version exists on Docker Hub (default: 2.0.4)"
        echo "  republish ver Trigger manual republish for version"
        echo "  verify [ver]  Trigger verification workflow (default: 2.0.4)"
        echo "  status        Check status of recent versions"
        echo "  help          Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 fix-2.0.4"
        echo "  $0 check 2.1.0"
        echo "  $0 republish 2.0.4"
        echo "  $0 status"
        ;;
esac