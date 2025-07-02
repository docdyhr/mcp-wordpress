#!/bin/bash
set -e

echo "🔧 Fixing WordPress REST API POST authentication issues..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if Docker containers are running
check_containers() {
    if ! docker-compose -f docker-compose.test.yml ps | grep -q "wordpress-test.*Up"; then
        echo -e "${YELLOW}⚠️  WordPress test containers are not running${NC}"
        echo "Starting containers for authentication fix..."
        
        # Start the containers
        echo -e "${YELLOW}🐳 Starting WordPress containers...${NC}"
        docker-compose -f docker-compose.test.yml up -d db-test
        
        # Wait for database
        echo -e "${YELLOW}⏳ Waiting for database...${NC}"
        timeout=60
        counter=0
        while ! docker-compose -f docker-compose.test.yml exec -T db-test mysqladmin ping -h localhost --silent; do
            sleep 2
            counter=$((counter + 2))
            if [ $counter -ge $timeout ]; then
                echo -e "${RED}❌ Database failed to start${NC}"
                exit 1
            fi
            echo -n "."
        done
        echo -e "\n${GREEN}✅ Database ready${NC}"
        
        # Start WordPress
        docker-compose -f docker-compose.test.yml up -d wordpress-test
        
        # Wait for WordPress
        echo -e "${YELLOW}⏳ Waiting for WordPress...${NC}"
        timeout=120
        counter=0
        while true; do
            response=$(curl -s -L http://localhost:8081/ 2>/dev/null || echo "")
            if [[ "$response" == *"WordPress"* ]]; then
                echo -e "\n${GREEN}✅ WordPress ready${NC}"
                break
            fi
            sleep 2
            counter=$((counter + 2))
            if [ $counter -ge $timeout ]; then
                echo -e "\n${RED}❌ WordPress failed to start${NC}"
                exit 1
            fi
            echo -n "."
        done
        
        # Quick WordPress setup if needed
        if bash scripts/wordpress-cli-install.sh 2>/dev/null; then
            echo -e "${GREEN}✅ WordPress configured${NC}"
        fi
        
        if bash scripts/setup-wordpress-for-testing.sh 2>/dev/null; then
            echo -e "${GREEN}✅ Authentication configured${NC}"
        fi
    fi
}

# Function to create proper .htaccess file
create_htaccess() {
    echo -e "${YELLOW}📝 Creating proper .htaccess file with REST API authentication fix...${NC}"
    
    cat << 'EOF' > /tmp/wordpress-htaccess
# BEGIN WordPress
RewriteEngine On

# REST API Authorization Header Fix - CRITICAL for application password authentication
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]

# Additional auth header preservation (alternative method)
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

# Standard WordPress permalink rules
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]

# END WordPress
EOF

    # Copy the .htaccess file into the WordPress container
    docker cp /tmp/wordpress-htaccess wordpress-test:/var/www/html/.htaccess
    echo -e "${GREEN}✅ .htaccess file updated with authorization header fix${NC}"
}

# Function to set WordPress environment type to local
set_local_environment() {
    echo -e "${YELLOW}⚙️  Setting WordPress environment type to 'local' for application password support...${NC}"
    
    docker exec wordpress-test bash -c "
        cd /var/www/html &&
        if ! grep -q \"WP_ENVIRONMENT_TYPE\" wp-config.php; then
            # Add the environment type definition before the 'stop editing' line
            sed -i \"/stop editing/i define('WP_ENVIRONMENT_TYPE', 'local');\" wp-config.php &&
            echo 'Added WP_ENVIRONMENT_TYPE to wp-config.php'
        else
            echo 'WP_ENVIRONMENT_TYPE already set in wp-config.php'
        fi
    "
    echo -e "${GREEN}✅ WordPress environment configured for local development${NC}"
}

# Function to fix file permissions
fix_permissions() {
    echo -e "${YELLOW}🔐 Fixing file permissions...${NC}"
    
    docker exec wordpress-test bash -c "
        cd /var/www/html &&
        chown -R www-data:www-data . &&
        chmod -R 755 . &&
        chmod 644 .htaccess
    "
    echo -e "${GREEN}✅ File permissions fixed${NC}"
}

# Function to restart WordPress to apply changes
restart_wordpress() {
    echo -e "${YELLOW}🔄 Restarting WordPress to apply configuration changes...${NC}"
    
    docker-compose -f docker-compose.test.yml restart wordpress-test
    
    # Wait for WordPress to be ready again
    echo -e "${YELLOW}⏳ Waiting for WordPress to restart...${NC}"
    timeout=60
    counter=0
    while true; do
        response=$(curl -s -L http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "")
        if [[ "$response" == *"namespace"* ]] && [[ "$response" == *"wp/v2"* ]]; then
            echo -e "\n${GREEN}✅ WordPress REST API is accessible${NC}"
            break
        fi
        
        sleep 2
        counter=$((counter + 2))
        if [ $counter -ge $timeout ]; then
            echo -e "\n${RED}❌ WordPress failed to restart within $timeout seconds${NC}"
            exit 1
        fi
        echo -n "."
    done
}

# Function to test authentication
test_authentication() {
    echo -e "${YELLOW}🧪 Testing REST API authentication...${NC}"
    
    # Source credentials if available
    if [[ -f /tmp/wordpress-test-credentials.sh ]]; then
        source /tmp/wordpress-test-credentials.sh
        echo "Using credentials: ${WORDPRESS_USERNAME} / ${WORDPRESS_APP_PASSWORD:0:10}..."
    else
        echo -e "${RED}❌ No test credentials found. Please run the setup script first.${NC}"
        exit 1
    fi
    
    # Test GET request (should work)
    echo "Testing GET request..."
    get_status=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "Authorization: Basic $(echo -n "${WORDPRESS_USERNAME}:${WORDPRESS_APP_PASSWORD}" | base64)" \
        http://localhost:8081/wp-json/wp/v2/posts?per_page=1)
    
    if [[ "$get_status" == "200" ]]; then
        echo -e "✅ GET request: ${GREEN}Success (HTTP $get_status)${NC}"
    else
        echo -e "❌ GET request: ${RED}Failed (HTTP $get_status)${NC}"
    fi
    
    # Test POST request (the main issue we're fixing)
    echo "Testing POST request..."
    post_response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Basic $(echo -n "${WORDPRESS_USERNAME}:${WORDPRESS_APP_PASSWORD}" | base64)" \
        -H "Content-Type: application/json" \
        -d '{"title":"Auth Fix Test","content":"Testing authentication fix","status":"draft"}' \
        http://localhost:8081/wp-json/wp/v2/posts)
    
    post_status=$(echo "$post_response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2)
    post_body=$(echo "$post_response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [[ "$post_status" == "201" ]]; then
        echo -e "✅ POST request: ${GREEN}Success (HTTP $post_status)${NC}"
        echo -e "${GREEN}🎉 Authentication fix successful!${NC}"
        
        # Extract post ID and clean up the test post
        post_id=$(echo "$post_body" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        if [[ -n "$post_id" ]]; then
            echo "Cleaning up test post (ID: $post_id)..."
            curl -s -X DELETE \
                -H "Authorization: Basic $(echo -n "${WORDPRESS_USERNAME}:${WORDPRESS_APP_PASSWORD}" | base64)" \
                "http://localhost:8081/wp-json/wp/v2/posts/${post_id}?force=true" > /dev/null
            echo "✅ Test post cleaned up"
        fi
    else
        echo -e "❌ POST request: ${RED}Failed (HTTP $post_status)${NC}"
        echo "Response body: $post_body"
        echo -e "${YELLOW}Additional troubleshooting may be needed${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔧 WordPress REST API Authentication Fix${NC}"
    echo "=========================================="
    echo "This script will:"
    echo "1. Update .htaccess to preserve Authorization headers"
    echo "2. Set WordPress environment type to 'local'"
    echo "3. Fix file permissions"
    echo "4. Restart WordPress"
    echo "5. Test authentication"
    echo ""
    
    check_containers
    create_htaccess
    set_local_environment
    fix_permissions
    restart_wordpress
    test_authentication
    
    echo ""
    echo -e "${BLUE}📋 Summary${NC}"
    echo "=========================================="
    echo "✅ Applied Authorization header preservation to .htaccess"
    echo "✅ Set WordPress environment to 'local' for app password support"
    echo "✅ Fixed file permissions"
    echo "✅ Restarted WordPress services"
    echo "✅ Tested authentication"
    echo ""
    echo -e "${GREEN}🎯 You can now run the contract tests again:${NC}"
    echo "npm run test:contracts:live"
}

# Run the main function
main