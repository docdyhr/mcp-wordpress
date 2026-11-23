# Contract & Compatibility Tests

This directory contains comprehensive WordPress compatibility and contract tests that ensure our client works correctly
across different WordPress versions and configurations.

## Test Files Overview

### 1. `wordpress-compatibility.test.js`

**Purpose**: Basic compatibility testing with intelligent fallback patterns **Status**: ✅ 6 tests always pass
(mock/live hybrid)

### 2. `wordpress-api-live.test.js`

**Purpose**: Comprehensive live contract testing against real WordPress instances **Status**: ✅ 8 tests always pass
(mock fallback implemented)

### 3. `provider-verification.test.js`

**Purpose**: Pact contract verification and WordPress provider compliance **Status**: ⏭️ The live verification runs only
when `WORDPRESS_TEST_URL` is set and `tests/pacts/` holds `*.json` pact files (nothing in the repo generates them yet),
so it is skipped by default. The skip-rule and compatibility-matrix tests always run.

## Testing Philosophy: No Skipped Tests

**Problem Solved**: Previously, 5+ tests were skipped when WordPress wasn't available, inflating pass rates while
reducing meaningful coverage.

**Solution**: **Intelligent Mock Fallback** - Tests always execute with value:

- **Live Mode**: Tests against real WordPress when configured
- **Mock Mode**: Stateful mocks that validate interface contracts
- **Zero Skips**: Every test provides meaningful validation, with one exception: Pact provider verification has no
  meaningful mock, so it skips (and says why) until both a WordPress instance and pact files exist

## Configuration

### Enable Live Testing

```bash
# Basic live testing
export WORDPRESS_TEST_URL="http://localhost:8081"
export WORDPRESS_USERNAME="testuser"
export WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"

# Force live mode
export FORCE_LIVE_WP="true"

# Skip live in CI (use mocks)
export SKIP_LIVE_TESTS="true"
```

### Run Tests

```bash
# All compatibility tests (mock mode by default)
npm run build && npx vitest run tests/contracts/

# Force live mode for development
npm run build && WORDPRESS_TEST_URL="http://localhost:8081" npx vitest run tests/contracts/

# CI-friendly (always mocks, never fails due to environment)
npm run build && SKIP_LIVE_TESTS="true" npx vitest run tests/contracts/
```

## Mock vs Live Test Coverage

| Test Suite                        | Tests  | Mock Mode                  | Live Mode                | Purpose               |
| --------------------------------- | ------ | -------------------------- | ------------------------ | --------------------- |
| `wordpress-compatibility.test.js` | 6      | ✅ Interface validation    | ✅ Real API testing      | Basic compatibility   |
| `wordpress-api-live.test.js`      | 8      | ✅ Stateful contract mocks | ✅ End-to-end validation | Advanced contracts    |
| `provider-verification.test.js`   | 9      | ⏭️ 8 run, 1 skipped        | ✅ Provider compliance   | Contract verification |
| **Total**                         | **23** | **22 run, 1 skipped**      | **23 when configured**   | **Complete coverage** |

## Test Details

### Posts API Contract Tests (8 tests)

- Create post with valid response format
- Retrieve posts with pagination
- Handle 404 errors correctly
- REST API discovery and endpoint validation
- Authentication success/failure scenarios
- Complete CRUD operations (Create, Read, Update, Delete)

### Mock Client Features

- **Stateful**: Maintains post state across operations
- **Contract Compliant**: Returns WordPress REST API compatible responses
- **Error Simulation**: Throws appropriate errors (404, auth failures)
- **Deterministic**: Consistent behavior for reliable CI/CD

## Benefits of This Approach

1. **Zero False Positives**: No tests are artificially skipped
2. **Fast Feedback**: Mocks provide instant validation
3. **Complete Coverage**: Interface contracts always validated
4. **Live Verification**: Optional real WordPress testing
5. **CI/CD Friendly**: Never fails due to missing dependencies

## Development Workflow

### Local Development

```bash
# Quick validation (mocks)
npm run build && npx vitest run tests/contracts/

# Full validation (with WordPress)
docker-compose up -d
npm run build && WORDPRESS_TEST_URL="http://localhost:8081" npx vitest run tests/contracts/
```

### Before Merging PRs

1. Tests pass in mock mode (always works)
2. Tests pass in live mode (when WordPress configured)
3. All 23 tests run (22 without a WordPress instance and pact files)

### CI/CD Pipeline

- **Pull Requests**: Mock mode (fast, reliable)
- **Main Branch**: Live mode with WordPress container
- **Release**: Full live validation matrix

## Rationale for Mock Fallbacks

**Before**: Tests were skipped → inflated pass rates, reduced coverage **After**: Mocks provide value → interface
validation, contract compliance

Mock tests still catch:

- API interface changes
- Response format regressions
- Error handling patterns
- Authentication flow logic

## Future Enhancements

- **WordPress Version Matrix**: Test against multiple WP versions
- **Performance Benchmarks**: Latency tracking for live tests
- **Contract Evolution**: Automated contract diff detection
- **Test Data Management**: Improved cleanup and isolation
