#!/bin/bash

echo "🚀 Starting WordPress test environment..."

# Stop any existing containers
docker-compose -f docker-compose.test.yml down -v 2>/dev/null

# Start the test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for WordPress to be ready
echo "⏳ Waiting for WordPress to be ready..."
attempt=0
max_attempts=30

while [ $attempt -lt $max_attempts ]; do
    if curl -s -f http://localhost:8081/wp-json/wp/v2/ > /dev/null; then
        echo "✅ WordPress is ready!"
        break
    fi
    echo "   Attempt $((attempt + 1))/$max_attempts..."
    sleep 5
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ WordPress failed to start"
    docker-compose -f docker-compose.test.yml logs
    exit 1
fi

# Get test credentials
echo "📝 Fetching test credentials..."
sleep 5 # Give the init script time to run

CREDS=$(curl -s http://localhost:8081/wp-json/test/v1/credentials)
if [ $? -eq 0 ]; then
    echo "✅ Test environment ready!"
    echo "   Credentials: $CREDS"
    
    # Export credentials for tests
    export WORDPRESS_TEST_URL="http://localhost:8081"
    export WORDPRESS_USERNAME="testuser"
    export WORDPRESS_APP_PASSWORD=$(echo $CREDS | jq -r .app_password)
    export WORDPRESS_AUTH_METHOD="app-password"
    
    # Save to .env.test for tests
    cat > .env.test << EOF
WORDPRESS_TEST_URL=http://localhost:8081
WORDPRESS_USERNAME=testuser
WORDPRESS_APP_PASSWORD=$WORDPRESS_APP_PASSWORD
WORDPRESS_AUTH_METHOD=app-password
EOF
    
    echo "   Test environment variables saved to .env.test"
else
    echo "⚠️  Could not fetch test credentials"
fi

echo ""
echo "🎯 Test environment is running!"
echo "   WordPress: http://localhost:8081"
echo "   Pact Broker: http://localhost:9292"
echo ""
echo "To stop: docker-compose -f docker-compose.test.yml down"