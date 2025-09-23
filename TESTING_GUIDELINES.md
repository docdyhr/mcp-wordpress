# Testing Guidelines & Best Practices

This document establishes comprehensive testing standards for the MCP WordPress project, ensuring code quality,
reliability, and maintainability across all components.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Categories & Structure](#test-categories--structure)
- [Testing Tools & Frameworks](#testing-tools--frameworks)
- [Writing Effective Tests](#writing-effective-tests)
- [Coverage Requirements](#coverage-requirements)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

### Core Principles

1. **Quality over Quantity** - Meaningful tests that catch real issues
2. **Fast Feedback** - Tests should run quickly and provide immediate insights
3. **Maintainable** - Tests should be easy to understand and update
4. **Comprehensive** - Cover critical paths, edge cases, and error conditions
5. **Realistic** - Test real-world scenarios and use cases

### Testing Pyramid

```text
    🔺 E2E Tests (10%)
       - Full WordPress integration
       - Contract verification

   🔺🔺 Integration Tests (20%)
      - Component interactions
      - API client testing

  🔺🔺🔺 Unit Tests (70%)
     - Individual functions
     - Class methods
     - Utilities
```

## Test Categories & Structure

### Directory Structure

```text
tests/
├── unit/                    # Unit tests for individual components
│   ├── utils/              # Utility function tests
│   ├── client/             # API client unit tests
│   ├── tools/              # MCP tool unit tests
│   └── config/             # Configuration tests
├── integration/            # Integration tests
├── contracts/              # API contract tests
├── performance/            # Performance & benchmarking
├── security/               # Security validation tests
├── property/               # Property-based testing
├── cache/                  # Cache system tests
└── vitest.setup.ts         # Global test setup and teardown
```

### Test Categories

#### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions and classes in isolation **Coverage Target**: 70-90% of codebase

```javascript
// ✅ Good unit test example
describe("validateId", () => {
  it("should validate positive integers", () => {
    expect(validateId(123, "user_id")).toBe(123);
    expect(validateId(1, "post_id")).toBe(1);
  });

  it("should reject invalid IDs with descriptive errors", () => {
    expect(() => validateId(-1, "user_id")).toThrow("user_id must be a positive integer");
    expect(() => validateId(0, "post_id")).toThrow("post_id must be a positive integer");
    expect(() => validateId("abc", "id")).toThrow("id must be a positive integer");
  });

  it("should handle edge cases", () => {
    expect(() => validateId(Number.MAX_SAFE_INTEGER + 1, "id")).toThrow();
    expect(() => validateId(1.5, "id")).toThrow();
  });
});
```

#### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and system behavior **Coverage Target**: Critical integration points

```javascript
// ✅ Good integration test example
describe("WordPress Client Integration", () => {
  let client;

  beforeEach(() => {
    client = new WordPressClient({
      baseUrl: "https://test.example.com",
      auth: { method: "app-password", username: "test", appPassword: "test" },
    });
  });

  it("should handle authentication flow end-to-end", async () => {
    // Mock successful auth
    mockHttpResponse(200, { id: 1, name: "test" });

    const result = await client.testAuthentication();
    expect(result.authenticated).toBe(true);
    expect(result.user.id).toBe(1);
  });
});
```

#### 3. Contract Tests (`tests/contracts/`)

**Purpose**: Verify API compatibility and external integrations **Coverage Target**: All external API interactions

```javascript
// ✅ Contract test with intelligent fallbacks
describe("WordPress API Contracts", () => {
  let client;
  const useLive = process.env.WORDPRESS_TEST_URL && !process.env.SKIP_LIVE_TESTS;

  beforeEach(() => {
    if (useLive) {
      client = createLiveClient();
    } else {
      client = createMockClient();
    }
  });

  it(`should create posts with correct structure (live=${useLive})`, async () => {
    const result = await client.createPost({
      title: "Test Post",
      content: "Test content",
    });

    expect(result).toMatchObject({
      id: expect.any(Number),
      title: { rendered: expect.stringContaining("Test Post") },
      content: { rendered: expect.stringContaining("Test content") },
      status: expect.any(String),
    });
  });
});
```

#### 4. Performance Tests (`tests/performance/`)

**Purpose**: Validate performance characteristics and prevent regressions

```javascript
// ✅ Performance test with thresholds
describe("Cache Performance", () => {
  it("should achieve target throughput", async () => {
    const cache = new CacheManager();
    const startTime = performance.now();

    // Perform 1000 operations
    for (let i = 0; i < 1000; i++) {
      await cache.set(`key-${i}`, `value-${i}`);
    }

    const endTime = performance.now();
    const opsPerSecond = 1000 / ((endTime - startTime) / 1000);

    expect(opsPerSecond).toBeGreaterThan(10000); // 10k ops/sec minimum
  });
});
```

#### 5. Security Tests (`tests/security/`)

**Purpose**: Validate security measures and prevent vulnerabilities

```javascript
// ✅ Security validation test
describe("Input Validation Security", () => {
  it("should prevent XSS attacks", () => {
    const maliciousInput = '<script>alert("xss")</script>';

    expect(() => validateString(maliciousInput, "content")).toThrow("contains potentially dangerous content");
  });

  it("should prevent SQL injection patterns", () => {
    const sqlInjection = "'; DROP TABLE users; --";

    expect(() => validateSearchQuery(sqlInjection)).toThrow("contains potentially dangerous patterns");
  });
});
```

## Testing Tools & Frameworks

### Primary Stack

- **Vitest** - Primary test runner and assertion library with native ESM support
- **TypeScript Support** - Native TypeScript support without transpilation
- **Mock Framework** - Built-in Vitest mocking capabilities
- **Property Testing** - fast-check for property-based testing
- **Contract Testing** - Pact.js for API contract verification

### Configuration Files

```typescript
// vitest.config.ts - Main configuration
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/types/**", "src/**/index.ts"],
      thresholds: {
        global: {
          branches: 50,
          functions: 60,
          lines: 65,
          statements: 60,
        },
      },
    },
  },
});
```

### Essential Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:security
npm run test:performance

# Coverage analysis
npm run coverage:check
npm run coverage:strict  # With component-specific thresholds

# Watch mode for development
npm run test:watch
```

## Writing Effective Tests

### Test Structure (AAA Pattern)

```javascript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should behavior under condition", () => {
      // Arrange - Set up test data and mocks
      const input = createTestInput();
      const mockDependency = vi.fn().mockReturnValue(expectedResult);

      // Act - Execute the code under test
      const result = methodName(input, mockDependency);

      // Assert - Verify the results
      expect(result).toEqual(expectedOutput);
      expect(mockDependency).toHaveBeenCalledWith(expectedArgs);
    });
  });
});
```

### Naming Conventions

#### Test Files

- Unit tests: `ComponentName.test.js`
- Integration tests: `integration-scenario.test.js`
- Contract tests: `api-contract.test.js`

#### Test Descriptions

```javascript
// ✅ Good: Describes behavior clearly
it("should return 401 when authentication fails");
it("should cache responses for 5 minutes");
it("should validate required parameters before API calls");

// ❌ Bad: Vague or implementation-focused
it("should work correctly");
it("should call the API");
it("tests the function");
```

### Test Data Management

#### Use Factory Functions

```javascript
// test-factories.js
export const createMockWordPressClient = (overrides = {}) => ({
  createPost: vi.fn().mockResolvedValue({ id: 1, title: { rendered: "Test" } }),
  getPosts: vi.fn().mockResolvedValue([]),
  request: vi.fn(),
  ...overrides,
});

export const createTestPost = (overrides = {}) => ({
  title: "Test Post",
  content: "Test content",
  status: "draft",
  ...overrides,
});
```

#### Avoid Test Interdependence

```javascript
// ✅ Good: Each test is independent
describe("PostsTools", () => {
  let client;
  let postsTools;

  beforeEach(() => {
    client = createMockWordPressClient();
    postsTools = new PostsTools(client);
  });

  it("should create posts", async () => {
    const result = await postsTools.createPost(createTestPost());
    expect(result.id).toBeDefined();
  });
});

// ❌ Bad: Tests depend on execution order
let createdPostId;
it("should create a post", () => {
  createdPostId = createPost().id;
});
it("should update the post", () => {
  updatePost(createdPostId); // Depends on previous test
});
```

## Coverage Requirements

### Global Targets (Phase 1)

- **Lines**: 40% minimum
- **Branches**: 30% minimum
- **Functions**: 35% minimum
- **Statements**: 38% minimum

### Component-Specific Requirements

#### Critical Components (High Standards)

```javascript
// src/utils/validation.ts, src/utils/error.ts
{
  branches: 80,
  functions: 90,
  lines: 85,
  statements: 85
}
```

#### Core Business Logic (Medium Standards)

```javascript
// src/client/api.ts, src/tools/
{
  branches: 40,
  functions: 50,
  lines: 45,
  statements: 45
}
```

#### Advanced Features (Baseline Standards)

```javascript
// src/performance/, src/cache/
{
  branches: 30,
  functions: 40,
  lines: 35,
  statements: 35
}
```

### Coverage Enforcement

```bash
# Check coverage against thresholds
npm run coverage:check

# Run with strict component-specific enforcement
COVERAGE_STRICT=true npm run coverage:check

# Generate detailed coverage report
npm run test:coverage:report
```

## Continuous Integration

### CI Pipeline Integration

```yaml
# .github/workflows/test.yml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Coverage Guardrail Check
  run: npm run coverage:check

- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Pre-commit Hooks

```javascript
// .husky/pre-commit
npm run lint
npm run typecheck
npm run test:unit
npm run coverage:check
```

### Pull Request Requirements

1. **All tests must pass** - Zero test failures allowed
2. **Coverage must not regress** - No decrease >2% in coverage
3. **New code must be tested** - All new functions require tests
4. **Security tests must pass** - No security violations

## Best Practices

### 🎯 **DO: Write Focused Tests**

```javascript
// ✅ Test one behavior per test
it("should validate email format", () => {
  expect(validateEmail("user@example.com")).toBe("user@example.com");
});

it("should reject invalid email format", () => {
  expect(() => validateEmail("invalid-email")).toThrow();
});
```

### 🎯 **DO: Use Descriptive Assertions**

```javascript
// ✅ Clear expectations
expect(result).toEqual({
  id: expect.any(Number),
  title: expect.stringContaining("Test"),
  created: expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
});

// ❌ Vague assertions
expect(result).toBeTruthy();
expect(result.length).toBeGreaterThan(0);
```

### 🎯 **DO: Test Error Conditions**

```javascript
// ✅ Test both success and failure paths
describe("createPost", () => {
  it("should create post successfully", async () => {
    client.createPost.mockResolvedValue({ id: 1 });
    const result = await postsTools.createPost(validData);
    expect(result.success).toBe(true);
  });

  it("should handle API errors gracefully", async () => {
    client.createPost.mockRejectedValue(new Error("API Error"));
    const result = await postsTools.createPost(validData);
    expect(result.success).toBe(false);
    expect(result.error).toContain("API Error");
  });
});
```

### 🎯 **DO: Mock External Dependencies**

```javascript
// ✅ Mock HTTP requests and external services
vi.mock("node-fetch");
import fetch from "node-fetch";
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ id: 1, title: "Test" }),
});
```

### ⚠️ **DON'T: Test Implementation Details**

```javascript
// ❌ Testing internal implementation
it("should call private method", () => {
  const spy = vi.spyOn(instance, "_privateMethod");
  instance.publicMethod();
  expect(spy).toHaveBeenCalled();
});

// ✅ Test public behavior
it("should return processed result", () => {
  const result = instance.publicMethod(input);
  expect(result).toEqual(expectedOutput);
});
```

### ⚠️ **DON'T: Create Overly Complex Tests**

```javascript
// ❌ Testing too many things at once
it("should handle complete user workflow", async () => {
  // 50+ lines testing multiple components
});

// ✅ Break into focused tests
describe("User Management Workflow", () => {
  it("should create user account", () => {
    /* ... */
  });
  it("should authenticate user", () => {
    /* ... */
  });
  it("should update user profile", () => {
    /* ... */
  });
});
```

## Common Patterns

### 1. WordPress Client Testing

```javascript
describe("WordPressClient", () => {
  let client;

  beforeEach(() => {
    client = new WordPressClient({
      baseUrl: "https://test.example.com",
      auth: { method: "app-password", username: "test", appPassword: "test" },
    });
  });

  it("should handle authentication errors", async () => {
    mockHttpResponse(401, { message: "Unauthorized" });

    await expect(client.request("/posts")).rejects.toThrow("Authentication failed");
  });
});
```

### 2. MCP Tool Testing

```javascript
describe("PostsTools", () => {
  let client;
  let postsTools;

  beforeEach(() => {
    client = createMockWordPressClient();
    postsTools = new PostsTools(client);
  });

  it("should validate parameters before API calls", async () => {
    await expect(postsTools.createPost({})).rejects.toThrow("title is required");
  });

  it("should format successful responses", async () => {
    client.createPost.mockResolvedValue({ id: 1, title: { rendered: "Test" } });

    const result = await postsTools.createPost({ title: "Test" });
    expect(result).toMatchObject({
      success: true,
      data: expect.objectContaining({ id: 1 }),
    });
  });
});
```

### 3. Configuration Testing

```javascript
describe("Configuration Validation", () => {
  it("should validate multi-site configuration", () => {
    const config = {
      sites: [
        {
          id: "site1",
          name: "Test Site",
          config: {
            WORDPRESS_SITE_URL: "https://example.com",
            WORDPRESS_USERNAME: "user",
            WORDPRESS_APP_PASSWORD: "pass pass pass pass pass pass",
          },
        },
      ],
    };

    expect(() => validateMultiSiteConfiguration(config)).not.toThrow();
  });
});
```

### 4. Error Handling Testing

```javascript
describe("Error Handling", () => {
  it("should provide helpful error messages", () => {
    expect(() => validateId(-1, "user_id")).toThrow("user_id must be a positive integer, got: -1");
  });

  it("should handle network errors gracefully", async () => {
    client.request.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await toolMethod();
    expect(result.success).toBe(false);
    expect(result.error).toContain("connection failed");
  });
});
```

### 5. Property-Based Testing

```javascript
import fc from "fast-check";

describe("Validation Properties", () => {
  it("should handle any positive integer as valid ID", () => {
    fc.assert(
      fc.property(fc.nat({ min: 1 }), (id) => {
        expect(() => validateId(id, "test")).not.toThrow();
        expect(validateId(id, "test")).toBe(id);
      }),
    );
  });
});
```

## Troubleshooting

### Common Issues & Solutions

#### 1. TypeScript Import Errors

```bash
# Error: Cannot find module '../../src/utils/validation.js'
# Solution: Vitest has native ES modules support
npm test
```

#### 2. Coverage Not Generated

```bash
# Issue: Coverage shows 0% despite tests passing
# Check: include paths in Vitest config
"include": [
  "src/**/*.ts"        # ✅ Correct path
  "!src/**/*.d.ts"      # ✅ Exclude type definitions
]
```

#### 3. Flaky Tests

```javascript
// ✅ Use proper async/await patterns
it("should handle async operations", async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toEqual(expected);
});

// ❌ Avoid timing-based tests
it("should complete within 1 second", (done) => {
  setTimeout(() => done(), 1000); // Flaky!
});
```

#### 4. Mock Issues

```javascript
// ✅ Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// ✅ Verify mock calls properly
expect(mockFn).toHaveBeenCalledWith(expectedArgs);
expect(mockFn).toHaveBeenCalledTimes(1);
```

### Debug Commands

```bash
# Run specific test file with verbose output
npm test -- tests/utils/validation.test.js --verbose

# Run tests with debugging
DEBUG=true npm test

# Check coverage for specific files
npm run test:coverage -- --testPathPattern=validation

# Analyze coverage report
open coverage/lcov-report/index.html
```

## Quality Gates

### Definition of Done for Testing

- [ ] **Unit tests written** for all new functions/methods
- [ ] **Integration tests** for component interactions
- [ ] **Error cases covered** with appropriate tests
- [ ] **Edge cases identified** and tested
- [ ] **Coverage thresholds met** per component requirements
- [ ] **Security validation** for input handling
- [ ] **Performance tests** for critical paths
- [ ] **Documentation updated** with test examples

### Code Review Checklist

- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Test names clearly describe expected behavior
- [ ] Mocks used appropriately for external dependencies
- [ ] Both success and failure paths tested
- [ ] No test interdependencies or shared state
- [ ] Proper async/await usage for async operations
- [ ] Security considerations addressed
- [ ] Performance implications considered

---

## Next Steps

1. **Implement Phase 1 Coverage Targets** - Focus on critical components
2. **Enhance Contract Testing** - Expand WordPress API coverage
3. **Performance Baseline** - Establish benchmarks for all tools
4. **Security Test Expansion** - Add comprehensive penetration tests
5. **Documentation Integration** - Auto-generate test examples in API docs

This testing strategy ensures robust, maintainable code while supporting rapid development and deployment of new
features.

Remember: **Good tests are an investment in code quality, developer confidence, and user reliability.** 🚀
