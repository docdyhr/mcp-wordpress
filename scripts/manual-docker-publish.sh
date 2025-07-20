#!/bin/bash

# Script to manually publish missing Docker image for v2.2.0
# This addresses the immediate issue while the improved workflows prevent future occurrences

set -e

VERSION="2.2.0"
REGISTRY="docker.io"
IMAGE_NAME="docdyhr/mcp-wordpress"

echo "🔧 Manual Docker Publishing Script for v${VERSION}"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    echo "❌ Error: This script must be run from the mcp-wordpress repository root"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if the tag exists in git
if ! git tag -l | grep -q "^v${VERSION}$"; then
    echo "❌ Error: Git tag v${VERSION} does not exist"
    echo "Available tags:"
    git tag -l | tail -10
    exit 1
fi

echo "✅ Validation passed"
echo ""

# Checkout the specific version
echo "📥 Checking out version v${VERSION}..."
git checkout "v${VERSION}"

# Build the Docker image
echo "🏗️ Building Docker image for v${VERSION}..."
docker build \
    --build-arg VERSION="${VERSION}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse HEAD)" \
    -t "${REGISTRY}/${IMAGE_NAME}:${VERSION}" \
    -t "${REGISTRY}/${IMAGE_NAME}:v${VERSION}" \
    .

echo "✅ Docker image built successfully"

# Check if user wants to push (for safety)
read -p "🚀 Push image to Docker Hub? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔐 Please ensure you're logged in to Docker Hub (docker login)"
    read -p "Continue with push? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Pushing Docker image..."
        docker push "${REGISTRY}/${IMAGE_NAME}:${VERSION}"
        docker push "${REGISTRY}/${IMAGE_NAME}:v${VERSION}"
        
        echo "✅ Docker image pushed successfully!"
        echo ""
        echo "🔗 Verify at: https://hub.docker.com/r/${IMAGE_NAME}/tags?name=${VERSION}"
    else
        echo "⏭️ Push cancelled"
    fi
else
    echo "⏭️ Push skipped"
fi

# Return to original branch
echo "🔄 Returning to original branch..."
git checkout -

echo ""
echo "🎉 Manual publishing script completed!"
echo "📋 Summary:"
echo "   - Version: v${VERSION}"
echo "   - Image built: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo "   - Image built: ${REGISTRY}/${IMAGE_NAME}:v${VERSION}"
echo ""
echo "💡 Note: The improved workflows should prevent this issue in future releases."