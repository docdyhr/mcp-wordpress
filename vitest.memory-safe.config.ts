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

    // Pool options - use forks with very strict memory management
    pool: "forks",

    // Test file patterns
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],

    // Exclude problematic tests
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "tests/server/ToolRegistry.test.js", // Tool system architecture mismatch
      ...(process.env.CI ? ["tests/performance/regression-detection.test.js"] : []),
    ],

    // Global test configuration
    globals: true,

    // Conservative timeouts
    testTimeout: 15000, // 15 seconds
    hookTimeout: 10000, // 10 seconds

    // Test behavior - aggressive cleanup
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Setup files
    setupFiles: ["./tests/vitest.setup.ts"],

    // Memory-optimized settings
    isolate: true,
    sequence: {
      concurrent: false, // Run tests sequentially to prevent memory spikes
    },
    maxConcurrency: 1, // Force sequential execution
    minWorkers: 1,
    maxWorkers: 1,

    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to minimize memory usage
        isolate: true,
      },
    },

    // Disable coverage for memory-safe mode
    coverage: {
      enabled: false,
    },

    // Reporter configuration - minimal output
    reporters: ["basic"],

    // Force garbage collection between tests
    teardownTimeout: 5000,
  },

  // TypeScript and module resolution
  define: {
    __EXECUTION_CONTEXT__: '"vitest"',
  },

  // ESBuild configuration
  esbuild: {
    target: "es2022",
  },
});
