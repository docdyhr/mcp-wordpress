#!/bin/bash

echo "🔍 Testing WordPress REST API Response"
echo "====================================="

echo "1. REST API root response:"
response=$(curl -s http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "ERROR")
echo "Response length: ${#response} characters"
echo "First 500 characters:"
echo "$response" | head -c 500
echo ""
echo ""

echo "2. Checking for common keywords:"
if [[ "$response" == *"namespace"* ]]; then
    echo "✅ Contains 'namespace'"
else
    echo "❌ Does NOT contain 'namespace'"
fi

if [[ "$response" == *"routes"* ]]; then
    echo "✅ Contains 'routes'"
else
    echo "❌ Does NOT contain 'routes'"
fi

if [[ "$response" == *"authentication"* ]]; then
    echo "✅ Contains 'authentication'"
else
    echo "❌ Does NOT contain 'authentication'"
fi

if [[ "$response" == *"posts"* ]]; then
    echo "✅ Contains 'posts'"
else
    echo "❌ Does NOT contain 'posts'"
fi

echo ""
echo "3. HTTP status check:"
status=$(curl -s -w "%{http_code}" http://localhost:8081/wp-json/wp/v2/ -o /dev/null 2>/dev/null || echo "000")
echo "HTTP Status: $status"

if [[ "$status" == "200" ]]; then
    echo "✅ API is responding with 200 OK"
else
    echo "❌ API is not responding with 200 OK"
fi
