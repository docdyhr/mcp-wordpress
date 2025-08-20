/**
 * CI Environment Detection and Test Configuration Utilities
 *
 * Provides consistent CI environment detection and performance test configuration
 * across the test suite to avoid hardcoding values in individual tests.
 */

/**
 * Detects if tests are running in a CI environment
 * @returns {boolean} True if running in CI
 */
export function isCI() {
  return Boolean(process.env.CI);
}

/**
 * Performance test thresholds optimized for different environments
 */
export const PERFORMANCE_THRESHOLDS = {
  // CI environment has more variable performance
  CI: {
    CACHE_WRITE_THROUGHPUT: 10000, // Lower threshold for CI stability
    CACHE_READ_THROUGHPUT: 8000, // Lower threshold for CI stability
    MIXED_WORKLOAD_THROUGHPUT: 5000, // Lower threshold for CI stability
  },
  // Local development environment expects higher performance
  LOCAL: {
    CACHE_WRITE_THROUGHPUT: 30000, // Higher threshold for local dev
    CACHE_READ_THROUGHPUT: 20000, // Higher threshold for local dev
    MIXED_WORKLOAD_THROUGHPUT: 15000, // Higher threshold for local dev
  },
};

/**
 * Gets performance thresholds based on current environment
 * @returns {object} Performance thresholds for current environment
 */
export function getPerformanceThresholds() {
  return isCI() ? PERFORMANCE_THRESHOLDS.CI : PERFORMANCE_THRESHOLDS.LOCAL;
}

/**
 * Conditionally runs performance scaling assertions based on environment
 * In CI environments, only basic throughput validation is performed
 * In local environments, full scaling performance assertions are run
 *
 * @param {Function} scalingAssertions - Function containing scaling assertions for local env
 * @param {Function} basicValidation - Function containing basic validation for CI env
 */
export function runEnvironmentAwarePerformanceTest(scalingAssertions, basicValidation) {
  if (isCI()) {
    // Run basic validation in CI environments where performance is variable
    basicValidation();
  } else {
    // Run full scaling assertions in local development
    scalingAssertions();
  }
}

/**
 * Gets appropriate test timeout for current environment
 * @param {number} localTimeout - Timeout for local environment (ms)
 * @param {number} ciTimeout - Timeout for CI environment (ms)
 * @returns {number} Timeout in milliseconds
 */
export function getTestTimeout(localTimeout = 5000, ciTimeout = 30000) {
  return isCI() ? ciTimeout : localTimeout;
}

/**
 * Skips test in CI if it's known to be flaky or environment-dependent
 * @param {string} reason - Reason for skipping in CI
 * @returns {boolean} Whether test should be skipped
 */
export function skipInCI(reason = "Test is environment-dependent") {
  if (isCI()) {
    console.log(`⚠️  Skipping test in CI: ${reason}`);
    return true;
  }
  return false;
}
