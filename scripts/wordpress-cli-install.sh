#!/bin/bash
set -e

echo "🔧 Installing WordPress via WP-CLI within container..."

# Wait for WordPress container to be ready
echo "⏳ Waiting for WordPress container..."
timeout=60
counter=0
while ! docker exec wordpress-test-instance php -v >/dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ WordPress container not ready"
        exit 1
    fi
    echo -n "."
done
echo -e "\n✅ WordPress container is ready"

# Install WP-CLI in the WordPress container
echo "📦 Installing WP-CLI in container..."
docker exec wordpress-test-instance bash -c "
    cd /tmp && 
    curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar &&
    chmod +x wp-cli.phar &&
    mv wp-cli.phar /usr/local/bin/wp
"

# Install WordPress using WP-CLI
echo "🌐 Installing WordPress with WP-CLI..."
docker exec wordpress-test-instance bash -c "
    cd /var/www/html &&
    wp core install \
        --url='http://localhost:8081' \
        --title='Contract Test Site' \
        --admin_user='testuser' \
        --admin_password='test-password-123' \
        --admin_email='test@example.com' \
        --allow-root
"

echo "✅ WordPress installed via WP-CLI"

# Ensure the test user has proper capabilities for API testing
echo "🔧 Setting up user permissions for API testing..."
docker exec wordpress-test-instance bash -c "
    cd /var/www/html &&
    # Make sure testuser is an administrator with full capabilities
    wp user update testuser --role=administrator --allow-root &&
    
    # Explicitly add REST API capabilities for posts
    wp user add-cap testuser edit_posts --allow-root &&
    wp user add-cap testuser publish_posts --allow-root &&
    wp user add-cap testuser delete_posts --allow-root &&
    wp user add-cap testuser edit_others_posts --allow-root &&
    wp user add-cap testuser publish_others_posts --allow-root &&
    wp user add-cap testuser delete_others_posts --allow-root &&
    wp user add-cap testuser edit_private_posts --allow-root &&
    wp user add-cap testuser read_private_posts --allow-root &&
    wp user add-cap testuser delete_private_posts --allow-root &&
    
    # Verify user role and capabilities
    wp user get testuser --field=roles --allow-root &&
    wp user list-caps testuser --allow-root | grep -E '(edit_posts|publish_posts)' &&
    
    echo 'User permissions configured for API testing'
"

echo "✅ User permissions configured"

# Configure WordPress for REST API access
echo "🔧 Configuring WordPress for REST API access..."
docker exec wordpress-test-instance bash -c "
    cd /var/www/html &&
    # Set permalink structure to ensure REST API works
    wp rewrite structure '/%postname%/' --allow-root &&
    wp rewrite flush --allow-root &&
    
    # Enable REST API (should be enabled by default, but let's be sure)
    wp option update permalink_structure '/%postname%/' --allow-root &&
    
    # Ensure REST API is enabled and not restricted
    wp option delete disable_rest_api --allow-root 2>/dev/null || true &&
    wp option update rest_api_enabled 1 --allow-root &&
    
    # Create a test post to ensure we have content for API tests
    wp post create --post_title='Test Post for API' --post_content='This is a test post for API testing' --post_status=publish --post_author=1 --allow-root &&
    
    # Verify the user can create posts via WP-CLI (should work if permissions are correct)
    wp post create --post_title='Permission Test Post' --post_content='Testing user permissions' --post_status=draft --post_author=1 --allow-root &&
    
    echo 'WordPress configured for REST API access'
"

echo "✅ WordPress configured for REST API"

# Wait for WordPress to fully initialize
echo "⏳ Waiting for WordPress to fully initialize..."
sleep 10

# Verify installation with multiple checks
echo "🔍 Verifying WordPress installation..."

# Check if WordPress homepage is working
home_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8081/ 2>/dev/null || echo "000")
echo "Homepage status: $home_status"

# Check if REST API is accessible
api_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "000")
echo "REST API status: $api_status"

# Check API response content
api_response=$(curl -s http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "FAILED")
echo "API response sample: $(echo "$api_response" | head -c 100)..."

if [[ "$api_status" == "200" ]] && [[ "$api_response" == *"namespace"* ]]; then
    echo "✅ WordPress REST API is fully accessible"
    exit 0
elif [[ "$api_status" == "200" ]]; then
    echo "⚠️  WordPress responding but REST API may not be properly configured"
    echo "Full API response: $(echo "$api_response" | head -c 500)"
    
    # Try alternative REST API access method
    alt_response=$(curl -s http://localhost:8081/index.php?rest_route=/wp/v2/ 2>/dev/null || echo "FAILED")
    if [[ "$alt_response" == *"namespace"* ]]; then
        echo "✅ REST API accessible via index.php method"
        exit 0
    fi
    
    exit 1
else
    echo "❌ WordPress REST API not accessible (HTTP $api_status)"
    echo "Debug: Full response: $(echo "$api_response" | head -c 500)"
    exit 1
fi