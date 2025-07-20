#!/bin/bash

# Manual Docker Publishing Script
# Use this script to manually publish Docker images when the automated workflow fails

set -euo pipefail

VERSION=${1:-$(node -p "require('./package.json').version")}
REGISTRY=${REGISTRY:-docker.io}
IMAGE_NAME=${IMAGE_NAME:-docdyhr/mcp-wordpress}

echo "🐳 Manual Docker Publishing Script"
echo "=================================="
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME"
echo ""

# Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Verify Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if user is logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo "⚠️ Warning: Not logged in to Docker Hub. Please run: docker login"
    echo "You can also set DOCKER_USERNAME and DOCKER_PASSWORD environment variables"
    exit 1
fi

echo "🏗️ Building Docker image..."

# Build the image with proper tags
docker build \
    --platform linux/amd64,linux/arm64 \
    --tag "${REGISTRY}/${IMAGE_NAME}:${VERSION}" \
    --tag "${REGISTRY}/${IMAGE_NAME}:latest" \
    --build-arg VERSION="${VERSION}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse HEAD)" \
    --push \
    .

echo ""
echo "✅ Docker image published successfully!"
echo "Tags created:"
echo "  - ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo "  - ${REGISTRY}/${IMAGE_NAME}:latest"
echo ""
echo "🔍 Verify the publication:"
echo "  docker pull ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo "  https://hub.docker.com/r/${IMAGE_NAME}/tags"