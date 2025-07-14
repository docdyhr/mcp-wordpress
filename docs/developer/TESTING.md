# Testing Guide

Comprehensive guide to the test suite, testing strategies, and best practices for the MCP WordPress Server.

## 🧪 Test Infrastructure

### Current Test Status ✅

- **Main Test Suite**: 207/207 passed (100%)
- **Security Tests**: 40/40 passed (100%)
- **Performance Tests**: 8/8 passed (100%)
- **CI/CD Pipeline**: Fully functional
- **Code Coverage**: 95%+ coverage maintained

### Test Architecture

```text
tests/
├── unit/                    # Unit tests (17 tests)
│   ├── security-utils.test.js
│   ├── cache-manager.test.js
│   └── helper-functions.test.js
├── integration/             # Integration tests (54 tests)
│   ├── wordpress-api.test.js
│   ├── multi-site.test.js
│   └── auth-methods.test.js
├── security/                # Security tests (40 tests)
│   ├── input-validation.test.js
│   ├── auth-security.test.js
│   ├── penetration.test.js
│   └── vulnerability.test.js
├── performance/             # Performance tests (8 tests)
│   ├── benchmarks.test.js
│   ├── regression.test.js
│   └── load-testing.test.js
├── cache/                   # Cache tests (37 tests)
│   ├── cache-functionality.test.js
│   ├── cache-invalidation.test.js
│   └── cache-performance.test.js
├── property/                # Property-based tests (12 tests)
│   ├── data-structure.test.js
│   └── edge-cases.test.js
├── config/                  # Configuration tests (27 tests)
│   ├── schema-validation.test.js
│   ├── multi-site-config.test.js
│   └── environment-config.test.js
├── contracts/               # Contract tests (mock)
│   ├── pact-testing.test.js
│   └── api-contracts.test.js
├── typescript-build.test.js # TypeScript build tests (21 tests)
├── auth-headers-fix.test.js # Authentication header tests
├── config-loading.test.js   # Configuration loading tests
├── tool-validation.test.js  # Tool validation tests
├── env-loading.test.js      # Environment loading tests (7 tests)
└── upload-timeout.test.js   # Upload timeout tests (12 tests)
```

## 🚀 Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:security       # Security tests only
npm run test:performance    # Performance tests only
npm run test:cache          # Cache tests only
npm run test:config         # Configuration tests only
npm run test:property       # Property-based tests only

# Development commands
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
npm run test:fast           # Quick validation
```

### Advanced Test Commands

```bash
# TypeScript and build tests
npm run test:typescript     # TypeScript compilation tests
npm run test:tools          # Tool functionality tests
npm run test:mcp            # MCP protocol tests

# Multi-site and authentication
npm run test:multisite      # Multi-site configuration tests
npm run test:auth           # Authentication method tests

# Contract testing
npm run test:contracts      # Mock contract tests
npm run test:contracts:live # Live WordPress contract tests

# Docker test environment
npm run test:with-env       # Tests with Docker WordPress
./scripts/start-test-env.sh # Start test environment
```

## 🔧 Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/*.test.ts"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
};
```

### Test Environment Setup

```javascript
// tests/setup.js
const { performance } = require("perf_hooks");

// Global test utilities
global.testUtils = {
  createMockClient: () => ({
    /* mock client */
  }),
  generateTestData: (schema) => ({
    /* generated data */
  }),
  measurePerformance: (fn) => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
};

// Setup test environment
beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.DEBUG = "false";
});

afterAll(() => {
  // Cleanup test environment
});
```

## 📝 Test Categories

### Unit Tests

**Purpose**: Test individual components in isolation

**Coverage**:

- Security utilities and helper functions
- Cache manager functionality
- Input validation logic
- Error handling mechanisms

**Example**:

```javascript
// tests/unit/security-utils.test.js
describe("SecurityUtils", () => {
  test("should sanitize input correctly", () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = SecurityUtils.sanitizeInput(input);
    expect(sanitized).not.toContain("<script>");
  });

  test("should validate email format", () => {
    expect(SecurityUtils.isValidEmail("test@example.com")).toBe(true);
    expect(SecurityUtils.isValidEmail("invalid-email")).toBe(false);
  });
});
```

### Integration Tests

**Purpose**: Test multi-component interactions with real WordPress instances

**Coverage**:

- WordPress API connectivity
- Multi-site configuration
- Authentication method validation
- End-to-end tool functionality

**Example**:

```javascript
// tests/integration/wordpress-api.test.js
describe("WordPress API Integration", () => {
  let client;

  beforeAll(async () => {
    client = new WordPressClient({
      siteUrl: process.env.WORDPRESS_TEST_URL,
      username: "admin",
      appPassword: "test test test test test test",
    });
  });

  test("should create and retrieve post", async () => {
    const post = await client.posts.create({
      title: "Test Post",
      content: "Test content",
      status: "publish",
    });

    expect(post.id).toBeDefined();
    expect(post.title).toBe("Test Post");

    const retrieved = await client.posts.get({ id: post.id });
    expect(retrieved.title).toBe("Test Post");
  });
});
```

### Security Tests

**Purpose**: Validate security measures and vulnerability protection

**Coverage**:

- Input validation and sanitization
- Authentication security
- Authorization checks
- XSS and SQL injection prevention
- Rate limiting and DoS protection

**Example**:

```javascript
// tests/security/input-validation.test.js
describe("Input Validation Security", () => {
  test("should reject malicious script injection", () => {
    const maliciousInput = {
      title: '<script>alert("xss")</script>',
      content: '"><script>alert("xss")</script>',
    };

    expect(() => {
      createPostSchema.parse(maliciousInput);
    }).toThrow("Invalid input");
  });

  test("should prevent SQL injection in search", () => {
    const sqlInjection = "'; DROP TABLE posts; --";
    expect(() => {
      searchSchema.parse({ query: sqlInjection });
    }).toThrow("Invalid characters");
  });
});
```

### Performance Tests

**Purpose**: Ensure performance standards and detect regressions

**Coverage**:

- Response time benchmarks
- Memory usage monitoring
- Cache performance validation
- Load testing scenarios

**Example**:

```javascript
// tests/performance/benchmarks.test.js
describe("Performance Benchmarks", () => {
  test("should handle post creation under 500ms", async () => {
    const start = performance.now();

    await client.posts.create({
      title: "Performance Test",
      content: "Test content",
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test("should maintain cache hit rate above 70%", async () => {
    // Warm cache
    await client.posts.list();
    await client.posts.list();

    const stats = await client.cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.7);
  });
});
```

### Cache Tests

**Purpose**: Validate caching functionality and performance

**Coverage**:

- Cache hit and miss scenarios
- Cache invalidation logic
- Multi-site cache isolation
- Cache performance optimization

**Example**:

```javascript
// tests/cache/cache-functionality.test.js
describe("Cache Functionality", () => {
  test("should cache GET requests", async () => {
    const client = new CachedWordPressClient(config);

    // First request - cache miss
    const start1 = performance.now();
    const posts1 = await client.posts.list();
    const duration1 = performance.now() - start1;

    // Second request - cache hit
    const start2 = performance.now();
    const posts2 = await client.posts.list();
    const duration2 = performance.now() - start2;

    expect(posts1).toEqual(posts2);
    expect(duration2).toBeLessThan(duration1 * 0.1); // 90% faster
  });

  test("should invalidate cache on updates", async () => {
    const client = new CachedWordPressClient(config);

    // Cache posts list
    await client.posts.list();

    // Create new post
    await client.posts.create({
      title: "New Post",
      content: "Content",
    });

    // List should be refreshed
    const posts = await client.posts.list();
    expect(posts.some((p) => p.title === "New Post")).toBe(true);
  });
});
```

### Property-Based Tests

**Purpose**: Test with generated data to find edge cases

**Coverage**:

- Data structure validation
- Edge case discovery
- Input boundary testing
- Randomized testing scenarios

**Example**:

```javascript
// tests/property/data-structure.test.js
const fc = require("fast-check");

describe("Property-Based Testing", () => {
  test("should handle any valid post data", () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          content: fc.string(),
          status: fc.constantFrom("draft", "publish", "private"),
        }),
        async (postData) => {
          const result = await client.posts.create(postData);
          expect(result.title).toBe(postData.title);
          expect(result.status).toBe(postData.status);
        },
      ),
    );
  });
});
```

### Configuration Tests

**Purpose**: Validate configuration loading and validation

**Coverage**:

- Multi-site configuration validation
- Environment variable loading
- Schema validation with Zod
- Configuration error handling

**Example**:

```javascript
// tests/config/schema-validation.test.js
describe("Configuration Schema Validation", () => {
  test("should validate multi-site configuration", () => {
    const validConfig = {
      sites: [
        {
          id: "site1",
          name: "Test Site",
          config: {
            WORDPRESS_SITE_URL: "https://example.com",
            WORDPRESS_USERNAME: "admin",
            WORDPRESS_APP_PASSWORD: "test test test test test test",
          },
        },
      ],
    };

    expect(() => {
      multiSiteConfigSchema.parse(validConfig);
    }).not.toThrow();
  });

  test("should reject invalid site URLs", () => {
    const invalidConfig = {
      sites: [
        {
          id: "site1",
          name: "Test Site",
          config: {
            WORDPRESS_SITE_URL: "invalid-url",
            WORDPRESS_USERNAME: "admin",
            WORDPRESS_APP_PASSWORD: "password",
          },
        },
      ],
    };

    expect(() => {
      multiSiteConfigSchema.parse(invalidConfig);
    }).toThrow("Invalid URL");
  });
});
```

## 🐳 Docker Test Environment

### Docker Environment Setup

```bash
# Start complete test environment
./scripts/start-test-env.sh

# This creates:
# - WordPress instance on http://localhost:8081
# - MySQL database
# - Pre-configured admin user
# - Application password setup
```

### Docker Compose Configuration

```yaml
# docker-compose.test.yml
version: "3.8"
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8081:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
    depends_on:
      - db
    volumes:
      - ./tests/wordpress-config.php:/var/www/html/wp-config.php

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
      MYSQL_ROOT_PASSWORD: root
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

### Test Environment Usage

```bash
# Run tests with Docker environment
npm run test:with-env

# Run specific tests against Docker
WORDPRESS_TEST_URL=http://localhost:8081 npm test

# Clean up test environment
docker-compose -f docker-compose.test.yml down -v
```

## 📊 Test Reporting

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Coverage report locations:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/lcov.info (LCOV format)
# - coverage/coverage-final.json (JSON format)
```

### Performance Metrics

```bash
# Performance test reporting
npm run test:performance

# Generates:
# - Performance benchmarks
# - Regression detection
# - Memory usage analysis
# - Response time metrics
```

## 🔄 Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run security tests
        run: npm run test:security
      - name: Run performance tests
        run: npm run test:performance
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Quality Gates

**Pre-Commit Hooks**:

- ESLint validation
- TypeScript type checking
- Quick test validation
- Security scanning

**Pre-Push Hooks**:

- Full test suite execution
- Security audit
- Performance regression tests
- Coverage threshold validation

## 🧩 Writing Tests

### Test Structure

```javascript
// Standard test structure
describe("Component Name", () => {
  // Setup
  beforeAll(() => {
    // One-time setup
  });

  beforeEach(() => {
    // Per-test setup
  });

  // Test cases
  describe("method name", () => {
    test("should do something specific", () => {
      // Arrange
      const input = "test data";

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe("expected output");
    });
  });

  // Cleanup
  afterEach(() => {
    // Per-test cleanup
  });

  afterAll(() => {
    // One-time cleanup
  });
});
```

### Test Best Practices

1. **Descriptive Test Names**: Use clear, specific test descriptions
2. **Arrange-Act-Assert Pattern**: Structure tests consistently
3. **Mock External Dependencies**: Isolate units under test
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Performance Aware**: Include performance assertions where relevant
6. **Security Focused**: Test security-related functionality thoroughly

### Mock Utilities

```javascript
// tests/utils/mocks.js
export const mockWordPressClient = {
  posts: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  },
  auth: {
    authenticate: jest.fn(),
    getAuthHeaders: jest.fn(),
  },
};

export const mockConfig = {
  siteUrl: "https://test.example.com",
  username: "testuser",
  appPassword: "test test test test test test",
};
```

## 📈 Test Metrics

### Key Performance Indicators

- **Test Coverage**: 95%+ maintained
- **Test Execution Time**: < 5 minutes for full suite
- **Test Reliability**: 100% pass rate in CI/CD
- **Security Test Coverage**: 100% of security features tested
- **Performance Regression**: < 20% performance degradation threshold

### Test Health Dashboard

```bash
# Check test health
npm run test:health

# Outputs:
# - Test execution time trends
# - Coverage percentage by component
# - Flaky test detection
# - Performance regression alerts
```

## 🔍 Debugging Tests

### Debug Mode

```bash
# Run tests with debug output
DEBUG=true npm test

# Debug specific test file
DEBUG=true npm test -- tests/integration/wordpress-api.test.js

# Debug with Node.js inspector
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Test Debugging Tools

```javascript
// Debug utility functions
const debug = require("debug")("test:debug");

describe("Debug Example", () => {
  test("should debug test execution", () => {
    debug("Starting test execution");

    const result = someFunction();
    debug("Function result:", result);

    expect(result).toBeDefined();
  });
});
```

## 📚 Further Reading

- **[Architecture Guide](ARCHITECTURE.md)** - System design and patterns
- **[API Reference](API_REFERENCE.md)** - Complete technical API documentation
- **[Security Guidelines](SECURITY_DEVELOPMENT.md)** - Security best practices
- **[Performance Guide](PERFORMANCE_DEVELOPMENT.md)** - Performance optimization

---

**Need help with testing?** This comprehensive testing infrastructure ensures code quality, security, and performance.
All tests are designed to be fast, reliable, and maintainable.
