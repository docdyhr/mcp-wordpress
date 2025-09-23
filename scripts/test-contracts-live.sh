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
while true; do
    # Follow redirects to get the actual content
    response=$(curl -s -L http://localhost:8081/ 2>/dev/null || echo "")

    # Check if WordPress is responding with installation page or working site
    if [[ "$response" == *"WordPress"* ]] && ([[ "$response" == *"install"* ]] || [[ "$response" == *"Welcome"* ]] || [[ "$response" == *"configuration"* ]]); then
        echo -e "\n${GREEN}✅ WordPress installation page is ready${NC}"
        break
    elif [[ "$response" == *"WordPress"* ]]; then
        echo -e "\n${GREEN}✅ WordPress is responding${NC}"
        break
    fi

    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge $timeout ]; then
        echo -e "\n${RED}❌ WordPress failed to start within $timeout seconds${NC}"
        echo -e "\n${YELLOW}🔍 Running debug analysis...${NC}"
        bash scripts/debug-wordpress.sh
        echo -e "\n${YELLOW}📋 Container logs:${NC}"
        docker-compose -f docker-compose.test.yml logs --tail=20 wordpress-test
        exit 1
    fi
    echo -n "."
done

# Install WordPress - try WP-CLI first, then web interface
echo -e "${YELLOW}⚙️  Installing WordPress...${NC}"
if bash scripts/wordpress-cli-install.sh; then
    echo -e "${GREEN}✅ WordPress installation completed via WP-CLI${NC}"
elif bash scripts/wordpress-web-install.sh; then
    echo -e "${GREEN}✅ WordPress installation completed via web interface${NC}"
else
    echo -e "${RED}❌ WordPress installation failed with both methods${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    docker-compose -f docker-compose.test.yml logs wordpress-test
    echo -e "${YELLOW}📋 Try accessing WordPress manually at: http://localhost:8081${NC}"
    exit 1
fi

# Set up proper authentication for contract testing
echo -e "${YELLOW}📋 Setting up WordPress authentication for contract testing...${NC}"
if bash scripts/setup-wordpress-for-testing.sh; then
    echo -e "${GREEN}✅ WordPress authentication setup completed${NC}"

    # Source the generated credentials
    if [[ -f /tmp/wordpress-test-credentials.sh ]]; then
        source /tmp/wordpress-test-credentials.sh
        echo "Using application password: ${WORDPRESS_APP_PASSWORD:0:10}..."
    fi
else
    echo -e "${RED}❌ WordPress authentication setup failed${NC}"
    exit 1
fi

# Set environment variables for contract tests
export WORDPRESS_TEST_URL="http://localhost:8081"
export WORDPRESS_USERNAME="testuser"
export WORDPRESS_AUTH_METHOD="app-password"
export PACT_LIVE_TESTING="true"

echo -e "${GREEN}🧪 Running contract tests against live WordPress...${NC}"
echo "Test URL: $WORDPRESS_TEST_URL"
echo "Username: $WORDPRESS_USERNAME"
echo "Auth Method: $WORDPRESS_AUTH_METHOD"
echo ""

# Run the contract tests
npm run build
NODE_OPTIONS="--experimental-vm-modules" jest tests/contracts/wordpress-api-live.test.js --config=jest.typescript.config.json --verbose

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
