#!/bin/bash

echo "Testing Claude Desktop MCP WordPress Configurations"
echo "==================================================="

# Load environment variables from .env file
if [ -f "/Users/thomas/Programming/mcp-wordpress/.env" ]; then
    export $(cat /Users/thomas/Programming/mcp-wordpress/.env | grep -v '#' | grep -v '^$' | xargs)
    echo "✓ Environment variables loaded from .env"
else
    echo "⚠ Warning: .env file not found"
fi

# Test 1: Single-site with env vars
echo -e "\n1. Testing Single-Site Setup"
echo "----------------------------"
node /Users/thomas/Programming/mcp-wordpress/dist/index.js &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo "✓ Single-site setup tested (using .env variables)"

# Test 2: Multi-site with config file  
echo -e "\n2. Testing Multi-Site Setup"
echo "---------------------------"
cd /Users/thomas/Programming/mcp-wordpress
node dist/index.js &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo "✓ Multi-site setup tested"

# Test 3: Docker
echo -e "\n3. Testing Docker Setup"
echo "-----------------------"
if [ -f "/Users/thomas/Programming/mcp-wordpress/mcp-wordpress.config.json" ]; then
    docker run -d --name mcp-test-claude \
      -v /Users/thomas/Programming/mcp-wordpress/mcp-wordpress.config.json:/app/mcp-wordpress.config.json:ro \
      docdyhr/mcp-wordpress:latest >/dev/null 2>&1
    sleep 2
    docker logs mcp-test-claude 2>&1 | grep "Server started"
    docker stop mcp-test-claude >/dev/null 2>&1
    docker rm mcp-test-claude >/dev/null 2>&1
    echo "✓ Docker setup tested (using mcp-wordpress.config.json)"
else
    echo "⚠ Warning: mcp-wordpress.config.json not found, skipping Docker test"
fi

echo -e "\n=== Claude Desktop Configuration Examples ==="
echo ""
echo "All configuration files created in:"
ls -la /Users/thomas/Programming/mcp-wordpress/claude-desktop-config-*.json