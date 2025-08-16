/**
 * Comprehensive Jest configuration for WordPress MCP project
 * Supports development, CI, and VS Code environments
 */

const isCI = process.env.CI === 'true';
const isVSCode = process.env.VSCODE_CWD !== undefined;
const isPerformanceTest = process.env.PERFORMANCE_TEST === 'true';

const baseConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  // Ensure Jest treats TypeScript files as ESM and applies transforms
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  
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
    "**/server/**/*.test.js",
    "**/contracts/**/*.test.js"
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
  collectCoverage: false, // Enable via --coverage flag or CI
  collectCoverageFrom: [
    "dist/**/*.js",
    "!dist/**/*.d.ts", 
    "!dist/**/__mocks__/**",
    "!dist/**/*.test.js",
    "!dist/**/index.js",
    "!dist/types/**"
  ],
  coverageReporters: ["text-summary", "lcov", "html", "json", "cobertura"],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/", 
    "/tests/",
    "/docs/",
    "src/types/",
    "src/.*\\.d\\.ts$",
    "src/.*/index.ts$"
  ],
  // Coverage thresholds - Phase 1 implementation
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 40,
      statements: 38
    },
    // Critical components - higher standards
    'src/utils/validation.ts': {
      branches: 80, functions: 90, lines: 85, statements: 85
    },
    'src/utils/error.ts': {
      branches: 100, functions: 100, lines: 100, statements: 100
    },
    'src/utils/toolWrapper.ts': {
      branches: 75, functions: 80, lines: 78, statements: 78
    },
    // Core business logic - medium standards  
    'src/client/api.ts': {
      branches: 40, functions: 50, lines: 45, statements: 45
    },
    'src/tools/': {
      branches: 20, functions: 25, lines: 25, statements: 25
    },
    // Configuration and setup - medium standards
    'src/config/': {
      branches: 50, functions: 60, lines: 55, statements: 55
    }
  },
  
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
  },

  // Ensure TypeScript source files imported directly from tests are transformed.
  // Some tests import .ts files (e.g. src/utils/logger.ts) using explicit extensions.
  // The previous configuration only handled this in the typescript-specific Jest config.
  // Adding the transform here resolves parse errors for `export type` and other TS syntax.
  transform: {
    "^.+\\.ts$": [
      "babel-jest",
      {
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                node: "current"
              }
            }
          ],
          "@babel/preset-typescript"
        ]
      }
    ]
  }
};

// Environment-specific configurations
const config = isCI && !isPerformanceTest ? {
  // CI environment: faster, more conservative
  ...baseConfig,
  
  // Exclude performance-heavy tests in CI (unless specifically running performance tests)
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
} : isPerformanceTest ? {
  // Performance test environment: focus on performance tests
  ...baseConfig,
  
  // Only include performance and contract tests
  testMatch: [
    "**/performance/**/*.test.js",
    "**/contracts/**/*.test.js"
  ],
  
  // Performance test optimizations
  testTimeout: 60000,
  verbose: true,
  maxWorkers: 1,
  cache: false,
  detectOpenHandles: true,
  setupFilesAfterEnv: [
    "<rootDir>/tests/jest.teardown.js",
    "<rootDir>/tests/performance/jest.setup.js"
  ],
} : {
  // Development environment: full test suite
  ...baseConfig,
  
  // Include all tests in development
  testMatch: [
    ...baseConfig.testMatch,
    "**/performance/**/*.test.js",
    "**/cache/**/*.test.js",
    "**/tools/**/*.test.js",
    "**/contracts/**/*.test.js"
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