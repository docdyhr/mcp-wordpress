/**
 * Comprehensive Jest configuration for WordPress MCP project
 * Supports development, CI, and VS Code environments
 */

const isCI = process.env.CI === 'true';
const isVSCode = process.env.VSCODE_CWD !== undefined;

const baseConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  
  // Common test patterns
  testMatch: [
    "**/typescript-build.test.js",
    "**/server.test.js",
    "**/env-loading.test.js",
    "**/api-upload-timeout.test.js",
    "**/auth-headers-fix.test.js",
    "**/config-loading.test.js",
    "**/tool-validation.test.js",
    "**/security/**/*.test.js",
    "**/config/**/*.test.js",
    "**/property/**/*.test.js",
    "**/unit/**/*.test.js",
    "**/utils/**/*.test.js",
    "**/managers/**/*.test.js",
    "**/server/**/*.test.js"
  ],
  
  // Common ignores
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "tests/cache/CacheInvalidation.test.js",
    "tests/server/ToolRegistry.test.js",
    "tests/managers/authentication.test.js"
  ],
  
  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    "dist/**/*.js",
    "!dist/**/*.test.js",
    "!dist/**/node_modules/**",
    "!dist/coverage/**"
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  
  // Basic timeouts and performance
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  
  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/jest.teardown.js"],
  
  // Globals
  globals: {
    "__EXECUTION_CONTEXT__": "jest"
  }
};

// Environment-specific configurations
const config = isCI ? {
  // CI environment: faster, more conservative
  ...baseConfig,
  
  // Exclude performance-heavy tests in CI
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    "/tests/performance/",
    "/tests/cache/",
    "cache-stress.test.js",
    "cache-performance.test.js",
    "advanced-cache.test.js"
  ],
  
  // CI-specific optimizations
  testTimeout: 20000,
  verbose: false,
  maxWorkers: 1,
  cache: false,
  detectOpenHandles: false,
} : {
  // Development environment: full test suite
  ...baseConfig,
  
  // Include all tests in development
  testMatch: [
    ...baseConfig.testMatch,
    "**/performance/**/*.test.js",
    "**/cache/**/*.test.js",
    "**/tools/**/*.test.js"
  ],
  
  // Development optimizations
  maxWorkers: 2,
  cache: true,
  setupFilesAfterEnv: [
    "<rootDir>/tests/jest.teardown.js",
    "<rootDir>/tests/performance/jest.setup.js"
  ],
};

module.exports = config;