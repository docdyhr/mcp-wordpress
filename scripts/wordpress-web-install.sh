#!/bin/bash
set -e

echo "🌐 Installing WordPress via web interface..."

# Wait for WordPress to be accessible and show installation page
echo "⏳ Waiting for WordPress installation page..."
timeout=120
counter=0
while true; do
    # Follow redirects to get the actual installation page
    response=$(curl -s -L http://localhost:8081/ 2>/dev/null || echo "")
    
    # Check if we get the installation page
    if [[ "$response" == *"WordPress"* ]] && ([[ "$response" == *"install"* ]] || [[ "$response" == *"Welcome"* ]] || [[ "$response" == *"configuration"* ]]); then
        echo -e "\n✅ WordPress installation page is ready"
        break
    elif [[ "$response" == *"WordPress"* ]] && [[ "$response" == *"wp-admin"* ]]; then
        echo -e "\n✅ WordPress is already installed"
        exit 0
    fi
    
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo -e "\n❌ WordPress installation page timeout after $timeout seconds"
        echo "Debug: Response contains: $(echo "$response" | head -c 300)"
        # Check what we're being redirected to
        redirect_info=$(curl -s -I http://localhost:8081/ | grep -i "location:" || echo "No redirect")
        echo "Debug: Redirect info: $redirect_info"
        exit 1
    fi
    echo -n "."
done

# Get the installation page to extract any required nonce or form data
echo "📋 Analyzing installation form..."
install_page=$(curl -s http://localhost:8081/wp-admin/install.php)

# Install WordPress via POST request with proper form handling
echo "📦 Installing WordPress via web interface..."
install_response=$(curl -s -X POST http://localhost:8081/wp-admin/install.php?step=2 \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Referer: http://localhost:8081/wp-admin/install.php" \
    -d "weblog_title=Contract+Test+Site" \
    -d "user_name=testuser" \
    -d "admin_password=test-password-123" \
    -d "admin_password2=test-password-123" \
    -d "admin_email=test@example.com" \
    -d "Submit=Install+WordPress" \
    -d "pw_weak=1" \
    -d "language=" || echo "POST_FAILED")

if [[ "$install_response" == "POST_FAILED" ]]; then
    echo "❌ WordPress installation POST request failed"
    exit 1
fi

echo "✅ WordPress installation request sent"

# Wait longer for installation to complete
echo "⏳ Waiting for installation to complete..."
sleep 10

# Test that WordPress is installed with multiple checks
echo "🔍 Verifying WordPress installation..."
for i in {1..10}; do
    # Check if REST API is accessible with HTTP 200 status
    api_status=$(curl -s -w "%{http_code}" http://localhost:8081/wp-json/wp/v2/ -o /dev/null 2>/dev/null || echo "000")
    if [[ "$api_status" == "200" ]]; then
        echo "✅ WordPress REST API is accessible (HTTP 200)"
        exit 0
    fi
    
    # Check if homepage is working (no longer redirecting to install)
    home_status=$(curl -s -w "%{http_code}" http://localhost:8081/ -o /dev/null 2>/dev/null || echo "000")
    if [[ "$home_status" == "200" ]]; then
        echo "✅ WordPress is installed (homepage HTTP 200)"
        exit 0
    fi
    
    echo "⏳ Installation check $i/10 (API: $api_status, Home: $home_status)..."
    sleep 3
done

echo "❌ WordPress installation verification failed"
echo "Debug: Final API status: $(curl -s -w "%{http_code}" http://localhost:8081/wp-json/wp/v2/ -o /dev/null 2>/dev/null)"
echo "Debug: Final home status: $(curl -s -w "%{http_code}" http://localhost:8081/ -o /dev/null 2>/dev/null)"
echo "Debug: API response sample: $(curl -s http://localhost:8081/wp-json/wp/v2/ 2>/dev/null | head -c 200)"
exit 1