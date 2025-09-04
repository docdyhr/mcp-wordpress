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

    // Pool options - use threads for better performance, forks only when needed
    pool: "threads",

    // Test file patterns
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],

    // Timeouts - much shorter for debugging
    testTimeout: 5000,  // 5 seconds
    hookTimeout: 3000,  // 3 seconds

    // Test behavior
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // No setup files for debugging
    // setupFiles: ["./tests/vitest.setup.ts"],

    // Performance and debugging - optimized for speed
    isolate: false,  // Faster test execution by sharing contexts
    poolOptions: {
      threads: {
        singleThread: true,  // Use single thread for debugging
        isolate: false,
      },
    },

    // Reporter configuration
    reporters: ["basic"],
    
    // Bail on first failure for faster debugging
    bail: 1,
  },
});
