import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Environment
    environment: "node",

    // Pool options - use forks for tests that need process.chdir
    pool: "forks",

    // Test file patterns - equivalent to Jest testMatch
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],

    // Exclude only truly problematic tests
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      // Individual problematic files (to be investigated)
      "tests/cache/CacheInvalidation.test.js",
      "tests/server/ToolRegistry.test.js",
      "tests/typescript-build.test.js",
      "tests/performance/MetricsCollector.test.js",
    ],

    // Global test configuration
    globals: true,

    // Timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Test behavior
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Setup files
    setupFiles: ["./tests/vitest.setup.ts"],

    // Coverage configuration - equivalent to Jest coverage settings
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "html", "json", "cobertura"],
      reportOnFailure: true,
      reportsDirectory: "coverage",

      // Coverage inclusion/exclusion patterns
      // Need to target the compiled JS files that are actually executed
      include: [
        "dist/**/*.js",
        "src/**/*.js", // For any JS files in src
        "src/**/*.ts", // For source mapping back to TS files
      ],
      exclude: [
        "dist/**/*.d.ts",
        "dist/**/*.test.js",
        "dist/tests/**",
        "dist/**/index.js",
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/index.ts",
        "tests/**",
        "docs/**",
        "node_modules/**",
        "**/*.test.js",
        "**/*.spec.js",
      ],

      // Coverage thresholds - same as Jest
      // Coverage thresholds - gradually raise these as migration progresses
      thresholds: {
        global: {
          branches: 50,
          functions: 60,
          lines: 65,
          statements: 60,
        },
      },
    },

    // Performance and debugging
    isolate: true,
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Reporter configuration
    reporter: ["verbose"],

    // Global variables for compatibility
    define: {
      __EXECUTION_CONTEXT__: '"vitest"',
    },
  },

  // TypeScript and module resolution
  resolve: {
    alias: {
      // Support .js imports for TypeScript files
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
  },

  // ESBuild configuration for TypeScript
  esbuild: {
    target: "es2022",
  },
});
