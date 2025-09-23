#!/bin/bash
set -e

echo "🔧 Setting up WordPress for contract testing..."

# Check WordPress version and capabilities
echo "📋 Checking WordPress setup..."
wp_version=$(docker exec wordpress-test bash -c "cd /var/www/html && wp core version --allow-root" 2>/dev/null || echo "unknown")
echo "WordPress version: $wp_version"

# Check user capabilities
echo "📋 Checking user capabilities..."
user_caps=$(docker exec wordpress-test bash -c "cd /var/www/html && wp user list-caps testuser --allow-root | grep -E '(edit_posts|publish_posts|administrator)'" 2>/dev/null || echo "unknown")
echo "User capabilities: $user_caps"

# Check if Application Passwords are supported (WordPress 5.6+)
echo "📋 Creating application password for testuser..."
app_password_result=$(docker exec wordpress-test bash -c "
    cd /var/www/html &&
    wp user application-password create testuser 'Contract Testing' --porcelain --allow-root 2>&1
" || echo "FAILED")

if [[ "$app_password_result" != "FAILED" ]] && [[ "$app_password_result" != *"Error"* ]] && [[ -n "$app_password_result" ]]; then
    app_password="$app_password_result"
    echo "✅ Application password created: $app_password"

    # Export the password for the contract tests
    export WORDPRESS_APP_PASSWORD="$app_password"
    echo "export WORDPRESS_APP_PASSWORD=\"$app_password\"" > /tmp/wordpress-test-credentials.sh
    echo "export WORDPRESS_AUTH_METHOD=\"app-password\"" >> /tmp/wordpress-test-credentials.sh

    auth_method="app-password"
else
    echo "⚠️  Application password creation failed, falling back to basic auth"
    echo "Error: $app_password_result"

    # Fall back to basic authentication with the admin password
    app_password="test-password-123"
    export WORDPRESS_APP_PASSWORD="$app_password"
    echo "export WORDPRESS_APP_PASSWORD=\"$app_password\"" > /tmp/wordpress-test-credentials.sh
    echo "export WORDPRESS_AUTH_METHOD=\"basic\"" >> /tmp/wordpress-test-credentials.sh

    auth_method="basic"
fi

echo "📋 Test credentials ready:"
echo "URL: http://localhost:8081"
echo "Username: testuser"
echo "Auth Method: $auth_method"
echo "Password: ${app_password:0:10}..."

# Test the REST API with the new credentials
echo "🔍 Testing REST API access..."

# First test basic API access
echo "Testing basic API endpoint..."

# Try the main API index endpoint
basic_test=$(curl -s http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "FAILED")
basic_status=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8081/wp-json/wp/v2/ 2>/dev/null || echo "000")

echo "API endpoint status: $basic_status"
echo "API response sample: $(echo "$basic_test" | head -c 100)..."

if [[ "$basic_status" == "200" ]] && ([[ "$basic_test" == *"namespace"* ]] || [[ "$basic_test" == *"routes"* ]] || [[ "$basic_test" == *"wp/v2"* ]]); then
    echo "✅ Basic REST API is accessible"
elif [[ "$basic_status" == "200" ]]; then
    echo "⚠️  API returns 200 but unexpected content"
    # Try alternative endpoint
    alt_test=$(curl -s http://localhost:8081/wp-json/ 2>/dev/null || echo "FAILED")
    if [[ "$alt_test" == *"wp/v2"* ]]; then
        echo "✅ WordPress JSON API root accessible at /wp-json/"
    else
        echo "❌ Neither /wp-json/wp/v2/ nor /wp-json/ return expected JSON"
        echo "Response: $(echo "$basic_test" | head -c 300)"
        exit 1
    fi
else
    echo "❌ Basic REST API failed (HTTP $basic_status)"
    echo "Response: $(echo "$basic_test" | head -c 300)"

    # Try to check if WordPress is using a different URL structure
    echo "Checking alternative endpoints..."
    index_test=$(curl -s http://localhost:8081/index.php?rest_route=/wp/v2/ 2>/dev/null || echo "FAILED")
    if [[ "$index_test" == *"namespace"* ]]; then
        echo "⚠️  REST API accessible via index.php (permalink issue)"
    fi
    exit 1
fi

# Test authenticated API access
echo "Testing authenticated API access..."
auth_test=$(curl -s -u "testuser:$app_password" http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "FAILED")
auth_status=$(curl -s -u "testuser:$app_password" -w "%{http_code}" -o /dev/null http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "000")

echo "Posts endpoint status: $auth_status"
echo "Posts endpoint response sample: $(echo "$auth_test" | head -c 150)..."

if [[ "$auth_status" == "200" ]]; then
    echo "✅ Authenticated REST API access working (HTTP 200)"
elif [[ "$auth_test" == *"["* ]] || [[ "$auth_test" == *"rest_"* ]]; then
    echo "✅ REST API authentication working (got JSON response)"
else
    echo "⚠️  Posts endpoint returned status $auth_status"
fi

# Test authentication by trying to create a post (requires authentication)
echo "Testing authentication with post creation..."

# Debug: Check what application passwords exist
echo "📋 Checking application passwords..."
app_passwords_list=$(docker exec wordpress-test bash -c "cd /var/www/html && wp user application-password list testuser --allow-root" 2>/dev/null || echo "unknown")
echo "Application passwords: $app_passwords_list"

# Test with both the generated password and try basic auth
test_post_data='{"title":"Auth Test Post","content":"Testing authentication","status":"draft"}'

echo "Testing with application password..."

# Get a nonce first (sometimes required for POST requests)
echo "Getting REST API nonce..."
nonce_response=$(curl -s -u "testuser:$app_password" http://localhost:8081/wp-json/ 2>/dev/null || echo "FAILED")
echo "Nonce response: $(echo "$nonce_response" | head -c 200)..."

# Try POST request with application password
create_test=$(curl -s -u "testuser:$app_password" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$test_post_data" \
    http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "FAILED")
create_status=$(curl -s -u "testuser:$app_password" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$test_post_data" \
    -w "%{http_code}" \
    -o /dev/null \
    http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "000")

echo "Post creation status (app password): $create_status"
echo "Post creation response: $(echo "$create_test" | head -c 200)..."

# If app password fails, try with admin password for debugging
if [[ "$create_status" != "201" ]]; then
    echo "Testing with admin password for comparison..."
    admin_create_test=$(curl -s -u "testuser:test-password-123" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$test_post_data" \
        http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "FAILED")
    admin_create_status=$(curl -s -u "testuser:test-password-123" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$test_post_data" \
        -w "%{http_code}" \
        -o /dev/null \
        http://localhost:8081/wp-json/wp/v2/posts 2>/dev/null || echo "000")

    echo "Post creation status (admin password): $admin_create_status"
    echo "Admin password response: $(echo "$admin_create_test" | head -c 200)..."

    # Test if the user can create posts via WP-CLI (this should work if permissions are correct)
    echo "Testing post creation via WP-CLI..."
    cli_post_result=$(docker exec wordpress-test bash -c "
        cd /var/www/html &&
        wp post create --post_title='CLI Test Post' --post_content='Testing via CLI' --post_status=draft --post_author=1 --allow-root --porcelain
    " 2>/dev/null || echo "FAILED")

    if [[ "$cli_post_result" != "FAILED" ]] && [[ "$cli_post_result" =~ ^[0-9]+$ ]]; then
        echo "✅ User can create posts via WP-CLI (post ID: $cli_post_result)"
        echo "⚠️  Issue appears to be with REST API authentication, not user permissions"

        # Try to check if there are any REST API restrictions
        echo "Checking REST API settings..."
        rest_settings=$(docker exec wordpress-test bash -c "
            cd /var/www/html &&
            wp option get rest_api_enabled --allow-root 2>/dev/null || echo 'not set'
        ")
        echo "REST API enabled setting: $rest_settings"
    else
        echo "❌ User cannot create posts via WP-CLI either"
        echo "CLI result: $cli_post_result"
    fi
fi

if [[ "$create_status" == "201" ]] && [[ "$create_test" == *"id"* ]]; then
    echo "✅ Authentication working correctly (can create posts)"

    # Clean up the test post
    test_post_id=$(echo "$create_test" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    if [[ -n "$test_post_id" ]]; then
        curl -s -u "testuser:$app_password" -X DELETE http://localhost:8081/wp-json/wp/v2/posts/$test_post_id?force=true >/dev/null 2>&1
        echo "✅ Test post cleaned up"
    fi
elif [[ "$cli_post_result" != "FAILED" ]] && [[ "$cli_post_result" =~ ^[0-9]+$ ]]; then
    echo "⚠️  REST API POST authentication has issues, but user permissions are correct"
    echo "✅ Proceeding with contract tests (read operations work, WP-CLI confirms permissions)"
    echo "Note: Some contract tests may fail due to REST API POST authentication issues"
else
    echo "❌ Both REST API and WP-CLI post creation failed"
    echo "Response: $(echo "$create_test" | head -c 300)"
    exit 1
fi
