# Contract Testing with Live WordPress

This guide explains how to run contract tests against a live WordPress instance using the automated testing setup.

## 🚀 Quick Start (Automated)

The easiest way to test against a live WordPress instance:

```bash
npm run test:contracts:live
```

This command will:

1. 🐳 Start isolated WordPress + MySQL containers (port 8081)
2. ⚙️ Auto-configure WordPress with test data
3. 🧪 Run contract tests against the live instance
4. 🧹 Clean up automatically when done

**No conflicts with existing services** - uses isolated Docker containers with different ports.

## 📋 What the Automated Setup Includes

### WordPress Configuration

- **URL**: `http://localhost:8081`
- **Admin User**: `testuser` / `test-password-123`
- **App Password**: Auto-generated for API access
- **Test Content**: Pre-created posts and media for testing

### Docker Services

- **WordPress**: Latest WordPress with auto-setup
- **MySQL**: 8.0 with optimized configuration
- **WP-CLI**: For automated WordPress configuration

### Network Isolation

- Uses separate Docker network: `wordpress-test-network`
- Port 8081 (different from main development environment)
- Isolated volumes: `wordpress_test_data`, `db_test_data`

## 🔧 Manual Setup (Alternative)

If you prefer manual setup or need custom configuration:

### 1. Start Services

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Check Status

```bash
docker-compose -f docker-compose.test.yml ps
docker-compose -f docker-compose.test.yml logs -f wordpress-test
```

### 3. Access WordPress

- WordPress: <http://localhost:8081>
- Admin Panel: <http://localhost:8081/wp-admin>

### 4. Run Tests

```bash
# Set environment variables
export WORDPRESS_TEST_URL="http://localhost:8081"
export WORDPRESS_USERNAME="testuser"
export WORDPRESS_APP_PASSWORD="your-app-password"
export PACT_LIVE_TESTING="true"

# Run contract tests
npm run test:contracts
```

### 5. Cleanup

```bash
docker-compose -f docker-compose.test.yml down -v
```

## 🧪 Test Modes

### Mock Testing (Default)

```bash
npm run test:contracts
```

- Uses Pact mock provider
- No external dependencies
- Fast execution
- Good for CI/CD

### Live Testing

```bash
npm run test:contracts:live
```

- Tests against real WordPress
- Validates actual API behavior
- Comprehensive integration testing
- Auto-setup and cleanup

## 📊 Test Coverage

The contract tests verify:

### ✅ Posts API

- Create posts with proper structure
- Retrieve posts with pagination
- Response format validation

### ✅ Media API  

- File upload handling
- Multipart form data
- Media library integration

### ✅ Users API

- User information retrieval
- Authentication validation
- Permission handling

### ✅ Authentication

- App password authentication
- Authorization headers
- Error handling

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8081
lsof -i :8081

# Kill process if needed
kill -9 <PID>
```

### Docker Issues

```bash
# Clean up Docker resources
docker system prune -f
docker volume prune -f

# Restart Docker daemon
sudo service docker restart  # Linux
# Or restart Docker Desktop   # macOS/Windows
```

### WordPress Not Ready

```bash
# Check WordPress logs
docker-compose -f docker-compose.test.yml logs wordpress-test

# Check database logs
docker-compose -f docker-compose.test.yml logs db-test

# Manual health check
curl http://localhost:8081/wp-json/wp/v2/
```

### Test Failures

```bash
# Run with debug output
DEBUG=true npm run test:contracts:live

# Check WordPress configuration
docker-compose -f docker-compose.test.yml exec wordpress-test cat /var/www/html/test-config.json
```

## 🔒 Security Notes

- Test environment uses isolated containers
- Default credentials are for testing only
- Auto-cleanup removes all test data
- No persistent storage outside containers

## 📈 CI/CD Integration

To use in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Install Docker Compose
  run: sudo apt-get install docker-compose

- name: Run Contract Tests
  run: npm run test:contracts:live
  timeout-minutes: 10
```

The automated setup is designed to work in CI environments with proper Docker support.
