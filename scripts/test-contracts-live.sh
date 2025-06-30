#!/bin/bash
set -e

echo "🧪 Starting automated contract testing with live WordPress..."

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
    docker network rm wordpress-test-network 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

echo -e "${BLUE}📋 Contract Testing Setup${NC}"
echo "=================================="
echo "This will:"
echo "1. Start isolated WordPress + MySQL containers (ports 8081, no conflicts)"
echo "2. Auto-configure WordPress with test data"
echo "3. Run contract tests against live WordPress"
echo "4. Clean up automatically when done"
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

# Install WordPress via web interface
echo -e "${YELLOW}⚙️  Installing WordPress via web interface...${NC}"
if bash scripts/wordpress-web-install.sh; then
    echo -e "${GREEN}✅ WordPress installation completed${NC}"
else
    echo -e "${RED}❌ WordPress web installation failed${NC}"
    docker-compose -f docker-compose.test.yml logs wordpress-test
    exit 1
fi

# For the web install approach, we use default credentials
echo -e "${YELLOW}📋 Setting up test credentials...${NC}"
APP_PASSWORD="test-password-123"  # Use the admin password for now
echo -e "${GREEN}✅ Using default test credentials${NC}"
echo "URL: http://localhost:8081"
echo "Username: testuser"
echo "Password: test-password-123"

# Set environment variables for contract tests
export WORDPRESS_TEST_URL="http://localhost:8081"
export WORDPRESS_USERNAME="testuser"
export WORDPRESS_APP_PASSWORD="$APP_PASSWORD"
export WORDPRESS_AUTH_METHOD="app-password"
export PACT_LIVE_TESTING="true"

echo -e "${GREEN}🧪 Running contract tests against live WordPress...${NC}"
echo "Test URL: $WORDPRESS_TEST_URL"
echo "Username: $WORDPRESS_USERNAME"
echo "Auth Method: $WORDPRESS_AUTH_METHOD"
echo ""

# Run the contract tests
npm run build
NODE_OPTIONS="--experimental-vm-modules" jest tests/contracts/wordpress-api.pact.test.js --config=jest.typescript.config.json --verbose

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All contract tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some contract tests failed${NC}"
fi

echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================================="
echo "WordPress URL: http://localhost:8081"
echo "Admin Panel: http://localhost:8081/wp-admin"
echo "REST API: http://localhost:8081/wp-json/wp/v2/"
echo "Test completed with exit code: $TEST_EXIT_CODE"

exit $TEST_EXIT_CODE