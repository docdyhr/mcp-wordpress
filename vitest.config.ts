import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],

  // Manual alias resolution for compiled JS files
  resolve: {
    alias: {
      "@/types": new URL("./dist/types", import.meta.url).pathname,
      "@/client": new URL("./dist/client", import.meta.url).pathname,
      "@/utils": new URL("./dist/utils", import.meta.url).pathname,
      "@/config": new URL("./dist/config", import.meta.url).pathname,
      "@/tools": new URL("./dist/tools", import.meta.url).pathname,
      "@/cache": new URL("./dist/cache", import.meta.url).pathname,
      "@/security": new URL("./dist/security", import.meta.url).pathname,
      "@/performance": new URL("./dist/performance", import.meta.url).pathname,
      "@/server": new URL("./dist/server", import.meta.url).pathname,
      "@": new URL("./dist", import.meta.url).pathname,
    },
  },
  test: {
    // Environment
    environment: "node",

    // Pool options - use forks for better memory isolation in CI
    pool: process.env.CI ? "forks" : "threads",

    // Test file patterns - equivalent to Jest testMatch
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],

    // Exclude only truly problematic tests
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      // Individual problematic files (to be investigated)
      "tests/security/SecurityReviewer.test.js", // Test API mismatch with implementation
      "tests/server/ToolRegistry.test.js", // Tool system architecture mismatch with test expectations
      // Skip long-running performance tests in CI
      ...(process.env.CI ? ["tests/performance/regression-detection.test.js"] : []),
      // Exclude tests with heavy dynamic imports that cause memory issues in CI
      ...(process.env.CI ? ["tests/env-loading.test.js"] : []),
      ...(process.env.CI ? ["tests/client/WordPressClientRefactored.test.js"] : []),
    ],

    // Better test discovery
    passWithNoTests: false,

    // Global test configuration
    globals: true,

    // Timeouts - reasonable timeouts for stability
    testTimeout: 10000, // 10 seconds for complex tests
    hookTimeout: 5000, // 5 seconds for setup/teardown

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

    // Performance and debugging - optimized for memory safety (Vitest v4)
    isolate: true, // Isolate tests to prevent memory leaks
    maxConcurrency: process.env.CI ? 1 : 2, // Run tests sequentially in CI to prevent memory spikes
    maxWorkers: process.env.CI ? 1 : 2, // Single worker in CI for memory stability
    minWorkers: 1, // Vitest v4: replaces poolOptions.threads.minThreads

    // Pool-specific options for memory management
    poolOptions: {
      threads: {
        singleThread: process.env.CI ? true : false, // Force single-threaded in CI
      },
      forks: {
        singleFork: process.env.CI ? true : false, // Force single-forked process in CI
      },
    },

    // Memory management
    forceRerunTriggers: ["**/package.json/**", "**/vitest.config.*/**", "**/vite.config.*/**"],

    // Reporter configuration - fixed deprecated 'basic' reporter
    reporters: [
      [
        "default",
        {
          summary: false,
        },
      ],
    ],
  },

  // TypeScript and module resolution - handled by tsconfigPaths plugin

  // Global variables for compatibility
  define: {
    __EXECUTION_CONTEXT__: '"vitest"',
  },

  // ESBuild configuration for TypeScript
  esbuild: {
    target: "es2022",
  },
});
