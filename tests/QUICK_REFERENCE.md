# Testing Quick Reference

**⚡ Essential commands and patterns for MCP WordPress testing**

## 🚀 Quick Commands

```bash
# Run all tests
npm test

# Test with coverage
npm run test:coverage

# Coverage analysis
npm run coverage:check
npm run coverage:strict

# Specific test types
npm run test:unit
npm run test:security
npm run test:performance

# Watch mode
npm run test:watch

# Debug single test
npm test -- tests/utils/validation.test.js --verbose
```

## 📋 Test Templates

### Unit Test Template

```javascript
import { describe, it, expect } from "@jest/globals";
import { functionToTest } from "../../src/utils/module.js";

describe("FunctionName", () => {
  describe("when given valid input", () => {
    it("should return expected output", () => {
      // Arrange
      const input = "test-input";
      const expected = "expected-output";

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe("when given invalid input", () => {
    it("should throw descriptive error", () => {
      expect(() => functionToTest(null)).toThrow("input is required");
    });
  });
});
```

### Tool Test Template

```javascript
describe("ToolName", () => {
  let client;
  let tool;

  beforeEach(() => {
    client = {
      method: jest.fn().mockResolvedValue({ success: true }),
      // ... other mocked methods
    };
    tool = new ToolClass(client);
  });

  it("should validate parameters", async () => {
    await expect(tool.method({})).rejects.toThrow("required parameter missing");
  });

  it("should handle successful operation", async () => {
    client.method.mockResolvedValue({ id: 1, title: "Test" });

    const result = await tool.method({ title: "Test" });
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(1);
  });

  it("should handle API errors", async () => {
    client.method.mockRejectedValue(new Error("API Error"));

    const result = await tool.method({ title: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("API Error");
  });
});
```

## 🎯 Coverage Targets

| Component                         | Lines | Branches | Functions | Statements |
| --------------------------------- | ----- | -------- | --------- | ---------- |
| **Critical** (validation, error)  | 85%   | 80%      | 90%       | 85%        |
| **Core** (API, tools)             | 45%   | 40%      | 50%       | 45%        |
| **Advanced** (performance, cache) | 35%   | 30%      | 40%       | 35%        |
| **Global Minimum**                | 40%   | 30%      | 35%       | 38%        |

## ✅ Test Checklist

### Before Writing Tests

- [ ] Read existing tests in the same module
- [ ] Understand the function/class requirements
- [ ] Identify edge cases and error conditions
- [ ] Plan test data and mocks needed

### Writing Tests

- [ ] Use AAA pattern (Arrange, Act, Assert)
- [ ] Test both success and failure paths
- [ ] Use descriptive test names
- [ ] Mock external dependencies
- [ ] Avoid testing implementation details

### Before Committing

- [ ] All tests pass locally
- [ ] Coverage meets minimum thresholds
- [ ] No test interdependencies
- [ ] Error messages are helpful
- [ ] Tests are maintainable

## 🔧 Common Patterns

### Mock WordPress Client

```javascript
const createMockClient = (overrides = {}) => ({
  createPost: jest.fn().mockResolvedValue({ id: 1 }),
  getPosts: jest.fn().mockResolvedValue([]),
  request: jest.fn().mockResolvedValue({ status: 200 }),
  ...overrides,
});
```

### Test Async Operations

```javascript
it("should handle async operations", async () => {
  const promise = asyncFunction(input);
  await expect(promise).resolves.toEqual(expected);

  // Or for rejections
  await expect(promise).rejects.toThrow("Error message");
});
```

### Property-Based Testing

```javascript
import fc from "fast-check";

it("should handle any valid input", () => {
  fc.assert(
    fc.property(fc.nat({ min: 1 }), (input) => {
      expect(() => validateFunction(input)).not.toThrow();
    }),
  );
});
```

## 🚨 Common Mistakes

### ❌ Don't Do This

```javascript
// Testing implementation details
expect(spy).toHaveBeenCalled();

// Vague test names
it("should work");

// Test interdependence
let sharedState;
it("test 1", () => {
  sharedState = setup();
});
it("test 2", () => {
  use(sharedState);
});
```

### ✅ Do This Instead

```javascript
// Test behavior
expect(result).toEqual(expectedOutput);

// Descriptive names
it("should return 401 when authentication fails");

// Independent tests
beforeEach(() => {
  setup();
});
```

## 🐛 Debugging

### Test Failures

```bash
# Run single test with details
npm test -- --testNamePattern="specific test name"

# Debug mode
DEBUG=true npm test

# Verbose output
npm test -- --verbose
```

### Coverage Issues

```bash
# Check what's not covered
npm run test:coverage
open coverage/lcov-report/index.html

# Run coverage guardrail for details
npm run coverage:check
```

## 📚 Resources

- [Full Testing Guidelines](../TESTING_GUIDELINES.md)
- [Coverage Strategy](../COVERAGE_STRATEGY.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Test Examples](./examples/)

---

**Need help?** Check the [troubleshooting section](../TESTING_GUIDELINES.md#troubleshooting) in the full guidelines.
