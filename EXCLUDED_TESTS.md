# Excluded Tests Documentation

This document tracks tests that are excluded from CI execution and the reasons why.

## Tests Excluded from CI

### 1. SecurityReviewer.test.js

**Status:** ❌ Excluded  
**Location:** `tests/security/SecurityReviewer.test.js`  
**Exclusion Date:** 2024-11  
**Reason:** Test API doesn't match current implementation

**Issue:**
The test expects methods and interfaces that don't exist in the current `SecurityReviewer` implementation. The tests were written for an earlier version of the security review system.

**Expected Behavior:**

```typescript
// Test expects:
const reviewer = new SecurityReviewer();
await reviewer.reviewFile(filePath);
```

**Actual Implementation:**

```typescript
// Current implementation uses different API
```

**Fix Required:**

- [ ] Update test expectations to match current SecurityReviewer API
- [ ] Verify all security review functionality works
- [ ] Add tests for new security features

**Target Date:** Sprint 2024-12  
**Owner:** TBD

---

### 2. ToolRegistry.test.js

**Status:** ❌ Excluded  
**Location:** `tests/server/ToolRegistry.test.js`  
**Exclusion Date:** 2024-11  
**Reason:** Architecture evolved, tests outdated

**Issue:**
The project moved from a simple tool registry to a composition-based architecture with multiple managers. The tests still expect the old flat structure.

**Expected vs Actual:**

```typescript
// Test expects:
registry.registerTool({ name: 'getTool', handler: fn });

// Current architecture uses:
ComposedManagerFactory.create(config);
```

**Fix Required:**

- [ ] Refactor tests to match composition pattern
- [ ] Update tool registration tests
- [ ] Add tests for ComposedManagerFactory
- [ ] Test tool discovery and loading

**Target Date:** Sprint 2025-01  
**Owner:** TBD

---

### 3. regression-detection.test.js (CI Only)

**Status:** ⚠️  Excluded in CI, runs locally  
**Location:** `tests/performance/regression-detection.test.js`  
**Exclusion Date:** 2024-11  
**Reason:** Memory intensive, causes OOM in CI

**Issue:**
This test performs comprehensive performance regression detection which requires significant memory. In CI with limited resources (7GB), it causes out-of-memory errors.

**Current Workaround:**

```typescript
// vitest.config.ts
exclude: [
  ...(process.env.CI ? ["tests/performance/regression-detection.test.js"] : []),
]
```

**Fix Required:**

- [ ] Reduce memory footprint of regression tests
- [ ] Split into smaller test suites
- [ ] Use streaming data processing instead of loading all data
- [ ] Consider separate performance CI job with more resources

**Target Date:** Sprint 2025-01  
**Owner:** TBD

---

### 4. env-loading.test.js (CI Only)

**Status:** ⚠️  Excluded in CI, runs locally  
**Location:** `tests/env-loading.test.js`  
**Exclusion Date:** 2024-11  
**Reason:** Dynamic imports cause memory issues in CI

**Issue:**
Test uses dynamic imports which, combined with Vitest's default thread pool mode, causes memory pressure in CI environments.

**Symptoms:**

```
Fatal JavaScript invalid size error 169220804
v8::internal::Runtime_GrowArrayElements
Exit code: 133
```

**Current Workaround:**

```typescript
// Excluded in CI to prevent memory issues
exclude: [
  ...(process.env.CI ? ["tests/env-loading.test.js"] : []),
]
```

**Fix Required:**

- [ ] Refactor to avoid dynamic imports
- [ ] Use static imports with conditional execution
- [ ] Add memory cleanup after each test
- [ ] Consider using fork pool mode for this specific test

**Target Date:** Sprint 2024-12  
**Owner:** TBD

---

### 5. WordPressClientRefactored.test.js (CI Only)

**Status:** ⚠️  Excluded in CI, runs locally  
**Location:** `tests/client/WordPressClientRefactored.test.js`  
**Exclusion Date:** 2024-11  
**Reason:** File doesn't exist, causes import errors

**Issue:**
Test file references `WordPressClientRefactored.js` which doesn't exist. This was likely a planned refactoring that wasn't completed.

**Fix Required:**

- [ ] Remove test file if refactoring is not planned
- [ ] OR complete the refactoring and update test
- [ ] Update test imports to match actual file structure

**Target Date:** Sprint 2024-12  
**Owner:** TBD

---

## How to Re-enable Tests

### For Local Development

Tests marked as "CI Only" run automatically in local development. No action needed.

### For CI Execution

1. **Fix the underlying issue** according to the "Fix Required" section
2. **Update vitest.config.ts:**

   ```typescript
   // Remove from exclude array
   exclude: [
     "node_modules/**",
     "dist/**",
     "coverage/**",
     // "tests/security/SecurityReviewer.test.js", // ← Remove this line
   ],
   ```

3. **Run tests locally:**

   ```bash
   npm test tests/security/SecurityReviewer.test.js
   ```

4. **Run full test suite:**

   ```bash
   npm test
   ```

5. **Commit and push:**

   ```bash
   git add vitest.config.ts tests/
   git commit -m "fix(tests): re-enable SecurityReviewer tests"
   git push
   ```

6. **Verify in CI:** Check that GitHub Actions passes

---

## Test Exclusion Metrics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passing | 512 | 99.0% |
| ❌ Excluded | 2 | 0.4% |
| ⚠️  CI Only | 3 | 0.6% |
| **Total** | **517** | **100%** |

**Goal:** Re-enable all excluded tests by Sprint 2025-02

---

## Adding New Exclusions

If you need to exclude a test, follow this process:

1. **Document in this file first** - Add entry with clear reason
2. **Add to vitest.config.ts:**

   ```typescript
   exclude: [
     // ... existing exclusions
     "tests/path/to/problematic-test.js", // Reason: Brief explanation
   ]
   ```

3. **Create GitHub issue:**
   - Label: `test-excluded`
   - Milestone: Target sprint for fix
   - Link to this document
4. **Update metrics table** above
5. **Commit changes:**

   ```bash
   git add EXCLUDED_TESTS.md vitest.config.ts
   git commit -m "test: exclude problematic-test.js - [reason]"
   ```

---

## References

- [Vitest Configuration](https://vitest.dev/config/)
- [GitHub Issues - test-excluded label](https://github.com/docdyhr/mcp-wordpress/labels/test-excluded)
- [CI Memory Optimization Guide](docs/CI_CD_IMPROVEMENTS.md)

---

**Last Updated:** 2024-11-20  
**Maintained By:** Development Team
