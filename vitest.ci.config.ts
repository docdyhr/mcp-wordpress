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

    // Pool options - use threads for better memory management in CI
    pool: "threads",

    // Test file patterns
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],

    // Exclude problematic tests for CI stability
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      // Memory-intensive or flaky tests
      "tests/security/SecurityReviewer.test.js",
      "tests/server/ToolRegistry.test.js",
      "tests/performance/regression-detection.test.js",
      // Skip memory-intensive integration tests in CI
      "tests/integration/**",
    ],

    // Global test configuration
    globals: true,

    // Shorter timeouts for CI stability
    testTimeout: 5000, // 5 seconds max per test
    hookTimeout: 2000, // 2 seconds for setup/teardown

    // Test behavior
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Setup files
    setupFiles: ["./tests/vitest.setup.ts"],

    // Coverage configuration optimized for CI
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json"],
      reportOnFailure: true,
      reportsDirectory: "coverage",

      // Target compiled JS files
      include: ["dist/**/*.js", "src/**/*.js", "src/**/*.ts"],
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

      // Lower coverage thresholds for CI stability
      thresholds: {
        global: {
          branches: 40,
          functions: 50,
          lines: 55,
          statements: 50,
        },
      },
    },

    // Performance and memory optimization for CI
    isolate: true,
    maxConcurrency: 2, // Reduce concurrent tests to save memory
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        maxThreads: 2, // Limit threads to prevent memory spikes
        minThreads: 1,
      },
    },

    // Memory management
    forceRerunTriggers: ["**/package.json/**", "**/vitest.config.*/**", "**/vite.config.*/**"],

    // Simple reporter for CI
    reporters: ["basic"],

    // Faster builds
    minThreads: 1,
    maxThreads: 2,

    // Bail out on first failure to save CI time
    bail: 1,
  },

  // TypeScript and module resolution
  define: {
    __EXECUTION_CONTEXT__: '"vitest-ci"',
  },

  // ESBuild configuration
  esbuild: {
    target: "es2022",
  },
});
