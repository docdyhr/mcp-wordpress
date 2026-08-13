#!/bin/bash

# Test Release Workflow Script
# This script tests the release workflow components locally

set -e

echo "🧪 Testing Release Workflow Components"
echo "======================================"

# Test 1: Check semantic release configuration
echo "1. Testing semantic release configuration..."
if [ -f "release.config.js" ]; then
    echo "✅ release.config.js found"
    npm run release:dry
    echo "✅ Semantic release dry run completed"
else
    echo "❌ release.config.js not found"
    exit 1
fi

# Test 2: Check build process
echo "2. Testing build process..."
export HUSKY=0
npm run build
echo "✅ Build completed"

# Test 3: Check package creation
echo "3. Testing package creation..."
npm pack --dry-run
echo "✅ Package creation test completed"

# Test 4: Check ignore files
echo "4. Testing ignore files..."
npm run check:ignore
echo "✅ Ignore files check completed"

# Test 5: Check TypeScript and linting
echo "5. Testing TypeScript and linting..."
npm run typecheck
npm run lint
echo "✅ TypeScript and linting completed"

# Test 6: Test Docker build (if Docker is available)
if command -v docker &> /dev/null; then
    echo "6. Testing Docker build..."
    docker build -t mcp-wordpress-test .
    echo "✅ Docker build completed"
    # Clean up
    docker rmi mcp-wordpress-test
else
    echo "6. Docker not available, skipping Docker build test"
fi

echo ""
echo "🎉 All release workflow tests passed!"
echo "The release workflow is ready for production use."
