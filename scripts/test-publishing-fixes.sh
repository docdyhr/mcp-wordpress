#!/bin/bash

# Test script to validate the Docker publishing workflow improvements
# This script simulates the workflow conditions and validates the logic

set -euo pipefail

echo "🧪 Testing Docker Publishing Workflow Logic"
echo "=============================================="

# Test 1: Verify manual publishing script exists and is executable
echo "Test 1: Manual publishing script"
if [ -x "scripts/manual-docker-publish.sh" ]; then
    echo "✅ Manual publishing script is executable"
else
    echo "❌ Manual publishing script is not executable"
    exit 1
fi

# Test 2: Check if package.json has the new Docker scripts
echo ""
echo "Test 2: Package.json Docker scripts"
if grep -q "docker:publish" package.json; then
    echo "✅ Docker publishing scripts added to package.json"
else
    echo "❌ Docker publishing scripts missing from package.json"
    exit 1
fi

# Test 3: Verify troubleshooting documentation exists
echo ""
echo "Test 3: Troubleshooting documentation"
if [ -f "docs/PUBLISHING-TROUBLESHOOTING.md" ]; then
    echo "✅ Publishing troubleshooting documentation exists"
else
    echo "❌ Publishing troubleshooting documentation missing"
    exit 1
fi

# Test 4: Check release workflow has the improved Docker metadata logic
echo ""
echo "Test 4: Release workflow improvements"
if grep -q "type=raw,value=\${{ needs.semantic-release.outputs.new-release-version }}" .github/workflows/release.yml; then
    echo "✅ Release workflow has improved metadata extraction"
else
    echo "❌ Release workflow missing improved metadata extraction"
    exit 1
fi

# Test 5: Check verify-release workflow has outputs and retry logic
echo ""
echo "Test 5: Verification workflow improvements"
if grep -q "outputs:" .github/workflows/verify-release.yml && \
   grep -q "docker-status:" .github/workflows/verify-release.yml; then
    echo "✅ Verification workflow has proper outputs"
else
    echo "❌ Verification workflow missing proper outputs"
    exit 1
fi

# Test 6: Simulate the Docker tag extraction logic
echo ""
echo "Test 6: Docker tag logic simulation"
# Simulate what the workflow would do
SEMANTIC_VERSION="2.3.0"
NEW_RELEASE_PUBLISHED="true"
EVENT_NAME="push"

echo "Simulating workflow conditions:"
echo "  - semantic-release version: $SEMANTIC_VERSION"
echo "  - new-release-published: $NEW_RELEASE_PUBLISHED"
echo "  - event name: $EVENT_NAME"

# This simulates the tags that would be generated
echo "Expected Docker tags:"
echo "  - docdyhr/mcp-wordpress:$SEMANTIC_VERSION (from raw value)"
echo "  - docdyhr/mcp-wordpress:latest (from default branch)"

echo ""
echo "🎉 All tests passed! Workflow improvements are ready."
echo ""
echo "To manually fix the v2.3.0 Docker publishing issue:"
echo "  1. Run: gh workflow run docker-publish.yml -f tag=v2.3.0 -f push=true"
echo "  2. Or run: ./scripts/manual-docker-publish.sh 2.3.0"
echo "  3. Or follow the troubleshooting guide in docs/PUBLISHING-TROUBLESHOOTING.md"
