#!/bin/bash

echo "🔍 WordPress Debug Information"
echo "=============================="

echo "1. Testing direct connection to WordPress..."
echo "Response headers:"
curl -I http://localhost:8081/ 2>/dev/null || echo "Connection failed"

echo ""
echo "2. Testing with redirect following..."
echo "Response content (first 500 chars):"
curl -s -L http://localhost:8081/ 2>/dev/null | head -c 500 || echo "Connection failed"

echo ""
echo "3. Testing WordPress admin install page..."
echo "Install page content (first 500 chars):"
curl -s -L http://localhost:8081/wp-admin/install.php 2>/dev/null | head -c 500 || echo "Connection failed"

echo ""
echo "4. Testing REST API endpoint..."
echo "REST API response:"
curl -s http://localhost:8081/wp-json/wp/v2/ 2>/dev/null | head -c 200 || echo "Connection failed"

echo ""
echo "5. Container status:"
docker ps --filter "name=wordpress-test-instance" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"