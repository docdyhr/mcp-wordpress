#!/bin/bash

# Manual Docker Publishing Script for Missing Versions
# This script allows manual publishing of specific versions to Docker Hub

set -e

# Configuration
IMAGE_NAME="docdyhr/mcp-wordpress"
PLATFORMS="linux/amd64,linux/arm64"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    echo "Usage: $0 <version> [platforms]"
    echo ""
    echo "Arguments:"
    echo "  version     Version to publish (e.g., 2.0.4)"
    echo "  platforms   Target platforms (default: linux/amd64,linux/arm64)"
    echo ""
    echo "Examples:"
    echo "  $0 2.0.4"
    echo "  $0 2.0.4 linux/amd64"
    echo ""
    echo "Environment variables required:"
    echo "  DOCKER_USERNAME - Docker Hub username"
    echo "  DOCKER_PASSWORD - Docker Hub password/token"
    exit 1
}

# Validate arguments
if [ $# -lt 1 ]; then
    print_error "Missing required arguments"
    usage
fi

VERSION="$1"
if [ $# -gt 1 ]; then
    PLATFORMS="$2"
fi

# Validate environment variables
if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
    print_error "Docker credentials not found in environment variables"
    print_error "Please set DOCKER_USERNAME and DOCKER_PASSWORD"
    exit 1
fi

# Validate version format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    print_error "Invalid version format: $VERSION"
    print_error "Expected format: x.y.z (e.g., 2.0.4)"
    exit 1
fi

# Check if git tag exists
if ! git tag -l | grep -q "^v${VERSION}$"; then
    print_error "Git tag v${VERSION} does not exist"
    print_error "Available tags:"
    git tag -l | grep -E '^v[0-9]' | sort -V | tail -10
    exit 1
fi

print_status "Manual Docker publishing for version $VERSION"
print_status "Target platforms: $PLATFORMS"
print_status "Image: $IMAGE_NAME"

# Checkout the specific version
print_status "Checking out version v$VERSION..."
git checkout "v${VERSION}"

# Set up Docker Buildx
print_status "Setting up Docker Buildx..."
docker buildx create --use --name mcp-wordpress-builder 2>/dev/null || docker buildx use mcp-wordpress-builder

# Login to Docker Hub
print_status "Logging in to Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

# Build and push Docker image
print_status "Building and pushing Docker image..."

# Create tags
TAGS=(
    "${IMAGE_NAME}:${VERSION}"
    "${IMAGE_NAME}:v${VERSION}"
)

# Build tag arguments
TAG_ARGS=""
for tag in "${TAGS[@]}"; do
    TAG_ARGS="$TAG_ARGS --tag $tag"
done

# Build and push
docker buildx build \
    --platform "$PLATFORMS" \
    --push \
    $TAG_ARGS \
    --build-arg VERSION="$VERSION" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse HEAD)" \
    --label "org.opencontainers.image.version=$VERSION" \
    --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
    .

# Verify the push
print_status "Verifying Docker Hub publishing..."
sleep 10  # Wait for propagation

# Check if version exists on Docker Hub
RESPONSE=$(curl -s "https://hub.docker.com/v2/repositories/${IMAGE_NAME}/tags")
if echo "$RESPONSE" | jq -e ".results[] | select(.name == \"$VERSION\" or .name == \"v$VERSION\")" > /dev/null 2>&1; then
    print_success "✅ Version $VERSION successfully published to Docker Hub"

    # Show published tags
    echo ""
    print_status "Published tags:"
    for tag in "${TAGS[@]}"; do
        echo "  - $tag"
    done

    # Show Docker Hub URL
    echo ""
    print_status "Docker Hub URL: https://hub.docker.com/r/${IMAGE_NAME}/tags?name=${VERSION}"
else
    print_warning "⚠️  Version verification failed - the image may still be propagating"
    print_status "Check manually: https://hub.docker.com/r/${IMAGE_NAME}/tags"
fi

# Cleanup
print_status "Cleaning up..."
docker buildx rm mcp-wordpress-builder 2>/dev/null || true

# Return to original branch
git checkout main 2>/dev/null || git checkout master 2>/dev/null || true

print_success "Manual Docker publishing completed!"
