#!/bin/bash
set -e

echo "🧪 Quick WordPress setup for contract testing (simplified approach)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cleanup function
cleanup() {
    echo -e "\n🧹 Cleaning up..."
    docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo -e "${YELLOW}🐳 Starting containers...${NC}"
docker-compose -f docker-compose.test.yml up -d

echo -e "${YELLOW}⏳ Waiting for WordPress to be ready (this may take 2-3 minutes)...${NC}"
sleep 60

# Test WordPress is responding
echo -e "${YELLOW}🔍 Testing WordPress response...${NC}"
if curl -s http://localhost:8081/ | grep -q "WordPress"; then
    echo -e "${GREEN}✅ WordPress is responding${NC}"
else
    echo -e "${RED}❌ WordPress not responding${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Manual WordPress Setup Instructions:${NC}"
echo "1. Visit: http://localhost:8081"
echo "2. Complete WordPress installation:"
echo "   - Site Title: Contract Test Site"
echo "   - Username: testuser"
echo "   - Password: test-password-123"
echo "   - Email: test@example.com"
echo "3. After installation, create an Application Password:"
echo "   - Go to Users → Profile"
echo "   - Scroll to 'Application Passwords'"
echo "   - Create new password named 'Contract Testing'"
echo ""
echo -e "${YELLOW}📖 Then run contract tests with:${NC}"
echo "export WORDPRESS_TEST_URL=\"http://localhost:8081\""
echo "export WORDPRESS_USERNAME=\"testuser\""
echo "export WORDPRESS_APP_PASSWORD=\"your-generated-app-password\""
echo "export PACT_LIVE_TESTING=\"true\""
echo "npm run test:contracts"

# Keep containers running
echo ""
echo -e "${GREEN}Containers are running. Press Ctrl+C to stop and cleanup.${NC}"
while true; do
    sleep 10
done
