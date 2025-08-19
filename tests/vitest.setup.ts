/**
 * Vitest setup and teardown to ensure proper cleanup of resources
 * This helps prevent worker processes from hanging
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Global setup
beforeAll(() => {
  // Set execution context for compatibility
  (globalThis as any).__EXECUTION_CONTEXT__ = 'vitest';
});

// Cleanup after each test
afterEach(() => {
  // Clear all timers and intervals
  if (typeof (globalThis as any).clearImmediate === "function") {
    (globalThis as any).clearImmediate();
  }
  
  // Force garbage collection if available
  if ((globalThis as any).gc) {
    (globalThis as any).gc();
  }
});

// Global teardown
afterAll(() => {
  // Force garbage collection if available
  if ((globalThis as any).gc) {
    (globalThis as any).gc();
  }
});

// Handle uncaught exceptions in test environment
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in test:", error);
  process.exit(1);
});

// Handle unhandled promise rejections in test environment
process.on("unhandledRejection", (reason, _promise) => {
  console.error("Unhandled promise rejection in test:", reason);
  process.exit(1);
});