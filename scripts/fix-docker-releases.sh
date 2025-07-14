#!/bin/bash

# Script to manually trigger Docker builds for failed releases
# This helps recover from publishing verification failures

set -e

echo "🐳 Docker Release Fix Script"
echo "=========================="

# Array of failed versions from the GitHub issues
FAILED_VERSIONS=("v1.4.0" "v1.5.0" "v1.5.1" "v1.5.2")

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
echo "📋 Found ${#FAILED_VERSIONS[@]} failed versions to process:"
for version in "${FAILED_VERSIONS[@]}"; do
    echo "   - $version"
done

echo ""
echo "🚀 This script will trigger Docker builds for each failed version."
echo "   Each build will create multi-architecture images (amd64, arm64)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

# Process each failed version
for version in "${FAILED_VERSIONS[@]}"; do
    echo ""
    echo "🏗️  Processing $version..."
    
    # Trigger the manual Docker publish workflow
    echo "   📤 Triggering Docker build workflow..."
    if gh workflow run docker-publish.yml \
        -R docdyhr/mcp-wordpress \
        -f tag="$version" \
        -f push=true; then
        echo "   ✅ Successfully triggered build for $version"
    else
        echo "   ❌ Failed to trigger build for $version"
        exit 1
    fi
    
    # Small delay between triggers to avoid rate limiting
    sleep 2
done

echo ""
echo "✅ All Docker builds have been triggered!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor the workflow runs at:"
echo "   https://github.com/docdyhr/mcp-wordpress/actions/workflows/docker-publish.yml"
echo ""
echo "2. After all builds complete, check Docker Hub:"
echo "   https://hub.docker.com/r/docdyhr/mcp-wordpress/tags"
echo ""
echo "3. The publishing verification issues should automatically close"
echo "   once the Docker images are detected on the next verification run"