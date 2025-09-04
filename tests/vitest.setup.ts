/**
 * Vitest setup and teardown to ensure proper cleanup of resources
 * This helps prevent worker processes from hanging
 */

import { beforeAll, afterAll, afterEach } from "vitest";

// Global setup
beforeAll(() => {
  // Set execution context for compatibility
  (globalThis as unknown as { __EXECUTION_CONTEXT__: string }).__EXECUTION_CONTEXT__ = "vitest";
});

// Cleanup after each test
afterEach(() => {
  // Clear all timers and intervals
  if (typeof (globalThis as unknown as { clearImmediate?: () => void }).clearImmediate === "function") {
    (globalThis as unknown as { clearImmediate: () => void }).clearImmediate();
  }

  // Force garbage collection if available
  if ((globalThis as unknown as { gc?: () => void }).gc) {
    (globalThis as unknown as { gc: () => void }).gc();
  }
});

// Global teardown
afterAll(() => {
  // Force garbage collection if available
  if ((globalThis as unknown as { gc?: () => void }).gc) {
    (globalThis as unknown as { gc: () => void }).gc();
  }
});

// Handle uncaught exceptions in test environment
process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught exception in test:", error);
  // Don't exit the process, let vitest handle it
});

// Handle unhandled promise rejections in test environment
process.on("unhandledRejection", (reason, _promise) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled promise rejection in test:", reason);
  // Don't exit the process, let vitest handle it
});
