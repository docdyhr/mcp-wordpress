#!/bin/bash
set -e

echo "🧪 Testing WordPress setup for contract testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n🧹 Cleaning up test environment..."
    docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

echo -e "${BLUE}📋 Setup Testing${NC}"
echo "=================================="
echo "This will test the WordPress setup without running full contract tests"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if ports are available
if netstat -ln | grep :8081 >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 8081 is already in use. Please free the port and try again.${NC}"
    exit 1
fi

echo -e "${YELLOW}🐳 Starting test containers...${NC}"
docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true

# Start the services
docker-compose -f docker-compose.test.yml up -d db-test

echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
timeout=60
counter=0
while ! docker-compose -f docker-compose.test.yml exec -T db-test mysqladmin ping -h localhost --silent; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Database failed to start within $timeout seconds${NC}"
        exit 1
    fi
    echo -n "."
done
echo -e "\n${GREEN}✅ Database is ready${NC}"

# Start WordPress
echo -e "${YELLOW}🌐 Starting WordPress...${NC}"
docker-compose -f docker-compose.test.yml up -d wordpress-test

echo -e "${YELLOW}⏳ Waiting for WordPress to be ready...${NC}"
timeout=120
counter=0
while ! curl -s http://localhost:8081/wp-json/wp/v2/ >/dev/null 2>&1; do
    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ WordPress failed to start within $timeout seconds${NC}"
        docker-compose -f docker-compose.test.yml logs wordpress-test
        exit 1
    fi
    echo -n "."
done
echo -e "\n${GREEN}✅ WordPress is ready${NC}"

# Test WordPress is responding
echo -e "${YELLOW}🔍 Testing WordPress is responding...${NC}"
if curl -s http://localhost:8081/ | grep -q "WordPress"; then
    echo -e "${GREEN}✅ WordPress is responding${NC}"
else
    echo -e "${RED}❌ WordPress not responding${NC}"
    curl -s http://localhost:8081/ || true
    exit 1
fi

# Run WordPress setup
echo -e "${YELLOW}⚙️  Configuring WordPress for testing...${NC}"
docker-compose -f docker-compose.test.yml run --rm wp-cli

# Verify setup completed
echo -e "${YELLOW}🔍 Verifying WordPress configuration...${NC}"
if docker-compose -f docker-compose.test.yml exec -T wordpress-test test -f /var/www/html/test-config.json; then
    CONFIG=$(docker-compose -f docker-compose.test.yml exec -T wordpress-test cat /var/www/html/test-config.json)
    echo -e "${GREEN}✅ Test configuration ready${NC}"
    echo "$CONFIG" | jq '.' 2>/dev/null || echo "$CONFIG"

    # Test authentication
    APP_PASSWORD=$(echo "$CONFIG" | jq -r '.app_password' 2>/dev/null || echo "")
    if [ -n "$APP_PASSWORD" ] && [ "$APP_PASSWORD" != "null" ]; then
        echo -e "${GREEN}✅ App password generated successfully${NC}"

        # Test API with authentication
        echo -e "${YELLOW}🔐 Testing authenticated API access...${NC}"
        AUTH_HEADER="Authorization: Basic $(echo -n "testuser:$APP_PASSWORD" | base64)"
        if curl -s -H "$AUTH_HEADER" http://localhost:8081/wp-json/wp/v2/posts | grep -q '\[\]' || curl -s -H "$AUTH_HEADER" http://localhost:8081/wp-json/wp/v2/posts | grep -q '"id"'; then
            echo -e "${GREEN}✅ Authenticated API access working${NC}"
        else
            echo -e "${RED}❌ Authenticated API access failed${NC}"
            curl -s -H "$AUTH_HEADER" http://localhost:8081/wp-json/wp/v2/posts || true
        fi
    else
        echo -e "${RED}❌ Failed to get app password from configuration${NC}"
    fi
else
    echo -e "${RED}❌ Test configuration not found${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 WordPress setup test completed successfully!${NC}"
echo -e "${BLUE}📊 Setup Summary${NC}"
echo "=================================="
echo "WordPress URL: http://localhost:8081"
echo "Admin Panel: http://localhost:8081/wp-admin"
echo "REST API: http://localhost:8081/wp-json/wp/v2/"
echo "Username: testuser"
echo "Password: test-password-123"
echo ""
echo "The setup is ready for contract testing!"

exit 0
