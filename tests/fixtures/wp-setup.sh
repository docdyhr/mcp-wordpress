#!/bin/bash
set -e

echo "🚀 Starting WordPress automated setup for contract testing..."

# Wait for WordPress files to be ready
echo "⏳ Waiting for WordPress files to be ready..."
counter=0
max_attempts=30
until [ -f /var/www/html/wp-config.php ]; do
    if [ $counter -ge $max_attempts ]; then
        echo "❌ WordPress files timeout after $max_attempts attempts"
        exit 1
    fi
    echo "   Waiting for WordPress files... (attempt $((counter + 1))/$max_attempts)"
    sleep 5
    counter=$((counter + 1))
done

echo "✅ WordPress files are ready, installing WordPress..."

# Install WordPress (it won't be installed yet)
echo "📦 Installing WordPress..."
wp core install \
    --url="http://localhost:8081" \
    --title="Contract Test Site" \
    --admin_user="testuser" \
    --admin_password="test-password-123" \
    --admin_email="test@example.com" \
    --path=/var/www/html \
    --allow-root

echo "✅ WordPress installation complete!"

echo "🔑 Setting up authentication..."

# Create application password for testing
echo "📱 Creating application password..."
wp user application-password create testuser "Contract Testing" \
    --path=/var/www/html \
    --allow-root \
    --porcelain > /tmp/app_password.txt

APP_PASSWORD=$(cat /tmp/app_password.txt)
echo "Generated App Password: $APP_PASSWORD"

# Create test content for contract testing
echo "📝 Creating test content..."

# Create test posts
wp post create \
    --post_title="Test Post 1" \
    --post_content="This is test content for contract testing" \
    --post_status="publish" \
    --post_author=1 \
    --path=/var/www/html \
    --allow-root

wp post create \
    --post_title="Test Post 2" \
    --post_content="Another test post for pagination testing" \
    --post_status="publish" \
    --post_author=1 \
    --path=/var/www/html \
    --allow-root

# Create test media directory with proper permissions
echo "🖼️ Creating test media directory..."
# First ensure the uploads directory exists and has correct ownership
mkdir -p /var/www/html/wp-content/uploads/
chown -R www-data:www-data /var/www/html/wp-content/
chmod -R 755 /var/www/html/wp-content/uploads/

# Create test media subdirectory
mkdir -p /var/www/html/wp-content/uploads/test-media
chown -R www-data:www-data /var/www/html/wp-content/uploads/

# Create a small test image
echo "📁 Creating test image..."
# Create a simple 1x1 pixel PNG for testing
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /var/www/html/wp-content/uploads/test-media/test-image.png

# Set final permissions
chown -R www-data:www-data /var/www/html/wp-content/uploads/
chmod -R 755 /var/www/html/wp-content/uploads/

# Enable REST API (should be enabled by default, but just to be sure)
echo "🔌 Ensuring REST API is enabled..."
wp rewrite structure '/%postname%/' --path=/var/www/html --allow-root
wp rewrite flush --path=/var/www/html --allow-root

# Output configuration for tests
echo "📋 WordPress setup complete! Configuration:"
echo "URL: http://localhost:8081"
echo "Username: testuser"
echo "Password: test-password-123"
echo "App Password: $APP_PASSWORD"
echo "REST API: http://localhost:8081/wp-json/wp/v2/"

# Save configuration to a file that can be read by tests
cat > /var/www/html/test-config.json << EOF
{
  "url": "http://localhost:8081",
  "username": "testuser",
  "password": "test-password-123",
  "app_password": "$APP_PASSWORD",
  "rest_api": "http://localhost:8081/wp-json/wp/v2/",
  "setup_complete": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ WordPress contract testing environment is ready!"