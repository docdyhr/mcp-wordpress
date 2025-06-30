#!/bin/bash
set -e

echo "🌐 Installing WordPress via web interface..."

# Wait for WordPress to be accessible
echo "⏳ Waiting for WordPress web interface..."
timeout=60
counter=0
while ! curl -s http://localhost:8081/ | grep -q "WordPress"; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ WordPress web interface timeout"
        exit 1
    fi
    echo -n "."
done
echo -e "\n✅ WordPress web interface is ready"

# Install WordPress via POST request
echo "📦 Installing WordPress via web interface..."
curl -s -X POST http://localhost:8081/wp-admin/install.php?step=2 \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "weblog_title=Contract+Test+Site" \
    -d "user_name=testuser" \
    -d "admin_password=test-password-123" \
    -d "admin_password2=test-password-123" \
    -d "admin_email=test@example.com" \
    -d "Submit=Install+WordPress" \
    -d "pw_weak=1" > /dev/null

echo "✅ WordPress installed via web interface"

# Wait a moment for installation to complete
sleep 5

# Test that WordPress is installed
if curl -s http://localhost:8081/wp-json/wp/v2/ | grep -q "namespace"; then
    echo "✅ WordPress REST API is now accessible"
    return 0
else
    echo "❌ WordPress REST API still not accessible"
    return 1
fi